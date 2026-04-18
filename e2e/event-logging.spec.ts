import { test, expect } from "@playwright/test";

test.describe("Event logging page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/aquariums/tank-1/log");
    await page.waitForLoadState("networkidle");
  });

  test("displays log entry header", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Log Entry/ })).toBeVisible();
  });

  test("shows event type pills", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Water Test/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Water Change/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Fish Added/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Fish Died/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Dosing/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Equipment/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Observation/ })).toBeVisible();
  });

  test("defaults to parameter_reading type", async ({ page }) => {
    // Parameter reading fields should be visible by default
    await expect(page.locator("#param-ph")).toBeVisible();
    await expect(page.locator("#param-ammonia")).toBeVisible();
    await expect(page.locator("#param-nitrite")).toBeVisible();
    await expect(page.locator("#param-nitrate")).toBeVisible();
    await expect(page.locator("#param-temperature")).toBeVisible();
  });

  test("shows all 7 parameter fields for water test", async ({ page }) => {
    await expect(page.locator("#param-ph")).toBeVisible();
    await expect(page.locator("#param-ammonia")).toBeVisible();
    await expect(page.locator("#param-nitrite")).toBeVisible();
    await expect(page.locator("#param-nitrate")).toBeVisible();
    await expect(page.locator("#param-temperature")).toBeVisible();
    await expect(page.locator("#param-gh")).toBeVisible();
    await expect(page.locator("#param-kh")).toBeVisible();
  });

  test("switching to Water Change shows percentage field", async ({ page }) => {
    await page.getByRole("button", { name: /Water Change/ }).click();
    await expect(page.locator("#wc-percent")).toBeVisible();
    await expect(page.locator("#wc-conditioner")).toBeVisible();
    // Parameter fields should not be visible
    await expect(page.locator("#param-ph")).not.toBeVisible();
  });

  test("switching to Fish Added shows species and count fields", async ({ page }) => {
    await page.getByRole("button", { name: /Fish Added/ }).click();
    await expect(page.locator("#fish-species")).toBeVisible();
    await expect(page.locator("#fish-count")).toBeVisible();
    await expect(page.locator("#fish-source")).toBeVisible();
  });

  test("switching to Fish Died shows species and count but not source", async ({ page }) => {
    await page.getByRole("button", { name: /Fish Died/ }).click();
    await expect(page.locator("#fish-species")).toBeVisible();
    await expect(page.locator("#fish-count")).toBeVisible();
    await expect(page.locator("#fish-source")).not.toBeVisible();
  });

  test("switching to Dosing shows product and amount fields", async ({ page }) => {
    await page.getByRole("button", { name: /Dosing/ }).click();
    await expect(page.locator("#dose-product")).toBeVisible();
    await expect(page.locator("#dose-amount")).toBeVisible();
  });

  test("switching to Equipment shows title field", async ({ page }) => {
    await page.getByRole("button", { name: /Equipment/ }).click();
    await expect(page.locator("#equip-title")).toBeVisible();
  });

  test("switching to Observation shows hint to use notes", async ({ page }) => {
    await page.getByRole("button", { name: /Observation/ }).click();
    await expect(page.getByText(/Add details in the notes/)).toBeVisible();
  });

  test("notes field is always visible", async ({ page }) => {
    await expect(page.locator("#event-notes")).toBeVisible();

    // Switch type — notes should still be there
    await page.getByRole("button", { name: /Water Change/ }).click();
    await expect(page.locator("#event-notes")).toBeVisible();
  });

  test("Save Event button is visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Save Event/ })).toBeVisible();
  });

  test("can fill parameter reading fields and submit", async ({ page }) => {
    await page.locator("#param-ph").fill("7.0");
    await page.locator("#param-ammonia").fill("0");
    await page.locator("#param-nitrite").fill("0");
    await page.locator("#param-nitrate").fill("10");

    await page.getByRole("button", { name: /Save Event/ }).click();

    // Form should clear after successful save
    await expect(page.locator("#param-ph")).toHaveValue("");
  });

  test("submitting empty parameter reading shows error toast", async ({ page }) => {
    // Don't fill any fields, just click save
    await page.getByRole("button", { name: /Save Event/ }).click();

    // Should show error — "Enter at least one parameter value"
    await expect(page.getByText(/at least one parameter/)).toBeVisible({ timeout: 5000 });
  });

  test("can fill water change and submit", async ({ page }) => {
    await page.getByRole("button", { name: /Water Change/ }).click();
    await page.locator("#wc-percent").fill("25");
    await page.locator("#wc-conditioner").fill("Seachem Prime");

    await page.getByRole("button", { name: /Save Event/ }).click();
    // Form should clear
    await expect(page.locator("#wc-percent")).toHaveValue("");
  });

  test("water change requires percentage", async ({ page }) => {
    await page.getByRole("button", { name: /Water Change/ }).click();
    await page.getByRole("button", { name: /Save Event/ }).click();

    await expect(page.getByText("Required")).toBeVisible();
  });

  test("fish added requires species", async ({ page }) => {
    await page.getByRole("button", { name: /Fish Added/ }).click();
    await page.getByRole("button", { name: /Save Event/ }).click();

    await expect(page.getByText("Required")).toBeVisible();
  });

  test("can fill fish added and submit", async ({ page }) => {
    await page.getByRole("button", { name: /Fish Added/ }).click();
    await page.locator("#fish-species").fill("Neon Tetra");
    await page.locator("#fish-count").fill("6");
    await page.locator("#fish-source").fill("Local Fish Store");

    await page.getByRole("button", { name: /Save Event/ }).click();
    await expect(page.locator("#fish-species")).toHaveValue("");
  });

  test("back button links to timeline", async ({ page }) => {
    const backLink = page.locator("a[href*='/aquariums/tank-1/timeline']").first();
    await expect(backLink).toBeVisible();
  });

  test("can submit observation with no notes (no undefined values)", async ({ page }) => {
    await page.getByRole("button", { name: /Observation/ }).click();

    // Submit with empty notes — this previously failed in production because
    // details: undefined and metadata: undefined were passed to Firestore addDoc,
    // which rejects undefined field values.
    await page.getByRole("button", { name: /Save Event/ }).click();

    // Should succeed — toast "Event logged!" and no error toast
    await expect(page.getByText("Event logged!")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Failed to save/)).not.toBeVisible();
  });

  test("can submit equipment event with no notes", async ({ page }) => {
    await page.getByRole("button", { name: /Equipment/ }).click();
    await page.locator("#equip-title").fill("New filter installed");

    await page.getByRole("button", { name: /Save Event/ }).click();

    await expect(page.getByText("Event logged!")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Failed to save/)).not.toBeVisible();
  });

  test("can submit parameter reading with notes", async ({ page }) => {
    await page.locator("#param-ph").fill("7.2");
    await page.locator("#event-notes").fill("Tank looks clear today");

    await page.getByRole("button", { name: /Save Event/ }).click();

    await expect(page.getByText("Event logged!")).toBeVisible({ timeout: 5000 });
  });

  test("preselects event type from URL query param", async ({ page }) => {
    await page.goto("/aquariums/tank-1/log?type=water_change");
    await page.waitForLoadState("networkidle");

    // Water Change fields should be visible
    await expect(page.locator("#wc-percent")).toBeVisible();
    await expect(page.locator("#param-ph")).not.toBeVisible();
  });
});
