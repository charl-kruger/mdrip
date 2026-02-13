import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const MDRIP_ENTRY = "/mdrip/";
const MARKER_COMMENT = "# mdrip - markdown snapshots for agents";

export async function hasMdripEntry(
  cwd: string = process.cwd(),
): Promise<boolean> {
  const gitignorePath = join(cwd, ".gitignore");

  if (!existsSync(gitignorePath)) {
    return false;
  }

  try {
    const content = await readFile(gitignorePath, "utf-8");
    const lines = content.split("\n");

    return lines.some((line) => {
      const trimmed = line.trim();
      return (
        trimmed === MDRIP_ENTRY ||
        trimmed === "mdrip/" ||
        trimmed === "/mdrip" ||
        trimmed === "mdrip"
      );
    });
  } catch {
    return false;
  }
}

export async function ensureGitignore(
  cwd: string = process.cwd(),
): Promise<boolean> {
  const gitignorePath = join(cwd, ".gitignore");

  if (await hasMdripEntry(cwd)) {
    return false;
  }

  let content = "";

  if (existsSync(gitignorePath)) {
    content = await readFile(gitignorePath, "utf-8");
    if (content.length > 0 && !content.endsWith("\n")) {
      content += "\n";
    }
    if (content.trim().length > 0) {
      content += "\n";
    }
  }

  content += `${MARKER_COMMENT}\n${MDRIP_ENTRY}\n`;

  await writeFile(gitignorePath, content, "utf-8");
  return true;
}
