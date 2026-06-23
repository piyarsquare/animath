---
kind: handoff
session: 2026-06-22-S01
date: 2026-06-23
title: Counting the Ways — Skellam/Bessel explainer built + polished (compact grid · two-channel color · sticky caption · fullscreen)
branch: claude/focused-cerf-60tgup
slug: focused-cerf-60tgup
status: completed
build: passed
followup: null
pr: 233
app: counting-the-ways
signals: not-live
next: The Lab should show cumulative results — pooled/running μ̂ that tightens as runs accumulate, a convergence trace, and the spread of μ̂ across runs.
---

# Counting the Ways — Skellam/Bessel explainer built + polished

> [!NOTE]
> Code session. A new app was built earlier on this branch and then refined over
> several visual-polish rounds; this handoff covers the whole arc and the state it
> landed in. Dan called the latest round "very good" and a good stopping point.

## Summary

**Counting the Ways** (`#/counting-the-ways`) is a new — and the collection's first —
probability/statistics app: an interactive explainer for **why a modified Bessel
function gives the Skellam (Poisson-difference) conditionals**. The hero idea is that
`I_{|k|}` is literally the sum down one diagonal of the joint `Poisson(μ₁) × Poisson(μ₂)`
lattice, so the Bessel value *is* "the count of all the ways to reach net difference
`k`." The **Explain** mode (the explainer) is complete and polished; the **Lab** mode (a
synthetic sampler/fitter) works but is the explicit next task. Build is green; the
branch is on PR #233 and not yet merged to main.

## What changed

