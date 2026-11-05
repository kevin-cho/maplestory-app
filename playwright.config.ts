import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

// Its own port, so it doesn't clash with this app's `next dev` (3002) or the
// portal's ports (3000, 3001, 3100)
const port = 3102;
// Just the origin: tests use full paths like "/maplestory/damage". With the
// basePath in baseURL, a leading "/" in page.goto() would drop it.
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "e2e",
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  // Terse output: a passing run is a line or two
  reporter: isCI ? [["github"], ["line"]] : "line",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Test a fresh production build, as Next.js recommends. Never reuse a
  // running server, so tests can't run against a stale build.
  webServer: {
    command: `npm run build && npm run start -- -p ${port}`,
    // The app only serves under its basePath; "/" is a 404
    url: `${baseURL}/maplestory`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
