---
kind: plan
session: 2026-06-17-S01
date: 2026-06-17
title: "Quaternions — synthesis, candidate concepts & draft build plan"
branch: claude/quaternion-exploration-app-ig4jmy
slug: quaternion-exploration-app-ig4jmy
status: proposed
build: n/a
app: quaternions
next: Refine the lens set with Dan, then /three-hats this plan before building the "Two Clocks" spine
---

# Quaternions — synthesis, candidate concepts & draft build plan

<details><summary>Concept under exploration</summary>
quaternions — Hamilton's 4D number system (a + bi + cj + dk) and the algebra of
3D rotation: unit quaternions on S³ = SU(2), the sandwich product q v q⁻¹,
axis–angle with its half-angle, the SU(2)→SO(3) double cover (q and −q, the 720°
belt/plate trick), the Hopf fibration, and the eater.net / 3Blue1Brown
stereographic-S³ picture. Synthesized from one foundation-research document and
eight independent "lens" reports (originator · foundations · in-the-wild ·
new-light · geometer · builder · educator · game-designer).
</details>

## 1. Synthesis of perspectives

### Where the eight lenses converge (high confidence)

The agreement across lenses is unusually strong — six independent reports landed
on the same spine without coordination:

- **Lead with a *failure the learner can see*, not the formula.** The Originator
  (Hamilton's "wasted decade" of triplets), Foundations (the ℝ→ℂ→ℍ ladder and the
  Frobenius/Hurwitz obstruction), In-the-Wild (gimbal lock), and the Game Designer
  (gimbal lock as a control axis *dying under your hands*) all open the same way:
  pose the question — *why can't we just multiply 3D vectors? why does 4 work?* —
  before showing the answer. Opening on S³ "shows the answer before the question."

- **The on-ramp is ℂ-multiplication = rotation of the plane.** (Foundations,
  Educator.) The audience already half-owns it, and it's literally the lower rung
  of the same ladder.

- **The essential scene is the "two clocks."** (Geometer, New Light, Game
  Designer, Educator all describe the same thing.) A live ℝ³ object turning at
  angle θ, *beside* the quaternion's point sliding along a great circle on a
  stereographically-projected S³ at θ/2 — color-linked, driven by one slider/shared
  `q`. This single frame makes **four** of the hardest ideas tangible at once: the
  half-angle θ/2, the S³-point-vs-object distinction, the double cover (one-button
  "negate q → jump to antipode, object doesn't move"), and the 720° spinor return
  (a path that closes only at 4π).

- **The core verb is the *two-sided* sandwich q v q⁻¹ as conjugation /
  change-of-frame.** (New Light's global reframing; supported by Geometer and the
  foundation.) Conjugation demotes the half-angle and the double cover from
  "memorize" to "inevitable corollary."

- **S³ stereographic projection is the gold-standard visual — and it already
  ships.** (Builder: `viewpoint.ts` `project()` has the exact eater.net `Stereo`
  map plus `Hopf`/`Torus`, used today by Complex Particles.) Render the double
  cover and 720° truth as a **path on S³**, *not* an animated belt (which is
  expensive and fights the framework).

- **Custom `Canvas3D` + `<Workspace>`, not `ParticleViewerShell`.** (Builder.) The
  shell is function-graph shaped; a rotation app is a rigid object + a path on S³.
  Custom is *less* code, and the closed archetype vocabulary maps on with no new
  icons. The object↔S³ pair is exactly what split `panes` exists for.

### Tensions (require a decision)

