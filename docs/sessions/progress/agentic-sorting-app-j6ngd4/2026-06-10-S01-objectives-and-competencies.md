---
kind: progress
session: 2026-06-10-S01
date: 2026-06-10
title: Agentic Sorting — divergent objectives + Levin competencies
branch: claude/agentic-sorting-app-j6ngd4
slug: agentic-sorting-app-j6ngd4
status: completed
build: unknown
followup: null
pr: null
app: agentic-sorting
---

# Agentic Sorting — divergent objectives + Levin competencies

## Session purpose

Expand the Agentic Sorting app along two axes the user wants restored/added:
(1) **divergent objectives** — bring back the lost intermediate where agents
optimize genuinely *different* functions (not just a division of labor toward one
global sort), and (2) **Levin's competencies** — frozen/defective cells,
delayed-gratification routing around defects, and clustering instrumentation for
chimeric arrays. Identify the source idea, then run `/three-hats` to scope how the
app can be improved and developed.

## Previous session

First tracked session on this branch. (Latest handoff across branches is the
polygon-worlds spherical work — unrelated; nothing pending there for this app.)

## Source idea (identified)

The app's impetus is **Michael Levin** (Tufts), on **Lex Fridman Podcast #486**.
The paper: Taining Zhang, Adam Goldstein, Michael Levin, *"Classical Sorting
Algorithms as a Model of Morphogenesis: self-sorting arrays reveal unexpected
competencies in a minimal model of basal intelligence"* (Adaptive Behavior, 2025;
arXiv:2401.05375). Each array **element is an agent** running its own sorting rule
and pursuing its own correct position. Observed unprogrammed competencies:
**delayed gratification** (move away from goal to route around a defect),
**robustness** to frozen/broken cells (sorts more reliably than top-down), and
**clustering by algotype** in *chimeric* arrays (cells running different
algorithms cluster like-with-like). That last point is the "agents not optimizing
the same function" intermediate the user remembered.

## Working notes

<!-- Newest entry first. -->

### 🟡 milestone · 01:30 — Legibility pass (3-hats S01): presets, default layout, dedup
**Why:** User called the app "a hot mess"; ran a second /three-hats focused on
legibility. All three: don't rewrite — fix the surface. User chose surface +
presets + code tidy, and remove Replicate.

Four build-green commits:
1. **Remove Replicate** (duplicated Lab Monte-Carlo) + rename `Lab.tsx`→
   `LabResults.tsx` + re-tag Track `lab`→`readout`.
2. **Relabels:** arena Positive/Negative→High/Low; tracker goal→home;
   Trajectories gain a `time →` axis + clearer legend; objective hint tagged
   Levin-faithful vs animath-original at the point of choice; shared-vs-Lab-local
   note; dropped the per-algotype blurbs from the mix panel (the `?` has them).
3. **Scenarios presets** — a Scenarios panel with five one-click demos (Clustering,
   Robustness, Delayed gratification, Phase separation, "even mix is slow" → jumps
   to the Lab and auto-runs Strategies via a pending-run effect). Reworked sandbox
   layouts so the default **Explore** leads with Scenarios + Run + arena +
   Trajectories (no more slider-wall hiding the signature plot); added Tinker /
   Analyze.
