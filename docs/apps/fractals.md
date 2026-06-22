---
kind: app-guide
app: fractals
route: "#/fractals"
name: Fractals
title: Fractals — developer guide
status: active
build: passed
entry: src/animations/FractalsGPU/FractalsGPU.tsx
updated: 2026-06-21
signals: null
next: null
---

# Fractals — developer guide

> Explore the Mandelbrot, Julia, Burning Ship and Tricorn sets, rendered on the GPU.

The living architecture + status doc for this app. Conventions:
[`GUIDE_STYLE.md`](GUIDE_STYLE.md). What this doc type is: [`README.md`](README.md).
The teaching/math lives in
[`EXPLAINER.md`](../../src/animations/FractalsGPU/EXPLAINER.md).

## Status

- **Route:** `#/fractals` → `FractalsGPU`. The legacy CPU viewer is unlisted at
  `#/fractals-cpu` → `Fractals2D` (`src/animations/Fractals/`).
- **Stability:** ✅ **active**, doc-thin. A single-file GPU viewer; little churn.
  The two-pane Mandelbrot↔Julia explorer is a separate app
  ([Correspondence](../../src/animations/Correspondence/), `#/correspondence`).
- **Entry:** `FractalsGPU.tsx` · 1 ts/tsx file, ~540 LOC (shaders are inline
  template strings).
- **Build/tests:** covered by `npm run build`; no app-specific unit tests.

## Active / Resolved

The per-app control center — hand-maintained.

### Active

- _(none tracked)_

### Resolved

- [x] (pre-dates this tracking) — The GPU viewer (`FractalsGPU`) became the current
  `#/fractals`; the older CPU implementation was demoted to the unlisted
  `#/fractals-cpu` (kept reversible, like other legacy routes).

## What it does

A GPU escape-time fractal explorer. Iterate `z ↦ zᵏ + c`; color by how fast (or
whether) each pixel escapes.

- **Set panel** (`subject`) — Fractal type (Mandelbrot / Julia / Burning Ship /
  Tricorn), Power `k`, and the Julia constant `c` (real/imag, shown only for Julia).
- **Viewport panel** (`domain`) — Reset view; navigation is on the canvas (drag to
  pan, pinch/wheel to zoom).
- **Palette panel** (`color`) — Palette, color Offset, Color mode
  (Escape / Limit / Layered), Inside palette (for limit/layered), and Animate colors
  (cycles the offset).
- **Trace panel** (`drive`) — "Trace orbits on tap" (opt-in) + Clear orbit paths.
  With it on, tapping the canvas draws the iteration orbit `z₀ → z₁ → …` from that
  point, as a hue-graded polyline on an overlay canvas.
- **Iteration panel** (`quality`) — Max iterations + Start iteration (where
  limit-magnitude accumulation begins).
- **View window** — a single full-bleed shader plot, titled by the active set.

## How the code works

One component, `FractalsGPU`. The whole fractal is a **fragment shader** on a
full-screen quad:

- **Setup effect** (keyed on `mountEl`) creates a `WebGLRenderer`, a `Scene`, an
  `OrthographicCamera(-1,1,1,-1,0,1)`, and a `PlaneGeometry(2,2)` `Mesh` with a
  `ShaderMaterial`. The mount element is held **as state** (`setMount`) so the
  setup re-runs if the workspace remounts the view body (desktop ↔ phone chrome).
- **`render()`** pushes all React state into the shader uniforms (view bounds,
  iter, type, juliaC, palette, power, colorMode, offset) and draws one frame; a
  persistent rAF `renderLoop` calls the latest `render` via `renderRef`.
- **The shader** iterates per pixel with hard caps (`MAX_ITER 1000`, `MAX_POWER
  100`), computes a smooth escape value (`log|z|` blending), and colors via the
  shared palette GLSL. Type branches handle Burning Ship (abs parts) and Tricorn
  (conjugate). Palettes come from [`lib/colormaps.ts`](../../src/lib/colormaps.ts)
  (`PALETTE_GLSL`, `PALETTE_OPTIONS`).
- **Navigation** is [`useViewportGestures`](../../src/lib/useViewportGestures.ts)
  (drag-pan, pinch/wheel-zoom, tap). `normalizeView` keeps the view aspect matched
  to the canvas so the set never stretches.
- **Orbit trace** (`tracePath`/`drawPath`) is a **JS re-implementation** of the
  shader's iteration, drawn on a separate overlay `<canvas>` above the WebGL canvas.
- **Resize** is driven by a `ResizeObserver` on the mount (the view window resizes
  independently of the browser) plus the window resize event; DPR is capped at 2,
  and zero-size (collapsed window) resizes are ignored.

## Key files

| File | Role |
|---|---|
| [`FractalsGPU.tsx`](../../src/animations/FractalsGPU/FractalsGPU.tsx) | Everything: shaders, render loop, panels, gestures, orbit trace |
| [`lib/colormaps.ts`](../../src/lib/colormaps.ts) | `PALETTE_GLSL` + `PALETTE_OPTIONS` (shared with other 2D viewers) |
| [`lib/useViewportGestures.ts`](../../src/lib/useViewportGestures.ts) | Pan / pinch-zoom / tap for 2D viewers |
| [`EXPLAINER.md`](../../src/animations/FractalsGPU/EXPLAINER.md) · [`README.md`](../../src/animations/FractalsGPU/README.md) | The **?** modal text |

## Invariants & gotchas

- **Shader caps are hard:** `MAX_ITER = 1000`, `MAX_POWER = 100`. The Max iterations
  slider tops out at 1000 and Power at 10 to stay within them. GLSL `for` loops need
  constant bounds, hence the `if (i >= iter) break;` pattern.
- **Two iteration code paths.** The GPU shader and the JS `tracePath` implement the
  *same* recurrence (including the Burning Ship/Tricorn twists and Power `k`). If you
  change one, change the other or orbits will diverge from the picture.
- **Aspect must be normalized** (`normalizeView`) on every view change and resize,
  or the set stretches.
- **Mount-as-state.** The setup effect keys on `mountEl` (not a bare ref) so it
  re-initializes when the view body remounts; don't revert it to a ref.
- **Cap DPR at 2** — phones report 3 and would quadruple the fragment cost.

## Testing & verification

- `npm run build` — the CI gate.
- Headless screenshot: `node scripts/shoot.mjs '#/fractals' shot.png`.
- By eye: pan/zoom stays aspect-correct; switching to Julia reveals the `c`
  inputs; enabling Trace and tapping draws a hue-graded orbit that lands on the
  picture's structure.

## History & sources

- **Built/iterated by:** no dedicated session branch; touched in general/gallery
  work under [`docs/sessions/`](../sessions/).
- **Possible sources:** see the EXPLAINER and README (escape-time fractals;
  Mandelbrot / Julia / Burning Ship / Tricorn families).
