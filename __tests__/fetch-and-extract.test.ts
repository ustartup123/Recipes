import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  extractRecipeContent,
  fetchUrl,
  extractYouTubeVideoId,
  fetchYouTubeInnertube,
  enrichYouTubeContent,
} from "@/lib/ai/fetch-and-extract";

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

  it("extracts the description from a YouTube watch page", () => {
    // Minimal mock of YouTube's HTML: shell + ytInitialPlayerResponse blob.
    // Real pages embed videoDetails inside a much larger object, but the
    // extractor only needs videoDetails.shortDescription.
    const desc =
      "מתכון לקרם ברולה. מצרכים: 6 חלמונים, 2 כוסות שמנת, חצי כוס סוכר. " +
      "אופן הכנה: לחמם תנור ל-150 מעלות, לערבב, לאפות 35 דקות.";
    const playerResponse = {
      videoDetails: {
        title: "קרם ברולה",
        shortDescription: desc,
      },
    };
    const html = `<!doctype html><html><head>
      <title>קרם ברולה - YouTube</title>
      <meta name="description" content="short og blurb">
      <meta property="og:image" content="https://i.ytimg.com/vi/abc/maxresdefault.jpg">
    </head><body>
      <script>var ytInitialPlayerResponse = ${JSON.stringify(playerResponse)};var x = 1;</script>
    </body></html>`;
    const out = extractRecipeContent(html, "https://youtu.be/abc");
    expect(out.content).toContain("YOUTUBE VIDEO DESCRIPTION");
    expect(out.content).toContain("6 חלמונים");
    expect(out.content).toContain("לאפות 35 דקות");
    expect(out.content.length).toBeGreaterThan(50);
    expect(out.imageUrl).toBe("https://i.ytimg.com/vi/abc/maxresdefault.jpg");
  });

  it("handles youtube.com/watch URLs the same as youtu.be", () => {
    const playerResponse = {
      videoDetails: { shortDescription: "x".repeat(300) },
    };
    const html = `<html><head></head><body>
      <script>var ytInitialPlayerResponse = ${JSON.stringify(playerResponse)};</script>
    </body></html>`;
    const out = extractRecipeContent(
      html,
      "https://www.youtube.com/watch?v=abc",
    );
    expect(out.content).toContain("YOUTUBE VIDEO DESCRIPTION");
    expect(out.content.length).toBeGreaterThan(200);
  });

  it("does not pull ytInitialPlayerResponse for non-YouTube URLs", () => {
    // Same script blob, but on a non-YouTube host — should be ignored.
    const playerResponse = {
      videoDetails: { shortDescription: "leaked content" },
    };
    const html = `<html><body>
      <script>var ytInitialPlayerResponse = ${JSON.stringify(playerResponse)};</script>
    </body></html>`;
    const out = extractRecipeContent(html, "https://example.com/recipe");
    expect(out.content).not.toContain("YOUTUBE VIDEO DESCRIPTION");
    expect(out.content).not.toContain("leaked content");
  });

  it("falls back to og:description when YouTube has no parseable player response", () => {
    // No ytInitialPlayerResponse, but og:description is present (the
    // truncated version YouTube always emits in meta tags).
    const html = `<html><head>
      <title>broken</title>
      <meta property="og:description" content="פרטים על המתכון, מצרכים והוראות הכנה">
    </head><body></body></html>`;
    const out = extractRecipeContent(html, "https://youtu.be/abc");
    expect(out.content).toContain("YOUTUBE VIDEO DESCRIPTION");
    expect(out.content).toContain("מצרכים");
    expect(out.content.length).toBeGreaterThan(50);
  });

  it("uses the loose shortDescription regex when ytInitialPlayerResponse blob is malformed", () => {
    // shortDescription appears in some other inline JS object, not inside
    // ytInitialPlayerResponse — e.g. trimmed-down mobile HTML.
    const html = `<html><head></head><body>
      <script>window.something = {"videoId":"x","shortDescription":"מתכון לקרם ברולה עם 6 חלמונים ושמנת. אופן הכנה: לערבב ולאפות.","other":1};</script>
    </body></html>`;
    const out = extractRecipeContent(html, "https://youtu.be/abc");
    expect(out.content).toContain("YOUTUBE VIDEO DESCRIPTION");
    expect(out.content).toContain("6 חלמונים");
  });
});

describe("fetchUrl", () => {
  it("rejects invalid URLs before making a request", async () => {
    await expect(fetchUrl("not a url")).rejects.toThrow(/Invalid URL/);
  });

  it("attaches CONSENT/SOCS cookies when fetching a YouTube host", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("<html><body>ok</body></html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
    );
    await fetchUrl("https://youtu.be/r9vcFj0I0LE");
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    const cookie = (init.headers as Record<string, string>)["Cookie"];
    expect(cookie).toContain("CONSENT=YES");
    expect(cookie).toContain("SOCS=");
    fetchSpy.mockRestore();
  });

  it("does NOT attach the YouTube consent cookie for other hosts", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("<html></html>", { status: 200 }),
    );
    await fetchUrl("https://example.com/recipe");
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["Cookie"]).toBeUndefined();
    fetchSpy.mockRestore();
  });
});

