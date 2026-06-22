---
kind: progress
session: 2026-06-07-S02
date: 2026-06-07
title: Polygon Worlds — unified fundamental-polygon app (Phase 1)
branch: claude/klein-bottle-fix
slug: klein-bottle-fix
status: completed
build: passing
followup: null
pr: 186
---

# Polygon Worlds — unified fundamental-polygon app (Phase 1)

## Session purpose

A deeper unification than S01's presentation pass: build the **single unified view** the user described — ONE decorated fundamental square (trees on one face, columns on the other) whose *edge-gluing knob* selects among four worlds (torus / Klein / ℝP² / sphere), with curvature *forced* by the topology. Decided (with the user) to build this as a **new app** ("Polygon Worlds", `#/polygon-worlds`), reusing the shared lib, leaving TopologyWalk untouched.

## Design decisions (user-confirmed)

- **New app**, not a TopologyWalk patch; vendors copies of character/footprints/glassSurface/otherSide/squareMap so TopologyWalk stays byte-for-byte.
- **One facade + two cover models** (the honest verdict): the universal cover genuinely changes type (Euclidean plane for χ=0, sphere for χ>0), so the cover stays an explicit `CoverModel` seam — which also keeps the Phase-2 morph expressible ("interpolate between covers").
- **Sphere = adjacent fold** (pillowcase); the other three are opposite-edge straight/flip.
- **Static engine first**; the choreographed gluing+curvature **morph is Phase 2** (architected for, not built).
- Third-person default ON; one square mini-map for all four.

## Working notes

### 🟡 milestone · — — All four worlds live — spherical cover added
**Why:** complete Phase 1 (the static unified engine across all four gluings).

Refactored to the honest architecture: **one thin facade + two cover models**. Each cover now owns its own world-rendering + trail (Euclidean: floor slab + tiled cells; spherical: planet + decor charted onto the two hemispheres + seam great circle + antipodal twin for ℝP²); the facade owns only lights, the avatar, and orchestration. New `sphericalCover.ts` (great-circle walk, `sq2hemi` square→hemisphere chart, `rp2Square` mini-map chart, planet glass, radius knob). All four worlds + the per-world controls (square-size/thickness for flat, planet-radius for curved) screenshot- verified in headless WebGL. Sphere & ℝP² share the square mini-map, as requested. Build green.

### 🟢 code · — — Floor slab + tunable square size / floor thickness
**Why:** the thin floor blended into the void.

Glass floor is now a coloured, lit Box slab (brighter ground + grid), with live "Square size" and "Floor thickness" knobs routed through the engine + cover seam.

### 🟡 milestone · — — Euclidean vertical slice live + screenshot-verified
**Why:** de-risk the new architecture end-to-end before writing the spherical cover.

New app builds (`npm run build` ✓) and renders in headless software-WebGL. Drove it: **Klein** (red-flip square mini-map, columns⇄trees parity, chiral footprint, glass underside) and **torus** (teal-straight mini-map, columns everywhere, opposite-skin underside). The full pipeline `worldSpec → deriveGeometry → euclideanCover → fundamentalSquareEngine → drawSquareMap` works; third-person is default.

### 🟢 code · — — Scaffolded the new app + Phase-1 modules
**Why:** establish the knob model + cover seam.

New files: `worldSpec.ts` (the 4 gluings + `deriveGeometry`, geometry forced from χ), `coverModel.ts` (the seam interface), `euclideanCover.ts` (flat-plane cover, distilled from flatEngine), `decor.ts` (shared numbered trees/columns, authored in unit-square uv), `fundamentalSquareEngine.ts` (facade: decor copies, glass floor + mirrored underside, trail, avatar, frame loop), `engineTypes.ts`, `PolygonWorlds.tsx` (host), `EXPLAINER.md`. Registered in apps.ts + index.tsx (append-only). Vendored 5 shared-lib files.

## Next (remaining Phase 1)

1. `sphericalCover.ts` — port sphericalEngine's great-circle walk; wire ℝP² (antipodal) + sphere into the facade (planet, not floor).
2. Sphere **adjacent-fold** placement of the shared decor on the two hemispheres (riskiest; fallback = sign(z) split).
3. Extend `squareMap.ts` to per-edge specs so the sphere's adjacent arrows draw; light up all four worlds in the selector.
4. Glass = plane (euclidean) vs planet (spherical): a small per-cover GlassSurface; re-add per-cell colour + avatar projection if wanted.

> [!NOTE]
> **Phase 2** The animated gluing+curvature morph between worlds — expressible because the `CoverModel` boundary is explicit. Not started.
