---
kind: progress
session: 2026-06-24-S01
date: 2026-06-24
title: Argand — design & UX review (graphic designer + game designer hats)
branch: claude/argand-plane-review-51egvz
slug: argand-plane-review
status: in-progress
build: unknown
followup: null
pr: null
app: argand
signals: null
next: Run the three-hats review on Argand with the two added lenses (graphic designer · game designer), then synthesize into concrete UX/visual changes.
---

# Argand — design & UX review (graphic designer + game designer hats)

## Session purpose

Work on the **Argand** plane application (`#/argand`), driven by a **three-hats
review** that adds two extra lenses beyond the usual three:

1. **Graphic designer** — is the display clean, and are the concepts well
   articulated *visually*?
2. **Video game designer** — focused on **user experience** / interaction feel.

## Previous session

Argand was built in one prior session
([2026-06-22-S01-argand-app](../../handoff/complex-numbers-animath-intro-jperz6/2026-06-22-S01-argand-app.md),
branch `complex-numbers-animath-intro-jperz6`, status **completed**, build
**passing**). It established the app: the affine map `f(z)=α₁z+α₀` with
Point/Shape/Grid feeds, three number systems via `p=j²`, iteration & fixed
points, "View from z*", quadratics, an immersive plot + bottom control HUD. The
stated next step was **consolidation** (refactor `ArgandPlane.tsx`'s render
branches; smooth the degree-2 Play into a real loop). Open follow-ups noted:
no unit tests for `complexOps.ts`; degree-2 Play wraps rather than loops;
dual/split quadratic fixed points are approximate; a real-device phone pass is
wanted (`phone-needed`).

Relevant backlog items (`docs/sessions/TODO.md`):
- Argand: make the scrubber pay its way (the *arc* is the payload, not the slider).
- Argand: an explainer + tools for complex / dual / split-complex numbers.

## Working notes

### 🟡 milestone · 12:52 — First 3 hats returned (maintainer · consultant · pedagogy)
**Why:** Capture convergences before the two added hats land.

- **Maintainer:** the 3 shipped bugs share one root cause — the app re-implemented
  chrome the framework already provides, worse. Essentials overlap = hand-placed `y` +
  dishonest `estHeight` (framework has `packColumns`); triplicated feed switcher ignores
  that mode pills are the blessed single home; the bottom HUD rests on a false premise
  ("action strip gone in fullscreen" — `actions` survives fullscreen). All fixes stay in
  the app folder, parallel-branch-safe.
- **Consultant:** clean core/boundaries; must-fix = (1) zero tests on `complexOps.ts`
  (~30 named assertions), (2) unbounded domain-colored grid (one `<line>` per segment,
  `reach` grows with pan, rebuilt every `t` tick → clamp to viewport, memoize). Proposed
  a `Scene` discriminated-union factoring *gated on tests first*.
- **Pedagogy:** engine is honest & correct (traced every drawn object to its formula).
  **One real honesty bug:** dual/split quadratic z* computed via a system √ that falls
  back to a linear blend in degenerate regions — two confident gold dots drawn at
  fabricated locations, undisclosed. Default over-teaches (~11 objects before any
  interaction); scrubber doesn't pay its way (legs pre-drawn). Naming: "Argand plane"
  names only the complex case.

### 🔵 finding · 12:40 — Captured real screenshots; spotted layout issues before review
**Why:** Ground every hat in actual pixels, not the description, per RECIPE R1.

Built (green) and shot the app headless in four states (desktop point, grid+domain-color,
quadratic, phone — under `assets/`). Immediate naked-eye findings to feed the review:
- **Default "Essentials" layout panels overlap & clip.** Function / Play / Values are
  stacked at x≈24 with too little vertical spacing — Function's "View from z*" row is
  half-hidden behind Play; Play's footer text is clipped by Values.
- **Persistent hint pill sits dead-center over the diagram** ("drag z · α₁ · α₀ …"),
  obscuring the very picture it describes — on phone it covers the whole figure.
- **Feed switcher is triplicated**: top-bar mode pills + bottom HUD pills + the Input
  panel's Feed pills all set the same `feed` state.
- The actual plot is pushed right and small; domain-colored grid reads as noise.

### 🟣 decision · 12:45 — Dispatching 5-hat three-hats review in parallel
**Why:** User asked for the 3 standard hats + graphic designer + game-designer lenses.

Launching framework-maintainer, architecture-consultant, math-viz/pedagogy, graphic
designer, and video-game/UX designer as parallel agents, each reading the source +
screenshots and writing its own report; then a synthesis.

### 🟣 decision · 12:30 — Session opened; first tracked session on this branch
**Why:** Orienting before any work, per /start-session.

New branch `claude/argand-plane-review-51egvz` (empty handoff folder). Pulled
continuity from the Argand build handoff and the two open Argand backlog items.
Focus is a **design + UX review**, not yet implementation. Next action: run
`/three-hats` on the Argand app with the two added lenses the user specified
(graphic designer, game designer), then bring concrete recommendations back
before changing code.
