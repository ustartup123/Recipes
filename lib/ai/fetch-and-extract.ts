/**
 * Fetch a URL and extract recipe content using a multi-strategy pipeline:
 * JSON-LD → WPRM blocks → microdata → cleaned body text.
 */

import * as cheerio from "cheerio";
import type { Logger } from "pino";
import { elapsedMs, serializeError, startTimer } from "@/lib/logger";

/** Minimal logger shape so callers can pass a pino child or a noop. */
type LogLike = Pick<Logger, "info" | "warn" | "error" | "debug">;
const NOOP_LOG: LogLike = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "invalid";
  }
}

function isYouTubeHost(host: string): boolean {
  return /(^|\.)(youtube\.com|youtu\.be)$/i.test(host);
}

/**
 * YouTube watch pages are JS-rendered, so the visible body text is empty
 * after script removal. The recipe text (description) is embedded in
 * `var ytInitialPlayerResponse = {...};` — pull it out before cheerio
 * strips the script tags.
 */
function extractYouTubeDescription(
  html: string,
): { source: string; text: string } | null {
  // Strategy A: ytInitialPlayerResponse — full description (3-5KB typical).
  const playerMatch = html.match(
    /ytInitialPlayerResponse\s*=\s*({[\s\S]+?})\s*;\s*(?:var |<\/script>|window\.)/,
  );
  if (playerMatch) {
    try {
      const data = JSON.parse(playerMatch[1]) as {
        videoDetails?: { shortDescription?: string };
      };
      const desc = data?.videoDetails?.shortDescription;
      if (typeof desc === "string" && desc.trim().length > 0) {
        return { source: "ytInitialPlayerResponse", text: desc };
      }
    } catch {
      /* fall through */
    }
  }

  // Strategy B: a looser scan for "shortDescription":"..." anywhere in inline JS.
  // Robust to layout changes that move the field outside ytInitialPlayerResponse.
  const looseMatch = html.match(/"shortDescription"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (looseMatch) {
    try {
      const decoded = JSON.parse(`"${looseMatch[1]}"`) as string;
      if (decoded.trim().length > 0) {
        return { source: "shortDescription-regex", text: decoded };
      }
    } catch {
      /* fall through */
    }
  }

  return null;
}

export async function fetchUrl(
  rawUrl: string,
  log: LogLike = NOOP_LOG,
): Promise<string> {
  let url: string;
  try {
    url = new URL(rawUrl).href;
  } catch {
    log.warn({ rawUrl }, "fetchUrl: invalid URL");
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

  const host = hostOf(url);
  const start = startTimer();
  log.info({ host }, "fetchUrl: start");

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!response.ok) {
      log.warn(
        {
          host,
          status: response.status,
          statusText: response.statusText,
          durationMs: elapsedMs(start),
        },
        "fetchUrl: non-OK response",
      );
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const body = await response.text();
    log.info(
      {
        host,
        status: response.status,
        bytes: body.length,
        durationMs: elapsedMs(start),
      },
      "fetchUrl: done",
    );
    return body;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      log.warn(
        { host, durationMs: elapsedMs(start) },
        "fetchUrl: timeout after 15s",
      );
      throw new Error("Request timed out after 15 seconds");
    }
    log.warn(
      {
        host,
        durationMs: elapsedMs(start),
        err: serializeError(error),
      },
      "fetchUrl: failed",
    );
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
  log: LogLike = NOOP_LOG,
): ExtractedContent {
  const start = startTimer();
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
  const strategiesUsed: string[] = [];

  if (recipeSchema) {
    strategiesUsed.push("json-ld");
    contentParts.push(
      "=== STRUCTURED RECIPE DATA (JSON-LD) ===\n" +
        JSON.stringify(recipeSchema, null, 2),
    );
  }

  // === YouTube video description ===
  // Recipe channels put the full recipe in the video description. Pull it
  // from inline JS before the script-stripping cleanup below. Falls back
  // to og:description so we always pass the 50-char content gate even if
  // YouTube changes its inline layout.
  if (isYouTubeHost(hostOf(url))) {
    const yt = extractYouTubeDescription(html);
    if (yt) {
      strategiesUsed.push(`youtube-description:${yt.source}`);
      contentParts.push(
        "=== YOUTUBE VIDEO DESCRIPTION ===\n" + yt.text.substring(0, 15000),
      );
    } else {
      const ogDesc =
        $('meta[property="og:description"]').attr("content")?.trim() ||
        $('meta[name="description"]').attr("content")?.trim() ||
        "";
      if (ogDesc.length > 0) {
        strategiesUsed.push("youtube-description:og-fallback");
        contentParts.push(
          "=== YOUTUBE VIDEO DESCRIPTION (truncated) ===\n" + ogDesc,
        );
      } else {
        strategiesUsed.push("youtube-description:none");
      }
    }
  }

  // === Strategy 2: WordPress Recipe Maker ===
  const wprm = $(".wprm-recipe-container, .wprm-recipe");
  if (wprm.length) {
    const text = wprm.text().replace(/\s+/g, " ").trim();
    if (text.length > 100) {
      strategiesUsed.push("wprm");
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
    strategiesUsed.push("microdata");
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
  let matchedSelector = "";
  for (const selector of contentSelectors) {
    const text = $clean(selector).first().text().replace(/\s+/g, " ").trim();
    if (text.length > 200) {
      mainContent = text;
      matchedSelector = selector;
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
    strategiesUsed.push(`list-items(${listItems.length})`);
    contentParts.push(
      "=== LIST ITEMS FROM PAGE ===\n" + listItems.slice(0, 60).join("\n"),
    );
  }

  if (mainContent) {
    strategiesUsed.push(`body:${matchedSelector}`);
    contentParts.push(
      "=== PAGE TEXT CONTENT ===\n" + mainContent.substring(0, 15000),
    );
  }

  const pageTitle =
    $("title").text().trim() || $("h1").first().text().trim() || "";
  const metaDescription =
    $('meta[name="description"]').attr("content") || "";

  const result = {
    content: contentParts.join("\n\n").substring(0, 25000),
    pageTitle,
    metaDescription,
    imageUrl,
    hasStructuredData: !!recipeSchema,
  };

  log.info(
    {
      host: hostOf(url),
      strategiesUsed,
      hasStructuredData: result.hasStructuredData,
      hasImage: !!imageUrl,
      titleLength: pageTitle.length,
      contentLength: result.content.length,
      durationMs: elapsedMs(start),
    },
    "extractRecipeContent: done",
  );

  return result;
}
