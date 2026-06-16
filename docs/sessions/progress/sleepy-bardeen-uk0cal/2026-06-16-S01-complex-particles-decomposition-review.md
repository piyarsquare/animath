---
kind: progress
session: 2026-06-16-S01
date: 2026-06-16
title: Complex Particles — should it become several sub-apps? (multi-lens review)
branch: claude/sleepy-bardeen-uk0cal
slug: sleepy-bardeen-uk0cal
status: in-progress
build: unknown
followup: null
pr: null
app: complex-particles
signals: needs-dan
next: Synthesize the six persona reviews into a recommended decomposition (or "don't split, do X instead") for Dan's decision.
---

# Complex Particles — should it become several sub-apps? (multi-lens review)

## Session purpose

Dan's concern: Complex Particles (the repo's most complicated app) has reached a
complexity that makes it "too difficult to manage." He is tempted to split it into
several distinct **sub-apps** but is unsure how to divide things. He named several
*uses* it currently serves:

1. Understanding a **specific** complex function.
2. Understanding complex function **spaces** and different **representations** of
   those transformations.
3. Exploring **changes of basis**.
4. Connecting **Hopf → Spherical → Projection**.
5. Connecting the **X view to the Y view** as rays sweep the surface.

He asked for a `/three-hats`-style review but with a **custom, larger panel** of
personas: a UI thinker, a mathematician, a "Yelp reviewer of math-ed products," a
deep complex-function expositor (words-with-animation), and an aesthete. This
session runs that panel and synthesizes it into a recommendation for his decision.

## Previous session

