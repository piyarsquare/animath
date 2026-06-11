---
kind: handoff
session: 2026-06-10-S01
date: 2026-06-11
title: Agentic Sorting — legibility pass (presets, on-ramp layout, relabels, dedup)
branch: claude/agentic-sorting-app-j6ngd4
slug: agentic-sorting-app-j6ngd4
status: completed
build: pass
followup: MEDIUM
pr: null
app: agentic-sorting
---

# Agentic Sorting — legibility pass (presets, on-ramp layout, relabels, dedup)

> [!NOTE]
> Code changes only — no behavior was removed except the redundant **Replicate**
> panel. Build green at every commit; verified by eye in headless Chromium.

## Summary

The Agentic Sorting app was functionally complete but read as "a hot mess" to the
user. A second `/three-hats` review (all three experts: *don't rewrite, fix the
surface*) drove a legibility pass: a **Scenarios** panel of five one-click presets,
a reworked default layout that finally shows the signature **Trajectories** plot,
a sweep of relabels, removal of the duplicated **Replicate** panel, and a small
code tidy. It landed in six build-green commits and was verified with screenshots
(including an interaction test that drove a preset and watched the array sort).
Three follow-ups were **registered, not built** (see Open / not done).

## What changed

- **Removed Replicate** — it duplicated the Lab's Monte-Carlo; gone with its 5
  state vars + callback. Renamed `Lab.tsx` → `LabResults.tsx` (ended a name clash
  with the *Lab* top-bar mode). Re-tagged *Track agent* `lab` → `readout`.
- **Scenarios presets** — five one-click demos (Clustering · Robustness · Delayed
  gratification · Phase separation · "the even mix is slow"). Each sets the
  population / objective / color that makes one idea visible and starts the run.
  The last switches into the Lab and **auto-runs** the Strategies comparison via a
  `pendingLabRun` flag + effect.
- **On-ramp default layout** — the new default **Explore** leads with Scenarios +
  Run on the left and **both** the arena and the Trajectories plot on the right
  (the signature visual was previously hidden behind a slider-wall). Added
  **Tinker** (all controls) and **Analyze** (metrics + track + traj).
- **Relabels** — arena Positive/Negative → **High/Low value**; tracker
  "goal" → **home**; Trajectories gained a `time →` axis + clearer legend;
  objective hint now tagged **Levin-faithful vs animath-original** at the point of
  choice; a note marks Objective/Frozen as shared with the Sandbox while array
  size/wake are Lab-only; dropped the per-algotype blurbs from the mix panel (the
  `?` guide carries the rule table).
- **Code tidy** — extracted a `useCanvas2D` hook that collapses the two
  near-identical DPR ResizeObserver effects. Deliberately stopped there (see
  Context).
- **Visual fixes from screenshots** — Run panel was overlapping Scenarios (moved
  to `y:484`); the new `time →` label collided with the bottom-right axis label
  (legend → top-left, `time →` → bottom-left).

## Key files

