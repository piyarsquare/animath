---
kind: three-hats
session: 2026-06-10-S01
date: 2026-06-10
title: Three hats · Complex Particles · Math-visualization & pedagogy review
branch: claude/three-hats-particle-app-rill2c
slug: three-hats-particle-app-rill2c
status: completed
build: unknown
app: complex-particles
---

# Three hats · Complex Particles · Math-visualization & pedagogy review

## Plan under review

<details><summary>Original request</summary>

"I want you to start a session. focus is on the complex particle app. I want you to run the three hats skill on the complex particle app and report the results."

</details>

This leg reviews the **current state** of the Complex Particles app
(`src/animations/ComplexParticles/`, route `#/complex-particles`, engine in
`src/lib/particles/` + `src/components/ParticleViewerShell.tsx`) from the
standpoint of mathematical truth and teaching value. Every claim below was
checked against the actual TypeScript and GLSL.

## Executive summary

The core mathematics of this app is **remarkably sound** — I verified the Hopf
map, the Clifford-torus scaffold radii, the two-quaternion 4D rotation, and the
branch arithmetic for sqrt/ln/z^(p/q)/arctan against the code, and they are all
correct, in places impressively so (the scaffold's `R = 1/cos η, r = tan η`
donuts are the exact stereographic images of the Clifford tori, so particles
land *on* the reference geometry). The Stereo→Torus deduplication (PR #200) is
mathematically justified: the two maps are identical up to the soft pole floor.

The headline problems are not in the math but in the **honesty layer around
it**: `EXPLAINER.md` documents three controls that were *removed* in the same
PR that last touched this app (the "Hopf study view" button, the "Hopf fibers"
overlay, the "Collapse → Hopf" slider) and a projection mode ("Stereographic")
that no longer exists in the UI, while saying nothing about the two render
modes (Tiles, Net) that *do* exist. Several quiet numerical conveniences —
pole clamps, the `|f| ≤ 10³` output clamp, the Stirling-only Γ(z), the
ln-only "Riemann sheets" of the inverse trig family — are disclosed in code
comments but nowhere a learner will see. And one genuine defect: sheet-family
geometries carry `seed = 0`, so the default `jitter = 0.1` **translates the
whole sheet by (−0.1, −0.1)** in the domain instead of doing nothing.

## 1 · What is mathematically right (verified, endorse)

| Claim in code/docs | Verification | Verdict |
|---|---|---|
| Hopf map `(2(xu+yv), 2(yu−xv), x²+y²−u²−v²)/‖p‖²` | equals `(2Re(z₁z̄₂), 2Im(z₁z̄₂), |z₁|²−|z₂|²)/‖p‖²` — the standard Hopf S³→S² | ✅ correct (`src/lib/viewpoint.ts:73-81`, shader mode 2 `shaders/index.ts:273`) |
| Sphere reading: equator at `|z|=|f|`, poles at `f→0` / `z→0`, longitude `arg z − arg f` | follows from the formula above; scaffold pole labels at ±Z match the sign of `|z|²−|f|²` | ✅ (`createHopfScaffold.ts:99-109`, `EXPLAINER.md:31-41`) |
| `f = c·z` → one point; `f = z + c` → covers once; `e^z` → wraps infinitely | `z₁z̄₂ = c̄|z|²` has constant argument; `z↦[z:z+c]` is Möbius on CP¹ | ✅ (`EXPLAINER.md:36-38`) |
| Torus scaffold donuts: major `1/cos η`, minor `tan η` | computed the stereographic image of `(cos η e^{iα}, sin η e^{iβ})` from the `(0,0,0,1)` pole by hand — center `1/cos η`, radius `tan η` exactly | ✅ exact registration with particles (`createHopfScaffold.ts:111-122`) |
| Torus = retired Stereo | mode 7 is `p.xyz/(d−p.w) = n.xyz/(1−n.w)` after dividing by `d = ‖p‖` — identical to mode 1 up to the `POLE_EPS` floor | ✅ the PR #200 unification was mathematically correct |
| 4D rotation `p ↦ a·p·b̄` with independent unit quaternions | the standard SO(4) double cover; `makeUnitQuat` pairs (L=R for xy/xu/yu, conjugate pairs for xv/yv/uv) give clean single-plane rotations | ✅ (`viewpoint.ts:45-68`, `shaders/index.ts:18-22`) |
| sqrt/ln/z^(p/q) branch sheets | sqrt: `θ/2 + kπ`; ln: `+2πik`; powPQ: `(θ+2πk)·p/q` — these *are* the true sheets, and the stack glues correctly across the cut | ✅ (`shaders/index.ts:72-84,161-170`) |
| arctan/arccot/arctanh sheets | full multivaluedness is exactly `+kπ` (single ln, no sqrt ambiguity) — the drawn family is **complete** | ✅ (`shaders/index.ts:198-205,223-228`) |
| Adaptive density weight | Frobenius norm of the Jacobian = `√2·|f′|` for analytic f, so density ∝ `|f′|^α` as claimed; weight clamp at 50× median is a sane singularity guard | ✅ (`createParticleGeometry.ts:208-236`) |
| Drop-axis resets 4D orientation first | `handleDropAxis → snapToStandardView()` makes "Drop V" an honest axis-aligned orthographic slice | ✅ good pedagogy (`useViewControls.ts:150-166`) |
| Ambient Yaw/Pitch/Roll substitution in Hopf/Torus | correct insight: a 4D rotation before a *nonlinear* map deforms the image, so the controls switch to rigid camera orbits there | ✅ (`ParticleViewerShell.tsx:68-75`, `useViewControls.ts:223-235`) |

The interaction split — gestures *look*, buttons *navigate 4D* — and the
"eighth turn" discretization are pedagogically excellent: a 45° turn in a
named plane is repeatable, announceable, and reversible, which is exactly what
building 4D intuition needs.

## 2 · Mathematical fidelity — where the picture quietly diverges from the math

### 2.1 Undisclosed clamps and floors

The shader applies several numerical conveniences that change what the learner
sees near the most mathematically interesting places (poles, essential
singularities), and none is mentioned in `EXPLAINER.md` or `README.md`:

| Clamp | Location | Visible consequence |
|---|---|---|
| `complexInv`: denominator floored at `1e-4` | `shaders/index.ts:66`, `complexMath.ts:49-53` | near a pole of `1/z`, `tan`, `sec`, `csc`, values saturate instead of diverging — the pole has a finite "cap" |
| output clamp `if(length(f) > 1e3) f = normalize(f)*1e3` | every shader main + `surfacePos` (`shaders/index.ts:389,426,489`) | all overflow points are pinned to a radius-1000 sphere in (u,v) — a *fictitious surface* near poles and along `Re z → +∞` for `e^{1/z}`, Γ |
| Torus pole soft floor `POLE_EPS = 0.08` | `viewpoint.ts:19,85-95`, shader mode 7 | points near `z=0, f≈i|f|` bend to radius ≈ 12.5 instead of flying off; the donuts' far field is gently compressed (scaffold uses exact radii, so extreme-η particles sit slightly off the wireframe) |
| Perspective divide `xyz/(3+v)` has **no guard** at `v = −3` | shader mode 0 (`shaders/index.ts:271`) | particles cross the camera-divide and evert; with the default `exp` on ±4 (|f| up to e⁴ ≈ 55) a *large* fraction of the default view is past the divide |

> [!WARNING]
> The eversion is actually half-disclosed — `README.md:92-96` explains that the
> Perspective projection "can still evert the sheet where it stretches past the
> camera divide (3 + Im f crossing zero)". That's the right kind of honesty.
> The other three clamps deserve the same one-sentence treatment, because a
> learner studying `1/z` *will* ask why the pole appears to have a ceiling.

### 2.2 Γ(z) is not Γ(z)

`complexGamma` (GLSL `shaders/index.ts:137-143`, CPU `complexMath.ts:126-140`)
is the bare Stirling kernel `exp((z−½)ln z − z + ½ln 2π)` with a *principal*
log. The code comment honestly says "Same accuracy envelope as the GPU path,"
but the UI label (`functionFormulas.gamma = 'Γ(z)'`) claims the gamma function.
Consequences a mathematician will notice immediately:

- **No poles at 0, −1, −2, …** — the defining feature of Γ is absent; the
  left half-plane is simply wrong (no reflection formula).
- The branch cut of the principal log puts a spurious tear along the negative
  real axis instead of the pole string.

Either implement Lanczos + reflection (cheap in GLSL) or relabel as
"Γ(z) (Stirling approx., Re z ≳ 1)". Showing a student a poleless gamma is
worse than not showing gamma.

### 2.3 The "Riemann sheets" of the inverse trig family are half a surface

For `arcsin`/`arccos`/`arcsec`/`arccsc`/`arcsinh`/`arccosh`, only the outer ln
carries the branch; the inner sqrt stays principal (acknowledged in the code
comment at `shaders/index.ts:174-175`). The true multivaluedness of arcsin is
the *two* families `w + 2πk` **and** `π − w + 2πk`; the app draws only the
first. So:

- the drawn stack consists of parallel translates of one (torn) sheet;
- the sheets **cannot glue** into the true Riemann surface — the continuation
  partner across the cut at `|x| > 1` lives in the missing `π − w` family;
- each drawn sheet shows a real discontinuity along the principal sqrt's cut
  (which is at least honest — the tear is visible).

Contrast: sqrt/ln/powPQ/arctan sheets are complete and glue correctly. The
docs (`README.md:18-22`) lump all of these together as "branches (Riemann
sheets)" with no distinction. A one-line caveat — "for the inverse trig
functions only the 2πk family of sheets is drawn" — would make the claim true.

