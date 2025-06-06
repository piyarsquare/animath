# animath

> *Animated mathematics for curious minds* — a modular, browser-based toolkit for creating, sharing, and exploring mathematical animations and generative art.

<p align="center">
  <a href="https://piyarsquare.github.io/animath/">Live demo</a>
</p>

---

## 1 What is animath?

`animath` is a TypeScript/React + WebGL (Three.js) code-base designed for **rapid prototyping of mathematical visuals**.  
It began with complex-analysis “domain colouring” but is meant to grow into a **general playground**: fractals, differential-equation flows, algebraic surfaces, knot animations, and more.

Goals (observable intent):

* **Self-contained** – runs in any modern browser; no server component required.  
* **Composable** – each animation is an isolated React component with its own GLSL shaders, props, and UI controls.  
* **Pedagogical** – clear code, extensive comments, and references to underlying maths.  
* **Art-friendly** – export stills, GIF loops, and high-resolution renders.

---

## 2 Features

| Capability | Status |
|------------|--------|
| Vite-based hot-reload dev server | ⏳ |
| Typed math utilities (ℂ, ℝ³, quaternions, noise, etc.) | ⏳ |
| Core `Canvas3D` wrapper (Three.js scene, camera, resize) | ⏳ |
| Plug-in animation modules (`src/animations/*`) | ⏳ |
| Keyboard/mouse orbit + trackball controls | ⏳ |
| Works on mobile devices | ⏳ |
| Easy shader recompile without full refresh | ⏳ |
| Built-in screenshot exporter (`S` key) | ⏳ |
| Post-processing stack (FXAA, bloom) | ⏳ |
| Library of material presets | ⏳ |
| Video / GIF capture | ⏳ |
| WebGPU backend | 🚧 (experimental branch) |

*(✅ implemented · ⏳ planned · 🚧 experimental)*

## Material library

`animath` collects reusable Three.js material presets (found under
`src/materials/`). These define common shading styles—such as translucent
sprites or reflective glass—that can be imported by any animation. The goal is
to simplify experimenting with different looks without rewriting shader logic.

---

## 3 Quick start

```bash
# Clone and install dependencies
git clone https://github.com/<USER>/animath.git
cd animath
npm ci          # reproducible install

# Live-reload dev server
npm run dev     # → http://localhost:5173
````

Production build & local preview:

```bash
npm run build   # outputs static files to dist/
npx serve dist  # quick sanity check
```

Node ≥ 20, npm ≥ 10 recommended.

To publish the live demo on GitHub Pages, trigger the `Deploy demo` workflow
manually from the repository's Actions tab.

---

## 4 Repository layout

```
TO BE DETERMINED
```

---

## 5 Creating a new animation

PROJECTED EXAMPLE OF WORKFLOW, OPEN TO REVIISION.
1. `mkdir src/animations/myCoolThing`
2. Implement `<MyCoolThing/>` extending the `Canvas3D` wrapper.
3. Add route entry in `src/index.tsx`.
4. Provide a `README.md` inside the folder explaining the maths.

*Tip:* Keep GLSL strings inline for zero-fetch builds; use `vite-plugin-glsl` if you prefer external files.

### Projection modes

The renderer supports several ways of mapping a 4‑D point `(x,y,u,v)` to 3‑D:

1. **Perspective** – divide by `3 + v`.
2. **Stereo** – stereographic projection from the +v pole.
3. **Hopf** – Hopf fibration assuming a unit hypersphere.
4. **DropX** – ignore the x component.
5. **DropY** – ignore the y component.
6. **DropU** – ignore the u component.
7. **DropV** – ignore the v component.

Switching modes interpolates on the GPU for a smooth transition.

## Controls

* Six **Quarter-Turn** buttons perform smooth 90° rotations in the XY, XU, XV, YU, YV, and UV planes; combine them for any orthogonal orientation before you drop an axis.

---

## 6 Acknowledgements

* Three.js – rendering engine
* React & Vite – UI and build tooling
