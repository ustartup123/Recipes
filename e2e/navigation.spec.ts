import { test, expect } from "@playwright/test";

test.describe("App navigation", () => {
  test("settings page is reachable for authenticated user", async ({ page }) => {
    // In E2E mode the AuthContext provides a mock user via dev bypass, so
    // protected routes should render instead of redirecting to /login.
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /Settings/i })).toBeVisible();
  });

  test("settings page has sign out button", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /Sign Out/i })).toBeVisible();
  });
});
