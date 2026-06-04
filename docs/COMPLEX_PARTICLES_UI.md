# Complex Particles — Interface Manual

A complete snapshot of the Complex Particles viewer (`#/complex-particles`) and
the generic **AppShell** chrome it lives in. The goal of this document is to
inventory every screen region, button, and control — what it is, where it lives,
and what it does — so the interface can be evaluated and redesigned. It describes
the app as built; it is not a spec.

> Scope: the Complex Particles app plus the shared shell elements (top bar,
> drawer, explainer, floater) that every animath app inherits. Other apps are
> out of scope except where they share these components.

---

## 0. What the app is

A particle renderer for a complex function **f : ℂ → ℂ**. Every input point
`z = x + iy` and its output `w = f(z) = u + iv` together form a 4-D point
**(x, y, u, v)**; the app samples a grid of inputs, places ~80k particles at
those 4-D points, and **projects** them into the 3-D scene. You explore by
(a) moving the camera with gestures, (b) rotating the 4-D pre-image / orbiting
the view with buttons, and (c) tuning appearance/sampling settings in a drawer.

It is the canonical consumer of the shared **particle engine**
(`src/lib/particles/*`) wrapped by **`ParticleViewerShell`**, which itself sits
inside the global **`AppShell`** chrome shared by every animath app.

---

## 1. Screen layout

Four stacked regions plus two overlays:

```
┌───────────────────────────────────────────────┐
│  TOP BAR (48px, fixed)   ⌂ ☰ ƒ  Title/formula  ⚙ ▶ ?   │
├───────────────────────────────────────────────┤
│                                                │
│            FULL-SCREEN 3D CANVAS                │
│        (the particle cloud + 4D axes)          │
│                                  ▶ ActionFloater│  ← draggable, on-canvas
│                                                │
└───────────────────────────────────────────────┘
   ◀ DRAWER slides in from the LEFT (340px)        ← overlay
   EXPLAINER popup centered modal                  ← overlay
```

- **Top bar** — `AppShell.tsx`, height `48px`, dark translucent with blur,
  buttons clustered on the **left**, title next to them, a flexible spacer
  eating the rest. Persistent across every app.
- **Canvas** — `Canvas3D.tsx`, fills the area under the bar. Default clear color
  **black** (flips to white via the "Light background" setting). Captures all
  pointer gestures.
- **Drawer** — slides in from the **left** (340px wide, max 92vw), with a
  transparent scrim so the animation stays fully visible while you tweak
  settings live. Tapping outside or pressing **Esc** closes it.
- **ActionFloater** — a small draggable panel that mirrors the Actions tab,
  floating over the canvas.
- **Explainer popup** — centered modal (max 680px; full-screen on phones).

Accent color throughout is amber `#ffd400`; active/selected items use it for
highlight.

---

## 2. The top bar (left → right)

All live in `AppShell.tsx`. A button is **dimmed to 40% opacity** (still
clickable) when its target is empty.

| Button | Glyph | What it does |
|---|---|---|
| **Home** | `⌂` | Navigate to the landing menu (`#/`). Hidden when already on the menu. |
| **Apps** | `☰` | Opens the drawer on the **Apps** tab. |
| **Function** | `ƒ` | Opens the drawer on the **Function** tab. (Not dimmed here — Complex Particles registers a function list.) |
| **Title + formula** | text | Shows the app/function name (e.g. **exp**) and, in amber monospace, its formula (e.g. `e^z`). For `z^(p/q)` the title becomes `z^(1/2)` and the subtitle `p = 1, q = 2`. **Clicking it opens the Settings tab.** |
| **Settings** | `⚙` | Opens the drawer on the **Settings** tab. |
| **Actions** | `▶` | Opens the drawer on the **Actions** tab. |
| **Explainer** | `?` | Opens the "What am I looking at?" popup. |

The title/formula text is driven by the app via `useAppHeader`; the function
name and formula update live as you change functions.

---

## 3. The canvas — direct manipulation (gestures)

Defined in `useGestureRotation.ts`. **Gestures only move the camera — they never
rotate the 4-D object.** That separation is deliberate: "looking" is gestures,
"navigating the 4-D shape" is buttons.

| Gesture | Effect |
|---|---|
| **1-finger / left-drag** | Orbit camera: drag-right grows azimuth, drag-up pitches. Elevation clamped to just under ±90° (no pole flip). |
| **Shift + drag** | Pan the look-at target in the screen plane (scene follows the finger, Maps-style). |
| **2-finger drag** | Pan (the centroid translates the target). |
| **2-finger pinch** | Zoom (changes camera distance). |
| **Mouse wheel** | Zoom. |

