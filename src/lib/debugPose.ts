// src/lib/debugPose.ts
//
// Shared "debug-pose deep link" helpers for the headless verification harness.
//
// The cloud/CI container renders the app in headless software WebGL (see
// docs/HEADLESS_WEBGL.md) but `scripts/shoot.mjs` could only ever capture an
// app's *default* view. These helpers let a route carry a pose in its hash
// query (`#/solid-worlds?world=amphicosm&x=0.1&yaw=1.5&hud`), so an exact frame
// can be reproduced and eyeballed — turning "verified headless" from a blind
// hypothesis into a reproducible visual diff.
//
// This module is app-agnostic: it parses the query and offers typed accessors.
// Each app maps the params it understands (position semantics differ — a 3D cube
// cell vs a 2D chart square — by design); unknown params are ignored, so an app
// can extend the vocabulary without touching this helper.
//
// Documented param vocabulary (see docs/HEADLESS_WEBGL.md):
//   world=<id>   look=<id>   cam=first|third   camd=<n>
//   yaw=<rad>    pitch=<rad>
//   x,y,z=<n>    (SolidWorlds cube position, -1..1)
//   u,v=<n>      (PolygonWorlds chart position, 0..1)
//   hud | debug=1   show the opt-in dev HUD
//   freeze | t=<s>  pin the animation clock for a reproducible frame

/** Read the hash-query params (`#/route?a=1&b=2` → URLSearchParams). SSR-safe. */
export function poseParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.hash.split('?')[1] ?? '');
}

/** A finite number param, or the default. */
export function pNum(p: URLSearchParams, key: string, dflt: number): number {
  const v = p.get(key);
  const n = v == null ? NaN : parseFloat(v);
  return Number.isFinite(n) ? n : dflt;
}

/** A boolean param: bare-present, `1/true/yes/on` → true; `0/false/no/off` → false. */
export function pBool(p: URLSearchParams, key: string, dflt: boolean): boolean {
  if (!p.has(key)) return dflt;
  const v = (p.get(key) ?? '').trim().toLowerCase();
  if (v === '' || v === '1' || v === 'true' || v === 'yes' || v === 'on') return true;
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
  return dflt;
}

/** A string param, or the default. */
export function pStr(p: URLSearchParams, key: string, dflt: string): string {
  const v = p.get(key);
  return v == null || v === '' ? dflt : v;
}

/** Is the opt-in dev HUD requested? (`?hud` or `?debug=1`). */
export function hudEnabled(p: URLSearchParams = poseParams()): boolean {
  return p.has('hud') || pBool(p, 'debug', false);
}

/**
 * The frozen animation time, in seconds, or null if not requested.
 *
 * A reproducible screenshot needs a deterministic frame, but the walkers run a
 * wall-clock rAF loop — two shots of the same URL can differ. `?freeze` pins the
 * clock at 0; `?t=<seconds>` pins it at a chosen time. Apps that honor this feed
 * the returned value to their animation in place of the live delta.
 */
export function frozenTime(p: URLSearchParams = poseParams()): number | null {
  if (p.has('t')) return pNum(p, 't', 0);
  if (p.has('freeze')) return 0;
  return null;
}

/**
 * The app-agnostic diagnostic snapshot rendered by the dev HUD. An app fills the
 * fields it can; the HUD shows whichever are present.
 *
 * `determinant` and `cell` echo state the app's own probe reads — so they alone
 * can't certify a frame (a HUD reading the same possibly-wrong state is an echo,
 * not a check). `witness` is the *independent* cross-check: a quantity computed by
 * a different path than the chart's bookkeeping — PolygonWorlds' geometric ink
 * handedness (`debugProbe`), SolidWorlds' per-frame body-frame continuity jump —
 * that a wrong-sheet placement reveals even when the determinant looks right.
 */
export interface DebugState {
  /** Selected world / spec id. */
  world?: string;
  /** Selected scene look. */
  look?: string;
  /** Player position (2D apps omit z). */
  pos?: { x: number; y: number; z?: number };
  /** Look orientation, radians. */
  yaw?: number;
  pitch?: number;
  /** Orientation/handedness of the player frame (+1 original, -1 mirrored). */
  determinant?: 1 | -1;
  /** Which fundamental cell the player is in (3-manifold walkers). */
  cell?: { x: number; y: number; z: number };
  /** Distance to the nearest landmark/marker (see nearestMarker.ts). */
  nearestMarker?: number;
  /** An independent cross-check, computed by a different path than `determinant`
   *  (e.g. ink handedness, a frame-continuity jump) — labeled so the HUD names it. */
  witness?: { label: string; value: number };
}
