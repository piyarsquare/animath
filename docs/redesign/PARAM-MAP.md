# PARAM-MAP — every existing control → its archetype panel

Gate document for Phase 3 (app migration) of the redesign (see `IMPLEMENTATION.md`).
**Rule: no existing capability may be dropped.** Every control in the old chrome
(Settings drawer, Actions drawer, floaters, custom sidebars) lands in exactly one
panel of the closed 11-archetype vocabulary (`DESIGN-SPEC.md §3`):

| Tier | Archetypes |
|---|---|
| Define | `subject` ƒ · `domain` grid |
| Render | `view` camera · `color` palette · `marks` sparkles · `motion` waves |
| Drive | `drive` move-pad · `playback` play |
| Analyze | `lab` flask · `readout` chart |
| System | `quality` gear |

An app may have several panels of the same archetype (e.g. two `readout` panels).
"About"/EXPLAINER markdown is **not** a panel: it surfaces via the workspace
top-bar **?** button (explainer modal — decision recorded in `IN-PROGRESS.md`).
Controls listed are from the full repo inventory (2026-06-09); conditional
controls (shown only in certain modes) keep their conditions inside the panel.

---

## Shared: particle-viewer engine (`ParticleViewerShell` + `QuarterTurnControls`)

Old shell sections → new panels (consumed by Complex Particles; the shell itself
is rewritten to emit these panels):

| Old section | New panel (archetype · title) | Contents (unchanged bindings) |
|---|---|---|
| Function | `subject` · Function | app `functionPicker` + `variantExtras` |
| Domain | `domain` · Domain | Units ×1/×π · Sampling pattern · Reciprocal · ± symmetric bounds · X/Y extent or X/Y range sliders · Input chart · Output chart · `domainExtras` |
| Camera | `view` · Camera | Projection (Persp/Ortho/Stereo/Hopf/Torus/Drop X·Y·U·V) · Collapse→Hopf (Torus) · Reference scaffold · Hopf fibers + density · Hopf study view · Motion (Fixed/Quaternion/Tumble) · Distance |
| Color | `color` · Color | Color by · Colormap · Quantity · Brightness · Style + Hue shift (phase wheel) · Repeat (sequential) · Saturation |
| Particles | `marks` · Particles | Size · Opacity · Intensity · Shape · Texture · Light background |
| Surface | `marks` · Surface | Render Points/Sheet/Tiles/Net + all per-mode controls (fill/wire/resolution/shading/adaptive/density/lighting/light · tile size · circles/rays/width/resolution) |
| Motion | `motion` · Motion | Shimmer · Jitter · Jitter mode |
| Detail | `quality` · Detail | Particle count · Adaptive density + Sharpness α · Axis width · orientation-matrix readout (desktop) · **Reset settings to defaults** (moved here from Actions) |
| Actions (QuarterTurnControls) | `drive` · 4D Rotation | six-plane (or Yaw/Pitch/Roll in Hopf/Torus) eighth-turn + spin toggles · Spin speed · Stop all spins · Drop axis · Reset orientation |
| About | — | top-bar **?** explainer modal (README.md) |

---

## 1. Complex Particles — `#/complex-particles`

Panels: the shared set above, with app extras kept in place:
- `subject` · Function: function Select; `p`/`q` NumberInputs (z^(p/q)); quadratic
  a/b/c Re+Im NumberInputs (Quadratic).
- `domain` · Domain extras: Branch min / Branch max (sheet) NumberInputs.

View window: **f(z) · particle cloud** (Canvas3D; gestures orbit/pan/zoom unchanged).

## 2. Plane Transform — `#/plane-transform`

