---
kind: plan
session: 2026-06-16-S01
date: 2026-06-16
title: "Plan: tame Complex Particles' surface — postures, presets, a calm default (no new apps)"
branch: claude/sleepy-bardeen-uk0cal
slug: sleepy-bardeen-uk0cal
status: in-progress
build: passing
followup: null
pr: 222
app: complex-particles
signals: needs-dan
next: PR-1 (per-function preset defaults) — pending Dan's reversible-decision calls.
---

# Plan: tame Complex Particles' surface — postures, presets, a calm default (no new apps)

A forward-looking implementation plan — the build has **not** started. It distills
the six-lens decomposition review
([synthesis + the six reviews](2026-06-16-S01-complex-particles-decomposition-review.md))
into a concrete, ordered set of PRs with file-level detail, so any future session can
pick it up cold.

## The decision already made

**Do not split Complex Particles into separate apps. Tame the *surface*, not the
*code*.** Unanimous across all six reviewers (UI · math · the Yelp-style reviewer ·
expositor · aesthete · maintainer), every verdict "partial · high confidence":

- The math is **one object** — the 4D graph `Γ_f = {(z, f(z))} ⊂ ℂ²` seen through
  faithful coordinates. Dan's five "uses" are mostly five doors into one room.
- The engine is **one consolidated codebase** (`lib/particles` — the thing the repo's
  biggest cleanup unified from the old Roots/Multibranch viewers).
- **`appId` is the persistence root.** A separate app forks every saved setting
  (`animath:<v>:<appId>:<field>` + `ws:<appId>`) *and* invites the engine to re-fork.
  "Split the app" silently means "discard the user's setup on every context switch."

