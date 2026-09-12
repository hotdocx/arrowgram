import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const agentDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const repoRoot = path.dirname(path.dirname(agentDir));
const packageDirs = [
  path.join(repoRoot, "packages/arrowgram"),
  path.join(repoRoot, "packages/web"),
  path.join(repoRoot, "packages/agent"),
];
const packedReactVersion = "19.2.4";

function run(command, args, cwd, options = {}) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "inherit"] : "inherit",
    env: { ...process.env, ...options.env },
  });
}

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "arrowgram-packed-install-"));
const tarballDir = path.join(tempRoot, "tarballs");
const consumerDir = path.join(tempRoot, "consumer");
const workspaceDir = path.join(tempRoot, "workspace");

try {
  await mkdir(tarballDir);
  await mkdir(consumerDir);

  const tarballs = [];
  for (const packageDir of packageDirs) {
    const output = run(
      "npm",
      ["pack", "--json", "--pack-destination", tarballDir, packageDir],
      repoRoot,
      { capture: true },
    );
    const [{ filename }] = JSON.parse(output);
    tarballs.push(path.join(tarballDir, filename));
  }

  await writeFile(
    path.join(consumerDir, "package.json"),
    JSON.stringify({
      name: "arrowgram-packed-install-smoke",
      private: true,
      dependencies: {
        react: packedReactVersion,
        "react-dom": packedReactVersion,
      },
      overrides: {
        react: packedReactVersion,
        "react-dom": packedReactVersion,
      },
    }, null, 2),
  );
  run(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", ...tarballs],
    consumerDir,
  );

  const expectedVersions = Object.fromEntries(
    await Promise.all(
      packageDirs.map(async (packageDir) => {
        const manifest = JSON.parse(await readFile(path.join(packageDir, "package.json"), "utf8"));
        return [manifest.name, manifest.version];
      }),
    ),
  );
  for (const [name, expectedVersion] of Object.entries(expectedVersions)) {
    const manifestPath = path.join(consumerDir, "node_modules", ...name.split("/"), "package.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    if (manifest.version !== expectedVersion) {
      throw new Error(`${name} resolved to ${manifest.version}; expected ${expectedVersion}`);
    }
  }

  const installedReact = JSON.parse(
    await readFile(path.join(consumerDir, "node_modules/react/package.json"), "utf8"),
  );
  const installedReactDom = JSON.parse(
    await readFile(path.join(consumerDir, "node_modules/react-dom/package.json"), "utf8"),
  );
  if (installedReact.version !== installedReactDom.version) {
    throw new Error(
      `Installed React versions differ: react ${installedReact.version}, react-dom ${installedReactDom.version}`,
    );
  }
  if (installedReact.version !== packedReactVersion) {
    throw new Error(
      `Installed React fixture resolved to ${installedReact.version}; expected ${packedReactVersion}`,
    );
  }
  const installedTree = JSON.parse(
    run("npm", ["ls", "react", "react-dom", "--all", "--json"], consumerDir, { capture: true }),
  );
  const nestedVersions = new Map([
    ["react", new Set()],
    ["react-dom", new Set()],
  ]);
  const collectNestedVersions = (node) => {
    for (const [name, dependency] of Object.entries(node?.dependencies ?? {})) {
      if (nestedVersions.has(name) && typeof dependency?.version === "string") {
        nestedVersions.get(name).add(dependency.version);
      }
      collectNestedVersions(dependency);
    }
  };
  collectNestedVersions(installedTree);
  for (const [name, versions] of nestedVersions) {
    if (versions.size !== 1 || !versions.has(packedReactVersion)) {
      throw new Error(`Packed fixture ${name} versions differ: ${[...versions].sort().join(", ")}`);
    }
  }

  const agentBin = path.join(consumerDir, "node_modules/.bin/arrowgram-agent");
  run(agentBin, ["init", "--type", "paper", "--root", workspaceDir], consumerDir);
  run(agentBin, ["validate", "--root", workspaceDir], consumerDir);

  const installedAgentEntry = path.join(
    consumerDir,
    "node_modules/@hotdocx/arrowgram-agent/dist/index.js",
  );
  const { startDevServer } = await import(pathToFileURL(installedAgentEntry).href);
  const { chromium } = await import("playwright");
  const server = await startDevServer({
    root: workspaceDir,
    host: "127.0.0.1",
    port: 0,
  });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") console.error(`Browser console: ${message.text()}`);
    });
    page.on("pageerror", (error) => console.error(`Browser page error: ${error.message}`));
    await page.goto(server.url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.getByRole("heading", { name: "My Workspace" }).waitFor({ timeout: 120_000 });
    await page.getByRole("heading", { name: "Untitled Paper" }).waitFor({ timeout: 120_000 });
  } finally {
    await browser.close();
    await server.close();
  }

  console.log("Packed Arrowgram agent install verified.");
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
