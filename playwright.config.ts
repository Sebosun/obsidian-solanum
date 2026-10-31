import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/browser",
  use: {
    baseURL: "http://127.0.0.1:45173",
    viewport: { width: 320, height: 720 },
    screenshot: "only-on-failure",
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
  },
  webServer: {
    command: "node tests/browser/server.mjs",
    url: "http://127.0.0.1:45173",
    reuseExistingServer: false,
  },
});
