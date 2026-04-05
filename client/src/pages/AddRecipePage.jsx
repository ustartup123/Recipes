import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit3, FiLink, FiFileText, FiVideo } from 'react-icons/fi';
import toast from 'react-hot-toast';
import RecipeForm from '../components/RecipeForm';
import { createRecipe, parseRecipeFromUrl, parseRecipeFromText, parseRecipeFromVideo } from '../api';

function isYouTubeUrl(url) {
  return /(?:youtube\.com\/(?:watch\?|embed\/|v\/|shorts\/)|youtu\.be\/)/.test(url);
}

export default function AddRecipePage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState('manual');
  const [url, setUrl] = useState('');
  const [freeText, setFreeText] = useState('');
  const [parsedRecipe, setParsedRecipe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);

  async function handleCreate(recipe) {
    setLoading(true);
    try {
      const created = await createRecipe(recipe);
      toast.success('המתכון נוצר בהצלחה!');
      navigate(`/recipe/${created.id}`);
    } catch {
      toast.error('שגיאה ביצירת המתכון');
    } finally {
      setLoading(false);
    }
  }

  async function handleParseUrl() {
    if (!url.trim()) return;
    setParsing(true);
    try {
      let data;
      if (isYouTubeUrl(url)) {
        data = await parseRecipeFromVideo(url);
        toast.success('המתכון חולץ מהסרטון בהצלחה!');
      } else {
        data = await parseRecipeFromUrl(url);
        toast.success('המתכון יובא בהצלחה!');
      }
      setParsedRecipe(data);
      setMethod('manual');
    } catch (error) {
      toast.error(error.message || 'לא הצלחנו לייבא את המתכון מהקישור');
    } finally {
      setParsing(false);
    }
  }

  async function handleParseText() {
    if (!freeText.trim()) return;
    setParsing(true);
    try {
      const data = await parseRecipeFromText(freeText);
      setParsedRecipe(data);
      setMethod('manual');
      toast.success('המתכון עובד בהצלחה!');
    } catch {
      toast.error('לא הצלחנו לעבד את הטקסט');
    } finally {
      setParsing(false);
    }
  }

  return (
    <div className="add-recipe-page">
      <h1 style={{ fontSize: '1.6rem', marginBottom: 24 }}>מתכון חדש</h1>

      <div className="import-methods">
        <button
          className={`method-btn ${method === 'manual' ? 'active' : ''}`}
          onClick={() => setMethod('manual')}
        >
          <span className="method-icon"><FiEdit3 /></span>
          <span className="method-label">הזנה ידנית</span>
        </button>
        <button
          className={`method-btn ${method === 'url' ? 'active' : ''}`}
          onClick={() => setMethod('url')}
        >
          <span className="method-icon"><FiLink /></span>
          <span className="method-label">ייבוא מקישור</span>
        </button>
        <button
          className={`method-btn ${method === 'video' ? 'active' : ''}`}
          onClick={() => setMethod('video')}
        >
          <span className="method-icon"><FiVideo /></span>
          <span className="method-label">ייבוא מסרטון</span>
        </button>
        <button
          className={`method-btn ${method === 'text' ? 'active' : ''}`}
          onClick={() => setMethod('text')}
        >
          <span className="method-icon"><FiFileText /></span>
          <span className="method-label">טקסט חופשי</span>
        </button>
      </div>

      {method === 'url' && (
        <div style={{ marginBottom: 24 }}>
          <div className="form-group">
            <label>הדבק קישור למתכון</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com/recipe"
              dir="ltr"
            />
            {url && isYouTubeUrl(url) && (
              <small style={{ color: '#666', marginTop: 4, display: 'block' }}>
                זוהה קישור YouTube - נחלץ מתכון מהכתוביות
              </small>
            )}
          </div>
          <button
            className="btn btn-primary"
            onClick={handleParseUrl}
            disabled={parsing || !url.trim()}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {parsing ? (
              <>
                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                {isYouTubeUrl(url) ? 'מחלץ מתכון מסרטון...' : 'מייבא מתכון...'}
              </>
            ) : (isYouTubeUrl(url) ? 'חלץ מתכון מסרטון' : 'ייבא מתכון')}
          </button>
        </div>
      )}

      {method === 'video' && (
        <div style={{ marginBottom: 24 }}>
          <div className="form-group">
            <label>הדבק קישור לסרטון YouTube</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              dir="ltr"
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleParseUrl}
            disabled={parsing || !url.trim()}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {parsing ? (
              <>
                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                מחלץ מתכון מסרטון...
              </>
            ) : 'חלץ מתכון מסרטון'}
          </button>
          <small style={{ color: '#888', marginTop: 8, display: 'block', textAlign: 'center' }}>
            המערכת תחלץ את המתכון מכתוביות הסרטון באמצעות AI
          </small>
        </div>
      )}

      {method === 'text' && (
        <div style={{ marginBottom: 24 }}>
          <div className="form-group">
            <label>הדבק טקסט חופשי של מתכון</label>
            <textarea
              value={freeText}
              onChange={e => setFreeText(e.target.value)}
              placeholder="הדבק כאן מתכון בכל פורמט - המערכת תעבד אותו אוטומטית"
              style={{ minHeight: 200 }}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleParseText}
            disabled={parsing || !freeText.trim()}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {parsing ? (
              <>
                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                מעבד מתכון...
              </>
            ) : 'עבד מתכון'}
          </button>
        </div>
      )}

      {(method === 'manual' || parsedRecipe) && (
        <RecipeForm
          initial={parsedRecipe}
          onSubmit={handleCreate}
          loading={loading}
        />
      )}
    </div>
  );
}
