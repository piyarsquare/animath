---
kind: lens
session: 2026-06-18-S05
date: 2026-06-18
title: "Quaternions — design lens: Visual designer"
branch: claude/quaternion-exploration-app-ig4jmy
slug: quaternion-exploration-app-ig4jmy
status: stopped
build: n/a
app: general
---

# Quaternions — Design Lens: Visual Designer

**Backed candidate: A — The Belt, with C as a folded-in depth panel.**
B (Slerp Racer) earns its place as a second layout, not a co-equal app.

---

## 1. Why A reads and B and C don't win outright

The belt is the only concept that survives across all five skins without
redesign. It is a physical object with a shape: a strip that holds twists.
That shape is legible whether the background is ink-blue (Observatory),
warm cream (Paper), blueprint chalk, neon black, or phosphor green. Nothing
about "strip has twist / strip is flat" depends on hue. Candidates B and C
both require a second glance — two meshes racing (B) or a four-dimensional
split-step animation (C) need more parse time before the learner has a mental
hook. A lands in one beat: turn the block, watch the belt knot; turn it again,
watch the knot dissolve. That beat is the entire lesson.

The belt is also the crossing the atlas flags as maximally felt (I3): felt and
formal coincide at C6 and nowhere else at the same depth. You cannot out-argue
that priority from a design lens.

---

## 2. The visual encoding of q vs −q (without relying on color alone)

The single hardest design problem is making the sign flip visible. The learner
needs to know, at a glance, that the block returned to its starting pose while
something else did not. Color alone fails — Phosphor renders in near-monochrome
green; Blueprint has chalk-white on dark blue; a red-vs-green encoding collapses
on those skins and for color-blind users.

**Dual-channel encoding: a radial arc + a symbol + a count.**

Place a small **sign dial** in the top-left corner of the main view, always
visible:

- An unfilled circle (the great-circle ring through q and −q), drawn in
  `var(--fg)` at low opacity. Its center is the fixed origin; its top pole is
  labeled "+1" and its bottom pole "−1."
- A **filled semicircle arc** sweeps from the top pole clockwise as the block
  turns, tracking the current quaternion w-component (the cosine of half the
  total angle). At 360° the arc fills exactly the bottom half and the dot sits
  at −1. At 720° it completes the full circle and sits back at +1. The arc is
  drawn in `var(--accent)` — the theme's primary accent color (gold in
  Observatory, amber in Paper, chalk in Blueprint, cyan in Spectrum, green in
  Phosphor) so it reads in every skin.
- At the same time, a **glyph** sits at the current dot position on the ring:
  the glyph is **"+"** at the +1 pole and **"−"** at the −1 pole, with a
  smooth morph between them. The morph is purely typographic (scale + opacity
  crossfade on a Space Mono character pair), so it works in the Phosphor
  monochrome skin. No color encoding is required for the +/− distinction.
- Below the ring, a single monospaced readout: **w = −0.999** (or whatever the
  exact value is), in `var(--font-mono)`. This number ticking to −1 and back
  to +1 is the numeric confirmation.

Three independent channels encode the same fact — arc fill, glyph, number —
so any one of them alone is sufficient. A color-blind user reads the arc
geometry and the glyph; a user on Phosphor reads the green arc and the mono
character.

**The belt itself is the fourth channel.** The number of visible twist-peaks
(the undulation count in the ribbon mesh) is always exactly **⌊total_turns⌋**
— one peak after one turn, two peaks after two turns. Peaks are shape, not
color. A learner who ignores the sign dial entirely still gets a geometric
count.

---

## 3. The motion design of the untwist

The untwist is the app's moment of surprise. Motion design must make it feel
earned, not magical.

**The twist accumulates at constant speed during normal turning.** Drag the
block; the belt deforms in real time with no easing — the twist is
proportional to the block's rotation angle, computed live from the quaternion.
There is no added animation here: the belt follows the block, full stop.

**The untwist button ("Untwist") triggers a two-phase animation:**

