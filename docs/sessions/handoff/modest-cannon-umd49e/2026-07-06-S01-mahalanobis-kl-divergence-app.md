---
kind: handoff
session: 2026-07-06-S01
date: 2026-07-07
title: Division Bells (Mahalanobis × KL) — built, refocused to 1-D, then parked in a new gallery Storeroom
branch: claude/modest-cannon-umd49e
slug: modest-cannon-umd49e
status: completed
build: passed
followup: MEDIUM
pr: 248
app: division-bells, chrome
signals: phone-needed
next: Decide PR #248 — it delivers the reusable **Storeroom** (a keeper) plus **Division Bells parked in it**; merge or leave open. If Division Bells is ever revived, start from the 1-D "felt" view.
---

# Division Bells — built, refocused to 1-D, then parked in a new gallery Storeroom

## Summary

A full new app, **Division Bells** (`#/division-bells`): "how far apart are two
Gaussians?" answered by **Mahalanobis separation** and **KL divergence**. It was
built out in 2-D (whole divergence family, canvas field, whitening — all tested and
CI-green on PR #248), then **Dan corrected course twice**: (1) the measures must be
*felt* in the figure, not read off a panel → refocused to a **1-D view** (σ-ruler =
separation, shaded overlap lens = divergence) with the 2-D parked behind a mode;
(2) the app still isn't landing → **downshift it entirely**. To do that cleanly I
built a reusable gallery **Storeroom** and parked Division Bells there. Nothing was
deleted — the app, both views, and the full family engine remain in the codebase and
the route stays live. Everything is on **PR #248** (open, build/lint/smoke/deploy
green on each push).

## What changed

**New app `src/animations/DivisionBells/`** (default view = the 1-D "felt" one):

- **`gaussian1d.ts`** (pure, 13 tests) — the felt-view math: `pdf1`/`cdf1`, pooled +
  directed Mahalanobis, `kl1`, `crossings1` (decision boundary), and numeric
  `overlap1`/`tv1`/`bayesError1`. Tests pin `overlap = 2Φ(−δ/2σ)`,
  `Bayes = ½·overlap`, KL vs numeric, crossings at the midpoint.
- **`gaussian2d.ts`** (pure, 21 tests) — the *whole divergence family* (KL +
  eigenvalue decomposition, Mahalanobis directed/pooled, Bhattacharyya→Hellinger,
  Wasserstein-2/Bures, numeric TV/overlap/Bayes). This powers the parked 2-D mode.
- **`DivisionBells.tsx`** — one component, **two modes** via a top-bar pill:
  *On a line* (default: `Bells1D`, two curves + σ-ruler + overlap lens + decision
  boundary + drag handles) and *On the plane* (reserve: `BellsPlane` + the yardstick
  family panel + canvas field + whitening).
- **`measures.ts`** — a stateless presentation registry for the 2-D scalar family.
- `EXPLAINER.md` leads with the 1-D "felt" reading; gallery tile added in
  `previews.tsx` (`divergence` kind — two facing bell profiles, the *Division Bell*
  cover).

**New reusable gallery Storeroom (chrome):**

- `catalog.ts` gains an optional `storeroom` flag on a card's META; `Gallery.tsx`
  pulls flagged cards out of the main grid + category filter into a **collapsed,
  de-emphasized "Storeroom" section** at the bottom (footer counts only the main
  lineup). The route stays live so parked cards are still clickable.
- **Division Bells is parked** (`storeroom: true`). Any future retirement is now a
  one-line flag, not a deletion.

## Key files

