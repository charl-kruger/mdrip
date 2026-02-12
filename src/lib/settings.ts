import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const FETCHMD_DIR = "fetchmd";
const SETTINGS_FILE = "settings.json";

export interface FetchmdSettings {
  allowFileModifications?: boolean;
}

function getSettingsPath(cwd: string): string {
  return join(cwd, FETCHMD_DIR, SETTINGS_FILE);
}

export async function ensureFetchmdDir(cwd: string): Promise<void> {
  const fetchmdDir = join(cwd, FETCHMD_DIR);
  if (!existsSync(fetchmdDir)) {
    await mkdir(fetchmdDir, { recursive: true });
  }
}

export async function readSettings(
  cwd: string = process.cwd(),
): Promise<FetchmdSettings> {
  const settingsPath = getSettingsPath(cwd);

  if (!existsSync(settingsPath)) {
    return {};
  }

  try {
    const content = await readFile(settingsPath, "utf-8");
    return JSON.parse(content) as FetchmdSettings;
  } catch {
    return {};
  }
}

export async function writeSettings(
  settings: FetchmdSettings,
  cwd: string = process.cwd(),
): Promise<void> {
  await ensureFetchmdDir(cwd);
  const settingsPath = getSettingsPath(cwd);
  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf-8");
}

export async function getFileModificationPermission(
  cwd: string = process.cwd(),
): Promise<boolean | undefined> {
  const settings = await readSettings(cwd);
  return settings.allowFileModifications;
}

export async function setFileModificationPermission(
  allowed: boolean,
  cwd: string = process.cwd(),
): Promise<void> {
  const settings = await readSettings(cwd);
  settings.allowFileModifications = allowed;
  await writeSettings(settings, cwd);
}
