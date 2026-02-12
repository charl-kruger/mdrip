import { describe, it, expect } from "vitest";
import { convertHtmlToMarkdown, estimateTokenCount } from "./html-to-markdown.js";

describe("convertHtmlToMarkdown", () => {
  it("converts common HTML content into markdown", () => {
    const html = `
      <html>
        <head><title>Example Page</title></head>
        <body>
          <main>
            <h2>Intro</h2>
            <p>Hello <strong>world</strong> and <a href="/docs">docs</a>.</p>
            <ul>
              <li>one</li>
              <li>two</li>
            </ul>
            <pre class="language-ts"><code>const n = 1;</code></pre>
          </main>
        </body>
      </html>
    `;

    const markdown = convertHtmlToMarkdown(html, "https://example.com/base");

    expect(markdown).toContain("# Example Page");
    expect(markdown).toContain("## Intro");
    expect(markdown).toContain("Hello **world** and [docs](https://example.com/docs).");
    expect(markdown).toContain("- one");
    expect(markdown).toContain("- two");
    expect(markdown).toContain("```ts");
    expect(markdown).toContain("const n = 1;");
  });

  it("skips scripts and styles", () => {
    const html = `
      <html>
        <body>
          <main>
            <script>window.secret = 1;</script>
            <style>body { display: none; }</style>
            <p>Visible text</p>
          </main>
        </body>
      </html>
    `;

    const markdown = convertHtmlToMarkdown(html);

    expect(markdown).toContain("Visible text");
    expect(markdown).not.toContain("window.secret");
    expect(markdown).not.toContain("display: none");
  });
});

describe("estimateTokenCount", () => {
  it("returns 0 for empty markdown and estimate for text", () => {
    expect(estimateTokenCount(" ")).toBe(0);
    expect(estimateTokenCount("12345678")).toBe(2);
  });
});
