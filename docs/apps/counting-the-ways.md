---
kind: app-guide
app: counting-the-ways
route: "#/counting-the-ways"
name: Counting the Ways
title: Counting the Ways — developer guide
status: active
build: passed
entry: src/animations/CountingTheWays/CountingTheWays.tsx
updated: 2026-06-24
signals: null
next: Make the Lab cumulative — a pooled/running μ̂ that tightens as runs accumulate, a convergence trace, and the spread of μ̂ across runs (TODO `[counting-the-ways] !med`); today each run logs one independent row.
---

# Counting the Ways — developer guide

> Why does a **modified Bessel function** `I_{|k|}` appear when you take the
> difference of two independent Poisson counts (a **Skellam** distribution)?
> Because it *is* a sum down one diagonal of the `(gains, losses)` lattice. Walk
> the diagonal rung by rung and the scary function becomes a simple sum.

The living architecture + status doc for this app. Conventions:
[`GUIDE_STYLE.md`](GUIDE_STYLE.md). What this doc type is: [`README.md`](README.md).
The teaching/math ("what am I looking at") lives in
[`EXPLAINER.md`](../../src/animations/CountingTheWays/EXPLAINER.md), not here.

## Status

- **Route:** `#/counting-the-ways` → `CountingTheWays`
  ([`src/index.tsx`](../../src/index.tsx) route map). Listed in the gallery
  (`catalog.ts`: `cat: 'Algorithm'`, preview `kind: 'skellam'`). No embed twin.
- **Stability:** ✅ **active** — the collection's **first probability/statistics
  app** (and a new gallery flavor). Shipped via **PR #233**. Two top-bar modes,
  **Explain** (the narrated lattice + diagonal-sum tutorial) and **Lab** (a
  cataloged moment-recovery simulator).
- **Entry:** `CountingTheWays.tsx` (~675 LOC — the React shell, both modes'
  panels/views, the SVG lattice + distribution strips, the tutorial rAF clock) +
  the pure engine `skellam.ts` (~245 LOC) + `countingTheWays.css` (~290 LOC). No
  Three.js / WebGL — it is DOM + inline SVG.
- **Build/tests:** `npm run build`, **plus** app-specific unit tests
  (`__tests__/skellam.test.ts`, run by `npm test`) over the pure engine.

## Active / Resolved

The per-app control center — hand-maintained ([`GUIDE_STYLE.md`](GUIDE_STYLE.md) §3c).

### Active

