---
kind: plan
session: 2026-07-08-S02
date: 2026-07-08
title: The leak in Q3 — j² = p + q·j, the re-grid that plugs it, and the residue
branch: claude/number-plane-notebook-kxvxzj
slug: number-plane-notebook-kxvxzj
status: proposed
build: unknown
followup: null
pr: https://github.com/piyarsquare/animath/pull/246
app: number-plane, docs
signals: needs-dan
next: Build the leak/re-grid material from this spec (working prototype in assets/ is the reference implementation); Dan's calls wanted on the one-p contract and placement (see Open questions).
---

# The leak in Q3 — `j² = p + q·j`, the re-grid that plugs it, and the residue

*Provenance: Dan's conversation with Claude (chat, 2026-07-08), developed from
Dan's four-rectangle construction. Every formula below was machine-checked
(3000 randomized trials + endpoint asserts); a working standalone prototype is
committed alongside this plan as
`assets/2026-07-08-q3-leak-regrid-prototype.html` — open it over http and
drive it before building.*

## What this delivers

Stop A's told-FOIL already ends on the bracket — *"the real part — if j² is
real…"* — and the **Hmm? floater carrying the change-of-basis picture**, with
the whisper *"completing the square one floor up."* This plan is that
floater's payload, built out: what happens when j² is **not** purely real,
why the failure is localized to exactly one rectangle, and what the re-grid
that fixes it does — and provably does not do — to the picture.

It also closes a loop with [[CN]] from below: CN's `## full` does completing
the square *one dimension up* (homogenize, diagonalize at the apex). This is
the same move performed **in the plane's own basis**, on the four rectangles
the reader has already watched FOIL build. And it generalizes [[WH]]: the
characteristic equation of ×j becomes `t² = q·t + p`, so the rail count is
the real-root count of *that* — the story WH tells is the `q = 0` slice.

## The construction (the drawing Stop A almost has)

Two numbers, `z = a + b·j` and `w = x + y·j`. Lay the four components on the
four half-axes of one Cartesian plot — `a` on +horizontal, `b` on
−horizontal, `x` on +vertical, `y` on −vertical (all values nonnegative for
now) — and each quadrant closes a rectangle whose **area** is one FOIL term:

| quadrant | sides | area | term type |
|---|---|---|---|
| Q1 (＋,＋) | a·x | `ax` | real · real |
| Q2 (−,＋) | b·x | `bx` | j · real |
| Q4 (＋,−) | a·y | `ay` | real · j |
| Q3 (−,−) | b·y | `by` | **j · j** |

The diagonal pair (Q1, Q3) is the real channel; the anti-diagonal (Q2, Q4)
is the j channel. The grid shows through the fills so the reader can count
unit squares — area *is* the product, checkably.

## The general rule and the leak

Let the generator obey the general rule

    j² = p·1 + q·j

