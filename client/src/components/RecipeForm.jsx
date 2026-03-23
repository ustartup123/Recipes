import { useState } from 'react';
import { FiPlus, FiX, FiTrash2 } from 'react-icons/fi';

export default function RecipeForm({ initial, onSubmit, loading }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [ingredients, setIngredients] = useState(
    initial?.ingredients?.length > 0
      ? initial.ingredients
      : [{ name: '', amount: '' }]
  );
  const [instructions, setInstructions] = useState(
    initial?.instructions?.length > 0
      ? initial.instructions
      : ['']
  );
  const [tags, setTags] = useState(initial?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [imageUrl, setImageUrl] = useState(initial?.image_url || '');

  const addIngredient = () => setIngredients([...ingredients, { name: '', amount: '' }]);
  const removeIngredient = (i) => setIngredients(ingredients.filter((_, idx) => idx !== i));
  const updateIngredient = (i, field, value) => {
    const updated = [...ingredients];
    updated[i] = { ...updated[i], [field]: value };
    setIngredients(updated);
  };

  const addInstruction = () => setInstructions([...instructions, '']);
  const removeInstruction = (i) => setInstructions(instructions.filter((_, idx) => idx !== i));
  const updateInstruction = (i, value) => {
    const updated = [...instructions];
    updated[i] = value;
    setInstructions(updated);
  };

  const addTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tag) => setTags(tags.filter(t => t !== tag));

  const handleSubmit = (e) => {
    e.preventDefault();
    const validIngredients = ingredients.filter(i => i.name.trim());
    const validInstructions = instructions.filter(i => i.trim());
    onSubmit({
      title,
      ingredients: validIngredients,
      instructions: validInstructions,
      tags,
      image_url: imageUrl || null
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>שם המתכון</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="למשל: עוגת שוקולד"
          required
        />
      </div>

      <div className="form-group">
        <label>תמונה (קישור)</label>
        <input
          type="url"
          value={imageUrl}
          onChange={e => setImageUrl(e.target.value)}
          placeholder="https://example.com/image.jpg"
        />
      </div>

      <div className="form-group">
        <label>מרכיבים</label>
        {ingredients.map((ing, i) => (
          <div key={i} className="ingredient-row">
            <input
              type="text"
              value={ing.name}
              onChange={e => updateIngredient(i, 'name', e.target.value)}
              placeholder="שם המרכיב"
            />
            <input
              type="text"
              value={ing.amount}
              onChange={e => updateIngredient(i, 'amount', e.target.value)}
              placeholder="כמות"
            />
            {ingredients.length > 1 && (
              <button type="button" className="btn-icon" onClick={() => removeIngredient(i)} title="הסר">
                <FiTrash2 size={14} />
              </button>
            )}
          </div>
        ))}
        <button type="button" className="btn btn-secondary btn-sm" onClick={addIngredient}>
          <FiPlus size={14} />
          הוסף מרכיב
        </button>
      </div>

      <div className="form-group">
        <label>אופן ההכנה</label>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: 8 }}>
          חשוב לכלול את כמויות המרכיבים בתוך ההוראות
        </p>
        {instructions.map((inst, i) => (
          <div key={i} className="instruction-row">
            <span className="step-num">{i + 1}</span>
            <textarea
              value={inst}
              onChange={e => updateInstruction(i, e.target.value)}
              placeholder={`שלב ${i + 1} - כולל כמויות (למשל: לערבב 500 גרם קמח עם ליטר מים)`}
            />
            {instructions.length > 1 && (
              <button type="button" className="btn-icon" onClick={() => removeInstruction(i)} title="הסר">
                <FiTrash2 size={14} />
              </button>
            )}
          </div>
        ))}
        <button type="button" className="btn btn-secondary btn-sm" onClick={addInstruction}>
          <FiPlus size={14} />
          הוסף שלב
        </button>
      </div>

      <div className="form-group">
        <label>תגיות</label>
        <div className="tags-input" onClick={e => e.currentTarget.querySelector('input')?.focus()}>
          {tags.map((tag, i) => (
            <span key={i} className="tag tag-removable" onClick={() => removeTag(tag)}>
              {tag}
              <FiX className="tag-close" />
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={addTag}
            placeholder={tags.length === 0 ? 'הקלד תגית ולחץ Enter' : ''}
          />
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
        {loading ? 'שומר...' : 'שמור מתכון'}
      </button>
    </form>
  );
}
