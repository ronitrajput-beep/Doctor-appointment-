import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:8000",
    headless: true,
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH,
      args: ["--no-sandbox"],
    },
  },
  reporter: [
    ["list"],
    ["json", { outputFile: "../docs/browser-test-results.json" }],
  ],
});
