---
kind: handoff
session: 2026-06-10-S01
date: 2026-06-11
title: Polygon Worlds — orientation fixed end-to-end; sign instrument; hexagonal worlds; chart roadmap
branch: claude/polygon-sign-orientation-50exno
slug: polygon-sign-orientation-50exno
status: completed
build: passed
followup: medium
pr: null
app: polygon-worlds
---

# Polygon Worlds — orientation fixed end-to-end; sign instrument; hexagonal worlds; chart roadmap

## Summary

A two-day session in four acts. (1) A three-hats review of the
sign-through-the-floor question settled the doctrine — *a sign viewed through
the floor is reflected, never merely rotated 180°* — and adjudicated two
residual geometry bugs, both fixed red-first→green: the ℝP² ink twin was on
the wrong bundle (−Id, the untwisted one) and the hyperbolic under-floor
decor used a baked `scale.y=−1` mirror. (2) A user-authored **two-sided glass
sign** (Plant a sign panel) now exists in all three presenters as the
teaching instrument for the question. (3) The euclidean presenter was
generalized from "the square" to "the kernel's realized polygon", adding the
**hexagonal torus** and **hexagonal Klein bottle**; the guard now walks 8
worlds, all green. (4) Two discussions produced the roadmap below: zip words
(= cut-trees on the sphere; cone-point orbifolds elsewhere) and the ℝP²
inside↔outside reversal (= the mirror bit seen extrinsically). Build passes;
everything is pushed.

## What changed

