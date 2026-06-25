import React, { useCallback, useEffect, useState } from 'react';
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

/**
 * The three theme modes (theming v2). A theme is an IDENTITY (`data-theme`) that
 * exists in three modes (`data-scheme`):
 *  - `native` — the theme's intrinsic look (the default; Observatory dark, Paper
 *    light). CSS resolves every token to its `-n` family member.
 *  - `light` / `dark` — force that mode; tokens resolve to the theme's `-lt`/`-dk`
 *    companions, falling back to native for any companion the theme didn't author.
 * Features that *require* a mode (a glowing star stage → dark; a printout → light)
 * force it on their own subtree via {@link Scheme}; everything else inherits the
 * user's choice.
 */
export type ThemeMode = 'native' | 'light' | 'dark';
export const THEME_MODES: ThemeMode[] = ['native', 'light', 'dark'];

/** Whether a skin id is intrinsically light in its NATIVE mode — the source of
 *  truth for native light/dark branching. Defaults to false for unknown ids.
 *  Mode-aware callers should use {@link resolveScheme} instead, which accounts
 *  for a forced light/dark mode. */
export function isLightSkin(id: string): boolean {
  return SKINS.find(s => s.id === id)?.light ?? false;
}

/** The concrete light/dark scheme a (theme, mode) pair actually renders as —
 *  `native` collapses to the theme's intrinsic side. Use this anywhere code must
 *  know "is the surface light or dark right now" (gallery previews, canvas
 *  contrast choices) so the answer tracks both axes. */
export function resolveScheme(id: string, mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'light') return 'light';
  if (mode === 'dark') return 'dark';
  return isLightSkin(id) ? 'light' : 'dark';
}

const SKIN_KEY = 'animath:v1:chrome:skin';
const MODE_KEY = 'animath:v1:chrome:mode';
const DEFAULT_SKIN = 'dark';
const DEFAULT_MODE: ThemeMode = 'native';

function loadSkin(): string {
  try {
    const raw = window.localStorage.getItem(SKIN_KEY);
    if (raw && SKINS.some(s => s.id === raw)) return raw;
  } catch { /* private mode */ }
  return DEFAULT_SKIN;
}

function loadMode(): ThemeMode {
  try {
    const raw = window.localStorage.getItem(MODE_KEY);
    if (raw && (THEME_MODES as string[]).includes(raw)) return raw as ThemeMode;
  } catch { /* private mode */ }
  return DEFAULT_MODE;
}

/** Reflect identity × mode on the root element: `data-theme` selects the token
 *  blocks, `data-scheme` selects the mode (native/light/dark). The mode blocks
 *  also set `color-scheme`, so native UA widgets (`<select>` popups) render on the
 *  right side for forced modes; in native mode the theme block's intrinsic
 *  `color-scheme` applies. */
function applySkinAttrs(id: string, mode: ThemeMode): void {
  const el = document.documentElement;
  el.setAttribute('data-theme', id);
  el.setAttribute('data-scheme', mode);
}

/** Apply the persisted identity + mode to <html>. Call once at boot, before render. */
export function applyPersistedSkin(): void {
  applySkinAttrs(loadSkin(), loadMode());
}

/**
 * The current skin id + setter. The value is derived from the live `data-theme`
 * attribute (via {@link useThemeId}), NOT a private `useState` — so every
 * useSkin/useThemeId consumer (gallery, top bar, in-app controls) stays in sync
 * the instant ANY of them, or boot, changes the skin. Without this, a second
 * useSkin instance reading the skin would go stale until a page reload, because
 * independent useState copies don't observe each other. Setting a skin applies
 * the attrs immediately (restyling all chrome) and persists the choice; the
 * current mode is preserved.
 */
export function useSkin(): [string, (id: string) => void] {
  const skin = useThemeId();
  const setSkin = useCallback((id: string) => {
    applySkinAttrs(id, loadMode());
    try { window.localStorage.setItem(SKIN_KEY, id); } catch { /* ignore */ }
  }, []);
  return [skin, setSkin];
}

