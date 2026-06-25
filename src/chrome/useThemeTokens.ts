import { useEffect, useState, type RefObject } from 'react';
import { useThemeId, useThemeModeId } from './skins';

/** Normalize a token name to a CSS custom-property key (`accent` → `--accent`). */
function key(name: string): string {
  return name.startsWith('--') ? name : `--${name}`;
}

/**
 * Read the *resolved* values of a set of theme tokens off an element's computed
 * style. Use this in canvas/WebGL engines that can't read CSS variables directly:
 * pass the element whose scheme context the drawing lives in (the view body, or a
 * <Scheme> wrapper) so a forced mode resolves correctly, and the names you need
 * (`['viz-bg', 'data-1', 'fg']`). Returns a map keyed by the names you passed,
 * with values trimmed (e.g. `#04060c`).
 */
export function readThemeTokens(el: Element, names: string[]): Record<string, string> {
  const cs = getComputedStyle(el);
  const out: Record<string, string> = {};
  for (const n of names) out[n] = cs.getPropertyValue(key(n)).trim();
  return out;
}

/**
 * Reactive token reader (theming v2 rule #3). Returns the resolved values of the
 * requested tokens and **re-reads whenever the theme identity or mode changes**,
 * so a canvas can redraw on a skin/mode switch without a reload. Pass `ref` to
 * read inside a forced-mode subtree (a <Scheme> wrapper or the view body);
 * otherwise it reads from the document root.
 *
 * The returned object's identity changes only when a value actually changes, so
 * it's safe in effect dependency arrays for "redraw on theme change".
 */
export function useThemeTokens(
  names: string[],
  ref?: RefObject<HTMLElement | null>,
): Record<string, string> {
  const themeId = useThemeId();
  const themeMode = useThemeModeId();
  const nameKey = names.join(',');
  const [tokens, setTokens] = useState<Record<string, string>>({});

  useEffect(() => {
    const el = ref?.current ?? document.documentElement;
    const next = readThemeTokens(el, names);
    setTokens(prev => {
      // Preserve identity when nothing changed, so downstream redraw effects that
      // depend on this object don't fire on unrelated re-renders.
      const sameKeys = Object.keys(next).length === Object.keys(prev).length;
      if (sameKeys && names.every(n => prev[n] === next[n])) return prev;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId, themeMode, nameKey, ref]);

  return tokens;
}
