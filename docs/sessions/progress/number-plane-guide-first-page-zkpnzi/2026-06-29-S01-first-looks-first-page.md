---
kind: progress
session: 2026-06-29-S01
date: 2026-06-29
title: Number Planes guide — "first looks" + what a first page should be
branch: claude/number-plane-guide-first-page-zkpnzi
slug: number-plane-guide-first-page-zkpnzi
status: in-progress
build: unknown
followup: null
pr: null
app: docs, argand
signals: needs-dan
next: Hands-on discussion of "first looks" — settle what the reader sees first on the Number Planes page before changing the artifact.
---

# Number Planes guide — "first looks" + what a first page should be

## Session purpose

Continue work on the **Number Planes** guide (stacked branch off
`number-plane-guide`). Hands-on session: discuss some **"first looks"** and what
a **first page** might look like — i.e. converge on what the reader should
encounter first before touching the artifact.

## Previous session

Stacked on `number-plane-guide`. The most recent tracked work
([2026-06-25-S01](../number-plane-guide/2026-06-25-S01-number-plane-rename.md),
PR #244) built `public/number-planes.html` (715 lines): a prose-first
"circle-the-core-from-many-lenses" hub page with a carried `j²` choice
(Spin/Shear/Boost) that live-rewrites the prose, a ring of perspectives + lens
deck (4 lenses fully written: Multiplication · Magnitude · Rails · Iteration;
4 stubbed), and a themed `guides.html` gallery + shared skin layer
(`guide-theme.css` / `guide-skin.js`) so the static guides mirror the app's 8
skins. Applet slots are styled placeholders (no `#/embed/number-planes` route
yet). Full design story + node map + open questions:
[the Number Planes page plan](../argand-plane-review-51egvz/2026-06-24-S01-plan-number-planes-page.md)
(`kind: plan`, `status: proposed`).

**Open from that work:** finish the 4 stub lenses; build the
`#/embed/number-planes` applet on the dormant, 50-test `numberPlanes.ts` engine;
settle the where-do-guides-live fork (in-chrome native skins vs. static mirror);
and Theming v2 (#239) landing sharpened the drift risk of the static mirror.

## Working notes

<!-- Newest entry first. -->

### 🟣 decision · 13:10 — Single thread + "post-marks", not a branching web; two-axes is *a* throughline, not *the* one
**Why:** Dan: a story with multiple unfolding pathways is conceptually possible,
but "we are going to try for a single thread and put the post-marks for other
paths along the way. we will maybe figure out how to join them." The two-axes
framing (distributivity count vs. stretchability ladder) is **one** throughline,
not **the** one.

Reverses the original plan's explorable-*web* navigation model in favor of a
**linear spine with signposts**. Post-marks are the future seams where a branch
can attach; joining is deferred. Demotes the two-axes structure from
candidate-spine to one of the signposted side-paths.

**Inventory of post-marks surfaced this session** (each a side-path, not the
trunk): why `(−)(−)=+` is *forced* by distributivity (a theorem, not a
convention); **tropical** math = give up subtraction (the additive group is
itself a choice); **stretchability** = having an inverse, and the **1·2·4·8**
normed-division ladder; **3-D is empty of division** but holds a rich
classifiable **zoo of five** commutative-unital algebras (incl. `ℝ[x]/x³` =
second-order autodiff, `ℝ³` = three rails); **Hamilton/quaternions** (jump to 4-D,
lose commutativity) as the far trapdoor; the magnitude/unit-curve; eigenvalues &
the change-of-basis "find the rails" morph; relativity (split) / autodiff (dual)
applications; the circle of planes (`p ↦ 1/p`, dual at ∞).

Open: name **the** single spine (candidate = Dan's opening arc continued: line →
plane+choice → the three → feel them → the dial is a circle, with "how many
rails / separable vs entangled" as the heart) and decide where it ends.

### 🔵 finding · 12:55 — Math thread that reshapes Beat 1: what's actually *forced*
**Why:** Dan challenged "there's only one way to multiply the line," then pushed
through 3-D and the magnitude condition. The math we settled becomes page content.

- **Sign rules are theorems, not conventions.** Distributivity over a genuine
  additive group + a unit *forces* `0·a=0`, `(−1)a=−a`, `(−1)(−1)=1`. On ℤ/ℚ it
  pins multiplication completely (0 free parameters). The plane is the first
  place the same demand leaves one knob loose (`j²=p`). → sharper Beat 1→2 hinge.
- **Tropical** keeps distributivity but drops additive inverses (a semiring) — the
  honest "you could choose otherwise" escape is *give up subtraction*, not
  *redefine negatives*.
- **Magnitude was never required for the trichotomy** — distributivity + unit alone
  gives the three planes. The conjugate-product norm `N_p = x²−p·y²` appears on its
  own and is multiplicative in all three, but positive-definite (a true norm,
  stretchable = nonzero) **only for complex**. Demanding it collapses the plane to
  ℂ alone. → "stretchable" is a *second axis*, orthogonal to `j²`.
- **3-D under distributivity-only is rich**: exactly **five** commutative
  associative unital ℝ-algebras (`ℝ³`, `ℝ×ℂ`, `ℝ×ℝ[ε]`, `ℝ[x]/x³`, `ℝ[x,y]/(x,y)²`),
  none a division algebra (no 3-D field over ℝ exists). `ℝ[x]/x³` = second-order
  autodiff — the dual-number thread, one floor up.

### 🟡 milestone · 12:30 — Session start: oriented, awaiting "first looks" discussion
**Why:** New branch (`number-plane-guide-first-page-zkpnzi`) continuing the
Number Planes guide; this is a hands-on discussion session, so pin the topic
with Dan before any artifact change (RECIPES R2 — separate exploring from
guessing).

Oriented:
- **Branch** is stacked on `number-plane-guide` (merge-base = its tip
  `b3b07d9`), **not** `main` — so any future sync targets that base, never `main`.
- **On disk now:** `public/number-planes.html` (715 lines, the hub+lenses page),
  `public/guides.html` (themed gallery), `guide-theme.css` / `guide-skin.js`
  (shared skin layer). The dormant engine is `src/animations/Argand/numberPlanes.ts`.
- Read the prior progress (#244 work) + the full page plan + the TODO backlog.

The session focus is **"first looks" and what a first page might look like** —
i.e. the reader's entry experience, which the current page opens with a sticky
`j²` chooser + perspective ring + lens deck. Stopping here to discuss with Dan
what the *first* thing a reader meets should be before changing anything.
</content>
</invoke>
