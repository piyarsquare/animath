---
kind: three-hats
session: 2026-06-11-S01
date: 2026-06-11
title: Consultant review — expand Complex Particles or open a new app?
branch: claude/three-hats-particle-app-rill2c
slug: three-hats-particle-app-rill2c
status: completed
build: passing
app: complex-particles
---

# Consultant review — expand Complex Particles or open a new app?

## Plan under review

<details><summary>Original request</summary>

"Excellent points! Thank you! I would like to continue in this direction. Can you tell me, do the hats suggest that we expand complex functions or open a new application?"

**The direction being continued** (from this session's design discussion) is three
features for the complex-function particle viewer:

1. **Simultaneous render layers** — the Render pills (Points/Sheet/Tiles/Net)
   become independent toggles. Near-free architecturally: all five object kinds
   are already built per branch and only `.visible` is flipped; adaptive Sheet
   mode already draws points + sheet together; the embed `render=` param becomes
   a comma list.
2. **Multi-function overlay** — draw f and g as two graphs over the same domain
   in the same 4D space, with per-function hue tint (generalizing the just-shipped
   per-sheet tint) and a morph slider (1−t)·f + t·g. Pedagogical hook: the two
   surfaces generically intersect exactly at the solutions of f(z) = g(z).
3. **Pair mode** — plot (f(z), g(z)) on the four axes instead of (z, f(z)). When
   f is injective this is the graph of g∘f⁻¹; when not, it is the branch-cut-free
   multivalued graph (z as uniformizer). Special case (f, z) = the multivalued
   graph of f⁻¹ for the whole function library; identities become geometry
   ((cos z, sin z) lives on cos² + sin² = 1).

Proposed sequencing: (1) render layers; (2) extract the ~450-line per-branch
object orchestration into `lib/particles` — multi-function being the "second
consumer" the maintainer's earlier ruling required; (3) overlay + tint + morph;
(4) pair mode as capstone. **The question to adjudicate: does this live as an
expansion of Complex Particles, or as a new catalog app?**

</details>

This is the architecture/quality leg of the three-hats adjudication. Grounded in
the code as it stands on this branch (post-fix-it session: lifecycle cleanup,
branch gating + `branchPeriod` caps + per-sheet tint, `checkGlslDispatch`,
`topExtra` function picker, merged Render panel — all verified in
`ComplexParticles.tsx`, `shaders/index.ts`, `ParticleViewerShell.tsx`,
`lib/particles/`, `lib/embedParams.ts`).

## Executive summary

**Expand the existing app. Do not open a new catalog entry, and do not split it
into top-bar modes.** The three features are not a new product — they are the
*closure* of the abstraction Complex Particles already implements. The decisive
technical fact: in the shader, the entire difference between "graph mode,"
"overlay," and "pair mode" is **which two complex values fill the 4-vector**
(`surfacePos`: `p4 = vec4(zP, fP)`, `shaders/index.ts:422`). Identity is already
function index 0 in the dispatch, so graph mode *is* pair mode with slot A pinned
to identity. A viewer that hard-forks on that one line into a second app would be
re-creating the Roots/Multibranch split this repo already paid to consolidate —
the strongest precedent available, and it points one way.

But I endorse expansion **conditionally**, on two structural commitments:

1. **The extraction (step 2) happens before overlay ships, and its interface is
   designed against pair mode too** — not just overlay. Overlay and pair mode
   want *different* generalizations (overlay = more object sets; pair = a
   different coordinate assignment inside one object set). An extraction shaped
   only by overlay would need a second refactor for pair mode. Designed against
   both, one interface (a small **series model** + a **two-slot shader**) covers
   all four modes including today's.
2. **The three features stay orthogonal in state and UI.** Layers answer "what
   is drawn" (Render tier), series count answers "how many graphs" (Subject
   tier), coordinate assignment answers "what space we're in" (Subject/Domain
   tier). The moment "Pair" appears as a fifth Render pill, the design has
   conflated marks with semantics and the panel inventory stops scaling.

