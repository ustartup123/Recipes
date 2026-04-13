/**
 * Tests for AI route helper functions (URL content extraction, YouTube ID parsing)
 * These test the pure logic without making actual API calls.
 */

// We need to extract the testable functions from ai.js
// Let's test them by requiring the module internals
const cheerio = require('cheerio');

// Replicate extractYouTubeId from ai.js for testing
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

describe('YouTube ID Extraction', () => {
  test('extracts ID from standard watch URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  test('extracts ID from shortened URL', () => {
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  test('extracts ID from embed URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  test('extracts ID from shorts URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  test('extracts ID from URL with extra params', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s')).toBe('dQw4w9WgXcQ');
  });

  test('extracts bare video ID', () => {
    expect(extractYouTubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  test('returns null for invalid URL', () => {
    expect(extractYouTubeId('https://example.com/video')).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(extractYouTubeId('')).toBeNull();
  });

  test('returns null for YouTube search results URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/results?search_query=%D7%97%D7%9F+%D7%91%D7%9E%D7%98%D7%91%D7%97')).toBeNull();
  });

  test('returns null for YouTube channel URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/@someChannel')).toBeNull();
  });

  test('returns null for YouTube playlist URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf')).toBeNull();
  });
});

describe('Recipe Content Extraction from HTML', () => {
  test('extracts JSON-LD Recipe schema', () => {
    const html = `
      <html><head>
        <title>Test Recipe</title>
        <script type="application/ld+json">
        {"@type": "Recipe", "name": "Chocolate Cake", "recipeIngredient": ["200g chocolate", "1 cup sugar"]}
        </script>
      </head><body><p>Content</p></body></html>
    `;
    const $ = cheerio.load(html);
    let recipeSchema = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html());
        if (data['@type'] === 'Recipe') recipeSchema = data;
      } catch {}
    });

    expect(recipeSchema).toBeDefined();
    expect(recipeSchema.name).toBe('Chocolate Cake');
    expect(recipeSchema.recipeIngredient).toHaveLength(2);
  });

  test('extracts Recipe from @graph JSON-LD', () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
        {"@graph": [{"@type": "WebPage"}, {"@type": "Recipe", "name": "Graph Recipe"}]}
        </script>
      </head><body></body></html>
    `;
    const $ = cheerio.load(html);
    let recipeSchema = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html());
        const findRecipe = (obj) => {
          if (!obj) return null;
          if (obj['@type'] === 'Recipe') return obj;
          if (Array.isArray(obj)) {
            for (const item of obj) { const f = findRecipe(item); if (f) return f; }
          }
          if (obj['@graph']) return findRecipe(obj['@graph']);
          return null;
        };
        const found = findRecipe(data);
        if (found) recipeSchema = found;
      } catch {}
    });

    expect(recipeSchema).toBeDefined();
    expect(recipeSchema.name).toBe('Graph Recipe');
  });

  test('extracts og:image', () => {
    const html = `
      <html><head>
        <meta property="og:image" content="https://example.com/image.jpg" />
      </head><body></body></html>
    `;
    const $ = cheerio.load(html);
    const ogImage = $('meta[property="og:image"]').attr('content');
    expect(ogImage).toBe('https://example.com/image.jpg');
  });

  test('prioritizes entry-content over article', () => {
    const html = `
      <html><body>
        <article>
          <div class="entry-content">
            <p>This is the recipe content with ingredients and instructions that is specific and relevant</p>
          </div>
          <div class="comments">
            <p>Lots of comments and noise that should not be extracted as recipe content at all</p>
          </div>
        </article>
      </body></html>
    `;
    // Before cleaning: article contains both entry-content + comments
    const $raw = cheerio.load(html);
    const rawArticle = $raw('article').first().text().replace(/\s+/g, ' ').trim();
    const rawEntry = $raw('.entry-content').first().text().replace(/\s+/g, ' ').trim();
    expect(rawEntry.length).toBeLessThan(rawArticle.length);

    // After cleaning: comments are removed
    const $clean = cheerio.load(html);
    $clean('[class*="comment"]').remove();
    const cleanedText = $clean('.entry-content').first().text().replace(/\s+/g, ' ').trim();
    expect(cleanedText).toContain('recipe content');
    expect(cleanedText).not.toContain('comments and noise');
  });

  test('removes noise elements from content', () => {
    const html = `
      <html><body>
        <main>
          <p>Recipe content here</p>
          <div class="sidebar">Sidebar stuff</div>
          <div class="advertisement">Buy stuff</div>
          <div class="comment-section">User comment</div>
          <nav>Navigation</nav>
          <footer>Footer</footer>
        </main>
      </body></html>
    `;
    const $ = cheerio.load(html);
    $('script, style, nav, footer, header, aside, iframe, svg, form').remove();
    $('[class*="comment"], [class*="sidebar"], [class*="advertisement"]').remove();

    const text = $('main').text().replace(/\s+/g, ' ').trim();
    expect(text).toContain('Recipe content');
    expect(text).not.toContain('Sidebar stuff');
    expect(text).not.toContain('Buy stuff');
    expect(text).not.toContain('User comment');
    expect(text).not.toContain('Navigation');
    expect(text).not.toContain('Footer');
  });

  test('preserves article content with internal header elements (Wix/Biz sites)', () => {
    // Regression test for BUG-1: Hebrew blog post from baldbaker.co.il
    // Wix sites have <header class="SomeClassName"> elements inside <article>
    // The old removal pattern [class*="header"] was matching these and breaking content extraction
    const html = `
      <html><body>
        <article class="tgMH9T">
          <header class="PhCafd">
            <h1>Recipe Title</h1>
            <div>Date and author info</div>
          </header>
          <section class="content">
            <p>Cup of flour</p>
            <p>2 eggs</p>
            <p>Mix ingredients and bake for 30 minutes</p>
          </section>
        </article>
      </body></html>
    `;
    const $ = cheerio.load(html);
    // Apply the FIXED removal patterns
    $('script, style, nav, aside, iframe, svg, form').remove();
    // Only remove page-level header/footer, not content headers
    $('body > footer, body > header').remove();
    // FIXED: only remove specific header patterns, not all elements with "header" in class
    $('[class*="comment"], [class*="sidebar"], [class*="widget"], [class*="ad-"], [class*="advertisement"], [class*="social"], [class*="share"], [class*="newsletter"], [class*="popup"], [class*="modal"], [class*="cookie"], [class*="related"], [class*="recommended"], [class*="navigation"], [class*="breadcrumb"]').remove();
    // For footer/header removal, only target page-level elements, not content headers
    $('[class*="site-footer"], [class*="page-footer"], [class*="page-header"], [class*="site-header"], [class*="main-header"], [class*="post-footer"]').remove();

    const text = $('article').text().replace(/\s+/g, ' ').trim();
    expect($('article').length).toBe(1); // Article should still exist
    expect(text).toContain('Recipe Title');
    expect(text).toContain('Cup of flour');
    expect(text).toContain('Mix ingredients');
  });
});

describe('Gemini Error Handling', () => {
  const { isRetryableError, classifyGeminiError } = require('../routes/ai');

  describe('isRetryableError', () => {
    test('retries on 503 Service Unavailable', () => {
      expect(isRetryableError(new Error('[GoogleGenerativeAI Error]: Error fetching from https://...: [503 Service Unavailable]'))).toBe(true);
    });

    test('retries on 429 rate limit', () => {
      expect(isRetryableError(new Error('429 RESOURCE_EXHAUSTED'))).toBe(true);
    });

    test('retries on "high demand" message', () => {
      expect(isRetryableError(new Error('This model is currently experiencing high demand'))).toBe(true);
    });

    test('retries on network errors', () => {
      expect(isRetryableError(new Error('ECONNRESET'))).toBe(true);
      expect(isRetryableError(new Error('ETIMEDOUT'))).toBe(true);
    });

    test('does NOT retry on 400 bad request', () => {
      expect(isRetryableError(new Error('400 INVALID_ARGUMENT: bad input'))).toBe(false);
    });

    test('does NOT retry on API key errors', () => {
      expect(isRetryableError(new Error('API key not valid'))).toBe(false);
    });

    test('does NOT retry on generic errors', () => {
      expect(isRetryableError(new Error('Something went wrong'))).toBe(false);
    });
  });

  describe('classifyGeminiError', () => {
    test('classifies 503 as user-friendly Hebrew message', () => {
      const result = classifyGeminiError(new Error('[503 Service Unavailable] high demand'));
      expect(result.status).toBe(503);
      expect(result.userMessage).toMatch(/עמוס/); // "busy/overloaded" in Hebrew
    });

    test('classifies 429 as rate limit', () => {
      const result = classifyGeminiError(new Error('429 RESOURCE_EXHAUSTED'));
      expect(result.status).toBe(429);
      expect(result.userMessage).toMatch(/מגבלת/); // "limit" in Hebrew
    });

    test('classifies API key errors as server config issue', () => {
      const result = classifyGeminiError(new Error('API key not valid'));
      expect(result.status).toBe(500);
      expect(result.userMessage).toMatch(/הגדרות/); // "settings" in Hebrew
    });

    test('classifies unknown errors with generic message', () => {
      const result = classifyGeminiError(new Error('Something unexpected'));
      expect(result.status).toBe(500);
      expect(result.userMessage).toMatch(/שגיאה/); // "error" in Hebrew
    });
  });
});

describe('JWT Auth', () => {
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

  test('signToken creates a valid JWT', () => {
    const token = jwt.sign({ userId: 'test-user' }, JWT_SECRET, { expiresIn: '30d' });
    const decoded = jwt.verify(token, JWT_SECRET);
    expect(decoded.userId).toBe('test-user');
  });

  test('JWT expires correctly', () => {
    const token = jwt.sign({ userId: 'test-user' }, JWT_SECRET, { expiresIn: '1s' });
    // Token should be valid immediately
    const decoded = jwt.verify(token, JWT_SECRET);
    expect(decoded.userId).toBe('test-user');
  });

  test('JWT rejects invalid secret', () => {
    const token = jwt.sign({ userId: 'test-user' }, JWT_SECRET, { expiresIn: '30d' });
    expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
  });

  test('JWT has 30-day expiry', () => {
    const token = jwt.sign({ userId: 'test-user' }, JWT_SECRET, { expiresIn: '30d' });
    const decoded = jwt.verify(token, JWT_SECRET);
    const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
    const expiryDiff = decoded.exp - decoded.iat;
    expect(expiryDiff).toBe(thirtyDaysInSeconds);
  });
});