(the notebook's standing rule is the `q = 0` slice). Multiply out:

    (a + b·j)(x + y·j) = (ax + p·by) · 1  +  (ay + bx + q·by) · j

so on the rectangles:

    real = Q1 + p·Q3
    imag = Q2 + Q4 + q·Q3        ← the leak

**q rides Q3 and only Q3**, and the reason is visible: Q3 is the one
rectangle that multiplies the generator by itself — `(b·j)(y·j) = by·j²` —
so it is the only place a `j²` can hide. Q1 touches no j; Q2 and Q4 each
carry a single j and fall cleanly into the j channel. When `q ≠ 0`, the
gold rectangle **pays into both accumulators**: the diagonal/anti-diagonal
bookkeeping — the very split Stop A's tiles teach — fails, and it fails in
exactly one place.

Worked default (also the prototype's): `a=3, b=2, x=4, y=1.5`, rule
`j² = −1 + j`. Areas 12 · 8 · 3 · 4.5; real `= 12 + (−1)·3 = 9`; imag
`= 8 + 4.5 + 1·3 = 15.5`.

## The re-grid (completing the square, watched from the rectangles)

The unit `1` is pinned by the multiplication itself; the only freedom is
re-choosing the generator. Shift it: `j′ = j − s`. To the picture this means
one thing — **the side lengths get re-measured**:

    a ↦ a + s·b        x ↦ x + s·y        (b and y never move)

Three rectangles are redrawn; **Q3 = by is untouched** (a shift never
changes anyone's generator coefficient). The rule's dials evolve as

    p_s = p + s·q − s²        q_s = q − 2s

⚠ **The trap** (a real recorded error from the derivation, worth a marginal
note): the naive expansion gives `j_s² = (p + s²) + (q − 2s)·j` — *in terms
of the old j*. Re-expressing in terms of `j_s` itself moves a piece:
`p_s = p + s·q − s²`, **not** `p + s²`. The machine check caught it.

At `s = q/2` the leak dies: `q_s = 0`, `p_s = p + q²/4`. Completing the
square, read at the level of the diagram: *shear the measurement grid until
the j·j rectangle's spillover into the j channel vanishes.* Area flows among
the other three rectangles; the gold one holds still; the leak arrow thins
and dies.

Worked endpoint (same numbers, `s = ½`): sides become `a′ = 4, x′ = 4.75`;
areas 19 · 9.5 · 3 · 6; rule `j′² = −0.75`; real `= 19 − 0.75·3 = 16.75`;
imag `= 9.5 + 6 + 0 = 15.5`.

## What never moves (and what drifts) — the map/territory beat

Machine-verified along the whole scrub `s ∈ [0, q/2]`, not just endpoints:

1. **The j-part reading of every element is invariant.** For the product:
   `imag_s = ay + bx + q·by`, constant in s. (A shift never touches
   generator coefficients.)
2. **The 1-part reading drifts, lawfully:** `real_s = R₀ + s·I₀`. Same
   element, different decomposition against a tilting generator.
3. **The element itself never moves.** In a fixed frame,
   `real_s·1 + imag_s·j_s` lands on the same point for every s.
4. **Δ = q² + 4p is re-grid-proof:** `q_s² + 4p_s = q² + 4p` identically.

Two different acts, one picture: dragging handles changes the *numbers*;
scrubbing the re-grid changes the *reading instruments*. Rectangles are
readings. The prototype's second panel makes (3) visible: the dots z, w,
z·w stand still while the coordinate grid leans under them.

## The residue

After the shift, one rescale remains (`j″ = j′/√|p′|`, trading dial
magnitude for Q3's area at constant product — dial × area is conserved),
and what survives both moves is a single sign:

    Δ = q² + 4p        Δ < 0 → Spin · Δ = 0 → Shear · Δ > 0 → Boost

(level curves: circles · **parallel lines** · hyperbolas). Every rule
`j² = p + q·j` re-grids to exactly one of the three planes — the
classification theorem, enacted on rectangles. This is [[IN]]'s Sylvester
story with the shift done in-plane and the rescale named; and it is [[WH]]
generalized: ×j has matrix `[[0, p], [1, q]]`, characteristic equation
`t² = q·t + p`, eigenvalues `(q ± √Δ)/2` — rails = real roots, as always.

Disguises worth keeping (the prototype's preset chips):

- `j² = j − 1` → Δ = −3: **Spin in a sheared grid** (good opening default —
  the badge knows before the reader does).
- `j² = j` → Δ = 1: **Boost in costume**; j and 1−j are idempotents, the
  algebra is ℝ×ℝ wearing a slant — the split plane's other face.
- `j² = 1 + j` → Δ = 5: **the golden rule**; eigenvalues (1±√5)/2 = φ, ψ,
  so the rails of this algebra are the Fibonacci eigen-directions.

## The three beats (for plates / a stop)

1. **The leak** — q-dial on; two arrows leave Q3 (×p → real, ×q → imag);
   the tape shows gold in both lines. One rectangle, two accounts.
2. **The re-grid** — scrub `s`; three side lengths shear, Q3 holds, the
   q-arrow dies; imag reads "← never moves"; the element panel's dots
   stand still under a leaning grid. Reversible by hand — run it backwards.
3. **The residue** — Δ badge, invariant under everything; the three planes
   as the only destinations; the disguise presets.

## Honesty boundary (matches the notebook's positivity stance)

The shear can drag a sheared reading negative (`q < 0`, small `a`, large
`b`). The prototype **pauses the scrub at the boundary and says so**:
*"signed lengths are the next chapter."* Keep this — the artifact declining
to fake what it hasn't earned is the register. Also honest: the prototype
animates the **shift only**; the rescale (dial↔area at constant product) is
a second short animation, not yet built.

## Proposed cards (stubs — voice-checked, IDs free against the manifest)

`LK.md`:

    ---
    id: LK
    title: The leak in Q3
    kind: knob
    glance: Let j² keep a piece of j — one rectangle pays two accounts.
    links:
      leans-on: [DV, WH]
      opens: [RG]
    ---
    ## note
    General rule: `j² = p + q·j`. Multiply `(a+bj)(x+yj)` on the four
    rectangles: real = ax + p·by, imag = ay + bx + **q·by**. The j·j
    rectangle is the only one that squares the generator — so it is the
    only place a q can hide. When q ≠ 0 the diagonal/anti-diagonal
    bookkeeping fails, in exactly one place.

`RG.md`:

    ---
    id: RG
    title: The re-grid
    kind: knob
    glance: Shear the ruler until j² forgets j; the dots never move.
    links:
      leans-on: [LK]
      opens: [IN]
      same-as: [CN]
    ---
    ## note
    Shift the generator: j′ = j − q/2. Readings shear (a ↦ a + ½q·b);
    the j·j rectangle holds still; the leak dies: j′² = p + q²/4, real.
    Every element's j-part reading survives; its 1-part drifts by s·(j-part);
    the element itself never moves. What no re-grid touches: Δ = q² + 4p —
    one sign, three planes.

Housekeeping if adopted: add IDs to `manifest.json`, run
`scripts/check-cards.mjs`, and write the `## full` sections (the ×j matrix
`[[0,p],[1,q]]`, the invariance proofs, the rescale's dial×area
conservation).

## Marginalia to quarry (real recorded corrections, this session)

- **The p_s trap** — `p + s²` (wrong, from expanding in the old basis) vs
  `p + s·q − s²` (right, re-expressed in the new one); caught by the
  randomized check. A genuine "earlier thought / correction" pair in the
  established marginal-note register.

## Verification recipe (what the prototype asserts; keep for the build)

For random `a,b,x,y ∈ [0,6]`, `p,q ∈ [−2,2]`, `t ∈ [0,1]`, with
`s = t·q/2`:

    imag_s == imag_0                          (j-part invariant)
    real_s == real_0 + s·imag_0               (lawful drift)
    q_s² + 4·p_s == q² + 4p                   (Δ invariant)
    real_s − s·imag_s == real_0               (element fixed on screen)
    q_s == 0 at t = 1                          (leak dead)

plus the clamp case (`q = −2, a = 1, b = 5` → scrub stops exactly where the
sheared reading hits 0).

## Open questions for Dan

1. **The one-p contract.** q is a second dial. Proposal: q is *local to
   this material* — an excursion — and completing the square is the return
   move; the page's global p is the excursion's initial p, and Δ hands
   classification back to sign-of-p language. Alternative: after the
   re-grid, offer "adopt p′ = p + q²/4 as the page's p." Which?
2. **Placement.** (a) An annex plate off Stop A's floater (it literally is
   that floater's content); (b) its own stop between the FOIL beat and the
   renormalization beat (the shift here + the rescale there = Sylvester in
   two stops); (c) Chapter III material. The math argues for (b): Stop B's
   settle-the-dots *is* this plan's unbuilt second act.
3. **Labels.** The construction reads `(a+bj)(x+yj)` with a,b horizontal
   and x,y vertical (the axes carry the factors). Keep, or re-letter to
   avoid overloading x,y as plane coordinates elsewhere in the notebook?
4. Adopt the two cards? And does the p_s trap earn a marginal note, or is
   one recorded correction per spread the ceiling?