On my previous report's one open tension (T1, extract-now vs extract-at-second-
consumer): the maintainer's trigger condition has now been *met on its own
terms*. Multi-function is a second consumer of the per-branch orchestration —
not a second app, but a second *shape of demand* on the same code, which is what
the trigger was actually protecting against guessing wrong. My position is
unchanged; the maintainer's gate opens.

## 1 · Pattern recognition: what these three features actually are

The plan describes three features. Structurally there are only two mechanisms,
and both are well-known patterns from plotting libraries:

| Feature | Underlying mechanism | Known pattern |
|---|---|---|
| Render layers | A *set* of visible object kinds per series, instead of an enum | Layer toggles (every charting lib: marks are composable, not exclusive) |
| Multi-function overlay | N series over one domain, each with its own expression + tint | The **series/trace model** (Plotly traces, d3 series, Observable Plot marks) |
| Pair mode | Which expressions feed the coordinate axes | **Generalized coordinate assignment** — `(a₁,a₂,a₃,a₄) = chart picks from {z, f, g}` |
| Morph slider | A parameterized expression `mix(f, g, t)` | Expression composition, not a new mode |

Two observations the plan should absorb:

**(a) "Two functions" is the honest N.** The series model generalizes to N
functions, and the temptation will arise. Resist it in the UI (two pickers, not
a list editor) but *don't preclude it in the engine type* — an array
`series: SeriesSpec[]` costs nothing over a pair and keeps the interface from
encoding today's UI limit as an engine limit. The existing
`branchHue`/`MAX_SHEETS` machinery is already an N-series model in disguise
(N = sheets); functions just add a second index to the same fan-out.

**(b) Pair mode is not a sibling of overlay — it is a *parent* of graph mode.**
With a two-slot shader (slots A and B, each an expression over z), the modes
form a lattice:

```
coordinate assignment:   A = z (identity, fn index 0),  B = f      → today's graph
                         A = z, B = mix(f, g, t)                   → morph
                         A = f, B = g                              → pair
                         A = f, B = z                              → inverse graph (free)
series count:            one series per (slot-config, branch)      → overlay = 2 series
layer set:               {points, fill, wire, tiles, net} ⊆ shown  → render layers
```

Three orthogonal axes. The plan's sequencing respects this (layers first,
independent; then series; then assignment) — good. The risk is the UI collapsing
them into one "mode" concept; see §5.

## 2 · The adjudication: four shapes, one winner

| Shape | What it means | Verdict |
|---|---|---|
| **A. Expand Complex Particles** | New Subject-tier controls (second function, axes assignment), layers in Render, one appId, one persistence namespace | **Recommended** — see below |
| B. New app ("Function Pairs") | New folder + route + catalog entry sharing `lib/particles` | Rejected: re-runs the Roots/Multibranch mistake |
| C. Top-bar modes (Trinary pattern) | One entry, two Workspaces swapped by hash/pills | Rejected: the Trinary pattern is for *divergent workspaces*; this is one workspace |
| D. Layouts (StableMatching pattern) | Pair/overlay as layout presets | Rejected as the *primary* shape; useful as a garnish |

**Why not B (new app).** A "Function Pairs" app would share: the engine hooks,
the shell, all eight panels, the gesture system, the shaders (verbatim — the
two-slot generalization serves both), the function registry, the embed codec,
and the per-branch orchestration. It would differ in: one coordinate-assignment
uniform and one extra picker. That is a ~95% shared surface — precisely the
profile of the three viewers that were consolidated *into* this app (CLAUDE.md:
"absorbs the former Roots z^(p/q) and Multibranch sqrt/ln modes as variants").
The repo has empirical history here, not just taste: separate apps per
function-viewing variant were tried and reversed. A new app also forks the
persistence namespace (users' settings don't follow them), doubles the embed
route surface, and adds a permanent catalog-maintenance obligation for what is,
mathematically, a *generalization* rather than a different subject. The
parallel-branch workflow makes new apps cheap to *add* — it does not make them
cheap to *own*.

