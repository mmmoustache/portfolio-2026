import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
const HOST = '127.0.0.1';

export default defineConfig({
  testDir: './src/e2e',
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: `http://${HOST}:${PORT}`,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npm run build && npm run preview -- --host ${HOST} --port ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 16'] } },
  ],
});
