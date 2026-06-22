# animath

> *Animated mathematics for curious minds* — a modular, browser-based toolkit for creating, sharing, and exploring mathematical animations and generative art.

<p style="text-align: center;">
  <a href="https://piyarsquare.github.io/animath/">Live demo</a>
</p>

The landing page (`#/`) is a gallery of every app; the cards below are also
reachable directly by hash route.

1. **[Complex Particles](https://piyarsquare.github.io/animath/#/complex-particles)** – 3D representation of four-dimensional complex functions. Includes the former *Complex Roots* (`z^(p/q)`) and *Complex Multibranch* (multi-sheeted maps for `sqrt`, `ln`, etc.) as built-in modes. A top-bar **↗ plane map** link opens the same function as a plane map in Plane Transform.
2. **[Plane Transform](https://piyarsquare.github.io/animath/#/plane-transform)** – watch a complex function `f : ℂ → ℂ` warp a colored grid of the plane, input pane beside output pane. Its **↗ 4D graph** link opens the same function back in Complex Particles — the graph and the map are two views of one function.
3. **[Fractals](https://piyarsquare.github.io/animath/#/fractals)** – GPU-accelerated Mandelbrot / Julia / Burning Ship / Tricorn viewer with optional orbit-tracing mode.
4. **[Correspondence](https://piyarsquare.github.io/animath/#/correspondence)** – side-by-side Mandelbrot–Julia explorer; pick or draw paths through `c`.
5. **[Topology Walk](https://piyarsquare.github.io/animath/#/topology-walk)** – first-person walk on a closed surface: a twisting / knotted corridor or a flat torus / Klein bottle, with shared footprints, avatar and third-person view.
6. **[Trinary System](https://piyarsquare.github.io/animath/#/trinary)** – drop a planet into a chaotic three-star system and watch its future diverge; an in-app **Lab** tab runs thousands of worlds and maps their fates into fractal "destiny" portraits and statistics.
7. **[Stable Marriage](https://piyarsquare.github.io/animath/#/stable-marriage)** – step through the Gale–Shapley algorithm with bias and consensus controls.
8. **[Agentic Sorting](https://piyarsquare.github.io/animath/#/agentic-sorting)** – concurrent sorting simulation where autonomous agents with distinct strategies produce emergent order.
9. **[Stable Matching](https://piyarsquare.github.io/animath/#/stable-matching)** – a rebuilt Gale–Shapley lab: tune each side's consensus, watch the proposer advantage, sweep the whole consensus plane, and browse the lattice of stable matchings.
10. **[Polygon Worlds](https://piyarsquare.github.io/animath/#/polygon-worlds)** – one decorated square, four worlds: glue its edges and walk a torus, Klein bottle, projective plane or sphere in first person.
11. **[Trees and Nets](https://piyarsquare.github.io/animath/#/trees-and-nets)** – tree-space as a polytope: every triangulation of an n-gon is a tree and every flip an edge, so the whole associahedron becomes a 3D (or 4D) shape you can orbit, colored by energy.
12. **[Solid Worlds](https://piyarsquare.github.io/animath/#/solid-worlds)** – walk *inside* a closed 3-manifold built from one glued cube — a single room that repeats forever. Walk an orientation-reversing loop in the Klein-bottle × circle world and the whole world, sign and your own footprints come back mirror-reversed (the 3D successor to Polygon Worlds).
13. **[Argand Plane](https://piyarsquare.github.io/animath/#/argand)** – drag two complex numbers and watch arithmetic *become* geometry: addition slides tip-to-tail, multiplication spirals (angles add, lengths multiply), and `a·b = b·a` falls out of the picture. An entry-point app for complex numbers; the successor-in-progress to Plane Transform.

---

## 1 What is animath?

`animath` is a TypeScript + React + Three.js codebase for **rapid prototyping
of mathematical visuals**. It started as a domain-coloring playground for
complex analysis and is growing into a general toolkit: fractals,
differential-equation flows, algebraic surfaces, sorting and matching
algorithms, and more.

Goals:

* **Self-contained** — runs in any modern browser; no server component.
* **Composable** — each app is an isolated React module with its own shaders
  and UI.
* **Pedagogical** — clear code and per-app README pages explaining the math.
* **Mobile-friendly** — every app works on a phone with touch gestures.

---

## 2 The workspace chrome

The landing page (`#/`) is a **gallery** — hero, category filter chips, and one
live-preview card per app. Clicking a card opens that app's **workspace**: a
full-viewport dotted "void" stage where *everything is a window* — the plot(s)
("view windows") and the control panels alike. The brand mark (top-left) is
**Home**; the gallery is the only hub between apps.

* **Left icon rail** — one button per panel, drawn from a closed vocabulary of
  **11 archetypes in 5 tiers** (Define → Render → Drive → Analyze → System):
  `subject` ƒ · `domain` · `view` · `color` · `marks` · `motion` · `drive` ·
  `playback` · `lab` · `readout` · `quality`. One icon = one meaning, in every
  app.
* **Windows** drag by their headers with soft-magnetic snapping (accent guide
  lines), dock tightly together, never overlap when opened, reflow as a chain
  when one collapses, and raise to the top when touched. View windows also
  resize from the bottom-right handle and expand to **full screen** from the
  header button (Esc restores).
* **Layouts** — the top-bar `Layout:` menu offers built-in arrangements per app
  plus "Save current layout…"; any manual change marks it `Custom *`.
  Arrangements persist per app.
* **? Explainer** — "what am I looking at?", per app, in a modal.
* **Skins** — the picker (top-right) switches the whole product between five
  token sets on one `data-theme` attribute: **Observatory** (ink blue · gold,
  default), **Paper**, **Spectrum**, **Blueprint**, **Phosphor** (CRT green,
  all-mono type). The choice persists.

Below **740px** the workspace re-chromes for phones: view windows stack as
full-width cards (drag the bottom grip to change a card's height, or use the
header button to take it full screen), the rail becomes a bottom dock, and
panels open one at a time as bottom sheets.

The Complex Particles viewer puts its **4D rotation controls** in the
drive-tier "4D Rotation" panel — open it from the rail and drag it beside the
plot: tap a plane button for an eighth turn (45°), or flip the toggle under it
to spin that plane continuously.

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
├── index.tsx               # entry: bare hash router (gallery at #/), lazy route map
├── App.tsx                 # default Complex Particles route (lazy wrapper)
├── apps.ts                 # app registry (AppDescriptor) — feeds the gallery catalog
│
├── chrome/                 # the redesigned global chrome (docs/redesign/)
│   ├── theme.css           # design tokens: 5 skins on [data-theme] + am-* styles
│   ├── icons.tsx           # closed stroke icon set (archetypes + chrome)
│   ├── skins.tsx           # skin registry + useSkin + SkinPicker
│   ├── TopBar.tsx          # brand-mark Home · title/formula · mode pills · ? · skins
│   ├── ExplainerModal.tsx  # the "?" modal (wraps Readme)
│   ├── Gallery.tsx         # landing gallery (hero, chips, preview cards)
│   ├── catalog.ts          # gallery card metadata derived from apps.ts
│   ├── previews.tsx        # cheap animated canvas previews for the cards
│   ├── readouts.tsx        # Breakdown / MiniHisto / Sparkline / StatGrid / Kicker
│   ├── usePhone.ts         # ≤740px matchMedia hook
│   └── workspace/          # the workspace engine
│       ├── types.ts        # SectionDef / ViewDef / LayoutDef / WorkspaceProps
│       ├── archetypes.ts   # the 11-archetype · 5-tier panel vocabulary
│       ├── geometry.ts     # snap / dock / pack / collapse-chain math
│       ├── Workspace.tsx   # responsive entry (desktop ↔ phone)
│       ├── DesktopWorkspace.tsx  # stage, rail, windows, layouts, persistence
│       ├── PhoneWorkspace.tsx    # stacked cards + bottom dock + sheets
│       └── …               # Panel, ViewWindow, Rail, LayoutsMenu, drag, layouts
│
├── animations/             # one folder per app, each with README + EXPLAINER
│   ├── ComplexParticles/   # 4D complex-function viewer (Particles + Roots + Multibranch)
│   ├── PlaneTransform/     # f as a transformation of the colored plane
│   ├── FractalsGPU/        # GPU Mandelbrot / Julia / Burning Ship / Tricorn
│   ├── Correspondence/     # Mandelbrot ↔ Julia split view
│   ├── Fractals/           # legacy CPU fractal renderer (routed at #/fractals-cpu)
│   ├── TopologyWalk/       # first-person walk: corridor + flat torus / Klein bottle
│   ├── StableMarriage/     # Gale–Shapley visualizer + heatmap lab
│   ├── AgenticSorting/     # concurrent agent-based sorting
│   ├── StableMatching/     # rebuilt Gale–Shapley lab (matrix · welfare · lattice)
│   ├── TrinaryStars/       # three-body sandbox (Observatory) + ensemble Lab
│   └── PolygonWorlds/      # walk every closed surface from one glued polygon
│
├── components/             # shared app-side UI
│   ├── ParticleViewerShell # turnkey workspace assembly for the particle viewers
│   ├── ControlPanel.tsx    # form primitives (Slider / Pills / Select / Checkbox …)
│   ├── Canvas3D.tsx        # Three.js scene + camera + resize wrapper
│   ├── Readme.tsx          # in-app markdown renderer
│   └── ToggleMenu.tsx      # collapsible menu (legacy, used by #/fractals-cpu)
│
├── controls/
│   └── QuarterTurnControls # 4D eighth-turn + spin controls (drive panel)
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
│   │   └── types.ts                # ColorStyle, ColorBy, shapeNames, viewTypes, …
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
3. Register the catalog entry in `src/apps.ts` (append-only) and add its
   gallery metadata (category + preview kind) in `src/chrome/catalog.ts`:
   ```ts
   export const apps: AppDescriptor[] = [
     // …existing entries…
     { hash: '/my-animation', name: 'My Animation', icon: '◆', blurb: 'One-line teaser.' },
   ];
   ```
4. Inside the component, define your panels (`SectionDef[]`, each one of the 11
   archetypes) and view window(s) (`ViewDef[]`), then render
   `<Workspace appId="my-animation" title=… sections=… views=… explainer=… />`.
   Panel bodies use the `ControlPanel` primitives.

Three.js animations can wrap `Canvas3D` inside their view node. For
particle-style 4D viewers, `ParticleViewerShell` plus the `src/lib/particles`
hooks assembles the standard Function / Domain / Camera / Color / Particles /
Surface / Motion / 4D Rotation / Detail panels out of the box — see
ComplexParticles for the simplest example.

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
* **4D rotation controls** (the drive-tier "4D Rotation" panel) — tap a plane
  button for an eighth turn (45°); the toggle under each button starts/stops a
  continuous spin in that plane and direction (multiple compose into double
  rotations), with one speed slider. Includes drop-axis and a "Reset
  orientation" row.

The fractal viewers use:

* **Drag** to pan, **pinch** or **wheel** to zoom.
* **Trace mode** (the drive-tier "Trace" panel) — when on, taps spawn an
  iteration orbit from the tap point.

---

## 7 Projection modes (Complex Particles)

The renderer maps a 4D point `(x, y, u, v)` to 3D along one **projection
slider** with three sticky, labeled stops and live GPU morphs between them:

1. **Perspective** — divide by `3 + v`.
2. **Torus** — stereographic projection from the +v pole (pole-softened;
   shows the Clifford-torus structure with its scaffold).
3. **Sphere** — the Hopf view; the Torus → Sphere leg of the slider is the
   fiber collapse.

The 4D axis cross fades out as the slider leaves Perspective, handing the
reference role to the scaffold. **Drop X / Y / U / V** (discard the named
axis) lives on the 4D Rotation panel.

---

## 8 Acknowledgments

* Three.js — rendering engine
* React + Vite — UI and build tooling
* lucide-react — icon set used by Stable Marriage and Agentic Sorting
