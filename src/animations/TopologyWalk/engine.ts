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
  /** Flat worlds: draw a copy of the avatar in every tiled cell (mirrored where
   *  the cell is mirrored), so you watch your twins walk the universal cover. */
  projectAvatar: boolean;
  /** Flat worlds: floor opacity, 0 (clear glass) → 1 (solid). Lower it to see
   *  the columns/trees on the other side of the world. */
  floorOpacity: number;
}

/**
 * Snapshot of the player's whereabouts on a flat surface, for the mini-map: the
 * position inside the fundamental domain (`u`,`v` ∈ 0..1, with the domain frame's
 * +z pointing "up"), the heading in that same frame, whether you're currently on
 * the mirror (odd) side of the Klein bottle, and how the left/right edges glue.
 */
export interface FlatMapState {
  u: number;
  v: number;
  hx: number;
  hz: number;
  flipped: boolean;
  klein: boolean;
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
  setProjectAvatar?(on: boolean): void;
  setFloorOpacity?(o: number): void;
  clearWriting?(): void;
  /** Flat worlds only: current position/heading in the fundamental domain. */
  getMapState?(): FlatMapState | null;
}