/** The current theme mode + setter — reactive on `data-scheme`. Setting a mode
 *  re-themes everything live (the shared mode blocks reselect every token) and
 *  persists the choice; the current identity is preserved. */
export function useThemeMode(): [ThemeMode, (mode: ThemeMode) => void] {
  const mode = useThemeModeId();
  const setMode = useCallback((m: ThemeMode) => {
    applySkinAttrs(loadSkin(), m);
    try { window.localStorage.setItem(MODE_KEY, m); } catch { /* ignore */ }
  }, []);
  return [mode, setMode];
}

/** Reactive reader for a single root attribute, defaulting when absent. Shared by
 *  the theme-id and theme-mode hooks so both stay in sync with any writer. */
function useRootAttr<T extends string>(attr: string, fallback: T): T {
  const read = () => (typeof document !== 'undefined'
    ? (document.documentElement.getAttribute(attr) as T | null) ?? fallback
    : fallback);
  const [val, setVal] = useState<T>(read);
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setVal((el.getAttribute(attr) as T | null) ?? fallback));
    obs.observe(el, { attributes: true, attributeFilter: [attr] });
    setVal(read()); // sync in case it changed between first render and effect
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attr]);
  return val;
}

/**
 * Read-only, reactive current skin id — tracks `data-theme` on the root element,
 * so it updates when the skin changes anywhere (e.g. the top-bar SkinPicker),
 * without the caller threading skin state. Use this to feed theme-aware controls
 * like `<ColormapPicker themeId={…}>`.
 */
export function useThemeId(): string {
  return useRootAttr('data-theme', DEFAULT_SKIN);
}

/** Read-only, reactive current theme mode — tracks `data-scheme` on the root. */
export function useThemeModeId(): ThemeMode {
  return useRootAttr<ThemeMode>('data-scheme', DEFAULT_MODE);
}

const MODE_LABELS: Record<ThemeMode, string> = { native: 'Native', light: 'Light', dark: 'Dark' };

/** Pill button (swatch dots + name) opening the identity + mode picker. The menu
 *  lists the color identities and carries a Native/Light/Dark mode toggle, so the
 *  two theming axes (identity × mode) are chosen in one place. `mode`/`onSetMode`
 *  are optional so legacy callers that only pick an identity still compile. */
export function SkinPicker({ skin, onSetSkin, mode, onSetMode, compact }: {
  skin: string;
  onSetSkin: (id: string) => void;
  mode?: ThemeMode;
  onSetMode?: (mode: ThemeMode) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const cur = SKINS.find(s => s.id === skin) ?? SKINS[0];
  useEscLayer(open, () => setOpen(false));
  return (
    <div style={{ position: 'relative' }}>
      <button className="am-skin-btn" title="Theme" aria-label={`Theme: ${cur.name}`} onClick={() => setOpen(m => !m)}>
        <span className="am-skin-dots">{cur.dots.map((d, i) => <i key={i} style={{ background: d }} />)}</span>
        {!compact && <span>{cur.name}</span>}
        <Icon name="chevrondown" size={12} style={{ opacity: 0.6 }} />
      </button>
      {open && (
        <>
          <div className="am-menu-scrim" onPointerDown={() => setOpen(false)} />
          <div className="am-skin-menu">
            {mode && onSetMode && (
              <div className="am-skin-mode">
                <div className="am-lay-group" style={{ padding: '10px 14px 5px' }}>Mode</div>
                <div className="am-pills" role="tablist" aria-label="Theme mode">
                  {THEME_MODES.map(m => (
                    <button
                      key={m}
                      role="tab"
                      aria-selected={m === mode}
                      className={`am-pill ${m === mode ? 'am-on' : ''}`}
                      onClick={() => onSetMode(m)}
                    >{MODE_LABELS[m]}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="am-lay-group">Themes</div>
            {SKINS.map(s => (
              <button
                key={s.id}
                className={`am-skin-item ${s.id === skin ? 'am-on' : ''}`}
                onClick={() => { onSetSkin(s.id); }}
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
