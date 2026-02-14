import { test, expect } from "@playwright/test";

function base64url(text: string): string {
  return Buffer.from(text, "utf8").toString("base64url");
}

test("paper snapshot captures only the first paged page", async ({ page }) => {
  const longBody = Array.from({ length: 220 }, (_, idx) => `Paragraph ${idx + 1}: lorem ipsum dolor sit amet.`).join("\n\n");
  const md = `---\ntitle: Snapshot Paged\nauthors: E2E\n---\n\n# Intro\n\n${longBody}\n`;

  await page.goto(`/?paper=${base64url(md)}`);

  await expect(page.locator(".pagedjs_pages")).toBeVisible();
  await expect
    .poll(async () => page.locator(".pagedjs_page").count(), { timeout: 20_000 })
    .toBeGreaterThan(1);

  const dims = await page.evaluate(async () => {
    const mod = await import("/src/utils/screenshot.ts");
    const root = document.querySelector<HTMLElement>(".paper-content-wrapper");
    if (!root) throw new Error("Missing .paper-content-wrapper");
    const blob = await mod.capturePaperScreenshot(root, "paged");
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to decode paged snapshot image"));
        img.src = url;
      });
      return { width: img.naturalWidth, height: img.naturalHeight };
    } finally {
      URL.revokeObjectURL(url);
    }
  });

  expect(dims.width).toBeGreaterThan(500);
  expect(dims.height).toBeGreaterThan(650);
  const aspectRatio = dims.width / dims.height;
  expect(aspectRatio).toBeGreaterThan(0.6);
  expect(aspectRatio).toBeLessThan(0.9);
});

test("reveal snapshot captures first slide even when viewing slide 2", async ({ page }) => {
  const md = `---\ntitle: Snapshot Reveal\nauthors: E2E\n---\n\n# Slide 1\n\nAlpha\n\n---\n\n# Slide 2\n\nBeta\n`;

  await page.goto(`/?paper=${base64url(md)}`);
  await page.getByRole("button", { name: "Slides" }).click();

  await expect(page.locator(".reveal .slides > section")).toHaveCount(2);

  await page.locator('button[title="Styles (CSS)"]').click();
  const cssEditor = page.locator('textarea[placeholder^="/* Custom CSS"]');
  await expect(cssEditor).toBeVisible();
  await cssEditor.fill([
    ".slides > section { min-height: 100% !important; height: 100% !important; }",
    ".slides > section:nth-child(1) { background: rgb(0, 255, 0) !important; }",
    ".slides > section:nth-child(2) { background: rgb(255, 0, 0) !important; }",
  ].join("\n"));

  await page.locator(".reveal").click();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".reveal .slides > section.present h1")).toContainText("Slide 2");

  const pixel = await page.evaluate(async () => {
    const mod = await import("/src/utils/screenshot.ts");
    const root = document.querySelector<HTMLElement>(".paper-content-wrapper");
    if (!root) throw new Error("Missing .paper-content-wrapper");
    const blob = await mod.capturePaperScreenshot(root, "reveal");
    const bmp = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Missing 2D context");
    ctx.drawImage(bmp, 0, 0);
    const x = Math.floor(canvas.width / 2);
    const y = Math.floor(canvas.height / 2);
    const data = ctx.getImageData(x, y, 1, 1).data;
    return { r: data[0], g: data[1], b: data[2], width: canvas.width, height: canvas.height };
  });

  expect(pixel.width).toBeGreaterThan(600);
  expect(pixel.height).toBeGreaterThan(300);
  // First slide is green; if we accidentally capture current slide (slide 2), red dominates.
  expect(pixel.g).toBeGreaterThan(150);
  expect(pixel.g).toBeGreaterThan(pixel.r + 40);
});
