import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 20_000,
  webServer: { command: 'npm run build:test && vite preview --host 127.0.0.1 --outDir dist-test --port 4174', url: 'http://127.0.0.1:4174', reuseExistingServer: false },
  use: { baseURL: 'http://127.0.0.1:4174', trace: 'retain-on-failure', channel: 'chrome' },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'mobile-chrome', use: { ...devices['iPhone 13'], browserName: 'chromium', channel: 'chrome' } },
  ],
});
