# Workflow Reference

## Intent

Create stable local markdown snapshots that agents can reuse across tasks without repeatedly crawling the same pages.

## Expected input

- One or more absolute URLs.
- Optional timeout override.
- Optional `--no-html-fallback` flag.

## Storage contract

- Base directory: `mdrip/`
- Page snapshots: `mdrip/pages/<host>/<path>/index.md`
- Source index: `mdrip/sources.json`
- Settings: `mdrip/settings.json`

## Fetch logic

1. Request page with `Accept: text/markdown`.
2. If response is markdown, persist directly.
3. If response is HTML and fallback is enabled, convert HTML to markdown.
4. Persist the normalized markdown and update `sources.json`.

## Result reporting

For each URL, report:
- local output path
- mode: `cloudflare-markdown` or `html-fallback`
- `x-markdown-tokens` value when present
- failure details when request fails
