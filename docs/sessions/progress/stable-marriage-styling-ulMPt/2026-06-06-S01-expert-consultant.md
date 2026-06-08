---
kind: three-hats
session: 2026-06-06-S01
date: 2026-06-06
title: Three Hats — Architecture Consultant (Stable Marriage)
branch: claude/stable-marriage-styling-ulMPt
slug: stable-marriage-styling-ulMPt
status: completed
build: unknown
followup: null
pr: null
---

# Three Hats — Architecture Consultant (Stable Marriage)

## Executive summary

Stable Marriage is a competent, working app that does considerably more than its peers (dual *Visualizer* + *Lab* modes, four heatmaps, distribution and stability views). It is also the messiest file in the `animations/` tree from a structural standpoint: a single **1243-line component** that fuses three distinct concerns — (1) the Gale–Shapley state machine, (2) a batch Monte-Carlo experiment runner, and (3) ~700 lines of bespoke presentational components and inline JSX. The Gale–Shapley logic is correct for the common case but the implementation has **two genuine correctness smells** (a variant algorithm masquerading as textbook GS, and a fragile string-key data model) and a handful of resilience gaps (unguarded `NaN` on empty number inputs, a duplicated step function with subtle divergence).

The headline architectural problem is the absence of the codebase's own established seam: sibling apps factor simulation logic into helper modules (`physics.ts`, `presets.ts`, `lib/nbody/`), yet here the algorithm, the headless replica of the algorithm, the stability checker and the statistics reducer all live inline in the React component. Extracting a `galeShapley.ts` would remove the single biggest barrier to both testability and trust. The styling is, by contrast, the *strongest* part of the file — a clean tokenised dark theme that already matches the AppShell better than AgenticSorting does.

> [!NOTE]
> **Framing** The branch is titled "styling," but the highest-value finding for a maintainer is structural, not cosmetic. I rank the items below by engineering impact, then call out where the styling brief and the real risk diverge.

## 1 · Correctness of the Gale–Shapley implementation

### 1.1 This is not classical Gale–Shapley — it is a symmetric mixed-proposer variant

Classical GS has one fixed proposing side. Here *both* sides propose, chosen per-step by a `bias` coin flip (`StableMarriage.tsx:620–624`, mirrored at `:161–166`). Each person carries their own `nextProposal` cursor and can be both a proposer and a receiver. This is a deliberate, interesting model — the README and EXPLAINER both describe it honestly as "mixed-proposer." My concern is purely about the *guarantees* the UI then asserts on top of it.

> [!CAUTION]
> **Gotcha** The Stability tab and EXPLAINER claim the result is always stable ("for a completed run, it finds zero" blocking pairs). That theorem is for *one-sided* GS. A symmetric both-sides-propose process is **not guaranteed** to terminate at a stable matching in the Gale–Shapley sense, and is not guaranteed to be proposer-optimal. In practice the deferred-acceptance dynamic usually lands on a stable matching, but the app is presenting an empirical observation as a theorem. The `verifyStability` counter (`:99–132`) is real and correct, so a non-zero count *can* surface — the danger is the surrounding copy that tells the user it never will.

### 1.2 `verifyStability` is correct but O(n²·log n) and double-counts

The blocking-pair scan (`:99–132`) is logically sound: for every (m,w) not matched to each other, it checks whether both strictly prefer each other via `indexOf` on the preference lists. Two notes:

- **Performance:** the inner `menPrefs[m].indexOf(w)` / `womenPrefs[w].indexOf(m)` are themselves O(n) linear scans, making the whole check O(n³). At `MAX_POPULATION=100` that is 10⁶ outer iterations × up to 100-element scans. It runs once on completion so it is tolerable, but a precomputed rank-lookup matrix (`rank[m][w]`) would make it O(n²) and would also speed up every `indexOf` in the hot stepping path.
- **Semantics:** "blocking pairs" here counts ordered observations, but since the loop visits each (m,w) once it is actually counting unordered pairs once — fine. The unmatched-partner branch treats rank as `+Infinity` (`:117,121`), which is correct.

### 1.3 The string-key data model is the root maintainability/ correctness hazard

Identity is encoded as ``m${id}`` / ``w${id}`` strings, and the numeric id is recovered everywhere by `Number.parseInt(key.substring(1), 10)` (`:110, :195, :220, :653, :764` and more). This pattern appears **at least ten times**. It is brittle:

- The implicit invariant "keys are exactly one prefix char + integer" is never typed or asserted; a refactor to two-digit prefixes or a different separator breaks silently.
- `matches[`m${i}`]?.partner` with a parse is doing the job a tagged union (`{ side: 'm'|'w'; id: number }`) or two separate `Int32Array`s would do far more safely.
- Completion is detected by `Object.keys(currentMatches).length >= n * 2` (`:671`). This is a proxy: it assumes every match writes exactly two keys and never leaves a stale key. It happens to hold because pairing always writes both sides and unmatching `delete`s the displaced partner — but it is an emergent property, not an enforced one, and it is the kind of thing that silently breaks under a future edit.

### 1.4 The algorithm is implemented twice, with divergence

`stepSimulation` (`:593–678`) and `runHeadlessSimulation` (`:134–253`) are the *same* GS loop written twice — once incrementally over React state/refs, once as a tight `while`. This is the single clearest "extract a module" signal in the file. They have already drifted:

```
// stepSimulation termination (line 614)
if (validMen.length === 0 && validWomen.length === 0) { …complete… }
// AND a second, redundant check (line 671)
const isComplete = Object.keys(currentMatches).length >= n * 2;

// runHeadlessSimulation termination (line 156)
if (validMen.length === 0 && validWomen.length === 0) { active = false; break; }
// (no second "all keys present" check)
```

Two copies of a non-trivial algorithm guarantee that any correctness fix (or any change to the proposer model) must be applied in two places and kept consistent by hand. They already encode termination differently. This is the textbook case for a shared `galeShapley.ts` exposing a pure `step(state) => state` plus a `runToCompletion(state)`, consumed by both the interactive loop and the headless sweep.

### 1.5 Minor numerical / input hazards

