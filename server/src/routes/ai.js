const express = require('express');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();

function getGeminiModel(userId) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  // Tag all calls with app name and user ID for tracking
  const modelOptions = {
    model: 'gemini-2.5-flash',
    generationConfig: {},
  };
  return {
    model: genAI.getGenerativeModel(modelOptions),
    // Custom headers for tracking - passed via request metadata
    metadata: {
      app: 'recipes-app',
      userId: userId || 'anonymous',
    }
  };
}

async function callGemini(userId, prompt) {
  const { model, metadata } = getGeminiModel(userId);
  // Prefix prompt with tracking metadata as a system-level comment
  const taggedPrompt = `[app:recipes-app][user:${metadata.userId}]\n\n${prompt}`;
  const result = await model.generateContent(taggedPrompt);
  return result.response.text();
}

// Fetch URL with timeout and retry
async function fetchUrl(rawUrl) {
  // Normalize URL so that raw Hebrew characters (copied from browser address bar)
  // are percent-encoded before being passed to fetch(). Already-encoded sequences
  // like %D7%A7 are left untouched by the WHATWG URL parser.
  let url;
  try {
    url = new URL(rawUrl).href;
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
    'Accept-Encoding': 'identity',
  };

  try {
    const response = await fetch(url, { headers, signal: controller.signal, redirect: 'follow' });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out after 15 seconds');
    }
    throw error;
  }
}

// Extract recipe content from HTML with multiple strategies
function extractRecipeContent(html, url) {
  const $ = cheerio.load(html);

  // === Strategy 1: JSON-LD Recipe schema (most reliable) ===
  let recipeSchema = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      const findRecipe = (obj) => {
        if (!obj) return null;
        if (obj['@type'] === 'Recipe') return obj;
        if (Array.isArray(obj['@type']) && obj['@type'].includes('Recipe')) return obj;
        if (Array.isArray(obj)) {
          for (const item of obj) {
            const found = findRecipe(item);
            if (found) return found;
          }
        }
        if (obj['@graph']) return findRecipe(obj['@graph']);
        return null;
      };
      const found = findRecipe(data);
      if (found) recipeSchema = found;
    } catch {}
  });

  // === Find the best image ===
  let imageUrl = null;
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage) {
    imageUrl = ogImage.startsWith('http') ? ogImage : new URL(ogImage, url).href;
  }
  if (recipeSchema?.image) {
    const img = Array.isArray(recipeSchema.image) ? recipeSchema.image[0] : recipeSchema.image;
    imageUrl = typeof img === 'string' ? img : img?.url || imageUrl;
  }

  const contentParts = [];

  if (recipeSchema) {
    contentParts.push('=== STRUCTURED RECIPE DATA (JSON-LD) ===\n' + JSON.stringify(recipeSchema, null, 2));
  }

  // === Strategy 2: WPRM (WordPress Recipe Maker) - very common ===
  const wprmRecipe = $('.wprm-recipe-container, .wprm-recipe');
  if (wprmRecipe.length) {
    const wprmText = wprmRecipe.text().replace(/\s+/g, ' ').trim();
    if (wprmText.length > 100) {
      contentParts.push('=== WORDPRESS RECIPE MAKER ===\n' + wprmText.substring(0, 8000));
    }
  }

  // === Strategy 3: Microdata (filter out comments!) ===
  const microdataText = [];
  $('[itemtype*="Recipe"] [itemprop]').each((_, el) => {
    const prop = $(el).attr('itemprop');
    const text = $(el).text().trim();
    if (prop && text && text.length < 500) {
      microdataText.push(`${prop}: ${text}`);
    }
  });
  // Only use microdata if it's from a Recipe scope (not from comments/articles)
  if (microdataText.length > 3) {
    contentParts.push('=== RECIPE MICRODATA ===\n' + microdataText.join('\n'));
  }

  // === Strategy 4: Clean HTML content extraction ===
  const $clean = cheerio.load(html);
  // Remove noise aggressively
  $clean('script, style, nav, footer, header, aside, iframe, svg, form').remove();
  $clean('[class*="comment"], [class*="sidebar"], [class*="widget"], [class*="ad-"], [class*="advertisement"], [class*="social"], [class*="share"], [class*="newsletter"], [class*="popup"], [class*="modal"], [class*="cookie"], [class*="related"], [class*="recommended"], [class*="footer"], [class*="header"], [class*="navigation"], [class*="breadcrumb"]').remove();
  $clean('[id*="comment"], [id*="sidebar"], [id*="ad"], [id*="footer"], [id*="header"], [id*="nav"]').remove();

  // Prioritize specific content containers (ordered from most specific to broadest)
  const contentSelectors = [
    '.wprm-recipe-container', '.wprm-recipe',
    '.recipe-content', '.recipe-body', '.recipe',
    '.entry-content', '.post-content',
    '[class*="recipe-card"]', '[class*="recipe-detail"]',
    'article .content', 'article',
    '.content', 'main',
    'body'
  ];

  let mainContent = '';
  for (const selector of contentSelectors) {
    const text = $clean(selector).first().text().replace(/\s+/g, ' ').trim();
    if (text.length > 200) {
      mainContent = text;
      break;
    }
  }

  // Extract list items from clean content (often contain ingredients/steps)
  const listItems = [];
  $clean('.entry-content li, .post-content li, article li, .recipe li, main li').each((_, el) => {
    const text = $clean(el).text().trim();
    if (text.length > 3 && text.length < 500) {
      listItems.push(text);
    }
  });
  if (listItems.length > 0) {
    contentParts.push('=== LIST ITEMS FROM PAGE ===\n' + listItems.slice(0, 60).join('\n'));
  }

  // Limit main content but use a generous amount
  if (mainContent) {
    contentParts.push('=== PAGE TEXT CONTENT ===\n' + mainContent.substring(0, 15000));
  }

  const pageTitle = $('title').text().trim() || $('h1').first().text().trim();
  const metaDescription = $('meta[name="description"]').attr('content') || '';

  return {
    content: contentParts.join('\n\n').substring(0, 25000),
    pageTitle,
    metaDescription,
    imageUrl,
    hasStructuredData: !!recipeSchema,
  };
}

