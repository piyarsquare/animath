# CLAUDE.md — AI Assistant Guide for animath

## Project Overview

**animath** is a modular, browser-based toolkit for mathematical animations and
generative art, built with TypeScript, React 18, Three.js, and Vite. It is
deployed as a static site to GitHub Pages at `https://piyarsquare.github.io/animath/`.

Every animation ("app") is a self-contained module that plugs into a shared
**AppShell** — a persistent top bar + slide-out drawer that supplies navigation,
settings, actions, a function picker, and a help/explainer popup. Apps declare
themselves in a single registry (`src/apps.ts`) and register their UI through a
small set of React hooks and portal components, so the chrome stays uniform
across every view.

## Quick Reference

```bash
npm ci              # install dependencies (use ci, not install, for reproducibility)
npm run dev         # Vite dev server at http://localhost:5173/animath/
npm run build       # TypeScript check + Vite production build → dist/
npm run preview     # preview production build locally
```

Node >= 20, npm >= 10 required. The only CI check is `npm run build` (which runs
`tsc && vite build`). There are no automated tests, linter, or formatter.

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
├── package.json                # deps: react, react-dom, three, marked, lucide-react
├── tsconfig.json               # strict TS, target esnext, path alias @/ → src/
├── vite.config.ts              # base: '/animath/', @/ alias
├── AGENTS.md                   # short instructions for other AI agents
├── CLAUDE.md                   # this file
├── ARCHITECTURE.md             # historical consolidation proposal (background only)
├── PLAN.md                     # roadmap / plan notes
├── README.md                   # project documentation
├── docs/
│   ├── BUILDING_AN_APP.md      # how to add a new app to the framework
│   └── PREVIEW_DEPLOYS.md      # per-PR preview deploy options
├── .github/workflows/deploy.yml  # GitHub Pages deploy (push to main + manual)
├── public/textures/            # HDR environment map + placeholder
└── src/
    ├── index.tsx               # entry: hash router + <AppShell>, lazy route map
    ├── App.tsx                 # default Complex Particles route (lazy wrapper)
    ├── apps.ts                 # THE app registry (drives router + landing menu)
    │
    ├── animations/             # one folder per app, each self-contained
    │   ├── ComplexParticles/   # 4D complex-function particle viewer
    │   │                       #   (absorbs the former Roots z^(p/q) and
    │   │                       #    Multibranch sqrt/ln modes as variants)
    │   ├── PlaneTransform/      # f as a transformation of the colored plane
    │   ├── FractalsGPU/         # GPU Mandelbrot / Julia / Burning Ship / Tricorn
    │   ├── Fractals/            # legacy CPU 2D fractals (routed at #/fractals-cpu)
    │   ├── Correspondence/      # Mandelbrot ↔ Julia split-pane explorer
    │   ├── MobiusWalk/          # first-person Möbius corridor walk
    │   ├── StableMarriage/      # Gale–Shapley visualiser + heatmap lab (CSS/DOM)
    │   └── AgenticSorting/      # concurrent agent-based sorting (CSS/DOM)
    │
    ├── components/             # shared shell + UI
    │   ├── AppShell.tsx        # global chrome: top bar, drawer, tabs, hooks, portals
    │   ├── AppShell.css
    │   ├── ActionFloater.tsx   # draggable on-canvas mirror of an app's Actions
    │   ├── ActionFloater.css
    │   ├── useFloaterDrag.ts   # drag behaviour for floating panels
    │   ├── Menu.tsx            # landing gallery shown at the `/` route
    │   ├── Menu.css
    │   ├── ParticleViewerShell.tsx  # turnkey shell for particle (4D) viewers
    │   ├── ControlPanel.tsx    # form primitives: Section / Slider / Pills / Select / Checkbox
    │   ├── ControlPanel.css
    │   ├── Canvas3D.tsx        # Three.js scene + camera + renderer + resize wrapper
    │   ├── Readme.tsx          # in-app markdown renderer (marked)
    │   └── ToggleMenu.tsx      # legacy collapsible menu (still used by FractalsGPU)
    │
    ├── controls/
    │   ├── QuarterTurnFloater.tsx  # floating 4D quarter-turn + drop-axis cluster
    │   ├── QuarterTurnFloater.css
    │   └── QuarterTurnBar.tsx      # older inline 4D rotation bar
    │
    ├── lib/
    │   ├── particles/          # shared particle-viewer engine (see below)
    │   │   ├── index.ts                # public re-exports
    │   │   ├── types.ts                # ColorStyle, ColourBy, shapeNames, viewTypes, …
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
    │   ├── textures.ts                 # particle texture factory (checker/stone/metal/HDR)
    │   ├── ParticleDisplay.ts          # (legacy, unused)
    │   └── R2Mapping.ts                # (legacy, unused)
    │
    ├── math/
    │   ├── constants.ts        # plane names ('XY','XU',…) and QUARTER constant
    │   └── quat4.ts            # 4D quaternion rotation builder
    │
    ├── config/defaults.ts      # shared slider ranges + initial values
    ├── styles/responsive.ts    # breakpoints + useResponsive hook
    ├── materials/index.ts      # Three.js material presets (legacy, unused)
    ├── types/uniforms.d.ts     # shader uniform type declarations
    └── unported_examples/      # excluded from build (tsconfig exclude)
