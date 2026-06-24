---
kind: lens
session: 2026-06-18-S05
date: 2026-06-18
title: "Quaternions — design lens: Game designer"
branch: claude/quaternion-exploration-app-ig4jmy
slug: quaternion-exploration-app-ig4jmy
status: stopped
build: n/a
app: general
---

# Quaternions — Design Lens: Game Designer

**I back A (The Belt), built as a puzzle box, not a sandbox — with C (The Sandwich)
folded in as an earned reveal and B (Slerp Racer) deferred to a sequel.** The
atlas already told us where the time-loss is: I3 says the felt and the formal
collapse onto C6. My job is to make sure the *moment-to-moment* of poking C6 is
genuinely sticky, and that the stickiness comes from the real math and not from a
substitute thrill. The prior plan picked the right crossing; it under-designed the
loop and over-trusted "sandbox."

## Why A, and why not as a sandbox

A sandbox ("here's a block and a belt, enjoy") fails the same way every physics
toy fails: people wiggle it for ten seconds, say "huh, neat," and leave. Nothing
*asks* them to find the 720°. The single most important discovery of this whole
exploration — Nora's closing line, "watch it cling to the halfway point" — only
happens if the app *poses the failure first*. You must let the learner try to undo
a 360° twist, **fail**, and feel the refusal, before you ever reward them. The
belt is not a toy you admire; it's an obstacle that won't comply until you've
understood it. That reframes A from "felt double-cover sandbox" into **a puzzle box
whose lock is the double cover.**

So I am opinionated against the plan's word "sandbox." Keep the open-play affordance
(you can always just turn the thing), but the spine is a posed problem.

## The core interaction loop

The smallest satisfying action→feedback cycle, in one sentence: **you grab the
block and drag it around its axis; the belt twists in lockstep and the sign-dial
needle sweeps at exactly half your rate, so one full turn of your hand drives the
needle only halfway around — and that mismatch is the thing your hand learns
before your head does.**

Decomposed:

- **Action.** Pointer-drag on the block rotates it about the current axis. This is
  *direct manipulation* — the block turns under your finger, 1:1, no slider
  intermediary for the primary verb. (Sliders exist in the Turn panel for precision
  and for keyboard/phone, but the hero action is grab-and-twist.)
- **Instant feedback (three coupled channels, same frame):**
  1. **The belt twists.** Continuous mesh deformation, not a scripted clip. The
     twist density is the legible signal — it bunches, and it visibly *cannot* be
     combed flat at 360°.
  2. **The sign dial sweeps at half speed.** This is the load-bearing piece of
     juice the plan left vague. The needle is the quaternion's scalar/angle on the
     $q \to -q$ great circle. The learner's hand turns θ; the needle turns θ/2.
     One hand-turn lands the needle at the antipode (−q), visibly "not home."
  3. **A 720° progress ring** fills as a single continuous gauge from 0 to "home."
     360° is the *halfway* mark on it — deliberately drawn at the top/bottom so the
     learner reads "I'm only halfway" with their eyes.
- **The reward beat.** When the accumulated turn crosses 720°, the belt goes
  **slack** — a satisfying, audible-if-we-add-sound, visible *release*: the twist
  combs out in one smooth sweep, the dial needle snaps home to +q, the ring
  completes. This release is the dopamine. It must be earned exactly once per loop
  and never faked.

The half-speed needle is the heartbeat (I1) made kinetic. The learner *feels* the
factor of two as a rate mismatch under their own hand. That is the design's whole
reason to exist.

## Goal structure: a three-rung ladder, not one mode

Pure sandbox loses people; pure linear puzzle insults them. Use a short rung ladder
that each *reframes the same belt*, so difficulty is discovery, not added rules.

- **Rung 0 — The refusal (the on-ramp puzzle).** Flat untwisted belt. Hint: *"Turn
  it one full turn — now comb the twist out without turning it back."* They drag,
  they try to shake it loose (an "Untwist" attempt animates the belt looping around
  the block and *failing* to clear). They cannot. This is the hook: the obvious
  thing is impossible (I2, the closing wall, felt directly). ~30 seconds to the
  first genuine surprise.
- **Rung 1 — The release.** Hint: *"Try a second full turn, then comb again."* Now
  the untwist succeeds. The contrast between Rung 0 and Rung 1 *is* the double cover.
  Two turns to home; one turn is not home. The sign dial now reads as "ohhh — one
  turn only got me to the opposite point."
- **Rung 2 — The matrix challenge (the Skeptic's payoff).** Show a ghost 3×3 matrix
  beside the dial. Pose: *"After one turn the block looks identical and the matrix
  is back to where it started. So is anything different?"* The dial and belt say
  yes; the matrix says no. The learner toggles a "ghost at 360°" overlay and sees the
  block-pose match perfectly while the belt disagrees. This is C6's content as an
  interactive *gotcha*: the matrix forgot, the quaternion remembered.
- **Rung 3 — The Sandwich reveal (folded-in C).** *Optional depth.* A "Why halfway?"
  button opens the sandwich staging: the block's pose turns by θ while the dial's
  internal angle turns by θ/2, shown as the two-sided $q v q^{-1}$ — left-multiply
  dirties the vector (a fourth-axis lift), right-multiply by the inverse cleans it
  and doubles the turn. This *answers* the rate mismatch the hand already felt in
  the loop. Reveal, not prerequisite — you earn the explanation by feeling the thing.

Each rung is a one-line prompt, not a level-select. The app should auto-advance the
hint when a rung's goal-state is detected (untwisted-after-360 fails → suggest
Rung 1; untwisted-after-720 succeeds → surface the matrix challenge).

