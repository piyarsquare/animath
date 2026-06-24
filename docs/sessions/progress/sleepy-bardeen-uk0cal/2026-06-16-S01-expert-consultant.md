---
kind: three-hats
session: 2026-06-16-S01
date: 2026-06-16
title: "Three Hats — Architecture Consultant: Rays split-view realization"
branch: claude/sleepy-bardeen-uk0cal
slug: sleepy-bardeen-uk0cal
status: review
build: passing
---

# Three Hats — Architecture Consultant: Rays split-view realization

I am reviewing this as an external front-end architecture and quality consultant
(React/TypeScript, Three.js, headless-UI and render-prop patterns, shared-model
multi-view rendering). I have no attachment to the existing code; my job is to
decide whether the proposed **Rays (X→Y) linked split view** for Complex
Particles is structurally sound, whether it duplicates an asset the catalog
already owns, and what the cheapest correct realization is. I read the plan
under review, `PlaneTransform.tsx`, `SplitPanes.tsx`, `types.ts`,
`createAnimationLoop.ts`, `ParticleViewerShell.tsx`, and `viewpoint.ts` to
ground the claims below.

## Plan under review

<details><summary>Original request</summary>

```
Phase-2 of the Complex Particles decomposition: how should the "Rays (X→Y) linked split view" be realized?

CONTEXT. Complex Particles renders the 4D graph Γ_f = {(z, f(z)) ⊂ ℂ²} as a particle cloud. We shipped (PR #222) a calm default + five postures: Single Function, Representations, Change of Basis, Hopf & Projection, "Rays (X→Y)". Rays today opens Render + Motion on the single 4D cloud. Phase-2 should give Rays a linked domain | image split view ("Plane Transform / Correspondence style, on the 4D engine").

PIVOTAL FINDING. Plane Transform ALREADY is a domain|image linked split of the same function (panes domain z / image f(z) of the same geometry, shared coloring, linked zoom, draw-on-input; chrome-less EmbedPlaneTransform). A "Rays split" inside Complex Particles would substantially RE-IMPLEMENT Plane Transform.

BINDING CONSTRAINTS: (1) no engine fragmentation/duplication ("expand don't fragment", PR #205). (2) one app, one appId, one persistence root; postures in-component, never a route hop. (3) hue never encodes identity (color = f(z) Domain or f Range). (4) append-only; z² landing untouchable.

OPTION A — Embed Plane Transform's renderer as the Rays view (reuse PT panes/shaders in-component). Con: PT is a 2D-plane particle map (transform 0↔1), not the 4D cloud — a different renderer than the other four postures; two engines in one app; overlaps PT identity.
OPTION B — Particle-native input|output split: two panes, each the 4D cloud projected to isolate INPUT (DropU/DropV → z-plane) vs OUTPUT, linked camera + tapped "ray". Pro: stays on the 4D engine; novel. Con: more build, muddier picture, new linked-projection plumbing, two live 3D scenes.
OPTION C — Resolve by naming/linking: make Plane Transform THE map, add a cross-app handoff (shared function via URL) Complex Particles ↔ Plane Transform, redefine/drop Rays. Pro: zero duplication, cheapest. Con: cross-app context switch; Rays stops being an in-app posture.

QUESTION: Which best serves (i) pedagogy, (ii) framework health/anti-duplication, (iii) clean architecture given PT exists? A/B/C/hybrid? Flag duplication risk; give a concrete recommendation + MVP scope.
```

</details>

---

## The pattern actually at stake

Strip the three options of their app-specific framing and a single recognizable
pattern decides the question. There are exactly two structural archetypes on the
table:

- **Shared model, multiple projections** (the good one). One source of truth —
  a geometry, a function index, a set of orientation refs — is rendered through
  *N* views, each a different camera/projection/transform of the same data.
  Plane Transform is already a textbook instance: one `BufferGeometry`, two
  panes, distinguished by a single `transform` uniform (`0` for domain, `1` for
  image). Correspondence is a looser instance (two views linked by a shared
  tapped point). This is the headless-UI / "lift state, fan out renderers"
  shape, and it composes: adding a third projection is adding a uniform, not a
  subsystem.

