---
kind: three-hats
session: 2026-07-06-S01
date: 2026-07-06
title: "Division Bells — Architecture & Quality review"
branch: claude/modest-cannon-umd49e
slug: modest-cannon-umd49e
status: complete
build: n/a
app: general
---

# Division Bells — Architecture & Quality review

*Hat: external Architecture & Quality Consultant — front-end system design,
maintainable React/TS, quality engineering. No attachment to the existing code;
the proposal is judged on its merits and against what the repo already proves it
can do.*

## Plan under review

<details>
<summary>Original request</summary>

> Design review for a new animath app "Division Bells" that teaches Mahalanobis
> separation and Kullback–Leibler divergence as two lenses on the same pair of
> 2-D Gaussians. See the design summary in
> docs/sessions/progress/modest-cannon-umd49e/2026-07-06-S01-mahalanobis-kl-divergence-app.md.

</details>

<details>
<summary>Full design brief (the thing reviewed)</summary>

One scene, two lenses. Two 2-D Gaussians `P=N(μ₁,Σ₁)` / `Q=N(μ₂,Σ₂)`, rendered in
**SVG + Canvas 2-D (not WebGL)**. The teaching identity:

```
KL(P‖Q) = ½[ (μ₂−μ₁)ᵀ Σ₂⁻¹ (μ₂−μ₁)   ← squared Mahalanobis of the means, in Q's metric
           + tr(Σ₂⁻¹Σ₁) − k − ln(detΣ₁/detΣ₂) ]   ← covariance-mismatch term, k=2
```

When `Σ₁=Σ₂` the mismatch term vanishes and `KL = ½·d_M²` exactly; when the
ellipses differ, KL gains the covariance term and becomes **asymmetric** while
pooled-Σ Mahalanobis stays symmetric. Scene: draggable mean markers + rotatable /
scalable 1σ·2σ ellipses (Σ set by angle+σ₁,σ₂, no matrix typing) + faint canvas
density heat; overlays for the mean-difference vector, a **whitening** toggle
(warp by `Σ^(−1/2)` so the reference Gaussian becomes a unit circle and
Mahalanobis = Euclidean), and a signed `p·log(p/q)` **KL-integrand** heat layer.
Optional 1-D slice along μ₁→μ₂. Pure engine `gaussian2d.ts` (matrix↔angle/σ,
inverse/det/trace/quadratic form, pdf, Mahalanobis, whitening, KL closed form +
decomposition, optional Bhattacharyya/Hellinger), unit-tested same commit.
Analyze-tier readouts via shared `readouts.tsx`. `<Workspace appId="division-bells">`,
theme-token driven, append-only shared edits.

</details>

## Executive summary

This is a **well-shaped proposal that fits the repo's grain almost exactly.** The
three-layer split it names — pure `gaussian2d.ts` engine · React view · shared
`<Workspace>` chrome — is the same split `skellam.ts` / `CountingTheWays.tsx` /
`Workspace` already runs, so there is no new architecture to invent; there is a
template to copy. The one genuinely novel piece of *interaction* (an ellipse with
rotate+scale handles) has no drop-in precedent, but its scaffolding — draggable
SVG glyphs with pointer capture and handle hit-testing — is fully worked out in
`Argand/ArgandPlane.tsx`.

The strongest structural decision is one the brief makes almost in passing:
**parametrizing Σ by (angle, σ₁, σ₂) rather than by matrix entries.** That choice
means Σ is *born diagonalized* — every operation the engine needs (inverse, det,
trace, `Σ^(−1/2)`, the quadratic form) is a two-line closed form with no
eigensolver, no Cholesky, and exactly one failure mode (σ→0) that a single clamp
closes. It converts the scariest-sounding numerics ("whitening blowups",
"near-singular Σ") into a solved problem. Endorse it prominently.

