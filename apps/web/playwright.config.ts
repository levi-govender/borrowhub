import { defineConfig, devices } from "@playwright/test";

const cloudWebUrl = process.env.CLOUD_WEB_URL;
const baseURL = cloudWebUrl ?? process.env.WEB_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.CI ? {} : { channel: "chrome" }),
      },
    },
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 5"],
        ...(process.env.CI ? {} : { channel: "chrome" }),
      },
    },
  ],
  webServer: cloudWebUrl
    ? undefined
    : {
        command: "pnpm dev --host 127.0.0.1 --port 5173",
        url: "http://localhost:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
