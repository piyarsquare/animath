---
kind: plan
session: 2026-06-18-S05
date: 2026-06-18
title: "Quaternions — design-team verdict + build spec (The Belt)"
branch: claude/quaternion-exploration-app-ig4jmy
slug: quaternion-exploration-app-ig4jmy
status: stopped
build: n/a
app: general
---

# Quaternions — The Design Team's Verdict

Stage 4 run as a real **second team**: five model-diverse specialists
([Builder/math](./2026-06-18-S05-design-builder.md) · opus,
[Game Designer](./2026-06-18-S05-design-game-designer.md) · opus,
[Educator](./2026-06-18-S05-design-educator.md) · haiku,
[Illustrator](./2026-06-18-S05-design-illustrator.md) · sonnet,
[Visual Designer](./2026-06-18-S05-design-visual-designer.md) · sonnet),
each consuming the [atlas](./2026-06-18-S03-friction-atlas.md), the
[live transcript](./2026-06-18-S04-live-room-transcript.md), the
[foundation](./2026-06-17-S01-concept-foundation.md), and the
[candidate set](./2026-06-18-S03-concept-plan.md) — then a director-routed
**critique round** to resolve the one real disagreement. This file is the
synthesis.

## Verdict

**Build Candidate A — *The Belt* — unanimously.** All five specialists, reasoning
from different lenses on different models, picked A independently: it is the only
candidate that lands on crossing **C6** (the felt double cover, where the atlas says
*felt = formal*), the only one whose core image survives all five skins and the
phone, and the only one that *contradicts a learner's intuition* hard enough for the
surprise to stick.

**v1 scope (resolved in the critique round):** ship The Belt with the **Sandwich
(C)** built in as an **earned-reveal second layout — "Why a half"** — *gated behind
a completed 720° cycle*. **Slerp Racer (B)** is deferred to its own later route.
This was the live disagreement (Educator: ship A alone; Builder: C co-equal; Game
Designer: C as earned reveal); the room converged on the earned-reveal middle —
see the critique outcome below.

## The critique round (scope: does v1 include the Sandwich?)

- **Builder** (opening): C and the belt are *the same factor of two seen twice*
  (atlas **I1**) — the learner only believes the double cover is fundamental, not a
  belt trick, when the factor surfaces a second way. Conceded that co-equal *at
  launch* spoils the surprise; moved to: build C in v1 but as an earned reveal.
- **Educator**: accepted, and **sharpened the gate** — unlocking after a single
  360° teaches nothing; the learner must *feel the failure then the success* (turn
  to 360°, ribbon still twisted; push to 720°, it unwinds) before earning "why two?"
- **Game Designer** (close): ratified the 720°-completion trigger but fixed the
  framing — 720° is the *unlock condition*, never a stated goal. Two felt beats:
  (1) near 360° the ribbon stays twisted, sign sits at −q, and the only affordance
  is **"keep going"** (not reset) — the productive frustration; (2) pushing through
  to 720° lands clean, q snaps to +q, and *that* fires the unlock. The reveal is a
  quiet, non-modal **"Why a half?"** chip beside the readout, claimed on the
  learner's terms; claiming it restages the *same block and ribbon* into the
  sandwich `q·v·q⁻¹` — "you turned the frame once (q), but a vector you carry is hit
  on both sides, so it feels the rotation twice; that is why 360° was only
  half-untwisted and why the visible angle is θ/2." Felt mystery and math answer are
  one object, shown from two sides.

## The unified visual + interaction spec

### Core loop (Game Designer)
Grab the block and **drag it about its axis**; the ribbon twists in lockstep and the
sign readout sweeps at **exactly half your rate** (2:1) — one full hand-turn drives
the sign only halfway home (to −q). The hand learns θ/2 before the head does. The
on-ramp's first posed task is the **failed untwist**: "drag one full turn, then try
to shake the twist out" — it refuses until you go around twice. This reframes The
Belt from *sandbox* → **puzzle box whose lock is the double cover**.

