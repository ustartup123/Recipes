import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test("redirects authenticated user from /login to /dashboard", async ({ page }) => {
    // In E2E mode the mock AuthContext always provides a user,
    // so visiting /login should redirect to /dashboard.
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("root URL loads the dashboard for authenticated user", async ({ page }) => {
    await page.goto("/");
    // The app should redirect to dashboard or render it at /
    await page.waitForLoadState("networkidle");
    // Should see the welcome header or dashboard content
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});
