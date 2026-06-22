---
kind: app-guide
app: complex-particles
route: "#/complex-particles"
name: Complex Particles
title: Complex Particles — developer guide
status: active
build: passed
entry: src/animations/ComplexParticles/ComplexParticles.tsx
updated: 2026-06-22
signals: null
next: Settle the "which plane am I looking at" convention shared with Plane Transform (TODO `complex-particles` !high).
---

# Complex Particles — developer guide

> Visualize z → f(z) as a cloud of particles living in 4D, projected down to 3D.

The living architecture + status doc for this app. Conventions:
[`GUIDE_STYLE.md`](GUIDE_STYLE.md). What this doc type is: [`README.md`](README.md).
The teaching/math ("what am I looking at") lives in
[`EXPLAINER.md`](../../src/animations/ComplexParticles/EXPLAINER.md), not here.

## Status

- **Route:** `#/complex-particles` → `App` → `ComplexParticles`
  ([`src/index.tsx`](../../src/index.tsx) route map; the default route is also
  this app, via [`src/App.tsx`](../../src/App.tsx)). Embed twin at
  `#/embed/complex-particles`. Listed first in the gallery.
- **Stability:** ✅ **active** — the canonical and largest member of the
  complex-viewer family. It absorbed the former **Roots** (`z^(p/q)`) and
  **Multibranch** (`√`/`ln`) viewers as modes, and is the reference consumer of
  the shared [`lib/particles`](../../src/lib/particles/) engine + the
  [`ParticleViewerShell`](../../src/components/ParticleViewerShell.tsx).
- **Entry:** `ComplexParticles.tsx` (~900 LOC) + a `shaders/` directory
  (`index.ts` ~760 LOC of GLSL template strings, `quat.glsl`). Most of the
  generic viewer (panels, gestures, rAF loop) lives in the shared shell + engine.
- **Build/tests:** covered by `npm run build`; **no app-specific unit tests**
  (no `__tests__/` in the folder). Verify by eye / headless screenshot.

## Active / Resolved

The per-app control center — hand-maintained ([`GUIDE_STYLE.md`](GUIDE_STYLE.md) §3c).

### Active

- [ ] **!high** Plane / particles unification — one "which plane am I looking
  at" convention across the viewers and their guides. A linear Complex Particles
  plot shows the bare x,y plane, but Plane Transform also shows "a plane"; decide
  one mental model and which viewer owns which job. From
  [`docs/sessions/TODO.md`](../sessions/TODO.md) (`complex-particles`).
- [ ] **!low (visual-unverified)** Confirm the S01 Torus context-loss fix on a
  real Android device. Reasoned + headless-checked only; the Adreno context loss
  can't be reproduced in SwiftShader. Repro: exp · Tiles · Drop X · XY spin ·
  slide Perspective → Torus. See the
  [S02 handoff](../sessions/handoff/complex-particles-torus-crash-tile/2026-06-14-S02-domain-region.md).

### Resolved

<!-- newest first -->
- [x] **2026-06-14** (`complex-particles-torus-crash-tile`) — Continuous
  perspective floor (singular points slide off to a finite far field instead of
  flipping sign across the eye plane) + a **Domain region** Radius `|z|` band
  (shader mask, no geometry rebuild). The quadrant / inside-outside / tint
  variants were built then trimmed before merge (recoverable from git).
  [Handoff.](../sessions/handoff/complex-particles-torus-crash-tile/2026-06-14-S02-domain-region.md)
- [x] **2026-06-13** (`complex-particles-torus-crash-tile`) — Mobile Torus
  context-loss crash hardened (NaN-guarded tile normal + floored perspective
  denominator); projection now preserved across a sheet-count rebuild.
- [x] **2026-06-08** (`complex-sheet-ar9zA`) — Surface render modes
  (Sheet / Tiles / Net) added alongside Points.
- [x] **earlier** (`new-chrome`, `app-chrome-overhaul-lnqgle`) — Migrated to the
  workspace chrome: the old drawer's rows became archetype panels + view windows
  driven by `ParticleViewerShell`.

## What it does

