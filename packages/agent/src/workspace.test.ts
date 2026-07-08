import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildStaticWorkspace,
  createDefaultWorkspace,
  diffWorkspace,
  snapshotWorkspace,
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
  assert.equal((await workspaceStatus(root)).dirty, true);

  const snapshot = await snapshotWorkspace(root, "Test snapshot");
  assert.equal(snapshot.committed, true);
  assert.equal((await diffWorkspace(root)).files.length, 0);
  assert.equal((await workspaceStatus(root)).dirty, false);
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
  assert.doesNotMatch(html, /<pre><\/pre>/);
});
