// Filter chips (wrapping, in the side panel). Tapping the active chip again clears the filter.
// Only categories that have at least one place on the current campus are shown.
import { CATEGORIES } from '../data/categories.js';
import { useI18n } from '../i18n/index.jsx';
import { CategoryIcon } from './CategoryIcon.jsx';

export default function CategoryChips({ value, onChange, available }) {
  const { t } = useI18n();
  return (
    <div className="chips">
      <button
        type="button"
        className={`chip plain ${value === null ? 'active' : ''}`}
        aria-pressed={value === null}
        onClick={() => onChange(null)}
      >
        {t('all')}
      </button>
      {CATEGORIES.filter((c) => !available || available.has(c.id)).map((c) => (
        <button
          key={c.id}
          type="button"
          className={`chip ${value === c.id ? 'active' : ''}`}
          style={{ '--chip-color': c.color, '--chip-ink': c.ink }}
          aria-pressed={value === c.id}
          onClick={() => onChange(value === c.id ? null : c.id)}
        >
          <span className="chip-icon">
            <CategoryIcon id={c.id} size={13} />
          </span>
          {t(`category.${c.id}`)}
        </button>
      ))}
    </div>
  );
}
