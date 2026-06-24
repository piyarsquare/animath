---
kind: progress
session: 2026-06-24-S01
date: 2026-06-24
title: Argand / Number Planes — attribution & sources scout
branch: claude/argand-plane-review-51egvz
slug: argand-plane-review-51egvz
status: completed
build: n/a
---

# Argand / Number Planes — attribution & sources scout

A wayfinding pass for the **Argand** app (the "Number Planes" entry-point for
complex numbers), per the repo's attribution policy. Goal: find, **verify**, and
annotate prior work and analogues to augment the EXPLAINER's "Possible sources &
where to go further" block. Nothing here is a priority claim — these are
annotated pointers for a curious reader's next step. Where I could not stand
behind a detail, I say so (§3) rather than inventing it.

Verification convention: every citation below was cross-checked against at least
two independent web sources (publisher/catalog page, library catalog, Wikipedia,
journal landing page, etc.). Confidence tags: **verified** (multiple concordant
sources, exact details), **partially-verified** (existence + most details
confirmed, one or more secondary details still soft), **unverified-flag** (could
not confirm; flagged or omitted).

---

## 1. What the EXPLAINER already cites (inventory + corrections)

The current block (`src/animations/Argand/EXPLAINER.md`, lines 106–120) cites:

| # | Citation as written | Verdict |
|---|---|---|
| A | **Argand diagram** (Jean-Robert Argand, **1806**); Caspar **Wessel, 1799** | **Correct.** Argand's *Essai* — 1806; Argand lived 1768–1822. Wessel presented to the Royal Danish Academy in 1797, **published 1799**. Gauss (1831) is the usual third name; optional to add. |
| B | "Multiplication adds angles" is **de Moivre** / Euler's formula `e^{iθ}=cosθ+i sinθ` | **Correct** and standard. No change. |
| C | **Needham, *Visual Complex Analysis*** — spiral + affine/Möbius maps | **Correct, but undated.** First edition **1997** (Clarendon Press / Oxford University Press); a **25th-anniversary edition, 2023** (OUP, foreword by Roger Penrose) now exists. Worth adding the year and the new edition. |
| D | Affine fixed point + iteration `z→f(z)` → **complex dynamics** (the Fractals apps) | **Correct** framing; internal pointer. No external citation to verify. Fine as-is. |
| E | Dual & split-complex + the `p=j²` trichotomy = **I. M. Yaglom**'s territory: *Complex Numbers in Geometry*; *A Simple Non-Euclidean Geometry and Its Physical Basis* — elliptic/parabolic/hyperbolic **Cayley–Klein** geometries | **Correct.** Years to add: *Complex Numbers in Geometry* — English translation **Academic Press, 1968** (Russian original 1963). *A Simple Non-Euclidean Geometry and Its Physical Basis* — **Springer-Verlag, 1979** (trans. Shenitzer; about **Galilean** geometry). Note: it is the *Galilean* book that pairs with the **dual** numbers, so the leaf-to-book mapping should be made explicit. |
| F | Split-complex = algebra of **Lorentz boosts and rapidity** | **Correct** and standard. No change. |
| G | **Dual numbers** underlie **automatic differentiation** and **screw theory** | **Correct.** Dual numbers introduced by **W. K. Clifford (1873)**; forward-mode AD and screw-theory/kinematics uses are well documented. No change. |
| H | Next chapters extend `f` to **quadratics and general polynomials** | Internal roadmap pointer; now also wants the **rational-functions** rung (R2.5). |

