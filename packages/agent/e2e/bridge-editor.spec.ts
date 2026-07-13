import { expect, test } from "@playwright/test";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { startDevServer } from "../dist/server.js";
import { createDefaultWorkspace } from "../dist/workspace.js";

async function createServer(type: "paper" | "diagram") {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), `arrowgram-${type}-e2e-`));
  await createDefaultWorkspace(root, type);
  const server = await startDevServer({ root, host: "127.0.0.1", port: 0 });
  return {
    root,
    url: server.url,
    async close() {
      await server.close();
      await fs.rm(root, { recursive: true, force: true });
    },
  };
}

test("paper bridge synchronizes file, source, visual, diff, and snapshot edits", async ({ page }) => {
  const workspace = await createServer("paper");
  try {
    await page.goto(workspace.url);
    await expect(page.getByRole("heading", { name: "My Workspace" })).toBeVisible();
    await page.getByRole("heading", { name: "Untitled Paper" }).click();

    const editor = page.getByRole("textbox", { name: "# Start writing your paper..." });
    await expect(editor).toBeVisible();

    await fs.appendFile(workspace.root + "/paper.md", "\nExternal acceptance marker.\n", "utf8");
    await expect(editor).toHaveValue(/External acceptance marker/);
    await expect(page.getByText("Unsaved source changes")).toBeVisible();

    await editor.fill(`${await editor.inputValue()}\nBrowser source marker.\n`);
    await expect.poll(() => fs.readFile(path.join(workspace.root, "paper.md"), "utf8")).toContain(
      "Browser source marker"
    );

    await page.getByRole("button", { name: "Edit Visual" }).click();
    await expect(page.getByRole("heading", { name: "Edit Diagram" })).toBeVisible();
    await page.locator('[data-type="node"][data-id="A"]').last().click({ force: true });
    await page.locator('input[name="label"]').last().fill("A visual");
    await page.getByRole("button", { name: "Apply Changes" }).click();
    await expect.poll(() => fs.readFile(path.join(workspace.root, "paper.md"), "utf8")).toContain(
      '"label": "A visual"'
    );

    await page.getByRole("button", { name: "Slides" }).click();
    await expect
      .poll(async () => JSON.parse(await fs.readFile(path.join(workspace.root, "arrowgram.workspace.json"), "utf8")))
      .toMatchObject({ projects: [{ id: "paper-main", renderTemplate: "reveal" }] });

    await page.getByRole("button", { name: "Review changes" }).click();
    await expect(page.getByText("Changes since last saved snapshot")).toBeVisible();
    await expect(page.getByRole("button", { name: /arrowgram\.workspace\.json/ })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await page.getByRole("button", { name: "Save snapshot" }).click();
    await expect(page.getByText("Sources saved")).toBeVisible();
  } finally {
    await workspace.close();
  }
});

test("standalone diagram canvas movement writes diagram.json", async ({ page }) => {
  const workspace = await createServer("diagram");
  try {
    await page.goto(workspace.url);
    await page.getByRole("heading", { name: "Untitled Diagram" }).click();
    await expect(page.locator("#arrowgram-canvas")).toBeVisible();

    const node = page.locator('[data-type="node"][data-id="A"]');
    const box = await node.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + 5);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2 + 80, box!.y + 45, { steps: 5 });
    await page.mouse.up();

    await expect
      .poll(async () => {
        const spec = JSON.parse(await fs.readFile(path.join(workspace.root, "diagram.json"), "utf8"));
        return spec.nodes.find((item: { name?: string }) => item.name === "A");
      })
      .toMatchObject({ name: "A", left: 240, top: 200 });
    await expect(page.getByText("Unsaved source changes")).toBeVisible();
  } finally {
    await workspace.close();
  }
});
