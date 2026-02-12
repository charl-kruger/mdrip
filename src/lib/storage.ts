import { readFile, writeFile, mkdir, rm, readdir } from "fs/promises";
import { join, dirname } from "path";
import { existsSync } from "fs";
import type { PageEntry } from "../types.js";
import { getPageRelativePath, normalizeUrl } from "./url.js";
import { ensureFetchmdDir } from "./settings.js";

const FETCHMD_DIR = "fetchmd";
const PAGES_DIR = "pages";
const SOURCES_FILE = "sources.json";

interface SourcesFileData {
  pages?: PageEntry[];
}

export function getFetchmdDir(cwd: string = process.cwd()): string {
  return join(cwd, FETCHMD_DIR);
}

export function getPagesDir(cwd: string = process.cwd()): string {
  return join(getFetchmdDir(cwd), PAGES_DIR);
}

function getSourcesPath(cwd: string): string {
  return join(getFetchmdDir(cwd), SOURCES_FILE);
}

async function readSourcesData(cwd: string): Promise<SourcesFileData | null> {
  const sourcesPath = getSourcesPath(cwd);

  if (!existsSync(sourcesPath)) {
    return null;
  }

  try {
    const content = await readFile(sourcesPath, "utf-8");
    return JSON.parse(content) as SourcesFileData;
  } catch {
    return null;
  }
}

export async function listSources(cwd: string = process.cwd()): Promise<{
  pages: PageEntry[];
}> {
  const sources = await readSourcesData(cwd);

  return {
    pages: sources?.pages || [],
  };
}

export async function getPageInfo(
  url: string,
  cwd: string = process.cwd(),
): Promise<PageEntry | null> {
  const normalized = normalizeUrl(url);
  const sources = await listSources(cwd);

  return (
    sources.pages.find(
      (page) => page.url === normalized || page.resolvedUrl === normalized,
    ) || null
  );
}

export async function savePageMarkdown(
  url: string,
  markdown: string,
  cwd: string = process.cwd(),
): Promise<string> {
  await ensureFetchmdDir(cwd);

  const relativePath = getPageRelativePath(url);
  const fullPath = join(getFetchmdDir(cwd), relativePath);

  const parentDir = dirname(fullPath);
  if (!existsSync(parentDir)) {
    await mkdir(parentDir, { recursive: true });
  }

  await writeFile(fullPath, markdown, "utf-8");
  return relativePath;
}

export async function removeStoredPage(
  relativePath: string,
  cwd: string = process.cwd(),
): Promise<boolean> {
  const fullPath = join(getFetchmdDir(cwd), relativePath);

  if (!existsSync(fullPath)) {
    return false;
  }

  await rm(fullPath, { force: true });
  return true;
}

async function cleanupEmptyDirs(dir: string): Promise<boolean> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        await cleanupEmptyDirs(join(dir, entry.name));
      }
    }

    const remaining = await readdir(dir);
    if (remaining.length === 0) {
      await rm(dir, { recursive: true, force: true });
      return true;
    }
  } catch {
    // Ignore cleanup errors.
  }

  return false;
}

export async function cleanupEmptyPageDirs(
  cwd: string = process.cwd(),
): Promise<void> {
  const pagesDir = getPagesDir(cwd);
  if (!existsSync(pagesDir)) {
    return;
  }

  await cleanupEmptyDirs(pagesDir);
}
