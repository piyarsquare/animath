---
kind: progress
session: 2026-06-11-S01
date: 2026-06-11
title: To-do review — order and priority
branch: claude/review-todo-prioritize-g66uqj
slug: review-todo-prioritize-g66uqj
status: in-progress
build: unknown
followup: null
pr: null
app: general
---

# To-do review — order and priority

## Session purpose

Review outstanding items on the to-do list across the repo's trackers and
establish an order and priority for upcoming work.

## Previous session

First tracked session on this branch. For continuity, the most recent handoff
across all branches is the chrome overhaul
([app-chrome-overhaul-lnqgle/2026-06-10-S01](../../handoff/app-chrome-overhaul-lnqgle/2026-06-10-S01-app-chrome-overhaul.md))
— its PR #208 has since **merged to main** (commit `5732b95`), closing its main
open item. No PRs are currently open on the repo.

## Working notes

### 🔵 finding · 19:29 — Orientation sweep: where the to-dos live
**Why:** The session's subject is the backlog itself, so the first step is
locating every tracker and reading current state.

Outstanding-work trackers found, with state as of `main` @ `5732b95`:

- **`IDEAS.md`** — particle-viewer backlog; almost everything ✅ shipped. Open:
  the **unified channel-mapping control** (deliberately deferred, big),
  **custom-f expression** stretch goal, **Hopf study preset refinements**
  (deferred; note IN-PROGRESS records Hopf fiber overlay + study view were
  later *removed* in the projection-slider redesign — reconcile), plus small
  pattern follow-ups (annulus `rMin`, phyllotaxis, per-pattern density).
- **`docs/redesign/IN-PROGRESS.md` → "Still open after implementation"** —
  chrome ledger: keyboard window management, Correspondence zoom-lock,
  skin-aware canvas palettes, saved-layout management (rename/export), gallery
  search, archetype icon collisions, phone landscape/sheet limits, embeds
  phase 2 (`s=` param + share dialog).
- **Chrome-overhaul deferrals** (three-hats ruling): **P3** `ViewDef.hud`
  (design against TopologyWalk's real overlays), **P4b** phone fullscreen dock
  access; hardware phone pass never done; `scripts/probe-lib.mjs` extraction.
- **`docs/FUTURE_APPS.md`** — next app wave: Cellular Automata, Fireflies,
  Murmurations, Ant Colonies, Glassy Networks, Fourier, Eigenvalues, Heat
  Kernel, Clustering (+ Quantum Tree ✅ landed as Trees and Nets; GAS pending
  source). Shared investment flagged first: `lib/spectral`.
- **`CLAUDE.md` → Known Issues** — no linter/formatter, duplicate
  `configure-pages` deploy step, orphaned utilities, empty placeholder files,
  `Readme.tsx` XSS surface (unsanitized `marked`), aspirational
  ARCHITECTURE.md. `PLAN.md` is stale (describes already-done or abandoned
  steps 1–8).
- **Handoff follow-up flags** (Reflections digest): recent HIGHs are all on
  the polygon-worlds line (S03 two-sided sheet, S05 trail/path-reset —
  "path demonstration must be redesigned"); recent MEDIUMs: Trees and Nets
  (representation follow-ups), agentic-sorting objectives, gale-shapley
  manipulation/extensions, polygon sign-orientation, three-hats particle app.
  Stable Marriage Tier 5 (preference falsification) awaits a product decision.

No open PRs; `npm audit` reports 3 vulnerabilities (2 moderate, 1 high) at
install time — worth a look during the debt pass.
