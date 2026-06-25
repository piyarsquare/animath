---
kind: plan
session: 2026-06-24-S01
date: 2026-06-24
title: Number Planes — a choice-driven HTML educational page (story + plan)
branch: claude/argand-plane-review-51egvz
slug: argand-plane-review-51egvz
status: proposed
build: passed
followup: null
pr: https://github.com/piyarsquare/animath/pull/237
app: docs, argand
signals: needs-dan
next: Converge the spine + side-threads + open questions with Dan, then draft the HTML page (prose-first) in the public/*-guide.html family adapted for a curiosity-driven (choose-your-own) web.
---

# Number Planes — a choice-driven HTML educational page

> [!NOTE]
> **Single home for the story + the plan.** (Moved out of a loose `docs/` file —
> Dan 2026-06-24: keep the outline in the sessions/plans system, not hidden in docs.)
> Goal: make **"separable vs. entangled"** *felt*, staying in 2-D, with **the choice
> of multiplication as the spine**.

## Direction (Dan, 2026-06-24)

After the in-app number-line/tour experiments were shelved (see the
[design-ux-review](2026-06-24-S01-design-ux-review.md) timeline), the work is
**narrative-first**: craft the story as a *document* first; interactivity enriches a
story that already works as prose. Stay **in the plane** (quaternions are an optional
side-quest, not the trunk).

## Delivery & format

An **HTML educational page** in the same family as the existing guides under
[`public/`](../../../../public/) (`complex-*-guide.html`, indexed by
`public/guides.html`): a self-contained file, **serif prose**, **live embedded
applets** (`#/embed/…`), and **the exact source lines** that compute the math.

**This one adds JS** (Dan confirms: there *should* be JS). The current guides are
no-JS; this page keeps their *look* but gains a navigation/interaction layer. JS
does three jobs: (1) the **curiosity-driven navigation** (reveal/route nodes on
choice), (2) the **carried `j²` choice** that colors many nodes, (3) the embedded
applets.

## Navigation model: a curiosity-driven web  ⟵ *(revised per Dan)*

Not a linear trunk with two end-forks. It's an **explorable web**: a short **spine**
of core nodes (the recommended through-line), and at *every* node a few **"where to
next?"** choices — some advance the spine, some are **"tell me more about X"**
side-doors the reader pulls on interest and (usually) returns from.

> Dan's examples of the choices a reader makes: *"tell me more about complex
> multiplication," "tell me about quadratics," "show me in p-space," "what happens to
> the eigenvalues," …* — curiosity-driven, throughout, not just at the end.

- **Each node is a short, self-contained card** (one idea + its figure/applet),
  ending in 2–4 links. So dependencies stay sane: the *spine* is ordered, but
  side-threads hang off it and loop back.
- **Carried `j²` state** is the connective tissue — pick your plane once and many
  nodes answer in it; a reader can also re-choose and re-walk.
- **Terminal side-quests** (leaves) exist — e.g. Hamilton → quaternions — that the
  reader chooses to descend into and may not return from.
- This is the classic explorable-explanation shape; the medium (the reader keeps
  *choosing*) mirrors the subject (the whole subject *is* a choice — how to multiply).

### Node map (spine ● · side-thread ○)

```
● Line  ──►  ● Choose how to multiply the plane (j²)
                       │
                       ├─► ● The magnitude it respects (|·|_p, the unit curve)
                       │       └─○ "show me in p-space" (the dial is a circle)
                       │
                       ├─► ● How many rails? (t² = p → spiral / shear / saddle)
                       │       ├─○ "what happens to the eigenvalues?" (rails ↔ eigenvalues; the morph)
                       │       ├─○ "why can't I pull complex apart?" (no real eigenvectors)
                       │       └─○ "why is split just ℝ×ℝ?" (idempotents, null basis, zero divisors)
                       │
                       ├─► ● Iterate & feel it (fixed points: spiral / saddle / shear)
                       │       ├─○ "tell me more about complex multiplication" (angles add, de Moivre)
                       │       ├─○ "tell me about quadratics" (z², two fixed points, the critical point, the bend)
                       │       └─○ "nonlinear iteration" (z²+c; what a Julia set means off ℂ)
                       │
                       └─► ● The circle of planes (dual at 0 and ∞; x↔y is p↦1/p)
                               ├─○ "where does this show up?" (relativity / autodiff / geometry)
                               └─○ "can I go higher?" ──► Hamilton's quest → ℝ³ fails → quaternions (leaf)
```

---

## The premise & the spine

A **number** is something you can *add* and *multiply*. On the line that's settled.
In the plane, **addition is forced** (vector translation) but **multiplication is a
choice** — and the whole story is *what choices are possible and how each one feels.*

> **The spine — how many real square roots does `p` have?** `t² = p` has **2 / 1 / 0**
> real roots, and that count *is* the three planes (split / dual / complex). The same
> number is "how many **rails** the multiplication has," "how many real **eigenvalues**,"
> and "what the **orbits** look like." One idea, four costumes.

## Spine nodes (the recommended path)

Each lists **idea · carrying example · the felt moment · the applet hook**.

### ● 1. The line
`+` slides, `×` scales; `f(x) = m·x + b` is a *transformation* (point → point — the
"line" is its graph, not the thing). Magnitude is multiplicative `|m·x| = |m|·|x|`;
the magnitude-*preservers* are `|m| = 1`, i.e. **±1** — the two roots of `x² = 1`.
*Felt:* iterate `x → m·x`; it just shrinks/grows — one rail, nothing to spiral
around. *Hook:* drag `m`, `b`; iterate.

### ● 2. The plane, and the choice
A point is `(x, y)`. Demand multiplication be **bilinear** (distributes, has `1`) and
the whole choice collapses to one number — what `j = (0,1)` squares to: **`j² = p`**.
Table: `(x₁+y₁j)(x₂+y₂j) = (x₁x₂ + p·y₁y₂) + (x₁y₂ + y₁x₂)j`. *Felt:* "you're choosing
the arithmetic of the plane, and there's one knob." *Hook:* the `j² = p` dial (the
carried choice).

### ● 3. The magnitude it respects
The choice hands you `Nₚ(z) = x² − p·y²`, `|z|ₚ = √|Nₚ|`, with `|zw|ₚ = |z|ₚ|w|ₚ`. The
unit set `|z|ₚ = 1` is the **unit curve** — the plane's `±1`. *Felt:* `|·|` was never
plane-neutral; and `|α| = 1` means *different motions* per plane (rigid rotation vs.
balanced squeeze). *Hook:* the unit curve morphs — ellipse (circle at `−1`) → lines →
hyperbola.

### ● 4. How many rails?  ⟵ *the heart*
Ask of `× α`: *is there a direction it doesn't turn, only slides along?* — a **rail**
(eigenvector); slide factor = **eigenvalue**. Rail slopes solve `t² = p`:
`p>0` → **2 rails** (split, separable, saddle); `p=0` → **1** (dual, shear);
`p<0` → **0** (complex, entangled, spiral). *Carrying example:* `z²` — complex doubles
the angle; split is `(u², v²)` in null coords (two parabolas); dual is `x² + 2x·yε`
(autodiff falls out). *Felt:* separable = the 2-D map is secretly two 1-D maps *in the
right axes*; complex has **no real such axes**. *Hook (key):* the **change-of-basis
morph** — try to find the rails by shearing the frame; succeed in split, **fail** in
complex (that failure *is* "no real eigenvectors").

### ● 5. Iterate & feel it
`f(z) = αz + β`, fixed point `z* = β/(1−α)`; iterate. Three phase portraits:
complex → **spiral** (center when `|α|ₚ=1`); split → **saddle**, orbit rides a
hyperbola (**pure squeeze** at `|α|ₚ=1`); dual → **shear**. *Felt:* cover one eye on a
split orbit and it's just `1, ½, ¼…` on a rail; the spiral can't be reduced.
*Subtlety:* `|α|ₚ = √|λ₊λ₋|` is **net/area** scaling — "`|α|<1` ⇒ attractor" is a
**complex-only** fact (split can be a saddle with `|α|ₚ<1`). *Hook:* drop a point;
"show rails."

### ● 6. The dial is a circle
`p` looks like a line `−1…0…+1` but is secretly a **circle**: `p=0` and `p=±∞` are
**two dual points** (degenerate direction rotates y-axis → x-axis); complex arc
(`p<0`) and split arc (`p>0`) join them; `x↔y` is `p ↦ 1/p` (fixes `±1`, swaps
`0↔∞`). *Felt:* drag `p` outward and watch the complex circle **flatten into a line**
— rotation degenerating to shear — the *same* dual you'd reach from the split side.

## Side-thread nodes (pulled on curiosity)

- **○ "why is split just ℝ×ℝ?"** `j²=1 ⇒ (j−1)(j+1)=0`; idempotents `e± = (1±j)/2`
  (`e±²=e±`, `e₊e₋=0`); in null coords `(a,b)=(x+y,x−y)`, `z·w = (ac, bd)` —
  component-wise = **ℝ×ℝ**, two independent number lines (= the rails). Zero divisors
  visible; CRT view: 2 distinct roots ⇒ splits; 0 ⇒ ℂ (a field, can't split); 1 ⇒
  `ℝ[ε]/ε²` (dual).
- **○ "what happens to the eigenvalues?"** rails ↔ real eigenvalues of `× α`;
  diagonalize = find the rails = separate the dimensions; complex eigenvalues are
  `ρe^{±iθ}` (a rotation-and-scale, which is what one complex `α` *is*). Anchor for
  the change-of-basis morph.
- **○ "tell me more about complex multiplication"** angles add, moduli multiply;
  de Moivre/Euler; the spiral as `α^t`.
- **○ "tell me about quadratics"** `z² + …`: the grid **bends**; **two** fixed points
  + a **critical point** `−α₁/2α₂`; Horner as a chain of `×z` spirals; how it
  factors in split (each null coord squares).
- **○ "show me in p-space"** the circle-of-planes node, deep: the conic flattening at
  both ends, `p ↦ 1/p` as the axis-swap, dual-at-infinity.
- **○ "nonlinear iteration"** `z → z²+c`; what a Julia set *means* off ℂ (split ⇒ it
  factors into two 1-D dynamics; a product of real Cantor-ish sets).
- **○ "where does this show up?"** split = **special relativity** (rapidity, the
  squeeze that *is* a Lorentz boost); dual = **autodiff / screw theory**; complex =
  everywhere; the trichotomy = elliptic/parabolic/hyperbolic geometry.
- **◆ "can I go higher?" → Hamilton's quest (terminal leaf).** Can we multiply
  **triples** in ℝ³ keeping magnitudes multiplicative? Hamilton tried for years — it
  **can't be done** (you'd need a whole sphere of square roots of `−1`). Give up
  commutativity, add a 4th dimension → **quaternions** `i²=j²=k²=ijk=−1` (Broom
  Bridge, 1843); unit quaternions `S³` rotate 3-D space. **Hurwitz:**
  magnitude-respecting multiplication exists only in dims **1, 2, 4, 8** (ℝ, ℂ, ℍ,
  𝕆); the magnitude-preservers climb `S⁰ ⊂ S¹ ⊂ S³ ⊂ S⁷`, then it stops — provably.

## Decisions logged

- **Stay in 2-D**; quaternions are the optional terminal side-quest only.
- **Naming:** Number Planes; motions **Spin / Shear / Squeeze** — leaning *Squeeze*
  over *Boost* (still deciding; "Boost" imports relativity). If the relativity thread
  is kept, introduce it as *"a Squeeze — the boost special relativity is built on."*
- **Form:** a curiosity-driven web (spine + side-threads), JS-driven, in the
  `public/*-guide.html` visual family.

## Open questions (need Dan)

1. **Spine vs. side-thread split** — is the node map above the right cut (which ideas
   are must-see vs. pull-on-curiosity)?
2. **The `t²=p` spine** as the explicit backbone of node 4 — confirm.
3. **Design the change-of-basis morph** (node 4's hook) — succeed in split, fail in
   complex. Probably the single most important interaction.
4. **Carried `j²` mechanics** — set-once-and-carry, or re-choosable per node?
5. **How much applet vs. prose** per node (prose must stand alone).
6. **Scope** — does `z²+c` / Julia-off-ℂ live here or in a second page?
7. **Naming** — finalize Squeeze vs. Boost.

## Next steps (when funded)

1. Converge the node map + open questions with Dan.
2. Draft the page **prose-first** (guide format), node/branch structure stubbed, JS
   navigation skeleton.
3. Build the embeddable plane applet (`#/embed/number-planes` on `numberPlanes.ts`):
   the `j²` dial, an orbit showing the rails, the change-of-basis morph.
4. Wire applets into nodes; add the page to `public/guides.html`.

## One-line shape

> **A web you walk by curiosity:** line → *choose how to multiply the plane (`j²`)* →
> the magnitude it respects → *how many rails (`t²=p`: spiral / shear / saddle)* →
> iterate & feel it → the dial is a circle — with side-doors at every step
> (quadratics, p-space, eigenvalues, …) and one trapdoor down to Hamilton.
