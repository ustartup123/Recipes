/**
 * Fetch a URL and extract recipe content using a multi-strategy pipeline:
 * JSON-LD → WPRM blocks → microdata → cleaned body text.
 */

import * as cheerio from "cheerio";

export async function fetchUrl(rawUrl: string): Promise<string> {
  let url: string;
  try {
    url = new URL(rawUrl).href;
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "he-IL,he;q=0.9,en;q=0.8",
    "Accept-Encoding": "identity",
  };

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out after 15 seconds");
    }
    throw error;
  }
}

export interface ExtractedContent {
  content: string;
  pageTitle: string;
  metaDescription: string;
  imageUrl: string | null;
  hasStructuredData: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function extractRecipeContent(
  html: string,
  url: string,
): ExtractedContent {
  const $ = cheerio.load(html);

  // === Strategy 1: JSON-LD Recipe schema ===
  let recipeSchema: any = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || "");
      const findRecipe = (obj: any): any => {
        if (!obj) return null;
        if (obj["@type"] === "Recipe") return obj;
        if (Array.isArray(obj["@type"]) && obj["@type"].includes("Recipe")) return obj;
        if (Array.isArray(obj)) {
          for (const item of obj) {
            const found = findRecipe(item);
            if (found) return found;
          }
        }
        if (obj["@graph"]) return findRecipe(obj["@graph"]);
        return null;
      };
      const found = findRecipe(data);
      if (found) recipeSchema = found;
    } catch {}
  });

  // === Image ===
  let imageUrl: string | null = null;
  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage) {
    imageUrl = ogImage.startsWith("http")
      ? ogImage
      : new URL(ogImage, url).href;
  }
  if (recipeSchema?.image) {
    const img = Array.isArray(recipeSchema.image)
      ? recipeSchema.image[0]
      : recipeSchema.image;
    imageUrl = typeof img === "string" ? img : img?.url || imageUrl;
  }

  const contentParts: string[] = [];

  if (recipeSchema) {
    contentParts.push(
      "=== STRUCTURED RECIPE DATA (JSON-LD) ===\n" +
        JSON.stringify(recipeSchema, null, 2),
    );
  }

  // === Strategy 2: WordPress Recipe Maker ===
  const wprm = $(".wprm-recipe-container, .wprm-recipe");
  if (wprm.length) {
    const text = wprm.text().replace(/\s+/g, " ").trim();
    if (text.length > 100) {
      contentParts.push(
        "=== WORDPRESS RECIPE MAKER ===\n" + text.substring(0, 8000),
      );
    }
  }

  // === Strategy 3: Microdata ===
  const microdataText: string[] = [];
  $('[itemtype*="Recipe"] [itemprop]').each((_, el) => {
    const prop = $(el).attr("itemprop");
    const text = $(el).text().trim();
    if (prop && text && text.length < 500) {
      microdataText.push(`${prop}: ${text}`);
    }
  });
  if (microdataText.length > 3) {
    contentParts.push(
      "=== RECIPE MICRODATA ===\n" + microdataText.join("\n"),
    );
  }

  // === Strategy 4: Cleaned HTML ===
  const $clean = cheerio.load(html);
  $clean("script, style, nav, aside, iframe, svg, form").remove();
  $clean("body > footer, body > header").remove();
  $clean(
    '[class*="comment"], [class*="sidebar"], [class*="widget"], [class*="ad-"], [class*="advertisement"], [class*="social"], [class*="share"], [class*="newsletter"], [class*="popup"], [class*="modal"], [class*="cookie"], [class*="related"], [class*="recommended"], [class*="navigation"], [class*="breadcrumb"]',
  ).remove();
  $clean(
    '[class*="site-footer"], [class*="page-footer"], [class*="page-header"], [class*="site-header"], [class*="main-header"], [class*="post-footer"]',
  ).remove();
  $clean(
    '[id*="comment"], [id*="sidebar"], [id*="ad"], [id*="footer"], [id*="header"], [id*="nav"]',
  ).remove();

  const contentSelectors = [
    ".wprm-recipe-container",
    ".wprm-recipe",
    ".recipe-content",
    ".recipe-body",
    ".recipe",
    ".entry-content",
    ".post-content",
    '[class*="recipe-card"]',
    '[class*="recipe-detail"]',
    "article .content",
    "article",
    ".content",
    "main",
    "body",
  ];

  let mainContent = "";
  for (const selector of contentSelectors) {
    const text = $clean(selector).first().text().replace(/\s+/g, " ").trim();
    if (text.length > 200) {
      mainContent = text;
      break;
    }
  }

  const listItems: string[] = [];
  $clean(
    ".entry-content li, .post-content li, article li, .recipe li, main li",
  ).each((_, el) => {
    const text = $clean(el).text().trim();
    if (text.length > 3 && text.length < 500) {
      listItems.push(text);
    }
  });
  if (listItems.length > 0) {
    contentParts.push(
      "=== LIST ITEMS FROM PAGE ===\n" + listItems.slice(0, 60).join("\n"),
    );
  }

  if (mainContent) {
    contentParts.push(
      "=== PAGE TEXT CONTENT ===\n" + mainContent.substring(0, 15000),
    );
  }

  const pageTitle =
    $("title").text().trim() || $("h1").first().text().trim() || "";
  const metaDescription =
    $('meta[name="description"]').attr("content") || "";

  return {
    content: contentParts.join("\n\n").substring(0, 25000),
    pageTitle,
    metaDescription,
    imageUrl,
    hasStructuredData: !!recipeSchema,
  };
}