**Net:** the existing block is accurate and honest — no corrections, only
**missing years** (Needham 1997/2023; Yaglom 1968 and 1979) and one
**clarification** (the dual leaf pairs with the *Galilean* Yaglom book, not the
non-Euclidean-geometry one's relativity content). The additions below are the
substantive value.

---

## 2. Verified additions (new pointers worth including)

### 2.1 — Harkin & Harkin, the single best citable survey for the trichotomy
- **A. A. Harkin & J. B. Harkin, "Geometry of Generalized Complex Numbers,"
  *Mathematics Magazine* 77(2), 118–129 (2004).** — **verified** (Taylor &
  Francis / MAA landing page; cross-checked author affiliations: A. Harkin,
  Harvard; J. Harkin, SUNY Brockport).
- *Why a reader goes there:* this is the one short, accessible, **peer-reviewed**
  paper that treats exactly Argand's `p=j²` dial — the elliptic/parabolic/
  hyperbolic family of "generalized complex numbers" `x+yj` with `j²∈{−1,0,+1}` —
  as one object, with the unit curves and the generalized polar form. It is the
  closest thing to a canonical citation for the Spin/Shear/Boost continuum and
  far more reachable than Yaglom. **Strongest single addition.**
- *Terminology finding:* the literature's standard umbrella term is
  **"generalized complex numbers"** (Harkin & Harkin) or, for the algebra,
  **"the three real 2-dimensional unital algebras."** "Planar numbers" is **not**
  a widely standardized term — use "generalized complex numbers" in the sources
  block.

### 2.2 — Needham, with year and new edition
- **Tristan Needham, *Visual Complex Analysis*, Clarendon Press / Oxford
  University Press, 1997; 25th-anniversary edition, OUP, 2023.** — **verified**
  (OUP catalog; *Mathematical Gazette* review of the 2023 edition; Internet
  Archive).
- *Why a reader goes there:* the canonical visual treatment of spiral
  similarities, the affine map, and Möbius transformations — the direct
  ancestor of Argand's "multiply = spiral, add = slide" reading.

### 2.3 — Wegert, for the domain-coloring lineage
- **Elias Wegert, *Visual Complex Functions: An Introduction with Phase
  Portraits*, Birkhäuser/Springer Basel, 2012.** — **verified** (Springer
  landing page; Internet Archive; a Trefethen review in *SIAM Review*, 2013).
- *Why a reader goes there:* the systematic reference for **phase portraits**
  (hue = argument) — the exact technique behind Argand's "color the plane by
  angle" option and the suite's signature look. Good honest pairing with the
  R2 note that hue=arg silently breaks off ℂ.

### 2.4 — Visualization / pedagogy analogues (verified to exist; described honestly)
- **Welch Labs, *Imaginary Numbers Are Real* (YouTube series, 2015; companion
  workbook/book).** — **verified** (welchlabs.com; YouTube playlist; GitHub
  repo). A 10-part series ("Numbers are Two Dimensional," "The Complex Plane,"
  "Complex Functions," …). *Covers:* why ℂ is the natural 2D extension of the
  reals; the closest analogue to Argand's "a complex number is a point in the
  plane" framing. Does **not** cover the dual/split family.
- **3Blue1Brown, "Complex number fundamentals" (Lockdown Math ep. 3, 2020).** —
  **verified** (3blue1brown.com lesson page + YouTube). *Covers:* multiplication
  as rotate-and-scale, the geometry of the plane. The canonical video for the
  "multiply = spiral" intuition. (Title note: 3B1B's piece is *Complex number
  fundamentals*; "Imaginary Numbers Are Real" is **Welch Labs'** title — keep
  them distinct.)
- **BetterExplained (Kalid Azad), "A Visual, Intuitive Guide to Imaginary
  Numbers" and "Intuitive Arithmetic With Complex Numbers."** — **verified**
  (betterexplained.com). *Covers:* "imaginary numbers rotate," `1+i` as a 45°
  rotate-and-scale — a prose analogue of Argand's two-leg path.

### 2.5 — Cayley–Klein, for the "ℂ as one of a family" frame
- **Cayley–Klein geometries** as the organizing trichotomy
  (elliptic/parabolic/hyperbolic measures) — **verified** as a standard concept
  tying the three planes to the three planar geometries; well surveyed in the
  Harkin & Harkin paper (§2.1) and Yaglom (§1.E), and (for the kinematics angle)
  in survey literature on Clifford algebras and the nine planar Cayley–Klein
  geometries. *Why a reader goes there:* the precise reason ℂ is "one of a
  family" rather than privileged. **Keep this proper noun in the sources block
  only**, per R2.5 (front-of-house stays "arithmetic on the plane").

---

## 3. Could-not-verify / deliberately omitted

- **A "unified generalized polar form" source** (`e^{jθ}=coshθ+j sinhθ` for
  split, `1+εθ` for dual, presented together under one law). The *facts* are
  standard and individually verified (split: hyperbolic versor / rapidity; dual:
  `1+εθ`), but I did **not** find a single citable source that presents all three
  polar forms as one unified statement *other than* Harkin & Harkin (§2.1), which
  does treat them together. **Resolution:** lean on Harkin & Harkin for the
  unified treatment; do not invent a dedicated "generalized polar form" citation.
- **"Planar numbers" as a standard term.** Could not confirm it as the field's
  accepted name. Omitted in favor of "generalized complex numbers." (`unverified-flag`)
- **A specific Nicky Case / "explorable explanations" piece on the affine map,
  fixed points, or the complex/dual/split family.** I did not find one that
  matches closely enough to cite honestly — explorables on complex *arithmetic*
  exist, but I could not verify one that does Argand's specific job (affine map +
  fixed point, or ℂ-as-foreigner). **Omitted** rather than cite a vague analogue.
  (`unverified-flag` — worth a future look, not a fabrication now.)
- **Exact "first" attribution for split-complex numbers** (Cockle's "tessarines,"
  1848, etc.). The history is real but the precise first-coinage chain is
  contested across sources; I did not include a dated "first introduced by…"
  claim to avoid a crisp-but-shaky citation. Clifford-1873 for **dual** numbers
  *is* well attested and is included.
- **Yaglom *Complex Numbers in Geometry* exact translator/edition.** The 1968
  Academic Press English edition is verified; I did not pin the translator name
  with confidence, so I omit the translator rather than guess. (`partially-verified`)

---

## 4. Proposed updated "Possible sources & where to go further" block

