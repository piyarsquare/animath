---
kind: three-hats
session: 2026-06-06-S01
date: 2026-06-06
title: Three Hats — Math-Viz & Pedagogy (Stable Marriage)
branch: claude/stable-marriage-styling-ulMPt
slug: stable-marriage-styling-ulMPt
status: completed
build: unknown
followup: null
pr: null
---

# Three Hats — Math-Viz & Pedagogy (Stable Marriage)

## Summary & stance

I reviewed the Stable Marriage app as the person who would actually use it to teach Gale–Shapley and stable matching. The app is visually polished and the stability check is honest and correct. But the **central pedagogical claim is broken by the model the code actually runs**: the simulation is a *mixed-proposer, two-sided* process, while the EXPLAINER teaches the *classic one-sided* Gale–Shapley theorem (proposer-optimality / receiver-pessimality). Those two things are not the same algorithm, and at the default settings the app does *not* demonstrate the theorem it claims to demonstrate.

> [!WARNING]
> **Headline** The text promises proposer-optimal Gale–Shapley. The engine runs a randomized two-sided matching market with a "bias" knob. The stability guarantee survives the substitution; the optimality guarantee **does not**. This is the one thing a careful learner will get wrong because of the app.

## 1. Mathematical fidelity

### 1a. The engine is not classic Gale–Shapley

Classic Gale–Shapley is *one-sided*: a fixed set (say men) proposes; the other set (women) only ever receives, accepts/defers, and rejects. Women never propose. This asymmetry is the entire source of the proposer-optimal / receiver-pessimal result.

The code instead picks, *each step*, which side proposes, by a coin flip weighted by `bias` (`StableMarriage.tsx:620–624`):

let proposerType: 'man' | 'woman' = 'man'; const biasProb = bias / 100; if (validMen.length > 0 && validWomen.length === 0) proposerType = 'man'; else if (validWomen.length > 0 && validMen.length === 0) proposerType = 'woman'; else proposerType = Math.random() < biasProb ? 'man' : 'woman'; So a "woman" can *propose* down *her own* preference list (`:639` reads `womenPrefs[proposerId][...]` and advances `womenNextProposal`), and a "man" can be a *receiver* who defers (`:651–663`). Both sides hold a `nextProposal` pointer. This is a **two-sided proposal market**, not Gale–Shapley.

> [!NOTE]
> **Note** The default is `bias = 50` (`:533`) — i.e. a *symmetric* coin flip. At the default the app shows neither men-proposing nor women-proposing GS; it shows a 50/50 mixed process. That is the worst possible default for teaching the asymmetry the EXPLAINER spends a whole section on.

### 1b. Does the two-sided process even produce a stable matching?

Interestingly, **yes** — and the app's own stability checker confirms it empirically. A deferred-acceptance process where each agent proposes down its own list in order, and each recipient keeps only its most-preferred suitor seen so far, still terminates at a matching with no blocking pair: once *x* proposes to *y* and is rejected (or later bumped), *y* permanently holds someone *y* prefers to *x*, so *(x,y)* can never block. The mixed-proposer schedule only changes *which* stable matching you land on, not stability itself. So the stability story is sound. The *optimality* story is the casualty.

### 1c. The stability verifier is correct

`verifyStability` (`:99–132`) does exactly the right thing: for every unmatched man/woman pair it checks whether *both* strictly prefer each other to their current partners, treating an unmatched person as having a partner at rank +∞ (`:117`, `:121`). Using `indexOf` on the preference list to get a rank, and "lower index = more preferred," is consistent throughout. I could not construct a blocking pair it would miss. The "Stable: No blocking pairs detected" banner (`:1028–1031`) is a truthful claim. Good — this is the mathematically load-bearing part and it is right.

### 1d. Proposer-optimality / receiver-pessimality: claimed but not delivered

EXPLAINER (`EXPLAINER.md:28–32`) states, unconditionally:

The side that *proposes* does systematically better. Gale–Shapley produces the **proposer-optimal** stable matching: every proposer gets the best partner they could have in *any* stable matching, and every receiver gets their worst. The **Asker vs Asked** averages make this visible. This is true for *classic* GS. It is **not** true of what the app computes, for several compounding reasons:

