// Horizontally scrollable filter chips. Tapping the active chip again clears the filter.
import { CATEGORIES } from '../data/categories.js';
import { useI18n } from '../i18n/index.jsx';

export default function CategoryChips({ value, onChange }) {
  const { t } = useI18n();
  return (
    <div className="chips">
      <button
        type="button"
        className={`chip ${value === null ? 'active' : ''}`}
        aria-pressed={value === null}
        onClick={() => onChange(null)}
      >
        {t('all')}
      </button>
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`chip ${value === c.id ? 'active' : ''}`}
          style={{ '--chip-color': c.color }}
          aria-pressed={value === c.id}
          onClick={() => onChange(value === c.id ? null : c.id)}
        >
          <span className="dot" />
          {t(`category.${c.id}`)}
        </button>
      ))}
    </div>
  );
}
