# Plane Transform — Interface Manual

> **Purpose.** A complete, code-free inventory of every screen region, control, panel,
> overlay, and readout in the **Plane Transform** app (route `#/plane-transform`) of the
> animath toolkit. **Scope:** this single app *plus* the shared `AppShell` chrome it
> inherits, with explicit notes on where the app reuses, extends, or deviates from that
> shell. **Captured as built** from the source on the default branch — this is a snapshot
> of behavior, not a specification, written in the present tense.

> **In-flight work (not on `main`).** An active branch
> `claude/complex-viewer-polar-views-fApMG` is adding **polar / log-polar plane views**
> (a new `polarViews.ts`, a shader change, and EXPLAINER edits). That work is **not yet
> merged** and is **not** documented here; this manual describes the current `main` state.

---

## 0. What the app is

Plane Transform visualizes a complex function `f : ℂ → ℂ` as a transformation of the
plane. It shows two square panes side by side (on a wide canvas) or stacked top/bottom (on
a tall one): an **Input** pane of a colored grid of points `z = x + iy`, and an **Output**
pane showing the same colored points relocated to `w = f(z)`. The identical point cloud is
rendered into both panes; only the output pane's vertex shader applies the selected
function. Color rides with each point, so a region's color in the input reveals where `f`
sends it. A draggable freehand/standard-curve overlay lets the user trace a path in the
input and watch its image in the output.

---

## 1. Screen layout

Regions, top to bottom:

- **Top bar** — the shared `AppShell` chrome (home, apps, function, title/formula,
  settings, actions, explainer).
- **Dual-pane viewport** — fills the rest of the screen (`position: absolute; inset: 0`),
  background `#1a1a22` with a 1px gap between panes. Flex direction is **row** when the
  wrapper is wider than tall, **column** otherwise (a `ResizeObserver` flips it live).
  - **Input pane** (left/top): WebGL canvas on `#0c0c10`, a top-left monospace label
    `INPUT · z = x + iy`, and an SVG curve overlay. Owns freehand drawing + zoom pointers.
  - **Output pane** (right/bottom): WebGL canvas on `#0c0c10`, label `OUTPUT · w = f(z)`,
    SVG overlay of the mapped curve. Owns zoom pointers only.
  Each pane renders its scene as a centered **square** sized to the smaller of the pane's
  two dimensions, so the `(x, y)` view stays isotropic; remaining area is letterboxed.
- **PlaneCurveFloater** — app-specific floating panel, bottom-left of the viewport
  (`bottom: 16px; left: 16px`, z-index 30).

```
+--------------------------------------------------------------+
|  ⌂  ☰   ƒ   sin   sin(z)            ⚙   ▶   ?     (top bar)   |
+----------------------------+---------------------------------+
| INPUT · z = x + iy         | OUTPUT · w = f(z)               |
|                            |                                 |
|     [colored grid]         |      [f(grid)]                  |
|     [curve overlay]        |      [mapped curve]             |
|                            |                                 |
| [✎]  <- PlaneCurveFloater  |                                 |
+----------------------------+---------------------------------+
        (row when wide; stacked column when tall)
```

---

## 2. Shared chrome, as this app uses it

The app mounts inside the single persistent `AppShell`. Top-bar buttons (left→right):

| Element | State in this app | Notes |
|---|---|---|
| **⌂ Home** | Active | Standard shell behavior (back to landing menu). |
| **☰ Apps** | Active | Standard drawer Apps tab. |
| **ƒ Function** | **Active** | App calls `useAppFunctions(...)`; the ƒ button + Function tab switch functions. |
| **Title / subtitle** | Active | Title = current function name (e.g. `sin`); subtitle = its formula (e.g. `sin(z)`), or `z^(p/q)` when the rational-power function is selected. Set via `useAppHeader(fnName, fnFormula)`. |
| **⚙ Settings** | **Active** | App fills it via `<ShellSettings>` (sections below). |
| **▶ Actions** | **Dimmed** | App registers **no** `<ShellActions>`. The Actions tab stays empty and the button dims. |
| **? Explainer** | **Active** | App calls `useAppExplainer(explainerText)` (imports `EXPLAINER.md?raw`). |

