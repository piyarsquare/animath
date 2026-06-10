---
kind: three-hats
session: 2026-06-10-S01
date: 2026-06-10
title: Convergence synthesis — Agentic Sorting expansion
branch: claude/agentic-sorting-app-j6ngd4
slug: agentic-sorting-app-j6ngd4
status: complete
build: unknown
---

# Convergence synthesis — Agentic Sorting expansion

## Plan under review

<details><summary>Original request</summary>

Expand the **Agentic Sorting** app (`src/animations/AgenticSorting/`) along two axes
the user wants restored/added:

**(1) Divergent objectives.** Bring back a lost "intermediate" version where agents
optimize genuinely *different* functions — not just a division of labor toward one
global ascending sort. Concretely: some agents could sort ascending while others sort
descending; or each agent pursues only its own local goal (à la Levin's "selfish"
elements that just want their own correct position) rather than a shared global
objective. The point is to create genuine *tension* between agents, not cooperation
toward one target.

**(2) Levin's competencies.** Lean into the source paper: add **frozen/defective
cells** (agents that don't act), **delayed-gratification** routing around defects
(elements temporarily move away from their goal), and a **clustering metric /
instrumentation** for chimeric arrays (cells running different algorithms
spontaneously cluster like-with-like) — surfaced as observable, measurable phenomena
rather than just visuals.

Source idea: Michael Levin (Tufts), Lex Fridman Podcast #486; paper: Taining Zhang,
Adam Goldstein, Michael Levin, "Classical Sorting Algorithms as a Model of
Morphogenesis: self-sorting arrays reveal unexpected competencies in a minimal model
of basal intelligence" (Adaptive Behavior 2025; arXiv:2401.05375).

</details>

The three expert reviews this synthesizes:

- [Framework Maintainer](2026-06-10-S01-expert-maintainer.md)
- [Architecture & Quality Consultant](2026-06-10-S01-expert-consultant.md)
- [Math-Viz & Pedagogy](2026-06-10-S01-expert-pedagogy.md)

## TL;DR

All three **endorse the product direction** and all three **gate it behind the same
refactor**: extract a pure simulation engine before touching features. The biggest
divergence is *how literally* to read "divergent objectives" — the pedagogy hat
splits it into two distinct ideas (one faithful to the paper, one an animath-original
that must be framed as non-convergent phase separation). Two correctness issues
(same-tick swap collisions; baseline-normalized clustering) are design-time
must-haves, not discoveries to make later.

## 1. Points of agreement (high confidence)

| # | Convergent finding | Maintainer | Consultant | Pedagogy |
|---|---|:--:|:--:|:--:|
| A1 | **Endorse the two-axis direction** — it turns a pretty-but-shallow toy into a faithful, teachable model | ✅ | ✅ | ✅ |
| A2 | **Phase 0 = extract a pure engine first** (`step(state)→state` + strategy table), build-green & behavior-identical, *before* features | ✅ (Step 0) | ✅ (`sorting.ts`+`metrics.ts`, mirror StableMatching) | ✅ (it's a re-architecture) |
| A3 | **Reuse `chrome/readouts.tsx`** (StatGrid/MiniHisto/Sparkline/Breakdown) — no charting dependency, no bespoke CSS charts | ✅ | ✅ | ✅ |
| A4 | **Metrics must be measured, not decorative** — every competency needs an observable | ✅ | ✅ | ✅ |
| A5 | **Clustering must be baseline-normalized** (assortativity / excess homophily over chance) or it just restates the population mix | — | ✅ | ✅ |
| A6 | **Honest reframe ships in the same change** — EXPLAINER.md + README.md must be rewritten or the "?" modal lies | ✅ | — | ✅ |
| A7 | **Slice it** — phased MVP, not one big drop (bundle/scope discipline) | ✅ | ✅ | ✅ |
| A8 | New controls use **`ControlPanel` primitives + `usePersistentState`**, not more `.as-slider` + plain `useState` | ✅ | ✅ | — |

> [!IMPORTANT]
> **A2 is the load-bearing agreement.** Every requested feature is *agent data* (a
> goal direction, a frozen flag, an own-position target) or *an array read* (a
> metric), yet the current 440-line component forces each into a new `switch` arm and
> a new field smeared across the loop. Extract the engine and "some agents sort
> descending" costs ≈ zero new control flow — route every comparison through one
> `inOrder(a, b, objective)` predicate.

## 2. Points of tension (need a decision)

### T1 — What "divergent objectives" actually means

The pedagogy hat draws a line the request blurs, and it matters:

- **Per-element *selfish goal-seeking*** (each element just wants its own correct
  position) — this **is the paper's actual model**. Pedagogy wants it as the new
  **default centerpiece**. Faithful, converges, teaches the core "aha."
- **Ascending-vs-descending objectives** — an **animath-original** variant **not in
  Levin's work**. It generally has **no fixed point** (Consultant: needs a stagnation
  detector; Maintainer: it *falsifies* the current "marches toward sorted order"
  narrative). Valuable, but only if framed as **phase separation / domain formation**
  and measured with **monotone-run count**, not sortedness.

**Decision needed:** do we want both — selfish goal-seeking as the faithful default
*and* asc/desc as a clearly-labeled non-converging "phase separation" mode — or focus
the session on one?

### T2 — Canvas arena vs DOM, and how far to push scale

- **Consultant:** scope a **canvas arena** into the branch — "see clustering emerge"
  at large N is the headline deliverable and ~300 DOM nodes won't survive it; also
  switch the loop to **rAF + accumulator** (`setItems` once per frame).
- **Maintainer:** the bundle is already large; **slice aggressively**, keep scope
  tight. Didn't object to rAF but wants minimal churn.

**Tension:** performance ambition (canvas, large N) vs scope discipline. rAF is cheap
and agreed-compatible; **canvas is the real scope question** — defer to Phase 3 or
pull it forward?

### T3 — Is delayed gratification in the MVP?

- **Maintainer:** explicit **cut-line feature** — ship only if it yields a *measurable*
  observable, else it's a gimmick.
- **Pedagogy:** make it **click-to-track one element's goal-distance over time** (the
  curve must bump *up* then down) — that *is* the measurable version.
