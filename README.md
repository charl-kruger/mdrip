# fetchmd

Fetch markdown snapshots of web pages using Cloudflare's Markdown for Agents feature, so coding agents can consume clean structured content instead of HTML.

## Why

For agent workflows, markdown is often better than HTML:
- cleaner structure
- lower token overhead
- easier chunking and context management

`fetchmd` requests pages with `Accept: text/markdown`, stores the markdown locally, and tracks fetched pages in an index.

If a site does not return `text/markdown`, `fetchmd` can automatically fall back to converting `text/html` into markdown.
The fallback uses an in-project converter optimized for common documentation/blog content (headings, links, lists, code blocks, tables, blockquotes).

## Installation

```bash
npm install -g fetchmd
```

Or use with `npx`:

```bash
npx fetchmd <url>
```

## Usage

### Fetch pages

```bash
# Fetch one page
fetchmd https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/

# Fetch multiple pages
fetchmd https://blog.cloudflare.com/markdown-for-agents/ https://developers.cloudflare.com/

# Optional timeout override (ms)
fetchmd https://example.com --timeout 45000

# Disable HTML fallback (strict Cloudflare markdown only)
fetchmd https://example.com --no-html-fallback
```

### List fetched pages

```bash
fetchmd list
fetchmd list --json
```

### Remove pages

```bash
fetchmd remove https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/
```

### Clean snapshots

```bash
# Remove all
fetchmd clean

# Remove only one domain
fetchmd clean --domain developers.cloudflare.com
```

## File modifications

On first run, fetchmd can optionally update:
- `.gitignore` (adds `fetchmd/`)
- `tsconfig.json` (excludes `fetchmd`)
- `AGENTS.md` (adds a section pointing agents to snapshots)

Choice is stored in `fetchmd/settings.json`.

Use flags to skip prompt:

```bash
# allow updates
fetchmd https://example.com --modify

# deny updates
fetchmd https://example.com --modify=false
```

## Output

```text
fetchmd/
├── settings.json
├── sources.json
└── pages/
    └── developers.cloudflare.com/
        └── fundamentals/
            └── reference/
                └── markdown-for-agents/
                    └── index.md
```

## Requirements and notes

- Node.js 18+
- The target site must return markdown for `Accept: text/markdown` (Cloudflare Markdown for Agents enabled).
- If a page does not return `text/markdown`, fetchmd can convert `text/html` into markdown fallback unless `--no-html-fallback` is used.

## Publishing to npm

```bash
# optional package check
pnpm publish:dry-run

# publish to npm
pnpm publish:npm
```

`prepublishOnly` runs automatically before publish and executes:
- `pnpm type-check`
- `pnpm test`
- `pnpm build`

## Author

Charl Kruger

## License

Apache-2.0
