---
kind: three-hats
session: 2026-06-10-S01
date: 2026-06-10
title: "Hat 2 — Architecture & Quality Consultant: expanding Agentic Sorting"
branch: claude/agentic-sorting-app-j6ngd4
slug: agentic-sorting-app-j6ngd4
status: complete
build: unknown
followup: medium
pr: null
app: agentic-sorting
---

# Hat 2 — Architecture & Quality Consultant: expanding Agentic Sorting

## Plan under review
<details><summary>Original request</summary>

> Expand the **Agentic Sorting** app (`src/animations/AgenticSorting/`) along two axes the user wants restored/added:
>
> **(1) Divergent objectives.** Bring back a lost "intermediate" version where agents optimize genuinely *different* functions — not just a division of labor toward one global ascending sort. Concretely: some agents could sort ascending while others sort descending; or each agent pursues only its own local goal (à la Levin's "selfish" elements that just want their own correct position) rather than a shared global objective. The point is to create genuine *tension* between agents, not cooperation toward one target.
>
> **(2) Levin's competencies.** Lean into the source paper: add **frozen/defective cells** (agents that don't act), **delayed-gratification** routing around defects (elements temporarily move away from their goal), and a **clustering metric / instrumentation** for chimeric arrays (cells running different algorithms spontaneously cluster like-with-like) — surfaced as observable, measurable phenomena rather than just visuals.
>
> Source idea: Michael Levin (Tufts), Lex Fridman Podcast #486; paper: Taining Zhang, Adam Goldstein, Michael Levin, "Classical Sorting Algorithms as a Model of Morphogenesis: self-sorting arrays reveal unexpected competencies in a minimal model of basal intelligence" (Adaptive Behavior 2025; arXiv:2401.05375). The user wants /three-hats to consider how this app can be improved and developed/expanded — so go beyond just these two axes if you see better/adjacent opportunities, but anchor on them.

</details>

## Executive summary

The two requested axes are sound product goals, but the current code is the wrong
substrate to grow them on. The simulation logic lives **inline** in the component
as a `setInterval` + `itemsRef`/`statsRef` + `setState` loop with a five-arm
`switch` on `agent.type`. Every requested feature — divergent objectives, frozen
cells, delayed gratification, clustering metrics — is *data about an agent* or *a
read over the array*, yet the present structure forces each one to become a new
branch in an imperative loop and a new field smeared across a giant component.

My recommendation is unambiguous: **extract a pure `sorting.ts` engine** with a
`step(state, rng) -> events` reducer and a **strategy table** keyed by agent kind,
**before** adding any of the new features. Make objectives, frozen flags, and goal
targets *data on the agent*, not control-flow. Add a small **metrics module**
(`metrics.ts`) of pure array reads (inversions, monotonic runs, clustering score)
that the component samples on a throttled cadence. This is a 1–1.5 session
refactor that turns the rest of the roadmap from "edit a 440-line component five
times" into "add rows to two tables." Without it, the app accrues exactly the
not-invented-here, concern-conflating debt the framework's `lib/` split exists to
prevent — and StableMatching already shows the target pattern in-repo.

Two correctness hazards must be designed for, not discovered later: (a) the
current tick lets **multiple woken agents mutate the same array in one pass**, so
two agents can act on overlapping indices — benign for one global ascending sort,
a genuine bug once objectives diverge and tension is the *point*; (b)
mixed ascending/descending objectives **may have no fixed point**, so "is it done?"
stops being "inversions == 0" and becomes a real measurement question. Both are
features to *instrument*, not bugs to hide — but only an extracted, testable
engine lets you tell the difference.

---

## 1 · Pattern recognition — what is this, really?

The app is a **multi-agent cellular simulation** with a fixed-rate step loop. The
literature names every piece of it; the current code reinvents each one ad hoc.

| Concept in the app | Established pattern | What it buys us |
|---|---|---|
| Each array slot is an agent with local state + a rule | **ECS-lite / cellular automaton** | agent = data (components: value, kind, objective, frozen); rule = system over data |
| `switch (agent.type)` dispatch | **Strategy table** (`Record<Kind, StrategyFn>`) | new agent kinds and objectives are *entries*, not branches |
| `runSimulationStep` mutating `currentItems` | **Reducer / step function** `step(state) → state` | pure, testable, replayable, seedable |
| `setInterval(step, delay)` | **Fixed-timestep game loop** (poorly) | should be `requestAnimationFrame` + accumulator |
| `itemsRef`/`statsRef` shadowing `items`/`stats` | **Simulation-state vs render-state split** (done by hand, leakily) | the split is right; the *implementation* is the smell |

