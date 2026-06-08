---
kind: progress
session: 2026-06-08-S01
date: 2026-06-08
title: Translucent sheet surface viewer
branch: claude/complex-sheet-ar9zA
slug: complex-sheet-ar9zA
status: completed
build: passed
followup: null
pr: null
app: ComplexSheet (proposed)
---

# Translucent sheet surface viewer

## Session purpose

Explore a variation of the particle plot where a regular grid of vertices defines
a wireframe surface, and the 2D surface of the complex function is visualized as a
single translucent sheet (rather than discrete particles).

## Previous session

First tracked session on this branch. The most relevant prior work is
[particle-viewer ideas triage + quick wins](../../handoff/particle-viewer-ideas-priority-UDZRe/2026-06-05-S01-ideas-triage-quick-wins.md)
(completed, build passed): consolidated the `lib/particles` engine and added
color/sampling/projection controls — the engine this new sheet view would build on.

## Working notes

<!-- Newest entry first. One ### per state transition. -->

### 🟡 milestone · 15:55 — Sheet render mode shipped, build green
**Why:** feature complete and verified headlessly.

Added a **Surface** render mode to ComplexParticles: **Points** (unchanged) or
**Sheet** — a single translucent triangle surface over a regular grid, with
toggleable filled + wireframe layers, a resolution slider, and a faceted-shading
slider. Verified by headless render (SwiftShader) across z² and eᶻ in both
filled+wire and wire-only; Points mode confirmed unregressed. `npm run build`
passes.

> [!CAUTION]
> **Gotcha (fixed)** A double-sided translucent sheet under the points' default
> **AdditiveBlending** blows out to solid white (overdraw sums past 1). The sheet
> materials therefore force **NormalBlending** with `depthWrite: false` (true
> alpha compositing), and are tagged `userData.sheet` so the `objectMode`
> (light-background) effect leaves their blending alone. Faceted shading from
> `dFdx/dFdy(viewPos)` supplies the depth cues additive glow can't.

> [!NOTE]
> Sheet mode samples its **own** Cartesian grid (its `sheetResolution`), ignoring
> the Sampling pattern and particle count — a continuous surface needs grid
> topology. The big stretching near singularities / fast-growing `f` is inherent
> to the projection (same as Points); zoom out with **Distance**.

### 🔵 finding · 15:30 — branchIndex relied on positional index
**Why:** adding 3 materials per branch broke the old assumption.

The Riemann-sheet `branchIndex` effect set `materialsRef[i] = branchMin + i`,
assuming one material per branch. With points + sheet-fill + sheet-wire per
branch that mapping is wrong, so each material is now tagged
`userData.branch` and the effect reads that instead of its list position.

### 🟢 code · 15:20 — Implementing Sheet render mode
**Why:** finished reading the engine; the seams are clear, starting the build.

Design (maximal reuse of the existing engine):
- **Sheet geometry** = a new regular `res×res` indexed triangle grid
  (`lib/particles/createSheetGeometry.ts`), independent of `particleCount` /
  `samplePattern` (a sheet needs grid topology). Its own `sheetResolution`.
- **Shaders** — refactor `ComplexParticles/shaders/index.ts` to share the GLSL
  function library (`vsPreamble` + `vsLib`) between the existing points vertex
  shader and a new `sheetVertexShader` (adds a `vViewPos` varying, drops
  `gl_PointSize`). New `sheetFragmentShader`: translucent fill with faceted
  shading from screen-space derivatives, plus a `uWire` flag for the wireframe
  overlay.
- **Materials** — sheet fill + wire materials carry the *same* uniform set as the
  points material (so `useUniformSync` / the animation loop / `useViewControls`
  drive them unchanged), tagged with `userData.branch` so `branchIndex` no longer
  relies on positional index.
- **Controls** — a new "Surface" section in `ParticleViewerShell`: Render
  (Points/Sheet) Pills, then Filled/Wireframe checkboxes, Resolution + Shading
  sliders.

> [!NOTE]
> Delivered inside ComplexParticles — **no new route / apps.ts entry**, so no
> shared-file churn beyond the engine it builds on.

### 🟣 decision · 15:05 — Deliver as a new render mode inside ComplexParticles
**Why:** user chose "new render mode in ComplexParticles" over a separate app, and
"both translucent fill + wireframe, toggleable" for the surface style.

Plan: add a render-mode toggle (Points / Sheet) to the existing viewer. In Sheet
mode, build an indexed triangle mesh from the existing regular grid, render it with
a translucent double-sided material and a toggleable wireframe overlay, reusing the
existing projection + per-vertex color shaders. Now exploring the `lib/particles`
engine to find the cleanest seams.

### 🟡 milestone · 15:02 — Session initialized
**Why:** start-session skill — orient before any implementation.

New branch `claude/complex-sheet-ar9zA`. Focus: a translucent-sheet surface
variant of the particle viewer (regular grid → wireframe → translucent sheet,
instead of point particles). The `lib/particles` engine + `ParticleViewerShell`
(canonical consumer: `ComplexParticles`) is the foundation to study. Awaiting
direction before writing code.

## Key files

| File | Role |
| --- | --- |
| `lib/particles/createSheetGeometry.ts` | **New.** Regular `res×res` indexed triangle grid (+ rebuild); zero `seed` so jitter never tears the sheet. |
| `lib/particles/types.ts` | `renderModes = ['Points','Sheet']` + `RenderMode`. |
| `lib/particles/useParticleState.ts` | New persisted state: `renderMode`, `sheetFill`, `sheetWire`, `sheetResolution`, `sheetShade`. |
| `lib/particles/useUniformSync.ts` | `objectMode` blending now skips `userData.sheet` materials. |
| `ComplexParticles/shaders/index.ts` | Refactored to share `vsCommon` (the GLSL library) between the points and the new `sheetVertexShader` / `sheetFragmentShader` (faceted shading + `uWire`). |
| `ComplexParticles/ComplexParticles.tsx` | `makeUniforms` factory; points + sheet-fill + sheet-wire materials per branch; sheet geometry + visibility + shade + branch-tag effects. |
| `components/ParticleViewerShell.tsx` | New **Surface** section (Render pills + Filled/Wireframe/Resolution/Shading). |
| `ComplexParticles/{README,EXPLAINER}.md` | Documented the Surface / Sheet mode. |

## Self-reflection

1. **Another session?** Tune the sheet's default look (it inherits the points'
   `cameraZ` / `opacity`; a Sheet-specific default distance + opacity would frame
   it better out of the box), and consider seeding `seed` from a low-discrepancy
   sequence so optional jitter wrinkles the surface coherently instead of just
   translating it.
2. **Change about what I produced?** The sheet shares the points' `opacity`
   slider; a dedicated sheet opacity would avoid coupling the two modes' looks.
3. **Not asked but important?** Whether multi-sheet (Riemann branch) *surfaces*
   should stack translucently — they do now, which can be busy; a per-sheet hue
   offset might help. Left as-is.
4. **Overlooked together?** The additive-blending blow-out wasn't obvious until I
   rendered it; the headless harness caught it immediately.
5. **Difficult?** Judging a translucent WebGL surface without a display — solved
   by the SwiftShader screenshot harness (seeding `localStorage` to flip the mode).
6. **Easier?** A built-in way to drive app controls in the screenshot harness
   (beyond seeding `localStorage`) would speed up visual iteration.
7. **Follow-up value:** LOW — feature is complete, builds, and is verified; what
   remains is optional aesthetic tuning.
