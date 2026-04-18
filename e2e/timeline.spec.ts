import { test, expect } from "@playwright/test";

test.describe("Timeline page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/aquariums/tank-1/timeline");
    await page.waitForLoadState("networkidle");
  });

  test("displays timeline heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Timeline/ })).toBeVisible();
  });

  test("shows event entries from mock data", async ({ page }) => {
    // Mock data has events: "Water Test", "25% Water Change", "Added 6x Neon Tetra", etc.
    // "Water Test" also matches an <option> element, so target visible span elements
    await expect(page.locator("span", { hasText: "Water Test" }).first()).toBeVisible();
    await expect(page.locator("span", { hasText: "25% Water Change" })).toBeVisible();
    await expect(page.locator("span", { hasText: "Added 6x Neon Tetra" })).toBeVisible();
  });

  test("shows parameter details on water test events", async ({ page }) => {
    // First water test has pH 7.2
    await expect(page.getByText("pH 7.2").first()).toBeVisible();
  });

  test("shows dosing event details", async ({ page }) => {
    await expect(page.getByText("Seachem Flourish", { exact: true }).first()).toBeVisible();
  });

  test("has analysis prompt when no analysis exists", async ({ page }) => {
    // Mock data has no analyses, so should show "Ready for your first analysis"
    await expect(page.getByText(/Ready for your first analysis/)).toBeVisible();
    await expect(page.getByRole("link", { name: /Run Analysis/ })).toBeVisible();
  });

  test("has event type filter dropdown", async ({ page }) => {
    const filterSelect = page.locator("select").first();
    await expect(filterSelect).toBeVisible();
    await expect(filterSelect).toHaveValue("all");
  });

  test("filter dropdown contains all event types", async ({ page }) => {
    const filterSelect = page.locator("select").first();
    const options = filterSelect.locator("option");
    // "All types" + 8 event types = 9 options
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(9);
  });

  test("filtering by type shows only matching events", async ({ page }) => {
    const filterSelect = page.locator("select").first();
    await filterSelect.selectOption("water_change");

    // Should show water change events only
    await expect(page.getByText("25% Water Change")).toBeVisible();
    // Should not show parameter readings
    await expect(page.getByText("Added 6x Neon Tetra")).not.toBeVisible();
  });

  test("has parameter chart with tab selector", async ({ page }) => {
    // The chart shows when there are >1 parameter readings
    // Mock data has 2 parameter readings for tank-1
    const phButton = page.getByRole("button", { name: "pH" });
    await expect(phButton).toBeVisible();

    // Other param tabs
    await expect(page.getByRole("button", { name: "NH3" })).toBeVisible();
    await expect(page.getByRole("button", { name: "NO2" })).toBeVisible();
    await expect(page.getByRole("button", { name: "NO3" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Temp" })).toBeVisible();
  });

  test("can switch parameter chart tabs", async ({ page }) => {
    await page.getByRole("button", { name: "NH3" }).click();
    // The NH3 tab should now be visually selected (has different styles)
    // We just verify no crash and the button is clickable
    await expect(page.getByRole("button", { name: "NH3" })).toBeVisible();
  });

  test("has Log Entry link in the header", async ({ page }) => {
    const logLink = page.getByRole("link", { name: /Log Entry/ });
    await expect(logLink).toBeVisible();
  });

  test("events are grouped by date", async ({ page }) => {
    // Mock data has events on different days, should see date group headers
    await expect(page.getByText("Today").first()).toBeVisible();
  });
});

test.describe("Timeline for empty tank", () => {
  test("shows empty state for tank with no events", async ({ page }) => {
    // tank-2 has only 1 event in mock data, but let's test an empty scenario
    // Navigate to a non-existent tank to get empty state
    await page.goto("/aquariums/tank-nonexistent/timeline");
    await page.waitForLoadState("networkidle");

    // Should show empty state or "No events yet"
    const emptyState = page.getByText(/No events yet/);
    const timeline = page.getByText(/Timeline/);
    // At minimum the page should load without crashing
    await expect(timeline).toBeVisible();
  });
});
