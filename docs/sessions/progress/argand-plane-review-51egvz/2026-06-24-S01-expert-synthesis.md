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

# Round 2 — the complex–dual–split slider as a cross-app lens ("unitary spaces")

<details>
<summary>Second request (2026-06-24)</summary>

> I want to discuss interactions between the complex-dual-split slider and the other complex function apps. I think the core idea is "unitary spaces" where the most "familiar" entry point is complex numbers but even those are treated as foreigners we need to understand.

</details>

The same five hats were resumed (keeping their round-1 analysis) and each
appended an augmentation. The grounding facts given to all five: `p=j²` is
**Argand-only** today; `complexOps.ts` already holds the generalized algebra
(`mulG`, `conjG`, `normG = x²−p·y²`, `invG`/`divG`, `powRealG`, `sqrtG`,
`expG`/`logG`); every other complex app is hardwired to ℂ; the cross-app link
(`functionHandoff.ts`) carries function identity only; and **only
affine/polynomial/rational maps generalize honestly over `p`** — the
transcendental zoo (exp/sin/Γ) does not.

## R2.1 — Points of agreement (high confidence)

### The idea is real and worth doing — `normG` *is* the "unitary" invariant
All five endorse the vision. The norm `N(z)=x²−p·y²` is the genuine organizing
quantity: multiplication by a unit-norm element preserves it, and its level set
is the unit curve (circle → two parallel lines → hyperbola). "Treat ℂ as a
foreigner" has a precise meaning — ℂ is just the `p<0` member of the Cayley–Klein
family where the preserved norm happens to be the familiar circle. Nobody argued
it's a gimmick.

### Capability-gate the dial — refuse where the math doesn't generalize (unanimous)
This is the round-2 headline, and it is **the round-1 fabricated-fixed-point bug
generalized to the whole suite.** A `p`-slider sitting live next to `sin z` or
`Γ` produces "garbage with a confident face" (pedagogy). All five converged on:

| Hat | The gate |
|---|---|
| Maintainer | gate the dial or pin `p=−1`; "never ship a slider that NaNs on `sin z`" |
| Consultant | a typed `validSystems` / `evalG?` **capability flag**; slider gated by the selected `f` (Argand's existing `powReliable` predicate is the template) |
| Pedagogy | hide/inert for functions with no dual/split analogue — a true-looking lie otherwise |
| Game designer | **three states, never a silent-garbage fourth**: show-live · lock-with-a-why · hide |

> [!IMPORTANT]
> The gate is not a limitation bolted on — it is *more* faithful to "ℂ as
> foreigner" than a universal slider. The lock itself teaches **what travels
> between spaces and what is ℂ-only.**

### Domain coloring (hue = `arg z`) silently lies once `p ≠ −1`
Pedagogy and the graphic designer independently flagged the suite's signature
look as the subtlest trap. `arg z` is a ℂ notion; under **split** the natural
"angle" is unbounded rapidity (a periodic hue wheel banishes it into false
bands), under **dual** it's degenerate. Convergent fix: **re-base the palette on
the generalized norm's level sets under one palette law** — hue/value where the
generalized argument is defined, **desaturate to neutral where it isn't** (dual,
across the null cone). This reduces to the familiar look exactly at `p=−1`, so
the signature isn't lost.

### Phasing: additive substrate first, then per-app fan-out (unanimous)
The framework tension — a global `p` would touch a shared lib + ≥4 app folders +
per-app GLSL at once, breaking the self-contained-folder / append-only property —
is defused the same way by maintainer and consultant:

1. **Phase 0 (one small branch, parallel-safe):** extract a *new*
   `lib/generalizedAlgebra.ts` from `complexOps.ts` (which re-exports it → **zero
   Argand churn**); add a typed `Algebra`/`validSystems` capability layer; add a
   **distinct** `sys`/`j2` key to `functionHandoff.ts` (additive,
   backward-compatible — **must not** reuse the existing `p`, which is the
   `z^(p/q)` exponent); land golden-vector tests (folds into round-1's Tier-0
   `complexOps` test debt).
2. **Then each app adopts `p` inside its own folder, strictly after Phase 0**, so
   per-app branches never conflict.

### It's a capstone, not a spine — and the honest order is fixed
Pedagogy: you can't defamiliarize ℂ before familiarizing it, so the dial belongs
to the *last rung* — which **reinforces round-1's call to demote `j²` out of
Argand's always-on HUD** (the dial and the vision are compatible, not opposed).
Game designer: defamiliarization must be *earned, not woken into* — dim the dial
until the player has done one rotation, then reveal it as a continuous morph (the
slide itself is the "the rules just changed" moment). Convergent sequence:

> **Argand** (where the idea is *met*, dial demoted/earned) → **Plane Transform**
> (the best *reveal* — a whole grid under shear/boost) → **Complex Particles**
> (gated to generalizable functions) → **Fractals / Correspondence** (advanced,
> last or never).

