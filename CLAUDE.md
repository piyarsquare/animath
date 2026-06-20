# CLAUDE.md — AI Assistant Guide for animath

## Project Overview

**animath** is a modular, browser-based toolkit for mathematical animations and
generative art, built with TypeScript, React 18, Three.js, and Vite. It is
deployed as a static site to GitHub Pages at `https://piyarsquare.github.io/animath/`.

Every animation ("app") is a self-contained module that plugs into the shared
**workspace chrome** (`src/chrome/`, specified by `docs/redesign/DESIGN-SPEC.md`):
a landing **gallery** opens into a per-app **workspace** where the plot(s) and
the control panels are draggable windows on a dotted stage, opened from a left
icon rail whose icons come from a closed 11-archetype vocabulary. Five **skins**
restyle everything via one `data-theme` attribute; below 740px the workspace
re-chromes into a phone UI (stacked view cards, bottom dock, bottom sheets).
Apps declare themselves in a single registry (`src/apps.ts`) and pass their
panels/views to one `<Workspace>` component, so the chrome stays uniform across
every view.

## Quick Reference

```bash
npm ci              # install dependencies (use ci, not install, for reproducibility)
npm run dev         # Vite dev server at http://localhost:5173/animath/
npm run build       # TypeScript check + Vite production build → dist/
npm run preview     # preview production build locally
npm test            # vitest unit tests (chrome workspace pure logic)
npm run lint        # eslint over src/ (keep it at 0 errors)
```

Node >= 20, npm >= 10 required. The only CI check is `npm run build` (which runs
`tsc && vite build`). Unit tests cover the chrome's pure logic (`npm test`,
vitest, `src/**/__tests__/`). ESLint is configured (`eslint.config.mjs`,
lint-only — deliberately **no formatter**: a repo-wide reformat would conflict
with every in-flight parallel branch).

## New here? Read these first

- **README.md** — user-facing tour of the apps, the shell, and interaction conventions.
- **docs/BUILDING_AN_APP.md** — step-by-step guide (for humans *and* agents) to
  adding a new app that conforms to the framework. **Read this before adding a module.**
- **ARCHITECTURE.md** — a historical design/consolidation proposal. Useful for
  background, but it describes a *proposed* structure that differs from what was
  actually built; treat the layout below as the source of truth.

## Repository Layout

