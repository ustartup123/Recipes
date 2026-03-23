const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');

const router = express.Router();

// GET all recipes
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { search, tag } = req.query;

    let recipes;
    if (search) {
      recipes = db.prepare(`
        SELECT * FROM recipes
        WHERE title LIKE ? OR ingredients LIKE ? OR instructions LIKE ?
        ORDER BY updated_at DESC
      `).all(`%${search}%`, `%${search}%`, `%${search}%`);
    } else if (tag) {
      recipes = db.prepare(`
        SELECT r.* FROM recipes r
        JOIN recipe_tags rt ON r.id = rt.recipe_id
        WHERE rt.tag = ?
        ORDER BY r.updated_at DESC
      `).all(tag);
    } else {
      recipes = db.prepare('SELECT * FROM recipes ORDER BY updated_at DESC').all();
    }

    // Attach tags and notes to each recipe
    const tagsStmt = db.prepare('SELECT tag FROM recipe_tags WHERE recipe_id = ?');
    const notesStmt = db.prepare('SELECT * FROM recipe_notes WHERE recipe_id = ? ORDER BY created_at DESC');

    recipes = recipes.map(recipe => ({
      ...recipe,
      ingredients: JSON.parse(recipe.ingredients),
      instructions: JSON.parse(recipe.instructions),
      tags: tagsStmt.all(recipe.id).map(t => t.tag),
      notes: notesStmt.all(recipe.id)
    }));

    res.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// GET single recipe
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id);

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const tags = db.prepare('SELECT tag FROM recipe_tags WHERE recipe_id = ?').all(recipe.id).map(t => t.tag);
    const notes = db.prepare('SELECT * FROM recipe_notes WHERE recipe_id = ? ORDER BY created_at DESC').all(recipe.id);

    res.json({
      ...recipe,
      ingredients: JSON.parse(recipe.ingredients),
      instructions: JSON.parse(recipe.instructions),
      tags,
      notes
    });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

// POST create recipe
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { title, ingredients, instructions, image_url, source_url, tags } = req.body;

    if (!title || !ingredients || !instructions) {
      return res.status(400).json({ error: 'Title, ingredients, and instructions are required' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO recipes (id, title, ingredients, instructions, image_url, source_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, JSON.stringify(ingredients), JSON.stringify(instructions), image_url || null, source_url || null, now, now);

    // Insert tags
    if (tags && tags.length > 0) {
      const insertTag = db.prepare('INSERT INTO recipe_tags (recipe_id, tag) VALUES (?, ?)');
      for (const tag of tags) {
        insertTag.run(id, tag.trim());
      }
    }

    res.status(201).json({ id, title, ingredients, instructions, image_url, source_url, tags: tags || [], notes: [], created_at: now, updated_at: now });
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

// PUT update recipe
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const { title, ingredients, instructions, image_url, source_url, tags } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE recipes SET title = ?, ingredients = ?, instructions = ?, image_url = ?, source_url = ?, updated_at = ?
      WHERE id = ?
    `).run(title, JSON.stringify(ingredients), JSON.stringify(instructions), image_url || null, source_url || null, now, req.params.id);

    // Update tags
    db.prepare('DELETE FROM recipe_tags WHERE recipe_id = ?').run(req.params.id);
    if (tags && tags.length > 0) {
      const insertTag = db.prepare('INSERT INTO recipe_tags (recipe_id, tag) VALUES (?, ?)');
      for (const tag of tags) {
        insertTag.run(req.params.id, tag.trim());
      }
    }

    res.json({ message: 'Recipe updated' });
  } catch (error) {
    console.error('Error updating recipe:', error);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

// DELETE recipe
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM recipes WHERE id = ?').run(req.params.id);
    res.json({ message: 'Recipe deleted' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

// POST add note to recipe
router.post('/:id/notes', (req, res) => {
  try {
    const db = getDb();
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const result = db.prepare('INSERT INTO recipe_notes (recipe_id, content) VALUES (?, ?)').run(req.params.id, content);
    const note = db.prepare('SELECT * FROM recipe_notes WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(note);
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// DELETE note
router.delete('/:recipeId/notes/:noteId', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM recipe_notes WHERE id = ? AND recipe_id = ?').run(req.params.noteId, req.params.recipeId);
    res.json({ message: 'Note deleted' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// GET all tags
router.get('/meta/tags', (req, res) => {
  try {
    const db = getDb();
    const tags = db.prepare('SELECT DISTINCT tag, COUNT(*) as count FROM recipe_tags GROUP BY tag ORDER BY count DESC').all();
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

module.exports = router;