// POST parse recipe from URL
router.post('/parse-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const userId = req.user?.id || 'anonymous';

    // Detect YouTube URLs and route to the 3-tier YouTube pipeline
    const videoId = extractYouTubeId(url);
    if (videoId) {
      try {
        const recipe = await extractYouTubeRecipe(videoId, url, userId);
        return res.json(recipe);
      } catch (ytError) {
        return res.status(400).json({ error: ytError.message });
      }
    }

    // Fetch with timeout
    let html;
    try {
      html = await fetchUrl(url);
    } catch (fetchError) {
      return res.status(400).json({
        error: `Failed to fetch URL: ${fetchError.message}. The site may be blocking automated access.`
      });
    }

    if (!html || html.length < 100) {
      return res.status(400).json({ error: 'The URL returned empty or very short content' });
    }

    const { content, pageTitle, metaDescription, imageUrl, hasStructuredData } = extractRecipeContent(html, url);

    if (content.length < 50) {
      return res.status(400).json({ error: 'Could not extract meaningful content from the URL' });
    }

    // Adjust prompt based on whether we have structured data
    const structuredHint = hasStructuredData
      ? 'The page has structured recipe data (JSON-LD) which is the most reliable source.'
      : 'This page has NO structured recipe schema. The recipe is embedded in free-form text. Look carefully for ingredients and instructions within the narrative text.';

    const prompt = `You are an expert recipe extractor. Below is raw content scraped from a recipe webpage. The content may be MESSY and contain irrelevant text (ads, navigation, comments, related articles, etc.).

Your job: IGNORE all the noise and extract ONLY the recipe information.

${structuredHint}

Page title: "${pageTitle}"
Page description: "${metaDescription}"
URL: ${url}

Return ONLY valid JSON with this exact structure:
{
  "title": "recipe title in Hebrew",
  "ingredients": [{"name": "ingredient name in Hebrew", "amount": "amount with unit"}],
  "instructions": ["step 1 with ingredient amounts included in the text", "step 2..."],
  "tags": ["tag1", "tag2"]
}

Critical rules:
- Translate EVERYTHING to Hebrew (title, ingredients, instructions, tags)
- Each instruction step MUST include the specific amounts of ingredients mentioned in that step (e.g., "לערבב 500 גרם קמח עם ליטר מים" not just "לערבב קמח עם מים")
- Tags should be relevant Hebrew food categories (e.g., "עוגות", "בשרי", "טבעוני", "קינוחים", "ארוחת ערב", "מרקים")
- Focus ONLY on the actual recipe - ignore comments, ads, "related recipes", author bio, etc.
- If there are multiple recipes on the page, extract only the main/primary recipe
- Keep ingredient amounts in their original measurement units, just translate the unit name to Hebrew
- If the recipe content is in a blog narrative style, carefully extract the ingredients and steps from the text

=== RAW PAGE CONTENT (extract the recipe from this mess) ===
${content}`;

    const text = await callGemini(userId, prompt);

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Failed to parse recipe from URL - AI could not extract structured data' });
    }

    const recipe = JSON.parse(jsonMatch[0]);
    recipe.image_url = imageUrl;
    recipe.source_url = url;

    res.json(recipe);
  } catch (error) {
    console.error('Error parsing URL:', error);
    res.status(500).json({ error: 'Failed to parse recipe from URL: ' + error.message });
  }
});

