---
kind: progress
session: 2026-06-10-S01
date: 2026-06-10
title: Agentic Sorting — divergent objectives + Levin competencies
branch: claude/agentic-sorting-app-j6ngd4
slug: agentic-sorting-app-j6ngd4
status: in-progress
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