> [!IMPORTANT]
> **The split the app is groping toward is correct.** The `itemsRef`/`statsRef`
> pattern exists because React render state is too slow to be the simulation's
> source of truth at 1 ms ticks. That instinct is sound. The problem is that the
> simulation state is *also* the component's `useState`, kept in sync by hand, so
> there are two sources of truth that drift conceptually. The fix is to make the
> engine own the canonical state (a plain object in a ref) and let React *sample*
> it for rendering — not to keep mirroring every tick into `setItems`.

### Critique of the `setInterval` loop specifically

```ts
// current: AgenticSorting.tsx
timerRef.current = setInterval(runSimulationStep, simulationSpeed);
```

Three concrete problems:

1. **`setInterval` ≠ fixed timestep.** At `simulationSpeed = 1` ms the browser
   clamps and coalesces timers; you do *not* get 1000 steps/s, you get whatever
   the main thread can service after layout/paint, jittering with render cost.
   "Processing delay" is mislabeled — it's a *requested* interval the runtime
   ignores under load. An rAF loop with a step accumulator (`while (acc >= dt)`)
   decouples sim rate from frame rate and is the standard, honest approach.
2. **`setState` every tick forces a full React reconcile of all N agents.** At
   N=150 and a 1 ms target that's the dominant cost (see §4). The loop should
   step the sim many times per frame and call `setItems` **once per frame**, not
   once per step.
3. **`runSimulationStep` is a `useCallback` closing over nothing but refs**, so
   it *works*, but it hides that the step is already pure-ish — it reads
   `itemsRef.current`, writes a new array, bumps `statsRef`. That is a reducer
   wearing a side-effect costume. Lift it out and the costume comes off.

---

## 2 · Structural soundness — extract the engine

This is the heart of my review. The framework **already mandates this** for
non-trivial logic: CLAUDE.md's CSS/DOM section says "StableMatching shows how to
split logic from view," and that app ships `model.ts`, `galeShapley.ts`,
`rotations.ts`, `resolver.ts` as pure modules the component merely drives. Agentic
Sorting should mirror it.

### Proposed module layout

```
src/animations/AgenticSorting/
├── AgenticSorting.tsx     # view + Workspace wiring ONLY (panels, arena, sampling)
├── sorting.ts             # pure engine: types, step(), strategy table, rng
├── strategies.ts          # Record<AgentKind, StrategyFn> (the closed vocabulary)
├── metrics.ts             # pure reads: inversions, runs, clustering, frozen%
├── presets.ts             # named population mixes / scenarios (chimera, etc.)
├── agenticSorting.css
├── EXPLAINER.md  README.md
```

### The engine contract

```ts
// sorting.ts
export type Objective = 'asc' | 'desc' | 'ownGoal';   // ← divergent objectives = DATA
export type AgentKind = 'standard' | 'blindDate' | 'nomadic'
                      | 'patrolling' | 'perfectionist';

export interface Agent {
  id: string;
  value: number;
  kind: AgentKind;
  objective: Objective;     // what "in order" means to THIS agent
  goalIndex?: number;       // for ownGoal / delayed-gratification routing
  frozen: boolean;          // defective cell: never acts, never moves
  heading: 1 | -1;
}

export interface SimState {
  agents: Agent[];
  tick: number;
  swaps: number;
  wakeups: number;
  // ring buffers for history-dependent metrics (delayed gratification, sparklines)
  history: { inversions: number[]; clustering: number[] };
}

// A strategy proposes a swap given the agent's own objective; it does NOT mutate.
export type StrategyFn = (
  state: SimState, idx: number, rng: () => number
) => number | null;   // partner index to swap with, or null

export const STRATEGIES: Record<AgentKind, StrategyFn> = { /* … */ };

export function step(state: SimState, rng: () => number): SimState;  // pure
```

