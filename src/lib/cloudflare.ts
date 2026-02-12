import { convertHtmlToMarkdown, estimateTokenCount } from "./html-to-markdown.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_ACCEPT = "text/markdown, text/html;q=0.9, */*;q=0.1";

export interface FetchMarkdownOptions {
  timeoutMs?: number;
  userAgent?: string;
  htmlFallback?: boolean;
  fetchImpl?: typeof fetch;
}

export interface MarkdownResponse {
  markdown: string;
  status: number;
  contentType: string;
  resolvedUrl: string;
  markdownTokens?: number;
  contentSignal?: string;
  source: "cloudflare-markdown" | "html-fallback";
}

function parseTokenHeader(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function fetchMarkdownPage(
  url: string,
  options: FetchMarkdownOptions = {},
): Promise<MarkdownResponse> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const htmlFallback = options.htmlFallback ?? true;
  const controller = new AbortController();
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: {
        Accept: DEFAULT_ACCEPT,
        "User-Agent": options.userAgent ?? "fetchmd-cli",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";

    const normalizedType = contentType.toLowerCase();

    if (normalizedType.includes("text/markdown")) {
      const markdown = await response.text();

      return {
        markdown,
        status: response.status,
        contentType,
        resolvedUrl: response.url || url,
        markdownTokens: parseTokenHeader(response.headers.get("x-markdown-tokens")),
        contentSignal: response.headers.get("content-signal") || undefined,
        source: "cloudflare-markdown",
      };
    }

    const isHtmlResponse =
      normalizedType.includes("text/html") ||
      normalizedType.includes("application/xhtml+xml");

    if (isHtmlResponse && htmlFallback) {
      const html = await response.text();
      const markdown = convertHtmlToMarkdown(html, response.url || url);

      return {
        markdown,
        status: response.status,
        contentType,
        resolvedUrl: response.url || url,
        markdownTokens: estimateTokenCount(markdown),
        contentSignal: response.headers.get("content-signal") || undefined,
        source: "html-fallback",
      };
    }

    if (isHtmlResponse && !htmlFallback) {
      throw new Error(
        `Expected text/markdown but received "${contentType || "unknown"}". Use HTML fallback (default) or remove --no-html-fallback.`,
      );
    }

    throw new Error(
      `Expected text/markdown but received "${contentType || "unknown"}". Response type is not convertible by HTML fallback.`,
    );
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
