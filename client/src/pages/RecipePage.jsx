import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiArrowRight, FiSend } from 'react-icons/fi';
import { GiMeal } from 'react-icons/gi';
import toast from 'react-hot-toast';
import { fetchRecipe, deleteRecipe, addNote, deleteNote } from '../api';

export default function RecipePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    loadRecipe();
  }, [id]);

  async function loadRecipe() {
    try {
      const data = await fetchRecipe(id);
      setRecipe(data);
    } catch (err) {
      toast.error('לא הצלחנו לטעון את המתכון');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('למחוק את המתכון?')) return;
    try {
      await deleteRecipe(id);
      toast.success('המתכון נמחק');
      navigate('/');
    } catch {
      toast.error('שגיאה במחיקת המתכון');
    }
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      await addNote(id, noteText.trim());
      setNoteText('');
      await loadRecipe();
      toast.success('הערה נוספה');
    } catch {
      toast.error('שגיאה בהוספת הערה');
    } finally {
      setAddingNote(false);
    }
  }

  async function handleDeleteNote(noteId) {
    try {
      await deleteNote(id, noteId);
      await loadRecipe();
    } catch {
      toast.error('שגיאה במחיקת הערה');
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

  if (!recipe) return null;

  return (
    <div className="recipe-detail">
      <Link to="/" className="btn btn-outline btn-sm" style={{ marginBottom: 16, display: 'inline-flex' }}>
        <FiArrowRight />
        חזרה למתכונים
      </Link>

      {recipe.image_url ? (
        <img src={recipe.image_url} alt={recipe.title} className="recipe-hero" />
      ) : (
        <div className="recipe-hero-placeholder">
          <GiMeal />
        </div>
      )}

      <h1 className="recipe-title">{recipe.title}</h1>

      <div className="recipe-meta">
        {recipe.tags?.map((tag, i) => (
          <span key={i} className="tag">{tag}</span>
        ))}
        {recipe.source_url && (
          <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem' }}>
            מקור המתכון ↗
          </a>
        )}
      </div>

      <div className="recipe-actions">
        <Link to={`/edit/${recipe.id}`} className="btn btn-secondary btn-sm">
          <FiEdit2 size={14} />
          ערוך
        </Link>
        <button onClick={handleDelete} className="btn btn-danger btn-sm">
          <FiTrash2 size={14} />
          מחק
        </button>
      </div>

      <div className="recipe-section">
        <h2>🧂 מרכיבים</h2>
        <ul className="ingredients-list">
          {recipe.ingredients?.map((ing, i) => (
            <li key={i}>
              <span className="ingredient-name">{ing.name}</span>
              <span className="ingredient-amount">{ing.amount}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="recipe-section">
        <h2>👨‍🍳 אופן ההכנה</h2>
        <ol className="instructions-list">
          {recipe.instructions?.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="recipe-section notes-section">
        <h2>📝 הערות לפעם הבאה</h2>
        {recipe.notes?.length > 0 ? (
          recipe.notes.map(note => (
            <div key={note.id} className="note-item">
              <div className="note-content">
                <div>{note.content}</div>
                <div className="note-date">
                  {new Date(note.created_at).toLocaleDateString('he-IL')}
                </div>
              </div>
              <button
                className="btn-icon"
                onClick={() => handleDeleteNote(note.id)}
                title="מחק הערה"
                style={{ flexShrink: 0 }}
              >
                <FiTrash2 size={14} />
              </button>
            </div>
          ))
        ) : (
          <p style={{ color: 'var(--text-light)', marginBottom: 12 }}>אין עדיין הערות</p>
        )}

        <div className="note-input-row">
          <input
            type="text"
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddNote()}
            placeholder="מה לנסות בפעם הבאה..."
            disabled={addingNote}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={handleAddNote}
            disabled={addingNote || !noteText.trim()}
          >
            <FiSend size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
