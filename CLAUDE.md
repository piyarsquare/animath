# CLAUDE.md — AI Assistant Guide for animath

## Project Overview

**animath** is a modular, browser-based toolkit for mathematical animations and generative art, built with TypeScript, React 18, Three.js, and Vite. It is deployed as a static site to GitHub Pages at `https://piyarsquare.github.io/animath/`.

## Quick Reference

```bash
npm ci              # install dependencies (use ci, not install, for reproducibility)
npm run dev         # Vite dev server at http://localhost:5173
npm run build       # TypeScript check + Vite production build → dist/
npm run preview     # preview production build locally
```

Node >= 20, npm >= 10 required.

## Repository Layout

```
animath/
├── index.html                  # SPA entry point with global CSS + bottom nav bar
├── package.json                # dependencies: react, three, marked, lucide-react
├── tsconfig.json               # strict TS, target esnext, path alias @/ → src/
├── vite.config.ts              # base: '/animath/', @/ alias
├── AGENTS.md                   # instructions for other AI agents
├── ARCHITECTURE.md             # code consolidation guide and duplication analysis
├── CLAUDE.md                   # this file
├── PLAN.md                     # roadmap / plan notes
├── README.md                   # project documentation
├── requirements.txt            # placeholder (no Python deps used)
├── .github/workflows/deploy.yml  # GitHub Pages deploy (manual trigger)
├── run/setup.sh                # placeholder setup script
├── sh-test/project.test.cjs    # standalone projection function test (CJS)
├── public/textures/            # HDR environment map + placeholder
└── src/
    ├── index.tsx               # entry: hash-based router, all routes defined here
    ├── App.tsx                 # default route — renders ComplexParticles
    ├── animations/             # each animation is a self-contained module
    │   ├── AgenticSorting/     # concurrent sorting simulation (CSS + lucide-react)
    │   ├── ComplexMultibranch/ # multi-branch complex functions (Three.js particles)
    │   ├── ComplexParticles/   # main complex function visualizer (Three.js particles)
    │   ├── ComplexRoots/       # z^(p/q) root explorer (Three.js particles)
    │   ├── Correspondence/     # Mandelbrot–Julia correspondence (split-pane GPU)
    │   ├── Fractals/           # CPU-based 2D Mandelbrot/Julia (routed at #/fractals-cpu)
    │   ├── FractalsGPU/        # GPU-based fractal viewer (mapped to #/fractals)
    │   ├── MobiusWalk/         # first-person Möbius corridor (Three.js)
    │   └── StableMarriage/     # Gale–Shapley algorithm visualizer (CSS + lucide-react)
    ├── components/             # shared React components
    │   ├── Canvas3D.tsx        # Three.js scene/camera/renderer wrapper (ResizeObserver)
    │   ├── Readme.tsx          # markdown renderer (marked library)
    │   └── ToggleMenu.tsx      # collapsible overlay menu
    ├── config/defaults.ts      # shared constants and default values
    ├── controls/
    │   └── QuarterTurnBar.tsx  # 4D rotation controls for particle views
    ├── lib/                    # shared utility libraries
    │   ├── complexMath.ts      # unified complex math: 15+ functions + helpers
    │   ├── textures.ts         # procedural texture factories + HDR loader
    │   ├── viewpoint.ts        # 4D projection and quaternion math
    │   ├── particles/          # consolidated particle visualization library
    │   │   ├── index.ts        # public exports
    │   │   ├── types.ts        # shared enums (ViewPoint, ColorStyle, Axis, etc.)
    │   │   ├── useParticleState.ts   # consolidated state management hook
    │   │   ├── useUniformSync.ts     # shader uniform synchronization hook
    │   │   ├── useViewControls.ts    # 4D rotation and projection controls hook
    │   │   ├── createParticleGeometry.ts  # particle system builder
    │   │   ├── createAxes.ts         # 3D axis helpers
    │   │   └── createAnimationLoop.ts    # animation frame loop logic
    │   ├── ParticleDisplay.ts  # particle grid helper (currently unused)
    │   └── R2Mapping.ts        # R²→R² mapping library (currently unused)
    ├── materials/              # Three.js material presets (currently unused)
    │   └── index.ts            # basic, wireframe, metallic, glass, toon, etc.
    ├── math/
    │   ├── constants.ts        # plane names and quarter-turn constant
    │   └── quat4.ts            # 4D quaternion rotation builder
    ├── styles/
    │   └── responsive.ts       # breakpoints, useResponsive hook, responsive style helpers
    ├── types/
    │   └── uniforms.d.ts       # TypeScript declarations for shader uniforms
    └── unported_examples/      # excluded from build (tsconfig exclude)
        └── fractint-simulator.tsx
```

## Routing

The app uses a **hand-rolled hash router** in `src/index.tsx`:

