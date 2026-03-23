import { useNavigate } from 'react-router-dom';
import { GiMeal } from 'react-icons/gi';

export default function RecipeCard({ recipe }) {
  const navigate = useNavigate();

  return (
    <div className="card recipe-card" onClick={() => navigate(`/recipe/${recipe.id}`)}>
      <div className="recipe-card-image">
        {recipe.image_url ? (
          <img src={recipe.image_url} alt={recipe.title} />
        ) : (
          <GiMeal />
        )}
      </div>
      <div className="recipe-card-body">
        <div className="recipe-card-title">{recipe.title}</div>
        <div className="recipe-card-tags">
          {recipe.tags?.map((tag, i) => (
            <span key={i} className="tag">{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