Drawer tabs the app fills: **Function** (via `useAppFunctions`) and **Settings** (via
`<ShellSettings>`). It does **not** fill **Actions**.

Floater behavior:

- The app does **not** call `useActionFloaterOff()`, and it registers **no**
  `<ShellActions>` content. Because the generic `ActionFloater` only mirrors registered
  Actions, there is effectively **no generic floater shown** here (nothing to mirror).
- Instead the app ships its **own** floating panel, **`PlaneCurveFloater`** (see §6),
  rendered directly in the component tree — not through the shell's action portals.

Function registration detail: `useAppFunctions` is given `{ names: functionNames,
current: fnName, onChange }`, where `onChange(name)` looks up the name's index in
`functionNames` and sets `functionIndex`. The same function list **also** appears as a
`Select` inside the Settings → Function section (see §11, duplication).

---

## 3. The main view

Both panes are pointer-interactive (raw `onPointer*` / `onWheel` handlers on the pane
divs; the shared `useViewportGestures` helper is **not** used here). `touchAction: none`
on each pane.

| Gesture | Input pane | Output pane |
|---|---|---|
| 1-finger / mouse drag | If **Draw mode** is on: draws a freehand curve (samples points). Otherwise: no effect (no camera pan). | No effect. |
| 2-finger drag (pinch) | Zoom: changes `viewExtent` by the pinch-distance ratio. Cancels any in-progress stroke. | Zoom (same). |
| Mouse wheel | Zoom: `factor = exp(deltaY · 0.0015)`. | Zoom (same). |
| Tap (draw mode) | Starts a fresh stroke at the tapped math point. | — |

Zoom is shared: either pane's zoom updates the single `viewExtent` state, clamped to
**[0.2, 20]** for wheel/pinch (the Extent slider clamps differently — see §4). There is no
panning of the look-at center; the view is always centered on the origin.

