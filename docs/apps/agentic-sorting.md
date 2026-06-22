---
kind: app-guide
app: agentic-sorting
route: "#/agentic-sorting"
name: Agentic Sorting
title: Agentic Sorting — developer guide
status: stable
build: passed
entry: src/animations/AgenticSorting/AgenticSorting.tsx
updated: 2026-06-22
signals: null
next: null
---

# Agentic Sorting — developer guide

> Watch autonomous agents with rival strategies race to sort a population of values.

The living architecture + status doc for this app. Conventions:
[`GUIDE_STYLE.md`](GUIDE_STYLE.md). What this doc type is: [`README.md`](README.md).
Teaching/math lives in
[`EXPLAINER.md`](../../src/animations/AgenticSorting/EXPLAINER.md), not here.

## Status

- **Route:** `#/agentic-sorting` → `AgenticSorting` ([`src/index.tsx`](../../src/index.tsx) route map). Listed in the gallery.
- **Stability:** 🟢 **stable** — functionally complete after a legibility pass; low
  churn. Canvas-rendered (not DOM marks) so it stays legible at hundreds of agents.
- **Entry:** `AgenticSorting.tsx` (~870 LOC of shell) over a **pure engine** of
  helper modules (`engine`, `metrics`, `arena`, `lab`, plus `LabResults.tsx` and the
  `useCanvas2D` hook) + `agenticSorting.css`.
- **Build/tests:** covered by `npm run build`; **no app-specific unit tests** (the
  engine is pure and seeded, so it is test-ready — none committed yet).

## Active / Resolved

The per-app control center — hand-maintained ([`GUIDE_STYLE.md`](GUIDE_STYLE.md) §3c).

### Active

- [ ] **!low** Reconcile the docs with the removed **Replicate** panel.
  The legibility pass **removed** the Sandbox Replicate panel, but
  [`EXPLAINER.md`](../../src/animations/AgenticSorting/EXPLAINER.md) and
  [`README.md`](../../src/animations/AgenticSorting/README.md) still describe it as a
  live panel. Either re-add the panel or trim the prose so the **?** modal matches
  the UI.
- [ ] **!low** Add a committed `__tests__/` suite — `engine.step` / `metrics` are
  pure and seeded, ideal for vitest regressions (clustering, sortedness, the
  deterministic collision resolution under divergent objectives).

### Resolved

<!-- newest first -->
- [x] **2026-06-11** (`agentic-sorting-app-j6ngd4`) — Legibility pass: a
  **Scenarios** panel of five one-click presets, a reworked default layout that
  finally surfaces the **Trajectories** plot, a sweep of relabels, removal of the
  duplicated Replicate panel, and a code tidy. Six build-green commits, verified by
  headless screenshots.
  [Handoff.](../sessions/handoff/agentic-sorting-app-j6ngd4/2026-06-10-S01-objectives-and-competencies.md)
- [x] **earlier** — Built the divergent-objective **Phase separation** mode (an
  animath-original extension), the all-agent Trajectories plot, the clustering /
  frozen-ceiling competency readouts, and the Sandbox / Lab split.

## What it does

A concurrent **cell-view** sorting sandbox: every array element is an autonomous
agent running one local rule (its *algotype*); sortedness, when it appears, is
emergent. A top-bar **mode** toggles **Sandbox** (live sim) vs **Lab** (batch
experiments), each with its own panels, views, and layouts.

**Five algotypes** (loose-to-faithful echoes of classic sorts): Standard (bubble),
Blind Date (randomized compare-swap), Nomadic (insertion-style drift), Patrolling
(cocktail-shaker), Perfectionist (selection).

**Sandbox mode:**
- **Scenarios panel** (`subject`) — five one-click presets (Clustering, Robustness,
  Delayed gratification, Phase separation, "the even mix is slow") that set the
  population + view and run.
- **Array panel** (`subject`) — Array size, Wake rate, Step interval.
- **Display panel** (`marks`) — bars/dots, color By algotype / By objective.
- **Population mix panel** (`drive`) — per-algotype weights (a stacked `MixBar`).
- **Run panel** (`playback`) — Start/Pause, Reset, Objective (Selfish / Phase
  separation, with a descending share), Frozen/defective %.
