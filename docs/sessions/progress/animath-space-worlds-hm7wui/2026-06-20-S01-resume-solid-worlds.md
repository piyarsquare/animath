---
kind: progress
session: 2026-06-20-S01
date: 2026-06-20
title: Resume Solid Worlds (space worlds) — orient on a fresh branch
branch: claude/animath-space-worlds-hm7wui
slug: animath-space-worlds-hm7wui
status: in-progress
build: passing
followup: null
pr: null
app: solid-worlds
signals: null
next: Polish lived decor (first-person framing, more worlds) or hand off; Dan to review the two target worlds.
---

# Resume Solid Worlds (space worlds) — Lived seams decor prototype

## Session purpose

Make Solid Worlds feel **"lived in."** Per Dan's "topological interior decorator"
prompt: add a second visual mode to the existing `#/solid-worlds` app — a
**Decor: Diagnostic / Lived seams** flip switch in the View panel — where the
room looks inhabited by someone who understands the topology. The lived objects
must **use the face identifications** (pipes/shelves/ladders/floors that only
make sense because of the gluing), not just be furniture. Deep treatment for two
target worlds (**3-torus**, **Klein × Circle / amphicosm**); a sparse generic
fallback elsewhere. Visual/design layer only — no topology-engine changes.

## Previous session

First tracked session on **this** branch (`claude/animath-space-worlds-hm7wui`).
For continuity I read the two most recent Solid Worlds handoffs, both from this
week:

- [`3d-manifold-worlds-imwmal/2026-06-20-S01`](../../handoff/3d-manifold-worlds-imwmal/2026-06-20-S01-solid-worlds-continue.md)
  — **completed.** Fixed the cell-engine "screw bug" (two independent bugs: a
  gluing "bounce" giving χ=1, and a too-coarse vertex link); all **8 catalog
  platycosms now dual-verified** (Γᵃᵇ ↔ cube cell complex agree on H₁, χ=0,
  vertex-link S²). Confirmed **−a2 (second amphidicosm) = ℤ⊕ℤ/4** against the
  literature. Build + 53 vitest + lint green. Only open item: a product/naming
  call.
- [`solid-worlds-review-bju3pc/2026-06-19-S01`](../../handoff/solid-worlds-review-bju3pc/2026-06-19-S01-solid-worlds-continue.md)
  — grew the catalog 4→8 platycosms via an independent Γᵃᵇ homology + free-action
  test; FRONT/BACK sign slab; verified-gate fix.

This branch already contains all of that engine work (`SCREW_BUG.md` is present),
so it is the continuation, not a parallel re-do.

## Working notes

<!-- Newest entry first. -->

### 🟡 milestone · 21:33 — Lived seams implemented + visually verified; build green
**Why:** Feature complete for the two target worlds; confirmed in headless WebGL.

Added `DecorMode = 'diagnostic' | 'lived-seams'` (engineTypes), `setDecorMode`
on the engine, a `Decor` Pills switch in the View panel (persisted), and a new
`decor/livedSeams.ts` module + `plaqueTexture` label helper. `buildRoom` now
dispatches: shared frame/floor/grid, then diagnostic **or** lived decor, then the
shared label/corner resources. Defaults tuned for readability: cover depth 4→3,
fog 0.12→0.2.

Headless capture (seed `decorMode`, drive the World `<select>`) confirms both:
- **3-torus** — level wraparound pipe + split counter + floor rug + floor↔ceiling
  ladder, all full-span so they tile into continuous infrastructure (UP RETURNS
  BELOW, SAME SHELF, WRAPAROUND PIPE plaques). Reads as a periodic apartment.
- **amphicosm** — the headline: a pipe low-at-−x / high-at-+x tiles into a
  continuous **diagonal floor↔ceiling zigzag** (the y-reflection made visible),
  with a +x-wall service shaft and explicit LOCAL FLOOR / CEILING SIDE panels.
- **diagnostic** unchanged (regression shot: FRONT sign + landmark props intact).

First pass at plaque sizes was wildly too big (sized in `U`≈9 ≈ room size); fixed
to room-relative widths. `npm run build` + 53 vitest + lint(0 err) all green.

### 🟣 decision · 21:30 — Design for Lived seams: span-the-cube infrastructure
**Why:** Settle the approach before coding — what makes a prop "use the gluing"
rather than be furniture, and how to express it in the existing instancing model.

Read the four key files (`coverEngine.ts`, `engineTypes.ts`, `textures.ts`,
`SolidWorlds.tsx`) + `worlds.ts`/`solidSchema.ts`. The engine builds the
fundamental room once as reusable parts, then `buildCover()` instances each part
across the deck-translate cells. **Key lever:** a prop that spans the full cube
(±h) tiles seamlessly into its neighbor copy, so it reads as continuous
infrastructure — for free, no per-cell work.

- **3-torus** (straight translations): full-span axis-aligned props become
  continuous loops — a wraparound pipe along x, a split counter/shelf along x, a
  floor rug along z crossing the seam, a floor-to-ceiling ladder (up returns
  below). Nothing flips/rotates → periodic apartment.
- **Amphicosm / Klein × Circle**: x-pairing is `g(x,y,z)=(x+size,−y,z)` (reflects
  y). A pipe built **low at −x / high at +x** tiles into a continuous floor↔ceiling
  zigzag — the y-reflection made visible. Plus a service ladder at the +x wall,
  floor/ceiling panels (LOCAL FLOOR / CEILING SIDE), a catwalk, and short plaques.
- Plan: `DecorMode = 'diagnostic' | 'lived-seams'`; dispatch in `buildRoom`;
  `setDecorMode` on the engine; `Pills` in the View panel; persist like other
  controls. New `decor/livedSeams.ts` module + a `plaqueTexture` label helper.
  Readability: default cover depth 4→3, modest fog bump. No engine-math changes.

### 🟡 milestone · 21:17 — Session opened; oriented on Solid Worlds state
**Why:** Start-session bootstrap — read the latest handoffs, confirmed branch
lineage, and set up the progress report before any work.

Confirmed: branch `claude/animath-space-worlds-hm7wui` is freshly cloned and
already carries the full Solid Worlds engine (screw fix + 8 dual-verified
worlds). The engine side is complete per the two prior handoffs. Outstanding
threads are non-engine: (a) the app-naming product call ("Solid Worlds" vs
*Manifold Walk*), which Dan deferred last session; (b) optional visual/HUD
confirmation of the screw worlds reading "cross-checked"; (c) upgrading the −a2
citation to a primary source (was network-blocked). Awaiting Dan's direction on
which thread (or a new one) to pursue.
