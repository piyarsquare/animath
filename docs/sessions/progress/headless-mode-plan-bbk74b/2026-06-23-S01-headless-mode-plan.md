---
kind: progress
session: 2026-06-23-S01
date: 2026-06-23
title: Plan the headless mode build-out (debug-pose harness + mobile smoke)
branch: claude/headless-mode-plan-bbk74b
slug: headless-mode-plan-bbk74b
status: in-progress
build: unknown
followup: null
pr: null
app: docs, engine
signals: needs-dan
next: Confirm scope/priorities, then write the kind:plan report for the L1 harness + mobile smoke
---

# Plan the headless mode build-out (debug-pose harness + mobile smoke)

## Session purpose

Build out the **headless mode** for animath. Review all existing documentation on
the problem (reports + TODO), then develop a *complete plan* for the work. This is
the **L1 positive check** from `RECURRING_LESSONS.md` — the highest tool-ROI item
in the 2026-06-22 process audit, requested independently three times across the
topology sessions and filed `!high` in `TODO.md`.

## Previous session

First tracked session on this branch (no handoff folder yet). The work descends
from two prior threads:

- [headless-webgl-cloud 2026-06-07-S01](../headless-webgl-cloud/2026-06-07-S01-headless-webgl-tooling.md)
  — built the **screenshot tooling** that exists today (`scripts/shoot.mjs`,
  `scripts/install_headless_webgl.sh`, `docs/HEADLESS_WEBGL.md`, the `SessionStart`
  hook). Status **completed**, PR #187. That gave us the *ability to render a
  frame*; this session plans the *ability to render a chosen frame and to assert on
  it*.
- [process-audit-collaboration 2026-06-22-S01](../process-audit-collaboration-tvrn9b/2026-06-22-S01-process-audit-findings.md)
  — Tier-1 recs **2 & 3** (debug-pose harness + dev HUD; mobile-viewport smoke) are
  the spec this plan executes. Both filed OPEN, own branch.

## Working notes

### 🔵 finding · 12:50 — Reviewed all headless documentation; the task is L1's two named checks
**Why:** the focus said "review all the documentation on this problem in reports and todo" before planning.

The "headless mode" build-out is precisely the **L1 positive check** named in three
places that all agree:

- `RECURRING_LESSONS.md` L1 (~14 recurrences, 🟡 rule-only): *"Verified headless,
  never on a real device."* The rule + signals exist; the **check is missing** — the
  deep-link debug-pose harness + headless mobile smoke.
- `TODO.md` line 48 (`!high`, own branch): two deliverables —
  **(a)** a URL param that sets camera/world/pose so `shoot.mjs` can reproduce an
  *exact* frame, plus an opt-in **dev HUD** (player determinant, current tile,
  nearest-marker distance); **(b)** a `shoot.mjs` pass at **390×844** across all
  routes asserting **no console error / no NaN-in-shader**.
- Process-audit findings Tier-1 recs 2–3 (the originating spec).

What already exists (don't rebuild): `scripts/shoot.mjs` (route + out-path args;
`SEED_LS`, `SKIN`, `WAIT_MS`, `VIEWPORT` env knobs; prints the live WebGL renderer
string; waits for `<canvas>`), the cloud install hook, and `npm run shoot`.

Why it matters (the defects it would have caught, per the audit): the
**teleporting-world** and **spoofed-probe** cases (W1/W3 — a green invariant on a
visually-wrong render), and the **#216 Torus crash / #215 height** runtime defects
that escape the `tsc && vite build` gate.

### 🔵 finding · 13:10 — Walker pose surface mapped; precedents already exist
**Why:** deliverable (a) needs the exact state, engine seams, and URL/HUD precedents to be a real plan.

- **URL parse precedent already in-repo:** `TrinaryLab.tsx` uses
  `new URLSearchParams(window.location.hash.split('?')[1] ?? '')`; the router
  (`index.tsx:65`) already splits `?query` off the path; PolygonWorlds already
  reads `location.search.includes('polydebug')` to expose `window.__poly`.
