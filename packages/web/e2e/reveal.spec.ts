import { test, expect } from "@playwright/test";

function base64url(text: string): string {
  return Buffer.from(text, "utf8").toString("base64url");
}

test("paper can switch to Reveal slides and applies custom CSS", async ({ page }) => {
  const md = `---
title: Slide Deck
authors: Me
---

# Slide 1

Hello.

---

# Slide 2

World.
`;

  await page.goto(`/?paper=${base64url(md)}`);

  // Switch to slides template.
  await page.getByRole("button", { name: "Slides" }).click();

  const deck = page.locator(".reveal .slides");
  await expect(deck).toBeVisible();
  await expect(page.locator(".reveal .slides > section")).toHaveCount(2);

  // Open styles panel and set a visible style.
  await page.locator('button[title="Styles (CSS)"]').click();
  const cssEditor = page.locator('textarea[placeholder^="/* Custom CSS"]');

  // The styles editor is the only visible textarea in styles mode.
  await expect(cssEditor).toBeVisible();
  await cssEditor.fill([
    ".reveal { font-size: 48px; }",
    "h1 { color: rgb(255, 0, 0); }",
  ].join("\n"));

  // Wait for style injection to take effect.
  const firstH1 = page.locator(".reveal .slides section h1").first();
  await expect(firstH1).toBeVisible();
  const color = await firstH1.evaluate((el) => getComputedStyle(el).color);
  expect(color).toBe("rgb(255, 0, 0)");

  // Scoped CSS should be able to target the root `.reveal` element.
  const fontSize = await page.locator(".reveal").evaluate((el) => getComputedStyle(el).fontSize);
  expect(fontSize).toBe("48px");
});
