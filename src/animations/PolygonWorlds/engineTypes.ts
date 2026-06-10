import * as THREE from 'three';

export interface EngineDeps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

export interface FrameInput {
  dt: number;
  fwd: number;     // −1..1 movement intent
  strafe: number;  // −1..1
  yaw: number;     // look azimuth (radians)
  pitch: number;   // look elevation (radians)
  moveSpeed: number;
  thirdPerson: boolean;
}

/**
 * Player charted into the fundamental square, for the one square mini-map: the
 * position inside the domain (u,v ∈ 0..1, +v "up"), the heading in that frame,
 * and whether the player is on the reversed (mirror) sheet of a non-orientable
 * world (which paints the marker amber).
 */
export interface SquareMapState {
  u: number;
  v: number;
  hx: number;
  hz: number;
  flipped: boolean;
}

export const DEFAULT_SQUARE_SIZE = 30;
export const DEFAULT_FLOOR_THICKNESS = 1.2;

/** The one engine the host drives — geometry-agnostic; it owns a CoverModel. */
export interface PolygonEngine {
  frame(input: FrameInput): void;
  clearTrail(): void;
  setFloorOpacity(o: number): void;
  setColorCells(on: boolean): void;
  setRadius(r: number): void;
  /** Live fundamental-square side (world units). */
  setSquareSize(v: number): void;
  /** Live glass-floor slab thickness (world units). */
  setFloorThickness(t: number): void;
  /** Third-person camera distance from the character (world units). */
  setCameraDistance(d: number): void;
  getMapState(): SquareMapState | null;
  /** Test/diagnostic only: signed handedness of the freshest print's rendered
   *  image in the character's frame (see CoverModel.debugProbe). undefined if
   *  unsupported. */
  debugProbe(): number | undefined;
  /** Test/diagnostic only: mirror-image print radius vs walking-shell radius
   *  (see CoverModel.auditInk). undefined/null if unsupported. */
  auditInk(): { mirrorR: number; shellR: number } | null | undefined;
  dispose(): void;
}
