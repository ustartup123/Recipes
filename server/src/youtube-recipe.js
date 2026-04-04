/**
 * 3-Tier YouTube Recipe Extraction System
 *
 * Tries each tier in order of increasing cost, falling back if a tier fails
 * or doesn't yield recipe content.
 *
 * ─── Token Cost Estimates (Gemini 2.5 Flash pricing, as of 2025) ──────────
 * Pricing: $0.075 / 1M input tokens (≤200K context), $0.30 / 1M output tokens
 *
 * Tier 1 — YouTube Description
 *   Input:  ~500–1,000 tokens (description text + prompt overhead)
 *   Output: ~500 tokens (structured JSON)
 *   Est.    ~$0.00005–$0.00010 per request  ← minimal cost
 *
 * Tier 2 — Captions / Subtitles
 *   Input:  ~2,000–5,000 tokens (transcript + prompt overhead)
 *   Output: ~500 tokens (structured JSON)
 *   Est.    ~$0.00019–$0.00041 per request  ← low cost
 *
 * Tier 3 — Gemini Multimodal Video Analysis (gemini-2.0-flash)
 *   Video tokens: ~263 tokens/second of video content
 *     5-min  video ≈  79,000 video tokens  → ~$0.006
 *     10-min video ≈ 158,000 video tokens  → ~$0.012
 *     30-min video ≈ 474,000 video tokens  → ~$0.036
 *   Output: ~500 tokens (structured JSON)
 *   Note: Use only as last resort when Tiers 1 & 2 fail.
 * ──────────────────────────────────────────────────────────────────────────
 */

'use strict';

const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Fetch the YouTube watch page with browser-like headers
async function fetchYouTubePage(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') throw new Error('Request timed out');
    throw error;
  }
}

// Extract the full video description from YouTube page HTML.
// YouTube embeds the full description as "shortDescription" in the page's JSON data.
function extractDescription(html) {
  // Primary: shortDescription in ytInitialPlayerResponse (contains the full description)
  const match = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
  if (match) {
    const desc = match[1]
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .trim();
    if (desc.length > 20) return desc;
  }

  // Fallback: og:description meta tag (truncated by YouTube to ~200 chars)
  const $ = cheerio.load(html);
  return (
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    ''
  );
}

// Heuristic: does this text look like it contains recipe information?
function looksLikeRecipe(text) {
  if (!text || text.length < 100) return false;

  const lower = text.toLowerCase();

  // Measurement patterns (English & Hebrew units)
  const measurementPattern =
    /\b\d[\d/. ]*\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|grams?|kg|ml|liters?|litres?|oz|pounds?|lb|כוס|כוסות|כף|כפות|כפית|כפיות|גרם|ק"ג|מ"ל|ליטר)\b/i;

  // Recipe keyword indicators (English & Hebrew)
  const recipeKeywords = [
    'ingredients',
    'directions',
    'instructions',
    'recipe',
    'preheat',
    'tablespoon',
    'teaspoon',
    'bake',
    'simmer',
    'מצרכים',
    'הוראות',
    'מתכון',
    'הכנה',
    'לאפות',
    'לבשל',
    'לחמם',
    'לערבב',
    'להוסיף',
  ];

  const indicatorCount = recipeKeywords.filter((k) => lower.includes(k)).length;
  const hasMeasurements = measurementPattern.test(text);

  // Require at least 2 keyword indicators OR measurements + 1 indicator
  return indicatorCount >= 2 || (hasMeasurements && indicatorCount >= 1);
}

// Shared prompt fragment for the JSON output format
const RECIPE_JSON_STRUCTURE = `Return ONLY valid JSON with this exact structure:
{
  "title": "recipe title in Hebrew",
  "ingredients": [{"name": "ingredient name in Hebrew", "amount": "amount with unit"}],
  "instructions": ["step 1 with ingredient amounts included in the text", "step 2..."],
  "tags": ["tag1", "tag2"]
}

Critical rules:
- Translate EVERYTHING to Hebrew (title, ingredients, instructions, tags)
- Each instruction step MUST include the specific amounts of ingredients used in that step
- Tags should be relevant Hebrew food categories (e.g., "עוגות", "בשרי", "טבעוני", "קינוחים", "ארוחת ערב", "מרקים")
- Keep original measurement units, just translate the unit names to Hebrew`;