A 4D viewer for a complex function **f : ℂ → ℂ**. Every sample sits at the 4D
point `(x, y, u, v) = (Re z, Im z, Re f, Im f)`; the app projects that down to
the 3D scene and colors it by domain or range (the math is in the EXPLAINER).

- **Function panel** (`subject`) — a grouped `Select` of all functions
  (from [`lib/complexMath.ts`](../../src/lib/complexMath.ts)), plus per-function
  parameters: `p`/`q` for `z^(p/q)` (the absorbed **Roots** mode), and `a`/`b`/`c`
  `ComplexInput`s for the generic quadratic `a·z²+b·z+c`. A duplicate compact
  picker rides in the top bar (`topExtra`) so switching functions never needs an
  open panel.
- **Domain panel** (`domain`) — units (×1 / ×π), the **Sampling** pattern
  (Grid / Polar / Rings / Spokes / Web / Squares / Random), reciprocal sampling,
  **Adaptive density** (`|f′(z)|`-weighted) + sharpness, and the sampling box
  (± symmetric extents, or independent X/Y ranges). App-specific extras appended
  here: the **Radius `|z|`** domain-region band, and **Branch min/max** + **Tint
  sheets** for multivalued functions (the absorbed **Multibranch** mode).
- **Camera panel** (`view`) — the **Projection** slider (Perspective ⇠ Torus ⇢
  Sphere; see below), a **Reference scaffold** toggle (Torus/Hopf only), **Motion**
  (Fixed / Quaternion auto-tumble / …), the **Orbit** style (Turntable / Free),
  distance, and axis width.
- **Color panel** (`color`) — Color by Domain/Range, colormap, the **Quantity**
  and **Brightness** scalar pickers (Phase / Magnitude / Real / Imag / Uniform),
  HSV style + hue shift (wheel colormaps) or log-band repeat (sequential), and
  saturation.
- **Render panel** (`marks`) — **Render mode** pills (Points / Sheet / Tiles /
  Net) with mode-specific rows, then the shared opacity / intensity / light
  background.
- **Motion panel** (`motion`) — shimmer, jitter, jitter mode.
- **4D Rotation panel** (`drive`) — the [`QuarterTurnControls`](../../src/controls/QuarterTurnControls.tsx):
  six-plane eighth-turns + continuous spins, the spin-speed slider, **Drop axis**
  (X/Y/U/V), reset, and a live orientation-matrix readout.
- **System panel** (`quality`) — "Reset settings to defaults".
- **View window** — one draggable plot, the particle cloud, with the standard
  particle gestures (drag orbit · two-finger / Shift-drag pan · scroll zoom).

### The projection slider (Perspective / Torus / Sphere)

