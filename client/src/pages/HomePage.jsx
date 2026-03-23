import { useState, useEffect } from 'react';
import { FiSearch } from 'react-icons/fi';
import RecipeCard from '../components/RecipeCard';
import { fetchRecipes, fetchTags } from '../api';

export default function HomePage() {
  const [recipes, setRecipes] = useState([]);
  const [tags, setTags] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRecipes();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, activeTag]);

  async function loadData() {
    try {
      const [recipesData, tagsData] = await Promise.all([fetchRecipes(), fetchTags()]);
      setRecipes(recipesData);
      setTags(tagsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecipes() {
    try {
      const data = await fetchRecipes(search, activeTag);
      setRecipes(data);
    } catch (err) {
      console.error(err);
    }
  }

  const handleTagClick = (tag) => {
    setActiveTag(activeTag === tag ? '' : tag);
    setSearch('');
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <span>טוען מתכונים...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="search-bar">
        <FiSearch className="search-icon" />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setActiveTag(''); }}
          placeholder="חפש מתכון..."
        />
      </div>

      {tags.length > 0 && (
        <div className="tags-filter">
          {tags.map(t => (
            <button
              key={t.tag}
              className={`tag ${activeTag === t.tag ? 'active' : ''}`}
              onClick={() => handleTagClick(t.tag)}
            >
              {t.tag} ({t.count})
            </button>
          ))}
        </div>
      )}

      {recipes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🍳</div>
          <p>{search || activeTag ? 'לא נמצאו מתכונים' : 'עדיין אין מתכונים'}</p>
          {!search && !activeTag && (
            <a href="/add" className="btn btn-primary">הוסף את המתכון הראשון</a>
          )}
        </div>
      ) : (
        <div className="recipes-grid">
          {recipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
