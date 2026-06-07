import * as THREE from 'three';

/**
 * "The other side" — the one shared concept behind the two rectangular worlds'
 * mirror-to-the-glued-other-face move, and the seam the roadmap **normal-flip**
 * ("dive through the floor", surface-tour §4.1) will ride.
 *
 * Both rectangular engines already build the glued opposite face, gated behind
 * the glass (see {@link ./glassSurface}). They realise it with *different*
 * geometry, which cannot be merged:
 *
 *  - **flat** (torus / Klein): a per-cell `under` group reflected by
 *    `scale(1, -1, -1)` — a planar mirror through the floor — wearing the
 *    opposite cover skin. There are ~25 of them (one per tiled cell), so the flat
 *    "other side" is a *collection*, not a single object.
 *  - **spherical** (sphere / ℝP²): a single radial-mirror inner shell (`under`
 *    group, each prop re-aimed inward) wearing the opposite skin.
 *
 * What they DO share — and what this module names once — is the *contract*: a
 * handle to the other-face decor, an on/off, and the player's current {@link Side}.
 * The normal-flip is then one player-layer move: the host calls
 * `WorldEngine.flipSide?.()` and each engine routes it to its own realisation
 * (flat inverts the camera up-vector and swaps top/under skins; spherical dives
 * outer→inner). Today no engine implements the flip; the seam is declared so it
 * can land as a small, uniform addition rather than a per-engine hack.
 */

/** Which face the player currently stands on. `near` = outer / top (where Euler
 *  starts); `far` = the glued under / inner face reached by the flip. */
export type Side = 'near' | 'far';

export interface OtherSide {
  /** A handle to the mirrored other-face decor, when it is a single group
   *  (spherical inner shell). Flat's other side is the per-cell `under`
   *  collection and has no single group, so flat exposes `null` here and drives
   *  its flip through the tile loop instead. */
  readonly group: THREE.Group | null;
  /** Show/hide the other-face decor. The frame loop still applies the glass
   *  `showUnder` reveal gate; this is the same on/off the future flip toggles. */
  setVisible(on: boolean): void;
  /** The face the player is currently on (today always `near`). */
  readonly side: Side;
}

/** A small mutable cell holding the current side, shared between an engine and
 *  the {@link OtherSide} handle it hands out. */
export interface SideRef { side: Side }

/** Wrap a single Three.js group (the spherical inner shell) as an
 *  {@link OtherSide}. `sideRef` is read live so `side` tracks the engine. */
export function groupOtherSide(group: THREE.Group, sideRef: SideRef): OtherSide {
  return {
    group,
    setVisible: (on: boolean) => { group.visible = on; },
    get side() { return sideRef.side; },
  };
}
