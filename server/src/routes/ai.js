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
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

// POST parse recipe from URL
router.post('/parse-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Fetch the webpage
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract text content and images
    $('script, style, nav, footer, header').remove();
    const pageText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 8000);

    // Find the best image
    let imageUrl = null;
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) {
      imageUrl = ogImage.startsWith('http') ? ogImage : new URL(ogImage, url).href;
    }

    // Use Gemini to parse the recipe
    const model = getGeminiModel();
    const prompt = `Extract a recipe from the following webpage text. Return ONLY valid JSON with this structure:
{
  "title": "recipe title in Hebrew",
  "ingredients": [{"name": "ingredient name in Hebrew", "amount": "amount with unit"}],
  "instructions": ["step 1 with ingredient amounts included in the text", "step 2..."],
  "tags": ["tag1", "tag2"]
}

Important:
- Translate everything to Hebrew
- Each instruction step must include the specific amounts of ingredients mentioned in that step
- Tags should be in Hebrew (e.g., "עוגות", "בשרי", "טבעוני", "קינוחים")

Webpage text:
${pageText}`;

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
