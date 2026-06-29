---
kind: progress
session: 2026-06-29-S01
date: 2026-06-29
title: Number Planes guide — "first looks" + what a first page should be
branch: claude/number-plane-guide-first-page-zkpnzi
slug: number-plane-guide-first-page-zkpnzi
status: in-progress
build: passed
followup: null
pr: https://github.com/piyarsquare/animath/pull/245
app: docs, argand
signals: needs-dan
next: Get Dan's read on page 1 (number-planes-line.html); then build page 2 (into the plane — addition unchanged, j²=? the one choice).
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

### 🟢 code · 14:10 — Built the "trail deck" viewer + first manipulable widget (probe)
**Why:** Dan: break the trail into pages/slides ("maybe JS… a new kind of document
viewer"), and the figures "have to be manipulable" (drag/type/choose `a`,`b` → live
`a+b`). Built a small reversible probe to react to (RECIPES R2).

New reusable viewer toolkit in `public/` (progressive enhancement, no framework):
- **`guide-deck.js`** — turns `<section class="slide">` blocks into a stepper:
  Back/Next + keyboard (←/→/space/Home/End) + clickable progress dots + swipe, a
  deep-link hash per slide, and a lazy `window.GuideWidgets[key]` mount hook. With
  JS off, `body.deck` is never added → slides render as the old scroll page (free
  fallback).
- **`guide-deck.css`** — deck layout + control bar + the interactive-widget styles
  (skin-aware via the shared tokens).
- **`guide-widgets.js`** — `add-line`: addition as tip-to-tail arrows with
  **draggable arrowheads**, number inputs, and preset chips; live colored
  `a + b = sum`. Trivial arithmetic kept inline on purpose; the plane-and-beyond
  widgets will embed the tested `numberPlanes.ts` engine via `#/embed/` applets.
- **`number-planes-line.html`** rewrapped: 7 slides (`open · add · multiply ·
  forced · tropical · stretchable · field`), the static addition figure swapped
  for the live widget.

**Forward call recorded:** widgets by complexity — vanilla for the line, embedded
React `#/embed/number-planes` (on `numberPlanes.ts`) for the plane onward (DRY +
keeps hard math under test).

> [!CAUTION]
> **R1 caught a real bug.** On a deep-linked slide the heading hid behind the
> sticky bar: the browser's `#fragment` scroll fires as late as the `load` event
> (after our JS re-adds the id), aligning the slide top *under* the bar.
> `scrollRestoration='manual'` + a `load` re-pin weren't enough (timing). Fixed
> timing-independently with `scroll-margin-top: 72px` on `.slide` (+ ids carried
> as `data-sid`). Verified: `h2top` 62–74 now clears `barBottom` 54 on every
> deep-link.

Verified headless (R1): `open / add / forced` + phone (390px) across **Observatory
/ Paper / Phosphor** — deck nav, the widget (`3 + −5 = −2`, drag handles), theming,
and wrapping all hold; `npm run build` green.

> [!NOTE]
> **Verification caveat (R3):** drag *interaction* is verified by the widget's
> logic + static end-state, not by a scripted pointer-drag in headless. The deck
> nav state is trivial (index clamp); not unit-tested as it lives in `public/`
> vanilla JS outside the vitest harness — flagged for extraction+test if the spur
> (post-mark side-step) state machine lands next.

### 🔵 finding · 13:25 — PR #245 up + live preview; Codex P2 (discoverability) deferred to Dan
**Why:** Dan: create/follow a PR and send the live link. Codex then flagged that
page 1 has no inbound link.

- **PR [#245](https://github.com/piyarsquare/animath/pull/245)** opened (base =
  `number-plane-guide`, the stacked base — *not* main). Subscribed for CI/review
  events; one-shot ~1h fallback check-in armed (webhooks miss CI-success/merge).
- **Cloudflare deploy ✅.** Live page (branch preview, auto-updates):
  `https://claude-number-plane-guide-fi.animath.pages.dev/number-planes-line.html`
  (this commit: `https://c73b0bd1.animath.pages.dev/number-planes-line.html`).
- **Codex review P2** (not a bug): page 1 only links *forward* to
  `number-planes.html`; nothing in `guides.html` / the hub links *to* it, so the
  Guides gallery still lands on the old hub. **Deferred to Dan, not acted on** —
  wiring the gallery entry point to the new trail is the exact "where does the
  trail start live / how do pages join" decision Dan reserved for later. Did not
  reply on the PR thread (keeping GitHub chatter minimal).

### 🟢 code · 13:45 — Built page 1 of the trail: `public/number-planes-line.html` (the line)
**Why:** Dan: "build the first page around the Real number line, addition and
multiplication with the open aside to tropical numbers (where lives a postmark)
and finishes with our familiar field over the real numbers (only in passing, or
in boxes that keep definitions)."

New standalone page in the `public/*-guide.html` family, reusing the shared skin
layer (`guide-theme.css` + `guide-skin.js`) — a **reversible probe** that leaves
the existing `number-planes.html` hub intact for later folding-in. Content, in
order:

- **It starts on a line** — a number is something you add *and* multiply; the
  rules look like facts of nature but are *forced*, and the line is where we find
  out by what.
- **Addition is arrowheads** — tip-to-tail arrows (static SVG figure: `3+(−5)=−2`),
  with the two seeds: addition is *undoable*, and it *won't change* in the plane.
- **Multiplication is scale & flip** — SVG of `×(−1.5)` flipping `2`→`−3`; the
  line's only "turn" is a 180° flip *because a line has two directions* (the bridge
  to the plane's circle of directions).
- **Why must (−)(−)=+** — the forcing derivation in a mono block; a **Definition**
  box for *distributivity*; the punch that the line leaves *no* choices (plane
  leaves one).
- **Post-mark → tropical** — first instance of the signpost mechanic (dashed
  `.postmark`): the rules are forced *only if you keep subtraction*; tropical
  (min, +) is the give-up-subtraction world.
- **Stretchable plant** — `.note`: invertible = "stretchable", on the line
  `stretchable = nonzero`, flagged to crack far down the trail.
- **The line, named once** — **Field** kept to a definition box; close sets up the
  jolt: addition comes to the plane unchanged, multiplication opens a choice.
  Forward `.next` card → "Into the plane" (temporarily linked to the existing hub).

Prose-first; static SVG (no applets yet); plane-agnostic accent (no `j²` color —
the choice hasn't happened). **Verified (R1):** `npm run build` green; headless
full-page shots across **Observatory / Paper / Phosphor** + a **390px phone** —
theming, figures, and wrapping all hold.

![Page 1 — the line (Observatory)](assets/np1-line-dark.png)
![Page 1 — the line (Paper)](assets/np1-line-light.png)

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
