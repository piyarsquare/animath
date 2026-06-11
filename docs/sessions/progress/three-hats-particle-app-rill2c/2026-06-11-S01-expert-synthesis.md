---
kind: three-hats
session: 2026-06-11-S01
date: 2026-06-11
title: "Three hats — expand Complex Particles or open a new app: convergence"
branch: claude/three-hats-particle-app-rill2c
slug: three-hats-particle-app-rill2c
status: completed
build: passing
app: complex-particles
---

# Three hats — expand Complex Particles or open a new app: convergence

## Plan under review

<details><summary>Original request</summary>

> Excellent points! Thank you! I would like to continue in this direction. Can
> you tell me, do the hats suggest that we expand complex functions or open a
> new application?

The "direction" is the three-feature design explored earlier in the session:

1. **Simultaneous render layers** — Points/Sheet/Tiles/Net as independent
   toggles instead of exclusive pills.
2. **Multi-function overlay** — f and g drawn over the same domain in one 4D
   space; graph intersections are exactly the solutions of f(z) = g(z); a
   morph slider (1−t)·f + t·g shows zeros migrate.
3. **Pair mode** — plot (f(z), g(z)) on the four axes instead of (z, f(z)):
   equal to the graph of g∘f⁻¹ when f is injective, and the complete
   branch-cut-free multivalued graph when it isn't (z as uniformizer);
   (f, z) gives every library function's full inverse graph for free.

The question: build this into Complex Particles, or as a new catalog app?

</details>

The three expert reports this synthesizes:

- [Framework Maintainer](2026-06-11-S01-expert-maintainer.md)
- [Architecture & Quality Consultant](2026-06-11-S01-expert-consultant.md)
- [Math-Viz & Pedagogy Expert](2026-06-11-S01-expert-pedagogy.md)

## 1 · Points of agreement (high confidence)

**Unanimous: expand Complex Particles. Do not open a new app.** Each hat
reached it from their own ground:

- **Maintainer:** a "Function Pairs" app re-runs the repo's recorded mistake —
  Roots and Multibranch were exactly this kind of same-engine variant app,
  and the project's biggest cleanup was absorbing them back into one viewer.
  Bonus: expansion touches **zero shared registry files** (`apps.ts`,
  `index.tsx`, `catalog.ts`), the safest parallel-branch footprint possible.
- **Consultant:** in the shader, graph/overlay/pair differ in *one line* —
  which two complex values fill the 4-vector (`p4 = vec4(zP, fP)`). A ~95%
  shared surface forked into a second app is a maintenance split with no
  architectural payoff.
- **Pedagogy:** the expensive learner skills — projection slider, eighth
  turns, scaffold reading, domain coloring — are exactly the shared part; a
  gallery boundary would split that investment.

**Unanimous: the special case contains the answer.** Today's graph (z, f(z))
*is* the pair (identity, f), and `functionNames[0]` is already the identity.
Pair mode strictly generalizes the existing picture; you don't put a special
case and its generalization in two catalog entries. Pedagogy frames the same
fact as the strongest teaching move available: "free the first slot."

**Unanimous: the extraction gate has fired.** The maintainer revises his
prior "no extraction before a second consumer" ruling on the record — the
overlay *is* that consumer. The consultant's condition stands: the ~450-line
per-branch orchestration leaves `ComplexParticles.tsx` as a
`createSeriesObjects` engine module **before** overlay ships, validated
against both overlay (more object sets) and pair mode (different coordinate
assignment), with a two-slot `vsCommon` (`uFnA`/`uFnB`, `uMorphT`) so pair
mode becomes pure UI later. Maintainer's discipline applies: the extraction
PR is behavior-identical and screenshot-verified; the consumer lands next.

**Unanimous: sequencing as proposed.** Layers → extraction + two-slot shader
→ overlay (+ morph) → pair mode. Render layers first and independent; both
maintainer and pedagogy add that layers also *supply the channel* the overlay
needs to distinguish functions.

**Shared contracts:** additive persistence fields only (new keys default to
today's behavior — nobody's saved settings move); embed codec evolves
append-only (`render=` comma list, `g=`, `axes=`, `morph=`) and is documented
in `docs/EMBEDS.md` in the same PR; the just-shipped first impression (z²,
Fixed motion, flat brightness) is untouchable.

## 2 · Points of tension (requires discussion)