> [!IMPORTANT]
> **Decision the team should make explicitly:** objective is a *property of the
> agent*, and the comparison predicate is a *function of that property*. Every
> strategy currently hardcodes `agent.value > neighbor.value` (ascending). Replace
> that with `inOrder(a, b, objective)`. Then "some agents sort descending" costs
> **zero new branches** — it's an objective value plus a one-line predicate. This
> is the single most leveraged design move in the whole plan, and it only works
> after extraction.

### Why this scales to the requested features

| Requested feature | In current code | After extraction |
|---|---|---|
| Ascending vs descending | edit 5 `case` arms (each hardcodes `>`) | set `objective`, route through `inOrder()` |
| Own-goal ("selfish") agents | a 6th `switch` arm + new state | one `StrategyFn` + `goalIndex` data |
| Frozen / defective cells | guard at top of every arm | one `if (agent.frozen) continue` in `step` |
| Delayed gratification | needs per-agent move history | `history` ring buffer already in `SimState` |
| Clustering metric | nowhere to put it | a pure read in `metrics.ts` |
| New agent kind | grep the component | append a strategy-table entry |

The abstraction is well-chosen because the **strategy proposes, the engine
disposes**: strategies become side-effect-free "what partner do I want?" functions,
and the engine owns conflict resolution, freezing, and bookkeeping in one place.
That is exactly where the multi-agent-tension semantics must live.

---

## 3 · Maintainability & the divergent-objective model

Can a newcomer follow it in six months? **Today: no.** The 440-line component
fuses state, five inline algorithms, layout math, and JSX. Per-agent objective
state would be smeared across `generateItems`, `runSimulationStep`, `getBarClass`,
and the arena renderer.

After extraction the mental model is clean and the data model is honest:

- **Direction of sort** → `objective: 'asc' | 'desc'`. Generation assigns it by a
  weight, exactly like `kind` is assigned today. Visualize objective as **hue
  family** (warm = descending, cool = ascending), kind as **icon/marker**, so a
  chimera is legible at a glance.
- **Frozen flag** → `frozen: boolean`. Render with reduced opacity + a lock dash.
  It simply never wakes.
- **Own-goal target** → `goalIndex`. The "selfish element" wants *its* sorted
  position; delayed gratification is then literally "the path to `goalIndex` is
  blocked by a frozen cell, so accept a temporary increase in distance to route
  around it" — which is **measurable** (distance-to-goal went up then down) only
  because `history` exists.

> [!CAUTION]
> **Gotcha — `goalIndex` is not free.** "My own correct position" depends on the
> *global* sorted order, which changes as others move. Decide whether `goalIndex`
> is (a) computed once against the initial multiset (stable, cheap, but a moving
> target the agent never reaches), or (b) recomputed against current values
> (O(n) per agent — expensive, and the goal chases the agent). The paper's
> "selfish elements just want their value-rank slot" maps to (a) with rank, not
> index. Pin this down in `sorting.ts` with a comment; it is the kind of decision
> that silently rots if left implicit in a component.

> [!CAUTION]
> **Gotcha — same-tick mutation collisions (a real bug, surfaced by tension).**
> The current loop wakes ~15% of agents and lets each mutate the *shared*
> `currentItems` array in sequence within one tick. Two woken agents whose chosen
> partners overlap will compose their swaps on already-moved data. For one global
> ascending sort this is harmless noise. For **divergent objectives it is not** —
> an ascending agent and a descending agent fighting over the same pair in one
> tick gives order-dependent, RNG-seed-fragile results, and "tension" becomes
> "whoever the loop visited last wins." The extracted `step` must resolve
> proposals deterministically: collect all proposed swaps, then **commit at most
> one claim per cell per tick** (drop or randomize conflicts via the seeded rng).
> This is both a correctness fix and the exact place where multi-agent conflict
> *semantics* belong.

---

## 4 · Performance & footprint

### Current per-tick cost

`runSimulationStep` does, every tick:

- `[...itemsRef.current]` — O(n) shallow copy.
- `forEach(item => item.status='idle')` — O(n) mutate.
- a wakeup-set built with `activeIndices.includes(idx)` inside a `while` —
  **O(k²)** in the worst case (k = 0.15n; fine at n=150, but gratuitously
  quadratic; a Fisher–Yates partial shuffle is O(k)).
- per woken agent: `{...item}` spreads on swap (small), but **perfectionist is
  O(n)** scan → a perfectionist-heavy population is O(k·n) per tick.