// ─── Tier 1: Extract recipe from video description ─────────────────────────
async function tier1Description(videoId, videoTitle, html, callGemini, userId) {
  const description = extractDescription(html);

  if (!looksLikeRecipe(description)) {
    console.log(
      `[YouTube Tier 1] Description does not appear to contain a recipe (length: ${description.length})`
    );
    return null;
  }

  console.log(
    `[YouTube Tier 1] Description looks like a recipe (${description.length} chars), sending to Gemini...`
  );

  const prompt = `You are an expert recipe extractor. The text below is the description from a YouTube cooking video titled "${videoTitle}".

The description contains a recipe. Extract and structure it.

${RECIPE_JSON_STRUCTURE}

=== VIDEO DESCRIPTION ===
${description.substring(0, 5000)}`;

  const text = await callGemini(userId, prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  const recipe = JSON.parse(jsonMatch[0]);
  // Validate: must have at least some ingredients and instructions
  if (!recipe.ingredients?.length || !recipe.instructions?.length) return null;

  return recipe;
}

// ─── Tier 2: Extract recipe from captions/transcript ──────────────────────
async function tier2Captions(videoId, videoTitle, callGemini, userId) {
  let transcript = '';

  try {
    const { YoutubeTranscript } = require('youtube-transcript');
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    transcript = items.map((item) => item.text).join(' ');
    console.log(
      `[YouTube Tier 2] Fetched transcript (${transcript.length} chars)`
    );
  } catch (err) {
    console.log(`[YouTube Tier 2] Captions unavailable: ${err.message}`);
    return null;
  }

  if (!transcript || transcript.length < 100) return null;

  const prompt = `You are an expert recipe extractor. Below is the auto-generated captions/transcript from a YouTube cooking video titled "${videoTitle}".

Extract the recipe. The transcript is raw auto-generated text — it may lack punctuation and have run-on sentences. Do your best to identify ingredients and steps.

${RECIPE_JSON_STRUCTURE}
- Ignore sponsor mentions, intros, outros, or off-topic conversation
- If amounts are stated verbally ("a cup of flour"), convert to standard measurements

=== VIDEO TRANSCRIPT ===
${transcript.substring(0, 15000)}`;

  const text = await callGemini(userId, prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  const recipe = JSON.parse(jsonMatch[0]);
  if (!recipe.ingredients?.length || !recipe.instructions?.length) return null;

  return recipe;
}

// ─── Tier 3: Gemini multimodal video analysis ──────────────────────────────
// Passes the YouTube URL directly to gemini-2.0-flash which supports video URL input.
async function tier3VideoAnalysis(videoId, videoTitle, userId) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const genAI = new GoogleGenerativeAI(apiKey);
  // gemini-2.0-flash supports YouTube URL input for multimodal video analysis
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(
    `[YouTube Tier 3] Sending video to Gemini multimodal: ${youtubeUrl}`
  );

  const promptText = `[app:recipes-app][user:${userId}]

Watch this YouTube cooking video titled "${videoTitle}" and extract the complete recipe.

${RECIPE_JSON_STRUCTURE}
- Extract ALL ingredients shown or mentioned, with their quantities
- Include all cooking steps, temperatures, and times visible or audible in the video
- Ignore intro, outro, sponsor mentions, and non-recipe conversation`;

  const result = await model.generateContent([
    {
      fileData: {
        mimeType: 'video/mp4',
        fileUri: youtubeUrl,
      },
    },
    { text: promptText },
  ]);

  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini video analysis returned no JSON');

  const recipe = JSON.parse(jsonMatch[0]);
  if (!recipe.ingredients?.length || !recipe.instructions?.length) {
    throw new Error('Gemini video analysis did not extract a valid recipe');
  }

  return recipe;
}

// ─── Main: Try all 3 tiers in order ───────────────────────────────────────
async function extractRecipeFromYouTube(videoId, videoTitle, callGemini, userId) {
  // Fetch the YouTube page once — used by Tier 1 and potentially Tier 2 fallback
  let html = null;
  try {
    html = await fetchYouTubePage(videoId);
  } catch (err) {
    console.log(`[YouTube] Failed to fetch page: ${err.message}`);
  }

  // ── Tier 1: Description ──
  if (html) {
    try {
      const recipe = await tier1Description(
        videoId,
        videoTitle,
        html,
        callGemini,
        userId
      );
      if (recipe) {
        console.log('[YouTube] Success via Tier 1 (description)');
        return { recipe, tier: 1 };
      }
    } catch (err) {
      console.error('[YouTube Tier 1] Error:', err.message);
    }
  }

  // ── Tier 2: Captions ──
  try {
    const recipe = await tier2Captions(videoId, videoTitle, callGemini, userId);
    if (recipe) {
      console.log('[YouTube] Success via Tier 2 (captions)');
      return { recipe, tier: 2 };
    }
  } catch (err) {
    console.error('[YouTube Tier 2] Error:', err.message);
  }

  // ── Tier 3: Gemini multimodal video analysis ──
  console.log(
    '[YouTube] Tiers 1 & 2 failed — falling back to Tier 3 (Gemini video analysis)'
  );
  const recipe = await tier3VideoAnalysis(videoId, videoTitle, userId);
  console.log('[YouTube] Success via Tier 3 (Gemini video analysis)');
  return { recipe, tier: 3 };
}

function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

module.exports = { extractRecipeFromYouTube, extractYouTubeId };