**Why not C (mode pills).** Trinary's Observatory|Lab earns its split because
the two views share almost nothing: different engines (live 3D sandbox vs
headless ensemble), different panel inventories, different view windows, two
separate `<Workspace>` mounts with separate persistence (`Trinary.tsx` swaps
whole lazy-loaded components). Overlay/pair share *everything*: same canvas,
same camera, same panels, same materials. Mounting two Workspaces would
duplicate window-layout persistence for no benefit, and a mode pill that merely
flips one uniform misrepresents the size of the change to the user. Mode pills
are for "different rooms"; this is "different furniture arrangement."

**Why not D (layouts as the mechanism).** `LayoutDef.views[id].open` hides
*views*; this app has one view. Layouts can't carry semantic state (which
function feeds which axis) without abusing the layout system as a settings
store. However — once pair mode exists, a built-in layout ("Pair explorer":
Function + Domain + 4D Rotation open) is a nice cheap affordance. Garnish, not
structure.

**Why A wins on its own merits**, not just by elimination:

- **Persistence is migration-free.** Per-field keys
  (`animath:v1:complex-particles:<field>`) mean adding `functionIndexG`,
  `coordA`, `coordB`, `morphT`, `layerPoints…` costs nothing and *changes
  nothing* for existing users — graph mode is the default of every new field.
  A new app gets none of this continuity.
- **The embed codec is forward-compatible by construction.** `parseParticleEmbed`
  ignores unknown params; appending `g=`, `axes=`, `morph=`, and widening
  `render=` to a comma list keeps every published URL valid (the
  docs/EMBEDS.md compatibility contract added last session covers exactly this).
- **Discoverability** (the one real argument for a new card) is solvable inside
  shape A: the gallery card's blurb can grow, and if the feature proves worth a
  card, a second catalog entry can deep-link into the same app with a preset —
  reversible, zero code fork. Don't pre-pay for it.

## 3 · Architecture sketch

### 3.1 State: where multi-function lives

Function identity already lives in the **app**, not the engine
(`functionIndex`, `expP/Q`, `quad*` are `usePersistentState` fields in
`ComplexParticles.tsx:76–109`, not in `useParticleState`). That boundary is
correct and should be kept: the engine knows "expression slots exist"; only the
app knows the function registry. Concretely, replace the loose fields with one
typed unit, still in the app:

```ts
// App-side. One per slot; slot G is optional (overlay/pair off → undefined).
interface FnSlot {
  fnIndex: number;                  // index into functionNames (0 = identity)
  p: number; q: number;             // z^(p/q) params
  quad: [Complex2, Complex2, Complex2];
}
type CoordSource = 'z' | 'f' | 'g' | 'morph';
// Persisted (append-only fields, defaults reproduce today's app):
//   slotF (the existing fields, unchanged keys), slotG?: FnSlot,
//   coordA: CoordSource = 'z', coordB: CoordSource = 'f',
//   morphT: number = 0, fnTint: boolean = true,
//   layers: { points, sheetFill, sheetWire, tiles, net } booleans
//     (seeded once from the legacy renderMode key — see §3.5)
```

Don't push this into `useParticleState` — that hook is already a 75-key flat
object (my previous §5.1); function slots are app vocabulary. The engine
receives them only as uniform values.

### 3.2 The extracted engine module (`lib/particles/createSeriesObjects.ts`)

This is the step-2 extraction, and the interface must be validated against both
overlay *and* pair mode. The shape that survives both:

```ts
/** One drawable series: a (coordinate-pair, branch) combination. */
export interface SeriesSpec {
  /** Opaque uniform overrides for this series — the app's function dispatch
   *  (uFnA/uFnB indices, params, branch indices, hue). The engine never
   *  interprets them; it spreads them into each material. */
  uniforms: Record<string, THREE.IUniform>;
  /** Tag mirrored onto material.userData for targeted sync (replaces the
   *  stringly branch tag). */
  key: { fn: number; branch: number };
}

export interface SeriesObjectsOpts {
  geoms: { points; sheetFill; sheetWire; tiles; net };   // shared, app-owned
  shaders: { points; sheetFill; sheetWire; tiles; net }; // app-supplied GLSL
  baseUniforms: () => Record<string, THREE.IUniform>;    // makeUniforms, fresh per material
  series: SeriesSpec[];
  layers: LayerSet;                                      // visibility matrix input
}

export interface SeriesObjects {
  rebuild(series: SeriesSpec[]): void;     // dispose + recreate (branch/fn count change)
  setLayers(layers: LayerSet): void;       // visibility only, no rebuild
  forEachMaterial(fn: (m, key) => void): void;  // typed replacement for materialsRef sweeps
  materials: THREE.ShaderMaterial[];       // fed to materialsRef for useUniformSync/loop
  dispose(): void;                         // full teardown (the onMount cleanup shrinks to this)
}
export function createSeriesObjects(scene: THREE.Scene, opts: SeriesObjectsOpts): SeriesObjects;
```

Why this survives both features: **overlay** is `series = fns × branches` —
more entries, same machinery (today's `rebuildBranchObjects` is the
`fns.length === 1` case). **Pair mode** is *not* more series — it is different
`uniforms` per series (`uCoordA/uCoordB` values) — so it flows through without
touching the engine at all. The blending/renderOrder/`userData.sheet` rules and
the visibility matrix (`applyRenderVisibility`) move inside; the
`useUniformSync` blending toggle keeps working because the tags ride along.
The app's `onMount` shrinks to: build geometries, `createSeriesObjects`, axes,
scaffold, loop — and its cleanup to `seriesObjects.dispose()` plus the
non-series items. Estimated: app drops from ~850 to ~450 lines; the engine
gains ~250 well-bounded ones.

### 3.3 The two-slot shader (the load-bearing GLSL change)

One change to `vsCommon`, made once, serving morph and pair together:

```glsl
// Slot-parameter uniforms, duplicated per slot (A defaults to identity):
uniform int uFnA;  uniform int uFnB;            // function indices (0 = z)
uniform int uBranchA; uniform int uBranchB;     // per-slot branch
// (p/q + quad params likewise per slot, or shared if the UI restricts)
uniform int uCoordA; uniform int uCoordB;       // 0=z 1=F 2=G 3=morph
uniform float uMorphT;

vec2 evalSlot(vec2 zc, int which){               // F or G dispatch
  ...applyComplex(zc, which==0 ? uFnA : uFnB, branch…);
}
vec2 coordValue(vec2 zc, int sel){
  if(sel==0) return zc;
  if(sel==1) return evalSlot(zc, 0);
  if(sel==2) return evalSlot(zc, 1);
  return mix(evalSlot(zc,0), evalSlot(zc,1), uMorphT);   // morph
}
// surfacePos: p4 = vec4(chartCoord(coordValue(zc,uCoordA), uInCoord),
//                       chartCoord(coordValue(zc,uCoordB), uOutCoord));
```

Notes: `applyComplex` currently reads the global `branchIndex`/`exponentP/Q`
uniforms directly (e.g. `complexPowRational` at `shaders/index.ts:194`) — those
references must be parameterized as part of this change; that is the only
genuinely fiddly bit. The dispatch ladder itself is untouched and
`checkGlslDispatch` keeps guarding it. Cost: with both selectors non-trivial,
`surfacePos` evaluates two functions instead of one; the sheet fill's
`cellStretch` + 4-corner coloring (~9 evaluations/vertex today) becomes ~18
worst-case. Uniform control flow means the `t==0` identity path stays cheap, so
*today's graph mode pays nothing*. Phones at Resolution 500² were already the
red zone (previous report, Performance §1); pair/overlay tighten that — cap
sheet resolution lower when two slots are active, or finally hoist corner
colors to rebuild-time attributes.

