import * as THREE from 'three';
import type { Axis } from './solidSchema';

export interface EngineDeps3 {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

/** How you get around: an airplane (free 6DOF) or a gravity-bound person / car
 *  that moves on the floor plane and settles back to it. */
export type TravelMode = 'fly' | 'walk' | 'drive';

export interface FrameInput3 {
  dt: number;
  fwd: number;     // −1..1 forward intent
  strafe: number;  // −1..1
  rise: number;    // −1..1 (E/Q) — free vertical when flying; jump/sink when grounded
  yaw: number;     // look azimuth (radians)
  pitch: number;   // look elevation (radians)
  moveSpeed: number;
  thirdPerson: boolean;
  mode: TravelMode;
}

/** The walker's chirality state — the headline readout. `loopSign` is the
 *  handedness of the carried frame relative to the start (the value of w₁ along
 *  the path walked so far): +1 returned identical, −1 returned mirror-reversed.
 *  `perStepDet` is the determinant of the *continuous* developing step, which is
 *  +1 the entire way — the engine's own proof that nothing local flipped; the
 *  reversal is the loop's, not a point's. */
export interface ChiralityState {
  perStepDet: 1;
  loopSign: 1 | -1;
  /** Rotation angle (degrees) of the carried frame relative to the start — the
   *  *cosmetic* part of the holonomy (you can always reorient your body to undo
   *  a rotation; you cannot undo a reflection). Meaningful when loopSign = +1. */
  rotationDeg: number;
  /** Net signed crossings of each face-pairing (the cell you are in). */
  crossings: Record<Axis, number>;
}

/** Where the walker is in the fundamental cube, for the mini-map. */
export interface SolidMapState {
  /** Position within the cube, each in −1..1 (+ = toward the +axis face). */
  u: number;
  v: number;
  w: number;
  /** Unit forward direction in fundamental-cube coordinates (for the heading). */
  fwd: [number, number, number];
  cell: Record<Axis, number>;
  mirrored: boolean;
}

/** The one engine the host drives — geometry-agnostic; owns the cover model.
 *  The 3D successor to PolygonEngine. */
export interface SolidEngine {
  frame(input: FrameInput3): void;
  clearTrail(): void;
  /** Turn the footprint trail on/off (off by default; off also clears it). */
  setTrailEnabled(on: boolean): void;
  /** How many rings of deck-translates to draw around the camera. */
  setCoverDepth(n: number): void;
  /** Fundamental cube edge length (world units). */
  setRoomSize(size: number): void;
  /** Third-person camera distance from the walker. */
  setCameraDistance(d: number): void;
  /** Switch the scene atmosphere (see looks.ts). */
  setLook(id: string): void;
  /** Fog amount, 0 (none) … 1 (thick). */
  setFog(amount: number): void;
  /** Show/hide the floor plane + grid. */
  setFloor(on: boolean): void;
  /** Show/hide the per-face gluing labels. */
  setLabels(on: boolean): void;
  /** Show/hide the cube-corner markers. */
  setCorners(on: boolean): void;
  /** Return the walker to the cube center, frame upright, holonomy cleared. */
  recenter(): void;
  getChirality(): ChiralityState | null;
  getMapState(): SolidMapState | null;
  dispose(): void;
}

export const DEFAULT_ROOM_SIZE = 11;
export const DEFAULT_COVER_DEPTH = 4;