4. **Code tidy:** extracted `useCanvas2D` hook (deduped the two ResizeObserver
   effects). Deliberately stopped short of `<ObjectiveFrozen>`/`<PopulationMix>`
   extraction — the two objective/frozen sites aren't identical and agentsNode is
   already a single reused node, so extraction would add conditionals without
   simplifying (matches the maintainer's "don't churn" caution).

`tsc` clean; `npm run build` green at every commit. Reports +
[synthesis](2026-06-11-S01-expert-synthesis.md) committed.

> [!NOTE]
> **Verified by eye** (headless Chromium via `scripts/shoot.mjs` + an interaction
> script): the Explore layout renders correctly, and clicking the *Delayed
> gratification* preset seeds a frozen population, sorts the array, and draws the
> rise-then-fall trajectory lines. Two issues the screenshots caught were fixed —
> the Run panel overlapping Scenarios, and the new `time →` label colliding with
> the bottom-right axis label. Phone re-chrome (≤740px) is still unscreenshotted.

### 🟡 milestone · 00:20 — Blend sweep: vary the proportion between two chosen types
**Why:** User wants sweep control over a mix — select two agent types and test
different proportions between them.

Added a **'blend'** sweep param to `lab.ts`: pick **Type A** and **Type B**; the
sweep varies A from 0→100% (B = the remainder, all other types 0) and plots the
outcome curve. UI: two `Select`s in the Sweep section (guarded so A≠B; Run
disabled otherwise); x-axis labels `% <Type A>`. Also fixed the line-chart x-tick
formatter (`fmtParam`) so fractional sweep params (frozen/wake/desc) display with
precision instead of rounding to 0.

Headless: Standard↔Blind Date blend shows a clean **speed/cost trade-off** — 0%→
100% Std moves cycles 1166→527 (faster) while swaps 219→1037 (costlier), 100%
converged throughout. Exactly the curve the feature is for. `tsc` clean; build green.

### 🟡 milestone · 23:55 — Lab: current mix access · compare custom mixes · connected sliders
**Why:** User: need the current mix reachable in the Lab; compare different mixes;
population sliders should sum to 100%.

- **Connected sliders:** `setWeightBalanced` — dragging one weight rescales the
  others so the five always sum to 100 (a population is a mix, not five free
  dials). Integer-rounding drift absorbed on the largest other; all-zero others
  distribute evenly. Used by the Population-mix sliders everywhere.
- **Mix in the Lab:** the Population-mix panel (+ Objective/Frozen, now on the Lab
  Conditions panel) is shown in Lab mode, so the "current mix" is visible/editable
  there — it's the same `weights` state the experiments read.
- **Compare mixes:** new `mixes` experiment kind in `lab.ts`; a saved-mixes
  manager ("+ Add current mix" → snapshot, with a `MixBar` composition strip and
  remove) compares ≥2 saved mixes head-to-head under identical conditions
  (renders as the labeled bar chart; Run disabled until two exist).

Headless: Mix(Std50/Patrol50) fully sorts in **418 cyc**, beating pure Blind Date
(1174) and the even five-way mix (caps at 94%) — a clean, surprising head-to-head.
`tsc` clean; `npm run build` green.

### 🟡 milestone · 23:30 — Batch Lab + lightweight Replicate (multi-run)
**Why:** User wanted "run multiple examples and measure the outcome" (the app was
one-shot only); chose all three experiment types as a Lab mode, plus a follow-up
ask for a lighter "same parameters, different instances" multi-run.

- **`lab.ts`** — pure batch engine reusing `step()`: `runTrial` (to cap,
  recording first crossing of the 0.99 sort threshold) + `runExperiment` (async,
  chunked, yields for the progress bar). Three specs: **compare** (each pure
  algotype + current mix), **monte** (current mix on many seeds), **sweep** (one
  of array size / frozen / wake / descending across its range). Metrics:
  cyclesToSort, swaps, finalSortedness, clustering; `aggregate()` → mean/sd/min/max.
- **`Lab.tsx`** — `LabResults`: bar chart w/ error bars (compare), MiniHisto +
  StatGrid (monte), line chart (sweep), plus a table.
- **Lab as a top-bar mode** (`modes`/`activeMode`/`onModeChange`, `key={mode}`,
  per-mode appId so layouts persist independently). Sandbox sim loop + canvas
  observers now gate on `mode==='sandbox'` and re-attach on mode change.
- **Replicate** panel in the Sandbox (reuses `runExperiment` monte) — the
  lightweight multi-run the user asked for, rendered via `LabResults kind="monte"`.

Headless validation (`tsx`): compare ranks patrolling fastest (366 cyc),
perfectionist cheapest-ish (742 swaps), blindDate fewest swaps (303); sweep
frozen 0→0.4 gives finalSortedness 94%→67% (clean monotone). **Finding:** the
equal 5-way mix is genuinely slow to *fully* sort (≈0% converge by cap 3000–5000)
— every swap still strictly reduces inversions, but the far-from-home tail leans
on the 40% long-range agents. Surfaced honestly via the convergence column + a
Metric-panel hint + a README note (no false "mixes always win"). Defaults tuned
(labCount 64, cap 3000). `tsc` clean; `npm run build` green.

### 🟡 milestone · 22:55 — All-trajectories delayed-gratification view (replaces weak tracker as primary)
**Why:** User: the single click-tracker "is not a good way to observe delayed
gratification" — wants *all* trajectories at once, colored by shape.

Added a **Trajectories** view window: overlays every agent's distance-to-its-
sorted-home over a run, one line per agent, **colored by backtrack score**
(max rise above its starting distance) via a cool→warm `heat()` ramp — monotone
improvers fade out, backtrackers glow warm and draw on top.
- `arena.ts` `drawTrajectories(ctx, w, h, traj, len, axis)`.
- Component records one distance sample per agent per frame into `trajRef[id]`
  (cap `TRAJ_MAX=360`, then freezes); targets fixed per `id` at regenerate;
  second DPR canvas + ResizeObserver; throttled redraw (~7/s). New `trajectories`
  ViewDef; Analysis layout stacks arena + trajectories, Setup hides it.
- Kept the single click-tracker (still useful for one agent's exact curve).

Headless check (140 agents, 10% frozen, 360 samples): **42% of agents backtrack
at least once** (16 strongly, max overshoot 64) — a clear warm/cool spread, so
the plot is meaningful, not flat. `tsc` clean; `npm run build` green.

> [!NOTE]
> Still no interactive screenshot — the preview server is SIGTERM'd (exit 144)
> on every launch in the resumed container. Verification is build + headless.

### 🟡 milestone · 22:35 — Phase 3 (delayed-gratification click-to-track) implemented
**Why:** User: "PR is open, continue with phase 3."

Added the interactive tracker:
- `arena.ts` `drawArena` now takes `mark` + `selectedId` and draws a highlight
  column + ring on the tracked agent.
- `metrics.ts` `homeIndex(values, value)` — the agent's fixed sorted-ascending
  target (values are immutable; only the *distance* wanders).
- `AgenticSorting.tsx`: click the canvas → map x→index→agent id, lock its target,
  and sample `|currentIndex − target|` each metric flush into a Sparkline. New
  **Track agent** panel (`arch: 'lab'`), opened in the Analysis layout. Tap the
  tracked agent again to release; selection clears on regenerate. `--accent`
  read into `markRef` alongside `--dim`.

Validated headlessly (`tsx`): tracking 4 agents through a 12%-frozen run, 2 of 4
showed the **rise-then-fall** distance signature (e.g. 16→peak 25→24) — the
delayed-gratification curve is real and non-monotonic, not a flat gimmick.
`tsc --noEmit` clean; `npm run build` green.

> [!WARNING]
> Could not capture an *interactive* screenshot this turn: the `vite preview`
> server is SIGTERM'd (exit 144) on every launch in the resumed container (it
> succeeded earlier in the session for the static shot). Verification rests on
> the green build + headless logic tests + the earlier render screenshot. Worth
> an eyeball next session when the preview server cooperates.

### 🟡 milestone · 22:10 — Phase 0–2 implemented, build green, engine validated
**Why:** Deliver the full payload the user chose (engine + competencies + both
objective modes + canvas), verified.

New self-contained modules in `src/animations/AgenticSorting/`:
- **`engine.ts`** — pure `step(state, rand)` reducer + strategy table + local
  `mulberry32`. Per-agent `objective` (±1), `frozen` flag; **deterministic
  same-tick collision resolution** (one claim per cell, `from`-order). Frozen
  cells never wake and can't be moved (obstacles).
- **`metrics.ts`** — `sortedness`, `inversions`, `monotoneRuns`,
  `algotypeClustering` (**excess homophily over chance**), `frozenCeiling`.
- **`arena.ts`** — canvas renderer, Okabe–Ito CVD-safe palette, bars/dots,
  color-by type/objective.
- Rewrote `AgenticSorting.tsx`: rAF + accumulator loop, DPR canvas via
  ResizeObserver, panels rebuilt on `ControlPanel` primitives +
  `usePersistentState`; Metrics panel uses `StatGrid`/`Sparkline`/`Kicker`.
- Rewrote `EXPLAINER.md` + `README.md`: cite arXiv:2401.05375, label
  Levin-vs-animath-original, fidelity notes on the loose sort analogs, no
  "intelligent cells" copy.

`npm run build` passes; `tsc --noEmit` clean. Headless engine validation
(`tsx`): selfish converges (sortedness 0.53→0.95, runs 87→13); pure Blind Date
sorts perfectly & fastest (→1.00, 545 swaps); frozen 15% → 0.87 vs 0.92 ceiling
(robustness); phase-sep stalls ~0.5; **local-only** phase-sep coarsens domains
(runs 83→27) while Blind-Date-heavy churns (83→79) — honest framing added to the
explainer. Screenshot of the default view confirms the canvas + panels render.

> [!NOTE]
> Phase 3 (delayed-gratification click-to-track plot) is the remaining optional
> item — not built this session.

### 🟣 decision · 21:58 — User chose full payload; paper facts locked
**Why:** Need to fix scope and verify the doc-reframe gate before coding.

User decisions: **both** objective modes (selfish-uniform default + asc/desc
phase-separation), **pull the canvas arena forward**, and **push through Phase 2**
(engine + competencies + objectives) this session.

Paper facts confirmed (arXiv/blog 403'd; pulled from search of Levin's writeups):
the model is **cell-view** (each element runs its own algorithm = its *algotype*,
pursuing its own position) vs top-down. **Algotype** = the algorithm a cell uses
(distinct from value=genotype, position=phenotype). **Chimeric array** = different
cells use different policies. **Clustering** = cells spontaneously cluster by
algotype, "a meta-property implemented nowhere in the algorithms themselves."
**Frozen cells** = malfunctioning/immovable elements that impede progress;
cell-view sorts are robust to them (Bubble best). **Delayed gratification** =
Bubble/Insertion backtrack *more* when faced with defects. Crucially **all
elements sort toward the same order in the paper** — so **asc-vs-desc is an
animath-original**, to be labeled as phase separation (confirms the pedagogy hat).

### 🟡 milestone · 21:53 — Three-hats complete + synthesis written
**Why:** All three experts returned; need a single convergence read + decisions.

All three endorse the direction and **all three gate it behind the same refactor**:
extract a pure engine (`step(state)→state`) before features. Reuse `readouts.tsx`;
clustering must be baseline-normalized (assortativity / excess homophily); reframe
EXPLAINER/README honestly in the same change. Synthesis with a 4-phase plan +
3 open decisions written to
[`2026-06-10-S01-expert-synthesis.md`](2026-06-10-S01-expert-synthesis.md).

Git archaeology (consultant's flag): the 5-agent design is **identical from the
first commit** (`4ca94d3`); no `descending`/`objective`/`frozen` in any history —
the "lost intermediate" was never committed, so it's reconstructed, not recovered.

Open decisions for the user: (T1) selfish-goal default *and* labeled asc/desc
phase-separation mode, or just one? (T2) canvas arena in-scope or deferred?
(MVP) is Phase 0 + Phase 1 the first shippable slice?

### 🟣 decision · 21:47 — Dispatched /three-hats review (3 parallel experts)
**Why:** User asked to run three-hats on how the app can be improved/expanded
before building.

Launched the three reviewers in parallel against the "divergent objectives +
Levin competencies" plan: Framework Maintainer, Architecture Consultant, Math-Viz
& Pedagogy. Each writes a full report to
`docs/sessions/progress/agentic-sorting-app-j6ngd4/2026-06-10-S01-expert-*.md`.
Synthesis to follow once all three return.

### 🟣 decision · 21:46 — Scope set: both objectives + competencies
**Why:** User chose "Both — objectives + competencies" and asked to identify the
source and run /three-hats before building.

Direction confirmed. Read the current implementation
(`src/animations/AgenticSorting/AgenticSorting.tsx`): five strategies (Standard,
Blind Date, Nomadic, Patrolling, Perfectionist) mixed by population weights, all
pulling toward one global ascending sort; CSS/DOM arena with bars/dots display,
StatGrid metrics (cycles/wakeups/swaps). The heterogeneity today is a *division of
labor*, not divergent objectives — that gap is the core of the work.

### 🔵 finding · 21:46 — Source confirmed as Michael Levin's self-sorting arrays
**Why:** User asked me to identify the half-remembered podcast/researcher.

Web search confirmed Levin / Lex Fridman #486 / arXiv:2401.05375 (see *Source
idea* above). The paper's competencies map directly onto the two requested work
axes.

### 🟡 milestone · 21:46 — Session opened
**Why:** Start of tracked work on the agentic-sorting branch.

Progress report created; next: run `/three-hats` to scope improvements/expansion,
then plan implementation.
