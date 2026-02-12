import { readFile, writeFile, rm } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import type { PageEntry, SourcesIndex } from "../types.js";
import { ensureFetchmdDir } from "./settings.js";

const AGENTS_FILE = "AGENTS.md";
const FETCHMD_DIR = "fetchmd";
const SOURCES_FILE = "sources.json";
const SECTION_TITLE = "## Website Markdown Reference";
const SECTION_MARKER = "<!-- fetchmd:start -->";
const SECTION_END_MARKER = "<!-- fetchmd:end -->";

function getSectionContent(): string {
  return `${SECTION_MARKER}

${SECTION_TITLE}

Markdown snapshots of web pages are available in \`fetchmd/\` for deeper implementation context in AI workflows.

See \`fetchmd/sources.json\` for the list of available pages and metadata such as token estimates.

Use these snapshots when your agent needs structured page content instead of raw HTML.

### Fetching Additional Pages

To fetch markdown for one or more pages, run:

\`\`\`bash
npx fetchmd <url>
npx fetchmd https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/
\`\`\`

${SECTION_END_MARKER}`;
}

function getSourcesPath(cwd: string): string {
  return join(cwd, FETCHMD_DIR, SOURCES_FILE);
}

function extractSection(content: string): string | null {
  const startIdx = content.indexOf(SECTION_MARKER);
  const endIdx = content.indexOf(SECTION_END_MARKER);

  if (startIdx === -1 || endIdx === -1) {
    return null;
  }

  return content.slice(startIdx, endIdx + SECTION_END_MARKER.length);
}

export async function updatePageIndex(
  sources: { pages: PageEntry[] },
  cwd: string = process.cwd(),
): Promise<void> {
  await ensureFetchmdDir(cwd);
  const sourcesPath = getSourcesPath(cwd);

  if (sources.pages.length === 0) {
    if (existsSync(sourcesPath)) {
      await rm(sourcesPath, { force: true });
    }
    return;
  }

  const index: SourcesIndex = {
    updatedAt: new Date().toISOString(),
    pages: sources.pages.map((page) => ({ ...page })),
  };

  await writeFile(sourcesPath, JSON.stringify(index, null, 2) + "\n", "utf-8");
}

export async function ensureAgentsMd(
  cwd: string = process.cwd(),
): Promise<boolean> {
  const agentsPath = join(cwd, AGENTS_FILE);
  const newSection = getSectionContent();

  if (existsSync(agentsPath)) {
    const content = await readFile(agentsPath, "utf-8");

    if (content.includes(SECTION_MARKER)) {
      const existingSection = extractSection(content);
      if (existingSection === newSection) {
        return false;
      }

      const startIdx = content.indexOf(SECTION_MARKER);
      const endIdx = content.indexOf(SECTION_END_MARKER);
      const before = content.slice(0, startIdx);
      const after = content.slice(endIdx + SECTION_END_MARKER.length);

      await writeFile(agentsPath, before + newSection + after, "utf-8");
      return true;
    }

    let newContent = content;
    if (newContent.length > 0 && !newContent.endsWith("\n")) {
      newContent += "\n";
    }
    newContent += "\n" + newSection;
    await writeFile(agentsPath, newContent, "utf-8");
    return true;
  }

  const content = `# AGENTS.md

Instructions for AI coding agents working with this codebase.

${newSection}
`;

  await writeFile(agentsPath, content, "utf-8");
  return true;
}

export async function removeFetchmdSection(
  cwd: string = process.cwd(),
): Promise<boolean> {
  const agentsPath = join(cwd, AGENTS_FILE);

  if (!existsSync(agentsPath)) {
    return false;
  }

  try {
    const content = await readFile(agentsPath, "utf-8");

    if (!content.includes(SECTION_MARKER)) {
      return false;
    }

    const startIdx = content.indexOf(SECTION_MARKER);
    const endIdx = content.indexOf(SECTION_END_MARKER);

    if (startIdx === -1 || endIdx === -1) {
      return false;
    }

    const before = content.slice(0, startIdx).trimEnd();
    const after = content.slice(endIdx + SECTION_END_MARKER.length).trimStart();

    let newContent = before;
    if (after) {
      newContent += "\n\n" + after;
    }

    newContent = newContent.replace(/\n{3,}/g, "\n\n").trim() + "\n";

    await writeFile(agentsPath, newContent, "utf-8");
    return true;
  } catch {
    return false;
  }
}

export async function updateAgentsMd(
  sources: { pages: PageEntry[] },
  cwd: string = process.cwd(),
): Promise<boolean> {
  await updatePageIndex(sources, cwd);

  if (sources.pages.length > 0) {
    return ensureAgentsMd(cwd);
  }

  return removeFetchmdSection(cwd);
}
