---
kind: lens
session: 2026-06-18-S05
date: 2026-06-18
title: "Quaternions — design lens: Illustrator"
branch: claude/quaternion-exploration-app-ig4jmy
slug: quaternion-exploration-app-ig4jmy
status: completed
build: n/a
app: general
---

# Quaternions — Design Lens: Illustrator

**Candidate backed: A — The Belt, unambiguously.** B and C are not wrong, but
they are downstream. The belt is the place where touching the thing is
understanding the math (I3). Everything else earns its place only after that
moment lands.

---

## 1. Why A over B and C

**B (Slerp Racer)** teaches the practitioner's reason for quaternions — gimbal
lock, smooth interpolation, the unit surface earned from failure. These are real
and important. But from an illustrator's perspective, the key image (two meshes
slewing between poses) is legible without being *surprising*. The learner sees
one mesh wobble and one mesh glide and draws the right conclusion, but nothing in
that picture resists understanding. There is no moment where the screen shows you
something your intuition flatly contradicts. Surprise is what makes the lesson
stick; B has smoothness, not contradiction. B belongs as a second layout inside A,
not as the primary app.

**C (The Sandwich)** has the most interesting algebra to draw — the two-sided
action, the scalar part leaking in and then canceling — but the honest picture of
"the arrow lifts off 3-space" requires a fourth-axis cue that will feel arbitrary
to a learner who has not yet been ambushed by the belt. The half-angle is the
single most common point of confusion in the subject (the atlas names it the
"heartbeat" appearing at three independent crossings), but confusion about a fact
you already believe is different from the belt's visceral surprise: you fully
expected 360° to undo itself, and it does not. The half-angle is best
progressive-disclosed inside A as the explanation for why one turn only reaches
−q, not as a separate entry point.

**A (The Belt)** is the right pick because its single central image — a flat
ribbon that will not stop twisting no matter how you wrestle it until you
complete a second full turn — is the only picture in the whole subject that makes
a learner feel the mathematics as a bodily resistance. The Skeptic answered his
own question when he touched it: "the matrix is the block; the quaternion is the
belt." You cannot draw that answer any more elegantly than the belt already draws
it.

---

## 2. The object: what sits on screen

**The block.** A compact, slightly-rounded rectangular solid — think a thick
hardcover book or a small TV remote, roughly 0.6×1.0×0.15 in scene units.
Matte white-gray surface, sharp enough edges to read its face orientation at a
glance. It has a clearly marked **front face**: a single large icon (a compass
rose or an asymmetric star — not text, not a letter) centered on it so any
orientation reads unambiguously. The icon matters: it is how the learner sees
"the block came back to exactly where it started" after 360° and "again" after
720° — the block face must be unmistakably identical in both resting positions.
Do not use a sphere or a symmetric shape; symmetry hides orientation.

The block floats at scene center, slightly tilted toward the viewer (~15° pitch)
so both the front face and the top edge are visible from the default camera
position. It casts a soft contact shadow on a ground plane (a faint circle of
shadow, not a full floor) to anchor it in space without adding visual clutter.

**The ribbon.** A flat strip, about 0.08 scene units wide and long enough to
reach from the block's left face to a fixed anchor point at the left edge of the
view. The anchor is a small chrome clamp or ring — a simple cylinder with an
opening, fixed, inert. The ribbon connects from the block's left face at a small
tab (a thickened connection point that reads "attached, not floating") and drapes
in a gentle catenary to the clamp. At rest (0° turn) it lies flat, with zero
twist.

The ribbon is the primary visual. It must read its twist state instantly.

---

## 3. How the ribbon communicates twist

**The painted stripe.** The ribbon has a longitudinal center stripe, slightly
darker than the ribbon body, running the full length from clamp to block. When
the ribbon is flat, the stripe is a single unbroken line. When it twists, the
stripe rotates around the ribbon's long axis, making the twist count directly
readable as "stripe facing up → stripe facing down → stripe facing up." At 360°
turn of the block, the stripe has done exactly one half-rotation along the
ribbon's length, so it faces the wrong way at the clamp end: it appears as a
dark line on what is now the ribbon's underside, contrasting with the lighter
upper surface. At 720°, the stripe has done a full rotation and faces correctly
again at both ends. This stripe is the learner's primary twist gauge and it needs
no label: its alignment is self-evident.

**Color by twist density.** The ribbon body is not a flat color. It is shaded
using a per-vertex twist-angle value: near-zero twist is a calm neutral
(light warm gray), and high local twist angle maps toward a saturated amber.
The coloring concentrates near the tightest coil (which gathers near the block
end when a twist accumulates), making "how much tension is in here" readable
from a distance without measuring anything. The palette should be perceptually
monotone so it doesn't distract: gray → amber, nothing more.

