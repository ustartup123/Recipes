import { describe, it, expect } from "vitest";
import { extractRecipeContent, fetchUrl } from "@/lib/ai/fetch-and-extract";

const BASE_URL = "https://example.com/recipe";

describe("extractRecipeContent", () => {
  it("pulls title and meta description", () => {
    const html = `<html>
      <head>
        <title>Best Pizza Ever</title>
        <meta name="description" content="the best pizza recipe in town">
      </head>
      <body>
        <article>
          <h1>Pizza</h1>
          <p>${"Long body content about pizza. ".repeat(20)}</p>
        </article>
      </body>
    </html>`;
    const out = extractRecipeContent(html, BASE_URL);
    expect(out.pageTitle).toBe("Best Pizza Ever");
    expect(out.metaDescription).toBe("the best pizza recipe in town");
    expect(out.content.length).toBeGreaterThan(0);
  });

  it("detects JSON-LD Recipe and sets hasStructuredData", () => {
    const html = `<html><head>
      <script type="application/ld+json">
        ${JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Recipe",
          name: "Challah",
          image: "https://cdn.example.com/challah.jpg",
        })}
      </script>
    </head><body><p>body text</p></body></html>`;
    const out = extractRecipeContent(html, BASE_URL);
    expect(out.hasStructuredData).toBe(true);
    expect(out.imageUrl).toBe("https://cdn.example.com/challah.jpg");
    expect(out.content).toContain("STRUCTURED RECIPE DATA");
    expect(out.content).toContain("Challah");
  });

  it("finds Recipe inside @graph", () => {
    const html = `<html><head>
      <script type="application/ld+json">
        ${JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "WebPage", name: "page" },
            { "@type": "Recipe", name: "Shakshuka" },
          ],
        })}
      </script>
    </head><body></body></html>`;
    const out = extractRecipeContent(html, BASE_URL);
    expect(out.hasStructuredData).toBe(true);
    expect(out.content).toContain("Shakshuka");
  });

  it("prefers og:image when no JSON-LD image", () => {
    const html = `<html><head>
      <meta property="og:image" content="https://cdn.example.com/og.jpg">
    </head><body></body></html>`;
    const out = extractRecipeContent(html, BASE_URL);
    expect(out.imageUrl).toBe("https://cdn.example.com/og.jpg");
    expect(out.hasStructuredData).toBe(false);
  });

  it("resolves relative og:image against page url", () => {
    const html = `<html><head>
      <meta property="og:image" content="/images/hero.jpg">
    </head><body></body></html>`;
    const out = extractRecipeContent(html, "https://site.com/recipes/x");
    expect(out.imageUrl).toBe("https://site.com/images/hero.jpg");
  });

  it("strips script, style, nav, and ads from cleaned body", () => {
    const html = `<html><body>
      <nav>hidden nav links</nav>
      <div class="advertisement">BUY NOW</div>
      <article>${"Good recipe body content here. ".repeat(20)}</article>
    </body></html>`;
    const out = extractRecipeContent(html, BASE_URL);
    expect(out.content).not.toContain("hidden nav links");
    expect(out.content).not.toContain("BUY NOW");
    expect(out.content).toContain("Good recipe body content");
  });

  it("collects list items from article/main", () => {
    const html = `<html><body>
      <article>
        <p>${"Long intro text. ".repeat(20)}</p>
        <ul>
          <li>1 cup flour</li>
          <li>2 eggs</li>
          <li>pinch of salt</li>
        </ul>
      </article>
    </body></html>`;
    const out = extractRecipeContent(html, BASE_URL);
    expect(out.content).toContain("1 cup flour");
    expect(out.content).toContain("2 eggs");
  });

  it("caps content length at 25000 chars", () => {
    const huge = "x".repeat(50000);
    const html = `<html><body><article>${huge}</article></body></html>`;
    const out = extractRecipeContent(html, BASE_URL);
    expect(out.content.length).toBeLessThanOrEqual(25000);
  });

  it("returns empty-ish result when html has no recipe signals", () => {
    const out = extractRecipeContent("<html><body></body></html>", BASE_URL);
    expect(out.hasStructuredData).toBe(false);
    expect(out.imageUrl).toBeNull();
  });
});

describe("fetchUrl", () => {
  it("rejects invalid URLs before making a request", async () => {
    await expect(fetchUrl("not a url")).rejects.toThrow(/Invalid URL/);
  });
});
