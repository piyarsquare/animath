---
kind: progress
session: 2026-06-11-S01
date: 2026-06-11
title: To-do review — order and priority
branch: claude/review-todo-prioritize-g66uqj
slug: review-todo-prioritize-g66uqj
status: in-progress
build: passing
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

### 🟡 milestone · 19:55 — Debt pass complete: lint 0 errors · build green · 22 tests
**Why:** Every item from the execution plan landed; recording the final state
before commit.

All verified on the final tree: `npm run lint` 0 errors (60 baseline warnings,
all `exhaustive-deps`/`no-explicit-any` by config), `npm run build` green,
`npm test` 22 passed (2 new for `validateLayouts`), all five headless probes
pass on the refactored shared lib (fullscreen/actionbar/split/hints/raf).

### 🟢 code · 19:50 — Ledger #2 debt: probe-lib extraction + layout validation
**Why:** The two debt-flavored items from the chrome ledger / chrome-overhaul
self-reflection were small enough to land now.

- `scripts/probe-lib.mjs`: shared launch/page/checker/onTop harness; the five
  probes drop from 435 lines to ~250 + lib, each now ~20 lines of boilerplate
  lighter. Verified by running all probes against the built app — green.
- `validateLayouts` in `chrome/workspace/layouts.ts` + dev-time `console.warn`
  in `DesktopWorkspace` (mirroring `validateActions`): flags authored panel
  rects with `x < WS_RAIL` (78) that would open under the floating rail — the
  Trees-and-Nets `x:16` bug class. Unit-tested.

### 🟢 code · 19:45 — ESLint adopted: 121 errors triaged to 0
**Why:** CLAUDE.md debt item 1; lint-only by decision (no Prettier — a
repo-wide reformat is hostile to the parallel-branch workflow).

`eslint.config.mjs` (flat): JS + typescript-eslint recommended +
`react-hooks/{rules-of-hooks,exhaustive-deps}`. Two scoping decisions:
**(a)** the react-hooks v7 "recommended" React Compiler rules
(refs/immutability/purity/set-state-in-effect, 95 of the 121 initial errors)
are excluded — they reject the deliberate ref-mutation patterns the Three.js
engine is built on; **(b)** `no-explicit-any` and `exhaustive-deps` are
warnings. The remaining 25 errors were genuine and fixed: 11 unused
imports/vars deleted (incl. a vestigial `active` loop flag in StableMarriage
whose 9 dead stores were the `no-useless-assignment` hits), 4
`i ? lineTo : moveTo` ternary-statements converted to if/else, 4 stale
eslint-disable directives removed, 1 prefer-const. `npm run lint` added to
package.json; AGENTS.md/CLAUDE.md/BUILDING_AN_APP.md document the gate.

### 🟢 code · 19:40 — Quick wins + docs debt + XSS + audit
**Why:** The unambiguous deletions and doc-rot fixes from tracker #4.

- Deleted: `lib/ParticleDisplay.ts`, `lib/R2Mapping.ts`, `src/materials/`
  (orphans, grep-verified unimported), `requirements.txt`, `run/setup.sh`.
- `PLAN.md` rewritten as the **prioritized roadmap** (Now / Next / Decisions
  needed / Later / Standing chores) — the session's chartered deliverable.
- `AGENTS.md` was badly stale (old AppShell chrome, "no automated tests",
  HTML session reports) — rewritten against the current workspace framework.
- `ARCHITECTURE.md` banner already existed; refreshed (AppShell → workspace
  chrome; notes the deleted orphans). IDEAS.md's three Hopf entries reconciled
  with the decision-log removal (marked ❌ later removed / obsolete).
- `Readme.tsx`: `marked` output now passes through `DOMPurify.sanitize`.
- `npm audit fix` cleared the **rollup high** advisory in place. The two
  esbuild/vite moderates need a breaking vite major (5→8) — deferred as its
  own chore in PLAN.md (dev-server-only exposure).
- Stale-entry finding: the deploy.yml duplicate `configure-pages` step was
  already fixed; CLAUDE.md Known Issues rewritten to the true remaining set.

### 🟣 decision · 19:35 — Session scope: fill the debt (tracker #4 + ledger #2)
**Why:** User directed the session at the debt rather than a pure ranking
exercise: "address 4 [CLAUDE.md Known Issues] and the unresolved items in 2
[the IN-PROGRESS chrome ledger]."

Execution plan, in order:

1. **Quick wins** — delete the confirmed-orphan files (`lib/ParticleDisplay.ts`,
   `lib/R2Mapping.ts`, `src/materials/`), the empty stubs (`requirements.txt`,
   `run/setup.sh`); the deploy.yml duplicate `configure-pages` step turned out
   to be **already fixed** (stale debt entry).
2. **PLAN.md** — stale (its 8 steps are done or abandoned); repurpose it as the
   prioritized roadmap this session was chartered to produce.
3. **Docs debt** — ARCHITECTURE.md historical banner; AGENTS.md is badly stale
   (still describes the old AppShell chrome, "no automated tests", HTML session
   reports) — refresh it; reconcile IDEAS.md's Hopf-study entry with the
   decision-log removal; update CLAUDE.md Known Issues.
4. **XSS** — sanitize `Readme.tsx` output with DOMPurify.
5. **npm audit** — 3 vulns (esbuild/vite moderate, rollup high), clean fix
   path claimed by `npm audit fix`; apply + verify build.
6. **Linter** — adopt ESLint (lint-only; no Prettier — a repo-wide reformat is
   hostile to the parallel-branch workflow). Gauge violations first, scope the
   config to high-signal rules.
7. **Ledger #2 debt items** — `scripts/probe-lib.mjs` extraction; dev-time
   warning for authored panel rects under the rail band. Feature-sized ledger
   items (keyboard window management, gallery search, zoom-lock, skin-aware
   palettes, embeds phase 2, P3/P4b) get **prioritized in PLAN.md**, not built.

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