- [ ] **!med** Make the **Lab cumulative**. Today each *Run & log* draws an
  independent sample and appends a row with its own method-of-moments `μ̂` — no
  accumulation. The point of the Lab is to *feel* the estimator converge, so add a
  pooled / running `μ̂` that tightens as runs accumulate, a convergence trace
  (estimate vs. total samples), and the spread of `μ̂` across runs. Engine is in
  place (`fitMoments`, the seeded sampler); the work is UI in the Lab view/sections.
  TODO `[counting-the-ways] !med` (Dan 2026-06-23: "the lab needs work, showing
  cumulative results").
- [ ] **!low** Real-device mobile pass. The app re-chromes to the phone UI (stacked
  view cards + bottom dock + the Play/Run action strip); verify the lattice + the
  two distribution strips read at phone width and the action strip clears the dock.

### Resolved

<!-- newest first -->
- [x] **2026-06-23** — Visual-polish rounds: compact joint grid, two-channel
  **skin-neutral** color (no hardcoded "gold"/"teal" — the gallery `SkellamPreview`
  reads live theme tokens, the model for the [`chrome`] theme-driven-graphics TODO),
  fullscreen grows the *distributions* not the grid, and a sticky walkthrough caption
  that can't hide under the window header.
- [x] **earlier** — Built **Explain** (the `(gains, losses)` lattice, the swept
  `k`-diagonal, the color-linked factored formula, the conditional-over-rungs
  readout, and the **Play tutorial** that builds the whole matrix: Poisson margins →
  every cell as a product → the diagonal summed rung-by-rung onto `P(K=k)`), the
  **Lab** (seeded sampler → method-of-moments recovery → logged catalog rows), the
  **softplus length-law** rate source `f(L)=softplus(a+b·L)`, and the pure
  `skellam.ts` engine + its unit tests.

## What it does

A DOM/SVG explainer + lab for the **Skellam distribution** — the difference
`K = X − Y` of two independent Poisson counts `X~Poisson(μ₁)`, `Y~Poisson(μ₂)` —
whose pmf carries a modified Bessel function `I_{|k|}(2√(μ₁μ₂))`. The app's thesis:
that Bessel function **is the sum down the `X−Y=k` diagonal** of the joint lattice.

**Top-bar mode pills** switch the whole app between two stories:

### Explain mode

- **The two counts** panel (`subject`) — the **framing** (micro: repeats
  gained/lost · generic: X/Y), the **rate source** (direct `μ₁,μ₂` sliders, or the
  length-law `f(L)=softplus(a+b·L)` with `a,b` per arm + a length `L`), and the live
  rates read-out.
- **Difference** panel (`domain`) — the difference `k` selector (which diagonal
  lights up).
- **Display** panel (`marks`) — grid cap, show-margins, show-notes toggles, tutorial
  speed.
- **Formula** panel (`readout`) — the color-linked factored Skellam formula and the
  conditional-over-rungs breakdown (each conditional = one Bessel term ÷ the Bessel
  sum), built from the shared `chrome/readouts` primitives.
- **Build it** panel (`playback`) — the tutorial transport (Play / Next step /
  Reset), projected to the always-on **action strip**.
- **View** — *The lattice of ways*: the `(gains, losses)` grid shaded by
  `P(gained=x)·P(lost=y)`, the Poisson margins along the top/left, the swept
  `k`-diagonal, and the Skellam + Bessel distribution strips.

### Lab mode

- **The rates** panel (`subject`) — same rate source as Explain (direct or law).
- **Run the lab** panel (`lab`) — sample size `N`, seed, and the run/clear actions;
  each run logs a catalog row.
- **View** — *Simulator & catalog*: each run draws a sample, recovers `μ̂` by
  method-of-moments, and logs a row (with the fitted Skellam — Bessel and all —
  landing on that run's histogram) so seeds/sizes/rates can be compared.

## How the code works

A **shell ↔ pure-engine** split, like the other CSS/DOM apps (StableMatching,
AgenticSorting). No WebGL: the lattice and strips are inline `<svg>`.

- **`skellam.ts`** is the pure engine (no React/DOM, fully unit-tested):
  log-space Poisson (`logFactorial`/`poissonPmf`/`poissonRange`), the modified
  Bessel series (`besselTerm`/`besselI`) and — the pedagogical heart — the **honest
  diagonal-sum pmf** `skellamPmf`, which sums `diagTerm` rungs down the `k`-diagonal
  rather than evaluating the closed form (so the picture and the number are the same
  computation). Plus `besselBreakdown` / `conditionalRungs` / `significantRungs` for
  the readouts, the softplus length-law (`softplus`/`lawRate`), a seeded RNG
  (`mulberry32`) feeding `samplePoisson`/`sampleSkellam`, the method-of-moments fit
  `fitMoments` (`μ̂₁=(s²+m̄)/2`, `μ̂₂=(s²−m̄)/2`), and `histogram`.
- **`CountingTheWays.tsx`** is the React shell: all settings are
  `usePersistentState` under the `counting-the-ways:*` namespace; it derives the
  rates (`μ₁,μ₂`) from either the direct sliders or the two softplus arms read at
  length `L`, builds the per-mode `SectionDef[]` / `ViewDef[]` / `LayoutDef[]` /
  `ActionDef[]`, and renders one `<Workspace>` with `modes`/`activeMode`. The
  **Explain tutorial** is driven by a single monotone `frame` integer advanced by a
  rAF clock at `speed`; a `useMemo` maps `frame` to one of four stages —
  `margins → fill → sweep` (plus `static` when not running) — and that stage object
  gates what the SVG draws (which margins are shown, the cell-reveal threshold,
  whether the diagonal is active, and the partial rung sum), so the whole build-up is
  a pure function of one counter.
- **Update flow.** A panel control sets persistent state → React re-renders → the
  memoized engine results (`strip`, partial sums, breakdown) and the SVG recompute.
  The rAF clock only drives the transient tutorial `frame`.

## Key files

| File | Role |
|---|---|
| [`CountingTheWays.tsx`](../../src/animations/CountingTheWays/CountingTheWays.tsx) | React shell: both modes' panels/views/layouts/actions, the SVG lattice + distribution strips, the rate derivation, the staged-tutorial rAF clock, `<Workspace>` |
| [`skellam.ts`](../../src/animations/CountingTheWays/skellam.ts) | **Pure engine**: log-space Poisson, Bessel series, the honest diagonal-sum `skellamPmf`, conditionals, the softplus law, the seeded sampler, `fitMoments`, `histogram` |
| [`__tests__/skellam.test.ts`](../../src/animations/CountingTheWays/__tests__/skellam.test.ts) | Vitest over the engine (diagonal sum vs. closed form, sampler, moment fit) |
| [`countingTheWays.css`](../../src/animations/CountingTheWays/countingTheWays.css) | App-local styles (lattice cells, strips, sticky tutorial caption, fullscreen rules) |
| [`EXPLAINER.md`](../../src/animations/CountingTheWays/EXPLAINER.md) | The **?** modal text (teaching/math) + "Possible sources" |
| [`README.md`](../../src/animations/CountingTheWays/README.md) | The longer About write-up |

## Invariants & gotchas

> [!CAUTION]
> **The diagonal sum and the printed probability must stay the same computation.**
> `skellamPmf` deliberately sums the rungs `diagTerm(μ₁,μ₂,k,n)` down the diagonal
> instead of calling the closed-form `(μ₁/μ₂)^{k/2}·I_{|k|}(2√(μ₁μ₂))`. That *is*
> the lesson (the Bessel function is the sum). If you "optimize" it to the closed
> form, the picture and the number can silently diverge — keep them one path.

- **Rates are derived, not stored twice.** `μ₁,μ₂` come from either the direct
  sliders or the two softplus arms read at length `L` (rate source `direct | law`);
  downstream code reads the derived `μ₁,μ₂`. Below the hinge `L* = −a/b` the law
  rate is ~0, above it it rises with slope `b` — don't assume positive rates from
  arbitrary `a,b,L`.
- **The tutorial is a pure function of one `frame` counter.** Four stages
  (`margins → fill → sweep`, `static` when idle) are computed from `frame`; the rAF
  clock only increments it. Don't add side-stateful tutorial logic — keep it
  derivable so a paused/scrubbed frame renders identically.
- **Skin-neutral colors.** The two channels use theme tokens, not literal
  "gold"/"teal"; the gallery `SkellamPreview` (`chrome/previews.tsx`) reads live
  `--accent`/`--accent-2`/`--bg` via `getComputedStyle`. Keep new visuals
  token-driven so every skin renders faithfully (it's the model for the
  theme-driven-graphics TODO).
- **Fullscreen grows the distributions, not the grid.** A deliberate CSS rule keeps
  the lattice compact in fullscreen and lets the Skellam/Bessel strips enlarge; the
  tutorial caption is `position: sticky` so scrolled grid content can't bleed over
  it. Don't reintroduce a fullscreen rule that re-enlarges the lattice.
- **Persist settings, not transient view.** Rates/framing/`k`/law params/seed/size
  are `usePersistentState` (`counting-the-ways:*`); the tutorial `frame` and
  `playing` are transient.

## Testing & verification

- `npm run build` — the only CI gate; must pass.
- `npm test` — `__tests__/skellam.test.ts` covers the engine (the diagonal sum
  agrees with the closed-form Bessel value, the sampler, the moment fit).
- Headless screenshot: `node scripts/shoot.mjs '#/counting-the-ways' shot.png`.
- By eye: in **Explain**, pick a difference `k` and confirm exactly one diagonal
  lights up; press **Play** and confirm the build order **margins → every cell as a
  product → the diagonal summed rung-by-rung onto `P(K=k)`**; switch the rate source
  to **law** and confirm `μ₁,μ₂` track the two softplus curves at the chosen `L`. In
  **Lab**, run a few times and confirm `μ̂` wobbles with the seed and the fitted
  Skellam lands on each run's histogram.

## History & sources

- **Built/iterated by:** the `focused-cerf` branch
  ([`docs/sessions/`](../sessions/) → `focused-cerf-60tgup`), shipped as PR #233.
- **Possible sources:** see the EXPLAINER's "Possible sources & where to go
  further" — **Skellam (1946)** (the Poisson-difference distribution and its
  Bessel-function form; a related Irwin result of the era), the **modified Bessel
  function** `Iₙ` series (e.g. Abramowitz & Stegun Ch. 9), and the **stepwise
  mutation model** for microsatellites (Ohta & Kimura 1973; Valdes–Slatkin–Freimer
  1993) where a difference-of-Poissons fit arises naturally.
