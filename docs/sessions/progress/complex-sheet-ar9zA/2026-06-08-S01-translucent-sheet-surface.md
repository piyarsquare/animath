---
kind: progress
session: 2026-06-08-S01
date: 2026-06-08
title: Surface render modes (Sheet · Tiles · Net) + colormaps & sampling
branch: claude/complex-sheet-ar9zA
slug: complex-sheet-ar9zA
status: completed
build: passed
followup: low
pr: null
app: ComplexParticles
---

# Surface render modes (Sheet · Tiles · Net) + colormaps & sampling

## Session purpose

Explore a variation of the particle plot where a regular grid of vertices defines
a surface instead of discrete particles. This grew over the session into a full
set of **render modes** (Points / Sheet / Tiles / Net), a richer **colormap**
system, **external lighting**, **reciprocal (log-radial) sampling**, and a
**decluttered settings panel** — all delivered inside `ComplexParticles` /
`ParticleViewerShell` + the `lib/particles` engine (no new route or `apps.ts`
entry).

## Previous session

First tracked session on this branch. The most relevant prior work is
[particle-viewer ideas triage + quick wins](../../handoff/particle-viewer-ideas-priority-UDZRe/2026-06-05-S01-ideas-triage-quick-wins.md)
(completed, build passed): consolidated the `lib/particles` engine and added
color/sampling/projection controls — the engine this new sheet view would build on.

## Working notes

<!-- Newest entry first. One ### per state transition. -->

### 🔵 finding · throughout — Container kept reverting the local checkout
**Why:** worth flagging for the next agent on this cloud branch.

Several times mid-session the ephemeral container reset the **local** working tree
to an old commit (`6fd2683`) while origin still held the latest. Pushed work was
never lost. Mitigation that worked: `git fetch origin complex-sheet && git reset
--hard origin/complex-sheet` at the start of each turn, and **commit + push after
every feature** (which is why the history is many small commits). Treat
`origin/complex-sheet` as the source of truth.

### 🟡 milestone · S01 — Colormaps honor Quantity + Brightness (81af245)
**Why:** the declutter had hidden the Quantity/Brightness selectors and the shader
hardwired colormaps to magnitude; user wanted to map any quantity.

Sequential colormaps now read the **Quantity** selector (phase / magnitude /
real / imag) for the colormap axis and the **Brightness** selector (Uniform flat,
magnitude-scaled, …) for value. `Repeat` tiles along whichever axis (log for
magnitude). Renamed the selector label **Hue → Quantity**. Verified headless
(Viridis by phase vs magnitude differ as expected).

> [!CAUTION]
> **Gotcha** Default `colorQuantity` is **Phase** (the classic HSV default), so a
> freshly-picked colormap maps *phase*, not magnitude. For the radial |f| ramp set
> Quantity → Magnitude (+ Brightness → Uniform for a pure map). A context-aware
> default (phase for HSV, magnitude for colormaps) is an open option.

### 🟡 milestone · S01 — Settings panel declutter (939525c)
**Why:** user: "menus have gotten too rich; easier to see things."

Mode/colormap-aware control visibility: HSV-only controls (Hue/Brightness/Style/
Hue-shift) hidden unless Phase wheel; point-only controls (Size/Shape/Texture)
hidden unless Points mode; the dense 4×4 orientation matrix moved from the
default-open Camera section into the collapsed Detail section. (Quantity/Brightness
visibility was then corrected in 81af245 — see above.)

### 🟡 milestone · S01 — Six more colormaps (1ee72b3)
**Why:** "more colormap choices please."

Added Turbo (Anton Mikhailov polynomial), Cubehelix (Dave Green), Hot, Copper,
Cool, and a diverging Cool–warm to the shared `lib/colormaps.ts` palette library —
so the fractal viewers gain them too (`PALETTE_OPTIONS` kept in sync).

### 🟡 milestone · S01 — Net width + resolution = screen-space ribbons (6027c29)
**Why:** GPU line width on `LineSegments` is ignored by browsers; user wanted a
controllable thread width + smoothness.

Rebuilt the net as **screen-space ribbons**: each segment is a camera-facing quad
expanded perpendicular in pixels by the net vertex shader (`aOther` + `aSide`
attributes, `uResolution` + `uLineWidth` uniforms; width tracks the live
drawing-buffer size on resize). Net is now a `THREE.Mesh`. Added **Width** and
**Resolution** sliders. Verified headless (1.5px vs 7px, no twist).

