---
kind: three-hats
session: 2026-06-16-S01
date: 2026-06-16
title: "Three Hats — Math-Viz & Pedagogy: Rays split-view realization"
branch: claude/sleepy-bardeen-uk0cal
slug: sleepy-bardeen-uk0cal
status: completed
build: passing
---

# Three Hats — Math-Viz & Pedagogy: Rays split-view realization

I read this as someone who will stand in front of a class and use these
animations to teach `z ↦ f(z)`. My only loyalty is to whether the picture tells
the truth and whether the interaction *builds the right mental model*. I am
skeptical of any split-view that looks impressive but quietly lies about which
object is on screen.

## Plan under review

<details>
<summary>Original request</summary>

```
Phase-2 of the Complex Particles decomposition: how should the "Rays (X→Y) linked split view" be realized?

CONTEXT. Complex Particles renders the 4D graph Γ_f={(z,f(z))⊂ℂ²} as a particle cloud. Five postures shipped (PR #222): Single Function, Representations, Change of Basis, Hopf & Projection, "Rays (X→Y)". Rays today opens Render + Motion on the single 4D cloud. Phase-2 should give Rays a linked domain | image split view.

PIVOTAL FINDING. Plane Transform ALREADY is a domain|image linked split of the same function (panes domain z / image f(z), Domain coloring, linked zoom, draw-on-input; chrome-less EmbedPlaneTransform). A "Rays split" inside Complex Particles would substantially RE-IMPLEMENT Plane Transform.

BINDING CONSTRAINTS: (1) no engine fragmentation/duplication. (2) one app, one appId; postures in-component, never a route hop. (3) hue never encodes identity (color = z Domain or f Range). (4) append-only; z² landing untouchable.

OPTION A — Embed Plane Transform's renderer as the Rays view (a 2D-plane particle map, transform 0↔1) inside Complex Particles. Con: a different renderer than the other four (4D) postures; overlaps PT identity.
OPTION B — Particle-native input|output split: two panes, each the 4D cloud projected to isolate INPUT (DropU/DropV → z-plane) vs OUTPUT, linked camera + tapped "ray" correspondence. Pro: stays on the 4D engine. Con: muddier picture.
OPTION C — Resolve by naming/linking: make Plane Transform THE map, add a cross-app handoff (shared function via URL) Complex Particles ↔ Plane Transform, redefine/drop Rays so Complex Particles stays "the 4D graph" and Plane Transform stays "the map".

QUESTION: Which best serves (i) pedagogy & the learner's mental model of z→f(z), (ii) framework health/anti-duplication, (iii) clean architecture given PT exists? A/B/C/hybrid? Flag duplication risk; recommend with an MVP scope.
```

</details>

---

## 1. Two mental models, and why the difference is the whole ballgame

A complex function admits two honest pictures, and a learner needs *both*, but
needs to know **which one they are looking at at any moment**:

| Model | Object on screen | What it makes visible | What it hides | The app that owns it |
|---|---|---|---|---|
| **The graph** Γ_f = {(z, f(z))} ⊂ ℂ² | a 2-surface living in ℝ⁴, projected to 3D | the *pairing* (z, f(z)) as one geometric object; folds, branch sheets, the Riemann surface; Hopf/torus structure | the plane-to-plane *motion* — you never see "the domain go to the image", you see a static draped surface | **Complex Particles** |
| **The map** z ↦ f(z) | two flat ℂ-planes, identity vs image | the *transformation*: rotation, stretch, fold, conformality (right angles preserved), where the plane tears | the 4D ambient object; the graph is implicit, never drawn | **Plane Transform** |

These are not two skins on one idea. They are two **different functors from the
same data**:

- The graph throws away nothing — it is the literal set of input-output pairs.
  Its cost is that to see it you must project ℝ⁴ → ℝ³, and *the projection
  itself distorts* (Perspective everts the sheet at `3+v = 0`; Hopf collapses
  fibers). The learner's job is to learn to "see past" the projection.
- The map throws away the ambient ℝ⁴ and shows only the **shadow** `(u,v)` of
  the surface, but in exchange it animates the *correspondence*: you watch a
  patch of the domain *land* somewhere. The cost is that the graph — the single
  object that unifies domain and range — is never on screen; you infer it.