### One shared visual signifier + one cross-app interaction contract
Graphic designer and game designer independently landed on the **unit curve +
null cone as the dial's shared face**: a monochrome, scaffold-tier, *continuous*
badge drawn identically in every app, with the slider thumb riding a miniature of
the morphing curve — it *shows* the geometry of multiplication and survives the
morph as one object. The game designer's contract makes it concrete: one name
("Space dial"), one anchored slot, identical `−1…+1` range + Cx/Du/Sp pills, same
in-world feedback — so it builds one transferable mental model, not five
inconsistent toggles.

## R2.2 — Points of tension (need Dan's call)

### "Unitary" is the wrong name (pedagogy pushes back on the framing itself)
The one place a hat challenged Dan's own words. "Unitary" names the ℂ-only
U(1)/inner-product structure — it **re-privileges ℂ**, the opposite of "ℂ as
foreigner." Pedagogy's recommendation: **Cayley–Klein planes / the j²-continuum**
(umbrella) with **Argand / Galilean / Minkowski** (the three leaves), framing the
invariant as **N-preservation**. Worth deciding early because it names everything
downstream. (The term "unitary spaces" is evocative as a *project codename*; the
question is whether it survives into user-facing prose.)

### The GLSL cost is the real budget, and it's lumpy
Argand (SVG) is already generalized and free. The cost is concentrated in **three
GLSL apps** — Plane Transform's 36-case `applyComplex`, plus FractalsGPU and
Correspondence — which hardcode complex `mul/exp/log` in `vec2` with **no shared
TS↔GLSL source**. Consultant: budget this as multi-session, per-shader,
drift-prone work; **Plane Transform as the sole pilot**, and ultimately **emit
GLSL from one spec** so there are two implementations, not four. This is the main
feasibility caveat — the vision is cheap in TS and expensive in shaders.

### A scope-dependent reprioritization of a round-1 item
The graphic designer promotes round-1's **hardcoded-hex / skin-token palette
bug** from "polish" to a **blocking prerequisite** *if* the cross-app program
proceeds — an un-tokenized viz palette that's merely degraded in one app would
break across four. So the cross-app decision feeds back into the round-1 plan:
greenlighting the program promotes that palette fix into Phase 0.

### Silent cross-app state carry-over (new trap)
Game designer: persistence/handoff silently carrying `p` between apps is a
cross-app rerun of round-1's silent-state traps (the pan-lock, the snapping).
Require an explicit "carried over: **Split-space**" confirmation on any handoff
that changes what *multiply* means.

## R2.3 — Blind spots (none of the five closed)

