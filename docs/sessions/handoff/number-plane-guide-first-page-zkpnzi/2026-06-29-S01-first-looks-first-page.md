---
kind: handoff
session: 2026-06-29-S01
date: 2026-06-29
title: Number Planes — trail page 1, note-card notebook, and the Number Plane app
branch: claude/number-plane-guide-first-page-zkpnzi
slug: number-plane-guide-first-page-zkpnzi
status: completed
build: passed
followup: null
pr: https://github.com/piyarsquare/animath/pull/245
app: number-plane, argand, docs
signals: phone-needed
next: Dan drives the "unfolding" — turn the 35-card pile + Number Plane app into the living-notebook presentation (design explored separately with Claude design).
---

# Number Planes — trail page 1, note-card notebook, and the Number Plane app

## Summary

A marathon session in three acts. **Act 1:** built page 1 of the Number Planes
trail (`public/number-planes-line.html`) as a stepper "deck" with a live a+b
widget, plus a reusable guide-deck toolkit. **Act 2:** pivoted content into an
atomic **note-card system** (`public/number-planes/cards/` — 35 cards, typed
links, core-concept hubs, an inspector with list/graph views, an integrity
checker). **Act 3:** built a full new gallery app **Number Plane**
(`#/number-plane`) — three plots (j² = −p, 0, +p) rendering the same expression
under each plane's multiplication — then grew it through ~8 feedback rounds and
banked a long math discussion (fan/rails/ideals, cone slices, Cayley–Klein,
non-Hausdorff stickiness, Sylvester inertia) as cards. Everything is committed
on PR #245 (base: `number-plane-guide`, NOT main); build green at `bdf4855`.

## What changed

**The Number Plane app** (`src/animations/NumberPlane/`, registered append-only
in `index.tsx`/`apps.ts`/`catalog.ts` + CLAUDE.md/README rows):

- Three SVG plots at `j² = −p, 0, +p`; expressions `α₁z + α₀` and
  `α₂z² + α₁z + α₀` (unified coefficient names; draggable handles shared across
  plots). `|z| = r` level sets are a **Marks overlay** (not an expression), with
  labels and the dashed null set.
- Feeds: **Point** (draggable z, labeled image, dotted flow arc), **Shape**
  (○□△, draggable center, per-segment colormap showing point correspondence),
  **Grid**, **Rays** (the fan of 12 lines through 0, per-blade colormap).
- **The dial**: one p slider; outer plots ride ±p, dual holds still. **Play/t**:
  source→image morph along the multiplicative flow `z·αᵗ` (engine `powReal`;
  honest straight-blend fallback on the null domain). **Iterate** (1–14):
  point orbits go spiral·shear·saddle; the Rays fan **stirs·creeps·snaps**.
- **Align frame to rails** slider (change-of-basis onto the asymptotes; complex
  deliberately doesn't move); **The cone** view (isometric z²=x²+y², knife
  z=ax+c, tilt slider, p = a²−1 readout); shared zoom/pan window (wheel/drag;
  touch: one finger = handles only, two fingers = pan+zoom); colormap sampling
  clamped to background-contrast range; phone layout stacks the three plots
  vertically, all visible.
- First consumer of the previously-dormant `Argand/numberPlanes.ts` engine.

**The notebook** (`public/number-planes/cards/` — 35 cards):

- Format: Markdown + YAML, layered `glance`/`## note`/`## full`, typed links
  (`gathers`/`leans-on`/`opens`/`same-as`/`contrasts`/`used-for`), figures with
  `href` (and `status: proposed` for unbuilt views). Voice locked: plain,
  example-first, terse; no autobiographical "I".