- **Metrics panel** (`readout`) — sortedness, inversions, monotone runs, clustering
  (excess homophily), best-reachable ceiling (with frozen cells), via the shared
  `StatGrid`/`Sparkline`/`Kicker` readouts.
- **Track agent panel** (`readout`) — click an agent to follow its distance-to-home.
- **Array view** + **Trajectories view** — the canvas arena, and every agent's
  distance-to-home over time (warm lines = backtracked = delayed gratification).
- Layouts: **Explore** (Scenarios + arena + trajectories), **Tinker**, **Analyze**.

**Lab mode:**
- **Experiment / Conditions / Metric / Run panels** drive headless batches:
  **Compare** each pure algotype head-to-head, **Monte-Carlo** the current mix,
  **Mixes** (saved population mixes), or **Sweep** one knob across its range. The
  **Results view** plots mean ± sd per condition.

## How the code works

**Shell ↔ engine split.** `AgenticSorting.tsx` owns all UI state (persisted via
`usePersistentState`), the rAF/interval sim loop, canvas wiring, the panels and the
two mode-specific workspace assemblies. The simulation, measurement, rendering, and
batch logic are pure modules.

**The engine** ([`engine.ts`](../../src/animations/AgenticSorting/engine.ts)) —
`step(state, rand, wakeFraction)` is a **pure reducer**: it clones the population,
wakes a random non-frozen subset, each agent's `propose` returns a target index, and
proposals apply with **deterministic collision resolution** (processed in `from`-index
order; a swap commits only if neither cell already moved this tick and neither is
frozen). Randomness is injected (`rand: () => number`) so a seeded `mulberry32` makes
a whole run reproducible. `generate` builds a weighted-algotype, value, objective, and
frozen population. Objective `+1` (ascending) / `-1` (descending) is what the Phase
separation mode mixes.

**Measurement** ([`metrics.ts`](../../src/animations/AgenticSorting/metrics.ts)) —
pure observables: `sortedness`, `inversions`, `monotoneRuns`, `frozenCeiling`,
`homeIndex`, and the key Levin result `algotypeClustering` (**excess homophily over
chance** — the random-shuffle baseline is subtracted so a positive value is real
clustering, not a restatement of the mix). `measure` rolls them into one `MetricsView`.

**Rendering** ([`arena.ts`](../../src/animations/AgenticSorting/arena.ts)) —
`drawArena` and `drawTrajectories` paint to a 2D canvas (Okabe–Ito CVD-safe palette).
The [`useCanvas2D`](../../src/animations/AgenticSorting/useCanvas2D.ts) hook handles
DPR-aware sizing via a `ResizeObserver`, ignoring zero-size (collapsed / unmounted)
and re-attaching on the deps (pass the mode so a remounted canvas is re-observed).

**The Lab** ([`lab.ts`](../../src/animations/AgenticSorting/lab.ts)) — `runTrial`
runs one population to the cycle cap recording when it first crossed the sortedness
threshold; `runExperiment` builds the conditions (compare / monte / mixes / sweep),
runs the trials, and `await`s `setTimeout(0)` every 20 trials so the progress bar
paints. Because `step` is pure, thousands of trials finish in a few hundred ms.
[`LabResults.tsx`](../../src/animations/AgenticSorting/LabResults.tsx) renders the
mean ± sd plots.

**The two modes are two `<Workspace>` configs.** `AgenticSorting` swaps `sections` /
`views` / `layouts` / `appId` by `mode` and re-keys the `<Workspace key={mode}>`, so
Sandbox and Lab persist their window layouts under separate namespaces
(`agentic-sorting` vs `agentic-sorting-lab`).

## Key files

