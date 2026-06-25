# Number Planes — story outline (working draft)

> A shared reference for the teaching document. Goal: make **"separable vs.
> entangled"** *felt*, staying in 2-D, with the choice of multiplication as the
> spine. Interactivity is layered onto a story that already works as prose.
>
> Status: outline for discussion (Dan + Claude, 2026-06-24). Not built.

---

## 0. The premise (one sentence)

A **number** is a thing you can *add* and *multiply*. On the line that's settled.
In the plane, addition is settled too — but **multiplication is a choice**, and the
whole story is: *what choices are possible, and what does each one feel like?*

The spine that runs through everything:

> **How many real square roots does `p` have?**  `t² = p` has **2 / 1 / 0** real
> roots, and that count *is* the three planes — split / dual / complex. Same number
> shows up as "how many rails the multiplication has," "how many real eigenvalues,"
> and "what the orbits look like." One idea wearing four costumes.

---

## TRUNK — everyone reads this (linear)

Each beat lists: **the idea**, **the carrying example**, **the felt moment**, **the
interactive hook** (for later).

### 1. The line
- **Idea:** `+` slides, `×` scales. `f(x) = m·x + b` is a *transformation* — it
  takes a point to a point (the "line" is its graph, not the thing itself).
  Magnitude is multiplicative: `|m·x| = |m|·|x|`. The multipliers that *preserve*
  magnitude are the ones with `|m| = 1` — exactly **±1**, the two roots of `x² = 1`.
- **Carrying example:** `m·x + b`.
- **Felt moment:** iterate `x → m·x` — it just shrinks or grows. One dimension, one
  rail, nothing to spiral around.
- **Hook:** drag `m`, `b`; iterate and watch the march.

### 2. The plane, and the choice
- **Idea:** a point is `(x, y)`. **Addition is forced** (element-wise = vector
  translation; the same in every plane, so it's the boring shared floor).
  **Multiplication is not forced.** Demand only that it's *bilinear* (distributes,
  has a `1`) and you've reduced the entire choice to one number: what `j = (0,1)`
  squares to. **`j² = p`.**
- **Carrying example:** the multiplication table `(x₁+y₁j)(x₂+y₂j) = (x₁x₂ + p·y₁y₂)
  + (x₁y₂ + y₁x₂)j`.
- **Felt moment:** "you are choosing the rules of arithmetic for the plane, and
  there's only one knob."
- **Hook:** the `p = j²` dial.

### 3. The magnitude that comes with the choice
- **Idea:** the choice hands you a magnitude for free — the quadratic form
  `Nₚ(z) = x² − p·y²`, with `|z|ₚ = √|Nₚ|`. Multiplication **respects** it
  (`|zw|ₚ = |z|ₚ|w|ₚ`). Its unit set `|z|ₚ = 1` is the **unit curve**, and the
  magnitude-preservers live on it — the plane's version of `±1`.
- **Felt moment:** `|·|` was never plane-neutral; it always carried a hidden `p`.
  And `|α| = 1` means *different motions* per plane (rigid rotation vs. balanced
  boost — see §5).
- **Hook:** the unit curve morphs as you turn the dial — circle (`−1`) → lines
  (`0`) → hyperbola (`+1`), ellipses in between.

### 4. The three planes, felt as RAILS  ⟵ *the heart*
- **Idea:** ask of `× α`: *is there a direction it doesn't turn — a line it just
  slides points along?* That's a **rail** (eigenvector); the slide factor is the
  **eigenvalue**. The rail slopes solve `t² = p`:
  - `p > 0` → **2 rails** (null lines `x = ±√p·y`) → **split / separable** → saddle.
  - `p = 0` → **1 rail** (doubled) → **dual / knife-edge** → shear.
  - `p < 0` → **0 rails** (roots are complex) → **complex / entangled** → spiral.
