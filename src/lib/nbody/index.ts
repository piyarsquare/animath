/**
 * nbody — a self-contained, framework-agnostic gravitational dynamics library.
 *
 * It bundles three layers, all pure TypeScript (no React, Three.js, or DOM) so
 * they run identically on the main thread and inside Web Workers:
 *
 *   - integrator: the restricted N-body leapfrog stepper + diagnostics.
 *   - scenarios:  named star configurations and planet-launch helpers.
 *   - analysis:   trajectory classification (climate × dynamics) and outcomes.
 *
 * Consumers should import from this barrel (`@/lib/nbody`) rather than reaching
 * into the individual modules.
 */
export * from './integrator';
export * from './scenarios';
export * from './analysis/types';
export * from './analysis/classify';
export * from './analysis/events';
export * from './analysis/analyzer';