The app itself (`skellam.ts` engine + `CountingTheWays.tsx` + CSS + EXPLAINER/README +
tests, registered in the five append-only files) was built earlier in the session and
already merged `origin/main` once (#231, which retired Stable Marriage). This session's
later rounds were **visual/UX polish driven by Dan testing**:

- **Two-channel, skin-neutral color.** The lattice uses two theme tokens, named by
  *role* (not hue, since they swap per skin): the joint blob + Skellam are the
  **distribution** channel (`--accent`), and the active diagonal + Bessel are the
  **selection** channel (`--accent-2`), the diagonal tinted ∝ the Bessel conditional.
  The words "gold"/"teal" were removed everywhere (legend, CSS classes, `MiniDist`
  prop, comments) because they're skin-dependent. Verified on the default and Phosphor
  skins (distribution green / selection amber under Phosphor).
- **Formula out of the frame.** The text-heavy factored formula moved from the view
  into its own closed rail panel; the Explain view now flows as three labeled,
  connected distributions (Joint grid → Skellam → Bessel) with no prose between them.
- **Compact joint grid.** Reduced to `min(250px, 28vh)`.
- **Fullscreen keeps the grid compact.** An earlier fullscreen rule re-enlarged the
  grid (Dan rejected it). Now the grid stays compact in fullscreen; the *distributions*
  grow into the space and the content centers, so the bottom action strip still reads
  as attached.
- **Sticky walkthrough caption.** In a short/resized window the stage scrolls and the
  Play-tutorial step caption slid up under the window header. It's now
  `position: sticky; top: 0` with a layered-opaque background, so the narration stays
  pinned and visible. Reproduced the bug (caption `top: -92`, overlap) and confirmed
  the fix (pinned at `top: 128`, no overlap).
- **Diagonal-sum P2 fix** (earlier): the running sum now covers the whole (possibly
  off-grid) diagonal, not just the cells that fit the visible window.

## Key files

| File | Role |
|---|---|
| [`CountingTheWays.tsx:89`](https://github.com/piyarsquare/animath/blob/dd60e6b4258970cdedc50e75b0bac5dad3d94257/src/animations/CountingTheWays/CountingTheWays.tsx#L89) | `Lattice` — the joint grid; two-channel cell fill (`onDiag ? --accent-2 : --accent`) at line ~127 |
| [`CountingTheWays.tsx:264`](https://github.com/piyarsquare/animath/blob/dd60e6b4258970cdedc50e75b0bac5dad3d94257/src/animations/CountingTheWays/CountingTheWays.tsx#L264) | `MiniDist` — the reusable Skellam/Bessel bar chart; skin-neutral `color: 'accent' \| 'accent2'` |
| [`CountingTheWays.tsx:561`](https://github.com/piyarsquare/animath/blob/dd60e6b4258970cdedc50e75b0bac5dad3d94257/src/animations/CountingTheWays/CountingTheWays.tsx#L561) | `labView` — **the Lab that needs cumulative results** (one-off rows today) |
| [`CountingTheWays.tsx:435`](https://github.com/piyarsquare/animath/blob/dd60e6b4258970cdedc50e75b0bac5dad3d94257/src/animations/CountingTheWays/CountingTheWays.tsx#L435) | `runLab` — draws a sample, fits μ̂, appends one independent catalog row |
| [`skellam.ts:222`](https://github.com/piyarsquare/animath/blob/dd60e6b4258970cdedc50e75b0bac5dad3d94257/src/animations/CountingTheWays/skellam.ts#L222) | `fitMoments` — method-of-moments estimator (`μ̂₁=(s²+m̄)/2`, `μ̂₂=(s²−m̄)/2`) |
| [`skellam.ts:202`](https://github.com/piyarsquare/animath/blob/dd60e6b4258970cdedc50e75b0bac5dad3d94257/src/animations/CountingTheWays/skellam.ts#L202) | `sampleSkellam` + `mulberry32` seeded RNG — the Lab's sampler |
| [`skellam.ts:108`](https://github.com/piyarsquare/animath/blob/dd60e6b4258970cdedc50e75b0bac5dad3d94257/src/animations/CountingTheWays/skellam.ts#L108) | `skellamPmf` — honest diagonal sum, cross-checked vs the closed Bessel form |
| [`countingTheWays.css:210`](https://github.com/piyarsquare/animath/blob/dd60e6b4258970cdedc50e75b0bac5dad3d94257/src/animations/CountingTheWays/countingTheWays.css#L210) | `.ctw-tutorial` — the now-sticky walkthrough caption |
| [`countingTheWays.css:64`](https://github.com/piyarsquare/animath/blob/dd60e6b4258970cdedc50e75b0bac5dad3d94257/src/animations/CountingTheWays/countingTheWays.css#L64) | `.am-ws-full` fullscreen rules (center content, grow distributions, keep grid compact) |

## Open / not done

- **The Lab should show cumulative results** (the one named follow-up; logged to
  `TODO.md` as `[counting-the-ways] !med`). Today each *Run & log* is independent — one
  sample, one μ̂, one row. Make it accumulate: a pooled/running μ̂ that tightens as runs
  grow, a convergence trace (estimate vs. total samples), and the spread of μ̂ across
  runs. The point is to *feel* the estimator concentrate on the truth, which one-off
  rows don't convey. Everything needed is in `skellam.ts` (sampler + `fitMoments`); the
  change is in `labView` / the Lab sections + a small bit of accumulator state.
- **Not merged to main** (PR #233 open) — hence `signals: not-live`.
- **`npm test`** wasn't re-run this round (the recent rounds were CSS/markup only;
  earlier the suite was 6–7/7 green). Worth a run if you touch `skellam.ts`.

## Context

- **Verification is headless-screenshot-based.** `npm run build && (npm run preview &)`
  then `node scripts/shoot.mjs '#/counting-the-ways' out.png`. For non-default skins:
  `SKIN=phosphor` (stored **raw**, not JSON). To shoot fullscreen or the running
  walkthrough you must click a button first — `scripts/shoot.mjs` can't, so I wrote
  throwaway puppeteer scripts in the scratchpad (they must live in the **project root**
  to resolve `puppeteer`, since ES-module imports ignore `NODE_PATH`). All cleaned up.
- **The bug that needed instrumentation:** "walkthrough text hiding under the header"
  only reproduces with a **short window + scrolled stage** — the default 720px-tall
  view fits all content, so a plain screenshot looks fine. I confirmed it by reading
  the caption's `getBoundingClientRect().top` vs the header bottom in-page.
- **All in-app graphics use theme tokens only** (no hardcoded hex). The gallery
  preview (`SkellamPreview` in `chrome/previews.tsx`) now also reads live tokens via
  `getComputedStyle` — it's the **model** for a `[chrome] !med` TODO to roll that
  across all previews/canvases. Not urgent per Dan.
- **Microsatellite framing is intentional** (Dan's real use case: repeats gained −
  lost). The app keeps a *Microsatellite | Generic X, Y* label toggle.
- Shared append-only files (`index.tsx`, `apps.ts`, `catalog.ts`, `README.md`,
  `CLAUDE.md`) already carry this app's entries; don't reorder them.

> [!IMPORTANT]
> The two color channels are named by **role** (`distribution` = `--accent`,
> `selection` = `--accent-2`), never by hue — the skins swap the actual colors. Keep
> any new UI/legend/comment copy hue-neutral.

## Self-reflection

1. **What would you do with another session?** Build the cumulative Lab — the named
   follow-up. Add accumulator state across runs (pooled samples or a running
   mean/variance), a μ̂-vs-total-samples convergence trace, and a μ̂ scatter/spread so
   you can watch the estimator concentrate. That's the one place the app is visibly
   thinner than its Explain half.
2. **What would you change about what you produced?** Two changes needed a correction
   round each because I moved before fully reading intent: the fullscreen fill first
   *enlarged the grid* (Dan had just asked to shrink it), and the two-channel color was
   briefly inverted. Both were cheap to fix but avoidable — I should have restated the
   goal ("grid stays small; fill with the distributions") before coding.
3. **What were you not asked that you think is important?** Whether the off-grid
   "diagonal runs past the edge →" indicator and the truncated tail are legible enough
   to a first-time viewer — it's a subtle correctness cue that's easy to miss.
4. **What did we both overlook?** The Lab's weakness (independent one-off rows, no
   accumulation) was present from the first build and only surfaced at the end; it
   could have been designed cumulative from the start. And the sticky-caption bug only
   exists because the stage scrolls in short windows — a layout smell we didn't catch
   until a real-size test.
5. **What did you find difficult?** Reproducing the "text under the header" report —
   the default screenshot looked perfect, so I had to instrument DOM geometry and force
   a short-window + scroll state to see it. The user's actual (persisted, resized)
   layout isn't reachable from the screenshot harness.
6. **What would have made this task easier?** A way to seed the screenshot harness with
   the user's persisted workspace layout (`localStorage ws:<appId>`), so I'd see the
   exact window sizes Dan sees instead of always the defaults.
7. **Follow-up value:** MEDIUM — the Explain mode is complete and verified, but the Lab
   is explicitly incomplete (one-off rows, no cumulative view) and is the clear, scoped
   next task.
