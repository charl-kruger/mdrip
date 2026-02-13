# Fallback and Quality

## Fallback policy

- Default behavior: fallback from markdown negotiation to HTML-to-markdown conversion.
- Strict behavior: disable fallback with `--no-html-fallback`.

## Quality checks

- Keep heading hierarchy and code blocks intact.
- Preserve links in markdown form.
- Preserve list and table structure when possible.
- Avoid including obvious navigation/chrome noise where possible.

## Failure handling

- Timeout: suggest retry with `--timeout <ms>`.
- Non-2xx response: include status and URL in output.
- Empty markdown output: flag as partial failure and suggest strict retry or alternate source URL.

## Agent behavior guidance

- Prefer narrower section URLs over massive index pages.
- Batch related pages together for consistent local context.
- After fetches, use `mdrip list --json` before additional ingestion to avoid duplicate work.
