import { listSources } from "../lib/storage.js";
import { getUrlHost } from "../lib/url.js";

export interface ListOptions {
  cwd?: string;
  json?: boolean;
}

export async function listCommand(options: ListOptions = {}): Promise<void> {
  const cwd = options.cwd || process.cwd();
  const sources = await listSources(cwd);

  if (sources.pages.length === 0) {
    console.log("No markdown pages fetched yet.");
    console.log("\nUse `fetchmd <url>` to fetch markdown for a page.");
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(sources, null, 2));
    return;
  }

  const byHost = new Map<string, typeof sources.pages>();

  for (const page of sources.pages) {
    const host = getUrlHost(page.resolvedUrl || page.url);
    const list = byHost.get(host) || [];
    list.push(page);
    byHost.set(host, list);
  }

  const hosts = [...byHost.keys()].sort((a, b) => a.localeCompare(b));

  for (const host of hosts) {
    console.log(`${host}:\n`);
    const pages = byHost
      .get(host)!
      .slice()
      .sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt));

    for (const page of pages) {
      const date = new Date(page.fetchedAt);
      const formattedDate = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      console.log(`  ${page.url}`);
      console.log(`    Path: fetchmd/${page.path}`);
      console.log(`    Fetched: ${formattedDate}`);
      if (page.source) {
        const sourceLabel =
          page.source === "cloudflare-markdown"
            ? "Cloudflare Markdown for Agents"
            : "HTML fallback conversion";
        console.log(`    Source: ${sourceLabel}`);
      }
      if (page.markdownTokens !== undefined) {
        console.log(`    Tokens: ${page.markdownTokens}`);
      }
      console.log("");
    }
  }

  const totalTokens = sources.pages.reduce(
    (acc, page) => acc + (page.markdownTokens || 0),
    0,
  );

  const tokenSummary = totalTokens > 0 ? `, ~${totalTokens} tokens` : "";
  console.log(`Total: ${sources.pages.length} page(s), ${hosts.length} domain(s)${tokenSummary}`);
}