### 2.4 cbrt is advertised as multivalued but isn't

`README.md:18` lists `cbrt` among the multi-valued functions, but
`complexCbrt` (index 16) ignores `branchIndex` entirely (`shaders/index.ts:145-150,247`)
and 16 is *not* in `MULTIVALUED_INDICES` (`complexMath.ts:380-382`) — yet the
function picker files it under "Roots & log (**multivalued**)"
(`complexMath.ts:434-441`). Three sheets of ∛z are exactly the kind of picture
this app exists for. Either make it branch-aware (`(θ + 2πk)/3`) or fix the
README and category label. (Workaround today: powPQ with p=1, q=3 — worth a
pointer in the docs either way.)

### 2.5 Redundant sheets are silently double-drawn

`branchMin/branchMax` allows up to 12 sheets for every multivalued function,
but sqrt has only 2 distinct sheets (mod 2), ∛ via powPQ has q, etc. Setting
0…3 on sqrt draws sheets 2,3 *on top of* 0,1 (double additive brightness, no
warning). Clamping the range to the function's sheet period — or at least
saying "sqrt has period 2" in the Domain panel — would prevent a learner from
believing sqrt has four sheets.

### 2.6 What does a half-morphed projection mean? Nothing — and that's fine, but say so

`handleProjMix` (`useViewControls.ts:109-128`) drives
`mix(project(p, from), project(p, to), α)` in the shader
(`shaders/index.ts:394-396`). Mathematically:

