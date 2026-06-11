/**
 * The Esc layer stack — pure logic, no DOM (unit-tested; the window wiring
 * lives in useEscLayer.ts).
 *
 * Transient chrome layers (menus, sheets, modals, fullscreen) register while
 * active; Escape closes only the most recently opened one, peeling layers
 * one keypress at a time. Persistent panels never register — they close via
 * ✕ only (CHROME-REVIEW P4a, staged Esc).
 */
export interface EscStack {
  /** Register an active layer; returns its release function. */
  push(close: () => void): () => void;
  /** Close the top layer. Returns true if a layer consumed the Escape. */
  handleEscape(): boolean;
  depth(): number;
}

export function createEscStack(): EscStack {
  const stack: { close: () => void }[] = [];
  return {
    push(close) {
      const entry = { close };
      stack.push(entry);
      return () => {
        const i = stack.indexOf(entry);
        if (i >= 0) stack.splice(i, 1);
      };
    },
    handleEscape() {
      const top = stack[stack.length - 1];
      if (!top) return false;
      top.close();
      return true;
    },
    depth: () => stack.length,
  };
}