- **`NaN` population:** the number inputs (`:869, :1097, :1118`) do `Number.parseInt(e.target.value, 10)` and clamp with `Math.max(4, …)`. But `Math.max(4, NaN)` is `NaN`, and an empty field yields `NaN`. `Array(NaN)` throws *RangeError*. Clearing the Population box can crash the app. The `NumberInput` primitive in `ControlPanel.tsx:198` exists precisely to solve this (commit-on-blur, revert on unparseable) and is not used.
- **Tie-handling in `generatePreferences`** (`:69–97`) is fine: scores are continuous floats so exact ties are measure-zero. At consensus = 1 (`corrM = 1`) everyone shares one ranking and the noise term vanishes — intended, and the comparison is strict so it is stable.
- **Self-matching impossible by construction** (men only appear in women's lists and vice-versa), so no guard is needed there — good.

## 2 · State-machine modelling — the core architectural critique

A stepping simulation *is* a state machine. The clean shape is: an immutable `SimState`, a pure `reducer(state, 'step') => state`, and a thin React layer that owns only the timer and the rendering. What we have instead is a state machine smeared across **five `useState` hooks + four shadow `useRef`s**:

```
matches / matchesRef
nextProposalIndices / nextProposalRef
status / statusRef
data / dataRef
```

Each ref exists solely to give the `setInterval` callback a stale-closure-free read of the latest value (`:551–565`), a well-known React workaround. The four mirror-effects are pure boilerplate and a recurring source of "which one is the source of truth?" confusion. Patterns that would dissolve this:

- **`useReducer` over a single `SimState`.** One source of truth; the reducer is pure and trivially unit-testable; the timer dispatches `{type:'step'}`. No mirror refs at all (the dispatch closure is stable, and the reducer reads the latest state internally).
- **A single `stateRef`** if you keep `useState`: one ref, updated in one effect, instead of four.
- **Functional updates** already partly used (`setProposalsMade(prev => prev + 1)`, `:668`) could carry the whole step if state were consolidated.

> [!IMPORTANT]
> **Recommendation** Move the simulation to `galeShapley.ts` exporting pure functions over a plain `SimState`, then drive it from a `useReducer`. This single change collapses the 9-hook tangle to one, deletes the four mirror effects, removes the duplicate algorithm, and makes the whole thing testable without React.

### 2.1 Stale-closure / timer audit

To the team's credit, the timer lifecycle is actually *correct*: the interval effect (`:708–728`) tears down on every `speed`/`status` change and on unmount, and there is a redundant unmount-only cleanup (`:730–736`) as a belt-and-braces guard. No leak. The refs successfully defeat the stale-closure trap. So the machinery *works* — my objection is that it is far more machinery than the problem needs, and the cost is borne by every future reader.

### 2.2 `runToCompletion` calls `stepSimulation` in a loop — but `stepSimulation` is async-via-setState

`runToCompletion` (`:696–706`) calls `stepSimulation()` up to `n*n*5` times synchronously. But `stepSimulation` reads from `matchesRef.current` / `nextProposalRef.current`, which are only updated by effects *after* a render. Within a synchronous `while` loop, no render occurs, so the refs never advance between iterations. It works *only* because `stepSimulation` internally rebuilds from the refs once and then… actually it would read the same stale ref every iteration. The reason it functions is subtle and worth flagging:

> [!CAUTION]
> **Latent bug surface** Each `stepSimulation` call snapshots `matchesRef.current` at `:598`, mutates a local copy, and calls `setMatches(currentMatches)`. The next synchronous iteration re-reads `matchesRef.current` — which has *not* been updated yet (the mirror effect hasn't run). So `runToCompletion` should, in principle, keep re-processing from the same starting state and never converge, or converge only because `setMatches` batching... This deserves a manual test at n=100. If "Finish" produces a complete matching today, it is by a fragile interaction of React batching semantics, not by design. A pure `runToCompletion(state)` in a helper module would be unambiguously correct and would sidestep this entirely.

## 3 · Structural soundness & separation of concerns

| Concern | Where it lives now | Codebase norm |
| --- | --- | --- |
| Preference generation | inline `:69–97` | → `galeShapley.ts` / `presets.ts` |
| Stability check | inline `:99–132` | → helper |
| Headless sim | inline `:134–253` | → helper (shared with step) |
| Interactive step | inline `:593–678` | → helper (shared) |
| Stats reducer | inline `useMemo :738–802` | → helper |
| Presentational components | inline `Card/Button/PersonRow/Heatmap/DistributionChart :255–516` | → `ControlPanel` primitives or sub-files |
| Lab batch runner | inline `:818–857` | → helper |

The component does almost everything. Of the 1243 lines, only roughly the JSX from `:859` onward is genuinely "this app's view." A reasonable target shape:

- `galeShapley.ts` — types (`SimState`, `PreferenceData`), `generatePreferences`, `step`, `runToCompletion`, `verifyStability`, `computeStats`, `runHeadless`. Pure, no React. ~250 lines, fully unit-testable.
- `StableMarriage.tsx` — the React shell: hooks, the reducer/timer, JSX. ~400 lines.
- `Heatmap.tsx` / `DistributionChart.tsx` — the two non-trivial chart components, each self-contained.

The local `Card` and `Button` primitives (`:255–280`) reinvent shared chrome. This is not fatal — they are small — but a maintainer adding a third DOM app now has three different button conventions to reconcile (`sm-button`, AgenticSorting's `as-button`, and the `ControlPanel` primitives). The codebase already paid down exactly this kind of duplication for the particle viewers; the same NIH applies here.

## 4 · Framework / AppShell conformance

Conformance is **partial and consistent with its sibling**. Both StableMarriage and AgenticSorting:

- ✓ call `useAppHeader` and `useAppExplainer` (`:519–520`);
- ✗ do **not** use `` / `` — both render their own in-body control panels instead. So the drawer's Settings and Actions tabs are empty/dimmed for this app, and its ⚙ / ▶ top-bar buttons do nothing useful.

> [!NOTE]
> **Context** This deviation is *not unique to Stable Marriage* — it is the established pattern for the two CSS/DOM apps, which CLAUDE.md explicitly permits ("They still integrate via useAppHeader / useAppExplainer and may use ShellSettings / ShellActions"). So I do not score this as a defect against Stable Marriage specifically. It is, however, a missed opportunity: the app's controls (Population, Consensus, Bias, Speed, the Play/Step/Finish actions) map almost one-to-one onto `Slider`, `NumberInput`, `Checkbox` in Settings and the action buttons in Actions. Migrating would (a) make the chrome behave like every 3D app, (b) get the draggable ActionFloater for free, and (c) delete the bespoke `sm-controls` /`sm-actions` CSS.

Other conformance gaps:

- **No `usePersistentState`.** CLAUDE.md positions this as the standard for settings. Population/consensus/bias/speed are exactly "settings, not transient view state" and are the canonical persistence candidates. AgenticSorting also omits it, so again this is a shared gap, not a regression.
- **In-body `` with a subtitle paragraph** (`:1182–1198`) partially duplicates the AppShell title bar. The comment at `:1183` shows awareness ("The app's name lives in the AppShell bar above"), but the mode toggle living in an app-owned header rather than in Settings/Actions is the kind of thing the shell is meant to host. Trinary handles dual-mode (Observatory / Lab) as tabs — worth aligning with that precedent.

## 5 · Performance & footprint at MAX_POPULATION = 100

- **Per-step re-render cost.** `setMatches(currentMatches)` replaces the whole matches object each step, re-rendering all `2n` `PersonRow`s. `PersonRow` is not `React.memo`'d, and `activeProposal` changes every step, so every row reconciles every tick. At n=100 (200 rows) on a ~20ms interval this is ~10k reconciliations/sec. It is light DOM (a circle + a badge) so it likely holds, but memoising `PersonRow` on its own (id, match identity, isActive/isTarget) would cut all-but-two re-renders per step.
- **`orderedMen`/`orderedWomen` mutate in place.** `:808` and `:815` call `ids.sort(...)` on a freshly built array — safe here because the array is created in the same memo, but `sort` mutating is a trap waiting for the day someone passes in a shared array.
- **`rankStats` recomputes O(n) every render** (`:738–802`) — fine, properly memoised on `[data, matches, n]`.
- **Lab batch runner** (`:828–854`) is the right idea — chunks of 25 cells via `setTimeout(…, 0)` to keep the UI responsive, and `setLabData([...results])` each batch for progressive paint. But at resolution 30 that is 900 cells × an O(n²·loops) headless sim at `labN` up to 100; each `runHeadlessSimulation` allocates fresh preference matrices (n² floats) and runs `n*n*5` max loops. This can be multi-second. There is no cancellation: clicking away mid-run leaves `setTimeout` chains firing `setState` on an unmounted tree (React warns; harmless but sloppy). A cancel flag / `AbortController`-style ref would fix it.
- **Heatmap renders `resolution²` absolutely-positioned divs** (`:400–418`), four heatmaps = up to 3600 DOM nodes. Acceptable, but a `` would be the idiomatic choice for a dense grid and would remove the per-cell hover listeners.
- **Bundle:** ~38KB source, no heavy deps beyond `lucide-react` (shared) — negligible, and it is lazy-loaded per the router. No concern.

## 6 · Verification & contracts

With only `npm run build` as CI, the failure modes that *type-checking will not catch* are exactly the ones this design maximises:

- The string-key parse invariant (§1.3) is invisible to `tsc` — keys are just `string`.
- The two algorithm copies (§1.4) can diverge without any type error.
- The `runToCompletion` ref-timing (§2.2) is a pure runtime behaviour.
- The `NaN`-population crash (§1.5) compiles cleanly.

> [!IMPORTANT]
> **Seam** Every one of these collapses into testability the moment the algorithm is a pure module. `verifyStability(runToCompletion(generatePreferences(...)))` as a property test ("a completed mixed-proposer run on N random instances yields 0 blocking pairs, or surfaces a documented counterexample") would both verify the engine and empirically validate-or-refute the stability claim in §1.1 — turning an asserted theorem into a checked invariant. Today none of this is testable because it is welded to React state.

## 7 · The styling gap (the nominal brief)

Counter to the branch name, the CSS is the **best-engineered part of the app**. `stableMarriage.css` is tokenised (`--sm-*` at `:6–22`), dark-theme-aligned with the AppShell, semantically colour-coded (men/women/matched/ proposer/receiver), and has a genuinely thorough responsive pass at 900px and 600px (`:680–749`) including touch-sized range thumbs. It is more polished than AgenticSorting's CSS.

The "styling gap vs other labs" I can identify is not within this file — it is the *inconsistency* it introduces:

- Three parallel button systems now exist (`sm-button`, `as-button`, `cp-*` primitives). Same for sliders, cards, tabs. The app looks good in isolation but increases the surface a maintainer must hold in their head.
- The colours are hard-coded hex (`#2563eb` at `:111`, `#60a5fa` passed as a prop at `:1018`) rather than referencing any shared AppShell palette token, so a future theme change touches N files.
- Magic numbers leak between TS and CSS: `ROW_HEIGHT = 64` (`:27`) is set inline as a style (`:316`) while the CSS sizes the person circle at 42px — two sources of layout truth.

If the session's deliverable is "styling," the defensible scope is: *(a)* retire the local `Button`/`Card` in favour of shared chrome where it exists, and *(b)* reference shared palette tokens instead of literal hexes. I would resist a pure repaint that leaves the structural debt untouched — it would make the file longer-lived without making it more maintainable.

## 8 · Documentation

EXPLAINER.md is excellent — concise, mathematically honest about deferred acceptance and proposer-optimality, and it correctly names the knobs. README.md is short but accurate. The *only* documentation concern is the overstated stability theorem (§1.1): the EXPLAINER imports the one-sided GS guarantee onto a two-sided model. One sentence ("with mixed proposers this is an empirical observation, not the 1962 theorem") would make it watertight.

## Verdict

**Concerns — would-change (prioritised).** The app works and looks good, but it carries real structural debt that the codebase's own conventions are designed to prevent. Ranked by impact:

1. HIGH **Extract `galeShapley.ts`** (pure types + `generatePreferences` / `step` / `runToCompletion` / `verifyStability` / `computeStats` / `runHeadless`). Eliminates the duplicate algorithm (§1.4), makes everything testable (§6), and is the prerequisite for the rest. Matches the `physics.ts`/`lib/nbody` norm.
2. HIGH **Verify / fix `runToCompletion`'s ref-timing** (§2.2). Either it is silently broken at scale or it works by fragile batching; the pure-module rewrite resolves it definitively.
3. MEDIUM **Replace the 9-hook tangle with `useReducer`** over a single `SimState` (§2); drop the four mirror refs/effects.
4. MEDIUM **Harden inputs**: route Population/Resolution through the existing `NumberInput` primitive to kill the `NaN`→`Array(NaN)` crash (§1.5); add a cancel flag to the Lab runner (§5).
5. MEDIUM **Correct the stability claim** in EXPLAINER/Stability tab (§1.1) — present mixed-proposer stability as empirical.
6. LOW **Retire the string-key model** in favour of a tagged id or twin arrays (§1.3); precompute a rank matrix to drop `verifyStability`/step from O(n³) (§1.2).
7. LOW **Styling consolidation**: prefer shared chrome over local `Button`/`Card`; tokenise hexes; de-duplicate `ROW_HEIGHT` (§7). The CSS itself is already strong.
8. LOW (optional) **AppShell migration**: move controls into `ShellSettings`/`ShellActions` and add `usePersistentState` — explicitly permitted-but-not-required for DOM apps; would unify chrome with the 3D apps (§4).

Net: I would **not** ship a styling-only PR here. The cheapest high-value move is the helper extraction, which unlocks testing and de-risks every subsequent edit; styling cleanup should ride on top of it, not stand alone.

## Self-reflection

1. **What would you do with another session?** Actually run `npm run build` and, more importantly, manually exercise "Finish" at n=100 to confirm or refute the `runToCompletion` ref-timing hypothesis (§2.2) — that is my least-certain finding and I flagged it as a hypothesis rather than a fact.
2. **What would you change about what you produced?** I'd prototype the `galeShapley.ts` extraction and a property test to empirically settle the §1.1 stability question, rather than reasoning about it abstractly. The review asserts the symmetric model may be unstable but does not prove it produces blocking pairs in practice.
3. **What were you not asked that you think is important?** Accessibility: the heatmap and distribution charts are mouse/hover-only with no keyboard or screen-reader path, and the custom buttons lack `aria-pressed` for the toggle states. Not in the brief, but it is a real quality gap.
4. **What did we both overlook?** Whether the "mixed-proposer" model is mathematically novel/intended or an accidental drift from one-sided GS. The pedagogy hat (sibling review) is better placed to judge, but it materially affects whether §1.1 is a doc fix or an algorithm fix.
5. **What did you find difficult?** Judging the `runToCompletion` + React-batching interaction by reading alone — synchronous-loop-over-setState semantics are genuinely ambiguous without running it.
6. **What would have made this task easier?** An existing test harness, or a running dev server to poke at n=100 and an empty Population field directly.
7. **Follow-up value:** MEDIUM — Findings are sound and actionable, but §2.2 (run-to-completion timing) and §1.1 (stability of the variant) are hypotheses that a 30-minute runtime check would convert to facts and could reprioritise the verdict.
