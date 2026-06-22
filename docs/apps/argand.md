---
kind: app-guide
app: argand
route: "#/argand"
name: Argand Plane
title: Argand Plane — developer guide
status: active
build: passed
entry: src/animations/Argand/Argand.tsx
updated: 2026-06-22
signals: phone-needed
next: Write the explainer + tools for the complex/dual/split-complex trichotomy (the j² system is built but under-taught), then decide whether the bottom-HUD t-scrubber pays its way.
---

# Argand Plane — developer guide

> Build the complex line `f(z) = α₁·z + α₀` (and quadratics): drag the
> coefficients, feed it a point, a shape or the whole grid, and watch multiply
> spiral while add slides — through complex, dual and split-complex numbers.

The living architecture + status doc for this app. Conventions:
[`GUIDE_STYLE.md`](GUIDE_STYLE.md). What this doc type is: [`README.md`](README.md).
The teaching/math ("what am I looking at") lives in
[`EXPLAINER.md`](../../src/animations/Argand/EXPLAINER.md), not here.

## Status

- **Route:** `#/argand` → `Argand` ([`src/index.tsx`](../../src/index.tsx) route
  map). Listed in the gallery. No embed twin yet.
- **Stability:** ✅ **active** — the **entry-point app for complex numbers** and
  the **successor-in-progress to Plane Transform**. Where Plane Transform shows an
  arbitrary `f : ℂ → ℂ` warping a grid, Argand narrows to the *affine* line
  `α₁·z + α₀` (then quadratics), built around honest, scrubable motion and
  draggable, color-coded coefficients.
- **Entry:** `Argand.tsx` (~520 LOC — the React shell, panels, bottom HUD) + the
  SVG plane `ArgandPlane.tsx` (~600 LOC) + pure engine `complexOps.ts` + presets
  `curves.ts` + `Argand.css`. 4 ts/tsx files.
- **Build/tests:** covered by `npm run build`; **no app-specific unit tests** (no
  `__tests__/` in the folder — though `complexOps.ts` is deliberately
  React/DOM-free and testable in isolation).

## Active / Resolved

The per-app control center — hand-maintained ([`GUIDE_STYLE.md`](GUIDE_STYLE.md) §3c).

### Active

- [ ] **!high** Explainer + tools for the **complex / dual / split-complex**
  trichotomy. The `p = j²` system slider is fully wired (rotation · shear · boost,
  the `x² − p·y² = 1` unit curve, the split null cone), but it is the app's least
  taught feature — the EXPLAINER's "Three number systems" section is thin and there
  are no dedicated readouts (rapidity / shear amount / orbit type) to make the boost
  and shear legible. Lift the dual/split story to first-class.
- [ ] **!med** Make the bottom-HUD `t` scrubber pay its way (or drop it). The
  immersive HUD carries a path-parameter `t` slider + Play that duplicate the
  **Play** panel's controls; on a Point feed at rest the path is already drawn
  statically. Decide whether the always-visible scrubber earns the screen space or
  should collapse to just the feed switcher + j² morph.
- [ ] **!med** Phone / mobile verification. `signals: phone-needed`. The plane uses
  pointer-capture gestures (1-finger drag handle · 2-finger pinch-zoom/pan ·
  shift/right-drag pan) and an immersive bottom HUD that must clear the phone dock;
  confirm handle-dragging, pinch-zoom and the HUD all behave on a real touch device.

### Resolved

<!-- newest first -->
- [x] **earlier** — Built the affine core (`α₁·z + α₀`, two honest legs + diagonal
  return, fixed point `z*`, "View from z*", Iterate orbit), the **Degree → 2**
  quadratic extension (α₂ handle, two fixed points + critical point, Horner-chain
  animation, degree-ramp morph for Shape/Grid), the **`p = j²`** generalized-algebra
  slider (complex/dual/split), arc-length-paced Play, soft snapping, and the
  immersive plot + bottom control HUD.

## What it does

A draggable **Argand plane** built around the affine map `f(z) = α₁·z + α₀` — the
complex cousin of `y = m·x + b` — extended to quadratics and run through three
number systems. The plot is **immersive** (fills the stage); panels and a bottom
HUD float over it.

- **Function panel** (`subject`) — **Degree** pills (Linear / Quadratic), the
  color-coded equation, `ComplexInput`s for `α₂` (pink, quadratic only), `α₁`
  (orange, slope/spin-scale), `α₀` (violet, shift), each with a **Lock** checkbox;
  the live **fixed point(s) `z* = α₀/(1−α₁)`** readout; and **View from z***
  (recenter so `f` reads as a pure spiral).