**T1 — Where does the mode switch live?** Pedagogy wants Trinary-style
**top-bar pills (Graph | Curves)** so the change of meaning is unmissable;
maintainer and consultant both **reject top-bar modes** (Trinary's pills swap
genuinely different workspaces; here nothing diverges but one Subject-tier
control) — the consultant proposes an **"Axes" pill row in the Function
panel** (Graph · Pair · Inverse). The substance is agreed by all three: one
app, one *discrete* control (never a buried checkbox), live axis relabeling
(x/y/u/v → Re f/Im f/Re g/Im g), the top-bar formula always stating what is
plotted, and a per-mode explainer section in the same PR. **Resolution
(2-of-3 + satisfies the third's real requirement):** Subject-tier Axes pills,
no top-bar mode; pedagogy's non-negotiables are met by the relabeling +
formula + explainer, not by the control's location. Flag to the user as the
one presentation decision they may want to overrule.

**T2 — May hue encode function identity?** The session plan proposed
per-function hue tint; pedagogy **vetoes** it with a sharp argument: projected
3D intersections of the two graphs are curves, but the *true* 4D
intersections (the solutions of f = g) are points — the one honest visual
test is "the clouds meet **in matching color**," which works precisely
because color stays a function of z on both graphs. A per-function tint
destroys the test. **Resolution: adopt the veto.** Differentiate f from g by
render layer and/or lightness; color keeps meaning z (or the chosen
quantity); optional explicit zero-of-(f−g) markers do the pointing. This
*revises the session plan* (and the per-sheet tint stays what it is — sheet
identity within one function).

**T3 — How much multivaluedness in pair-mode v1?** Consultant: one slot's
branches only. Pedagogy: single-valued slots entirely, noting the inverse
demo (f, z) needs no branch machinery at all — the parametrization draws all
inverse branches by itself. **Resolution: the stricter (pedagogy's) v1** —
branch controls disabled in pair mode initially; the uniformizer does the
work.

## 3 · Blind spots (no hat addressed)

1. **Naming.** "Pair mode" (session), "Curves" (pedagogy), "Axes" (consultant)
   — one user-facing word must win before any UI lands.
2. **4D rotation semantics in pair mode.** The xu·yv swap that shows f⁻¹ in
   graph mode shows (g, f) — i.e. f∘g⁻¹ vs g∘f⁻¹ — in pair mode. Nobody
   wrote the rotation-panel story for the new axes; the eighth-turn labels
   stay true but their *meaning* needs one explainer paragraph.
3. **Sampling semantics in pair mode.** Reciprocal/adaptive sampling act in
   z; pedagogy disclosed the 1/|f′| density effect but no one decided whether
   the Domain panel's wording ("sample where stretched") needs a pair-mode
   variant.
4. **Phone panel budget.** The Function panel gains a g-picker, Axes pills,
   and possibly a morph slider; the phone sheet height for the Subject tier
   was not re-estimated.

## 4 · Recommended action

One app. Four PRs, in order, each green and screenshot-verified:

1. **Render layers** — exclusive pills → toggles; define the blending /
   depth / renderOrder matrix for all combinations first (maintainer: this is
   *not* free — tiles write depth, net is unpinned); `render=` becomes an
   append-only comma list.
2. **Extraction** — behavior-identical `createSeriesObjects` into
   `lib/particles` + two-slot `vsCommon` with slot A pinned to identity;
   object-set budget (series × branches ≤ 12 sets, replacing bare
   `MAX_SHEETS`); dev uniform-inventory assertion.
3. **Overlay** — "Compare with g" toggle in the Function panel (off = today's
   app exactly); single-valued g in v1; f/g differentiated by layer/lightness,
   **never hue**; morph slider with its disclosures; explainer section in the
   same PR.
4. **Pair mode** — Axes pills (Graph · Pair · Inverse preset); live axis
   relabel + top-bar formula; single-valued slots, branches disabled;
   (f, z), (cos z, sin z), (z², z³) as the explainer's set pieces; numerical
   honesty gains the parametrization-density paragraph.

Phase 2 (each on its own merits): a gallery deep-link card for the pair view
once its explainer matures; multivalued slots; the Hopf-view value
distribution lesson; a true sibling app **only** if the curves side grows its
own instruments (defining equations, curve library) — that, not today's
scope, is the new-app threshold.

## Verdict

**Expand Complex Particles — unanimously.** The new-app option loses on the
repo's own history (the Roots/Multibranch consolidation), on architecture
(a one-line semantic difference), and on pedagogy (shared skill investment).
The one genuine disagreement is presentation (top-bar pills vs Subject-tier
pills) and one design revision is adopted from the pedagogy hat: function
identity must not take the hue channel. The extraction the consultant wanted
and the maintainer deferred is now agreed by both — this direction is its
trigger.

## Self-reflection

1. **What would you do with another session?** Build PR 1 (render layers) —
   it's user-visible, independent, and forces the blending-matrix decision
   that everything later sits on.
2. **What would you change about what you produced?** The expert prompts
   embedded my own per-function-tint idea as part of the plan; pedagogy
   rightly killed it, but a more neutral prompt might have surfaced the
   alternative (lightness/layer) with less anchoring.
3. **What were you not asked that you think is important?** The naming
   decision (blind spot 1) is small but blocks all UI work; it's the user's
   call and should be made before PR 3.
4. **What did we both overlook?** The rotation-semantics story in pair mode
   (blind spot 2) — discovered only while synthesizing the three reports.
5. **What did you find difficult?** Adjudicating T1: pedagogy's top-bar
   argument is about salience, the others' rejection is about precedent
   consistency; the compromise satisfies the stated requirements but the
   user may simply prefer the pills.
6. **What would have made this task easier?** A one-page "UI vocabulary"
   doc stating when something is a mode vs a panel control vs a layout —
   T1 is really a gap in the design spec.
7. **Follow-up value:** **LOW** — three independent reports converged on one
   answer with explicit conditions; what remains is the user's presentation
   choice and the build itself.
