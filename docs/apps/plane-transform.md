---
kind: app-guide
app: plane-transform
route: "#/plane-transform"
name: Plane Transform
title: Plane Transform — developer guide
status: stable
build: passed
entry: src/animations/PlaneTransform/PlaneTransform.tsx
updated: 2026-06-22
signals: null
next: Settle the shared "which plane am I looking at" convention with Complex Particles (TODO `complex-particles` !high).
---

# Plane Transform — developer guide

> Watch a complex function f : ℂ → ℂ warp a colored grid of the plane.

The living architecture + status doc for this app. Conventions:
[`GUIDE_STYLE.md`](GUIDE_STYLE.md). What this doc type is: [`README.md`](README.md).
The teaching/math ("what am I looking at") lives in
[`EXPLAINER.md`](../../src/animations/PlaneTransform/EXPLAINER.md), not here.

## Status

- **Route:** `#/plane-transform` → `PlaneTransform`
  ([`src/index.tsx`](../../src/index.tsx) route map). Embed twin at
  `#/embed/plane-transform`. Listed in the gallery.
- **Stability:** 🟢 **stable** — works, low churn. A sibling of Complex Particles
  in the complex-viewer family: instead of a 4D graph, it shows `f` as a map of
  the colored plane to itself (domain · image).
- **Entry:** `PlaneTransform.tsx` (~820 LOC, includes the two pane sub-components
  + their pointer handlers) + helpers `polarViews.ts`, `standardCurves.ts`, and a
  `shaders/` directory.
- **Build/tests:** covered by `npm run build`; **no app-specific unit tests**
  (no `__tests__/` in the folder).

## Active / Resolved

The per-app control center — hand-maintained ([`GUIDE_STYLE.md`](GUIDE_STYLE.md) §3c).

### Active

- [ ] **!high** Plane / particles unification — one "which plane am I looking
  at" convention shared with Complex Particles. Both viewers show "a plane"; the
  guides are ambiguous about which owns which job. From
  [`docs/sessions/TODO.md`](../sessions/TODO.md) (`complex-particles`); affects
  this guide and the functions guide.

### Resolved

<!-- newest first -->
- [x] **earlier** (`new-chrome`, `app-chrome-overhaul-lnqgle`) — Migrated to the
  workspace chrome. Domain + image were combined into **two panes of one split
  view window** (so the chrome can't mis-size or separate them, and the equal
  split keeps the two inscribed squares scale-commensurable); the old
  `PlaneCurveFloater` became the Curves panel.

## What it does

A complex function `f : ℂ → ℂ` shown as a transformation of the plane: the input
(`z`) pane is a colored grid of points, the output (`w = f(z)`) pane shows where
each colored point lands. Both panes share **one point cloud**; only the output
pane's vertex shader applies `f`.

- **Function panel** (`subject`) — a grouped `Select` of all functions (from
  [`lib/complexMath.ts`](../../src/lib/complexMath.ts)), `p`/`q` for `z^(p/q)`,
  `a`/`b`/`c` `ComplexInput`s for the generic quadratic, and a **Branch index**
  select for multivalued functions.
- **Grid panel** (`domain`) — **Grid** sampling (Cartesian / Polar), **Plane**
  layout (Cartesian / Log-polar — plot at `(arg, log|·|)`), and the visible
  extent `±`.
- **Color panel** (`color`) — color **Mode** (Smooth / Tiles / Grid only),
  saturation, intensity.
- **Grid style panel** (`marks`) — point size.
- **Curves panel** (`drive`) — **Draw on input** (freehand stroke on the z-pane),
  a row of **Standard curves** (from `standardCurves.ts`), and Clear. A drawn
  curve is mapped through `f` and overlaid as an SVG polyline on the output pane.
- **Detail panel** (`quality`) — point **Density** (per side) + "Reset settings".
- **View window** — one **split** view (`z ↦ f(z)`) with two panes: `z — domain`
  and `w = f(z) — image`. Scroll/pinch on either pane zooms **both** (shared
  `viewExtent`); the input pane also captures freehand strokes.

### Embed variant

`#/embed/plane-transform` renders the two panes side by side via `SplitPanes`
with no chrome — just a corner badge — configured from URL params (`fn`, `p`,
`q`, `extent`, `controls`; see `docs/EMBEDS.md`). Embed mode uses **ephemeral
state** (passes `null` persistence keys).

## How the code works

This app does **not** use `ParticleViewerShell` — it is a self-contained 2D
two-pane viewer that renders directly into the chrome's split-view window.

- **One geometry, two renderers.** A single `BufferGeometry` (built from
  `sampleInputPositions` in [`polarViews.ts`](../../src/animations/PlaneTransform/polarViews.ts))
  holds the sample positions in math coordinates; both panes' `THREE.Points` share
  it. Each pane has its own `WebGLRenderer` + `OrthographicCamera(-1,1,1,-1,0,1)`
  + `ShaderMaterial`, distinguished only by the `transform` uniform (0 = input,
  1 = output). The input shader just divides by `viewExtent`; the output shader
  applies the selected `f` then divides — so the same colored points end up at
  their `f(z)` locations.
