import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createTwoFilesPatch } from "diff";
import showdown from "showdown";
import { ArrowGramDiagram, computeDiagram, DiagramSpecSchema } from "@hotdocx/arrowgram";
import katex from "katex";

export type ArrowgramProjectType = "diagram" | "paper";
export type PaperRenderTemplate = "paged" | "reveal";

export type WorkspaceProjectManifest = {
  id: string;
  type: ArrowgramProjectType;
  title: string;
  source: string;
  renderTemplate?: PaperRenderTemplate;
  customCss?: string;
};

export type WorkspaceManifest = {
  version: 1;
  activeProjectId?: string;
  projects: WorkspaceProjectManifest[];
};

export type BridgeDiagnostic = {
  projectId?: string;
  path?: string;
  severity: "error" | "warning";
  message: string;
};

export type BridgeProject =
  | {
      id: string;
      type: "diagram";
      title: string;
      updatedAt: string;
      sourcePath: string;
      content: string;
    }
  | {
      id: string;
      type: "paper";
      title: string;
      updatedAt: string;
      sourcePath: string;
      content: {
        markdown: string;
        renderTemplate: PaperRenderTemplate;
        customCss: string;
      };
      paper: {
        renderTemplate: PaperRenderTemplate;
      };
    };

export type BridgeDiffFile = {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed" | "untracked";
  oldText: string;
  newText: string;
  unifiedDiff: string;
};

export type BridgeStatus = {
  ok: true;
  root: string;
  activeProjectId?: string;
  dirty: boolean;
  baseline: { kind: "git"; sha: string | null } | { kind: "none"; sha: null };
  projects: Array<{
    id: string;
    type: ArrowgramProjectType;
    title: string;
    sourcePath: string;
    dirty: boolean;
  }>;
  diagnostics: BridgeDiagnostic[];
};

const MANIFEST_FILE = "arrowgram.workspace.json";
const requireFromHere = createRequire(import.meta.url);

function nowIso() {
  return new Date().toISOString();
}

async function exists(filePath: string) {
  return await fs
    .stat(filePath)
    .then(() => true)
    .catch(() => false);
}

async function readTextIfExists(filePath: string) {
  return await fs.readFile(filePath, "utf8").catch(() => "");
}

async function writeJson(filePath: string, value: unknown) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalizeWorkspaceRelative(input: string): string {
  const normalized = input.replaceAll("\\", "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("\0")) throw new Error("Invalid workspace path.");
  const parts = normalized.split("/");
  if (parts.some((part) => part === ".." || part === "")) {
    throw new Error(`Path escapes workspace root: ${input}`);
  }
  return parts.join("/");
}

export function resolveWorkspacePath(root: string, relativePath: string) {
  const safe = normalizeWorkspaceRelative(relativePath);
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, safe);
  if (resolved !== resolvedRoot && !resolved.startsWith(resolvedRoot + path.sep)) {
    throw new Error(`Path escapes workspace root: ${relativePath}`);
  }
  return resolved;
}

async function atomicWriteText(filePath: string, content: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, content, "utf8");
  await fs.rename(tempPath, filePath);
}

function parseManifest(raw: unknown): WorkspaceManifest {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Manifest must be an object.");
  }
  const value = raw as Record<string, unknown>;
  if (value.version !== 1) throw new Error("Unsupported Arrowgram workspace manifest version.");
  if (!Array.isArray(value.projects)) throw new Error("Manifest projects must be an array.");
  const projects = value.projects.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("Manifest project must be an object.");
    }
    const project = item as Record<string, unknown>;
    const id = String(project.id ?? "").trim();
    const type = project.type;
    const title = String(project.title ?? "").trim() || (type === "paper" ? "Untitled Paper" : "Untitled Diagram");
    const source = String(project.source ?? "").trim();
    if (!id) throw new Error("Manifest project is missing id.");
    if (type !== "paper" && type !== "diagram") throw new Error(`Invalid project type for ${id}.`);
    if (!source) throw new Error(`Manifest project ${id} is missing source.`);
    normalizeWorkspaceRelative(source);
    if (typeof project.customCss === "string") normalizeWorkspaceRelative(project.customCss);
    return {
      id,
      type,
      title,
      source,
      renderTemplate: project.renderTemplate === "reveal" ? "reveal" : "paged",
      customCss: typeof project.customCss === "string" && project.customCss.trim() ? project.customCss.trim() : undefined,
    } satisfies WorkspaceProjectManifest;
  });
  return {
    version: 1,
    activeProjectId: typeof value.activeProjectId === "string" ? value.activeProjectId : projects[0]?.id,
    projects,
  };
}

