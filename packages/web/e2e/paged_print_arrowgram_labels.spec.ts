import { test, expect } from "@playwright/test";

test("paged print preview preserves Arrowgram label rendering", async ({ page }) => {
  const markdown = `---\n` +
    `title: Test\n` +
    `authors: E2E\n` +
    `---\n\n` +
    `# Diagram\n\n` +
    `<div class="arrowgram">\n` +
    `{\n` +
    `  "nodes": [\n` +
    `    { "name": "A", "left": 100, "top": 100, "label": "$A$" },\n` +
    `    { "name": "B", "left": 320, "top": 100, "label": "$B$" }\n` +
    `  ],\n` +
    `  "arrows": [\n` +
    `    { "from": "A", "to": "B", "label": "$f$" }\n` +
    `  ]\n` +
    `}\n` +
    `</div>\n`;

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

  await expect(page.locator(".pagedjs_pages")).toBeVisible();
  await expect(page.locator(".pagedjs_page")).toHaveCount(1);

  // Arrowgram renders KaTeX labels via <foreignObject>. In Paged.js output, SVG may be inlined
  // or embedded as an <img> (SVG data/blob URL). Validate the SVG markup includes the KaTeX
  // content so the preview isn't silently dropping labels.
  const svgMarkup = await page.locator(".pagedjs_pages").evaluate(async (root) => {
    const svg = root.querySelector(".pagedjs_page_content svg") as SVGElement | null;
    if (svg) return svg.outerHTML;

    const img = root.querySelector(".pagedjs_page_content img") as HTMLImageElement | null;
    if (!img?.src) return null;

    if (img.src.startsWith("data:image/svg+xml")) {
      const comma = img.src.indexOf(",");
      const payload = comma >= 0 ? img.src.slice(comma + 1) : "";
      return decodeURIComponent(payload);
    }

    if (img.src.startsWith("blob:")) {
      try {
        const res = await fetch(img.src);
        const txt = await res.text();
        return txt;
      } catch {
        return null;
      }
    }

    return null;
  });

  expect(svgMarkup).toBeTruthy();
  expect(String(svgMarkup)).toContain("foreignObject");
});
