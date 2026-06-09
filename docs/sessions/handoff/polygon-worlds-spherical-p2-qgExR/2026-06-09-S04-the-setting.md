---
kind: handoff
session: 2026-06-08-S04
date: 2026-06-09
title: Polygon Worlds — the "setting" (decor, towers, lighting, glass, zoom, trail) + camera/tiling reference
branch: claude/polygon-worlds-spherical-p2-qgExR
slug: polygon-worlds-spherical-p2-qgExR
status: completed
build: passed
followup: medium
pr: null
app: PolygonWorlds
---

# Polygon Worlds — the "setting" + a camera/tiling/styling reference

> [!IMPORTANT]
> **The geometry/mechanics are correct and the scene now looks much better.** What
> remains is **two-sided-sheet polish** — specifically a few outstanding issues with
> the **footsteps** and the **markers** that the user will enumerate next session.
> This handoff is heavy on a **camera + tiling reference per world type** and the
> **decor styling**, by request, so the next agent can navigate the three presenters
> without re-deriving them.

## Summary

This session did "the setting": redesigned trees/columns + a legible chiral number
badge, added fill/headlamp lighting, made the **glass look-through** work in the
hyperbolic worlds, added **wheel/pinch camera zoom**, added **vertex towers** (a
slightly-smaller inscribed n-gon, a tower just inside every vertex, on both faces,
every world), and iterated on the **footprint trail** so prints stay on the
character's side of the sheet and read mirror-reversed in place when laid on the
flipped face. Build green and `npm run verify` 100/100 throughout (the Cayley–Klein
kernel was never touched). All work is on
`claude/polygon-worlds-spherical-p2-qgExR`, pushed; no PR.

## What changed (newest first)

| Commit | What |
|---|---|
| `7c09da1` | Footprints stay on the character's side, **mirrored in place** on the flip face (`append(…, mirror)`), not dropped below the glass. |
| `3c55eea` | (superseded by the above) trail always on the character's side. |
| `150c333` | **Vertex towers** — inscribe a smaller n-gon, a tree-tower (top) / column-tower (bottom) just inside every vertex, every world. |
| `8d92858` | (refined later) hyperbolic trail to the other side of the glass. |
| `a1925da` | **Hyperbolic glass look-through** (mirrored decor below the disk) + **wheel/pinch zoom**. |
| `592cc1d` | Redesigned trees/columns, **chiral number badge**, hemisphere + headlamp **fill lighting**. |

## Camera + tiling, per world type  ← read this first

The three presenters share a thin facade (`fundamentalSquareEngine.ts`: lights,
avatar, frame loop) but each owns its **own camera rig and "tiling" model**. They are
genuinely different — don't assume one generalises to another.

### Euclidean (flat: torus, Klein) — `presenters/euclidean.ts`

- **Camera moves through a fixed, tiled world.** `camera.up = (0,1,0)` (world up),
  fov 75. First-person: eye at `(px, 1.7, pz)` looking along `yaw/pitch`.
  Third-person: pulled back `-forward · D` and up, where `D = camDist · aspect`.
- **Tiling = the deck lattice.** `realize(word)` gives two side-pairing generators
  γ₀, γ₁; their action on `ORIGIN` gives lattice vectors **a, b**. The player walks
  the *infinite plane* in unbounded world coords `(px, pz)`. Each frame `cellOf(px,pz)`
  finds the player's cell `(I₀,J₀)` and a **5×5 block** (`K=2` ⇒ `(2K+1)²=25`) of
  cell copies is positioned around them at `cellOrigin(I,J)`. A cell is **mirror-
  flipped** (`group.scale.y = −1`) when `flipParity(I,J)` is odd (from the generators'
  `det` signs) — that's the non-orientable swap (trees↔columns) baked into the cell
  group. Each cell is a thin two-sided slab; top face = trees at `+ht`, bottom =
  columns at `−ht`.

### Spherical (positively curved: sphere, ℝP²) — `presenters/spherical.ts`

