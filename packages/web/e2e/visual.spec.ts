import { test, expect } from '@playwright/test';

// Helper to encode spec for URL
function encodeSpec(spec: object): string {
  const str = JSON.stringify(spec);
  return Buffer.from(str).toString('base64');
}

test('renders curved arrow correctly', async ({ page }) => {
  const spec = {
    version: 1,
    nodes: [
      { name: "A", left: 100, top: 100, label: "A" },
      { name: "B", left: 400, top: 100, label: "B" }
    ],
    arrows: [
      {
        from: "A",
        to: "B",
        label: "f",
        curve: 30, // Significant curve
        style: {
          head: { name: "normal" }
        }
      }
    ]
  };

  const encoded = encodeSpec(spec);
  await page.goto(`/?spec=${encoded}`);

  // Wait for SVG to be present
  const svg = page.locator('svg').first();
  await expect(svg).toBeVisible();

  // Find the arrow path
  // The arrow path should be inside a group with data-type="arrow"
  const arrowGroup = page.locator('g[data-type="arrow"]');
  await expect(arrowGroup).toBeVisible();

  const path = arrowGroup.locator('path').first();
  const d = await path.getAttribute('d');

  console.log('Arrow Path D:', d);

  // Check for curve commands in the SVG path.
  // Bezier curves use 'C' (cubic) or 'Q' (quadratic) or 'S'/'T'. 
  // Straight lines use 'L' or implicit line after 'M'.
  // Our implementation uses `curve.render(path)` which likely produces 'C' commands for beziers.
  expect(d).toMatch(/[CQAqca]/); 
});

test('renders adjunction (curved arrows) correctly', async ({ page }) => {
    const spec = {
      nodes: [
        { name: "C", left: 100, top: 200, label: "\\mathcal{C}" },
        { name: "D", left: 400, top: 200, label: "\\mathcal{D}" }
      ],
      arrows: [
        { from: "C", to: "D", label: "F", curve: 40 },
        { from: "D", to: "C", label: "G", curve: 40 } // Both positive curve relative to direction = "almond" shape
      ]
    };
  
    const encoded = encodeSpec(spec);
    await page.goto(`/?spec=${encoded}`);
  
    // Verify two arrows exist
    const arrows = page.locator('g[data-type="arrow"]');
    await expect(arrows).toHaveCount(2);
});