> [!IMPORTANT]
> The pedagogical north star: **the graph and the map are dual, and a learner
> who can move between them owns `z ↦ f(z)`.** The question "where should the
> domain|image split live" is really "which app should teach the *map*." There
> is already a correct, working answer: **Plane Transform is the map.** The risk
> in this Phase-2 is building a second, worse map inside the graph app and
> teaching the learner that the graph app *is* the map — which would corrupt
> exactly the distinction we want them to internalize.

---

## 2. What should "Rays (X→Y)" mean, mathematically — and is the name honest?

Dan's use #5 was phrased as *"connecting the X view to the Y view as rays sweep
the surface."* There are three distinct things "Rays" could honestly denote, and
they are **not** interchangeable:

| Reading of "Rays" | The mathematical object | Honest? | Already exists? |
|---|---|---|---|
| **(R1) Correspondence rays** | for a chosen domain point `z₀`, draw the literal segment `z₀ → f(z₀)` linking its position in a domain pane to its position in an image pane — the graph of the *pairing* as a tie-line | Yes — this is *the* "X view to Y view" reading | No |
| **(R2) Polar fibers / "Net"** | the engine's existing **Net** render mode: circles `|z|=r` and **rays** `arg z = θ` of the polar grid, carried through `f` | Yes, but it is a *sampling pattern*, not a domain→image link | Yes (Render → Net) |
| **(R3) Drawn curves through f** | Plane Transform's draw-on-input: a freehand or standard curve in `z`, mapped to its image curve | Yes — the cleanest "watch this set go to that set" | Yes (Plane Transform) |

> [!NOTE]
> The word **"Rays"** is doing two jobs in the current vocabulary and that is a
> semantic-hygiene problem. In Plane Transform's explainer and the Net mode,
> **"rays"** already means *radial spokes `arg z = θ`* (R2). If the new posture
> uses "Rays" to mean *correspondence tie-lines `z → f(z)`* (R1), the same word
> now denotes two unrelated things in one app family. A learner who has just
> read "rays = constant-argument spokes" will be misled. **Do not ship a posture
> named "Rays" that means R1.** If the posture is the correspondence, call it
> **"Correspondence"** or **"z → f(z)"**; reserve "Rays" for the polar spokes.

The honest interpretation of Dan's *intent* (#5) is **R1 — correspondence
rays** — the literal "this input goes to this output" line. That is genuinely
not built anywhere. But note what R1 actually *is*: the segment from `z₀` to
`f(z₀)`, drawn between two copies of ℂ, **is a 2D slice of the graph Γ_f
itself** — it is the chord projecting the ℝ⁴ point `(z₀, f(z₀))` onto its first
and last factors and tying them. So R1 is *consistent* with "Complex Particles
is the graph app" — it is the graph, made legible as a correspondence. That is a
point in favor of building *something* here, against pure Option C. We return to
this in the verdict.

---

## 3. Does a domain|image split belong with "the graph" app at all?

This is the crux, and my answer is nuanced: **a domain|image split of two flat
ℂ-planes does NOT belong in the graph app. A correspondence overlay (R1) might.**

The reasoning:

- A side-by-side **flat domain pane | flat image pane** *is the map model*. It is
  Plane Transform's entire identity. Putting that exact thing inside Complex
  Particles tells the learner "the graph app and the map app are the same app
  in two costumes." That **erases the dual distinction** we most want to teach.
  This is the deep objection to **Option A**, beyond the engineering
  duplication: it is *pedagogically* a category error to host the map inside the
  graph.
- But a **correspondence** — keep the 3D graph/projection on screen as the hero,
  and additionally light up, for a tapped or swept `z₀`, the tie `z₀ → f(z₀)` —
  does **not** abandon the graph. It annotates it. That is legitimately a thing
  the graph app can do that the map app cannot (the map app has no ambient ℝ⁴ in
  which the pairing is a chord).

> [!IMPORTANT]
> Litmus test for "does this belong in the graph app": **is the 4D graph still
> the thing on screen?** Option A fails it (the graph vanishes; two flat planes
> replace it). A correspondence overlay passes it (the graph stays; the pairing
> is highlighted). This litmus is the cleanest way to keep the two mental models
> from collapsing into one.

---

## 4. Is Option B truthful, or does it lie? (The drop-axis trap)

Option B proposes two panes, each the 4D cloud projected to "isolate INPUT
(DropU/DropV → z-plane) vs OUTPUT." **I checked the actual projection code**
(`src/lib/viewpoint.ts:87–90`), because the truthfulness of Option B turns
entirely on what the drop-axis modes really do:

```
DropX → (y, u, v)     DropY → (x, u, v)
DropU → (x, y, v)     DropV → (x, y, u)
```

| Claim in the request | What the code actually produces | Verdict |
|---|---|---|
| "DropU/DropV → the z-plane (x, y)" | DropU keeps `(x, y, v)` = `(Re z, Im z, **Im f**)`; DropV keeps `(x, y, u)` = `(Re z, Im z, **Re f**)` | **False.** Neither isolates the domain. Each is a **3D real-valued graph over the domain** of *one output component*. |
| "isolate INPUT vs OUTPUT" | There is no drop-axis that yields the pure output plane `(u, v)`. DropX gives `(y, u, v)`, DropY gives `(x, u, v)` — each keeps *one input axis*. | **False.** No single drop gives the clean image plane either. |

This is not a quibble; it is the heart of the matter.

> [!IMPORTANT]
> **Option B as specified is mathematically wrong.** There is no projection of
> the 4D graph that gives you "the domain plane" in one pane and "the image
> plane" in the other while staying on the existing engine — because *dropping
> two axes at once is not a projection mode the engine has*, and dropping one
> axis always leaves you with a mixed `(input, input, output)` or
> `(input, output, output)` 3-slice. To get the flat z-plane you must discard
> *both* `u` and `v`; to get the flat image plane you must discard *both* `x`
> and `y`. Those are 2-axis drops, which is exactly Plane Transform's
> `transform = 0` and `transform = 1` panes — i.e. **Option B done correctly
> collapses into Option A.**

What Option B would *actually* show, if built as the request describes (DropU |
DropV side by side), is two **real graph surfaces** — `(x, y, Im f)` next to
`(x, y, Re f)`. Those are honest and even useful pictures (they are the standard
"two real surfaces over the domain" decomposition of a complex function, the one
in Needham-style figures). But they are emphatically **not** "the domain and the
image," and a tie-line drawn between them would not be the correspondence
`z₀ → f(z₀)` — it would be a line between `(z₀, Im f(z₀))` and `(z₀, Re f(z₀))`,
which is geometrically meaningless to a learner. **Option B as written would
teach a falsehood**: it labels mixed 3-slices as "input" and "output."

Could Option B be *salvaged* into truth? Only by adding genuine 2-axis-drop
projection modes (DropUV → flat `(x,y)`; DropXY → flat `(u,v)`). But once you do
that, each pane is a flat 2D plane rendered through the particle engine — and you
have rebuilt Plane Transform's two panes inside Complex Particles. So the
salvage *is* Option A. Option B is therefore either **false (as written)** or
**Option A in disguise (if fixed)**. It has no truthful, distinct middle ground.

---

## 5. The role of Domain coloring (identity across the map)

Whatever is built, the binding constraint **hue = z (Domain) or f (Range), never
identity** is exactly right, and Plane Transform already uses it the load-bearing
way: it colors **by Domain** (hue = `arg z`) so a point *keeps its color across
the map*. That single decision is what makes the map legible — "same color = same
point" (PT's own README) — and it is the mechanism by which a learner *reads the
correspondence without tie-lines at all*. Color-as-identity is the cheapest,
most truthful correspondence device there is.

Implications for the options:

- For any correspondence picture (R1) inside Complex Particles, **Domain
  coloring must be the default**, for the same reason. If a tapped `z₀` is, say,
  green, its image must be green; the tie-line is then confirmation, not the only
  cue. Range coloring would *break* the correspondence (the image pane would
  recolor by `f`, severing the visual link) — so a correspondence posture should
  *force or strongly default to* Domain coloring and warn when the user flips to
  Range.
- This also means the correspondence is **already 80% present** in Plane
  Transform via color alone; the tie-lines (R1) are an *enhancement of an
  existing truthful device*, not a new one. That further argues the
  correspondence belongs where the color-identity machinery already lives — i.e.
  **Plane Transform**, not a fresh re-implementation.

---

## 6. CVD / legibility of the "aha"

The phase→hue wheel is the standard domain-coloring device, and it has a real
accessibility cost: a red-green-deficient viewer cannot reliably separate
`arg z = 0` (red) from `arg z = ±2π/3` regions, so "same color = same point"
partially fails for ~8% of male learners.