| # | Tension | Poles | Proposed resolution |
|---|---------|-------|---------------------|
| T1 | **Sandbox vs. staircase** | Game Designer / Originator want an open toy + puzzle; Educator wants a *gated* linear sequence (lock S³/Hopf until the double cover demands them) | Build **one sandbox engine, expose it through a guided chaptered path** — animath `layouts` open/close panels & views per chapter for free (the Stable Matching pattern). Default = guided; "free play" = a layout that opens everything. |
| T2 | **The cold open** | Failing-triplet forge (Originator/Foundations) vs. gimbal lock (In-the-Wild) vs. ℂ-rung (Foundations) | They're all "lead with the question." Make **gimbal lock the recognizable hook** and the **failing-triplet the mathematical motivation** — two early chapters, not a fight. ℂ-rung is the 30-second pre-roll. |
| T3 | **Two-step sandwich legibility** | New Light's signature idea (stop *between* q·left and q⁻¹·right) is the most original; Builder/New Light both flag the mid-state q·v may not be legibly renderable in 3D | **Prototype this first** (a spike). If the mid-sandwich reads clearly, it's the app's reason to exist; if not, fall back to the two-clocks θ↔θ/2 coupling, which carries the same payload. |
| T4 | **Scope** | Builder lists 8 candidate pictures (S→L); a tight v1 vs. a full course | Ship the **S/S–M spine first** (object↔S³ + axis–angle + readout), then add chapters. Belt mesh and classic Hopf render are explicitly *later/optional*. |

### Blind spots (none of the lenses fully covered)

- **Phone behavior of a split-pane, two-WebGL view** — phones solo views and
  re-chrome; the object↔S³ pair likely needs a stack-or-tab fallback (Builder
  flagged; nobody designed it).
- **"A quaternion in your pocket"** — the smartphone gyroscope / AR-orientation
  hook (In-the-Wild) is possibly the most *personal* "in the wild" sighting and is
  underused; worth elevating in the explainer even if we don't read real sensors.
- **Performance budget** — two live contexts + (optional) Hopf fibers + transparency
  could push phone DPR limits; the `quality` panel must cap fiber count / path
  length.
- **Color accessibility** — the whole design leans on color-linking the object and
  its S³ point; needs a CVD-safe palette and a non-color cue (label/shape).

## 2. Candidate app concepts

Four distinct framings emerged. Scored Low / Med / High on **framework fit**,
**pedagogical payoff**, and **visual appeal**.

| # | Concept | One-line pitch | Framework fit | Pedagogical payoff | Visual appeal |
|---|---------|----------------|:---:|:---:|:---:|
| **A** | **The Two Clocks — quaternion rotation studio** | Split-pane object ↔ stereographic-S³ on one shared `q`; axis–angle drive, half-angle dual-dial, double-cover/720° as an S³ path; gimbal lock, non-commutativity & SLERP as chapters | **High** — spine is S/S–M; S³ map already ships in `viewpoint.ts`; split `panes` + layouts off the shelf | **High** — the two-clock scene defuses 4 of the 5 worst pitfalls in one frame | **High** — live mesh + navigable S³ with swept great-circle paths |
| **B** | **Can You Multiply Triplets? — the failed-triplet forge** | Re-enact Hamilton: try to make 3-coordinate multiplication close, watch the cross-term break the law of moduli, then toggle in the 4th unit and watch it heal | **High** — mostly DOM/readouts + a small 3D inset | **High** — converts "why 4, not 3" from arbitrary to *inevitable* | **Med** — algebraic; the drama is in numbers, not spectacle |
| **C** | **Orientation Docking — the quaternion game** | Align an object to a ghost target; the "warmer/colder" meter *is* the honest geodesic angle 2·arccos(q·q_target); confusions (gimbal lock, −q, 720°) are survivable mechanics | **Med–High** — reuses the spine; scoring/levels are new but light | **Med–High** — learning-by-survival; a confusion you *survive* sticks | **High** — game juice, target ghosts, match meter |
| **D** | **Hopf fibration explorer** | Nested linked Villarceau-circle fibers of S³→S², stereographically projected | **Med** — projection is free, but the nested-fiber render is custom geometry (M+) | **Low–Med** as an entry — "easy to admire without understanding" (foundation, Geometer, Educator all warn) | **High** — the most beautiful picture in the subject |

**The key realization:** B and C are not really *competitors* to A — they are its
**best chapters**. B is the ideal cold-open (Chapter 0/1); C is the ideal "play"
chapter and self-check engine. D is optional advanced depth (and Complex Particles
already touches Hopf). So the recommendation is one app that *contains* the others
as a chaptered path, not four separate apps.

