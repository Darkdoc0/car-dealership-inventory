/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The API runs on :3000 in development. Proxying keeps the browser on one origin (no CORS needed).
// End-to-end tests start their own servers on other ports, so both ports can be overridden.
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3000';
const port = Number(process.env.PORT ?? 5173);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port,
    proxy: { '/api': apiTarget },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    css: false,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/test/**', 'src/**/*.test.{ts,tsx}'],
    },
  },
});
