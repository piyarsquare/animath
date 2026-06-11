---
kind: plan
session: 2026-06-11-S01
date: 2026-06-11
title: "Plan: render layers, function overlay, and pair mode for Complex Particles"
branch: claude/three-hats-particle-app-rill2c
slug: three-hats-particle-app-rill2c
status: proposed
build: passing
followup: null
pr: null
app: complex-particles
---

# Plan: render layers, function overlay, and pair mode for Complex Particles

A forward-looking implementation plan — the build itself has **not** started.
It distills the second three-hats review
([synthesis](2026-06-11-S01-expert-synthesis.md) ·
[maintainer](2026-06-11-S01-expert-maintainer.md) ·
[consultant](2026-06-11-S01-expert-consultant.md) ·
[pedagogy](2026-06-11-S01-expert-pedagogy.md)) into a concrete, ordered set
of PRs with file-level detail, so any future session can pick it up cold.

## The decision already made

**Expand Complex Particles. Do not open a new app.** Unanimous across the
three hats: a sibling app would re-run the Roots/Multibranch fragmentation
this repo already paid to consolidate; in the shader the three features
differ only in which two complex values fill the 4-vector
(`p4 = vec4(zP, fP)` in `surfacePos`); and the learner's expensive skills
(projection slider, eighth turns, scaffold, domain coloring) are exactly the
shared part. Today's graph **is** the pair `(identity, f)` and identity is
already `functionNames[0]` — the generalization contains the special case.

## The three features

1. **Render layers** — Points / Sheet / Tiles / Net become independent
   toggles instead of exclusive pills (e.g. sheet + net together).
2. **Function overlay** — a second function g drawn over the same domain in
   the same 4D space. The 4D intersections of the two graph surfaces are
   exactly the solutions of `f(z) = g(z)` (2+2=4 → points). A morph slider
   `(1−t)·f + t·g` shows zeros migrate (every intermediate is a genuine
   analytic function — more honest than the projection morphs).
3. **Pair mode** — plot `(f(z), g(z))` on the four axes instead of
   `(z, f(z))`. When f is injective this is the graph of `g∘f⁻¹`; when it
   isn't, it is the *complete, branch-cut-free* multivalued graph — z acts as
   uniformizer, all branches drawn at once, Domain coloring tracks the hidden
   parameter so coincident sheets stay distinguishable. Special case
   `(f, z)`: the full multi-branch inverse graph of every library function,
   free. Set pieces: `(cos z, sin z)` on the quadric cos²+sin²=1; `(z², z³)`
   on the cusp v²=u³.

## Binding constraints (agreed by the hats — do not relitigate casually)

- **Hue never encodes function identity** (pedagogy veto, adopted). The
  honest solution test is "the two clouds meet *in matching color*", which
  works because color stays a function of z on both graphs. Distinguish f
  from g by **render layer and/or lightness**; the per-sheet tint keeps its
  current meaning (sheet identity within one function).
- **Extraction before overlay.** The ~450-line per-branch orchestration in
  `ComplexParticles.tsx` moves into `lib/particles` *before* any second
  function ships (the maintainer's "second consumer" gate has fired, on the
  record). The extraction PR is behavior-identical and screenshot-verified;
  the consumer lands in the following PR.
- **Additive persistence only.** New fields (`renderLayers`,
  `functionIndexB`, `axesMode`, `morphT`, …) default to today's behavior;
  no existing key changes meaning. Embed codec evolves append-only
  (`render=` accepts a comma list; new `g=`, `axes=`, `morph=`), documented
  in `docs/EMBEDS.md` in the same PR that ships each param.
- **The just-shipped first impression is untouchable**: z² landing function,
  Fixed motion, flat brightness, π units / ±2π extents, reciprocal sampling.
- **Object-set budget**: series × branches ≤ 12 object sets (replaces the
  bare `MAX_SHEETS` cap), ≤ 60 draw calls — same ceiling as today.

## Open decisions (the user's — block PR 3/4 UI, not PR 1/2)