- **Doctrine + law** (now in `inkTrail.ts`'s header): every deck transform of
  the thickened sheet is a PROPER motion of 3-space; orientation reversal
  exists only as its restriction to the 2D sheet; mirror-reading only ever
  appears through the glass. Pedagogy's correction adopted over the lead's
  brief: the face-swapping shell deck is det **+1** in 3D, so far-side ℝP²
  decor and above-floor hyperbolic decor are correctly **un-mirrored**.
- **Fix 1 — ℝP² ink twin**: `twinM4 · scale(s)`, `s=(R−INK_LIFT)/(R+INK_LIFT)`
  — mirror ink now hangs *below* the glass (29.880 < 30.000), not in open air.
- **Fix 2 — hyperbolic under-floor decor**: rigid turn-over
  (`rotation.set(π,0,0)` + uniform scale) replaces `scale(sc,−sc,sc)`
  (red run: 1136/2281 and 1232/2473 improper meshes on crosscap3/genus2 → 0).
- **Guards**: `__poly.auditDecor()` (every visible non-ink mesh det>0) and
  `__poly.auditInk()` (mirror ink strictly below the shell);
  `scripts/trail-chirality.mjs` walks 8 worlds, plants a sign in each, exits
  nonzero on failure.
- **Sign instrument** (`sign.ts` + per-presenter): user text front (amber) /
  back (cyan) on a glass plaque; DoubleSide ink ⇒ mirror-reading by geometry
  alone; placement is stamp-like (pulled back through the whole render
  transform) but always realized det>0 — euclidean sheet-pose per cell,
  spherical rigid frame + proper antipodal twin, hyperbolic canonical triple
  whose projected handedness picks the face.
- **Hexagonal worlds**: euclidean presenter is polygon-general (extruded
  realized m-gon slab, radial corner markers, decor in the inscribed square —
  square worlds pixel-identical); `torus6` (`a b c a⁻¹ b⁻¹ c⁻¹`, honeycomb)
  and `klein6` (`a a b c c b⁻¹`, one of 288 smooth words found by
  `scripts/probe-trivial-words.ts`). No smooth flat octagon exists (135°∤360°).
- **Prose**: EXPLAINER "Through the glass" section (answers the headline
  question; sign-first), glide-tile claims corrected, "mirror side" → "other
  face", dead `otherSide.ts` deleted, one-line law installed.

## Key files

| File | Role |
|---|---|
| [`presenters/euclidean.ts`](https://github.com/piyarsquare/animath/blob/8d92ad6/src/animations/PolygonWorlds/presenters/euclidean.ts) | Polygon-general flat presenter (realized m-gon slab, `span`/`cornerWorld`, Dirichlet chart rep, sheet-pose signs). |
| [`presenters/spherical.ts`](https://github.com/piyarsquare/animath/blob/8d92ad6/src/animations/PolygonWorlds/presenters/spherical.ts) | Twin fix (`placeTwin`), `auditInk`, sign + proper antipodal twin. Still square-charted (`sq2hemi`/`fullDir`, 4 corners) — the next seam. |
| [`presenters/hyperbolic.ts`](https://github.com/piyarsquare/animath/blob/8d92ad6/src/animations/PolygonWorlds/presenters/hyperbolic.ts) | Rigid under-floor turn-over in `placeDecor`; sign triples projected per tile. |
| [`sign.ts`](https://github.com/piyarsquare/animath/blob/8d92ad6/src/animations/PolygonWorlds/sign.ts) | The two-sided glass sign builder (NOT tagged `userData.ink` — signs are guarded by the decor audit, never exempt). |
| [`worldSpec.ts`](https://github.com/piyarsquare/animath/blob/8d92ad6/src/animations/PolygonWorlds/worldSpec.ts) | +`torus6`, +`klein6`. |
| [`scripts/trail-chirality.mjs`](https://github.com/piyarsquare/animath/blob/8d92ad6/scripts/trail-chirality.mjs) | The 8-world guard: A/B chirality + decor audit + twin radius + planted signs. |
| [`scripts/probe-trivial-words.ts`](https://github.com/piyarsquare/animath/blob/8d92ad6/scripts/probe-trivial-words.ts) | Word brute-forcer: smoothness = equal corner classes; the n-gon catalog derivation. |
| [`scripts/sign-shots.mjs`](https://github.com/piyarsquare/animath/blob/8d92ad6/scripts/sign-shots.mjs) | Headless sign captures (front/back/flip-side). |
| Expert reports + synthesis | `docs/sessions/progress/polygon-sign-orientation-50exno/2026-06-10-S01-expert-{maintainer,consultant,pedagogy,synthesis}.md` — the adjudication record. |

## Open / not done — the improvement roadmap

**A. The remaining "trivial" n-gon worlds (spherical half; next session's
natural target).** The kernel already realizes all of them; the work is the
spherical presenter's square-chart seam (`sq2hemi`/`fullDir`,
`CHART_CORNERS=4`, `rp2Square` minimap inverse):

1. **Hex/oct ℝP²** (`a b c a b c`, `a b c d a b c d`) — *smooth* hemispheres
   (R=π/2, corner classes all 2): generalize `sq2hemi` → `ngon2hemi` (equator
   divided into 2n antipodally-identified arcs) + n corner markers + the
   word-driven minimap (already automatic via `spec.edges` absence).
2. **Hex/oct zip spheres** (`a a⁻¹ b b⁻¹ c c⁻¹ (d d⁻¹)`) — build the chart
   from its **cut-tree**: a zip word is the sphere cut open along a tree (zip
   pair = tree edge, lone corner = leaf, big corner class = hub). Choose the
   tree on the round sphere (e.g. three meridian arcs from the pole), invert
   it for the chart, dedupe the hub's corner markers (they are one point),
   disclose distortion near leaves/hub. Note: this would be *more*
   word-faithful than the existing square sphere, whose lon/lat chart doesn't
   realize its own pillowcase word's seams — consider fixing the square too.

**B. Orbifold worlds — the way to show every *other* chart.** Zip words in
flat/hyperbolic words are blocked fundamentally: a zip's side-pairing is a
rotation about the shared corner (elliptic, fixed point), and lone corner
classes are genuine **cone points** — the equal-corner-class condition the
flat worlds enforce is exactly no-cones. Supporting them means orbifold
rendering: tile *fans* around elliptic fixed points, folds that use
rotations, visible cone-point markers, transport with deficit angles. Big,
separate feature — but the payoff is curvature you can stand next to
(Gauss–Bonnet with atoms: deficits sum to 2πχ), which directly serves the
open curvature-demonstration question.

**C. ℝP² "inside walk" (from the closing discussion).** The seam crossing
reverses inside↔outside *necessarily*: (intrinsic orientation) × (normal) ×
(ambient orientation) is conserved, so the orientation-reversing loop flips
the normal — mirror and inside-out are the same ℤ/2. In the shell model the
deck `(x,t)↦(−x,−t)` exchanges outer and inner boundary spheres: the quotient
has ONE face (thickened ℝP² = ℝP³ minus a ball; the two-sided shell IS the
orientation double cover). Feature: let the crossing physically continue onto
the inner face (camera inside the hollow planet, old outside-ink overhead
through the glass), re-emerging on the second crossing — the old
`otherSide.ts` normal-flip roadmap item, now with correct geometry.

**D. Curvature demonstrations (open since S06, user pick pending):**
holonomy square (auto-walk, footprint quadrilateral fails to close by
κ·area — recommended), vertex-plate holonomy ring (pairs with item E1),
cone-point orbifolds (item B) as the third candidate.

**E. Fidelity polish:** (1) hyperbolic decor azimuth equivariance (decor
attitude ignores the deck's rotational part — chirality-safe, but the vertex
ring would *show* the rotational holonomy); (2) klein6 glide-crossing
smoothness pixel-diff (the S06 recipe lived in a temp script — recreate);
(3) sign text inputs aren't persisted (deliberate? decide).

**F. Hygiene elsewhere:** TopologyWalk still uses its own `otherSide.ts` and
the old engines — likely carries the same baked-mirror bug class, never
audited; the parked S05 camera/headlamp bug; British spellings in
`lib/develop.ts`, `polygonMap.ts`.

## Context

> [!IMPORTANT]
> **The one-line law** (in `inkTrail.ts`, enforced by the guard): deck
> transforms of the thickened sheet are PROPER in 3D; orientation reversal
> exists only as their restriction to the 2D sheet; mirror-reading only ever
> appears through the glass. Corollaries that look like bugs but aren't:
> far-side ℝP² decor and above-floor glide-tile decor read **un-mirrored**;
> walking-face text is never backwards.

> [!CAUTION]
> Sign ink planes are deliberately NOT tagged `userData.ink` — the tag
> *exempts* meshes from `auditDecor`, and signs (unlike the trail) are never
> legitimately drawn through det<0. A well-meaning "tag it like the trail"
> would disarm the guard for exactly the meshes it must protect.

- Run the guard: `npm run build && (npm run preview &) && node
  scripts/trail-chirality.mjs` (8 worlds ≈ 10 min under SwiftShader;
  screenshots in `/tmp/trail`). It plants a sign per world; exit code 1 on
  any failure. `npm run verify` (kernel) untouched and still green.
- The smoothness criterion for flat n-gon worlds: **equal corner classes**
  (each class's regular-polygon angles sum to 2π). `probe-trivial-words.ts`
  recomputes the catalog; hexagon: 48 torus + 288 Klein smooth words; octagon:
  none (135°∤360°).
- klein6's glides are on *adjacent* edges (`a a b c c b⁻¹`) — no
  opposite-glide hexagonal Klein exists (those words are all Dyck). The
  linear-lattice + parity-flip model verified green for it, but see E2.
- The three-hats process note: the lead's pre-review brief seeded two wrong
  fixes; the pedagogy hat (briefed as mathematical authority, asked to
  refute) caught both. Hand candidate findings to experts as open questions
  with the opposing case stated.

## Self-reflection

1. **What would you do with another session?** Implement roadmap item A (the
   four spherical n-gon worlds) — the kernel is ready, the seam is identified,
   and it completes the user's "trivial versions" request. Then the ℝP²
   inside walk (C), which is small relative to its payoff.
2. **What would you change about what you produced?** The hexagonal worlds
   shipped without the glide-crossing smoothness check (E2) — the chirality
   probe is necessary but not sufficient, and S06 already taught this exact
   lesson; the pixel-diff should have run before pushing klein6.
3. **What were you not asked that you think is important?** Whether
   TopologyWalk (the sibling walker app) violates the same orientation law —
   its `otherSide.ts` narrates the abandoned mechanism and nobody has audited
   it (F).
4. **What did we both overlook?** The square sphere's lon/lat chart doesn't
   realize its own pillowcase word — discovered only while reasoning about
   zip charts. The app's oldest world is its least word-faithful.
5. **What did you find difficult?** Adjudicating the three-hats tension on
   ℝP²: three self-consistent models differing only in which bundle the shell
   realizes; only the determinant computation of the face-swapping deck's
   differential settled it.
6. **What would have made this task easier?** The decor/ink audit hooks from
   the start — every geometry claim this session was settled in minutes once
   the guard could see decor; before that, only walking and squinting.
7. **Follow-up value:** MEDIUM — the orientation work is complete and
   guarded; the value ahead is the well-scoped spherical n-gon worlds, the
   inside-walk, and the orbifold/curvature direction, all awaiting the
   user's prioritization.