- **Diagnostics already computed:** SolidWorlds `getChirality()` (determinant ±1,
  rotation angle) + `getMapState()` (u,v,w, cell) in `coverEngine.ts:724-741`;
  PolygonWorlds `mapState.flipped` + u,v + `getPose()` exposed on the engine.
  **Nearest-marker distance is the one quantity not yet computed** (needs a
  landmark scan).
- **HUD templates exist:** `ChiralityHUD` (SolidWorlds) and `SquareMiniMap`
  (PolygonWorlds) are both rAF-loop overlays reading a getter — copy them for a
  shared `DebugPoseHUD`.
- **The seam to add:** PolygonWorlds engine exposes `getPose()` but **neither
  walker exposes a pose *setter***; SolidWorlds engine only has `recenter()`. So
  the harness must add a `setPose(...)` to each engine interface.
- **Why URL params (not just `SEED_LS`):** `worldId`/`thirdPerson`/`camDistance`
  are **session-only `useState`** (not persisted), so `SEED_LS` can't reach them —
  a deep-link param is the only way to pin world + camera for a shot.

### 🔵 finding · 13:05 — Smoke-pass surface mapped (routes + how the crash class shows up)
**Why:** the plan's deliverable (b) needs the exact route enumeration and a real detection mechanism, not a hand-wave.

Exploration of `src/index.tsx` + `src/apps.ts`: **19 resolvable hash routes**
(13 public catalog + 4 legacy/merged: `#/fractals-cpu`, `#/mobius`, `#/wrap-world`,
`#/trinary-lab` + 2 embeds). **10 are WebGL** (Three.js/Canvas3D), **9 DOM/CSS**
(Argand, AgenticSorting, StableMatching, Fractals2D-CPU=Canvas2D, Gallery).

Key technical finding for NaN detection: **Three.js swallows shader-compile errors**
— they never reach `console`. The #216 Torus crash surfaced as **WebGL context
loss / black canvas** (a NaN written to a varying via `normalize(cross(du,dv))` with
a ~0 cross product; SwiftShader tolerates it, real mobile GPUs hard-crash). So the
smoke pass needs **three detectors**, not just console scraping:
1. `page.on('console', type==='error')` + `page.on('pageerror')` → exit non-zero
   (already half-wired in `shoot.mjs:52-54`).
2. A `webglcontextlost` listener (animath has **none** today) — register one before
   boot and fail if it fires.
3. A `gl.readPixels` framebuffer scan for NaN/all-black after settle.

Conventions to match: `verify-*.ts` scripts exit 0/1; `shoot.mjs` is `.mjs`/ESM,
waits for `<canvas>` (8 s) then `WAIT_MS` (2500, bump to ~3500 for HDR on
ComplexParticles). All apps are `React.lazy` (Suspense `LoadingScreen`).

### 🟣 decision · 12:55 — Scope pinned with Dan (3 answers)
**Why:** L2 ("build the full thing before asking") is itself the audit's top lesson; pin scope before drafting.

1. **Harness reach:** *Topology walkers first* — build the URL-pose param + dev HUD
   for **SolidWorlds & PolygonWorlds** (where teleporting-world / spoofed-probe bugs
   lived), with a **generic convention** others can adopt later. Not all WebGL apps.
2. **Mobile smoke CI:** *Advisory now, gate later* — ship `npm run smoke` + doc,
   wire into `deploy.yml` as a **non-blocking** step (`continue-on-error`) like
   `sessions:lint`, promote to a hard gate once proven quiet.
3. **Deliverable:** *Plan only this session* — write the complete `kind: plan`
   report (`status: proposed`); implementation is a later branch. Optional
   `/three-hats` review of the plan.

### 🟡 milestone · 12:50 — Session oriented; drafting the plan next
**Why:** progress report is the session's memory; record the orientation before planning.

Branch `claude/headless-mode-plan-bbk74b` (first session). The deliverable is a
plan, not yet code — a `kind: plan` report in this branch's `progress/` folder.
</content>
</invoke>
