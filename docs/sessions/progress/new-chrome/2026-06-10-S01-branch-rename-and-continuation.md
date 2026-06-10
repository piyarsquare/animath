---
kind: progress
session: 2026-06-10-S01
date: 2026-06-10
title: Branch rename to new-chrome + continuation
branch: claude/new-chrome
slug: new-chrome
status: in-progress
build: unknown
followup: null
pr: null
app: null
---

# Branch rename to new-chrome + continuation

## Session purpose

Rename the auto-generated branch `claude/dazzling-goodall-1afsbr` to
`claude/new-chrome`, migrate the session reports to the new slug, then continue
the workspace-chrome redesign work from the previous handoff.

## Previous session

[2026-06-09-S01](../../handoff/new-chrome/2026-06-09-S01-design-language-overhaul.md)
— completed the full chrome/UX redesign: all 11 apps migrated onto the new
workspace engine, legacy AppShell deleted, build green, routes
screenshot-verified. Open items: open a PR (sync main first), carried-forward
design gaps in `docs/redesign/IN-PROGRESS.md`, touch-hardware pass.

## Working notes

### 🟢 code · 01:09 — App-specific gallery preview animations (one flavor per app)
**Why:** the user asked for thumbnail animations that are app-specific and
relevant — the gallery had 3 shared flavors across 10 cards (Topology Walk,
Polygon Worlds, and both matching apps all showed the three-star preview).

Kept the recorded "cheap 2D canvas, not real renderers" decision and authored
7 new flavors in `chrome/previews.tsx`: a warping plane grid morphing under
f(z)=z² (Plane Transform), a Mandelbrot↔Julia split pane where c orbits the
cardioid and its Julia set morphs live (Correspondence), a twisting
first-person wireframe corridor (Topology Walk), an animated Gale–Shapley
proposal round driven by a real module-scope simulation (Stable Marriage),
three concurrent bubble-sort agents racing over a bar array (Agentic
Sorting), a preference heatmap whose matching walks the lattice (Stable
Matching), and a geodesic walker wrapping a glued-square torus with
edge-identification arrows (Polygon Worlds). The Mandelbrot card now
palette-cycles (iteration field computed once, recolored per frame via LUT).
Verified all 10 cards + Paper skin via headless shots.

> [!CAUTION]
> Found while debugging two black cards: **rAF timestamps can precede a
> `performance.now()` captured earlier in the same effect**, so the first
> frame's `t` was slightly negative and JS `%` keeps sign — `events[-1]`
> crashed the draw loop. `useCanvas` now clamps `t ≥ 0` for every flavor.

![per-app previews: corridor, trinary, marriage, sorting, matrix, polygon](assets/2026-06-10-S01-previews-per-app.png)

### 🟢 code · 00:54 — View windows: fullscreen mode + phone resize grip
**Why:** the user asked for resizable viewports and a full-screen mode,
particularly on mobile — phone view cards were locked at `56vw`/340px with no
way to grow them.

Fullscreen is a **CSS-only restyle of the same DOM node** (`position: fixed;
inset: 0`) so WebGL contexts survive and `Canvas3D`'s ResizeObserver adapts;
it's transient state (not persisted), exits via the header button or Esc. On
desktop the stage gets `.am-has-full` (z-index 100) so the overlay covers the
top bar (`.am-stage` is `isolation: isolate`, so the fixed child's z-index is
capped by the stage's own level). Phone cards gain a bottom **resize grip**
(pointer-drag, clamped 140px–80vh) with per-view heights persisted under
`animath:v1:wsphone:<appId>`. One new chrome icon `shrink` (inward corners)
mirrors `expand`. Verified by driving headless Chromium: clicked the toggle
and dragged the grip on `#/complex-particles` at 1280×800 and 390×844.

![phone card taken fullscreen](assets/2026-06-10-S01-phone-fullscreen.png)

![phone card height-resized via the grip](assets/2026-06-10-S01-phone-resized.png)

![desktop view window fullscreen over the top bar](assets/2026-06-10-S01-desktop-fullscreen.png)

### 🟢 code · 00:52 — Fixed dead screenshot on the deployed session pages
**Why:** the user reported a dead image link on the deployed preview of the
S01 report.

Root cause was not the rename: the S01 progress report embedded
`../../../redesign/shots/p4-complex-particles.png`, a ref that climbs out of
the report's folder. `build-sessions.mjs` mirrored the carried blob to
`docs/sessions/redesign/…` — *outside* `converted/` — and
`copy-sessions-to-dist.mjs` only ships `converted/**`, so the deployed page
404'd (the old slug's page had the same dead link before the rename). Two
fixes: the report now uses an in-folder `assets/p4-complex-particles.png`
copy (per REPORT_STYLE convention), and the build re-homes any escaping ref
under `assets/carried/` inside the converted tree, rewriting the body ref, so
future cross-folder refs can't 404 on Pages.

> [!NOTE]
> The deployed site rebuilds only on a push to `main` (or manual dispatch),
> using `main`'s copy of `build-sessions.mjs` — the report-side fix takes
> effect on the next deploy; the script hardening lands when this branch
> merges.

### 🟡 milestone · 00:37 — Session start on renamed branch
**Why:** orient before continuing the redesign work.

Read the S01 handoff, created this progress report under the new slug. Awaiting
the user's direction on which open item to pick up (PR finalization vs.
carried-forward gaps).

### 🟢 code · 00:36 — Branch renamed; old PR closed
**Why:** the user asked for the auto-generated branch name to be replaced with
a topical one before continuing.

Created `claude/new-chrome` at the tip of `claude/dazzling-goodall-1afsbr` and
pushed it. Moved `docs/sessions/{progress,handoff}/dazzling-goodall-1afsbr/` to
`…/new-chrome/` and updated the branch/slug references in both reports and in
`docs/redesign/IN-PROGRESS.md` (commit `d01ded3`). Closed PR
[#199](https://github.com/piyarsquare/animath/pull/199) (it pointed at the old
head).

> [!WARNING]
> Deleting the old remote branch over git was rejected (HTTP 403 — the proxy
> in this environment doesn't permit branch deletion), so
> `claude/dazzling-goodall-1afsbr` still exists on origin and needs a manual
> delete in the GitHub UI.
