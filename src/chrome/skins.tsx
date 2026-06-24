import React, { useEffect, useState } from 'react';
import { Icon } from './icons';
import { useEscLayer } from './useEscLayer';

/**
 * Skins — the eight switchable styling systems on `data-theme` (see
 * docs/redesign/DESIGN-SPEC.md §5). Adding a skin = one token block in
 * src/chrome/theme.css + one entry here.
 */
export interface Skin {
  id: string;
  name: string;
  blurb: string;
  /** Three swatch colors shown in the picker. */
  dots: [string, string, string];
  /** True when this skin renders on a light viz background (`color-scheme:
   *  light` in theme.css). Drives gallery-preview light/dark rendering — never
   *  test `id === 'light'`, which misses the other light skins. */
  light?: boolean;
}

export const SKINS: Skin[] = [
  { id: 'dark', name: 'Observatory', blurb: 'Ink blue · refined gold', dots: ['#0a0c12', '#ffce47', '#5fe3cd'] },
  { id: 'light', name: 'Paper', blurb: 'Warm paper · deep amber', dots: ['#f0ede4', '#b67d10', '#1d8a78'], light: true },
  { id: 'neon', name: 'Spectrum', blurb: 'Space black · cyan + magenta', dots: ['#05060f', '#34e6cf', '#ff5aa6'] },
  { id: 'blueprint', name: 'Blueprint', blurb: 'Drafting blue · chalk lines', dots: ['#102650', '#f2f6ff', '#69a8ff'] },
  { id: 'phosphor', name: 'Phosphor', blurb: 'CRT green · all mono', dots: ['#04130a', '#3dff7a', '#b5ffce'] },
  { id: 'daylight', name: 'Daylight', blurb: 'Cool white · clear blue', dots: ['#eef2f8', '#2f6fe0', '#e0683a'], light: true },
  { id: 'primary', name: 'Primary', blurb: 'Bauhaus · bold primaries', dots: ['#f0eee8', '#f5c518', '#1f4fd6'], light: true },
  { id: 'mirage', name: 'Mirage', blurb: 'Surreal dusk · peach + lavender', dots: ['#1a1230', '#ffb37a', '#b08cff'] },
];

/** Whether a skin id renders on a light viz background — the single source of
 *  truth for light/dark branching (e.g. gallery previews). Defaults to false
 *  for unknown ids. */
export function isLightSkin(id: string): boolean {
  return SKINS.find(s => s.id === id)?.light ?? false;
}

const SKIN_KEY = 'animath:v1:chrome:skin';
const DEFAULT_SKIN = 'dark';

function loadSkin(): string {
  try {
    const raw = window.localStorage.getItem(SKIN_KEY);
    if (raw && SKINS.some(s => s.id === raw)) return raw;
  } catch { /* private mode */ }
  return DEFAULT_SKIN;
}

/** Apply the persisted skin to <html data-theme>. Call once at boot, before render. */
export function applyPersistedSkin(): void {
  document.documentElement.setAttribute('data-theme', loadSkin());
}

/**
 * The current skin id + setter. Setting a skin updates `data-theme` on the
 * root element (restyling all chrome) and persists the choice.
 */
export function useSkin(): [string, (id: string) => void] {
  const [skin, setSkinState] = useState(loadSkin);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', skin);
    try { window.localStorage.setItem(SKIN_KEY, skin); } catch { /* ignore */ }
  }, [skin]);
  return [skin, setSkinState];
}

/**
 * Read-only, reactive current skin id — tracks `data-theme` on the root element,
 * so it updates when the skin changes anywhere (e.g. the top-bar SkinPicker),
 * without the caller threading skin state. Use this to feed theme-aware controls
 * like `<ColormapPicker themeId={…}>`.
 */
export function useThemeId(): string {
  const read = () => (typeof document !== 'undefined'
    ? document.documentElement.getAttribute('data-theme') ?? DEFAULT_SKIN
    : DEFAULT_SKIN);
  const [id, setId] = useState(read);
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setId(el.getAttribute('data-theme') ?? DEFAULT_SKIN));
    obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    setId(read()); // sync in case it changed between first render and effect
    return () => obs.disconnect();
  }, []);
  return id;
}

/** Pill button (swatch dots + name) opening the skins dropdown. */
export function SkinPicker({ skin, onSetSkin, compact }: {
  skin: string;
  onSetSkin: (id: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const cur = SKINS.find(s => s.id === skin) ?? SKINS[0];
  useEscLayer(open, () => setOpen(false));
  return (
    <div style={{ position: 'relative' }}>
      <button className="am-skin-btn" title="Skin" aria-label={`Skin: ${cur.name}`} onClick={() => setOpen(m => !m)}>
        <span className="am-skin-dots">{cur.dots.map((d, i) => <i key={i} style={{ background: d }} />)}</span>
        {!compact && <span>{cur.name}</span>}
        <Icon name="chevrondown" size={12} style={{ opacity: 0.6 }} />
      </button>
      {open && (
        <>
          <div className="am-menu-scrim" onPointerDown={() => setOpen(false)} />
          <div className="am-skin-menu">
            <div className="am-lay-group">Skins</div>
            {SKINS.map(s => (
              <button
                key={s.id}
                className={`am-skin-item ${s.id === skin ? 'am-on' : ''}`}
                onClick={() => { onSetSkin(s.id); setOpen(false); }}
              >
                <span className="am-skin-dots">{s.dots.map((d, i) => <i key={i} style={{ background: d }} />)}</span>
                <span className="am-skin-meta"><span>{s.name}</span><span className="am-skin-blurb">{s.blurb}</span></span>
                {s.id === skin && <Icon name="chevron" size={13} style={{ marginLeft: 'auto', color: 'var(--accent)' }} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