// POST parse recipe from free text
router.post('/parse-text', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const userId = req.user?.id || 'anonymous';

    const prompt = `Parse the following free text into a structured recipe. Return ONLY valid JSON with this structure:
{
  "title": "recipe title in Hebrew",
  "ingredients": [{"name": "ingredient name in Hebrew", "amount": "amount with unit"}],
  "instructions": ["step 1 with ingredient amounts included in the text", "step 2..."],
  "tags": ["tag1", "tag2"]
}

Important:
- If the text is not in Hebrew, translate everything to Hebrew
- Each instruction step MUST include the specific amounts of ingredients mentioned in that step (e.g., "לערבב את 500 גרם הקמח עם הליטר מים")
- Tags should be in Hebrew (e.g., "עוגות", "בשרי", "טבעוני", "קינוחים")
- Parse any format - the text might be messy, just extract the recipe information

Text:
${text}`;

    const responseText = await callGemini(userId, prompt);

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Failed to parse recipe from text' });
    }

    const recipe = JSON.parse(jsonMatch[0]);
    res.json(recipe);
  } catch (error) {
    console.error('Error parsing text:', error);
    res.status(500).json({ error: 'Failed to parse recipe from text: ' + error.message });
  }
});

// 3-tier YouTube recipe extraction:
//   Tier 1 – video description (fast, free)
//   Tier 2 – captions/transcript via youtube-transcript
//   Tier 3 – Gemini video analysis (multimodal, used when text is insufficient)
async function extractYouTubeRecipe(videoId, videoUrl, userId) {
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // --- Tier 1: description from the YouTube page ---
  let videoTitle = '';
  let description = '';
  try {
    const html = await fetchUrl(watchUrl);
    const $ = cheerio.load(html);
    videoTitle = ($('meta[property="og:title"]').attr('content') || $('title').text().replace(' - YouTube', '')).trim();
    description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
    console.log(`[YouTube] Tier 1: title="${videoTitle}", description length=${description.length}`);
  } catch (e) {
    console.error('[YouTube] Tier 1 failed:', e.message);
  }

  // --- Tier 2: captions/transcript ---
  let transcript = '';
  try {
    const { YoutubeTranscript } = require('youtube-transcript');
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    transcript = items.map(i => i.text).join(' ');
    console.log(`[YouTube] Tier 2: transcript length=${transcript.length}`);
  } catch (e) {
    console.error('[YouTube] Tier 2 (captions) failed:', e.message);
  }

  // Build text context from tiers 1 + 2
  const parts = [];
  if (videoTitle) parts.push(`Video title: ${videoTitle}`);
  if (description) parts.push(`Video description: ${description}`);
  if (transcript) parts.push(`Video transcript:\n${transcript.substring(0, 12000)}`);
  const textContext = parts.join('\n\n');

  const recipeJsonPrompt = (context) => `You are an expert recipe extractor. Extract the recipe from this YouTube cooking video content.

Return ONLY valid JSON with this exact structure:
{
  "title": "recipe title in Hebrew",
  "ingredients": [{"name": "ingredient name in Hebrew", "amount": "amount with unit"}],
  "instructions": ["step 1 with ingredient amounts included in the text", "step 2..."],
  "tags": ["tag1", "tag2"]
}

Critical rules:
- Translate EVERYTHING to Hebrew (title, ingredients, instructions, tags)
- Each instruction step MUST include the specific amounts of ingredients mentioned in that step
- Tags should be relevant Hebrew food categories (e.g., "עוגות", "בשרי", "טבעוני", "קינוחים")
- Extract cooking times, temperatures, and specific techniques mentioned
- Ignore sponsor mentions, intros, outros, or non-recipe chat
- Convert verbal measurements (e.g., "a cup of flour") to standard units

=== CONTENT ===
${context}`;

  // Use text tiers if we have enough content
  if (textContext.length > 100) {
    try {
      const responseText = await callGemini(userId, recipeJsonPrompt(textContext));
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const recipe = JSON.parse(jsonMatch[0]);
        recipe.image_url = thumbnailUrl;
        recipe.source_url = videoUrl;
        return recipe;
      }
    } catch (e) {
      console.error('[YouTube] Text-based extraction failed:', e.message);
    }
  }

  // --- Tier 3: Gemini multimodal video analysis ---
  console.log('[YouTube] Tier 3: falling back to Gemini video analysis');
  try {
    const { model } = getGeminiModel(userId);
    const videoPrompt = recipeJsonPrompt(videoTitle ? `Video title: ${videoTitle}` : 'YouTube cooking video');
    const result = await model.generateContent([
      {
        fileData: {
          mimeType: 'video/mp4',
          fileUri: watchUrl,
        },
      },
      { text: videoPrompt },
    ]);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Gemini video analysis returned no structured JSON');
    }
    const recipe = JSON.parse(jsonMatch[0]);
    recipe.image_url = thumbnailUrl;
    recipe.source_url = videoUrl;
    return recipe;
  } catch (e) {
    console.error('[YouTube] Tier 3 (Gemini video) failed:', e.message);
    throw new Error('Could not extract recipe from this YouTube video. The video may lack captions and Gemini video analysis also failed.');
  }
}

