const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30000,
  expect: {
    timeout: 7000,
  },
  use: {
    baseURL: "http://127.0.0.1:5178",
    viewport: { width: 1280, height: 720 },
    serviceWorkers: "block",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run serve",
    url: "http://127.0.0.1:5178",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
