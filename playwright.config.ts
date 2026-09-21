import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for MinBack.
 * Runs against the local Next.js dev server.
 */
export default defineConfig({
  testDir: "./test/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1, // Sequential execution to prevent DB state collisions
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL:
      process.env.PLAYWRIGHT_BASE_URL ??
      process.env.PLAYWRIGHT_TEST_BASE_URL ??
      "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
        url: "http://127.0.0.1:3100",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