| Panel | Contents |
|---|---|
| `subject` · Function | Function select · p/q NumberInputs · Branch index select (multivalued) |
| `domain` · Grid | Grid Cartesian/Polar · Plane Cartesian/Log-polar · Extent (±) |
| `color` · Color | Mode Smooth/Tiles/Grid-only · Saturation · Intensity |
| `marks` · Grid style | Point size |
| `drive` · Curves | the old **PlaneCurveFloater** content: draw-mode toggle, standard-curve grid, Clear (floater pattern removed by design) |
| `quality` · Detail | Density (per side) · **Reset settings to defaults** |

View windows: **z-plane (input)** and **f(z)-plane** if the two panes split
cleanly into separate window bodies; otherwise one **z & f(z)** window with the
internal split preserved (validate at migration; canvas pinch/wheel zoom and
freehand drawing keep working per pane).

## 3. Fractals (GPU) — `#/fractals`

| Panel | Contents |
|---|---|
| `subject` · Set | Fractal type (Mandelbrot/Julia/Burning Ship/Tricorn) · Power k · c real/imag (Julia) |
| `domain` · Viewport | Reset-viewport affordance + canvas hint (pan/pinch/wheel live on the canvas) |
| `color` · Palette | Palette · Offset · Color mode Escape/Limit/Layered · Inside palette (Julia) · Animate colors |
| `drive` · Trace | Trace orbits on tap (toggle) · Clear orbit paths |
| `quality` · Iteration | Max iterations · Start iteration |

View window: **Fractal** (shader quad + orbit overlay canvas).

## 4. Mandelbrot ↔ Julia — `#/correspondence`

| Panel | Contents |
|---|---|
| `color` · Palettes | Mandelbrot palette + offset · Julia palette + offset |
| `drive` · Seed | c real/imag NumberInputs · "Pick Julia c by tap" toggle |
| `playback` · Path | the old **PlaybackFloater** content: Draw c-path · Clear path · Play path · Pause/Resume · Speed · progress scrubber slider |
| `quality` · Iteration | Max iterations |

View windows: **Mandelbrot — pick c** and **Julia(c)** (two linked windows;
hover/tap-seed propagation preserved).

## 5. Topology Walk — `#/topology-walk`

| Panel | Contents |
|---|---|
| `subject` · Surface | Family Corridor/Flat/Spherical · Surface select · Planet radius (spherical) · Corridor width |
| `view` · Camera | Third-person view toggle |
| `marks` · Scene | Floor markers · Mini-map · Project avatar into every cell · Glass floor + opacity · Color each cover cell |
| `color` · Theme | Theme select · Ambient light |
| `drive` · Move & write | Walk speed · Wall text input (corridor) · WASD/drag hint |
| `quality` · Effects | Cinematic bloom (GPU) |

View window: **First-person view** (WASD stays on window-level key listeners).

## 6. Trinary System — `#/trinary` (+ `#/trinary-lab` deep link)

Two view windows, toggled by built-in **layouts** (Sandbox / Lab), replacing the
old tab bar; `#/trinary-lab` resolves to the Lab layout. Lab URL-query config
sync is preserved.

Observatory (Sandbox layout):

| Panel | Contents |
|---|---|
| `subject` · System | Preset pills · custom planet x/y/vx/vy spinboxes |
| `subject` · Stars | Star 1/2/3 mass · Softening · Star size (collision) |
| `domain` · Planet launch | Launch mode Auto/Custom · Start radius · Start speed |
| `domain` · Climate | Habitable floor/ceiling · Luminosity exponent β · Calm threshold |
| `view` · Sky | Sky view Starfield/Climate · Day length · Axial tilt |
| `view` · Reference frame | Frame rotation pills · Center on · Align +x to |
| `marks` · Trails | Trail length |
| `lab` · Chaos demo | Ghost planets · Perturbation ε |
| `playback` · Sim | Sim speed · Reset |

Lab (Lab layout; view window hosts the Destiny Map / Census instruments):