**Cross-section flares.** At three evenly-spaced points along the ribbon,
thin perpendicular tick-marks — like tiny orthogonal tabs — show the current
cross-section orientation. These are thin, semi-transparent, 0.01 units thick.
They rotate visibly with the ribbon twist and make the twist direction (clockwise
vs. counter-clockwise) explicit at a glance, especially when the ribbon passes
behind itself.

**Geometry.** The ribbon is a subdivided flat mesh: 64 segments along its length,
3 vertices across its width. At each segment, the cross-section is rotated by the
interpolated twist angle, which is computed from the block's current total
rotation angle mapped through the ribbon's physical boundary conditions (clamped
at both ends, twisting monotonically from 0 at the clamp to the full block
rotation at the attachment tab). The mesh smoothly deforms every frame; there is
no scripted keyframe animation. The ribbon is real geometry, not a sprite.

---

## 4. The sign dial

**Shape and location.** The sign dial is a small circular gauge, about 120×120 px,
pinned to the lower-right of the view window (or living in the readout panel if
the learner has it open). It is always visible while turning.

**What it shows.** A circle representing the great circle through q and −q on
the unit 3-sphere — think of the unit circle of complex numbers, but the two
distinguished points are labeled **q** (at top, 12 o'clock) and **−q** (at
bottom, 6 o'clock). A solid dot — the **live quaternion marker** — travels around
this circle as the block rotates. At rest (0°) the dot sits at q. As the block
rotates, the dot moves clockwise. At 180° block rotation, the dot is at 3 o'clock
(halfway between q and −q). At 360° (one full turn), the dot arrives at −q
(bottom). At 540°, it has continued to 9 o'clock (three-quarters of the circle).
At 720° (two full turns), the dot returns to q (top).

**What marks q and −q.** The q position is marked with a filled circle and the
label **q** in small sans-serif. The −q position is marked with an open circle
(ring outline) and the label **−q**. The two markers are in the same soft color
(e.g., slate blue) and the live dot is a bright accent (e.g., vivid coral). When
the live dot coincides with q (0° and 720°), the background of the gauge flashes
a brief soft green pulse — "home." When it coincides with −q (360°), the
background flashes a brief soft amber — "halfway, but the block is back."

**Key animation.** The moment the live dot reaches −q and the block returns to
its starting orientation is the payoff. The block face shows the compass rose
exactly as it started. The matrix panel (see §5) is already showing a return to
identity. But the sign dial dot is at −q, not q. That discrepancy — block looks
home, dial says otherwise — is the visible signature of the double cover. No
label is needed; the contradiction is on screen simultaneously. A small tooltip
appears briefly: "The block is back. The quaternion isn't."

---

## 5. The ghost-matrix panel

**What it shows.** A 3×3 grid of numbers — the rotation matrix corresponding to
the current block orientation. The numbers update live as the block turns. The
grid is minimal: nine monospace values, two decimal places, arranged as a 3×3
table with light dividing lines. No color coding by default. Label above: "Rotation
matrix."

**The key moment: 360°.** When the block completes one full turn, the matrix
returns exactly to the identity (the diagonal reads 1.00, 1.00, 1.00; off-diagonal
reads 0.00). This is the moment to draw attention. The matrix panel highlights
briefly: its background shifts to the same soft amber used by the sign dial's −q
flash, and a line of text appears below the grid: "Matrix: back to start." This
happens at the same moment the block face looks identical to its starting position
and the sign dial is at −q.

**The contrast, made unmistakable.** At 360° three readouts are visible
simultaneously: (a) the block face with its compass rose looks the same as frame 0;
(b) the matrix reads identity; (c) the sign dial dot is at −q, not q. The amber
highlight on the matrix and the amber flash on the sign dial are the same color on
purpose — they say "these two agree," isolating the dial's lonely state.

**At 720°.** The matrix reads identity again (same amber highlight). The sign
dial dot is at q again (green flash). Now all three agree. The ribbon is flat.
The live tooltip: "720°: everything agrees." This moment should feel like a
resolution — the frame has completed its own argument.

---

## 6. Making 360° ≠ 720° unmistakable

This is the #1 design priority. Here is how the screen achieves it with no
ambiguity:

**The ribbon posture is the primary cue and it is geometric, not labeled.**
At 360° the ribbon has exactly one half-twist in it — the stripe runs from
top-facing at the clamp to bottom-facing at the block. This is a specific,
permanent physical configuration. The learner can pull the slider back to 0° and
the ribbon uncoils. They push it to 360° and the half-twist reappears. They push
to 720° and the ribbon is flat. The two flat states (0° and 720°) look identical.
The one-turn state (360°) looks emphatically different: a visible half-twist. The
learner can slide back and forth between 360° and 720° on the turn slider and
watch the ribbon twist in and then flatten out again without the block changing
its face orientation in either case.

**The sign dial supports the ribbon with a second, abstract-but-precise cue.**
Same argument as above: dot at −q (360°) vs. dot at q (720°). Both are visible
simultaneously on the ring with no computation required.

**The matrix provides the foil.** It reads the same at 360° and 720°, making
clear that the matrix genuinely cannot tell them apart — it is not that the
app is hiding information, it is that the matrix has no information to display.

**The on-screen label hierarchy.** No label says "this proves the double cover."
The screen shows three things that agree (block face, matrix, ribbon) at 0° and
720°, and two things that agree while one disagrees (block face and matrix say
"home"; ribbon and dial say "not yet") at 360°. The disagreement is the lesson.

---

## 7. The on-ramp first frame

The very first screen — before any interaction — shows:

- The block at rest, front face toward the viewer, compass rose centered and
  upright.
- The ribbon lying flat from the block's left face to the clamp, no twist, stripe
  running straight.
- The sign dial at q (dot at 12 o'clock, green tint).
- The matrix at identity.
- A single large hint card overlaid at center-bottom of the view: **"Rotate the
  block one full turn — then try to untwist the ribbon."** Below it in smaller
  text: "Drag the block, or use the Turn slider." The hint card fades after the
  first interaction begins.

The hint says nothing about quaternions. It does not say "360°" or "720°." It
says "one full turn" and "try to untwist." The learner discovers that one turn
is insufficient; the attempt to untwist is the productive failure. There is no
spoiler in the first frame.

**What the block looks like at rest matters.** It should be immediately obvious
what "one full turn" means — the compass-rose front face helps because the learner
knows when the face has come back to them. The slight pitch of the block toward
the viewer is specifically so the front face is visible from the start; a block
viewed edge-on at rest would require camera adjustment before the lesson begins.

---

## 8. Progressive disclosure: The Sandwich panel

After the learner has experienced the 360°/720° distinction and asked the natural
next question ("why does one turn only reach −q?"), the Sandwich panel opens
(drive tier, closed by default). It shows a vertical arrow (a pure quaternion
vector) centered in the view alongside the block. The panel has a single "play"
control. Pressing play stages the sandwich in two steps:

Step 1 (left-multiply by q): the arrow visibly tips and sprouts a small yellow
disk above its tip — the scalar part that leaks in. Label: "qv: scalar appears."

Step 2 (right-multiply by q⁻¹): the yellow disk vanishes, the arrow snaps to its
rotated position (rotated by the full block angle θ). Label: "q⁻¹ cleans it."

Below the staged animation, a small text line: "Each side contributed θ/2 — the
rotation doubles." This connects back to the sign dial: the reason the dial
completes the ring only at 720° is that the sandwich's two half-turns each carry
θ/2, so a full-circle lap of the dial (2π radians) requires two block rotations.

The Sandwich panel does not need to be in the first-frame experience. It earns
its place only after the belt has made the half/double feel mysterious.

---

## 9. Sharpest disagreements with the prior plan

The prior plan is well-constructed and I endorse its overall direction. Two
specific design decisions deserve reconsideration:

**The sign dial shape.** The prior plan says "great circle through q and −q,
projected to a ring" without specifying what happens to the other quaternion
components. A learner looking at a ring labeled q at the top and −q at the bottom
might reasonably ask "what is the ring a picture of?" The answer requires a
sentence of explanation. A cleaner illustration: make the dial show its two poles
prominently and label the 12-o'clock position **q = +1** (identity) and 6-o'clock
**q = −1** (the negative identity) for a rotation about the current axis — this
collapses a 4D object to a 1D path but does so explicitly and honestly, instead
of implying a full ring is "the space of quaternions." The honest caption:
"Angle along the q–(−q) arc."

**The "immersive" layout for the view.** The prior plan mentions using `immersive`
(frameless, full-stage view). For a first-person scene this is natural, but The
Belt is a tabletop inspection app: the learner needs to orbit the object, resize
the readout panel, and compare the ribbon to the dial simultaneously. Immersive
mode hides the panel chrome. The correct layout is a standard windowed view — the
block fills most of the view window, and the sign-dial readout lives in an
analysis panel beside it. The `immersive` flag is a distraction here.

---

## Takeaways

1. **The ribbon's painted center stripe is non-negotiable.** It is the only
   decoration whose legibility does not depend on understanding what you are
   looking at — a stripe that faces the wrong direction is wrong, and wrong is
   unmistakable without labels or instruction.

2. **360° and 720° must be simultaneously comparable.** The turn slider must let
   the learner scrub freely between 360° and 720° and observe only the ribbon
   (and dial) changing while the block face and matrix stay identical. If the
   user must "remember what 360° looked like," the lesson fails.

3. **The on-ramp hint says nothing about quaternions.** "Rotate the block one
   full turn — then try to untwist the ribbon" is the full instruction. Any
   additional setup text forecloses the surprise. The belt earns its explanation
   by surprising you first.