// POST parse recipe from YouTube video
router.post('/parse-video', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    const userId = req.user?.id || 'anonymous';

    const videoId = extractYouTubeId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const recipe = await extractYouTubeRecipe(videoId, url, userId);
    res.json(recipe);
  } catch (error) {
    console.error('Error parsing video:', error);
    res.status(400).json({ error: error.message });
  }
});

function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// POST generate image for recipe
router.post('/generate-image', async (req, res) => {
  try {
    const { title, ingredients } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Recipe title is required' });
    }

    const userId = req.user?.id || 'anonymous';
    const ingredientsList = ingredients
      ? ingredients.map(i => `${i.name} ${i.amount}`).join(', ')
      : '';

    const prompt = `Generate a detailed, appetizing food photography description for the dish: "${title}" with ingredients: ${ingredientsList}.
    Describe what the final plated dish would look like in one paragraph. Focus on colors, textures, garnishes, and presentation.`;

    const description = await callGemini(userId, prompt);

    const encodedTitle = encodeURIComponent(title);
    const placeholderUrl = `https://via.placeholder.com/800x600/f5e6d3/8b4513?text=${encodedTitle}`;

    res.json({
      image_url: placeholderUrl,
      description
    });
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: 'Failed to generate image: ' + error.message });
  }
});

module.exports = router;
