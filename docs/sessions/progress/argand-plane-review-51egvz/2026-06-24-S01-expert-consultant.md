---
kind: three-hats
session: 2026-06-24-S01
date: 2026-06-24
title: "Argand — Architecture & Quality Consultant review (Hat 2 of 5)"
branch: claude/argand-plane-review-51egvz
slug: argand-plane-review-51egvz
status: completed
build: passed
---

# Argand — Architecture & Quality Consultant review (Hat 2 of 5)

## Plan under review

<details>
<summary>Original request</summary>

> Review the Argand app (#/argand, src/animations/Argand/) — its visual design and user experience. ADD TWO HATS beyond the usual three: (4) a graphic designer focused on whether the display is clean and the concepts are well-articulated visually, and (5) a video game designer focused on user experience and interaction feel.

</details>

I am **Hat 2: the Architecture & Quality Consultant**. My charter is front-end system design, maintainable React/TypeScript, and quality engineering — not aesthetics (Hat 4) or interaction feel (Hat 5), except where those leak into structure or performance. I judge on merits with no attachment to the existing code, and I am skeptical of complexity added without concrete need.

The codebase reviewed:

| File | Lines | Role |
|---|---|---|
| `complexOps.ts` | 388 | Pure math: arithmetic, generalized (p=j²) algebra, affine/poly paths, arc-length, formatting, snapping |
| `ArgandPlane.tsx` | 605 | The SVG render layer (one big component) |
| `Argand.tsx` | 522 | State, panels, the bottom HUD, Workspace wiring |
| `curves.ts` | 42 | Four preset shape polylines |
| `EXPLAINER.md` | 121 | The `?` text |

Overall this is **good, honest code** — the math is genuinely separated, well-commented, and the abstractions (generalized `mulG`/`powRealG`/`logG`, the arc-length reparameterization) are real and earned. My concerns are about (a) one untested-yet-eminently-testable module, (b) `ArgandPlane.tsx` having outgrown a single component, and (c) a per-segment SVG grid that will scale badly on a large screen while dragging. None are alarming; the app builds and the boundaries are mostly right.

---

## 1. Structural soundness — are the boundaries right?

The three-layer split is the correct instinct and is **mostly honored**:

```
complexOps.ts   pure math, no React/DOM   ── testable in isolation (the file says so)
ArgandPlane.tsx render: math → SVG         ── owns pan/zoom/drag transient state
Argand.tsx      state + panels + HUD       ── owns persisted settings + Play clock
```

> [!NOTE]
> The seam between `complexOps.ts` and the components is **clean and disciplined**. Every path function (`affineAt`, `affineLoopAt`, `polyTermLoopAt`, `polyRampAt`, `hornerAt`) is a pure `(args, s) => Cx`, which is exactly the right shape: the renderer samples it, the arc-length machinery samples it, and Play scrubs it — three consumers, one contract. This is the part I'd hold up as exemplary.

### Where the boundary leaks

There are two real boundary smells, both of the same kind: **logic that lives in the math file's consumers and is duplicated across them.**

1. **`coeffs` is rebuilt independently in both components.**
   - `Argand.tsx:95` — `const coeffs = useMemo(() => (quad ? [alpha0, alpha1, alpha2] : [alpha0, alpha1]), …)`
   - `ArgandPlane.tsx:90` — `const coeffs: Cx[] = quad ? [alpha0, alpha1, alpha2] : [alpha0, alpha1];`

   These must agree forever or the picture diverges from the readouts. The `degree → coeffs` packing is a domain rule and belongs in `complexOps.ts` (e.g. `export const coeffsOf = (degree, a0, a1, a2) => …`). Today it is copy-pasted.

2. **`powReliable` / `orbitSpiral` reachability logic lives in the renderer** (`ArgandPlane.tsx:339-341`). The condition "is the generalized log defined here?" is *exactly* what `logG` already answers (`complexOps.ts:71-84` returns `null` when it isn't). The renderer re-derives the same cone/Re>0 predicate by hand instead of asking the math module. That is the single most likely place for the picture to silently disagree with the math: `logG` could change its guard and `powReliable` would not follow.

```ts
// complexOps.ts — expose the predicate the renderer is re-deriving:
/** Is bᵗ (the smooth spiral) well-defined here? Mirrors logG's domain. */
export const powRealGDefined = (b: Cx, p: number): boolean => logG(b, p) !== null;
```

Then `ArgandPlane.tsx` becomes `const orbitSpiral = !quad && !!zStars[0] && powRealGDefined(alpha1, p);` and the two can never drift.

### The Play-clock / arc-length / lut machinery

This is sound and I endorse it. The design is:

- `lut: ArcLengthMap` is `useMemo`'d in `Argand.tsx` from whichever path applies (feed × degree × iterate) — a single `useMemo` that is the *one* place the combinatorics are resolved (`Argand.tsx:103-125`).
- A `lutRef` mirror + an `arcRef` accumulator drive the rAF loop, integrating distance at `speed` and wrapping (`Argand.tsx:134-151`).
- `MIN_SWEEP_SEC` floors short loops so they don't ping-pong.

> [!TIP]
> The `lutRef.current = lut` on every render (line 128) is the correct idiom for "let the rAF closure read fresh state without re-subscribing the effect." The effect deps are only `[playing, speed]`, so changing `z`/`α₁` mid-play doesn't tear down the loop — good. This is a known-good React pattern (the "latest ref"), used deliberately.

One subtlety worth a comment: when the path *shape* changes mid-play (drag α₁ while playing), `arcRef` is a raw distance against the *old* `length`, and `sAt` clamps it. The result is a small visual jump rather than a smooth catch-up. Acceptable, but undocumented; a one-line note would save a future reader a debugging session.

---

## 2. The `t` parameter means different things — is that safe?

This is the request's sharpest worry, and it is **justified**. `t ∈ [0,1]` is overloaded across the feed × degree × iterate matrix:

| feed | degree | iterate | what `t` parameterizes | path fn |
|---|---|---|---|---|
| point | 1 | no | the closed affine loop (×α₁, +α₀, back by diagonal) | `affineLoopAt` |
| point | 1 | yes | arc fraction of the orbit spiral, ×`iterN` | `orbitAt(t·iterN)` |
| point | 2 | no | the Horner/term-sum closed loop | `polyTermLoopAt` |
| shape | 1 | — | same affine loop, applied per vertex | `affineLoopAt` |
| shape | 2 | — | a degree-ramp **triangle** `triS = 0→1→0` | `polyRampAt(…, triS)` |
| grid | 1 | — | affine loop per grid point | `affineLoopAt` |
| grid | 2 | — | degree-ramp triangle | `polyRampAt(…, triS)` |

Note the genuinely different semantics: in some cells `t` is *time around a closed loop* (returns to start at t=1), in the quadratic shape/grid cells it is *folded through a triangle* (`triS`), and in iterate it is *scaled by iterN*. The mapping is **correct** but it is encoded as scattered ternaries in three places:

- the `lut` builder (`Argand.tsx:103-125`),
- the `stops`/`stopLabels` arrays (`Argand.tsx:160-170`),
- the render branches (`ArgandPlane.tsx:255`, 470-573).

> [!WARNING]
> Nothing documents the `t` semantics table above in the code. A newcomer in six months reading `triS = t < 0.5 ? t * 2 : 2 - 2 * t` at `ArgandPlane.tsx:255` has to reverse-engineer that this is "degree-ramp, only in quadratic shape/grid." The three sites that must agree on `t`'s meaning are not co-located and share no type. **This is the maintainability risk I'd flag as highest-leverage to fix**, even though there is no bug today.

### Proposed factoring: a "scene" descriptor (a small state machine, not a framework)

The combinatorics are a classic case for **derived configuration**: resolve `(feed, degree, iterate)` once into a small descriptor that names the path, its stops, and its semantics, then feed that one object to both the lut builder and the renderer. This is *not* a heavyweight state-machine library (skeptical of NIH here — XState would be overkill); it is a pure function returning a discriminated union.

```ts
// complexOps.ts (or a new scene.ts) — one resolution, two consumers
export type SceneKind = 'affineLoop' | 'hornerLoop' | 'degreeRamp' | 'orbit';

export interface Scene {
  kind: SceneKind;
  /** Path P:[0,1]→ℂ for ONE representative input (renderer maps it per-point). */
  pathAt: (q: Cx, t: number) => Cx;
  /** Native param fed to the path (handles triS folding, ×iterN, etc.). */
  param: (t: number) => number;
  /** Labeled waypoints for the "jump to stop" buttons. */
  stops: { label: string; t: number }[];
  /** How many arc-length samples this path wants. */
  samples: number;
}

export function buildScene(opts: {
  feed: Feed; coeffs: Cx[]; p: number; iterate: boolean; iterN: number;
}): Scene { /* the ternary tree, resolved ONCE, with a comment block */ }
```

Both `Argand.tsx`'s `useMemo` and `ArgandPlane.tsx`'s mover branches consume `scene.pathAt`/`scene.param`/`scene.stops`. The triangle-fold and the iterN-scale become *named* fields instead of inline arithmetic in two files. **Will it compose if more degrees/systems are added?** Yes — a cubic, or a Möbius mode, is one more case in `buildScene` and (if the path is sampled, which it already is) zero new render branches.

I would gate this refactor on the test suite below — do not refactor the combinatorics without first pinning the current behavior with tests, or you will refactor blind.

---

## 3. `ArgandPlane.tsx` has outgrown one component

605 lines, and the handoff is right that it is a thicket of `degree===1/2`, `feed`, and `gridColor` branches. The component does, in one render body:

- pan/zoom/multi-pointer gesture state (≈ lines 102-201),
- coordinate transforms `toV`/`toMath` (119-129),
- grid generation `gridCurves` (260-292),
- two grid render paths (`drawGrid`, mono vs per-segment colored, 297-318),
- the unit-curve (ellipse / two lines / hyperbola+asymptotes) node (361-392),
- the affine two-leg + diagonal render (526-545),
- the quadratic term-sum render (547-575),
- the iteration orbit (329-357, 509-524),
- fixed points, critical point, draggable handle glyphs (577-599).

> [!NOTE]
> This is not "bad code" — every block is readable on its own and the comments are excellent. But it conflates **interaction** (gestures), **projection** (the camera/transform), and **drawing** (eight independent overlays). The render-pipeline abstraction the request asks about is the right lens: each overlay is a pure `(props, toV) => ReactNode`. Pulling them into co-located helpers (same file or a `layers/` folder) would let a reader find "the quadratic term-sum drawing" without scrolling past gesture handlers.

A pragmatic, low-risk decomposition (no behavior change, no new files required):

| Extract | What | Why |
|---|---|---|
| `useArgandCamera(ref, extent, ctr)` | size + `k` + `toV`/`toMath` + pan/zoom/pointer state | the only stateful part; reusable, unit-testable transform |
| `useGestures(...)` | the pointer/pinch/pan handlers | isolates the multi-pointer bookkeeping (the trickiest code) |
| `<GridLayer mapFn opacity .../>` | `drawGrid` + `gridCurves` | the heavy render path (see §4) lives in one place to optimize |
| `<UnitCurve p .../>` | the p<0/p=0/p>0 unit-curve node | self-contained, switch on `p` |
| `<AffinePath/>`, `<TermSum/>`, `<Orbit/>` | the three mover overlays | each is the renderer half of one `Scene.kind` |

This pairs naturally with the `Scene` factoring in §2: each `Scene.kind` has exactly one drawing component. The boundary between `ArgandPlane.tsx` (still owns camera + composition) and `Argand.tsx` (state) is *correct and should not move* — this is purely splitting the render monolith internally.

A headless-UI rewrite would be over-engineering for one app; I do **not** recommend it.

---

## 4. Performance & footprint — the per-segment grid is the real cost

This is a concrete, measurable problem the request and handoff both name, and I confirm it.

The default mono grid is cheap: `drawGrid` emits **one `<path>` per grid line** with `n = 1` subdivision (`ArgandPlane.tsx:279`, `301-305`). Good. But two switches blow that up:

```ts
const n = quad || gridColor ? 24 : 1;   // line 279 — 24× the points per grid line
```

- **Domain coloring (`gridColor`)** switches `drawGrid` to emit **one `<line>` element per segment** (lines 312-315), each with its own computed `stroke`. With `n = 24` subdivisions, a grid of ~`2·GN/gridStep` lines in each direction produces **24 × (lines) DOM nodes**. On a wide screen with a small `gridStep`, `GN` grows with `reach` (line 254, which itself grows with pan offset and extent), so this is *thousands* of `<line>` nodes — recomputed and re-diffed by React **on every `t` tick and every drag move**. The grid-colored screenshot confirms the visual outcome: a dense, noisy mesh that is both ugly (Hat 4's problem) and expensive (mine).
- **Quadratic** forces `n = 24` for *all* grid paths even when not domain-colored, because straight lines must be densified to bend. Reasonable, but it means the quadratic Grid feed is always paying 24×.

> [!WARNING]
> **Worst case is unbounded.** `reach` (line 254) includes `|ctr.re| + |ctr.im|`, so panning far from the origin *increases the grid node count* without limit — there is no clamp on how many grid lines are generated relative to what's visible. Combined with `gridColor`'s per-segment `<line>`s and per-frame React re-render, a user who pans out and turns on domain coloring on a 4K screen can drive the node count into the tens of thousands and the frame rate into the floor.

### Mitigations (in priority order)

1. **Clamp the grid to the viewport, not to `reach`.** `GN` should be derived from the *visible* half-spans (`halfX`, `halfY` already exist, lines 252-253) plus one `gridStep` of margin — not from `reach`, which double-counts the pan offset. This alone bounds the node count to "what fits on screen."
2. **Don't subdivide what you don't bend.** For the *identity* ghost grid and the linear image grid, straight stays straight — `n = 1` is correct. Only the quadratic image and the domain-colored case need `n = 24`. The current code over-subdivides the ghost grid in quadratic mode for no visual gain.
3. **For domain coloring, use a `<path>` per line with a gradient, or memoize.** Emitting one React element per *segment* is the costly part — each is a vnode React must reconcile. Options: (a) build the colored grid into a single `<path>` string per line and accept a single stroke color per line (cheaper, slightly less "flowing"); (b) cut subdivisions to `n = 8` when domain-colored (the eye won't see 24); (c) at minimum, `useMemo` the entire grid `<g>` keyed on `[gridCurves identity, mapFn deps]` so a `t` tick that doesn't move the grid (Point feed) doesn't rebuild it.
4. **Render grid `<line>`s as a `key`-stable list** — they already use composite keys, fine.

> [!TIP]
> The cheapest high-value fix is **#1 (clamp to viewport)** + **#3c (memoize the grid `<g>`)**. Together they cap the node count and stop the grid rebuilding on every Play frame. Neither changes the picture. I'd do these before any aesthetic change to the grid, because the noise Hat 4 will complain about is partly *because* there are too many segments.

### Per-frame React re-render

Play calls `setT(...)` every rAF tick (`Argand.tsx:146`), which re-renders `Argand` **and** `ArgandPlane` and rebuilds every derived array (`placed`, `shapePts`, `gridCurves`, `orbitDots`, all the path strings) each frame. For the Point feed this is tolerable (small arrays). For the Grid feed with domain coloring it is the dominant cost, compounding §4. The `Scene`/layer factoring lets you memoize the *static* overlays (ghost grid, image grid, axes, unit curve, fixed points) so only the single moving marker re-renders per tick.

### Bundle / code-split

`React.lazy` registration is correct (`index.tsx:23,46`; `apps.ts:22`; `catalog.ts:40`) — the app is its own chunk. `complexOps.ts` is pure and tree-shakeable; `curves.ts` is trivial. No SVG library, no Three.js — the footprint is small and appropriate. No concern here.

---

## 5. Verification & contracts — the missing tests are the must-fix

`complexOps.ts` has **zero tests**, despite its own header comment ("everything here is testable in isolation") and despite the repo convention that math engines ship tests — `CountingTheWays/__tests__/skellam.test.ts` and `SolidWorlds/__tests__/{solidSchema,gab}.test.ts` both do exactly this for their math modules. Argand is the outlier.

> [!WARNING]
> This is the **single biggest quality gap**. The module has subtle, invariant-bearing functions (the generalized algebra, the fixed-point quadratic formula, the path closure properties, arc-length) and several documented *failure modes* (`powRealG` falls back to a linear blend on a `null` log; dual/split fixed points are only approximate; `logG` returns `null` in degenerate cones). None of these are pinned. Any refactor in §2/§3 is being done without a net.

### Test cases I would write (vitest, `src/animations/Argand/__tests__/complexOps.test.ts`)

**Arithmetic & generalized algebra**
- `mulG(a,b,-1)` equals ordinary complex `mul(a,b)`; `mulG(a,b,0)` is the dual product; `mulG` is commutative and distributes over `add`.
- `invG`/`divG`: `mulG(z, invG(z,p), p) ≈ 1` for `p∈{-1,0,1}` on points off the null cone; `invG` returns `z` unchanged (the guard) when `|normG|<1e-9`.
- `normG` is multiplicative: `normG(mulG(a,b,p),p) ≈ normG(a,p)·normG(b,p)`.
- `powRealG(b,p,0) ≈ 1` and `powRealG(b,p,1) ≈ b` for all three `p` (the endpoint contract the spiral promises) — **and** the `p===-1` fast path agrees with the general `expG∘logG` branch to within tolerance (catches the fast-path drift).
- **Fallback contract:** when `logG` returns `null` (dual with `Re≤0`; split outside the future cone), `powRealG` returns the linear blend `1+(b.re−1)t, b.im·t` and stays finite (no NaN) — assert finiteness, since this is the documented degenerate-domain guard.

**Affine / poly invariants**
- `affineAt(z,a1,a0,p,0.5) ≈ mulG(a1,z,p)` (the waypoint); `affineAt(…,1) ≈ affine(z,a1,a0,p)`.
- `affineLoopAt(z,…,0) ≈ affineLoopAt(z,…,1) ≈ z` (closure — the loop returns home); `affineLoopAt(z,…,0.5) ≈ f(z)` (seamless at the midpoint).
- `polyEval([a0,a1],z,p) ≈ affine(z,a1,a0,p)` (degree-1 poly == affine).
- `fixedPoint`: `f(z*) ≈ z*` for `p=-1`; returns `null` as `α₁→1`. For the **quadratic** `polyFixedPoints`, assert `f(z*ᵢ) ≈ z*ᵢ` for **both** roots in the complex case — and **document/assert the known weakness** that this is only approximate in dual/split (where `sqrtG` via `powRealG` may have fallen back). A test that asserts the *residual* `|f(z*)−z*|` is small in complex but only pins finiteness in dual/split makes the contract honest rather than silently wrong.
- `criticalPoint` returns `null` when `|α₂|<1e-9`; otherwise `f'(z)=0` there (numerically: central difference of `polyEval`).
- `polyTermCumulative` starts at `0` and ends at `polyEval` (tip-to-tail sum closes on `f(z)`); `polyTermLoopAt` is closed at the origin (`t=0` and `t=1` give `0`).

**Arc length**
- `arcLengthMap` on a straight path of length L: `length ≈ L`, `arcAt(1) ≈ L`, `sAt(L/2) ≈ 0.5`, and `sAt`/`arcAt` are inverses (`sAt(arcAt(s)) ≈ s`).
- Degenerate zero-length path: `length ≈ 0`, `sAt`/`arcAt` return `0` (the `<1e-9` guard) without dividing by zero.

**Formatting & snapping**
- `formatRect`: `−0` never appears; `1i` not `1.0i`; `0` for the origin; sign spacing.
- `snap`: a point within 0.16 of a Gaussian integer snaps to it; a point near `r=1, θ=π/6` snaps to the polar nicety; a far-from-anything point is returned unchanged; thresholds are scale-independent (the comment claims this — assert it doesn't depend on a zoom factor, which it doesn't since it takes math units).

These are ~30 focused assertions, all on pure functions, no DOM. They would take an afternoon and would **convert the §2/§3 refactor from risky to routine.**

> [!NOTE]
> CI only runs `npm run build` (per CLAUDE.md), so these tests wouldn't gate merges automatically — but the repo keeps `npm test` green by convention and other apps already contribute to it. Adding Argand's tests aligns it with the house standard and is the prerequisite for safely touching the combinatorics.

---

## 6. Smaller observations

| # | Observation | Severity |
|---|---|---|
| a | `Eqn` (Argand.tsx:176) and the on-plane equation (459-473) are two hand-built copies of the same colored formula. Extract one `<Equation degree/>` component. | nice-to-have |
| b | The HUD feed switcher (404-413), the `Pills` Feed control (239-244), and the top-bar `modes` (495-497) are **three** ways to set `feed`. That's a UX question for Hats 4/5, but structurally it's three call sites mutating one state — fine, but the HUD pill styles (`pill`, `iconBtn`) are hand-rolled inline instead of using the `ControlPanel` primitives or theme classes. | nice-to-have |
| c | `affineLoopAt` is computed per grid point per frame in the live-grid mover (line 473) — `gridCurves.length × n` evaluations every tick. Folds into §4's memoization. | see §4 |
| d | `orbitDots` recomputes the full iterate list every render even when `iterate` is off and the Point feed isn't shown (lines 329-334). Guard it behind `isPoint && iterate`. | nice-to-have |
| e | Magic numbers for sample counts (24, 40, 32, 144, 160, 180, 64) are scattered. The `Scene.samples` field would centralize them. | tidy-up |
| f | `useSize`'s `ResizeObserver` is correct; no leak. `setPointerCapture`/`release` paired correctly. No teardown bugs found. | clean |
| g | American-spelling convention: prose and comments comply (`color`, `analyze`-style). No issue. | clean |

---

## Verdict

**What I endorse (don't touch):**
- The `complexOps.ts` ↔ component boundary and the pure-path contract. This is the strongest part of the design.
- The arc-length / `lutRef` / rAF Play clock — a correct, idiomatic "latest-ref" loop with the right effect deps.
- The generalized-algebra abstraction (`mulG`/`logG`/`powRealG` over `p`). It is real, justified, and composes — adding a system is changing `p`, not adding a code path.
- `React.lazy` code-split and the small dependency-free footprint.
- The `Workspace`/`immersive` integration is by-the-book.

**What concerns me (must-fix, in order):**
1. **No tests on `complexOps.ts`.** It is the most testable file in the app, ships documented failure modes (`powRealG` fallback, approximate dual/split fixed points, `logG` null cones), and is the outlier against repo convention (`skellam`, `solidSchema` both ship tests). Write the ~30 assertions in §5 **first** — they are the safety net for everything below.
2. **The per-segment domain-colored grid is unbounded** (§4): `GN` derives from `reach`, which grows with pan offset; `gridColor` emits one `<line>` vnode per segment at `n=24`; the whole thing rebuilds on every `t` tick. Clamp the grid to the viewport (use the existing `halfX`/`halfY`), drop subdivisions for straight (identity/linear) grids, and memoize the static grid `<g>`. This is also the root of the visual noise Hat 4 will flag.
3. **`powReliable`/`coeffs` duplication** (§1): the renderer re-derives logic the math module already owns. Expose `powRealGDefined` and `coeffsOf` from `complexOps.ts` so the picture can never silently diverge from the readouts.

**What I'd change (the factoring, gated on #1):**
- Resolve `(feed, degree, iterate)` **once** into a `Scene` descriptor (§2) — a pure discriminated-union function, *not* a state-machine library. It centralizes the overloaded `t` semantics (the triangle fold, the `×iterN`, the stop labels) that are currently scattered ternaries across three files, and makes "add a cubic / a new system" a one-case change.
- Split `ArgandPlane.tsx` (§3) internally into a camera hook + gesture hook + one drawing component per `Scene.kind`. No new boundaries, no behavior change; pairs one-to-one with the `Scene` kinds. **Not** a headless-UI rewrite — that would be over-engineering for one app.

**Nice-to-have:** dedupe the equation node (6a), guard `orbitDots` (6d), centralize sample counts via `Scene.samples` (6e).

Net: a well-built app with a clean math core, one genuinely risky performance path, and a missing test suite that should exist *before* anyone improves the rest. Pay down #1 and #2 and this is in good shape.

---

## Augmentation (2026-06-24) — the complex–dual–split slider as a cross-app "unitary spaces" lens

Dan's question: should Argand's `p = j²` slider (the elliptic/parabolic/hyperbolic Cayley–Klein continuum) become a *shared* lens across the complex-function apps — Complex Particles (4D graph), Plane Transform (plane map), Correspondence, FractalsGPU — so that ℂ is "a foreigner we need to understand," one setting of `p`, not a privileged home?

I'll answer this strictly through my lens (architecture & quality). I find the *idea* compelling and well-motivated mathematically, but as a software-engineering proposal it is **a large, leaky, multi-substrate generalization with a sharp correctness trap**, and I'd resist the full version while endorsing a small, honest first slice. Below, the four concrete questions.

### Cross-app reality check (verified from source)

I re-read the actual code before reasoning about it, because the cost of this proposal lives in the details:

| Surface | Substrate | ℂ-hardcoding observed | `p`-generalization cost |
|---|---|---|---|
| `complexOps.ts` (Argand) | TS, pure | none — already over `p` (`mulG`, `normG=x²−p·y²`, `powRealG`, `logG`) | done; this is the *only* generalized algebra that exists |
| `lib/complexMath.ts` (shared zoo) | TS, pure | `functionNames` + per-fn TS evaluators, ℂ-specific | n/a for transcendentals (see honesty risk) |
| Complex Particles | Three.js + GLSL | per-point complex eval in shader, ℂ math | per-shader GLSL rewrite |
| Plane Transform | WebGL fragment/vertex (`shaders/index.ts`) | **36-case `applyComplex` dispatch**, all built on `complexMul/complexExp/complexLn` | per-shader GLSL rewrite |
| FractalsGPU | GLSL | iteration `z² + c` in shader | per-shader GLSL rewrite |
| `lib/functionHandoff.ts` | TS URL codec | carries function **identity only** (`fn` name + `p,q` + quad coeffs); **no number system** | one additive field |

The asymmetry is the whole story: **one app has the generalized algebra; four apps have none of it, three of them in GLSL, and the handoff that links them carries no `p` at all.** Plane Transform's `shaders/index.ts` is the canonical evidence — its `complexExp`, `complexLn`, `complexSin`, `complexGamma` (a 9-term Lanczos!) are all written in ℂ-only `vec2` arithmetic. There is no `p` anywhere in that file.

### 1. The right abstraction for a shared generalized algebra

The pattern is **the Strategy pattern as a value-level capability record, not an OO interface hierarchy** — and `complexOps.ts` has already *accidentally built it*. The functions there (`mulG(a,b,p)`, `normG(z,p)`, `powRealG(b,p,t)`, `logG(b,p)`) are a strategy parameterized by a single scalar `p`. The clean move is to promote that scalar into a named **`Algebra` record** so consumers depend on the capability, not on a magic number:

```ts
// lib/generalizedAlgebra.ts  (promote, do not rebuild)
export interface Algebra {
  readonly p: number;                 // j²: <0 elliptic, =0 parabolic, >0 hyperbolic
  readonly kind: 'complex' | 'dual' | 'split';
  mul(a: Cx, b: Cx): Cx;              // = mulG(a,b,p)
  norm(z: Cx): number;               // = x² − p·y²
  powReal(b: Cx, t: number): Cx;     // = powRealG(b,p,t)
  log(b: Cx): { u: number; v: number } | null;  // null = outside the domain
}
export const algebraOf = (p: number): Algebra => /* thin wrapper over complexOps */;
export const COMPLEX = algebraOf(-1);   // the "foreigner we already know"
```

> [!NOTE]
> This is *not new code* — it is a façade over the functions Argand already ships, costing ~30 lines. Its only job is to give every other app a name (`Algebra`) to depend on, so "which number system" stops being an untyped `number` threaded by convention and becomes a typed object whose `log()` can *return null* (the honesty hook — see §3).

**Where does `p` live?** Three scopes, three different answers, and conflating them is the trap:

| Scope | Mechanism | Verdict |
|---|---|---|
| *Within one app* | a prop threaded from the app's `useState` to its renderer (exactly what Argand does today: `p={system}` into `ArgandPlane`) | **correct.** Keep it a prop. |
| *Cross-app deep link* | extend `functionHandoff` with one optional `j2` field | **endorse — smallest correct step.** Additive, ignorable, no crash on absence (the codec already decodes unknown to `{}`). |
| *Global "current system"* | a React context / global store | **resist.** It violates the repo's stated rule ("no global store/context; state is local `useState`/`useRef`"). It also implies every app *has* a system, which is false for the ℂ-only zoo. |

So: **prop within an app, URL field across apps, never a context.** The `functionHandoff` extension is literally:

```ts
export interface FunctionState { index: number; p?: number; q?: number; quad?: …; j2?: number; }
// encode: if (s.j2 !== undefined && s.j2 !== -1) parts.push(`j2=${s.j2}`);
// decode: const j2 = num('j2'); if (j2 !== undefined) out.j2 = j2;
```

One field, default-ℂ when absent, fully backward-compatible. This is the *only* part of the whole proposal I would ship without further debate.

### 2. Composition across four render pipelines

This is where the proposal's cost is concentrated and routinely under-estimated. The substrates do not share an implementation language:

- **Argand (SVG/TS):** already generalized. Zero cost — it *is* the prototype.
- **The three WebGL apps (Complex Particles, Plane Transform, FractalsGPU):** the algebra lives in **GLSL**, which cannot import `complexOps.ts`. Generalizing means **re-deriving `mulG`/`expG`/`logG`/`powRealG` as `vec2` GLSL functions parameterized by a `uniform float p`** and rewriting every dispatch case to route through them. There is no shared-source path; TS and GLSL are different worlds, and the only guard today is `checkGlslDispatch` (a string-scan that the dispatch *exists*, not that it's *correct*).

> [!WARNING]
> **Honest surface estimate.** A `uniform float p` plus generalized `gmul/gexp/glog` in GLSL is tractable *per shader* (maybe 40–80 lines of GLSL each, plus a uniform wire-up). The real cost is **(a) ×3 shaders, (b) no shared source so the same math is hand-ported three times and can drift from the TS, and (c) the transcendental cases simply have no generalization** (next section). The conditional branches `expG` does on the sign of `p` (`cos`/linear/`cosh`) become GLSL `if(p<0)…else if(p>0)…` inside the hot per-point loop — correct but a measurable shader cost on a particle cloud. I would budget this as **multi-session, per-app work**, not a single change, and I would *not* attempt all three at once. Plane Transform (one vertex shader, the cleanest dispatch) is the pilot; Complex Particles and FractalsGPU follow only if the pilot proves the value.

The composition risk that matters to me: **three independent GLSL re-implementations of an algebra that already has one TS source of truth = three places to drift.** The mitigation is the contract test in §4, not a clever abstraction (there is no way to share GLSL and TS source).

### 3. The leaky-abstraction / honesty risk — make it *refuse*

This is the architectural crux, and it's where an "algebra-as-parameter" design is actively *dangerous* if done naively. Most of the function zoo has **no honest dual/split analogue**: `exp`, `sin`, `cos`, `tan`, `Γ`, the inverse-trig family, `z^(p/q)` for irrational exponents — these are *defined through `exp`/`log`*, and `logG` already returns `null` outside its domain (dual needs Re>0; split needs the future cone). A design that lets the user dial `p` for `exp` under split would either crash, NaN, or — worst — **silently produce a plausible-looking wrong picture.** Mathematically, "ℂ is just one `p`" is true for the *algebra*; it is **false for the transcendental function library**, and an abstraction that hides that distinction is lying.

The fix is to make the abstraction **refuse where it cannot generalize**, by lifting the capability into the type, not leaving it to runtime luck:

```ts
// A function declares the p-domain it is honest over.
export interface GeneralizedFn {
  name: string;
  evalC: (z: Cx) => Cx;                          // the ℂ evaluator (always present)
  /** Which systems this f is mathematically honest in. */
  validSystems: ReadonlyArray<Algebra['kind']>;  // e.g. ['complex'] for exp/sin/Γ
  /** Present only if it generalizes: the p-aware evaluator. */
  evalG?: (z: Cx, alg: Algebra) => Cx;           // affine/poly/rational only
}
```

Then the rule is structural, not advisory: **affine, polynomial, rational** maps get an `evalG` and `validSystems: ['complex','dual','split']`; **every transcendental** gets `validSystems: ['complex']` and *no* `evalG`. The UI consumes the flag — when the selected `f` doesn't list the current system, the `p`-slider is **disabled with a reason** ("`exp` is defined only over ℂ"), exactly as Argand already disables `powRealG`'s smooth spiral where `logG` returns null (the `powReliable` predicate at `ArgandPlane.tsx:339`). That existing predicate is the *template* for how this should behave app-wide: the abstraction already knows how to say "I can't do this here" — generalize that habit, don't suppress it.

> [!TIP]
> The single most important architectural sentence in this augmentation: **the slider's range must be a function of the selected `f`, not a global control.** A global `p` slider over a zoo that's 90% ℂ-only is the leaky abstraction. A *capability-gated* `p` slider — live for affine/poly/rational, greyed-with-explanation for transcendentals — turns the leak into a teaching moment ("here is exactly why ℂ is special: most functions only live here"), which is *more* faithful to Dan's "ℂ as foreigner" thesis than a slider that pretends everything generalizes.

### 4. Verification across apps with only `npm run build` + manual checks

The cross-app correctness claim is: *the same `f`, under the same `p`, reads consistently as graph (Complex Particles) and map (Plane Transform/Argand).* With only build + manual checks, you cannot verify pictures — but you can verify the **math that produces them**, and that is enough to catch the drift that matters. Three contracts, in priority order:

1. **A golden-vector table for the TS algebra** (`lib/__tests__/generalizedAlgebra.test.ts`): a fixed set of `(z, p)` inputs and their expected `mulG`/`normG`/`powRealG`/`logG` outputs, including the `null`-domain cases. This is the source of truth every GLSL port must match. (Pairs directly with the §5 `complexOps` tests I already proposed — same module, extended.)
2. **A GLSL↔TS parity test** (the antidote to §2's three-way drift): a small headless harness that runs each generalized GLSL function over the golden vectors (via a tiny offscreen WebGL pass, or — cheaper and CI-safe — by *extracting the GLSL expressions and re-implementing the assertion as a string/AST diff against the TS*). Honestly, full GLSL execution in CI is heavy; the pragmatic version is a **shared spec file** both the TS `Algebra` and a GLSL-generating helper consume, so there is one declaration and the GLSL is *emitted*, not hand-written. That's a bigger lift — flag it as the eventual correct answer, not the first step.
3. **A `validSystems` invariant test**: assert that every `GeneralizedFn` with `evalG` actually agrees with `evalC` at `p=-1` (the ℂ specialization must equal the ℂ evaluator), and that no transcendental ships an `evalG`. This is cheap, pure, and catches the honesty trap in CI.

> [!NOTE]
> "Reads consistently as graph and map" is, at bottom, "both apps call the same `evalG(z, algebraOf(p))`." The strongest guarantee is **a single shared TS evaluator that both non-GLSL consumers import** (Argand and any future TS-side map), and **one emitted GLSL** for the WebGL consumers. Two implementations (TS + emitted GLSL) from one spec beats four hand-maintained ones. The verification strategy and the abstraction strategy are the same decision: *reduce the number of independent implementations of the algebra to two (TS, GLSL), generated from one spec.*

### Augmented verdict (delta)

**Endorse (small, correct, ship-now):**
- The `Algebra` façade over the existing `complexOps.ts` `*G` functions (~30 lines, no new math).
- One optional `j2` field in `functionHandoff` (additive, default-ℂ, backward-compatible).
- The `validSystems` capability flag + **capability-gated slider** (disabled-with-reason for transcendentals). This is the honesty mechanism and it's cheap.

**Resist (until the cheap parts prove value):**
- A global React-context "current number system" — violates the repo's no-global-state rule and falsely implies every app has a system.
- Generalizing all three GLSL pipelines at once. It's multi-session, per-shader, hand-ported work with real drift risk and no shared-source path.
- Any design that exposes `p` for the transcendental zoo. That's the correctness trap; the type must forbid it.

**Smallest correct first step:** In **Argand only** (it's the one app that's already generalized), refactor `p`-as-number into the `Algebra` record + add the `validSystems` concept *retroactively* to its own affine/poly engine, and add the golden-vector tests from §5/§4.1. That proves the abstraction in the one place it's free, produces the spec the GLSL ports would later consume, and ships the `j2` handoff field so the *link* is ready before any second app is. No other app changes until that's landed and the tests are green. This sequences the risk: the expensive, drift-prone GLSL work is gated behind a proven, tested TS abstraction — exactly the order my main verdict (#1: tests first) already argues for.

The thesis ("ℂ is one `p`, not home") is *better served* by an abstraction that honestly refuses to generalize `exp` than by one that silently fakes it — so the architecture and the pedagogy point the same way.

---

## Self-reflection

**What I'm confident about:** The performance analysis (§4) is grounded in the actual code paths — `n = quad || gridColor ? 24 : 1`, the per-`<line>` map at 312-315, and `reach` including the pan offset at 254 are all verbatim, and the grid-colored screenshot corroborates the visual density. The missing-tests finding (§5) is a fact (zero test files for Argand; two sibling apps ship math tests). The `coeffs`/`powReliable` duplication is verbatim from both files. I'm confident in these.

**What I'm less sure about:** I did not measure frame rate — "tens of thousands of nodes / frame rate into the floor" is a reasoned worst-case extrapolation from the node-count growth, not a profiled number. The `Scene` refactor (§2) is a proposal I believe is sound, but I have not prototyped it; there may be a feed/degree corner (e.g. iterate + quadratic interactions) that resists the clean union and needs a second discriminant. The claim that the mid-play path-shape-change "jumps" rather than catches up is inferred from `arcRef` being a raw distance against a clamped `sAt`; I did not run it to confirm the visual.

**What I'd verify before acting:** Profile the Grid+domain-coloring path on a wide viewport (React DevTools render count + a node count) to confirm the §4 ordering of fixes. Prototype `buildScene` against all 7 cells of the table to confirm the union closes cleanly before committing to it.

**Follow-up value:** HIGH — the test suite (§5) and the grid clamp (§4) are concrete, independently shippable, and both unblock or de-risk later visual/UX work from the other hats. The factoring is valuable but should follow the tests, so the value is sequenced, not speculative. The 2026-06-24 augmentation reinforces this: the cross-app "unitary spaces" lens is feasible but its cheap, correct first slice (the `Algebra` façade + `validSystems` capability gate + `j2` handoff field, all in Argand) is precisely the kind of small, tested, sequenced step that de-risks the expensive multi-shader GLSL work behind a proven TS abstraction.
