import * as THREE from 'three';
import { SquareMapState } from './engineTypes';

/**
 * The one seam that genuinely differs between the four worlds: the **universal
 * cover**. χ=0 worlds (torus, Klein) live on the flat Euclidean plane, realised
 * by sliding an infinitely tiled square under a fixed player; χ>0 worlds (ℝP²,
 * sphere) live on the sphere, realised by walking the camera around a fixed
 * planet. These are different mathematical objects and are NOT merged — each is a
 * {@link CoverModel}. Everything else (decor, player layer, trail, glass,
 * other-side, mini-map, controls) is shared by the one facade engine.
 *
 * Keeping this boundary explicit is also what keeps the Phase-2 morph possible:
 * a morph is "interpolate between two cover models", expressible only because the
 * cover is an interface rather than dissolved into the engine.
 *
 * A cover never touches decor meshes, trail buffers, glass, or UI — it only
 * integrates movement, places the camera, and reports *where* copies of the
 * decorated square go and *where* the player is on the square.
 */

/** The player as a point + tangent frame, cover-agnostic. */
export interface PlayerPose {
  position: THREE.Vector3; // world-space eye/foot reference
  up: THREE.Vector3;       // surface normal (local up)
  forward: THREE.Vector3;  // heading in the tangent plane
}

/** One placed copy of the decorated square to render this frame. */
export interface SquarePlacement {
  matrix: THREE.Matrix4;  // local(square)→world for this copy
  face: 0 | 1;            // 0 = trees face, 1 = columns face (orientation class)
  /** This copy differs from the player's home copy by an orientation flip, so its
   *  trail/decor reads mirror-reversed (and its trail drops under the glass). */
  reflected: boolean;
}

export interface CoverFrameInput {
  fwd: number;     // −1..1
  strafe: number;  // −1..1
  yaw: number;     // absolute look azimuth (radians)
  pitch: number;
  dt: number;
  moveSpeed: number;
  thirdPerson: boolean;
}

export interface CoverModel {
  readonly kind: 'euclidean' | 'spherical';

  /** Integrate one frame of movement + look, and place the given camera. */
  update(input: CoverFrameInput, camera: THREE.PerspectiveCamera): void;

  /** Current player pose (after {@link update}). */
  pose(): PlayerPose;

  /** The copies of the decorated square visible this frame. The facade owns the
   *  meshes and assigns them to these placements. */
  visibleSquares(): SquarePlacement[];

  /** Where to lay the next footprint, in true world coords. */
  trailSample(): { pos: THREE.Vector3; forward: THREE.Vector3; up: THREE.Vector3 };

  /** Player charted back into the fundamental square, for the mini-map. */
  chart(): SquareMapState;

  /** Spherical only (planet radius); euclidean ignores. */
  setRadius?(r: number): void;
  /** Live fundamental-square side (world units). */
  setSquareSize?(v: number): void;
  dispose(): void;
}
