import { test, expect } from "@playwright/test";

test("OSS: upload/download/delete attachment", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /New Diagram/i }).click();

  // Open right panel "Files" tab
  await page.locator('button[title="Files"]').click();
  await expect(page.getByText("No files yet.", { exact: false })).toBeVisible();

  const fileInput = page.locator('[data-testid="attachments-file-input"]');
  await fileInput.setInputFiles({
    name: "hello.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("hello"),
  });

  await expect(page.getByText("hello.txt")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.locator('button[title="Download"]').first().click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("hello.txt");

  await page.locator('button[title="Delete"]').first().click();
  await expect(page.getByText("hello.txt")).toHaveCount(0);
});
