import { test, expect } from "@playwright/test";

test("reveal print-pdf renders all slides content", async ({ page }) => {
  const markdown = `---\n` +
    `title: Test\n` +
    `authors: E2E\n` +
    `---\n\n` +
    `# Slide 1\n\nHello.\n\n` +
    `---\n\n` +
    `# Slide 2\n\nWorld.\n\n` +
    `---\n\n` +
    `# Slide 3\n\nDone.\n`;

  await page.addInitScript(({ md }) => {
    localStorage.setItem(
      "print_paper",
      JSON.stringify({
        markdown: md,
        renderTemplate: "reveal",
        customCss: "",
      })
    );
    localStorage.setItem("print_layout", "false");
  }, { md: markdown });

  await page.goto("/print-preview?print-pdf=1");

  await expect(page.locator("html.print-pdf")).toBeVisible();
  await expect(page.locator("html.reveal-print")).toBeVisible();
  await expect(page.locator(".reveal .slides .pdf-page")).toHaveCount(3);

  const texts = await page.locator(".reveal .slides .pdf-page section").allTextContents();
  expect(texts.join("\n")).toContain("Slide 1");
  expect(texts.join("\n")).toContain("Slide 2");
  expect(texts.join("\n")).toContain("Slide 3");

  // Ensure the second slide is not hidden.
  const secondOpacity = await page.locator(".reveal .slides .pdf-page section").nth(1).evaluate((el) => {
    const s = getComputedStyle(el as HTMLElement);
    return {
      opacity: s.opacity,
      visibility: s.visibility,
      display: s.display,
      styleAttr: (el as HTMLElement).getAttribute("style"),
      className: (el as HTMLElement).className,
      hidden: (el as HTMLElement).hasAttribute("hidden"),
    };
  });
  // Helpful debug if this ever regresses.
  // eslint-disable-next-line no-console
  console.log("Second slide computed:", secondOpacity);
  expect(secondOpacity.display).not.toBe("none");
  expect(secondOpacity.visibility).not.toBe("hidden");
  expect(Number(secondOpacity.opacity)).toBeGreaterThan(0.5);
});
