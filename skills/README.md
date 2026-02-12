# mdrip Skills

This repository includes portable AI skills in the [agentskills](https://agentskills.io) format.

Each skill lives in its own folder and contains:
- `SKILL.md` (required)
- optional `references/`, `scripts/`, and `assets/`

## Install

```bash
# install skills from this GitHub repo
npx skills add charl-kruger/mdrip
```

## Available skills

- `skills/mdrip`: Pull website pages into local markdown snapshots using Cloudflare Markdown for Agents, with HTML-to-markdown fallback.

## Validation

You can validate any skill with `skills-ref`:

```bash
skills-ref validate /absolute/path/to/skills/mdrip
```
