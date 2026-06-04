# animath

> *Animated mathematics for curious minds* — a modular, browser-based toolkit for creating, sharing, and exploring mathematical animations and generative art.

<p style="text-align: center;">
  <a href="https://piyarsquare.github.io/animath/">Live demo</a>
</p>

The landing page (`#/`) is a gallery of every app; the cards below are also
reachable directly by hash route.

1. **[Complex Particles](https://piyarsquare.github.io/animath/#/complex-particles)** – 3D representation of four-dimensional complex functions. Includes the former *Complex Roots* (`z^(p/q)`) and *Complex Multibranch* (multi-sheeted maps for `sqrt`, `ln`, etc.) as built-in modes.
2. **[Plane Transform](https://piyarsquare.github.io/animath/#/plane-transform)** – watch a complex function `f : ℂ → ℂ` warp a coloured grid of the plane, input pane beside output pane.
3. **[Fractals](https://piyarsquare.github.io/animath/#/fractals)** – GPU-accelerated Mandelbrot / Julia / Burning Ship / Tricorn viewer with optional orbit-tracing mode.
4. **[Correspondence](https://piyarsquare.github.io/animath/#/correspondence)** – side-by-side Mandelbrot–Julia explorer; pick or draw paths through `c`.
5. **[Möbius Walk](https://piyarsquare.github.io/animath/#/mobius)** – first-person stroll through a twisted corridor.
6. **[Trinary System](https://piyarsquare.github.io/animath/#/trinary)** – drop a planet into a chaotic three-star system and watch its future diverge; an in-app **Lab** tab runs thousands of worlds and maps their fates into fractal "destiny" portraits and statistics.
7. **[Stable Marriage](https://piyarsquare.github.io/animath/#/stable-marriage)** – step through the Gale–Shapley algorithm with bias and consensus controls.
8. **[Agentic Sorting](https://piyarsquare.github.io/animath/#/agentic-sorting)** – concurrent sorting simulation where autonomous agents with distinct strategies produce emergent order.

---

## 1 What is animath?

`animath` is a TypeScript + React + Three.js codebase for **rapid prototyping
of mathematical visuals**. It started as a domain-colouring playground for
complex analysis and is growing into a general toolkit: fractals,
differential-equation flows, algebraic surfaces, sorting and matching
algorithms, and more.

Goals:

* **Self-contained** — runs in any modern browser; no server component.
* **Composable** — each app is an isolated React module with its own shaders
  and UI.
* **Pedagogical** — clear code and per-app README pages explaining the maths.
* **Mobile-friendly** — every app works on a phone with touch gestures.

---

## 2 The app shell

The default route (`#/`) is a **landing menu** — a gallery of cards, one per
app. Every other route is wrapped in a persistent `AppShell` that provides a top
bar with these buttons (left to right):

* **⌂ Home** — back to the landing menu (hidden on the menu itself).
* **☰ Apps** — opens the drawer's Apps tab to switch animations.
* **ƒ Function** — switch the active function/variant where an app offers one
  (dimmed otherwise).
* **Title** — the current app's name plus an optional monospace formula;
  clicking it jumps to the Settings tab.
* **⚙ Settings** — the app's parameter controls.
* **▶ Actions** — one-shot actions (reset, modes, …); these are mirrored into a
  draggable on-canvas floater.
* **? Explainer** — a "what am I looking at?" popup with a short write-up.

Buttons for tabs an app doesn't populate are dimmed. The shell also adds iOS
safe-area padding so the bottom of the screen stays visible behind Safari's URL
bar and the home indicator.

The Complex Particles viewer puts its **4D rotation controls** in the standard
Actions panel (the draggable floating panel + the drawer's Actions tab): tap a
plane button for an eighth turn (45°), or flip the toggle under it to spin that
plane continuously.

---

## 3 Quick start

```bash
git clone https://github.com/piyarsquare/animath.git
cd animath
npm ci          # reproducible install
npm run dev     # http://localhost:5173/animath/
```

Production build & preview:

```bash
npm run build           # outputs static files to dist/
npx vite preview        # serves dist/ at http://localhost:4173/animath/
```

Node ≥ 20, npm ≥ 10 recommended.

### Deploying

Pushes to `main` automatically trigger the **Deploy demo** workflow, which
publishes `dist/` to GitHub Pages. The workflow also accepts manual dispatch
from the Actions tab.

For per-PR preview URLs (so you can test a branch on your phone without
merging to `main`), see [docs/PREVIEW_DEPLOYS.md](./docs/PREVIEW_DEPLOYS.md).

---

## 4 Repository layout

```
src/
├── index.tsx               # entry: hash-based router + AppShell, lazy route map
├── App.tsx                 # default Complex Particles route (lazy wrapper)
├── apps.ts                 # app registry: drives the router AND the landing menu
│
├── animations/             # one folder per app, each with README + EXPLAINER
│   ├── ComplexParticles/   # 4D complex-function viewer (Particles + Roots + Multibranch)
│   ├── PlaneTransform/     # f as a transformation of the coloured plane
│   ├── FractalsGPU/        # GPU Mandelbrot / Julia / Burning Ship / Tricorn
│   ├── Correspondence/     # Mandelbrot ↔ Julia split view
│   ├── Fractals/           # legacy CPU fractal renderer (routed at #/fractals-cpu)
│   ├── MobiusWalk/         # first-person corridor walk
│   ├── StableMarriage/     # Gale–Shapley visualiser + heatmap lab
│   └── AgenticSorting/     # concurrent agent-based sorting
│
├── components/             # shared shell + UI
│   ├── AppShell.tsx        # global chrome: top bar + drawer + tabs + integration hooks
│   ├── ActionFloater.tsx   # draggable on-canvas mirror of the Actions tab
│   ├── Menu.tsx            # landing gallery rendered at the `/` route
│   ├── ParticleViewerShell # wraps Canvas3D + standard 7 sections for the particle viewers
│   ├── ControlPanel.tsx    # form primitives (Section / Slider / Pills / Select / Checkbox)
│   ├── Canvas3D.tsx        # Three.js scene + camera + resize wrapper
│   ├── Readme.tsx          # in-app markdown renderer
│   └── ToggleMenu.tsx      # collapsible menu (legacy, used by FractalsGPU)
│
├── controls/
│   └── QuarterTurnControls # 4D eighth-turn + spin controls (Actions panel)
│
├── lib/
│   ├── particles/          # shared particle-viewer engine
│   │   ├── createAnimationLoop.ts
│   │   ├── createAxes.ts
│   │   ├── createParticleGeometry.ts
│   │   ├── useParticleState.ts
│   │   ├── useUniformSync.ts
│   │   ├── useViewControls.ts
│   │   ├── useGestureRotation.ts   # camera-orbit + pan + zoom gestures
│   │   └── types.ts                # ColorStyle, ColourBy, shapeNames, viewTypes, …
│   ├── useViewportGestures.ts      # pan + pinch-zoom + tap for 2D viewers
│   ├── viewpoint.ts                # 4D → 3D projection helpers + ProjectionMode
│   ├── complexMath.ts              # complex arithmetic + function names/formulas
│   ├── colormaps.ts                # GLSL palettes for the fractal viewers
│   └── textures.ts                 # particle texture factory (incl. base-aware HDR)
│
├── math/
│   ├── constants.ts        # plane names, QUARTER constant
│   └── quat4.ts            # 4D quaternion rotation builder
│
├── config/defaults.ts      # shared sliders, ranges, initial values
├── styles/responsive.ts    # breakpoints + useResponsive hook
└── types/uniforms.d.ts     # shader uniform type declarations
```

For a hands-on walkthrough of adding a module, see
[docs/BUILDING_AN_APP.md](./docs/BUILDING_AN_APP.md). For background on the
consolidation that produced the current shape, see
[ARCHITECTURE.md](./ARCHITECTURE.md) (a historical design proposal — the layout
above is the source of truth).

---

## 5 Adding a new animation

The full, copy-pasteable walkthrough lives in
[docs/BUILDING_AN_APP.md](./docs/BUILDING_AN_APP.md). The short version:

1. Create `src/animations/MyAnimation/MyAnimation.tsx`, plus a `README.md`
   (the in-app **About** section) and `EXPLAINER.md` (the **?** popup), both
   loaded via `import md from './README.md?raw'`.
2. Register the lazy route in `src/index.tsx`:
   ```ts
   const MyAnimation = React.lazy(() => import('./animations/MyAnimation/MyAnimation'));
   const routes = {
     // …existing routes…
     '/my-animation': MyAnimation,
   };
   ```
3. Register the catalogue entry in `src/apps.ts` (this drives both the drawer's
   Apps tab and the landing menu):
   ```ts
   export const apps: AppDescriptor[] = [
     // …existing entries…
     { hash: '/my-animation', name: 'My Animation', icon: '◆', blurb: 'One-line teaser.' },
   ];
   ```
4. Inside the component, call `useAppHeader('My Animation', 'optional formula')`
   and `useAppExplainer(explainerText)`, then render `<ShellSettings>` /
   `<ShellActions>` for controls (built from the `ControlPanel` primitives).

Three.js animations can wrap `Canvas3D`. For particle-style 4D viewers,
`ParticleViewerShell` plus the `src/lib/particles` hooks gives you the
default Function / Camera / Colour / Particles / Motion / Detail / About
sections out of the box — see ComplexParticles for the simplest example.

GLSL is kept inline as template strings in `shaders/index.ts` per app for
zero-fetch builds.

---

## 6 Interaction conventions

The particle viewers use a clean split between **looking** (gestures) and
**navigating** (buttons):

* **1-finger / mouse drag** orbits the camera around the look-at point.
  Never touches the 4D rotation.
* **2-finger drag** (or `Shift` + drag) pans the look-at target.
* **2-finger pinch** / **mouse wheel** zooms.
* **4D rotation controls** (in the Actions panel) — tap a plane button for an
  eighth turn (45°); the toggle under each button starts/stops a continuous
  spin in that plane and direction (multiple compose into double rotations), with
  one speed slider. Includes drop-axis and a "Reset orientation" row.

The fractal viewers use:

* **Drag** to pan, **pinch** or **wheel** to zoom.
* **Trace mode** (toggle in the Actions drawer) — when on, taps spawn an
  iteration orbit from the tap point.

---

## 7 Projection modes (Complex Particles)

The renderer maps a 4D point `(x, y, u, v)` to 3D using one of:

1. **Perspective** — divide by `3 + v`.
2. **Stereo** — stereographic projection from the +v pole.
3. **Hopf** — Hopf fibration assuming a unit hypersphere.
4. **Drop X / Y / U / V** — discard the named axis.

Switching modes interpolates on the GPU for a smooth transition.

---

## 8 Acknowledgements

* Three.js — rendering engine
* React + Vite — UI and build tooling
* lucide-react — icon set used by Stable Marriage and Agentic Sorting