### 🟡 milestone · S01 — Reciprocal (log-radial) sampling, all modes (a8d588f)
**Why:** "sample as deeply inside the unit circle as outside; apply to every mode."

A `domainWarp()` inside the shared `surfacePos` + color path remaps the domain
radius uniform in log|z| (unit circle at the middle: r→0 ↦ 1/R, r=R ↦ R), so it's
inherited by points, sheet, tiles, and net. Adaptive/stretch metrics warp
consistently. Toggle in the **Domain** section; depth is tied to the domain extent
(inner reach = 1/R). Verified headless (net circles bunch toward the origin).

### 🟡 milestone · S01 — Log-scaled + repeating colormaps (3031f4c)
**Why:** "log-scale the magnitude; include repeating colormaps."

Sequential colormaps map magnitude on a log scale; a **Repeat (log bands)** slider
tiles the colormap that many cycles per e-fold using a mirrored (seamless) wave →
contour-like magnitude bands.

### 🟡 milestone · S01 — Net: independent circles/rays toggles + more circles (f132697)
**Why:** user wanted to turn rays off; rays cluttered the Torus center.

Replaced the 3-way Fibers pills with independent **Circles** / **Rays** checkboxes
(rays default **off**); raised Circles max to 250.

> [!NOTE]
> **Why rays converge at the Torus center** Every ray includes z=0 as its inner
> endpoint, so all rays share one point; the Torus map sends |z|/|f|→latitude, so
> that shared point lands on the torus core and the rays bundle into it. Turning
> rays off (or starting them off-origin) removes the bundle. The circles are the
> Hopf-fiber-related family the user cares about (for f=z they *are* Hopf fibers;
> for zⁿ they're (1,n) torus knots).

### 🟡 milestone · S01 — Net render mode (polar fiber net) (902fabb)
**Why:** "make a net between the points; structured to see fiber structures."

New **Net** render mode: concentric circles (constant |z|) and rays (constant
arg z) placed on the surface and domain-colored, exposing the function's fiber
structure. Verified headless on z² (the two orthogonal curve families) and 1/z in
Hopf.

### 🟡 milestone · S01 — External light: inside vs outside (92d9df3)
**Why:** user asked for lighting to distinguish "inside" from "outside".

Shared `applyExternalLight()` in the sheet + tile fragment shaders: a directional
light shades whichever side faces the camera, and back faces get a cooler/dimmer
tint so inside reads distinctly. Toggle + strength on Sheet and Tiles.

### 🟡 milestone · S01 — Sequential colormaps for magnitude (77d3afc)
**Why:** "colormaps besides rainbow, suitable for magnitude."

Added a **Colormap** selector reusing the fractal viewers' GLSL palette library
(Phase wheel + Viridis/Magma/Inferno/Plasma/Grayscale/Fire/Ocean), initially
mapping magnitude.

### 🟡 milestone · S01 — Tiles render mode (oriented surfels) (70d7d6d)
**Why:** user vision — a fabric of tiles that tears into points where stretched.

New **Tiles** mode: one oriented quad per grid sample, expanded along the local
deformed grid directions (central differences of `surfacePos`) and capped at a
**Tile size** (world units) — dense regions form a solid fabric, stretched regions
detach into a field of separated tiles. Verified headless across tile sizes.

### 🟡 milestone · S01 — Adaptive sheet density + resolution → 500 (6e99207, 3b71adb)
**Why:** sheet should read as solid where dense and fall back to points where the
function stretches it; finer meshes wanted.

Adaptive mode: where a cell's deformed 3D size exceeds a **Density** threshold the
fill/wire dissolves and the underlying point cloud shows through (per-cell
`cellStretch` metric; `renderOrder` pins points behind fill behind wire). Also
added an edge-fade to zero (no hard domain boundary) and raised max sheet
resolution 200 → 500.

### 🟡 milestone · 16:45 — Quad sheet reworked + verified
**Why:** implemented the user's model; build green and visually confirmed.

Fill is now a **non-indexed per-quad** mesh whose new `sheetFillVertexShader`
averages `calcColor` over each cell's four corners (`cellBase` attribute +
`uCellSize` uniform) → one flat color per rectangle. Wireframe is a
**`THREE.LineSegments`** over a dedicated line geometry (`createSheetWireGeometry`,
row/column edges only). Verified headless on `z²` in DropV: clean rectangular
cells, wire exactly on the fill, flat tiles (the origin's muted tiles correctly
flag the zero, where averaging the wrapping phase desaturates). Points unregressed.

