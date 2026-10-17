import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./__tests__/browser",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    storageState: {
      cookies: [],
      origins: [5173, 5174].map((port) => ({
        origin: `http://127.0.0.1:${port}`,
        localStorage: [{ name: "buzzzz.onboarding.seen", value: "true" }],
      })),
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "bun run dev:studio",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command:
        "bun run --cwd apps/relay dev --port 8788 --inspector-port 0 --persist-to .wrangler/playwright --var STUDIO_ORIGINS:http://127.0.0.1:5174",
      url: "http://127.0.0.1:8788/health",
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "bun run --cwd apps/studio dev --host 127.0.0.1 --port 5174 --strictPort",
      env: { VITE_RELAY_URL: "http://127.0.0.1:8788" },
      url: "http://127.0.0.1:5174",
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
