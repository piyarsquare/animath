---
kind: handoff
session: 2026-06-06-S01
date: 2026-06-08
title: Stable Matching rebuild + Markdown session reporting
branch: claude/stable-marriage-styling-ulMPt
slug: stable-marriage-styling-ulMPt
status: in-progress
build: passed
followup: medium
pr: https://github.com/piyarsquare/animath/pull/189
app: StableMatching
---

# Stable Matching rebuild + Markdown session reporting

> [!NOTE]
> Long session, two distinct threads on this branch. (1) Migrated the whole
> session-reporting system from HTML to **Markdown + a cross-branch control
> center** (that work landed on `main` via PR #191, then merged back here).
> (2) Built a **new app, Stable Matching**, from scratch. The original
> `#/stable-marriage` is **untouched and still live**. `npm run build` passes.

## Summary

The user asked to bring the old StableMarriage lab "up to par." A three-hats review
concluded the real issues were correctness/structure, not styling, and the user chose
to **rebuild as a new app** (`#/stable-matching`) and switch over later, rather than
repair in place. We built it engine-first and then iterated hard on the visualization
toward exploring the **solution space** of stable matching. Nothing has been switched
yet; the new app lives alongside the old.

## What changed

### New app: `src/animations/StableMatching/`
- **`model.ts`** — seeded common-preference generator: each member has a latent
  `quality`; lists blend it with private noise weighted by **Consensus** (0 = private
  taste, 1 = everyone shares one ranking). Precomputed rank matrices.
- **`galeShapley.ts`** — pure engine:
  - `oneSided(inst, side)` — classic GS (proposer-optimal, always stable).
  - `market(...)` — one-proposal-at-a-time mixed (legacy; not used by the UI now).
  - **`runRounds(inst, schedule, bias, seed)`** — **synchronous rounds**: a whole side
    proposes at once; receivers keep their single best, reject the rest. `schedule` ∈
    `A | B | alt | random`. This is what the visualizer/lab use.
  - `blockingPairs`, `stats`, `extremal` (the extremal-gap metric, currently unused in UI).
- **`StableMatching.tsx`** — framework-native (ShellSettings/ShellActions + ControlPanel
  + `usePersistentState`). **Visualizer**: an A×B **Lego matrix** (square = A's rank of
  B, circle = B's rank of A) on a **BuRd** diverging scale (blue #1 → red worst), fit to
  screen, numbers only when cells are big. Orderings: attractiveness / settle-round /
  **match-diagonal** / original; **live re-sort**; cell views Both/A→B/B→A/Difference;
  **total-rank** welfare headline + distribution + stability; per-round narration + a
  parameter-driven **story** line; tight-grid toggle; purple reject/"stole-away" flashes
  + fading **failure trail**. **Lab**: surfaces by schedule — **Ranks (A·B)** as Lego
  cells, **Unstable %**, **Avg blocking pairs** (replicated trials per cell).
- `EXPLAINER.md`, `README.md`, `stableMatching.css`.
- Registered append-only: `src/index.tsx` (route `/stable-matching`) + `src/apps.ts`.

### Session reporting → Markdown (earlier in the session, now on `main`)
Reports are **Markdown + YAML frontmatter** (`docs/sessions/REPORT_STYLE.md`);
`npm run sessions` (`docs/sessions/build-sessions.mjs`) renders the rich HTML + a
**cross-branch control center** read-only across all branch tips; `convert-html.mjs`
migrates old HTML; skills (`start-session`/`handoff`/`three-hats`) emit Markdown.
Deploy wired in `deploy.yml` (publishes to `/animath/sessions/`, noindex).

## Key files

| File | Role |
|---|---|
| [`src/animations/StableMatching/galeShapley.ts`](https://github.com/piyarsquare/animath/blob/689a42a/src/animations/StableMatching/galeShapley.ts) | engine: `runRounds` (synchronous schedules), one-sided GS, stability/stats/extremal |
| [`src/animations/StableMatching/model.ts`](https://github.com/piyarsquare/animath/blob/689a42a/src/animations/StableMatching/model.ts) | seeded common-preference generator + rank matrices |
| [`src/animations/StableMatching/StableMatching.tsx`](https://github.com/piyarsquare/animath/blob/689a42a/src/animations/StableMatching/StableMatching.tsx) | the app: Lego matrix, orderings, Lab surfaces |
| [`src/apps.ts`](https://github.com/piyarsquare/animath/blob/689a42a/src/apps.ts) · [`src/index.tsx`](https://github.com/piyarsquare/animath/blob/689a42a/src/index.tsx) | catalog + route (append-only) |

## What we learned (the math)

> [!IMPORTANT]
> **Synchronous two-sided deferred acceptance is usually NOT stable.** A 3,000-instance
> sweep (n=10): one-sided A/B = **0% unstable**; **Alternate 70–92%**, **Random 56–78%**,
> typically **2–3.5 blocking pairs** (not a last-round artifact). It's worst mid-consensus
> and fades to stable at full consensus (unique stable matching). Kin to the assignment
> problem (cavity/replica ζ(2)) and a frustrated/"glassy" landscape; consensus acts like
> an order/disorder knob.

## Open / not done

- **The switch**: `#/stable-marriage` still points at the old app. When the new one is
  blessed, repoint the route and retire `src/animations/StableMarriage/`.
- **Stabilize (Roth–Vande Vate) repair** — discussed, not built: from an unstable result,
  repeatedly satisfy a blocking pair until stable (always converges; harder at low
  consensus — a nice "repair-steps" Lab surface). Would animate the purple blocking cells.
- **A/B framings** — user is brainstorming concrete domains (applicants/employers, etc.);
  labels are isolated for an easy swap. **Many-to-one / capacity** (slots) — phased later;
  engine extends by holding top-c.
- `extremal()` / proposer-advantage is in the engine but no longer surfaced (welfare/total
  rank replaced it as the headline). Decide whether to keep.
- **Reporting system rollout**: other active branches still on HTML reports adopt Markdown
  on rebase (see `docs/sessions/MIGRATION.md`); the control-center deploy goes live when
  `main` next deploys.

## Context

- Three open PRs at session end: **#191** (control-center, **merged**), **#189** (this
  branch), **#190** (polygon-worlds, independent). #189 was rebased onto `main` to adopt
  the Markdown system (its reports were converted to `.md`).
- The full design rationale lives in this session's other progress reports:
  `2026-06-06-S01-status-and-roadmap.md` and the four `…-expert-*.md` three-hats reviews.
- Verification this session was by **screenshots** (`npm run preview` + `scripts/shoot.mjs`
  / puppeteer driving `#/stable-matching`); it's a DOM/CSS app, no WebGL.

## Self-reflection

- **Confidence**: high on what's built (build passes; behaviors screenshot-verified). The
  instability finding is from a faithful port of the engine into a throwaway sim (`/tmp`),
  3,000 instances — solid, though not committed.
- **What I'd change**: the engine kept `market`/`extremal` that the UI no longer uses —
  worth pruning or resurfacing. Live re-sort can look jumpy at speed (parked).
- **Not done / risks**: no automated tests (only `npm run build`); the app has grown large
  (~one ~650-line component) and could use the same kind of extraction the three-hats
  review recommended for the *old* app. The switch + cleanup of the old app is the biggest
  pending decision.
- **For the next agent**: drive `#/stable-matching`, push the consensus sliders and try
  Schedule = Alternate (watch it go unstable), and the Lab's Unstable % vs Ranks(A·B)
  Lego surfaces. Then either build the Stabilize repair or move on the switch.