- **Roles are not fixed.** "Asker" / "Asked" in this code is assigned *per match event* (`role: 'asker'` vs `'asked'` at `:649–650`), and a single person flips role over the run as they get bumped and re-propose. So "Asker average" is not "the proposing side's average"; it is "the average rank, over all individuals, of the partner they were holding *in the role they happened to end in*." That is a quantity with no clean theorem attached.
- **Proposer-optimality is a statement about a specific matching** (the men-optimal stable matching), reached by men-only proposing. The mixed schedule reaches *some* stable matching, generally neither the man-optimal nor the woman-optimal one. So "every proposer gets the best partner in any stable matching" is simply false for the run on screen.
- **"Asker avg rank: …" is shown even at `bias = 50`** (`:1005–1006`, `:986`), inviting the learner to read a proposer advantage off a symmetric process. They'll see a difference (askers do tend to do better *locally*, because proposing means moving down your *own* list while receiving means accepting whoever shows up), and they'll mis-attribute it to the GS theorem.

> [!CAUTION]
> **Gotcha** To actually *demonstrate* the theorem, a learner must set `bias = 100` (or `0`), at which point the process collapses to one-sided GS and "Asker = the proposing side." Nothing in the UI or text tells them this. The default (50) actively hides the phenomenon the app exists to teach.

### 1e. The Lab is statistically dishonest as labelled

Each heatmap cell is the result of **exactly one** simulation run. In `runLabSimulation` (`:828–844`) each (corrM, corrW) cell calls `runHeadlessSimulation(labN, labBias, corrM, corrW)` a single time and stores `menAvg`, `womenAvg`, etc.

const metrics = runHeadlessSimulation(labN, labBias, corrM, corrW); results.push({ x: corrM*100, y: corrW*100, diff: metrics.menAvg - metrics.womenAvg, askerDiff: metrics.askerAvg - metrics.askedAvg, ...metrics }); The "average" in "Men Avg Rank" is therefore an average *over the n individuals in one random instance* — not an average over many trials. With `n = 50` default (`:544`) and a fresh random preference draw per cell, cell-to-cell variation is dominated by sampling noise, not by the consensus parameters the axes claim to isolate. A 20×20 heatmap is 400 independent single-shot experiments; adjacent cells will differ by chance as much as by signal. There is **no trial-count control, no repetition, no error bar, no smoothing.** The README (`README.md:5`) even calls it "repeated headless simulations to quantify how consensus and bias shape outcomes" — but the repetition is across *grid cells*, not across trials per cell, so each data point is a sample of size one.

> [!WARNING]
> **Honesty gap** A heatmap with no replication presents single-draw noise as if it were a measured surface. For a "Lab," this is the most serious math-honesty issue after the optimality mislabel. Minimum fix: average each cell over *T* trials (expose *T* as a control) and ideally show the spread. Even *T* = 10–20 would turn the heatmaps from impressionistic to honest.

### 1f. The "Consensus" generative model — reasonable, slightly mislabelled

`generatePreferences` (`:69–97`) gives each candidate a hidden `quality ∈ [0,1)` and scores them as `corr · quality + (1 − corr) · noise`, then sorts. At `corr = 0` preferences are i.i.d. uniform-random; at `corr = 1` everyone shares the same ranking (the quality order). This is a clean, standard "common-value vs private-value" interpolation and I endorse it. Two caveats:

- The UI labels the knob **"Consensus"** in the visualizer (`:873`, `:884`) but `corrM`/`corrW` in code and **"Men Consensus (0% → 100%)"** on the heatmap axis (`:436`). The EXPLAINER calls it "Consensus … how much everyone agrees on who is desirable" (`EXPLAINER.md:36–38`). These are consistent, which is good — but "Consensus" conflates two distinct things in the literature: *correlation of preferences* and *agreement on a common ranking*. They coincide here only because the model is built that way. Fine for an intro tool; worth a one-line disclosure.
- `menQuality` drives *women's* ranking of men and vice-versa (`:87–89`), which is correct (your desirability is judged by the other side). The "Sort by popularity" toggle (`:808`, `:815`) orders the display by a person's *own-side* quality used as the other side's signal — semantically this is "sort by how desirable you are to the opposite group," which is the right notion of popularity. Good, though the label could say so.