### 3.4 Draw-call and memory budget

Geometry is **shared** across all series (evaluation is in-shader), so memory
scales only with materials (~50 uniforms each after the slot additions —
trivial). Draw calls are the real budget:

| Configuration | Draws (visible objects) |
|---|---|
| Today's max: 1 fn × 12 sheets × Sheet(fill+wire) | 24 |
| Layers all-on, 1 fn × 12 sheets × 5 kinds | 60 |
| Overlay worst case *if uncapped*: 2 fns × 12 × 5 | **120** |
| Recommended cap: `Σ fns×branches ≤ MAX_SHEETS (12)` | ≤ 60 |

**Keep the existing global cap and make it span functions**: total object sets
(function × branch combinations) ≤ 12. Overlay of two single-valued functions
costs 2 sets; sqrt vs cbrt overlay costs 5. This reuses `MAX_SHEETS`, keeps the
worst case exactly where it is today, and gives the branch-range UI a natural
constraint to display. THREE's program cache keeps compiled programs at 5
regardless of material count.

**Pair-mode branch combinatorics — restrict v1.** When both slots are
multivalued, the honest object is branch *pairs* (b_F, b_G) — quadratic blowup
and a UI nobody asked for. v1 rule: the branch range applies to one designated
slot (the multivalued one; if both are, slot F), the other pinned to principal.
Document it as a decision in the explainer, the way the ln-only inverse-trig
sheets are.

### 3.5 Persistence schema

No migration machinery exists and none is needed — but two details deserve
explicit decisions:

- **New fields, old defaults**: every added key (`fnG`, `coordA/B`, `morphT`,
  layer booleans) defaults to the graph-mode value, so existing users land
  exactly where they were. Append-only enums (`CoordSource`) get the same
  warning comment `functionNames` carries.
- **The one type change** is `renderMode: RenderMode` (a persisted string enum)
  → a layer set. Don't mutate the existing key's type. Add new boolean fields
  and seed them once from the legacy `renderMode` value (a direct
  `localStorage` read in the initializer); leave `renderMode` written for
  backward compatibility for a release or two, or retire it after seeding. The
  embed `render=` param maps a comma list onto the same booleans, single values
  included — old URLs parse unchanged.

### 3.6 Embed codec evolution

Append, never repurpose (`docs/EMBEDS.md` contract): `render=points,sheet`
(split on comma, each token validated against `renderModes` — single-value URLs
unchanged); `g=<fnName>` + `p2=/q2=`; `axes=f,g` (pairs from `{z,f,g}`,
defaulting `z,f`); `morph=0..1`. Garbled values degrade to defaults as today.
The `v=` version param exists for a genuinely incompatible change; this isn't
one.

### 3.7 UI scaling

- **Top bar**: keep exactly one dropdown (slot F). A second top-bar select
  crowds desktop and breaks on phone. When pair/overlay is active, the
  title/subtitle already carry the story — `title="(cos z, sin z)"`,
  subtitle naming both formulas.
- **Function panel** (Subject tier) gains: an "Overlay g(z)" enable + second
  picker (+ its p/q/quad params when relevant), the **Axes** control (a Pills
  row: `Graph (z, f)` · `Pair (f, g)` · `Inverse (f, z)` — a curated façade
  over `coordA/coordB`, not the raw 4×4 matrix), the morph slider (shown only
  when g exists), and a per-function tint toggle mirroring `sheetTint`. That
  is ~5 new rows in the one panel whose job is "what are we looking at" —
  within budget, and the `estHeight` bump is the only chrome change.
- **Render panel**: pills → checkboxes (or multi-select pills). Mode-specific
  sub-controls show when their layer is on — the existing conditional rows
  (`isSheet && …`) generalize directly.
- **Branch controls** (Domain tier): unchanged, but labeled with which slot
  they govern when two functions are live.
- What this does *not* need: new panels, new archetypes, new icons, a second
  view window. The closed vocabulary holds.