- **Perspective→Torus (0→1)** blends a *scale-carrying* affine image with a
  *scale-free* image of the normalized point on S³. The intermediate states
  are linear chords in R³ between the two images — not a projection of
  anything. They preserve point identity (the pedagogical purpose: you can
  track which particle goes where), but intermediate shapes have no metric
  meaning.
- **Torus→Hopf (1→2)** is better than that: since the Hopf image is the point
  each fiber collapses to, the chord homotopy literally contracts each (1,1)
  fiber circle toward its base point — a legitimate geometric realization of
  "fiber collapse," even if not the geodesic one.

The slider labels ("→ Torus 45%", `ParticleViewerShell.tsx:258-263`) are
honest about being *between* stops. What's missing is one sentence in the
explainer: *fractional positions are animations connecting the views, not
projections themselves; only the three stops are faithful maps.* CLAUDE.md
explains this to developers; the learner-facing docs never do.

### 2.7 Concrete defect: sheet/tile/net geometries + default jitter = a shifted surface

Sheet-family geometries fill the `seed` attribute with **zeros**
(`createSheetGeometry.ts:166,184,208,224,249` — "zero → jitter is a uniform
shift"). In the vertex shaders, `jit = (seed*2 − 1) * jitterAmp = −jitterAmp`
on every component, and Scatter mode does `z += jit.xy`
(`shaders/index.ts:482-483,525-526`). The default is `jitter = 0.1`
(`config/defaults.ts:36`), Scatter (`useParticleState.ts:52`). Therefore:

> [!CAUTION]
> **Out of the box, every Sheet/Tile/Net render is the graph of f over the
> domain box translated by (−0.1, −0.1)** — not the stated box. In adaptive
> Sheet mode the point cloud (random seeds, symmetric scatter) and the sheet
> (uniform shift) are systematically misregistered by the same amount. The
> edge-fade is computed from the *unshifted* position (`vFade` uses `position`,
> `shaders/index.ts:477-481`), compounding the inconsistency at the boundary.

Fix is one line: fill sheet seeds with **0.5** (so `seed*2−1 = 0`), or gate the
jitter term out of the sheet shaders. As it stands the "uniform shift" comment
documents the bug rather than a feature.

### 2.8 Log-polar charts wrap — the "identity" claim is true only in a strip

`chartCoord` uses `atan` (`shaders/index.ts:363-368`), so the charted angle is
the principal value in (−π, π]. The explainer's lovely claim that "in
log-polar output, `e^z` becomes the identity … so its trumpet flattens to a
plane" (`EXPLAINER.md:62-67`) holds only for `|Im z| ≤ π`; with the default
extent ±4 the plane is visibly sliced and stacked at the wrap. Same for the
"linear shears" of zⁿ with both charts log-polar. The pictures are still
illuminating — the wrap seam is itself a teachable artifact — but the claim
needs an "up to the 2π wrap of arg" qualifier, or the chart should use the
branch-aware angle when the function is multivalued.

## 3 · Documentation honesty — the explainer describes an app that no longer exists

The same session that last touched this app (PR #200, see
`docs/sessions/handoff/new-chrome/2026-06-10-S01-branch-rename-and-continuation.md:69-70`:
"Hopf fiber overlay + 'Hopf study view' removed") left `EXPLAINER.md` — the
text behind the **?** button, the single most learner-facing artifact —
describing the *previous* UI:

| EXPLAINER claim | Reality |
|---|---|
| "**Stereographic**" listed as a projection mode (`EXPLAINER.md:27-30`) | retired; the slider stops are Perspective / Torus / **Sphere** (`ParticleViewerShell.tsx:271-282`); `ProjectionMode.Stereo` survives only as a persisted-value alias |
| "The **Hopf study view** button in the Camera panel does this in one tap" (`EXPLAINER.md:39-41`) | removed in PR #200; grep finds it nowhere but this file |
| "The **Collapse → Hopf** slider scrubs between the two" (`EXPLAINER.md:49-50`) | replaced by the second leg of the Projection slider; `handleFiberCollapse` exists but no UI calls it |
| "The **Hopf fibers** toggle overlays the iconic interlocking circles … **Fiber density** sets how many" (`EXPLAINER.md:52-55`) | removed in PR #200; only an orphaned comment remains (`useParticleState.ts:169`) |
| "The same 4-D graph can be drawn **two ways**" — Points and Sheet (`EXPLAINER.md:79-97`) | there are **four** render modes: Points, Sheet, **Tiles**, **Net** (`types.ts:105`); Tiles and Net are documented nowhere user-facing |
| Stereographic "is *conformal* — small shapes keep their form" (`EXPLAINER.md:30-31`) | stereographic S³→R³ is conformal, but the composite **R⁴ → (normalize) → S³ → R³** is not a conformal map of the graph; the normalization step destroys that property. Misleading even when the section existed |

`README.md` is also stale: it still says the **Camera** panel holds "drop axis
… and quarter-turn buttons" (`README.md:25-27` — both live in the 4D Rotation
panel), lists only "perspective, stereographic, or Hopf" projections
(`README.md:5-6`), and omits Tiles/Net from the Surface section.

