---
name: mdrip
description: Fetch markdown snapshots from websites into the local repository using Cloudflare Markdown for Agents, with robust HTML-to-markdown fallback.
license: Apache-2.0
---

# mdrip

Use this skill when an agent needs local, reusable markdown context from web pages for implementation, debugging, or documentation work.

## When to use

- You need to ingest docs/blog pages into the repository as markdown.
- You want to prefer `Accept: text/markdown` for Cloudflare Markdown for Agents.
- You still need good results when a site only returns HTML.
- You need raw markdown streamed to stdout for agent runtimes (for example OpenClaw) without writing local snapshot files.
- You need to call mdrip as a library from Node.js or Cloudflare Workers.

## Core workflow

1. Fetch target URLs with markdown content negotiation.
2. Detect whether markdown was served (`content-type: text/markdown`).
3. If markdown is not served and fallback is allowed, convert HTML to markdown.
4. Save snapshots under `mdrip/pages/.../index.md`.
5. Update source tracking in `mdrip/sources.json`.
6. Return a concise summary of paths, content mode, and failures.

## Commands

```bash
# fetch one page
npx mdrip <url>

# fetch many pages
npx mdrip <url1> <url2> <url3>

# strict Cloudflare markdown only (no html fallback)
npx mdrip <url> --no-html-fallback

# raw markdown to stdout only (no settings/snapshot writes)
npx mdrip <url> --raw

# inspect tracked pages
npx mdrip list --json
```

## Programmatic usage

```ts
// Workers/agent runtimes (no filesystem writes)
import { fetchMarkdown, fetchRawMarkdown } from "mdrip";

// Node.js filesystem helpers
import { fetchToStore, fetchManyToStore, listStoredPages } from "mdrip/node";
```

## Guardrails

- Prefer official sources and canonical URLs.
- Do not overwrite unrelated files.
- Report whether each result came from Cloudflare markdown or HTML fallback.
- If a fetch fails, include URL, HTTP status/error, and next-step retry guidance.

## References

- `references/workflow.md`
- `references/fallback-and-quality.md`
