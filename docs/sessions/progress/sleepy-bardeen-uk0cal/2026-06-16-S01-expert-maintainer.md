---
kind: three-hats
session: 2026-06-16-S01
date: 2026-06-16
title: "Three Hats — Framework Maintainer: Rays split-view realization"
branch: claude/sleepy-bardeen-uk0cal
slug: sleepy-bardeen-uk0cal
status: completed
build: passing
---

# Three Hats — Framework Maintainer: Rays split-view realization

I am the framework maintainer / chrome + engine steward. I am reviewing **how
the "Rays (X→Y) linked split view" should be realized** as Phase-2 of the Complex
Particles decomposition. My lens is operational reality, history/precedent,
parallel-branch safety, tech-debt delta, and scope boundaries. I am skeptical of
abstractions not justified by a concrete app, I prefer working code, and I push
back when a proposal assumes the codebase is cleaner than it is.

The headline up front: **the pivotal finding is correct and load-bearing.** A
"Rays domain|image split" inside Complex Particles would substantially
re-implement Plane Transform, which already exists, already ships, and is already
embeddable. My job here is to say which option respects that fact without
abandoning the pedagogy, and to flag exactly where each option fragments the
engine the repo spent its biggest cleanup consolidating.

## Plan under review

<details>
<summary>Original request</summary>

Phase-2 of the Complex Particles decomposition: how should the "Rays (X→Y) linked split view" be realized?

CONTEXT. Complex Particles renders the 4D graph Γ_f = {(z, f(z)) ⊂ ℂ²} as a particle cloud projected to 3D. We just shipped (PR #222) a calm default + five task-shaped "postures": Single Function, Representations, Change of Basis, Hopf & Projection, and "Rays (X→Y)". Today the Rays posture just opens Render + Motion on the single 4D cloud. Phase-2 should give Rays "its real form" as a linked domain | image split view ("Plane Transform / Correspondence style, on the 4D engine").

PIVOTAL FINDING. The repo ALREADY HAS a domain|image linked split of the same function: the separate app Plane Transform renders panes [domain z (transform=0), image f(z) (transform=1)] of the SAME geometry via SplitPanes, sharing the complex-function library + Domain coloring, linked zoom, draw-on-input curves; exposed chrome-less as EmbedPlaneTransform. So a "Rays domain|image split" inside Complex Particles would substantially RE-IMPLEMENT Plane Transform.

BINDING CONSTRAINTS: (1) Do NOT fragment/duplicate the engine ("expand don't fragment", PR #205). (2) One app, one appId, one persistence root — postures are in-component state, never a route hop. (3) Hue NEVER encodes identity — color is a function of z (Domain) or f (Range). (4) Append-only / non-destructive; z² first impression untouchable.

OPTION A — Embed Plane Transform's renderer as the Rays view (reuse PT's panes/shaders inside Complex Particles, in-component). Con: PT's renderer is a 2D-plane particle map (transform 0↔1), NOT the 4D cloud — a different renderer than the app's other four postures; risks two engines in one app, overlaps PT's identity.
OPTION B — Particle-native input|output split: two panes, each the 4D cloud projected to isolate the INPUT plane (DropU/DropV → z-plane) vs OUTPUT, linked camera + tapped-point "ray" correspondence. Pro: stays on the 4D engine, novel. Con: more build; muddier picture; new linked-projection plumbing.
OPTION C — Resolve by naming, don't duplicate: make Plane Transform THE domain|image MAP, add a lightweight cross-app handoff (shared function state via URL) linking Complex Particles ↔ Plane Transform, and redefine/drop the Rays posture so Complex Particles stays "the 4D graph" and Plane Transform stays "the map". Pro: zero duplication; cheapest. Con: cross-app jump is a context switch; Rays stops being an in-app posture.

QUESTION: Which realization best serves (i) pedagogy, (ii) framework health & anti-fragmentation/duplication, (iii) clean architecture given Plane Transform exists? A, B, C, or a hybrid? Flag duplication risk explicitly; give a concrete recommendation with an MVP scope.

</details>

---

## What the code actually says (verified, not assumed)

Before I weigh options I want the shared substrate on the table, because three of
the four binding constraints are decided by code that already exists, and the
fourth option (A) is more expensive than the prose implies.

**Complex Particles' view is hard-singular.** `ParticleViewerShell` (the turnkey
host every particle viewer renders) declares exactly one `ViewDef`:

