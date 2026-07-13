import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildStaticWorkspace,
  createDefaultWorkspace,
  diffWorkspace,
  removeProject,
  snapshotWorkspace,
  updateProject,
  validateWorkspace,
  workspaceStatus,
} from "./workspace.js";

async function tempWorkspace() {
  return await fs.mkdtemp(path.join(os.tmpdir(), "arrowgram-agent-"));
}

test("file-backed paper workspaces diff and snapshot against git baseline", async (t) => {
  const root = await tempWorkspace();
  t.after(() => fs.rm(root, { recursive: true, force: true }));

  await createDefaultWorkspace(root, "paper");

  assert.equal((await workspaceStatus(root)).dirty, false);

  await fs.appendFile(path.join(root, "paper.md"), "\n## Agent edit\n\nThis was changed on disk.\n", "utf8");

  const dirty = await diffWorkspace(root);
  assert.equal(dirty.files.length, 1);
  assert.equal(dirty.files[0]?.path, "paper.md");
  assert.match(dirty.files[0]?.newText ?? "", /Agent edit/);
  assert.match(dirty.files[0]?.unifiedDiff ?? "", /\+## Agent edit/);
  assert.doesNotMatch(dirty.files[0]?.unifiedDiff ?? "", /-Edit this file/);
  assert.equal((await workspaceStatus(root)).dirty, true);

  const snapshot = await snapshotWorkspace(root, "Test snapshot");
  assert.equal(snapshot.committed, true);
  assert.equal((await diffWorkspace(root)).files.length, 0);
  assert.equal((await workspaceStatus(root)).dirty, false);
});

test("manifest-only edits are dirty, reviewable, and snapshot cleanly", async (t) => {
  const root = await tempWorkspace();
  t.after(() => fs.rm(root, { recursive: true, force: true }));

  await createDefaultWorkspace(root, "paper");
  await updateProject(root, { id: "paper-main", title: "Renamed Paper" });

  const dirty = await diffWorkspace(root);
  assert.deepEqual(dirty.files.map((file) => file.path), ["arrowgram.workspace.json"]);
  assert.match(dirty.files[0]?.unifiedDiff ?? "", /Renamed Paper/);
  assert.equal((await workspaceStatus(root)).dirty, true);
  assert.equal((await workspaceStatus(root)).projects[0]?.dirty, true);

  await snapshotWorkspace(root, "Snapshot manifest edit");
  assert.equal((await diffWorkspace(root)).files.length, 0);
});

test("removed projects stage their baseline source deletions", async (t) => {
  const root = await tempWorkspace();
  t.after(() => fs.rm(root, { recursive: true, force: true }));

  await createDefaultWorkspace(root, "diagram");
  await removeProject(root, "diagram-main");

  const dirty = await diffWorkspace(root);
  assert.deepEqual(
    dirty.files.map((file) => [file.path, file.status]),
    [
      ["arrowgram.workspace.json", "modified"],
      ["diagram.json", "deleted"],
    ]
  );

  await snapshotWorkspace(root, "Remove diagram project");
  assert.equal((await diffWorkspace(root)).files.length, 0);
});

test("diagram workspaces preserve invalid JSON and report diagnostics", async (t) => {
  const root = await tempWorkspace();
  t.after(() => fs.rm(root, { recursive: true, force: true }));

  await createDefaultWorkspace(root, "diagram");
  await fs.writeFile(path.join(root, "diagram.json"), "{ invalid json", "utf8");

  const diagnostics = await validateWorkspace(root);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0]?.path, "diagram.json");
  assert.equal(diagnostics[0]?.severity, "error");
});

test("static build emits rendered HTML and SVG for embedded diagrams", async (t) => {
  const root = await tempWorkspace();
  t.after(() => fs.rm(root, { recursive: true, force: true }));

  await createDefaultWorkspace(root, "paper");
  await buildStaticWorkspace(root, "dist");

  const html = await fs.readFile(path.join(root, "dist", "index.html"), "utf8");
  assert.match(html, /<article>/);
  assert.match(html, /arrowgram-svg/);
  assert.match(html, /data-arrowgram-render-template="paged"/);
  assert.match(html, /assets\/paged\.polyfill\.js/);
  assert.doesNotMatch(html, /<pre><\/pre>/);
  assert.equal(await fs.stat(path.join(root, "dist", "assets", "paged.polyfill.js")).then(() => true), true);
});

test("reveal build emits a static slide deck with local runtime assets", async (t) => {
  const root = await tempWorkspace();
  t.after(() => fs.rm(root, { recursive: true, force: true }));

  await createDefaultWorkspace(root, "paper");
  await updateProject(root, {
    id: "paper-main",
    paper: {
      renderTemplate: "reveal",
      markdown: "# First slide\n\nAlpha\n\n---\n\n# Second slide\n\nBeta\n",
      customCss: ".reveal h1 { color: tomato; }\n",
    },
  });
  await buildStaticWorkspace(root, "dist");

  const html = await fs.readFile(path.join(root, "dist", "index.html"), "utf8");
  assert.match(html, /data-arrowgram-render-template="reveal"/);
  assert.match(html, /<div class="reveal"><div class="slides">/);
  assert.equal((html.match(/<section>/g) ?? []).length, 2);
  assert.match(html, /Reveal\.initialize/);
  assert.match(html, /color: tomato/);
  for (const asset of ["reveal.js", "reveal.css", "reveal-black.css"]) {
    assert.equal(await fs.stat(path.join(root, "dist", "assets", asset)).then(() => true), true);
  }
});
