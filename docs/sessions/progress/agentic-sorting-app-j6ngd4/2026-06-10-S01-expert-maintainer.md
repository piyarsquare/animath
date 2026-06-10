---
kind: three-hats
session: 2026-06-10-S01
date: 2026-06-10
title: "Framework Maintainer review — Agentic Sorting: divergent objectives + Levin competencies"
branch: claude/agentic-sorting-app-j6ngd4
slug: agentic-sorting-app-j6ngd4
status: complete
build: unknown
followup: low
pr: null
app: agentic-sorting
---

# Framework Maintainer review — Agentic Sorting: divergent objectives + Levin competencies

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

As the animath maintainer, my read is: **this plan is a good fit for the framework and almost entirely conflict-free, but the plan as written under-specifies the engine refactor it implies and over-trusts the current implementation's structure.** The current `AgenticSorting.tsx` is a single 436-line component with the simulation logic (`runSimulationStep`) inlined as a `useCallback`. Both requested axes — divergent objectives and Levin competencies — change the *core loop*, not the chrome. So the real work is a model refactor, and the plan never names it. That is the gap I want closed before any code is written.

The good news for me as steward: AgenticSorting is a self-contained CSS/DOM app. It touches no shared files except the append-only `apps.ts`/`index.tsx`/`README.md`/`CLAUDE.md` lines it already owns (and likely none of those need touching at all — this is an *expansion in place*, not a new route). Parallel-branch risk is near zero. The new panels map cleanly onto the existing closed archetype vocabulary. The instrumentation request maps directly onto our existing `readouts.tsx` primitives, which is exactly the kind of reuse the framework was designed for.

My headline concerns, in order: (1) **engine extraction** is a prerequisite that must be scoped explicitly; (2) **divergent objectives breaks the convergence guarantee** the EXPLAINER and README currently promise, so the docs and the "what am I looking at" framing must change in lockstep — this is a model-vs-claim mismatch waiting to happen; (3) **scope is large** and should be sliced; (4) **persistence is currently absent** in this app and adding config without `usePersistentState` would regress the house style.

| Axis | Framework fit | Conflict risk | My verdict |
|---|---|:--:|---|
| (1) Divergent objectives | Good — new state + new agent logic | Low | Endorse, but slice it |
| (2a) Frozen/defective cells | Excellent — trivial state addition | Low | Endorse (MVP) |
| (2b) Delayed-gratification routing | Hard — changes swap rule semantics | Low | Endorse with caution |
| (2c) Clustering metric / instrumentation | Excellent — `readouts.tsx` exists for this | Low | Strongly endorse |
| (implicit) Engine extraction | Necessary | Low | **Require it explicitly** |

## 1 · History & context — does this understand why things are the way they are?

The plan calls this a *restoration* ("bring back a lost intermediate version"). I have no record in the current tree of a divergent-objective mode — the five strategies (`standard`, `blindDate`, `nomadic`, `patrolling`, `perfectionist`) all sort *ascending* toward one global target; they differ in *mechanism*, not *goal*. So whatever "lost version" the user remembers is not in the committed history of this folder as it stands. That is fine — the request is really "add a genuinely divergent mode" — but the author should not spend a session hunting git history for code that may have lived only in a prior conversation. **Treat this as new work, not a revert.**

Context the plan gets right:
- It correctly identifies AgenticSorting as the target and the folder as self-contained.
- It anchors on a real, citable paper (the Zhang/Goldstein/Levin morphogenesis-sorting paper) whose three named phenomena — *delayed gratification*, *defective/frozen cells*, *chimeric clustering* — are exactly the three the plan lists. So axis (2) is faithful to the source.

