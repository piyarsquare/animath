---
kind: three-hats
session: 2026-06-11-S01
date: 2026-06-11
title: Maintainer review — expand Complex Particles or open a new app?
branch: claude/three-hats-particle-app-rill2c
slug: three-hats-particle-app-rill2c
status: completed
build: passing
app: complex-particles
---

# Maintainer review — expand Complex Particles or open a new app?

## Plan under review

<details><summary>Original request</summary>

> "Excellent points! Thank you! I would like to continue in this direction. Can you tell me, do the hats suggest that we expand complex functions or open a new application?"

The "direction" is the three-feature design discussed this session for the
complex-function particle viewer:

1. **Simultaneous render layers** — the Render pills (Points/Sheet/Tiles/Net)
   become independent toggles. Claimed near-free: all five object kinds are
   already built per branch and only `.visible` flips; adaptive Sheet mode
   already draws points+sheet together; the embed `render=` param becomes a
   comma list.
2. **Multi-function overlay** — draw f and g as two graphs over the same
   domain in the same 4D space. `functionType` is already a per-material
   uniform, so this means per-(function, branch) object sets with a
   per-function hue tint (generalizing the just-shipped per-sheet tint).
   Pedagogical hook: the two surfaces generically intersect in isolated
   points = the solutions of f(z) = g(z); plus a morph slider
   (1−t)·f + t·g showing zeros migrate.
3. **Pair mode** — plot (f(z), g(z)) on the four axes instead of (z, f(z)).
   When f is injective this is the graph of g∘f⁻¹; when not, it is the
   complete branch-cut-free multivalued graph (z as uniformizer; Domain
   coloring tracks the hidden parameter). Special case (f, z) = the full
   multi-branch graph of f⁻¹ for the whole function library for free.
   Identities become geometry: (cos z, sin z) lives on cos² + sin² = 1.

Proposed sequencing: (1) render layers; (2) extract the per-branch object
orchestration (~450 lines of `ComplexParticles.tsx`) into `lib/particles` —
the previous review's consultant wanted this and I ruled "not before a second
consumer exists"; multi-function would *be* that second consumer; (3) overlay
mode with per-function tint + morph slider; (4) pair mode as capstone.

