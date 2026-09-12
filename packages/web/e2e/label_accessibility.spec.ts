import { expect, test } from '@playwright/test';

function paperUrl(specs: object[]): string {
  const blocks = specs.flatMap((spec, index) => [
    `## Diagram ${index + 1}`,
    '',
    '<div class="arrowgram">',
    JSON.stringify(spec, null, 2),
    '</div>',
    '',
  ]);
  const markdown = ['# Label contract', '', ...blocks].join('\n');
  return `/?paper=${Buffer.from(markdown, 'utf8').toString('base64url')}`;
}

const vertical = {
  version: 1,
  nodes: [
    { name: 'A', left: 0, top: 0, label: 'Object $A$' },
    { name: 'B', left: 0, top: 220, label: '$B$' },
  ],
  arrows: [{
    name: 'f',
    from: 'A',
    to: 'B',
    label: 'map $f$',
    label_alignment: 'over',
  }],
};

const loop = {
  version: 1,
  nodes: [{ name: 'X', left: 0, top: 0, label: '$X_{long}$' }],
  arrows: [{
    name: 'omega',
    from: 'X',
    to: 'X',
    radius: 100,
    label: 'loop $\\omega_{verylong}$',
    style: { level: 2 },
  }],
};

test('mixed labels, masks, and accessible summaries are instance-safe', async ({ page }) => {
  await page.goto(paperUrl([vertical, loop]));

  const diagrams = page.locator('.arrowgram-container svg');
  await expect(diagrams).toHaveCount(2);
  await expect(page.locator('.arrowgram-container g[role="img"]')).toHaveCount(2);
  await expect(page.locator('.arrowgram-container g[role="img"]').first())
    .toHaveAttribute('aria-label', /Nodes: A \(Object A\), B/);

  const maskIds = await page.locator('.arrowgram-container mask').evaluateAll(
    (masks) => masks.map((mask) => mask.id),
  );
  expect(maskIds.length).toBeGreaterThan(1);
  expect(new Set(maskIds).size).toBe(maskIds.length);

  const maskMetrics = await page.locator('.arrowgram-container mask').evaluateAll(
    (masks) => masks.map((mask) => ({
      x: Number(mask.getAttribute('x')),
      width: Number(mask.getAttribute('width')),
    })),
  );
  expect(maskMetrics.every((mask) => mask.x > -10_000 && mask.width < 20_000)).toBe(true);

  const rotated = page.locator('.arrowgram-container foreignObject[transform^="rotate(90"]');
  await expect(rotated).toHaveCount(1);
  await expect(page.locator('.arrowgram-container foreignObject style')).toHaveCount(0);
  await expect(page.locator('.arrowgram-container .katex-mathml')).not.toHaveCount(0);
  expect(await page.locator('.arrowgram-container .katex-mathml').first().evaluate(
    (element) => getComputedStyle(element).display,
  )).not.toBe('none');

  const fit = await diagrams.evaluateAll((svgs) => svgs.map((svg) => {
    const root = svg as SVGSVGElement;
    const viewBox = root.viewBox.baseVal;
    const group = root.querySelector(':scope > g') as SVGGElement;
    const bounds = group.getBBox();
    return {
      contained:
        bounds.x >= viewBox.x - 0.5
        && bounds.y >= viewBox.y - 0.5
        && bounds.x + bounds.width <= viewBox.x + viewBox.width + 0.5
        && bounds.y + bounds.height <= viewBox.y + viewBox.height + 0.5,
    };
  }));
  expect(fit.every((result) => result.contained)).toBe(true);

  const htmlSizing = await page.locator('.arrowgram-container foreignObject > div').evaluateAll(
    (elements) => elements.map((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    })),
  );
  expect(htmlSizing.every((size) => size.scrollWidth <= size.clientWidth + 1)).toBe(true);
});

test('invalid KaTeX remains visible and observable', async ({ page }) => {
  await page.goto(paperUrl([{
    version: 1,
    nodes: [{ name: 'A', left: 0, top: 0, label: '$\\notacommand$' }],
  }]));

  const errorLabel = page.locator('[data-arrowgram-label-error="true"]');
  await expect(errorLabel).toHaveCount(1);
  await expect(errorLabel).toContainText('$\\notacommand$');
  await expect(errorLabel.locator('[title^="KaTeX parse error:"]')).toHaveCount(1);
});

test('approved mixed-label diagram visual baseline', async ({ page }) => {
  await page.goto(paperUrl([vertical]));
  const diagram = page.locator('.arrowgram-container svg');
  await expect(diagram).toHaveScreenshot('mixed-label-vertical.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.02,
  });
});