```
// ParticleViewerShell.tsx ~624
const views: ViewDef[] = [
  { id: 'plot', title: 'f(z) · particle cloud', defaultRect: {...},
    node: <Canvas3D onMount={onMount} /> },
];
```

Every one of the five postures shipped in PR #222 is a `LayoutDef` that
rearranges *panels* over that single `plot` view — none adds a view. The Rays
posture is literally `open: { render, motion }`. So "give Rays its real form as a
split view" is **not** a layout change; it requires a *second* view (paned) and
therefore a structural change to the shell or to ComplexParticles' wiring. That
is the first cost no option escapes.

**Plane Transform is a genuinely separate engine, not a thin reuse target.** It
is ~573 lines that stand up *two* `THREE.WebGLRenderer`s with **orthographic**
cameras, its own `ResizeObserver` size cache, its own rAF `tick`, its own mount /
teardown, its own `ShaderMaterial` pair (`transform: 0|1`), and its own pointer
handlers for draw-on-input and pinch-zoom (`PlaneTransform.tsx:139-225`). It
shares with `lib/particles` essentially **nothing at the engine level** — only
`lib/complexMath` (the function table) and the *idea* of Domain coloring. It is a
2D ortho point-map; `lib/particles` is a 4D perspective particle cloud with
quaternion rotation, projection morphs, Riemann sheets, four render modes, and a
Hopf scaffold (`ComplexParticles.tsx` is ~950 lines orchestrating that). These
are two different machines that happen to color the same z the same way.

