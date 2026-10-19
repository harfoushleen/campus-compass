// Switches between the map and the list view.
import { useI18n } from '../i18n/index.jsx';

export default function ViewToggle({ value, onChange }) {
  const { t } = useI18n();
  return (
    <div className="segmented" role="radiogroup">
      {['map', 'list'].map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          className={value === v ? 'active' : ''}
          onClick={() => onChange(v)}
        >
          {t(`${v}View`)}
        </button>
      ))}
    </div>
  );
}