- **System panel** (`domain`) — the **`p = j²`** slider with sticky stops
  Complex (−1) · Dual (0) · Split (+1): multiply-by-α₁ becomes a **rotation**,
  **shear**, or **boost**; the dashed unit curve is `x² − p·y² = 1`, with the split
  null cone in red.
- **Input panel** (`subject`) — the **Feed f** pills (Point / Shape / Grid), a
  Shape preset `Select` (flag / circle / square / segment), and the `z`
  `ComplexInput` (input / anchor / probe per feed).
- **Plane panel** (`domain`) — extent `±`, **Grid** (Cartesian / Polar), grid size,
  **color grid by angle** (domain coloring), ghost-grid + image-grid brightness,
  unit-curve toggle, and **Snap to nice values** (lattice, nice radii, π/6 angles).
- **Play panel** (`playback`) — jump-to-**stop** buttons (labeled per feed/degree),
  Play/Pause, **Speed** (pen units/sec), a fine `t` scrub, and (Point feed) the
  **Iterate** toggle + step count for the orbit `z → f(z) → f²(z) → …`.
- **Values panel** (`readout`) — `z`, `α₁`, `α₀`, `f(z)`, `z*` each in both
  rectangular (`x + yi`) and polar (`r·e^{iθ}`, with degrees) form.
- **Detail panel** (`quality`) — "Reset settings to defaults".
- **View** — one immersive **Argand plane** SVG. Drag the `z` (circle) / `α₁`
  (diamond) / `α₀` (square) / `α₂` (triangle) handles; pinch/scroll to zoom;
  two-finger or shift/right-drag to pan; double-click to recenter. A top-right
  on-screen equation and a bottom **control HUD** (feed switcher + `t` scrubber + j²
  morph) live *inside* the view node so they survive fullscreen.
- **Top-bar mode pills** mirror the feed (Point / Shape / Grid).

## How the code works

A **shell ↔ pure-engine** split, with an SVG plane in between. There is **no
Three.js / WebGL** here — the whole picture is one inline `<svg>`.

- **`complexOps.ts`** is the pure engine: complex arithmetic, the **generalized
  algebra** `mulG`/`powRealG`/`divG`/`normG` parameterized by `p = j²` (one product
  `(x₁+y₁j)(x₂+y₂j)` with `j² = p`; only the *sign* of `p` is invariant, so the app
  dials `p ∈ [−1, 0, 1]`), the affine/poly evaluators (`affine`, `polyEval` by
  Horner, `polyFixedPoints`, `criticalPoint`), the **honest interpolation paths**
  the animation traces (`affineAt` two legs · `affineSimulAt` diagonal ·
  `affineLoopAt` closed loop · `hornerAt`/`polyTermLoopAt` · `polyRampAt`
  degree-ramp), `arcLengthMap` (constant-*geometric*-speed pacing), formatting, and
  soft `snap`. No React, no DOM — testable in isolation.
- **`Argand.tsx`** is the React shell: it owns all state via `usePersistentState`
  (`argand:*` keys), builds the `SectionDef[]` panels and the single immersive
  `ViewDef`, runs the **two rAF clocks** (the Play clock integrates distance at
  `speed` u/s and *wraps* once around the closed loop via the arc-length LUT; a
  separate clock ping-pongs `p` for the j² morph), and renders `<Workspace
  immersive>`. The active path's `ArcLengthMap` is rebuilt by a `useMemo` keyed on
  the feed/degree/coefficients/system, so the chosen story (point legs · Horner
  chain · shape/grid degree-ramp · orbit spiral) is paced by its *own* geometry.
- **`ArgandPlane.tsx`** is the presentational SVG: it converts math→screen with one
  equal x/y scale `k` (circles stay circles), draws the ghost identity grid, the
  unit curve, the mapped image, the per-feed motion (legs/diagonal, shape image,
  grid map, term-sum vectors, iteration orbit), the fixed/critical points, and the
  draggable handle glyphs. It owns **transient view state only** (pan `center`,
  pointer/gesture bookkeeping); coefficient edits flow up through `onChange(which,
  z)` and zoom through `onZoom(factor)`. "View from z*" locks `center` to `zStars[0]`
  and disables panning.

**Update flow.** A panel control or a handle drag sets persistent state in the
shell → React re-renders → the memoized `ArcLengthMap` and the `ArgandPlane` props
recompute → the SVG redraws. The rAF clocks only drive the transient `t` and (during
morph) `system`.

## Key files