## The juice (responsive, legible feedback)

What keeps the loop alive frame-to-frame:

- **The half-rate needle is the single best piece of juice** because it is the math.
  Tie its motion rigidly to the drag — no easing, no lag — so the 2:1 ratio is felt
  as physical gearing.
- **Twist density as color/shading on the belt** (reuse `lib/colormaps.ts`): the
  more wound, the hotter. Comb-out cools it. Makes "tangle" a quantity, not a vibe.
- **The slack release** must be a *whole-belt* event: ease the twist out over ~400ms
  with a slight overshoot, snap the dial, ping the ring. One clean exhale.
- **Antipode marker** on the dial: a persistent dot at −q so the learner can see
  "this is where one turn lands me" as a fixed target before they get there.
- **Hand-rate echo:** a faint trailing arc on the dial showing the path the needle
  took (the *path*, per the Skeptic — "the quaternion keeps the path"). The matrix
  has no such trail. The visual asymmetry is the lesson.

## Difficulty / discovery curve

- **0–30s:** turn, fail to untwist. Surprise #1 (it won't comb out).
- **30–90s:** turn again, succeed. Surprise #2 (720° releases). The needle's
  halfway behavior becomes noticeable here.
- **90s–4min:** the matrix challenge. Surprise #3 (the matrix lies / forgets).
  This is where "huh neat" converts to "wait, *that's* what a quaternion is for."
- **4min+:** the sandwich reveal answers the rate mismatch; axis-changing (turn
  about a tilted axis), and free play — chain turns, watch −q ↔ +q toggle, try the
  belt with different mesh "ends."

The curve is three escalating surprises, each a small wall crossed (I2). Time-loss
comes from the *gap between feeling and understanding*: the hand learns the 2:1 gear
in Rung 0–1, and the head spends the next few minutes catching up via the dial,
matrix, and sandwich. That gap is the engagement engine.

## Honest to the math — mechanics to REJECT

A game designer's temptation is to add thrill that teaches the wrong model. Refuse:

- **Reject a "twist meter you fill to win" with no spatial belt.** A bare 0→720 bar
  with a victory chime rewards *grinding the number*, teaching "spin twice = magic"
  rather than orientation-entanglement. The belt's spatial refusal must be the
  obstacle; the meter is only a readout.
- **Reject snapping/quantizing the turn to 90°/180° stops for the primary verb.**
  Quaternion rotation is continuous; quantizing it would smuggle in the false idea
  that orientations are discrete states. (Sticky *labels* at 360°/720° on the ring
  are fine — they annotate, they don't gate.)
- **Reject scoring "fewest turns to untwist."** It rewards path-cleverness and
  implies the belt trick is a dexterity puzzle. It is not; it's topological. Two
  turns is two turns. No leaderboard.
- **Reject letting camera-orbit and block-turn share a gesture.** Per the project's
  looking-vs-navigating convention and foundation §5.5/§5.8: if dragging sometimes
  moves the view and sometimes turns the block, the learner conflates "I moved" with
  "it turned" — the exact pure-vs-unit confusion. Block-turn is direct on the block;
  camera-orbit is the background. Keep them visibly, tactilely distinct.
- **Reject any animation that "untwists" at 360° even partially as a tease.** It must
  *fully refuse* until 720°, or the whole double-cover claim is undermined.
- **Reject presenting the sign dial as "the space of all quaternions."** It is one
  great circle (the $q,-q$ diameter). Label it honestly as the sign axis, or learners
  walk away thinking $S^3$ is a ring.

## The single best toy and the single best puzzle

- **Best toy:** **the half-rate sign needle geared to your drag.** Free-play value
  with zero instructions — turn your hand and watch the needle lag at exactly half,
  swing to the antipode, swing home on the second turn. It is the factor of two you
  can *crank*, and people will crank it just to feel the 2:1 gear. It is honest
  because it *is* θ/2.
- **Best puzzle:** **"The block looks identical — prove something changed."** (Rung
  2, the matrix challenge.) The learner has just made a 360° turn; block-pose and
  ghost-matrix both say "nothing happened"; the belt and the dial-trail say
  otherwise. The puzzle is to *locate the difference the matrix can't see* — and the
  answer is the path/sign the belt carried. This is the Skeptic's hardest challenge
  ("convince me there's anything a matrix doesn't have") turned into a thing the
  learner *solves with their own hands*, which is the single sharpest content the
  whole room produced.

## Sharpest disagreement with the prior plan

The plan calls A a "sandbox" and lists "Untwist (attempt to shake the loop free)"
as just one of several action-strip buttons. That buries the lede. **The attempt to
untwist — and its failure at 360° — is not a button among four; it is the core
loop's beating heart and must be the on-ramp's first posed task.** The plan's
framing risks shipping a pretty toy nobody is *asked* to interrogate. Make the
refusal the puzzle, surface the matrix-gotcha as the explicit win condition, and the
app becomes something people lose an afternoon to instead of a 15-second curiosity.

## Takeaways

1. **The refusal is the product.** The learner must try to undo a 360° twist and
   *fail* before any reward — the posed failure, not free play, is the on-ramp. Ship
   the puzzle, not the sandbox.
2. **Gear the sign needle to the drag at exactly 2:1, with no lag.** The half-angle
   must be felt as physical gearing under the hand; it is both the best toy and the
   honest heartbeat (I1). Never fake the 720° release, and never let 360° partially
   untwist.
3. **The win condition is the matrix-gotcha** ("the block looks identical — prove
   something changed"), and every juicy reward must point at real structure (path,
   sign, twist density) — reject any meter-grind, scoring, or quantization that
   rewards "spin twice = magic" over orientation-entanglement.
