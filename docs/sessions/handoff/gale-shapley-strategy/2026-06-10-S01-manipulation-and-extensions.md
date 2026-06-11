---
kind: handoff
session: 2026-06-10-S01
date: 2026-06-10
title: Gale–Shapley manipulation, welfare, and an extensions backlog
branch: claude/gale-shapley-strategy-hqyndf
slug: gale-shapley-strategy
status: completed
build: unknown
followup: medium
pr: https://github.com/piyarsquare/animath/pull/201
app: stable-marriage
---

# Gale–Shapley manipulation, welfare, and an extensions backlog

> [!NOTE]
> Design / investigation session. The only artifact is a Markdown design doc
> (`EXTENSIONS.md`) — no app code changed, so the `npm run build` check is
> unaffected. Merged to `main` via PR #201.

## Summary

An extended discussion of incentives and welfare in the Stable Marriage app —
strategic manipulation of Gale–Shapley, the stable-matching lattice, the price of
stability, and how entrants perturb a happy matching — captured as a written
backlog of eight explorable features. No code; one doc shipped and merged.

## What changed

Added `src/animations/StableMarriage/EXTENSIONS.md`: eight self-contained feature
ideas, each with the math, a worked example, what to build, and the concrete
engine hooks to reuse (`generatePreferences`, `stepSimulation`,
`runHeadlessSimulation`, `verifyStability`, `rankStats`):

1. **Single-agent truncation** — receivers (not proposers) can manipulate to reach
   their best stable partner.
2. **Rotation / lattice explorer** — coalitional truncation reaches any stable
   matching; rotations are the "frustration cycles."
3. **Price of stability** — stable vs. welfare-optimal; the gap lands on the
   receiving side (≈ n/ln n vs. the ≈ √n welfare floor).
4. **Near-stable matchings** — trade k blocking pairs for welfare; the f(k) frontier.
5. **Entrant externalities** — adding a couple cascades and demotes incumbents.
6. **Hot newcomers** — rank inflation vs. structural breakups (≤ ~2 couples).
7. **Continuous-time matching** — thickness vs. speed; likely a sibling app.
8. **Missing a round** — order-independence ⇒ free; residual market ⇒ costly.

## Key files

| File | Role |
|---|---|
| [`src/animations/StableMarriage/EXTENSIONS.md`](https://github.com/piyarsquare/animath/blob/df17975/src/animations/StableMarriage/EXTENSIONS.md) | The backlog — math + worked examples + engine hooks + suggested build order |
| [`src/animations/StableMarriage/StableMarriage.tsx`](https://github.com/piyarsquare/animath/blob/df17975/src/animations/StableMarriage/StableMarriage.tsx) | The app the extensions build on (`verifyStability` already counts blocking pairs; `rankStats` already computes welfare) |

## Open / not done

Nothing pending on this branch (merged). The backlog is the follow-up: the
smallest, highest-insight starters are the **timing / order-independence** demo
and the **entrant injector** (hot-newcomers falls out of it); the deepest are the
**rotation/lattice explorer** and the **near-stable frontier**. A shared
*acceptability-cutoff* primitive (truncated preference lists) unblocks ideas 1, 2,
and 4 — the engine currently assumes all partners are acceptable.

## Context

The app uses a *mixed-proposer* model (the Proposer-bias knob randomizes who
proposes each step); the clean strategy/lattice theorems assume deterministic
one-sided proposing, so those modes want bias locked to 0% or 100%.

## Self-reflection

- **What went well:** the discussion converged on three crisp, visualizable
  results, and the reviewer's √n catch genuinely improved the doc.
- **What to watch:** `EXTENSIONS.md` makes asymptotic claims (ln n, n/ln n, √n);
  any future Lab plotting them should be checked against the corrected scaling.
- **Smallest next step:** the order-independence demo — almost free (run
  `runToCompletion` with shuffled proposal orders, diff the result).
- **Follow-up value:** LOW — the EXTENSIONS.md design doc is complete and the √n scaling is corrected; what remains is optional Lab demos.

