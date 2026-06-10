---
kind: progress
session: 2026-06-06-S01
date: 2026-06-06
title: Stable Marriage — Status & Roadmap
branch: claude/stable-marriage-styling-ulMPt
slug: stable-marriage-styling-ulMPt
status: in-progress
build: unknown
followup: Implementation not yet started — planning/roadmap only.
pr: null
---

# Stable Marriage — Status & Roadmap

## Executive summary

The session opened as a *styling* task. A three-lens code review and a follow-up design discussion converged on a different headline: **the CSS is already the strongest part of the app; the real work is correctness, the metric, and the structure that would make the code reusable.** The app teaches a theorem (one-sided Gale–Shapley proposer-optimality) that its default model — a randomized two-sided market — does not actually demonstrate, reports a metric that can't measure the thing it names, and hides the very concept (a shared "common preference") that the whole simulation is built on.

> [!IMPORTANT]
> **Decision taken this session** The engine will support **both** models *as an explicit mode*: **one-sided Gale–Shapley as the default** (the theorem holds exactly), with the existing **two-sided market** kept as an honestly-labeled advanced variant. This single decision settles what the "right metric" must measure (see §4).

> [!NOTE]
> **Status** No source code has been changed. This report is the plan of record: current state, a prioritized roadmap, forward proposals, and the open decisions still needed.

## 1 · What the app is

Two views of the stable-matching problem, sharing one engine:

- **Visualizer** — step/play through proposals between two groups of *n* people; watch matches form; inspect summary stats, a rank distribution, and a stability check.
- **Lab** — a Monte-Carlo sweep that heat-maps average outcomes across a 2-D grid of consensus levels for the two sides.

The hidden engine of the whole thing is a **latent "common preference."** `generatePreferences` (`StableMarriage.tsx:69–97`) gives every person a shared desirability score `quality∈[0,1]`, then builds each individual's ranked list as a blend:

score(i → j) = consensus · quality[j] + (1 − consensus) · privateNoise So **"Consensus" is literally the weight on the common preference.** At 100% everyone ranks the other group identically (pure common preference); at 0% every list is private noise. *How much a population shares one common ranking, and how that shapes who has power in matching* — that is the real subject of the app.

## 2 · Current status — what works, what doesn't

| Area | State | Notes |
| --- | --- | --- |
| Stability machinery | Correct | `verifyStability` (`:99–132`) is sound; the two-sided process genuinely still lands on a stable matching. The reassuring result. |
| CSS / visual design | Strong | Tokenised, responsive (900/600px), theme-aligned — more polished than the peer AgenticSorting. The "styling gap" is shallow (no glass/`backdrop-filter` floater, hard-coded hexes, CVD-hostile heatmap ramps). |
| Model vs. claim | Broken | EXPLAINER teaches one-sided proposer-optimality; engine runs a `bias`-weighted two-sided market, default `bias=50` — the theorem does not hold at the default (§4). |
| The metric | Wrong question | "Asker/Asked avg rank" labels a per-event role, has no baseline, and only means what the text says at `bias=100/0`. It cannot measure "advantage" (§4). |
| Common preference | Invisible | `quality` drives everything but surfaces only via the "Sort by popularity" toggle. The concept the app is about is never drawn or explained (§4). |
| Lab statistics | Dishonest | Each heatmap cell is a **single** simulation run (`:828–844`); the surface is single-draw noise sold as a measurement. |
| Algorithm structure | Duplicated | GS implemented twice (`stepSimulation :593` & `runHeadlessSimulation :134`) with already-divergent termination logic. |
| State management | Tangled | 5 `useState` + 4 shadow `useRef` mirrors; a state machine smeared across 9 hooks. Timer lifecycle itself is leak-free. |
| Input robustness | Fragile | Clearing the Population field → `NaN` → `Array(NaN)` *RangeError*. The `NumberInput` primitive that fixes this is unused. |
| AppShell conformance | Partial (permitted) | Header/explainer hooks ✓; no `ShellSettings/Actions`, `ControlPanel`, or `usePersistentState`. Matches the DOM-app precedent set by AgenticSorting — a choice, not a regression. |
| Pedagogical legibility | Thin | Preference lists hidden; rejections invisible (the "why stability holds" moment never shown); rank badges vanish for *n > 30*. |