```
animath/
├── index.html                  # SPA entry point with global CSS
├── package.json                # deps: react, react-dom, three, marked, dompurify, lucide-react
├── tsconfig.json               # strict TS, target esnext, path alias @/ → src/
├── vite.config.ts              # base: '/animath/', @/ alias
├── eslint.config.mjs           # ESLint flat config (lint-only; no formatter by design)
├── AGENTS.md                   # short instructions for other AI agents
├── CLAUDE.md                   # this file
├── ARCHITECTURE.md             # historical consolidation proposal (background only)
├── PLAN.md                     # the prioritized roadmap of outstanding work
├── README.md                   # project documentation
├── docs/
│   ├── BUILDING_AN_APP.md      # how to add a new app to the framework
│   └── PREVIEW_DEPLOYS.md      # per-PR preview deploy options
├── .github/workflows/deploy.yml  # GitHub Pages deploy (push to main + manual)
├── public/textures/            # HDR environment map + placeholder
└── src/
    ├── index.tsx               # entry: bare hash router (gallery at #/), lazy route map
    ├── App.tsx                 # default Complex Particles route (lazy wrapper)
    ├── apps.ts                 # THE app registry (AppDescriptor; feeds the gallery)
    │
    ├── chrome/                 # the global chrome (see docs/redesign/)
    │   ├── theme.css           # design tokens: 5 skins on [data-theme] + am-* styles
    │   ├── icons.tsx           # closed stroke icon set (Icon + ICONS)
    │   ├── skins.tsx           # SKINS registry + useSkin/applyPersistedSkin + SkinPicker
    │   ├── TopBar.tsx          # brand-mark Home · title/formula · mode pills · ? · skins
    │   ├── ExplainerModal.tsx  # the "?" modal (wraps Readme)
    │   ├── Gallery.tsx         # landing gallery (hero, filter chips, preview cards)
    │   ├── catalog.ts          # gallery card metadata (category/kind) from apps.ts
    │   ├── previews.tsx        # cheap animated canvas previews for the cards
    │   ├── readouts.tsx        # Breakdown/MiniHisto/Sparkline/StatGrid/Kicker
    │   ├── usePhone.ts         # ≤740px matchMedia hook (phone re-chrome)
    │   └── workspace/          # the workspace engine
    │       ├── types.ts        # SectionDef / ViewDef / LayoutDef / WorkspaceProps
    │       ├── archetypes.ts   # 11 archetypes · 5 tiers (closed vocabulary)
    │       ├── geometry.ts     # snap/dock/pack/collapse-chain math (pure)
    │       ├── layouts.ts      # builtin Compact/Everything + persistence helpers
    │       ├── drag.ts         # pointer-capture drag helper
    │       ├── Workspace.tsx   # responsive entry (desktop ↔ phone)
    │       ├── DesktopWorkspace.tsx # stage, guides, rail, windows, layouts, persistence
    │       ├── PhoneWorkspace.tsx   # stacked view cards + bottom dock + sheets
    │       ├── Panel.tsx / ViewWindow.tsx / Rail.tsx / LayoutsMenu.tsx
    │
    ├── animations/             # one folder per app, each self-contained
    │   ├── ComplexParticles/   # 4D complex-function particle viewer
    │   │                       #   (absorbs the former Roots z^(p/q) and
    │   │                       #    Multibranch sqrt/ln modes as variants)
    │   ├── PlaneTransform/      # f as a transformation of the colored plane
    │   ├── FractalsGPU/         # GPU Mandelbrot / Julia / Burning Ship / Tricorn
    │   ├── Fractals/            # legacy CPU 2D fractals (routed at #/fractals-cpu)
    │   ├── Correspondence/      # Mandelbrot ↔ Julia split-pane explorer
    │   ├── TopologyWalk/        # UNLISTED / being retired (Polygon Worlds supersedes it; absorbed its scene looks). Möbius corridor + flat torus / Klein bottle
    │   ├── TrinaryStars/        # three-body planet sandbox (Observatory) + ensemble Lab
    │   │                        #   (Trinary.tsx hosts both as tabs; engine in lib/nbody)
    │   ├── StableMarriage/      # Gale–Shapley visualizer + heatmap lab (CSS/DOM)
    │   ├── AgenticSorting/      # concurrent agent-based sorting (CSS/DOM)
    │   ├── StableMatching/      # rebuilt Gale–Shapley lab: matrix · welfare · lattice (CSS/DOM)
    │   ├── PolygonWorlds/       # walk every closed surface from one glued polygon; selectable scene "looks" (looks.ts, distilled from Topology Walk's themes)
    │   ├── TreesAndNets/        # M̄₀,ₙ(ℝ) explorer: associahedron tiles + the gluing mosaic; lib/{associahedron,mosaic}.ts
    │   └── SolidWorlds/         # walk inside a closed flat 3-manifold from one glued cube (3D successor to Polygon Worlds); catalog now 8 of the 10 platycosms (3-torus, half/quarter-turn, both amphicosms, both amphidicosms, Hantzsche–Wendt); developing-map cover engine (coverEngine.ts), chirality HUD (original · rotated · mirrored). Invariants: H₁ from the deck group's abelianization (lib/freeness.ts: point group + Reidemeister–Schreier lattice → Smith form) — the authoritative, screw-safe H₁ — plus a free-action test certifying a genuine manifold (vs a cone-point orbifold); the cube cell complex (lib/homology.ts) is kept for χ and as an independent cross-check — all 8 worlds are now dual-verified (the 2026-06-20 screw fix: glue by the whole in-cube orbit + a finer subdivision for screw worlds; see SolidWorlds/SCREW_BUG.md)
    │
    ├── components/             # shared app-side UI
    │   ├── ParticleViewerShell.tsx  # turnkey workspace assembly for particle (4D) viewers
    │   ├── ControlPanel.tsx    # form primitives: Slider / Pills / Select / Checkbox / …
    │   ├── ControlPanel.css    #   (token-styled; --cp-* vars alias the theme tokens)
    │   ├── Canvas3D.tsx        # Three.js scene + camera + renderer + resize wrapper
    │   ├── Readme.tsx          # in-app markdown renderer (marked)
    │   └── ToggleMenu.tsx      # legacy collapsible menu (used by the legacy Fractals2D)
    │
    ├── controls/
    │   ├── QuarterTurnControls.tsx # 4D eighth-turn + spin + drop-axis controls
    │   │                            #   (the drive-tier "4D Rotation" panel)
    │   └── QuarterTurnControls.css
    │
    ├── lib/
    │   ├── nbody/              # shared gravitational engine: integrator + scenarios + analysis
    │   ├── particles/          # shared particle-viewer engine (see below)
    │   │   ├── index.ts                # public re-exports
    │   │   ├── types.ts                # ColorStyle, ColorBy, shapeNames, viewTypes, …
    │   │   ├── useParticleState.ts     # all viewer state + setters
    │   │   ├── useViewControls.ts      # orientation/turn/projection/drop-axis controls
    │   │   ├── useUniformSync.ts       # React state → shader uniforms
    │   │   ├── useGestureRotation.ts   # camera-orbit + pan + zoom pointer handlers
    │   │   ├── createParticleGeometry.ts  # grid + adaptive density sampling
    │   │   ├── createAxes.ts           # 4D axis lines
    │   │   └── createAnimationLoop.ts  # rAF loop (quaternion compose, axis update)
    │   ├── useViewportGestures.ts      # pan + pinch-zoom + tap for 2D (fractal) viewers
    │   ├── viewpoint.ts                # 4D → 3D projection helpers + ProjectionMode
    │   ├── complexMath.ts              # complex arithmetic + function name/formula tables
    │   ├── colormaps.ts                # GLSL palette source + palette options (fractals)
    │   └── textures.ts                 # particle texture factory (checker/stone/metal/HDR)
    │
    ├── math/
    │   ├── constants.ts        # plane names ('XY','XU',…) and QUARTER constant
    │   └── quat4.ts            # 4D quaternion rotation builder
    │
    ├── config/defaults.ts      # shared slider ranges + initial values
    ├── styles/responsive.ts    # breakpoints + useResponsive hook
    ├── types/uniforms.d.ts     # shader uniform type declarations
    └── unported_examples/      # excluded from build (tsconfig exclude)
```

