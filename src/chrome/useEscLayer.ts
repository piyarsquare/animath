import { useEffect, useRef } from 'react';
import { createEscStack } from './escStack';

/** The app-wide stack; one capture-phase keydown listener while non-empty. */
const stack = createEscStack();
let listening = false;
const onKey = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  // A chrome layer consumes the Escape — keep it from app-level key handlers.
  if (stack.handleEscape()) {
    e.preventDefault();
    e.stopPropagation();
  }
};
const sync = () => {
  const want = stack.depth() > 0;
  if (want && !listening) { window.addEventListener('keydown', onKey, true); listening = true; }
  if (!want && listening) { window.removeEventListener('keydown', onKey, true); listening = false; }
};

/**
 * Register a transient layer (menu / sheet / modal / fullscreen) with the
 * single Esc owner while `active`. Escape closes the most recently opened
 * layer only — replaces the per-component keydown listeners.
 */
export function useEscLayer(active: boolean, close: () => void) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!active) return;
    const release = stack.push(() => closeRef.current());
    sync();
    return () => { release(); sync(); };
  }, [active]);
}
