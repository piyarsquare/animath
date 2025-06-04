# AGENTS Instructions

This repository contains `animath`, a modular browser-based toolkit for creating mathematical animations using TypeScript/React and WebGL (Three.js).

## Development Quick Start

1. Install dependencies and start the Vite dev server:
   ```bash
   npm run dev
   ```
   which serves the application at <http://localhost:5173>.

2. For a production build and simple preview:
   ```bash
   npm run build   # outputs files to dist/
   npx serve dist  # preview
   ```

Node 20+ and npm 10+ are recommended.

## Creating New Animations

The project is designed to allow small, self-contained React components for individual animations. A typical workflow is:

1. Create a new folder inside `src/animations/`.
2. Implement a React component (e.g. `<MyCoolThing/>`) extending the `Canvas3D` wrapper.
3. Add a route entry in `src/index.tsx` so the animation is accessible.
4. Provide a `README.md` inside the animation folder explaining the maths.

Shader code can be kept inline or loaded with `vite-plugin-glsl`.

## Contribution Checks

Before opening a pull request, run `npm run build` to ensure the project compiles. There are currently no automated tests.

---

These instructions apply repository-wide.