- **Two engines in one app** (the smell). A component owns two *different*
  rendering subsystems with different state shapes, different loops, different
  lifecycles, glued by ad-hoc synchronization. This is the conflation-of-concerns
  anti-pattern. It is not automatically wrong — Trinary legitimately hosts an
  Observatory and a Lab — but it is a structural liability that must earn its
  keep, because every future change pays the two-engine tax twice.

> [!IMPORTANT]
> **Option A is "two engines in one app" wearing the costume of "shared model,
> multiple projections."** The Rays posture would sit beside four postures
> driven by the 4D particle engine (`lib/particles`, single perspective camera,
> `startAnimationLoop`, per-sheet `ShaderMaterial`s, quaternion 4D rotation
> refs) and one posture driven by Plane Transform's 2D orthographic
> `transform`-uniform engine. The "model" is not shared — `lib/particles`
> samples a 4D graph and projects ℝ⁴→ℝ³; Plane Transform samples a 2D grid and
> evaluates f in a vertex shader to relocate points in the ℝ² image plane. The
> only thing common to both is the *function library* (`complexMath.ts`), which
> they already share without being the same engine. Choosing A imports a second
> WebGL subsystem, a second uniform-sync `useEffect`, a second resize model
> (inscribed-square orthographic vs. perspective fill), and a second rAF
> tick into a component whose other four postures know nothing about any of it.

This is the crux. The request's own Option-A con ("two engines in one app")
is not a minor drawback to weigh against novelty — it is the disqualifying
property. The reviewer's instinct to be skeptical of conflated concerns is
correct here.

## Option comparison

