import { fetchMarkdownPage } from "../lib/cloudflare.js";
import { ensureGitignore } from "../lib/gitignore.js";
import { ensureTsconfigExclude } from "../lib/tsconfig.js";
import {
  updateAgentsMd,
  updatePageIndex,
} from "../lib/agents.js";
import { getFileModificationPermission, setFileModificationPermission } from "../lib/settings.js";
import { confirm } from "../lib/prompt.js";
import { listSources, getPageInfo, savePageMarkdown } from "../lib/storage.js";
import { normalizeUrl } from "../lib/url.js";
import type { FetchResult, PageEntry } from "../types.js";

export interface FetchOptions {
  cwd?: string;
  allowModifications?: boolean;
  timeoutMs?: number;
  htmlFallback?: boolean;
}

async function checkFileModificationPermission(
  cwd: string,
  cliOverride?: boolean,
): Promise<boolean> {
  if (cliOverride !== undefined) {
    await setFileModificationPermission(cliOverride, cwd);
    if (cliOverride) {
      console.log("✓ File modifications enabled (--modify)");
    } else {
      console.log("✗ File modifications disabled (--modify=false)");
    }
    return cliOverride;
  }

  const storedPermission = await getFileModificationPermission(cwd);
  if (storedPermission !== undefined) {
    return storedPermission;
  }

  console.log("\nfetchmd can update the following files for better integration:");
  console.log("  • .gitignore - add fetchmd/ to ignore list");
  console.log("  • tsconfig.json - exclude fetchmd/ from compilation");
  console.log("  • AGENTS.md - add markdown snapshot reference section\n");

  const allowed = await confirm("Allow fetchmd to modify these files?");

  await setFileModificationPermission(allowed, cwd);

  if (allowed) {
    console.log("✓ Permission granted - saved to fetchmd/settings.json\n");
  } else {
    console.log("✗ Permission denied - saved to fetchmd/settings.json\n");
  }

  return allowed;
}

async function fetchUrlInput(
  spec: string,
  cwd: string,
  timeoutMs?: number,
  htmlFallback?: boolean,
): Promise<FetchResult> {
  let normalizedUrl: string;

  try {
    normalizedUrl = normalizeUrl(spec);
  } catch (err) {
    return {
      url: spec,
      path: "",
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  console.log(`\nFetching ${normalizedUrl}...`);

  try {
    const existing = await getPageInfo(normalizedUrl, cwd);
    if (existing) {
      console.log(`  → Updating existing snapshot at fetchmd/${existing.path}`);
    }

    const response = await fetchMarkdownPage(normalizedUrl, {
      timeoutMs,
      htmlFallback,
    });

    const storageUrl = normalizeUrl(response.resolvedUrl || normalizedUrl);
    const outputPath = await savePageMarkdown(storageUrl, response.markdown, cwd);

    console.log(`  ✓ Saved to fetchmd/${outputPath}`);

    if (response.markdownTokens !== undefined) {
      console.log(`  → x-markdown-tokens: ${response.markdownTokens}`);
    }

    if (response.source === "html-fallback") {
      console.log("  → Converted from HTML (fallback mode)");
    }

    if (response.contentSignal) {
      console.log(`  → Content-Signal: ${response.contentSignal}`);
    }

    if (response.resolvedUrl && response.resolvedUrl !== normalizedUrl) {
      console.log(`  → Resolved URL: ${response.resolvedUrl}`);
    }

    return {
      url: normalizedUrl,
      resolvedUrl: response.resolvedUrl,
      path: outputPath,
      success: true,
      status: response.status,
      contentType: response.contentType,
      markdownTokens: response.markdownTokens,
      contentSignal: response.contentSignal,
      source: response.source,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.log(`  ✗ Failed: ${errorMessage}`);
    return {
      url: normalizedUrl,
      path: "",
      success: false,
      error: errorMessage,
    };
  }
}

function mergeResults(existing: PageEntry[], results: FetchResult[]): PageEntry[] {
  const now = new Date().toISOString();
  const merged = [...existing];

  for (const result of results) {
    if (!result.success) {
      continue;
    }

    const entry: PageEntry = {
      url: result.url,
      resolvedUrl: result.resolvedUrl,
      path: result.path,
      fetchedAt: now,
      status: result.status || 200,
      contentType: result.contentType || "text/markdown",
      markdownTokens: result.markdownTokens,
      contentSignal: result.contentSignal,
      source: result.source,
    };

    const index = merged.findIndex((page) => page.url === result.url);
    if (index >= 0) {
      merged[index] = entry;
    } else {
      merged.push(entry);
    }
  }

  return merged;
}

export async function fetchCommand(
  urls: string[],
  options: FetchOptions = {},
): Promise<FetchResult[]> {
  const cwd = options.cwd || process.cwd();
  const results: FetchResult[] = [];

  const canModifyFiles = await checkFileModificationPermission(
    cwd,
    options.allowModifications,
  );

  if (canModifyFiles) {
    const gitignoreUpdated = await ensureGitignore(cwd);
    if (gitignoreUpdated) {
      console.log("✓ Added fetchmd/ to .gitignore");
    }

    const tsconfigUpdated = await ensureTsconfigExclude(cwd);
    if (tsconfigUpdated) {
      console.log("✓ Added fetchmd/ to tsconfig.json exclude");
    }
  }

  for (const spec of urls) {
    const result = await fetchUrlInput(
      spec,
      cwd,
      options.timeoutMs,
      options.htmlFallback,
    );
    results.push(result);
  }

  const successful = results.filter((result) => result.success).length;
  const failed = results.length - successful;

  console.log(`\nDone: ${successful} succeeded, ${failed} failed`);

  if (successful > 0) {
    const existing = await listSources(cwd);
    const pages = mergeResults(existing.pages, results);

    if (canModifyFiles) {
      const agentsUpdated = await updateAgentsMd({ pages }, cwd);
      if (agentsUpdated) {
        console.log("✓ Updated AGENTS.md");
      }
    } else {
      await updatePageIndex({ pages }, cwd);
    }
  }

  return results;
}