| File | Role |
|---|---|
| [`AgenticSorting.tsx:406`](https://github.com/piyarsquare/animath/blob/8401608/src/animations/AgenticSorting/AgenticSorting.tsx#L406) | `presets[]` — the five scenario definitions (each an `apply` closure) |
| [`AgenticSorting.tsx:398`](https://github.com/piyarsquare/animath/blob/8401608/src/animations/AgenticSorting/AgenticSorting.tsx#L398) | `pendingLabRun` effect — auto-runs the Lab after the "even mix is slow" preset switches mode |
| [`AgenticSorting.tsx:796`](https://github.com/piyarsquare/animath/blob/8401608/src/animations/AgenticSorting/AgenticSorting.tsx#L796) | `sandboxLayouts` — Explore (default) / Tinker / Analyze |
| [`useCanvas2D.ts`](https://github.com/piyarsquare/animath/blob/8401608/src/animations/AgenticSorting/useCanvas2D.ts) | DPR-aware canvas hook (deduped the two ResizeObservers) |
| [`LabResults.tsx`](https://github.com/piyarsquare/animath/blob/8401608/src/animations/AgenticSorting/LabResults.tsx) | renamed from `Lab.tsx` |
| [`IN-PROGRESS.md:79`](https://github.com/piyarsquare/animath/blob/8401608/docs/redesign/IN-PROGRESS.md#L79) | registered the chrome-wide **archetype icon collisions** gap |

## Open / not done

Three follow-ups the user asked to **register, not build** this session:

1. **Lab ↔ Sandbox connection.** The two modes share Objective/Frozen and the
   "even mix is slow" preset crosses the boundary, but the bridge is still thin.
   Worth exploring: "send the current Sandbox mix to the Lab as a saved mix,"
   "run this exact Sandbox config as a batch," and feeding a Lab result back into
   a Sandbox demo so the cause→effect loop closes.
2. **Better onboarding; "mixes" probably belong under Population.** The Lab's
   *saved mixes* concept and the *Population mix* panel are conceptually the same
   object introduced twice. Unify/stage them so a newcomer meets algotypes →
   mixes → objective in one place rather than rediscovering "a mix" in the Lab.
3. **Chrome-wide: one icon, many meanings.** Registered in
   [`IN-PROGRESS.md`](https://github.com/piyarsquare/animath/blob/8401608/docs/redesign/IN-PROGRESS.md#L79).
   The closed 11-icon vocabulary means panels sharing a tier share a glyph (this
   app: Metrics + Track both `readout`; Scenarios + Array both `subject`), so an
   icon-only glance is ambiguous. The user noted a **more expressive UI** is being
   explored separately — do **not** widen the frozen vocabulary unilaterally.

Lower-stakes: the **≤740px phone re-chrome** was never screenshotted this session.

## Context

> [!IMPORTANT]
> The code tidy was deliberately *stopped* after `useCanvas2D`. The experts'
> consultant suggested also extracting `<ObjectiveFrozen>` / `<PopulationMix>`,
> but on inspection the two objective/frozen call sites are **not** identical (the
> Sandbox copy carries the Levin-faithful hint; the Lab copy is compact and
> embedded among other condition sliders) and `agentsNode` is already a single
> reused node — extraction would add conditionals without simplifying. This
> matches the maintainer's explicit "don't churn" caution.

- **Verification harness:** `scripts/shoot.mjs '#/agentic-sorting' out.png` after
  `npm run build && npm run preview`. This is a DOM/CSS app (no WebGL), so the
  `webgl:{"ok":false}` line in shoot output is expected and harmless. To test a
  preset interactively, navigate, `document.querySelector('.as-preset')`-click by
  text, wait ~6s, screenshot (an ad-hoc puppeteer script must run **from the repo
  dir** so it resolves `puppeteer` from `node_modules`).
- **Persisted layout gotcha:** the default layout id changed `setup` → `explore`.
  Returning users with a persisted `ws:agentic-sorting` pointing at `setup` fall
  back to `explore` cleanly (Workspace ignores unknown layout ids).
- Per CLAUDE.md, this branch's shared-file edits stay append-only; only this app's
  folder + `IN-PROGRESS.md` were touched, so it stays conflict-free with `main`.

## Self-reflection

1. **What would you do with another session?** Build follow-up #1 (Lab↔Sandbox
   round-tripping) — it's the highest-leverage legibility win left and is now
   well-scoped. I'd also screenshot the phone layout, which I never saw.
2. **What would you change about what you produced?** The five presets set state
   but can't force the *workspace layout* (it's user-owned/persisted), so I made
   the default layout carry the right views and let presets only tweak settings.
   That works but couples "preset feels right" to "user hasn't customized the
   layout." A preset that could also nudge the layout would be more robust.
3. **What were you not asked that you think is important?** Whether the Lab's
   batch numbers are trustworthy as a teaching claim ("pure beats the even mix") —
   I never captured a golden seeded run as a regression oracle, so a future engine
   tweak could silently change the headline result.
4. **What did we both overlook?** The phone re-chrome — every change here was
   validated at 1280×800 only.
5. **What did you find difficult?** Nothing technically hard; the judgment call
   was where to *stop* the code tidy without over-churning a working app.
6. **What would have made this task easier?** A way for a preset to set the
   workspace layout imperatively (the framework has no such hook today), and a
   seeded golden-number fixture for the Lab.
7. **Follow-up value:** MEDIUM — the shipped surface is correct and verified, but
   the three registered items (especially Lab↔Sandbox and the onboarding/mixes
   unification) are where the real legibility gains still live.
