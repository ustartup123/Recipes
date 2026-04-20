import { test, expect } from "@playwright/test";

// The E2E mocks use an in-memory store that resets on full page reloads.
// Each test below starts on /recipes/new so it owns its data lifecycle.

test.describe("Manual recipe create flow", () => {
  test("fill form → submit → lands on detail page with the saved data", async ({ page }) => {
    await page.goto("/recipes/new");
    await page.getByPlaceholder("למשל: עוגת שוקולד").fill("עוגת לימון");
    await page.getByPlaceholder("שם המרכיב").fill("לימון");
    await page.getByPlaceholder("כמות").fill("2");
    await page.getByPlaceholder(/שלב 1/).fill("לסחוט ולערבב");
    await page.getByRole("button", { name: "שמור מתכון" }).click();

    await page.waitForURL(/\/recipes\/mock-\d+$/);
    await expect(page.getByRole("heading", { name: "עוגת לימון" })).toBeVisible();
    // Exact match — plain "לימון" also appears inside the title heading.
    await expect(page.getByText("לימון", { exact: true })).toBeVisible();
    await expect(page.getByText("לסחוט ולערבב")).toBeVisible();
  });

  test("extra ingredient rows and instruction steps can be added", async ({ page }) => {
    await page.goto("/recipes/new");
    await expect(page.getByPlaceholder("שם המרכיב")).toHaveCount(1);
    await page.getByRole("button", { name: "הוסף מרכיב" }).click();
    await expect(page.getByPlaceholder("שם המרכיב")).toHaveCount(2);

    await expect(page.getByPlaceholder(/שלב \d/)).toHaveCount(1);
    await page.getByRole("button", { name: "הוסף שלב" }).click();
    await expect(page.getByPlaceholder(/שלב \d/)).toHaveCount(2);
  });

  test("title is required — browser blocks submit without it", async ({ page }) => {
    await page.goto("/recipes/new");
    await page.getByRole("button", { name: "שמור מתכון" }).click();
    // Stays on /new — required validation blocks the form.
    await expect(page).toHaveURL(/\/recipes\/new$/);
  });

  test("tags can be added with Enter and removed by clicking", async ({ page }) => {
    await page.goto("/recipes/new");
    const tagInput = page.getByPlaceholder("הקלד תגית ולחץ Enter");
    await tagInput.fill("קינוחים");
    await tagInput.press("Enter");
    await expect(page.getByText("קינוחים")).toBeVisible();

    // Click the tag (it's the chip itself) to remove it.
    await page.getByText("קינוחים").click();
    await expect(page.getByText("קינוחים")).toHaveCount(0);
  });
});

test.describe("Recipe detail page", () => {
  test("back link navigates to /recipes", async ({ page }) => {
    await page.goto("/recipes/new");
    await page.getByPlaceholder("למשל: עוגת שוקולד").fill("מתכון א");
    await page.getByRole("button", { name: "שמור מתכון" }).click();
    await page.waitForURL(/\/recipes\/mock-\d+$/);

    await page.getByRole("link", { name: /חזרה לרשימה/ }).click();
    await expect(page).toHaveURL(/\/recipes$/);
    await expect(page.getByRole("heading", { name: "המתכונים שלי" })).toBeVisible();
  });

  test("unknown recipe id redirects to /recipes", async ({ page }) => {
    await page.goto("/recipes/does-not-exist");
    await page.waitForURL(/\/recipes$/);
  });

  test("edit link navigates to edit page with form pre-populated", async ({ page }) => {
    await page.goto("/recipes/new");
    await page.getByPlaceholder("למשל: עוגת שוקולד").fill("מתכון ב");
    await page.getByRole("button", { name: "שמור מתכון" }).click();
    await page.waitForURL(/\/recipes\/mock-\d+$/);

    await page.getByRole("link", { name: /ערוך/ }).click();
    await expect(page).toHaveURL(/\/recipes\/mock-\d+\/edit$/);
    await expect(page.getByRole("heading", { name: "עריכת מתכון" })).toBeVisible();
    await expect(page.getByPlaceholder("למשל: עוגת שוקולד")).toHaveValue("מתכון ב");
  });

  test("delete flow — open confirm modal, cancel keeps recipe, confirm removes it", async ({ page }) => {
    await page.goto("/recipes/new");
    await page.getByPlaceholder("למשל: עוגת שוקולד").fill("מחק אותי");
    await page.getByRole("button", { name: "שמור מתכון" }).click();
    await page.waitForURL(/\/recipes\/mock-\d+$/);

    // Open modal, cancel → still on detail page.
    await page.getByRole("button", { name: /^מחק$/ }).first().click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await modal.getByRole("button", { name: "ביטול" }).click();
    await expect(modal).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "מחק אותי" })).toBeVisible();

    // Confirm → lands on /recipes empty state.
    await page.getByRole("button", { name: /^מחק$/ }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "מחק" }).click();
    await page.waitForURL(/\/recipes$/);
    await expect(page.getByText("עדיין אין מתכונים")).toBeVisible();
  });
});