- **Camera orbits a fixed finite planet; there is NO tiling.** The player is a kernel
  `Frame` on the κ=+1 shell (the unit sphere); `framePos · R` lands on a planet of
  radius `R`. `camera.up = posU` (the **radial** outward direction, not world-up).
  First-person: eye at `posU·(R+1.7)` looking along the surface tangent `fwdU`.
  Third-person: `posW − fwdU·camDist + posU·(…)`.
- **One sheet, placed once.** The whole fundamental polygon is mapped onto the shell:
  the **sphere** charts `(u,v)` over the whole ball (`fullDir`, lon×lat); **ℝP²** maps
  the square to a hemisphere (`sq2hemi`) and uses the `develop` **Z/2 antipodal deck**
  (the `det<0` element) to put the *flipped* skin on the antipodal half. Decor:
  **outer face = trees** (grown outward at `R`), **inner face = columns** (grown
  inward at `R·SHELL_GAP`), seen through the glass. Walking = `stepForward`/`turn` on
  the Frame; no re-tiling.

### Hyperbolic (negatively curved: genus-2, 3-cross-cap) — `presenters/hyperbolic.ts`

- **Camera is FIXED at the origin; the WORLD moves under it.** This is the big
  difference. The player is a kernel `Frame` on the κ=−1 shell, **always det>0**
  (controls never invert). The view `Tview = frame⁻¹` re-centres the player to the
  basepoint, so the player is **always at the disk centre `(0,0,0)` facing +X**.
  First-person camera sits at `(0,1.7,0)` looking +X; third-person at `(−camDist, …)`
  looking back at the origin. `camera.up = (0,1,0)`.
- **Tiling = the developed Poincaré disk, re-centred each frame.** `develop(real)`
  gives the deck cosets (tiles). Tiles render through `Mtiles = Tview · h`, where `h`
  is a **tile tracker** (a deck element greedily walked toward the player each frame
  so the player stays in the fundamental domain — no walk-off). Cover point →
  Poincaré `(x,y)/(1+w)` → flat **glass disk floor** of radius `DISK_R`. Crossing a
  **glide** edge makes `det(h) < 0`, which flips the whole skin (`det(h)·det(γ)<0`) —
  you genuinely change sides — while your frame (and controls) stay put. Decor +
  towers are placed on the `N_DECOR=16` nearest tiles and **scaled by the conformal
  factor `(1−r²)`** so they keep a fixed *hyperbolic* size.

**One-line contrast:** euclidean = *camera follows player across a tiled plane*;
spherical = *camera orbits a fixed planet, no tiling*; hyperbolic = *camera pinned at
centre, the tiling slides under the player*.

### Shared bits (facade + host)

- **Lights** live in `fundamentalSquareEngine.ts`: ambient + a **hemisphere** fill +
  a warm **directional key from above** / cool from below (the two-sided cue) + a
  warm **camera-follow point "headlamp"** (positioned to `camera.position` each
  frame). A `lightingProfile(cover)` scales fill/key/lamp per geometry (the big
  sphere shell reads dark, so χ>0 gets the strongest fill + lamp).
- **Camera distance** is one host control (`camDistance`, used only in third-person),
  now also driven by **mouse wheel** (native non-passive listener) and **two-finger
  pinch** (a pointer-map in `PolygonWorlds.tsx`; spread = closer, pinch = farther),
  both via `zoomBy(factor)` clamped to 1.5–12.

## Decor styling (the "setting")  ← the other requested reference

Everything is authored in `decor.ts`, the single shared source consumed by all three
presenters via `makeTop(i)` / `makeBottom(i)` / `makeTowerTop()` / `makeTowerBottom()`.
**Every decor material is `DoubleSide`** (the euclidean flip scales a cell by `y=−1`;
`FrontSide` would vanish on flip). Identity is carried by **shape** (organic vs built
— CVD-robust) and reinforced by a **per-landmark hue**.

- **Trees** (`makeTop`, the top face / "your side" when unflipped): a tapered brown
  trunk (shared `trunkMat`) + a **3-tier conical canopy** tinted green-by-hue
  (`canopyMats[i]` = the landmark hue lerped toward forest green). Organic silhouette.
