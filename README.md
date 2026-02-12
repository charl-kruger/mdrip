# mdrip

Fetch markdown snapshots of web pages using Cloudflare's Markdown for Agents feature, so coding agents can consume clean structured content instead of HTML.

## AI Skills

This repo also includes an AI-consumable skills catalog in `skills/`, following the [agentskills](https://agentskills.io) format.

- Skill index: `skills/README.md`
- mdrip skill: `skills/mdrip/SKILL.md`

### Install skills from this repo

If you use a Skills-compatible agent setup, you can add these skills directly:

```bash
# install skills from this repo
npx skills add charl-kruger/mdrip
```

## Why

For agent workflows, markdown is often better than HTML:
- cleaner structure
- lower token overhead
- easier chunking and context management

`mdrip` requests pages with `Accept: text/markdown`, stores the markdown locally, and tracks fetched pages in an index.

If a site does not return `text/markdown`, `mdrip` can automatically fall back to converting `text/html` into markdown.
The fallback uses an in-project converter optimized for common documentation/blog content (headings, links, lists, code blocks, tables, blockquotes).

## Why Cloudflare Markdown for Agents matters

Cloudflare's blog and docs describe Markdown for Agents as content negotiation at the edge:
- clients request `Accept: text/markdown`
- Cloudflare converts HTML to markdown in real time (for enabled zones)
- response includes `x-markdown-tokens` for token-size awareness

For AI workflows this is high-value:
- better structure for LLM parsing than raw HTML
- less token waste in context windows
- predictable markdown snapshots you can store and reuse in your repo

References:
- [Cloudflare blog: Markdown for Agents](https://blog.cloudflare.com/markdown-for-agents/)
- [Cloudflare docs: Markdown for Agents](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/)

## Installation

```bash
npm install -g mdrip
```

Or use with `npx`:

```bash
npx mdrip <url>
```

## Usage

### Fetch pages

```bash
# Fetch one page
mdrip https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/

# Fetch multiple pages
mdrip https://blog.cloudflare.com/markdown-for-agents/ https://developers.cloudflare.com/

# Optional timeout override (ms)
mdrip https://example.com --timeout 45000

# Disable HTML fallback (strict Cloudflare markdown only)
mdrip https://example.com --no-html-fallback
```

### List fetched pages

```bash
mdrip list
mdrip list --json
```

### Remove pages

```bash
mdrip remove https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/
```

### Clean snapshots

```bash
# Remove all
mdrip clean

# Remove only one domain
mdrip clean --domain developers.cloudflare.com
```

## File modifications

On first run, mdrip can optionally update:
- `.gitignore` (adds `mdrip/`)
- `tsconfig.json` (excludes `mdrip`)
- `AGENTS.md` (adds a section pointing agents to snapshots)

Choice is stored in `mdrip/settings.json`.

Use flags to skip prompt:

```bash
# allow updates
mdrip https://example.com --modify

# deny updates
mdrip https://example.com --modify=false
```

## Output

```text
mdrip/
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
- If a page does not return `text/markdown`, mdrip can convert `text/html` into markdown fallback unless `--no-html-fallback` is used.

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
