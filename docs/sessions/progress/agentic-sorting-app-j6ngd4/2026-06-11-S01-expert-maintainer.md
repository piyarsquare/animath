---
kind: three-hats
session: 2026-06-11-S01
date: 2026-06-11
title: Framework Maintainer — Agentic Sorting legibility
branch: claude/agentic-sorting-app-j6ngd4
slug: agentic-sorting-app-j6ngd4
status: complete
build: unknown
followup: medium
pr: null
app: agentic-sorting
---

# Framework Maintainer — Agentic Sorting legibility

## Plan under review
<details><summary>Original request</summary>

> "This app is still something of a hot mess. can you please [review] to see what we can do to improve the legibility?"
>
> Context: Over one session the Agentic Sorting app (`src/animations/AgenticSorting/`) grew feature-by-feature into: a **Sandbox** mode (live sim) and a **Lab** mode (batch experiments), switched by top-bar mode pills. Sandbox has 7 panels (Array, Display, Population mix, Run, Metrics, Track agent, Replicate) and 2 view windows (Array arena canvas, Trajectories canvas). Lab has 5 panels (Experiment, Population mix, Conditions, Metric, Run) and 1 view (Results: bar/line/histogram charts). The app models Levin's "self-sorting arrays" (arXiv:2401.05375): agents = array elements running their own algotype; competencies measured = clustering, robustness to frozen cells, delayed gratification (the Trajectories plot). Divergent objectives (selfish-ascending vs phase-separation) are an animath-original. The Lab does Strategies / Mixes / Monte-Carlo / Sweep (incl. a two-type "blend" sweep), over 4 outcome metrics. The MAIN COMPONENT IS 857 LINES. The user wants the app to be more legible — clearer, less overwhelming, easier to understand and navigate.

</details>

## Executive summary

The bones are good. The engine, metrics, lab, and arena renderer are cleanly split into pure modules (`engine.ts`, `metrics.ts`, `lab.ts`, `arena.ts`, `Lab.tsx`) with excellent doc-comments — this is some of the best-factored simulation code in the repo. The "hot mess" is **not** the architecture; it is the **surface area presented at once** and a few **archetype/idiom drifts** from framework convention. The 857-line component is large, but ~60% of it is panel JSX that legitimately belongs to one app; it is not the primary legibility problem.

The legibility wins are cheap and concentrated:

1. **The Replicate panel is redundant** with the Lab's Monte-Carlo and is the single biggest source of "two ways to do the same thing" confusion. Removing it deletes a panel, a chunk of state, and a `runReplicate` callback.
2. **Two `arch:'lab'` panels in Sandbox** (`Track agent`, `Replicate`) are mis-tagged — neither runs a batch experiment — so the rail's Analyze tier is mislabeled and crowded.
3. **The default `setup` layout opens 3 panels stacked vertically** (Array at y18, Run at y280, Population mix at y500 — a 500px-tall panel), which on a normal screen overflows and reads as a wall. A two-column or trimmed default reads far cleaner.
4. **Objective + Frozen controls are duplicated** across Sandbox's `Array` panel and Lab's `Conditions` panel, with *shared* state. This is the right call mechanically but is under-explained and is a real "why is this here twice?" moment.

None of this requires a rewrite. The deepest change worth considering — collapsing Sandbox/Lab modes into one mode with layouts (the StableMatching pattern) — is **plausible but not clearly worth the churn**; I lean against it. Details below.

## 1 · Does the app fit framework idioms?

Mostly yes. It renders one `<Workspace>`, uses the shared `ControlPanel` primitives (`Slider`, `Pills`, `Select`) and `readouts.tsx` (`StatGrid`, `Sparkline`, `Kicker`, `MiniHisto`), keeps the canvas in view nodes with `position:absolute; inset:0`, and persists settings via `usePersistentState`. The CSS is disciplined — token-only except the CVD-safe canvas palette. The per-mode `key={mode}` + `appId` swap is a legitimate idiom (it remounts the Workspace so each mode gets its own persisted layout namespace).

Where it drifts:

| Idiom | Convention | This app | Verdict |
|---|---|---|---|
| Archetype = meaning | one icon = one meaning everywhere | `Track agent` and `Replicate` both `arch:'lab'` (flask), but neither is a batch experiment | ❌ drift |
| `readout` tier | stats & plots | `Metrics` correctly `arch:'readout'` | ✅ |
| `lab` tier | "Batch experiments over many runs" | `Replicate` *is* a batch run, so arguably ok; `Track agent` is **not** | mixed |
| Default layout | clean first impression, not a dump | `setup` stacks 3 panels incl. a 500px one | ❌ overflows |
| Panel count | peers run 5 | 7 sandbox panels | ⚠️ high but defensible |
| Shared primitives | use them | does, throughout | ✅ |

> [!IMPORTANT]
> **Archetype fix (cheap, high-value).** `Track agent` is hands-on inspection of the live sim, not a batch lab. The closest honest archetype is `readout` (it shows a sparkline + stat grid of one agent's distance-to-goal) — it pairs naturally next to `Metrics`. `Replicate`, if kept, is genuinely `lab`. Re-tagging `track` from `lab`→`readout` immediately de-crowds the Analyze tier and makes the rail legible.

## 2 · Is the 857-line component a maintainability problem?

Partly, but it is the *least* of the legibility issues and the most expensive to "fix" with churn. Breakdown of the file:

| Region | Lines (approx) | Nature |
|---|---|---|
| State declarations | 77–139 (~60) | sandbox + replicate + lab + transient + refs |
| rAF loop, draw, sizing effects | 161–358 (~200) | genuinely the live-sim core; hard to split usefully |
| weight balancer + lab/replicate runners | 362–447 (~85) | logic; *could* move to a hook |
| Panel JSX (sandbox + lab) | 452–774 (~320) | one app's controls; belongs here |
| Section/View/Layout/mode wiring + return | 776–857 (~80) | declarative config |

The honest read: the **panel JSX (~320 lines)** is irreducible per-app surface — splitting it into sub-components would scatter the app for no clarity gain and break the "one file = one app, grep-able" property the repo relies on for parallel-branch safety. The **simulation/effects block (~200 lines)** is cohesive and reads well; extracting a `useSandboxSim()` hook would shave the file but mostly moves lines around.

> [!NOTE]
> If the user *removes the Replicate panel* (recommended) and *re-tags Track agent*, the file drops by ~40–60 lines and one whole feature's worth of state (`repTrials`, `repMetric`, `repRunning`, `repProgress`, `repResult`, `runReplicate`). That is a better lever than a mechanical hook-extraction: it removes a *concept*, not just lines.

A defensible optional extraction, if a future session wants the file under ~750 lines without churning behavior: pull the sandbox simulation loop + draw + sizing effects + refs into `useSandboxSim.ts` returning `{ canvasRef, trajCanvasRef, metrics, history, selected, trackHist, onArenaPointerDown, regenerate, isRunning, setIsRunning }`. This is the `lib/particles` pattern applied locally. It is **not** required for legibility and I would not prioritize it.

## 3 · Panel & layout legibility (the real problem)

### 3a · Sandbox: 7 panels is too many to meet at once

The rail tier-sorts to: **Array** (subject) · **Display** (marks) · **Population mix** (drive) · **Run** (playback) · **Metrics** (readout) · **Track agent** (lab) · **Replicate** (lab). Seven rail icons across four tiers is the most of any app. The `Compact`/`Everything` auto-layouts plus the two authored layouts (`setup`, `analysis`) help, but the *default* (`setup`) is the first impression and it is the weakest:

```ts
// setup layout
open: { array: {x:84,y:18}, run: {x:84,y:280}, agents: {x:84,y:500} }
// agents (Population mix) has estHeight:500 → this column is ~1000px tall
```

Stacking a 250px panel, a 200px panel, and a 500px panel in one left column at x84 overflows almost any laptop viewport, so the user lands on a scrolling wall — exactly "overwhelming." The arena gets a good 720×560 window, which is right, but the controls column reads as clutter.

> [!WARNING]
> **First-impression fix.** Make the default `setup` open only **Array + Run** (the minimum to press START and see something), keep `Population mix` one rail-click away, and put Array/Run side-by-side or Array over a *collapsed* Population mix. The whole pedagogy is "press play, watch order emerge" — the default should foreground the arena and the play button, not five sliders.

### 3b · `Population mix` is a 500px panel shared across both modes

`agentsNode` (the five algotype sliders + descriptions) is `estHeight:500` and appears in *both* `sandboxSections` and `labSections` under the same id `agents`. Sharing the node is fine and correct (DRY). But at 500px it is the tallest panel in the app and dominates whatever layout opens it. The five `as-weight-desc` paragraphs are valuable on first read and noise on the hundredth.

Cheap win: the per-algotype descriptions could collapse behind the existing `?` explainer (which already carries the full algotype table) or render only on hover/expand, shrinking the panel to ~280px. Lower priority than 3a but compounds the wall problem.

### 3c · Lab: 5 panels is fine; the Experiment panel is overloaded

`labExperimentNode` switches its body by `labKind` (compare / mixes / monte / sweep), and the `sweep` branch further nests a `blend` sub-form with two `Select`s. This is a lot of conditional UI in one panel, but it is the *correct* shape — it is one concept ("what experiment?") with mode-dependent options, like a wizard step. The inline hints at the bottom that change per `labKind` are exactly right. Leave it.

### 3d · The two view windows in Sandbox are well-chosen

`Array` (arena) + `Trajectories` is a clean two-plot story (the live sort + the population-wide delayed-gratification view). The `analysis` layout that opens both side-by-side is good. No change.

## 4 · Mode design: Sandbox/Lab vs the StableMatching pattern

This is the one genuinely debatable structural question.

**What this app does:** two top-bar **modes** (`Sandbox`, `Lab`), each remounting `<Workspace key={mode}>` with its own `appId` (`agentic-sorting` / `agentic-sorting-lab`), sections, views, and layouts.

**What StableMatching does:** one mode, three **layouts** (Run / Lab / Lattice) that toggle `views[id].open` to swap among matrix/welfare/lattice instruments while sharing one section set.

**What TrinaryStars does:** two modes (Observatory / Lab) hosted by a wrapper (`Trinary.tsx`) that swaps two *separately-lazy-loaded* full components via the hash — a heavier split than Agentic's, because the two halves are genuinely different apps (3D sandbox vs fractal lab).

| Dimension | Agentic (modes) | StableMatching (layouts) | TrinaryStars (modes+wrapper) |
|---|---|---|---|
| Shared state across split | yes (weights, objective, frozen) | yes | mostly separate |
| Distinct views per side | yes (arena+traj vs results) | yes (3 instruments) | yes |
| Distinct panels per side | mostly (Display/Run vs Conditions/Metric) | no — one set | yes |
| Persistence | per-mode appId | one appId | per-component query |

**Assessment.** Agentic sits between the two peers and its choice is *defensible*: Sandbox and Lab have genuinely different panel sets *and* different views, which is more divergence than StableMatching's single-section/three-views case. The mode split is not the mess.

> [!CAUTION]
> **Per-mode `appId` is a subtle gotcha.** Because Sandbox and Lab use different `appId`s, they persist *independent* workspace layouts — good. But the **settings** (`weights`, `objectiveMode`, `descShare`, `frozenPct`) are shared global `usePersistentState` keys, so changing Frozen % in Lab silently changes it in Sandbox. That is intended (one population definition, two ways to study it) but it is the source of the "objective/frozen live in two places" confusion. The fix is **explanation, not restructuring**: the Lab `Conditions` panel already hints "These conditions apply to every group" — extend that to say the population settings are shared with the Sandbox.

I would **not** convert modes→layouts. It would force one merged 8–10 panel section set with mode-conditional bodies, which is *less* legible than the current clean per-mode split, and it would lose the independent layout persistence. Keep modes.

## 5 · Duplicated controls across modes

| Control | Sandbox home | Lab home | Shared state? | Verdict |
|---|---|---|---|---|
| Objective (uniform/split) | `Array` panel | `Conditions` panel | yes (`objectiveMode`) | OK, label it |
| Descending share | `Array` panel | `Conditions` panel | yes (`descShare`) | OK, label it |
| Frozen / defective | `Array` panel | `Conditions` panel | yes (`frozenPct`) | OK, label it |
| Population mix | `Population mix` (shared node) | same node | yes (`weights`) | ✅ DRY |
| Wake rate | `Run` panel | `Conditions` (`labWake`, **separate**) | **no** | ⚠️ inconsistent |
| Array size | `Array` (`arraySize`) | `Conditions` (`labCount`, **separate**) | **no** | ⚠️ inconsistent |

The inconsistency worth a note: **objective/desc/frozen are shared, but wake-rate and array-size are mode-local** (`labWake`/`labCount` vs `wakeFraction`/`arraySize`). There is a real reason — the Lab wants its own larger-count / different-wake conditions independent of whatever the Sandbox is showing — but a reader can't tell *which* settings carry over and which don't. This is a legibility bug more than a code bug. A one-line hint ("Lab conditions are independent of the Sandbox; population mix and objective are shared") resolves it.

## 6 · Consistency with peers — scorecard

| Aspect | Peer norm | Agentic | Note |
|---|---|---|---|
| Lab as `arch:'lab'` panel | StableMatching `lab` panel; Trinary Lab component | Lab is a **mode**, not a panel | acceptable divergence (different views) |
| Readout primitives | StatGrid/Sparkline/MiniHisto | used correctly | ✅ |
| `?` explainer = EXPLAINER + README | `[explainer, readme].join('---')` | identical pattern | ✅ |
| Default layout legibility | StableMatching opens 2 panels | Agentic opens 3 (one 500px) | ❌ heavier |
| Archetype honesty | one meaning per icon | 2× `lab` mis-tag | ❌ |

The app is a good framework citizen on six of eight axes; the two failures (default-layout weight, archetype mis-tag) are both cheap to fix.

## Verdict

The architecture is sound — do **not** rewrite, do **not** convert modes to layouts, do **not** split the 857-line file as a primary goal. The mess is surface-area and labeling, fixable in one focused session.

### Quick wins (do these — hours, low risk)

1. **Remove the Replicate panel** (or fold it into a "Run on N seeds" button inside Metrics). It duplicates Lab Monte-Carlo and is the biggest "two ways to do one thing" confusion. Deletes a panel + 5 state vars + `runReplicate`. *(Confirm with the pedagogy reviewer — Replicate's "stay in Sandbox" convenience may be intentional; if kept, at minimum re-tag and rename to make the Sandbox↔Lab relationship explicit.)*
2. **Re-tag `Track agent` from `arch:'lab'`→`arch:'readout'`** so it sits with Metrics and the Analyze tier reads honestly.
3. **Trim the default `setup` layout** to open Array + Run (foreground the arena and START); make Population mix a one-click rail open, not a default 500px wall.
4. **Add two one-line hints**: (a) in Lab `Conditions`, note which settings are shared with Sandbox vs Lab-local; (b) in Sandbox `Array`, note Objective/Frozen also drive the Lab.
5. **Shrink `Population mix`** by collapsing the per-algotype descriptions (the `?` explainer already carries the full table) — `estHeight` 500→~300.

### Deeper (optional — only if a session has budget)

6. **Extract `useSandboxSim()`** (loop + draw + sizing + refs) to drop the file under ~750 lines. Pure mechanical move, no behavior change, low value-per-churn. Skip unless the file keeps growing.
7. **Reconsider whether Trajectories deserves to be a default view** vs. opt-in — it is the subtlest plot and may add to first-load overwhelm. Defer to the pedagogy reviewer.

Net: items 1–4 are the legibility cure and touch ~80 lines. They remove one concept, fix two mislabels, and de-wall the first impression — which is exactly what "less overwhelming, easier to navigate" asks for, without endangering the well-built engine underneath.

## Self-reflection

1. **What would you do with another session?** Actually prototype the trimmed `setup` layout and the Replicate removal, run `npm run build`, and screenshot the before/after first impression — my "wall of panels" claim is reasoned from `estHeight` + layout coords, not observed in a running browser.
2. **What would you change about what you produced?** I asserted the default layout overflows without measuring against an actual viewport height; I'd want to confirm the stacked-column total (≈250+200+500+gaps) against a real stage before stating it as fact.
3. **What were you not asked that you think is important?** Whether the **mobile/phone re-chrome** (PhoneWorkspace, ≤740px) makes the 7-panel sandbox even worse — I reviewed desktop legibility only; phone may be the real hot mess.
4. **What did we both overlook?** The `eslint-disable-next-line react-hooks/exhaustive-deps` on `runLab` (line 442) — a hidden stale-closure risk that is a correctness smell, not a legibility one, but lives in the same file and could bite a refactor.
5. **What did you find difficult?** Judging the modes-vs-layouts call without seeing both peers running; I leaned on code structure, which is sufficient for a recommendation but not a certainty.
6. **What would have made this task easier?** A running instance or screenshots of the default layouts in each mode — the legibility verdict is fundamentally a visual judgment I made from coordinates and `estHeight` hints.
7. **Follow-up value:** MEDIUM — the recommendations are correct and low-risk in direction, but the highest-impact claim (default layout is a wall) and the phone-rechrome gap want one verification pass before implementation.