### 1g. Subtle correctness footguns (not bugs today, but fragile)

- **Unmatched survivors are possible and silently averaged out.** The mixed process can exhaust a person's list (the `validMen`/`validWomen` filters at `:611–612` drop anyone with `next ≥ n`), and completion fires when no valid proposer remains (`:614–618`), *not* when everyone is matched. In a balanced market classic GS always produces a perfect matching, but this two-sided variant has no such guarantee in general. The rank averages (`:761–792`) only sum over *matched* people (`if (manMatch)`), so an instance with leftover singles reports averages over a biased subsample without ever surfacing that someone went unmatched. The "complete" banner and stability check would still say "stable" (an incomplete matching can be stable), which is technically true but pedagogically misleading — the learner sees green and assumes everyone paired up.
- `verifyStability` uses `menPrefs[m].indexOf(...)` inside an O(n²) loop with an inner `indexOf` = O(n³) overall (`:117–122`). Fine at n ≤ 100, but it means stability is only checked at the end, never illustrated *during* the run. See §2.

## 2. Conceptual clarity — does the interaction *teach* the idea?

### 2a. The stepping shows proposals, but not *why* stability holds

The "aha" of Gale–Shapley is the **invariant**: once a receiver rejects/bumps a suitor, they only ever trade *up*, so no rejected pair can later become a blocking pair. The animation shows the *events* (active proposer glows amber, target glows purple, `:287–297`) but never visualizes the *reason*. A rejection is rendered as "nothing visibly happens" — when `rankNew < rankCurrent` is false (`:659`) the step simply advances a pointer with no on-screen consequence. The learner sees musical chairs, not a monotone improvement argument.

> [!NOTE]
> **Pedagogy** The single highest-value teaching addition would be to *show the rejection* (flash the rejected edge red, show "she already prefers her current partner") and to surface a running "no pair has ever both-preferred-and-been-rejected" invariant. That converts the app from "watch pairs form" to "see why no blocking pair can survive."

### 2b. Preferences are largely invisible

The whole problem is *defined* by preference lists, yet the visualizer never shows a person's ranked list. The only preference information surfaced is a single `Rank: #k` badge on each matched person, and only for `n ≤ 30` (`:318`, `:335`). A learner cannot answer "why did *he* propose to *her* first?" because his list is hidden. Without seeing at least the active proposer's top-of-list, the deferred-acceptance logic is opaque — proposals look arbitrary. AgenticSorting and Correspondence both make their core object (the array; the c-value) directly visible and manipulable; here the core object (the preference matrix) is hidden.

### 2c. The default view is the Visualizer, but its most teachable parameter is mis-set

As noted in §1d, `bias = 50` is the default. The most illuminating *first* experience would be one-sided GS (bias 100) so that "Asker" cleanly equals "the men," the proposer-optimal result is real, and the Asker-vs-Asked gap means what the EXPLAINER says it means. The randomized default is the more "interesting research toy" but the less "teaches the named theorem" default.

### 2d. Lab labels invite a causal misread

The four heatmaps (`:1135–1178`) are titled "Men Avg Rank," "Women Avg Rank," "Men Avg − Women Avg," "Asker Avg − Asked Avg." With a fixed `labBias` default of **100** (`:545`) the Lab *does* run one-sided GS (good, and inconsistent with the visualizer default of 50 — they should agree on what story they tell). But because each cell is one trial (§1e), a learner sweeping consensus will see a noisy field and may "discover" structure that is sampling artifact. The diverging blue↔pink scale (`:374–384`) is a genuinely nice idea for showing which side wins, but it amplifies noise near zero into visible colour.

## 3. Honest framing of EXPLAINER / README

