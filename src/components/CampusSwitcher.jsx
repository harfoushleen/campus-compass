// A small segmented toggle to pick a campus. Inactive campuses are shown as "Coming soon".
import { CAMPUSES } from '../data/campuses.js';
import { useI18n } from '../i18n/index.jsx';

export default function CampusSwitcher({ value, onChange }) {
  const { t } = useI18n();
  return (
    <div className="segmented" role="radiogroup" aria-label={t('campus')}>
      {CAMPUSES.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={value === c.id}
          className={value === c.id ? 'active' : ''}
          disabled={!c.active}
          onClick={() => onChange(c.id)}
        >
          {t(`campus.${c.id}`)}
          {!c.active && <span className="soon">{t('comingSoon')}</span>}
        </button>
      ))}
    </div>
  );
}