**What is drawn.** A grid of `density × density` points is sampled in math coordinates
over `[-viewExtent, +viewExtent]²`. Each point carries a 4-component random `seed`
attribute. The input pane's vertex shader places points directly (`pos / viewExtent`); the
output pane's shader runs `applyComplex` first, then divides. Points exceeding length
`1e3` are clamped to a radius-`1e3` sphere (so a single point near infinity, e.g. from
`1/z`, doesn't blow out the view). Each point is drawn as a round sprite. The fragment
shader colors **by the source position** `vSourcePos` (the input `z`), so a point keeps
its color in both panes.

The curve overlay is a white SVG polyline (`stroke #ffffff`, opacity 0.9, width 2, round
joins/caps), drawn into both panes; the output pane shows the curve mapped through `f`.
Curve points are clamped to ±`1e3` to match the shader.

---

## 4. Settings (drawer ⚙)

Rendered through `<ShellSettings>` using the shared `ControlPanel` primitives. Sections
top to bottom; **Function** and **Color** start **open**, **View** and **About** start
**closed**.

### Function (`ƒ` icon) — starts open
| Control | Type | Label | Range / options | Default | Behavior |
|---|---|---|---|---|---|
| Function | `Select` | `Function` | All 19 names: `linear, sqrt, square, ln, exp, sin, cos, tan, inverse, cube, reciprocalCube, joukowski, rational22, essentialExpInv, branchSqrtPoly, gamma, cubeRoot, zMinus1OverZPlus1, powPQ` | index of `sin` | Sets `functionIndex`; drives header + output shader. |
| p | number input | `p` | integer, step 1 | `1` | **Conditional:** only when `powPQ` selected. Numerator of `z^(p/q)`. |
| q | number input | `q` | integer, step 1 | `2` | **Conditional:** only when `powPQ`. Denominator; treated as 1 if 0. |
| Branch index | `Select` | `Branch index` | `-2, -1, 0, 1, 2` | `0` | **Conditional:** only for multi-valued functions — `sqrt` (1), `ln` (3), `branchSqrtPoly` (14), and `powPQ` (18). Selects the Riemann sheet. |

The `p`/`q` inputs are hand-rolled `<input type="number">` rows (using `cp-row` /
`cp-row-label` classes), not a `ControlPanel` primitive.

### Color (`◐` icon) — starts open
| Control | Type | Label | Range / options | Default | Behavior |
|---|---|---|---|---|---|
| Mode | `Pills` | `Mode` | `Smooth` (0), `Tiles` (1), `Grid only` (2) | `Smooth` | Selects the fragment-shader coloring scheme. |
| Saturation | `Slider` | `Saturation` | min 0, max 1, step 0.01 | `0.85` | HSV saturation; readout `toFixed(2)`. |
| Intensity | `Slider` | `Intensity` | min 0.3, max 1.5, step 0.05 | `1.0` | Multiplies final color; readout `toFixed(2)`. |

### View (`◑` icon) — starts closed
| Control | Type | Label | Range / options | Default | Behavior |
|---|---|---|---|---|---|
| Extent (±) | `Slider` | `Extent (±)` | min 0.5, max 10, step 0.5 | `3` | Half-side of the visible square; rebuilds geometry. Readout `toFixed(1)`. (Pinch/wheel zoom can drive `viewExtent` to the wider [0.2, 20] range.) |
| Point size | `Slider` | `Point size` | min 1, max 6, step 0.5 | `2.5` | GL point size; readout `toFixed(1)`. |
| Density (per side) | `Slider` | `Density (per side)` | min 40, max 900, step 20 | `240` | Points per side; rebuilds the cloud. Readout `N×N (M)` millions, e.g. `240×240 (0.06M)`. |

### About (`ⓘ` icon) — starts closed
- Renders `README.md` via the shared `Readme` component (markdown → HTML).

### Reset button (below all sections)
- Plain `<button>` labeled **`Reset settings to defaults`** (title: "Forget saved settings
  and restore the defaults"). Border `var(--cp-border)`, translucent white background,
  `var(--cp-fg)` text. On click: clears the `plane-transform` localStorage namespace and
  reloads the page.

---

## 5. Actions (drawer ▶ and/or floater)

**None.** The app registers no `<ShellActions>`, so the Actions tab is empty and the ▶
button is dimmed. All action-like controls (draw, standard curves, clear) live in the
app-specific PlaneCurveFloater instead (§6), not in the shell's Actions surfaces.

---

## 6. App-specific overlay — the PlaneCurveFloater

A self-contained floating panel (bottom-left, z-index 30) styled to mirror the look of the
particle viewers' `QuarterTurnFloater`: translucent dark panel
(`rgba(12,12,16,0.72)`, `blur(8px)`, 1px `rgba(255,255,255,0.08)` border, 10px radius,
drop shadow), `min-width 200px`. It is **not** draggable (unlike the shared `ActionFloater`).

**Collapsed state** (default on mount): a single 36×36 toggle button glyph **`✎`**
(`aria-label "Show curve drawing panel"`, title "Curve").

**Expanded state** (after clicking the toggle):

- **Header:** title `Curve` (uppercase, dim) + a close button **`×`**
  (`aria-label "Hide curve panel"`) that re-collapses.
- **Draw toggle button** (full width): label toggles between **`✎ Draw on input`** and,
  when active, **`● Drawing — tap to stop`**. Active state turns the button accent yellow
  (`var(--cp-accent, #ffd400)`, black text). `aria-pressed` reflects `drawMode`. Enables
  freehand stroke capture on the input pane.
- **Standard curves** (labeled section): a 3-column grid of buttons. Each builds a stock
  curve scaled to the current `viewExtent` and sets it as the active curve. Order and
  labels (button title = the curve id):

  | Button label | id | Shape drawn |
  |---|---|---|
  | `Circle` | circle | Circle, radius `0.6·extent`. |
  | `Square` | square | Axis-aligned square, half-side `0.6·extent`. |
  | `X-axis` | horizontal | Horizontal segment spanning `±0.95·extent`. |
  | `Y-axis` | vertical | Vertical segment spanning `±0.95·extent`. |
  | `Diag` | diagonal | Main-diagonal segment, span `±0.7·extent`. |
  | `Cross` | cross | Horizontal then vertical segment through origin (one polyline). |
  | `Spiral` | spiral | 4-turn Archimedean spiral out to `0.6·extent`. |
  | `∞` | lemniscate | Bernoulli lemniscate `r² = a²cos2θ`, both lobes. |
  | `Heart` | cardioid | Cardioid `r = a(1 − cosθ)`, `a = 0.3·extent`. |

- **Clear button** (full width, `Clear`): clears the active curve and turns draw mode off.
  **Disabled** (dimmed, not-allowed cursor) when there is no curve.

The curve set by these controls is mapped through the current function (`applyComplexBranch`
or `complexPowRational` with the active branch/exponents) to produce the output polyline,
recomputed whenever the curve, function, exponents, or branch change.

---

## 7. Explainer popup (?)

Triggered by the top-bar **?** button; content from `EXPLAINER.md`. It explains:

- The app shows `f : ℂ → ℂ` as a plane transformation; **same color = same point** across
  the two panes.
- **Conformal maps** (`z²`, `eᶻ`, `1/z`) preserve angles — right-angle grid crossings stay
  right-angled even where the map stretches and bends.
- **Color:** hue = argument of `z`; brightness/tile pattern encode magnitude.
- **Multi-valued functions and the branch index:** `√z`, `ln z`, `z^(p/q)` are
  multi-valued because the argument `θ` is defined only up to `2π`. A **branch** is a
  consistent choice of `θ`; the **branch index `k`** offsets it (√z: +k·π; ln z: +k·2π to
  the imaginary part; z^(p/q): selects which of the `q` roots). Includes a small table of
  branch effects and explains the **branch cut** (negative real axis) where color jumps,
  and stepping `k` walks onto the next Riemann sheet.

(The longer `README.md`, shown in Settings → About, covers the three coloring modes and
the Density/Extent tips in more detail.)

---

## 8. Domain notes

**How `f` warps the plane.** The vertex shader's `applyComplex(z, t)` switch implements 19
functions indexed `0..18` matching `functionNames`: `linear (identity)`, `sqrt` (branch),
`square`, `ln` (branch), `exp`, `sin`, `cos`, `tan`, `inverse (1/z)`, `cube`,
`reciprocalCube`, `joukowski (½(z+1/z))`, `rational22 ((z²+1)/(z²−1))`,
`essentialExpInv (e^{1/z})`, `branchSqrtPoly (√(z(z−1)(z+1)))`, `gamma (Γ)`, `cubeRoot`,
`zMinus1OverZPlus1 ((z−1)/(z+1))`, and `powPQ (z^(p/q))`. The input pane uses the identity
(`transform = 0`); the output pane uses `transform = 1`. Output positions are divided by
`viewExtent` to map into clip space.

**Color encoding** (fragment shader, keyed on the source `z`):
- **Smooth (0):** hue from `arg(z)`; value banded by `fract(log(r)/0.5)` → concentric
  rainbow rings.
- **Tiles (1):** 12 angular sectors × log-radius rings, alternating lightness (0.55 / 0.28).
- **Grid only (2):** dark field with bright rings near log-radius integers and bright rays
  every `π/6`, glowing in the local hue.
All three use HSV→RGB with the user `saturation`, scaled by `intensity`.

**Standard curves** are sampled in TypeScript (`standardCurves.ts`) densely enough that
even strongly-warping functions yield smooth output polylines, then re-mapped through the
complex math in `complexMath.ts`.

---

## 9. Persistence

Uses `usePersistentState` under the `plane-transform` localStorage namespace.

**Persisted** (survive reload): `functionIndex`, `expP`, `expQ`, `branchIndex`, `density`,
`pointSize`, `viewExtent`, `colourMode`, `saturation`, `intensity`.

**Transient** (plain `useState`, reset each session): the drawn `curve` and `drawMode`,
plus derived/layout state (`horizontal` orientation, inscribed-square box, pointer maps).

"Reset settings to defaults" calls `clearPersistedState('plane-transform')` and reloads.

---

## 10. Component / file map

| Concern | File |
|---|---|
| Main component, panes, settings, uniform sync, curve mapping | `src/animations/PlaneTransform/PlaneTransform.tsx` |
| Curve floater UI (toggle/draw/standard/clear) | `src/animations/PlaneTransform/PlaneCurveFloater.tsx` |
| Curve floater styling | `src/animations/PlaneTransform/PlaneCurveFloater.css` |
| Vertex + fragment shaders (function switch, coloring) | `src/animations/PlaneTransform/shaders/index.ts` |
| Standard-curve point builders | `src/animations/PlaneTransform/standardCurves.ts` |
| About text (Settings → About) | `src/animations/PlaneTransform/README.md` |
| Explainer text (? popup) | `src/animations/PlaneTransform/EXPLAINER.md` |
| Function names / formulas / complex math / branches | `src/lib/complexMath.ts` |
| Persistence helpers | `src/lib/usePersistentState.ts` |
| Shared chrome + integration hooks/portals | `src/components/AppShell.tsx` |
| Control primitives (Section/Slider/Pills/Select) + CSS vars | `src/components/ControlPanel.tsx`, `ControlPanel.css` |

---

## 11. Seams & observations for the redesign

The most important section for refining the shared shell.

1. **Ships its own floater instead of using the shell's Actions/`ActionFloater`.** The
   draw / standard-curves / clear controls are genuinely *action*-like (verbs, transient
   state), yet they live in a bespoke `PlaneCurveFloater` rather than `<ShellActions>`.
   Consequences: the **▶ Actions button is dimmed and the Actions tab is empty** even
   though the app clearly has actions; the curve panel duplicates the shell floater's
   visual language (translucent panel, collapse toggle) by hand and re-implements
   collapse/expand from scratch; and unlike the shared `ActionFloater` it is **not
   draggable**. Candidate for the redesign: either route these through `ShellActions` (so
   they also appear in the drawer), or generalize the shell floater so apps can supply a
   custom action surface without re-styling.

2. **Function picker surfaced in two independent places.** The same `functionNames` list
   is exposed via `useAppFunctions` (ƒ button + Function tab) *and* re-declared as a
   `Select` inside Settings → Function. The two are wired to the same state but are
   separate UI; a user can change the function from either. The redesign could canonicalize
   one location (the shell's Function tab) and let the app contribute only the *dependent*
   controls (p/q, branch) — see next item.

3. **Conditional, function-dependent controls have no shell affordance.** The `p`/`q`
   number inputs and the Branch-index `Select` appear/disappear based on which function is
   selected, and `p`/`q` are hand-rolled `<input type="number">` rows (using `cp-row`
   classes) rather than a `ControlPanel` primitive — there is no shared numeric-input
   primitive. A reusable "integer field" primitive and a sanctioned pattern for
   function-conditional controls would remove this bespoke markup.

4. **Per-app Reset button is hand-rolled.** "Reset settings to defaults" is an inline
   `<button>` with bespoke styles, duplicated in concept across viewers. This is a
   candidate for a shared shell affordance (e.g. a standard reset action tied to the app's
   storage namespace).

5. **Gestures are re-implemented, not shared.** Each pane carries its own
   pointer/pinch/wheel handlers (`useViewportGestures` is *not* used here, and the
   particle engine's gesture hook isn't applicable to a 2D ortho view). Zoom clamping is
   also inconsistent: pinch/wheel clamp `viewExtent` to **[0.2, 20]** while the Extent
   slider clamps to **[0.5, 10]**. A shared 2D-viewport gesture/zoom helper with a single
   clamp range would unify this with the fractal viewers.

6. **No camera pan.** Unlike particle/fractal viewers, the view is locked to the origin
   (only zoom). Worth noting if the shell ever standardizes a "navigate the 2D view"
   convention.

---

*End of manual.*
