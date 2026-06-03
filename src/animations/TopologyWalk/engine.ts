import * as THREE from 'three';

/**
 * Topology Walk hosts two interchangeable world *engines* behind one common
 * interface. They share the whole "player" layer — drag-look, WASD / move pad,
 * the avatar + third-person chase cam, the footprint trail and mobile defaults —
 * and differ only in how a closed surface is realised:
 *
 *  - the **corridor** engine sweeps a rectangular tube along a (possibly
 *    knotted, possibly twisting) centreline and glues "up" to the floor's
 *    surface normal, so a Möbius lap rolls the whole world over;
 *  - the **flat** engine walks an intrinsically flat plane and renders the
 *    edge-gluing by tiling the fundamental domain (the universal cover) around
 *    the player, so nothing ever flips underfoot.
 *
 * The same torus shows up in both — as an extrinsic ring corridor (`loop`) and
 * as an intrinsic flat room (`torus`) — which is half the lesson.
 */
export type Family = 'corridor' | 'flat';

export interface SurfaceDef {
  id: string;
  label: string;
  family: Family;
  /** short descriptor shown in the app header */
  short: string;
}

export const SURFACES: SurfaceDef[] = [
  { id: 'loop',    label: 'Loop (torus tube)', family: 'corridor', short: 'loop corridor' },
  { id: 'mobius',  label: 'Möbius strip',      family: 'corridor', short: 'Möbius corridor' },
  { id: 'double',  label: 'Double twist',      family: 'corridor', short: 'double-twist corridor' },
  { id: 'triple',  label: 'Triple twist',      family: 'corridor', short: 'triple-twist corridor' },
  { id: 'trefoil', label: 'Trefoil knot',      family: 'corridor', short: 'trefoil-knot corridor' },
  { id: 'torus',   label: 'Flat torus',        family: 'flat',     short: 'flat torus' },
  { id: 'klein',   label: 'Klein bottle',      family: 'flat',     short: 'flat Klein bottle' },
];

export const surfaceDef = (id: string): SurfaceDef =>
  SURFACES.find((s) => s.id === id) ?? SURFACES[1];

export interface EngineDeps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

/** Everything the host knows about the controls/options on a given frame. */
export interface FrameInput {
  dt: number;
  time: number;
  fwd: number;      // movement intent, -1..1
  strafe: number;   // movement intent, -1..1
  yaw: number;      // look azimuth (radians)
  pitch: number;    // look elevation (radians)
  moveSpeed: number;
  thirdPerson: boolean;
  stamp: boolean;   // one-shot "write on the wall" request (corridor only)
  wallText: string;
}

/** Options resolved once at creation and pushed individually thereafter. */
export interface EngineOptions {
  surfaceId: string;
  width: number;
  themeId: string;
  ambientMul: number;
  markers: boolean;
  bloom: boolean;
  miniMap: boolean;
}

/**
 * A self-contained world: it owns all of its Three.js objects (added to the
 * shared scene on creation, removed and disposed on `dispose`), advances and
 * renders one frame at a time, and exposes optional setters for the controls
 * its family actually supports.
 */
export interface WorldEngine {
  readonly family: Family;
  /** Advance simulation by one frame and render. */
  frame(input: FrameInput): void;
  clearTrail(): void;
  dispose(): void;

  // optional, family-specific configuration
  setSurface?(id: string): void;
  setWidth?(v: number): void;
  setTheme?(id: string): void;
  setAmbient?(mul: number): void;
  setMarkers?(on: boolean): void;
  setBloom?(on: boolean): void;
  setMiniMap?(on: boolean): void;
  clearWriting?(): void;
}