### 🟣 decision · 16:30 — Quad faces + rectangular wireframe + flat averaged color
**Why:** user feedback. Two issues: (1) the wireframe shows triangle diagonals
(I triangulated each cell), and (2) the sheet everts under Perspective.

Diagnosed the eversion: the **4D Perspective** projection divides by `(3 + Im f)`;
for `z²`/`eᶻ`, `Im f` crosses `−3`, so the surface shoots to infinity and folds
back. The mesh is correct — in a linear **Drop-axis** projection the same sheet is
clean and the wire sits exactly on the cells (verified headless). User chose to
**keep the 4D graph** (same object as the particles) and live with the eversion
(use Drop-axis/Stereo to avoid it), but wants:
- **Rectangular faces** (no triangle diagonals) — switch the wireframe from a
  triangulated `wireframe:true` mesh to a `LineSegments` of just the row/column
  grid edges.
- **Flat per-rectangle color = average of the 4 corner colors** — switch the fill
  to a non-indexed per-quad mesh; each vertex carries its quad's `cellBase`, and
  the fill vertex shader averages `calcColor` over the 4 corners (`cellBase` +
  `uCellSize`) so each rectangle is one flat color.

### 🟡 milestone · 15:55 — Sheet render mode shipped, build green
**Why:** feature complete and verified headlessly.

Added a **Surface** render mode to ComplexParticles: **Points** (unchanged) or
**Sheet** — a single translucent triangle surface over a regular grid, with
toggleable filled + wireframe layers, a resolution slider, and a faceted-shading
slider. Verified by headless render (SwiftShader) across z² and eᶻ in both
filled+wire and wire-only; Points mode confirmed unregressed. `npm run build`
passes.

> [!CAUTION]
> **Gotcha (fixed)** A double-sided translucent sheet under the points' default
> **AdditiveBlending** blows out to solid white (overdraw sums past 1). The sheet
> materials therefore force **NormalBlending** with `depthWrite: false` (true
> alpha compositing), and are tagged `userData.sheet` so the `objectMode`
> (light-background) effect leaves their blending alone. Faceted shading from
> `dFdx/dFdy(viewPos)` supplies the depth cues additive glow can't.

> [!NOTE]
> Sheet mode samples its **own** Cartesian grid (its `sheetResolution`), ignoring
> the Sampling pattern and particle count — a continuous surface needs grid
> topology. The big stretching near singularities / fast-growing `f` is inherent
> to the projection (same as Points); zoom out with **Distance**.

### 🔵 finding · 15:30 — branchIndex relied on positional index
**Why:** adding 3 materials per branch broke the old assumption.

The Riemann-sheet `branchIndex` effect set `materialsRef[i] = branchMin + i`,
assuming one material per branch. With points + sheet-fill + sheet-wire per
branch that mapping is wrong, so each material is now tagged
`userData.branch` and the effect reads that instead of its list position.

### 🟢 code · 15:20 — Implementing Sheet render mode
**Why:** finished reading the engine; the seams are clear, starting the build.

Design (maximal reuse of the existing engine):
- **Sheet geometry** = a new regular `res×res` indexed triangle grid
  (`lib/particles/createSheetGeometry.ts`), independent of `particleCount` /
  `samplePattern` (a sheet needs grid topology). Its own `sheetResolution`.
- **Shaders** — refactor `ComplexParticles/shaders/index.ts` to share the GLSL
  function library (`vsPreamble` + `vsLib`) between the existing points vertex
  shader and a new `sheetVertexShader` (adds a `vViewPos` varying, drops
  `gl_PointSize`). New `sheetFragmentShader`: translucent fill with faceted
  shading from screen-space derivatives, plus a `uWire` flag for the wireframe
  overlay.
- **Materials** — sheet fill + wire materials carry the *same* uniform set as the
  points material (so `useUniformSync` / the animation loop / `useViewControls`
  drive them unchanged), tagged with `userData.branch` so `branchIndex` no longer
  relies on positional index.
- **Controls** — a new "Surface" section in `ParticleViewerShell`: Render
  (Points/Sheet) Pills, then Filled/Wireframe checkboxes, Resolution + Shading
  sliders.

> [!NOTE]
> Delivered inside ComplexParticles — **no new route / apps.ts entry**, so no
> shared-file churn beyond the engine it builds on.

### 🟣 decision · 15:05 — Deliver as a new render mode inside ComplexParticles
**Why:** user chose "new render mode in ComplexParticles" over a separate app, and
"both translucent fill + wireframe, toggleable" for the surface style.

