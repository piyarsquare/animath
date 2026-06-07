import * as THREE from 'three';

/**
 * Shared "glass surface" opacity logic for the two rectangular worlds. Both the
 * flat **glass floor** and the spherical **planet glass** are a translucent
 * surface you see *through* to a mirrored other side, with the same three
 * derived facts — is it visible at all, does it write depth (a near-solid sheet
 * occludes the far side; clear glass must not), and is the underside worth
 * drawing. flatEngine and sphericalEngine duplicated this arithmetic; it lives
 * here once.
 *
 * Only the *arithmetic* is shared — the `showUnder` threshold stays a per-engine
 * constant (flat 0.95, spherical 0.97) passed in as the spec, so each world's
 * existing feel is preserved exactly.
 */
export interface GlassState {
  opacity: number;
  /** Hide the surface entirely once it is essentially fully clear. */
  visible: boolean;
  /** Clear glass must not occlude depth, so the far side reads through it; a
   *  near-solid sheet writes depth normally. */
  depthWrite: boolean;
  /** Whether the glued underside / inner shell is worth drawing at this opacity. */
  showUnder: boolean;
}

export interface GlassSpec {
  /** Below this opacity the underside is revealed. flat: 0.95, spherical: 0.97. */
  showUnderBelow: number;
  /** At/above this opacity depth is written (both worlds: 0.98). */
  solidAt?: number;
  /** Below this opacity the surface is hidden entirely (flat floor: 0.01). */
  hideBelow?: number;
}

/** Resolve an opacity to its render facts under a per-engine spec. Pure. */
export function glassState(opacity: number, spec: GlassSpec): GlassState {
  const solidAt = spec.solidAt ?? 0.98;
  const hideBelow = spec.hideBelow ?? 0.01;
  return {
    opacity,
    visible: opacity > hideBelow,
    depthWrite: opacity >= solidAt,
    showUnder: opacity < spec.showUnderBelow,
  };
}

/**
 * Push a {@link GlassState} onto a glass material. `enabled=false` (the spherical
 * inner-shell toggle off) forces an opaque, front-only solid — there is nothing
 * to see through, so the surface goes back to a normal planet. This matches the
 * spherical engine's `applyInnerShell` branch exactly.
 *
 * The flat engine does NOT use this (it never toggles `transparent`/`side`/
 * `needsUpdate` on its always-glass floor); it reads the {@link GlassState}
 * fields and assigns `opacity`/`visible`/`depthWrite` itself.
 */
export function applyGlass(mat: THREE.MeshStandardMaterial, g: GlassState, enabled = true): void {
  if (!enabled) {
    mat.transparent = false;
    mat.opacity = 1;
    mat.side = THREE.FrontSide;
    mat.depthWrite = true;
  } else {
    mat.transparent = true;
    mat.opacity = g.opacity;
    mat.side = THREE.DoubleSide;
    mat.depthWrite = g.depthWrite;
  }
  mat.needsUpdate = true;
}
