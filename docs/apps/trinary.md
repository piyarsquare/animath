---
kind: app-guide
app: trinary
route: "#/trinary"
name: Trinary System
title: Trinary System — developer guide
status: stable
build: passed
entry: src/animations/TrinaryStars/Trinary.tsx
updated: 2026-06-22
signals: null
next: null
---

# Trinary System — developer guide

> Drop a planet into a three-star system and watch sensitive dependence erase its
> future — then open the Lab to run thousands of worlds and tally how often chaos
> ends happily.

The living architecture + status doc for this app. Conventions:
[`GUIDE_STYLE.md`](GUIDE_STYLE.md). What this doc type is: [`README.md`](README.md).
The teaching/math ("what am I looking at") lives in
[`EXPLAINER.md`](../../src/animations/TrinaryStars/EXPLAINER.md); there is no
in-app README — both the Observatory and the Lab feed `EXPLAINER.md` to the **?**
modal.

## Status

- **Route:** `#/trinary` → Observatory; `#/trinary-lab` → Lab. One wrapper
  ([`Trinary.tsx`](../../src/animations/TrinaryStars/Trinary.tsx)) hosts both and
  observes the hash; the top-bar **Observatory | Lab** mode pills switch by setting
  the hash. Both deep links (and the lab's legacy `?inst=census`) keep working.
- **Stability:** 🟢 **stable** — a large, mature app (Observatory + ensemble Lab +
  shared `nbody` engine). Low churn; no active session branch. Predates the
  session-tracking system, so its history is incidental (gallery ordering, chrome
  migration) rather than a dedicated build log.
- **Entry:** `Trinary.tsx` (wrapper) · app folder ~17 ts/tsx files, ~4.2k LOC,
  subdir `lab/`; shared engine `src/lib/nbody/` (7 ts files, ~740 LOC).
- **Build/tests:** covered by `npm run build`; **no app-specific unit tests** (the
  pure `nbody` engine is a natural home for them — see Testing).

## Active / Resolved

The per-app control center — hand-maintained ([`GUIDE_STYLE.md`](GUIDE_STYLE.md) §3c).

### Active

<!-- Nothing in docs/sessions/TODO.md is Trinary-specific as of this writing. -->
- [ ] **!low** Add unit tests for the pure `nbody` engine.
  `src/lib/nbody/` is framework-free and deterministic (integrator, scenarios,
  analyzer, ensemble aggregation) — ideal for vitest, but currently has none. A
  `recenter` / momentum-conservation test and an `Analyzer` bin-fraction test would
  lock in the Observatory↔Lab agreement contract (see Invariants).
- [ ] **!low (experimental)** Harden or retire the WebGPU census engine.
  [`lab/gpu.ts`](../../src/animations/TrinaryStars/lab/gpu.ts) uses a *simplified*
  classifier (no "calm" axis, so Paradise% reads 0) and falls back to CPU/workers on
  any error. It is gated behind a `GPU (exp)` pill and a warning banner; decide
  whether to bring its classifier to parity or remove it.

### Resolved

<!-- newest first -->
- [x] **2026-06-15** (`gallery-app-ordering-4y84fi`) — Repositioned in the gallery
  order (Trinary sits mid-list); no behavior change.
  [Handoff.](../sessions/handoff/gallery-app-ordering-4y84fi/2026-06-15-S01-gallery-ordering-cleanup.md)
- [x] **earlier (new-chrome / app-chrome-overhaul)** — Migrated to the Workspace
  chrome: the old `/trinary` + `/trinary-lab` catalog entries were fused behind one
  `Trinary.tsx` wrapper with **Observatory | Lab** top-bar mode pills; the old
  Settings simple/advanced toggle became the **Sandbox / Advanced** layouts, and the
  Lab's Destiny-Map / Census tab strip became the **Destiny map / Census** layouts.

## What it does

A three-body gravitational sandbox with two modes, both rendering Workspace chrome.

### Observatory ([`TrinaryStars.tsx`](../../src/animations/TrinaryStars/TrinaryStars.tsx))

The live 3D single-system view: three mutually-gravitating stars plus a planet
(and a swarm of near-identical "ghost" copies) treated as a massless test particle.

- **System panel** (`subject`) — pick a scenario (Figure-Eight · Moth ·
  Pythagorean · Binary + Star) and edit the **Custom planet** spinboxes
  (`x/y/vx/vy`); editing one pins an exact launch.
- **Stars panel** (`subject`) — per-star mass multipliers (gold/orange/blue),
  star–star **Softening**, and **Star size (collision)** (0 = pass-through).
- **Planet launch panel** (`domain`) — Auto/Custom mode, **Orbit around** target,
  start radius/speed, a **Circular orbit speed** button (√(M/r)), and **Place planet
  by hand** (click+drag on the scene to set position and a velocity arrow).
- **Climate panel** (`domain`) — the habitable band as multiples of the launch
  insolation (floor/ceiling), the mass→luminosity exponent β, and a calm threshold.
- **Sky panel** (`view`) — toggle the planet's-eye [`SkyView`](../../src/animations/TrinaryStars/SkyView.tsx)
  overlay; day length (spin) and axial tilt (seasons).
- **Reference frame panel** (`view`) — a pure view transform (center on a body /
  COM / barycenter, align +x), with presets; physics is unchanged.
- **Trails panel** (`marks`) — visible trail length + on/off.
- **Chaos demo panel** (`lab`) — ghost count, perturbation ε (= 10^exp), and
  **Scatter ghosts here** (re-cloud mid-flight).
- **Sim panel** (`playback`) — Play/Pause, Reset, Speed, and **Take the tour**.
- **Settings panel** (`quality`) — reset persisted settings.
- **Orbit view** — the Three.js scene; a HUD reads cloud spread, Lyapunov λ (with a
  chaotic/regular verdict) and sim time; the [`Observatory`](../../src/animations/TrinaryStars/Observatory.tsx)
  footer shows the climate-era timeline, an insolation bar, and event markers.
- **Layouts:** **Sandbox** (System · Planet launch · Sim) and **Advanced** (every
  knob). An always-on action strip projects Play/Pause + Reset.
- **Guided tour** ([`Tour.tsx`](../../src/animations/TrinaryStars/Tour.tsx)) — shows
  once on first visit, re-launchable from the Sim panel.

### Lab ([`lab/TrinaryLab.tsx`](../../src/animations/TrinaryStars/lab/TrinaryLab.tsx))

Runs thousands of the same worlds headless and maps/tallies their fates. Two
instruments, toggled by layouts:

- **Destiny map** ([`lab/BasinMap.tsx`](../../src/animations/TrinaryStars/lab/BasinMap.tsx)) —
  one chosen 2D slice of launch space (radius×speed, angle×speed, or the position
  plane), painted one pixel per world. An **Exact** lens makes each pixel one
  precise world (fractal boundaries at every zoom); a **Statistical** lens makes
  each pixel a mini-census (happy-ending odds). Drag a box to zoom; click a point to
  open that world in the Observatory (new tab).
- **Census** — thousands of random worlds tallied into **Outcomes**,
  **Distributions** and **Records** readout panels, with live decorative
  [`MiniSim`](../../src/animations/TrinaryStars/lab/MiniSim.tsx) tiles in the view.
- **System / Simulation / Sampling panels** — the scenario + masses, the per-world
  time budget and habitable band, and the launch-space sampling box (visualized by
  the `LaunchSpace` canvas). **Engine** pills choose CPU / Workers / GPU (exp).
- The full configuration is mirrored to the URL hash query for shareable,
  reproducible runs; JSON/CSV export buttons dump the tally and the leaderboard.

### Scenarios (shared)

Four named systems live in [`scenarios.ts`](../../src/lib/nbody/scenarios.ts):
**Figure-Eight** (Chenciner–Montgomery choreography), **Moth**
(Šuvakov–Dmitrašinović choreography), **Pythagorean** (Burrau's 3-4-5 problem),
and **Binary + Star** (hierarchical, the only one with `hasBinary`). Each bundles a
`system` (how to build the stars, recommended `dt`, softening), a `launch` default,
and presentation text.

## How the code works

**Three layers, cleanly split.** The pure physics/analysis lives in the
framework-agnostic `src/lib/nbody/` library (no React, Three.js or DOM, so it runs
identically on the main thread and in Web Workers); the two app modes are thin
presentation shells over it.

**The `nbody` engine** ([`index.ts`](../../src/lib/nbody/index.ts) barrel):
1. [`integrator.ts`](../../src/lib/nbody/integrator.ts) — `step(sim, dt)` is a
   velocity-Verlet / leapfrog (kick–drift–kick) stepper. The three stars are a full
   mutually-gravitating system; planets are **massless test particles** (they feel
   the stars but exert no force on the stars or one another). Gravity is Plummer-
   softened. Also: `cloudSpread` (the divergence readout) and `lyapunovRenorm` (one
   Benettin renormalization step for the largest Lyapunov exponent).
2. [`scenarios.ts`](../../src/lib/nbody/scenarios.ts) — `SCENARIOS`, `getScenario`,
   `buildStars` (apply mass multipliers + `recenter` to zero net momentum),
   `orbitFrame` and `launchPlanet`.
3. `analysis/` — `classify.ts` (insolation, energy, climate), `events.ts` (star
   ejection / planet escape), and the streaming [`Analyzer`](../../src/lib/nbody/analysis/analyzer.ts)
   that bins each instant on two axes (climate × dynamics) into eras and detects
   the events that resolve a run. It stores running totals + a compact segment/event
   list (O(1)-ish memory), so it scales to long runs and big ensembles.

**Observatory data flow.** `TrinaryStars.tsx` owns all UI state via
`usePersistentState` (namespaced `trinary:*`); a single `refs.current` mirror lets
the rAF loop and pointer handlers read live params without re-mounting. `onMount`
(inside [`Canvas3D`](../../src/components/Canvas3D.tsx)) builds the scene once and
exposes imperative `reset`/`scatter` handles via `api.current`; control-change
effects call `api.current.reset()`. Each frame: integrate N sub-steps (sized from
`speed × realDt / dt`), renormalize the hidden Lyapunov shadow, consume planets
within the collision radius (flares), sample the `Analyzer`, apply the reference-
frame transform, sync meshes/trails, feed `SkyView`, and throttle the HUD readouts.

**Lab data flow.** `TrinaryLab.tsx` owns the `EnsembleConfig` (also mirrored to the
URL). A run integrates one world headless via [`runner.ts`](../../src/animations/TrinaryStars/lab/runner.ts)
`runOne` — the *same* `step` + `Analyzer` as the live view, so ensemble stats agree
with what you see. Initial conditions are sampled deterministically from
`(baseSeed, index)` ([`rng.ts`](../../src/animations/TrinaryStars/lab/rng.ts)).
Results stream into the [`Aggregator`](../../src/animations/TrinaryStars/lab/ensemble.ts)
(outcome tallies, Welford mean ± stderr, sharpening histograms, a longest-era
leaderboard). Three execution engines feed it: **CPU** (rAF time-sliced batches),
**Workers** (a [`WorkerPool`](../../src/animations/TrinaryStars/lab/pool.ts) over
[`worker.ts`](../../src/animations/TrinaryStars/lab/worker.ts), with a watchdog
fallback to CPU), and **GPU** (experimental WGSL, falls back on error). The
**Destiny map** runs one world per pixel through [`basin.ts`](../../src/animations/TrinaryStars/lab/basin.ts)
(shared by main thread and basin workers), batching planets against one shared star
integration for speed.

## Key files

| File | Role |
|---|---|
| [`Trinary.tsx`](../../src/animations/TrinaryStars/Trinary.tsx) | Wrapper: hash → Observatory/Lab, lazy-loads each, hosts the guided tour |
| [`TrinaryStars.tsx`](../../src/animations/TrinaryStars/TrinaryStars.tsx) | Observatory: Three.js scene, panels, HUD, gestures, sim loop |
| [`Observatory.tsx`](../../src/animations/TrinaryStars/Observatory.tsx) | The view-footer readout: climate-era timeline + insolation bar + events |
| [`SkyView.tsx`](../../src/animations/TrinaryStars/SkyView.tsx) | Planet's-eye sky canvas (suns wheel overhead; climate-tinted) |
| [`Tour.tsx`](../../src/animations/TrinaryStars/Tour.tsx) | First-visit guided-tour overlay (dismissable cards) |
| [`EXPLAINER.md`](../../src/animations/TrinaryStars/EXPLAINER.md) | The **?** modal text (shared by both modes) |
| [`lab/TrinaryLab.tsx`](../../src/animations/TrinaryStars/lab/TrinaryLab.tsx) | Lab: config, engine orchestration, readout panels, the two view windows |
| [`lab/BasinMap.tsx`](../../src/animations/TrinaryStars/lab/BasinMap.tsx) | Destiny-map view: plane/lens pickers, drag-zoom, click-to-Observatory |
| [`lab/basin.ts`](../../src/animations/TrinaryStars/lab/basin.ts) | Pure per-pixel basin computation + outcome/chaos color ramps |
| [`lab/basinPool.ts`](../../src/animations/TrinaryStars/lab/basinPool.ts) · [`basinWorker.ts`](../../src/animations/TrinaryStars/lab/basinWorker.ts) | Worker pool for the Destiny map (transferable pixel blocks) |
| [`lab/runner.ts`](../../src/animations/TrinaryStars/lab/runner.ts) | Headless single + batched runs (fate / Lyapunov); the Observatory↔Lab parity engine |
| [`lab/ensemble.ts`](../../src/animations/TrinaryStars/lab/ensemble.ts) | Streaming `Aggregator`: counts, Welford stats, histograms, records |
| [`lab/rng.ts`](../../src/animations/TrinaryStars/lab/rng.ts) | Seeded PRNG + deterministic IC sampling, `EnsembleConfig` |
| [`lab/pool.ts`](../../src/animations/TrinaryStars/lab/pool.ts) · [`worker.ts`](../../src/animations/TrinaryStars/lab/worker.ts) | Census worker pool + worker entry |
| [`lab/gpu.ts`](../../src/animations/TrinaryStars/lab/gpu.ts) | **Experimental** WebGPU census engine (simplified classifier; auto-fallback) |
| [`lab/MiniSim.tsx`](../../src/animations/TrinaryStars/lab/MiniSim.tsx) | Decorative live mini-sims for the Census view |
| [`lib/nbody/`](../../src/lib/nbody/) | Shared engine: `integrator.ts`, `scenarios.ts`, `analysis/` |

## Invariants & gotchas

> [!CAUTION]
> **Gotcha — Observatory and Lab must agree.** The whole point is that the Lab's
> statistics describe the *same* worlds the Observatory shows. Both go through the
> identical `step` + `Analyzer`. If you change the integrator, softening, sampling
> cadence, or classifier in one path, the other must match or the "happy-ending %"
> stops describing what a user sees on a click-through.

- **Planets are test masses.** They feel the stars but never tug back or interact
  with each other. This is load-bearing: it isolates chaos from inter-planet noise
  (every ghost samples the identical star field) *and* lets the runner integrate a
  whole batch of planets against one shared star integration **bit-identically** to
  running each alone (`runBatchFate` / `runBatchLyap`). Don't add planet→star or
  planet→planet forces.
- **The Lyapunov shadow is a probe, never consumed.** A hidden shadow planet is
  appended after the visible ghosts; it is renormalized (Benettin) but excluded from
  collision/consumption. Keep `shadowIdx` past the visible `nGhosts`.
- **Determinism = reproducibility.** A Lab run is fully reproduced by
  `(baseSeed, index)`; the URL carries the config. Don't introduce unseeded
  `Math.random` into the run path (it's fine for the Reseed button and the decorative
  LaunchSpace scatter, which use their own local streams).
- **`recenter` keeps the system framed.** `buildStars` re-centers to zero net
  position and momentum after applying mass multipliers, so the system never drifts
  off screen. A uniform mass multiplier just rescales time; uneven ones detune a
  choreography (e.g. break the figure-eight).
- **Reference frame is a pure view transform.** Center/align only move the camera-
  space mapping; physics is untouched. Trails are recorded in the active frame and
  reset when it changes.
- **Persistence scope.** Persist *settings* (system, masses, climate, sky, trails)
  under `trinary:*`; keep transient view state (`paused`, `placeMode`, `labSnap`,
  camera orbit) out of persistence. A URL-handed world (`?px=…` / basin-map click)
  opts the system fields *out* of persistence so the link wins over stored values.
- **Window/form input separation.** The Observatory's pointer handlers live on the
  renderer canvas inside the view body; spinbox edits don't drive the scene.
- **The GPU engine is not ground truth.** Its classifier is simplified (no "calm"
  axis → Paradise% reads 0). It is opt-in, warned, and auto-falls-back; CPU/Workers
  are authoritative.

## Testing & verification

- `npm run build` — the only CI gate; must pass.
- `npm test` — runs the vitest suite, but **no Trinary tests exist yet** (the pure
  `nbody` engine is the obvious place to add them — see Active).
- Headless screenshot: `node scripts/shoot.mjs '#/trinary' shot.png` (Observatory);
  `'#/trinary-lab'` for the Lab. The route loads the persisted system; scenarios and
  the Lab config can also be preset via the URL hash query (`?p=…`, etc.).
- By eye (Observatory): turn up **ghost planets** + a small **ε** and confirm the
  cloud stays together, then smears (the **spread** readout grows ~exponentially and
  the HUD flips to *chaotic*); hand-place a planet and watch the era timeline / sky
  respond.
- By eye (Lab): run a **Census** and confirm the happy-ending % and histograms
  sharpen and stabilize as N grows; on the **Destiny map**, drag-zoom into a
  boundary (Exact lens) and confirm it stays fractal, then click a pixel and confirm
  the opened Observatory world matches the pixel's color.

## History & sources

- **Built/iterated by:** the app predates the session-tracking system, so there is
  no dedicated build branch. It appears incidentally in the chrome migration
  (`new-chrome`, `app-chrome-overhaul-lnqgle`) and gallery ordering
  (`gallery-app-ordering-4y84fi`) reports under [`docs/sessions/`](../sessions/).
- **Possible sources:** see the EXPLAINER's references (Poincaré on the
  three-body problem; the Chenciner–Montgomery figure-eight and Šuvakov–Dmitrašinović
  choreographies; Burrau's Pythagorean problem; Liu Cixin's *The Three-Body
  Problem* for the habitability premise).