> Drop-in replacement for EXPLAINER.md lines 106–120. Reflects the **Number
> Planes** framing (Spin · Shear · Boost; lines → polynomials → rational
> functions; polar/rapidity), keeps the scary proper nouns (Cayley–Klein,
> Galilean, Minkowski) **here** and not front-of-house. ~12 bullets. For Dan's
> approval — not applied to the file.

```markdown
## Possible sources & where to go further

This app calls the complex plane one of a **family of number planes** — the same
line `f(z)=α₁z+α₀` run through three ways of multiplying (**Spin / Shear /
Boost**). How that idea was *reached* and what it *lands near* are different
questions; here is the second.

- **The plane picture** is the **Argand diagram** (Jean-Robert Argand, *Essai*,
  1806) — though Caspar Wessel got there first (presented 1797, published 1799),
  and Gauss independently. "Multiplication adds angles" is **de Moivre** and
  Euler's `e^{iθ}=cos θ + i sin θ`.
- For the spiral, the affine map, and Möbius maps developed visually and far
  further: **Tristan Needham, *Visual Complex Analysis*** (Oxford/Clarendon,
  1997; 25th-anniversary edition 2023).
- **Coloring the plane by angle** (the Plane panel's domain-coloring option) is
  the **phase-portrait** technique of **Elias Wegert, *Visual Complex Functions:
  An Introduction with Phase Portraits*** (Birkhäuser, 2012).
- **The fixed point z\*** of an affine map, and **iterating z → f(z)** toward (or
  away from) it, is the gateway to **complex dynamics** — the territory of the
  Fractals apps here. *Where it breaks is the lesson:* z\*=α₀/(1−α₁) flies to ∞
  as α₁→1 (a pure shift has no fixed point), and the map degenerates on the
  **null cone** (split) and the **flat direction** (dual).
- **The three number planes** (`p = j²` < 0 / = 0 / > 0 — Spin/Shear/Boost) are
  the **"generalized complex numbers"** `x + yj` with `j² ∈ {−1, 0, +1}`. The
  best short, peer-reviewed survey is **A. A. & J. B. Harkin, "Geometry of
  Generalized Complex Numbers," *Mathematics Magazine* 77 (2004), 118–129** — it
  treats exactly this dial, with the unit curves and a unified polar form.
- The deeper geometric home is **I. M. Yaglom**: *Complex Numbers in Geometry*
  (Academic Press, 1968) and, for the **Shear/dual** leaf, *A Simple
  Non-Euclidean Geometry and Its Physical Basis* (Springer, 1979) — the
  **Galilean** plane. The three planes are the elliptic / parabolic / hyperbolic
  **Cayley–Klein** geometries.
- **Boost** (split-complex) is the algebra of **Lorentz boosts** and **rapidity**
  — a hyperbolic angle, with `e^{jθ} = cosh θ + j sinh θ` along the unit
  hyperbola; the **Minkowski** plane. **Shear** (dual numbers, `ε² = 0`,
  introduced by **W. K. Clifford, 1873**) underlies **forward-mode automatic
  differentiation** and **screw theory / kinematics**.
- Next rungs extend `f` from a line to **quadratics, general polynomials, and
  (later) rational functions** — all of which still multiply honestly across all
  three planes, which is why the dial keeps its meaning.
- Friendlier on-ramps to "a complex number is a point you can rotate": **Welch
  Labs, *Imaginary Numbers Are Real*** (video series); **3Blue1Brown, *Complex
  number fundamentals*** (multiply = rotate-and-scale); and **BetterExplained**'s
  visual guides to imaginary numbers.
```

---

## Self-reflection

1. **What would you do with another session?** Hunt specifically for an
   *explorable-explanation* analogue (Nicky Case-style) that does Argand's job —
   affine map + fixed point, or ℂ-as-one-of-a-family — which I deliberately left
   out rather than cite vaguely. That is the one bullet the block is missing.
2. **What would you change about what you produced?** I leaned on Harkin & Harkin
   as the sole source for the *unified* polar form; I would have liked a second
   independent text presenting all three polar forms together, but I would not
   fabricate one to get it.
3. **What were you not asked that you think is important?** Whether to credit the
   *idea-reaching* provenance (the app's own independent reasoning toward the
   `p=j²` dial) distinctly from the landed-near work. The proposed block now opens
   with that distinction, per policy.
4. **What did we both overlook?** The leaf-to-book mapping subtlety: it is
   Yaglom's *Galilean* (1979) book that pairs with the **dual/Shear** leaf, not
   its relativity content — the original EXPLAINER lumped the two Yaglom titles
   together. Fixed in the proposal.
5. **What did you find difficult?** Resisting crisp-but-shaky history (the
   split-complex "first coinage" chain, Yaglom's translator) — the honest move
   was to omit specific first-attributions and translators rather than guess.
6. **What would have made this task easier?** A frozen note in the app of which
   prior works were actually consulted while building it (the *reached* side), so
   I could separate genuine influence from after-the-fact analogue-finding.
7. **Follow-up value:** LOW — this is a self-contained wayfinding pass; the
   proposed block is verified and drop-in, and the only open thread (an
   explorable-explanation analogue) is optional polish, not a blocker. Dan need
   only approve and paste.
