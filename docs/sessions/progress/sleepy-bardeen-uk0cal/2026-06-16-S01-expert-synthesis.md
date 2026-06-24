---
kind: three-hats
session: 2026-06-16-S01
date: 2026-06-16
title: "Three Hats — Synthesis: how to realize Phase-2 'Rays (X→Y)'"
branch: claude/sleepy-bardeen-uk0cal
slug: sleepy-bardeen-uk0cal
status: review
build: passing
followup: null
pr: 222
app: complex-particles
---

# Three Hats — Synthesis: how to realize Phase-2 "Rays (X→Y)"

Convergence analysis over the three independent reviews
([Framework Maintainer](2026-06-16-S01-expert-maintainer.md) ·
[Architecture Consultant](2026-06-16-S01-expert-consultant.md) ·
[Math-Viz & Pedagogy](2026-06-16-S01-expert-pedagogy.md)).

## Plan under review

<details><summary>Original request</summary>

Phase-2 of the Complex Particles decomposition: how should the "Rays (X→Y) linked split view" be realized?

Complex Particles renders the 4D graph Γ_f = {(z, f(z)) ⊂ ℂ²} as a particle cloud. Five postures shipped (PR #222): Single Function, Representations, Change of Basis, Hopf & Projection, "Rays (X→Y)". Rays today opens Render + Motion on the single 4D cloud. Phase-2 should give Rays "its real form" as a linked domain | image split view ("Plane Transform / Correspondence style, on the 4D engine").

**Pivotal finding:** Plane Transform already *is* a domain|image linked split of the same function — panes [domain z (transform=0), image f(z) (transform=1)] of the same geometry via `SplitPanes`, shared function library + Domain coloring, linked zoom, draw-on-input curves; exposed chrome-less as `EmbedPlaneTransform`. So a "Rays split" inside Complex Particles would substantially re-implement Plane Transform.

Binding constraints: (1) no engine fragmentation/duplication ("expand don't fragment", PR #205); (2) one app / one appId / one persistence root, postures in-component not route hops; (3) hue never encodes identity (color = z Domain or f Range); (4) append-only, z² landing untouchable.

- **Option A** — embed Plane Transform's renderer as the Rays view (a 2D-plane particle map) inside Complex Particles.
- **Option B** — particle-native input|output split: two panes, each the 4D cloud projected to isolate INPUT (DropU/DropV → z-plane) vs OUTPUT, linked camera + tapped "ray".
- **Option C** — resolve by naming/linking: Plane Transform = the map, Complex Particles = the graph, a cross-app handoff (shared function via URL), redefine/drop Rays.

Which best serves (i) pedagogy, (ii) framework health/anti-duplication, (iii) clean architecture? Flag duplication risk; recommend with an MVP scope.

</details>

## The headline

All three hats independently reached the **same verdict**: **reject Option A, do not
build Option B, adopt Option C** — and all three, from different directions, arrived at
the *same* graph-native enhancement: instead of a split, **draw the correspondence
z → f(z) in the existing 3D scene** (the one picture only this engine can make). Call
the result **C+**.

| | Maintainer | Consultant | Pedagogy |
|---|---|---|---|
| **A** (embed PT) | ❌ reject — re-fragmentation inside one app | ❌ reject — "two engines in one app", swells the lazy chunk | ❌ reject — collapses the graph/map distinction; category error |
| **B** (particle split) | ⏸ defer — premature; touches the most contended engine code | ⏸ defer — `startAnimationLoop` is single-scene; 2× GPU; muddier | ❌ reject — **mathematically false as written** |
| **C** (name + link) | ✅ endorse (C-first hybrid) | ✅ endorse (hybrid) | ✅ endorse (the spine of "C+") |
| **graph-native extra** | "the z→f(z) ray on the 4D graph" | "the thing only this engine can draw" | correspondence tie-lines, Domain-colored, CVD-safe |

## Points of agreement (high confidence)

> [!IMPORTANT]
> **1. Building a domain|image split inside Complex Particles is duplication, full stop.**
> A flat domain|image split *is* the map model, and the map model already ships as Plane
> Transform (panes, shared shaders, linked zoom, even an embed). Option A re-hosts a whole
> renderer; the only thing the two engines legitimately share — the function library
> `lib/complexMath.ts` — they already share **without** being one engine. This is exactly
> the pre-PR-#205 fragmentation the `lib/particles` consolidation cured, relocated from
> across-apps to within-one-app.

**2. Option B is not a safe "stay on the 4D engine" compromise.** The pedagogy hat
checked the projection math (`src/lib/viewpoint.ts:87–90`): `DropU` keeps `(x, y, Im f)`
and `DropV` keeps `(x, y, Re f)` — **neither isolates the z-plane**, and no single drop
yields a clean image plane. Each pane would be a mixed `(input, input, output)` slice, so
labeling them "INPUT"/"OUTPUT" teaches a falsehood. Making it truthful (2-axis drops →
flat planes) collapses B *into* A. Independently, the engineering hats found B expensive:
`startAnimationLoop` is single-scene by construction, and the "collapsed views never
unmount" rule means a second WebGL context would stay live all session — cost `npm run
build` cannot catch.

**3. Option C honors every binding constraint and is the cheapest.** Zero engine change,
zero new renderer/rAF loop/teardown, append-only, no shared-file churn. It is also
literally the resolution the decomposition plan *already lists* ("name them graph vs
map"). Its one correctness seam — a function round-trips through a URL — is a **pure,
unit-testable** function, the ideal shape for a repo whose only CI gate is `npm run build`.

**4. The MVP is the cross-app handoff, and it stands alone.** A shared-function deep link
Complex Particles ↔ Plane Transform ("See as a plane map →" / "See the 4D graph →") plus
explainer paragraphs naming the two mental models. If only one thing ships, ship this.

## Points of tension (decisions to make)

> [!WARNING]
> **T1 — The posture name "Rays" is contested and probably wrong.** The pedagogy hat is
> firm: "Rays" already means **polar spokes** (`arg z = θ`) in Net mode *and* in Plane
> Transform, so reusing it for "correspondence tie-lines" is dishonest. Recommend renaming
> the posture to **"Correspondence"** or **"z → f(z)"**. The engineering hats didn't object
> to a rename; this is low-cost and should be adopted.

**T2 — How much beyond the handoff to build now.** The hats differ on ambition:
- *Minimal (Consultant-leaning):* ship only the handoff + reframe the existing posture's
  caption/explainer. No new drawing at all. The architectural payload is a pure
  `encode/decodeFunction` + a vitest round-trip test.
- *Plus the overlay (Pedagogy-leaning, Maintainer-compatible):* also add **correspondence
  tie-lines** — line segments z₀ → f(z₀) drawn in the live 3D scene for a *sampled subset*
  or a *tapped point*, Domain-colored. This is the honest, graph-native replacement for a
  "split", needs no second renderer, and doubles as the **CVD-accessible** realization of
  "same color = same point."

**T3 — Is a cross-app link a forbidden "route hop"?** The plan dislikes route hops, but
all three agree this one is different in kind: it is an **app↔app** move (graph ↔ map) made
explicit and deliberate, *not* a hidden posture masquerading as in-app state (the Trinary
anti-pattern). It is acceptable precisely because it does **not** fork the `complex-particles`
persistence root — it carries only the function across to a different app.

## Blind spots (verify before building)

> [!CAUTION]
> **B1 — Does Plane Transform's URL/embed schema already round-trip the hard cases?** Both
> engineering hats flagged this as the real gating risk: the function space includes the
> parameterized **quadratic** `a·z² + b·z + c` (three complex coefficients) and **z^(p/q)**
> (integer p, q). The MVP's value depends on these surviving the hop. **Action:** read
> `src/lib/embedParams.ts` (or PT's embed config) and confirm — or extend — the param set
> before committing to the link. This is step 0, not step 3.

- **B2 — Overlay density.** If tie-lines are added, drawing them for all ~80k particles is
  visual noise and draw cost; the design must pick *a sparse sampled subset* (e.g. a coarse
  grid) or *only the tapped point's* ray. Unspecified so far.
- **B3 — Where the handoff link lives in the chrome.** Top-bar affordance vs the posture's
  caption vs an explainer link — not yet decided; should reuse existing chrome (no new
  vocabulary).

## Recommended action

**Adopt Option C+ and retire the in-app split (A and B) from the roadmap.** Concretely,
Phase-2 becomes three increments, gated by a verification step:

> [!IMPORTANT]
> **Step 0 (verification gate).** Confirm `src/lib/embedParams.ts` round-trips the full
> function state — index, `p`/`q`, and the quadratic coefficients. Extend it if not. No
> link ships until this is a pure, tested round-trip (vitest).
>
> **Step 1 (the MVP — the truthful core).** A bidirectional deep link carrying only the
> function: "See as a plane map →" (Complex Particles → Plane Transform) and "See the 4D
> graph →" (Plane Transform → Complex Particles), plus short explainer paragraphs that name
> the two models — **the graph** Γ_f (this app) vs **the map** z↦f(z) (Plane Transform).
> Rename the posture **"Rays (X→Y)" → "Correspondence (z → f(z))"** and update its caption.
>
> **Step 2 (optional, graph-native — the honest "Rays").** Correspondence tie-lines
> z₀ → f(z₀) drawn in the existing 3D scene for a sampled subset and/or a tapped point,
> Domain-colored, no second renderer. This is the picture only the 4D engine can draw, and
> the CVD-accessible version of "same color = same point." Animating Plane Transform's
> existing `transform` 0→1 is the complementary high-"aha" lever, and it belongs in the map
> app.

This keeps Complex Particles as **the graph**, keeps Plane Transform as **the map**, adds
**zero** duplicated renderer, touches the engine **not at all**, and ends Phase-2 with the
two apps reinforcing one mental model instead of two apps competing to host the same split.

## Self-reflection

**What was asked:** Synthesize three expert reviews into a recommendation for realizing the
Phase-2 "Rays" split view, flagging duplication risk.

**What I did:** Confirmed unanimous rejection of A, near-unanimous rejection/deferral of B
(with the pedagogy hat supplying the decisive correctness argument from
`viewpoint.ts:87–90`), and unanimous endorsement of C; merged the three into a single C+
recommendation with a verification gate and a renamed posture.

**What I'm unsure about / risks:**
- The whole MVP hinges on **B1** (the URL round-trip for quadratic/`z^(p/q)`). If
  `embedParams` can't carry that state cleanly, Step 1 grows from "a link" to "extend the
  embed schema" — still tractable, but larger than billed. This is unverified in this pass.
- Step 2 (tie-lines) is endorsed in principle but **undesigned** (density, picking, perf at
  80k); it should get its own small design note before building.
- The rename touches the shipped PR #222 posture id/caption — append-only-safe, but it does
  mean the just-merged "Rays" label changes; worth a one-line heads-up to Dan.

**Follow-up value:** MEDIUM — the recommendation is decisive and low-risk, but the embed
round-trip (B1) genuinely needs a code check before Phase-2 is scoped as "small", and the
tie-line overlay deserves its own design pass.
