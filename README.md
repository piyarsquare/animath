# animath

> *Animated mathematics for curious minds* — a modular, browser-based toolkit for creating, sharing, and exploring mathematical animations and generative art.

<p style="text-align: center;">
  <a href="https://piyarsquare.github.io/animath/">Live demo</a>
</p>

## Apps

1. **[Complex Particles](https://piyarsquare.github.io/animath/#/)** – 3D representation of four-dimensional complex functions. Includes the former *Complex Roots* (`z^(p/q)`) and *Complex Multibranch* (multi-sheeted maps for `sqrt`, `ln`, etc.) as built-in modes.
2. **[Fractals](https://piyarsquare.github.io/animath/#/fractals)** – GPU-accelerated Mandelbrot / Julia / Burning Ship / Tricorn viewer with optional orbit-tracing mode.
3. **[Correspondence](https://piyarsquare.github.io/animath/#/correspondence)** – side-by-side Mandelbrot–Julia explorer; pick or draw paths through `c`.
4. **[Möbius Walk](https://piyarsquare.github.io/animath/#/mobius)** – first-person stroll through a twisted corridor.
5. **[Stable Marriage](https://piyarsquare.github.io/animath/#/stable-marriage)** – step through the Gale–Shapley algorithm with bias and consensus controls.
6. **[Agentic Sorting](https://piyarsquare.github.io/animath/#/agentic-sorting)** – concurrent sorting simulation where autonomous agents with distinct strategies produce emergent order.

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

Every route is wrapped in a persistent `AppShell` that provides:

* A top bar showing the current app's name and (where relevant) a formula.
* Three menu buttons: **Apps** (☰), **Settings** (⚙), and **Actions** (▶).
  Each opens a side drawer to that tab directly.
* iOS safe-area padding so the bottom of the screen stays visible behind
  Safari's URL bar and the home indicator.

The Complex Particles viewer also adds a small floating **quarter-turn**
cluster in the bottom-left corner of the canvas for direct 4D plane
rotations (tap for 90°, hold for continuous rotation).

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
├── index.tsx               # entry: hash-based router + AppShell
├── App.tsx                 # default route (Complex Particles)
│
├── animations/             # one folder per app, each with its own README
│   ├── ComplexParticles/   # 4D complex-function viewer (Particles + Roots + Multibranch)
│   ├── FractalsGPU/        # GPU Mandelbrot / Julia / Burning Ship / Tricorn
│   ├── Correspondence/     # Mandelbrot ↔ Julia split view
│   ├── Fractals/           # legacy CPU fractal renderer (unreachable, kept for reference)
│   ├── MobiusWalk/         # first-person corridor walk
│   ├── StableMarriage/     # Gale–Shapley visualiser + heatmap lab
│   └── AgenticSorting/     # concurrent agent-based sorting
│
├── components/             # shared UI
│   ├── AppShell.tsx        # global chrome: top bar + drawer + tabs
│   ├── ParticleViewerShell # wraps Canvas3D + standard 7 sections for the particle viewers
│   ├── ControlPanel.tsx    # form primitives (Section / Slider / Pills / Select / Checkbox)
│   ├── Canvas3D.tsx        # Three.js scene + camera + resize wrapper
│   ├── Readme.tsx          # in-app markdown renderer
│   └── ToggleMenu.tsx      # collapsible menu (legacy, used by FractalsGPU)
│
├── controls/
│   └── QuarterTurnFloater  # floating 4D quarter-turn cluster
│
├── lib/
│   ├── particles/          # shared particle-viewer engine
│   │   ├── createAnimationLoop.ts
│   │   ├── createAxes.ts
│   │   ├── createParticleGeometry.ts
│   │   ├── useParticleState.ts
│   │   ├── useUniformSync.ts
│   │   ├── useViewControls.ts
│   │   ├── useGestureRotation.ts   # camera-orbit + zoom gestures
│   │   └── types.ts                # ProjectionMode, ColorStyle, shapeNames, …
│   ├── useViewportGestures.ts      # pan + pinch-zoom + tap for 2D viewers
│   ├── viewpoint.ts                # 4D → 3D projection helpers
│   ├── complexMath.ts              # complex arithmetic + function names
│   └── textures.ts                 # particle texture factory
│
├── math/
│   ├── constants.ts        # plane names, QUARTER constant
│   └── quat4.ts            # 4D quaternion rotation builder
│
├── config/defaults.ts      # shared sliders, ranges, initial values
├── styles/responsive.ts    # breakpoints + useResponsive hook
└── types/uniforms.d.ts     # shader uniform type declarations
```

For architectural notes and the consolidation history that produced the
current shape, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 5 Adding a new animation

1. Create `src/animations/MyAnimation/MyAnimation.tsx` and (optionally) a
   `README.md` next to it loaded via `import md from './README.md?raw'`.
2. Add a route entry in `src/index.tsx`:
   ```ts
   const MyAnimation = React.lazy(() => import('./animations/MyAnimation/MyAnimation'));
   const apps: AppDescriptor[] = [
     // …existing entries…
     { hash: '/my-animation', name: 'My Animation', icon: '◆' },
   ];
   const routes = {
     // …existing routes…
     '/my-animation': MyAnimation,
   };
   ```
3. Inside the component, call `useAppHeader('My Animation', 'optional formula')`
   to populate the top bar, and render `<ShellSettings>` / `<ShellActions>`
   for controls.

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
* **Quarter-turn floater** (bottom-left of the canvas) — tap a plane button
  for a 90° animated turn, **hold** for continuous rotation. Includes a
  "Reset orientation" row.

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
