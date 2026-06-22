---
kind: progress
session: 2026-06-22-S01
date: 2026-06-22
title: New app — why a Bessel function gives the Skellam (Poisson-difference) conditionals
branch: claude/focused-cerf-60tgup
slug: focused-cerf-60tgup
status: in-progress
build: unknown
followup: null
pr: null
app: general
signals: needs-dan
next: Agree the app's central picture (the (X,Y) lattice diagonal ↔ Bessel series) and scope before any code.
---

# New app — why a Bessel function gives the Skellam (Poisson-difference) conditionals

## Session purpose

Build a new animath app that **explains why a (modified) Bessel function gives
the conditional probabilities of the underlying Poisson distributions in a
Skellam difference** — i.e. why `I_{|k|}` shows up when you take the difference
of two independent Poisson counts, told as geometry rather than as a formula.

## Previous session

First tracked session on this branch. The most recent handoff repo-wide is
[`solid-worlds-decor-refactor/2026-06-21-S01`](../../handoff/solid-worlds-decor-refactor/2026-06-21-S01-rooms-decor-refactor.md)
(per-app developer guides shipped, PR #229 awaiting merge) — **unrelated** to
this topic; noted only so nothing is lost.

## The idea (math sketch — to be confirmed with Dan)

If `X ~ Poisson(μ₁)` and `Y ~ Poisson(μ₂)` are independent, then `K = X − Y`
is **Skellam**:

```
P(K = k) = e^{−(μ₁+μ₂)} · (μ₁/μ₂)^{k/2} · I_{|k|}( 2√(μ₁μ₂) )
```

The Bessel function is not bolted on — it *is* the sum down a diagonal of the
joint lattice. On the `(X, Y)` grid of `Poisson(μ₁) × Poisson(μ₂)` joint
probabilities, fixing the difference `X − Y = k` picks out one diagonal "ladder"
of cells `(n+k, n)`. Summing those cells gives `P(K = k)`, and term-by-term the
ladder matches the modified-Bessel series

```
I_k(z) = Σ_{n≥0} (z/2)^{2n+k} / ( n! (n+k)! ),   z = 2√(μ₁μ₂)
```

So **each rung of the diagonal is one term of the Bessel series**, and the
*conditional* distribution of the underlying counts given `K = k` is that series
normalized by `I_{|k|}` (a "Bessel distribution" over the rung index `n`). That
diagonal-sum picture is the candidate central visual.

> [!NOTE]
> This is the session's working understanding of the connection, written to frame
> the build — **not yet confirmed as the angle Dan wants**. The exact "conditional
> probabilities of the Poisson distributions" framing is the first thing to pin
> down (see Open questions).

## Orientation notes

- **No existing app to extend.** A repo grep for `skellam` / `bessel` finds
  nothing in `src/` or `docs/`; `docs/FUTURE_APPS.md` scoped CA, firefly sync,
  murmurations, ant colonies, glassy networks, Trees and Nets, GAS — no
  probability/statistics app. This would be the collection's **first** stats app
  and a new category.
- **Likely a 2D canvas/SVG + DOM app** (the `(X,Y)` lattice heatmap + a couple of
  distribution strips), closer to StableMatching / AgenticSorting than to the
  WebGL particle viewers. Build path: `docs/BUILDING_AN_APP.md`.
- **Shared files are append-only** (`src/index.tsx`, `src/apps.ts`, `CLAUDE.md`,
  `README.md`, `src/chrome/catalog.ts`) — add entries at the end, never reorder.
- Did **not** pull/merge `main` (fresh clone is current; per CLAUDE.md branch-sync
  rule). No code written this session yet.

## Open questions (for Dan)

1. **Framing of "conditional probabilities."** Is the payload the conditional law
   of the *rung* `n` (equivalently of `(X, Y)` given `K = k`) — the Bessel
   distribution — or something else (e.g. `P(X = x | K = k)`)? They're the same
   object indexed differently; which story leads?
2. **Central visual.** Is the `(X, Y)` joint lattice with a sweepable diagonal the
   right hero picture, or do you picture it differently (two random-walk-like
   Poisson streams racing, a difference meter, …)?
3. **Scope/feel.** A focused single-view explainer (lattice + diagonal + Bessel
   readout), or a fuller lab with `μ₁, μ₂, k` sliders, a sampler, and a
   convergence readout?

## Working notes

<!-- Newest entry first. One ### per state transition. -->

### 🟡 milestone · 18:20 — Session started; oriented for a new stats app
**Why:** First session on a fresh branch with a brand-new topic; capture the
orientation and the math framing before any build decisions.

Resolved branch slug `focused-cerf-60tgup` (first tracked session here). Read the
most recent repo-wide handoff (solid-worlds decor/guides, PR #229) and confirmed
it's unrelated. Read `TODO.md` and the future-apps scoping handoff — no Skellam /
Bessel / probability app was previously scoped, and a grep finds no existing code,
so this is a new app and a new category. Sketched the diagonal-sum ↔ Bessel-series
connection above to frame the build, and listed the open questions that gate
scope. Stopping here per `/start-session` — awaiting Dan's direction before any
implementation.