## 3. Recommendation

**Build A — "The Two Clocks" quaternion rotation studio — as a single chaptered
app**, with B's failing-triplet as the cold-open and C's docking as a play
chapter, delivered via `layouts`. Build the **spine first** and **spike T3
(two-step sandwich) and the two-WebGL pane early**, because those two unknowns
gate the most original parts of the design.

Why this and not the others: it sits squarely in animath's sweet spot (the S³
machinery *already ships*), it carries the highest pedagogical payload per pixel
(the two-clock frame), and it absorbs every other lens's best idea as a chapter
rather than forcing a choice. It is also honestly buildable: the v1 spine is an
S/S–M effort with no framework friction.

## 4. Draft build plan (for the recommended concept)

> [!NOTE]
> This is a *draft* to be stress-tested with `/three-hats` before building. Costs
> use the Builder's S / M / L scale.

**App folder:** `src/animations/Quaternions/` · **route:** `#/quaternions` ·
**appId:** `quaternions`.

**Engine:** custom **`Canvas3D` + `<Workspace>`** (like Trinary / Polygon Worlds /
Correspondence). Object rotation via native `THREE.Quaternion`
(`setFromAxisAngle`, `slerp`, multiply). S³ view via `viewpoint.ts` `project()`
(`Stereo` primary; `Hopf`/`Torus` optional). **Do not** use `ParticleViewerShell`.

**Views (`ViewDef[]`):**
- `studio` — a split **`panes`** window: left pane = the live 3D object; right pane
  = the stereographic-S³ view (current `q` dot, its antipode `−q`, the swept
  great-circle path, a projected 1/i/j/k reference cage). One shared `q`. *Spike
  the two-`Canvas3D`-in-one-window assumption early; fall back to two separate view
  windows if needed.*
- (later) `gimbal` — three nested gimbal rings + the same object, for the
  Euler/lock comparison chapter.

**Panels (`SectionDef[]`, archetypes from the closed vocabulary — no new icons):**

| Panel | `arch` | Body |
|-------|--------|------|
| Object | `subject` | choose mesh (cube · airplane · asymmetric **F** · teapot) |
| Set q | `domain` | axis on S² (draggable handle or two angle sliders) + angle θ; direct `(w,x,y,z)` entry |
| View | `view` | which view(s) shown; S³ projection mode (`Stereo`/`Hopf`/`Torus` = the `ProjectionMode` enum); re-pole control to disclose stereographic blow-up |
| Color | `color` | object faces / S³ dots & paths (CVD-safe; non-color cue too) |
| Marks | `marks` | how S³ dots/paths/fibers are drawn |
| Rotate | `drive` | hands-on rotation; **two-step sandwich** scrubber (q-left → q⁻¹-right); compose-two-rotations (non-commutativity) toggle |
| Transport | `playback` | SLERP between q₀,q₁ (play/step/scrub); the 360°↔720° sweep |
| Readout | `readout` | live `(w,x,y,z)`, θ, **half-angle dual-dial**, axis, `q`·`−q` double-cover badge, gimbal-lock indicator — built from `chrome/readouts.tsx` (StatGrid / Kicker) |
| System | `quality` | fiber count / path length / DPR caps (phone perf) |

