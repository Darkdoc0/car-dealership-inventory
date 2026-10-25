/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // PORT and API_PROXY_TARGET come from the real environment first, then from frontend/.env (see .env.example).
  // The end-to-end tests set them to run their own servers beside a development one.
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.API_PROXY_TARGET ?? 'http://localhost:3000';
  const port = Number(env.PORT ?? 5173);

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port,
      // The API runs on :3000 in development. Proxying keeps the browser on one origin (no CORS needed).
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
  };
});