One `Slider` with three sticky labeled stops drives the 4D → 3D map. Fractional
positions are **live GPU cross-fade morphs**, not projections (the shader blends
each particle between the two neighboring stops' images). The detents map to
[`ProjectionMode`](../../src/lib/viewpoint.ts): Perspective (`3 + v` camera
divide), Torus (Clifford-torus stereographic, soft-floored at `POLE_EPS`), Sphere
(the Hopf map S³ → S²). Drop X/Y/U/V (on the 4D Rotation panel) override with a
linear orthographic slice and snap the slider back to Perspective.

### The 4D Rotation panel (context-sensitive)

In the **linear** projections the rows are the six 4D coordinate planes (xy, xu,
xv, yu, yv, uv); a turn is a quaternion sandwich `p ↦ a·p·b̄` (see
[`viewpoint.ts`](../../src/lib/viewpoint.ts) `makeUnitQuat` / `quatRotate4D`). In
the **nonlinear** Torus/Sphere views a 4D pre-rotation would deform the image, so
the same panel switches to three ambient **Yaw / Pitch / Roll** camera orbits
instead — the shell computes this `ambient` flag and remaps the turn/spin
callbacks accordingly.

### Embed variant

`#/embed/complex-particles` renders the same engine with no chrome — just the
canvas, a corner badge, and optional overlay buttons — configured entirely from
URL params (`fn`, `p`, `q`, `proj`, `spin`, `render`, …; see `docs/EMBEDS.md`).
Embed mode uses **ephemeral state** (never reads or writes the visitor's saved
settings) and applies the URL config once on mount.

## How the code works

**Three-layer split.** `ComplexParticles.tsx` is the app layer; it builds on the
shared `ParticleViewerShell` (the generic panels/views/layouts) which in turn
drives the [`lib/particles`](../../src/lib/particles/) engine. The standard flow
(documented in `CLAUDE.md`): `useParticleState` (all viewer state + setters) →
`useViewControls` (orientation/projection/drop-axis controls) → build
geometry/axes in `Canvas3D`'s `onMount` → `useUniformSync` pushes React state into
shader uniforms → `startAnimationLoop` runs the rAF loop.

**What this app adds on top of a *simple* shell consumer** is the multi-sheet,
multi-render-mode material orchestration — it is no longer a simple shell
consumer:

- **Per-Riemann-sheet objects.** For multivalued functions the viewer draws one
  particle set per branch (`branchMin..branchMax`, capped at `MAX_SHEETS` and at
  the function's period). `rebuildBranchObjects` creates, for each sheet, a Points
  cloud + a Sheet fill mesh + a Sheet wire `LineSegments` + a Tiles mesh + a Net
  mesh, each with its own `ShaderMaterial` tagged `userData.branch`.
- **Five material families, five shader pairs.** Points (additive blending),
  Sheet fill + wire (normal-blended, true alpha), Tiles, Net (screen-space ribbon)
  — all share the `makeUniforms(b)` uniform set so `useUniformSync` / the loop /
  `useViewControls` drive them uniformly. `applyRenderVisibility` toggles which
  family is visible per render mode without rebuilding.
- **Many sync effects.** Geometry is rebuilt when sampling state changes (adaptive
  redistribution needs `|f′|`, so it depends on the function + params); separate
  effects push exponent/quadratic/branch/region/resolution/shade/tile/net uniforms.
- **`onMount` owns the GPU lifecycle.** It creates textures, all geometries, the
  axes and the Hopf/Torus scaffold, starts the loop, and **returns the cleanup**
  that stops the loop and disposes every geometry/material/texture/scaffold — so
  revisiting the route never strands a live rAF loop or GPU resources.

> [!NOTE]
> **Projection survives a rebuild.** Fresh materials start at the default
> projection (alpha 0). `rebuildBranchObjects` snapshots the live projection
> cross-fade (`uProjMode`/`uProjTarget`/`uProjAlpha`) from the previous material 0
> and restores it after the rebuild, so a Torus/Sphere/mid-morph view doesn't snap
> back to Perspective when the sheet count changes.

## Key files

| File | Role |
|---|---|
| [`ComplexParticles.tsx`](../../src/animations/ComplexParticles/ComplexParticles.tsx) | App layer: per-sheet material orchestration, render-mode plumbing, function/branch/region controls, `onMount` lifecycle |
| [`shaders/index.ts`](../../src/animations/ComplexParticles/shaders/index.ts) | All five vertex/fragment GLSL pairs (points, sheet fill/wire, tile, net), `regionMask`, the floored mode-0 `project()` |
| [`shaders/quat.glsl`](../../src/animations/ComplexParticles/shaders/quat.glsl) | Quaternion 4D-rotation snippet shared by the shaders |
| [`EXPLAINER.md`](../../src/animations/ComplexParticles/EXPLAINER.md) · [`README.md`](../../src/animations/ComplexParticles/README.md) | The **?** modal text (teaching/math) |
| [`components/ParticleViewerShell.tsx`](../../src/components/ParticleViewerShell.tsx) | Turnkey workspace: the 8 standard panels, projection slider, 4D-rotation wiring, layouts, embed mode |
| [`lib/particles/`](../../src/lib/particles/) | Shared engine: state, uniform sync, view controls, geometry builders, axes, scaffold, rAF loop |
| [`controls/QuarterTurnControls.tsx`](../../src/controls/QuarterTurnControls.tsx) | The drive-tier 4D-rotation control grid (turns / spins / drop axis) |
| [`lib/viewpoint.ts`](../../src/lib/viewpoint.ts) | `ProjectionMode`, quaternion helpers, the JS `project()` mirror (axis cross) |
| [`lib/complexMath.ts`](../../src/lib/complexMath.ts) | Function table (names/formulas/categories), `applyComplex`, `complexPowRational`, `complexQuadratic`, branch metadata |
| [`config/defaults.ts`](../../src/config/defaults.ts) | `COMPLEX_PARTICLES_DEFAULTS` (slider ranges + initial values) |
| [`src/index.tsx`](../../src/index.tsx) · [`src/embed/EmbedComplexParticles.tsx`](../../src/embed/EmbedComplexParticles.tsx) | Route map + the chrome-less embed wrapper |

## Invariants & gotchas

> [!CAUTION]
> **Gotcha** — `onMount` **must return its cleanup** (stop loop + dispose every
> geometry/material/texture/scaffold). `Canvas3D` runs it on unmount; dropping it
> strands a live rAF loop and GPU resources on every route visit.

- **All materials share one uniform set.** Every render-mode/sheet material is
  built from `makeUniforms(b)` (with fresh objects, no aliasing). A new uniform
  must be added there and pushed by an effect, or it'll exist on some materials
  and not others.
- **Sheet/Tiles/Net keep NormalBlending through the background toggle.** They're
  tagged `userData.sheet` so the object-mode (light/dark background) effect leaves
  their blending alone — overlapping translucent triangles must read as a layered
  surface, not the points' additive glow.
- **Render order is pinned** (points 0 · fill 1 · wire 2) so a dense opaque fill
  cleanly covers the cloud in adaptive Sheet mode.
- **Single-valued functions force `branchCount = 1`.** Drawing N identical
  additive clouds would be N× brightness and draw cost. Finite families cap at
  their period (`√`: 2, `∛`: 3, `z^(p/q)`: q).
- **`q = 0` is coerced to 1** (`z^(p/0)` is undefined) so the header/saved value
  matches what renders.
- **The Radius `|z|` band is a shader mask**, independent of the Polar *sampling*
  mode; they compose but don't interact. No geometry rebuild — it updates live in
  every render mode and projection.
- **Spins are transient view state** (not persisted). Touching the projection knob
  stops all spins first (a per-frame 4D rotation sweeping a projection singularity
  across the grid is the GPU worst case); switching the `ambient` flag clears spins
  so a wrong-kind spin can't linger.
- **Hopf/Sphere reading needs identity 4D orientation** — a 4D rotation mixes input
  and output before the map. The shell pauses the auto-tumble and swaps to
  Yaw/Pitch/Roll in those views; "Reset orientation" restores identity.
- **Persist settings, not transient view state.** Saved settings are namespaced
  `complex-particles:*`; embed mode passes `null` keys to stay ephemeral.

## Testing & verification

- `npm run build` — the only CI gate; must pass.
- No unit tests for this app (no `__tests__/`). The engine's pure helpers are the
  natural place if coverage is ever added.
- Headless screenshot: `node scripts/shoot.mjs '#/complex-particles' shot.png`.
- By eye:
  - Slide the **Projection** knob full range — Perspective → Torus → Sphere should
    morph continuously (no snap), the axis cross should fade out toward Torus, and
    the scaffold appear.
  - Switch to a multivalued function (e.g. `√z`) and widen Branch min/max — extra
    tinted sheets should appear, capped at the period.
  - Cycle render modes (Points / Sheet / Tiles / Net) — each draws without the
    others bleeding through; the projection should be preserved across the switch.
  - The known unverified item is the mobile Torus context-loss fix (see Active).

## History & sources

- **Built/iterated by:** `complex-sheet-ar9zA` (surface render modes),
  `complex-particles-torus-crash-tile` (Torus crash fix + domain region),
  `new-chrome` / `app-chrome-overhaul-lnqgle` (workspace migration),
  `three-hats-particle-app-rill2c` and `particle-rotation-mobile-layout-nlworx`
  (design reviews + rotation/mobile work) — all under
  [`docs/sessions/`](../sessions/).
- **Possible sources:** the EXPLAINER does not yet carry a "Possible sources &
  where to go further" block (per the attribution policy it should; that's an open
  doc gap). The math touchstones it does name: domain coloring, the Hopf
  fibration / Clifford torus, and Riemann surfaces.
</content>
</invoke>
