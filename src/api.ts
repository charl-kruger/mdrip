import {
  fetchMarkdownPage,
  type FetchMarkdownOptions,
  type MarkdownResponse,
} from "./lib/cloudflare.js";
import {
  listSources,
  savePageMarkdown,
} from "./lib/storage.js";
import { updatePageIndex } from "./lib/agents.js";
import { normalizeUrl } from "./lib/url.js";
import type { FetchResult, PageEntry, SourcesIndex } from "./types.js";

export type {
  FetchMarkdownOptions,
  MarkdownResponse,
  FetchResult,
  PageEntry,
  SourcesIndex,
};

export interface StoreFetchOptions extends FetchMarkdownOptions {
  cwd?: string;
}

function mergeResults(existing: PageEntry[], results: FetchResult[]): PageEntry[] {
  const now = new Date().toISOString();
  const merged = [...existing];

  for (const result of results) {
    if (!result.success || !result.path) {
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

async function fetchOneForStore(
  spec: string,
  cwd: string,
  options: StoreFetchOptions,
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

  try {
    const response = await fetchMarkdownPage(normalizedUrl, options);
    const storageUrl = normalizeUrl(response.resolvedUrl || normalizedUrl);
    const outputPath = await savePageMarkdown(storageUrl, response.markdown, cwd);

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
    return {
      url: normalizedUrl,
      path: "",
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function fetchMarkdown(
  url: string,
  options: FetchMarkdownOptions = {},
): Promise<MarkdownResponse> {
  const normalizedUrl = normalizeUrl(url);
  return fetchMarkdownPage(normalizedUrl, options);
}

export async function fetchRawMarkdown(
  url: string,
  options: FetchMarkdownOptions = {},
): Promise<string> {
  const response = await fetchMarkdown(url, options);
  return response.markdown;
}

export async function fetchToStore(
  url: string,
  options: StoreFetchOptions = {},
): Promise<FetchResult> {
  const cwd = options.cwd || process.cwd();
  const result = await fetchOneForStore(url, cwd, options);

  if (!result.success) {
    return result;
  }

  const existing = await listSources(cwd);
  const pages = mergeResults(existing.pages, [result]);
  await updatePageIndex({ pages }, cwd);

  return result;
}

export async function fetchManyToStore(
  urls: string[],
  options: StoreFetchOptions = {},
): Promise<FetchResult[]> {
  const cwd = options.cwd || process.cwd();
  const results: FetchResult[] = [];

  for (const spec of urls) {
    const result = await fetchOneForStore(spec, cwd, options);
    results.push(result);
  }

  const successful = results.filter((result) => result.success);
  if (successful.length > 0) {
    const existing = await listSources(cwd);
    const pages = mergeResults(existing.pages, successful);
    await updatePageIndex({ pages }, cwd);
  }

  return results;
}

export async function listStoredPages(
  cwd: string = process.cwd(),
): Promise<PageEntry[]> {
  const sources = await listSources(cwd);
  return sources.pages;
}
