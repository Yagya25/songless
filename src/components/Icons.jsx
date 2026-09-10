const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const Logo = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="9" fill="currentColor" opacity=".1" />
    <g fill="currentColor">
      <rect x="6"  y="14" width="2.6" height="4"  rx="1.3" opacity=".45" />
      <rect x="11" y="10" width="2.6" height="12" rx="1.3" opacity=".7" />
      <rect x="16" y="6"  width="2.6" height="20" rx="1.3" />
      <rect x="21" y="12" width="2.6" height="8"  rx="1.3" opacity=".7" />
      <rect x="26" y="15" width="2.6" height="2"  rx="1"   opacity=".45" />
    </g>
  </svg>
);

export const Play = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
  </svg>
);

export const Pause = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="7.5" y="5.5" width="3.4" height="13" rx="1.4" fill="currentColor" />
    <rect x="13.1" y="5.5" width="3.4" height="13" rx="1.4" fill="currentColor" />
  </svg>
);

export const Search = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...s} aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" />
  </svg>
);

export const Globe = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...s} aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.6 2.6 2.6 15.4 0 18M12 3c-2.6 2.6-2.6 15.4 0 18" />
  </svg>
);

export const Arrow = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...s} aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const Back = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...s} aria-hidden="true">
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);

export const Check = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...s} aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
);

export const Cross = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...s} aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const Skip = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...s} aria-hidden="true">
    <path d="M5 5v14l9-7z" /><path d="M18 5v14" />
  </svg>
);

export const Share = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...s} aria-hidden="true">
    <path d="M12 15V4M8 7.5 12 3.5l4 4" />
    <path d="M5 14v4.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V14" />
  </svg>
);