## Routing

The app uses a **hand-rolled hash router** in `src/index.tsx`. Every route is
`React.lazy`-imported (code-split) and rendered **bare** — each app owns its
chrome by rendering `<Workspace>`. The route table is keyed by hash; the
visible app catalog comes from `src/apps.ts` (+ `src/chrome/catalog.ts`).

| Hash Route            | Component        | Description                                |
|----------------------|------------------|--------------------------------------------|
| `#/` (default)       | `Gallery`        | Landing gallery of all apps                 |
| `#/complex-particles`| `App → ComplexParticles` | 4D complex-function particle viewer |
| `#/plane-transform`  | `PlaneTransform` | f as a transformation of the plane (one split view window: domain · image) |
| `#/fractals`         | `FractalsGPU`    | GPU Mandelbrot / Julia / Burning Ship / Tricorn |
| `#/fractals-cpu`     | `Fractals2D`     | Legacy CPU 2D fractals (unlisted)           |
| `#/correspondence`   | `Correspondence` | Mandelbrot ↔ Julia, two linked view windows |
| `#/topology-walk`    | `TopologyWalk`   | **Unlisted** (being retired; superseded by Polygon Worlds, which absorbed its scene looks). First-person walk on a closed surface (twisting Möbius corridor / flat torus / Klein); still URL-reachable, `#/mobius` and `#/wrap-world` redirect here |
| `#/trinary`          | `Trinary`        | Three-star system: Observatory + Lab as top-bar modes (`#/trinary-lab` opens the Lab) |
| `#/stable-marriage`  | `StableMarriage` | Gale–Shapley algorithm + heatmap lab        |
| `#/agentic-sorting`  | `AgenticSorting` | Concurrent agent-based sorting              |
| `#/stable-matching`  | `StableMatching` | Rebuilt Gale–Shapley lab (matrix · welfare surface · lattice via layouts) |
| `#/polygon-worlds`   | `PolygonWorlds`  | Walk every closed surface from one glued polygon |
| `#/trees-and-nets`   | `TreesAndNets`   | Tree-space as a polytope: the associahedron of an n-gon's triangulations (port of the private `quantum-tree`) |
| `#/solid-worlds`     | `SolidWorlds`    | Walk inside a closed 3-manifold built from one glued cube (3D successor to Polygon Worlds); Tier 1 flat worlds + chirality HUD |
| `#/embed/complex-particles` | `EmbedComplexParticles` | Chrome-less applet for iframe embedding, URL-configured (docs/EMBEDS.md); demo host: `/embed-demo.html` |
| `#/embed/plane-transform` | `EmbedPlaneTransform` | Chrome-less two-pane plane applet for iframe embedding (docs/EMBEDS.md) |

