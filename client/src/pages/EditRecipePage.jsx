import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import RecipeForm from '../components/RecipeForm';
import { fetchRecipe, updateRecipe } from '../api';

export default function EditRecipePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRecipe(id)
      .then(setRecipe)
      .catch(() => {
        toast.error('לא הצלחנו לטעון את המתכון');
        navigate('/');
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleUpdate(data) {
    setSaving(true);
    try {
      await updateRecipe(id, { ...data, source_url: recipe.source_url });
      toast.success('המתכון עודכן!');
      navigate(`/recipe/${id}`);
    } catch {
      toast.error('שגיאה בעדכון המתכון');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <span>טוען מתכון...</span>
      </div>
    );
  }

  return (
    <div className="add-recipe-page">
      <h1 style={{ fontSize: '1.6rem', marginBottom: 24 }}>עריכת מתכון</h1>
      {recipe && (
        <RecipeForm
          initial={recipe}
          onSubmit={handleUpdate}
          loading={saving}
        />
      )}
    </div>
  );
}