**Chapters as `layouts`** (open/close panels+views per chapter — the cheap path,
Stable Matching pattern): `① Triplet trap` → `② Gimbal lock` → `③ One rotation`
(object + axis–angle) → `④ The sandwich` (two-step) → `⑤ Two clocks / S³` (unlocks
the S³ pane) → `⑥ Double cover & 720°` → `⑦ SLERP` → `Free play` (everything open).
S³/Hopf stay **locked until ⑤** (Educator's progressive disclosure).

**Default / on-ramp view:** Chapter ③ — a single rotatable object with the
axis–angle panel — *not* the S³ pane. The first frame answers "a quaternion is an
orientation you can grab," and the question chapters (①②) sit one click left.

**Explainer angle (`?`):** use the **Originator's first-person Hamilton voice** —
the triplet struggle, Broom Bridge, "the price of a fourth dimension and of
commutativity" — as the narrative spine. Disclose the stereographic metric
distortion honestly (Geometer). Mention "a quaternion in your pocket" (phone
gyroscope) as the personal hook.

**Self-check verbs** (woven into chapters, per Educator/Game Designer): "undo this
rotation," "predict the pose, then reveal," "negate q — does the object move?",
"find the *other* quaternion for this pose," and the docking match-meter
`2·arccos(q·q_target)`.

**Registry edits (append-only):** `src/index.tsx` (lazy route `#/quaternions`),
`src/apps.ts` (catalog entry — pick an existing glyph from `chrome/icons.tsx`),
`src/chrome/catalog.ts` (`META`: category + preview kind — a small spinning
asymmetric object), plus the Routing table + layout tree in `CLAUDE.md` and a line
in `README.md`.

**Honest caveats to surface in-app (Geometer):** stereographic projection distorts
metric near the pole (offer re-poling); S³ "cannot be seen directly" — we show a
faithful projection, not the thing itself; the half-angle is real, not an artifact
of the picture.

**Phased scope:**
- **v1 (spine, S/S–M):** Object + Set-q + Readout panels; the `studio` split view
  (object↔S³ with dot/antipode/path); chapters ③④⑤⑥; Hamilton explainer. Spikes:
  two-WebGL pane (T-risk), two-step sandwich legibility (T3).
- **v2:** gimbal-lock chapter (②), non-commutativity & SLERP (⑦), the failing-triplet
  cold-open (①), docking play chapter (C).
- **Optional/stretch:** classic Hopf-fiber render (D); a literal belt/plate mesh
  (Builder: **L**, fights the framework — likely never).

## 5. Next steps

1. **Refine the lens set with Dan** (his note: the original concept list was
   illustrative, not orthogonal/exhaustive — and the lens design itself should get a
   back-and-forth now that we have real output to judge).
2. **`/three-hats`** this plan (`…/2026-06-17-S01-concept-plan.md`) — stress-test
   the chaptered-single-app decision, the v1 scope, and the two spikes — before any
   code.
3. Then **`BUILDING_AN_APP.md`** for the v1 spine.

## Self-reflection

1. **What would you do with another session?** Run the two spikes (two `Canvas3D`
   in one split pane; mid-sandwich q·v legibility) before `/three-hats`, so the plan
   rests on verified assumptions rather than estimates.
2. **What would you change about what you produced?** The eight lenses were
   *very* convergent, which is reassuring but also a sign the lens set may be
   under-diverse (see #4) — I could have pushed harder for a genuinely dissenting
   concept (e.g. a pure-algebra "quaternion calculator/multiplication-table" app, or
   an octonion/Cayley–Dickson ladder app) to test the recommendation against a real
   alternative rather than four variations on one spine.
3. **What were you not asked that you think is important?** Whether this should be
   *one* chaptered app or a small *family* (a "rotations" thread: Euler ↔ matrix ↔
   quaternion as sibling apps). The chaptered-single-app call is mine; it deserves
   Dan's eye.
4. **What did we both overlook?** The lens prompts I wrote pre-loaded each agent
   with the foundation's conclusions (S³, half-angle, belt trick), which likely
   *caused* the convergence — the lenses partly agreed because they were told the
   same answers. A cleaner design would give lenses the facts but not the leading
   candidate visuals. This is the most important refinement for the skill.
5. **What did you find difficult?** Resisting scope creep — every lens had a
   compelling "must-have," and the honest v1 has to leave most of them for v2.
6. **What would have made this task easier?** A reusable "two `Canvas3D` panes"
   reference in the repo; its absence is the single biggest unknown in the costs.
7. **Follow-up value:** MEDIUM — the recommendation is sound and well-grounded, but
   two build assumptions are unspiked and the lens-convergence may be partly an
   artifact of how I prompted the lenses (#4). Both are worth addressing before
   building, neither invalidates the direction.