Unknown hashes fall back to the `Gallery`. **`src/apps.ts` is the single source
of truth** for the user-visible catalog (order, name, icon, blurb); the gallery
adds per-card metadata (category, preview kind) in `src/chrome/catalog.ts`.
When you add an app you update the `routes` map in `index.tsx`, the `apps`
array in `apps.ts`, **and** the `META` map in `chrome/catalog.ts`.

## The workspace framework

`src/chrome/` renders the global chrome (full spec: `docs/redesign/DESIGN-SPEC.md`;
control inventory mapping: `docs/redesign/PARAM-MAP.md`). An app integrates by
rendering **one component**:

```tsx
<Workspace
  appId="my-app"            // persistence namespace (localStorage ws:<appId>)
  title={name} subtitle={formula}
  sections={sections}       // SectionDef[] — the control panels
  views={views}             // ViewDef[] — the plot window(s)
  layouts={layouts}         // optional built-in layouts (+ auto Compact/Everything)
  defaultLayoutId="essentials"
  explainer={markdown}      // the "?" modal (EXPLAINER.md [+ '---' + README.md])
  modes={…} activeMode={…} onModeChange={…}  // optional top-bar mode pills
/>
```

- `SectionDef = { id, title, arch, node, estHeight? }` — `arch` is one of the
  **closed 11-archetype vocabulary** (`chrome/workspace/archetypes.ts`):
  Define `subject`/`domain` · Render `view`/`color`/`marks`/`motion` · Drive
  `drive`/`playback` · Analyze `lab`/`readout` · System `quality`. The rail
  sorts by tier; never invent new icons — propose vocabulary changes in
  `docs/redesign/IN-PROGRESS.md`.
