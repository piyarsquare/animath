---
kind: three-hats
session: 2026-06-11-S01
date: 2026-06-11
title: "Role 2 — Architecture & Quality Consultant: Agentic Sorting legibility"
branch: claude/agentic-sorting-app-j6ngd4
slug: agentic-sorting-app-j6ngd4
status: complete
build: unknown
followup: null
pr: null
app: agentic-sorting
---

# Role 2 — Architecture & Quality Consultant: Agentic Sorting legibility

## Plan under review
<details><summary>Original request</summary>

> "This app is still something of a hot mess. can you please [review] to see what we can do to improve the legibility?"
>
> Context: Over one session the Agentic Sorting app (`src/animations/AgenticSorting/`) grew feature-by-feature into a **Sandbox** mode (live sim) and a **Lab** mode (batch experiments) switched by top-bar mode pills. Sandbox: 7 panels (Array, Display, Population mix, Run, Metrics, Track agent, Replicate) + 2 canvas views (arena, Trajectories). Lab: 5 panels (Experiment, Population mix, Conditions, Metric, Run) + 1 Results view (bar/line/histogram). Files: `AgenticSorting.tsx` (857 lines — the orchestrator with all state, the rAF loop, canvas refs, click-track, trajectory recording, replicate + lab runners, and every panel's JSX), plus pure modules `engine.ts`, `metrics.ts`, `lab.ts`, `arena.ts` (canvas draw), `Lab.tsx` (LabResults charts). The user wants the app more legible — both the CODE and the UX.

</details>

## Executive summary

The **pure layer is in good shape**. `engine.ts`, `metrics.ts`, `lab.ts`, and `arena.ts`
are clean, well-documented, side-effect-free, and already factored along the right
seams (simulate / measure / batch / draw). The mess is concentrated entirely in the
**one React component**: `AgenticSorting.tsx` is 857 lines holding ~28 hooks of state,
~7 effects, two complete async experiment runners, the rAF loop, two canvas wiring
blocks, click-tracking, trajectory recording, and **twelve inline panel JSX blocks** —
then a final `return` that ternaries everything by `mode` behind one `<Workspace key={mode}>`.

This is a **legibility problem, not an architecture problem.** Nothing here is wrongly
*designed*; it is wrongly *located* — sandbox concerns and lab concerns share one
function body with no membrane between them. The fix is mechanical, behavior-preserving
extraction, not a rewrite. The single highest-leverage move is to **split the component
by mode** (Sandbox vs Lab, exactly the Trinary precedent) since the `key={mode}` +
per-mode `appId` already means the two modes never share a live React tree — they only
share a *file*. After that split, two custom hooks (`useSandboxSim`, `useLab`) absorb
the imperative cores, and the panel JSX falls out into small presentational components.

> [!IMPORTANT]
> **Headline:** the only shared runtime state between the two modes is the persisted
> *settings* (mix/objective/frozen), and those persist to `localStorage` independently
> already. Because `<Workspace key={mode}>` force-remounts on mode change, Sandbox and
> Lab are **already** disjoint at runtime. Splitting them into two components is therefore
> close to a no-risk refactor: it changes where code lives, not what runs.

---

## 1 · State inventory — what is actually tangled

I read all 857 lines and bucketed every `useState`/`useRef`/`usePersistentState` by
which mode reads it. The result is the core finding: **the state is cleanly separable
by mode; it is only the *file* that is shared.**

| Bucket | State | Read by | Notes |
|---|---|---|---|
| **Shared settings** (persisted) | `arraySize`, `objectiveMode`, `descShare`, `frozenPct`, `weights` | both | The legit shared surface — population definition |
| Sandbox-only settings (persisted) | `stepInterval`, `wakeFraction`, `display`, `colorBy` | sandbox | |
| Sandbox replicate (persisted+transient) | `repTrials`, `repMetric`, `repRunning`, `repProgress`, `repResult` | sandbox | A *mini-Lab* embedded in the sandbox |
| Sandbox transient | `isRunning`, `metrics`, `history`, `selected`, `trackHist` | sandbox | |
| Sandbox sim refs | `stateRef`, `rngRef`, `histRef`, `rafRef`, `accRef`, `lastRef`, `lastMetricRef`, sizeRefs, canvasRefs, trajRefs (~16 refs) | sandbox | The rAF engine's private world |
| Lab settings (persisted) | `labKind`, `savedMixes`, `labTrials`, `labCount`, `labWake`, `labCap`, `labMetric`, `sweepParam`, `sweepSteps`, `blendA`, `blendB` (11 keys) | lab | |
| Lab transient | `labRunning`, `labProgress`, `labResults`, `labResultKind`, `labSweepLabel` | lab | |
| Mode | `mode` (persisted) | wrapper | The one thing the wrapper needs |

Counting: of ~28 state/ref declarations, **2 belong to the wrapper** (`mode` + shared
settings), **~22 belong to Sandbox**, **~16 to Lab** — and today *all* of them are
instantiated on every render regardless of mode. A Sandbox user pays for 16 lab state
slots that are dead; a Lab user pays for 16 sim refs and an rAF loop that the
`mode !== 'sandbox'` guard immediately bails out of (lines 330, 358).

### Refs-mirroring-state: defensible, keep it

The four "refs mirroring settings" (`intervalRef`/`wakeRef`/`displayRef`/`colorByRef`,
lines 142–145, synced by effects 280–283) look like a smell but are **correct and
idiomatic** here: the rAF loop and `draw()` callback must read live values without
re-subscribing the effect (which would tear down/rebuild the loop on every slider tick).
This is the standard "latest-value ref" pattern. Do **not** try to eliminate it; just
*relocate* it into `useSandboxSim` where it stops cluttering the orchestrator.

> [!NOTE]
> The `axisRef`/`markRef` theme-color refs (lines 146, 300–301) reading
> `getComputedStyle` inside the ResizeObserver is a subtle but sound way to pick up
> the active skin's `--dim`/`--accent`. Preserve verbatim across any move — it is easy
> to break by reading the color at the wrong lifecycle moment.

---

## 2 · The natural seams

Reading top-to-bottom, the file has five clearly delineated zones. They are already
*sectioned by comment banners* — the author knew where the joints were; they just
never became modules:

```
77–151    state declarations (shared + sandbox + lab)
161–358   sandbox engine: draw/recordTraj/flushMetrics/regenerate/onPointerDown
          + 4 sync effects + 2 ResizeObserver effects + the rAF loop
362–407   helpers + runReplicate (sandbox)
410–448   runLab + labReady (lab)
454–774   12 panel `node` JSX blocks + 2 view `node`s
776–857   SectionDef[] / ViewDef[] / LayoutDef[] arrays + the Workspace return
```

The seams (in priority order):

1. **Mode seam** (between sandbox zones and lab zones). This is the deepest and cleanest
   cut. Everything in 161–407 + the sandbox panels is one component; 410–448 + lab panels
   is another. The wrapper keeps only `mode` and the shared population settings.
2. **Imperative-core seam** inside Sandbox: the rAF loop + canvas wiring + trajectory
   recording + click-track (161–358) is a self-contained engine that wants to be a hook.
3. **Async-runner seam**: `runReplicate` (396–407) and `runLab` (413–443) are two
   thin wrappers over the same `runExperiment` from `lab.ts`. They share a `monte` spec
   shape. `useLab` (and a tiny `useReplicate`) own these.
4. **Presentational seam**: each `*Node` is a pure function of state + setters. They are
   components waiting to be named.

---

## 3 · Proposed target structure

I favor the **StableMatching precedent over a file-per-panel explosion.** StableMatching
(59 kB, one file) keeps its subcomponents (`Matrix`, `Heatmap`, `LatticeView`,
`LabSummary`, `PrefList`) as *module-level functions in the same file* — not separate
files. For Agentic Sorting the right granularity is **per-mode file + per-mode hook**,
with panels as local components, landing around 5 files of 150–300 lines each rather
than 15 micro-files. Over-decomposition is its own legibility tax (jumping between 15
files to read one screen).

```text
src/animations/AgenticSorting/
├── AgenticSorting.tsx        ~60 lines  — wrapper: owns `mode` + shared population
│                                          settings, renders <Sandbox/> | <Lab/>
├── Sandbox.tsx               ~220 lines — sandbox Workspace; sandbox-only settings;
│                                          panel components; sections/views/layouts
├── Lab.tsx (rename → LabMode.tsx)
│   or LabMode.tsx            ~200 lines — lab Workspace; lab settings; runLab;
│                                          sections/views/layouts
├── useSandboxSim.ts          ~160 lines — rAF loop, canvas refs, draw/recordTraj/
│                                          flushMetrics/regenerate, click-track,
│                                          ResizeObservers. Returns { canvasRef,
│                                          trajCanvasRef, metrics, history, selected,
│                                          trackHist, isRunning, setIsRunning,
│                                          regenerate, onArenaPointerDown }
├── useLab.ts                 ~90 lines  — buildSpec + runLab/runReplicate + progress;
│                                          returns { run, running, progress, results, … }
├── panels/ (optional)        — only if Sandbox.tsx/LabMode.tsx exceed ~300 lines
├── engine.ts   metrics.ts   lab.ts   arena.ts   — UNCHANGED (already clean)
└── LabResults.tsx            — rename of today's Lab.tsx (the charts); UNCHANGED logic
```

> [!CAUTION]
> **Naming collision to fix first.** Today there is a `Lab.tsx` that exports
> `LabResults` (the *charts*), and `AgenticSorting.tsx` also contains all the *lab-mode
> controls*. If you add a lab-mode *component*, the two "Lab"s will confuse every reader
> and grep. Rename the existing charts file `Lab.tsx → LabResults.tsx` as step 0. This
> is a one-line import edit and removes a real source of the "hot mess" feeling.

### Hook signatures (the load-bearing contracts)

```ts
// useSandboxSim.ts — owns the live simulation + its canvases
function useSandboxSim(settings: {
  arraySize: number; weights: Weights;
  objectiveMode: 'uniform' | 'split'; descShare: number; frozenPct: number;
  stepInterval: number; wakeFraction: number;
  display: 'bars' | 'dots'; colorBy: 'type' | 'objective';
}): {
  canvasRef: RefObject<HTMLCanvasElement>;
  trajCanvasRef: RefObject<HTMLCanvasElement>;
  isRunning: boolean; setIsRunning: (f: (r: boolean) => boolean) => void;
  metrics: MetricsView; history: number[];
  selected: TrackSel | null; trackHist: number[];
  regenerate: () => void;
  onArenaPointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
};

// useLab.ts — owns batch experiments (and the sandbox's quick-replicate variant)
function useLab(): {
  run: (spec: ExperimentSpec) => Promise<void>;
  running: boolean; progress: number;
  results: GroupResult[]; resultKind: 'compare'|'monte'|'sweep'; sweepLabel: string;
};
```

The crucial property: `useSandboxSim` takes settings **as a plain object argument** and
internally manages the latest-value refs. The component then never sees a single
`xxxRef` — it just renders `metrics`/`history`/`selected` and binds the two canvas refs.
That alone removes ~20 lines of ref plumbing and 4 sync effects from view.

---

## 4 · Cohesion & coupling — the duplication to collapse

| Duplication | Where | Verdict |
|---|---|---|
| Objective / descShare / frozen controls | `arrayNode` (461–478) **and** `labConditionsNode` (711–718) | **Real dup.** Both render the same three controls over the same shared state. Extract `<PopulationControls>` and use it in both modes. |
| `agentsNode` (Population mix) reused across modes | `sandboxSections` + `labSections` both reference the *same* `agentsNode` instance | **Already shared** — good. Keep it as a `<PopulationMix>` component. |
| `runReplicate` vs `runLab` | 396–407 vs 413–443 | Both build an `ExperimentSpec` and call `runExperiment`. Replicate is literally `kind:'monte'` with sandbox settings. Fold both into `useLab`'s `run(spec)`; build the two specs at the call sites. |
| `METRIC_OPTS` / metric labels | local const + `METRIC_LABELS` in lab.ts | Minor; fine. |
| Two near-identical ResizeObserver effects | 286–306 and 309–326 | **Real dup.** ~18 lines each, differ only in which ref/draw they target. Extract `useCanvas2D(drawFn)` → `{ ref }` and call it twice. Moves into `useSandboxSim`. |

The **cohesion verdict**: today the component has *low cohesion* (it does sim, batch,
charts-wiring, and chrome assembly) and *high internal coupling* (the lab runner closes
over `objectiveMode/descShare/frozenPct/weights` that the sandbox also mutates). The
mode-split raises cohesion sharply: each resulting component does one job. The only
intentional coupling that remains — shared population settings — is lifted to the
wrapper and passed down as props, which is exactly where it belongs.

> [!NOTE]
> One subtlety the split must respect: `runLab` and `runReplicate` read
> `objectiveMode/descShare/frozenPct/weights` from the **shared** settings (the
> sandbox's current mix), not lab-local copies. So those four must live in the wrapper
> and be threaded into both children. The `labConditions` panel *also* edits
> `objectiveMode`/`descShare`/`frozenPct` (711–718) — so edits there must write back to
> the shared state. Keep them as props-with-setters from the wrapper; do not fork a
> second copy or the two modes will silently disagree.

---

## 5 · UX legibility

Code aside, the user also called the **UX** a hot mess. Concrete observations:

### 5a · Panel count & hierarchy

Sandbox shows **7 panels**; that is a lot of simultaneous surface for a "watch agents
sort" sandbox. The information hierarchy is flat — Array, Display, Population mix, Run,
Metrics, Track, Replicate all read as equal-weight rail icons. The **one thing a new
user should see first** is *the arena, running, with a Start button*. Today the default
`setup` layout opens Array + Run + Population mix and the arena — reasonable — but
"Replicate" (a statistical mini-experiment) sitting in the sandbox alongside live
controls **muddies the sandbox/lab boundary the mode pills are supposed to draw.**

> [!IMPORTANT]
> **Decision-worthy:** *Replicate* is conceptually Lab work living in Sandbox. It is
> the single clearest "why does this feel like two apps mashed together" artifact. Two
> defensible resolutions: (a) **remove it** from Sandbox and let Lab's Monte-Carlo own
> that job (simplest, most legible); or (b) **keep it but frame it** as "quick stats on
> this exact setup" with a visual divider. I lean (a) — it deletes state
> (`repTrials/repMetric/repRunning/repProgress/repResult`) and a panel, and sharpens
> the Sandbox=look / Lab=measure split that justifies having modes at all.

### 5b · Progressive disclosure — already present, lean into it

The app *does* use conditional disclosure well: `descShare` only appears when
`objectiveMode==='split'` (469); blend-type selectors only when `sweepParam==='blend'`
(674). That is the right instinct. Extend it: the **Track agent** and **Metrics** panels
are analysis surfaces that a first-time user doesn't need — they belong to the `analysis`
layout, not the default. The default layout should be *deliberately minimal* (arena +
Run + maybe Population mix) and the rail/layouts reveal the rest. The machinery for this
already exists (layouts); it is a curation decision, not new code.

### 5c · The two-mode model is sound

Keeping Sandbox and Lab as **top-bar mode pills** is the correct framework idiom
(Trinary, Stable Matching both do mode-or-layout splits). Do **not** collapse them into
one mode. The UX confusion is not "there are two modes" — it is "the sandbox leaks lab
features (Replicate) and the lab re-presents sandbox controls (Conditions duplicates
Array)." Fix the leakage, keep the modes.

### 5d · Minor UX nits

- The arena is click-to-track but there's **no affordance** signaling that. The empty
  `trackNode` hint explains it only once that panel is open. Consider a cursor change or
  a one-line caption on the arena view itself.
- `labReady` gating (445–447) is good, but the disabled-button + tiny hint is easy to
  miss. Fine for now.

---

## 6 · Verification — keeping behavior identical

There is no test runner; `npm run build` (tsc + vite) is the only gate. For a refactor
this size, behavior preservation rests on **discipline + small steps**, not tooling.

> [!CAUTION]
> The riskiest pieces are the **stateful imperative cores**: the rAF accumulator loop
> (332–354), the trajectory ring buffers (`trajRef`/`trajLenRef`/`targetByIdRef`), and
> the DPR canvas sizing. A subtle move that changes *when* `regenerate()` runs relative
> to the ResizeObserver firing can blank the canvas or desync trajectories. Move these
> **verbatim** — copy the function bodies into the hook unchanged; do not "improve" them
> in the same step.

### Safe sequence (each step ends green, each is independently revertable)

| # | Step | Risk | Why first |
|---|---|---|---|
| 0 | Rename `Lab.tsx` → `LabResults.tsx`, fix the one import | trivial | Removes the worst naming confusion before anything moves |
| 1 | Extract pure leaf presentational components in-file (`MixBar` already is; add `<PopulationMix>`, `<PopulationControls>`) — no state moves, just JSX hoisting | low | Pure render functions; tsc proves equivalence |
| 2 | Extract `useCanvas2D(draw)` and use it for both canvases | low–med | Collapses the two ResizeObserver effects; isolated |
| 3 | Extract `useSandboxSim` — move the rAF loop, sim refs, draw/record/flush/regenerate/click-track in **verbatim**; component binds returned refs | **med–high** | The one step needing manual smoke-test (run, pause, regenerate, click-track, resize, collapse-and-reopen the view) |
| 4 | Extract `useLab` (+ fold `runReplicate` into it) | low | Pure async over `lab.ts`; deterministic — same seed ⇒ same numbers, easy to spot-check |
| 5 | **Split into `<Sandbox>` / `<LabMode>`**; wrapper keeps `mode` + shared settings | low | `key={mode}` already isolates them at runtime, so this is mostly cut/paste |
| 6 | (optional, separate PR) UX curation: remove/reframe Replicate, minimize default layout | low | A product decision, not a refactor — keep out of the mechanical PR |

**Manual smoke checklist** to run after step 3 and again after step 5 (this *is* the
test suite here): Start/Pause; Reset regenerates; slider changes take effect live
without restarting the loop; click an agent → tracked column + sparkline; click again →
untrack; resize the arena window; collapse the Trajectories view and reopen (WebGL/2D
state survives — though these are 2D canvases, the zero-size guard still matters);
switch Sandbox↔Lab and back (settings persist); run a Lab experiment of each kind and
confirm identical numbers to pre-refactor (same seed path).

> [!TIP]
> Capture a **golden number** before refactoring: run Lab → Compare with a fixed seed
> and record the five means. `runExperiment` is deterministic in `seed`, so any drift
> after the refactor is a real regression, not noise. This gives you a cheap, exact
> oracle in the absence of tests — worth more than any amount of manual eyeballing.

---

## 7 · Pushback / what NOT to do

- **Do not file-per-panel.** Twelve panel files would trade one big file for fifteen
  tiny ones and *worse* navigability. The StableMatching same-file-subcomponent pattern
  is the house style; match it.
- **Do not introduce a store/context.** CLAUDE.md mandates local `useState`/`useRef`
  only; the shared-settings surface is small (5 values) and props-down is clearer than
  a context here. Lifting it to the wrapper is sufficient.
- **Do not merge the modes.** The confusion is leakage, not the existence of two modes.
- **Do not rewrite the pure modules.** `engine/metrics/lab/arena` are the healthiest
  part of the codebase; touching them adds risk for zero legibility gain.
- **Do not do steps 3 and 5 in one commit.** They are the two highest-information-
  density moves; keep them separately revertable.

---

## Verdict

**The pure layer is clean; the disorder is entirely in one 857-line component, and it is
*locational*, not *architectural*.** The mess is sandbox and lab sharing a function body
with no membrane — yet `<Workspace key={mode}>` already isolates them at runtime, making
the cure low-risk extraction rather than redesign.

**Quick wins (do first, low risk, big legibility payoff):**

1. **Rename `Lab.tsx` → `LabResults.tsx`** — kills the "two Labs" confusion (one import).
2. **Extract `<PopulationControls>` + `<PopulationMix>`** presentational components —
   removes the objective/frozen duplication between Array and Conditions panels.
3. **Extract `useCanvas2D(draw)`** — collapses the two duplicated ResizeObserver effects.
4. **UX curation (separate PR):** pull *Replicate* out of Sandbox (or fence it off) so
   the Sandbox=look / Lab=measure boundary the mode pills promise actually holds;
   minimize the default layout to arena + Run.

**Deeper extraction (the real fix, medium risk, do in order):**

5. **`useSandboxSim`** — the rAF loop, canvas refs, draw/trajectory/click-track move
   verbatim into a hook; the component stops touching ~20 refs and 6 effects. *(Highest
   risk step — manual smoke-test gated; capture the golden-number oracle first.)*
6. **`useLab`** (folding `runReplicate`) — thin deterministic async over `lab.ts`.
7. **Split into `<Sandbox>` / `<LabMode>` behind a ~60-line wrapper** (the Trinary
   pattern) holding only `mode` + the five shared population settings. After this the
   word "mode" disappears from every conditional in the codebase — the single biggest
   readability gain available.

**Risk posture:** everything except step 5 is near-mechanical and tsc-verifiable. Step 5
is the one place to slow down and smoke-test. Sequenced this way, every commit ships
green and is independently revertable, which is exactly the behavior-preserving property
a test-less repo needs. Net effect: one 857-line file becomes ~5 files of 60–220 lines,
each with a single job, with **no behavior change and no new abstractions the framework
doesn't already bless.**

---

## Self-reflection

1. **What would you do with another session?** Actually perform steps 0–2 (the
   zero-risk quick wins) to validate the line-count and import-graph estimates against
   reality, and produce the golden-number oracle so the later `useSandboxSim` extraction
   has a concrete regression check. I'd also sanity-check that no `usePersistentState`
   key changes are needed when settings move to the wrapper (the keys are global strings,
   so they shouldn't — but I'd confirm).

2. **What would you change about what you produced?** I asserted line-count targets for
   the extracted files (~160/~90/etc.) from reading, not from doing the extraction; they
   are estimates. I'd flag them as such more loudly. I also didn't measure whether the
   `key={mode}` remount has any perceptible cost (canvas re-init flash) that the split
   would preserve or worsen.

3. **What were you not asked that you think is important?** Whether the `mode` should
   stay a top-bar pill *or* become two catalog entries / hash routes (the way Trinary
   keeps `#/trinary` and `#/trinary-lab`). That's a product/IA question that affects the
   wrapper shape and deep-linkability, and it sits upstream of the refactor.

4. **What did we both overlook?** The per-mode `appId` (`agentic-sorting` vs
   `agentic-sorting-lab`) means the two modes persist *separate* workspace layouts — good
   — but it also means a user's Lab layout is invisible until they switch modes, which
   interacts with the "minimize the default layout" UX suggestion. Worth a thought in the
   UX pass.

5. **What did you find difficult?** Judging the *right* decomposition granularity without
   running the build — over-splitting is as harmful to legibility as under-splitting, and
   that line is a matter of taste calibrated against the StableMatching house style rather
   than a rule I could verify.

6. **What would have made this task easier?** A golden-output fixture (even a committed
   JSON of one seeded Lab run) would let me state behavior-preservation as a hard check
   rather than a manual checklist. Its absence is itself a finding.

7. **Follow-up value:** LOW — The analysis is complete and the sequence is concrete and
   low-risk; follow-up is the implementation itself (which the other hats and the user
   will weigh), plus confirming the line-count estimates — polish, not correction.
