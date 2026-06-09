---
kind: handoff
session: 2026-06-09-S06
date: 2026-06-09
title: Polygon Worlds — trail rebuilt as "ink on the sheet"; user-approved across all worlds
branch: claude/polygon-worlds-spherical-p2-qgExR
slug: polygon-worlds-spherical-p2-qgExR
status: completed
build: passed
followup: medium
pr: null
app: PolygonWorlds
---

# Polygon Worlds — trail rebuilt as "ink on the sheet"; user-approved across all worlds

## Summary

The S05 reset is complete: the footprint trail was redesigned from first
principles (questionnaire → design sign-off → implementation), then hardened
through four user-feedback rounds, and the user approved the result in every
world ("the flat and positive curved worlds are good" → hyperbolic fixed →
"excellent!"). The mechanism is **one canonical trail, no mirror flags**: every
mirrored/under-floor appearance comes from a genuine orientation-reversing
render transform. The fixes along the way went beyond the trail — the Klein
glide deck itself was wrong (`scaleY(−1)` dropped the glide's in-plane
reflection) and is now the rigid "transparency flip". Build passes; the strict
chirality suite passes on all four test worlds. Open next: a pending design
question from the user ("can we *show* negative curvature without hyperbolic
distances?" — options proposed, holonomy square recommended, no decision yet)
and the parked S05 camera/headlamp bug.

## What changed

**The mechanism** (`inkTrail.ts`, new; `footprints.ts` deleted). A footprint
stamp is the player's world print pulled back through the *whole current render
transform* into canonical coordinates; one shared quad buffer holds the ink; all
appearances are drawn through the same genuine transforms that place the decor.
A quad is written from an explicit frame (pos, fwd, left, normal) — the frame's
*handedness* is the print's chirality and its vector lengths set the decal size,
so a det<0 transform mirrors a print the way a real reflection would, and a
conformal map shrinks it. Prints freeze every ~1.6 walked units; the freshest
print is the heading cue (no live pinned arrow — rejected by the user).

Per world, the same recipe through different covers:

- **Euclidean (torus/Klein)** — stamps pulled back through the home cell's
  current matrix into *sheet coordinates* (in-plane pos + heading + face);
  every cell draws a mesh instance of the one buffer through its own matrix.
- **Spherical/ℝP²** — stamps in world coordinates on the shell; main mesh plus
  one twin instance through the genuine antipodal det<0 matrix.
- **Hyperbolic** — stamps as frame *triples* (position + a geodesic step ahead
  + one whose projection lands on the avatar's left), pulled back into the
  fundamental domain through `h⁻¹` at lay time; re-projected each frame through
  the nearest-16 tile transforms (`Mtiles·γ`, the decor's own list).

**Geometry corrections discovered by the user's feedback** (each is a working
note in the [progress report](../../progress/polygon-worlds-spherical-p2-qgExR/2026-06-09-S06-ink-on-the-sheet-trail.md)):

1. **The Klein glide cell is now the π-rotation about the glide axis** ("flip
   the transparency over"), replacing `scaleY(−1)`, which swaps the sheet's
   faces but silently drops the glide's in-plane reflection — under-floor ink
   read un-reversed, and the walk contradicted the minimap's own gluing arrows.
2. **The fold stays a PURE translation.** Toggling `flipAcc` re-renders every
   cell flip-toggled, and for the alternating glide pattern that global toggle
   *is* the scene shifted by one glide step — reflecting the player on top of
   it applies the mirror twice (the "not smooth" crossing). The reflection
   lives only in the cell transforms and the pull-backs through them: the
   chart (the classic exit-at-v / re-enter-at-1−v shows on the map) and the
   ink stamps.
3. **Bottom-face decor is turned over rigidly** (π about the glide axis), not
   mirrored with a baked `scale.y = −1` — the baked mirror cancelled invisibly
   under the old sheet flip but *showed* under the rigid flip (mirror-written
   plaques on the walking face). Rule everywhere now: backwards text only ever
   appears through the glass.
4. **Hyperbolic stamps are canonical in the fundamental domain.**
   Player-relative cover representatives recede like cosh(distance) and their
   quotient images become unreachable through the ~16 near-identity tile
   transforms — the χ<0 disappearing/reappearing-trail bug. Canonical stamps
   never leave the domain; every visible tile draws the whole quotient trail;
   folds no longer touch the ink.
5. **The Poincaré projection (x,y) → (X,Z) is orientation-REVERSING under the
   fixed camera** (camera-right = +Z = cover-left), so the hyperbolic stamp's
   "left point" is recorded at kernel heading −π/2. Caught only because the
   chirality test was upgraded from sign-*consistency* to requiring the
   **positive** sign.
6. Cosmetic, by request: Roman corner numerals are set in a serif face
   (Georgia/Times) so I/II/III read at a glance.

## Verification

- `npm run build` ✅ (the only CI check).
- `scripts/trail-chirality.mjs` ✅ strict PASS on torus / klein / crosscap3 /
  rp2: the freshest print renders right-handed in the character's frame on
  BOTH faces (run `npm run preview` first; screenshots land in `/tmp/trail`).
- Glide-crossing smoothness: pixel-diffed consecutive frames across a Klein
  crossing — the crossing pair (22.5 mean diff) sits inside the ordinary
  walking-pair range (6.9–28.5).
- Hyperbolic persistence: a long crosscap3 walk (several polygon crossings)
  keeps the full trail visible across tiles, look-back included.
- Visual spot-checks shared with the user: under-glass reversed F on Klein;
  upright plaques on the mirror side; serif "III" disc; trail copies tiling
  across seams and hyperbolic tiles.

## Key files

| File | Role |
|---|---|
| [`inkTrail.ts`](https://github.com/piyarsquare/animath/blob/5e94d33/src/animations/PolygonWorlds/inkTrail.ts) | The shared mechanism: glyph texture, quad buffer (`setQuad` from an explicit frame), ring-buffer ops, and the end-to-end `chirality(slot, M, fwd, up)` probe. |
| [`presenters/euclidean.ts`](https://github.com/piyarsquare/animath/blob/5e94d33/src/animations/PolygonWorlds/presenters/euclidean.ts) | Sheet-coordinate stamps; π-rotation glide cells (`makeRotationAxis(glideDir, π)`); pure-translation fold; chart pull-back; rigid bottom decor. |
| [`presenters/spherical.ts`](https://github.com/piyarsquare/animath/blob/5e94d33/src/animations/PolygonWorlds/presenters/spherical.ts) | World-coordinate stamps + antipodal twin mesh (the original "looks right" reference, minus flags). |
| [`presenters/hyperbolic.ts`](https://github.com/piyarsquare/animath/blob/5e94d33/src/animations/PolygonWorlds/presenters/hyperbolic.ts) | Domain-canonical stamp triples; per-frame re-projection through the nearest-16 tiles; `freshSlot` probe; −π/2 left-point pull-back. |
| [`decor.ts`](https://github.com/piyarsquare/animath/blob/5e94d33/src/animations/PolygonWorlds/decor.ts) | `numeralTexture(text, color, serif)` — serif Roman plates; updated chirality-story comments. |
| [`scripts/trail-chirality.mjs`](https://github.com/piyarsquare/animath/blob/5e94d33/scripts/trail-chirality.mjs) | The regression guard, now requiring the **positive** sign on both faces (consistency alone masked the projection-handedness bug). |
| [`coverModel.ts`](https://github.com/piyarsquare/animath/blob/5e94d33/src/animations/PolygonWorlds/coverModel.ts) / [`engineTypes.ts`](https://github.com/piyarsquare/animath/blob/5e94d33/src/animations/PolygonWorlds/engineTypes.ts) | `debugProbe()` semantics updated (freshest print, as rendered). |
| [`EXPLAINER.md`](https://github.com/piyarsquare/animath/blob/5e94d33/src/animations/PolygonWorlds/EXPLAINER.md) | The user-facing framing: "you never become mirrored; you are looking at the back of your own ink." |

Session commits, oldest first: `dfe59e3` (ink-on-the-sheet rebuild) →
`945a2d4` (true glide deck; head arrow removed) → `1f2fac8` (pure-translation
fold; rigid bottom decor) → `5e94d33` (canonical hyperbolic stamps; serif
numerals).

## Open / not done

- **Next session's likely topic — "show" negative curvature without hyperbolic
  distances.** The user asked; no rendering can be distance-faithful (Gauss;
  Hilbert's theorem rules out any global isometric embedding of ℍ² in ℝ³), but
  curvature can be shown through non-distance signatures. Options proposed to
  the user, ranked: **(1) holonomy square** — auto-walk four equal legs with
  four right-angle turns and highlight that the footprint quadrilateral fails
  to close by κ·area (uses the trail as the instrument; recommended), **(2)**
  paint the eight genuine 45° corner wedges at each vertex / geodesic-triangle
  angle sums, **(3)** exponential tile-count growth within k crossings,
  **(4)** alternate projections (Klein model: straight geodesics; azimuthal
  equidistant: true radial distances; first-person geodesic ray-casting),
  **(5)** a genus-2 embedding inset à la the ℝP² Roman surface. **Await the
  user's pick before building.**
- **Parked pre-existing bug (from S05):** the third-person camera backs into
  decor and the camera-mounted headlamp blows a tree cone to white at
  point-blank range. Fix by fading/culling decor near the camera or clamping
  the headlamp range.
- Minor accepted behaviours: flat-world trail restarts when the square size
  changes (the lattice rescales under the ink — deliberate); hyperbolic trail
  copies at the 16th-nearest-tile boundary can swap at far horizon distances
  (sub-decal-size; same behaviour as decor).

## Context

- **The invariant to protect** (and what the test enforces): a print laid on
  the player's current face must render right-handed under them on BOTH faces;
  mirror-reading is only ever produced by a genuine det<0 *render* transform —
  never by flags, per-side rebuilds, or in-place re-mirroring. "Stamping is a
  world-space act": the stamp is the world print pulled back through the WHOLE
  render transform (home-cell matrix / `h⁻¹` / projection handedness included).
- **Load-bearing geometric facts** that are easy to re-break:
  - Toggling `flipAcc` ≡ shifting the scene by one glide step ⇒ the euclidean
    fold must remain a *pure translation* (reflecting the player double-applies
    the mirror — that was the "not smooth" bug).
  - The disk projection is orientation-reversing under the fixed camera, hence
    the −π/2 ("kernel-right") left-point in the hyperbolic stamp.
  - Decor that "grows down" must be *rigidly rotated*, never `scale.y = −1` —
    a baked reflection resurfaces the moment the deck transform is rigid.
  - Hyperbolic stamps must stay domain-canonical; anything carried with the
    fold recedes like cosh(distance) and falls out of reach of the near-identity
    tile transforms.
- **Headless testing:** drive the app via the `?polydebug` bridge
  (`window.__poly`: `map`/`probe`/`setYaw`); SwiftShader runs ~7× slower than
  real time (the rAF `dt` is clamped at 50 ms), so budget walk times
  accordingly — a Klein glide crossing takes ~30 s headless. The pixel-diff
  smoothness check (compare the crossing frame-pair against ordinary
  walking-pair diffs) is a good template; it lived in a temp script this
  session — recreate from the progress notes if needed.
- Per-frame costs are bounded: euclidean rewrites at most one quad per freeze;
  hyperbolic rebuilds ≤ `TRAIL_MAX(360) × N_DECOR(16)` quads per frame (the
  buffer capacity exactly).
- `npm run verify` (kernel invariants) was not touched and not run this
  session; the kernel itself is unchanged.

## Self-reflection

1. **What would you do with another session?** Build the holonomy-square
   demonstration (pending the user's pick) — the trail is now exactly the right
   instrument for it — and fix the parked camera/headlamp bug.
2. **What would you change about what you produced?** I shipped the
   over-reflecting fold and only caught it when the user *felt* the jump: my
   screenshots verified frames seconds after the crossing, never the crossing
   instant. The pixel-diff frame-pair check exists now because of that miss —
   it should have existed before the first push.
3. **What were you not asked that's important?** Whether the *decor* (not just
   the trail) obeyed the chirality story — the baked `scale.y = −1` mirror was
   invisible until the deck became rigid, and the user found it before I did.
4. **What did we both overlook?** That the original `chart()` mirror and the
   pure-translation fold were *correct* — S06 first "fixed" working code
   (deleting the `sz0` pull-back, reflecting the fold) because the old model's
   self-consistency made the genuinely-missing in-plane reflection look like it
   could live anywhere. The lesson recorded in the notes: locate a symmetry
   before moving it.
5. **What did you find difficult?** Reasoning about *which* composition of
   transforms is "the deck action" — three plausible-looking conventions (face
   swap, in-plane glide, transparency flip) are each self-consistent quotients;
   only the rigid transparency flip matches the physical sheet story AND the
   classic square diagram AND smooth transport simultaneously.
6. **What would have made this task easier?** A frame-continuity assertion in
   the test harness from day one (the chirality probe checks orientation, not
   continuity — green probes happily coexisted with a teleporting world).
7. **Follow-up value: MEDIUM** — the trail work is complete and user-approved;
   the value ahead is the curvature-demonstration decision (options await the
   user) and the parked camera bug, both well-scoped.
