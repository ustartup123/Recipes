const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const router = express.Router();

// GET all recipes (for current user)
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { search, tag } = req.query;

    let recipes;
    if (search) {
      recipes = await db.searchRecipes(userId, search);
    } else if (tag) {
      recipes = await db.getRecipesByTag(userId, tag);
    } else {
      recipes = await db.getAllRecipes(userId);
    }

    res.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// GET all tags (for current user) - must be before /:id
router.get('/meta/tags', async (req, res) => {
  try {
    const tags = await db.getAllTags(req.user.id);
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// GET single recipe (verify ownership)
router.get('/:id', async (req, res) => {
  try {
    const recipe = await db.getRecipeById(req.params.id, req.user.id);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json(recipe);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

// POST create recipe
router.post('/', async (req, res) => {
  try {
    const { title, ingredients, instructions, image_url, source_url, tags } = req.body;
    const userId = req.user.id;

    if (!title || !ingredients || !instructions) {
      return res.status(400).json({ error: 'Title, ingredients, and instructions are required' });
    }

    const id = uuidv4();
    const recipe = await db.createRecipe(id, userId, { title, ingredients, instructions, image_url, source_url, tags });
    res.status(201).json(recipe);
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

// PUT update recipe (verify ownership)
router.put('/:id', async (req, res) => {
  try {
    const { title, ingredients, instructions, image_url, source_url, tags } = req.body;
    const updated = await db.updateRecipe(req.params.id, req.user.id, { title, ingredients, instructions, image_url, source_url, tags });
    if (!updated) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json({ message: 'Recipe updated' });
  } catch (error) {
    console.error('Error updating recipe:', error);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

// DELETE recipe (verify ownership)
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await db.deleteRecipe(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json({ message: 'Recipe deleted' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

// POST add note to recipe (verify ownership)
router.post('/:id/notes', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const noteId = uuidv4();
    const note = await db.addNote(req.params.id, req.user.id, noteId, content);
    if (!note) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.status(201).json(note);
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// DELETE note (verify recipe ownership)
router.delete('/:recipeId/notes/:noteId', async (req, res) => {
  try {
    const deleted = await db.deleteNote(req.params.recipeId, req.user.id, req.params.noteId);
    if (!deleted) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json({ message: 'Note deleted' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

module.exports = router;