| Hash Route          | Component          | Description                          |
|--------------------|--------------------|--------------------------------------|
| `#/` (default)     | `App → ComplexParticles` | Complex function particle visualizer |
| `#/fractals`       | `FractalsGPU`      | GPU-accelerated Mandelbrot/Julia     |
| `#/fractals-cpu`   | `Fractals2D`       | CPU-based 2D Mandelbrot/Julia        |
| `#/correspondence` | `Correspondence`   | Mandelbrot–Julia correspondence      |
| `#/roots`          | `ComplexRoots`     | z^(p/q) root explorer                |
| `#/multibranch`    | `ComplexMultibranch` | Multi-branch complex functions      |
| `#/mobius`         | `MobiusWalk`       | Möbius corridor walk                 |
| `#/stable-marriage`| `StableMarriage`   | Gale–Shapley algorithm               |
| `#/agentic-sorting`| `AgenticSorting`   | Concurrent sorting simulation        |

All routes are eagerly imported (no code splitting). Unknown hashes fall back to `App`. The bottom navigation bar in `index.html` links to all routes except `#/fractals-cpu`.

## Architecture Patterns

### Animation modules
Each animation lives in `src/animations/<Name>/` and typically contains:
- A main `.tsx` component (the entire animation + UI)
- An optional `README.md` (imported as raw text via `?raw`)
- Optional `shaders/` directory for GLSL code (inline template strings in `.ts` files)
- Optional `.css` files for non-Three.js animations

### Three.js particle animations (shared library)
ComplexParticles, ComplexRoots, and ComplexMultibranch use the consolidated `src/lib/particles/` library:
1. `useParticleState()` — shared state management (function selection, visual params, etc.)
2. `useUniformSync()` — syncs React state to shader uniforms
3. `useViewControls()` — 4D rotation and projection via QuarterTurnBar
4. `createParticleGeometry()` — builds particle buffer geometry
5. `createAxes()` — adds 3D axis indicators to the scene
6. `startAnimationLoop()` — runs the `requestAnimationFrame` loop
7. Each animation provides its own shaders and any module-specific logic

This refactoring reduced the three particle viewers from ~3,760 combined lines to ~1,017 lines (73% reduction), with ~668 lines of shared library code in `src/lib/particles/`.

### Other Three.js animations
FractalsGPU, Correspondence, and MobiusWalk are self-contained and follow this pattern:
1. Use `Canvas3D` component which provides scene, camera, renderer
2. Setup geometry + material in a `useCallback` `onMount`
3. Run `requestAnimationFrame` loops inside `onMount`
4. Sync React state → shader uniforms via individual `useEffect` hooks

### CSS-based animations
StableMarriage and AgenticSorting use regular DOM/CSS rendering with lucide-react icons.

### Shared math and textures
- `src/lib/complexMath.ts` — all complex math functions (sqrt, exp, ln, sin, cos, etc.) with `applyComplex()` and `applyComplexBranch()` dispatch helpers
- `src/lib/textures.ts` — procedural texture factories (`makeCheckerTexture`, `makeSpeckledTexture`, `makeStoneTexture`, `makeMetalTexture`) and `loadParticleTextures()` for async HDR loading using `import.meta.env.BASE_URL`

### Responsive design
- `src/styles/responsive.ts` provides breakpoints (mobile 480px, tablet 768px, desktop 1024px, large 1200px) and a `useResponsive()` hook
- Helper functions: `getResponsiveCanvasStyle()`, `getResponsiveControlsStyle()`, `getResponsiveButtonStyle()`, `getResponsiveInputStyle()`, `getResponsiveLayoutStyle()`
- `index.html` includes global mobile-friendly CSS: touch action, 44px minimum button size, iOS zoom prevention

## Animation Module Sizes

| Animation          | Lines | Type     | Notes                                    |
|-------------------|-------|----------|------------------------------------------|
| ComplexParticles   | 318   | Three.js | Uses shared particles library            |
| ComplexRoots       | 318   | Three.js | Uses shared particles library            |
| ComplexMultibranch | 381   | Three.js | Uses shared particles library            |
| FractalsGPU        | 699   | Three.js | Self-contained GPU fractals              |
| Correspondence     | 452   | Three.js | Two FractalPane instances                |
| Fractals2D         | 423   | Canvas2D | CPU-based fractals                       |
| AgenticSorting     | 397   | CSS/DOM  | Concurrent sorting simulation            |
| StableMarriage     | 1233  | CSS/DOM  | Gale–Shapley with full UI (largest)      |
| MobiusWalk         | 72    | Three.js | Thin wrapper, logic in corridorGeometry.ts + objects.ts |

## Known Issues and Technical Debt

### Fixed (previously critical)
- ~~HDR texture path broken on production~~ — Fixed: now uses `import.meta.env.BASE_URL` in `src/lib/textures.ts`
- ~~MobiusWalk twist toggle broken~~ — Fixed: `onMount` dependency array includes `twist`, geometry is rebuilt on toggle
- ~~Fractals2D component has no route~~ — Fixed: now routed at `#/fractals-cpu`
- ~~Severe code duplication in particle viewers~~ — Fixed: extracted into `src/lib/particles/` library (73% reduction)
- ~~Complex math implemented 4 times~~ — Fixed: consolidated into `src/lib/complexMath.ts`
- ~~Texture factories duplicated~~ — Fixed: consolidated into `src/lib/textures.ts`

