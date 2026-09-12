import { defineConfig } from '@playwright/test';

/**
 * E2E config for the Expo web build. Tests mock every `/api/*` call via
 * page.route (see tests/*.spec.ts), so the FastAPI backend does not need to
 * be running -- only the Expo web dev server, started automatically below.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8081',
    // Pinned so time-slot bucketing (local-time based) is deterministic in CI.
    timezoneId: 'America/Chicago',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx expo start --web --port 8081',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
