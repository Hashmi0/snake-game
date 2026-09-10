import { expect, test } from '@playwright/test';

test('production root loads playable shell without test controls', async ({ page }) => {
  const failed: string[] = [];
  page.on('requestfailed', request => failed.push(request.url()));
  await page.goto('/');
  await expect(page).toHaveTitle(/Snake Garden/);
  await expect(page.locator('#garden-canvas')).toBeVisible();
  expect(await page.evaluate(() => Boolean((window as Window & { __snakeGarden?: unknown }).__snakeGarden))).toBe(false);
  expect(failed).toEqual([]);
  await page.getByRole('button', { name: /Start game/ }).click();
  await expect(page.locator('#score')).toHaveText('00');
});
