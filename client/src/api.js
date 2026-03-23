const API_BASE = '/api';

export async function fetchRecipes(search = '', tag = '') {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (tag) params.set('tag', tag);
  const res = await fetch(`${API_BASE}/recipes?${params}`);
  if (!res.ok) throw new Error('Failed to fetch recipes');
  return res.json();
}

export async function fetchRecipe(id) {
  const res = await fetch(`${API_BASE}/recipes/${id}`);
  if (!res.ok) throw new Error('Failed to fetch recipe');
  return res.json();
}

export async function createRecipe(recipe) {
  const res = await fetch(`${API_BASE}/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recipe)
  });
  if (!res.ok) throw new Error('Failed to create recipe');
  return res.json();
}

export async function updateRecipe(id, recipe) {
  const res = await fetch(`${API_BASE}/recipes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recipe)
  });
  if (!res.ok) throw new Error('Failed to update recipe');
  return res.json();
}

export async function deleteRecipe(id) {
  const res = await fetch(`${API_BASE}/recipes/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete recipe');
  return res.json();
}

export async function addNote(recipeId, content) {
  const res = await fetch(`${API_BASE}/recipes/${recipeId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  });
  if (!res.ok) throw new Error('Failed to add note');
  return res.json();
}

export async function deleteNote(recipeId, noteId) {
  const res = await fetch(`${API_BASE}/recipes/${recipeId}/notes/${noteId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete note');
  return res.json();
}

export async function fetchTags() {
  const res = await fetch(`${API_BASE}/recipes/meta/tags`);
  if (!res.ok) throw new Error('Failed to fetch tags');
  return res.json();
}

export async function parseRecipeFromUrl(url) {
  const res = await fetch(`${API_BASE}/ai/parse-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  if (!res.ok) throw new Error('Failed to parse URL');
  return res.json();
}

export async function parseRecipeFromText(text) {
  const res = await fetch(`${API_BASE}/ai/parse-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error('Failed to parse text');
  return res.json();
}

export async function generateImage(title, ingredients) {
  const res = await fetch(`${API_BASE}/ai/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, ingredients })
  });
  if (!res.ok) throw new Error('Failed to generate image');
  return res.json();
}
