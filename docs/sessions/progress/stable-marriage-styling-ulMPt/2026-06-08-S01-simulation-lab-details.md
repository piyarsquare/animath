---
kind: progress
session: 2026-06-08-S01
date: 2026-06-08
title: Stable Matching — iron out simulation & Lab details
branch: claude/great-thompson-ko30di
slug: stable-marriage-styling-ulMPt
status: in-progress
build: unknown
followup: null
pr: https://github.com/piyarsquare/animath/pull/189
app: StableMatching
---

# Stable Matching — iron out simulation & Lab details

## Session purpose

Detail/polish + fill-the-gaps pass on the new **Stable Matching** app
(`#/stable-matching`, `src/animations/StableMatching/`). Work interactively:
propose → screenshot → iterate. Prioritize the backlog with the user rather than
plowing through. The old `#/stable-marriage` stays untouched (no route switch).

## Previous session

[2026-06-06-S01 handoff](../../handoff/stable-marriage-styling-ulMPt/2026-06-06-S01-advanced-styling-parity.md):
rebuilt Stable Matching from scratch as a new app (engine-first: `model.ts`,
`galeShapley.ts` with synchronous `runRounds`, `StableMatching.tsx` Lego-matrix
visualizer + heatmap Lab). Build passes. Key finding: synchronous two-sided
deferred acceptance is usually **not** stable (worst mid-consensus). The route
switch and old-app retirement are deferred.

> [!NOTE]
> **Branch note.** This session's working branch is `claude/great-thompson-ko30di`,
> which already carries the full PR #189 history (StableMatching app + the S01
> reports). Session reports continue under the `stable-marriage-styling-ulMPt`
> slug for continuity, as the task directs.

## Backlog (to prioritize with user)

Grouped from the task brief; not yet sequenced.

- **Simulation:** Stabilize/RVV repair animation · inspect preferences (readable
  ranked lists) · fate of unused engine bits (`market`/`extremal`) · ease re-sort
  motion · robustness (NaN guard, reduced-motion, large-n legibility) ·
  per-round vs per-proposal stepping.
- **Lab:** more surfaces (RVV cost, A−B difference, welfare, proposer-advantage,
  #stable-matchings) · declarative param model to sweep any axis pair · cell
  hover/pinning, legends, variance guidance, side-by-side compare, resolution UX.
- **Solution space (user's main interest):** stable-pair footprint · count of
  stable matchings vs consensus · the lattice of stable matchings + rotations.
- **Code health:** extract `StableMatching.tsx` (~650 lines) · tighten
  EXPLAINER/README to match behaviour.

## Working notes

<!-- Newest entry first. -->

### 🟢 code · 09:40 — Per-side average + outcome distribution (Visualizer)
**Why:** User picked the thread "show outcome distribution and average by A and B."

The Visualizer headline was one **combined** total-rank number and a single
**merged** rank histogram (A and B summed). Split both per side:

- **Average partner rank** card now shows **A** and **B** averages on their own
  rows, colour-coded (A = blue square, B = amber circle, echoing the matrix's
  square/circle), with total rank demoted to the sub-line.
- **Rank distribution** is now a **mirror histogram**: A's outcomes grow up
  (blue), B's grow down (amber) from a centre line, shared y-scale.

Reuses the per-side accounting already in `acct`; added side-colour CSS vars
(`--a-side`/`--b-side`), `.sm2-avgrows`, and `.sm2-dist2`. Build passes.
Screenshot (cA 70 · cB 20, A proposes): A #4.40 vs B #2.40 — the asymmetry is
now legible at a glance.

![per-side average + mirror distribution](assets/2026-06-08-S01-per-side-dist.png)

### 🟡 milestone · 09:00 — Session initialized
**Why:** Read prior handoff + roadmap, confirmed app state, oriented on branch.

Read the S01 handoff and the status/roadmap progress report. Confirmed the
StableMatching app is present on the working branch (`great-thompson-ko30di`,
which holds PR #189's work) and `npm run build` is the only CI gate. Awaiting the
user's pick of which backlog thread to take first.
