---
kind: three-hats
session: 2026-06-24-S01
date: 2026-06-24
title: "Argand — Architecture & Quality Consultant review (Hat 2 of 5)"
branch: claude/argand-plane-review-51egvz
slug: argand-plane-review
status: complete
build: passing
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

## Self-reflection

**What I'm confident about:** The performance analysis (§4) is grounded in the actual code paths — `n = quad || gridColor ? 24 : 1`, the per-`<line>` map at 312-315, and `reach` including the pan offset at 254 are all verbatim, and the grid-colored screenshot corroborates the visual density. The missing-tests finding (§5) is a fact (zero test files for Argand; two sibling apps ship math tests). The `coeffs`/`powReliable` duplication is verbatim from both files. I'm confident in these.

**What I'm less sure about:** I did not measure frame rate — "tens of thousands of nodes / frame rate into the floor" is a reasoned worst-case extrapolation from the node-count growth, not a profiled number. The `Scene` refactor (§2) is a proposal I believe is sound, but I have not prototyped it; there may be a feed/degree corner (e.g. iterate + quadratic interactions) that resists the clean union and needs a second discriminant. The claim that the mid-play path-shape-change "jumps" rather than catches up is inferred from `arcRef` being a raw distance against a clamped `sAt`; I did not run it to confirm the visual.

**What I'd verify before acting:** Profile the Grid+domain-coloring path on a wide viewport (React DevTools render count + a node count) to confirm the §4 ordering of fixes. Prototype `buildScene` against all 7 cells of the table to confirm the union closes cleanly before committing to it.

**Follow-up value:** HIGH — the test suite (§5) and the grid clamp (§4) are concrete, independently shippable, and both unblock or de-risk later visual/UX work from the other hats. The factoring is valuable but should follow the tests, so the value is sequenced, not speculative.
