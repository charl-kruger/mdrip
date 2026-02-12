import { listSources, removeStoredPage, cleanupEmptyPageDirs } from "../lib/storage.js";
import { updateAgentsMd, updatePageIndex } from "../lib/agents.js";
import { getFileModificationPermission } from "../lib/settings.js";
import { getUrlHost } from "../lib/url.js";
import type { PageEntry } from "../types.js";

export interface CleanOptions {
  cwd?: string;
  domain?: string;
}

export async function cleanCommand(options: CleanOptions = {}): Promise<void> {
  const cwd = options.cwd || process.cwd();
  const sources = await listSources(cwd);

  if (sources.pages.length === 0) {
    console.log("No pages to clean.");
    return;
  }

  const targetDomain = options.domain?.trim().toLowerCase();

  const pagesToRemove = targetDomain
    ? sources.pages.filter((page) => getUrlHost(page.resolvedUrl || page.url) === targetDomain)
    : sources.pages;

  if (pagesToRemove.length === 0) {
    console.log(`No pages found for domain: ${targetDomain}`);
    return;
  }

  const removalSet = new Set(pagesToRemove.map((page) => page.url));

  for (const page of pagesToRemove) {
    await removeStoredPage(page.path, cwd);
  }

  await cleanupEmptyPageDirs(cwd);

  const remainingPages: PageEntry[] = sources.pages.filter(
    (page) => !removalSet.has(page.url),
  );

  const canModifyFiles = await getFileModificationPermission(cwd);

  if (canModifyFiles) {
    const agentsUpdated = await updateAgentsMd({ pages: remainingPages }, cwd);
    if (agentsUpdated) {
      if (remainingPages.length === 0) {
        console.log("✓ Removed fetchmd section from AGENTS.md");
      } else {
        console.log("✓ Updated AGENTS.md");
      }
    }
  } else {
    await updatePageIndex({ pages: remainingPages }, cwd);
  }

  if (targetDomain) {
    console.log(`✓ Removed ${pagesToRemove.length} page(s) for ${targetDomain}`);
  } else {
    console.log(`✓ Removed ${pagesToRemove.length} page(s)`);
  }

  console.log(`\nCleaned ${pagesToRemove.length} page(s)`);
}
