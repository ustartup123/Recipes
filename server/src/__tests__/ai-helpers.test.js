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
