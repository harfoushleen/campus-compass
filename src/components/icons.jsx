// Small interface icons (24 × 24, drawn with the current text colour). Use <MenuIcon size={18} />.
const make = (paths, extraClass = '') =>
  function Icon({ size = 20, className = '', ...rest }) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${extraClass} ${className}`.trim()}
        {...rest}
      >
        {paths}
      </svg>
    );
  };

export const MenuIcon = make(<path d="M4 7h16M4 12h16M4 17h16" />);
export const SearchIcon = make(
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </>
);
export const CloseIcon = make(<path d="M6 6l12 12M18 6L6 18" />);
export const ChevronIcon = make(<path d="M7 10l5 5 5-5" />);
export const BackIcon = make(<path d="M15 5l-7 7 7 7" />, 'flip-rtl'); // flips in right-to-left languages
export const ForwardIcon = make(<path d="M9 5l7 7-7 7" />, 'flip-rtl');
export const SunIcon = make(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>
);
export const MoonIcon = make(<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.8 6.8 0 0 0 9.8 9.8z" />);
