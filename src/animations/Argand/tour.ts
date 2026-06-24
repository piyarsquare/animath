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
import type { Feed } from './ArgandPlane';

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
}

export interface TourStep {
  id: string;
  title: string;
  /** One or two short sentences. Plain text (no markup). */
  body: string;
  state: TourState;
}

/** The walkthrough. ~9 steps, real line → plane → number planes → explore. */
export const TOUR: TourStep[] = [
  {
    id: 'line',
    title: 'Start on the line',
    body: 'Forget the plane for a moment. Every number is a point on a line. Adding α₀ just slides the input along it — that is all addition ever does.',
    state: {
      feed: 'point', degree: 1, system: -1,
      z: cx(1, 0), alpha1: cx(1, 0), alpha0: cx(1.5, 0),
      viewFromFixed: false, iterate: false,
      gridType: 'cartesian', gridColor: false, showUnitCircle: false, extent: 5,
    },
  },
  {
    id: 'scale',
    title: 'Multiplying stretches',
    body: 'Multiplying by α₁ scales the line — by 2 it stretches, by ½ it shrinks. Make α₁ negative and it also flips through zero.',
    state: { alpha1: cx(2, 0), alpha0: cx(0, 0) },
  },
  {
    id: 'magnitude',
    title: 'What keeps the magnitude?',
    body: 'Which multipliers leave length unchanged? On the line, only ×(+1) and ×(−1). Just two numbers preserve magnitude — that is the whole "unit set" of the line.',
    state: { alpha1: cx(-1, 0), showUnitCircle: true },
  },
  {
    id: 'newaxis',
    title: 'Add a second axis',
    body: 'Now give the line a perpendicular i-axis. With room to move sideways, multiplying can turn instead of only flipping: ×i is a quarter-turn.',
    state: { alpha1: cx(0, 1), alpha0: cx(0, 0), z: cx(1, 0), showUnitCircle: true },
  },
  {
    id: 'spin',
    title: 'A whole circle of them',
    body: 'In the plane a whole circle of multipliers keeps magnitude — every point on the unit circle. Multiply by one and the plane spins. (Two points grew into a circle.)',
    state: { alpha1: cx(0.6, 0.8), system: -1, showUnitCircle: true },
  },
  {
    id: 'add',
    title: 'Addition still just slides',
    body: 'Adding α₀ is the same slide it was on the line — now in two dimensions. Multiply spins or scales; add slides. That split never changes.',
    state: { alpha0: cx(1, 0.5) },
  },
  {
    id: 'fixed',
    title: 'The point left alone',
    body: 'Spin-and-slide always pins one point: the fixed point z*, where f(z*) = z*. Tick "View from z*" and the map becomes a pure spiral about it.',
    state: { alpha1: cx(0.4, 0.8), alpha0: cx(1, 0), viewFromFixed: false },
  },
  {
    id: 'planes',
    title: 'Other ways to multiply',
    body: 'The unit curve need not be a circle. Dial the number plane j²: Spin (complex), Shear (dual), Boost (split). Same line, three geometries of multiplication.',
    state: { system: 0, viewFromFixed: false, showUnitCircle: true },
  },
  {
    id: 'explore',
    title: 'Now it is yours',
    body: 'Drag the colored handles, switch Point / Shape / Grid in the top bar, and slide the number-plane dial. Done — explore freely.',
    state: { system: -1 },
  },
];
