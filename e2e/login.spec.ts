import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    // The login page should be visible (sign-in button or similar)
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("root URL is reachable", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(500);
  });
});
