import { defineConfig } from '@playwright/test';
import { APP_URL, BACKEND_PORT, E2E_JWT_SECRET, FRONTEND_PORT, TEST_DATABASE_URL } from './support/env';

export default defineConfig({
  testDir: './tests',
  // One worker: every test shares one database, and the tests keep their data apart with unique names.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: APP_URL,
    // Drives a browser that is already installed, so none has to be downloaded. Set E2E_CHANNEL=msedge for Edge.
    channel: process.env.E2E_CHANNEL ?? 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      // The real API on its own port, against a freshly reset test database.
      command: 'npx tsx ../e2e/support/start-backend.ts',
      cwd: '../backend',
      port: BACKEND_PORT,
      env: { DATABASE_URL: TEST_DATABASE_URL, JWT_SECRET: E2E_JWT_SECRET },
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      // The real frontend, proxying /api to that backend.
      command: 'npx vite --strictPort',
      cwd: '../frontend',
      port: FRONTEND_PORT,
      env: { PORT: String(FRONTEND_PORT), API_PROXY_TARGET: `http://localhost:${BACKEND_PORT}` },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
