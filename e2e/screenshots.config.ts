import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Captures the README screenshots against the demo data. Run with `npm run screenshots`.
export default defineConfig({
  ...base,
  testDir: './screenshots',
  reporter: 'list',
  retries: 0,
  use: { ...base.use, viewport: { width: 1280, height: 800 }, screenshot: 'off', trace: 'off' },
  webServer: (base.webServer as Array<{ command: string }>).map((server) =>
    server.command.includes('start-backend') ? { ...server, command: 'npx tsx ../e2e/support/start-demo-backend.ts' } : server,
  ) as never,
});
