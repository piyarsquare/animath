/**
 * tour.ts — the guided walkthrough for the Argand app.
 *
 * A linear sequence of steps. Each carries a short caption and a *patch* of app
 * settings; pressing **Next** applies the next patch, walking the learner from
 * the **real line** (Step 0 — addition slides, multiplication scales, only ±1
 * preserve magnitude) outward to the plane (a whole circle of magnitude-
 * preservers), the fixed point, and the three number planes. The same
 * "what preserves magnitude?" question is the rung-by-rung ladder ℝ → ℂ → ℍ, so
 * this opening also seeds the eventual quaternion chapter.
 *
 * Pure data — no React. The app owns the setters; a step only declares the
 * fields it wants changed (everything omitted is left as the learner left it).
 */
import { cx, type Cx } from './complexOps';
import type { Feed, PlaneShow } from './ArgandPlane';

/** The subset of app state a tour step may set. Omitted fields are untouched. */
export interface TourState {
  feed?: Feed;
  degree?: number;
  z?: Cx;
  alpha1?: Cx;
  alpha0?: Cx;
  alpha2?: Cx;
  system?: number;            // p = j² : <0 Spin, 0 Shear, >0 Boost
  viewFromFixed?: boolean;
  iterate?: boolean;
  extent?: number;
  gridType?: 'cartesian' | 'polar';
  gridColor?: boolean;
  showUnitCircle?: boolean;
  dimension?: 'line' | 'plane';
  /** Which actors are visible this step (omit ⇒ show everything). */
  show?: Partial<PlaneShow>;
}

export interface TourStep {
  id: string;
  title: string;
  /** One or two short sentences. Plain text (no markup). */
  body: string;
  state: TourState;
}

/**
 * The walkthrough. Builds up one idea at a time on the real line (just the line →
 * b → x → x+b → the sign of b → m → m·x → a negative m flips), then grows a second
 * axis into the plane (spin, the fixed point, the three number planes). Each step
 * reveals only the actors it has introduced (`show`), so nothing is on screen
 * before it is named. On the line we use school algebra: y = m·x + b.
 */
export const TOUR: TourStep[] = [
  {
    id: 'line',
    title: 'Just the line',
    body: 'This is the number line — every real number is one point on it, with 0 in the middle. That is the whole stage for now. Nothing else yet.',
    state: {
      feed: 'point', degree: 1, system: -1, dimension: 'line',
      z: cx(1, 0), alpha1: cx(1, 0), alpha0: cx(0, 0),
      viewFromFixed: false, iterate: false,
      gridType: 'cartesian', gridColor: false, showUnitCircle: false, extent: 6,
      show: {},                                   // nothing — just the line + its ticks
    },
  },
  {
    id: 'meet-b',
    title: 'Meet b — a shift',
    body: 'Pick a number and call it b. Here b = 2. On its own it is just a marked spot on the line (the violet square). In a moment it will do something.',
    state: { alpha0: cx(2, 0), show: { shift: true } },
  },
  {
    id: 'add',
    title: 'x + b slides',
    body: 'Now feed in an input x (cyan). Adding b slides x along the line by b: x + b. That is all addition ever does — a slide. Drag x and watch the answer y ride along.',
    state: { z: cx(1, 0), alpha1: cx(1, 0), alpha0: cx(2, 0), show: { point: true, shift: true, output: true } },
  },
  {
    id: 'sign-b',
    title: 'When b is negative',
    body: 'Make b negative and the slide reverses: x + (−2) lands two steps to the left. Positive b slides right, negative b slides left.',
    state: { z: cx(1, 0), alpha1: cx(1, 0), alpha0: cx(-2, 0), show: { point: true, shift: true, output: true } },
  },
  {
    id: 'meet-m',
    title: 'Meet m — a multiplier',
    body: 'Set b back to 0 and bring in a slope m (orange). Multiplying by m scales x: m·x. With m = 2 the line stretches to twice the distance from 0; with m = ½ it shrinks.',
    state: { z: cx(1.5, 0), alpha1: cx(2, 0), alpha0: cx(0, 0), show: { point: true, slope: true, shift: true, output: true } },
  },
  {
    id: 'neg-m',
    title: 'A negative m flips',
    body: 'Make m negative and x is scaled and flipped through 0 — a half-turn. On the line, flipping is the only "rotation" there is. (Soon we get the real thing.)',
    state: { z: cx(1.5, 0), alpha1: cx(-1, 0), alpha0: cx(0, 0), show: { point: true, slope: true, shift: true, output: true } },
  },
  {
    id: 'newaxis',
    title: 'Add a second axis',
    body: 'Give the line a perpendicular axis — call its unit i. Now a multiplier can point sideways: ×i turns x a quarter-turn instead of flipping it. m can scale, rotate, or both.',
    state: { z: cx(1.5, 0), alpha1: cx(0, 1), alpha0: cx(0, 0), dimension: 'plane', showUnitCircle: true, show: { point: true, slope: true, shift: true, output: true, unitSet: true } },
  },
  {
    id: 'spin',
    title: 'A whole circle keeps length',
    body: 'On the line only ±1 kept length. In the plane a whole circle does — every multiplier on the unit circle just spins. Pick one and watch x turn without stretching.',
    state: { alpha1: cx(0.6, 0.8), system: -1, showUnitCircle: true },
  },
  {
    id: 'fixed',
    title: 'The point left alone',
    body: 'Scale-rotate-and-slide always pins one point: the fixed point z*, where f(z*) = z*. (Back to the plane names: m and b are α₁ and α₀, x is z.)',
    state: { alpha1: cx(0.4, 0.8), alpha0: cx(1, 0), viewFromFixed: false },
  },
  {
    id: 'planes',
    title: 'Other ways to multiply',
    body: 'The unit curve need not be a circle. Dial the number plane j²: Spin (complex), Shear (dual), Boost (split) — three geometries of multiplication on the same plane.',
    state: { system: 0, showUnitCircle: true },
  },
  {
    id: 'explore',
    title: 'Now it is yours',
    body: 'Drag the colored handles, switch Point / Shape / Grid in the top bar, and slide the number-plane dial. Done — explore freely.',
    state: { system: -1 },
  },
];
