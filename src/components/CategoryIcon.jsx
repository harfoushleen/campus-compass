// Category icon, and the same icon in a coloured round badge (used in chips, lists and the details sheet).
import { getCategory } from '../data/categories.js';

export function CategoryIcon({ id, size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d={getCategory(id).icon} fill="currentColor" />
    </svg>
  );
}

export function CategoryBadge({ id, size = 14 }) {
  const c = getCategory(id);
  return (
    <span className="cat-badge" style={{ '--cat-color': c.color, '--cat-ink': c.ink }}>
      <CategoryIcon id={id} size={size} />
    </span>
  );
}
