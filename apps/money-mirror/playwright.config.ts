import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    ...devices['Desktop Chrome'],
    // Dedicated port so E2E does not fight `next dev` on 3000.
    baseURL: 'http://127.0.0.1:3333',
    trace: 'on-first-retry',
  },
  webServer: {
    // `next start` after `npm run build` (see `test:e2e` script) — fast and stable vs cold `next dev`.
    command: 'npm run start -- -p 3333',
    url: 'http://127.0.0.1:3333',
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
  },
});