test.describe("Recipe notes", () => {
  test("add a note → appears once, no duplicate keys", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/recipes/new");
    await page.getByPlaceholder("למשל: עוגת שוקולד").fill("עם הערות");
    await page.getByRole("button", { name: "שמור מתכון" }).click();
    await page.waitForURL(/\/recipes\/mock-\d+$/);

    await page.getByPlaceholder("הוסף הערה...").fill("יצא טעים");
    await page
      .locator(".card")
      .filter({ hasText: "הערות" })
      .getByRole("button", { name: "הוסף" })
      .click();

    await expect(page.getByText("יצא טעים")).toHaveCount(1);
    // Regression: key collision warning used to fire on every note add.
    expect(
      consoleErrors.filter((e) => e.includes("two children with the same key")),
    ).toEqual([]);
  });

  test("add two notes, delete the first — only the second remains", async ({ page }) => {
    await page.goto("/recipes/new");
    await page.getByPlaceholder("למשל: עוגת שוקולד").fill("שתי הערות");
    await page.getByRole("button", { name: "שמור מתכון" }).click();
    await page.waitForURL(/\/recipes\/mock-\d+$/);

    const noteInput = page.getByPlaceholder("הוסף הערה...");
    const addBtn = page
      .locator(".card")
      .filter({ hasText: "הערות" })
      .getByRole("button", { name: "הוסף" });

    await noteInput.fill("ראשונה");
    await addBtn.click();
    await noteInput.fill("שנייה");
    await addBtn.click();

    await expect(page.getByText("ראשונה")).toBeVisible();
    await expect(page.getByText("שנייה")).toBeVisible();

    // Delete the first note via its trash button.
    const firstNoteLi = page
      .locator("li")
      .filter({ hasText: "ראשונה" });
    await firstNoteLi.getByRole("button").click();

    await expect(page.getByText("ראשונה")).toHaveCount(0);
    await expect(page.getByText("שנייה")).toBeVisible();
  });

  test("pressing Enter in the note input submits", async ({ page }) => {
    await page.goto("/recipes/new");
    await page.getByPlaceholder("למשל: עוגת שוקולד").fill("הערה בהקשה");
    await page.getByRole("button", { name: "שמור מתכון" }).click();
    await page.waitForURL(/\/recipes\/mock-\d+$/);

    await page.getByPlaceholder("הוסף הערה...").fill("באמצעות Enter");
    await page.getByPlaceholder("הוסף הערה...").press("Enter");
    await expect(page.getByText("באמצעות Enter")).toBeVisible();
  });
});

test.describe("Recipe edit flow", () => {
  test("edit title → save → detail page shows new title", async ({ page }) => {
    await page.goto("/recipes/new");
    await page.getByPlaceholder("למשל: עוגת שוקולד").fill("שם ישן");
    await page.getByRole("button", { name: "שמור מתכון" }).click();
    await page.waitForURL(/\/recipes\/mock-\d+$/);

    await page.getByRole("link", { name: /ערוך/ }).click();
    await page.waitForURL(/\/recipes\/mock-\d+\/edit$/);

    const titleInput = page.getByPlaceholder("למשל: עוגת שוקולד");
    await titleInput.fill("שם חדש");
    await page.getByRole("button", { name: "שמור מתכון" }).click();

    await page.waitForURL(/\/recipes\/mock-\d+$/);
    await expect(page.getByRole("heading", { name: "שם חדש" })).toBeVisible();
  });
});
