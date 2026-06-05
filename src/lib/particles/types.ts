import * as THREE from 'three';
import { ProjectionMode } from '../viewpoint';

export interface ViewPoint {
  L: THREE.Quaternion;
  R: THREE.Quaternion;
}

export enum ColorStyle {
  HSV = 0,
  ModulusBands = 1,
  PhaseOnly = 2,
  DualHueCVD = 3
}

export enum ColourBy {
  Domain = 0,
  Range = 1
}

export enum JitterMode {
  /** Scatter the sampling: perturb the domain point, then evaluate f there, so
   *  the particle stays exactly on the graph surface of f (a denser/irregular
   *  sampling of the same surface). This is the default. */
  Scatter = 0,
  /** Fuzz the cloud: evaluate f at the clean lattice point, then add an
   *  independent 4D offset to the assembled (x, y, Re f, Im f) point, pushing it
   *  off the surface on all four axes (a soft cloud around the surface). */
  Fuzz = 1
}

export interface Axis {
  line: THREE.Line;
}

export const shapeNames = ['sphere', 'hexagon', 'pyramid'] as const;
export const textureNames = ['none', 'checker', 'speckled', 'stone', 'metal', 'royal'] as const;

export const viewTypes = [
  ['Perspective', ProjectionMode.Perspective],
  ['Stereo', ProjectionMode.Stereo],
  ['Hopf', ProjectionMode.Hopf],
  ['Torus', ProjectionMode.Torus]
] as const;

export const motionModes = ['Quaternion', 'Fixed'] as const;
export const dropModes = ['None', 'DropX', 'DropY', 'DropU', 'DropV'] as const;

export const AXIS_COLORS = {
  x: 0,
  y: 0.25,
  u: 0.5,
  v: 0.75
} as const;
