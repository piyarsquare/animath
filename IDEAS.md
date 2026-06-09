# Ideas

A running backlog of feature ideas for animath. Append new ideas at the end;
don't reorder. These are unprioritized sketches, not commitments.

## Particle / 4D viewers

### Auto-spin ("spinners") for the quarter-turn / rotation buttons — ✅ implemented

Shipped in `QuarterTurnControls` (in the standard Actions panel): a spin toggle
under each ↻/↺ button starts/stops a continuous rotation in that plane and
direction, multiple compose, and a single global speed slider sets the rate.
Spin on/off is kept as transient view state (not persisted). Original sketch:

Add a way to make a 4D rotation run *continuously* so the projection spins
smoothly along that axis of rotation, instead of only stepping 90° per tap or
turning while held.

- For each rotation plane (the QuarterTurnFloater clusters — `xy`, `xu`, `xv`,
  `yu`, `yv`, `uv`), add an extra **spinner toggle** button next to the existing
  quarter-turn button. Toggling it on starts a continuous rotation in that plane;
  toggling off stops it.
- Add a **speed slider** (signed, so it can spin either direction; 0 = stopped).
  Decide whether speed is global (one slider for whichever spinners are active)
  or per-plane (a slider per spinner). Start with a single global speed slider for
  simplicity; revisit per-axis speed if needed.
- Multiple spinners active at once should compose (e.g. an `xy` + `uv` spin gives
  the classic double/isoclinic rotation — a natural, very watchable motion).
- Hook into the existing animation loop (`lib/particles/createAnimationLoop.ts`)
  which already composes quaternions per frame; the spinner just feeds a constant
  angular increment per frame into the same path the "hold to rotate" gesture uses.
- Persist spinner on/off + speed via `useParticleState` storage like the other
  settings (but treat the live orientation as transient view state, per the
  persistence conventions in CLAUDE.md).
- Nice-to-have: a master "stop all spins" control, and respect reduced-motion
  preferences.

### Polar coordinate toggles for input and/or output — ✅ implemented

Shipped as **Input chart** / **Output chart** pickers in the Domain section
(`CoordMode`: Cartesian / Polar / Log-polar). Each replots its plane as
`(|·|, arg)` or `(log|·|, arg)` before the 4-vector is assembled (via
`chartCoord` in the shader, uniforms `uInCoord` / `uOutCoord`); color keeps the
raw Cartesian value. Log-polar output makes `exp` the identity; log-polar on both
flattens `zⁿ`/roots into linear shears. A genuine `(r, α)` input grid now exists
as the **Polar** option of the new domain **Sampling** picker (see below). Not yet
done: a phase-unwrap option for the `arg` seam. Original sketch:

Let the input domain and the output be plotted in **polar** instead of Cartesian,
independently, each with an optional **log-radius** sub-toggle.

- **Output polar:** after computing `w = (u, v)`, feed `(|w|, arg w)` into the
  4-vector instead of `(u, v)` (mind the `arg` seam at ±π — offer an optional
  phase-unwrap). This "unrolls" rotational structure: for `exp` the trumpet/
  helicoid flatten into exponential walls/ramps, and in *log-polar* output `exp`
  becomes the identity (the flat input plane) — its natural chart.
- **Input polar:** sample the domain on an `(r, α)` grid (`z = r·e^{iα}`) instead
  of the Cartesian `(x, z)` grid. This is the natural chart for powers/roots/log:
  `zⁿ` becomes a linear shear in log-polar, so √z / ∛z Riemann sheets flatten into
  evenly-spaced tilted planes.
- Pairs naturally with the spinner idea and with the channel-mapping idea below.

### Unified channel-mapping control (axes + color from any source/coordinate) — ⏳ deferred (foundation in place)

