import {defineConfig, devices} from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  // Each Phaser boot preloads the complete 32px world and battle catalog.
  // Serial execution keeps texture loading deterministic on CI and Windows.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  },
  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome']}
    }
  ]
});
