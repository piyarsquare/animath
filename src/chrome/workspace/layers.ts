/**
 * The chrome's z-layer scale — one place, named, ordered. Inline styles use
 * these constants; theme.css mirrors them as `--z-*` tokens on :root (keep
 * the two in sync — grep "LAYER" there).
 *
 * Windows (panels + views) stack at `window + z` where z is compacted to
 * 1..n by `sanitize()`/`raiseWindow()` (layouts.ts), so window z can never
 * creep up to `fullscreen`. While a view is fullscreen, panels re-base at
 * `overFull` so the rail keeps working (CHROME-REVIEW P4a).
 */
export const LAYER = {
  guides: 24,
  /** Base for panel/view windows: zIndex = window + z (z ≤ open windows). */
  window: 30,
  topbar: 30,
  phoneDock: 40,
  phoneScrim: 45,
  phoneSheet: 50,
  railTip: 60,
  menuScrim: 70,
  menu: 71,
  /** A fullscreen view (.am-ws-full) and the stage hosting it. */
  fullscreen: 100,
  /** Base for panels while a view is fullscreen: zIndex = overFull + z. */
  overFull: 110,
  /** The always-on action strip — above every window, even in fullscreen. */
  actionbar: 130,
  /** Modals (explainer) — above fullscreen, portaled to <body>. */
  modal: 150,
  rail: 200,
} as const;