- **Is the reveal actually compelling?** Everyone *assumes* a grid under
  shear/boost and a split-complex fractal are striking. Nobody rendered one. A
  one-off prototype screenshot (Plane Transform's grid at `p=0` and `p=+1`) would
  de-risk the entire program cheaply — the same "verify the picture" gap as
  round-1's unbuilt Play capture.
- **Correspondence / iteration semantics** in dual/split were barely touched —
  does a "Mandelbrot" even mean anything off ℂ? (Split-complex Julia sets are
  studied; dual is murkier.)
- **GLSL performance** of per-fragment generalized `exp`/`log` is unmeasured.
- **Near-term build vs. north-star** — only Dan can say whether to start Phase 0
  now or hold this as a direction.

## R2.4 — Recommended action (cross-app)

A phased program that **merges with the round-1 Argand plan rather than competing
with it**:

| Phase | What | Parallel-safe? |
|---|---|---|
| **0 — Substrate** | New `lib/generalizedAlgebra.ts` (re-exported by `complexOps`, zero Argand churn) + typed `validSystems` capability + distinct `sys`/`j2` key in `functionHandoff` + golden-vector tests (folds into Tier-0). **Decide the name here.** | ✅ one small branch |
| **1 — Argand (capstone home)** | Round-1 Tier-2 *and* this converge: demote the dial, **capability-gate it by `f`**, re-base domain coloring on the generalized norm (desaturate where undefined). Promote the **palette-tokenization** fix here (graphic designer's prerequisite). | ✅ in-folder |
| **2 — Plane Transform (pilot reveal)** | First GLSL port of `gmul/gexp/glog`, gated to generalizable functions; carry the system across the handoff **with an explicit confirmation**. Render the prototype *before* committing — closes the blind spot. | per-app branch, after Phase 0 |
| **3 — Complex Particles (gated) → later/never (Fractals, Correspondence)** | Adopt only where honest; fractals are the capstone-of-the-capstone. | per-app, sequenced |

**Cross-cutting:** one "Space dial" contract (name, slot, range, pills,
unit-curve face, three states) defined in Phase 0 and reused; **rename off
"unitary"** unless Dan wants it as a codename only.

### Open questions for Dan (cross-app)
1. ~~**Name** — keep "unitary spaces," or adopt **Cayley–Klein / j²-continuum**?~~
   **RESOLVED → "Number Planes"** (see R2.5).
2. **Near-term build or north-star?** — do we start Phase 0 now, or log it as a
   direction and finish the round-1 Argand polish first? *(still open)*
3. **How far out does the dial travel** — Argand-as-capstone only, or all the way
   to Plane Transform / fractals (which is where the GLSL cost lives)? *(function
   scope resolved in R2.5; the per-app reach — i.e. the GLSL budget — is still
   open.)*

## R2.5 — Dan's steer (2026-06-24): name + scope resolved

Two decisions from Dan that settle the biggest R2 tensions and **shrink the
program's risk surface**.

### Name: **"Number Planes"** — tagline *"how do you do arithmetic on the plane?"*
Dan rejected **both** candidates the hats argued over: "unitary" (re-privileges
ℂ — the pedagogy hat's objection stands) **and** "Cayley–Klein / j²-continuum"
(correct but *scary* — two surnames, reads as gatekeeping for an entry-point
app). The chosen umbrella is **Number Planes**: "the complex plane is one of a
family." The three leaves keep the app's existing in-world verbs for what
multiplication *does* — **Spin** (complex) · **Shear** (dual) · **Boost**
(split) — not the proper-noun geometry names. So the naming layer is now:

| Layer | Name |
|---|---|
| Umbrella idea / lens | **Number Planes** |
| Tagline | *how do you do arithmetic on the plane?* |
| The three leaves (dial states) | **Spin · Shear · Boost** (= complex · dual · split) |
| The shared dial affordance | the **unit curve + null cone** badge (R2.1, unchanged) |
| Proper-noun pointers (sources block only) | Argand / Galilean–Yaglom / Minkowski; Cayley–Klein |

> [!IMPORTANT]
> "Cayley–Klein," "Galilean," "Minkowski," "elliptic/parabolic/hyperbolic" survive
> **only in the "Possible sources & where to go further" block** — wayfinding for
> the curious, never in the front-of-house prose. Front-of-house is *arithmetic on
> the plane* and *Spin/Shear/Boost*.

### Scope: **lines → polynomials → (maybe) rational functions** — and *teach the limits*
This is the decisive simplification. Dan scopes the program to **affine →
polynomial → (later) rational maps** — which is **exactly the set that
generalizes honestly over `p`** (R2 grounding fact). Consequences:

- **The honesty-trap tension largely dissolves.** The hats' central worry — a dial
  that NaNs/fakes on the transcendental zoo (`exp`, `sin`, `Γ`) — is now
  **out of program scope**. The typed `validSystems` capability gate is still
  worth building, but it shrinks from "a design crisis" to "a guard for the apps
  that happen to expose the zoo (Plane Transform / Complex Particles)." The
  program's own function ladder never trips it.
- **"Explain the limits" becomes a first-class pedagogy requirement, not a
  footnote.** Dan: *"we would want to explain what the limits are for things like
  fixed points."* The limits ARE the lesson:
  - the fixed point `z* = α₀/(1−α₁)` **flying to ∞** as `α₁ → 1` (pure shift) —
    already shown as "—", now narrate *why*;
  - multiplication **degenerating on the null cone** (split) and along the **flat
    direction** (dual) — the very regions where round-1's **fabricated dual/split
    fixed points** came from;
  - the **"angle" ceasing to mean angle** off ℂ (the domain-coloring problem from
    the graphic-designer augmentation).
- This **promotes the round-1 fabricated-fixed-point fix** from "an honesty bug to
  patch" to "the worked example of a limit we explicitly teach" — same code change,
  bigger pedagogical payoff. It stays the lone true-correctness item (round-1 Tier
  1 #3) but now anchors the Number Planes story.

### What this changes in the phased plan (R2.4)
- **Phase 0** name decision is **made** — `lib/` substrate, the `sys`/`j2`
  handoff key, and the dial contract all carry the word **Number Planes** / Spin ·
  Shear · Boost.
- **Rational functions** are an explicit (later) rung on Argand's own ladder
  (degree pill → Linear → Quadratic → … → Rational), all honest over `p`.
- Still genuinely open: **Phase 0 now vs. north-star** (Open Q2), and **the
  per-app GLSL reach** (Open Q3's second half) — the cost lives in porting
  `gmul`/`gpow` into Plane Transform's shaders, unaffected by the name/scope calls.

> [!TIP]
> The cleanest first move is **Phase 0**, and it's almost free because it *is*
> round-1's Tier-0 (the `complexOps` tests) plus a ~30-line façade and one
> additive URL key. It commits to nothing downstream, makes the idea real and
> tested, and forces the naming decision — after which Argand's round-1 polish
> and this program are the same branch of work.

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
