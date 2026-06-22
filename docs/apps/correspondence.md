---
kind: app-guide
app: correspondence
route: "#/correspondence"
name: Mandelbrot ↔ Julia
title: Mandelbrot ↔ Julia — developer guide
status: stable
build: passed
entry: src/animations/Correspondence/Correspondence.tsx
updated: 2026-06-22
signals: null
next: null
---

# Mandelbrot ↔ Julia — developer guide

> See how every point of the Mandelbrot set seeds its own Julia set.

The living architecture + status doc for this app. Conventions:
[`GUIDE_STYLE.md`](GUIDE_STYLE.md). What this doc type is: [`README.md`](README.md).
The teaching/math ("what am I looking at") lives in
[`EXPLAINER.md`](../../src/animations/Correspondence/EXPLAINER.md), not here.

## Status

- **Route:** `#/correspondence` → `Correspondence`
  ([`src/index.tsx`](../../src/index.tsx) route map). The gallery name is
  **Mandelbrot ↔ Julia** (the `app` slug stays `correspondence`). Listed in the
  gallery.
- **Stability:** 🟢 **stable** — works, low churn. The framework's **two-view
  reference**: two linked view windows (Mandelbrot picker · live Julia set) driven
  by a shared `c`.
- **Entry:** `Correspondence.tsx` (~290 LOC) + `FractalPane.tsx` (~270 LOC, the
  reusable shader pane). No embed variant.
- **Build/tests:** covered by `npm run build`; **no app-specific unit tests**
  (no `__tests__/` in the folder).

## Active / Resolved

The per-app control center — hand-maintained ([`GUIDE_STYLE.md`](GUIDE_STYLE.md) §3c).

### Active

- _(none tracked)_

### Resolved

<!-- newest first -->
- [x] **earlier** (`new-chrome`, `app-chrome-overhaul-lnqgle`) — Migrated to the
  workspace chrome: two linked view windows + archetype panels. Tap-to-pick `c`
  became always-armed (the old Seed-panel arm button was a gate in front of the
  app's primary gesture, since tap is already disambiguated from drag/pinch in
  `useViewportGestures`).

## What it does

Two fractals from one rule, `z ↦ z² + c`, in two linked windows: the left pane is
the Mandelbrot set (a map of every Julia set); the right is the Julia set for the
currently selected `c`. Picking `c` on the left re-renders the right.

- **Palettes panel** (`color`) — independent palette + offset for each of the two
  panes (Mandelbrot, Julia), from [`lib/colormaps.ts`](../../src/lib/colormaps.ts)
  `PALETTE_OPTIONS`. Uses the [`Kicker`](../../src/chrome/readouts.tsx) readout
  primitive as the two sub-headers.
- **Seed panel** (`drive`) — `c` real / imag number inputs (the canonical way to
  set `c` is still tapping the Mandelbrot pane).
- **Path panel** (`playback`) — **Draw c-path** (freehand on the Mandelbrot),
  Clear, **Play / Stop**, Pause/Resume, Speed, and a **Progress** scrubber. Playing
  back interpolates `c` along the drawn path so the Julia set morphs continuously;
  the scrubber seeks and pauses a running playback so the user stays in control.
- **Iteration panel** (`quality`) — Max iterations (shared by both panes).
- **View windows** — two: `Mandelbrot — pick c` and `Julia(c)`. The Mandelbrot
  pane shows an `X` marker at the current `c` and the drawn c-path; the title bar's
  subtitle reads back `c`.

## How the code works

A pure-React state container (`Correspondence.tsx`) that owns the shared model and
drives two instances of one reusable shader pane (`FractalPane.tsx`).

- **Shared state, linked panes.** `Correspondence` holds `c`, the two view bounds,
  iterations, per-pane palette/offset, and the c-path + playback machinery. Both
  view windows render a `FractalPane`; the Mandelbrot pane gets `onPickC` /
  `markC` / path props, the Julia pane just gets `juliaC = c`. There is no
  cross-pane plumbing beyond this shared `c` — that's what makes it the clean
  two-view reference.
- **`FractalPane` is one shader quad.** Each pane is its own `WebGLRenderer` +
  `OrthographicCamera(-1,1,1,-1,0,1)` + a `PlaneGeometry(2,2)` mesh with a
  `ShaderMaterial`. The fragment shader iterates `z ↦ zᵖ + k` per pixel
  (`fType` 0 = Mandelbrot: `z₀ = 0`, `k = pixel`; 1 = Julia: `z₀ = pixel`,
  `k = c`), with `power` fixed at 2, and colors the escape count through the shared
  [`PALETTE_GLSL`](../../src/lib/colormaps.ts). A `setup` effect (run once) builds
  the renderer + rAF loop and returns its cleanup; a second effect pushes the live
  uniforms (`view`, `c`, `maxIter`, `palette`, `offset`).
