import { listSources, removeStoredPage, cleanupEmptyPageDirs } from "../lib/storage.js";
import { normalizeUrl } from "../lib/url.js";
import { updateAgentsMd, updatePageIndex } from "../lib/agents.js";
import { getFileModificationPermission } from "../lib/settings.js";
import type { PageEntry } from "../types.js";

export interface RemoveOptions {
  cwd?: string;
}

export async function removeCommand(
  urls: string[],
  options: RemoveOptions = {},
): Promise<void> {
  const cwd = options.cwd || process.cwd();
  const sources = await listSources(cwd);
  let pages: PageEntry[] = [...sources.pages];

  let removed = 0;
  let notFound = 0;

  for (const spec of urls) {
    let normalized: string;

    try {
      normalized = normalizeUrl(spec);
    } catch {
      console.log(`  ⚠ Invalid URL: ${spec}`);
      notFound++;
      continue;
    }

    const index = pages.findIndex(
      (page) => page.url === normalized || page.resolvedUrl === normalized,
    );

    if (index === -1) {
      console.log(`  ⚠ ${normalized} not found`);
      notFound++;
      continue;
    }

    const entry = pages[index];
    await removeStoredPage(entry.path, cwd);
    pages = pages.filter((_, idx) => idx !== index);

    console.log(`  ✓ Removed ${normalized}`);
    removed++;
  }

  if (removed > 0) {
    await cleanupEmptyPageDirs(cwd);

    const canModifyFiles = await getFileModificationPermission(cwd);

    if (canModifyFiles) {
      const agentsUpdated = await updateAgentsMd({ pages }, cwd);
      if (agentsUpdated) {
        if (pages.length === 0) {
          console.log("✓ Removed fetchmd section from AGENTS.md");
        } else {
          console.log("✓ Updated AGENTS.md");
        }
      }
    } else {
      await updatePageIndex({ pages }, cwd);
    }
  }

  console.log(
    `\nRemoved ${removed} page(s)${notFound > 0 ? `, ${notFound} not found` : ""}`,
  );
}
