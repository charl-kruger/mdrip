import {
  fetchMarkdownPage,
  type FetchMarkdownOptions,
  type MarkdownResponse,
} from "./lib/cloudflare.js";
import { normalizeUrl } from "./lib/url.js";

export type { FetchMarkdownOptions, MarkdownResponse };

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
