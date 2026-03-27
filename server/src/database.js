const { Firestore } = require('@google-cloud/firestore');

let db;

function getDb() {
  if (!db) {
    db = new Firestore({
      projectId: process.env.GCP_PROJECT_ID || 'math-quiz-app-2026',
    });
  }
  return db;
}

// Collections: users, recipes, recipe_tags, recipe_notes
// Firestore doesn't need table creation, but we expose helpers

async function initDatabase() {
  // Just verify connection
  const firestore = getDb();
  try {
    // Test connectivity by reading a non-existent doc
    await firestore.collection('users').limit(1).get();
    console.log('Firestore connected successfully');
  } catch (error) {
    console.error('Firestore connection error:', error.message);
    throw error;
  }
}

// ---- User operations ----

async function findUserByGoogleId(googleId) {
  const snapshot = await getDb()
    .collection('users')
    .where('google_id', '==', googleId)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

async function findUserById(userId) {
  const doc = await getDb().collection('users').doc(userId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function createUser(id, googleId, email, name, picture) {
  const data = {
    google_id: googleId,
    email,
    name,
    picture,
    created_at: new Date().toISOString(),
  };
  await getDb().collection('users').doc(id).set(data);
  return { id, ...data };
}

async function updateUser(googleId, email, name, picture) {
  const snapshot = await getDb()
    .collection('users')
    .where('google_id', '==', googleId)
    .limit(1)
    .get();
  if (!snapshot.empty) {
    await snapshot.docs[0].ref.update({ email, name, picture });
  }
}

// ---- Recipe operations ----

async function getAllRecipes(userId) {
  const snapshot = await getDb()
    .collection('recipes')
    .where('user_id', '==', userId)
    .get();
  const recipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  // Sort client-side to avoid requiring a composite index
  recipes.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
  return recipes;
}

async function searchRecipes(userId, search) {
  // Firestore doesn't support LIKE queries, so fetch all and filter
  const all = await getAllRecipes(userId);
  const lower = search.toLowerCase();
  return all.filter(r => {
    const titleMatch = (r.title || '').toLowerCase().includes(lower);
    const ingredientMatch = JSON.stringify(r.ingredients || []).toLowerCase().includes(lower);
    const instructionMatch = JSON.stringify(r.instructions || []).toLowerCase().includes(lower);
    return titleMatch || ingredientMatch || instructionMatch;
  });
}

async function getRecipesByTag(userId, tag) {
  const all = await getAllRecipes(userId);
  return all.filter(r => (r.tags || []).includes(tag));
}

async function getRecipeById(recipeId, userId) {
  const doc = await getDb().collection('recipes').doc(recipeId).get();
  if (!doc.exists) return null;
  const data = { id: doc.id, ...doc.data() };
  if (data.user_id !== userId) return null;
  return data;
}

async function createRecipe(id, userId, { title, ingredients, instructions, image_url, source_url, tags }) {
  const now = new Date().toISOString();
  const data = {
    user_id: userId,
    title,
    ingredients: ingredients || [],
    instructions: instructions || [],
    image_url: image_url || null,
    source_url: source_url || null,
    tags: tags || [],
    notes: [],
    created_at: now,
    updated_at: now,
  };
  await getDb().collection('recipes').doc(id).set(data);
  return { id, ...data };
}

async function updateRecipe(recipeId, userId, { title, ingredients, instructions, image_url, source_url, tags }) {
  const doc = await getDb().collection('recipes').doc(recipeId).get();
  if (!doc.exists || doc.data().user_id !== userId) return false;
  const now = new Date().toISOString();
  await doc.ref.update({
    title,
    ingredients: ingredients || [],
    instructions: instructions || [],
    image_url: image_url || null,
    source_url: source_url || null,
    tags: tags || [],
    updated_at: now,
  });
  return true;
}

async function deleteRecipe(recipeId, userId) {
  const doc = await getDb().collection('recipes').doc(recipeId).get();
  if (!doc.exists || doc.data().user_id !== userId) return false;
  await doc.ref.delete();
  return true;
}

// ---- Notes (stored as sub-array on recipe doc) ----

async function addNote(recipeId, userId, noteId, content) {
  const doc = await getDb().collection('recipes').doc(recipeId).get();
  if (!doc.exists || doc.data().user_id !== userId) return null;
  const note = { id: noteId, content, created_at: new Date().toISOString() };
  const notes = doc.data().notes || [];
  notes.unshift(note);
  await doc.ref.update({ notes });
  return note;
}

async function deleteNote(recipeId, userId, noteId) {
  const doc = await getDb().collection('recipes').doc(recipeId).get();
  if (!doc.exists || doc.data().user_id !== userId) return false;
  const notes = (doc.data().notes || []).filter(n => n.id !== noteId);
  await doc.ref.update({ notes });
  return true;
}

// ---- Tags ----

async function getAllTags(userId) {
  const recipes = await getAllRecipes(userId);
  const tagCounts = {};
  for (const recipe of recipes) {
    for (const tag of (recipe.tags || [])) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

module.exports = {
  getDb,
  initDatabase,
  findUserByGoogleId,
  findUserById,
  createUser,
  updateUser,
  getAllRecipes,
  searchRecipes,
  getRecipesByTag,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  addNote,
  deleteNote,
  getAllTags,
};
