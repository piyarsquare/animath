---
kind: app-guide
app: stable-matching
route: "#/stable-matching"
name: Stable Matching
title: Stable Matching — developer guide
status: active
build: passed
entry: src/animations/StableMatching/StableMatching.tsx
updated: 2026-06-22
signals: null
next: Tier 5 (preference falsification / strategic manipulation) is the one unbuilt tier — pending a product decision.
---

# Stable Matching — developer guide

> A rebuilt Gale–Shapley lab: tune how much each group shares a common preference,
> then watch the proposer advantage appear — and vanish at full consensus.

The living architecture + status doc for this app. Conventions:
[`GUIDE_STYLE.md`](GUIDE_STYLE.md). What this doc type is: [`README.md`](README.md).
Teaching/math lives in
[`EXPLAINER.md`](../../src/animations/StableMatching/EXPLAINER.md), not here.

## Status

- **Route:** `#/stable-matching` → `StableMatching` ([`src/index.tsx`](../../src/index.tsx) route map). Listed in the gallery.
- **Stability:** ✅ **active** — the rebuilt successor to
  [Stable Marriage](stable-marriage.md). The richest of the algorithm-visualizer
  family: it shows the whole **solution space**, not just one run. Tiers 0–4 are
  built; Tier 5 (strategic manipulation) is the only unbuilt one.
- **Entry:** `StableMatching.tsx` (~900 LOC of components + workspace wiring) over a
  **factored pure engine** of four `.ts` modules (~660 LOC) — `model`, `galeShapley`,
  `rotations`, `resolver` — plus `stableMatching.css`.
- **Build/tests:** covered by `npm run build`; **no app-specific unit tests in the
  repo today** (the rotation engine was cross-checked against brute force during the
  build — `allStableBrute` is the in-source reference — but no committed
  `__tests__/`). Keep the engine pure so it stays test-ready.

## Active / Resolved

The per-app control center — hand-maintained ([`GUIDE_STYLE.md`](GUIDE_STYLE.md) §3c).

### Active

- [ ] **!med (product)** Tier 5 — preference falsification / strategic manipulation.
  The one wishlist tier left unbuilt; needs a product decision (per the Tiers 0–4
  handoff). Also covered in the predecessor's
  [`EXTENSIONS.md`](../../src/animations/StableMarriage/EXTENSIONS.md).
- [ ] **!low** Add a committed `__tests__/` suite for the engine — the
  `allStableBrute` reference in [`rotations.ts`](../../src/animations/StableMatching/rotations.ts)
  exists precisely to cross-check the fast rotation enumeration; wire it into vitest.

### Resolved