- **Consultant:** requires per-element history tracking.

Not a real disagreement — all agree it must be measured — but it's the natural
**Phase 3** item, gated on the click-to-track readout being convincing.

## 3. Blind spots (raised by one hat or none — verify before coding)

| # | Blind spot | Raised by | Why it matters |
|---|---|---|---|
| B1 | **Same-tick swap collisions** — multiple woken agents mutate the shared array in one pass | Consultant only | Benign under one global sort; a **real bug** under divergent objectives. Engine must resolve proposals deterministically (one claim per cell per tick, seeded). Design-time, not discovery. |
| B2 | **Existing agent rules are mislabeled** — 3/5 "classic sort" analogs don't match (Nomadic is a left-bubble, not insertion; Standard/Patrolling are loose; only Perfectionist≈selection & Blind Date are honest) | Pedagogy only | The rewrite should *fix* fidelity, not inherit the overclaim. |
| B3 | **Seeded RNG / reproducibility** (reuse `mulberry32`) | Consultant only | Required for B1's deterministic resolution and for repeatable demos/comparisons. |
| B4 | **The "lost intermediate" was never committed** | (archaeology done post-review) | `git log` shows the 5-agent design identical from the first commit (`4ca94d3`); no `descending`/`objective`/`frozen` anywhere in history. **Reconstruct from the paper + memory — there is nothing to recover.** |
| B5 | **Phone re-chrome** — how the arena + new readouts behave on the ≤740px stacked layout | none | AgenticSorting renders into a workspace view; large-N canvas + several readout panels need a mobile story. |
| B6 | **Color-vision deficiency** for per-strategy / per-algotype hues | Pedagogy (noted) | Clustering-by-algotype overlays lean hard on color; needs a CVD-safe palette or secondary encoding. |

## 4. Recommended action — a phased plan

> [!TIP]
> Order is chosen so every phase ends **build-green** and independently demoable, and
> so the faithful-to-Levin material lands before the animath-original embellishment.

**Phase 0 — Engine extract (no behavior change).**
Pull the simulation into a pure `engine.ts`: `step(state) → state`, a strategy table
keyed by agent type, seeded `mulberry32`, and **deterministic same-tick collision
resolution** (B1/B3). Add `metrics.ts`: inversion count / sortedness, monotone-run
count, assortativity (A5). Switch rendering to **rAF + accumulator** (T2, the
non-controversial half). Fix the mislabeled sort analogs (B2). Ends identical on
screen, build-green.

**Phase 1 — Levin competencies (the faithful, strong part).**
Frozen/defective cells with a **"best achievable sortedness" ceiling** readout;
**inversions** as a permanent metric; **clustering = excess homophily over chance**
on a Sparkline/MiniHisto. Rewrite EXPLAINER.md + README.md honestly *in the same
change* (A6): cite arXiv:2401.05375, label Levin-vs-animath, drop any "the cells are
intelligent" copy — describe *measured competencies*.

**Phase 2 — Divergent objectives.**
Per-element **selfish goal-seeking** as the new default centerpiece (faithful, T1).
Then **ascending-vs-descending** as a clearly-labeled animath-original **phase-
separation** mode with a **stagnation detector** + monotone-run readout (T1/T2).

**Phase 3 — Optional / cut-line.**
**Delayed-gratification** click-to-track goal-distance plot (T3). **Canvas arena**
for large-N clustering (T2) if we want the at-scale emergence shot.

### Open decisions to put to the user
1. **T1:** both selfish-goal default *and* labeled asc/desc phase-separation mode — or
   just one this session?
2. **T2:** canvas arena in-scope (pull to Phase 1) or deferred to Phase 3?
3. **MVP boundary:** is "Phase 0 + Phase 1" the shippable first slice, with 2–3 as
   follow-ups?

## Self-reflection

**What I'm confident about:** The three hats converged unusually tightly — engine
extraction first, reuse `readouts.tsx`, baseline-normalize clustering, reframe docs
honestly. Those are safe to act on. The phased plan follows directly from that
convergence.

**What's uncertain:** The pedagogy hat self-flagged that its fidelity claims (the
3/5-mislabeled-analogs finding, what is/isn't "in the paper") rest on recollection of
arXiv:2401.05375, not a fresh read. Before Phase 1's doc reframe, **read the paper's
abstract + methods** to lock down exactly which competencies are measured and how, so
the explainer cites it accurately. The asc/desc "phase separation" framing is my own
synthesis of the three hats and should be sanity-checked against what the user
actually remembers from the lost intermediate.

**Follow-up value:** MEDIUM — the plan is solid, but the doc-fidelity gate (verify
against the actual paper) and the user's two open decisions (T1, T2) should be
resolved before Phase 1, not assumed.
