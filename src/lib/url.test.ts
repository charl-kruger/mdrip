import { describe, it, expect } from "vitest";
import { parseUrlSpec, normalizeUrl, getPageRelativePath, getUrlHost } from "./url.js";

describe("parseUrlSpec", () => {
  it("adds https when protocol is omitted", () => {
    const url = parseUrlSpec("developers.cloudflare.com/fundamentals/");
    expect(url.toString()).toBe("https://developers.cloudflare.com/fundamentals/");
  });

  it("supports http and strips hash fragments", () => {
    const url = parseUrlSpec("http://example.com/docs#intro");
    expect(url.toString()).toBe("http://example.com/docs");
  });

  it("rejects unsupported protocols", () => {
    expect(() => parseUrlSpec("ftp://example.com/file")).toThrow(
      "Unsupported URL protocol",
    );
  });
});

describe("normalizeUrl", () => {
  it("returns canonical URL", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com/");
  });
});

describe("getPageRelativePath", () => {
  it("stores site root as index.md", () => {
    expect(getPageRelativePath("https://example.com/")).toBe(
      "pages/example.com/index.md",
    );
  });

  it("stores trailing-slash paths under index.md", () => {
    expect(getPageRelativePath("https://example.com/docs/guides/")).toBe(
      "pages/example.com/docs/guides/index.md",
    );
  });

  it("stores leaf page as <name>.md", () => {
    expect(getPageRelativePath("https://example.com/docs/page")).toBe(
      "pages/example.com/docs/page.md",
    );
  });

  it("adds deterministic query hash suffix", () => {
    const path = getPageRelativePath("https://example.com/docs/page?lang=en");
    expect(path).toMatch(/^pages\/example\.com\/docs\/page--q-[a-f0-9]{8}\.md$/);
  });
});

describe("getUrlHost", () => {
  it("extracts lowercase hostname", () => {
    expect(getUrlHost("https://Developers.Cloudflare.com/path")).toBe(
      "developers.cloudflare.com",
    );
  });
});