| Axis | A — embed PT's renderer | B — particle-native input/output split | C — name + cross-app link |
|---|---|---|---|
| **Pattern** | Two engines in one app (smell) | Shared model, two projections (clean) | Shared model, two *apps* (clean, but split surface) |
| **Coupling** | High: ComplexParticles now depends on PT's shaders, pane components, resize math; bidirectional drift risk | Low: reuses the engine's own `project()` drop-axis modes; new code is linked-camera plumbing | Lowest: a URL contract (`?fn=…`) — a string, the loosest possible coupling |
| **Cohesion** | Broken: one component owns two unrelated render pipelines | Intact: every posture is "the 4D cloud, projected differently" | Intact per app: each app does one thing |
| **Perf (live renderers)** | **Two WebGL contexts** when Rays is open (PT's two panes are already two contexts; here they'd be a *third/fourth* alongside the 4D context if not torn down) — see callout | **Two WebGL contexts / two 4D scenes** — the expensive case (two particle clouds, two loops or one multi-viewport loop) | **One context per app**, never two at once (you're in one app at a time) |
| **Bundle (React.lazy)** | ComplexParticles chunk swells: PT's shaders + pane code now load with *every* Complex Particles visit, even for users who never open Rays | Modest: new linked-camera code, reuses existing engine; no foreign shaders | Zero added to either chunk; a few lines of URL parse/emit |
| **Testability (build + manual only)** | Worst: a new cross-engine seam with no unit coverage; correctness is "do two different pipelines agree?" — only checkable by eye | Medium: the seam is "do two cameras/projections of one geometry stay linked?" — still eyeball-only, but one engine | Best: the seam is a pure URL round-trip, the one thing trivially unit-testable in this repo's vitest setup |
| **Composability across catalog** | Negative: establishes "embed another app's renderer in-component" as a precedent others will copy | Neutral/positive: a reusable "linked multi-projection of the 4D engine" capability | Positive: a reusable cross-app **function handoff** the whole catalog can adopt (Correspondence ↔ Fractals, etc.) |
| **Duplication risk** | **Re-implements / re-hosts PT** — the exact thing the pivotal finding warns against | Low duplication of *code*, but **duplicates PT's pedagogical role** (a domain\|image map of f) in a second place | **Zero duplication** — PT stays the one map |
| **Honors "hue ≠ identity"** | Yes (PT colors by z/Domain) | Yes (engine colors by z or f) | Yes |
| **In-app posture preserved** | Yes | Yes | **No** — Rays becomes a cross-app jump |

### The "second renderer in one app" smell vs. the "shared core, two views" ideal

The ideal this codebase already reaches for — and reaches in Plane Transform —
is *one* model, *two* cheap views. Plane Transform achieves it elegantly: the
two panes are not two engines; they are one geometry and one shader, branched by
a single `transform` uniform, rendered by two thin renderer instances that share
everything upstream of the GPU. That is the shape to imitate, not to import.

Option A inverts it: it would put a *whole second engine* (PT's) next to the 4D
engine and call the result "a view." The tell is that nothing upstream is
shared — not the geometry (4D vs 2D grid), not the camera (perspective vs
orthographic inscribed-square), not the loop, not the resize policy. When two
"views" share no model, they are two engines, and the abstraction boundary has
been drawn in the wrong place.

Option B is the honest "shared core, two views" play *within* the 4D engine: both
panes are the same 4D particle cloud, one isolating the input copy (`DropU`/`DropV`
→ the z-plane, which `viewpoint.ts` already implements: `DropV` returns
`(x,y,z)`, i.e. drops the +v output axis) and one showing the output. That is
structurally correct — but it is also where the real cost lives, because the
*engine* must learn to drive two scenes.

> [!CAUTION]
> **`startAnimationLoop` is single-scene by construction.** Read
> `createAnimationLoop.ts`: it closes over one `renderer`, one `scene`, one
> `camera`, one `materialsRef`, one `axisRefs`, and ends with a single
> `renderer.render(scene, camera)`. Option B needs *either* two of these loops
> (two clocks, two quaternion compositions — they will drift unless seeded from
> shared refs every frame) *or* a refactor of the loop to a multi-viewport model
> (`renderer.setViewport` + N camera/scene pairs sharing the ref-driven 4D
> state). The first duplicates the engine's heartbeat; the second is a genuine
> engine change touching the repo's most-consolidated file. Neither is the
> "modest" build the option's framing implies. This is the load-bearing cost B
> hides.

### Performance of two live WebGL contexts

This deserves its own paragraph because it is the same hidden tax under both A
and B, and it is real on the target (mobile, high particle counts):

- **Context count.** Plane Transform already creates **two** `WebGLRenderer`s
  (one per pane) — confirmed in `PlaneTransform.tsx` (`mount(...)` called for
  input and output). The 4D engine creates one. Option A, naively, would have
  the 4D context *plus* PT's two contexts alive whenever Rays is open and the
  view isn't torn down — and recall the framework deliberately **does not
  unmount collapsed views** (to preserve WebGL state), so "switch away from
  Rays" does not free those contexts. Browsers cap live WebGL contexts
  (commonly ~8–16); burning three-to-four on one app is profligate and risks the
  oldest-context-loss eviction that manifests as a randomly blanked canvas.
- **Fragment cost.** Two live particle clouds (Option B) means roughly **2× the
  fill and draw** of one. The engine already pushes adaptive density up to large
  point counts; doubling that on a phone at 60fps is the difference between
  smooth and dropped frames. Plane Transform mitigates by being a *2D* map with
  capped DPR and inscribed-square sizing — the 4D cloud has no such natural cap.
- **rAF multiplicity.** Two independent loops means two `requestAnimationFrame`
  chains. They will not stay phase-locked, and the 4D rotation refs they read
  must be updated from one writer or the two panes will show the *same* function
  at *different* orientations — a correctness bug that looks like a render glitch.

Option C has none of this: you are only ever in one app, so only one engine's
contexts are live.

## What contract / seam keeps each option correct

The discipline question: for each option, what is the single invariant that, if
it holds, makes the picture truthful — and is it checkable with only
`npm run build` plus manual inspection?

| Option | Load-bearing invariant | Checkable how |
|---|---|---|
| A | The PT pane and the 4D cloud agree on *which f, which branch, which extent* every frame — across two uniform-sync effects with different schemas | Eyeball only; no shared type enforces agreement → silent drift is the failure mode |
| B | The two panes share **one** set of 4D-rotation/orientation refs and one function/branch source; only the **projection** (drop-axis) differs per pane | Eyeball; partially structural if both panes read the *same* refs (a code-review check, not a test) |
| C | The URL function descriptor **round-trips** (Complex Particles emits `?fn=idx&p=&q=&…`; Plane Transform parses the identical schema and lands on the same f) | **Unit-testable** — a pure encode/decode round-trip, the strongest seam of the three |

Option C is the only one whose correctness seam is a pure function. In a repo
whose sole CI gate is `npm run build` and whose tests cover "chrome pure logic,"
the option that reduces the new risk to a testable pure function is the one that
fits the verification reality, not fights it.

## Where each option fails

- **A fails on maintainability and bundle.** Six months out, a newcomer opening
  ComplexParticles to change a render mode finds a foreign engine bolted into one
  posture, with its own resize math and shader set, loaded eagerly into the
  chunk. The pivotal finding's warning — "would substantially re-implement Plane
  Transform" — is precisely realized: even "reuse PT's components" means
  ComplexParticles now *depends on* PT's internals, so PT can no longer evolve
  freely (it has a second consumer it can't see). This is the not-invented-here
  inversion: instead of inventing, it *entangles*. Reject.

- **B fails on cost-vs-clarity, not on pattern.** B is the architecturally
  honest in-app answer, and if the engine were already multi-scene I would
  endorse it. But it demands the engine change flagged in the CAUTION (two loops
  or a viewport refactor), it doubles GPU cost on mobile, and the request itself
  concedes "muddier picture": two 3D projections of one 4D cloud, side by side,
  asking the viewer to mentally re-link them, is *harder* to read than PT's two
  flat planes with a hand-drawn ray. It buys novelty at the price of pedagogy and
  performance. Defer, don't kill — it could be a future "advanced" form once the
  engine supports multi-viewport for other reasons.

- **C fails on in-app continuity.** Rays stops being a posture you flip to and
  becomes a "open this in Plane Transform" jump. That is a real UX cost (context
  switch, a second app's chrome, the saved-setup question). But it is the *only*
  cost, and it is mitigable: the handoff can carry the function so the jump feels
  like "see this same f as a flat map," and a returning link can carry you back.

## The hybrid worth naming

The cleanest answer is **C as the architecture, with the in-app posture
reframed rather than deleted** — a C/PR-0 hybrid:

1. **Keep `rays` as a posture** (append-only; it already ships). But its *job*
   is not "re-implement PT inside the cloud." Its job is the **ray idea on the
   4D engine** that the cloud uniquely can show and PT cannot: the per-particle
   segment from `z` to `f(z)` in the *same* 4D graph — i.e. lean on the engine's
   existing Render (Net) + Motion, optionally adding a "connect z→f" rendering of
   the graph's two ℂ-shadows. This is the genuinely-4D thing, and it does **not**
   need a split view at all.
2. **Add the cross-app function handoff** (the reusable C asset): a shared URL
   function descriptor so Complex Particles can offer "Open as a plane map →"
   that lands Plane Transform on the same f, and vice versa. PT already parses an
   embed config and a `?fn=` notion via `EmbedPlaneTransform`; extending the
   normal route to read the same descriptor is small and reuses existing code.
3. **Do not build a second renderer** (no A) and **do not double the 4D scene
   now** (defer B behind a real multi-viewport need).

This serves all three criteria the question asks about: **(i) pedagogy** — the
flat domain\|image map (PT) and the 4D ray-graph (the posture) become two
*distinct* lessons that reference each other, instead of one lesson rendered
twice; **(ii) framework health** — zero engine fork, zero duplicated renderer,
and a new cross-app contract the rest of the catalog can reuse; **(iii) clean
architecture given PT exists** — PT stays the single owner of "the map," its
abstraction boundary intact, with one loose URL coupling instead of a hard
code dependency.

---

## Verdict

> [!IMPORTANT]
> **Endorsed: Option C, as a hybrid that keeps the `rays` posture but redefines
> its job and adds a cross-app function handoff.** Reject A outright (it is "two
> engines in one app" and re-hosts Plane Transform — the precise duplication the
> pivotal finding warns against, plus a bundle and WebGL-context cost). Defer B
> (architecturally honest but it requires a multi-scene engine change, doubles
> GPU cost on mobile, and yields a *muddier* picture than PT's flat planes).

**Endorsed option:** **C-hybrid.** Concretely:

1. **Reframe `rays`** from "domain|image split" to "the z→f(z) ray *on the 4D
   graph*" — the thing only this engine can draw — realized with the engine's
   existing Render/Motion (no `panes`, no second renderer). If a split is ever
   wanted here, it is B and must wait for a multi-viewport engine.
2. **Build the reusable cross-app function handoff:** a single shared URL
   descriptor (`fn` index + `p/q` + quadratic coeffs + branch), encode/decode as
   a pure function, with a round-trip **unit test** (the one new seam that can be
   tested). Wire a "Open as plane map →" affordance in Complex Particles and the
   return link in Plane Transform.

**Concerns / changes I'd require before merge:**

- The handoff descriptor must be the **single source of truth** for function
  identity across both apps — define it once (extend the existing
  `embedParams`/`complexMath` index space; do not invent a parallel encoding) so
  the two apps cannot drift. This is the only place correctness can rot, so it
  is the place to put the unit test.
- Respect the binding constraints already in the plan: **append-only** (the
  `rays` posture id and the z² landing are untouched), **one `appId`** (the
  handoff is a navigation, not a persistence fork — and crossing apps *does*
  cross persistence roots, so the link should be framed as "see it there," not
  "continue your session there"; carry only the function, never the appearance
  state).
- Keep **hue = f(z)/Domain or f/Range** on both sides; the handoff carries the
  function, not a color identity.
- Do **not** let Option A sneak back as "just reuse PT's pane components" — that
  is the same hard coupling with a softer name.

**MVP scope (smallest correct slice):**

1. A pure `encodeFunction(state) → query` / `decodeFunction(query) → state`
   pair over the existing function index space, with a vitest round-trip test.
   *(This is the whole architectural payload; everything else is wiring.)*
2. Plane Transform reads that descriptor on its normal route (reuse the embed
   parse path).
3. A small "Open as a plane map →" link in Complex Particles' Rays posture (and
   a reciprocal link back), carrying only the function.
4. Leave `rays` opening Render + Motion as it does today; *optionally* add the
   z→f ray rendering as a fast follow — it is independent of the handoff and
   needs no split view.

**Explicitly out of MVP:** any second `WebGLRenderer` in Complex Particles; any
`panes` on a Complex Particles view; any change to `startAnimationLoop`. Those
belong to a future Option-B effort that should be justified by a *general*
multi-viewport need, not by Rays alone.

---

## Self-reflection

1. **What would you do with another session?** Sketch the concrete
   `encodeFunction`/`decodeFunction` schema against the real index space in
   `complexMath.ts` and `embedParams.ts`, confirm Plane Transform's normal route
   (not just `EmbedPlaneTransform`) can consume it without refactor, and write
   the round-trip test so the "single source of truth" claim is demonstrated, not
   asserted.
2. **What would you change about what you produced?** I leaned on the request's
   summary of Plane Transform's "two contexts" and confirmed the two-renderer
   mount, but I did not measure actual GPU/context cost on a device — the
   perf section is sound on counting principles but not on benchmarks.
3. **What were you not asked that you think is important?** Whether the
   *cross-app handoff* should be a one-off Rays feature or a catalog-wide
   convention (Correspondence ↔ Fractals, etc.). I recommend the latter; that
   decision changes how generic the URL descriptor should be and is worth Dan's
   explicit call.
4. **What did we both overlook?** The "collapsed views are never unmounted"
   rule makes the multi-context cost of A/B *worse* than a naive read suggests —
   a Rays renderer, once opened, stays live even when you switch postures. I
   surfaced it, but it deserves emphasis: it turns "two contexts while viewing"
   into "two contexts for the rest of the session."
5. **What did you find difficult?** Separating B's genuine architectural honesty
   (it *is* the right shape) from its real cost (a single-scene engine that would
   have to change). The temptation is to endorse the clean pattern; the duty is
   to price it.
6. **What would have made this task easier?** A short note on whether any *other*
   planned app wants multi-viewport from the 4D engine — that single fact decides
   whether B's engine change is a Rays-only tax or a shared investment, which
   would move B from "defer" toward "do now."
7. **Follow-up value:** MEDIUM — the verdict and pattern analysis are sound and
   the MVP is buildable as written, but the handoff schema is specified at the
   design level only; a follow-up session that pins the exact descriptor against
   the real index space and lands the round-trip test would convert this from a
   correct recommendation into an executable one.