### Mobile / responsive issues
1. **No touch support on FractalsGPU** — shows "pinch to zoom" label but no touch handlers exist.
2. **Correspondence path drawing broken on mobile** — only mouse events, no touch events.
3. **MobiusWalk has no mobile controls** at all.
4. **QuarterTurnBar hidden on mobile** for all particle views — no way to do 4D rotations on phones.

### Build / tooling
5. **No linter, formatter, or test runner** configured — no eslint, prettier, or `npm test`.
6. **No code splitting** — all 9 modules eagerly loaded.
7. **Unused utilities** — `ParticleDisplay.ts`, `R2Mapping.ts`, and `materials/index.ts` are never imported.
8. **Deploy workflow has duplicate `configure-pages` step** (lines 25 and 27 in `.github/workflows/deploy.yml`).
9. **`requirements.txt`** and **`run/setup.sh`** are empty placeholders.

### Code quality
10. **XSS risk** — `Readme.tsx` uses `dangerouslySetInnerHTML` with `marked` output (no sanitization).
11. **Mixed import styles** — some files use `@/` path alias, others use relative `../../` paths.
12. **No cleanup of animation frames** in several components — potential memory leaks.

## Development Workflow

### Adding a new animation
1. Create `src/animations/MyAnimation/MyAnimation.tsx`
2. Add route in `src/index.tsx`: import the component and add to the `routes` map
3. Optionally add a nav link to `index.html` in the `#page-info` paragraph
4. For Three.js particle animations: use the `src/lib/particles/` library (see ComplexParticles as a template)
5. For other Three.js animations: use the `Canvas3D` component and follow FractalsGPU/MobiusWalk patterns
6. For CSS/DOM animations: follow StableMarriage/AgenticSorting patterns
7. Include a `README.md` in the folder if desired (import with `?raw`)

### Adding a new Three.js particle viewer
Use the shared library to avoid duplication:
```tsx
import { useParticleState, useUniformSync, useViewControls,
         createParticleGeometry, createAxes, startAnimationLoop } from '@/lib/particles';
import { loadParticleTextures } from '@/lib/textures';
import { applyComplex } from '@/lib/complexMath';
```
See `ComplexParticles.tsx` (318 lines) as the canonical example.

### Build verification
```bash
npm run build       # must pass — this is the only CI check
```
There are no automated tests. The only validation is `tsc && vite build`.

### Deployment
The GitHub Pages deploy is triggered manually via the `Deploy demo` workflow in the Actions tab. It runs `npm ci && npm run build` and uploads `dist/` to Pages.

## Code Conventions

- **TypeScript strict mode** is enabled
- **Path alias**: `@/` maps to `src/` (configured in both `tsconfig.json` and `vite.config.ts`)
- **Shaders**: GLSL is kept as inline template strings in TypeScript files under `shaders/` directories
- **Styling**: mix of inline React styles, CSS files, and responsive utility functions from `styles/responsive.ts`
- **Components**: functional React components with hooks (no class components)
- **State management**: local `useState`/`useRef` only (no global state/context)
- **Markdown**: each animation can have a `README.md` loaded via Vite's `?raw` import
- **Textures**: use `import.meta.env.BASE_URL` for asset paths to ensure they work with the Vite `base` config
- **Particle viewers**: always use the shared `src/lib/particles/` library — do not duplicate state, uniform sync, or animation loop logic

## Key Dependencies

| Package        | Version  | Purpose                                    |
|---------------|----------|--------------------------------------------|
| react          | ^18.2.0  | UI framework                               |
| react-dom      | ^18.2.0  | React DOM renderer                         |
| three          | ^0.163.0 | 3D rendering (WebGL)                       |
| marked         | ^15.0.12 | Markdown → HTML for README panels          |
| lucide-react   | ^0.410.0 | Icon set for CSS-based animations          |
| typescript     | ^5.2.2   | Type checking                              |
| vite           | ^5.0.0   | Build tool + dev server                    |
| @vitejs/plugin-react | ^4.0.0 | React fast refresh for Vite           |

## Recommended Improvements (Priority Order)

### P1 — Mobile experience
- Add touch event handlers to FractalsGPU and Correspondence
- Add mobile controls to MobiusWalk
- Make QuarterTurnBar available on mobile (perhaps as a compact drawer)

### P2 — Build and DX
- Add code splitting with `React.lazy()` and `Suspense`
- Add ESLint + Prettier configuration
- Add a real test framework (Vitest)
- Add `npm test` and `npm run lint` scripts
- Remove or use orphaned utilities (ParticleDisplay, R2Mapping, materials)
- Remove placeholder files (requirements.txt, run/setup.sh) or give them real content
- Sanitize markdown output in Readme.tsx (DOMPurify or equivalent)
- Fix duplicate `configure-pages` step in deploy workflow