- **The render loop** draws each pane as a square fitting the smaller of its
  container's two dimensions (so the plane stays isotropic), reading sizes from a
  `ResizeObserver` cache (never `getBoundingClientRect` per frame — that would
  force a reflow).
- **Mount effect keyed on `phone`.** Crossing the 740px breakpoint remounts the
  view bodies into fresh mount divs, so the mount/teardown effect re-keys on
  `phone` to rebuild the two renderers. Uniforms are synced by a separate effect.
- **Curves** are JS, not shader. A freehand stroke on the input pane is captured
  in math coords (`mathFromClip`), mapped through `f` with
  [`lib/complexMath.ts`](../../src/lib/complexMath.ts) (`applyComplexBranch` /
  `complexPowRational` / `complexQuadratic`) into `outputCurve` (a `useMemo`), and
  both polylines are drawn as `<svg>` overlays sized to each pane's inscribed
  square (`useInscribedSquare`).

## Key files

| File | Role |
|---|---|
| [`PlaneTransform.tsx`](../../src/animations/PlaneTransform/PlaneTransform.tsx) | Everything: state, panels, the split view, the two-pane renderers + loop, the InputPane/OutputPane sub-components, embed mode |
| [`shaders/index.ts`](../../src/animations/PlaneTransform/shaders/index.ts) | The vertex/fragment GLSL: apply `f` (output pane), the plane layout, the domain-coloring |
| [`polarViews.ts`](../../src/animations/PlaneTransform/polarViews.ts) | `sampleInputPositions`, `clipFromMath` / `mathFromClip` (Cartesian ↔ log-polar), the `GridMode` / `PlaneMode` types |
| [`standardCurves.ts`](../../src/animations/PlaneTransform/standardCurves.ts) | `STANDARD_CURVES` + `buildStandardCurve` (the preset curve generators) |
| [`EXPLAINER.md`](../../src/animations/PlaneTransform/EXPLAINER.md) · [`README.md`](../../src/animations/PlaneTransform/README.md) | The **?** modal text (teaching/math) |
| [`lib/complexMath.ts`](../../src/lib/complexMath.ts) | Shared function table + complex evaluation (curve mapping; the panes' shader inlines its own) |
| [`chrome/workspace/SplitPanes.tsx`](../../src/chrome/workspace/SplitPanes.tsx) | The fixed equal split used by both the in-workspace view and embed mode |
| [`src/index.tsx`](../../src/index.tsx) · [`src/embed/EmbedPlaneTransform.tsx`](../../src/embed/EmbedPlaneTransform.tsx) | Route map + the chrome-less embed wrapper |

## Invariants & gotchas

> [!CAUTION]
> **Gotcha** — the two panes **must stay scale-commensurable** (same
> pixels-per-unit). That's the whole point of reading `|f′|` off the picture, and
> why domain + image are two panes of *one* equal-split window with one shared
> `viewExtent` rather than two independent windows.

- **Both panes share one geometry.** Rebuilding the cloud (on density / extent /
  grid-mode change) reassigns `geometry` on both `points` meshes; don't fork it.
- **Renderers are remounted on the phone breakpoint.** The mount effect keys on
  `phone`; the uniform-sync effect also depends on `phone` so fresh materials get
  the current state. Don't drop those deps.
- **Sizes come from the `ResizeObserver` cache**, read per frame — never measure
  layout inside the rAF tick.
- **Cap DPR at 2** (phones report 3) in every renderer.
- **`q = 0` is coerced to 1** in the Function panel.
- **Curve state is transient** (not persisted), as is `drawMode`. Saved settings
  are namespaced `plane-transform:*`; embed mode passes `null` keys.
- **Curve mapping and the shader are two code paths.** The panes apply `f` in
  GLSL; the drawn curve applies `f` in JS via `lib/complexMath.ts`. Keep them
  consistent (same branch handling) or a curve drifts off its image.

## Testing & verification

- `npm run build` — the CI gate.
- No unit tests for this app (no `__tests__/`).
- Headless screenshot: `node scripts/shoot.mjs '#/plane-transform' shot.png`.
- By eye: pick a conformal map (e.g. `z²`), confirm right-angle grid crossings
  stay right-angled in the image; toggle Grid: Polar + Plane: Log-polar and
  confirm the input becomes a clean square lattice; draw on the input pane and
  confirm the white polyline maps onto the image curve; scroll-zoom one pane and
  confirm **both** rescale together.

## History & sources

- **Built/iterated by:** the chrome migration (`new-chrome`,
  `app-chrome-overhaul-lnqgle`) under [`docs/sessions/`](../sessions/); no
  dedicated recent feature branch.
- **Possible sources:** the EXPLAINER does not yet carry a "Possible sources &
  where to go further" block (an open doc gap per the attribution policy). The
  ideas it names: domain coloring, conformal maps, the log-polar (`arg`, `log|·|`)
  unrolling, and Riemann-surface branches.
</content>