- `ViewDef = { id, title, defaultRect } + (node | panes)` — the node fills a
  draggable, resizable, collapsible window body (`position:absolute; inset:0`);
  `panes: PaneDef[]` instead renders a **split view** (two pictures, one
  window, fixed equal split — Plane Transform's domain/image pair). Collapsed
  views are hidden, **never unmounted**, so WebGL state survives (`Canvas3D`
  ignores zero-size resizes). A header button takes any view **full screen**
  (CSS-only restyle of the same node — the WebGL context survives; Esc or the
  button restores); on phone, cards also height-resize from a bottom grip.
  While fullscreen, the rail stays live and panels float above; apps with
  primary verbs pass `actions` (the always-on strip, ≤5 buttons projecting a
  drive/playback panel). A single-view app can also pass `immersive` to make
  that one view fill the stage below the top bar (frameless, no dotted void),
  with the rail, floating panels and action strip overlaid — the desktop twin
  of the phone solo view, used by Polygon Worlds for its first-person walk.
- `LayoutDef.views[id].open: false` hides a view in that layout (how
  Stable Matching's matrix/welfare/lattice and Trinary's Lab instruments
  present as layouts).
- The top bar carries the brand-mark **Home** (gallery is the only hub), the
  `Layout:` menu, optional mode pills, the **?** explainer and the SkinPicker.
- Analyze-tier panels should use the shared readout primitives from
  `chrome/readouts.tsx` (Breakdown / MiniHisto / Sparkline / StatGrid / Kicker).
- Apps with window-level key handlers (first-person walkers) must early-return
  when `document.activeElement` is a form control, so typing in panels doesn't
  drive the scene.

### Control primitives (import from `components/ControlPanel`)

`Slider`, `Pills` (segmented buttons), `Select` (dropdown), `Checkbox`,
`RangeSlider`, `NumberInput` (+ a legacy `Section`). These are the standard
building blocks for panel bodies, styled by `ControlPanel.css` on the theme
tokens (`--cp-*` vars alias `--fg`/`--accent`/…). Use them instead of
hand-rolling inputs so every app looks consistent.

## Architecture Patterns

### Anatomy of an app

Each app lives in `src/animations/<Name>/` and typically contains:

- A main `.tsx` component (the whole animation + its controls).
- `EXPLAINER.md` — short "what am I looking at" text for the **?** popup (`?raw`);
  shipped by nearly every app.
- `README.md` — *optional* longer write-up for the **About** section
  (`import md from './README.md?raw'`). `ParticleViewerShell` viewers render it
  automatically; custom apps render it if they choose, and some (e.g. the Trinary
  System) ship none.
- Optional helper `.ts` modules — pull simulation/algorithm logic and data out of
  the component (e.g. `physics.ts` + `presets.ts`, or `corridorGeometry.ts`).
- Optional `shaders/` directory (GLSL kept as inline template strings).
- Optional `.css` for CSS/DOM apps.

Inside the component, an app: (1) holds its own state with `useState`/`useRef`
(+ `usePersistentState` for settings); (2) defines its `SectionDef[]` panels
(bodies built from the `ControlPanel` primitives) and `ViewDef[]` view
window(s); (3) renders `<Workspace appId title subtitle sections views layouts
explainer>`. The scene (Three.js via `Canvas3D`, or DOM/CSS) is the view node.

### Three.js / particle (4D) viewers

The complex viewers are powered by the **`src/lib/particles` engine** plus the
turnkey `ParticleViewerShell` component, which together provide the standard
**Function / Domain / Camera / Color / Render / Motion / 4D Rotation / System**
panels (the `QuarterTurnControls` live in the drive-tier 4D Rotation panel),
gesture handling, and the rAF loop out of the box. The flow is:
`useParticleState` (state) → `useViewControls` (orientation/projection
controls) → build geometry/axes in `Canvas3D`'s `onMount` (which **must return
the cleanup** that stops the loop and disposes the scene — `startAnimationLoop`
returns the stop function) → `useUniformSync` pushes React state into shader
uniforms → `startAnimationLoop` runs the rAF loop.
**ComplexParticles is the canonical consumer** — though no longer a *simple*
one (it orchestrates per-branch materials across four render modes); copy its
shell wiring when building a new particle viewer and skip the multi-sheet
material plumbing unless you need it.

### 2D / fractal viewers

FractalsGPU and Correspondence render shader quads through orthographic cameras
inside their view windows and navigate with `useViewportGestures` (drag-pan,
pinch/wheel-zoom, tap). Palettes come from `lib/colormaps.ts`. Correspondence's
two linked windows are the two-view reference.

### CSS/DOM apps

StableMarriage, StableMatching and AgenticSorting render plain DOM with
`lucide-react` icons and their own CSS inside view windows; their controls live
in workspace panels like everyone else's. StableMatching shows how in-app tabs
become **layouts** (`views[id].open`).

## Interaction conventions

Particle viewers split **looking** (gestures) from **navigating** (buttons):

- **1-finger / mouse drag** orbits the camera (never the 4D rotation). The
  Camera panel's **Orbit** toggle picks the style: **Turntable** (default) is
  the bounded orbit — azimuth around world-up, elevation clamped at the poles,
  so "up" stays up and the view is easy to recenter by hand — and **Free** is
  the unbounded trackball that tumbles past the poles and can roll.
- **2-finger drag** pans the look-at target; on desktop, **right-drag**,
  **held `Space`+drag** or `Shift`+drag pan (the phone keeps a Drag
  Orbit | Pan pill for one-finger choice).