export async function readManifest(root: string): Promise<WorkspaceManifest> {
  const manifestPath = path.join(root, MANIFEST_FILE);
  const raw = await fs.readFile(manifestPath, "utf8");
  return parseManifest(JSON.parse(raw));
}

export async function writeManifest(root: string, manifest: WorkspaceManifest) {
  await writeJson(path.join(root, MANIFEST_FILE), manifest);
}

export async function createDefaultWorkspace(root: string, type: ArrowgramProjectType) {
  await fs.mkdir(root, { recursive: true });
  const manifestPath = path.join(root, MANIFEST_FILE);
  if (await exists(manifestPath)) throw new Error(`${MANIFEST_FILE} already exists.`);

  const defaultDiagram = JSON.stringify(
    {
      version: 1,
      nodes: [
        { name: "A", left: 150, top: 150, label: "A" },
        { name: "B", left: 450, top: 150, label: "B" },
      ],
      arrows: [{ name: "f", from: "A", to: "B", label: "f" }],
    },
    null,
    2
  );
  const defaultPaper = [
    "---",
    "title: Untitled Arrowgram Paper",
    "---",
    "",
    "# Untitled Arrowgram Paper",
    "",
    "Edit this file with Codex CLI, your terminal editor, or the Arrowgram browser editor.",
    "",
    '<div class="arrowgram">',
    defaultDiagram,
    "</div>",
    "",
  ].join("\n");

  const projects: WorkspaceProjectManifest[] = [];
  if (type === "paper") {
    await atomicWriteText(path.join(root, "paper.md"), defaultPaper);
    await atomicWriteText(path.join(root, "paper.css"), "/* Paper-specific styles */\n");
    projects.push({
      id: "paper-main",
      type: "paper",
      title: "Untitled Paper",
      source: "paper.md",
      renderTemplate: "paged",
      customCss: "paper.css",
    });
  } else {
    await atomicWriteText(path.join(root, "diagram.json"), `${defaultDiagram}\n`);
    projects.push({
      id: "diagram-main",
      type: "diagram",
      title: "Untitled Diagram",
      source: "diagram.json",
    });
  }
  await writeManifest(root, { version: 1, activeProjectId: projects[0]?.id, projects });
  await snapshotWorkspace(root, "Initial Arrowgram snapshot").catch(() => undefined);
}

export async function listProjects(root: string) {
  const manifest = await readManifest(root);
  return await Promise.all(manifest.projects.map((project) => readProject(root, project.id)));
}

export async function readProject(root: string, projectId: string): Promise<BridgeProject> {
  const manifest = await readManifest(root);
  const project = manifest.projects.find((item) => item.id === projectId);
  if (!project) throw new Error("Project not found.");
  const sourcePath = resolveWorkspacePath(root, project.source);
  const stat = await fs.stat(sourcePath).catch(() => null);
  const updatedAt = stat ? new Date(stat.mtimeMs).toISOString() : nowIso();
  if (project.type === "diagram") {
    return {
      id: project.id,
      type: "diagram",
      title: project.title,
      updatedAt,
      sourcePath: project.source,
      content: await readTextIfExists(sourcePath),
    };
  }
  const css = project.customCss ? await readTextIfExists(resolveWorkspacePath(root, project.customCss)) : "";
  return {
    id: project.id,
    type: "paper",
    title: project.title,
    updatedAt,
    sourcePath: project.source,
    paper: { renderTemplate: project.renderTemplate ?? "paged" },
    content: {
      markdown: await readTextIfExists(sourcePath),
      renderTemplate: project.renderTemplate ?? "paged",
      customCss: css,
    },
  };
}