> [!IMPORTANT]
> This is the highest-priority fix in the review. The explainer is the
> contract between the app and the learner; right now it teaches users to hunt
> for three controls that don't exist, under a projection name that isn't on
> the slider. Everything else in this report degrades gracefully — this
> actively wastes a motivated learner's trust.

It is worth saying explicitly: the *retained* explainer math (the Hopf sphere
reading, the torus hole/tube/donut reading, the warning that a 4D spin mixes
input and output before the Hopf map) is accurate and unusually well written.
The orientation-fixed caveat at `EXPLAINER.md:38-39` is exactly the kind of
disclosure this review wants more of — it just now points at a remedy (the
study-view button) that's gone. The Reset-orientation button in the 4D
Rotation panel is the surviving remedy; point there.

## 4 · Conceptual clarity & defaults

### 4.1 The default experience scrambles the lesson

Defaults: function `exp`, motion **Quaternion** (`useParticleState.ts:151`) —
a perpetual composite tumble in XY+YU+XV at three rates
(`createAnimationLoop.ts:108-114`). So the first thing a learner sees is a 4D
graph already rotating in three planes at once, with the domain/range axes
thoroughly mixed within seconds. It is gorgeous, and it is the *last* state in
which the explainer's careful axis table (x=Re z, y=Im z, u=Re f, v=Im f) can
be read off the screen. The eighth-turn pedagogy (one named plane at a time)
is undermined by a default that does all of them continuously.