Deliberately left as a dedicated future effort. Its cheaper slices have all
landed and proven out the plumbing: the **Hue**/**Brightness** quantity pickers
(color from source × {phase, modulus, real, imag}), the **Input/Output charts**
(Cartesian / polar / log-polar per plane), the **Drop-axis** projections, and the
parameterized functions. The full matrix would re-architect the 4-vector assembly
to be assignment-driven and subsume those as special cases — a big change best
done on its own, not bolted on at the end of the granular work. Original sketch:

Generalize the hardwired plotting into one control surface. Today the 4-vector is
fixed as `(Re z, Im z, Re f, Im f)` and color is `arg`→hue + `|·|`→value, chosen
from input (`Domain`) or output (`Range`) via `ColorBy`. Instead, expose an
explicit **assignment matrix**: for each *visual channel* — the 3 spatial axes,
**color**, and optionally **point size / texture / opacity** — pick:

  1. a **source**: input `z` or output `f` (later maybe the 4th/dropped coord,
     or a derived quantity like `|f'|`);
  2. a **coordinate**: Cartesian component (Re / Im) or polar component
     (modulus / argument), with an optional **log** modifier.

This subsumes the current drop-axis modes (a "drop" is just leaving a coordinate
unassigned), the polar toggles above, and the `ColorBy` switch — all as special
cases of one matrix. Provide sensible presets (the current default, "domain
coloring", "modulus surface", etc.) so the matrix isn't overwhelming. Guard
against degenerate/duplicate assignments (e.g. two axes bound to the same
coordinate) with a gentle warning rather than a hard block — sometimes the
collapse is instructive.

### Faithful (normalized) Hopf projection — ✅ implemented

Shipped in #178: `project` mode `Hopf` (in both `lib/viewpoint.ts` and the shader)
is now the genuine normalized Hopf map `H = (2·Re(z·conj f), 2·Im(z·conj f),
|z|²−|f|²)/(|z|²+|f|²)`, landing every particle on S² with latitude = `|z|/|f|`
and longitude = `arg z − arg f`. The stylized quadratic variant was replaced (not
kept as a separate option). Original sketch:

The current `project` mode 2 / shader "Hopf" is a Hopf-*style* quadratic variant
`(2xv, 2yv, x²+v²−y²−u²)`, not the textbook map, so it doesn't match the clean
"ratio `z/f` on the Riemann sphere" interpretation. Replace (or add alongside) it
with the genuine Hopf map of the complex pair `(z₁, z₂) = (z, f)`:

  H = ( 2·Re(z·conj(f)), 2·Im(z·conj(f)), |z|² − |f|² ) / (|z|² + |f|²)

which lands every particle on the unit sphere S². Then the plot reads exactly:
**latitude = |z|/|f|** (equator where equal; poles where `f→0` / `z→0`),
**longitude = arg(z) − arg(f)**. Sanity checks for the guide/EXPLAINER:
`f = c·z` collapses to a single point (move it with `|c|`/`arg c`); `f = z + c`
and `f = z²` each cover the sphere once (Möbius); `exp` wraps it infinitely.
Consider keeping the old variant as a separate "Hopf (stylized)" option if its
look is liked.

### "Hopf study" mode: freeze the 4D orientation + in-app guide — ✅ implemented

Shipped a **Hopf study view** button (Camera panel, shown in Hopf/Torus): it
forces the Hopf projection, sets Motion → Fixed, stops any spins, and snaps the
4D orientation back to identity in one tap, so the latitude/longitude reading
holds. The EXPLAINER already carries the reading ladder (`c·z` → point; `z+c`,
`z²` → sphere once; `exp` → infinite wrap) and the latitude/longitude legend. The
reference scaffold now also carries text labels (sphere poles `f→0`/`z→0`, the
`|z|=|f|` equator, and the torus cores + `arg z` direction). Original sketch:

The 4D spinner/rotation is applied *before* the Hopf map, which remixes input and
output coordinates and breaks the `z/f` reading. For learning Hopf we want a
static, identity-orientation view.

- A one-tap **"Hopf study"** preset (or an auto-hint when Hopf is selected) that
  sets Motion → Fixed and resets the 4D orientation to identity, so the
  latitude/longitude reading holds.
- Optionally suppress / disable the spinners (above) while in this mode, or warn
  that spinning invalidates the ratio interpretation.
- Ship a short **Hopf reading guide** in EXPLAINER.md (the ladder: `c·z` → a
  single point; `z+c`, `z²` → sphere once; `exp` → infinite wrap), plus the
  latitude/longitude legend. A faint sphere wireframe + pole/equator labels would
  help enormously.

### Clifford-torus ("un-collapsed Hopf") projection — IMPLEMENTED

Added as `ProjectionMode.Torus` (a new "Torus" view-type option). It's the Hopf
data with the fibers left intact: normalize `(z1,z2)=(z,f)` onto S³ and
stereographically project from the `(0,0,0,1)` pole, which simplifies to
`(X,Y,Z) = (x, y, u) / (|p| − v)`. `arg z` runs around the hole, `arg f` around
the tube, `|z|/|f|` selects the nested donut, overall scale is dropped. Each Hopf
fiber is a `(1,1)` curve on its donut — the points the Hopf sphere collapses.

Follow-ups:
- DONE — **Collapse → Hopf** slider (shown in the Camera section when the Torus
  view is active): scrubs `uProjAlpha` over a Torus→Hopf cross-fade so you watch
  the `(1,1)` fiber circles shrink to the points the Hopf map identifies.
- DONE — faint **Reference scaffold** (Clifford-torus donuts + unit Riemann
  sphere with equator/poles), toggled per view. See `createHopfScaffold.ts`.
- Open: pole/core-circle **labels** on the scaffold (currently unlabeled lines).
- Open: the stereographic pole (points with `z→0` and `f` near `+i|f|`) sends
  particles toward infinity; consider a soft clamp or an alternate projection
  pole if it's visually distracting for some functions.

### Flexible "color by" — choose source *and* quantity — ✅ implemented

Shipped **Hue** and **Brightness** pickers in the Color section (`ColorQuantity`):
the source stays the Domain/Range switch, and the two controls independently
choose which scalar drives hue and value — **Phase** (classic `arg → hue`),
**Magnitude** (color/shade by `|z|` / `|f|`), **Real**, or **Imag**. Defaults
reproduce classic domain coloring (hue = phase, brightness = magnitude), and the
two can now be driven by *different* quantities. Implemented behind `uColorQty`
and `uBrightnessQty` in `calcColor` (`ComplexParticles/shaders/index.ts`) and
persisted via `useParticleState`. (Brightness applies to the HSV / Dual-hue
styles; the Modulus-bands and Phase-only styles fix their own value by design.)
Original sketch:

Today **Color → Color by** is a binary `ColorBy` (Domain = `z` vs Range = `f`),
and the colormap is hardwired as `arg → hue`, `|·| → value`. Open it up so the
user can pick **which quantity** drives the color, independently of the source:

- **Source:** input `z` or output `f(z)` (already the Domain/Range switch).
- **Quantity:** magnitude `|·|`, argument/phase `arg`, real part, or imaginary
  part — e.g. color by **|z|** or **|f(z)|** (the specific ask) instead of the
  current phase-driven hue.
- Possibly let hue and brightness be driven by *different* quantities (e.g. hue
  from `arg f`, value from `|z|`).

This is the color slice of the broader **Unified channel-mapping control** idea
above; if that lands, this is just its color row. Short of the full matrix, ship a
small `Pills`/`Select` pair (source × quantity) in the Color section. Implement in
the shader's `calcColor` (`ComplexParticles/shaders/index.ts`) behind a couple of
uniforms; persist the selection via `useParticleState`.

### Explicit domain bounds (lower/upper) with a ± lock — ✅ implemented

Shipped a **± symmetric bounds** lock in the Domain section: locked keeps the
classic symmetric `±extent` sliders; unlocked exposes independent X/Y min/max
(as two-thumb **RangeSlider**s) for off-center windows like `x ∈ [0, 6]`. The
geometry builders now take explicit `(xMin,xMax,yMin,yMax)`, `axisScale` still
applies, and toggling the lock seeds the other representation so the view doesn't
jump. Original sketch:

The sampled domain is currently symmetric half-widths (`extentX`, `extentY`, so the
box is always `[-ext, +ext]`). Let the user set **independent lower and upper
bounds** per axis (`xMin/xMax`, `yMin/yMax`), with a **lock toggle** that ties them
to a symmetric `±a` (today's behavior) and, when unlocked, allows an off-center
window (e.g. `x ∈ [0, 6]`).

- Replace/augment the two extent sliders with min/max number inputs per axis plus a
  "± lock" checkbox; locked keeps `min = −max` and shows a single magnitude.
- Thread through `createParticleGeometry` / `rebuildGeometryBuffers` /
  `redistributeAdaptive` (which currently center the grid at 0 via `*spanX`/2) so
  they sample `[xMin, xMax] × [yMin, yMax]`.
- Keep the `axisScale` (×1 / ×π) multiplier working with the new bounds.
- Pairs with the number-input commit-on-blur idea below.

### More functions, better organized (+ a generic quadratic; stretch: custom f)

Partly done: `cot`, `arcsin`, `arccos` are shipped (in both `lib/complexMath.ts`
and the shader `applyComplex` switch, appended at indices 19–21 so persisted
selections stay stable), and the picker is now grouped into categories via the
new `functionCategories` table + `Select` `groups` (optgroup) support. The
inverse-trig pair is branch-aware (the `ln` carries the ±2π·k sheets; inner sqrt
principal) and was checked numerically against known values. The **generic
quadratic** `a·z²+b·z+c` (complex coefficients, index 22) also shipped — wired
through `uQuadA/B/C` + the adaptive CPU path, with the coefficients editable via
the commit-on-blur `NumberInput`. Still open: the **custom-f** stretch goal (a
typed expression → GLSL). Original sketch:

Grow and organize the function list (`lib/complexMath.ts` name/formula tables + the
shader `applyComplex` switch in `ComplexParticles/shaders/index.ts`):

- **Add functions:** `cot` (= cos/sin), `arcsin`, `arccos` (note these are
  multivalued — `arcsin z = −i·ln(iz + √(1−z²))`, `arccos z = −i·ln(z + i√(1−z²))`;
  reuse the existing `branchIndex` plumbing for sheet selection).
- **Generic quadratic** `a·z² + b·z + c` with user-set coefficients `a, b, c`
  (complex, or at least real) exposed as inputs — a parameterized family rather than
  a fixed entry. (Generalize later to a generic polynomial.)
- **Organization:** group the (now long) list into categories — polynomial /
  rational, roots & log (multivalued), trig & inverse-trig, exp & essential, special
  (Γ, Joukowski, Möbius) — via `Select` optgroups or a category `Pills` + `Select`,
  so the picker stays scannable.
- **Stretch — "write your own function":** a custom complex expression the user
  types (e.g. `z^2 + 1/z`). Hard because the math runs in GLSL: options are a tiny
  expression→GLSL compiler injected into the shader (recompile on change), or a CPU
  evaluator (already needed for adaptive sampling) plus a generic GLSL interpreter.
  Big task — treat the generic-quadratic/polynomial path as the pragmatic middle
  ground to ship first.

### Number inputs: commit on Enter/blur, with revert (shared ControlPanel) — ✅ implemented

Shipped a shared `ControlPanel` **NumberInput** primitive: keeps a draft string
while typing, commits only on Enter/blur, clamps to `min`/`max` (rounds if
`integer`), reverts an unparseable entry, and cancels on Escape. Used for the
`z^(p/q)` p/q fields and the quadratic coefficients. (No toast on revert — it
restores the last good value silently.) Original sketch:

Wherever a control takes a *typed* number, **don't apply the change keystroke by
keystroke** — wait until the user presses **Enter** or **leaves the field**, then
validate and commit. If the committed value is invalid/unsatisfactory (out of range,
unparseable, or it makes the view degenerate), **revert to the previous value**,
ideally with a small popup/toast explaining why.

- This is a **shared `ControlPanel` change** (affects every app, not just Complex
  Particles): add a number-entry primitive (or a "commit on blur/Enter" mode for the
  existing `Slider`'s numeric field and any raw inputs — the exponent `p/q`, the new
  domain bounds, the quadratic coefficients).
- Keep an internal "draft" string while typing; on commit, parse + clamp to the
  control's `min`/`max`/`step`; on failure restore the last good value and signal it.
- Especially important for the domain-bounds and quadratic-coefficient inputs above,
  where intermediate keystrokes (an empty box, a lone "−") would otherwise
  momentarily break the render.

### Show the actual Hopf fibers (the interlocking circles) — ✅ implemented

Shipped a **Hopf fibers** toggle + **Fiber density** slider (Camera section, Torus
view), backed by `createHopfFibers.ts`: it samples base points on S² directly (a
grid over latitude η and longitude ψ) and draws each one's full circle
`θ ↦ stereo(normalize(e^{iθ}·(z₁,z₂)))` as a `LineLoop`, in the same normalized
stereographic chart + SCALE as the particles/scaffold, colored by base point.
Open follow-ups: have the **Collapse → Hopf** slider also shrink the fiber circles
to their base points (currently the fibers just hide past the half-way collapse),
and an option to seed fibers from the *function's own* graph points rather than a
uniform S² grid. Original sketch:

**Motivation.** The iconic Hopf-fibration image — linked Villarceau circles packed
into nested tori — is a picture of **S³** (stereographically dropped into ℝ³). Our
**Torus** mode already *is* that S³ chart, yet you never see the circles, and the
reason is fundamental: a particle is `(z, f(z))`, so the cloud is a **2-D surface**
(the graph of f), not a sampling of fibers. The classic image is built by sampling
many **base points on S²** and drawing each one's **whole fiber circle**; we instead
plot where the function's graph *lands*. Hopf mode then collapses each fiber to a
point on the base S² by design. So neither current mode draws a fiber. The missing
dimension is precisely the **common phase** `θ` in `(e^{iθ}z, e^{iθ}f)` — the U(1)
orbit, which *is* the Hopf fiber. (You can't fill a 3-manifold with a 2-manifold of
points; you have to add the fiber back.)

**Feature: a fiber-trace overlay.** Behind a toggle, for a sampled set of base
points draw the full Hopf circle

  `θ ↦ stereo( normalize( e^{iθ}·(z, f) ) )`,  θ ∈ [0, 2π)

as a line loop in the **Torus (S³)** view, colored by its base point (i.e. by the
ratio `z/f`, exactly what Hopf mode shows). Then:

- The existing **Collapse → Hopf** slider (`uProjAlpha`) animates each circle
  *shrinking to its base point* — the fibration's defining move, made visible.
- Sampling base points along **circles of latitude on S²** (constant `|z|/|f|`)
  yields clean **nested Clifford-torus** donuts that register with the existing
  reference scaffold (`createHopfScaffold.ts`); sampling a 2-D grid packs the ball.
- Ties the abstract picture back to *our* object: the circles you see are the
  common-phase orbits of the function's graph points. (For generic f each graph
  point sits on a distinct fiber — `f(e^{iθ}z) = e^{iθ}f(z)` only for homogeneous
  degree-1 f — so for the textbook nested-tori look, sample base points directly on
  S² rather than reusing the domain grid.)
- Implementation: a separate `LineSegments`/`LineLoop` overlay (not the point
  cloud), generated from a "fibers to draw" sample-density control; reuse the Torus
  projection math in `viewpoint.ts` / `shaders/index.ts:186`. Keep it off by default
  (it's a study aid, and dense fibers get busy). Pairs with the "Hopf study" mode.

### Color as a fourth channel (spend color on a dropped axis, not on phase) — ⚠️ largely covered

Effectively achievable today by combining a **Drop axis** projection with the
**Hue**/**Brightness** quantity pickers: drop a coordinate spatially, then bind
hue (or brightness) to the matching source + quantity — e.g. Drop V in space and
set Hue = Imag of the Range, which paints the discarded `v = Im f` onto color for
a no-projection-loss 4-D view. A dedicated auto-binding "Drop → color" variant
was judged redundant given those controls already exist; revisit it as the color
row of the unified channel-mapping matrix below. Original sketch:

**Motivation.** Today color is **domain coloring** (`arg`→hue, `|·|`→value of `z` or
`f`; `calcColor` in `ComplexParticles/shaders/index.ts:201`) — but that information
is *already* in the geometry, so color is a legibility aid, **not an independent
axis**. An alternative is to let color carry one of the four coordinates the
projection would otherwise **discard**, giving a no-distortion 4-D view: 3 axes in
space + 1 axis in color (e.g. show `(x, y, u)` in space and encode `v` as hue or
brightness).

- This is the "color row" of the broader **Unified channel-mapping control** idea
  above — implement it there if that lands, or as a standalone **"Drop → color"**
  projection variant (a Drop-axis mode that maps the dropped coordinate to color
  instead of throwing it away).
- Honest trade-offs to document: faithful in a single frame (no projection loss),
  but color is a perceptually coarse channel (hard to read precise values), it
  **can't show linking/continuity** the way geometry can, and you lose color for
  phase while it's in use. A diverging/cyclic ramp + a small legend would help.
- Caveat (and the reason this is *separate* from the fiber idea): color-as-dimension
  does **not** reveal the interlocking circles — "interlocking" is an embedded-in-ℝ³
  phenomenon you only get by drawing the fiber curves (above). Color can label
  *which* fiber a point belongs to, not make two loops visibly thread each other.