| File | Role |
|---|---|
| [`src/animations/DivisionBells/DivisionBells.tsx:305`](https://github.com/piyarsquare/animath/blob/e641207a975087e7c9c59bd9902d76ebb6882173/src/animations/DivisionBells/DivisionBells.tsx#L305) | `Bells1D` — the 1-D "felt" view (σ-ruler, overlap lens, decision boundary, mean+σ drag handles) |
| [`src/animations/DivisionBells/DivisionBells.tsx:473`](https://github.com/piyarsquare/animath/blob/e641207a975087e7c9c59bd9902d76ebb6882173/src/animations/DivisionBells/DivisionBells.tsx#L473) | mode state + assembly: *On a line* (default) vs *On the plane* (2-D reserve) |
| [`src/animations/DivisionBells/gaussian1d.ts:88`](https://github.com/piyarsquare/animath/blob/e641207a975087e7c9c59bd9902d76ebb6882173/src/animations/DivisionBells/gaussian1d.ts#L88) | numeric `overlap1` / `bayesError1` — the felt lens's area; pure, tested |
| [`src/animations/DivisionBells/gaussian2d.ts`](https://github.com/piyarsquare/animath/blob/e641207a975087e7c9c59bd9902d76ebb6882173/src/animations/DivisionBells/gaussian2d.ts) | the whole 2-D divergence family (parked), 21 tests |
| [`src/chrome/catalog.ts:43`](https://github.com/piyarsquare/animath/blob/e641207a975087e7c9c59bd9902d76ebb6882173/src/chrome/catalog.ts#L43) | `storeroom: true` on Division Bells + the flag on the META type |
| [`src/chrome/Gallery.tsx:22`](https://github.com/piyarsquare/animath/blob/e641207a975087e7c9c59bd9902d76ebb6882173/src/chrome/Gallery.tsx#L22) | the Storeroom split + collapsed section render |
| [`src/chrome/theme.css`](https://github.com/piyarsquare/animath/blob/e641207a975087e7c9c59bd9902d76ebb6882173/src/chrome/theme.css) | `.am-gal-storeroom*` styles (search "Storeroom") |
| [`docs/sessions/progress/modest-cannon-umd49e/2026-07-06-S01-expert-synthesis.md`](https://github.com/piyarsquare/animath/blob/e641207a975087e7c9c59bd9902d76ebb6882173/docs/sessions/progress/modest-cannon-umd49e/2026-07-06-S01-expert-synthesis.md) | the three-hats review + divergence-family scoping (design provenance) |

## Open / not done

> [!IMPORTANT]
> **Division Bells is intentionally parked** (Dan's call — it wasn't landing). Do
> not "fix it up" or un-park it without Dan. The Storeroom is the keeper deliverable;
> the app is preserved but downshifted.

- **PR #248 fate** — it now bundles two things: the reusable Storeroom (worth
  keeping) and Division Bells (parked). Decide with Dan whether to merge as-is or
  split the Storeroom out.
- **Real-device phone check** (`signals: phone-needed`) — the 1-D σ-drag handles and
  the phone-portrait height cap were verified **headless only**. Touch behavior on a
  real phone is unconfirmed. Low urgency while the app is parked.
- **Phone dead-space** — capping the 1-D plot height in a tall phone card leaves
  empty margins (Dan flagged it; left as-is since the app got parked before we chose
  a fix — options were anchor-to-top vs. a shorter phone card default).
- **If Division Bells is revived:** the 1-D "felt" view is the base to build on.
  Open thread: bring **KL** into the 1-D view (its felt form is the shaded
  `p·log(p/q)` integrand with a running area = KL) — held this session to keep the
  focus to two measures.

## Context

- **The app has TWO independent engines** (`gaussian1d.ts`, `gaussian2d.ts`) and the
  view switches modes — the 1-D state (`lM1/lS1/…`) is separate from the 2-D state
  (`pMx/pS1/…`). Don't assume one.
- **CI now gates on `lint` + `smoke` + Cloudflare deploy**, not just `npm run build`
  (CLAUDE.md's "only CI check is build" is stale). Keep lint at 0 errors and the
  smoke ROUTES table (`scripts/smoke.mjs`) in sync with `index.tsx`.
- The Cloudflare Pages bot posts a preview-deploy comment on every push — it's noise,
  not a review comment; don't act on it.
- Session was subscribed to PR #248 activity; the subscription runs until the PR is
  merged/closed. A proactive `send_later` heartbeat was attempted but the user
  declined it, so PR re-checks rely on delivered webhook events (which don't include
  CI *success* or new pushes).

## Self-reflection

1. **What would you do with another session?** Nothing on Division Bells unless Dan
   revives it. If he does: put KL into the 1-D view as the shaded integrand, and
   resolve the phone dead-space. Otherwise, the Storeroom could earn a tiny follow-up
   (e.g. a per-card "why parked" note).
2. **What would you change about what you produced?** I built the 2-D version to its
   full extent (all waves, Wasserstein, whitening) *before* Dan had felt the core
   idea — exactly the "advanced too quickly" he flagged. I should have shipped the
   smallest felt probe first and let him react before generalizing.
3. **What were you not asked that you think is important?** Whether "felt" was better
   served by 1-D from the very start. The three-hats review endorsed 2-D; none of the
   three hats questioned the dimensionality as a pedagogy risk, and it was the single
   biggest course-correction.
4. **What did we both overlook?** That the *number-in-a-panel* framing is the opposite
   of "felt," regardless of how correct the math is. The engine tests were all green
   while the app was pedagogically off — a green check testing the wrong thing.
5. **What did you find difficult?** Nothing technically. The judgment call — how much
   to build before showing — is the recurring hard part, and I got it wrong here.
6. **What would have made this task easier?** A cheap 1-D probe in the first hour,
   shown before the three-hats/engine investment.
7. **How did you verify this, and does each passing check test the user-visible
   claim?** Pure math via **34 unit tests** (`npm test`, closed-forms vs numeric
   integration both ways — these test the real quantities, not proxies). The
   *figures* via **headless screenshots** (desktop + 390×844 mobile) for every view,
   field mode, whitening, the σ-handles, and the collapsed/expanded Storeroom — I
   looked at each. **Not verified:** real-device touch of the drag handles and the
   phone height cap (hence `signals: phone-needed`). Build/lint(0)/smoke/deploy green
   on PR #248.
8. **Follow-up value:** MEDIUM — the shipped code is correct and complete for what it
   is; the follow-up value is a product decision (revive vs. keep parked) plus the
   unconfirmed real-device touch, not a correctness risk.