Recommendation: default to **Fixed** motion (or a single slow xy spin, which
never mixes domain into range), and let the tumble be the thing you turn *on*.
At minimum, the explainer should say "press Motion: Fixed and Reset
orientation before trying to read the axes."

### 4.2 Multiple sheets are indistinguishable in the default coloring

Each Riemann sheet is a separate draw with the same `calcColor`
(`ComplexParticles.tsx:173-177,395-421`). With **Color by: Domain** (the
default), every sheet of ln gets *identical* colors — overlapping clouds you
cannot tell apart; with Range coloring the sheets differ only where the
quantity differs. There is no per-sheet visual channel (tint, brightness
offset, or a sheet-index option in the Quantity picker). For the app whose
signature trick is "draw several sheets at once," a `Color by: Sheet` option
(or a small per-sheet hue offset) is the single biggest pedagogical win
available. (The Domain panel's "Branch min/max (sheet)" numeric inputs are
also always visible, even for `exp` — `ComplexParticles.tsx:705-726` passes
them unconditionally, while the sibling PlaneTransform gates on
`MULTIVALUED_INDICES` (`PlaneTransform.tsx:270`). Inert controls teach false
affordances; gate them.)

### 4.3 What's sampled vs. interpolated is disclosed well

The README/EXPLAINER treatment of sampling is genuinely good: Sheet mode's
"always samples a Cartesian grid (ignores the Sampling pattern and particle
count)" (`EXPLAINER.md:88-90`), the Scatter-vs-Fuzz jitter distinction
("particles stay on the surface" vs "off the surface") (`README.md:39-42`),
and the adaptive-fade story (sheet dissolves where stretched, points show
through) all match the code. The sheet-fill's flat per-cell color is honestly
described as "the average of its four corners' domain colors" — though note
that averaging RGB across a branch cut or the phase wrap produces muddy
false colors exactly on the most important curve in the picture; a cheap
improvement is to detect large corner-hue spread and let the wireframe carry
those cells.

### 4.4 The Net mode is a hidden gem

Net mode draws the images of `|z| = const` circles and `arg z = const` rays —
the classical "polar net" of complex analysis textbooks (how conformal maps
carry orthogonal families). It is arguably the most *teachable* render mode in
the app, and it is mentioned in zero user-facing documents. Document it, and
consider making "Net + rays on" the suggested view for the Möbius and
Joukowski entries (where the circle-to-circle story is the entire point).

## 5 · Semantic hygiene

| Item | Observation | Suggestion |
|---|---|---|
| "Sphere" vs "Hopf" | The slider stop says **Sphere**; the explainer section says **Hopf**; CLAUDE.md says "Sphere (the Hopf view)". A learner cannot connect the two | Use one compound label: "Sphere (Hopf)" on the slider stop or retitle the explainer bullet to match the UI |
| Orientation matrix column order | Columns are x, y, **v, u** — both the data (`createAnimationLoop.ts:155-159`) and the header (`ParticleViewerShell.tsx:554`) agree, so it's not a bug, but every other surface in the app orders x, y, u, v | Reorder to x,y,u,v (data + header together) |
| "Branch min (sheet)" | Good — naming both "branch" and "sheet" bridges the two vocabularies | Keep; add the sheet period per function (§2.5) |
| Axis colors x=red, y=green-ish, u=cyan, v=purple (`types.ts:108-113`) | x/y is a red/green pair — the classic CVD confusion pair, used on the two axes most often compared | Consider hue choices that survive deuteranopia (e.g. x=orange, y=blue family), or label the axis tips like the scaffold labels |
| `functionFormulas.joukowski = '0.5*(z + 1/z)'` | programmer notation in a math caption | `½(z + 1/z)` |
| "Quaternion" as a *motion mode name* | the learner-facing pill says "Quaternion" — an implementation detail; the motion is an auto-tumble | "Tumble" / "Auto-rotate" |