- **Carrying example:** `f(z) = z²`. Complex: doubles the angle (one coupled twist).
  Split: in null coords `(u,v) = (x+√p y, x−√p y)` it's `(u², v²)` — **two
  independent parabolas**. Dual: `(x+yε)² = x² + (2x)·yε` — the second slot is
  `f'(x)·y` (automatic differentiation falls out).
- **Felt moment / the key reveal:** "separable = the 2-D map is secretly two 1-D
  maps, *in the right axes*." Complex is special because **no real axes work** — you
  literally cannot pull it apart over ℝ, so it must rotate.
- **Hook (Dan's idea — the change-of-basis morph):** let the reader *try to find the
  rails* by morphing the coordinate frame. In **split**, they can shear the frame
  onto the null lines and watch `× α` become "two independent slides" (diagonal). In
  **complex**, *every* frame still rotates — the morph **fails**, and that failure
  *is* "no real eigenvectors." (Diagonalizing = finding the rails = separating the
  dimensions; complex can't be diagonalized over ℝ.)

### 4½. Why the split plane *is* ℝ×ℝ (the algebraic face of "2 rails")
- **`j² = 1` ⇒ `(j−1)(j+1) = 0`** — two *distinct* real roots. Build the "switches"
  `e± = (1±j)/2`: they satisfy `e±² = e±`, `e₊e₋ = 0`, `e₊ + e₋ = 1` (orthogonal
  idempotents).
- Write `z = a·e₊ + b·e₋` with `(a, b) = (x+y, x−y)` (the **null coordinates**).
  Then `z·w = ac·e₊ + bd·e₋` — **multiplication is component-wise**, `(a,b)·(c,d) =
  (ac, bd)`. So in the null axes the split plane *is* **ℝ×ℝ**: two independent number
  lines, each minding its own business. The null axes are the **rails**.
- **Zero divisors become visible:** a point on the `e₊` axis times a point on the
  `e₋` axis is `(a·0, 0·d) = 0` — two nonzero numbers whose product is zero. That's
  the signature of ℝ×ℝ, and it's why the split plane has a light cone.
- **This is the `t² = p` spine, algebraically:** 2 distinct real roots (`p>0`) ⇒ the
  polynomial factors ⇒ the algebra splits (CRT) into ℝ×ℝ. 0 real roots (`p<0`) ⇒
  irreducible ⇒ ℂ, a **field** that *can't* be split (entangled). 1 repeated root
  (`p=0`) ⇒ `ℝ[ε]/(ε²)`, a **nilpotent thickening** — also not ℝ×ℝ (dual).
- **Picture:** rotate your axes 45° onto the light cone (at `p=1`); the funny
  hyperbolic multiplication becomes "multiply each coordinate on its own," the unit
  hyperbola is `u·v = 1`, and a unit boost is `(u,v) ↦ (λu, v/λ)` — stretch one rail,
  shrink the other.

### 5. Fixed points & iteration
- **Idea:** `f(z) = α·z + β` has a fixed point `z* = β/(1−α)`; iterate and watch.
  Three phase portraits = the three planes:
  - complex → **spiral** (in/out, or a **center** circling forever when `|α|ₚ = 1`).
  - split → **saddle**: two geometric sequences along the rails; orbit **rides a
    hyperbola** (a **pure boost** when `|α|ₚ = 1`).
  - dual → **shear / degenerate node** (parabolic drift).
- **Felt moment:** "cover one eye on a split orbit and it's just `1, ½, ¼, …` on one
  rail." The spiral can't be reduced like that — there's no rail.
- **The `|·|ₚ` subtlety to surface:** `|α|ₚ = √|λ₊λ₋|` is the **net / area** scaling,
  not per-rail. "`|α| < 1` ⇒ attractor" is a **complex-only** fact; on the split arc
  you can have `|α|ₚ < 1` and still get a saddle (one rail expands).
- **Hook:** drop a point, watch the orbit; toggle "show rails."

### 6. The dial is a circle
- **Idea:** `p` looks like a line `−1 … 0 … +1`, but it's secretly a **circle**.
  `p = 0` and `p = ±∞` are **two dual points** (the degenerate direction rotates from
  the y-axis to the x-axis); the **complex arc** (`p<0`) and **split arc** (`p>0`)
  join them. Swapping the axes `x ↔ y` is `p ↦ 1/p` (fixes `±1`, swaps `0 ↔ ∞`).
- **Felt moment:** drag `p` from `−1` outward and **watch the complex circle flatten
  into a line** — rotation degenerating into shear — and discover it's the *same*
  dual you'd reach from the split side. Three boxes become one loop.
- **Hook:** sweep `p` around the loop; the conic flattens at both ends.

---

## THE FORK — choose your own adventure (after the trunk)

> You've chosen a multiplication and felt what it does. Two honest ways onward.

### Branch A — *Deeper in the plane* (stays in 2-D)
- **Nonlinear iteration:** `z → z² + c`. The Mandelbrot/Julia engine — and what a
  "Julia set" even *means* in the split and dual planes (separable ⇒ it factors into
  1-D dynamics; the split "Julia set" is a product of two real Cantor-ish sets).
- **Functions as pictures:** domain coloring; watch a grid warp; how the same `f`
  reads in each plane.
- **Where it shows up in the world:** split-complex = **special relativity**
  (rapidity, Lorentz boosts); dual = **automatic differentiation / screw theory**;
  complex = everywhere. The trichotomy is elliptic/parabolic/hyperbolic geometry.

### Branch B — *Hamilton's quest* (goes up a dimension)
- **The question:** we multiplied pairs. Can we multiply **triples** `(x, y, z)` in
  ℝ³ so magnitudes still multiply?
- **The struggle:** Hamilton tried for *years*. It can't be done — there is no
  magnitude-respecting multiplication on ℝ³ (the rails/roots argument generalizes:
  you'd need a whole **sphere** of square roots of `−1`, and the bookkeeping never
  closes in 3-D).
- **The breakthrough:** give up **commutativity**, add a **fourth** dimension →
  **quaternions** `i² = j² = k² = ijk = −1` (Broom Bridge, 1843). Unit quaternions
  `S³` rotate 3-D space.
- **The ceiling (Hurwitz):** magnitude-respecting multiplication exists **only** in
  dimensions **1, 2, 4, 8** — ℝ, ℂ, ℍ, 𝕆 — and each step costs you something
  (ordering → commutativity → associativity), then it **stops**. The
  magnitude-preservers climb `S⁰ ⊂ S¹ ⊂ S³ ⊂ S⁷`.
- **End beat:** "the road you started on the number line ends — provably — in 8
  dimensions."

*(Branch A and B can both be reachable; a reader can do one, both, or neither.)*

---

## Is "choose your own adventure" the right form? (serious take)

**Recommendation: yes — but a strong linear *trunk* with exactly two *genuine* forks,
not a maze.** Reasoning:

- **The medium matches the message.** The whole subject *is* a choice ("how shall we
  multiply?"). A document where the reader's choices mirror the mathematical choices
  isn't a gimmick here — it's the content. The single most thematically perfect fork
  is **choosing `j²`**: the reader picks the multiplication and the page answers with
  that plane's geometry. That's a *soft* fork — one variable threaded through the
  whole trunk, not a branch in the prose.
- **One *hard* fork, at the end, is well-motivated:** "stay and go deeper in the
  plane" vs. "climb out of the plane with Hamilton." Both are real, both are
  satisfying, and neither depends on the other. Hamilton's ℝ³ dead-end → quaternions
  is a *perfect* adventure branch: a genuine historical quest with a provable
  obstruction and a triumphant resolution.
- **It manages length and audience.** The trunk is short and self-contained (a casual
  reader finishes satisfied in 2-D); the branches are optional depth. One document
  serves the curious and the committed.
- **The danger to avoid:** branching *within* the trunk. Math builds linearly;
  dependencies break if the reader can skip §4 before §5. So: **trunk is linear**
  (the only "choice" inside it is `j²`, which is a dial, not a detour), and **forks
  live only after the trunk**, where the paths are truly independent.

**Net:** soft fork = "choose your multiplication" (woven through). Hard fork = "where
to end" (deeper-in-2D vs. Hamilton/quaternions). Two real choices, one spine. That's
CYOA earning its keep, not cosplaying it.

---

## Open questions / things to clarify (common language for Dan's questions)

1. **The `t² = p` spine.** Make "how many real roots does `p` have" the explicit
   backbone of §4 (it unifies rails ↔ eigenvalues ↔ orbit shape ↔ the trichotomy)?
   Dan flagged this — I think yes, it's the cleanest single thread.
2. **The change-of-basis morph (§4 hook).** Design the "try to find the rails by
   morphing the frame" interaction — succeed in split, *fail* in complex. This is
   probably the most important single interaction in the document; worth a sketch.
3. **How interactive is the trunk?** Prose-first with optional widgets, or is each
   beat built around its widget? (Changes how we write it.)
4. **Default ending.** Does the document *default* to ending in 2-D (Branch B
   strictly optional), or does it nudge everyone toward Hamilton?
5. **Soft-fork mechanics.** Is "choose `j²`" a literal page-state the reader sets
   early and carries, or do we walk all three in sequence? (CYOA vs. guided tour.)
6. **Scope of Branch A.** Does nonlinear iteration (`z²+c`, Julia sets off ℂ) belong,
   or is that a second document?
7. **Naming.** Keep **Number Planes**. Motions: **Spin / Shear / Squeeze** —
   *Dan 2026-06-24 leans **Squeeze** over **Boost*** (neutral; "Boost" imports
   special relativity). Still deciding. If Branch A keeps the relativity payoff,
   introduce it as *"a squeeze — the boost that special relativity is built on,"* so
   the neutral picture and the physics name arrive together. Proper nouns
   (Cayley–Klein, Minkowski, Galilean) in a sources aside only.

---

## Delivery & format

**The artifact is an HTML educational page**, in the same family as the existing
guides under [`public/`](../../public/) (`complex-functions-guide.html`,
`complex-particles-guide.html`, …, indexed by `public/guides.html`):

- a **single self-contained HTML file** (inline CSS), **serif prose**, with **live
  embedded applets** (via the `#/embed/…` routes) and, where useful, **the exact
  source lines** that compute the math;
- deploys to the Pages root; no build step for the page itself.

**The adaptation: choice-driven (choose-your-own) navigation** instead of the
guides' linear scroll:

- **Soft fork — "choose your `j²`":** a page-level state the reader sets early and
  carries; the prose/figures respond to the chosen plane. (This is the one departure
  from the current "no-JS" guides — it needs a *small* amount of JS for the carried
  choice and the branch reveals. Flag and keep it minimal.)
- **Hard fork — "where to end":** in-page branch sections (deeper-in-2-D vs
  Hamilton → ℝ³ → quaternions), reached by choice links, each self-contained.
- Keep everything else identical to the guide format so it reads as one family.

**Dependencies:** at least one embeddable plane applet (the `j²` dial + an orbit
with the rails / the change-of-basis morph) — likely a chrome-less
`#/embed/number-planes` route later, built on the dormant `numberPlanes.ts` engine.
Prose-first: the page must teach with the applets *off*; interactivity enriches.

---

## One-line shape

> **Line → "choose how to multiply the plane" (`j²`) → the magnitude it respects →
> how many rails it has (`t²=p`: spiral / shear / saddle) → iterate and feel it →
> the dial is a circle →** *fork:* **deeper in 2-D, or climb with Hamilton to ℝ⁴.**