export async function updateProject(
  root: string,
  input: {
    id: string;
    title?: string;
    content?: string;
    paper?: { markdown?: string; renderTemplate?: PaperRenderTemplate; customCss?: string };
  }
): Promise<BridgeProject> {
  const manifest = await readManifest(root);
  const project = manifest.projects.find((item) => item.id === input.id);
  if (!project) throw new Error("Project not found.");
  if (typeof input.title === "string" && input.title.trim()) project.title = input.title.trim();
  if (project.type === "diagram") {
    if (typeof input.content === "string") {
      await atomicWriteText(resolveWorkspacePath(root, project.source), input.content);
    }
  } else {
    if (typeof input.paper?.renderTemplate === "string") {
      project.renderTemplate = input.paper.renderTemplate === "reveal" ? "reveal" : "paged";
    }
    const markdown = typeof input.paper?.markdown === "string" ? input.paper.markdown : input.content;
    if (typeof markdown === "string") {
      await atomicWriteText(resolveWorkspacePath(root, project.source), markdown);
    }
    if (typeof input.paper?.customCss === "string") {
      if (!project.customCss) project.customCss = `${project.id}.css`;
      await atomicWriteText(resolveWorkspacePath(root, project.customCss), input.paper.customCss);
    }
  }
  await writeManifest(root, manifest);
  return await readProject(root, project.id);
}

export async function createProject(
  root: string,
  input: {
    type: ArrowgramProjectType;
    title?: string;
    content?: string;
    paper?: { renderTemplate?: PaperRenderTemplate; customCss?: string };
  }
) {
  const manifest = await readManifest(root);
  const id = `${input.type}-${Date.now().toString(36)}`;
  const source = input.type === "paper" ? `${id}.md` : `${id}.json`;
  const project: WorkspaceProjectManifest = {
    id,
    type: input.type,
    title: input.title?.trim() || (input.type === "paper" ? "Untitled Paper" : "Untitled Diagram"),
    source,
    renderTemplate: input.type === "paper" ? input.paper?.renderTemplate ?? "paged" : undefined,
    customCss: input.type === "paper" ? `${id}.css` : undefined,
  };
  manifest.projects.push(project);
  manifest.activeProjectId = id;
  if (input.type === "paper") {
    await atomicWriteText(resolveWorkspacePath(root, source), input.content ?? "");
    await atomicWriteText(resolveWorkspacePath(root, project.customCss!), input.paper?.customCss ?? "");
  } else {
    await atomicWriteText(resolveWorkspacePath(root, source), input.content ?? JSON.stringify({ version: 1, nodes: [], arrows: [] }, null, 2));
  }
  await writeManifest(root, manifest);
  return await readProject(root, id);
}

export async function removeProject(root: string, id: string) {
  const manifest = await readManifest(root);
  const index = manifest.projects.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Project not found.");
  const [project] = manifest.projects.splice(index, 1);
  if (manifest.activeProjectId === id) manifest.activeProjectId = manifest.projects[0]?.id;
  await writeManifest(root, manifest);
  await fs.rm(resolveWorkspacePath(root, project.source), { force: true }).catch(() => undefined);
  if (project.customCss) await fs.rm(resolveWorkspacePath(root, project.customCss), { force: true }).catch(() => undefined);
}

function runGit(root: string, args: string[]) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    const child = spawn("git", args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
    child.on("close", (code) =>
      resolve({
        code: code ?? 1,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      })
    );
  });
}

async function gitOk(root: string, args: string[]) {
  const result = await runGit(root, args);
  if (result.code !== 0) throw new Error(result.stderr || result.stdout || `git ${args.join(" ")} failed`);
  return result.stdout;
}

export async function hasGitRepository(root: string) {
  return (await runGit(root, ["rev-parse", "--is-inside-work-tree"])).code === 0;
}

export async function ensureGitRepository(root: string) {
  if (!(await hasGitRepository(root))) {
    await gitOk(root, ["init"]);
  }
  await runGit(root, ["config", "user.email", "arrowgram-agent@local"]).catch(() => undefined);
  await runGit(root, ["config", "user.name", "Arrowgram Agent"]).catch(() => undefined);
}

export async function currentGitSha(root: string) {
  const result = await runGit(root, ["rev-parse", "HEAD"]);
  return result.code === 0 ? result.stdout.trim() || null : null;
}

export async function sourcePaths(root: string) {
  const manifest = await readManifest(root);
  return Array.from(
    new Set(
      manifest.projects.flatMap((project) =>
        [project.source, project.customCss].filter((item): item is string => Boolean(item))
      )
    )
  );
}

async function headManifestSourcePaths(root: string) {
  if (!(await hasGitRepository(root)) || !(await currentGitSha(root))) return [];
  const raw = await gitShowHead(root, MANIFEST_FILE);
  if (!raw.trim()) return [];
  try {
    const manifest = parseManifest(JSON.parse(raw));
    return manifest.projects.flatMap((project) =>
      [project.source, project.customCss].filter((item): item is string => Boolean(item))
    );
  } catch {
    return [];
  }
}