```

## Routing

The app uses a **hand-rolled hash router** in `src/index.tsx`. Every route is
`React.lazy`-imported (code-split) and rendered inside a single persistent
`<AppShell>`. The route table is keyed by hash; the visible app catalog comes
from `src/apps.ts`.

| Hash Route            | Component        | Description                                |
|----------------------|------------------|--------------------------------------------|
| `#/` (default)       | `Menu`           | Landing gallery of all apps                 |
| `#/complex-particles`| `App → ComplexParticles` | 4D complex-function particle viewer |
| `#/plane-transform`  | `PlaneTransform` | f as a transformation of the plane          |
| `#/fractals`         | `FractalsGPU`    | GPU Mandelbrot / Julia / Burning Ship / Tricorn |
| `#/fractals-cpu`     | `Fractals2D`     | Legacy CPU 2D fractals                      |
| `#/correspondence`   | `Correspondence` | Mandelbrot ↔ Julia split view               |
| `#/mobius`           | `MobiusWalk`     | Möbius corridor walk                        |
| `#/stable-marriage`  | `StableMarriage` | Gale–Shapley algorithm + heatmap lab        |
| `#/agentic-sorting`  | `AgenticSorting` | Concurrent agent-based sorting              |

Unknown hashes fall back to `Menu`. **`src/apps.ts` is the single source of
truth** for the user-visible catalog (order, name, icon, blurb) — it drives both
the drawer's Apps tab and the landing-page cards. When you add an app you update
*both* the `routes` map in `index.tsx` and the `apps` array in `apps.ts`.

## The AppShell framework

`src/components/AppShell.tsx` renders the global chrome and exposes everything an
app needs to integrate. The top bar shows (left to right):

- **⌂ Home** — back to the landing menu (hidden on `/`).
- **☰ Apps** — opens the drawer's Apps tab.
- **ƒ Function** — opens the Function tab (dimmed if the app registered no functions).
- **Title / formula** — app name plus an optional monospace subtitle (e.g. a formula);
  clicking it opens Settings.
- **⚙ Settings** — opens the Settings tab (dimmed if empty).
- **▶ Actions** — opens the Actions tab (dimmed if empty).
- **? Explainer** — opens the "What am I looking at?" popup (dimmed if none).

The drawer has four tabs: **Apps**, **Function**, **Settings**, **Actions**. The
Settings and Actions tab bodies are **portal targets**: apps render their controls
into them via `<ShellSettings>` / `<ShellActions>`. When the active app changes
(`currentHash`), the shell resets all of this registered state.

### Integration API (import from `components/AppShell`)

