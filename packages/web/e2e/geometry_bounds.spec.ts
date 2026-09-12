import { expect, test } from '@playwright/test';

function paperUrl(spec: object): string {
  const markdown = [
    '# Geometry bounds',
    '',
    '<div class="arrowgram">',
    JSON.stringify(spec, null, 2),
    '</div>',
    '',
  ].join('\n');
  return `/?paper=${Buffer.from(markdown, 'utf8').toString('base64url')}`;
}

async function geometryMetrics(page: import('@playwright/test').Page) {
  return await page.locator('.arrowgram-container svg').evaluate((svg) => {
    const viewBox = (svg as SVGSVGElement).viewBox.baseVal;
    const group = svg.querySelector(':scope > g') as SVGGElement | null;
    if (!group) throw new Error('Missing Arrowgram content group.');
    const bounds = group.getBBox();
    return {
      viewBox: {
        minX: viewBox.x,
        minY: viewBox.y,
        maxX: viewBox.x + viewBox.width,
        maxY: viewBox.y + viewBox.height,
      },
      content: {
        minX: bounds.x,
        minY: bounds.y,
        maxX: bounds.x + bounds.width,
        maxY: bounds.y + bounds.height,
      },
    };
  });
}

function expectContained(
  content: { minX: number; minY: number; maxX: number; maxY: number },
  viewBox: { minX: number; minY: number; maxX: number; maxY: number },
) {
  expect(content.minX).toBeGreaterThanOrEqual(viewBox.minX - 0.5);
  expect(content.minY).toBeGreaterThanOrEqual(viewBox.minY - 0.5);
  expect(content.maxX).toBeLessThanOrEqual(viewBox.maxX + 0.5);
  expect(content.maxY).toBeLessThanOrEqual(viewBox.maxY + 0.5);
}

test('large unlabeled loop geometry fits inside the computed viewBox', async ({ page }) => {
  await page.goto(paperUrl({
    version: 1,
    nodes: [{ name: 'A', left: 0, top: 0 }],
    arrows: [{ from: 'A', to: 'A', radius: 100 }],
  }));

  const metrics = await geometryMetrics(page);
  expectContained(metrics.content, metrics.viewBox);
  expect(metrics.viewBox.maxY - metrics.viewBox.minY).toBeGreaterThan(200);
});

test('large shifted curved geometry fits inside the computed viewBox', async ({ page }) => {
  await page.goto(paperUrl({
    version: 1,
    nodes: [
      { name: 'A', left: 0, top: 0 },
      { name: 'B', left: 400, top: 200 },
    ],
    arrows: [{
      from: 'A',
      to: 'B',
      curve: 500,
      shift: 20,
      style: { body: { name: 'double_barred' }, level: 3 },
    }],
  }));

  const metrics = await geometryMetrics(page);
  expectContained(metrics.content, metrics.viewBox);
});