My three material concerns are (1) the **live-drag canvas redraw path** needs to
be deliberate but is *cheaper than the repo's existing field precedent*, so the
risk is over-engineering as much as under; (2) the shared **`Breakdown` readout
cannot render the KL decomposition as authored** because its parts are signed;
(3) the app risks **layer overload** (density + integrand + ellipses + handles +
whitening + vector + slice) and needs default-off toggles and a verification
story for the one thing `tsc` can't catch — a sign error in the integrand or a
transpose in the whitening.

Verdict up front: **Endorse, with concerns** — build it, on the CountingTheWays
skeleton, engine-first with the unit tests that are the only real correctness
guard here.

## 1 · Pattern recognition — what this resembles

The proposal is a composite of four patterns the codebase already runs. Naming
them is the fastest way to de-risk: none is novel, each has an in-repo reference.

| Pattern | Canonical name | In-repo reference | Fit |
|---|---|---|---|
| Pure math module ↔ dumb view ↔ shared chrome | "headless engine + view" / hexagonal core | `skellam.ts` → `CountingTheWays.tsx` → `Workspace` | Exact — copy it |
| Raster field under crisp vector overlay | canvas + SVG hybrid overlay | `BasinMap` (canvas map + overlay canvas); Argand (SVG vector plane) | Exact — density on canvas, contours/handles on SVG |
| Recompute picture on every interaction | immediate-mode redraw | Argand redraws the whole SVG per pointer-move | Applies; canvas variant needs rAF coalescing (below) |
| Drag objects *inside* a plane (not pan it) | draggable handles + hit-test | `ArgandPlane` (`dragRef`, `onHandleDown`, `stopPropagation`) | Direct template for mean markers; ellipse handles are new UI on the same scaffold |

> [!IMPORTANT]
> **Decision — do not reach for `useViewportGestures` as the primary interaction.**
> That helper (`src/lib/useViewportGestures.ts`) is a *viewport* gesture model:
> one-finger drag **pans the whole plane**, tap fires `onTap`, pinch/wheel zoom.
> Division Bells' primary verb is **dragging a specific object** (a mean, a σ
> handle) *within* a fixed plane — which is the opposite contract. `ArgandPlane`
> is the right model: pointer-down on a handle `stopPropagation()`s and sets a
> `dragRef`; pointer-down on empty plane starts a pan/pinch. If Division Bells
> wants pan/zoom *as well*, layer it Argand-style (handles win the pointer;
> bare-plane drags pan), not by wrapping the stage in `useViewportGestures`, which
> would steal every drag from the handles.

The KL-integrand layer is worth naming precisely: a **signed scalar field on a
2-D domain**, which is exactly the same object as BasinMap's *fate* map (a signed
"goodness" quantity rendered through a **divergent** colormap). The brief's
instinct to use `--data-*` for identity and the registry colormaps for the fields
is correct and already has a reference implementation in `BasinMap.buildRamps`:
sequential map for the (non-negative) density, **divergent** map for the (signed)
integrand, discrete `--data` tokens for the P/Q identity. That is textbook
dataviz-role assignment and it matches the locked color roles in CLAUDE.md.

## 2 · Structural soundness — boundaries and composition

### The engine boundary is in the right place

`gaussian2d.ts` as a pure, dependency-free module is the correct seam. It should
own **only** value-level math (types + functions, no React, no DOM, no theme),
mirroring `skellam.ts`. Everything the four readouts and three canvas layers need
is a pure function of `(μ₁,Σ₁,μ₂,Σ₂)`. Keeping it pure is what makes the unit
tests — the *only* real correctness guard in this repo (§5) — possible.

### The Σ parametrization is the load-bearing good idea

Because the user sets Σ through **(θ, σ₁, σ₂)**, the engine never sees an
arbitrary matrix it has to decompose. With `Σ = R(θ) diag(σ₁², σ₂²) R(θ)ᵀ`:

| Operation | Closed form | Blows up when |
|---|---|---|
| `det Σ` | `σ₁²·σ₂²` | never (≥0) |
| `Σ⁻¹` | `R diag(1/σ₁², 1/σ₂²) Rᵀ` | σ→0 |
| `Σ^(−1/2)` (whitening) | `R diag(1/σ₁, 1/σ₂) Rᵀ` | σ→0 |
| quadratic form `xᵀΣ⁻¹x` | rotate x into eigenbasis, scale, sum | σ→0 |
| `tr(Σ₂⁻¹Σ₁)` | closed 2×2 | σ₂→0 |

Every "numerical blowup" the brief worries about collapses to **one** guard:
clamp σ to a small floor (`σ ≥ σ_min`, e.g. 0.02 in plane units) at the *input*
(the ellipse handle can't be dragged smaller). Do that and the engine has no
interior singularities at all. This is a materially better position than a
general 2-D-Gaussian library would put you in, and it is the reason I'd resist
any temptation to pull in a matrix/linear-algebra dependency (§3).

### Catalog composition is conflict-free by construction

The shared-file edits (`index.tsx`, `apps.ts`, `chrome/catalog.ts`, `README.md`,
`CLAUDE.md`) are all append-only, so the app is drop-in against the parallel-branch
rule. One nit that will bite if missed:

> [!CAUTION]
> **Gotcha — `apps.ts` is *not* purely append-at-the-very-end.** Its header
> documents a deliberate exception: the trailing **plane-arithmetic pair** (Plane
> Transform · Argand) is pinned last on purpose, and new apps must be inserted
> **above** that pair, not after it. Appending literally to the end drops Division
> Bells into a slot reserved for an unresolved grouping. Same care for the
> `catalog.ts` `META` map.

### The mode/layer decomposition inside the view

The brief lists a lot of simultaneous visual layers. The healthy structure — again
already demonstrated by both precedents — is:

- **Canvas layer (raster):** density heat and/or the signed integrand. One
  `<canvas>`, `imageRendering` up-scaled from a modest backing store.
- **SVG layer (vector, interactive):** the 1σ/2σ contour ellipses, the mean
  markers, the σ rotate/scale handles, the mean-difference vector. Crisp at any
  zoom; handles are hit-testable.
- **Whitening** is a *linear* change of frame, so it is `transform="matrix(...)"`
  on the SVG `<g>` plus a re-derived raster (inverse-map each output pixel through
  `Σ^(1/2)`), not a separate rendering mode. Keep it a toggle, not a fork.

The 1-D slice is a genuinely separate `ViewDef` (its own window) — that is the
right home for it, and makes "build the plane first, add the slice if room" a
clean staged deliverable, not a refactor.

## 3 · Not-invented-here check

| Candidate for reuse | Verdict |
|---|---|
| A matrix / linear-algebra lib for Σ ops | **Reject.** 2×2 SPD in eigenform is 5 two-line functions; a dependency is pure overhead and enlarges the bundle a code-split app is trying to keep small. |
| `readouts.tsx` primitives (`StatGrid`, `Kicker`, `Breakdown`) | **Reuse** — but see the `Breakdown` caveat in §5. `StatGrid` is the right home for the signed KL sub-terms and the nats/bits pair. |
| `colormapRegistry` (`sampleContinuous`, `hexToRgb`, `themeMapsFor`) | **Reuse verbatim.** `BasinMap.buildRamps` is a copy-paste starting point for turning theme tokens into `[r,g,b]` ramps for `ImageData`. |
| `usePersistentState` | **Reuse** for μ/Σ/toggles (they are *settings*). Do **not** persist camera pan or the transient drag state. |
| `useThemeTokens` | **Reuse** — the canvas must read resolved tokens (var() doesn't resolve in `fillStyle`/`ImageData`), and depend on **both** `themeId` and mode. |
| `useCanvas2D` (AgenticSorting) | **Reuse** for DPR-aware sizing + zero-size guard; it is exactly the resize wrapper this app wants. |
| `ArgandPlane` handle-drag scaffolding | **Copy the pattern** (not the file): `dragRef`, pointer capture on the SVG root, `toMath`, per-handle `onPointerDown` with `stopPropagation`. |

Net: the app is ~90% assembly of existing, proven pieces. The genuinely new code
is `gaussian2d.ts` (small, pure, testable) and the ellipse rotate/scale handle
interaction (new UI, old scaffolding).

## 4 · Performance & footprint — a realistic budget

This is where the brief's open question ("canvas density/integrand cost + smoothness
on drag/mobile without WebGL") deserves a concrete answer, because the intuition
from the repo's existing field (BasinMap's 48–256² maps that take a visible
progress bar) is **misleading here.**

> [!NOTE]
> BasinMap is slow because each pixel is an **n-body integration**. Division
> Bells' field is a **couple of `exp()` and one quadratic form per pixel** — 3–4
> orders of magnitude cheaper. The bottleneck is not the math; it is `putImageData`
> and per-frame allocation.

Concrete budget:

| Item | Cost | Recommendation |
|---|---|---|
| Density at 200×200 = 40k px | ~10–20 flops/px ≈ <1 ms in JS | Fine to recompute per frame |
| Signed integrand at 200² | similar (needs `logP`, `logQ`) | Fine; compute in **log space** (see §5) |
| `ctx.createImageData` each frame | 200²·4 B = 160 KB alloc → GC churn on mobile | **Allocate the `ImageData` once; mutate `.data` in place.** BasinMap allocates per stage because it's staged; a per-drag path must not. |
| `putImageData` per frame | the real cost; one blit | Cap backing store at ~160–220 px on the short side; CSS-scale up (`imageRendering`). At 160² the mobile 390-px path is ~25k px — trivial. |
| React re-render per pointer-move | React 18 auto-batches pointer-move `setState` to ~1 commit/frame | Likely a non-issue; **measure before adding machinery** |

The decisive recommendation:

> [!IMPORTANT]
> **Decision — coalesce the canvas redraw to `requestAnimationFrame`, but do not
> prematurely decouple μ/Σ from React state.** Keep μ/Σ in state (the readouts and
> persistence need them; the scalar readouts are cheap and *should* re-render
> live). Put the raster redraw in an effect keyed on `[μ₁,Σ₁,μ₂,Σ₂,whitening,
> themeId,mode]` that schedules a single rAF draw and cancels a pending one — so
> multiple state commits in a frame collapse to one blit. Only if profiling on a
> real 390×844 device shows jank should you escalate to the "write params to a ref,
> draw off rAF, commit to state on pointer-up" pattern. The naive state-driven
> redraw at ≤200² will very probably be smooth; the ref machinery is a known
> fallback, not a starting requirement.

Footprint: pure TS + React + canvas/SVG, no Three.js, no new deps, code-split via
`React.lazy` like every other route. Negligible bundle impact. No concern.

## 5 · Verification & contracts — the part that actually needs discipline

With CI running **only `npm run build`** (`tsc` + `vite build`), and `npm test`
green-by-convention, the type checker will catch essentially none of the ways this
app can be *wrong*: a transposed matrix in the whitening, a sign flip in the
integrand, `Σ₂⁻¹` where `Σ₁⁻¹` was meant, radians-vs-degrees on the ellipse angle.
**The unit tests on `gaussian2d.ts` are the only real correctness guard**, so they
are not optional polish — they are the contract. The design already commits to
"unit-tested same commit (R4)"; the review's job is to say *which* tests earn
their keep by testing a **user-visible claim**, not a proxy.

| Contract | Test | Guards which visible claim |
|---|---|---|
| `Σ ↔ (θ,σ₁,σ₂)` round-trips | build Σ, recover eigenpairs, compare | ellipse handles set the matrix the readouts use |
| `Σ⁻¹·Σ = I`, `det`, `trace` identities | random SPD, assert to tol | every downstream number |
| `KL(P,P) = 0` | identical params | "no divergence when identical" |
| **`KL = ½·d_M²` when `Σ₁=Σ₂`** | equal-Σ, compare to the pooled Mahalanobis term | **the headline unification** — must be a test |
| `KL(P‖Q) ≠ KL(Q‖P)` when Σ differ; equal when Σ equal | asymmetry assertion | the "KL is asymmetric, Mahalanobis isn't" payload |
| Whitening: `Σ_ref^(−1/2) Σ_ref Σ_ref^(−1/2) = I` | assert to tol | "the reference Gaussian becomes a unit circle" |
| **Numeric integral of `p·log(p/q)` over a grid ≈ closed-form `KL(P‖Q)`** | Riemann sum on a fine grid, compare to tol | **ties the integrand picture to the number** |
| Bhattacharyya/Hellinger ≥ 0 and symmetric | assert | optional readouts |

The last row is the same trick `skellam.ts` uses (computing the pmf *both ways* —
diagonal sum and Bessel form — to prove they agree). Here it does double duty: it
verifies the closed-form KL **and** the integrand-field code against each other,
and it is exactly the numeric relationship the app is *showing* on screen. Ship it
as a test; consider surfacing the residual as a tiny readout ("∫ p·log(p/q) ≈ KL")
so the picture visibly closes on the number.

### Failure modes / seams to close explicitly

> [!CAUTION]
> **Gotcha — `log(p/q)` underflows to `NaN` if computed naively.** In the tails
> `p` and `q` are both `exp(large negative)` → `0`, and `0/0` = `NaN` poisons the
> whole integrand tile. Compute the integrand as `p·(logP − logQ)` from
> **log-pdf** (`logP`, `logQ` as the quadratic-form expressions), never as
> `p·Math.log(p/q)`. `skellam.ts` already establishes "do everything in log space"
> as the house style — follow it. Expose `logPdf` from the engine.

Other seams:

- **Near-singular Σ:** closed by the σ floor at input (§2). Also guard the
  *readout* side: if a user could still reach a degenerate Σ (e.g. via persisted
  state from an older version), `KL → ∞` should render as `∞`, not `NaN`, and the
  whitening transform should no-op rather than throw.
- **The `--accent` trap:** CLAUDE.md locks `--accent`/`--accent-2` as UI-voice,
  *never data*. CountingTheWays quietly bends this (it tints the lattice with
  `--accent`/`--accent-2`). Division Bells should *not* inherit that: P/Q are data
  identity → `--data-*`; the fields → registry colormaps. Getting this right from
  the start avoids a theming-review finding later.
- **Visual truth is unverifiable by `tsc` or vitest.** Whether the signed
  integrand actually reads as +/− lobes, whether whitening actually rounds the
  reference ellipse, whether the colormap runs the intuitive direction — these need
  a headless screenshot (`scripts/shoot.mjs`) or a real look. Plan for it and set
  `signals: visual-unverified` until shot.

### The `Breakdown` readout does not fit the KL decomposition as authored

This is a concrete, catchable-now defect in the plan:

> [!WARNING]
> **`readouts.tsx#Breakdown` takes `{ label, pct }` with `pct ∈ [0,100]` and draws
> a bar of that width — it assumes non-negative parts of a positive whole.** The
> brief's "Breakdown of KL = ½[Mahalanobis² + trace + log-det − k]" has **signed**
> parts: `−k` is negative, and `−½ln(detΣ₁/detΣ₂)` is signed. A four-row
> percentage breakdown of those terms is meaningless.
>
> **What *is* valid:** the two **top-level** pieces — `½·d_M²` (mean-shift) and
> `½·[tr(Σ₂⁻¹Σ₁) − k − ln(det ratio)]` (covariance-mismatch) — are each **≥ 0** and
> sum to `KL(P‖Q)`. So render a **two-row `Breakdown`** of *those* (mean vs
> covariance), which is exactly the payload ("matching the ellipses collapses the
> covariance bar to zero, leaving KL = ½·d_M²"). Put the **signed sub-terms**
> (trace, log-det, −k) in a `StatGrid`, not a bar chart. And note the breakdown is
> **per-direction** (KL(P‖Q) and KL(Q‖P) have different mean terms), so it's two
> two-row breakdowns, one per direction.

## 6 · Maintainability — the six-month test

A newcomer who has read *either* `CountingTheWays.tsx` (for the Workspace/mode/
action/layout assembly) *or* `ArgandPlane.tsx` (for draggable SVG handles) will
recognize this app immediately; someone who has read both will find nothing
surprising. That is the bar, and the proposal clears it because it deliberately
reuses both templates rather than inventing a third idiom.

The one place where six-month-clarity is at risk is the **whitening frame math**.
"Warp the plane by `Σ^(−1/2)`" touches three things at once (the raster's
inverse-pixel-map, the SVG group transform, and which distribution is the
reference) and is the single spot a future reader will most need a comment and a
test. Keep the frame transform *in the engine* (`whitenTransform(ref) → 2×2`) with
its own test, and let both the canvas and the SVG consume it, so there is one
source of truth for "the whitening matrix" rather than two hand-derived copies.

Complexity that **is** justified: the pure engine, the log-space pdf, the
two-layer canvas+SVG stack. Complexity to **resist**: a bespoke pan/zoom on top of
handle-drag before anyone asks for it; a general matrix type; a third rendering
"mode" for whitening instead of a transform+toggle; the integrand field defaulting
*on* (it's the most likely layer to confuse a first-time viewer).

## 7 · Answers to the brief's open questions

| Open question | Recommendation |
|---|---|
| Which Mahalanobis-between-distributions convention? | Show **two, labeled distinctly.** (a) **Directed** `d_M²` of the means in Q's metric = the exact first KL term (this is what makes the identity visible); (b) **symmetric** separation via pooled `Σ = ½(Σ₁+Σ₂)` as the "distance" number. Don't overload one symbol; the contrast (directed asymmetric vs pooled symmetric) *is* pedagogy. |
| Canvas density/integrand cost & smoothness on drag/mobile? | Affordable at ≤200² (§4). Allocate `ImageData` once, mutate in place, coalesce to rAF. Cap backing store ~160–220 px; CSS-scale. Measure on device before adding ref/rAF decoupling. |
| Intuitive Σ via ellipse handles + degenerate handling? | The (θ,σ₁,σ₂) parametrization is the right call; it makes handles natural (drag a rim node = scale that axis; drag a rotate node = θ) and reduces all degeneracy to one input-side σ floor. New UI, but on Argand's proven drag scaffold. |
| Whitening: separate view or toggle? | **Toggle**, not a view — it's a linear frame change (SVG `<g>` transform + re-derived raster), and pairing "un-whitened ellipse ↔ whitened unit circle" in the *same* window is the whole point. A separate view breaks the A/B. |
| Two concepts in one app — too much, or the earned unification? | **The earned unification.** KL and Mahalanobis are not two topics stapled together; `KL = ½ d_M²` (equal Σ) is one decomposition. This is the single best reason to build the app. The *risk* is not conceptual overload but **visual** overload — mitigate with default-off layer toggles (BasinMap-style "Show" pills), not by dropping a concept. |

## 8 · Risks & would-change

| # | Item | Severity | Recommendation |
|---|---|---|---|
| 1 | `Breakdown` can't render signed KL parts | Medium | Two-row Breakdown of the two non-negative pieces; StatGrid for signed sub-terms (§5) |
| 2 | Naive `log(p/q)` → NaN in tails | Medium | Log-space integrand `p·(logP−logQ)`; expose `logPdf` (§5) |
| 3 | Live-drag redraw path under-/over-engineered | Medium | rAF-coalesced redraw, reused `ImageData`; measure before decoupling from state (§4) |
| 4 | Visual claims unverifiable by build/tests | Medium | Headless shot; `signals: visual-unverified` until checked |
| 5 | Layer overload confuses first view | Low–Med | Default most layers off; integrand off by default; layer toggles |
| 6 | `apps.ts` trailing-pair insertion slot | Low | Insert **above** the plane-arithmetic pair, not at EOF |
| 7 | `--accent`-as-data drift | Low | P/Q → `--data-*`; fields → registry maps from the start |
| 8 | Whitening matrix hand-derived in two places | Low | Single `whitenTransform` in engine, consumed by canvas + SVG |

Would-**change** (not blockers, but I'd bake these into the plan before code):
engine-first with the §5 test matrix as the definition of done for `gaussian2d.ts`;
integrand-field default off; the two-piece (not four-part) Breakdown; the single
whitening-transform source of truth.

## Verdict

**Endorse, with concerns.** This is a proposal that respects the codebase's grain:
its architecture is the repo's existing three-layer template, its hard interaction
has a working in-repo reference, and its scariest-sounding numerics are defused by
one good parametrization choice. It composes cleanly with the catalog and adds no
bundle weight. The unification it teaches is real and exact — that is the reason to
build it, not a nice-to-have.

The concerns are all **addressable in the plan, not fatal to it:** the shared
`Breakdown` primitive doesn't fit the signed decomposition (use a two-row split +
StatGrid); the integrand must be computed in log space; the live-drag redraw wants
rAF coalescing and a reused buffer (but is *cheaper* than the repo's existing field,
so resist over-engineering); and the one class of error the build can't catch —
sign/transpose/units in the engine — must be pinned by the §5 unit tests, which are
the genuine contract here, plus one headless visual pass. Build it engine-first, on
the CountingTheWays skeleton, with those tests as the definition of done.

## Self-reflection

1. **What would you do with another session?** Prototype `gaussian2d.ts` against
   the §5 test matrix to confirm the closed forms and the integral-vs-closed-form
   agreement actually hold to tolerance, and spike the ellipse rotate/scale handle
   interaction to check it feels natural on the Argand scaffold — the two pieces I
   asserted are easy without writing them.
2. **What would you change about what you produced?** I leaned on inference for the
   performance numbers (flops/px, putImageData cost) rather than a measured
   micro-benchmark; the conclusion (≤200² is fine) is robust but the exact backing-
   store ceiling is a reasoned estimate, not a profiled one.
3. **What were you not asked that you think is important?** Accessibility/keyboard
   drive for the handles (every interaction here is pointer-drag; a keyboard user
   can't set μ or Σ), and reduced-motion/colorblindness for the signed divergent
   field. Neither is in the brief and both matter for a teaching tool.
4. **What did we both overlook?** The design summary treats "Breakdown of KL"
   as a given; nobody checked that the shared `Breakdown` primitive's contract
   (non-negative pct) actually admits a signed decomposition. That's the most
   concrete catch and it was latent in the brief.
5. **What did you find difficult?** Calibrating the performance verdict against
   BasinMap without misleading by analogy — the existing per-pixel field is slow
   for a reason (n-body integration) that does not transfer, and it would be easy
   to wrongly inherit its "render on a button, not on drag" posture.
6. **What would have made this task easier?** A one-line note in the brief on the
   target device / expected field resolution, and whether pan/zoom is in scope for
   v1 (it changes the interaction model materially, §1).
7. **How did you verify this, and does each passing check test the user-visible
   claim?** Reasoning only, grounded in reading the actual precedent files
   (`CountingTheWays.tsx`, `skellam.ts`, `BasinMap.tsx`, `ArgandPlane.tsx`,
   `useViewportGestures.ts`, `readouts.tsx`, `colormapRegistry.ts`,
   `useThemeTokens.ts`, `usePersistentState.ts`, `chrome/workspace/types.ts`). No
   code was written or run, so every claim about feasibility, the `Breakdown`
   mismatch, and canvas cost is analysis, not measurement — the `Breakdown`
   contract mismatch and the log-space NaN seam are the highest-confidence findings
   (read directly off the source); the exact performance ceiling is the least
   verified. This is a design review, so "not executed" is expected, but the
   performance and interaction assertions warrant a spike before they're trusted as
   build guidance.
8. **Follow-up value:** LOW — the review is complete and self-contained as a
   design critique; follow-up (a `gaussian2d.ts` spike + a handle-interaction
   prototype) would confirm two reasoned assertions but is unlikely to change the
   verdict or the top concerns.
