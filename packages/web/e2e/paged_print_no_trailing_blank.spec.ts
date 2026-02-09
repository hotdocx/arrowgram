import { test, expect } from "@playwright/test";

test("paged print CSS avoids a forced trailing page-break", async ({ page }) => {
  const markdown = `---\n` +
    `title: Test\n` +
    `authors: E2E\n` +
    `---\n\n` +
    `# One Page\n\n` +
    `Hello.\n`;

  await page.addInitScript(({ md }) => {
    localStorage.setItem(
      "print_paper",
      JSON.stringify({
        markdown: md,
        renderTemplate: "paged",
        customCss: "",
      })
    );
    localStorage.setItem("print_layout", "false");
  }, { md: markdown });

  await page.goto("/print-preview");
  await expect(page.locator(".pagedjs_page")).toHaveCount(1);

  await page.emulateMedia({ media: "print" });

  const last = page.locator(".pagedjs_page").last();
  const breaks = await last.evaluate((el) => {
    const s = getComputedStyle(el as HTMLElement);
    // Different engines expose different properties; capture both.
    return { breakAfter: (s as any).breakAfter, pageBreakAfter: (s as any).pageBreakAfter };
  });

  expect(String(breaks.breakAfter ?? "")).not.toBe("always");
  expect(String(breaks.pageBreakAfter ?? "")).not.toBe("always");
});