- **Navigation** is [`useViewportGestures`](../../src/lib/useViewportGestures.ts)
  (drag-pan, pinch/wheel-zoom, tap), in `'pan'` mode normally and `'draw'` mode
  while Draw c-path is on. `onTap` picks `c`; the draw callbacks accumulate the
  c-path. The Mandelbrot pane draws the `X` marker and the path as DOM/SVG overlays
  positioned by `toScreen` (math → the centered inscribed square).
- **Path playback** is a hand-rolled rAF interpolator (`playPath` / `stopPath` /
  `seek`) over the drawn point list, advancing `progressRef` by `speed` per frame
  and `setC`-ing the interpolated point; `seek` jumps to a normalized 0..1 position
  and pauses if playing.

## Key files

| File | Role |
|---|---|
| [`Correspondence.tsx`](../../src/animations/Correspondence/Correspondence.tsx) | State container: shared `c`, two view windows, panels, c-path playback |
| [`FractalPane.tsx`](../../src/animations/Correspondence/FractalPane.tsx) | The reusable shader pane: Mandelbrot/Julia fragment shader, gestures, `X` marker + path overlay |
| [`lib/colormaps.ts`](../../src/lib/colormaps.ts) | `PALETTE_GLSL` + `PALETTE_OPTIONS` (shared with the other 2D viewers) |
| [`lib/useViewportGestures.ts`](../../src/lib/useViewportGestures.ts) | Pan / pinch-zoom / tap / draw for 2D viewers |
| [`chrome/readouts.tsx`](../../src/chrome/readouts.tsx) | `Kicker` sub-headers in the Palettes panel |
| [`EXPLAINER.md`](../../src/animations/Correspondence/EXPLAINER.md) · [`README.md`](../../src/animations/Correspondence/README.md) | The **?** modal text (teaching/math) |

## Invariants & gotchas

> [!CAUTION]
> **Gotcha** — `FractalPane`'s `setup` effect has an **empty dependency array** on
> purpose (`useEffect(() => setup(), [setup])`, `setup` is a `useCallback([])`).
> It builds the renderer/loop once; live changes flow through the **separate
> uniform-sync effect**. Adding props to `setup`'s deps would tear down and rebuild
> the WebGL context on every `c` change.

- **Each pane sizes to a centered square** (the smaller of width/height); the `X`
  marker and path overlays must use the same inscribed-square math (`toScreen`) or
  they drift off the fractal.
- **Cap DPR at 2** (phones report 3) in `handleResize`.
- **Tap-to-pick is always armed** — it's already disambiguated from drag/pinch by
  `useViewportGestures`; don't re-add an arming gate.
- **Playback uses refs mirroring state** (`speedRef`, `playingRef`, `pausedRef`,
  `progressRef`) so the rAF closure reads live values; keep the mirrors in sync via
  their effects.
- **`power` is fixed at 2** in the shader (`z² + c`). This app is deliberately the
  classic quadratic family; the multi-power escape-time families live in
  [`Fractals`](../../src/animations/FractalsGPU/) (`#/fractals`).

## Testing & verification

- `npm run build` — the CI gate.
- No unit tests for this app (no `__tests__/`).
- Headless screenshot: `node scripts/shoot.mjs '#/correspondence' shot.png`.
- By eye: tap inside the Mandelbrot and confirm the Julia pane updates and the `X`
  marker tracks; pick `c` inside vs outside the set and confirm the Julia set is
  connected vs a dust; Draw c-path then Play and confirm the Julia set morphs
  along the path with the Progress scrubber tracking.

## History & sources

- **Built/iterated by:** the chrome migration (`new-chrome`,
  `app-chrome-overhaul-lnqgle`) under [`docs/sessions/`](../sessions/); no
  dedicated recent feature branch.
- **Possible sources:** the EXPLAINER does not carry a "Possible sources & where
  to go further" block (an open doc gap per the attribution policy), but its body
  does name analogues honestly: the Mandelbrot/Julia Fundamental Dichotomy and Tan
  Lei's local-similarity result at Misiurewicz points.
</content>
