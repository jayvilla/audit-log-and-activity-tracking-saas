import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://localhost:3000';
// API URL is set in global setup, but we need a default for webServer command
const testApiUrl = process.env['TEST_API_URL'] || 'http://localhost:8001/api';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  /* Global setup/teardown */
  globalSetup: require.resolve('./src/global-setup.ts'),
  globalTeardown: require.resolve('./src/global-teardown.ts'),
  /* Run tests with fewer workers to avoid rate limit conflicts */
  workers: 1,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: `pnpm exec cross-env PORT=3000 NEXT_PUBLIC_API_URL=http://localhost:8001/api pnpm exec nx run web:dev`,
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 180 * 1000, // Increased timeout to 3 minutes
      cwd: workspaceRoot,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
