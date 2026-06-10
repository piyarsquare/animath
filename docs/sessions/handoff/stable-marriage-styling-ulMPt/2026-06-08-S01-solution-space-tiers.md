---
kind: handoff
session: 2026-06-08-S01
date: 2026-06-08
title: Stable Matching — solution-space build (Tiers 0–4)
branch: claude/great-thompson-ko30di
slug: stable-marriage-styling-ulMPt
status: in-progress
build: passed
followup: Tier 5 (preference falsification) pending a product decision; otherwise polish.
pr: https://github.com/piyarsquare/animath/pull/189
app: StableMatching
---

# Stable Matching — solution-space build (Tiers 0–4)

> [!NOTE]
> Working branch is `claude/great-thompson-ko30di` (carries PR #189's history).
> Reports stay under the `stable-marriage-styling-ulMPt` slug for continuity.
> Old app `#/stable-marriage` is **untouched**; no route switch was made.

## Summary

Started as a detail/polish session on the new **Stable Matching** app
(`#/stable-matching`). After polishing the per-side outcome panel (averages +
sorted ECDF-style colourbars), the user asked to map the **solution space**, so we
wrote a wishlist + tiered plan and then **built Tiers 0–4 of it**: a verified
rotation engine, the stable-pair footprint + lattice count, named/fair solutions
with jump-to, the lattice Hasse-diagram tab, and the Roth–Vande Vate resolver with
a cost-to-stabilize Lab surface. Build passes; the rotation math is cross-checked
against brute force (1440 cases). Only **Tier 5 (preference falsification)** is
unbuilt — it needs a product decision.

## What changed

### Visualizer outcome panel (early session)
Per-side **average partner rank** (coloured by its mean) + **sorted outcome
colourbars** (one tick per person, best→worst on the BuRd scale — reads like an
ECDF), merged into one panel. Population cap 60→200; matrix floor 12→5px so large
n renders as a dense lego heatmap; strip ticks min 3px.

### Solution-space engine + features (Tiers 0–4)
- **`rotations.ts`** (T0) — enumerate every stable matching by rotation-elimination
  from A-optimal; footprint, count, named solutions (A/B-optimal, egalitarian,
  median, min-regret, sex-equal, balanced), lattice scores + Hasse layout
  (`layoutLattice`). Brute-force reference `allStableBrute`.
- **`scripts/test-rotations.ts`** — cross-checks the fast path vs brute force, named
  solutions stable & in-set, egalitarian/sex-equal minimal, RVV convergence/replay:
  **1440 cases, 0 failures**. Run:
  `npx esbuild scripts/test-rotations.ts --bundle --platform=node --format=esm | node --input-type=module`
- **T1** — Solution-space metric card (count + footprint); **footprint overlay**
  (teal-dashed "stable elsewhere" cells) with Display toggle; Lab **# stable**
  surface (collapse-to-1 phase curve).
- **T2** — **Jump to a stable solution** Select; statically overrides the displayed
  matching (matrix, averages, stability, diagonal) with a teal banner; fair
  solutions visibly pull A/B averages together.
- **T3** — **Lattice tab** + `LatticeView` SVG Hasse diagram (A-optimal top →
  B-optimal bottom, edges = rotations, named solutions flagged, click → load).
- **`resolver.ts`** + **T4** — Roth–Vande Vate "Stabilize" button animates blocking
  cells healing on an unstable run; Lab **Repair cost** surface.
- EXPLAINER.md / README.md rewritten to match.

## Key files

| File | Role |
|---|---|
| [`src/animations/StableMatching/rotations.ts`](https://github.com/piyarsquare/animath/blob/1c9c0b3/src/animations/StableMatching/rotations.ts) | solution-space engine: enumerate, footprint, named solutions, lattice layout |
| [`src/animations/StableMatching/resolver.ts`](https://github.com/piyarsquare/animath/blob/1c9c0b3/src/animations/StableMatching/resolver.ts) | Roth–Vande Vate random-path-to-stability |
| [`src/animations/StableMatching/StableMatching.tsx`](https://github.com/piyarsquare/animath/blob/1c9c0b3/src/animations/StableMatching/StableMatching.tsx) | the app: Visualizer + Lattice tab + Lab; jump-to / stabilize / footprint |
| [`scripts/test-rotations.ts`](https://github.com/piyarsquare/animath/blob/1c9c0b3/scripts/test-rotations.ts) | brute-force cross-check (the only test harness — keep it green) |
| [`docs/sessions/progress/stable-marriage-styling-ulMPt/2026-06-08-S01-solution-space-wishlist.md`](https://github.com/piyarsquare/animath/blob/1c9c0b3/docs/sessions/progress/stable-marriage-styling-ulMPt/2026-06-08-S01-solution-space-wishlist.md) | the full wishlist + tiered plan (the spec) |

## Open / not done

- **Tier 5 — Preference falsification** ("Gaming the Match"): true-vs-reported
  preference editor, best-response dynamics, small-n Nash equilibria,
  manipulability-vs-consensus. **Two blockers before building:** (E4) standalone app
  `#/strategic-matching` vs an advanced *mode*; and an **engine extension** —
  truncation manipulation needs GS over **incomplete/truncated lists** (agents can be
  left unmatched), which `oneSided`/`runRounds` don't model yet. Recommend a thin
  in-app spike of the truthful-vs-manipulated comparison first.
- **The route switch** is still deferred — `#/stable-marriage` (old app) is live;
  `#/stable-matching` (new) lives alongside. Switch + retire old app is a separate,
  user-blessed step.
- **Polish backlog** (from the original brief, not yet done): inspect-preferences on
  hover (read a person's full ranked list); ease/animate the live re-sort; reduced-
  motion; per-proposal (vs per-round) stepping; lattice **rotation slider** +
  meet/join; mark named solutions as ticks *on the average colourbars*.
- **Perf**: the matrix is n² DOM cells; stepping at n≈200 is sluggish (Finish/static
  are fine). A `<canvas>` matrix is the fix if true large-n smoothness is wanted.
- **Caps**: footprint enumeration cap 1000; Lab #stable/cost cap 300; lattice draw
  gated to ≤80 nodes (else "too large" / "unique point" messages).

## Context

- Verification is by **screenshots** (DOM/CSS app, no WebGL) + the rotation test
  harness. A throwaway `scripts/shoot-*.mjs` (puppeteer, presets `localStorage`
  `animath:v1:stable-matching:*`, finishes the run / opens the Lattice / runs the
  Lab) was used and deleted each time; recreate as needed. Note `jump`/`pickedNode`
  are transient state (not persisted) so must be driven via the UI.
- Good demo seeds (n=10, consensus 0): **53** = 13 stable matchings (rich lattice +
  footprint); RVV short path: **27** (Alt, consensus 30 → stable in 9 steps).
- The math is standard: lattice/rotations (Gusfield–Irving), #P-hard counting
  (Irving–Leather), poly egalitarian/median/min-regret, NP-hard sex-equal/balanced,
  RVV convergence (Roth–Vande Vate 1990). See the wishlist doc for citations.

## Self-reflection

1. **Confidence.** High. The risky part (the rotation enumeration) is cross-checked
   against brute force over 1440 cases including the named solutions and RVV; every
   UI tier was screenshot-verified; build + tests green; tree clean.
2. **What could bite.** The lattice layout had a sign-convention bug (covers are
   [upper, lower]) caught only by the screenshot — layout isn't unit-tested, just
   the combinatorics. The `shown` precedence (resolve > picked > jump > live) is now
   threaded through many places; a future edit could desync one consumer.
3. **Bias.** Enumeration-first (brute over the stable set for small n) for speed +
   verifiability; the poly-time min-cut egalitarian was deferred (not needed at our n).
4. **Not done.** Tier 5 and the polish backlog above; the route switch. Stopped at
   Tier 5 deliberately — it's a separate app needing a product decision, not a safe
   autonomous build.
5. **Follow-up value:** MEDIUM — the shipped tiers are cross-checked against brute force, but Tier 5 and the route switch were deliberately deferred pending a product decision.

