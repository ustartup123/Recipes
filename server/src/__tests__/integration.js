#!/usr/bin/env node
/**
 * Integration tests for Firestore database operations.
 * Run with: node src/__tests__/integration.js
 *
 * These test against the real Firestore database and require
 * valid GCP credentials (ADC or service account).
 * Test data is cleaned up after each run.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const jwt = require('jsonwebtoken');

const TEST_PREFIX = `test-${Date.now()}`;
const TEST_USER_ID = `${TEST_PREFIX}-user`;
const TEST_GOOGLE_ID = `${TEST_PREFIX}-google-id`;
const TEST_EMAIL = `${TEST_PREFIX}@test.com`;
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

let passed = 0;
let failed = 0;
const failures = [];
const cleanupIds = { users: [], recipes: [] };

function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, error: err.message });
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

async function cleanup() {
  console.log('\nCleaning up test data...');
  const firestore = db.getDb();
  for (const id of cleanupIds.recipes) {
    try { await firestore.collection('recipes').doc(id).delete(); } catch {}
  }
  for (const id of cleanupIds.users) {
    try { await firestore.collection('users').doc(id).delete(); } catch {}
  }
  console.log('Cleanup complete.');
}

async function run() {
  console.log('=== Recipes App Integration Tests ===\n');

  // -- Firestore Connection --
  console.log('Database Connection:');
  await test('connects to Firestore', async () => {
    await db.initDatabase();
  });

  // -- User Operations --
  console.log('\nUser Operations:');

  await test('createUser creates a new user', async () => {
    const user = await db.createUser(TEST_USER_ID, TEST_GOOGLE_ID, TEST_EMAIL, 'Test User', 'https://example.com/pic.jpg');
    cleanupIds.users.push(TEST_USER_ID);
    assert(user.id === TEST_USER_ID, 'wrong id');
    assert(user.google_id === TEST_GOOGLE_ID, 'wrong google_id');
    assert(user.email === TEST_EMAIL, 'wrong email');
    assert(user.name === 'Test User', 'wrong name');
  });

  await test('findUserByGoogleId finds existing user', async () => {
    const user = await db.findUserByGoogleId(TEST_GOOGLE_ID);
    assert(user !== null, 'user should exist');
    assert(user.id === TEST_USER_ID, 'wrong id');
  });

  await test('findUserByGoogleId returns null for non-existent', async () => {
    const user = await db.findUserByGoogleId('non-existent');
    assert(user === null, 'should be null');
  });

  await test('findUserById finds existing user', async () => {
    const user = await db.findUserById(TEST_USER_ID);
    assert(user !== null, 'user should exist');
    assert(user.email === TEST_EMAIL, 'wrong email');
  });

  await test('findUserById returns null for non-existent', async () => {
    const user = await db.findUserById('non-existent');
    assert(user === null, 'should be null');
  });

  await test('updateUser updates user info', async () => {
    await db.updateUser(TEST_GOOGLE_ID, 'updated@test.com', 'Updated Name', 'https://example.com/new.jpg');
    const user = await db.findUserByGoogleId(TEST_GOOGLE_ID);
    assert(user.email === 'updated@test.com', 'email not updated');
    assert(user.name === 'Updated Name', 'name not updated');
  });

  // -- Recipe CRUD --
  console.log('\nRecipe CRUD:');
  const recipeId = uuidv4();
  cleanupIds.recipes.push(recipeId);

  await test('createRecipe creates a recipe', async () => {
    const recipe = await db.createRecipe(recipeId, TEST_USER_ID, {
      title: 'Test Pizza',
      ingredients: [{ name: 'flour', amount: '500g' }],
      instructions: ['Mix flour'],
      tags: ['pizza', 'test'],
      image_url: 'https://example.com/pizza.jpg',
      source_url: 'https://example.com/pizza',
    });
    assert(recipe.id === recipeId, 'wrong id');
    assert(recipe.title === 'Test Pizza', 'wrong title');
    assertEqual(recipe.tags, ['pizza', 'test'], 'wrong tags');
    assertEqual(recipe.notes, [], 'notes should be empty');
  });

  await test('getRecipeById returns recipe for correct user', async () => {
    const recipe = await db.getRecipeById(recipeId, TEST_USER_ID);
    assert(recipe !== null, 'recipe should exist');
    assert(recipe.title === 'Test Pizza', 'wrong title');
  });

  await test('getRecipeById returns null for wrong user', async () => {
    const recipe = await db.getRecipeById(recipeId, 'wrong-user');
    assert(recipe === null, 'should be null for wrong user');
  });

  await test('getRecipeById returns null for non-existent', async () => {
    const recipe = await db.getRecipeById('non-existent', TEST_USER_ID);
    assert(recipe === null, 'should be null');
  });

  await test('getAllRecipes returns user recipes', async () => {
    const recipes = await db.getAllRecipes(TEST_USER_ID);
    assert(recipes.length >= 1, 'should have at least 1 recipe');
    const found = recipes.find(r => r.id === recipeId);
    assert(found, 'test recipe should be in list');
  });

  await test('getAllRecipes returns empty for unknown user', async () => {
    const recipes = await db.getAllRecipes('unknown-user-xyz');
    assertEqual(recipes, [], 'should be empty');
  });

  const recipeId2 = uuidv4();
  cleanupIds.recipes.push(recipeId2);

  await test('getAllRecipes sorts by updated_at desc', async () => {
    await db.createRecipe(recipeId2, TEST_USER_ID, {
      title: 'Newer Recipe',
      ingredients: [],
      instructions: [],
      tags: [],
    });
    const recipes = await db.getAllRecipes(TEST_USER_ID);
    const idx1 = recipes.findIndex(r => r.id === recipeId);
    const idx2 = recipes.findIndex(r => r.id === recipeId2);
    assert(idx2 < idx1, 'newer recipe should come first');
  });

  await test('updateRecipe updates fields', async () => {
    const ok = await db.updateRecipe(recipeId, TEST_USER_ID, {
      title: 'Updated Pizza',
      ingredients: [{ name: 'flour', amount: '1kg' }],
      instructions: ['New instruction'],
      tags: ['updated'],
      image_url: null,
      source_url: null,
    });
    assert(ok === true, 'should return true');
    const recipe = await db.getRecipeById(recipeId, TEST_USER_ID);
    assert(recipe.title === 'Updated Pizza', 'title not updated');
    assertEqual(recipe.tags, ['updated'], 'tags not updated');
  });

  await test('updateRecipe returns false for wrong user', async () => {
    const ok = await db.updateRecipe(recipeId, 'wrong-user', {
      title: 'Hacked', ingredients: [], instructions: [], tags: [],
    });
    assert(ok === false, 'should return false');
  });

  // -- Search & Tags --
  console.log('\nSearch & Tags:');

  const searchId = uuidv4();
  cleanupIds.recipes.push(searchId);

  await test('searchRecipes finds by title', async () => {
    await db.createRecipe(searchId, TEST_USER_ID, {
      title: 'Chocolate Cake Unique123',
      ingredients: [{ name: 'chocolate', amount: '200g' }],
      instructions: ['Melt chocolate'],
      tags: ['dessert', 'chocolate'],
    });
    const results = await db.searchRecipes(TEST_USER_ID, 'Unique123');
    assert(results.length >= 1, 'should find by title');
  });

  await test('searchRecipes finds by ingredient', async () => {
    const results = await db.searchRecipes(TEST_USER_ID, 'chocolate');
    assert(results.length >= 1, 'should find by ingredient');
  });

  await test('searchRecipes finds by instruction', async () => {
    const results = await db.searchRecipes(TEST_USER_ID, 'Melt');
    assert(results.length >= 1, 'should find by instruction');
  });

  await test('searchRecipes returns empty for no match', async () => {
    const results = await db.searchRecipes(TEST_USER_ID, 'xyznonexistent99999');
    assertEqual(results, [], 'should be empty');
  });

  await test('getRecipesByTag filters correctly', async () => {
    const results = await db.getRecipesByTag(TEST_USER_ID, 'chocolate');
    assert(results.length >= 1, 'should find by tag');
    assert(results.every(r => r.tags.includes('chocolate')), 'all should have tag');
  });

  await test('getAllTags returns sorted tag counts', async () => {
    const tags = await db.getAllTags(TEST_USER_ID);
    assert(Array.isArray(tags), 'should be array');
    for (let i = 1; i < tags.length; i++) {
      assert(tags[i - 1].count >= tags[i].count, 'should be sorted desc');
    }
  });

  // -- Notes --
  console.log('\nNotes:');

  const noteRecipeId = uuidv4();
  cleanupIds.recipes.push(noteRecipeId);

  await test('addNote adds a note', async () => {
    await db.createRecipe(noteRecipeId, TEST_USER_ID, {
      title: 'Note Test', ingredients: [], instructions: [], tags: [],
    });
    const noteId = uuidv4();
    const note = await db.addNote(noteRecipeId, TEST_USER_ID, noteId, 'Test note');
    assert(note !== null, 'note should be created');
    assert(note.content === 'Test note', 'wrong content');
  });

  await test('addNote appears in recipe', async () => {
    const recipe = await db.getRecipeById(noteRecipeId, TEST_USER_ID);
    assert(recipe.notes.length === 1, 'should have 1 note');
    assert(recipe.notes[0].content === 'Test note', 'wrong note content');
  });

  await test('addNote prepends (newest first)', async () => {
    await db.addNote(noteRecipeId, TEST_USER_ID, uuidv4(), 'Second note');
    const recipe = await db.getRecipeById(noteRecipeId, TEST_USER_ID);
    assert(recipe.notes.length === 2, 'should have 2 notes');
    assert(recipe.notes[0].content === 'Second note', 'newest should be first');
  });

  await test('addNote returns null for wrong user', async () => {
    const note = await db.addNote(noteRecipeId, 'wrong-user', uuidv4(), 'Bad');
    assert(note === null, 'should return null');
  });

  await test('deleteNote removes a note', async () => {
    const recipe = await db.getRecipeById(noteRecipeId, TEST_USER_ID);
    const noteToDelete = recipe.notes[0].id;
    const ok = await db.deleteNote(noteRecipeId, TEST_USER_ID, noteToDelete);
    assert(ok === true, 'should return true');
    const updated = await db.getRecipeById(noteRecipeId, TEST_USER_ID);
    assert(updated.notes.length === 1, 'should have 1 note left');
  });

  await test('deleteNote returns false for wrong user', async () => {
    const recipe = await db.getRecipeById(noteRecipeId, TEST_USER_ID);
    const ok = await db.deleteNote(noteRecipeId, 'wrong-user', recipe.notes[0].id);
    assert(ok === false, 'should return false');
  });

  // -- Delete --
  console.log('\nDelete:');

  await test('deleteRecipe returns false for wrong user', async () => {
    const ok = await db.deleteRecipe(recipeId, 'wrong-user');
    assert(ok === false, 'should return false');
  });

  await test('deleteRecipe deletes the recipe', async () => {
    const tempId = uuidv4();
    await db.createRecipe(tempId, TEST_USER_ID, {
      title: 'To Delete', ingredients: [], instructions: [], tags: [],
    });
    const ok = await db.deleteRecipe(tempId, TEST_USER_ID);
    assert(ok === true, 'should return true');
    const recipe = await db.getRecipeById(tempId, TEST_USER_ID);
    assert(recipe === null, 'should be deleted');
  });

  // -- JWT --
  console.log('\nJWT Authentication:');

  await test('JWT signs and verifies correctly', () => {
    const token = jwt.sign({ userId: 'test-user' }, JWT_SECRET, { expiresIn: '30d' });
    const decoded = jwt.verify(token, JWT_SECRET);
    assert(decoded.userId === 'test-user', 'wrong userId in JWT');
  });

  await test('JWT rejects wrong secret', () => {
    const token = jwt.sign({ userId: 'test-user' }, JWT_SECRET, { expiresIn: '30d' });
    let threw = false;
    try { jwt.verify(token, 'wrong-secret'); } catch { threw = true; }
    assert(threw, 'should throw for wrong secret');
  });

  await test('JWT has 30-day expiry', () => {
    const token = jwt.sign({ userId: 'test-user' }, JWT_SECRET, { expiresIn: '30d' });
    const decoded = jwt.verify(token, JWT_SECRET);
    const diff = decoded.exp - decoded.iat;
    assert(diff === 30 * 24 * 60 * 60, `expiry should be 30 days, got ${diff}s`);
  });

  // -- Summary --
  console.log(`\n${'='.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach(f => console.log(`  ✗ ${f.name}: ${f.error}`));
  }

  await cleanup();

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal error:', err);
  cleanup().then(() => process.exit(1));
});