- **Columns** (`makeBottom`, the bottom face): a **plinth + fluted limestone shaft**
  (hue-tinted `shaftMats[i]`) **+ capital + abacus** (shared pale `stoneMat`).
  Unmistakably "built". The tree↔column pair sits back-to-back at the *same* (u,v),
  grown away from the sheet so neither penetrates it.
- **Number badge** (`numberRing`): a **256px high-contrast plaque** — dark backing,
  bright hued rim, hue-tinted **number + → arrow** — mounted as a **3-plane ring at
  120°** at a consistent height on *both* trees and columns. It is **geometry-fixed,
  not billboarded** (by design): it reads correctly from any side when unflipped and
  **mirrors as a whole under the flip** — this number+arrow is the canonical **chiral
  orientation cue**.
- **Centre beacon** (`kind: 'center'`, at (0.5,0.5)): a stepped pedestal + faceted
  spire + glowing finial — **gold spire+orb on top**, **magenta spire+cube on the
  bottom** — so top/bottom are unmistakable.
- **Vertex towers** (`makeTowerTop`/`makeTowerBottom`, **index-free**, NEW this
  session): a tall **evergreen tree-tower** (trunk + a single tall conical crown,
  `towerCrownMat` deep green) and a tall **stone obelisk-tower** (base + tapered shaft
  + pyramidion), **both capped with a glowing gold octahedron finial** so they read as
  "special". Placed just inside every polygon vertex (see below). They keep the
  tree↔column split, so they swap under the flip too. **Towers currently carry no
  number badge.**
- **Floor**: one neutral colour (`0x46658f`); the two sides are told apart by
  trees/columns + the warm/cool light, never by floor tint. Default opacity reads
  solid; the **Glass** slider lowers it to reveal the underside (`glassSurface.ts`
  computes `opacity/visible/depthWrite/showUnder`).
- **Footprint trail** (`footprints.ts`): oriented arrow quads with a chiral **F** and
  **cyan-left / magenta-right** halves. `append(pos, forward, up, mirror?)` — the new
  `mirror` flag reverses the chirality *in place* (without flipping the `up` normal,
  which would push the print below the floor).

### Where towers are placed (per cover, because (u,v) can't reach the n-gon vertices)

- **euclidean**: the 4 cell **corners** inset by `VERTEX_INSET=0.82` toward centre.
- **spherical**: the 4 inset chart **corners** via `dirFor`, outer/inner like the
  markers, with the antipodal twin for ℝP².
- **hyperbolic**: `real.vertices` pulled `0.85` toward `ORIGIN`
  (`geodInterp(ORIGIN, V, …)`), one per developed tile, with the same above/below +
  glass + `det(h)` flip + conformal `(1−r²)` scale as the markers.

## Open / not done — next session ("two sides" polish)

The user flagged **outstanding problems with the footsteps and the markers**, to be
enumerated next session. Candidate issues I'm aware of (confirm with the user before
acting — the exact list is theirs):

1. **Footsteps — the "absolute vs relative" question.** Each print stores its
   **lay-time** side (`det(h)<0` in hyperbolic / `playerFlipped` in euclidean) and is
   mirrored by that. This is correct for *fresh* prints (they match the character's
   current face). But the trail is re-rendered relative to the *current* global flip,
   so an *old* print laid on the front face stays upright even after the whole world
   re-renders flipped around it — it can disagree with the decor skin near it. Decide
   whether the print's mirror should be **relative to the current `det(h)`** instead.
2. **Footsteps — visibility through the glass.** The print now always stays on the
   character's side (top). The earlier "trail on the other side of the glass" idea is
   no longer shown; if you want the trail *also* reflected below the glass for the
   look-through, that's a separate mirrored copy (like the decor's below copy).