Zoom is clamped to camera distance 2–50. Camera orbit/pan are **transient**
(not saved); the **Reset orientation** action returns to the default vantage.

What's drawn besides particles: four **4-D axis lines** (x, y, u, v), each tinted
by a fixed hue (x = red, y = green, u = cyan, v = magenta, all shifted by the
Hue-shift setting). In Hopf/Torus modes an optional faint **reference scaffold**
(a sphere, or nested Clifford-torus donuts) appears.

---

## 4. The drawer — four tabs

Header reads "Menu" with a `×` close. Tab bar: **Apps · Function · Settings ·
Actions**. A tab label dims when empty. The active app's content is portaled into
Settings/Actions.

### 4.1 Apps tab
A vertical list of every app in the catalog (`apps.ts`), each a row with an icon
+ name; the current app is highlighted with an amber left-border. Picking one
navigates and closes the drawer. (Generic; identical across all apps.)

### 4.2 Function tab
A vertical list of the **19 functions** (each row prefixed `ƒ`), current one
highlighted. Picking one switches the function and closes the drawer. This is a
convenience mirror of the Settings → Function selector, surfaced so you can
change function without digging into Settings. Registered via `useAppFunctions`.

The 19 functions (name → formula):

| | | | |
|---|---|---|---|
| linear `z` | sqrt `√z` | square `z²` | ln `ln(z)` |
| exp `e^z` | sin | cos | tan |
| inverse `1/z` | cube `z³` | reciprocalCube `1/z³` | joukowski `½(z+1/z)` |
| rational22 `(z²+1)/(z²−1)` | essentialExpInv `e^{1/z}` | branchSqrtPoly `√(z(z−1)(z+1))` | gamma `Γ(z)` |
| cubeRoot `∛z` | zMinus1OverZPlus1 `(z−1)/(z+1)` | **powPQ `z^(p/q)`** | |

### 4.3 Settings tab

Seven collapsible **Sections** (`ControlPanel.tsx` primitives: Section, Slider,
Pills, Select, Checkbox). Each section has an icon + chevron; **Function** and
**Camera** start open, the rest collapsed.

**ƒ Function** *(open by default)*
- **Function** — dropdown (Select) of the 19 names.
- *(powPQ only)* two number inputs **p** and **q** (the rational exponent;
  `q=0` is treated as 1).
- **Branches** — Select 1 / 2 / 3. Renders multiple Riemann-sheet copies of
  multivalued functions.
- *(Branches > 1)* **Branch indices** — one number input per branch (which sheet
  each copy uses), and **Differentiate by** — Select *color / intensity / shape*
  (how the copies are told apart: hue offset, brightness falloff, or shape
  cycling).

**◐ Camera** *(open by default)*
- **Projection** — Pills: **Perspective · Stereo · Hopf · Torus** (the 4-D→3-D
  map; see §6). Switches interpolate smoothly on the GPU.
- *(Torus only)* **Collapse → Hopf** — Slider 0–1 (label reads "torus" at 0,
  "sphere" at 1) scrubbing the Clifford-torus fibers collapsing to Hopf points.
- *(Hopf or Torus)* **Reference scaffold** — Checkbox to draw the faint
  sphere/donut guide.
- **Motion** — Pills: **Quaternion · Fixed**. *Quaternion* = a continuous
  automatic 4-D tumble; *Fixed* = no auto-rotation (the 4-D orientation only
  changes when you use the turn buttons).
- **Distance** — Slider 2–50 (camera distance / zoom; shares state with
  pinch/wheel).
- **Log radius** — Checkbox (default off): compress each 4-D point's distance
  from the origin as `log(1 + r)` before projecting, taming functions that blow
  up (exp, gamma, 1/z) so they stay in view. Mostly affects Perspective/Drop
  modes; Stereo and Hopf normalise the radius away so it has little effect there.
- **Orientation matrix** *(desktop only, hidden on mobile/tablet)* — a read-only
  3×4 table showing the current 4-D→3-D basis (columns x, y, v, u, color-coded
  headers), updated live as the object rotates.

**◑ Color**
- **Color by** — Pills: **Domain** (color by input z) / **Range** (color by
  output f(z)).
- **Style** — Pills over the `ColorStyle` enum: **HSV · ModulusBands · PhaseOnly
  · DualHueCVD** (the last is a colorblind-friendly dual-hue scheme).