### Readout hierarchy (resolves the Visual-Designer ↔ Builder ↔ Illustrator tension)
Encode `q` vs `−q` **shape-first and multi-channel — never color alone** (accessibility):

1. **Primary (felt):** the **painted center stripe** down the ribbon (Illustrator).
   At 0° and 720° it faces the same way at both ends — "home." At 360° it has done
   one half-rotation: correct at the clamp, **facing the wrong way at the block**.
   A stripe pointing the wrong way is legibly *wrong* with no labels, no color
   theory, no math.
2. **At-a-glance confirm:** the live scalar **`w = −1.000`** number in the mono font
   (Visual Designer) — ticks to −1 at 360°, back to +1 at 720°. Direct, readable in
   every skin.
3. **Optional depth:** the **`q`-vs-`−q` ring** (the S³ great circle) — *not*
   required to deliver the lesson (it needs its own explanation first); offered for
   the curious. The sign dial runs in **exact lockstep with the twist** — one θ
   drives both — which is the only honest bridge from felt twist to `q→−q` (Builder).
4. **The Skeptic's resolution:** a **ghost 3×3 matrix** panel that returns to
   *identity at 360°* while the stripe, ribbon, and sign do not — "the matrix is the
   block; the quaternion is the belt" made interactive.

### Making 360° ≠ 720° unmistakable (Illustrator)
At 360°, **three readouts disagree on purpose**: block face home (compass-rose
upright) and matrix = identity *both say "home,"* while stripe-wrong-way and sign =
−q *say "not yet."* The learner **scrubs the turn slider** between 360° and 720° and
watches only the ribbon and sign change while block and matrix stay locked at
identity — no memory required; both states live on one scrub.

### Motion (Visual Designer)
Spend the surprise budget (exactly one) on the **untwist**: a single designed moment
(~1.25 s, two phases — twist peaks tighten, then either a clean dissolve at 720° or a
refusal-and-wobble at 360°). Everything else is real-time response to the drag.

### Layout (Illustrator — overrides the prior plan)
**Windowed "jeweler's bench," not `immersive`.** The learner must compare ribbon,
sign readout, and ghost matrix *simultaneously at arm's length*; immersive hides the
panel chrome and is for first-person walkers. This reverses the S03 plan's "consider
immersive."

### Learning arc (Educator), mapped to atlas crossings
1. **Feel the resistance** (C6/C1) — turn to 360°, the belt won't undo. *Self-check:*
   "Can you undo it?" (No.)
2. **Recognize the pattern** (C6) — push to 720°, it unwinds. *"What if you turn
   again?"* (Twist returns — periodicity, felt.)
3. **Name the structure** (C6) — the ghost matrix returns at 360° but the belt
   doesn't: the quaternion carries the *path* the matrix throws away.
4. **Understand the cost** (C3) — the earned "Why a half" reveal: the two-sided
   sandwich forces θ/2.
5. **(deferred)** the practitioner payoff — gimbal lock / SLERP (C4/C5) → the
   Slerp Racer sequel.
Self-check is **predict-then-reveal** at every beat. Curious beginner can stop after
beat 3; a working mathematician continues into the sandwich and (later) the ring.

## Build spec (Builder — with fidelity guards)

> [!IMPORTANT]
> **Correction to the S03 plan:** do **not** use `src/math/quat4.ts` — that is the
> 4D `{L,R}` plane-rotation builder for the particle viewers. This app's rotation is
> ordinary 3D: `THREE.Quaternion` + `vec.applyQuaternion(q)`.

- **Engine/pattern:** custom `Canvas3D` scene; use the **return-the-cleanup-from-
  `onMount`** contract (cleaner than PolygonWorlds' ref-parked rAF). The
  **continuous-twist ribbon mesh is the one real cost — spike it first** (a
  `TubeGeometry`/lathe-style strip whose cross-sections rotate along its length by
  the accumulated twist).
- **Reuse:** `useGestureRotation` (`src/lib/particles/`) for the **camera orbit
  only**, kept strictly separate from the *block's* rotation (the looking-vs-
  navigating convention). Theme tokens for all color (5 skins).
