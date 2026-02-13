import { describe, it, expect } from "vitest";
import { mkdtemp, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import {
  fetchToStore,
  listStoredPages,
  fetchManyToStore,
} from "./api.js";
import { fetchMarkdown, fetchRawMarkdown } from "./web.js";

describe("api", () => {
  it("fetchMarkdown normalizes URL before requesting", async () => {
    let requestedUrl = "";
    const mockFetch: typeof fetch = async (input) => {
      requestedUrl = String(input);
      return new Response("# Hello", {
        status: 200,
        headers: {
          "content-type": "text/markdown; charset=utf-8",
        },
      });
    };

    const result = await fetchMarkdown("example.com/docs", {
      fetchImpl: mockFetch,
    });

    expect(requestedUrl).toBe("https://example.com/docs");
    expect(result.markdown).toBe("# Hello");
  });

  it("fetchRawMarkdown returns markdown content only", async () => {
    const mockFetch: typeof fetch = async () =>
      new Response("# Raw", {
        status: 200,
        headers: {
          "content-type": "text/markdown; charset=utf-8",
        },
      });

    const markdown = await fetchRawMarkdown("example.com", {
      fetchImpl: mockFetch,
    });

    expect(markdown).toBe("# Raw");
  });

  it("fetchToStore writes snapshot and updates sources index", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "mdrip-api-"));

    try {
      const mockFetch: typeof fetch = async () =>
        new Response("# Stored", {
          status: 200,
          headers: {
            "content-type": "text/markdown; charset=utf-8",
            "x-markdown-tokens": "2",
          },
        });

      const result = await fetchToStore("https://example.com/docs/page", {
        cwd,
        fetchImpl: mockFetch,
      });

      expect(result.success).toBe(true);
      expect(result.path).toBe("pages/example.com/docs/page.md");

      const pages = await listStoredPages(cwd);
      expect(pages).toHaveLength(1);
      expect(pages[0].url).toBe("https://example.com/docs/page");

      const filePath = join(cwd, "mdrip", result.path);
      const content = await readFile(filePath, "utf-8");
      expect(content).toBe("# Stored");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("fetchManyToStore records mixed success results", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "mdrip-api-"));

    try {
      const mockFetch: typeof fetch = async () =>
        new Response("# Multi", {
          status: 200,
          headers: {
            "content-type": "text/markdown; charset=utf-8",
          },
        });

      const results = await fetchManyToStore(
        ["https://example.com/a", "ftp://example.com/a"],
        {
          cwd,
          fetchImpl: mockFetch,
        },
      );

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);

      const pages = await listStoredPages(cwd);
      expect(pages).toHaveLength(1);
      expect(pages[0].url).toBe("https://example.com/a");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
