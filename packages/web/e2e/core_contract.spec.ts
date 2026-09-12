import { expect, test } from '@playwright/test';

function encodeSpec(spec: object): string {
  return Buffer.from(JSON.stringify(spec), 'utf8').toString('base64url');
}

test('strict core diagnostics are visible instead of rendering an empty success', async ({ page }) => {
  const spec = {
    version: 1,
    nodes: [{ name: 'A', left: 100, top: 100 }],
    arrows: [{ name: 'f', from: 'A', to: 'missing' }],
  };

  await page.goto(`/?spec=${encodeSpec(spec)}`);

  await expect(page.getByRole('alert')).toContainText('Diagram error:');
  await expect(page.getByRole('alert')).toContainText('does not resolve');
  await expect(page.locator('.arrow-visual')).toHaveCount(0);
});

test('legacy uniqueId residue renders with an observable normalization warning', async ({ page }) => {
  const spec = {
    version: 1,
    nodes: [
      { name: 'A', left: 100, top: 100 },
      { name: 'B', left: 300, top: 100 },
    ],
    arrows: [{ name: 'f', uniqueId: 'f', from: 'A', to: 'B' }],
  };

  await page.goto(`/?spec=${encodeSpec(spec)}`);

  await expect(page.getByRole('status')).toContainText('uniqueId');
  await expect(page.locator('.arrow-visual')).toHaveCount(1);
});

test('topological render order does not reorder persisted source arrows', async ({ page }) => {
  const spec = {
    version: 1,
    nodes: [
      { name: 'A', left: 100, top: 200 },
      { name: 'B', left: 400, top: 200 },
    ],
    arrows: [
      { name: 'alpha', from: 'F', to: 'G', style: { level: 2 } },
      { name: 'F', from: 'A', to: 'B', curve: -40 },
      { name: 'G', from: 'A', to: 'B', curve: 40 },
    ],
  };

  await page.goto(`/?spec=${encodeSpec(spec)}`);
  await expect(page.locator('.arrow-visual')).toHaveCount(3);

  const arrowSelectionId = await page
    .locator('g[data-type="arrow"][data-source-index="1"]')
    .getAttribute('data-id');
  expect(arrowSelectionId).toBeTruthy();
  if (!arrowSelectionId) throw new Error('Missing computed arrow selection ID.');
  await page.evaluate(async (selectionId) => {
    const { useDiagramStore } = await import('/src/store/diagramStore.ts');
    useDiagramStore.getState().setSelection(new Set([selectionId]));
  }, arrowSelectionId);
  await expect(page.locator(`circle[data-arrow-id="${arrowSelectionId}"]`)).toHaveCount(2);
  await page.getByTitle('Reverse Arrow (R)').click();

  await expect.poll(async () => page.evaluate(async () => {
    const { useDiagramStore } = await import('/src/store/diagramStore.ts');
    const current = JSON.parse(useDiagramStore.getState().spec);
    return {
      names: current.arrows.map((arrow: { name?: string }) => arrow.name),
      reversed: current.arrows[1],
    };
  })).toMatchObject({
    names: ['alpha', 'F', 'G'],
    reversed: { name: 'F', from: 'B', to: 'A' },
  });

  const persisted = await page.evaluate(async () => {
    const { useDiagramStore } = await import('/src/store/diagramStore.ts');
    return JSON.parse(useDiagramStore.getState().spec);
  });
  expect(persisted.arrows[1]).toMatchObject({ name: 'F', from: 'B', to: 'A' });
  expect(persisted.arrows.every((arrow: Record<string, unknown>) => !('uniqueId' in arrow))).toBe(true);
});
