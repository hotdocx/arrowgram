#!/usr/bin/env node
import path from "node:path";
import { createDefaultWorkspace } from "./workspace.js";
import { build, startDevServer, validate } from "./server.js";

type ParsedArgs = {
  command: string;
  flags: Record<string, string | boolean>;
};

function parseArgs(argv: string[]): ParsedArgs {
  const first = argv[0];
  const command = first && !first.startsWith("--") ? first : "help";
  const rest = first && !first.startsWith("--") ? argv.slice(1) : argv;
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < rest.length; i++) {
    const item = rest[i]!;
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = rest[i + 1];
    if (next && !next.startsWith("--")) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true;
    }
  }
  return { command, flags };
}

function stringFlag(flags: Record<string, string | boolean>, name: string, fallback: string) {
  const value = flags[name];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberFlag(flags: Record<string, string | boolean>, name: string, fallback: number) {
  const raw = flags[name];
  const parsed = typeof raw === "string" ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function printHelp() {
  console.log(`arrowgram-agent

Commands:
  init --type paper|diagram [--root .]
  dev [--root .] [--host 127.0.0.1] [--port 4173] [--token TOKEN]
  validate [--root .]
  build [--root .] [--out dist]
`);
}

async function main() {
  const { command, flags } = parseArgs(process.argv.slice(2));
  const root = path.resolve(stringFlag(flags, "root", "."));

  if (command === "help" || flags.help) {
    printHelp();
    return;
  }

  if (command === "init") {
    const type = stringFlag(flags, "type", "paper");
    if (type !== "paper" && type !== "diagram") {
      throw new Error("--type must be paper or diagram.");
    }
    await createDefaultWorkspace(root, type);
    console.log(`Created Arrowgram ${type} workspace at ${root}`);
    return;
  }

  if (command === "dev" || command === "serve") {
    await startDevServer({
      root,
      host: stringFlag(flags, "host", "127.0.0.1"),
      port: numberFlag(flags, "port", Number.parseInt(process.env.PORT ?? "", 10) || 4173),
      token: typeof flags.token === "string" ? flags.token : process.env.ARROWGRAM_BRIDGE_TOKEN,
    });
    return;
  }

  if (command === "validate") {
    const diagnostics = await validate(root);
    if (diagnostics.length === 0) {
      console.log("Arrowgram workspace is valid.");
      return;
    }
    for (const item of diagnostics) {
      console.error(`${item.severity.toUpperCase()} ${item.path ?? ""}: ${item.message}`);
    }
    process.exitCode = 1;
    return;
  }

  if (command === "build") {
    const out = stringFlag(flags, "out", "dist");
    await build(root, out);
    console.log(`Built Arrowgram static output at ${path.resolve(root, out)}`);
    return;
  }

  printHelp();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
