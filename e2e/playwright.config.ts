import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 180_000,
  outputDir: './screenshots',
  // all tests share one Electron instance
  workers: 1,
});