### Domain sampling patterns (grid / polar / rings / spokes / web / squares / random) — ✅ implemented

Shipped a **Sampling** picker in the Domain section (`SamplePattern`) that lays the
domain points out as a Cartesian **Grid** (default), **Polar** lattice, concentric
**Rings**, radial **Spokes**, a **Web** (rings + spokes), concentric **Squares**, or
**Random** scatter. Built in `createParticleGeometry.ts` (`fillPattern`); radial
patterns sample a disk of radius max(halfX, halfY) centered on the box, the others
use the box; each fills exactly `count` points. Beyond the visual variety, **Polar**
spreads points evenly in `arg z`, which keeps near-linear maps (`f ≈ b·z`) crisp in
the Hopf/Torus view (a Cartesian grid under-samples one side of the fiber circle —
verified the faint fraction drops 23% → 0% at `b = 2`). Bypassed while adaptive
density is on. Open: let radial patterns honor an annulus (`rMin > 0`); a phyllotaxis
/ sunflower option; and per-pattern density controls (ring/spoke counts).

### Hopf study preset refinements (clear drop axis; preset polish) — ⏳ deferred

The **Hopf study view** button (`ParticleViewerShell.enterHopfStudy`) calls
`controls.handleViewType(ProjectionMode.Hopf)`, but `handleViewType` routes the
projection through the *current* `dropAxis` (`applyView(t, dropAxis)` in
`useViewControls.ts`). So if a `DropX/Y/U/V` axis is active, the button lands on
the drop projection, not Hopf — the latitude/longitude reading it promises never
appears. (Flagged in PR review, P2.)

- **Fix:** clear the drop axis as part of the preset and animate straight to Hopf.
  Note the trap: sequencing `setDropAxis('None')` then `handleViewType(Hopf)` in
  one handler still reads the **stale** `dropAxis` closure, so the clear-and-switch
  must happen in the controls layer (e.g. a `controls.enterHopfStudy()` that calls
  `setDropAxis('None')` + `animateTo(Hopf)` directly). A prototype of exactly this
  was written and then backed out to batch it with other study-mode polish.
- **While here, consider:** should picking Hopf/Torus from the projection Pills
  *also* clear an active drop axis? Today a drop silently overrides those views, so
  the Pills have the same "nothing happens" surprise. Decide whether drop-axis and
  the nonlinear projections should be mutually exclusive in the UI.
- **Other study-mode polish:** an auto-hint when Hopf is selected with a non-identity
  orientation; optionally disabling the spinners while in study mode.
