---
kind: handoff
session: 2026-06-14-S01
date: 2026-06-14
title: Polygon Worlds — spherical n-gon worlds (ℝP² + zip spheres) and guard hardening
branch: claude/polygon-walk-continue-4tyht3
slug: polygon-walk-continue-4tyht3
status: completed
build: passed
followup: null
pr: null
app: polygon-worlds
---

# Polygon Worlds — spherical n-gon worlds (ℝP² + zip spheres) and guard hardening

## Summary

Continued the Polygon Worlds spherical track. Shipped the **complete roadmap-A set**:
four new worlds — hexagonal/octagonal **projective planes** (A1) and
hexagonal/octagonal **zip spheres** (A2) — plus a fix to the chirality guard that
was producing intermittent **false failures**. Everything is committed and pushed to
`claude/polygon-walk-continue-4tyht3`; `npm run build` and `npm run lint` are green,
and the full 12-world chirality guard passes **reliably**. This branch targets `main`
but has **no PR yet** and has not been synced with `main` (see Open / not done).

## What changed

Four commits this session (newest last):

- **`d9482bc` A1 — hex/oct projective planes** (`a b c a b c`, `a b c d a b c d`).
  Smooth spherical hemispheres + antipodal deck, charted through a **new
  polygon-gauge map** `ngon2hemi`/`hemi2ngon` (a regular m-gon ↦ hemisphere,
  azimuthal-equidistant in the gauge radius) instead of the square's `sq2hemi`. The
  realize() polygon's m vertices land on the equator. All square-specific code in the
  spherical presenter now branches on an `nGon` flag.