## 4 · Verification: keeping the fan-out in lockstep

The fan-out grows on two axes (slots × series), and the existing guards should
grow with it — cheaply:

1. **`checkGlslDispatch` already covers the ladder**; it needs no change, but
   add the same check for any second dispatch site the two-slot refactor
   creates (if `evalSlot` duplicates the ladder rather than parameterizing it,
   that's a smell — parameterize).
2. **A uniform-inventory assertion** (dev-only, ~25 lines): parse
   `uniform <type> <name>` declarations out of each shader string and assert
   every name exists in the material's uniforms at creation. This converts the
   `if (m.uniforms.X)` existence-check pattern — which scales badly as slot
   uniforms multiply — into a fail-loud contract, and it lives naturally inside
   `createSeriesObjects`.
3. **Golden tests for the pair-mode identities** (when/if the vitest decision
   lands — previous T2): CPU-side, `(f, z)` of `square` equals the two-sheet
   graph of sqrt at sampled points; `|cos² + sin² − 1| < ε` along a sampled
   curve; morph at t∈{0,1} reproduces the endpoints. These are exactly the
   pedagogical claims the feature will print in its explainer — test what you
   advertise.
4. The adaptive CPU sampler (`evalFn` in the rebuild effect) must pick a
   density driver in multi-function modes — recommend `max(|f′|, |g′|)`
   stretch, decided explicitly and commented, so it doesn't become the next
   "nobody decided it on purpose" (previous B6).

## 5 · Risks and pushback

- **The biggest risk is mode soup.** Four coordinate assignments × overlay
  on/off × five layers × branch ranges is a large state space; most cells are
  meaningful, some are nonsense (morph with no g; pair-mode tint semantics).
  Mitigation is the curated Axes pills (§3.7) — expose the lattice's named
  points, not its raw coordinates — and deriving, not duplicating: `overlayOn`
  should be *implied by* `slotG !== undefined`, not a second boolean to
  desynchronize.
- **Blending interactions under free layer mixing**: tiles write depth
  (`depthWrite: true`); fill/wire don't; points are additive. Tiles+sheet
  together will z-fight with translucency in ways renderOrder pinning only
  partly hides. Acceptable as user choice, but extend the renderOrder pinning
  to a documented total order (points < fill < wire < net < tiles) when layers
  land, and screenshot-test the adaptive points+fill combination that already
  works today so it isn't regressed.
- **`ComplexParticles.tsx` navigability**: at ~850 lines, adding slots without
  the extraction would push it past 1,100 and the "canonical consumer" claim
  past parody. The extraction is not optional polish in this plan; it is the
  thing that makes step 3 reviewable. Sequence it exactly as proposed.
- **Scope creep toward N functions**: the engine array (§3.2) is deliberate;
  the UI pair is also deliberate. Hold that line until someone produces a use
  case for three simultaneous graphs that overlay-of-two doesn't teach.

## 6 · Consistency with my previous review

Previous report, P4: *"Extract `createBranchObjects` … schedule before the next
significant particle-viewer feature, not after."* Maintainer: *"not before a
second consumer exists."* Synthesis: *"extract when the next particle viewer is
started."* I am not revising my position — I am noting the trigger has fired in
substance: multi-function overlay is a second *consumer shape* (a second axis of
fan-out demand) even though it is not a second app. The maintainer's underlying
concern — don't freeze an interface against one consumer's needs — is answered
not by waiting longer but by designing the interface against the *two* concrete
consumers now on the table (overlay and pair mode), which §3.2/§3.3 do. Waiting
for a literal second viewer app while building overlay *inside* the un-extracted
monolith would produce the worst outcome: 1,100 lines of orchestration that the
eventual extraction must untangle from two features instead of one.

One genuine revision: my previous report treated the render-mode subsystem and
the function dispatch as separable concerns (P4 vs P6). The two-slot shader
shows they meet: the extraction's uniform-parameter object is also the natural
home for the slot dispatch uniforms. If the table-driven function registry (P6)
ever lands, it should emit the *slot-parameterized* ladder, not today's
global-uniform one.

## Verdict

**Recommended shape: expand Complex Particles — one app, one workspace, no new
catalog entry, no mode pills.** Pair mode and overlay are generalizations of the
app's existing semantics (the 4-vector assignment), not a new subject; the
repo's own history (Roots/Multibranch consolidation) is direct precedent against
forking, and persistence/embed continuity make expansion strictly cheaper for
users. Revisit a separate gallery *card* (deep-linking into this app with a
preset) only if the shipped feature proves it deserves marquee placement —
that door stays open at zero cost.

Prioritized architecture, endorsing the session's sequencing with conditions:

| P | Step | Key constraint |
|---|---|---|
| 1 | **Render layers** — enum → layer set; visibility matrix + persistence seeding (§3.5); embed `render=` comma list | Don't mutate the old key's type; document the renderOrder total order |
| 2 | **Extract `createSeriesObjects`** into `lib/particles` (§3.2) **and** land the two-slot `vsCommon` generalization (§3.3) in the same move, with the uniform-inventory assertion (§4.2) | Interface validated against overlay *and* pair before merging; app shrinks to ~450 lines |
| 3 | **Overlay** — `slotG`, per-function tint, morph slider; global cap `fns×branches ≤ 12`; adaptive-density driver decided explicitly | Overlay state derived from `slotG` presence, no parallel boolean |
| 4 | **Pair mode** — the curated Axes pills (Graph / Pair / Inverse) over `coordA/coordB`; v1 single-slot branch range; explainer updated with the identities (and golden-test them if vitest lands) | Not a Render pill; Subject-tier control |

The one thing I would refuse to approve: shipping step 3 inside the un-extracted
component "to move faster." That converts a clean generalization into the next
review's headline finding.

## Self-reflection

1. **What would you do with another session?** Prototype the two-slot
   `vsCommon` change (§3.3) on a branch — it is the only part of this sketch
   with real implementation risk (the global-uniform reads inside
   `complexPowRational`/`applyComplex` ladder), and a half-day spike would
   confirm the "pair mode is just uniforms" claim before the extraction
   interface is frozen around it.
2. **What would you change about what you produced?** The draw-call budget
   (§3.4) is arithmetic, not measurement; on the phones the repo keeps
   worrying about, the binding constraint is more likely the doubled
   per-vertex evaluation in sheet fill than the draw count, and I ranked them
   by argument rather than profile.
3. **What were you not asked that you think is important?** The morph slider's
   pedagogical claim ("watch zeros migrate") needs *zero markers* to land —
   isolated surface intersections in a 4D projection are nearly invisible
   without a highlight. That is a pedagogy-hat item, but it has an
   architecture cost (a CPU root-finder feeding marker positions) that should
   be in step 3's estimate, not discovered after.
4. **What did we both overlook?** PlaneTransform: it shares the function
   registry and has its own GLSL dispatch; if the two-slot generalization
   touches `complexMath.ts` signatures or the dispatch-generation idea, the
   sibling app is in the blast radius and nobody scoped it.
5. **What did you find difficult?** Arguing *against* my own profession's
   default (a new app is the "clean" consultant answer — fresh boundary, small
   files). The evidence — one-line semantic difference, 95% shared surface,
   prior consolidation — kept pointing at expansion, and I had to verify the
   `surfacePos` claim in the shader source before trusting it.
6. **What would have made this task easier?** A one-page inventory of which
   uniforms each material kind declares vs which `makeUniforms` provides
   (asked for last review, still unwritten); §4.2's assertion would generate
   it for free.
7. **Follow-up value:** **MEDIUM** — the recommendation is firm and grounded,
   but the two-slot shader spike (item 1) and a phone profile of doubled
   vertex evaluation are cheap follow-ups that would convert the two
   load-bearing technical claims from argued to verified.