## 3 · The salient components (for manageability & reuse)

The 1243-line file fuses five concerns. The reusable decomposition — and the answer to "what makes this manageable and reusable for other apps":

| Component | What it is | Reuse potential |
| --- | --- | --- |
| **Preference model** | Common-preference generator (`quality` + consensus + noise → ranked lists) | A general *correlated-preference generator* — matching, voting, ranking demos all want it |
| **Matching engine** | Deferred acceptance as a pure `(state, action) → state` stepper + analysis (stability, extremal matchings) | The keystone; one engine, no duplication, fully testable |
| **Playback controller** | play / pause / step / finish / speed + the loop (`:680–728`) | Generic `useStepPlayback(stepFn)` — **AgenticSorting is the same shape** |
| **Viz primitives** | `Heatmap` (`:342`), `DistributionChart` (`:454`), `PersonRow` | Parameter-sweep heatmap & stacked histogram are reusable across labs |
| **Parameter schema** | The "multi-leveled" params: instance (population) · per-side (men/women consensus) · process (bias, variant) · playback (speed) | Declared params → the Lab can sweep *any* pair, not just consensus² (`:834–835` is hard-coded today) |

> [!IMPORTANT]
> **First move** Extract the **pure engine** — `model.ts` (the common-preference generator) + `galeShapley.ts` (one deferred-acceptance stepper used by both the animated visualizer and the headless Lab). This is the keystone: it kills the divergence hazard, makes the algorithm testable, *and* is the prerequisite for both the right metric and for surfacing the common preference. Build it **app-local first**; promote to `lib/` only once a second app (AgenticSorting) actually wants it — the way `lib/particles` was earned, not designed up front.

## 4 · The two deep findings from discussion

### 4.1 Why we don't have the right metric

The UI reports four averages (Men / Women / Asker / Asked avg rank, `:994–1011`) and the EXPLAINER sells proposer-optimality. Three compounding problems:

1. **The theorem is one-sided; the engine proposes from both sides.** Each step flips a `bias`-weighted coin for who proposes (`:624`). At the default `bias=50` there is no proposing side, so "the proposer-optimal stable matching" isn't what's computed.
2. **"Asker/Asked" labels the wrong quantity** — a person's role in their *final accepted* match (`:224–243`), an emergent per-pair artifact, not the structural proposing side. It only coincides with the theorem at `bias=100/0`.
3. **Average rank has no baseline, so it can't measure "advantage."** Advantage means *relative to the other stable matchings you could have landed in.* A man with avg rank 2.0 might be at his best-possible stable partner (huge advantage) or get the same partner in *every* stable matching (zero advantage) — the number can't tell them apart.

> [!IMPORTANT]
> **The right metric** The **gap between the two extremal stable matchings** (man-optimal vs woman-optimal). It *is* "how much proposing matters"; it's a deterministic property of the instance (independent of the random proposal order); and — the payoff — it is driven by consensus: under full common preference there is a *unique* stable matching (assortative, best-with-best), so the gap collapses to zero and proposer advantage *vanishes*. As preferences decorrelate, the lattice of stable matchings grows and the gap widens. One metric ties the common preference, the consensus knob, and the proposer-advantage theorem into a single story. Computing it just needs the pure engine to run one-sided GS from each side — which the engine will do natively (§3).

### 4.2 Why "common preference" isn't infused

The thing the whole model is built on — `quality` — is almost invisible. It reaches the user only through the "Sort by popularity" toggle (`:808, :815`); it is never drawn, labeled, or explained. So "Consensus = 80%" is a mystery slider: consensus *toward what?* There's a shared desirability ranking sitting right there and the app hides it. **Infusing it** means making the common preference a first-class, visible object (e.g. a desirability spine each person sits on), so the learner can watch consensus interpolate from "everyone chasing the same few stars" toward "idiosyncratic taste."

### 4.3 What "Both, as a mode" pins down

The engine gains one parameter — *who proposes* — with three settings:

- **One-sided (default):** a side toggle, Men propose / Women propose. Pure deferred acceptance; theorem holds exactly; men-propose *is* the man-optimal matching by construction. The `bias` coin flip is gone from this mode.
- **Market (advanced):** the existing `bias`-weighted coin flip, relabeled away from "proposer-optimality" — framed as an idealized two-sided market with the asker/asked split presented as an *emergent* observation.

Consequence: the honest metric (§4.1) is **mode-independent**. In one-sided mode you can show "this run landed exactly on the man-optimal extreme; here's the woman-optimal extreme for contrast." In market mode the same gap is the bound the emergent outcome floats inside. Only the framing differs.

## 5 · Roadmap — prioritized

A correctness-first sequence. Styling is not dropped — it is sequenced *after* the foundation so polish lands on honest, deduplicated code. Effort: S/M/L.

### P0 — Foundation & correctness

1. HIGH **Extract the pure engine** (`model.ts` + `galeShapley.ts`) with the contract `galeShapley(prefs, {proposingSide:'men'|'women'|'market', bias?}) → {matching, log}` and `extremalMatchings(prefs) → {menOptimal, womenOptimal, gap}`. One engine, consumed by both views. M
2. HIGH **Reconcile model vs claim ("Both, as a mode").** Default to one-sided GS; keep market as an explicit advanced variant; rewrite the EXPLAINER so the ? popup matches what's on screen. M
3. HIGH **Add the right metric** — the extremal-matching gap / core size — and demote the murky Asker-vs-Asked to the market mode (clearly framed as emergent). M

### P1 — Honesty & pedagogy

1. HIGH **Replicate Lab cells** over *T* trials (expose *T*; even 10–20 helps); soften README's "quantify." Kills single-draw noise. S–M
2. MED **Show *why* stability holds** — render rejections (red flash + "already prefers current partner") and a live "no rejected pair can block" invariant. The missing "aha." M
3. MED **Surface the preference list** of at least the active proposer (hover for everyone). The defining input shouldn't be hidden. S–M
4. MED **Infuse the common preference** — draw the desirability spine so "Consensus" is legible (§4.2). M
5. MED **Disclose incomplete matchings** — report unmatched count; don't let "Stable ✓" imply "everyone paired." S

### P2 — Robustness

1. MED **`useReducer` over one `SimState`**; drop the four mirror refs; verify/fix the `runToCompletion` ref-timing (`:696–706`). M
2. MED **Harden inputs** — `NumberInput` for Population (NaN crash); Lab cancel flag; precompute a rank matrix to drop stability/step from O(n³)→O(n²). S–M
3. LOW **Persist settings** (`usePersistentState`); render the shipped-but-unused `README.md`. S

### P3 — Styling parity (the original brief)

1. LOW–MED **Decide ShellActions adoption vs DOM autonomy** (open decision below); consolidate the three button systems; tokenise hard-coded hexes; CVD-safe heatmap ramps; optional glass/`backdrop-filter` floater chrome. M

### P4 — Verify

1. LOW **`npm run build`** (the only CI gate) + runtime sanity checks (Finish at n=100; empty-Population field; variant stability across seeds). S

## 6 · Proposals — what else this structure could explore

Once the engine + param-schema + sweep-Lab skeleton exists, it becomes a platform. Each proposal notes what it *reuses* vs. *adds*.

### 6.1 Other matching markets on the same engine

- **Hospitals / Residents (many-to-one).** Each receiver has a quota > 1. *Reuses* deferred acceptance; *adds* capacities + preference-over-sets. The real-world algorithm (the NRMP match) — high motivation.
- **School choice with priorities.** Same many-to-one engine, but receivers have coarse priority *classes* with tie-breaking — a natural bridge to the ties/indifference proposal below.
- **Stable Roommates (non-bipartite).** One pool, everyone ranks everyone. *The killer teaching contrast:* a stable matching can *fail to exist.* *Reuses* the preference model + stability checker; *adds* Irving's algorithm and a "no stable matching" outcome the bipartite case never shows.

### 6.2 Richer preference structure