<!-- newest first -->
- [x] **2026-06-08** (`stable-marriage-styling-ulMPt`, PR #189) — Built the
  **solution-space tiers 0–4**: the verified rotation engine, the stable-pair
  footprint + lattice count, the named/fair solutions with Jump-to, the lattice
  Hasse-diagram view, and the Roth–Vande Vate resolver with a cost-to-stabilize Lab
  surface. Rotation math cross-checked vs brute force (1440 cases). Earlier in the
  same session: the per-side outcome panel (averages + sorted ECDF-style colorbars),
  population cap raised to 200, matrix cell floor to 5px.
  [Handoff.](../sessions/handoff/stable-marriage-styling-ulMPt/2026-06-08-S01-solution-space-tiers.md)
- [x] **earlier** — Migrated onto the workspace chrome: the old in-page
  Visualizer / Lattice / Lab tab strip became the **Run / Lab / Lattice** layouts
  (`views[id].open`).

## What it does

A foregrounded Gale–Shapley lab. The algorithm runs in **synchronous rounds** (a
whole side proposes at once), and three workspace **layouts** swap the focus:
**Run** (the matrix), **Lab** (the welfare surface), **Lattice** (the solution space).

- **Algorithm panel** (`subject`) — **Schedule** (who proposes each round): A, B,
  Alternate, or Random (with a Bias-toward-A slider).
- **Instance panel** (`domain`) — Population per side (3–200), **Consensus A** /
  **Consensus B** sliders, a Seed + Shuffle (a fresh reproducible instance).
- **Display panel** (`marks`) — what each matrix cell shows (Both/Lego, A→B, B→A,
  Difference), row/column **Order** (match-diagonal, settle-round, attractiveness,
  original index), index labels, tight grid, the **stable-pair footprint** toggle,
  and live re-sort.
- **Playback panel** (`playback`) — Play/Step/Finish/Reset over the rounds, Speed,
  **Stabilize** (Roth–Vande Vate repair, enabled only when the final run is
  unstable), and a **Jump to a stable solution** dropdown (live run · A/B-optimal ·
  egalitarian · median · min-regret · sex-equal · balanced). Projected onto the
  always-on action strip (the strip swaps to the RVV replay verbs while stabilizing).
- **Lab panel** (`lab`) — Schedule, **Surface** (Ranks A·B "lego", Unstable %,
  Blocking, # stable, Repair cost), Mean/Std-dev toggle, population, resolution,
  trials per cell, seed + re-roll, Run/Stop.
- **Matching matrix view** — the headline: an n×n grid, rows = A, cols = B, each
  cell a BuRd-scaled pair of ranks (square = A→B, circle = B→A). The matching lights
  green; a proposal rings gold; rejections/bumps flash purple and leave a fading
  trail; blocking pairs flag red; the footprint outlines cells matched in *some*
  stable matching. A metrics strip reads per-side average rank (with sorted outcome
  colorbars), solution-space size, and stability. Hover/pin a cell to read both
  people's full ranked lists.
- **Welfare surface view** — a consensus-A × consensus-B heatmap of the chosen Lab
  metric, with a **Surface summary** (mean/median/range/extremes/noise) and **Copy
  CSV / Download**.
- **Stable-matching lattice view** — the Hasse diagram of all stable matchings
  (A-optimal top, B-optimal bottom, each edge a rotation), named solutions flagged;
  click a node to load it into the matrix.

## How the code works

**Shell ↔ engine split.** `StableMatching.tsx` is the React shell: state, the
`Matrix` / `PrefList` / `Heatmap` / `LabSummary` / `LatticeView` components, the
panels/views/layouts, and all the derived `useMemo` accounting. The math is the four
pure `.ts` modules — everything seeded and reproducible.

**The instance** ([`model.ts`](../../src/animations/StableMatching/model.ts)) —
`generateInstance` builds both groups' preference lists from a latent `quality` per
person, blended with private noise by the Consensus weight, using a `mulberry32`
seeded PRNG. It precomputes `rankA`/`rankB` (inverse lookups) so the matrix and the
algorithm are O(1) per query.

**The algorithm** ([`galeShapley.ts`](../../src/animations/StableMatching/galeShapley.ts)) —
two run flavors over one `propose` primitive:
- `oneSided(inst, proposer)` — classical deferred acceptance → the
  proposer-optimal stable matching (used to seed the lattice and the extremal gap).
- `runRounds(inst, schedule, bias, seed)` — the **synchronous, round-based** run the
  UI animates: each round a whole side proposes at once, each receiver keeps its
  single best offer; the schedule picks the proposing side. Returns `rounds` (a
  replayable event log) + the final matching. `applyLog` replays the first *k* events
  to rebuild the matching at any step; `blockingPairs` / `stats` measure it.

**The solution space** ([`rotations.ts`](../../src/animations/StableMatching/rotations.ts)) —
the stable matchings form a distributive lattice. `allStableMatchings` enumerates it
by BFS **rotation elimination** from the A-optimal matching (capped — the worst case
is #P-hard). `stablePairs` gives the footprint; `namedSolutions` locates the
egalitarian/median/min-regret/sex-equal/balanced matchings inside the enumerated set;
`buildLattice` / `layoutLattice` produce the Hasse diagram. `allStableBrute` (all n!
matchings) is the cross-check reference.

**The repair** ([`resolver.ts`](../../src/animations/StableMatching/resolver.ts)) —
`rothVandeVate` takes any (possibly unstable) matching and walks it to stability by
repeatedly satisfying a blocking pair: **mostly greedy** (the most mutually-wanted
pair, to keep paths short and watchable) with a **random kick** when greedy progress
stalls (to break cycles almost surely). It records each step so the matrix can
animate the purple cells healing; `replaySteps` steps the animation.

**Data flow.** `inst` (from the instance knobs) → `result = runRounds(…)` → the
displayed `matching` is `applyLog(…, roundEnd[step])`; or a static **jumped** named
matching, a **picked** lattice node, or an **RVV resolve** replay overrides it
(`shown`). All derived readouts (`acct`, `blocking`, `markers`, `trail`, row/col
order) recompute from `shown`. The Lab is a separate batched loop (`runLab`) that
sweeps the consensus grid, averaging `labTrials` seeded instances per cell, yielding
via `setTimeout(…, 0)` so the progress bar paints; a cancel ref stops it.

**Matrix sizing** — a `ResizeObserver` on the matrix wrap (held as **element state**,
not a ref, so it re-measures when a layout closes/reopens the view) computes the
largest square cell that fits the whole grid with no scroll, capped at `MAX_CELL`.

## Key files

| File | Role |
|---|---|
| [`StableMatching.tsx`](../../src/animations/StableMatching/StableMatching.tsx) | React shell: `Matrix`, `PrefList`, `Heatmap`, `LabSummary`, `LatticeView`, all panels/views/layouts, derived accounting |
| [`model.ts`](../../src/animations/StableMatching/model.ts) | `generateInstance` (consensus-blended preferences) + `mulberry32` PRNG + `rankA`/`rankB` |
| [`galeShapley.ts`](../../src/animations/StableMatching/galeShapley.ts) | `oneSided`, `runRounds` (synchronous rounds + event log), `applyLog`, `blockingPairs`, `stats`, `extremal` |
| [`rotations.ts`](../../src/animations/StableMatching/rotations.ts) | The lattice: `allStableMatchings` (rotation elimination), `stablePairs`, `namedSolutions`, `layoutLattice`, `allStableBrute` (test reference) |
| [`resolver.ts`](../../src/animations/StableMatching/resolver.ts) | `rothVandeVate` (random-path-to-stability repair) + `replaySteps`, `blockingPairList` |
| [`stableMatching.css`](../../src/animations/StableMatching/stableMatching.css) | All `sm2-*` styling (matrix, heatmap, lattice SVG, metrics strip) |
| [`EXPLAINER.md`](../../src/animations/StableMatching/EXPLAINER.md) · [`README.md`](../../src/animations/StableMatching/README.md) | The **?** modal text |

## Invariants & gotchas

> [!CAUTION]
> **Gotcha** — the synchronous round schedules **Alternate** and **Random** are
> *usually not stable*: they leave blocking pairs (the matrix flags them red). This
> is intentional — only one-sided A/B is guaranteed stable. Don't "fix" it; it's the
> point of the **Stabilize** (RVV) button and the Lab's Unstable% surface.

- **Lattice enumeration is capped** (`FOOT_CAP = 1000` for the footprint,
  `ENUM_CAP = 300` for the Lab's # stable surface, `LATTICE_CAP = 80` nodes drawn).
  The worst case is #P-hard; capping is deliberate. Surfaces marked `capped` are
  approximate — keep populations small for the # stable and lattice views.
- **`shown` is the single source of truth for the displayed matching** — it
  resolves the precedence resolve-replay → picked-lattice-node → jumped-named →
  live-step. Markers/trail/blocking/accounting all key off it. A new `result`
  resets step/jump/resolve; a new `inst` invalidates node indices (both have effects
  that clear them) — preserve those resets or the lattice indices go stale.
- **The matrix wrap is element state, not a ref.** The `ResizeObserver` measuring
  effect keys on `matrixWrap` so it re-runs when a layout closes and reopens the
  view (a remount). Don't revert it to a bare ref.
- **Everything is seeded.** `generateInstance` and the Lab cells use `mulberry32`;
  the proposer/RVV randomness offsets the seed (`^ 0x9e3779b9`, `^ 0x85ebca6b`) so it
  is independent of the preference stream. Reproducibility (and CSV export) depend on
  this — don't reach for `Math.random()`.
- **RVV is mostly-greedy with a random kick** (`STALL = 3`). Pure greedy can cycle;
  pure random can wander for thousands of steps. Keep the hybrid or the "cost to
  stabilize" numbers (and the watchable step count) change.
- **At full consensus the lattice collapses to a single point** — a unique stable
  matching on the diagonal. The lattice view says so rather than drawing one node.

## Testing & verification

- `npm run build` — the only CI gate; must pass.
- No committed unit tests today. The intended safety net is `allStableBrute`
  ([`rotations.ts`](../../src/animations/StableMatching/rotations.ts)) cross-checked
  against `allStableMatchings` — wiring that into vitest is an Active item.
- Headless screenshot: `node scripts/shoot.mjs '#/stable-matching' shot.png`. The
  instance knobs persist in localStorage (`usePersistentState`, `stable-matching:*`).
- By eye: with Schedule = A, Step/Finish fills the matrix diagonal green with no red
  cells (stable, A's bar mostly blue = proposer advantage); switch to **Alternate**
  and finish to surface red blocking cells, then **Stabilize** and watch them heal.
  Open the **Lattice** layout at low consensus to see a multi-node Hasse diagram that
  collapses to one point as consensus → 100%. In the **Lab** layout, Run Lab fills
  the consensus-plane surface and the summary + CSV export populate.

## History & sources

- **Built/iterated by:** `stable-marriage-styling-ulMPt` (the solution-space tiers
  0–4 build, PR #189) and the `gale-shapley-strategy` design session — under
  [`docs/sessions/`](../sessions/).
- **Possible sources:** see the EXPLAINER's account (Gale & Shapley 1962; Conway's
  lattice of stable matchings; Teo–Sethuraman median; Roth & Vande Vate 1990).
</content>
