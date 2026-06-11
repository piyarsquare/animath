import React from 'react';

/**
 * The redesign's legible stroke icon set (24 viewBox), ported from the design
 * prototype (docs/redesign/prototype/ui.jsx). The 11 panel archetypes draw
 * from this closed vocabulary — never add per-app icons (see
 * docs/redesign/DESIGN-SPEC.md §3).
 */
export const ICONS: Record<string, string> = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  fx: 'M16 6c-2 0-3 1-3.5 3.5L9 21M6 9h8', // function ƒ
  tune: 'M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M18 18h2M14 4v4M6 10v4M16 16v4',
  play: 'M7 5l12 7-12 7z',
  help: 'M9.2 9a3 3 0 1 1 4.3 2.7c-.9.5-1.5 1-1.5 2.3M12 17.5v.01',
  reset: 'M4 4v6h6M4 10a8 8 0 1 1 1.5 7',
  search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM21 21l-4.3-4.3',
  close: 'M6 6l12 12M18 6L6 18',
  chevron: 'M9 6l6 6-6 6',
  chevrondown: 'M6 9l6 6 6-6',
  pin: 'M9 4h6l-1 6 3 3H7l3-3-1-6zM12 16v4',
  sparkles: 'M12 3l1.8 4.5L18 9l-4.2 1.5L12 15l-1.8-4.5L6 9l4.2-1.5zM18 14l.8 2 .2 2 2-.8L19 18z',
  palette: 'M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1-1-2 1-1 2-1h1a3 3 0 0 0 3-3 8 8 0 0 0-8-7zM7.5 12.5v.01M9.5 8.5v.01M14.5 7.5v.01',
  camera: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM3 8l2-3h4l1 2h4l1-2h0M3 8h18v11H3z',
  waves: 'M3 8c2 0 2 2 4.5 2S10 8 12 8s2 2 4.5 2S19 8 21 8M3 14c2 0 2 2 4.5 2S10 14 12 14s2 2 4.5 2S19 14 21 14',
  domain: 'M4 4h16v16H4zM4 9h16M4 14h16M9 4v16M14 4v16',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M5 5l2 2M17 17l2 2M2 12h3M19 12h3M5 19l2-2M17 7l2-2',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 8v.01',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  flask: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M7 15h10',
  orbit: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM5.6 16C3.4 14.8 2 13 2 12c0-2.2 4.5-4 10-4s10 1.8 10 4-4.5 4-10 4',
  rotate: 'M4 4v6h6M20 20v-6h-6M20 9a8 8 0 0 0-15-2M4 15a8 8 0 0 0 15 2',
  back: 'M15 6l-6 6 6 6',
  list: 'M8 6h13M8 12h13M8 18h13M3 6v.01M3 12v.01M3 18v.01',
  move: 'M12 4v16M4 12h16M12 4l-3 3M12 4l3 3M12 20l-3-3M12 20l3-3M4 12l3-3M4 12l3 3M20 12l-3-3M20 12l-3 3',
  chart: 'M5 20V12M12 20V5M19 20v-6M3 20h18',
  window: 'M3 5h18v14H3zM3 9h18M6 7v.01',
  expand: 'M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5',
  shrink: 'M3 8h5V3M21 8h-5V3M16 21v-5h5M8 21v-5H3',
  /* transport glyphs for the action strip (utility icons, not archetypes) */
  pause: 'M8 5v14M16 5v14',
  step: 'M6 5l9 7-9 7zM18 5v14',
  finish: 'M4 5l7 7-7 7zM13 5l7 7-7 7',
};

export interface IconProps {
  name: string;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

export function Icon({ name, size = 18, style, className }: IconProps) {
  const d = ICONS[name] ?? ICONS.info;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      aria-hidden="true"
    >
      {d.split('M').filter(Boolean).map((seg, i) => <path key={i} d={'M' + seg} />)}
    </svg>
  );
}
