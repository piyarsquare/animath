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
├── index.html                  # SPA entry point with global CSS
├── package.json                # dependencies: react, three, marked, lucide-react
├── tsconfig.json               # strict TS, target esnext, path alias @/ → src/
├── vite.config.ts              # base: '/animath/', @/ alias
├── AGENTS.md                   # instructions for other AI agents
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
    │   ├── Fractals/           # CPU-based 2D Mandelbrot/Julia (UNREACHABLE — no route)
    │   ├── FractalsGPU/        # GPU-based fractal viewer (mapped to #/fractals)
    │   ├── MobiusWalk/         # first-person Möbius corridor (Three.js)
    │   └── StableMarriage/     # Gale–Shapley algorithm visualizer (CSS + lucide-react)
    ├── components/             # shared React components
    │   ├── Canvas3D.tsx        # Three.js scene/camera/renderer wrapper
    │   ├── Readme.tsx          # markdown renderer (marked library)
    │   └── ToggleMenu.tsx      # collapsible overlay menu
    ├── config/defaults.ts      # shared constants and default values
    ├── controls/
    │   └── QuarterTurnBar.tsx  # 4D rotation controls for particle views
    ├── lib/                    # utility classes
    │   ├── ParticleDisplay.ts  # particle grid helper (currently unused)
    │   ├── R2Mapping.ts        # R²→R² mapping library (currently unused)
    │   └── viewpoint.ts        # 4D projection and quaternion math
    ├── materials/              # Three.js material presets (currently unused)
    │   └── index.ts            # basic, wireframe, metallic, glass, toon, etc.
    ├── math/
    │   ├── constants.ts        # plane names and quarter-turn constant
    │   └── quat4.ts            # 4D quaternion rotation builder
    ├── styles/
    │   └── responsive.ts       # responsive utilities, breakpoints, useResponsive hook
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
| `#/correspondence` | `Correspondence`   | Mandelbrot–Julia correspondence      |
| `#/roots`          | `ComplexRoots`     | z^(p/q) root explorer                |
| `#/multibranch`    | `ComplexMultibranch` | Multi-branch complex functions      |
| `#/mobius`         | `MobiusWalk`       | Möbius corridor walk                 |
| `#/stable-marriage`| `StableMarriage`   | Gale–Shapley algorithm               |
| `#/agentic-sorting`| `AgenticSorting`   | Concurrent sorting simulation        |

All routes are eagerly imported (no code splitting). Unknown hashes fall back to `App`.

## Architecture Patterns

### Animation modules
Each animation lives in `src/animations/<Name>/` and typically contains:
- A main `.tsx` component (the entire animation + UI)
- An optional `README.md` (imported as raw text via `?raw`)
- Optional `shaders/` directory for GLSL code
- Optional `.css` files for non-Three.js animations

### Three.js animations
The 3D animations (ComplexParticles, ComplexRoots, ComplexMultibranch, FractalsGPU, Correspondence, MobiusWalk) follow this pattern:
1. Use `Canvas3D` component which provides scene, camera, renderer
2. Setup geometry + material in a `useCallback` `onMount`
3. Run `requestAnimationFrame` loops inside `onMount`
4. Sync React state → shader uniforms via individual `useEffect` hooks

### CSS-based animations
StableMarriage and AgenticSorting use regular DOM/CSS rendering with lucide-react icons.

## Known Issues and Technical Debt

### Critical
1. **HDR texture path broken on production** — `ComplexParticles.tsx:398` and `ComplexRoots.tsx:303` load `/textures/royal_esplanade_1k.hdr` but the Vite `base` is `/animath/`, so the correct path should be relative or use the base URL.
2. **MobiusWalk twist toggle broken** — `onMount` callback captures initial `twist` value and never updates when the toggle is clicked (the geometry is not rebuilt).
3. **Fractals2D component has no route** — `src/animations/Fractals/Fractals2D.tsx` exists but is unreachable.

### Severe code duplication
4. **ComplexParticles, ComplexRoots, and ComplexMultibranch are ~95% identical** — each is 800–1100 lines duplicating: texture factories, complex math (CPU-side), 30+ state hooks, animation loops, axis rendering, projection logic, and UI controls. These should be refactored into a shared base.
5. **Complex math is implemented 4 times** — in GLSL shaders, CPU-side in ComplexParticles, CPU-side in ComplexRoots, and in `R2Mapping.ts`.

### Mobile / responsive issues
6. **No touch support on FractalsGPU** — shows "pinch to zoom" label but no touch handlers exist.
7. **Correspondence path drawing broken on mobile** — only mouse events, no touch events.
8. **MobiusWalk has no mobile controls** at all.
9. **QuarterTurnBar hidden on mobile** for all particle views — no way to do 4D rotations on phones.
10. **Fractals2D has zero responsive design** (moot since it's unreachable, but worth noting).

### Build / tooling
11. **No linter, formatter, or test runner** configured — no eslint, prettier, or `npm test`.
12. **No code splitting** — all 8 modules eagerly loaded, producing an 805KB JS bundle.
13. **Unused utilities** — `ParticleDisplay.ts`, `R2Mapping.ts`, and `materials/index.ts` are never imported.
14. **Deploy workflow has duplicate `configure-pages` step**.
15. **`requirements.txt`** and **`run/setup.sh`** are empty placeholders.

### Code quality
16. **XSS risk** — `Readme.tsx` uses `dangerouslySetInnerHTML` with `marked` output.
17. **Mixed import styles** — some files use `@/` path alias, others use relative `../../` paths.
18. **No cleanup of animation frames** in several components — potential memory leaks.

## Development Workflow

### Adding a new animation
1. Create `src/animations/MyAnimation/MyAnimation.tsx`
2. Add route in `src/index.tsx`: import the component and add to the `routes` map
3. For Three.js animations: use the `Canvas3D` component and follow existing patterns
4. For CSS/DOM animations: follow StableMarriage/AgenticSorting patterns
5. Include a `README.md` in the folder if desired (import with `?raw`)

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

## Recommended Improvements (Priority Order)

### P0 — Fix what's broken
- Fix HDR texture paths for production (`base`-aware URLs)
- Fix MobiusWalk twist toggle (rebuild geometry on state change)
- Wire up or remove Fractals2D

### P1 — Reduce duplication
- Extract shared particle visualization base from ComplexParticles/ComplexRoots/ComplexMultibranch
- Consolidate complex math functions into a single shared module
- Consolidate texture factory functions

### P2 — Mobile experience
- Add touch event handlers to FractalsGPU and Correspondence
- Add mobile controls to MobiusWalk
- Make QuarterTurnBar available on mobile (perhaps as a compact drawer)

### P3 — Build and DX
- Add code splitting with `React.lazy()` and `Suspense`
- Add ESLint + Prettier configuration
- Add a real test framework (Vitest)
- Add `npm test` and `npm run lint` scripts
- Remove or use orphaned utilities (ParticleDisplay, R2Mapping, materials)
- Remove placeholder files (requirements.txt, run/setup.sh) or give them real content
- Sanitize markdown output in Readme.tsx (DOMPurify or equivalent)