Phase 1 (0–300 ms): the belt tightens slightly — the twist-peaks sharpen and
the ribbon narrows by ~15%. This is a visual "breath in": it tells the learner
something is about to happen. Ease: `cubic-bezier(0.2, 0.7, 0.3, 1)` (the
project's `--ease` token, reused).

Phase 2 (300–1100 ms): the twist-peaks migrate outward toward the fixed wall
and disappear, while the belt relaxes to flat. The sign dial arc rewinds at
the same rate. If the block is at 360° (one twist, odd half-turn), the belt
fails to untwist: the peaks migrate but reverse at the midpoint and reform —
the belt "refuses." If the block is at 720° (even half-turns), the peaks reach
the wall and vanish cleanly. The difference between "belt refuses" and "belt
accepts" is the app's payoff.

**The belt's failure state (at 360°)** must read as a deliberate refusal, not
a bug. After the failed untwist, the belt snaps back to its twisted state with
a short wobble (150 ms, low-amplitude oscillation on the twist envelope) and
the sign dial shows −1 clearly. A small inline hint appears in the readout
panel: "One twist remains — try another full turn." The hint uses `var(--dim)`
(the muted foreground token) so it recedes after the learner moves on.

**Total animation budget per interaction: 1.25 seconds.** Under that budget,
the failure reads as a refusal; the success reads as a release. Nothing lingers
past 1.5 seconds or the suspense collapses.

---

## 4. Contrast hierarchy: one surprise dominates

The immersive main view contains exactly three visual layers in priority order:

1. **The belt** — high saturation via `var(--accent)` edge highlight on the
   ribbon's twist ridge, full `var(--fg)` on the flat sections. This is the
   primary object. Everything else is lower contrast.
2. **The block** (hand/plate/dish mesh) — rendered in `var(--panel-solid)` with
   a single directional light so it reads as a 3D object without competing with
   the belt. It is heavier than the belt but quieter in color.
3. **The camera space** — `var(--viz-bg)`, the darkest token available in every
   skin. No grid, no floor, no ambient decoration. The dot-pattern stage is not
   drawn inside a Canvas3D window; the view's background is the plain vizualization
   background color.

The sign dial lives in a small overlay in the top-left corner of the main view,
drawn at 60% opacity when the block is stationary and 100% opacity during
motion — it never competes for attention when nothing is happening.

The contrast budget is spent on one thing: the belt's twist state. Everything
else is furniture.

---

## 5. What belongs where in the chrome

**Immersive view (the main `ViewDef` node, full `position:absolute;inset:0`):**
- The 3D scene: block + belt, camera orbitable by drag.
- The sign dial overlay (top-left corner, 80×80px, always on).
- No labels, no formula overlays inside the 3D scene. Text belongs in panels.

**Action strip (≤ 5 buttons):**
- **Turn ＋360°** (primary, filled `--accent` button) — the first action a new
  user will reach for.
- **Turn −360°** (secondary, outlined) — lets the learner undo a turn to
  retreat back through the sign flip.
- **Reset** (secondary) — returns block to 0°, belt flat, dial at +1.
- **Untwist** (secondary) — triggers the two-phase animation; fails loudly at
  360°, succeeds at 720°.

Four buttons, all on the action strip. Drag-turning the block directly is the
primary gesture; the strip is the one-thumb alternative on phone.

**Floating panels (rail, left):**

- **Block** (`subject` arch): mesh picker (hand / plate / dish / teapot),
  ribbon width, ribbon on/off. This panel is opened by default so a new user
  can immediately see it is a "thing you control."
- **Turn** (`drive` arch): axis–angle dials + a turn slider 0°–720°. Pairs
  with the action strip; the slider is the slower, deliberate version of the
  strip buttons.
- **Sign Dial** (`readout` arch): the quaternion components (w, x, y, z) in
  `var(--font-mono)`, total angle turned in degrees, "belt slack: yes / no"
  as a large binary readout (not a color — a bold word, because Phosphor skin
  has no color vocabulary for state).
- **Compare** (`readout` arch): the 3×3 rotation matrix, updated live. At 360°
  and 0°, the matrix is identical — the learner sees that the matrix "forgot"
  the path. This is the Skeptic's resolution made into a panel.
- **Sandwich** (`drive` arch, collapsed by default): the progressive-disclosure
  depth from Candidate C — the two-sided qvq⁻¹ step-through that shows why
  the half-angle is not arbitrary.

**The sign dial is not a second view window.** Giving it a full window would
suggest it is co-equal with the 3D scene. It is a readout: one panel entry or
a small overlay. The panel version (Sign Dial arch `readout`) shows more detail;
the overlay version shows only the arc + glyph + w number.

---

## 6. Phone behavior (≤ 740 px, one-thumb rule)

The phone re-chrome stacks view cards vertically (PhoneWorkspace). The belt
scene takes the first card at full screen width. The sign dial overlay stays in
the top-left corner of that card — it is part of the scene, not a panel — so
it is always on screen without opening a bottom sheet.

The action strip buttons appear at the bottom dock. Four buttons fit comfortably
in the bottom dock at 44px touch targets. The one-thumb rule: **Turn ＋360°**
is the rightmost, dominant button. A right-handed user's thumb lands there
without a stretch.

The Sandwich depth panel and Compare panel are collapsed by default on phone and
opened via the bottom sheet on explicit request. A new phone user should never
have to open a sheet to get the app's core lesson — one turn, one failed untwist,
one more turn, one successful untwist. That sequence fits entirely in the default
phone view with no navigation.

---

## 7. Disagreement with the prior plan on one point

The prior plan's sign dial is described as "the great circle through q and −q,
projected to a ring" and flagged as "the weakest-specified piece." The self-
reflection correctly noted the bridge between "belt slack" and "dial position"
is unresolved. My disagreement is that the dial should not be presented as the
*primary* indicator — it should be *secondary* to the belt itself, and the
primary bridge to the math should be the **w-component number**, not a ring
diagram. The ring is beautiful but abstract; a learner who reads "w = −1.000"
and sees a flat belt that refuses to untwist has already understood the double
cover, without needing to interpret a 2D projection of the 3-sphere. Lead with
the number; let the ring reward the curious.

---

## Takeaways

1. **The encoding of q vs −q must be triple-redundant and shape-first.** The
   arc fill, the +/− glyph, and the w= number are three independent channels;
   none is color-only. The twist-peak count in the belt mesh is a fourth, purely
   geometric channel. Dropping any one channel still leaves three.

2. **The untwist animation is the app's single designed moment.** Everything
   else is real-time response to user input. The two-phase "breath in, then
   attempt release" (with a refusal wobble at 360° and a clean dissolve at 720°)
   is the only place where the app directs attention rather than following it.
   Do not add a second "designed moment" — the budget for surprise is exactly one.

3. **The sign dial is a readout panel entry, not a view window.** Giving it a
   full window elevates it above its role. The learner's primary instrument is
   the belt — seen, felt, counted by eye. The dial and the w= number are the
   bridge to the algebra, and they live in the Analyze tier where bridges belong.
