import * as THREE from 'three';

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

export enum ColorBy {
  Domain = 0,
  Range = 1
}

/** Which scalar quantity of the chosen source (z or f) drives the color wheel.
 *  Phase is the classic domain-coloring choice (hue = arg); the others "spend"
 *  hue on a different quantity (e.g. Modulus → color by |z| / |f|). Brightness
 *  always tracks magnitude for legibility. */
export enum ColorQuantity {
  Phase = 0,
  Modulus = 1,
  Real = 2,
  Imag = 3,
  /** Brightness only: every particle at full value (no magnitude shading). */
  Uniform = 4
}

/** How the input (z) and output (f) planes are charted before being assembled
 *  into the 4-vector: Cartesian (Re, Im), Polar (|·|, arg), or Log-polar
 *  (log|·|, arg). In log-polar output, exp becomes the identity; in log-polar on
 *  both, zⁿ / roots flatten into linear shears. Color still uses Cartesian z/f. */
export enum CoordMode {
  Cartesian = 0,
  Polar = 1,
  LogPolar = 2
}

export const coordModeNames = ['Cartesian', 'Polar', 'Log-polar'] as const;

/** Color palette applied to the chosen quantity. 'Phase wheel' (index 0) keeps
 *  the cyclic HSV domain-coloring (driven by the Hue/Style controls); the rest
 *  are sequential ramps mapped to **magnitude** — the perceptual matplotlib maps
 *  (Viridis…Plasma) and a few extras, suitable for reading |z| / |f| as height. */
export const colormapNames = [
  'Phase wheel', 'Grayscale', 'Viridis', 'Magma', 'Inferno', 'Plasma', 'Fire', 'Ocean',
  'Turbo', 'Cubehelix', 'Hot', 'Copper', 'Cool', 'Cool–warm',
] as const;

/** How the domain points are laid out before f is applied. Radial patterns
 *  sample a disk (radius = max half-extent, centered on the domain box); Grid /
 *  Squares / Random use the rectangular box. Polar spreads points evenly in
 *  arg z, which keeps near-linear maps (f ≈ b·z) crisp in the Hopf/Torus view. */
export enum SamplePattern {
  Grid = 0,
  Polar = 1,
  Rings = 2,
  Spokes = 3,
  Web = 4,
  Squares = 5,
  Random = 6
}

export const samplePatternNames = ['Grid', 'Polar', 'Rings', 'Spokes', 'Web', 'Squares', 'Random'] as const;

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

export const motionModes = ['Quaternion', 'Fixed'] as const;
export const dropModes = ['None', 'DropX', 'DropY', 'DropU', 'DropV'] as const;

/** How the sampled surface is drawn: a cloud of point particles, a single
 *  continuous translucent sheet (a wireframe/filled triangle mesh over a regular
 *  grid), or Tiles — one oriented quad per grid sample, stretched along the local
 *  deformation and capped at a maximum size, so dense regions form a solid fabric
 *  and stretched regions tear apart into a field of separated tiles (points).
 *  Sheet/Tiles ignore the sampling pattern and use their own resolution. */
export const renderModes = ['Points', 'Sheet', 'Tiles', 'Net'] as const;
export type RenderMode = (typeof renderModes)[number];

export const AXIS_COLORS = {
  x: 0,
  y: 0.25,
  u: 0.5,
  v: 0.75
} as const;
