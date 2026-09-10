import { expect, test } from '@playwright/test';

test('desktop can start, steer, pause and restart', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Ready to grow?' })).toBeVisible();
  await page.getByRole('button', { name: /Start game/ }).click();
  await expect(page.getByRole('heading', { name: 'Follow your appetite.' })).toBeVisible();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  await expect(page.getByRole('heading', { name: /breather/i })).toBeVisible();
  await page.locator('#primary').click();
  await page.getByRole('button', { name: 'Restart game' }).click();
  await expect(page.locator('#score')).toHaveText('00');
});

test('mobile swipes steer before release and touch buttons are available', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /Start game/ }).click();
  const board = page.locator('#play-surface');
  const box = await board.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  await board.dispatchEvent('pointerdown', { pointerId: 1, isPrimary: true, button: 0, clientX: box.x + 100, clientY: box.y + 100 });
  await board.dispatchEvent('pointermove', { pointerId: 1, isPrimary: true, button: 0, clientX: box.x + 100, clientY: box.y + 75 });
  await expect(page.locator('#play-surface')).toBeFocused();
  await page.getByRole('button', { name: 'Go left' }).click();
  await expect(page.getByRole('button', { name: 'Go up' })).toBeVisible();
});

test('deterministic test harness is available in the e2e build', async ({ page }) => {
  await page.goto('/');
  expect(await page.evaluate(() => Boolean((window as Window & { __snakeGarden?: unknown }).__snakeGarden))).toBe(true);
  await page.evaluate(() => (window as Window & { __snakeGarden: { scenario(name: 'wall'): void; ticks(count: number): void } }).__snakeGarden.scenario('wall'));
  await page.evaluate(() => (window as Window & { __snakeGarden: { ticks(count: number): void } }).__snakeGarden.ticks(1));
  await expect(page.locator('#status-title')).toHaveText('Room to grow.');
});