Context the plan misses:
- The current EXPLAINER/README make a **strong convergence claim**: "the array still marches toward sorted order… global property (sortedness) arising from purely local actions." Divergent objectives (ascending-vs-descending) **falsify that claim** for those populations — the array will reach a *contested* state, not a sorted one. The plan does not flag that the headline narrative of the app changes. As maintainer I care a lot about model-vs-claim consistency (it's bitten other apps), so this must be called out.
- The app currently has **no `usePersistentState`** at all — every knob is plain `useState`. That's a pre-existing gap, but adding more config without addressing it widens it.

> [!NOTE]
> **Not a regression of an abandoned approach.** Nothing here repeats a pattern we deliberately retired (unlike, say, re-introducing per-app chrome). Divergent objectives and competency instrumentation are net-new capabilities that sit comfortably on top of the existing workspace integration.

## 2 · The unnamed prerequisite: engine extraction

This is my single most important finding. The plan describes *features* but the current code shape makes those features awkward to add in place.

Today the simulation is one `runSimulationStep` `useCallback` (lines 129–244) with a `switch (agent.type)` over five hard-coded cases, mutating a local copy of `itemsRef.current`. To add what the plan wants you must touch the *core of that loop*:

- **Divergent objectives** ⇒ each agent needs a *goal/comparator*, not a shared ascending test. The `needsSwap = isLeft ? a.value > n.value : a.value < n.value` idiom (repeated five times) becomes `agent.wantsToSwap(...)` parameterized by direction/goal.
- **Frozen cells** ⇒ a per-agent `frozen` flag that the wake-up loop skips (and that a frozen agent still *blocks* swaps through — the interesting part).
- **Delayed gratification** ⇒ the swap decision can no longer be purely greedy; an agent must sometimes accept a locally-worsening move to route around a frozen blocker. That is a semantic change to the swap rule, not a new case.
- **Clustering metric** ⇒ a pure read-only pass over the array each cycle.

> [!IMPORTANT]
> **Decision I'd require:** pull the simulation out of the component into a plain `engine.ts` (types + `step(items, params) → { items, events }`) before adding features. This matches the house pattern explicitly documented in CLAUDE.md ("pull simulation/algorithm logic and data out of the component — e.g. `physics.ts` + `presets.ts`"). It also makes the five existing strategies + the new behaviors *testable by inspection* and keeps `AgenticSorting.tsx` a thin view+controls shell like our other apps. Trinary's `lib/nbody` and the particle engine are the precedents.

This is not gold-plating — it is the difference between bolting a sixth and seventh `case` onto an already-repetitive switch versus having a model you can reason about. But it does mean the plan's true scope includes a refactor it doesn't mention. **Name it, or the work will sprawl mid-session.**

## 3 · Archetype mapping — does it fit the closed vocabulary?

This is where the plan is strongest. Every new surface maps onto an existing archetype; **no new icons are needed** (which is non-negotiable — the vocabulary is closed). Current panels: `Array`(subject) · `Display`(marks) · `Agents`(drive) · `Run`(playback) · `Metrics`(readout).

| New capability | Where it lives | Archetype | New panel? |
|---|---|---|---|
| Ascending/descending goal mix | extend the **Agents** panel, or a new **Objectives** panel | `drive` | optional |
| "Selfish/own-position" goal toggle | **Agents** / Objectives panel | `drive` | no |
| Frozen-cell fraction | **Array** panel (it shapes the substrate) | `subject` | no |
| Delayed-gratification toggle/strength | **Run** or a behavior panel | `drive` or `playback` | optional |
| Clustering metric, sortedness, contestedness | **Metrics** panel via `readouts.tsx` | `readout` | no |
| Chimeric-cluster histogram / sparkline-over-time | **Metrics** panel | `readout` | no |
| Batch "how clustered do mixes get?" sweep | optional new **Lab** panel | `lab` | optional |

Notes for the implementer:
- The instrumentation axis is a *gift* to the framework: `StatGrid` (already used), `MiniHisto` (cluster-size distribution), `Sparkline` (sortedness/contestedness over cycles), and `Breakdown` (per-strategy adjacency %) all exist in `chrome/readouts.tsx` and are exactly what "surfaced as observable, measurable phenomena" calls for. **Use them.** The current Metrics panel hand-rolls only `StatGrid` with three counters; this is the panel that should grow the most.
- A `lab` archetype panel (batch experiments over many runs) is the natural home for "do chimeric arrays *reliably* cluster?" — running N seeds and reporting a distribution. That's the StableMatching/Trinary-Lab pattern. It's optional but it's the most *pedagogically* honest way to make clustering "measurable rather than visual." I'd put it in the full vision, not the MVP.
- `LayoutDef` can ship a new **"Competencies"** or **"Lab"** layout (the existing two are `Setup` and `Analysis`). That is the right mechanism for surfacing the new instrumentation without crowding the default view — exactly how StableMatching presents its instruments.

> [!TIP]
> Keep the **Display** (marks) panel in mind: divergent goals and frozen cells need to be *legible* in the arena. Frozen cells want a distinct visual (desaturated/locked), and ascending-vs-descending agents need a color or marker that reads their *goal*, not just their *strategy*. That's a marks-panel concern and should be planned alongside the engine, or the new phenomena will be invisible.

## 4 · Operational reality & code health

| Concern | Assessment |
|---|---|
| Single `npm run build` check | Fine. Pure TS/React/CSS, no new deps. The refactor must keep `tsc` strict-clean. |
| No tests | This *raises the stakes* on the engine extraction — a pure `step()` function is the closest thing to a testable unit we can get, even if only exercised by eye. |
| Static deploy, base `/animath/` | No asset paths involved; CSS/DOM app, no textures. Zero risk. |
| New deps | None needed; `lucide-react` already imported. **Do not add a charting lib** — `readouts.tsx` covers it. |
| Persistence | **Gap.** App uses plain `useState`. New config (goal mix, frozen %, delayed-gratification) are *settings* and should use `usePersistentState` per CLAUDE.md. Ideally migrate the existing knobs too, but at minimum don't add new un-persisted settings. |
| Control primitives | The app currently hand-rolls raw `<input type="range">` with `.as-slider` CSS rather than using `ControlPanel`'s `Slider`/`Pills`/`Checkbox`. New controls *should* prefer the shared primitives (a `Pills` for goal mode, a `Checkbox` for delayed gratification, `Slider` for frozen fraction). I won't demand rewriting the existing bespoke sliders, but **new** controls drifting further into bespoke CSS is debt I'd push back on. |

> [!WARNING]
> **Model-vs-claim mismatch risk.** The moment ascending and descending agents coexist, "the array marches toward sorted order" is false. The EXPLAINER and README must be updated *in the same change* to reframe the app as "what happens when agents want *different* things" — tension, contested equilibria, clustering — not just emergent sorting. Shipping the feature without the doc rewrite would leave the "?" modal lying to the user. This is the kind of inconsistency I most want caught at plan stage.

## 5 · Scope: minimum viable slice vs full vision

The plan bundles five distinct features. That's a lot for one session. I'd sequence it so each slice builds and ships standalone:

**MVP (one session, low risk, high payoff):**
1. Extract `engine.ts` (types + pure `step`), no behavior change — pure refactor, build-green checkpoint.
2. **Frozen cells**: a `frozen` fraction slider (subject/Array panel) + a distinct mark. Trivial, and it's the most *visually* striking Levin competency (the array routes around dead cells).
3. **Clustering / sortedness instrumentation**: grow the Metrics panel with `MiniHisto` (cluster sizes) + `Sparkline` (sortedness over time). This is the "measurable phenomena" ask and reuses existing primitives.

**Phase 2 (the headline ask, medium risk):**
4. **Divergent objectives**: per-agent goal (ascending/descending, or own-position/selfish), a `Pills` goal-mode control, goal-aware marks, and the EXPLAINER/README reframe. This is the conceptually richest piece and deserves its own focused pass *with* the doc rewrite.

**Phase 3 (optional, the "go beyond" invitation):**
5. **Delayed-gratification routing** (the subtlest behavior — accept locally-worse moves to clear blockers). Highest risk of producing a model that doesn't visibly do the thing. Validate it produces an observable effect before committing.
6. **Lab panel**: batch sweeps over seeds/mixes reporting clustering distributions (`lab` archetype). The honest way to claim "chimeric arrays reliably cluster."

> [!CAUTION]
> **Gotcha — delayed gratification is easy to claim and hard to show.** In the paper it's an emergent, measured effect (elements temporarily increasing distance-to-target). If implemented as a hand-tuned "sometimes move wrong," it becomes a gimmick, not a demonstrated competency. Either implement it as a genuine local rule and *measure* the temporary regress (a sparkline that dips before it climbs), or cut it. Don't ship an unobservable feature.

## 6 · Parallel-branch & shared-file safety

Confirmed low risk. AgenticSorting is a self-contained folder. This is an *expansion of an existing app*, so it almost certainly needs **zero** edits to `index.tsx`/`apps.ts` (the route and catalog entry already exist). The only shared-file touch would be appending a line to the CLAUDE.md repo-layout note or README if the app's description materially changes — both append-only, both trivially mergeable. No engine (`src/lib`) or chrome changes are warranted; everything lives under `src/animations/AgenticSorting/` plus read-only reuse of `chrome/readouts.tsx` and (ideally) `components/ControlPanel.tsx`.

> [!NOTE]
> If the divergent-objectives reframe is significant enough to change the gallery blurb (`apps.ts`) or the catalog category (`chrome/catalog.ts`), those are append/edit-in-place on the app's own lines — still conflict-free. Just touch only this app's entries.

## 7 · What I'd add beyond the two axes

The plan invites adjacent ideas. From a steward's lens, the highest-leverage additions are the ones that *reuse existing framework capacity*:

- **A "sortedness / contestedness" time-series** (Sparkline) is the single best addition: it turns the whole app from "watch bars wiggle" into "watch a measured quantity converge or fail to." Cheap, uses an existing primitive, and it's the natural readout for *every* feature here (frozen-cell penalty, divergent-goal contestation, delayed-gratification dip).
- **A reset-to-seed / replayable RNG** (currently `Math.random()` everywhere) would make the Lab and any before/after comparison meaningful. Small but enabling.
- **Don't** add: new icon archetypes, a charting dependency, a global store, or a second route. None are justified.

## Verdict

**Endorse, with one required change and one required guardrail.**

What I endorse:
- The two axes are a strong, framework-aligned expansion of a self-contained app. Conflict risk is near zero.
- The instrumentation ask is a model citizen — it's precisely what `chrome/readouts.tsx` exists for; reuse it rather than hand-rolling.
- Frozen cells + clustering metric are a clean, low-risk MVP with high visual/pedagogical payoff.

What concerns me:
- The plan silently assumes the current single-component structure is a fine base. It isn't, for this scope. **Required change: scope the engine extraction (`engine.ts`, pure `step()`) explicitly as step zero** — it's the documented house pattern and the prerequisite for everything else.
- Divergent objectives **invalidate the app's current convergence narrative**. **Required guardrail: the EXPLAINER.md + README.md reframe ships in the same change as the feature**, or the "?" modal misrepresents the app.
- The bundle is large. Slice it (MVP → divergent objectives + docs → optional delayed-gratification/Lab). Don't try to land all five in one pass.

What I'd change in the plan text:
1. Add an explicit "Step 0: extract simulation engine, build-green, no behavior change."
2. Add "update EXPLAINER/README to reframe from emergent-sorting to competing-objectives" as a *deliverable*, not an afterthought.
3. Note that new controls should use `ControlPanel` primitives and `usePersistentState`, not more bespoke `.as-slider` CSS and plain `useState`.
4. Flag delayed-gratification as the cut-line feature: ship only if it produces a *measurable* observable.

Net: a green-light plan that needs its hidden refactor surfaced and its narrative-consistency made a first-class deliverable.

## Self-reflection

1. **What would you do with another session?** Sketch the actual `engine.ts` type signatures and the `step()` contract so the implementer isn't refactoring blind, and prototype the clustering metric (mean run-length of like-strategy neighbors, normalized) to confirm it's cheap and that `MiniHisto`/`Sparkline` render it well.
2. **What would you change about what you produced?** I reviewed structure and fit but did not read the source paper, so my characterization of "delayed gratification" and "clustering" leans on the plan's summary; a pedagogy/math reviewer should validate the metrics are faithful to the paper.
3. **What were you not asked that you think is important?** Whether the app should keep its current ascending-sort default mode at all, or whether divergent objectives should be a *mode pill* (top-bar modes, like Trinary's Observatory/Lab) versus a per-agent setting. That's an architecture decision the plan leaves implicit; modes would keep the original "emergent sorting" story intact alongside the new one.
4. **What did we both overlook?** The visual legibility problem: new phenomena (goals, frozen state, temporary regress) must be *drawn* distinctly, which is a marks-panel/CSS workstream the plan doesn't budget for. Invisible features are non-features here.
5. **What did you find difficult?** Confirming the "lost intermediate version" claim — I found no such code in the current folder, so I had to reframe the request as net-new rather than a revert, which the plan author may dispute.
6. **What would have made this task easier?** A pointer to the prior implementation (a branch/commit/screenshot) the user remembers, to confirm whether "restore" means anything concrete.
7. **Follow-up value:** LOW — the structural verdict (extract engine, reframe docs, slice scope, reuse readouts) is solid and framework-grounded; follow-up would refine engine signatures and validate metric fidelity, which is polish on a complete conclusion.
