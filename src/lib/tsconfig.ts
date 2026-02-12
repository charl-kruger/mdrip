import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const FETCHMD_DIR = "fetchmd";

interface TsConfig {
  exclude?: string[];
  [key: string]: unknown;
}

export function hasTsConfig(cwd: string = process.cwd()): boolean {
  return existsSync(join(cwd, "tsconfig.json"));
}

export async function hasFetchmdExclude(
  cwd: string = process.cwd(),
): Promise<boolean> {
  const tsconfigPath = join(cwd, "tsconfig.json");

  if (!existsSync(tsconfigPath)) {
    return false;
  }

  try {
    const content = await readFile(tsconfigPath, "utf-8");
    const config = JSON.parse(content) as TsConfig;

    if (!config.exclude) {
      return false;
    }

    return config.exclude.some(
      (entry) =>
        entry === FETCHMD_DIR ||
        entry === `${FETCHMD_DIR}/` ||
        entry === `./${FETCHMD_DIR}`,
    );
  } catch {
    return false;
  }
}

export async function ensureTsconfigExclude(
  cwd: string = process.cwd(),
): Promise<boolean> {
  const tsconfigPath = join(cwd, "tsconfig.json");

  if (!existsSync(tsconfigPath)) {
    return false;
  }

  if (await hasFetchmdExclude(cwd)) {
    return false;
  }

  try {
    const content = await readFile(tsconfigPath, "utf-8");
    const config = JSON.parse(content) as TsConfig;

    if (!config.exclude) {
      config.exclude = [];
    }

    config.exclude.push(FETCHMD_DIR);

    await writeFile(tsconfigPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
    return true;
  } catch {
    return false;
  }
}
