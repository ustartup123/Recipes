import { test, expect } from "@playwright/test";

test.describe("Recipes navigation", () => {
  test("recipes index renders empty state for a new user", async ({ page }) => {
    await page.goto("/recipes");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { name: "המתכונים שלי" }),
    ).toBeVisible();
    // Empty state or grid — empty state has the Hebrew message
    await expect(page.getByText("עדיין אין מתכונים")).toBeVisible();
  });

  test("new-recipe page renders the three import tabs", async ({ page }) => {
    await page.goto("/recipes/new");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { name: "מתכון חדש" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "ידני" })).toBeVisible();
    await expect(page.getByRole("button", { name: "מקישור" })).toBeVisible();
    await expect(page.getByRole("button", { name: "מטקסט" })).toBeVisible();
  });

  test("manual tab shows the recipe form", async ({ page }) => {
    await page.goto("/recipes/new");
    await page.waitForLoadState("networkidle");
    // Manual is default — the form's "שם המתכון" label should be visible
    await expect(page.getByText("שם המתכון")).toBeVisible();
    await expect(page.getByText("מרכיבים").first()).toBeVisible();
    await expect(page.getByText("אופן ההכנה")).toBeVisible();
  });

  test("root redirects authenticated user to /recipes", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/recipes", { timeout: 5_000 });
    await expect(
      page.getByRole("heading", { name: "המתכונים שלי" }),
    ).toBeVisible();
  });
});
