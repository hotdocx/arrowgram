import { test, expect } from '@playwright/test';

function encodeSpec(spec: object): string {
  const str = JSON.stringify(spec);
  return Buffer.from(str).toString('base64url');
}

test('renders ADJUNCTION style correctly', async ({ page }) => {
  const spec = {
    nodes: [
      { name: "A", left: 100, top: 100, label: "A" },
      { name: "B", left: 300, top: 100, label: "B" }
    ],
    arrows: [
      { 
        from: "A", to: "B", 
        style: { mode: "adjunction" } 
      }
    ]
  };

  await page.goto(`/?spec=${encodeSpec(spec)}`);
  
  const path = page.locator('.arrow-visual path').first();
  await expect(path).toBeVisible();
  
  // Adjunction draws the symbol AS the edge path.
  // We check if the path d contains Move and Line commands
  const d = await path.getAttribute('d');
  expect(d).toBeTruthy();
  // It should NOT look like a simple line (M ... L ...) covering the whole distance.
  // It should be small (16px).
  // But exact path check is hard.
  // We can check that it has multiple segments (M L M L or similar).
  // My implementation: move_to, line_by, move_to, line_by.
  // So it should have at least 2 'M' commands (implicit 'L' after 'l' or 'L').
  // Actually Path.toString() uses absolute commands?
  // My Path implementation uses M and L.
  // So we expect "M ... L ... M ... L ..."
  // Updated regex to handle 'h' and 'l' commands and lowercase, and multiline.
  expect(d).toMatch(/M[\s\S]*[LlHh][\s\S]*M[\s\S]*[LlHhVv]/);
});

test('renders PROARROW (barred) style correctly', async ({ page }) => {
  const spec = {
    nodes: [
      { name: "A", left: 100, top: 100 },
      { name: "B", left: 300, top: 100 }
    ],
    arrows: [
      {
        from: "A", to: "B",
        style: { body: { name: "barred" } }
      }
    ]
  };

  await page.goto(`/?spec=${encodeSpec(spec)}`);
  
  // Check VISUAL layer
  const arrowGroup = page.locator('.arrow-visual');
  await expect(arrowGroup).toBeVisible();
  
  await expect(arrowGroup.locator('path')).toHaveCount(3);
});

test('renders BULLET style correctly', async ({ page }) => {
    const spec = {
      nodes: [
        { name: "A", left: 100, top: 100 },
        { name: "B", left: 300, top: 100 }
      ],
      arrows: [
        {
          from: "A", to: "B",
          style: { body: { name: "bullet_solid" } }
        }
      ]
    };
  
    await page.goto(`/?spec=${encodeSpec(spec)}`);
    
    const arrowGroup = page.locator('.arrow-visual');
    await expect(arrowGroup).toBeVisible();
    
    const paths = arrowGroup.locator('path');    const count = await paths.count();
    let foundBullet = false;
    for (let i = 0; i < count; i++) {
        const d = await paths.nth(i).getAttribute('d');
        if (d && d.toLowerCase().includes('a')) {
            foundBullet = true;
            break;
        }
    }
    expect(foundBullet).toBe(true);
  });