**The question to adjudicate:** should this live as an expansion of the
existing Complex Particles app, or as a new app in the catalog (e.g. a
"Function Pairs" / comparison explorer)? Hybrid options (top-bar mode like
Trinary's Observatory|Lab; a new app sharing the engine; layouts) are in
scope. Recommend ONE concrete shape.

</details>

## Executive summary

**Expand Complex Particles. Do not open a new catalog app, and do not split
the app into Trinary-style modes.** This repo already ran the experiment the
"new app" option proposes: Roots and Multibranch were separate viewers over
the same engine and the same function library, and the project's single
largest cleanup was absorbing them back into ComplexParticles. A "Function
Pairs" app would be that mistake re-made with better intentions — same domain
panel, same camera, same color/render/motion inventory, same shaders, same
4D Rotation panel, differing only in which two functions feed the four axes.

The decisive technical observation is that **pair mode is not a sibling
product — it is the generalization that contains the current app.** Today's
viewer plots (z, f(z)); in pair terms that is the pair (identity, f), and
`functionNames[0]` is already the identity (`'linear'`, `applyComplex` case 0
returns `z.clone()`). One abstraction — "an object set plots
(A(z), B(z)) for a chosen branch and tint" — reproduces today's app
(one set, A = id), the overlay (two sets, (id, f) and (id, g)), and pair mode
(one set, (f, g)), plus the inverse-graph trick ((f, id)) as a footnote. You
do not put a special case and its generalization in two different catalog
entries.

On my own prior ruling: I wrote *"do not extract the multi-sheet orchestration
into the engine until a second consumer exists."* I **revise the letter and
keep the spirit**. The spirit was "no speculative abstraction — extract under
pressure from a concrete consumer." The multi-function overlay *is* that
concrete consumer: the moment object sets are keyed by (function, branch)
instead of branch alone, the orchestration must generalize anyway, and
generalizing it in place inside an 850-line component is worse than
generalizing it in `lib/particles`. The trigger I set has fired — not because
a second app appeared, but because a second *axis of multiplicity* did.
Sequencing step 2 is therefore endorsed, with conditions (§4).

What I push back on: "render layers are architecturally near-free" undersells
the blending/depth matrix (§3); the overlay multiplies the material count and
needs an explicit object-set budget (§5); and overlay/pair must be designed
as **one** descriptor abstraction, not two stacked features (§5). Persistence
and embed compatibility are solvable but only if treated as contracts from
commit one (§6).

## 1 · History check: we have run this experiment before

The question "expand or new app?" has a recorded answer in this repository.

- The pre-consolidation state was three near-identical complex viewers
  (ComplexParticles, Roots z^(p/q), Multibranch sqrt/ln). CLAUDE.md's debt
  section opens with the payoff: *"the three near-identical complex viewers
  were consolidated into the `lib/particles` engine + `ParticleViewerShell`
  (Roots and Multibranch are now modes of ComplexParticles)."* Roots was
  exactly a "different subject, same viewer" app — and it was judged
  fragmentation, not focus.
- The costs that motivated the consolidation would all return. A Function
  Pairs app sharing the engine would still need: its own route, registry
  entry, catalog META, gallery preview, EXPLAINER/README, persistence
  namespace, embed route + param table, and — the expensive part — its own
  copy of the shell wiring and the per-set orchestration *or* the extraction
  done anyway. Every future engine change (a new colormap, a render-mode fix,
  a projection tweak) would then need verifying in **two** flagship particle
  viewers. The four-site function-dispatch lockstep problem I flagged last
  review (and which `checkGlslDispatch()` now guards) would gain a fifth
  consumer of the same registries.
- The counter-history also matters: TopologyWalk absorbed `#/mobius` and
  `#/wrap-world`; Trinary absorbed `/trinary-lab` into one entry. The
  catalog's direction of travel is **merge variants, keep entries distinct
  only when the *product* is distinct** (different views, different panels,
  different engine). Function Pairs fails that test on all three counts.

> [!IMPORTANT]
> **Decision frame.** A new app is justified when the workspace differs (its
> `SectionDef`/`ViewDef` inventory), not when the mathematics differs. Pair
> mode changes *what the four axes mean*, which is one Subject-tier control —
> the panels, view window, gestures, projections, and rotation controls are
> identical to the pixel.

## 2 · The hybrid options, examined and rejected

**Trinary-style top-bar modes (Observatory|Lab).** I skimmed `Trinary.tsx`:
it is a thin hash-observing wrapper that swaps **two entirely different
Workspaces** — different panels, different views, a live 3D sandbox vs a
headless ensemble lab, each lazily loaded. That pattern earns its keep when
the chrome diverges. Here nothing diverges: same single `plot` view, same
eight shell panels; the delta is one extra function picker, an axes-mode
pill row, and a morph slider. Hosting that behind mode pills would mean
either two Workspace instances that are 95% identical (re-creating the
pre-consolidation duplication *inside* one folder) or pills that just toggle
a state flag — at which point they are a control pretending to be a mode.
Mode pills also complicate persistence (which mode's `ws:` layout wins?) and
the embed story for no benefit.

**Layouts (`views[id].open`).** Wrong tool. Layouts choose which *windows*
are open (StableMatching's matrix/welfare/lattice are different view nodes).
This feature has one view window; its variation is semantic, not spatial.

**New app sharing the engine.** Covered in §1. One additional operational
note: the parallel-branch discipline makes a new app *cheap to merge* (the
shared files are append-only), so conflict risk is not the argument against
it. The argument is permanent double maintenance and catalog dilution —
merge-day cost ≈ 0, every-day cost > 0.

**The one honest argument for a new app — discoverability — has a cheaper
cure.** The gallery card is the only marketing surface, and "f(z) = g(z) as
surface intersections" buried in a panel will be found by few. But the repo
already owns the cure: the embed/share codec (`docs/EMBEDS.md`) exists
precisely to deep-link configured pedagogical moments, and a future
preconfigured gallery card pointing at the *same* app (a query-carrying hash,
once the share dialog lands) is content, not code. If, after the feature
ships and proves itself, the user wants a second card — that is a
ten-line `catalog.ts` discussion, not an architecture fork. Don't pre-pay it.

## 3 · Step 1, render layers: endorsed, but not "near-free"

The claim "only `.visible` flips" is true for the happy path —
`applyRenderVisibility()` (`ComplexParticles.tsx:386-396`) already drives all
five object arrays from one function, and adaptive Sheet mode already
composes points + sheet. The hidden cost is the **blending/depth matrix**
that the current mutually-exclusive modes never had to define:

- Points are `AdditiveBlending`, `depthWrite: false`, `renderOrder 0`;
  sheet fill/wire are `NormalBlending`, `depthWrite: false`, orders 1/2;
  **tiles are the odd one out with `depthWrite: true`**; net is
  NormalBlending with no pinned order. Combinations like Tiles + Points or
  Net + Sheet have no defined draw order today. Before the pills become
  toggles, write down the order matrix (extend the `renderOrder` pinning to
  all five kinds) — otherwise the first user-reported bug is "tiles eat the
  cloud from some angles."
- The Render panel's conditional rows (`ParticleViewerShell.tsx:405-509`)
  key off a single `renderMode`; with toggles, several mode sections can be
  open at once and the panel's `estHeight: 400` and the `adaptiveOn()`
  coupling (`renderMode === 'Sheet' && sheetAdaptive`) need revisiting.
- Perf: my previous review asked for lazy sheet/tile/net rebuilds gated on
  the active mode. Layers make that *more* necessary, not obsolete — the
  gate becomes "rebuild on first becoming visible," and the rebuild effects
  at `ComplexParticles.tsx:475-507` should skip kinds whose layer is off.
- Persistence and embeds: `renderMode` is a persisted enum and `render=` is
  a published URL param (`docs/EMBEDS.md` URL compatibility contract). Add a
  new persisted field (e.g. `renderLayers`) seeded from the old `renderMode`
  on first read, and keep single-value `render=` parsing forever; the comma
  list is additive. Do not repurpose the old key.

With those four items budgeted, step 1 is a good, independent first PR —
and it is the right *first* step because it forces the visibility/order
matrix to be explicit before the set count multiplies in step 3.

## 4 · Step 2, the extraction: my ruling, revised on the record

Last review I ruled against extracting `rebuildBranchObjects` + the material
factories (now ~450 lines: `makeUniforms` at `ComplexParticles.tsx:206-245`,
five `create*Material` factories, `applyRenderVisibility`,
`rebuildBranchObjects` at 401-448, plus the teardown in `onMount`) because
"there is exactly one consumer, and the engine's history shows extraction
works best after the second consumer exists." The synthesis recorded the
compromise as "extract when the next particle viewer starts."

The overlay satisfies the *spirit* of that trigger, and I'd rather revise the
letter explicitly than have it lawyered. The principle was never "count the
apps"; it was **"let a concrete consumer shape the abstraction."** Feature 3
forces the orchestration to be re-keyed from `branch` to
`(function-spec, branch)` regardless of where the code lives. At that moment
the choice is not "abstract vs don't" — it is "generalize inside an 850-line
component vs generalize in the engine where `createParticleGeometry`,
`createAnimationLoop`, and `useUniformSync` already live." The second option
is plainly better, and the abstraction is shaped by a real consumer landing
in the very next commit, which is everything the original ruling was
protecting.

Conditions:

1. **Extract exactly what step 3 needs, nothing optional.** The module's
   surface should be: a set descriptor (`{ mapA, mapB, branch, hue, … }`
   where a map is `{ functionIndex, p, q, quadCoeffs }`), a
   `rebuildObjectSets(scene, descriptors[])`, the visibility matrix from
   step 1, and the disposal path. No plugin hooks, no render-kind registry,
   no "future viewer" parameters. If pair mode (step 4) needs more, add it
   then.
2. **The extraction PR must be behavior-identical** — same pixels, same
   `materialsRef` tagging protocol (`userData.branch/sheet/net`), same
   uniforms — verifiable with `scripts/shoot.mjs` before/after screenshots.
   It should *shrink* `ComplexParticles.tsx` to a declarer of descriptors,
   which is also the honest fix for the "canonical but no longer simple"
   wording I corrected in CLAUDE.md last session.
3. **Land steps 2 and 3 in the same branch sequence** (separate commits/PRs,
   extraction first), so the abstraction never exists unconsumed on `main`
   for more than a review cycle.

## 5 · Steps 3 + 4: one abstraction, not two features — and a budget

**Design overlay and pair as the same thing.** The plan presents them as
stacked features; the maintainer's version is one descriptor:

```
object set = for z over the domain, plot the 4D point (A(z), B(z))
today      : one set,  A = id (index 0), B = f      — pixel-identical to main
overlay    : two sets, (id, f) and (id, g)          — per-set hue tint
pair mode  : one set,  (f, g)                       — Domain coloring tracks z
inverse    : one set,  (f, id)                      — the library's f⁻¹, free
```

The plan's enabling claim checks out in code: `functionType` is a
per-material uniform (`makeUniforms`, `ComplexParticles.tsx:209`) pushed by a
single effect (lines 141-143), and the per-sheet tint (`uBranchHue`,
`branchHue()` at lines 96-104) is exactly the mechanism a per-set tint
generalizes. The vertex shaders currently compute position from
(z, applyComplex(z)); generalizing to two dispatched evaluations (A then B)
is one shader change covered by the existing `checkGlslDispatch()` guard —
**no new dispatch sites**, which is the constraint I care most about after
the 19-22 silent-identity incident. PlaneTransform is untouched.

Concrete concerns to budget before coding:

- **Material/draw budget.** Today: 5 materials × `branchCount` ≤ 12 → 60
  materials worst case. Two functions, each possibly multivalued, with
  layers on: 5 × 12 × 2 = 120 materials and as many draw calls. Replace
  `MAX_SHEETS` with a **total object-set budget** (sets × branches ≤ 12,
  say) enforced in the same clamping style as the existing
  `branchMin/branchMax` nudging. The additive-brightness artifact I flagged
  for redundant branches returns in overlay form (two additive point clouds
  are brighter where they coincide — which is exactly the f = g locus the
  pedagogy wants to *highlight*, so maybe a feature, but decide on purpose).
- **One domain geometry, shared.** All sets sample the same domain box, so
  the points/sheet/tile/net geometries stay **shared across sets** as they
  are across branches today — only materials multiply. Preserve that; a
  per-set geometry copy would be the real perf cliff.
- **Adaptive sampling must pick a master.** `redistributeAdaptive`'s CPU
  `evalFn` (lines 152-166) redistributes the *shared* geometry by one
  function's |f′|. With two functions (or a morph), density follows whom?
  My previous self-reflection already flagged the CPU/GPU branch
  disagreement; this doubles it. Acceptable v1: density follows f (the
  primary), documented in the explainer; better: max of both stretches.
  Decide explicitly — don't let it be whatever the code happens to do.
- **The morph slider is a real shader feature, not UI sugar.** (1−t)·f + t·g
  needs both evaluations per vertex plus a blend uniform — fine on GPU, but
  it interacts with branches (blend which sheet of f with which sheet of
  g?). V1 should morph principal branches only and say so. The existing
  tween-slot pattern from the fix-it session is the right driver mechanic.
- **Branch UI per set.** `branchPeriod`/`MULTIVALUED_INDICES` gating
  (shipped last session) must apply per function. Keep v1 simple: one branch
  range applied to whichever set's function is multivalued, total budget
  enforced; per-set independent ranges only if a use case demands it.
- **Panel placement stays in the closed vocabulary.** Second function picker
  + axes pills ("Graph (z, f) · Overlay · Pair (f, g)") extend the
  Subject-tier Function panel (`functionPicker`/`variantExtras` props are
  the designed extension surface, `ParticleViewerShell.tsx:46-53`); the
  morph slider can sit there too or in the drive tier. No new archetypes,
  no new icons. The top-bar `topExtra` dropdown gains the second function
  only if it stays compact — otherwise leave g panel-only.

## 6 · Persistence and embed contracts (the part nobody else will check)

This is where "expand" wins decisively over "new app," and also where an
expansion can quietly break users. The rules, stated as commit-zero
requirements:

| Contract | Requirement |
|---|---|
| `ws:complex-particles` layouts | Unchanged — same appId, same window ids; new controls live in existing panels. |
| `animath:v1:complex-particles:*` fields | **Additive only.** New fields: `functionIndexB` (default 0 = `'linear'`, i.e. identity — index 0 already is the identity, no library change needed), `axesMode` (default `'graph'`), `renderLayers` (seeded from old `renderMode`), `morphT`. Existing `functionIndex` keeps meaning "the f in (z, f)". A user's saved state from today must render identically after the upgrade. |
| Embed params (`docs/EMBEDS.md` contract) | `fn=` keeps its meaning; add `fn2=`, `axes=`, comma-list `render=` (single value still parses). Update the URL-compatibility section in the same PR that adds each param. Published embeds must never change their picture. |
| Function registry | Append-only as ever; pair mode adds **zero** functions (identity exists at index 0). |
| Catalog/router | **No edits at all** — the strongest parallel-branch property of the expand option: the work stays inside `src/animations/ComplexParticles/`, `src/lib/particles/`, and `ParticleViewerShell.tsx`, none of which any other in-flight app branch touches (PlaneTransform has its own shaders; the shell has one consumer). |

The blurb in `apps.ts` (line 19) may eventually deserve a refresh to mention
comparison/pair viewing — that is an append-discipline-safe one-line edit,
done last, when the feature is real.

## 7 · Where is the complexity ceiling?

ComplexParticles is the most complex app and this plan adds to it — the
fair question is when expansion stops being consolidation and starts being a
god-app. My answer, as the person who maintains it:

- The ceiling is the **shell's panel inventory**, not the math. As long as
  the feature set fits the existing eight panels plus the designed extension
  props, the app is one product. The day a variant needs its *own* panel
  inventory or a second view window with different semantics, that is the
  Trinary signal — split into modes or apps then.
- The extraction (step 2) *lowers* the app below today's line count: the
  orchestration leaves, descriptors arrive. Post-plan `ComplexParticles.tsx`
  should be smaller than the 850 lines on disk now. If it isn't, the
  abstraction was cut wrong — treat that as a review gate.
- Scope discipline within the plan: resist the adjacent temptations
  (per-set domains, three-function overlays, function arithmetic beyond the
  morph). Two maps and one t-slider cover every pedagogical example cited.
  Anything more waits for a user.

## Verdict

**Recommended shape: expand Complex Particles — one app, one workspace, no
new route, no top-bar modes.** Pair/overlay enter as Subject-tier controls
(second function picker + "Graph · Overlay · Pair" pills + morph slider) on
the existing Function panel; today's behavior is the default and the
degenerate case (one set, A = identity).

**Endorsed:**

- The sequencing 1 → 2 → 3 → 4, with 3 and 4 designed as one
  descriptor abstraction (§5) rather than stacked features.
- The extraction at step 2 — my prior "not before a second consumer" ruling
  is hereby revised in letter, kept in spirit: the overlay is the concrete
  consumer, and generalizing in `lib/particles` beats generalizing inside
  the component. Conditions: minimal surface, behavior-identical extraction
  PR verified by screenshots, consumer lands the next commit.
- The pedagogical framing (f = g as intersections; (f, z) as the universal
  inverse) — it composes with everything that shipped last session (sheet
  tint, branch gating, period caps) instead of replacing it.

**Concerns, prioritized:**

| # | Priority | Item |
|---|---|---|
| 1 | High | Define the blending/depth/renderOrder matrix for layer combinations before making the pills toggles; pin orders for tiles and net (§3) |
| 2 | High | Persistence + embed contracts written into commit zero: additive fields, `renderMode`→`renderLayers` seeding, `render=` single-value back-compat, `fn2=`/`axes=` documented in `docs/EMBEDS.md` the same PR (§6) |
| 3 | High | Total object-set budget (sets × branches), replacing the bare `MAX_SHEETS`, with UI clamps in the existing nudging style (§5) |
| 4 | Medium | Adaptive-density master function decided and documented; morph restricted to principal branches in v1 (§5) |
| 5 | Medium | Lazy geometry rebuilds gated on layer visibility — the deferred item from my last review becomes load-bearing under layers (§3) |
| 6 | Low | Explainer/README updated per feature step (the last review's "docs lie" finding must not recur); blurb refresh last |

**What I would change about the plan:** collapse steps 3 and 4 at the design
level (one set-descriptor abstraction, two thin UI surfaces) even if the UI
ships in two PRs; and drop any notion of presenting the result as a separate
"mode" — it is a control. If discoverability later demands a dedicated
gallery presence, solve it with a preconfigured deep-link card to the same
app, not a second codebase.

## Self-reflection

1. **What would you do with another session?** Prototype the set-descriptor
   type and the step-2 extraction boundary against the real file — the §5
   sketch is derived from reading `makeUniforms`/`rebuildBranchObjects`, and
   an hour of actually moving the code would confirm whether the
   shell-owned spin/ambient state or the embed apply-once effects snag the
   boundary anywhere I didn't see.
2. **What would you change about what you produced?** I asserted that
   sharing one domain geometry across sets keeps the perf cliff away, but I
   did not measure 120-material draw cost on the phone tier the earlier perf
   pass targeted; the budget number (sets × branches ≤ 12) is a judgment
   call, not a measurement.
3. **What were you not asked that you think is important?** Whether the
   morph slider's persisted `morphT` should persist at all — a half-morphed
   landing state on next visit may confuse more than it teaches. I'd default
   it to transient (key = null) and let the user argue for persistence.
4. **What did we both overlook?** The gallery preview (`previews.tsx`
   'particles' kind) and the `embed-demo.html` reference page — neither
   knows about layers or pairs; both will keep working (defaults are the
   degenerate case), but if the feature is the new headline, the preview
   card sells the old product.
5. **What did you find difficult?** Revising my own "second consumer" ruling
   without weakening it into "extract whenever convenient." The line I
   landed on — the trigger is a concrete consumer forcing the
   generalization, app-count irrelevant — is more honest than the original
   wording, but it took care to state it so it can't justify speculative
   extraction next time.
6. **What would have made this task easier?** A one-paragraph product note
   in the session log on *who* the overlay/pair features are for (course
   embeds? gallery visitors?) — the discoverability question (§2) is the
   only place the new-app option scores, and its weight depends entirely on
   that answer.
7. **Follow-up value:** **MEDIUM** — the recommendation is firm and grounded
   in the repo's own history, but the object-set budget and the extraction
   boundary deserve a prototyping pass before the plan is locked.