- **2-finger pinch / wheel** zooms.
- **QuarterTurnControls** (the drive-tier **4D Rotation** panel, draggable
  beside the plot): tap a ↻/↺ button for a single **eighth turn**
  (45°); the small toggle under each button starts/stops a **continuous spin** in
  that plane and direction (multiple compose, e.g. xy + uv = an isoclinic double
  rotation). One **Spin speed** slider sets the rate. Includes reset + drop-axis.
  The rows are **context-sensitive**: in the nonlinear **Hopf/Torus**
  projections (where a 4D turn deforms the image), they switch to three ambient
  **Yaw / Pitch / Roll** controls that orbit the 3D camera rigidly instead of
  rotating the 4D pre-image; the six 4D planes return in the linear projections.

Fractal viewers: drag to pan, pinch/wheel to zoom, and **Trace mode** (the
drive-tier Trace panel) spawns an iteration orbit from a tapped point.

Workspace windows: drag by the **header** (canvas gestures stay inside the
window body); resize view windows from the bottom-right handle; any
pointer-down raises a window; collapse from the header chevron. Arrangements
are saved via the top-bar **Layout** menu and persist per app.

### Projection modes (Complex Particles)

A 4D point `(x, y, u, v)` maps to 3D via the **projection slider** with three
sticky, labeled stops — **Perspective** (divide by `3 + v`) ⇠ **Torus**
(stereographic from the +v pole, soft-floored; the old "Stereo" was this same
map and was retired) ⇢ **Sphere** (the Hopf view; `ProjectionMode.Hopf`
internally) — where fractional positions are live GPU morphs, the 4D axis
cross fades out toward the torus (the scaffold takes over), and the
Torus→Sphere leg is the fiber collapse. **Drop X / Y / U / V** (discard the
named axis) remains on the 4D Rotation panel.

## Code Conventions

- **TypeScript strict mode**; functional components with hooks only.
- **Path alias** `@/` → `src/` (in both `tsconfig.json` and `vite.config.ts`).
  Note: many files still use relative `../../` imports — both work; match the file
  you're editing.
- **State** is local `useState`/`useRef` only (no global store/context; the
  workspace owns only window/layout state, persisted per app under `ws:<appId>`,
  and the skin under `chrome:skin`).
- **Persisted settings**: `usePersistentState(key, initial)` (`lib/usePersistentState.ts`)
  is a drop-in `useState` that mirrors to `localStorage` (namespaced
  `animath:<version>:<app>:<field>`), so a user's controls survive a reload. Pass
  `key = null` to opt out. The particle viewers persist through
  `useParticleState({ storageKey })`; `clearPersistedState(namespace)` powers the
  "Reset settings to defaults" action. Persist *settings*, not transient view
  state (camera orbit/pan) or derived values.
- **Shaders**: GLSL as inline template strings under per-app `shaders/`.
- **Markdown**: `README.md` (About) and `EXPLAINER.md` (?) imported via `?raw`.
- **Base-aware asset paths**: load public assets with `import.meta.env.BASE_URL`
  (the Vite `base` is `/animath/`) — see `lib/textures.ts`.
- **Spelling — American English throughout**: all user-facing text and comments
  (UI strings, `README.md`/`EXPLAINER.md`, code comments) use American spellings —
  **color** (not colour), **center** (not centre), **behavior**, **gray**,
  **favor**, **neighbor**, **analyze**, and **-ize/-ization** verb endings
  (organize, minimize, normalize, stabilize, visualize). This matches the language
  defaults already used in code (CSS `color:`, `justify-content: center`; JS
  `normalize()`), so code and prose stay uniform. When merging a branch that
  introduced British prose, normalize it back to American.

## Attribution & AI collaboration

These apps are built in collaboration with AI collaborators (see
[`ATTRIBUTION.md`](ATTRIBUTION.md) for the full policy). Ideas are often reached by
independent reasoning, but few are new to the world — and the collaborators are
trained on a vast, largely uncredited corpus. So **identifying an app's possible
sources is a standing part of building it**, even when none were in mind while the
idea was worked out:

- Each app's `EXPLAINER.md` (or guide page) ends with a short **"Possible sources
  & where to go further"** block — annotated pointers to prior work and analogues,
  framed as a reader's next step, **not** a priority claim. This is wayfinding as
  much as credit.
- **Name what you can stand behind; flag uncertainty — never fabricate** a
  citation, DOI, or date. A vaguer-but-true pointer beats a crisp fabricated one.
- Record both provenances honestly: how an idea was *reached* and what it *lands
  near* (with a name) are different questions; keep both.
- Sessions note possible sources surfaced during the work in their handoff, so
  attributions are captured while fresh.

## Known Issues and Technical Debt

Much of the old debt has been paid down: the three near-identical complex viewers
were consolidated into the `lib/particles` engine + `ParticleViewerShell` (Roots
and Multibranch are now modes of ComplexParticles); complex math lives in
`lib/complexMath.ts`; texture factories in `lib/textures.ts`; code splitting is in
place via `React.lazy`; the HDR texture path is now `base`-aware; touch/gesture
support exists across the 3D, 2D, and DOM apps; and the former orphan `Fractals2D`
is reachable at `#/fractals-cpu`.

The 2026-06-11 debt session cleared the long-standing list: ESLint adopted
(`npm run lint`, 0 errors; lint-only — no formatter, by decision), the orphaned
utilities (`lib/ParticleDisplay.ts`, `lib/R2Mapping.ts`, `src/materials/`) and
empty stubs (`requirements.txt`, `run/setup.sh`) deleted, `Readme.tsx` output
sanitized with DOMPurify, the stale `PLAN.md` replaced by the prioritized
roadmap, and the deploy-workflow duplicate step confirmed already fixed.

Remaining items:

1. **CI runs only `npm run build`** — `npm test` and `npm run lint` are not CI
   gates yet; keep them green by convention. Lint carries ~60 warnings
   (`exhaustive-deps`, `no-explicit-any`) accepted as the baseline — don't add
   new ones.
2. **`npm audit`: 2 moderate dev-only advisories** (esbuild via vite ^5; affects
   the local dev server only). The fix is a breaking vite major upgrade —
   scheduled as its own chore in `PLAN.md`, not bolted onto another change.
3. **`ARCHITECTURE.md` is historical** — it proposes a `core/widgets/ui` layout
   that was not adopted (banner at its top says so); the actual shared code
   lives in `components/` and `lib/`.

## Development Workflow

### Adding a new app

Follow **docs/BUILDING_AN_APP.md**. In short:

1. Create `src/animations/MyApp/MyApp.tsx` (+ `README.md`, `EXPLAINER.md`).
2. Register the route in `src/index.tsx` (`React.lazy` import + `routes` entry).
3. Register the catalog entry in `src/apps.ts` (`hash`, `name`, `icon`, `blurb`)
   **and** its gallery metadata (category + preview kind) in `src/chrome/catalog.ts`.
4. Define `SectionDef[]` panels (archetypes from the closed vocabulary) and
   `ViewDef[]` view window(s), then render `<Workspace appId … />` with panel
   bodies built from the `ControlPanel` primitives. For 4D particle viewers,
   build on `ParticleViewerShell` + `lib/particles` (copy ComplexParticles).
5. Document *your* app: add its row to the **Routing** table above and a line to
   the repository-layout tree (and to `README.md`). Append — don't reorder.
6. `npm run build` must pass.

> **Parallel branches.** Several app branches are often in flight at once
> (frequently in separate agent threads). The framework keeps that conflict-free
> because each app is a self-contained folder; the only shared files a new app
> edits — `index.tsx`, `apps.ts`, `CLAUDE.md`, `README.md` — are all **append-only**.
> Add new entries at the **end** of each list/table, never reorder existing ones,
> and touch only your own app's lines. Before opening/finalizing a PR,
> `git fetch && git merge origin/main`, resolve any shared-file overlap by
> *keeping every app's entries*, and re-run `npm run build`. Merge order doesn't
> matter — the re-sync is cheap because the edits are additive. See
> **docs/BUILDING_AN_APP.md §8** for the full workflow.