| Concern | Status today | What the split-view should do |
|---|---|---|
| Phase→hue under CVD | Complex Particles already ships a **Dual-hue CVD** blue→yellow ramp and sequential maps (Viridis/Magma); PT ships HSV only | A correspondence view that *relies on color for identity* must offer the CVD ramp, or the "aha" is inaccessible to CVD learners |
| Cyclic-quantity seam | the CVD ramp has one wrap seam (honest, documented) | acceptable; the seam should sit on the branch cut where a discontinuity is *expected* |
| Tie-lines as a CVD backstop | n/a | **This is the strongest argument for R1 tie-lines**: an explicit `z₀ → f(z₀)` line is a *color-independent* correspondence cue, so it rescues the "aha" for CVD viewers in a way color alone cannot |

> [!NOTE]
> R1 correspondence rays are not just eye-candy: they are the **CVD-accessible
> realization of "same color = same point."** That is a genuine pedagogical
> value-add, and it is the one thing the existing color-identity device cannot
> do by itself. If anything is built here, it should be tie-lines *as an overlay
> on the graph*, defaulting to Domain color, with the CVD ramp available.

---

## 7. Which realization produces the "aha"?

The "aha" for `z ↦ f(z)` is the moment a learner *predicts* where a point or
curve will land and *watches it happen*. That is an **animated correspondence**,
and the two truthful ways to deliver it are:

1. **The map, with motion** (Plane Transform): draw a curve on `z`, see its
   image; or — even better, and *not yet built* — a `transform` slider/animation
   that morphs the domain pane *continuously* into the image (PT's shader already
   carries `transform ∈ {0,1}`; interpolating it 0→1 would literally animate the
   plane deforming into its image — the single highest-"aha" feature in this
   whole family, and it lives in PT).
2. **The graph, with a swept correspondence** (R1 in Complex Particles): sweep
   `z₀` along a path and watch the tie-line `z₀ → f(z₀)` sweep the surface — Dan's
   literal phrasing of #5.

Both are honest. The first is *cheaper* (PT already has the renderer, the color
identity, the draw-on-input, the linked zoom, and a `transform` uniform begging
to be animated) and lives in the app whose **whole identity is the map**. The
second is *distinct* (it is a property of the graph the map cannot show) but
risks the category error if it degrades into "two flat planes."

---

## 8. Option-by-option scorecard (my lens only)