- **Panels (`SectionDef[]`, archetypes from the closed vocabulary):**

| Panel | `arch` | Tier | Contents |
|---|---|---|---|
| **Block** | `subject` | Define | mesh (hand / plate / dish / framed compass-rose), ribbon on/off, width |
| **Turn** | `drive` | Drive | drag the block, or axis dial + **turn slider 0–720°**; sign geared 2:1 |
| **Readout** | `readout` | Analyze | live `w` (→ −1 at 360°), stripe/belt-slack state, total angle; ring dial (optional) |
| **Compare** | `readout` | Analyze | ghost 3×3 matrix vs belt/sign — the Skeptic's resolution, scrubbable |
| **Why a half** | `drive` | Drive | *earned reveal (unlocks after one 720° cycle)* — the `q·v·q⁻¹` sandwich on the same scene |
| **Detail** | `quality` | System | ribbon segments, render quality, reset settings |

- **`ViewDef[]`:** one primary **windowed** view (block + twisting ribbon); sign
  readout in its panel or a small second view. **On-ramp:** block at rest, flat
  ribbon, `hint: "drag the block one full turn — then try to undo the twist."`
- **Action strip (`ActionDef[]`, ≤5, one primary):** `Untwist` (attempt — primary),
  `Turn +360°`, `Turn −360°`, `Reset`. (Game Designer: the *failed* untwist is the
  lede, so `Untwist` leads.)
- **Explainer (`?`):** open with Hamilton's transcript line — *"the part I would
  most want a learner to feel — the belt going slack only at the second turn — I
  never had a name for at all"* — then C1's wall (no three-number system; a product
  like 3·21 = 63 has no three-square home, so it needs a fourth slot) and the belt
  as payoff. Source from foundation §1/§3/§5 + the formula reference.
- **Registry edits (append-only):** new route `#/the-belt` in `src/index.tsx`
  (`React.lazy`), entry in `src/apps.ts`, metadata in `src/chrome/catalog.ts`.

### Math-fidelity guards (Builder + Game Designer — reject these)
- No **bare twist-meter** divorced from the live quaternion; the sign must run in
  lockstep with the twist (one θ drives both).
- Render `q` and `−q` as **two distinct points hitting a pixel-identical pose**;
  show the half-angle as a **live half-rate arc**, never a static "½θ" label.
- **No partial untwist at 360°** (it is fully obstructed, full stop), no **turn
  quantization**, no **"fewest turns" scoring** (rewards a wrong model), no
  **shared camera/block gestures**.

## Next steps

Run **`/three-hats`** on this spec (framework maintainer · architecture · math-viz
pedagogy) to stress-test before building, then **`BUILDING_AN_APP.md`**. The
deferred **Slerp Racer (B)** is the natural follow-on app once The Belt ships.

## Self-reflection

1. **What would you do with another session?** Build the ribbon-twist spike — it is
   the one unproven cost and everything visual rides on it reading cleanly.
2. **What would you change about what you produced?** The readout hierarchy was
   resolved by synthesis, not by the specialists arguing it out directly; a second
   short critique turn on "stripe vs number vs ring" would harden it.
3. **What were you not asked that you think is important?** Whether The Belt should
   carry a one-line bridge to *spin-½ physics* (the electron's 720°) in the
   explainer, or leave that to a future app.
4. **What did we both overlook?** Phone ergonomics of one-thumb block-rotation vs
   camera-orbit on a small screen — the looking-vs-navigating split needs a phone
   answer.
5. **What did you find difficult?** Keeping the readout tension honest — three
   specialists each had a defensible "primary," and the resolution (stripe felt /
   number confirm / ring optional) is a judgment, not a proof.
6. **What would have made this task easier?** A quick interactive ribbon prototype
   to test legibility before committing the spec.
7. **Follow-up value:** MEDIUM — the verdict and spec are sound and buildable;
   follow-up (the ribbon spike, a phone-gesture answer, `/three-hats`) would add
   significant value before code.
