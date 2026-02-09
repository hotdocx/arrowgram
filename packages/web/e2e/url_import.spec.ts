import { test, expect } from "@playwright/test";

function base64url(text: string): string {
  return Buffer.from(text, "utf8").toString("base64url");
}

test("?paper= loads paper editor", async ({ page }) => {
  const md = `# Hello Paper\n\nThis is loaded via ?paper=.\n`;
  await page.goto(`/?paper=${base64url(md)}`);

  const textarea = page.locator('textarea[placeholder="# Start writing your paper..."]');
  await expect(textarea).toBeVisible();
  await expect(textarea).toHaveValue(md);
});

test("?link=/test_paper.md&type=paper fetches and loads paper editor", async ({ page }) => {
  await page.goto(`/?link=/test_paper.md&type=paper`);

  const textarea = page.locator('textarea[placeholder="# Start writing your paper..."]');
  await expect(textarea).toBeVisible();
  await expect(textarea).toContainText("This is a test paper fixture.");
});

test("paper preview sanitizes event handlers (no XSS via onerror)", async ({ page }) => {
  const md = `# XSS\n\n<img src="x" onerror="window.__xss = 1" />\n`;
  await page.goto(`/?paper=${base64url(md)}`);

  // Allow render pipeline time (Paged.js + conversions).
  await page.waitForTimeout(1500);

  const xss = await page.evaluate(() => (window as any).__xss);
  expect(xss).toBeUndefined();
});