## 6 · Accessibility of the idea (color & CVD)

- The **Dual-hue CVD** style (`shaders/index.ts:354-359`) maps the chosen
  quantity through a blue→yellow ramp — a good CVD-safe axis. But for
  **Phase** (a cyclic quantity) the ramp uses `fract(param)`, creating a
  **false discontinuity seam** at the wrap angle that is pure rendering
  artifact, not mathematics. Same for the sequential colormaps applied to
  Phase (`s = fract(angle/TAU + 0.5)`, `shaders/index.ts:328`): a hard seam at
  `arg = π`. A cyclic CVD-friendlier map (twilight-style, or the dual-hue ramp
  mirrored over the cycle) would remove the lie. Until then, one docs sentence:
  "non-wheel palettes show a seam at arg = ±π; it is an artifact of the
  palette, not the function."
- The default HSV phase wheel is the standard domain-coloring convention —
  keep it as the default (convention has pedagogical value) — but the README's
  color section should name the CVD option explicitly as the reason it exists.
- The brightness ripple `0.75 + 0.25·sin(2π·log r)` mixed into the HSV style
  (`shaders/index.ts:344`) silently adds modulus contour bands — nice, but
  undocumented; a learner may read the rings as structure of f. One sentence.

## 7 · Function catalog & learning progression

The grouped picker (`functionCategories`, `complexMath.ts:433-441`) is a real
improvement: Polynomial & rational → Roots & log → Trig → Inverse trig →
Hyperbolic → Exp & essential → Special is a sane progression, and the
parameterized `z^(p/q)` and `a·z²+b·z+c` entries (with live formula in the
title bar) are exactly right. Two notes:

- The default function is `exp` (`ComplexParticles.tsx:51`). For a first
  contact, `square` (z²) teaches more with less: one fold, double cover,
  argument doubling — every projection and the sheet mode read cleanly on it.
  `exp` is the better *show* piece; z² is the better *first lesson*. Worth a
  deliberate decision rather than an inherited default.
- `essentialExpInv` (`e^{1/z}`) is a wonderful inclusion (Casorati–Weierstrass
  in a can), but it is the function most damaged by the `1e3` output clamp
  (§2.1) — near z=0 the entire essential singularity becomes a solid clamp
  sphere. If any function earns a per-function docs note about the clamp, it
  is this one.

## Verdict

**Endorse.** This is one of the most mathematically trustworthy 4D
complex-function viewers I have reviewed: the projections are real projections
(verified formulas, not vibes), the reference scaffolding is *exact*, the
branch arithmetic is right where it claims to be complete, and the
interaction design (eighth-turns in named planes; gestures look, buttons
navigate; ambient-orbit substitution under nonlinear maps; drop-axis snapping
to identity) reflects genuine thought about how 4D intuition is built.

**Concerns**, in order of how much they damage a learner:

1. **The explainer documents a removed UI** (Hopf study view, Hopf fibers
   toggle, Collapse slider, "Stereographic" mode; only 2 of 4 render modes
   covered). It also retains a false conformality claim for the composite map.
2. **The sheet-seed jitter defect**: default settings render every
   Sheet/Tile/Net view translated by (−0.1, −0.1) in the domain and
   misregistered against the point cloud.
3. **Half-true sheet claims**: inverse-trig "Riemann sheets" are the ln-only
   family; cbrt is labeled multivalued but isn't branch-aware; redundant
   sheets double-draw.