> [!IMPORTANT]
> 1. **Name** of the second-space feature: "Pair" / "Curves" / "Axes" — one
>    user-facing word, used in the control, formula, and explainer.
> 2. **Mode-switch placement**: Subject-tier "Axes" pill row in the Function
>    panel (maintainer + consultant) vs top-bar `Graph | Curves` mode pills
>    (pedagogy, for salience). Both satisfy the shared non-negotiables:
>    a *discrete* control, live axis relabeling, top-bar formula stating
>    what is plotted, per-mode explainer. Synthesis default: panel pills.

## PR 1 — Render layers

**Goal:** any combination of Points / Sheet / Tiles / Net at once.

- `useParticleState`: replace `renderMode: RenderMode` with
  `renderLayers: Record<RenderMode, boolean>` (persisted per-field as
  `layerPoints`, `layerSheet`, …). Seed from a persisted legacy `renderMode`
  value if present so nobody's saved mode is lost. Keep a derived
  `renderMode`-like helper only if the shell needs it.
- **Define the blending/depth matrix first** (the maintainer's "not free"
  warning): points = additive, depthWrite off; sheet fill/wire = normal
  blending, depthWrite off; tiles = opaque, depthWrite **on**; net = normal,
  depthWrite off. Assign explicit `renderOrder` to *all* kinds (today only
  points/fill/wire are pinned): tiles 0 (opaque first), points 1, fill 2,
  wire 3, net 4. Verify each pairwise combination headlessly (SEED_LS
  screenshots) before writing the panel UI.
- `applyRenderVisibility()` reads the layer set; the adaptive-sheet
  points-show-through special case becomes a natural consequence.
- Shell Render panel: pills → toggle chips; each enabled layer shows its
  control rows (the merged panel already groups by mode).
- Embeds: `render=points,net` comma list; single values keep meaning.
- Explainer: Render section rewritten for combinations.

**Verify:** build; screenshots of ≥4 combinations; probe-raf still 0.

## PR 2 — Extraction + two-slot shader (behavior-identical)

**Goal:** the engine owns object-set orchestration; the shader can evaluate
two functions; **nothing visible changes**.

- New `lib/particles/createSeriesObjects.ts`: owns geometry-sharing, the five
  material factories, per-series uniform overrides, visibility matrix,
  renderOrder, rebuild and dispose. Sketch (consultant's, validated against
  both overlay and pair mode):

  ```ts
  interface SeriesSpec {
    fnA: number;          // slot A function index (identity = 0 for graphs)
    fnB: number;          // slot B function index
    branch: number;       // branchIndex uniform
    tintHue: number;      // per-sheet tint (existing semantics)
    lightness: number;    // per-series dimming (overlay differentiation)
  }
  createSeriesObjects(scene, geoms, makeUniforms, specs: SeriesSpec[],
                      layers: Record<RenderMode, boolean>): SeriesHandle
  // SeriesHandle: { materials, applyVisibility(), rebuild(specs), dispose() }
  ```

- `vsCommon` gains the second slot: `uFnA` (default 0 = identity), `uFnB`,
  `uMorphT` (default 0); `surfacePos`/main build
  `p4 = vec4(chart(evalA), chart(evalB))` where
  `evalA = applyComplex(zc, uFnA)`, `evalB = mix(applyComplex(zc, uFnB),
  applyComplex(zc, uFnBTarget), uMorphT)` — morphing kept to slot B.
  Color keeps tracking z (Domain) / slot-B value (Range) exactly as today.
- Extend the dev guards: `checkGlslDispatch` already covers the ladder; add a
  uniform-inventory assertion (every material exposes the uniforms the sync
  hooks write — replaces the silent `if (m.uniforms.X)` pattern).
- `ComplexParticles.tsx` shrinks to: state, specs assembly, panel JSX.
- **Verification is the point**: before/after screenshots of Points, Sheet,
  Tiles, Net, multivalued sqrt 2-sheet, torus + scaffold — pixel-comparable;
  probe-raf 0; build green. No new UI.

## PR 3 — Overlay ("Compare with g")

**Goal:** a second function over the same domain; off = today's app exactly.

