import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  timeout: 30_000,

  use: {
    baseURL: "http://localhost:3098",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    // Port 3098 is the Recipes-only E2E port. Never reuse an existing server —
    // if another project happens to be on this port, we'd silently test the
    // wrong app (we hit this when aquatrack had its dev server on 3099).
    //
    // Must use plain `next dev` (no --turbo). The E2E mocks swap via webpack
    // aliases in next.config.mjs, which Turbopack ignores — without this, the
    // real Firebase AuthContext loads and pages redirect to /login.
    command: "NEXT_PUBLIC_E2E_TEST=true npx next dev --port 3098",
    port: 3098,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      NEXT_PUBLIC_E2E_TEST: "true",
    },
  },
});