**The split mechanism is fixed and dumb on purpose.** `SplitPanes` is a
22-line equal flex split with **no draggable divider and no camera linkage** —
"equal inscribed squares are the invariant that keeps a domain/image pair
truthful" (`SplitPanes.tsx:5-10`). Each `PaneDef` just carries a `node`; any
linkage between panes (PT's shared `viewExtent` zoom) is wired by the *app* in
React state, not by the chrome. So Option B's "linked camera + tapped-point ray
correspondence" is **net-new plumbing the framework does not provide** — two 4D
cameras kept in sync, plus a picking pipeline that does not exist anywhere in
`lib/particles` today.

**Drop-axis already exists and is already battle-tested in embeds.**
`useViewControls.handleDropAxis('DropU'|'DropV'|…)` is real, and the
`#/embed/complex-particles` route already drives it from a URL param
(`ComplexParticles.tsx:752-759`). So Option B's "isolate the input z-plane via
DropU/DropV" is the one piece of B that *is* grounded in shipped code.

> [!IMPORTANT]
> The prose frames A as "reuse PT's panes/shaders" and B as "more build." Read
> against the code, **A is also a large build**: you cannot reuse PT's renderer
> without lifting its entire two-renderer/two-camera/rAF/teardown apparatus and
> its pointer handlers into ComplexParticles. "Embed PT's renderer" means
> "run a second, different engine inside the 4D app" — which is precisely the
> fragmentation PR #205 ruled against, just relocated from across-apps to
> within-one-app.

---

## History & precedent — does any option repeat an abandoned approach?

This is the lens I care most about, because the repo's largest cleanup is
directly on point.

**The consolidation that defines this codebase.** Three near-identical complex
viewers (the old Roots `z^(p/q)` and Multibranch `sqrt/ln` viewers, plus the base
particle viewer) were unified into **one** `lib/particles` engine +
`ParticleViewerShell`; Roots and Multibranch became *modes of ComplexParticles*,
not separate apps. PR #205's "expand, don't fragment" ruling is the codified
lesson: when the math is one object, you grow one engine, you don't spawn parallel
near-duplicates. The decomposition plan under review explicitly re-affirms this
("Taming the wall ≠ fragmenting the engine").

Now map each option onto that history:

| Option | What it does to engine count *inside Complex Particles* | Precedent verdict |
|---|---|---|
| **A** (embed PT's renderer) | Adds a **second, different** renderer (2D ortho point-map) alongside `lib/particles` in one app | **Repeats the pre-#205 sin**, relocated inside one app. Two engines, one appId. |
| **B** (particle-native split) | Stays on **one** engine (`lib/particles`), but instantiates it **twice** (two synced cameras) + adds picking plumbing | Does **not** fragment the engine — but forks the *render surface* and grows new shared machinery (linked cameras, picking) that only Rays uses |
| **C** (name + handoff) | Adds **zero** engine code; Complex Particles stays the graph, Plane Transform stays the map | **Cleanest against precedent** — it is literally the "name them graph vs map" resolution the plan already lists in Phase 2 |

> [!WARNING]
> Option A is the historically dangerous one. The whole reason `lib/particles`
> exists is that the repo learned, expensively, that two complex viewers that look
> similar drift apart in maintenance. Putting PT's 2D engine *inside* the 4D app
> gives Complex Particles two color pipelines, two zoom models, two teardown paths
> — and the next person who edits Domain coloring has to remember there are now
> two places it lives in one file. That is a regression in code health dressed up
> as reuse.

**Option B is subtler.** It does not add a *second engine* — it stays on
`lib/particles`, which honors constraint (1) literally. But it adds a *new
capability class* to that engine — two synchronized 4D viewports and a tapped-point
picking/correspondence pipeline — that **no other consumer needs**. The repo's
gesture/camera model (`useGestureRotation`, the single `cameraRef` in
`ParticleState`) assumes one camera per state. Linking two cameras means either
two `ParticleState`s sharing rotation refs (the "instantiate the engine twice"
read) or one state driving two renderers (a `Canvas3D` the engine wasn't built
for). Either way you are *generalizing the engine for one feature*. As the
maintainer, that is the abstraction I am most skeptical of: I will not bless a
multi-viewport generalization of `lib/particles` on the strength of a single
posture, especially when Plane Transform already shows the X→Y map and
**Correspondence** already shows the canonical two-linked-window pattern.

---

## Parallel-branch & shared-file impact

The framework's parallel-safety contract: each app is a self-contained folder;
the four shared files (`src/index.tsx`, `src/apps.ts`, `CLAUDE.md`, `README.md`)
are append-only. How does each option sit against that?

| Option | Touches shared `lib/`? | Touches shared chrome (`SplitPanes`/`types`)? | New route/registry entry? | Append-only-safe? |
|---|---|---|---|---|
| **A** | Pulls PT's pane components / shaders into Complex Particles (copy or import across app folders) | No (PaneDef already supports it) | No | Mostly — but **cross-app import** (Complex Particles importing PT internals) breaks the "self-contained folder" rule |
| **B** | **Yes** — extends `lib/particles` (linked cameras, picking). High blast radius: every particle viewer shares it | Possibly `types.ts` if panes need per-pane camera hooks | No | **Risky** — `lib/particles` is the most-shared, most-contended file set; a B-shaped change there can collide with the pair-mode plan and any other in-flight particle work |
| **C** | No (only a URL-param read on each app's mount) | No | No new route; reuses existing `#/plane-transform` + a query string | **Safest** — additive, per-app, no shared-engine edits |

> [!WARNING]
> Option B edits `lib/particles` — the single most parallel-contended code in the
> repo. There is already a **pair-mode 4-PR plan** in flight against the same
> engine (the decomposition plan flags it: pair mode lands "as one more posture on
> the same engine"). A multi-viewport/linked-camera change for Rays and a
> multi-function change for pairs both reach into the same state/camera model.
> That is a real collision surface, and it is exactly the kind of shared-engine
> churn the append-only discipline is meant to keep us out of.

Option A's cross-app import is its own smell: today Complex Particles and Plane
Transform are independent folders that share only `lib/` and `components/`. Having
ComplexParticles reach into `animations/PlaneTransform/` (for its `InputPane` /
`OutputPane` / shaders) couples two app folders that the framework deliberately
keeps independent. If you instead *copy* PT's renderer into Complex Particles, you
now have two copies of a 2D plane-map renderer in the tree — the literal
duplication the pivotal finding warns about, made concrete in files.

---

## Operational reality under `npm run build` only

The only CI gate is `npm run build` (`tsc && vite build`). That shapes what is
*safe to merge*, not just what is *nice*.

- **`tsc` will catch the cheap mistakes** (the `ViewDef` node|panes union is a
  type error if you pass both), but it will **not** catch a stranded second rAF
  loop, a leaked WebGLRenderer, or two cameras drifting out of sync. Those are the
  exact failure modes A and B introduce, and **none of them are covered by any CI
  check** (`npm test` covers chrome pure logic; there are no engine integration
  tests).
- **WebGL context budget is a real ceiling.** Browsers cap live WebGL contexts
  (commonly ~16). Complex Particles already runs one heavy context with up to 12
  Riemann-sheet material sets. Option A adds **two more** ortho contexts (PT runs
  one renderer per pane). Option B adds **one or two more** perspective contexts.
  On phone (`usePhone` re-chrome, DPR capped at 2 — PT already comments on phones
  reporting DPR 3), a 4D cloud + a second linked 4D viewport is a genuine
  performance and memory question that `npm run build` will happily green-light
  and a low-end device will choke on. The collapsed-but-not-unmounted rule
  (WebGL state survives collapse) means these contexts stay *live* even when the
  Rays view is hidden in another posture — a returning user who lands in `single`
  is still paying for Rays' second context if both views are mounted.
- **Teardown is hand-rolled and unforgiving.** ComplexParticles' `onMount`
  returns a ~30-line cleanup that stops the loop and disposes every geometry /
  material / texture / axis / scaffold (`ComplexParticles.tsx:697-728`). A second
  renderer (A or B) needs its own equally careful teardown, wired into the same
  `Canvas3D` lifecycle, or every route visit strands resources. This is the kind
  of thing that builds clean and leaks in production.

> [!IMPORTANT]
> Option C is the only option that adds **zero** new WebGL contexts, **zero** new
> rAF loops, and **zero** new teardown surface. Under a "build is the only gate"
> regime, that is not a minor convenience — it is the difference between a change
> I can confidently merge and one I'd want manual perf verification on across
> phone + desktop before trusting.

---

## Tech-debt delta

What does each option leave behind for the next maintainer?

| Option | New debt introduced | Duplication created | Net debt verdict |
|---|---|---|---|
| **A** | Second renderer + its lifecycle inside a 950-line file; two color/zoom pipelines in one app | **High** — re-implements (or imports) PT's domain|image map; PT's identity now overlaps a posture | **Worst.** Adds debt *and* duplication; the next Domain-coloring edit must be done twice |
| **B** | Linked-camera + picking machinery in `lib/particles` used by exactly one posture; a "muddier picture" the plan itself flags | **Low engine dup, but a conceptual dup** of Correspondence's "two linked windows" idea, re-grown bespoke | **Medium-high.** No file duplication, but a single-consumer generalization of the most-shared engine is classic premature abstraction |
| **C** | A small `?fn=…&p=…&q=…` param contract shared by two apps (must stay in sync with `embedParams`) | **None** | **Lowest.** The only debt is a tiny URL contract, and `embedParams` already proves that pattern works |

The plan's own Phase-2 list already contains the C resolution almost verbatim:
*"Plane/particles unification (`!high` backlog)… The resolution is likely 'name
them graph vs map' in both explainers, not 'merge them.' Cheap doc/labeling
task."* The decomposition review independently reached the maintainer-friendly
answer. Options A and B are, from a debt standpoint, *relitigating a question the
review already answered* — and answering it the more expensive way.

---

## Scope boundaries — what is the actual job?

The decomposition's whole thesis was **"tame the surface, not the code."** PR-0
through PR-2 shipped that with *zero engine changes* — they were `layouts`,
`defaultLayoutId`, a preset table, and a caption flag. That is the spirit of the
work. Phase-2's Rays item is the one place the plan tags as "genuinely new
capability," and it is worth asking whether that tag is *aspirational* rather than
*required*.

Rays' job, pedagogically, is "follow the domain net into the image — watch X go
to Y." Today's `rays` posture already does a version of this: **Net** render mode
+ **Motion**, with Domain coloring carrying each point's identity across the
auto-tumble (`ParticleViewerShell.tsx:674-680`). That is *already* an X→Y story on
the 4D engine — the net of the domain, animated into its image, color preserving
identity. The split view is a *second framing* of the same story, not a missing
capability.

> [!IMPORTANT]
> Scope check: the request asks "how should the linked split view be realized,"
> which silently assumes the linked split view **must** be built inside Complex
> Particles. As the maintainer I push back on that premise. The repo already has
> the linked split (Plane Transform) and already has the canonical two-linked-
> window pattern (Correspondence). Building a *third* instance of "domain | image
> of the same function" inside a third app is scope creep dressed as a posture.

---

## The Embed/route implications

Each app's chrome-less embed is a real, shipped surface (`docs/EMBEDS.md`):
`#/embed/complex-particles` and `#/embed/plane-transform` already exist.

- **Option A** would create pressure for an `#/embed/rays` or a Complex-Particles
  embed mode that renders the PT-style split — i.e. a *third* embeddable
  domain|image applet that does what `#/embed/plane-transform` already does. More
  route surface, more registry append, more duplication of an existing applet.
- **Option B**'s linked-4D-viewport view would, to be embeddable, need its own
  embed wiring (two cameras configured by URL). That is a meaningful extension of
  `embedParams` for one bespoke view.
- **Option C** needs **no new embed route at all**. The cross-app handoff is just
  a query string on the *existing* `#/plane-transform` (and symmetrically a
  param on `#/complex-particles`). The embed story stays exactly as it is; the
  handoff link can even point at the existing `EmbedPlaneTransform` if you want an
  inline applet. This is the append-only dream: a feature that adds no rows to any
  shared list.

---

## Where I disagree with the framing, and the hybrid I prefer

I do not think the answer is a pure A, B, or C. The pivotal finding kills A. B is
a real-but-premature engine generalization I won't sign off on for one posture. C
is correct on framework health but the prose under-sells the *pedagogical* loss:
"cross-app jump is a context switch" is true, and yanking a learner out to another
app mid-thought is a genuine cost.

So I endorse a **C-first hybrid** that buys back most of the pedagogy cheaply:

1. **Keep Rays as an in-app posture, but as the *particle-native* X→Y story it
   already is** — Net + Motion + Domain coloring, on the one 4D cloud. Sharpen it
   (a tasteful caption, maybe a recommended Net+Motion preset and a gentle
   auto-spin in a z-plane), but **do not** add a second view or a second engine.
   This is a `layouts`/caption/preset change — the PR-0 mechanism, zero engine
   risk.
2. **Make Plane Transform THE domain|image map** and say so in both explainers
   ("graph vs map"), the cheap labeling task the plan already lists.
3. **Add a lightweight, additive cross-app handoff**: from Complex Particles' Rays
   posture, a single "Open as a plane map →" affordance that links to
   `#/plane-transform?fn=…&p=…&q=…` carrying the current function state (reuse the
   `embedParams` parsing pattern; PT already reads `embed?.fn/p/q/extent`). One
   small link, no new route, no new engine, no shared-file churn beyond an
   append. The learner gets the split *when they want it*, in the app that was
   built for it, with their function carried over.

This is C's zero-duplication and zero-engine-risk profile, with B's "stays on the
4D engine" honored (Rays stays particle-native), and the context-switch cost
softened to a single deliberate click that *preserves state across the jump*. It
does not foreclose a future true in-app split — if real usage shows the handoff
isn't enough, B becomes a justified investment *then*, on evidence, after pair
mode has settled the multi-instance engine questions.

---

## Verdict

**Endorse: Option C, as a C-first hybrid (C + a sharpened particle-native Rays
posture). Reject A outright. Defer B.**

| Lens | A | B | C / hybrid |
|---|---|---|---|
| Pedagogy | Good (true split) but redundant with PT | Best-if-it-worked (novel, in-app) | Good — Rays stays an in-app X→Y story; the *split* is one click away with state carried |
| Framework health / anti-fragmentation | **Fails** — second engine in one app | Passes literally, but premature engine generalization | **Best** — zero engine change |
| Clean architecture given PT exists | **Worst** — overlaps/duplicates PT | Re-grows Correspondence's idea bespoke | **Best** — clean graph/map division of labor |
| Parallel-branch safety | Cross-app coupling | Edits the most-contended `lib/` (collides with pair mode) | Additive, per-app, append-only |
| Operational risk (`build`-only CI) | High (2 extra contexts, 2 lifecycles) | High (linked cameras, picking, leaks) | **Lowest** — no new contexts/loops/teardown |
| Tech-debt delta | Worst | Medium-high | Lowest |

**Duplication risk, stated plainly:** Option A *is* duplication of Plane Transform
— the pivotal finding is exactly right and is disqualifying. Option B is not file
duplication but is a *conceptual* duplication of Correspondence's two-linked-window
pattern, re-implemented bespoke against a single consumer. Option C is the only
choice with zero duplication of either kind.

**What concerns me about my own recommendation:** C's honest cost is that "Rays as
a posture" stops promising a literal side-by-side split *inside* Complex Particles.
If Dan's mental model of Rays is specifically "two pictures, side by side, in this
app," the handoff link will feel like a demotion. I think that's the right call —
the repo should not host three implementations of domain|image — but it is a
genuine narrowing of the original Rays ambition and should be named as such, not
smuggled in.

**What I'd change about the plan:** retire the Phase-2 framing that treats the
in-app split as the default destination ("gate the `rays` posture's full form on
it"). Re-tag the split view as *deferred / evidence-gated*, and promote the
graph-vs-map naming + handoff to the actual Phase-2 deliverable.

### MVP I'd actually merge (one small PR, zero engine risk)

1. **Sharpen the existing `rays` posture** (layout + caption + optional preset):
   Net render + Motion, Domain coloring, a one-line caption ("Follow the domain net
   into its image — color is the point's identity, carried across"). Pure PR-0
   mechanism (`layouts`/`layoutCaptions`/preset table). No new view, no engine
   touch.
2. **Graph-vs-map labeling**: one paragraph each in `ComplexParticles/EXPLAINER.md`
   ("this is the *graph* Γ_f") and `PlaneTransform/EXPLAINER.md` ("this is the
   *map* z↦f(z)"), cross-referencing each other. Per-app files only.
3. **One handoff link** from the Rays posture: "Open as a plane map →" →
   `#/plane-transform?fn={name}&p={p}&q={q}` (and, if desired, the symmetric
   "See the 4D graph →" in PT). Reuse the `embedParams` param pattern; PT already
   parses `fn/p/q/extent`. Append-only — no new route, no registry row.

Explicitly **out of MVP scope** (and out of scope until evidence demands it): any
second WebGLRenderer, any paned `ViewDef` in Complex Particles, any
linked-camera/picking generalization of `lib/particles`, any new embed route.
Those are exactly the things that build clean, leak in production, and collide
with the pair-mode branch.

This MVP ships the X→Y *pedagogy* now, on the engine we already trust, with no
duplication and nothing for the next maintainer to clean up — and it leaves the
door open to a real in-app split later, *if and only if* usage proves the handoff
insufficient and pair mode has settled how the engine handles multiple instances.

---

## Self-reflection

1. **What would you do with another session?** Prototype the handoff URL contract
   concretely — confirm `PlaneTransform`'s `fn/p/q` param surface round-trips the
   `POW_PQ_INDEX` and `QUADRATIC_INDEX` special cases (the quadratic carries three
   complex coefficients that the current embed params may not cover), since that is
   the one place the cheap option could quietly fail to preserve state across the
   jump.
2. **What would you change about what you produced?** I leaned hard on "B edits the
   most-contended `lib/`"; I should have read `useGestureRotation` and `ParticleState`'s
   camera ownership end-to-end to quantify *exactly* how much engine surface a linked
   second viewport touches, rather than reasoning from the single-`cameraRef`
   structure I saw. The conclusion holds, but the magnitude is asserted, not measured.
3. **What were you not asked that you think is important?** Whether Correspondence
   (Mandelbrot↔Julia, two linked windows) is the *real* precedent for "linked
   split of one object" and should be where any future linked-4D work lands —
   nobody asked whether the right home for B-if-ever-built is Correspondence's
   pattern rather than a bespoke Complex Particles view.
4. **What did we both overlook?** The collapsed-but-mounted rule: a second WebGL
   context for Rays stays *live* even when the user is in another posture (views are
   hidden, never unmounted). The cost of A/B is therefore paid continuously, not
   only when Rays is on screen — a point neither the request nor my first pass
   foregrounded.
5. **What did you find difficult?** Separating "B fragments the engine" (it
   doesn't, literally) from "B is still the wrong call" (premature single-consumer
   generalization). The constraint language ("don't fragment the engine") gives B a
   technical pass it doesn't deserve on judgment, and articulating that gap precisely
   took care.
6. **What would have made this task easier?** A short doc of `lib/particles`'
   camera/viewport invariants (is it one-camera-per-state by contract, or
   incidentally?). I had to infer the multi-viewport difficulty from the code shape.
7. **Follow-up value:** MEDIUM — the verdict (C-first hybrid, reject A, defer B) is
   sound and well-grounded in the code I read, but the handoff URL contract for the
   quadratic/`z^(p/q)` cases is unverified and could change the MVP's step 3 if the
   existing param surface can't carry that state.
