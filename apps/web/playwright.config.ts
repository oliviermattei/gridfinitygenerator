import { defineConfig, devices } from "@playwright/test";

const PORT = 3217;
const baseURL = `http://localhost:${PORT}`;

// End-to-end tests run against the production build (`next start`), like Vercel serves it.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // Every test loads the engine WASM and a WebGL preview in its own browser: beyond a few at
  // once, a cold first computation can exceed the 5 s of an assertion on a many-core machine.
  // CI keeps the default (half the cores of its small runner).
  workers: process.env.CI ? undefined : 4,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // Spec v1 mobile width: 390 px (Pixel 7 touch and scale, narrower viewport).
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: `pnpm exec next start -p ${PORT}`,
    url: `${baseURL}/fr/baseplate`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
