import { describe, it, expect } from "vitest";
import { fetchMarkdownPage } from "./cloudflare.js";

describe("fetchMarkdownPage", () => {
  it("uses Cloudflare markdown response when available", async () => {
    const mockFetch: typeof fetch = async () =>
      new Response("# Hello", {
        status: 200,
        headers: {
          "content-type": "text/markdown; charset=utf-8",
          "x-markdown-tokens": "22",
          "content-signal": "ai-input=yes",
        },
      });

    const result = await fetchMarkdownPage("https://example.com", {
      fetchImpl: mockFetch,
    });

    expect(result.source).toBe("cloudflare-markdown");
    expect(result.markdown).toBe("# Hello");
    expect(result.markdownTokens).toBe(22);
    expect(result.contentSignal).toBe("ai-input=yes");
  });

  it("falls back to HTML conversion when markdown is not returned", async () => {
    const mockFetch: typeof fetch = async () =>
      new Response("<html><body><main><h1>Welcome</h1><p>Page</p></main></body></html>", {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      });

    const result = await fetchMarkdownPage("https://example.com", {
      fetchImpl: mockFetch,
    });

    expect(result.source).toBe("html-fallback");
    expect(result.markdown).toContain("# Welcome");
    expect(result.markdownTokens).toBeGreaterThan(0);
  });

  it("errors on HTML when fallback is disabled", async () => {
    const mockFetch: typeof fetch = async () =>
      new Response("<html><body>test</body></html>", {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      });

    await expect(
      fetchMarkdownPage("https://example.com", {
        fetchImpl: mockFetch,
        htmlFallback: false,
      }),
    ).rejects.toThrow(/Expected text\/markdown/);
  });

  it("errors on unsupported non-markdown content types", async () => {
    const mockFetch: typeof fetch = async () =>
      new Response('{"ok":true}', {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });

    await expect(
      fetchMarkdownPage("https://example.com", {
        fetchImpl: mockFetch,
      }),
    ).rejects.toThrow(/not convertible by HTML fallback/);
  });
});