First tracked session on this branch. The directly-relevant prior art lives on
other branches: the [three-hats Complex Particles review](../three-hats-particle-app-rill2c/2026-06-10-S01-three-hats-complex-particles.md)
(PR #205) settled a *narrower* question — "expand the app vs open a new one" for
**multi-function** viz — with a unanimous **"expand, don't fragment"** and a
committed 4-PR pair-mode plan. The [complex-guide series](../complex-particles-guide-tdlhk0/2026-06-14-S01-math-code-guide.md)
session left a standing `!high` backlog item: **plane/particles unification**.
The [ideas-triage](../particle-viewer-ideas-priority-UDZRe/2026-06-05-S01-ideas-triage-quick-wins.md)
session deferred two big rocks: a **unified channel-mapping matrix** and **custom f**.

## Working notes

### 🟡 milestone · 19:02 — Six reviews in; near-unanimous, with three live dissents
**Why:** The panel returned and converged hard. All six verdicts are **"partial ·
high confidence"**: nobody wants separate apps (spectrum point E). The
recommendation, the two-axis model, and the genuine open decisions for Dan are in
the **Synthesis** section below. The single loudest signal — louder than the
partition itself — is **fix the default landing state** (4 of 6 independently said
the cold-open onto all 8 panels is the actual problem). The sharpest dissent is the
Aesthete's: *subtract before you partition*.

### 🟣 decision · 18:56 — Panel composition: six lenses, not three
**Why:** Dan named five personas (UI · math · Yelp-style reviewer · expositor ·
aesthete) and waved "you get the idea." I added a **sixth — framework maintainer /
product architect** — because the actual decision is architectural and there is a
*prior ruling against fragmentation* to reconcile; without that lens the synthesis
can't be actionable (it would be poetry with no buildable mechanism). Each agent is
briefed with the same context + the **decomposition spectrum** (presets → mode-pills
→ layouts → hub app → separate apps) so none treats "split or don't" as binary, then
its own lens. All six run in parallel, foreground, then I synthesize.

### 🔵 finding · 18:55 — The current control surface is genuinely large
**Why:** Grounding the brief in the real surface, not the README's idealization.
`ParticleViewerShell` + `useParticleState` define **8 archetype panels** (Function ·
Domain · Camera · Color · Render · Motion · 4D Rotation · System) totalling **~60
individual controls**, over **~22 functions** (5 categories; several multivalued with
branch/Riemann-sheet machinery + tinting), **4 render modes** (Points/Sheet/Tiles/Net,
each with sub-controls), a **3-stop morphing projection** (Perspective⇠Torus⇢Sphere/Hopf)
**+ 4 drop-axis slices**, two independent color channels, adaptive sampling, 7 sampling
patterns, a |z| radius band, and quaternion 4D rotation with composable continuous
spins. Dan's "too complex to manage" is well-founded, not a vibe.

### 🔵 finding · 18:54 — Prior art partially answers an adjacent question
**Why:** Avoid re-litigating settled ground and surface the real tension. The prior
three-hats verdict ("expand, don't fragment") answered *multi-function viz*, not
*total-surface decomposition*. The new question is broader and can be answered
differently without contradicting it — especially because "sub-apps" need not mean
code fragmentation (Trinary's Observatory/Lab modes and Stable Matching's
matrix/welfare/lattice layouts both present as "sub-apps" while sharing one engine).
The panel must engage this head-on.

### 🟡 milestone · 18:54 — Session opened via start-session
**Why:** Dan asked to run the skill before work. Branch `claude/sleepy-bardeen-uk0cal`
is fresh (no prior handoff here); folders created; backlog + the three on-topic
handoffs read.

## The decomposition spectrum (shared brief to the panel)

Not binary. Five points from least to most surgery:

- **A · Presets on the monolith** — keep one app; add task-shaped starting points
  ("Study one function", "Hopf view", "Domain coloring") that set defaults + open the
  right layout. (The Hopf-study button already proves the pattern.)
- **B · Mode pills** — top-bar modes that re-skin which panels/views exist (Trinary's
  Observatory ↔ Lab). One app, one route, distinct postures.
- **C · Layout "instruments"** — each task is a saved layout that hides irrelevant
  views/panels (`LayoutDef.views[id].open=false`; Stable Matching's three instruments).
- **D · Hub app** — a gallery-like launcher that opens focused sub-views of the same
  engine.
- **E · Separate apps/folders** — genuinely distinct registry entries (the
  fragmentation the prior ruling resisted).

## Synthesis

### Headline (6/6, high confidence)

**Don't split into separate apps. Split the *surface*, not the *code*.** Every
reviewer landed on **"partial"**: the mathematics is *one* object (the 4D graph
`Γ_f`) seen through many faithful views; the engine is *one* consolidated codebase;
and `appId` is the **persistence root**, so separate apps would fork every saved
setting and re-fragment the engine the repo's biggest cleanup just unified. "Sub-apps"
should mean **in-app postures** (presets + layouts, optionally mode pills), not new
registry entries. This is *compatible* with the prior "expand, don't fragment"
ruling, not a reversal: taming the surface ≠ fragmenting the engine.

| Lens | Verdict | Mechanism | One-line takeaway |
|---|---|---|---|
| UI (Priya) | partial · high | **B** on **C+A** | 4 postures (Inspect/Surface/Hopf/Basis); **kill the cockpit default**; per-function preset defaults |
| Math | partial · high | **A+C** | One graph, four *lenses by target geometry* (Plane/Cylinder/Sphere/Branch); **never split projection from rotation**; keep Plane Transform as the map-vs-graph sibling |
| Yelp (Marcus) | partial · high | **B over A** | "Meet a Function" front door; default to 1 function + morph slider + auto-tumble; Advanced holds today's surface |
| Expositor | partial · high | **C+D**, 2 immersive | Six captioned chapters mirroring the guide ToC; *the unit of decomposition is the caption, not the control* |
| Aesthete | partial · high | **subtract → C+D** | **Cut before you partition**; promote Hopf-collapse + X→Y to immersive quiet rooms; wall the comparative uses into a Lab |
| Maintainer | partial · high | **C+A**, B if needed | Task-layouts + presets, one appId; mode pills must be in-component (PolygonWorlds), **never a Trinary-style hash hop** (that forks persistence) |

### The four convergences

1. **No separate apps (E).** Unanimous. One engine, one `appId`, one persistence root.
2. **The default landing is the real problem** (Priya, Marcus, Expositor, Aesthete).
   The highest-leverage change — cheap and independent of any partition — is to stop
   cold-opening onto all 8 panels and land in one calm single-function posture.
3. **Per-function preset defaults.** "Different functions want different
   modes/domains" is a *defaults table keyed by function*, applied non-destructively —
   not per-function apps (Priya, Math, Marcus).
4. **Mechanism = C (layout instruments) + A (presets)** as the cheap, reversible
   spine; an **in-component** posture selector (B, never a hash hop) as the visible
   labels if salience demands; **immersive** single-view stages for the two reverent
   views (Hopf-collapse, X→Y sweep).

### The two-axis model (the synthesis insight)

Two *orthogonal* decompositions, both wanted, neither a code split:
- **Postures = "what do I want to *do*"** (task/curriculum-shaped): Single Function ·
  Representations · Change of Basis · Hopf→Sphere · X→Y rays. → **layouts/presets**.
- **Per-function presets = "what does this *function* want"** (target-geometry-shaped,
  the mathematician's axis): Plane (`z²`, `sin`) · Cylinder/log-polar (`exp`, `ln`,
  `z^n`) · Riemann sphere (Möbius/rational) · Branch sheets (multivalued). → **a
  defaults table keyed by function index**, applied on function-change only.

### The three live dissents (decisions for Dan)

1. **Subtract vs. hide-by-default** (Aesthete vs. Maintainer/UI). The Aesthete wants
   *deletion* (orientation matrix out of the default, Tiles mode, sprite textures,
   8→3 colormaps, jitter/shimmer→0, hue-shift); the maintainer/UI want *progressive
   disclosure* (hide, keep for power users). Independent agreement on real **dead
   code** to delete regardless: `inputCoord`/`outputCoord` (pinned-Cartesian, unused);
   the dual boundsLock widgets are "two ways to do one thing."
2. **Mode pills (B) vs. ordered captioned chapters (C/immersive).** Priya & Marcus
   want visible top-bar pills (a legible feature map); the Expositor argues *against*
   pills ("a toggle, not a sequence; carries no caption") for ordered layout-chapters
   with a per-view caption. Reconcilable: the selector *is* the layout chooser **and**
   sets the per-view `hint` caption — but Dan picks the affordance.
3. **Build the one genuinely new thing?** Use #5 (X-view ↔ Y-view as rays sweep) is
   the only under-built use — the single-view shell can't show it; it needs a linked
   **`panes` split view** (Plane Transform / Correspondence pattern). Everything else
   is *re-posing existing capability*.

### Notable side-findings

- **Plane Transform is not redundant** with Complex Particles (Math): Particles draws
  the *graph* `(z,f)∈ℝ⁴`; Plane Transform draws the *map* (the `(u,v)` shadow). The
  existing two-app split is mathematically correct — which reframes the `!high`
  "plane/particles unification" backlog item as **"name them graph vs map,"** not
  "merge them."
- **Composes with the pair-mode 4-PR plan** (Maintainer): the plan's PR-2 extraction
  makes the orchestration ownable; task-layouts give the tamed surface a friendlier
  door; pair mode then lands as one more `axesMode` field + one more task layout —
  inside the same app. Splitting into apps now would *collide* with that plan.

### Recommended path (PR-sized, reversible-first)

1. **PR-0 — the cheap, high-leverage win:** a calm default posture (land in one
   function, Color, a clean Perspective/Drop view; auto-tumble doing the 4D work) +
   4–5 **task layouts** + a **per-function preset-defaults** table. No engine or state
   change; append-only inside `ParticleViewerShell`/`ComplexParticles`.
2. **PR-1 — the extraction** (= the pair-mode plan's PR-2): pull the per-branch
   material orchestration into `lib/particles`, behavior-identical. The real
   "manageable" win.
3. **Later:** the X→Y linked `panes` view (#5); immersive stages for Hopf + X→Y;
   resolve the subtract-vs-hide and pills-vs-chapters calls; let pair mode land as a
   task layout.

> [!IMPORTANT]
> The two truly load-bearing decisions are Dan's: **(a) how aggressively to subtract**
> (the Aesthete's cut-list vs. hide-by-default), and **(b) the affordance** for moving
> between postures (top-bar pills vs. ordered captioned layouts). Both are reversible;
> neither blocks PR-0.
</content>
</invoke>
