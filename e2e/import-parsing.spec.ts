import { test, expect } from "@playwright/test";

// These tests intercept the /api/ai/parse-* endpoints so we never hit real
// Gemini from CI. They verify the full client UX — success toast, the form
// getting pre-filled, and error handling on API failure.
//
// Serial mode: parallel workers racing the same Next dev-server compile can
// leave the React tab state stale on first paint, producing flaky "URL input
// not visible" timeouts. Four tests run cleanly in ~2s serially.
test.describe.configure({ mode: "serial" });

test.describe("URL import flow", () => {
  test("successful parse → form pre-fills with parsed fields → can save", async ({ page }) => {
    await page.route("**/api/ai/parse-url", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "עוגת תפוחים",
          ingredients: [{ name: "תפוחים", amount: "5" }],
          instructions: ["לקלף ולפרוס", "לאפות בתנור 180°C"],
          tags: ["קינוחים"],
          imageUrl: "",
          sourceUrl: "https://example.com/apple-cake",
        }),
      });
    });

    await page.goto("/recipes/new");
    await page.getByRole("button", { name: "מקישור" }).click();
    const linkInput = page.getByPlaceholder("https://example.com/recipe");
    await expect(linkInput).toBeVisible();
    await linkInput.fill("https://example.com/apple-cake");
    await page.getByRole("button", { name: "זהה מתכון" }).click();

    // Form appears with the parsed data pre-filled.
    await expect(page.getByPlaceholder("למשל: עוגת שוקולד")).toHaveValue("עוגת תפוחים");
    await expect(page.getByPlaceholder("שם המרכיב")).toHaveValue("תפוחים");
    await expect(page.getByPlaceholder("כמות")).toHaveValue("5");
  });

  test("API error surfaces as a toast, user stays on the URL tab", async ({ page }) => {
    await page.route("**/api/ai/parse-url", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Could not extract meaningful content from the URL" }),
      });
    });

    await page.goto("/recipes/new");
    await page.getByRole("button", { name: "מקישור" }).click();
    const linkInput = page.getByPlaceholder("https://example.com/recipe");
    await expect(linkInput).toBeVisible();
    await linkInput.fill("https://example.com/bad");
    await page.getByRole("button", { name: "זהה מתכון" }).click();

    await expect(
      page.getByText("Could not extract meaningful content from the URL"),
    ).toBeVisible();
    // Still on the URL tab — the button is re-enabled.
    await expect(page.getByPlaceholder("https://example.com/recipe")).toBeVisible();
  });
});

test.describe("Text import flow", () => {
  test("successful parse → form pre-fills → can submit", async ({ page }) => {
    await page.route("**/api/ai/parse-text", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "סלט ישראלי",
          ingredients: [
            { name: "עגבניה", amount: "2" },
            { name: "מלפפון", amount: "1" },
          ],
          instructions: ["לחתוך", "לערבב"],
          tags: [],
          imageUrl: "",
        }),
      });
    });

    await page.goto("/recipes/new");
    await page.getByRole("button", { name: "מטקסט" }).click();
    const textArea = page.getByPlaceholder(/הדבק כאן את המתכון/);
    await expect(textArea).toBeVisible();
    await textArea.fill("סלט ישראלי\nעגבניה 2\nמלפפון 1");
    await page.getByRole("button", { name: "זהה מתכון" }).click();

    await expect(page.getByPlaceholder("למשל: עוגת שוקולד")).toHaveValue("סלט ישראלי");
    await expect(page.getByPlaceholder("שם המרכיב").first()).toHaveValue("עגבניה");
  });

  test("API error surfaces as a toast", async ({ page }) => {
    await page.route("**/api/ai/parse-text", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    await page.goto("/recipes/new");
    await page.getByRole("button", { name: "מטקסט" }).click();
    const textArea = page.getByPlaceholder(/הדבק כאן את המתכון/);
    await expect(textArea).toBeVisible();
    await textArea.fill("bad");
    await page.getByRole("button", { name: "זהה מתכון" }).click();

    await expect(page.getByText("Internal server error")).toBeVisible();
  });
});
