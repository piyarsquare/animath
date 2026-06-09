import { useEffect, useRef, useState } from 'react';

/**
 * Lightweight settings persistence backed by localStorage.
 *
 * `usePersistentState` is a drop-in replacement for `useState` that mirrors its
 * value to localStorage, so a user's choices survive a reload (and switching
 * apps and back). Pass `key = null` to disable persistence — the hook is still
 * called unconditionally, so React's hook order stays stable whether or not an
 * app opts in.
 *
 * Keys are namespaced under `animath:<version>:` so we can invalidate every
 * stored setting at once by bumping VERSION (e.g. after an incompatible change
 * to what a value means). Every storage access is wrapped in try/catch because
 * private-mode browsers throw on access, and writes are debounced so dragging a
 * slider doesn't hammer storage on every animation frame.
 */

/** Bump when stored values change meaning incompatibly; old keys are ignored. */
const VERSION = 'v1';
const PREFIX = `animath:${VERSION}:`;

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function usePersistentState<T>(key: string | null, initial: T) {
  const [value, setValue] = useState<T>(() => (key ? load(key, initial) : initial));
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!key || typeof window === 'undefined') return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
      } catch {
        /* quota exceeded / private mode — silently skip */
      }
    }, 150);
    return () => clearTimeout(timer.current);
  }, [key, value]);

  return [value, setValue] as const;
}

/**
 * Remove every persisted key under a namespace (e.g. 'complex-particles'), so a
 * "Reset to defaults" can wipe one app's saved settings. Callers typically clear
 * then reload so the components re-initialize from their defaults.
 */
export function clearPersistedState(namespace: string): void {
  if (typeof window === 'undefined') return;
  try {
    const full = `${PREFIX}${namespace}:`;
    const doomed: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(full)) doomed.push(k);
    }
    doomed.forEach(k => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