- **`1685416` A2 — hex/oct zip spheres** (`a a⁻¹ b b⁻¹ c c⁻¹`, `…d d⁻¹`). A kernel
  probe established the structure: corner classes are **one hub** (all even polygon
  vertices) **+ n leaves** (the odd vertices), orientable, `chart:true`. So each is
  the *same round sphere* as the pillowcase sphere, cut along a **star tree** (hub +
  one spoke per `x x⁻¹` fold). Because they're orientable round spheres, the walk
  (kernel Frame) and decor (`fullDir`) reuse the round-sphere path **unchanged**; the
  only new geometry is a `zip = !antipodal && !spec.edges` branch that draws **n seams
  as rows of stitches** (short bars crossing the hub→equator-leaf geodesic, alternately
  slanted — sutures closing the cut; one `InstancedMesh` per world, density tracks arc
  length) and places 1 hub + n leaf corner markers. (Initially drawn as solid tubes;
  restyled to stitches at the user's request — commit `72836a0`.)

- **`f59f1cc` Guard hardening.** The earlier full-guard run flagged `klein6`
  `B=cyan@−axis` — but two clean re-runs of klein6 alone both passed. **Root cause:**
  trail prints lay only every ~0.12–1.6 units, so the *freshest* print right after
  crossing to the flipped face can still be the **pre-crossing** stamp (laid on face
  A), which reads mirrored in the flipped frame → a false negative; the old gate
  ("sign stable for 3 reads") didn't prove the stamp was laid on the flip side. Fix:
  exposed the existing `clearTrail` on the `__poly` debug bridge; the guard now
  **wipes the trail on crossing** and accepts the **first stamp laid while still
  flipped** (guaranteed genuine), re-confirming the face at read time.

Supporting edits: `worldSpec.ts` (4 world specs + id union), `immersions.ts` (zip ids
→ round-sphere immersion; rp2hex/oct → hemisphere immersion), `EXPLAINER.md` (ℝP²
n-gon + zip-sphere bullets), `trail-chirality.mjs` (4 new worlds added as controls).

Verification: build + lint green; a temporary scene probe confirmed the seam tubes
render (`TubeGeometry: 3` hex, `4` oct) and was then removed; the full 12-world guard
is all green (every flip-side world passes on **both** faces, every orientable control
passes, **all decor 0 improper**, twin mirror-ink below the glass on all three twin
worlds).

## Key files

| File | Role |
|---|---|
| [`presenters/spherical.ts:116`](https://github.com/piyarsquare/animath/blob/f59f1cc/src/animations/PolygonWorlds/presenters/spherical.ts#L116) | `zip` detection; the zip branch (seams + hub/leaf markers) lives below |
| [`presenters/spherical.ts`](https://github.com/piyarsquare/animath/blob/72836a0/src/animations/PolygonWorlds/presenters/spherical.ts) | `stitchMatrices()` + `rebuildZipSeams()` — the seam stitches (InstancedMesh), rebuilt with the shell radius |
| [`presenters/spherical.ts:176`](https://github.com/piyarsquare/animath/blob/f59f1cc/src/animations/PolygonWorlds/presenters/spherical.ts#L176) | `cornerPlacements()` zip branch — 1 hub (north pole) + n leaf markers |
| [`squareMap.ts:111`](https://github.com/piyarsquare/animath/blob/f59f1cc/src/animations/PolygonWorlds/squareMap.ts#L111) | `ngon2hemi` / `hemi2ngon` — the A1 polygon-gauge hemisphere chart |
| [`worldSpec.ts:165`](https://github.com/piyarsquare/animath/blob/f59f1cc/src/animations/PolygonWorlds/worldSpec.ts#L165) | the 4 new world specs (rp2hex/oct, zipsphere6/8) + id union at L48 |
| [`instruments/immersions.ts:199`](https://github.com/piyarsquare/animath/blob/f59f1cc/src/animations/PolygonWorlds/instruments/immersions.ts#L199) | zip ids → round-sphere immersion (rp2hex/oct at L183) |
| [`PolygonWorlds.tsx:100`](https://github.com/piyarsquare/animath/blob/f59f1cc/src/animations/PolygonWorlds/PolygonWorlds.tsx#L100) | `clearTrail` exposed on the `__poly` debug bridge |
| [`scripts/trail-chirality.mjs:115`](https://github.com/piyarsquare/animath/blob/f59f1cc/scripts/trail-chirality.mjs#L115) | hardened flip-side read (wipe trail, accept first fresh flip-side stamp) |

## Open / not done

- **No PR / not synced with `main`.** If this branch goes to a PR, do the prescribed
  `git fetch && git merge origin/main`, keep every app's entries in the append-only
  shared files, and re-run `npm run build` (per CLAUDE.md / BUILDING_AN_APP.md §8).
- **Zip-sphere minimap marker is approximate.** The 2n-gon minimap (word-driven) is
  the abstract gluing diagram; the player marker still uses the existing rp2Square
  chart (same bar as the existing round `sphere`). A *faithful* zip-chart marker —
  and an optional matching custom minimap (azimuthal disk with n seam-spokes) — is
  future work. The 3D seams are the faithful payload and are correct.
- **Optional: give the existing square `sphere` the same visible seams.** It is the
  same star-tree structure (2 folds) but currently draws no seams. Low-risk, would
  unify the family; deferred to avoid changing a shipped world this session.
- **Roadmap B/C/D remain** (orbifold worlds; "inside" ℝP² walk; curvature/Gauss–Bonnet
  readout) — all substantial new directions awaiting a steer. The user chose to wrap
  up after A1+A2 rather than start one.
- **Guard-robustness nicety:** the flip-side dwell is now correct but still
  time-boxed; a print-count signal through the engine would be the most rigorous
  version (not needed — `clearTrail` suffices).

## Context

- **The chirality guard is the safety net.** `scripts/trail-chirality.mjs` walks each
  world headless (requires `?polydebug` + a running `npm run preview` on :4173), reads
  the exact geometry probe (the signed side of the freshest footprint in the player's
  frame) on both faces, and audits that every decor mesh is placed by a proper (det>0)
  transform. Orientable worlds are A-only controls (never reach a flipped face);
  non-orientable worlds must read correct on **both** faces. Run focused subsets by
  `sed`-injecting a `WORLDS` slice (examples are in the progress report).
- **Zip spheres are orientable**, so the guard only A-controls them — chart
  faithfulness (seam placement) is **not** machine-checked. It was verified by a
  one-off scene probe + screenshots; the seam math (n great-circle arcs from the north
  pole to n equator leaves 360°/n apart) is simple and deterministic.
- The seam screenshot in the progress report used a **temporary north-pole spawn**
  purely for framing (the shipped spawn sits far from the hub, which is why the seams
  are hard to catch on camera). The seam *geometry* shown is the shipped code; the
  spawn hack was reverted.
- Build is the only CI gate; `npm test` and `npm run lint` are green-by-convention
  (lint baseline is 60 warnings — don't add new ones).

## Self-reflection

1. **What would you do with another session?** Build the *faithful* zip-sphere
   minimap (azimuthal disk with n seam-spokes) so the 2D map and 3D seams share one
   chart, and add the visible seams to the existing square `sphere` to unify the
   family. Then pick up roadmap C (inside ℝP² walk) — it's the smallest payoff-per-
   effort of the remaining items and lives in the spherical presenter I now know well.
2. **What would you change about what you produced?** The zip seams' visual prominence
   was tuned by eye (radius 0.3, lifted 0.18, brighter material) without a headless
   check of how they read at the default spawn/camera — a user landing on the world
   may not immediately see a seam. A "spawn facing the nearest seam" tweak, or a faint
   hub beacon, would make the headline feature land on first view.
3. **What were you not asked that you think is important?** Whether the four new worlds
   should appear in the gallery/registry ordering or get preview cards — I only wired
   them into the Polygon Worlds dropdown; I did not touch `apps.ts`/`catalog.ts`
   (Polygon Worlds is a single app, so this is correct, but worth confirming the new
   worlds are discoverable enough).
4. **What did we both overlook?** Nothing surfaced as wrong, but the zip-sphere
   *chart faithfulness* has no automated guard (orientable ⇒ the chirality probe is an
   A-only control). The whole project's lesson is "even a plausible-looking sphere
   chart can be silently wrong"; a zip-specific assertion (e.g. the n seam arcs are
   geodesics meeting at one hub point) would close that gap.
5. **What did you find difficult?** Getting a *visual* of the seams: the character
   spawns far from the hub and the third-person camera centers on the character, so
   the pole-region seams stayed out of frame across many capture attempts. The scene
   geometry probe (counting `TubeGeometry`) was what actually settled "do they render"
   — the screenshots only confirmed placement once I forced a pole spawn.
6. **What would have made this task easier?** A debug bridge hook to teleport the
   player to a named point (hub / a leaf / antipode) would have made both the seam
   screenshots and any future chart verification far quicker than walking there.
7. **Follow-up value:** LOW — A1+A2 are shipped, built, linted, and pass the full
   reliable guard; the open items are polish (faithful minimap marker, seam
   discoverability) and new roadmap directions, none of which cast doubt on what
   shipped.
