/**
 * Types for the Trinary "lab" analysis layer. The classifier turns a planet's
 * trajectory through the three-star field into a stream of labelled states, on
 * two independent axes:
 *
 *   A — Climate:  is the planet's total starlight in a liquid-water band?
 *   B — Dynamics: is the orbit bound and locally regular (no violent kicks)?
 *
 * Each instant falls into one of four bins (both / climate-only / dynamics-only
 * / neither), and sustained runs of a bin form "eras".
 */

export type ClimateState = 'hot' | 'habitable' | 'cold';

/** The 2×2 joint state of climate (A) and dynamics (B). */
export type Bin = 'both' | 'climate' | 'dynamics' | 'neither';

export type PlanetFate = 'bound' | 'ejected' | 'destroyed';

export interface ClassifyParams {
  /** Mass→luminosity exponent: L_i = m_i^lumExp. */
  lumExp: number;
  /** Softening (squared length added) for the insolation sum. */
  insolSoft2: number;
  /** Habitable band as multipliers on the launch reference insolation S_ref. */
  habLo: number;
  habHi: number;
  /** Window (in sim-time) over which orbital energy steadiness is judged. */
  calmWindow: number;
  /** Max relative variation of orbital energy for the orbit to count as "calm". */
  calmThresh: number;
  /** Planet within this distance of a star is destroyed. */
  rKill: number;
  /** Unbound body beyond this distance counts as ejected/escaped. */
  rEsc: number;
}

export const DEFAULT_CLASSIFY: ClassifyParams = {
  lumExp: 1,
  insolSoft2: 0.05 * 0.05,
  habLo: 0.4,
  habHi: 2.5,
  calmWindow: 2.0,
  calmThresh: 0.06,
  rKill: 0.08,
  rEsc: 12,
};

export interface Segment {
  t0: number;
  t1: number;
  bin: Bin;
}

export interface LabEvent {
  t: number;
  kind: 'star-ejected' | 'planet-ejected' | 'planet-destroyed';
  star?: number;
}

/** Terminal classification of a whole run. */
export type Outcome = 'happy' | 'survived' | 'planet-ejected' | 'planet-destroyed' | 'blowup';

/** Compact result of one headless run, for ensemble aggregation. */
export interface RunResult {
  tSim: number;
  outcome: Outcome;
  habitableFraction: number;
  bothFraction: number;
  longestHabitable: number;
  minStarDist: number;
  ejectedStar: number;   // -1 if none
  tEject: number;        // sim-time of star ejection, or -1
  planetFate: PlanetFate;
  // Echoed initial conditions (for records / reproduction).
  radius: number;
  speed: number;
  angleDeg: number;
  retro: boolean;
  seed: number;
}

export interface Snapshot {
  t: number;
  total: number;
  /** Current instantaneous values. */
  S: number;
  Sref: number;
  Slo: number;
  Shi: number;
  climate: ClimateState;
  bound: boolean;
  calm: boolean;
  bin: Bin;
  /** Fractions of elapsed time. */
  habitableFraction: number;
  bothFraction: number;
  binFractions: Record<Bin, number>;
  minStarDist: number;
  longestHabitable: number;
  currentBin: Bin;
  currentBinDur: number;
  ejectedStar: number;       // -1 if none
  planetFate: PlanetFate;
  segments: Segment[];
  events: LabEvent[];
}
