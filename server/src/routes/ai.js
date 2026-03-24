const express = require('express');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

// POST parse recipe from URL
router.post('/parse-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Fetch the webpage with browser-like headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8'
      }
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    // Try to extract JSON-LD recipe schema first (most recipe sites have this)
    let recipeSchema = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html());
        const findRecipe = (obj) => {
          if (!obj) return null;
          if (obj['@type'] === 'Recipe') return obj;
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

    // Find the best image
    let imageUrl = null;
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) {
      imageUrl = ogImage.startsWith('http') ? ogImage : new URL(ogImage, url).href;
    }
    if (recipeSchema?.image) {
      const img = Array.isArray(recipeSchema.image) ? recipeSchema.image[0] : recipeSchema.image;
      imageUrl = typeof img === 'string' ? img : img?.url || imageUrl;
    }

    // Extract content using multiple strategies for best results
    const contentParts = [];

    // Strategy 1: JSON-LD schema (structured data - best source)
    if (recipeSchema) {
      contentParts.push('=== STRUCTURED RECIPE DATA (JSON-LD) ===\n' + JSON.stringify(recipeSchema, null, 2));
    }

    // Strategy 2: Microdata recipe attributes
    const microdataText = [];
    $('[itemtype*="Recipe"], [itemprop]').each((_, el) => {
      const prop = $(el).attr('itemprop');
      const text = $(el).text().trim();
      if (prop && text && text.length < 500) {
        microdataText.push(`${prop}: ${text}`);
      }
    });
    if (microdataText.length > 0) {
      contentParts.push('=== MICRODATA ===\n' + microdataText.join('\n'));
    }

    // Strategy 3: Extract from common recipe page selectors
    const recipeSelectors = [
      '.recipe-content', '.recipe-body', '.recipe',
      '[class*="recipe"]', '[class*="ingredient"]', '[class*="instruction"]',
      '[class*="direction"]', '[class*="method"]', '[class*="step"]',
      'article', '.entry-content', '.post-content', '.content',
      'main'
    ];
    const $clean = cheerio.load(html);
    $clean('script, style, nav, footer, header, aside, [class*="comment"], [class*="sidebar"], [class*="widget"], [class*="ad-"], [class*="advertisement"], [class*="social"], [class*="share"], [class*="newsletter"], [class*="popup"], [class*="modal"], [class*="cookie"], [id*="comment"], [id*="sidebar"], [id*="ad"]').remove();

    let mainContent = '';
    for (const selector of recipeSelectors) {
      const text = $clean(selector).text().replace(/\s+/g, ' ').trim();
      if (text.length > 200) {
        mainContent = text;
        break;
      }
    }
    if (!mainContent) {
      mainContent = $clean('body').text().replace(/\s+/g, ' ').trim();
    }

    // Also extract list items which often contain ingredients/steps
    const listItems = [];
    $clean('li, ol li, ul li').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 5 && text.length < 500) {
        listItems.push(text);
      }
    });
    if (listItems.length > 0) {
      contentParts.push('=== LIST ITEMS FROM PAGE ===\n' + listItems.slice(0, 60).join('\n'));
    }

    contentParts.push('=== PAGE TEXT CONTENT ===\n' + mainContent.substring(0, 12000));

    // Get the page title
    const pageTitle = $('title').text().trim() || $('h1').first().text().trim();
    const metaDescription = $('meta[name="description"]').attr('content') || '';

    const fullContent = contentParts.join('\n\n').substring(0, 20000);

    // Use Gemini to parse the recipe - with a robust prompt
    const model = getGeminiModel();
    const prompt = `You are an expert recipe extractor. Below is raw content scraped from a recipe webpage. The content is MESSY and contains lots of irrelevant text (ads, navigation, comments, related articles, etc.).

Your job: IGNORE all the noise and extract ONLY the recipe information.

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

=== RAW PAGE CONTENT (extract the recipe from this mess) ===
${fullContent}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Failed to parse recipe from URL' });
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

    const model = getGeminiModel();
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

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

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

// POST generate image for recipe
router.post('/generate-image', async (req, res) => {
  try {
    const { title, ingredients } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Recipe title is required' });
    }

    const model = getGeminiModel();
    const ingredientsList = ingredients
      ? ingredients.map(i => `${i.name} ${i.amount}`).join(', ')
      : '';

    const prompt = `Generate a detailed, appetizing food photography description for the dish: "${title}" with ingredients: ${ingredientsList}.
    Describe what the final plated dish would look like in one paragraph. Focus on colors, textures, garnishes, and presentation.`;

    const result = await model.generateContent(prompt);
    const description = result.response.text();

    // For now, return a placeholder - Gemini image generation requires Imagen API
    // We'll use a food placeholder based on the title
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