export async function workspaceTrackedPaths(root: string) {
  const current = await sourcePaths(root);
  const baseline = await headManifestSourcePaths(root);
  return Array.from(new Set([MANIFEST_FILE, ...current, ...baseline]));
}

async function gitStatusMap(root: string, paths: string[]) {
  if (!(await hasGitRepository(root))) return new Map<string, string>();
  const result = await runGit(root, ["status", "--porcelain", "--", ...paths]);
  const map = new Map<string, string>();
  for (const line of result.stdout.split("\n")) {
    if (!line.trim()) continue;
    const status = line.slice(0, 2);
    const file = line.slice(3).trim().replace(/^"|"$/g, "");
    if (file) map.set(file, status);
  }
  return map;
}

async function gitShowHead(root: string, relativePath: string) {
  const result = await runGit(root, ["show", `HEAD:${relativePath}`]);
  return result.code === 0 ? result.stdout : "";
}

function unifiedDiff(filePath: string, oldText: string, newText: string) {
  return createTwoFilesPatch(
    `a/${filePath}`,
    `b/${filePath}`,
    oldText,
    newText,
    undefined,
    undefined,
    { context: 3 }
  );
}

function escapeHtml(input: unknown) {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeStyle(input: string) {
  return input.replace(/<\/style/gi, "<\\/style");
}

function renderInlineMath(html: string) {
  return html.replace(/\$([^$\n]+)\$/g, (_match, expr) => {
    try {
      return katex.renderToString(String(expr), { throwOnError: false, displayMode: false });
    } catch {
      return escapeHtml(`$${expr}$`);
    }
  });
}

function renderDiagramSvg(specText: string, id: string) {
  try {
    const diagram = computeDiagram(specText, id);
    if (diagram.error) {
      return `<div class="arrowgram-error">Diagram Error: ${escapeHtml(diagram.error)}</div>`;
    }
    return renderToStaticMarkup(
      React.createElement(
        "svg",
        {
          id,
          className: "arrowgram-svg",
          viewBox: diagram.viewBox,
          role: "img",
          style: { fontFamily: "sans-serif", overflow: "visible" },
        },
        React.createElement(ArrowGramDiagram, { diagram })
      )
    );
  } catch (error) {
    return `<div class="arrowgram-error">Diagram Error: ${escapeHtml(error instanceof Error ? error.message : String(error))}</div>`;
  }
}

function renderMarkdown(markdown: string) {
  let counter = 0;
  const arrowgrams = new Map<string, string>();
  const withPlaceholders = markdown.replace(/<div class="arrowgram"([^>]*)>([\s\S]*?)<\/div>/g, (_match, attrs, content) => {
    const id = `ag-static-${counter++}`;
    const placeholder = `ARROWGRAM_STATIC_PLACEHOLDER_${id}`;
    arrowgrams.set(
      placeholder,
      `<div class="arrowgram-container"${attrs}>${renderDiagramSvg(String(content ?? "").trim(), id)}</div>`
    );
    return placeholder;
  });
  const converter = new showdown.Converter({
    metadata: true,
    noHeaderId: true,
    literalMidWordUnderscores: true,
    tables: true,
    strikethrough: true,
  });
  let html = converter.makeHtml(withPlaceholders);
  html = renderInlineMath(html);
  for (const [placeholder, replacement] of arrowgrams.entries()) {
    html = html.split(`<p>${placeholder}</p>`).join(replacement).split(placeholder).join(replacement);
  }
  return { html, metadata: (converter.getMetadata() as Record<string, unknown>) ?? {} };
}

function splitMarkdownIntoSlides(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const slides: string[] = [];
  let current: string[] = [];
  let inFence = false;
  let fence = "```";
  let index = 0;

  if (lines[0]?.trim() === "---") {
    current.push(lines[0]);
    index = 1;
    while (index < lines.length) {
      current.push(lines[index]!);
      if (lines[index]!.trim() === "---") {
        index += 1;
        break;
      }
      index += 1;
    }
  }

  for (; index < lines.length; index += 1) {
    const line = lines[index]!;
    const trimmed = line.trimStart();
    if (!inFence && (trimmed.startsWith("```") || trimmed.startsWith("~~~"))) {
      inFence = true;
      fence = trimmed.startsWith("~~~") ? "~~~" : "```";
      current.push(line);
      continue;
    }
    if (inFence && trimmed.startsWith(fence)) {
      inFence = false;
      current.push(line);
      continue;
    }
    if (!inFence && line.trim() === "---") {
      const slide = current.join("\n").trimEnd();
      if (slide.trim()) slides.push(`${slide}\n`);
      current = [];
      continue;
    }
    current.push(line);
  }

  const finalSlide = current.join("\n").trimEnd();
  if (finalSlide.trim()) slides.push(`${finalSlide}\n`);
  return slides.length ? slides : ["\n"];
}

async function copyStaticAsset(source: string, outDir: string, relativePath: string) {
  const destination = path.join(outDir, relativePath);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(source, destination);
}

async function writePagedRuntime(outDir: string) {
  const pagedRoot = path.dirname(path.dirname(requireFromHere.resolve("pagedjs")));
  await copyStaticAsset(path.join(pagedRoot, "dist", "paged.polyfill.js"), outDir, "assets/paged.polyfill.js");
}

async function writeRevealRuntime(outDir: string) {
  await Promise.all([
    copyStaticAsset(requireFromHere.resolve("reveal.js/dist/reveal.js"), outDir, "assets/reveal.js"),
    copyStaticAsset(requireFromHere.resolve("reveal.js/dist/reveal.css"), outDir, "assets/reveal.css"),
    copyStaticAsset(requireFromHere.resolve("reveal.js/dist/theme/black.css"), outDir, "assets/reveal-black.css"),
  ]);
}

export async function diffWorkspace(root: string): Promise<{ baseline: BridgeStatus["baseline"]; files: BridgeDiffFile[] }> {
  const paths = await workspaceTrackedPaths(root);
  const isGit = await hasGitRepository(root);
  const baseline: BridgeStatus["baseline"] = isGit
    ? { kind: "git", sha: await currentGitSha(root) }
    : { kind: "none", sha: null };
  const status = await gitStatusMap(root, paths);
  const files: BridgeDiffFile[] = [];
  for (const relativePath of paths) {
    const newText = await readTextIfExists(resolveWorkspacePath(root, relativePath));
    const oldText = isGit && baseline.sha ? await gitShowHead(root, relativePath) : "";
    if (oldText === newText && !status.has(relativePath)) continue;
    const rawStatus = status.get(relativePath) ?? (oldText ? " M" : "??");
    const fileStatus: BridgeDiffFile["status"] =
      rawStatus.includes("A") || rawStatus === "??"
        ? "added"
        : rawStatus.includes("D")
          ? "deleted"
          : rawStatus.includes("R")
            ? "renamed"
            : rawStatus === "??"
              ? "untracked"
              : "modified";
    files.push({
      path: relativePath,
      status: fileStatus,
      oldText,
      newText,
      unifiedDiff: unifiedDiff(relativePath, oldText, newText),
    });
  }
  return { baseline, files };
}

export async function validateWorkspace(root: string): Promise<BridgeDiagnostic[]> {
  const diagnostics: BridgeDiagnostic[] = [];
  let manifest: WorkspaceManifest;
  try {
    manifest = await readManifest(root);
  } catch (error) {
    return [
      {
        path: MANIFEST_FILE,
        severity: "error",
        message: error instanceof Error ? error.message : "Invalid Arrowgram workspace manifest.",
      },
    ];
  }
  for (const project of manifest.projects) {
    const filePath = resolveWorkspacePath(root, project.source);
    const text = await readTextIfExists(filePath);
    if (project.type === "diagram") {
      try {
        DiagramSpecSchema.parse(JSON.parse(text));
      } catch (error) {
        diagnostics.push({
          projectId: project.id,
          path: project.source,
          severity: "error",
          message: error instanceof Error ? error.message : "Invalid diagram JSON.",
        });
      }
    }
  }
  return diagnostics;
}

export async function workspaceStatus(root: string): Promise<BridgeStatus> {
  const manifest = await readManifest(root);
  const diagnostics = await validateWorkspace(root);
  const diff = await diffWorkspace(root);
  const status = await gitStatusMap(root, await workspaceTrackedPaths(root));
  const manifestDirty = status.has(MANIFEST_FILE);
  return {
    ok: true,
    root,
    activeProjectId: manifest.activeProjectId,
    dirty: diff.files.length > 0,
    baseline: diff.baseline,
    projects: manifest.projects.map((project) => ({
      id: project.id,
      type: project.type,
      title: project.title,
      sourcePath: project.source,
      dirty:
        manifestDirty ||
        status.has(project.source) ||
        Boolean(project.customCss && status.has(project.customCss)),
    })),
    diagnostics,
  };
}

export async function snapshotWorkspace(root: string, message = "Save Arrowgram snapshot") {
  await ensureGitRepository(root);
  const paths = await workspaceTrackedPaths(root);
  await gitOk(root, ["add", "--", ...paths]);
  const staged = await runGit(root, ["diff", "--cached", "--quiet"]);
  if (staged.code === 0) return { sha: await currentGitSha(root), committed: false };
  await gitOk(root, ["commit", "-m", message]);
  return { sha: await currentGitSha(root), committed: true };
}

export async function buildStaticWorkspace(root: string, outDir: string) {
  const resolvedOutDir = path.isAbsolute(outDir) ? outDir : path.resolve(root, outDir);
  const manifest = await readManifest(root);
  await fs.rm(resolvedOutDir, { recursive: true, force: true });
  await fs.mkdir(resolvedOutDir, { recursive: true });
  const projects = await listProjects(root);
  const active = projects.find((project) => project.id === manifest.activeProjectId) ?? projects[0];
  const title =
    active?.type === "paper"
      ? String(renderMarkdown(active.content.markdown).metadata.title ?? active.title)
      : (active?.title ?? "Arrowgram");
  const customCss = active?.type === "paper" ? active.content.customCss : "";
  const sharedStyles = `
    body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; color: #1f2937; background: #f8fafc; }
    h1, h2, h3 { line-height: 1.2; }
    p { line-height: 1.65; }
    code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    pre { overflow-x: auto; background: #f1f5f9; color: #111827; padding: 16px; border-radius: 6px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #d1d5db; padding: 6px 8px; }
    .arrowgram-container { display: flex; justify-content: center; margin: 24px 0; page-break-inside: avoid; }
    .arrowgram-svg { width: min(100%, 760px); height: auto; min-height: 120px; }
    .arrowgram-error { border: 1px solid #fecaca; background: #fef2f2; color: #991b1b; padding: 12px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .katex { font-size: 1em; }
  `;

  let html: string;
  if (active?.type === "paper" && active.content.renderTemplate === "reveal") {
    await writeRevealRuntime(resolvedOutDir);
    const slides = splitMarkdownIntoSlides(active.content.markdown)
      .map((slide) => `<section>${renderMarkdown(slide).html}</section>`)
      .join("\n");
    html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="assets/reveal.css" />
  <link rel="stylesheet" href="assets/reveal-black.css" />
  <style>
    ${sharedStyles}
    .reveal .slides section { text-align: left; }
    .reveal .arrowgram-container { background: white; padding: 16px; border-radius: 12px; }
    ${escapeStyle(customCss)}
  </style>
</head>
<body data-arrowgram-render-template="reveal">
  <div class="reveal"><div class="slides">${slides}</div></div>
  <script src="assets/reveal.js"></script>
  <script>Reveal.initialize({ hash: true, controls: true, progress: true });</script>
</body>
</html>
`;
  } else {
    if (active?.type === "paper") await writePagedRuntime(resolvedOutDir);
    const body =
      active?.type === "paper"
        ? renderMarkdown(active.content.markdown).html
        : active?.type === "diagram"
          ? `<div class="arrowgram-container">${renderDiagramSvg(active.content, "ag-static-main")}</div>`
          : "<p>No Arrowgram project found.</p>";
    const isPaper = active?.type === "paper";
    html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    ${sharedStyles}
    main { max-width: 920px; margin: 0 auto; padding: 32px 20px 56px; }
    article { background: white; border: 1px solid #e5e7eb; padding: 32px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04); }
    h1, h2, h3 { color: #111827; }
    @page { size: letter; margin: 18mm; }
    ${escapeStyle(customCss)}
  </style>
</head>
<body data-arrowgram-render-template="${isPaper ? "paged" : "diagram"}">
  <main><article>${body}</article></main>
  ${isPaper ? '<script src="assets/paged.polyfill.js"></script>' : ""}
</body>
</html>
`;
  }
  await fs.writeFile(path.join(resolvedOutDir, "index.html"), html, "utf8");
}
