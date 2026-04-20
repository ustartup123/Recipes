import { test, expect } from "@playwright/test";

test.describe("Recipe search", () => {
  test("search input appears once a recipe exists, filters by name, shows no-results", async ({ page }) => {
    // Seed two recipes. Each `page.goto` is a full reload that wipes the
    // in-memory mock store, so we chain everything from a single initial
    // `goto` using client-side Link navigation (which preserves mockStore).
    await page.goto("/recipes/new");
    const names = ["פסטה ברוטב", "עוף בתנור"];
    for (let i = 0; i < names.length; i++) {
      await page.getByPlaceholder("למשל: עוגת שוקולד").fill(names[i]);
      await page.getByRole("button", { name: "שמור מתכון" }).click();
      await page.waitForURL(/\/recipes\/mock-\d+$/);
      await page.getByRole("link", { name: /חזרה לרשימה/ }).click();
      await page.waitForURL(/\/recipes$/);
      if (i < names.length - 1) {
        // Next.js Link — client-side navigation keeps mockStore alive.
        await page.getByRole("link", { name: /^מתכון חדש$/ }).first().click();
        await page.waitForURL(/\/recipes\/new$/);
      }
    }

    const search = page.getByPlaceholder("חיפוש לפי שם או תגית...");
    await expect(search).toBeVisible();

    // Filter to פסטה only.
    await search.fill("פסטה");
    await expect(page.getByRole("heading", { name: "פסטה ברוטב" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "עוף בתנור" })).toHaveCount(0);

    // Search with no match → empty message.
    await search.fill("דבר שלא קיים");
    await expect(page.getByText("לא נמצאו מתכונים")).toBeVisible();

    // Clearing brings both back.
    await search.fill("");
    await expect(page.getByRole("heading", { name: "פסטה ברוטב" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "עוף בתנור" })).toBeVisible();
  });

  test("empty library hides the search input entirely", async ({ page }) => {
    await page.goto("/recipes");
    await expect(page.getByPlaceholder("חיפוש לפי שם או תגית...")).toHaveCount(0);
    await expect(page.getByText("עדיין אין מתכונים")).toBeVisible();
  });
});

test.describe("Settings page", () => {
  test("renders account info, version, and sign-out button", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
    await expect(page.getByText("E2E Test User")).toBeVisible();
    await expect(page.getByText("test@example.dev")).toBeVisible();
    await expect(page.getByRole("heading", { name: "About" })).toBeVisible();
    await expect(page.getByText(/^Version /)).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign Out" })).toBeVisible();
  });
});

test.describe("New recipe — tab switching", () => {
  test("URL tab shows link input; button disabled until URL is typed", async ({ page }) => {
    await page.goto("/recipes/new");
    await page.getByRole("button", { name: "מקישור" }).click();

    const linkInput = page.getByPlaceholder("https://example.com/recipe");
    await expect(linkInput).toBeVisible();

    const parseBtn = page.getByRole("button", { name: "זהה מתכון" });
    await expect(parseBtn).toBeDisabled();
    await linkInput.fill("https://example.com/recipe");
    await expect(parseBtn).toBeEnabled();
  });

  test("Text tab shows textarea; button disabled until text is typed", async ({ page }) => {
    await page.goto("/recipes/new");
    await page.getByRole("button", { name: "מטקסט" }).click();

    const textArea = page.getByPlaceholder(/הדבק כאן את המתכון/);
    await expect(textArea).toBeVisible();

    const parseBtn = page.getByRole("button", { name: "זהה מתכון" });
    await expect(parseBtn).toBeDisabled();
    await textArea.fill("כותרת\nמרכיבים\n- קמח\nהוראות\n1. ערבב");
    await expect(parseBtn).toBeEnabled();
  });

  test("switching tabs preserves the chosen tab's form state in isolation", async ({ page }) => {
    await page.goto("/recipes/new");
    // Default is manual — fill a title, then switch to URL and back.
    await page.getByPlaceholder("למשל: עוגת שוקולד").fill("דגום");
    await page.getByRole("button", { name: "מקישור" }).click();
    await expect(page.getByPlaceholder("https://example.com/recipe")).toBeVisible();
    await page.getByRole("button", { name: "ידני" }).click();
    // The manual form is a new instance (mode switch resets `initial`) — title clears.
    await expect(page.getByPlaceholder("למשל: עוגת שוקולד")).toHaveValue("");
  });
});