### Branch sync (don't pull `main` at session start)

The repo is **cloned fresh each session** and your working branch is already
checked out, so there is nothing to "catch up" before you begin. **Do not
`git pull` / `git merge origin/main` at the start of a session** — it pulls
unrelated work into your diff and triggers premature conflicts in the append-only
shared files (`index.tsx`, `apps.ts`, `CLAUDE.md`, `README.md`).

Sync with `main` **only when finalizing a PR** — the single prescribed point
(`git fetch && git merge origin/main`, keep every app's entries, re-run
`npm run build`; see the parallel-branches note above and **BUILDING_AN_APP.md §8**)
— and only if your branch actually targets `main`.

> [!IMPORTANT]
> **If your branch is stacked on another feature branch** (created from
> `claude/<other>` rather than `main`), sync against **that base**, never `main` —
> merging `main` would drag in work your branch was never meant to carry. Check your
> base with `git merge-base` / the branch you forked from if unsure.

### Deployment

Pushing to `main` triggers the **Deploy demo** GitHub Pages workflow
(`npm ci && npm run build`, uploads `dist/`); it also accepts manual dispatch.
For per-PR preview URLs, see `docs/PREVIEW_DEPLOYS.md`.

### Agent session skills (`.claude/skills/`)

Three Claude Code skills support the session workflow. Both a human (typing the
slash command) and an agent (via the Skill tool) can invoke them; they are
invoked **on explicit request**, not auto-triggered spontaneously:

- **`/start-session`** — reads the latest handoff, opens a progress report, and
  orients (branch + which app, the append-only parallel-branch rule). Run it first.
- **`/handoff`** — distills the session into a handoff doc; uses `npm run build`
  (the only CI check) for status and appends the self-reflection protocol.
- **`/three-hats <plan>`** — reviews a plan/design from three lenses (framework
  maintainer · architecture consultant · math-viz & pedagogy) in parallel, then
  synthesizes.

Progress reports and handoffs are **committed** as **Markdown + YAML frontmatter**
under `docs/sessions/{progress,handoff}/<branch-slug>/` — partitioned **per branch**
so parallel branches never collide. Forward-looking, app-specific implementation
plans are reports too: **`kind: plan`** files in the branch's `progress/` folder
(`status: proposed` until a session executes them), surfaced by the control center
like any report (the slug is the branch name with `claude/`
stripped and `/`→`-`; keep branch names short and topical). The style is specified
by `docs/sessions/REPORT_STYLE.md`; skills copy the `docs/sessions/_template-*.md`
skeletons. Markdown reads natively on GitHub, and **`npm run sessions`**
(`docs/sessions/build-sessions.mjs`) renders every branch's reports into the rich
HTML view (`report.css` + `report.js`: timeline rail, sticky scroll-spy TOC,
callouts, sortable tables) and builds a **cross-branch control center**
(`docs/sessions/control-center.html`) that aggregates every active branch's reports
into one searchable index. The control center has three views — **Cards** ·
**Timeline** · **Reflections** — plus a **category filter** bar whose active
selection lives in the URL as `#cat=<key>` (shareable; app chips everywhere link to
it). The **Reflections** view is an *exit-interview digest*: it scrapes each report's
`## Self-reflection` section and its `**Follow-up value:** <LEVEL>` line, sorting
entries by follow-up severity — so authoring that section in the exact format from
`.claude/prompts/self-reflection.md` is what feeds it (`categories.mjs` holds the
category taxonomy). The build reads branch tips read-only (never modifies other
branches), deduping each report to its most-recently-updated copy with provenance
taken from the slug folder. The converter `docs/sessions/convert-html.mjs` turns the
older hand-authored HTML reports into Markdown. On deploy (`deploy.yml` runs
`npm run sessions` then `copy-sessions-to-dist.mjs`) the hub ships to
`/animath/sessions/control-center.html` (`noindex`, off to the side) and links out to
the embed demo (`/animath/embed-demo.html`). The shared self-reflection protocol lives
at `.claude/prompts/self-reflection.md`.
</content>