3. **Markers — sphere pole-clumping (carried).** On the plain **sphere**, the chart's
   four corners collapse toward the two poles, so both markers and the new towers
   cluster at the poles. ℝP² (hemisphere chart) places them cleanly around the seam.
   Options: switch the sphere world to use kernel `real.vertices`, or distribute by
   area. (Pre-existing; noted in S03.)
4. **Markers — towers have no number/label**, and badge legibility at far
   first-person distance is borderline; revisit tower labelling + badge size/contrast.
5. **Markers/towers — density & performance in hyperbolic.** Each of 16 tiles builds
   `props + 2·nVerts` decor groups (trees+columns+towerTrees+towerColumns); fine in
   the headless single-frame checks, but worth an eyeball for framerate on a heavier
   world (octagon = 8 verts).
6. **Carried from S03:** sphere mini-map still uses the hemisphere chart while the
   sphere decor uses whole-sphere lon/lat (a chart mismatch); P4 instruments + free
   edge-word entry; P5 κ/gluing morph (the plan).

## Context (read before touching the code)

- **The kernel is FROZEN.** `lib/cayleyKlein.ts` + the realize/develop battery are
  invariant-checked by `npm run verify` (100/100). Don't touch them; keep verify green.
- **Player frame never reduces through a glide.** In hyperbolic the flip lives in the
  `h` tracker / `det(h)`, NOT the player frame (reducing the frame inverts the
  controls — this cost a prior session). Same spirit in euclidean (cell `scale.y=−1`,
  not the player).
- **Settled aesthetic decisions (don't undo):** one neutral floor colour; markers
  OFF the gluing edges; trees/columns carry the side (not colour); all decor
  `DoubleSide`; the number+arrow badge is the chiral cue and is geometry-fixed (never
  billboarded).
- **Verification loop:** `npm run build` (CI) · `npm run verify` (schema + 100 geometry
  invariants) · eyeball with `nohup npm run preview &` then
  `node scripts/shoot-pw.mjs <world> out.png` (worlds: `torus klein rp2 sphere genus2
  crosscap3`). To drive the **glass slider / walk / zoom** headlessly, set the world
  `<select>` and the `label.cp-row` range inputs via their `.cp-row-label span` text,
  and dispatch a held `KeyboardEvent('keydown',{code:'KeyW'})` to walk (see the
  throwaway scripts referenced in the progress timeline — they were not committed).
- **Git:** commit with `git commit -F -` (avoid backticks in `-m`). Push to
  `claude/polygon-worlds-spherical-p2-qgExR`; no PR unless asked.

## Self-reflection

**What I'd do with another session.** Get the precise footstep/marker issue list from
the user and resolve them — most likely the footstep absolute-vs-relative mirror
(item 1) and the sphere pole-clumping (item 3), which is the last "looks like a bug"
artifact. I'd also add tower labels and re-check first-person badge legibility.

**What I'd change about what I produced.** The footstep behaviour took three passes
(below-glass → always-top → top-but-mirrored) because I read "same side as the
character" as the rendered side rather than the side of the *surface*. I should have
asked which "side" up front; it was cheap to clarify and expensive to iterate
visually.

**What I was not asked that matters.** Whether the trail should *also* be visible
through the glass (a below-floor reflection) in addition to staying with the
character — the earlier "other side of the glass" request and the latest "same side
as the character" request point in different directions and are worth reconciling
explicitly.

**What we both overlooked.** Tower numbering/labelling — towers are visually distinct
but anonymous, while every other marker is numbered; the next pass should decide if
vertices deserve labels (e.g. a shared vertex symbol).

**What was difficult.** Keeping the three movement/camera models straight while
changing shared decor — a change in `decor.ts` lands in three very different placement
contexts (tiled cells, a fixed shell, a re-centred Poincaré tiling).

**What would have made it easier.** A tiny dev HUD (player `det`, current tile,
`det(h)`, nearest-marker distance) would make the flip/side bugs obvious instead of
inferring them from screenshots.

**Follow-up value: MEDIUM** — the geometry is correct and the scene looks good, but
the two-sided-sheet *polish* (footsteps + markers) is unfinished and the user has a
specific issue list to apply.