- **Ties / indifference.** Weak vs strong stability; the problem gets genuinely harder. *Reuses* the generator (just relax strict sorting); *adds* a stability-notion toggle.
- **Incomplete / truncated lists.** People would rather stay single than match below a cutoff — makes "unmatched survivors" (already latent, §1g of the pedagogy report) a first-class, intended phenomenon.

### 6.3 Strategy & mechanism design

- **Manipulability demo.** Let one agent misreport preferences and watch the outcome. The deep result: the proposing side is truthful as a dominant strategy; receivers can sometimes game it. Directly dramatizes the proposer/receiver asymmetry the app is about. *Reuses* the engine; *adds* a "report vs. true" preference editor.

### 6.4 The lattice of stable matchings

- **"Watch the core collapse."** Visualize the full lattice of stable matchings (via rotations) and slide consensus 0→100% to watch it shrink to a single point. This *is* the right metric (§4.1) made spatial and is the most beautiful payoff available. *Reuses* `extremalMatchings`; *adds* rotation enumeration + a small lattice viz.
- **Side-by-side comparison mode.** Run man-optimal and woman-optimal in two panes simultaneously — the asymmetry becomes visceral. Cheap once the engine exists.

### 6.5 A declarative Lab that sweeps anything

- With the parameter schema (§3), the Lab stops being hard-wired to consensus². It could sweep *any* param pair and plot the **core-size / extremal-gap surface** or a **phase diagram of proposer advantage**. *Reuses* the Heatmap; *adds* axis-selection. This machinery would then drop into other apps unchanged.

### 6.6 Framework-level reuse (beyond Stable Marriage)

- The **step-log + playback + state-machine** pattern (§3) generalizes to any algorithm visualization. AgenticSorting is the same shape today. A shared `useStepPlayback` / lightweight `lib/algoviz` could eventually host both — but only after this app proves the pattern locally.

## 7 · Open decisions (need your call before implementation)

| # | Decision | Status |
| --- | --- | --- |
| D1 | App identity: one-sided vs market vs both | RESOLVED — **both, as a mode** (one-sided default) |
| D2 | Control surface: adopt `ShellActions`+`ControlPanel` (lights the ▶ button, inherits glass chrome) vs keep autonomous DOM panel (AgenticSorting precedent) | OPEN |
| D3 | Scope of *this* next work-block: full P0–P1 correctness pass, or a thinner slice (e.g. P0 engine + metric only) | OPEN |
| D4 | How far to chase the forward proposals (§6) now vs. log as future ideas | OPEN |

## 8 · Recommended next step

Begin at **P0.1 — extract the pure engine**. It is unanimously the highest- leverage move: it kills the duplicated algorithm, makes the math testable under the only CI gate we have (`npm run build`), and is the prerequisite for both the right metric (P0.3) and the common-preference visualization (P1.7). With D1 resolved, the engine's contract is already specified (§4.3) — so this can start the moment D3 (scope) is set.

> [!NOTE]
> **Caveat** All review findings are static analysis — no build was run and the app wasn't exercised at runtime. Two items (the `runToCompletion` ref-timing and the variant's empirical stability) are *hypotheses* a 30-minute runtime check would convert to facts. The pure-engine extraction resolves the first definitively and makes the second a one-line property test.

## Self-reflection

1. **Confidence.** High on the convergent findings — three independent lenses plus the source read all agree on engine duplication, model-vs-claim, and CSS quality. The metric argument (§4.1) and the "right metric = extremal gap" claim are mathematically standard and I'm confident in them.
2. **What could be wrong.** Line numbers are from a single source read and a couple are approximate in the upstream reports; the variant-stability and run-to-completion items remain unverified at runtime. If the `bias` semantics were collectively misread, the synthesis and this report would share that error.
3. **Bias I'm flagging.** This report reframes the user's stated goal (styling) toward correctness. That's the honest reading of the evidence — but styling is preserved as P3, not discarded, and the user explicitly clarified the "styling" they meant was the parameter structure, which §3 addresses directly.
4. **Not done.** No code written, no build run, no runtime observation. This is a plan, not an implementation.
5. **Follow-up value:** MEDIUM — a triage/roadmap, not an implementation; the convergent findings are solid but unbuilt, so follow-up turns them into code.

