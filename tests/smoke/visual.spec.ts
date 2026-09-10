import { test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('.evidence/screenshots', { recursive: true });

for (const [name, viewport] of [
  ['portrait-small', { width: 320, height: 568 }],
  ['portrait', { width: 390, height: 844 }],
  ['landscape', { width: 844, height: 390 }],
  ['desktop', { width: 1440, height: 900 }],
] as const) {
  test(`captures ${name} production layout`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.screenshot({ path: `.evidence/screenshots/${name}.png`, fullPage: true });
  });
}