- `setItems(currentItems)` + `setStats(...)` → **React reconciles N keyed
  `<div className="as-arena-bar-column">` nodes every tick.**

### The dominant cost is React + DOM, not the algorithm

At N=150 the arena renders **~300 DOM nodes** (a column wrapper + an inner bar
each) and React diffs all of them per `setItems`. At a 1 ms target interval this
is the bottleneck; the sim math is cheap by comparison. Concretely:

| Lever | Effect |
|---|---|
| `setItems` once **per animation frame** (not per step) | caps React work at ~60 Hz regardless of sim rate |
| Step the engine **multiple times per frame** under an accumulator | honest "speed" control, decoupled from paint |
| Render arena to **`<canvas>`** instead of 300 divs | O(1) React nodes; clustering at large N becomes *visible and fast* |

> [!IMPORTANT]
> **Recommendation: move the arena to a `<canvas>` view, gated by the expansion.**
> The plan's headline payoff — "see chimeric cells spontaneously cluster
> like-with-like" — *wants* large N to be legible, and that is exactly where the
> DOM approach collapses (bars merge, 300+ nodes thrash). A canvas renderer (a
> single `ViewDef` whose node is a `<canvas>` painted from the engine's `agents`
> array each frame) draws N points in one pass, scales to N=500+, and makes
> clustering visually obvious. Keep the DOM bars as the small-N/"Bars" mode if
> desired, but the clustering story needs canvas. This is *not* gold-plating —
> it's the enabling substrate for the feature the user actually asked for.

DOM-vs-canvas is a judgment call at N≤150; it becomes a requirement the moment
"clustering at scale" is the deliverable. I'd scope canvas into the same branch
rather than promise it later.

### History/throughput for delayed gratification

Delayed-gratification detection needs per-agent (or array-level) **history** —
"distance to goal rose, then fell." Bound it with **fixed-length ring buffers**
in `SimState.history` (e.g. last 240 samples for the sparkline; a small per-agent
"recent distance" window for the routing heuristic). Do **not** grow unbounded
arrays per tick — that is a slow memory leak masquerading as a metric. Sample
metrics on the **per-frame** cadence, not the per-step cadence, or the cost of
measuring swamps the cost of simulating.

---

## 5 · Verification & contracts

With only `npm run build` (a type check) and manual inspection, confidence has to
come from **pure functions you can reason about and spot-check**, not from a test
runner that doesn't exist. The extraction is what makes that possible.

### Metrics as the contract surface

Define metrics as pure reads in `metrics.ts`, each with an obvious invariant:

| Metric | Definition | Invariant / sanity check |
|---|---|---|
| **Inversions** | count of out-of-order pairs (vs the array's *majority* objective) | sorted asc ⇒ 0; reversed ⇒ n(n−1)/2; monotone non-increasing under a pure ascending population |
| **Monotonic runs** | number of maximal ascending (or per-objective) runs | sorted ⇒ 1; fully shuffled ⇒ ~n/2 |
| **Clustering score** | adjacency homophily: fraction of neighbor pairs sharing kind/objective, normalized against the expected fraction for the current mix | random placement ⇒ ≈ baseline; perfect segregation ⇒ 1 |
| **Frozen fraction** | frozen / n | constant unless user changes it; a guard that frozen never act |
| **Distance-to-goal (own-goal)** | mean &#124;currentIndex − goalIndex&#124; | trends to 0 only if a fixed point exists |

> [!IMPORTANT]
> **The clustering score needs a baseline or it lies.** "Like clusters with like"
> is only meaningful *relative to chance*: a 90%-standard population is trivially
> 90% homophilous at random. Use an **assortativity / segregation index**
> (observed same-kind adjacencies minus expected, over the max possible) so the
> number reads ≈0 for "no clustering" and →1 for "fully sorted into blocks,"
> independent of the mix. Without normalization the headline metric is a
> confound. This is the single biggest correctness trap in the *measurement* half
> of the plan.

### Seams and failure modes

- **Seed the rng** (`mulberry32` already lives in StableMatching's `model.ts` —
  reuse it, don't reinvent). A seeded engine makes runs reproducible, which is the
  only way to manually verify "this metric went down" is real and not RNG.
- **Mixed objectives may have no fixed point.** An asc/desc chimera can oscillate
  forever. **This is a feature, not a bug — but you must detect it**, or the user
  sees a "stuck" sim and assumes it's broken. Add a **stagnation / cycle detector**
  (e.g. inversions variance over the last K samples below ε, or swaps continuing
  while sortedness plateaus) and *surface* it: "system has reached a contested
  steady state (no global order possible)." That readout turns the most confusing
  outcome into the most interesting one — it's the literal visualization of
  irreconcilable objectives.
- **Frozen-cell liveness:** assert (in a dev comment/console in step) that frozen
  agents never appear in the swap log. Cheap, catches the most likely regression.

### How to gain confidence without a test runner

You can't add Jest (CLAUDE.md: no test runner, and adding one is out of scope for
an app branch). But a **pure engine is checkable three ways** that the current
inline loop is not:

1. **A dev-only assertion block** in `step` (stripped in prod by a `if
   (import.meta.env.DEV)` guard) checking invariants (frozen didn't move; one
   claim per cell; inversions count matches a brute recompute every K ticks).
2. **A throwaway `sorting.spec.ts` runnable via `npx tsx`** during development
   (not wired into CI, but reproducible) — possible *only* because the engine is
   pure. Document the command in the README so a future maintainer can rerun it.
3. **Eyeball-able invariants in the UI itself**: the inversions sparkline must be
   monotone non-increasing for a pure ascending population — if it isn't, the
   metric or the engine is wrong, visibly.

---

## 6 · Adjacent opportunities (anchored, not scope-creep)

The brief invites going beyond the two axes "if you see better opportunities."
Two are *enabled for free* by the extraction and worth scoping; the rest I'd
explicitly defer.

- **Seeded reproducibility + a shareable scenario.** Once the engine takes a seed,
  a "chimera" preset (50% asc / 50% desc, 10% frozen) becomes a one-line
  `presets.ts` entry and a repeatable demo — high pedagogical value, near-zero
  cost. **Endorse.**
- **A "race two populations" / A-B readout** falls out of the metrics module
  (run the same seed under two mixes, compare inversions-over-time). **Endorse if
  cheap**, defer if it needs a second engine instance and UI.
- **Defer:** GPU/worker offload, a full ECS library, configurable per-agent rules
  via UI. These add complexity without a concrete need *yet* and violate the
  "don't gold-plate" rule. Note them in `IN-PROGRESS.md` and move on.

> [!NOTE]
> Resist a generic "rules engine." The closed agent vocabulary mirrors the app's
> archetype philosophy (a *closed* set, extended deliberately). A strategy **table**
> with five named entries is the right amount of generality; a user-editable
> rule DSL is not-invented-here for a teaching toy.

---

## 7 · Framework-fit checks

| Convention (CLAUDE.md) | Plan compliance |
|---|---|
| Local state only, no global store | ✅ engine state lives in a `useRef`; React samples it. No context needed. |
| `usePersistentState` for settings | ✅ persist mix weights, objectives split, frozen %, density, speed — *settings*, not the live array. |
| ControlPanel primitives (`Slider`/`Pills`/`Checkbox`) | ⚠️ current app hand-rolls `<input type="range">`. New panels (objective split, frozen %) **should** use the shared primitives — don't extend the hand-rolled inputs. Minor cleanup opportunity. |
| SectionDef archetypes (closed vocab) | ✅ new "Objectives" panel = `drive`; clustering/metrics = `readout`/`lab`. No new icons needed. |
| Readout primitives (`Sparkline`/`MiniHisto`/`Breakdown`) | ✅ inversions → `Sparkline`; cluster histogram → `MiniHisto`; objective split → `Breakdown`. The instrumentation toolkit already exists; *use it* rather than bespoke charts. |
| Layouts (views[id].open) | ✅ a "Lab" layout surfacing the metrics panel + (optionally) a canvas clustering view mirrors StableMatching's matrix/welfare/lattice idiom. |
| American spelling | ✅ "color," "analyze," "neighbor," "normalize" — watch the prose. |
| Append-only shared files | ✅ this is an existing app; no `apps.ts`/`index.tsx` churn beyond what's already there. Low merge risk. |

The plan is a **strong framework fit** — every new surface maps onto an existing
archetype/readout/layout idiom. There is no need to invent chrome.

---

## Verdict

**Endorse the product goals; gate them behind a refactor.** The two axes
(divergent objectives, Levin competencies) are well-motivated, pedagogically rich,
and a genuinely better app. But built on the current inline `setInterval`/`switch`
component they will calcify into unmaintainable branch-soup and ship subtle
correctness bugs precisely where the new value lives (multi-agent tension).

**What I endorse:**
- Extract a **pure `sorting.ts` engine** (`step` reducer + seeded rng) and a
  **strategy table** *before* feature work. Mirror StableMatching's logic/view
  split — the in-repo precedent the framework explicitly points at.
- Model objectives, frozen, and goal as **agent data**, with comparison routed
  through one `inOrder(a, b, objective)` predicate. Divergent sort directions then
  cost ~zero new control flow.
- A **`metrics.ts`** module of pure reads (inversions, monotonic runs,
  **assortativity-normalized clustering**, distance-to-goal) surfaced via the
  existing `Sparkline`/`MiniHisto`/`Breakdown` readouts.
- Switch the step loop to **rAF + accumulator**, `setItems` **once per frame**.
- **Canvas arena** scoped into the branch — the clustering deliverable needs it
  at scale; DOM bars don't survive large N.

**What concerns me (must be designed, not discovered):**
- **Same-tick swap collisions** — currently benign, a real bug under divergent
  objectives. The engine must resolve proposals (one claim per cell per tick,
  seeded). This is the top correctness risk.
- **Clustering must be baseline-normalized** or the headline metric is a confound.
- **No fixed point for asc/desc chimeras** — a *feature*, but needs a stagnation /
  contested-steady-state detector and a readout, or it reads as "broken."
- **`goalIndex` semantics** (rank vs index, recomputed vs fixed) must be pinned in
  code, or it rots.

**What I would change about the plan:** add an explicit Phase 0 — "extract engine
+ metrics, keep behavior identical, `npm run build` green" — and only then layer
objectives → frozen → delayed gratification → clustering, each a table/data edit.
Reuse `mulberry32` from `model.ts`; use ControlPanel primitives for new knobs;
defer GPU/worker/rule-DSL ideas to `IN-PROGRESS.md`. Done this way it's a clean,
high-value expansion. Done feature-first on the current component, it's debt.

---

## Self-reflection

1. **What would you do with another session?** Sketch the actual `step()` proposal-
   resolution algorithm (how conflicting same-tick swaps are arbitrated) and the
   exact assortativity formula for the clustering metric, since those are the two
   places I asserted "must be designed" without writing the code. I'd also
   prototype the canvas arena to confirm the N-scaling claim empirically rather
   than by reasoning.
2. **What would you change about what you produced?** I leaned on StableMatching as
   the in-repo precedent but only read `model.ts` (60 lines) and the file list, not
   `resolver.ts`/`rotations.ts` — my "mirror its split" recommendation is sound at
   the structural level but I didn't verify the depth of their view/logic seam.
3. **What were you not asked that you think is important?** Whether the "lost
   intermediate version" the user remembers still exists in git history — restoring
   it might be cheaper and more faithful than re-deriving divergent objectives. A
   `git log`/`git blame` archaeology pass on the app folder would be worth a few
   minutes before building.
4. **What did we both overlook?** The interaction between **frozen cells and
   own-goal routing is the actual hard part** — delayed gratification only *means*
   something when a frozen cell blocks a path. The brief lists them as separate
   bullets; they're really one coupled mechanic, and the engine's collision/blocking
   model has to serve both.
5. **What did you find difficult?** Judging DOM-vs-canvas without profiling — I'm
   confident at the direction (canvas for large-N clustering) but the exact N where
   DOM stops being fine is an empirical question I answered by reasoning.
6. **What would have made this task easier?** A pointer to the "lost intermediate
   version" (commit or branch), and any existing perf observations at N=150 — I
   inferred the bottleneck from the code rather than measured it.
7. **Follow-up value:** MEDIUM — the architectural conclusion (extract engine,
   model objectives as data, normalize clustering, resolve same-tick collisions) is
   solid and I'd act on it as-is, but the two designed-not-coded pieces (collision
   resolution, assortativity formula) and the unverified git-history restoration
   path mean a follow-up session would add real value before implementation.
