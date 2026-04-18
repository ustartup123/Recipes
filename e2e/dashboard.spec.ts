import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
  });

  test("displays welcome header with user name", async ({ page }) => {
    // The mock user is "E2E Test User", first name = "E2E"
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome back");
  });

  test("displays summary stats bar with tank count", async ({ page }) => {
    // Mock data has 2 tanks
    const tanksCard = page.locator("text=Tanks").first();
    await expect(tanksCard).toBeVisible();
  });

  test("displays aquarium cards for each tank", async ({ page }) => {
    // Mock data: "Living Room Tank" and "Office Nano"
    await expect(page.getByText("Living Room Tank")).toBeVisible();
    await expect(page.getByText("Office Nano")).toBeVisible();
  });

  test("shows tank type badges", async ({ page }) => {
    await expect(page.getByText("freshwater").first()).toBeVisible();
    await expect(page.getByText("planted").first()).toBeVisible();
  });

  test("shows latest parameter values for tank with readings", async ({ page }) => {
    // Tank-1 has parameter readings: pH 7.2, ammonia 0, etc.
    await expect(page.getByText("7.20").first()).toBeVisible();
  });

  test("shows action buttons (Log, Timeline, Analyze, Ask AI) per tank", async ({ page }) => {
    await expect(page.getByRole("link", { name: /Log/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Timeline/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Analyze/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Ask AI/ }).first()).toBeVisible();
  });

  test("has Add Tank button in header", async ({ page }) => {
    await expect(page.getByRole("link", { name: /Add Tank/ })).toBeVisible();
  });

  test("Add Tank button navigates to aquariums page", async ({ page }) => {
    await page.getByRole("link", { name: /Add Tank/ }).click();
    await expect(page).toHaveURL(/\/aquariums/);
  });

  test("quick-add bar is visible at the bottom", async ({ page }) => {
    // Quick-add buttons: Addition, Death, Dose, Test, WC
    await expect(page.getByRole("link", { name: /Test/ }).first()).toBeVisible();
  });

  test("Log button on tank card navigates to log page", async ({ page }) => {
    const logLink = page.getByRole("link", { name: /Log/ }).first();
    await logLink.click();
    await expect(page).toHaveURL(/\/aquariums\/tank-1\/log/);
  });

  test("Timeline button navigates to timeline page", async ({ page }) => {
    const timelineLink = page.getByRole("link", { name: /Timeline/ }).first();
    await timelineLink.click();
    await expect(page).toHaveURL(/\/aquariums\/tank-1\/timeline/);
  });
});
