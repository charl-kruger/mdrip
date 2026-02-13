#!/usr/bin/env node

import { Command } from "commander";
import { fetchCommand } from "./commands/fetch.js";
import { listCommand } from "./commands/list.js";
import { removeCommand } from "./commands/remove.js";
import { cleanCommand } from "./commands/clean.js";

const program = new Command();

program
  .name("mdrip")
  .description(
    "Fetch markdown snapshots for URLs using Cloudflare Markdown for Agents",
  )
  .version("0.1.3")
  .option("--cwd <path>", "working directory (default: current directory)");

program
  .argument("[urls...]", "URLs to fetch as markdown")
  .option(
    "--modify [value]",
    "allow/deny modifying .gitignore, tsconfig.json, AGENTS.md",
    (val) => {
      if (val === undefined || val === "" || val === "true") return true;
      if (val === "false") return false;
      return true;
    },
  )
  .option("--timeout <ms>", "request timeout in milliseconds", (value) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error("--timeout must be a positive integer");
    }
    return parsed;
  })
  .option(
    "--no-html-fallback",
    "disable HTML->Markdown fallback when text/markdown is unavailable",
  )
  .option(
    "--raw",
    "print raw markdown to stdout without writing files or updating settings",
  )
  .action(
    async (
      urls: string[],
      options: {
        modify?: boolean;
        timeout?: number;
        htmlFallback?: boolean;
        raw?: boolean;
      },
      command: Command,
    ) => {
      const globalOptions = command.optsWithGlobals<{ cwd?: string }>();

      if (urls.length === 0) {
        program.help();
        return;
      }

      if (options.raw && urls.length !== 1) {
        command.error("--raw requires exactly one URL");
        return;
      }

      await fetchCommand(urls, {
        cwd: globalOptions.cwd,
        allowModifications: options.modify,
        timeoutMs: options.timeout,
        htmlFallback: options.htmlFallback,
        raw: options.raw,
      });
    },
  );

program
  .command("list")
  .description("List all fetched markdown pages")
  .option("--json", "output as JSON")
  .action(async (options: { json?: boolean }, command: Command) => {
    const globalOptions = command.optsWithGlobals<{ cwd?: string }>();
    await listCommand({
      json: options.json,
      cwd: globalOptions.cwd,
    });
  });

program
  .command("remove <urls...>")
  .alias("rm")
  .description("Remove fetched markdown snapshots for one or more URLs")
  .action(async (urls: string[], _options: unknown, command: Command) => {
    const globalOptions = command.optsWithGlobals<{ cwd?: string }>();
    await removeCommand(urls, { cwd: globalOptions.cwd });
  });

program
  .command("clean")
  .description("Remove all fetched markdown snapshots (or only one domain)")
  .option("--domain <host>", "only clean snapshots for a specific domain")
  .action(async (options: { domain?: string }, command: Command) => {
    const globalOptions = command.optsWithGlobals<{ cwd?: string }>();
    await cleanCommand({
      domain: options.domain,
      cwd: globalOptions.cwd,
    });
  });

program.parse();
