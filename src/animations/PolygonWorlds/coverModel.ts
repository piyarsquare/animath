import * as THREE from 'three';
import { SquareMapState, EngineDeps } from './engineTypes';
import { WorldSpec } from './worldSpec';
import { FundamentalSquareDecor } from './decor';

/**
 * The one seam that genuinely differs between the four worlds: the **universal
 * cover**, and with it the whole world-rendering. χ=0 worlds (torus, Klein) live
 * on the flat Euclidean plane — a tiled square slid under a fixed player over a
 * glass floor. χ>0 worlds (ℝP², sphere) live on the sphere — the decorated square
 * charted onto a fixed planet the camera walks around. These are different
 * mathematical objects and are NOT merged: each is a {@link CoverModel} that owns
 * its own scene objects (floor/cells, or planet/skins), its movement integration,
 * its camera placement, and the chart back to the fundamental square.
 *
 * The facade engine owns only what is genuinely shared — the avatar, lights, and
 * the frame orchestration — and asks the cover to move, place the camera, and
 * report the player pose + square chart. Each cover renders its own ink trail
 * (one canonical buffer drawn through its genuine deck/sheet transforms — see
 * inkTrail.ts).
 *
 * Keeping this boundary explicit is also what keeps the planned gluing+curvature
 * morph expressible ("interpolate between two covers").
 */

/** The player as a point + tangent frame, cover-agnostic. */
export interface PlayerPose {
  position: THREE.Vector3; // world-space foot reference
  up: THREE.Vector3;       // surface normal (local up)
  forward: THREE.Vector3;  // heading in the tangent plane
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

export interface CoverDeps {
  deps: EngineDeps;
  root: THREE.Group;          // the cover adds its world objects here
  spec: WorldSpec;
  decor: FundamentalSquareDecor;
  squareSize: number;
  floorThickness: number;
}

export interface CoverModel {
  readonly kind: 'euclidean' | 'spherical' | 'hyperbolic';

  /** Integrate one frame of movement + look, place the camera, and update the
   *  cover's own world objects (tile placement / planet). */
  update(input: CoverFrameInput, camera: THREE.PerspectiveCamera): void;

  pose(): PlayerPose;
  chart(): SquareMapState;
  clearTrail(): void;

  /** Test/diagnostic only: signed handedness of the freshest print's rendered
   *  image in the character's own frame (>0 ⇒ a print laid on the player's
   *  current face reads right-handed under them). Must settle to the same
   *  positive sign on both faces of the sheet — the ink pipeline never mirrors
   *  a print in place. */
  debugProbe?(): number;

  setFloorOpacity?(o: number): void;
  setSquareSize?(v: number): void;
  setFloorThickness?(t: number): void;
  setRadius?(r: number): void;
  /** Third-person camera distance from the character. */
  setCameraDistance?(d: number): void;
  dispose(): void;
}
