---
kind: progress
session: 2026-06-09-S05
date: 2026-06-09
title: Polygon Worlds — footsteps + markers two-sided-sheet polish
branch: claude/polygon-worlds-spherical-p2-qgExR
slug: polygon-worlds-spherical-p2-qgExR
status: in-progress
build: unknown
followup: null
pr: null
app: PolygonWorlds
---

# Polygon Worlds — footsteps + markers two-sided-sheet polish

## Session purpose

Finish ironing out the "two sides" of the fundamental polygon: resolve the
outstanding problems with the **footsteps** and the **markers** (exact list to be
enumerated by the user), cross-checked against the S04 handoff's "Open / not done"
section.

## Previous session

S04 ("the setting") completed the decor/towers/lighting/glass/zoom/trail work; build
green, verify 100/100, kernel FROZEN. Pending: two-sided-sheet polish on footsteps
(absolute-vs-relative mirror; visibility through glass) and markers (sphere
pole-clumping; tower labelling; badge legibility). See
[2026-06-09-S04-the-setting handoff](../../handoff/polygon-worlds-spherical-p2-qgExR/2026-06-09-S04-the-setting.md).

## Working notes

### 🔴 blocker · 07:10 — User verdict: the path demonstration is not correct → reset next session
**Why:** after the adherence fix the user reviewed the trail / direction-arrow behaviour
and judged that **"the path is not correct"** and **"the way it is getting demonstrated is
not correct."**

Decision: **stop iterating on the current footprint/trail implementation.** The next
session restarts the direction-arrow / path demonstration **from first principles**, not
reusing the existing code. Wrote a handoff
([2026-06-09-S05-trail-and-path-reset](../../handoff/polygon-worlds-spherical-p2-qgExR/2026-06-09-S05-trail-and-path-reset.md))
with a first-principles **starting prompt + a desired-outcomes questionnaire** so the
direction is pinned before any code is written. The geometry kernel and the rest of the
presenters (camera / tiling / decor / lighting) are unaffected and stay as-is — only the
footprint/trail "path" layer is up for a clean redesign.

### 🟢 code · 06:30 — Fix: euclidean footprints must wrap *within* the fundamental cell
**Why:** in the Klein bottle the trail "lived in infinite space" instead of adhering to
the fundamental polygon.

Root cause was in the fold-back: on every edge crossing the code rigidly shifted *every*
baked print by the player's fold delta (`for (const t of trail) t.pos -= cellOrigin`). But
the ground patch is static in scene space and each fresh print is laid at the already-folded
(home-cell) position, so dragging the whole set one cell over on each crossing pushed the
accumulated trail across the cover — it stretched backwards to infinity as you walked.

Fix: **don't move the trail on a fold.** Each print stays where it was stamped (inside the
home cell), so the trail now wraps *within* the fundamental polygon exactly like the confined
player. Only `trailLast` (a spacing reference, not a print) still tracks the player's periodic
image so prints stay evenly spaced across a wrap. A glide crossing still rebuilds the trail to
re-mirror prints against the new side (the S05 relative-mirror cue). Removed the now-unused
`footprints.shift()`. Verified: torus + klein trails stay bounded over a 40 s walk; the
chirality test stays green (all four PASS).

**Aside (separate, pre-existing):** while verifying I caught a transient white blow-out — a
raycast identified it as a **tree cone 0.65 u from the camera**, i.e. the third-person camera
backing into decor and the camera-mounted headlamp over-lighting it point-blank. It is a
camera/decor clipping issue, not a footprint bug; logged for a later pass (fade/cull decor
near the camera, or clamp the headlamp range).

### 🟢 code · 05:40 — Fix: the orientation flip must be *relative* to the viewer's side
**Why:** the S05 chirality test (below) proved klein + crosscap3 lay the **fresh** print
mirror-reversed in place while the avatar stays un-mirrored, so the F a character just
stamped read **backwards to itself** on the flipped face. ℝP² was right because it lays
the print un-mirrored and shows the reversal via a real `det<0` twin mesh.