4. **Γ(z) without poles** under an unqualified `Γ(z)` label.
5. **Undisclosed clamps** (pole floors, the 10³ output cap, POLE_EPS) at
   exactly the loci a complex-analysis learner studies.
6. Defaults that fight the pedagogy (auto-tumble on, sheets color-identical,
   inert branch controls on single-valued functions).

**What I would change, concretely and in priority order:**

| # | Change | Cost | Files |
|---|---|---|---|
| 1 | Rewrite `EXPLAINER.md` against the current UI: slider stops Perspective/Torus/Sphere (Hopf), morphs-are-animations sentence, Reset-orientation as the Hopf-reading remedy, document Tiles + Net, drop the conformality claim; sync `README.md` panel locations | text only | `ComplexParticles/EXPLAINER.md`, `README.md` |
| 2 | Fill sheet/tile/net `seed` buffers with 0.5 (or exclude jitter from sheet shaders) | 1-line ×4 | `lib/particles/createSheetGeometry.ts` |
| 3 | Gate branch controls on `MULTIVALUED_INDICES` (match PlaneTransform); clamp/mod the branch range by the function's sheet period | small | `ComplexParticles.tsx` |
| 4 | Add a per-sheet color channel (`Color by: Sheet`, or automatic per-sheet hue offset) | medium | shaders + `ComplexParticles.tsx` |
| 5 | Fix Γ: Lanczos + reflection, or relabel "Stirling approx." | small–medium | `shaders/index.ts`, `complexMath.ts` |
| 6 | Make cbrt branch-aware ((θ+2πk)/3) and add 16 to `MULTIVALUED_INDICES`, or fix the README/category claim | small | `shaders/index.ts`, `complexMath.ts` |
| 7 | One "numerical honesty" paragraph in the explainer: pole floors, the 10³ cap, the soft-floored torus pole, the arg-wrap in log-polar charts, the ln-only inverse-trig sheets | text only | `EXPLAINER.md` |
| 8 | Default Motion → Fixed (tumble opt-in); consider z² as the landing function | trivial | `useParticleState.ts`, `App.tsx` |
| 9 | Cyclic-safe CVD palette for Phase (or a seam disclosure); rethink red/green x/y axis hues | medium | `shaders/index.ts`, `types.ts` |

None of these threaten the architecture; items 1, 2, 3, 7, 8 are an
afternoon, and together they close the gap between what the app *is* (very
good) and what it *says it is*.

## Self-reflection

1. **What would you do with another session?** Run the app and verify the
   §2.7 sheet-shift defect visually (headless WebGL screenshot of Sheet mode at
   jitter 0 vs 0.1), and numerically spot-check the arcsin sheet-gluing claim
   by tracing a loop around z=1 across the drawn sheets. Both were derived
   from code reading, not observation.
2. **What would you change about what you produced?** The report leans long on
   inventory; with more time I would compress §5/§6 and expand the morph
   semantics (§2.6) with a worked example of a point whose two images are
   antipodal, where the chord blend passes through the origin.
3. **What were you not asked that you think is important?** The embed pilot
   (`public/embed-demo.html`) is the app's future as a teaching tool, and the
   explainer staleness problem will replicate into every embedded article
   unless docs are treated as part of the UI change checklist (a "docs touched?"
   line in BUILDING_AN_APP §8 would fix the process, not just the instance).
4. **What did we both overlook?** Performance-as-pedagogy: 12 sheets × 5
   materials × 80k points is a lot of additive blending, and on weak GPUs the
   frame drop will be misread as "the math is heavy here." No budget/warning
   exists. Also, nobody has checked `PlaneTransform`'s explainer for the same
   staleness pattern found here.
5. **What did you find difficult?** Establishing which claims were stale
   required cross-referencing the PR #200 handoff against grep results —
   the EXPLAINER reads confidently and nothing in-repo flags removed features.
6. **What would have made this task easier?** A single "control inventory"
   source (the PARAM-MAP doc mentioned in CLAUDE.md) kept in lockstep with the
   shipped panels, so doc-drift is a diffable artifact.
7. **Follow-up value:** **MEDIUM** — the analysis is grounded in code and I am
   confident in the findings, but two claims (§2.7 visual magnitude, §2.3
   gluing behavior on screen) deserve empirical confirmation before being
   acted on as written.