- **Hue shift** — Slider 0–1 (rotates the whole palette; also recolors the axes).
- **Saturation** — Slider 0–1.

**✦ Particles**
- **Size** — Slider 0.2–5 (default 1).
- **Opacity** — Slider 0–1 (default 0.9).
- **Intensity** — Slider 0.5–2 (default 1, additive-blend brightness).
- **Shape** — Select: **sphere · hexagon · pyramid** (default hexagon).
- **Texture** — Select: **none · checker · speckled · stone · metal · royal**
  (default none).
- **Light background** — Checkbox (black ↔ white clear color; default off).

**〜 Motion**
- **Shimmer** — Slider 0–1 (default 0; per-particle brightness oscillation).
- **Jitter** — Slider 0–0.5 (default 0.1; positional noise).

**⚙ Detail**
- **Particle count** — Slider 1,000–250,000 (default 80k; labeled in "k").
- **Grid extent (±)** — Slider 1–12 (default 4; half-side of the sampled input
  grid).
- **Adaptive density** — Checkbox (default off): sample more densely where
  `|f′(z)|` is large.
- *(Adaptive on)* **Sharpness (α)** — Slider 0–3 (default 1; how aggressively
  sampling biases toward stretching regions).
- **Axis width** — Slider 0.5–5 (default 5).

**ⓘ About**
- Renders the app's `README.md` as formatted markdown (longer write-up).

### 4.4 Actions tab

Hosts the **rotation controls** (`QuarterTurnControls.tsx`) and resets. The body
is a compact grid; column layout is `[label] [spin] [↻] [↺] [spin]`, with a
header row reading **spin ↻ ↺ spin**.

**The grid is context-sensitive to the projection:**

- **Linear projections** (Perspective, Stereo, or any Drop axis): **six rows,
  one per 4-D coordinate plane — XY, XU, XV, YU, YV, UV.** Each plane label is
  rendered with its two letters in their axis colors.
  - The two center buttons (**↻ / ↺**, solid) each perform a single **eighth turn
    = 45°** of 4-D rotation in that plane (animated over ~1s).
  - The two flanking buttons (**dashed toggles**) start/stop a **continuous
    spin** in that plane+direction. When on they fill amber and pulse. Multiple
    spins compose (e.g. XY + UV = an isoclinic double rotation).

- **Hopf / Torus projections** (nonlinear — a 4-D turn deforms the image): the
  six planes are replaced by **three ambient view rows — Yaw, Pitch, Roll** —
  that **orbit the 3-D camera rigidly** instead of rotating the 4-D pre-image.
  Same four-button layout (eighth-turn taps + continuous-spin toggles).
  Switching control modes clears any running spin so a spin of the wrong kind
  can't linger invisibly.

Shared controls below the grid:
- **Spin speed** — Slider 0.1–3 rad/s (default 1.2), the rate for every active
  spinner (and the ambient turntable).
- **Stop all spins** — appears only while a spin is running.
- **Drop axis** — a 4-button row **X Y U V** (axis-colored). Tapping one switches
  to that orthographic "drop one coordinate" projection; tapping the active one
  clears back to None. (Present in both control modes; selecting one flips you to
  a linear projection.)
- **Reset orientation** — returns the 4-D rotation *and* the camera
  (azimuth/elevation/roll/pan) to defaults.
- **Reset settings to defaults** — forgets all saved settings for this viewer and
  reloads the page.

Behavioral note: activating *any* spin automatically switches **Motion → Fixed**,
so the chosen spin shows directly instead of stacking on the auto-tumble.

---

## 5. The ActionFloater (on-canvas)

`ActionFloater.tsx`. A draggable panel mirroring the Actions tab so you can
rotate/spin without opening the drawer.

- **Collapsed:** a small **▶** play button with a `⠿` drag grip on its left edge.
- **Expanded:** a header (`⠿` grip + app title + `×` close) above the same
  QuarterTurnControls content as the Actions tab. The two copies stay in sync
  (same React portal source).
- Drag by the grip to reposition anywhere over the canvas. It's hidden entirely
  if the app has no actions or supplies its own floater.

---

## 6. The Explainer popup

`?` in the top bar → centered modal titled with the function name, body rendered
from `EXPLAINER.md`. Covers the 4-D graph idea, the projection modes, the
quarter-turn/quaternion rotations, and domain coloring. Closed by `×`, clicking
the backdrop, or Esc. Full-screen on phones.

---

## 7. Projection modes (the heart of the viewer)

A 4-D point (x, y, u, v) → 3-D:

- **Perspective** — 4-D camera divide: `(x, y, u) / (3 + v)`. Larger v shrinks
  toward center.
- **Stereo** — place each point on the unit 3-sphere, then stereographic-project
  from the +v pole `(x, y, u)/(1 − v)`. Conformal (small shapes preserved).
- **Hopf** — Hopf fibration S³→S²: position on a sphere by the ratio `z/f(z)`
  (latitude = `|z|/|f|`, longitude = `arg z − arg f`); a whole Hopf-fiber circle
  collapses to one point.
- **Torus** — same Hopf data, fibers intact: nested Clifford-torus donuts. The
  **Collapse → Hopf** slider scrubs from donuts to sphere.
- **Drop X / Y / U / V** — orthographic slice: discard the named coordinate, keep
  the other three.

Hopf and Torus are the two **nonlinear** modes where the Actions grid switches to
Yaw/Pitch/Roll.

---

## 8. Persistence

`usePersistentState` mirrors most **settings** to `localStorage` (namespace
`animath:<v>:complex-particles:<field>`), so they survive reloads: function/p/q/
branches, all color/particle/motion/detail values, projection type, motion mode,
drop axis, scaffold toggle, log-radius toggle.

**Not** persisted (transient "looking" state): camera azimuth/elevation/**roll**/
pan, the Torus collapse scrub, real-view flag, and the spin toggles. "Reset
settings to defaults" clears the persisted namespace and reloads.

---

## 9. Where everything lives (component/file map)

| Concern | File |
|---|---|
| Global chrome: top bar, drawer, tabs, explainer popup, integration hooks | `src/components/AppShell.tsx` (+ `.css`) |
| On-canvas draggable action mirror | `src/components/ActionFloater.tsx`, `useFloaterDrag.ts` |
| Turnkey viewer (all 7 settings sections, wires Actions) | `src/components/ParticleViewerShell.tsx` |
| Form primitives (Section/Slider/Pills/Select/Checkbox) | `src/components/ControlPanel.tsx` |
| Three.js scene/camera/renderer wrapper | `src/components/Canvas3D.tsx` |
| Markdown renderer (About + Explainer) | `src/components/Readme.tsx` |
| Rotation/spin/drop/reset controls | `src/controls/QuarterTurnControls.tsx` (+ `.css`) |
| All viewer state + setters | `src/lib/particles/useParticleState.ts` |
| 4-D turn / orbit / projection / drop control logic | `src/lib/particles/useViewControls.ts` |
| Camera placement, state→uniforms | `src/lib/particles/useUniformSync.ts` |
| Gestures (orbit/pan/zoom) | `src/lib/particles/useGestureRotation.ts` |
| Geometry sampling, axes, rAF loop, scaffold | `createParticleGeometry.ts`, `createAxes.ts`, `createAnimationLoop.ts`, `createHopfScaffold.ts` |
| Enums/lists (shapes, textures, viewTypes, colors) | `src/lib/particles/types.ts` |
| Function math + names/formulas | `src/lib/complexMath.ts` |
| Slider ranges + defaults | `src/config/defaults.ts` |
| The app itself (function picker, branches, shaders, mount) | `src/animations/ComplexParticles/ComplexParticles.tsx` (+ `shaders/`, `README.md`, `EXPLAINER.md`) |

---

## 10. Seams & overlaps worth noting (for the redesign discussion)

Structural observations that fall out of the snapshot:

1. **Three places to change function:** the `ƒ` bar button → Function tab, the
   Settings → Function dropdown, and the title click → Settings. The Function tab
   is a duplicate of one Settings control.
2. **Two copies of the rotation controls** (Actions tab + ActionFloater) that are
   always identical — the floater is the "live" one during exploration, the tab
   copy is rarely the one used.
3. **Zoom lives in two idioms:** the Camera → Distance slider and the pinch/wheel
   gesture, with no visual link between them.
4. **The Actions panel is doing two unrelated jobs:** navigating the 4-D object
   (turns/spins) *and* housing destructive resets ("Reset orientation", "Reset
   settings"), plus a projection control (Drop axis) that arguably belongs with
   the other Projection control in Camera/Settings.
5. **Mode-dependent controls quietly appear/disappear** (Collapse slider,
   scaffold toggle, Adaptive sharpness, Yaw/Pitch/Roll vs six planes, the
   desktop-only orientation matrix) — discoverable only by toggling the thing
   that reveals them.
6. **Settings is long** (7 sections, ~25 controls) with a flat collapsible list;
   there's no grouping by "set once" vs "tweak often."
</content>
</invoke>