| Criterion | A — embed PT renderer | B — particle DropU/DropV split | C — name+link, drop/redefine Rays | **Hybrid (recommended)** |
|---|---|---|---|---|
| Mathematical fidelity | High (it's the real map) | **Broken** (mislabels mixed 3-slices as input/output) | High (each app stays its true object) | High (graph stays; tie-lines are real chords) |
| Builds the right mental model | **Hurts** — hosts the map inside the graph, collapsing the dual | Hurts — teaches a false "input/output" | **Best** — sharpens graph-vs-map | Good — graph app gains a graph-native correspondence |
| Honest framing | Misleading ("this graph app is now the map") | Dishonest labels | Honest | Honest (named "Correspondence", not "Rays") |
| Semantic hygiene ("Rays") | unresolved | unresolved | **resolves it** (drop "Rays" the posture) | resolves it (rename to Correspondence) |
| CVD/"aha" accessibility | inherits PT (HSV only today) | n/a | depends on PT | **best** — tie-lines are color-independent |
| Anti-duplication / framework health | **Worst** — re-implements PT | Bad — new dead-end renderer | **Best** — zero duplication | Good — overlay reuses the existing cloud, no 2nd renderer |

---

## Verdict

**Endorsed: Option C as the spine, with a small, graph-native enhancement
(NOT a domain|image flat split) layered on top. I reject Option A and reject
Option B. I'll call the endorsed shape C+ (C with a correspondence overlay).**

Reasoning in one breath: Plane Transform *is* the map and already does the
domain|image split truthfully, with the load-bearing color-identity device.
Complex Particles *is* the graph. A flat domain|image split inside the graph app
(Option A) collapses the two mental models we most want to keep distinct, and
duplicates a whole renderer. Option B is, on inspection of the real projection
code, **mathematically false** — DropU/DropV keep `(x,y,Im f)` and `(x,y,Re f)`,
not "the domain" and "the image"; fixing it turns it into Option A. So the only
honest "new" thing the graph app can offer is a **correspondence overlay on the
graph** (Dan's true #5): tie-lines `z₀ → f(z₀)` for a tapped/swept point, drawn
in the existing 3D scene, defaulting to Domain color, CVD ramp available.

### Concerns / required changes

1. **Rename the posture.** Drop "Rays" as the posture name (it already means
   polar spokes in Net/PT). Either call the graph-native overlay **"z → f(z)"**
   / **"Correspondence,"** or, if Dan prefers, retire the fifth posture entirely
   and point users to Plane Transform via the handoff (pure C). Do not ship a
   posture named "Rays" that means tie-lines.
2. **Force/strongly-default Domain coloring** in any correspondence view; warn
   on Range flip (it severs the link).
3. **Build the cross-app handoff** (C's core): a shared-function URL link
   Complex Particles ↔ Plane Transform (the embed param plumbing already exists
   in `lib/embedParams`/`PlaneEmbedConfig` and PT's `embed?.fn/p/q/extent`), so
   "see this as the map" is one click from the graph and back. This is the
   highest-value, lowest-risk deliverable and it *teaches the duality by making
   the two apps two views of one function*.
4. **Add the CVD ramp to Plane Transform** if the handoff makes PT the official
   "map" destination — PT ships HSV only today, so the map is currently less
   CVD-accessible than the graph. Cheap, high pedagogical value.
5. **Sharpen both explainers** to name the duality explicitly: Complex Particles
   = "the graph Γ_f"; Plane Transform = "the map z ↦ f(z)"; each links to the
   other. (This also closes the `!high` "plane/particles unification" backlog
   item the right way — *name them*, don't merge them.)

### The MVP that best teaches z ↦ f(z)

Smallest thing, biggest pedagogical return, in priority order:

1. **Cross-app handoff (C).** Shared-function deep link both directions, plus the
   one-line explainer additions naming graph vs map. *Zero new renderer, zero
   duplication, immediately teaches the duality.* Ship this alone and the
   Phase-2 goal is substantially met.
2. **(Optional, if a "new capability" is still wanted) the correspondence
   overlay** in Complex Particles: tap a domain point → draw the chord
   `z₀ → f(z₀)` in the live 3D scene, Domain-colored, with an optional sweep
   along a path. Reuses the existing cloud/camera — **no second renderer, no
   `panes` split.** Name it "Correspondence," not "Rays."
3. **Animate PT's `transform` 0→1** as a slider (the plane visibly deforming
   into its image). This is the single highest-"aha" feature in the family and it
   belongs in the map app, where the renderer already carries the `transform`
   uniform.

**Do not build:** Option A (PT renderer inside Complex Particles), or Option B's
DropU|DropV "input/output" panes (false labels). If schedule forces a single
deliverable, ship **MVP item 1 only** — it is the truthful core of Phase-2.

---

## Self-reflection

1. **What would you do with another session?** Prototype the correspondence
   overlay (item 2) to confirm tie-lines stay legible through the Perspective
   eversion and the Hopf collapse — a chord whose endpoint is on a fiber that
   collapses to a point may degenerate, and I have not verified that it reads
   cleanly across all three projection stops.
2. **What would you change about what you produced?** I'd quantify the "aha":
   actually test whether a swept tie-line is more illuminating than PT's
   draw-on-input + an animated `transform`, ideally with a real learner. My
   ranking of the three MVP items is reasoned, not measured.
3. **What were you not asked that you think is important?** Whether the *map*
   app (Plane Transform) should itself get the animated `transform` morph — I
   judge that the single biggest "aha" lever in the family, and it sits outside
   the literal A/B/C question but is more valuable than any of them.
4. **What did we both overlook?** That the request's premise "DropU/DropV → the
   z-plane" is factually wrong against `viewpoint.ts`. The whole of Option B
   rests on that false premise; catching it is the load-bearing finding here and
   it was not flagged in the prior six-lens review.
5. **What did you find difficult?** Separating "honest but useless" (Option B's
   two real-surface graphs) from "honest and useful" (R1 tie-lines) — both are
   truthful pictures, and the request conflated them under one label.
6. **What would have made this task easier?** A one-paragraph statement of the
   *learning objective* for posture #5 (predict-and-watch? read conformality?
   see the Riemann surface?) — the right realization depends on which "aha" is
   the target, and I had to infer it from Dan's #5 phrasing.
7. **Follow-up value:** MEDIUM — the recommendation (C+ over A/B) is sound and
   the Option-B fidelity refutation is verified against source, but the
   correspondence-overlay legibility across projections is untested and the
   "which aha is best" ranking is unmeasured.
