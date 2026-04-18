import { test, expect } from "@playwright/test";

test.describe("App navigation", () => {
  test("navbar is visible on authenticated pages", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Navbar should have the AquaTrack branding
    await expect(page.getByText("AquaTrack").first()).toBeVisible();
  });

  test("can navigate from dashboard to aquariums page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /Add Tank/ }).click();
    await expect(page).toHaveURL(/\/aquariums/);
  });

  test("can navigate from dashboard to log page via tank action", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /Log/ }).first().click();
    await expect(page).toHaveURL(/\/aquariums\/.*\/log/);
  });

  test("can navigate from dashboard to timeline via tank action", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /Timeline/ }).first().click();
    await expect(page).toHaveURL(/\/aquariums\/.*\/timeline/);
  });

  test("can navigate from dashboard to analysis via tank action", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /Analyze/ }).first().click();
    await expect(page).toHaveURL(/\/aquariums\/.*\/analysis/);
  });

  test("can navigate from dashboard to advisor", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /Ask AI/ }).first().click();
    await expect(page).toHaveURL(/\/advisor/);
  });

  test("log page has back navigation to timeline", async ({ page }) => {
    await page.goto("/aquariums/tank-1/log");
    await page.waitForLoadState("networkidle");

    // The back arrow link should point to timeline
    const backLink = page.locator("a[href*='timeline']").first();
    await expect(backLink).toBeVisible();
  });

  test("timeline page has back navigation to dashboard", async ({ page }) => {
    await page.goto("/aquariums/tank-1/timeline");
    await page.waitForLoadState("networkidle");

    const backLink = page.locator("a[href*='dashboard']").first();
    await expect(backLink).toBeVisible();
  });

  test("timeline page has Log Entry button linking to log page", async ({ page }) => {
    await page.goto("/aquariums/tank-1/timeline");
    await page.waitForLoadState("networkidle");

    const logLink = page.getByRole("link", { name: /Log Entry/ });
    await expect(logLink).toBeVisible();
    await logLink.click();
    await expect(page).toHaveURL(/\/aquariums\/tank-1\/log/);
  });
});