- **Core-concept hubs** C1/C2/C3 gather the fine cards (Dan's grain: "the unit
  is the core concept — don't be precious").
- Inspector `cards/index.html`: sidebar by kind, card detail with both-direction
  links, force-directed **graph view** (edges colored by type), figure links.
- `scripts/check-cards.mjs`: manifest-drift + dangling-reference checker (green).
- Discussion-born cards this session: CN (cone slices; why lines-not-parabolas),
  CK (Cayley–Klein 4-quadrants+4-rays+origin picture), PT (p-trace: fix z, vary
  p — horizontal lines, collinear f(z) dots), NH (non-Hausdorff sticky middles),
  IN (Sylvester inertia as the master theorem).

**The trail page** (`public/number-planes-line.html` + `guide-deck.{js,css}` +
`guide-widgets.js`): 7-slide stepper (keyboard/swipe/dots/deep-links, no-JS
scroll fallback) with the draggable a+b number-line widget.

**Process artifacts:** three-hats review of the card-taxonomy plan (all three
reports + synthesis in `progress/<slug>/`); voice/tone direction; the
"discussion → connection → card" method Dan named as the notebook's pipeline.

## Key files

| File | Role |
|---|---|
| [`src/animations/NumberPlane/NumberPlane.tsx`](https://github.com/piyarsquare/animath/blob/bdf485502c9fb087061fbc38f072ecb5eb3063bc/src/animations/NumberPlane/NumberPlane.tsx) | The whole app (~700 lines): PlanePlot, ConeView, flows, gestures, sections |
| [`src/animations/Argand/numberPlanes.ts`](https://github.com/piyarsquare/animath/blob/bdf485502c9fb087061fbc38f072ecb5eb3063bc/src/animations/Argand/numberPlanes.ts) | The engine (mul/affine/powReal/kindOf) — now live, 50 tests |
| [`public/number-planes/cards/`](https://github.com/piyarsquare/animath/tree/bdf485502c9fb087061fbc38f072ecb5eb3063bc/public/number-planes/cards) | 35 cards + README (format/voice/taxonomy) + inspector (`index.html`) + `manifest.json` |
| [`scripts/check-cards.mjs`](https://github.com/piyarsquare/animath/blob/bdf485502c9fb087061fbc38f072ecb5eb3063bc/scripts/check-cards.mjs) | Card integrity checker — run after any card edit |
| [`public/number-planes-line.html`](https://github.com/piyarsquare/animath/blob/bdf485502c9fb087061fbc38f072ecb5eb3063bc/public/number-planes-line.html) | Trail page 1 (deck of 7 slides, a+b widget) |
| [`public/guide-deck.js`](https://github.com/piyarsquare/animath/blob/bdf485502c9fb087061fbc38f072ecb5eb3063bc/public/guide-deck.js) | Reusable stepper (progressive enhancement, `data-sid` slides) |
| [`docs/sessions/progress/number-plane-guide-first-page-zkpnzi/2026-06-29-S01-first-looks-first-page.md`](https://github.com/piyarsquare/animath/blob/bdf485502c9fb087061fbc38f072ecb5eb3063bc/docs/sessions/progress/number-plane-guide-first-page-zkpnzi/2026-06-29-S01-first-looks-first-page.md) | Full session timeline (every decision + why) |

## Open / not done

- **The unfolding.** The pile (35 cards, app, trail page) is quarried; the
  presentation — Dan's "living notebook" (glowing orbs → note → portal,
  reader-orderable) — is the open design problem, being explored separately
  with a design agent. Content-side prerequisites are in place.
- **Proposed views marked on cards, not built:** the p-trace overlay (PT), the
  curvature/Möbius mode (CK/NH — would replace the expression grammar with
  `(az+b)/(cz+d)`), a Heisenberg "addition with memory" widget (discussion
  only).
- **Trail pages 2+** (into the plane; the choice) not written; page 1's forward
  link still points at the old `number-planes.html` hub (Codex P2 about gallery
  discoverability deliberately deferred — it's the "how do pages join" call).
- **Cards have no consumer** beyond the inspector; the deck (page 1) doesn't
  read them yet.
- **PR #245 is open** against `number-plane-guide` (stacked). Merging that base
  branch's own PR (#244) is a separate decision. 35 commits on this branch.

> [!CAUTION]
> This branch is **stacked on `number-plane-guide`** — never sync it against
> `main` (CLAUDE.md → Branch sync). Cloudflare previews:
> `https://claude-number-plane-guide-fi.animath.pages.dev` (app at
> `/#/number-plane`, cards at `/number-planes/cards/`, page 1 at
> `/number-planes-line.html`).

> [!IMPORTANT]
> Working method Dan locked in: **discussion → connection → card (+ proposed
> view marked on the card)**. Keep text simple and idea-first; the unit is the
> core concept; don't re-atomize by ontology (three-hats verdict: atomize on
> reuse only). Voice: plain, terse, example-first, reasoning-"we", never
> autobiographical "I" (McPhee/Korzybski/braver-Bryson).

## Context

- Names settled: **Number Planes** (family), **p-plane** (generic); literature
  aliases kept in cards (generalized complex ℂ_p, Harkin & Harkin 2004; Yaglom).
- Math threads banked in cards, verified in-app where possible: rails = ideals =
  common eigenvectors (fan shuffle, Rays feed); iterated fan stirs/creeps/snaps;
  knife tilt = dial (p = a²−1, cone view); level sets can't be parabolas
  (norms are centered; the parabola has no center); sticky middles everywhere =
  sign-of-rescalable-invariant moduli (NH); the 3×3 Cayley–Klein table as
  4 quadrants + 4 rays + origin, number planes = the κ=0 axis; curvature breaks
  addition (parallelogram gap = κ·area; sphere has no group by hairy-ball);
  Sylvester inertia unifies all of it (IN).
- Flagged-uncertain (verify before hard-citing): Bacry–Lévy-Leblond kinematics
  mapping; P¹ closures sphere/cylinder/torus (dual case medium-confidence).
- The old hub `number-planes.html` + themed `guides.html` from PR #244 are
  intact underneath; page 1 was built beside them, and the card system beside
  both — all reversible layers.

## Self-reflection

1. **What would you do with another session?** Build the p-trace overlay (PT's
   proposed figure) — it's small, the math is checked, and it would make the
   three plots visibly samples of one curve. Then a first "unfolding" probe:
   render one core card (C2) as a real page that embeds the app views inline,
   to give the design exploration something concrete to react to.
2. **What would you change about what you produced?** The app component is ~700
   lines in one file; PlanePlot/ConeView/flows should split into modules with
   the flow math unit-tested (R4 — `flowAt`/`railMatrix`/`levelSet` are pure and
   test-free). The card graph's force layout gets hairball-ish at 35 nodes.
3. **What were you not asked that you think is important?** The trail page and
   the card system are now two parallel content systems with no bridge; before
   page 2 is written, decide whether pages are *views over cards* (my
   recommendation) or separate prose.
4. **What did we both overlook?** Accessibility of the app (no keyboard
   alternative to dragging handles; colormap-only encodings on the orbit).
   Also `number-plane:expr` localStorage keys were churned twice (`expr2`,
   value guards) — stale-state migration needs a convention.
5. **What did you find difficult?** Voice calibration (two rejected registers
   before "very few words"); and keeping build-verify-commit discipline while
   discussion moved faster than the artifacts.
6. **What would have made this task easier?** A pointer-gesture test harness —
   drag/pinch behavior was repeatedly shipped on logic + static frames only.
7. **How did you verify this, and does each passing check test the user-visible
   claim?** `npm run build` green (last at `bdf4855`); headless screenshots for
   every visual change (orbit trio, rails alignment, cone branches, phone
   stack at 390×844, colormap contrast on dark+light skins) — read and checked
   against intent, not just captured; `scripts/check-cards.mjs` green (35
   cards). Proxies: touch feel (pinch, one-finger drag radius) is
   logic-verified only — `signals: phone-needed`; card *content* correctness is
   my mathematics, reviewed in-discussion but not externally checked (the two
   flagged-uncertain items are named in Context).
8. **Follow-up value:** MEDIUM — the artifacts are complete and green, but the
   unfolding (the actual notebook presentation) is unstarted and is the point
   of the whole pile; the proposed views and page 2 are ready next steps.