| File | Role |
|---|---|
| [`Argand.tsx`](../../src/animations/Argand/Argand.tsx) | React shell: state, panels, the immersive view + bottom HUD, the Play + j²-morph rAF clocks, the arc-length pacing LUT, `<Workspace>` |
| [`ArgandPlane.tsx`](../../src/animations/Argand/ArgandPlane.tsx) | The SVG plane: math↔screen, grids, unit curve, per-feed motion, fixed/critical points, draggable handles, pan/pinch gestures; the shared color palette (`Z_COL`/`A1_COL`/…) |
| [`complexOps.ts`](../../src/animations/Argand/complexOps.ts) | **Pure engine**: generalized algebra (`mulG`/`powRealG`, `p = j²`), affine + polynomial evaluators, the honest interpolation paths, `arcLengthMap`, formatting, `snap` |
| [`curves.ts`](../../src/animations/Argand/curves.ts) | The Shape presets (`CURVES`, `buildCurve`): flag / circle / square / segment base polylines |
| [`Argand.css`](../../src/animations/Argand/Argand.css) | App-local styles (the bottom HUD) |
| [`EXPLAINER.md`](../../src/animations/Argand/EXPLAINER.md) | The **?** modal text (teaching/math) + "Possible sources" |

## Invariants & gotchas

> [!CAUTION]
> **Gotcha** — only the **sign** of `p = j²` is a geometric invariant (its
> magnitude rescales away), so the slider dials `p` over `[−1, 0, 1]` and the
> three named systems are `p < 0` (complex) · `p = 0` (dual) · `p > 0`
> (split-complex). Don't treat intermediate magnitudes as distinct algebras.

- **Two number-system code paths must agree.** The shell's `systemName`,
  `polyEval`/`polyFixedPoints`, and `ArgandPlane`'s drawing all read `p`; the
  generalized log `powRealG` only exists where the system's log is defined (`p<0`
  always; dual needs `Re > 0`; split needs the future cone). Where it isn't,
  `powRealG` **falls back to a linear blend** and the iteration orbit switches from
  the smooth spiral to straight segments between literal iterates (`powReliable` /
  `orbitSpiral` in `ArgandPlane`). Keep those guards if you touch the orbit/legs.
- **Play wraps, it does not bounce.** The Play clock integrates arc length and
  subtracts `L` to wrap once around the *closed* loop (out by the legs, back along
  the diagonal); the loop is seamless because it returns to `z`. The j² morph clock
  is the one that ping-pongs (`sysDir`). Short loops are floored to `MIN_SWEEP_SEC`.
- **The bottom HUD lives inside the view node on purpose.** It (and the top-right
  equation) must stay children of the immersive `ViewDef.node` so they survive
  fullscreen (where the chrome top bar + action strip are gone) and never overlap
  them.
- **Persist settings, not view state.** Coefficients/feed/degree/system are
  `usePersistentState` (`argand:*`); the path parameter `t`, `playing`, the j² morph
  play, and the plane's pan `center` are transient `useState`. Don't persist `t`.
- **`degree ≥ 2` changes the cast.** Quadratic mode adds the α₂ handle, a second
  `z*`, and the critical point `z = −α₁/2α₂`, and swaps the Point animation from the
  two-leg path to the Horner term-sum chain; Shape/Grid switch to the degree-ramp
  morph. The coefficient array is low-to-high `[α₀, α₁, α₂]`.
- **Equal x/y scale.** `k` is derived from the *shorter* side so circles stay
  circles and the plot fills the whole rectangle (not an inscribed square); the
  longer side just shows more plane.

## Testing & verification

- `npm run build` — the only CI gate; must pass.
- No unit tests yet (no `__tests__/`); `complexOps.ts` is structured to add some
  (pure, no React/DOM).
- Headless screenshot: `node scripts/shoot.mjs '#/argand' shot.png`.
- By eye: drag `α₁` and confirm the ×α₁ leg **spirals** (never cuts a straight
  chord) while `+α₀` slides straight; toggle **View from z*** and confirm `f` reads
  as a pure spiral about the gold point; switch **Degree → Quadratic** and confirm
  the grid **bends** and two `z*`'s + the slate critical ⊕ appear; slide **j²** to
  Split and confirm the unit curve becomes a hyperbola with the red null cone and
  the multiply leg becomes a hyperbolic **boost**; enable **Iterate** with `|α₁|<1`
  and confirm the orbit spirals *into* `z*`.

## History & sources

- **Built/iterated by:** the Argand app branch(es) under
  [`docs/sessions/`](../sessions/) (the successor-to-Plane-Transform line).
- **Possible sources:** see the EXPLAINER's "Possible sources & where to go
  further" — the **Argand diagram** (Argand 1806; Wessel 1799), **de Moivre** /
  Euler's `e^{iθ}` and Needham's *Visual Complex Analysis*, the affine fixed point
  as the gateway to **complex dynamics**, and the **dual** (Galilean) /
  **split-complex** (Minkowski) planes and the `p = j²` trichotomy — Yaglom's
  Cayley–Klein geometries, split-complex as Lorentz boosts/rapidity, dual numbers
  as automatic differentiation / screw theory.
</content>
</invoke>