| Claim | Where | Verdict |
| --- | --- | --- |
| "this always terminates, and the result is always stable" | EXPLAINER.md:23–25 | True for the engine; verifier confirms it. |
| "Gale–Shapley produces the proposer-optimal stable matching … every proposer gets the best partner … every receiver gets their worst" | EXPLAINER.md:28–32 | Misleading — true of classic one-sided GS, but the app's *default* mixed-proposer model does not realize it. Stated as if the app demonstrates it unconditionally. |
| "Proposer bias — the share of proposals coming from the men's side. Slide it to watch the proposer advantage shift." | EXPLAINER.md:39–40 | Half-true — never says that the theorem only holds at the extremes (0/100), nor that 50 means "neither side is the proposer." This is the single sentence that could rescue or doom the framing. |
| "mixed-proposer model" (only the README admits this) | README.md:3 | Buried — the honest description of the model is in the README (which most users won't open), while the EXPLAINER (the ? popup, the thing they read) describes textbook GS. |
| "repeated headless simulations to quantify how consensus and bias shape outcomes" | README.md:5 | Overclaim — one trial per cell; no replication (§1e). "Quantify" implies a measured estimate; it's a single draw. |
| EXPLAINER never discloses: leftover singles possible, averages over matched only | — | Omission — see §1g. |

Against the house standard, the EXPLAINER's *prose* is good — it's the right length, has the theorem and citation (Gale & Shapley 1962), and matches the tone of AgenticSorting and Correspondence. The Correspondence explainer is a model of honest hedging ("a theorem of Tan Lei, at so-called Misiurewicz points"); the Stable Marriage explainer is *less* hedged than its own implementation warrants. The fix is mostly textual, not structural.

## 4. Semantic hygiene / naming

- **"men" / "women"** — standard field terminology (the problem is literally called the Stable *Marriage* problem), fine to keep, though the framework's other apps are neutral. Not a correctness issue.
- **"Asker" / "Asked"** vs **"proposer" / "receiver"** — the EXPLAINER uses "proposer/receiver"; the UI uses "Asker/Asked" (`:986–990`, badges "A"/"R" at `:330–332`). Two vocabularies for the same role is a minor friction. Worse, as noted, "Asker" is a per-event role here, not "the proposing side," so the word carries the wrong implication.
- **"Rank"** is used consistently as 1-based preference position (`rank + 1` at `:307`, `:765`) — good and conventional.
- **"Consensus"** — see §1f; defensible but conflates two technical notions.
- **"quality"** / "popularity" — reasonable lay terms for a latent desirability score; the EXPLAINER doesn't use "quality" so there's no clash.

## 5. Accessibility of the idea & visual legibility

- **Colour-vision deficiency.** The semantic palette is blue (men) / pink (women) / green (matched) / amber (active) / purple (target) (`stableMarriage.css:14–20`). Blue vs pink is fine for most CVD types; **green-vs-amber** (matched vs active) is risky for deuteranopia/protanopia, and the rank badges lean on green/blue/amber (`:331–347`) carrying ordinal meaning by hue alone. The "Rank: #k" text label mitigates this (redundant encoding) — good. But the heatmap legend `hsl(120 → 0)` green-to-red (`:673`) is the classic CVD-hostile ramp; and the diverging blue↔pink with a near-white centre (`:677`) makes "no difference" hard to distinguish from light cells. Consider a perceptually-uniform / CVD-safe ramp (viridis-like for sequential; blue–white–orange for diverging).
- **Motion.** The scale/glow transitions (`:271`, `:289–296`) are tasteful and aid attention (they mark *which* pair is acting). No `prefers-reduced-motion` handling, but the motion is functional, not decorative, so this is low priority.
- **Rank badge hidden for n > 30** (`:318`, `:335`) — a reasonable density decision, but it means at the default-ish larger populations the only per-person quantitative feedback vanishes, leaving just colour. Combined with §2b (no visible preference lists), large-n runs are essentially "watch dots turn green."
- **The "aha" reachability.** A motivated learner *can* reach stability understanding via the Stability tab (correct, honest). They are *unlikely* to reach the proposer-optimality "aha" without already knowing to set bias to 100 and to read "Asker" as "the men" — i.e., they need the insight before the tool gives it to them. That inverts the pedagogical goal.

## 6. Styling gaps vs other labs (pedagogical impact only)

The styling brief notes Stable Marriage lags other labs. From the pedagogy lens the gap that matters is not chrome polish but *information density of the core object*:

- AgenticSorting and Correspondence render their mathematical object continuously and let you *manipulate* it (drag the array / pick c). Stable Marriage renders *derived* badges but hides the preference matrix — the actual mathematical input. A small always-on "preference card" for the active proposer (their top few choices, with the current target highlighted) would close most of the conceptual gap and is cheap.
- The app does not register `useAppFunctions` or use the shared `ControlPanel` primitives; it hand-rolls controls in a self-contained dark panel (`:859–927`). That's a framework-consistency point for the maintainer hat, but it also means the controls don't get the shell's consistent affordances. Neutral from a pure math-truth standpoint.

## Verdict

**Overall: Concerns — endorse the stability story, do not ship the optimality story as written.** The app is attractive and its stability machinery is genuinely correct, but it currently teaches a theorem its default model does not realize, and its Lab presents single-draw noise as a measured surface.

### Would-change, prioritized

1. HIGH **Reconcile model and claim.** Either (a) make the EXPLAINER honest that this is a *mixed-proposer market* and state the proposer-optimality theorem as "set bias to 100% (one-sided) to see it" — and change the visualizer default to `bias = 100` so the first experience demonstrates the named result; or (b) restrict the visualizer to one-sided GS and keep "bias" only in the Lab. Today the EXPLAINER (the ? popup) describes textbook GS while the engine runs something else at its default.
2. HIGH **Replicate Lab cells.** Average each (corrM, corrW) cell over *T* trials (expose *T*; even 10–20 helps), and soften the README's "quantify" claim. A heatmap without replication is not honest as a Lab.
3. MEDIUM **Show *why* stability holds.** Render rejections explicitly (red flash + "already prefers current partner") and consider a live "no blocking pair has ever been rejected" invariant. This is the missing "aha."
4. MEDIUM **Surface the preference list** of at least the active proposer (and ideally on hover for everyone). The defining input should not be hidden.
5. MEDIUM **Disclose incomplete matchings.** Report the number of unmatched people; don't let "Stable ✓" imply "everyone paired." Note that rank averages cover matched people only.
6. LOW **Unify vocabulary** (proposer/receiver vs Asker/Asked) and pick CVD-safe heatmap ramps; keep the redundant text rank labels.

None of these require abandoning the (genuinely interesting) two-sided market — they require being *honest about which model is on screen* and giving the learner the controls and visible objects to see the theorem when they want it.

## Self-reflection

1. **What would you do with another session?** Empirically confirm my claim that the mixed-proposer process is always stable but generally non-optimal, by instrumenting `runHeadlessSimulation` to compare its output against true man-optimal and woman-optimal GS over many seeds — turning my reasoning into measured evidence the maintainer can trust.
2. **What would you change about what you produced?** I asserted "the two-sided process is still stable" from an invariant argument rather than a proof or experiment; it is correct but I'd prefer to have run the code to demonstrate it rather than reason about it.
3. **What were you not asked that you think is important?** Whether the *two-sided market* framing is itself a legitimate teaching goal (it is — it's close to models of decentralized matching). The app might be more honest re-pitched as "a matching market with a proposer-bias knob" rather than as a Gale–Shapley demonstrator.
4. **What did we both overlook?** Performance/UX of `verifyStability` at n=100 (O(n³)) and the fact that stability is only ever checked at the very end — there's a missed chance to teach stability as a live invariant, not a post-hoc audit.
5. **What did you find difficult?** Separating "the code has a bug" from "the code faithfully implements a *different* model than the text claims." The latter is the real issue and is easy to mistake for the former.
6. **What would have made this task easier?** Being able to run the dev server to watch the default behaviour at bias=50 and confirm the Asker/Asked gap a learner would actually see; I reviewed statically.
7. **Follow-up value:** MEDIUM — conclusions are sound on static reading, but an empirical confirmation of the stable-but-not-optimal claim and a measured look at Lab cell variance would harden the two HIGH-priority recommendations.
