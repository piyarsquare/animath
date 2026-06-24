---
kind: three-hats
session: 2026-06-24-S01
date: 2026-06-24
title: Argand design & UX review — five-hat convergence synthesis
branch: claude/argand-plane-review-51egvz
slug: argand-plane-review-51egvz
status: completed
build: passed
---

# Argand design & UX review — five-hat convergence synthesis

<details>
<summary>Original request</summary>

> Review the Argand app (#/argand, src/animations/Argand/) — its visual design and user experience. ADD TWO HATS beyond the usual three: (4) a graphic designer focused on whether the display is clean and the concepts are well-articulated visually, and (5) a video game designer focused on user experience and interaction feel.

</details>

This synthesizes five independent reviews of the **Argand** app, each written
without seeing the others:

| Hat | Lens | Report |
|---|---|---|
| 1 | Framework maintainer | [`…-expert-maintainer.md`](2026-06-24-S01-expert-maintainer.md) |
| 2 | Architecture & quality consultant | [`…-expert-consultant.md`](2026-06-24-S01-expert-consultant.md) |
| 3 | Math-viz & pedagogy | [`…-expert-pedagogy.md`](2026-06-24-S01-expert-pedagogy.md) |
| 4 | Graphic designer *(added)* | [`…-expert-graphic-designer.md`](2026-06-24-S01-expert-graphic-designer.md) |
| 5 | Video game designer *(added)* | [`…-expert-game-designer.md`](2026-06-24-S01-expert-game-designer.md) |

The headline: **all five independently reached the same verdict.** The *bones*
of Argand — its honest math, its role-colored direct-manipulation core, its
framework integration — are genuinely strong and should not be touched. The
problem is uniformly one of **staging**: the app shows too much at once, in a
default frame that loses the hero, with verbs and modes scattered, and the one
idea that is fundamentally about *motion* presented as a frozen, crowded still.
Nobody recommended a rebuild. Everybody recommended subtraction.

> [!NOTE]
> One claim was verified during synthesis. The graphic designer warned the
> hardcoded-hex palette "will look broken" on the light skin (whose `--viz-bg`
> is cream `#f6f3ec`). A light-skin screenshot
> ([`assets/…-light-skin.png`](assets/2026-06-24-S01-light-skin.png)) shows it
> is **degraded, not broken**: the saturated role colors (cyan/orange/emerald)
> hold up on cream; only the gold `z*`, the faint grid, and the pale-yellow Play
> mover (`#fde68a`) lose contrast. This **downgrades** that item from must-fix
> correctness to polish.

---

## 1. Points of agreement (high confidence)

Where independent lenses converge, confidence is high. These are the findings
multiple hats reached on their own.

### 1.1 — Keep the core: the toy hook and the role-color system

Every hat that touched it praised the same two things:

- **Direct manipulation is the app's soul.** Grab a colored handle, the whole
  picture answers live (game designer: *"genuinely good game feel… teaches by
  doing"*; pedagogy endorses the honest spiral; consultant calls the pure-math
  seam *"the strongest part of the design"*).
- **The role-based color system** — one color per actor (z cyan, α₁ orange, α₀
  violet, α₂ pink, f emerald, z* gold), shared by handles + equation + readouts
  — is, in the graphic designer's words, *"the best thing here. Guard it."* The
  colored-span equation overlay is the Rosetta stone that makes the picture
  legible.

> [!IMPORTANT]
> Three independent hats said: **do not refactor the conception. This is a
> polish-and-conform pass, not a rebuild.** Any change that risks the live-drag
> feel or the color discipline is a regression.

### 1.2 — The default view over-shows (clutter is the #1 experience problem)

| Hat | How they put it |
|---|---|
| Pedagogy | *"~11 simultaneous objects before any interaction"*; foregrounds the hardest material (Yaglom dual/split) at the entry point |
| Graphic designer | *"~13 simultaneous mark classes where the lesson is a 2-leg path"*; the hero loses the first frame |
| Game designer | *"a great toy wearing a VCR's control panel"* |
| Maintainer | the deepest idea (j²) is buried in a permanent HUD row |

Convergent concrete cuts (named by ≥2 hats):
- **Demote the j² / number-system control out of the always-on HUD** (pedagogy +
  maintainer). Number systems are not an entry point; the immersive default
  should be pure complex.
- **Show the return diagonal only during Play** (pedagogy + graphic designer) —
  it is currently static.
- **Default the unit curve OFF** for the complex case (pedagogy).
- **Drop the origin-anchored α₀ vector** — redundant with the +α₀ leg (graphic
  designer).

### 1.3 — The feed switcher is triplicated; collapse to one home

**Four hats** independently flagged that Point/Shape/Grid appears in three
places — the top-bar mode pills, the bottom HUD, and the Input panel — all
setting the same `feed` state. Unanimous fix: **keep the top-bar mode pills as
the single home** (the framework-blessed location), delete the HUD pills and the
Input-panel pills. (Maintainer, graphic designer, game designer, consultant.)

### 1.4 — The default "Essentials" layout panels overlap and clip

Visible in every desktop screenshot. Function / Play / Values are parked at
fixed y-offsets (18 / 320 / 580) shorter than their real rendered heights, so
each panel's last rows hide behind the next (Function's "View from z*" row;
Play's footer). Both the maintainer and graphic designer caught it; the
maintainer identifies the root cause precisely: **dishonest `estHeight` values +
hand-placed `y` coordinates, when the framework's `packColumns` exists to do
exactly this.** A spacing bug, not taste.

### 1.5 — `complexOps.ts` has zero tests (cheapest debt, do it first)

Maintainer and consultant independently made this a must-fix. The module is
pure, eminently testable, ships **documented failure modes** (`powRealG` linear
fallback, approximate dual/split fixed points, `logG` null cones), and is the
**outlier** against repo convention (`skellam.ts`, `solidSchema` both ship
vitest tests). The consultant named ~30 concrete assertions (loop-closure,
`f(z*)=z*`, system limits, degeneracy guards, arc-length round-trip). Both argue
the tests should land **before** any refactor, as the safety net.

### 1.6 — "Make Play / the scrubber pay its way" (confirms the backlog)

Pedagogy, game designer, and graphic designer all converged on the existing
backlog item. The legs are pre-drawn static curves, so pressing Play merely
slides a dot along them — it doesn't *narrate* anything, so a cold user isn't
rewarded. Unanimous direction: at rest show endpoints; **on Play, build each leg
as a growing trail** (pedagogy's "growing trail," graphic designer's "leg
disclosure," game designer's "in-world leg narration"). The arc-length pacing is
already excellent and should stay.

### 1.7 — Phone is a must-fix

The central hint pill covers the entire (already tiny) diagram, and four handles
cluster in ~40px (game designer: *"fat-finger nightmare"*). The graphic designer
notes — usefully — that the **phone layout's centered hero is the model the
desktop should follow**, not the other way around.

---

## 2. Points of tension (require a judgment call)

These are places where the hats diverge, or where one hat's framing complicates
another's recommendation. They need Dan's decision.

### 2.1 — The hint pill: app bug, chrome bug, or design crutch?

All five noticed the centered hint pill. But they diagnose it differently:
- **Graphic/game designers:** make it an auto-dismissing corner toast / one-time
  coachmark.
- **Maintainer:** the spec says hints should *dismiss on first interaction*. If
  it isn't dismissing in immersive mode, that's a **chrome bug to file**, not to
  work around in-app — or it's simply an over-long hint string. *Which one is
  unverified.*

> [!WARNING]
> Resolve the root cause before "fixing" it. If immersive mode broke the
> dismiss-on-interaction path, an in-app workaround would mask a bug every future
> immersive app inherits. **Action: reproduce the dismiss behavior first.**

### 2.2 — The bespoke bottom HUD vs. the framework `actions` strip

The maintainer and game designer both observe the app built a custom bottom HUD
on the premise that "the action strip is gone in fullscreen" — **which is false;
`actions` explicitly survives fullscreen.** They recommend moving Play/reset (and
a real Reset-view verb) to the framework `ActionDef[]` strip.

Tension: the **graphic designer explicitly praised the HUD as a clean object**
and the transport's glassy proportions. So this isn't "the HUD is bad" — it's
"some of what's *in* the HUD belongs in the framework strip." The judgment call
is how much to migrate: the verbs (Play/reset → `actions`) clearly should move;
the two scrubbers the framework can't host stay. Net: a *smaller* HUD, not no
HUD.

### 2.3 — How far to cut the transport

The game designer wants the transport stripped hard (one auto-paced Play; demote
Speed + fine-scrub to "Advanced"; the scrubber must earn its place or go). The
pedagogy hat values the arc-length scrubbing for careful study. The graphic
designer is neutral. The tension is **sandbox-for-exploration vs.
guided-toy-with-a-loop** — both are legitimate for an "entry-point" app. A
middle path (one prominent Play; collapse Speed/fine-scrub behind an Advanced
disclosure; keep the scrubber but make it drive a live readout per the backlog)
satisfies most of both.

### 2.4 — "Try this" preset shelf: scope and identity

The game designer's biggest lever for *pull* is a "Try this" shelf of 4–6
goal-shaped presets ("make f a pure rotation", "find the fixed point", "spiral
inward") — cheap, and doubles as discoverability for buried features (Iterate,
Quadratic, the number systems). No other hat proposed this, and none opposed it,
but it raises a question only Dan can answer: **is Argand a sandbox or a guided
explorable?** Presets nudge it toward the latter. (It also lightly intersects
the pedagogy hat's "start simpler" — presets could *be* the progressive-
disclosure mechanism.)

### 2.5 — The `Scene` refactor: worth it, or gold-plating?

The consultant proposes resolving `(feed, degree, iterate)` once into a pure
`Scene` discriminated union and splitting the 605-line `ArgandPlane.tsx` into a
camera hook + gesture hook + per-scene drawing components — explicitly **gated on
the tests landing first**, and explicitly **not** a state-machine-library or
headless-UI rewrite. The maintainer independently lists the same extraction
(`gridGeometry.ts`, unit-curve) but ranks it **nice-to-have, not blocking**.
Tension is only on *priority*: nobody thinks it's wrong, but it must not jump
ahead of the tests (1.5) or the staging fixes. Treat as a follow-up, post-polish.

---

## 3. Blind spots (none of the five fully addressed)

- **No live playtest / no Play-state or interaction capture.** Three hats flagged
  their own findings as `visual-unverified` — the motion-legibility, snap-feel,
  hover, and "does Play reward you" claims are reasoned from source + four
  *settled* screenshots, not observed in motion. The clutter/layout/contrast
  claims are verified; the *motion* claims are not. A short screen capture of
  Play (and a phone touch session) would close this.
- **Real-device touch.** The prior handoff already carries a `phone-needed`
  signal; this review inherits it. The fat-finger handle-cluster claim is
  geometric reasoning, not a device test.
- **Accessibility beyond color.** Pedagogy raised CVD (phase→hue, pink-vs-orange
  term vectors); nobody covered keyboard operability of the drag handles, focus
  order, screen-reader labeling, or reduced-motion. For a gallery "entry-point"
  app this may matter more than for the niche apps.
- **The "successor to Plane Transform" question.** CLAUDE.md says Argand is the
  "successor-in-progress to Plane Transform," and the prior handoff's self-
  reflection asked whether it should *supersede* it outright. No hat addressed
  the catalog-level decision — but a clutter/staging overhaul is exactly when
  you'd want to know the target identity.
- **Performance was reasoned, not measured.** The consultant's unbounded-grid
  analysis is sound from the code, but no frame-time/draw-count profile was
  taken; "heavy while dragging" is the handoff's report, not a measurement here.

---

## 4. Recommended action

A single coherent thread runs through all five reviews: **subtract, conform, and
make motion the payload — without touching the math or the drag core.** Here is
the synthesized, prioritized plan. Everything is **inside `src/animations/Argand/`
and parallel-branch-safe** (the maintainer confirmed zero shared-file churn),
except where noted.

### Tier 0 — Safety net (do first, blocks the rest)

1. **Add `src/animations/Argand/__tests__/complexOps.test.ts`** — the consultant's
   ~30 assertions: affine loop closure, `f(z*)=z*`, `polyFixedPoints` /
   `criticalPoint`, the complex/dual/split limits, `powRealG` degeneracy guards,
   arc-length round-trip. *(1.5; agreed by maintainer + consultant.)* This is the
   prerequisite for any later refactor.

### Tier 1 — Must-fix (blocks a "clean" sign-off)

2. **Fix the Essentials layout overlap** — make `estHeight` honest; drop the
   custom hand-placed layout in favor of the framework's `packColumns`, or derive
   `open` from it. *(1.4)*
3. **One honesty fix: don't draw fabricated fixed points.** In dual/split, when
   the quadratic `z*` falls back to a linear blend (`logG` null), **hollow-ring or
   hide** those gold dots and add one disclosing clause to EXPLAINER. *Pedagogy's
   highest priority — "a fabricated fixed point is the geometric equivalent of a
   fabricated citation."* Also scope the "never cuts a straight chord" claim, and
   align the naming (Argand = complex only; dual = Galilean/Yaglom, split =
   Minkowski). *(1.2/§3 pedagogy)*
4. **Collapse the triple feed-switcher to the top-bar mode pills.** Delete the HUD
   and Input-panel copies. *(1.3; four hats)*
5. **Reproduce, then fix, the hint pill** — confirm whether dismiss-on-interaction
   is broken in immersive mode (file a chrome bug if so) or just shorten it to a
   corner/auto-dismiss toast. *(2.1 — resolve root cause first.)*
6. **Phone: get the hero back.** Auto-dismiss the hint on first touch; tighten the
   default extent so the loop fills the frame; address the handle cluster
   (larger/again-staggered hit targets). Use the phone layout as the model. *(1.7)*

### Tier 2 — Should-fix (the staging payoff)

7. **Declutter the default frame to the hero.** Demote j² out of the always-on
   HUD into the System panel; show the return diagonal only during Play; default
   the unit curve off for complex; drop the redundant origin-α₀ vector. *(1.2)*
8. **Make Play the payload** — build each leg as a growing trail on Play instead
   of sliding a dot along pre-drawn curves; keep the arc-length pacing. Wire the
   scrubber to a live readout (the backlog's ask). *(1.6)*
9. **Move verbs to the framework `actions` strip** — Play/reset + a real
   **Reset-view** (restores pan/zoom/t and releases the silent "View from z*" pan
   lock, which the game designer flagged as the worst trap). Shrink the HUD to the
   scrubbers only. *(2.2 — keep the HUD as an object, migrate the verbs.)*

### Tier 3 — Nice-to-have (pull & polish; needs a Dan decision on identity)

10. **"Try this" preset shelf** (4–6 goal states) — biggest lever for pull and
    discoverability; **pending the sandbox-vs-explorable decision (2.4).**
11. **Light-skin palette pass** — theme the few low-contrast marks (gold z*, faint
    grid, pale-yellow mover) so non-dark skins read cleanly. *Degraded, not
    broken (verified) — polish, not correctness.*
12. **Juice:** handle hover (scale + ring) + grabbing cursor; legible snap (target
    ghosts + pulse); surface Iterate as a front-row verb. *(game designer)*
13. **`Scene` refactor + extract `gridGeometry.ts`/unit-curve** — only after Tier
    0–2; clamp/memoize the domain-colored grid as part of this. *(2.5)*

### Open questions for Dan before building

- **Sandbox or guided explorable?** (governs the preset shelf, the transport
  cut). *(2.3, 2.4)*
- **Is Argand meant to supersede Plane Transform?** (governs how far to invest in
  it as *the* entry point). *(§3 blind spot)*
- **How hard to cut the transport** — keep careful arc-length scrubbing for study,
  or strip to one auto-paced Play? *(2.3)*

> [!TIP]
> If you want a single first move that de-risks everything and is independently
> valuable: **Tier 0 (the tests) + Tier 1 items 2, 3, 4.** They're unambiguous,
> low-risk, parallel-branch-safe, and turn "the math is honest but the picture is
> a mess" into "the picture is clean and the math is provably honest" — at which
> point the motion/pedagogy work (Tier 2) becomes easy to see and judge.

---

## Self-reflection

1. **What would you do with another session?** Execute Tier 0 + Tier 1 — they're
   the unambiguous, parallel-safe wins, and landing the tests first unblocks the
   rest. Then capture Play in motion to close the biggest blind spot before
   touching the motion work.
2. **What would you change about what you produced?** I verified the light-skin
   claim (which downgraded it) but did *not* verify the hint-dismiss behavior or
   capture a Play frame — both were within reach this session and would have
   resolved a tension (2.1) and a blind spot. I synthesized from five settled
   stills when one motion capture was cheap.
3. **What were you not asked that you think is important?** The catalog identity
   question (Argand vs Plane Transform). Every "should we simplify the entry
   point" recommendation implicitly assumes an answer, and the review surfaced it
   without resolving it.
4. **What did we both overlook?** Accessibility beyond color — keyboard operation
   of the drag handles and reduced-motion — for what is explicitly the gallery's
   *entry-point* app, where the audience is broadest.
5. **What did you find difficult?** Separating "correct but cluttered" from
   "actually wrong." The pedagogy hat's fabricated-fixed-point bug is the only
   true correctness defect; everything else is staging. Keeping that distinction
   sharp in the prioritization (Tier 1 #3 is the lone correctness item among
   layout fixes) was the main synthesis work.
6. **What would have made this task easier?** A scripted "interaction capture"
   harness (drive Play, drag a handle, switch skin) on top of the existing
   headless shooter — three hats independently wanted motion evidence they
   couldn't get.
7. **Follow-up value:** MEDIUM — the five reports converge cleanly and the plan is
   concrete and parallel-safe, but two cheap verifications (hint-dismiss root
   cause, a Play capture) are still owed before the motion/hint work is built, and
   two identity questions need Dan's answer before Tier 3.