- Function panel: `Compare with g` checkbox; when on, a second compact
  function Select (single-valued functions only in v1 — filter by
  `MULTIVALUED_INDICES`), plus the **Morph** slider (g → f, `uMorphT`).
- Series assembly: f-series (branches as today) + one g-series; g drawn at
  reduced lightness and/or restricted layers (e.g. f as sheet + g as net
  reads beautifully and needs PR 1). Hue stays z-meaning on both.
- Optional (v1.5, cheap once stable): zero-of-(f−g) markers — CPU root pass
  on the grid (sign changes of f−g cells), drawn as the existing axis-line
  material dots.
- Top-bar formula shows both: `f = z² · g = cos z`.
- Embeds: `g=`, `morph=`. Explainer: "Comparing two functions" section with
  the intersections-are-solutions story and the morph disclosures (zeros can
  escape the sampled box; f→−f passes through 0).

**Verify:** screenshots — z² vs c (roots visible as matching-color meets),
morph sweep stills; draw-call budget respected.

## PR 4 — Pair mode

**Goal:** the four axes become `(Re f, Im f, Re g, Im g)`.

- The mode control (per open decision: default Subject-tier pills
  `Graph · Pair · Inverse`): Graph = slot A pinned identity (today); Pair =
  both slots free; Inverse = preset `(f, z)` (slot B identity) — the full
  multi-branch inverse graph, the feature's best demo.
- **Live axis relabeling**: the axis letters in QuarterTurnControls, the
  orientation-matrix header, and the Drop buttons re-map x/y/u/v →
  Re f/Im f/Re g/Im g (a labels map alongside `AXIS_COLORS`; colors keep
  their hues). Top-bar formula states the pair: `(f, g) = (cos z, sin z)`.
- Branch controls disabled in pair mode v1 (single-valued slots; the
  parametrization draws all inverse branches by itself — no machinery).
- Explainer: a per-mode section — "every analytic identity is a surface";
  the g∘f⁻¹ equivalence and its failure (uniformizer, all branches, color
  remembers z); the 1/|f′| sampling-density disclosure joins the numerical
  honesty section; one paragraph on what the six plane-turns now mean
  (xu·yv swap = (f,g) ↔ (g,f), i.e. g∘f⁻¹ ↔ f∘g⁻¹).
- Embeds: `axes=pair|inverse` (+ existing `fn=`, `g=`).

**Verify:** set-piece screenshots — `(f, z)` for sqrt (two inverse sheets),
`(cos z, sin z)` quadric, `(z², z³)` cusp; Sphere view of a pair.

## Phase 2 (each on its own merits, after the four PRs)

- Gallery deep-link card for the pair view **once its explainer earns it**
  (a card on a stub explainer repeats the stale-doc failure just paid down).
- Multivalued slots in pair mode (branch product spaces).
- The Hopf/Sphere lesson: the Sphere view of (f, g) reads the value
  distribution of g/f.
- A true sibling app **only if** the curves side grows instruments of its own
  (defining equations, curve library) — that is the new-app threshold.

## Risks

| Risk | Mitigation |
|---|---|
| Layer combinations expose blending artifacts | PR 1 defines the matrix first; pairwise screenshots before UI |
| Extraction silently changes a mode | behavior-identical PR with before/after screenshots of all six states |
| Sheet-fill vertex cost doubles with two slots (~18 evals/vertex worst case) | cap sheet resolution on phone; measure before optimizing |
| Function-panel overload (g picker + morph + axes pills) | gate everything behind `Compare with g` / the Axes control; off = today's panel |
| Pair mode confuses axis meaning | relabeling + formula + per-mode explainer land in the same PR, never later |

## Where plans like this live (process note)

This document establishes the convention: forward-looking, app-specific
plans are session reports with **`kind: plan`** in the branch's
`docs/sessions/progress/<slug>/` folder — discovered, rendered, and surfaced
by the control center like any report (`build-sessions.mjs` ranks them after
handoffs; `REPORT_STYLE.md` documents the kind). A plan that gets built
should have its `status:` flipped (proposed → in-progress → completed) and
its `pr:` filled by the executing session.
