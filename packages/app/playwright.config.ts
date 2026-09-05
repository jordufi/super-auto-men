import { defineConfig, devices } from '@playwright/test'

// Runs against the PRODUCTION build served by `vite preview`, the same thing CI and the phone get.
// URL parameters are compiled in with VITE_ALLOW_URL_PARAMS=1 (they are off in a normal build).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'cross-env VITE_ALLOW_URL_PARAMS=1 npm run build && npm run preview -- --port 5174 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: !process.env['CI'],
    stdout: 'ignore',
    timeout: 120_000,
  },
})