Root cause: the `mirror` flag was **absolute** (`detH<0` / `flipAcc` at lay time) when it
must be **relative** — `mirror = (print's side) XOR (viewer's current side)`. Then a fresh
print (same side) is never mirrored (reads correct in frame), and a print from the other
face reads reversed once you cross to it (the cue is preserved; it's symmetric).

- **hyperbolic** (Dyck/genus-2): `covTrail` now stores `side` (not a baked `mirror`);
  `rebuildTrail` (already runs every frame) appends with `side !== (detH<0)`. One-liner.
- **euclidean** (Klein): prints are *baked*, so re-mirroring on a side change needs a
  rebuild. Added a `trail[]` list (`pos`, `fwd`, `side=flipAcc`); fresh prints are laid
  **un-mirrored**; a glide-edge fold (`parity===1`) now calls `rebuildTrail()` to re-mirror
  every print against the new side; a translation-only fold still just `foot.shift`s.
- **spherical** unchanged — already correct (un-mirrored primary + `det<0` twin).
- Re-ran the test: **all four green** (torus control; klein/crosscap3/rp2 PASS). Eyeballed
  klein + crosscap3 on the mirror face: the fresh F is now forward/upright with cyan-left;
  the existing trail flips to reversed the instant you cross (the cue still lands).

### 🔵 finding · 05:10 — A test for trail orientation (fresh F must read correct in-frame)
**Why:** "is the footprint chirality right?" needed an executable check, not eyeballing.

- Added a `?polydebug`-guarded `window.__poly` test bridge (`map`/`probe`/`setYaw`; no
  effect on the shipped app) and `footprints.lastChirality()` + `CoverModel.debugProbe()`:
  the **exact** signed side of the freshest print's cyan half in the character's own
  `up×forward` frame (geometry, not pixels — a first pixel attempt was spoofed by the
  cyan corner discs and flipped the orientable torus between runs).
- `scripts/trail-chirality.mjs` walks the character onto **both** faces of each world and
  reports PASS/FAIL (sign must match across faces), saving third-person shots to
  `/tmp/trail`. A subtlety: the trail only records a print every ~0.12–1.6 units, so the
  harness must **dwell** on the flip face until a genuinely flip-side print is laid before
  probing (an immediate read returns the stale pre-crossing print — that briefly masked
  crosscap3 as a false PASS until the dwell was added).
- Verdict (pre-fix): **rp2 PASS; klein + crosscap3 FAIL** — confirming the reported symptom.

### 🔵 finding · 04:50 — What the footprint trail is *for* (the design contract)
**Why:** the trail keeps causing trouble; writing down its intended job + the
invariant every presenter must honor, so we stop re-breaking it.

**Two jobs.**
1. **Orientation cue (the headline).** Each print is a deliberately *chiral* glyph:
   a forward arrow with a letter **F** and a **cyan-left / magenta-right** split,
   all mirror-asymmetric (`footprints.ts`). Whenever the ground is drawn through an
   orientation-reversing transform — a mirrored Klein cell, the hyperbolic flipped
   sheet (`detH < 0`), the antipodal/Möbius flip — the F reads **backwards** and the
   colours **swap**. So walking a non-orientable loop and returning to your own prints
   *reversed* is visible proof you came back on the other side. Every print therefore
   records the side it was laid on (`mirror`) and is laid on the player's **current**
   side (along `UP`), with its chirality mirrored *in place* when on the flip face.
2. **Breadcrumb / wayfinding.** The worlds are closed, so your trail wraps back into
   view — it answers "have I been here?" and shows the space closing up on itself.

**The invariant (what every presenter must do).**
- **Record** a print once you've moved a threshold from the last one (hyperbolic
  `0.12` in hyperbolic distance; euclidean `TRAIL_SPACING = 1.6` world units),
  storing **position + side**.
- **Live in a surface-fixed frame, not screen space** — the trail must stay glued to
  the ground as the camera/player move. Hyperbolic stores cover coords (`covTrail`)
  and **re-projects every frame** through `Tview` (`rebuildTrail`); euclidean **bakes**
  absolute world coords once into the buffer (`foot.append`).
- **Carry it through every teleport/fold by the *same* deck element**, or the prints
  detach and swim at a crossing. Hyperbolic: `applyMat(Dinv, t.p)` on each point +
  `lastTrailPos`. Euclidean: `foot.shift(-ox,0,-oz)` on the baked buffer + `trailLast`.
- **Cap** at `TRAIL_MAX` (hyperbolic 500, euclidean 1500); oldest fall off.

**Sharp edges (why it keeps biting).** ① The carry-on-fold must *exactly* match the
render fold — this is the most regression-prone part; any new code path that moves the
player must also move the trail. ② Hyperbolic re-projects every frame (always correct,
cheap); euclidean bakes + shifts (cheaper, but a forgotten `shift` leaves the trail
behind). ③ `rebuildTrail` aims the freshest print "toward the player/centre", so its
facing is approximate. ④ Spacing thresholds are in *different units* per world
(hyperbolic distance vs world units), so trail density differs across topologies unless
retuned.

### 🟢 code · 04:30 — Confine the player to the fundamental domain (teleport on crossing)
**Why:** straying from the start point destabilised the **hyperbolic** view — the
player frame was a free `Frame` walking across the universal cover, and on ℍ² its
matrix entries grow like `cosh(distance)`, so within a few dozen tiles `inv3(frame.g)`
goes singular and the render blows up.

- **Hyperbolic:** after the greedy tile tracker finds the tile `h`, re-base both
  `frame` and `h` by the nearest **orientation-preserving** deck element on the left.
  This leaves `Mtiles = frame⁻¹·h` exactly invariant (seamless teleport), keeps
  `det(frame) > 0` (controls never invert) and the sign of `det(h)` (which sheet side),
  and bounds `frame.g` forever (`|frame.g|` ~5 vs the old ~2.5e8 → crash). Trail carried
  with each fold.
- **Euclidean:** fold the player **and the baked footprint trail** back into the home
  cell on crossing, accumulating the crossing's flip parity into `flipAcc` so a glide
  edge still swaps the face you stand on; pure-translation lattice ⇒ the patch redraws
  seamlessly.