Plan: add a render-mode toggle (Points / Sheet) to the existing viewer. In Sheet
mode, build an indexed triangle mesh from the existing regular grid, render it with
a translucent double-sided material and a toggleable wireframe overlay, reusing the
existing projection + per-vertex color shaders. Now exploring the `lib/particles`
engine to find the cleanest seams.

### 🟡 milestone · 15:02 — Session initialized
**Why:** start-session skill — orient before any implementation.

New branch `claude/complex-sheet-ar9zA`. Focus: a translucent-sheet surface
variant of the particle viewer (regular grid → wireframe → translucent sheet,
instead of point particles). The `lib/particles` engine + `ParticleViewerShell`
(canonical consumer: `ComplexParticles`) is the foundation to study. Awaiting
direction before writing code.

## Key files

| File | Role |
| --- | --- |
| `lib/particles/createSheetGeometry.ts` | Sheet fill + wire, **`createTileGeometry`** (oriented surfels), **`createNetGeometry`** (polar net as screen-space ribbon quads: `aOther`/`aSide`). All rebuildable. |
| `lib/particles/types.ts` | `renderModes = ['Points','Sheet','Tiles','Net']`; `colormapNames` (14 maps). |
| `lib/particles/useParticleState.ts` | Persisted state for every feature: `renderMode`, sheet (`sheetFill/Wire/Resolution/Shade/Adaptive/Density`), `tileSize`, net (`netCircles/Rays/Rings/Spokes/Width/Resolution`), `colormap`, `colorRepeat`, `lighting`/`lightStrength`, `reciprocal`. |
| `lib/particles/useUniformSync.ts` | Syncs the new uniforms (`uColormap`, `uColorRepeat`, `uReciprocal`, `uLight`/`uLightStrength`, …); `objectMode` skips `userData.sheet`. |
| `lib/colormaps.ts` | Shared GLSL palette library — added Turbo/Cubehelix/Hot/Copper/Cool/Cool–warm; `PALETTE_OPTIONS` kept in sync (fractals benefit too). |
| `ComplexParticles/shaders/index.ts` | `vsCommon` shared GLSL: `domainWarp` (reciprocal sampling), `surfacePos`, colormap branch (honors Quantity + Brightness + Repeat). Point/sheet-fill/sheet-wire/**tile**/**net** vertex shaders + `applyExternalLight` in sheet/tile fragments. |
| `ComplexParticles/ComplexParticles.tsx` | Per-branch materials/meshes for points + sheet fill + wire + **tiles** + **net**; geometry build/rebuild + visibility + uniform-sync effects (incl. net `uResolution` resize handler). |
| `components/ParticleViewerShell.tsx` | **Color** (mode-aware) + **Surface** (per-mode Sheet/Tiles/Net controls) + **Domain** (Reciprocal sampling); decluttered visibility. |
| `ComplexParticles/{README,EXPLAINER}.md` | Documented the Surface / Sheet mode (Tiles/Net/colormaps not yet written up). |

## Self-reflection

1. **Another session?** Mostly polish: a **context-aware colormap default**
   (Quantity = magnitude when a sequential map is picked, phase for HSV); a
   **dedicated sheet opacity** (it still shares the points' `opacity`); an
   independent **reciprocal-sampling depth** control (currently tied to extent);
   and writing up Tiles / Net / colormaps in README/EXPLAINER.
2. **Change about what I produced?** The Color section's mode-aware visibility went
   through two passes — I over-hid Quantity/Brightness in the declutter and had to
   restore them. A clearer up-front model (which controls belong to which mode)
   would have avoided the round-trip.
3. **Not asked but important?** Net rays still pass exactly through the origin, so
   they bundle at the Torus core; starting them at an inner radius would tidy that
   without an extra toggle. Left as the user opted to switch rays off instead.
4. **Overlooked together?** Screen-space line width needs the live drawing-buffer
   size — easy to forget the resize handler; the ribbon would otherwise drift with
   window size.
5. **Difficult?** The ephemeral container repeatedly reverted the local checkout to
   an old commit; `git reset --hard origin/...` per turn + frequent pushes made it
   a non-issue but it's a real hazard for cloud sessions.
6. **Easier?** A harness helper to drive app controls (beyond seeding
   `localStorage`) would speed visual iteration; it worked but is verbose.
7. **Follow-up value:** LOW — all features build, are pushed to
   `origin/complex-sheet`, and were verified headlessly. What remains is optional
   polish + docs, and deciding whether to merge the branch to `main` (it is **not**
   deployed yet).