| Export | Purpose |
|--------|---------|
| `useAppHeader(title, subtitle?)` | Set the bar title + optional formula subtitle. |
| `useAppFunctions(reg \| null)` | Register a function list `{ names, current, onChange }` so the ƒ button + Function tab can switch functions without opening Settings. |
| `useAppExplainer(markdown \| null)` | Register markdown for the **?** help popup (typically `import x from './EXPLAINER.md?raw'`). |
| `<ShellSettings>{…}</ShellSettings>` | Portal children into the Settings tab. |
| `<ShellActions>{…}</ShellActions>` | Portal children into **both** the Actions tab and the floating `ActionFloater` (kept in sync). |
| `useActionFloaterOff()` | Suppress the generic `ActionFloater` (for apps shipping their own floater, e.g. Correspondence's playback scrubber). |
| `AppDescriptor` | Type of an `apps.ts` entry (`hash`, `name`, `icon?`, `blurb?`). |

### Control primitives (import from `components/ControlPanel`)

`Section` (collapsible group with icon), `Slider`, `Pills` (segmented buttons),
`Select` (dropdown), `Checkbox`. These are the standard building blocks for the
Settings/Actions panels and are styled by `ControlPanel.css`. Use them instead of
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

Inside the component, an app: (1) holds its own state with `useState`/`useRef`;
(2) calls `useAppHeader` (and `useAppExplainer`, optionally `useAppFunctions`);
(3) renders its scene (Three.js via `Canvas3D`, or DOM/CSS); (4) renders controls
inside `<ShellSettings>` / `<ShellActions>` using the `ControlPanel` primitives.

### Three.js / particle (4D) viewers

The complex viewers are powered by the **`src/lib/particles` engine** plus the
turnkey `ParticleViewerShell` component, which together provide the standard
**Function / Camera / Color / Particles / Motion / Detail / About** sections, the
`QuarterTurnFloater`, gesture handling, and the rAF loop out of the box. The flow
is: `useParticleState` (state) → `useViewControls` (orientation/projection
controls) → build geometry/axes in `Canvas3D`'s `onMount` → `useUniformSync`
pushes React state into shader uniforms → `startAnimationLoop` runs the rAF loop.
**ComplexParticles is the canonical, simplest consumer** — copy it when building a
new particle viewer.

### 2D / fractal viewers

FractalsGPU and Correspondence render a full-screen shader quad through an
orthographic camera and navigate with `useViewportGestures` (drag-pan,
pinch/wheel-zoom, tap). Palettes come from `lib/colormaps.ts`.

### CSS/DOM apps

StableMarriage and AgenticSorting render plain DOM with `lucide-react` icons and
their own CSS. They still integrate via `useAppHeader` / `useAppExplainer` and may
use `<ShellSettings>` / `<ShellActions>`.

## Interaction conventions

Particle viewers split **looking** (gestures) from **navigating** (buttons):

- **1-finger / mouse drag** orbits the camera (never the 4D rotation).
- **2-finger drag** (or `Shift`+drag) pans the look-at target.
- **2-finger pinch / wheel** zooms.
- **QuarterTurnFloater** (bottom-left of the canvas): tap a plane for a 90°
  animated turn, **hold** for continuous rotation; includes reset + drop-axis.

Fractal viewers: drag to pan, pinch/wheel to zoom, and **Trace mode** (Actions
drawer) spawns an iteration orbit from a tapped point.

### Projection modes (Complex Particles)

A 4D point `(x, y, u, v)` maps to 3D via: **Perspective** (divide by `3 + v`),
**Stereo** (stereographic from the +v pole), **Hopf** (Hopf fibration), or
**Drop X / Y / U / V** (discard the named axis). Mode switches interpolate on the GPU.

## Code Conventions

- **TypeScript strict mode**; functional components with hooks only.
- **Path alias** `@/` → `src/` (in both `tsconfig.json` and `vite.config.ts`).
  Note: many files still use relative `../../` imports — both work; match the file
  you're editing.
- **State** is local `useState`/`useRef` only (no global store/context except the
  AppShell context, which you consume via the provided hooks).
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

## Known Issues and Technical Debt

Much of the old debt has been paid down: the three near-identical complex viewers
were consolidated into the `lib/particles` engine + `ParticleViewerShell` (Roots
and Multibranch are now modes of ComplexParticles); complex math lives in
`lib/complexMath.ts`; texture factories in `lib/textures.ts`; code splitting is in
place via `React.lazy`; the HDR texture path is now `base`-aware; touch/gesture
support exists across the 3D, 2D, and DOM apps; and the former orphan `Fractals2D`
is reachable at `#/fractals-cpu`.

Remaining items:

1. **No linter / formatter / test runner** — no eslint, prettier, or `npm test`.
   The only validation is `npm run build`.
2. **Deploy workflow has a duplicate `configure-pages` step** (`.github/workflows/deploy.yml`).
3. **Orphaned utilities** — `lib/ParticleDisplay.ts`, `lib/R2Mapping.ts`, and
   `materials/index.ts` are never imported.
4. **Placeholder files** — `requirements.txt` and `run/setup.sh` are empty stubs.
5. **XSS surface** — `Readme.tsx` uses `dangerouslySetInnerHTML` with `marked`
   output (content is first-party only, but unsanitised).
6. **`ARCHITECTURE.md` is aspirational** — it proposes a `core/widgets/ui` layout
   that was not adopted; the actual shared code lives in `components/` and `lib/`.

## Development Workflow

### Adding a new app

Follow **docs/BUILDING_AN_APP.md**. In short:

1. Create `src/animations/MyApp/MyApp.tsx` (+ `README.md`, `EXPLAINER.md`).
2. Register the route in `src/index.tsx` (`React.lazy` import + `routes` entry).
3. Register the catalog entry in `src/apps.ts` (`hash`, `name`, `icon`, `blurb`).
4. Call `useAppHeader(...)` (and `useAppExplainer`, optionally `useAppFunctions`);
   render controls in `<ShellSettings>` / `<ShellActions>` with `ControlPanel`
   primitives. For 4D particle viewers, build on `ParticleViewerShell` +
   `lib/particles` (copy ComplexParticles).
5. `npm run build` must pass.

### Deployment

Pushing to `main` triggers the **Deploy demo** GitHub Pages workflow
(`npm ci && npm run build`, uploads `dist/`); it also accepts manual dispatch.
For per-PR preview URLs, see `docs/PREVIEW_DEPLOYS.md`.
</content>