- `footprints.ts`: added `shift()` so the baked euclidean trail follows a fold.
- Verified: build green; genus-2, Dyck surface, torus and Klein all survive a long fast
  walk (old hyperbolic crashed ~7 s in) with coherent rendering and no console errors.


### 🟢 code · 03:10 — Consistent sense of space (walk speed + world size parity)
**Why:** switching topology felt like a radical change of scale/speed. Two concrete
causes, both in the hyperbolic cover.

- **Walk speed.** Euclidean and spherical both move the ground at `moveSpeed`
  units/sec, but hyperbolic moved it at only `moveSpeed/2`: re-centred at the origin,
  the Poincaré map compresses by `tanh(d/2)≈d/2`, halving the world-space rate.
  Doubled the hyperbolic `kStep`/`kStrafe` so all three covers walk at the same rate.
- **World size.** Hyperbolic `DISK_R` was `max(34, squareSize·1.4)` ⇒ at the default
  the home octagon was ~1.5× the flat cell (genus2 world-circumradius ≈35 vs cell ≈21),
  so the same 7 landmarks read sparser. Replaced with `diskRadiusFor(sq) =
  sq·√2/2 / tanh(circumradius/2)`, which sets the home polygon's circumradius to the
  flat cell's half-diagonal — genus2/crosscap3 now match the torus's density.
- Eyeballed torus vs genus2 vs crosscap3 at default: comparable tree size, landmark
  density and centre-spire scale. Sphere left as-is (own radius slider, default 30 ≈
  cell; its "vast" read is the carried dark-shell lighting, not scale). Build + verify
  green.

### 🟢 code · 02:40 — Ground corner markers (numbered manhole discs) replace the towers
**Why:** user wants polygon corners marked at ground level (manhole-cover / rivet
discs), numbered per corner — Arabic on the tree face, Roman on the column face,
unique colour each — matching the minimap. The old tall vertex towers are dropped.

Decisions taken from the user: **replace** the towers; number by **corner index**
(1..2n around the boundary, each corner distinct); **try** the matching numbers on
the minimap (drop if crowded — kept, it reads fine).

- `decor.ts`: removed the tower geometry + `makeTowerTop/Bottom`; added `makeCornerTop
  (i,color)` / `makeCornerBottom(i,color)` — a squat metal disc + raised rim + a
  numbered plate (`numeralTexture`) facing up. Added `cornerColor(i,count)` (even hue
  spacing, shared with the minimap) and `romanize(n)`. Top face = Arabic, bottom face =
  Roman (rides the flip like the tree↔column / number+arrow cue).
- All three presenters: replaced the tower placement with corner-marker placement,
  passing `i+1` and `cornerColor(v, count)` (euclidean 4 cell corners; spherical 4
  chart corners + antipodal twin for ℝP²; hyperbolic `nVerts` tile vertices). Renamed
  the cell fields `tower*` → `corners*`.
- `squareMap.ts` + `polygonMap.ts`: draw matching numbered, hued corner chips so the
  minimap number/colour corresponds to the ground marker (verified: corner 3 = teal in
  both the 3D disc and the map). Octagon/hexagon/square all read without crowding.
- Verified headless: a clear Arabic "3" disc with a teal rim (manhole look) in torus;
  `romanize` outputs I..VIII; build green; verify 100/100.

### 🟢 code · 01:55 — Unified glass spec + clear-but-present default opacity
**Why:** the opacity slider felt different per world (euclidean/spherical used
`{showUnderBelow:0.8, solidAt:0.82}`, hyperbolic `{showUnderBelow:0.95}`) and every
world started fully solid (`useState(1)`), so you couldn't see the floor was glass.

- Added a single shared `POLYGON_GLASS = { showUnderBelow: 0.9, solidAt: 0.95 }` in
  `glassSurface.ts`; all three presenters now import it instead of carrying their own
  `const GLASS`. The slider now behaves identically in every world.
- Lowered the host default `floorOpacity` from `1` → `0.45` (clear-but-present), and
  aligned each presenter's internal initial to `0.45` (was 0.85 / 0.85 / 1) to avoid a
  one-frame opaque flash before the host re-pushes on mount.
- Eyeballed torus / sphere / genus2: torus shows the underside columns through the
  floor; genus2's glass disk shows the look-through; sphere reads via its bright grid
  (the dark fill is the see-through — its faintness is the carried big-shell lighting
  issue, not opacity). Build green, verify 100/100.

### 🟣 decision · 01:40 — Switched onto the polygon-worlds branch; oriented
**Why:** the fresh clone was checked out on the harness-default branch
`claude/nice-allen-mafdfy`, which has no Polygon Worlds work. The task explicitly
targets `claude/polygon-worlds-spherical-p2-qgExR`.

Fetched and checked out `claude/polygon-worlds-spherical-p2-qgExR` from origin (it
existed remotely but not locally). Read the S04 handoff in full — camera/tiling per
world, decor styling, and the open footstep/marker issue list. Waiting on the user's
exact issue list before touching code.