This **reconciles with**, and does not reverse, the prior "expand, don't fragment"
ruling (PR #205): that ruling protected the *engine*; this plan addresses the
*control wall*. Taming the wall ≠ fragmenting the engine.

**Aggressiveness (Dan's call): "hide, keep power."** Progressive disclosure — the
calm default hides ~80% of the surface, but everything stays reachable behind an
"Advanced/Everything" reveal. We do **not** adopt the Aesthete's cut-to-the-bone
deletions; her *calm-default* goal is served by defaults + layouts instead.

## The two-axis model (the synthesis insight)

The reason "how do I divide it" felt unanswerable is that there are **two orthogonal
decompositions**, and neither is a code split:

| Axis | Answers | Shape | Mechanism | This plan |
|---|---|---|---|---|
| **Postures** | "what do I want to *do*?" | task / curriculum | `LayoutDef[]` + a selector | **PR-0** |
| **Per-function presets** | "what does this *function* want?" | target geometry | a defaults table keyed by `functionIndex` | **PR-1** |

Dan's five use-cases are the **postures**. The mathematician's deeper "target
geometry" axis (Plane / Cylinder / Sphere / Branch sheets) is the **presets**.

## Binding constraints (do not relitigate casually)

- **Hue never encodes function/mode/posture identity** (standing pedagogy veto).
  Color stays a function of `z` (Domain) or `f` (Range) on every posture.
- **One app, one `appId` (`complex-particles`), one persistence root.** No new route,
  no new registry entry. Any posture selector is **in-component state**
  (PolygonWorlds-style), *never* a `window.location.hash` hop — Trinary's clean-looking
  Observatory|Lab pills are secretly a route+namespace split (`TrinaryStars.tsx`
  ~L1031); copying that here would shatter saved settings.
- **Append-only / non-destructive.** New state fields default to today's behavior; no
  existing persisted key changes meaning. Postures rearrange panels; presets set only
  *domain/projection* fields, never the user's *appearance* choices (see PR-1).
- **The just-shipped first impression of the function itself is untouchable**: `z²`
  landing function, Fixed motion, flat brightness, π units / ±2π extents, reciprocal
  sampling on. We change *which panels greet you*, not what the `z²` graph looks like.
- **Closed 11-archetype icon vocabulary** — no new panel icons. Postures reuse the
  existing layout `icon` field (closed chrome icon set).
- **`immersive` is a Workspace-level prop, not per-layout** (`WorkspaceProps.immersive`,
  `types.ts:139`) and requires *exactly one view*. So "reverent immersive stages for
  Hopf / X→Y" is a Phase-2 framework item, not a PR-0 layout flag (see Phase 2).
- **Composes with the pair-mode 4-PR plan**
  ([that plan](../three-hats-particle-app-rill2c/2026-06-11-S01-plan-multi-function.md)):
  PR-0/PR-1 here are independent of it and can ship first; pair mode eventually lands
  as **one more posture** ("Function Pairs") on the same engine. Splitting into apps
  now would *collide* with that plan (it strands pair mode's shared state).

## PR-0 — A calm default + posture layouts (the high-leverage win) — ✅ shipped ([#222](https://github.com/piyarsquare/animath/pull/222))

**Goal:** stop cold-opening the cockpit. Land in one quiet single-function posture;
recast the layout menu as task-shaped postures. **No engine or state-field change** —
this is the `layouts` array + `defaultLayoutId` in `ParticleViewerShell.tsx:638-653,724`.

The single loudest finding of the whole review (4 of 6 said it independently): today
the default `essentials` layout parks the **470px-tall 4D Rotation panel at
`{x:800,y:56}` directly over the plot** while opening Function + Camera too. The
first thing a newcomer sees is the sublime 4D graph with an orientation-matrix
spreadsheet and two columns of ↻/↺ turn-pads bolted across its face.

**Replace the three current layouts (Essentials / Appearance / Rotate) with five
postures**, each a `LayoutDef`. The framework auto-appends **Compact** and
**Everything** — *Everything is the "keep power" escape hatch* (today's full surface).

| Posture (`id`) | Use | Opens (panels) | Leaves clear |
|---|---|---|---|
| **Single Function** `single` *(default)* | #1 | **Color** only (Domain/Range toggle); function picker is already in the top bar | the whole plot — nothing parked over it; auto-tumble does the 4D work |
| **Representations** `represent` | #2 | **Render** + **Color** | 4D rig, projection morph |
| **Change of Basis** `basis` | #3 | **4D Rotation** (+ orientation matrix) + **Camera** | Render exotica |
| **Hopf & Projection** `hopf` | #4 | **Camera** (projection slider hero) + scaffold | Render variety, 4D plane rig (inert here) |
| **Rays (X→Y)** `rays` | #5 | **Render** (Net) + **Color** | (linked split-view is Phase 2) |

- `defaultLayoutId` → `'single'` (was `'essentials'`). This one line is the
  highest-leverage change in the plan.
- Each posture's `name` + `sub` (the `LayoutDef.sub` one-liner) names the *job*, e.g.
  `{ id:'hopf', name:'Hopf & Projection', sub:'The fiber collapse', icon:'globe' }`
  (icon from the closed set). The `Layout:` menu becomes a legible feature map.
- **Mechanism = C (layout instruments)**: `LayoutDef.open` lists which panels float
  where; `views` can hide a view but here there is one view, so all postures share it.
  Zero new mechanism — `StableMatching.tsx` already does exactly this with
  matrix/welfare/lattice.

**Verify:** `npm run build`; headless screenshots of each posture
(`node scripts/shoot.mjs '#/complex-particles' …` with `SEED_LS` to force a fresh
profile — saved layouts override `defaultLayoutId`, see the prior handoff's note);
confirm the default lands clear of the plot.

> [!NOTE]
> Saved `ws:complex-particles` layout state overrides `defaultLayoutId`, so existing
> users keep their arrangement; only fresh profiles see `single`. That is the correct
> behavior (don't stomp a returning user), but means the win is invisible without a
> reset — verify in a fresh profile and mention it in the PR.

## PR-1 — Per-function preset defaults ("what the function wants")

**Goal:** picking a function snaps the *domain & projection* to what that function
wants to be seen through — honoring Dan's "different functions want different
modes/domains" — without touching the user's appearance choices.

**The target-geometry axis** (the mathematician's organizing principle), mapped onto
the real `functionNames` indices (`complexMath.ts:406-413`):

| Preset | Member indices (functions) | Sets |
|---|---|---|
| **Plane** (entire, bounded growth) | 0 linear, 2 square, 9 cube, 22 quadratic | Perspective; units ×1; extent ±2; reciprocal **off** |
| **Plane · periodic** (trig/hyperbolic) | 5 sin, 6 cos, 31 sinh, 32 cosh | Perspective; units **×π**; extent ±2π; reciprocal off |
| **Cylinder / log-polar** | 4 exp, 3 ln, 18 z^(p/q) | Torus-leaning; **Polar** sampling; units ×π |
| **Riemann sphere** (Möbius / poles) | 8 1/z, 29 1/z², 10 1/z³, 12 rational22, 17 (z−1)/(z+1), 11 Joukowski | **Sphere/Hopf**; reciprocal **on**; scaffold on; radius band |
| **Poles / essential** | 7 tan, 19 cot, 23 sec, 24 csc, 13 e^{1/z}, 15 Γ | Perspective; reciprocal on; (Γ: units ×1, small extent) |
| **Branch sheets** (multivalued) | the `MULTIVALUED_INDICES` set (1, 3, 14, 16, 18, 20, 21, 25–28, 33–35) | branch min/max already auto-shows; **Tint sheets on**; 2 sheets |

(Indices that appear in two presets — e.g. `ln`/`z^(p/q)` are both *Cylinder* and
*Branch sheets* — take the **more specific** preset; resolve in a single
`PRESET_FOR[index]` lookup so every index maps to exactly one preset, the way
`functionCategories` covers every index once.)

**Schema + apply semantics:**

```ts
// lib/particles or config: keyed by functionIndex, every field optional.
interface FunctionPreset {
  viewType?: ProjectionMode;   // seeds projMix detent
  axisScale?: number;          // 1 or Math.PI (units)
  extent?: number;             // symmetric half-width
  samplePattern?: SamplePattern;
  reciprocal?: boolean;
  showScaffold?: boolean;
}
const PRESET_FOR: Record<number, FunctionPreset>;  // or by-category seed
```

- **Apply on explicit function change only**, and only the *domain/projection* fields
  above. **Never** touch color, render mode, size, motion, or 4D orientation — those
  are the user's, not the function's. This is the "non-destructive" rule that keeps
  presets from feeling like they stomp your setup.
- Hook point: the function picker's `onChange` in `ComplexParticles.tsx` (the
  top-bar `topExtra` selector) — apply `PRESET_FOR[idx]` after `setFunctionIndex`.
- **Open sub-decision (flag for Dan):** should re-picking the *same* function
  re-apply (a "reset this function's view" gesture), or only a genuine change? Default
  recommendation: apply on change to a *different* function; offer "recommended view"
  as a future small button if wanted.

**Verify:** screenshots of `1/z` (snaps to Sphere + reciprocal + scaffold), `sin`
(snaps to ×π), `√z` (tint on, 2 sheets), `z²` (unchanged — still the shipped landing).

## PR-2 — The posture *affordance* (open decision; deferred, recommended)

PR-0 ships postures as **layout-menu entries** (mechanism C) — already a real,
legible selector. Whether to *also* surface them more prominently is the one genuine
UI fork from the review:

- **Top-bar mode pills (B)** — Priya & Marcus: a visible `Single · Hopf · Basis …`
  feature map. Uses `WorkspaceProps.modes`/`activeMode`/`onModeChange`
  (`types.ts:163-166`) — **but must be in-component state, never a hash hop**, and
  `onModeChange` just calls the layout setter (pills *own* the layouts; the `Layout:`
  menu stays as the "custom/advanced" escape hatch — one source of truth).
- **Ordered captioned chapters (C + per-view `hint`)** — the Expositor: postures are a
  *sequence*, not a toggle; each should set the per-view `hint` caption (one sentence
  under the picture) and follow the guide-series chapter order. "The unit of
  decomposition is the caption, not the control."

**Recommendation:** ship PR-0 as layouts; then add pills **only if** salience demands
it, and make each posture also set a one-line `hint` caption (cheap, satisfies the
Expositor regardless of pills). This is the same open decision the pair-mode plan
already carries (panel pills vs top-bar pills) — let one resolution serve both.

## Phase 2 (each on its own merits)

- **Rays linked split-view (#5) — the only genuinely new capability.** The single
  `node` view can't show the X-view ↔ Y-view correspondence; it needs a
  `panes: PaneDef[]` split (`types.ts:19-50`, Plane Transform / Correspondence
  pattern) — domain net | image net. Heaviest item: two synchronized engine viewports
  or one engine drawing two cameras. Scope as its own PR; gate the `rays` posture's
  full form on it.
- **Reverent immersive stages (Hopf, Rays).** Wanted by Expositor + Aesthete. Blocked
  by the framework fact that `immersive` is app-wide, single-view only. Options: (a) a
  small framework addition to allow *per-layout* immersive; (b) lean on the existing
  per-view **fullscreen** button as the "quiet room" for now. Recommend (b) first.
- **Plane/particles unification (`!high` backlog).** The mathematician reframed it:
  Particles draws the *graph* `(z,f)`; Plane Transform draws the *map* (the `(u,v)`
  shadow). The resolution is likely **"name them graph vs map"** in both explainers,
  not "merge them." Cheap doc/labeling task.
- **Pair mode as a sixth posture.** When the pair-mode plan lands, `(f,g)` becomes a
  "Function Pairs" posture — same engine, same `appId`.

## Decisions (resolved 2026-06-16, Dan)

1. **Posture affordance → Layout menu + plot captions.** Postures stay in the Layout
   menu (PR-0, shipped); each posture also sets a one-line caption under the plot
   (the guided-chapter feel). **No** top-bar pills.
2. **Presets → apply on function change** (PR-1): set domain/projection fields only,
   never the user's appearance choices; fire on a change to a *different* function.
3. **Phase-2 order → Rays X→Y linked split-view first** (the only genuinely new
   capability), ahead of immersive stages and the graph-vs-map naming pass.

## Risks

| Risk | Mitigation |
|---|---|
| Saved layouts hide the new default | verify in a fresh profile (`SEED_LS`); say so in the PR; do not force-reset returning users |
| Presets stomp deliberate user tweaks | presets set *domain/projection only*, never appearance; apply on explicit change only |
| Postures become a 3rd nav layer (rail + Layout menu + pills) | pills (if built) *own* the layouts; `Layout:` menu is the single advanced escape hatch |
| "Simplify" via a hash-hop mode silently splits persistence | mode/posture selector is in-component state under one `appId`, never `location.hash` |
| Drift from the pair-mode plan | PR-0/PR-1 are additive + independent; pair mode lands later as a posture, not a fork |

## Process note

`kind: plan`, `status: proposed` until a session executes it (then flip
`proposed → in-progress → completed` and fill `pr:`). Surfaced by the control center
like any report; the `needs-dan` signal is inferred from the proposed status. The
two load-bearing calls (posture affordance, subtraction depth — already answered
"hide, keep power") are reversible and do **not** block PR-0.
</content>
</invoke>