describe("extractYouTubeVideoId", () => {
  it("parses youtu.be short links", () => {
    expect(extractYouTubeVideoId("https://youtu.be/r9vcFj0I0LE")).toBe(
      "r9vcFj0I0LE",
    );
    expect(
      extractYouTubeVideoId("https://youtu.be/r9vcFj0I0LE?si=foobar"),
    ).toBe("r9vcFj0I0LE");
  });
  it("parses watch URLs", () => {
    expect(
      extractYouTubeVideoId("https://www.youtube.com/watch?v=r9vcFj0I0LE&t=10"),
    ).toBe("r9vcFj0I0LE");
  });
  it("parses embed and shorts URLs", () => {
    expect(
      extractYouTubeVideoId("https://www.youtube.com/embed/r9vcFj0I0LE"),
    ).toBe("r9vcFj0I0LE");
    expect(
      extractYouTubeVideoId("https://www.youtube.com/shorts/r9vcFj0I0LE"),
    ).toBe("r9vcFj0I0LE");
  });
  it("returns null for non-YouTube or malformed URLs", () => {
    expect(extractYouTubeVideoId("https://example.com/abc")).toBeNull();
    expect(extractYouTubeVideoId("not a url")).toBeNull();
    expect(extractYouTubeVideoId("https://youtu.be/")).toBeNull();
  });
});

describe("fetchYouTubeInnertube", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns parsed videoDetails on a 200 response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          videoDetails: {
            title: "Crème Brûlée",
            shortDescription: "x".repeat(500),
            thumbnail: {
              thumbnails: [
                { url: "https://i.ytimg.com/vi/abc/default.jpg", width: 120 },
                { url: "https://i.ytimg.com/vi/abc/maxres.jpg", width: 1280 },
              ],
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const out = await fetchYouTubeInnertube("abc12345678");
    expect(out).not.toBeNull();
    expect(out!.title).toBe("Crème Brûlée");
    expect(out!.shortDescription.length).toBe(500);
    expect(out!.thumbnailUrl).toBe("https://i.ytimg.com/vi/abc/maxres.jpg");
  });

  it("returns null when InnerTube responds non-OK", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("forbidden", { status: 403 }),
    );
    expect(await fetchYouTubeInnertube("abc")).toBeNull();
  });

  it("returns null when shortDescription is missing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ videoDetails: { title: "x" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(await fetchYouTubeInnertube("abc")).toBeNull();
  });
});

describe("enrichYouTubeContent", () => {
  afterEach(() => vi.restoreAllMocks());

  function makeExtracted(overrides: Partial<{
    content: string;
    pageTitle: string;
    imageUrl: string | null;
  }> = {}) {
    return {
      content: "",
      pageTitle: "",
      metaDescription: "",
      imageUrl: null,
      hasStructuredData: false,
      ...overrides,
    };
  }

  it("is a no-op for non-YouTube URLs", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const input = makeExtracted({ content: "" });
    const out = await enrichYouTubeContent(
      input,
      "https://example.com/recipe",
    );
    expect(out).toBe(input);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("is a no-op when YouTube extraction already returned a substantial description", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const big = "=== YOUTUBE VIDEO DESCRIPTION ===\n" + "x".repeat(2000);
    const out = await enrichYouTubeContent(
      makeExtracted({ content: big }),
      "https://youtu.be/r9vcFj0I0LE",
    );
    expect(out.content).toBe(big);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls InnerTube when extraction yields og-fallback (truncated marker)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          videoDetails: {
            title: "קרם ברולה",
            shortDescription: "מצרכים: 6 חלמונים, שמנת. הכנה: לאפות 35 דקות.".repeat(20),
            thumbnail: {
              thumbnails: [
                {
                  url: "https://i.ytimg.com/vi/abc/maxresdefault.jpg",
                  width: 1280,
                },
              ],
            },
          },
        }),
        { status: 200 },
      ),
    );
    const input = makeExtracted({
      content: "=== YOUTUBE VIDEO DESCRIPTION (truncated) ===\nshort blurb",
      pageTitle: "",
      imageUrl: null,
    });
    const out = await enrichYouTubeContent(
      input,
      "https://youtu.be/r9vcFj0I0LE",
    );
    expect(out.content).toContain("YOUTUBE VIDEO DESCRIPTION (innertube)");
    expect(out.content).toContain("6 חלמונים");
    expect(out.content).not.toContain("(truncated)");
    expect(out.pageTitle).toBe("קרם ברולה");
    expect(out.imageUrl).toBe(
      "https://i.ytimg.com/vi/abc/maxresdefault.jpg",
    );
  });

  it("falls through gracefully if InnerTube is unreachable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("nope", { status: 500 }),
    );
    const input = makeExtracted({
      content: "=== YOUTUBE VIDEO DESCRIPTION (truncated) ===\nshort",
    });
    const out = await enrichYouTubeContent(
      input,
      "https://youtu.be/r9vcFj0I0LE",
    );
    // Original content preserved, no enrichment block
    expect(out.content).toBe(input.content);
  });
});
