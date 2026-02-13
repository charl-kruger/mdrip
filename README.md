# mdrip

Fetch clean markdown snapshots of any web page — optimized for AI agents, RAG pipelines, and context-aware workflows.

Reduces token overhead by ~90% compared to raw HTML while preserving the content structure LLMs need.

## Why

AI agents and LLMs work better with markdown than HTML. Feeding raw HTML into a context window wastes tokens on tags, scripts, styles, and boilerplate. mdrip solves this by fetching any URL and returning clean, structured markdown.

- **~90% fewer tokens** than raw HTML
- **Automatic HTML-to-markdown fallback** when native markdown isn't available
- **Works everywhere** — CLI, Node.js, Cloudflare Workers, or via remote MCP
- **Token-aware** — reports estimated token counts so you can manage context budgets

Sites that support [Cloudflare's Markdown for Agents](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/) return markdown natively at the edge. For all other sites, mdrip's built-in converter handles headings, links, lists, code blocks, tables, blockquotes, and more.

## Installation

```bash
npm install -g mdrip
```

Or use directly with `npx`:

```bash
npx mdrip <url>
```

## CLI Usage

### Fetch pages

```bash
# Fetch one page
mdrip https://example.com/docs/getting-started

# Fetch multiple pages
mdrip https://example.com/docs https://example.com/api

# Custom timeout (ms)
mdrip https://example.com --timeout 45000

# Strict mode — only accept native markdown, no HTML fallback
mdrip https://example.com --no-html-fallback

# Raw mode — print markdown to stdout, no file writes
mdrip https://example.com --raw
```

### List fetched pages

```bash
mdrip list
mdrip list --json
```

### Remove pages

```bash
mdrip remove https://example.com/docs/getting-started
```

### Clean snapshots

```bash
# Remove all
mdrip clean

# Remove only one domain
mdrip clean --domain example.com
```

### Raw mode for agent runtimes

`--raw` prints markdown to stdout and skips all file writes and prompts. Useful for piping content directly into agent loops.

```bash
mdrip https://example.com --raw | your-agent-cli
```

## Programmatic API

```bash
npm install mdrip
```

### Workers / Edge / In-memory

```ts
import { fetchMarkdown } from "mdrip";

const page = await fetchMarkdown("https://example.com/docs");

console.log(page.markdown);       // clean markdown content
console.log(page.markdownTokens); // estimated token count
console.log(page.source);         // "cloudflare-markdown" or "html-fallback"
```

### Node.js (fetch and store to disk)

```ts
import { fetchToStore, listStoredPages } from "mdrip/node";

const result = await fetchToStore("https://example.com/docs", {
  cwd: process.cwd(),
});

if (result.success) {
  console.log(`Saved to ${result.path}`);
}

const pages = await listStoredPages(process.cwd());
```

### Available exports

| Import | Environment | Functions |
|--------|-------------|-----------|
| `mdrip` | Workers, edge, browser | `fetchMarkdown()`, `fetchRawMarkdown()` |
| `mdrip/node` | Node.js | `fetchToStore()`, `fetchManyToStore()`, `listStoredPages()` |

## Remote MCP Server

mdrip is available as a remote MCP server at **`mdrip.createmcp.dev`** — no install required. Any MCP-compatible client can connect and use the `fetch_markdown` and `batch_fetch_markdown` tools.

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mdrip": {
      "command": "npx",
      "args": ["mcp-remote", "https://mdrip.createmcp.dev/mcp"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add mdrip-remote --transport sse https://mdrip.createmcp.dev/sse
```

### Cloudflare AI Playground

Enter `mdrip.createmcp.dev/sse` at [playground.ai.cloudflare.com](https://playground.ai.cloudflare.com/).

## File modifications

On first run, mdrip can optionally update:
- `.gitignore` — adds `mdrip/`
- `tsconfig.json` — excludes `mdrip/`
- `AGENTS.md` — adds a section pointing agents to your snapshots

Choice is stored in `mdrip/settings.json`. Use `--modify` or `--modify=false` to skip the prompt.

`--raw` mode bypasses this entirely.

## Output structure

```
mdrip/
├── settings.json
├── sources.json
└── pages/
    └── example.com/
        └── docs/
            └── getting-started/
                └── index.md
```

## Benchmark

Measured across popular pages (values vary as pages change):

| Page | Mode | Chars saved | Tokens saved |
|------|------|------------:|-------------:|
| blog.cloudflare.com/markdown-for-agents | cloudflare-markdown | 94.9% | 94.9% |
| developers.cloudflare.com/.../markdown-for-agents | cloudflare-markdown | 95.7% | 95.7% |
| en.wikipedia.org/wiki/Markdown | html-fallback | 72.7% | 72.7% |
| github.com/cloudflare/skills | html-fallback | 96.3% | 96.3% |
| **Average** | | **89.9%** | **89.9%** |

```bash
pnpm build && pnpm benchmark
```

## AI Skills

This repo includes an AI-consumable skills catalog in `skills/`, following the [agentskills](https://agentskills.io) format.

```bash
npx skills add charl-kruger/mdrip
```

## Requirements

- Node.js 18+

## Author

Charl Kruger

## License

Apache-2.0