| File | Role |
|---|---|
| [`AgenticSorting.tsx`](../../src/animations/AgenticSorting/AgenticSorting.tsx) | React shell: state, sim loop, canvas wiring, panels, the two mode workspaces |
| [`engine.ts`](../../src/animations/AgenticSorting/engine.ts) | Pure simulation: `generate`, `step` (pure reducer + collision resolution), `propose`, the five algotypes, `mulberry32` |
| [`metrics.ts`](../../src/animations/AgenticSorting/metrics.ts) | Pure observables: sortedness, inversions, monotone runs, `algotypeClustering`, `frozenCeiling`, `homeIndex`, `measure` |
| [`arena.ts`](../../src/animations/AgenticSorting/arena.ts) | Canvas renderers `drawArena` / `drawTrajectories` + the Okabe–Ito `TYPE_COLORS` |
| [`useCanvas2D.ts`](../../src/animations/AgenticSorting/useCanvas2D.ts) | DPR-aware canvas sizing hook (ResizeObserver) |
| [`lab.ts`](../../src/animations/AgenticSorting/lab.ts) | Batch experiments: `runTrial`, `runExperiment`, conditions for compare/monte/mixes/sweep |
| [`LabResults.tsx`](../../src/animations/AgenticSorting/LabResults.tsx) | Renders the Lab mean ± sd result plots |
| [`agenticSorting.css`](../../src/animations/AgenticSorting/agenticSorting.css) | All `as-*` styling (panels, arena, progress, legend) |
| [`EXPLAINER.md`](../../src/animations/AgenticSorting/EXPLAINER.md) · [`README.md`](../../src/animations/AgenticSorting/README.md) | The **?** modal text |

## Invariants & gotchas

> [!CAUTION]
> **Gotcha** — `step` must stay a **pure reducer** (`step(state, rand) → state`,
> no mutation of its input, randomness only via the injected `rand`). The Lab runs
> thousands of headless trials assuming reproducibility, and `propose` mutates only
> the *cloned* `agents` array `step` owns (patrolling flips its `dir` in place). Break
> purity and the Lab numbers stop being reproducible and the tests-to-be can't pin
> them.

- **Deterministic collision resolution matters under divergent objectives.** In
  Phase separation two agents can target the same cell in one tick; proposals are
  sorted by `from` and a swap commits only if neither cell already moved and neither
  is frozen. Don't reorder this or ties resolve nondeterministically.
- **Clustering subtracts the chance baseline** (`algotypeClustering` returns excess
  homophily in [−1, 1], 0 for a single type). It's meaningful only for a *mixed*
  population — pure strategies report ≈0. Don't read raw same-neighbor counts.
- **Frozen cells are obstacles, not values to sort.** `frozenCeiling` is the best
  reachable sortedness with them pinned; the agents getting *close* to it is the
  robustness result. Frozen agents never wake and can't be a swap target.
- **Canvas, not DOM marks.** The clustering phenomenon needs hundreds of agents to be
  visible; keep rendering on the canvas. `useCanvas2D` ignores zero-size resizes and
  re-attaches on the mode (a remounted canvas must be re-observed).
- **Phase separation generally never fully sorts** — sortedness stalls near ½. Watch
  **Monotone runs**, not sortedness; this is intended (the animath-original mode).
- **Docs lag:** the **Replicate** panel was removed but the EXPLAINER/README still
  mention it — see the Active item.

## Testing & verification

- `npm run build` — the only CI gate; must pass.
- No unit tests committed for this app. `engine.step` and `metrics` are pure and
  seeded — ideal vitest targets (Active item).
- Headless screenshot: `node scripts/shoot.mjs '#/agentic-sorting' shot.png`.
- By eye: in the **Explore** layout a Scenario runs the arena toward sorted (bars
  fan low→high across the midline) and the Trajectories plot fills with lines
  descending to home; switch the top-bar mode to **Lab**, **Run experiment** in
  Compare, and the Results view shows each pure algotype's mean ± sd (Blind Date and
  Perfectionist as the faithful/fast ones).

## History & sources

- **Built/iterated by:** `agentic-sorting-app-j6ngd4` (the legibility pass + the
  objectives/competencies build) — under [`docs/sessions/`](../sessions/).
- **Possible sources:** see the EXPLAINER and README — Zhang, Goldstein & Levin,
  *Classical Sorting Algorithms as a Model of Morphogenesis* (Adaptive Behavior,
  2025; [arXiv:2401.05375](https://arxiv.org/abs/2401.05375)); the Phase separation
  mode is an animath-original extension.
</content>