| Panel | Contents |
|---|---|
| `subject` · System (lab) | System preset · Orbit around · Star masses ×3 · Softening |
| `domain` · Time & climate | Time budget · Habitable floor/ceiling |
| `lab` · Sampling | Engine CPU/Workers/GPU · Target N · Radius min/max · Speed min/max · Direction pro/retro · Play/Pause/Reset/Export actions |
| `readout` · Outcomes | outcome breakdown · live MiniSim tiles |
| `readout` · Distributions | habitable-fraction / stable-era / ejection-time histograms · records table |

(Exact lab panel split validated at migration; the instruments' internal
Map/Census switch may stay inside the lab view window.)

## 7. Stable Marriage — `#/stable-marriage`

| Panel | Contents |
|---|---|
| `subject` · Preferences | Correlation M→W · Correlation W→M · Algorithm variant select |
| `domain` · Population | Population size (input + inc/dec) |
| `marks` · Display | Draw matches · Highlight proposals · Show all preferences |
| `playback` · Playback | Play · Pause · Skip · Reset · Speed |
| `lab` · Heatmap | Show heatmap · Run simulation · Export heatmap |
| `readout` · Stats | satisfaction averages · blocking pairs · active proposal |

View windows: **Matching** (main DOM viz); heatmap surfaces inside the lab flow
as today (overlay within the view window).

## 8. Agentic Sorting — `#/agentic-sorting`

| Panel | Contents |
|---|---|
| `subject` · Array | Item count · Display as Bars/Dots |
| `drive` · Agents | weight input per agent type (Standard/Blind Date/Nomadic/Patrolling/Perfectionist) |
| `playback` · Run | Play · Pause · Reset · Speed |
| `readout` · Metrics | Wakeups · Swaps · Cycles |

View window: **Array** (bar/dot DOM viz).

## 9. Stable Matching — `#/stable-matching` (not in the design bundle; mapped per its concepts)

Visualizer/Lab tabs become **layouts** (like Trinary); 18 persisted settings keep
their `stable-matching:*` keys.

| Panel | Contents |
|---|---|
| `subject` · Algorithm | Schedule A/B/alt/random · Bias toward A (random) |
| `domain` · Instance | Population (per side) · Consensus A · Consensus B · Seed · Shuffle |
| `marks` · Display | Cell shows both/a/b/diff · Order · Show index labels · Tight grid |
| `playback` · Playback | Play/Pause · Step · Finish · Reset · Speed · Live re-sort |
| `lab` · Lab | Schedule · Surface metric · Population · Resolution · Trials/cell · Run Lab (+ progress) |

View windows: **Matrix** (matrix + metrics cards + narration + legend, as the
visualizer renders today — `window.innerHeight` measurement becomes
container-based) and **Heatmap** (lab surface + note), toggled by layouts.

## 10. Legacy CPU Fractals — `#/fractals-cpu` (unlisted route)

Minimal migration so `ToggleMenu` and the old chrome can be deleted:

| Panel | Contents |
|---|---|
| `subject` · Set | Fractal type Mandelbrot/Julia · c real/imag (Julia) |
| `color` · Palette | Palette · Offset · Animate |
| `quality` · Iteration | Max iterations |

View window: **Fractal (CPU)**. Its hardcoded `100vw/100vh` root becomes `100%`.

---

## Deliberate relocations (old chrome → new home)

| Old chrome surface | New home |
|---|---|
| Settings drawer tab | per-archetype panels (above) |
| Actions drawer tab + ActionFloater mirror | `drive` / `playback` panels |
| Correspondence PlaybackFloater | `playback` · Path panel |
| PlaneTransform PlaneCurveFloater | `drive` · Curves panel |
| "?" explainer popup | workspace top-bar **?** → explainer modal (unchanged content) |
| About sections (README.md in drawer) | explainer modal body (below EXPLAINER content) |
| Apps drawer tab / ⌂ Home / Menu landing | gallery (the only hub) + brand-mark Home |
| Trinary & StableMatching in-app tab bars | built-in workspace layouts (+ legacy hash deep links) |
