---
kind: handoff
session: 2026-06-08-S01
date: 2026-06-08
title: Polygon Worlds — P2 spherical presenter on the kernel + ℝP² embedding inset
branch: claude/polygon-worlds-spherical-p2-qgExR
slug: polygon-worlds-spherical-p2-qgExR
status: completed
build: passed
followup: medium
pr: null
app: PolygonWorlds
---

# Polygon Worlds — P2 spherical presenter on the kernel + ℝP² embedding inset

> [!IMPORTANT]
> **P2 is done.** The positive worlds (ℝP², sphere) now render through the frozen
> Cayley–Klein kernel; `sphericalCover` is retired; the chart distortion is
> disclosed; the ℝP² extrinsic embedding inset ships. **Next session is P3
> (Hyperbolic).** Plan: [`docs/polygon-worlds-plan.md`](../../../polygon-worlds-plan.md).

## Summary

This session executed the build plan's **P2 (Spherical)** on branch
`claude/polygon-worlds-spherical-p2-qgExR` (fast-forwarded onto the P1 foundation
`claude/polygon-worlds-geometry-oe2iM` / PR #190 — the task branch had been cut from
`main`). It built `presenters/spherical.ts`, which renders ℝP² and the sphere from
the kernel: at κ=+1 the model shell *is* the unit sphere, so the player is a kernel
`Frame` and the ℝP² antipodal twin + trees↔columns skin-swap fall out of the
`develop()` deck group (`det<0`) rather than hard-coded transforms. Both worlds were
screenshot-matched against the old `sphericalCover`, which was then retired. The
explainer now discloses that the sphere's square is a *chart* (distances distort)
while ℝP² is a genuine isometric hemisphere. Finally it shipped the **extrinsic
embedding inset** with the first non-orientable surface: an ℝP² Steiner Roman
surface, procedurally generated, with the player's marker riding the immersion.

## What changed

- **P2 core — spherical presenter** (`7bd86c9`). `presenters/spherical.ts` (copy of
  the P1 Euclidean pattern + the sphere chrome). Player pose = a kernel `Frame`
  (κ=1); world = `framePos·R`; movement via `stepForward`/`turn`/`stepHeading` in
  model arc length (world distance ÷ R). `realize()` returns **isometric hemisphere
  + Z/2 antipodal deck for ℝP²** (the `det<0` deck element from `develop()` drives
  the skin-swap on z<0 and the mirror trail twin) and a **chart over the whole shell
  for the sphere** (`real.chart`). Facade switched to it; `sphericalCover.ts`
  deleted. Initial frame pinned to the old start pose so framing matches.
- **Chart disclosure** (`7bd86c9`). `EXPLAINER.md` gains an honest "the curved worlds
  are genuinely round" section: ℝP² is isometric (no cone points), the sphere is a
  distorting chart, intrinsic measurements read the true round-sphere metric.
- **ℝP² embedding inset** (`2255327`). `instruments/embeddingInset.tsx` renders the
  **Steiner Roman surface** — the quadratic map `(a,b,c)↦(ab,bc,ca)` on S², which
  factors through ℝP² (antipodes share an image). Self-contained renderer; player
  marker read from the existing mini-map chart (`sq2hemi`, moved to `squareMap.ts`);
  the marker lands on the same Roman point from either sheet (the `x∼−x` gluing as
  one dot). Shown only for ℝP².
- **Tooling.** `scripts/shoot-pw.mjs` — a per-world screenshot driver that sets the
  Gluing `<select>` (the always-mounted drawer makes it queryable even when closed).

## Key files

| File | Role |
|---|---|
| [`presenters/spherical.ts`](https://github.com/piyarsquare/animath/blob/2255327/src/animations/PolygonWorlds/presenters/spherical.ts) | P2: ℝP² + sphere rendered on the kernel (player = `Frame`, deck from `develop`). |
| [`instruments/embeddingInset.tsx`](https://github.com/piyarsquare/animath/blob/2255327/src/animations/PolygonWorlds/instruments/embeddingInset.tsx) | ℝP² Roman-surface embedding inset (procedural; antipode-invariant marker). |
| [`squareMap.ts`](https://github.com/piyarsquare/animath/blob/2255327/src/animations/PolygonWorlds/squareMap.ts) | Mini-map + `rp2Square`/`sq2hemi` (square↔hemisphere chart). Square-only — P3 needs the n-gon diagram. |
| [`fundamentalSquareEngine.ts`](https://github.com/piyarsquare/animath/blob/2255327/src/animations/PolygonWorlds/fundamentalSquareEngine.ts) | Facade: selects euclidean/spherical presenter by χ. |
| [`presenters/euclidean.ts`](https://github.com/piyarsquare/animath/blob/2255327/src/animations/PolygonWorlds/presenters/euclidean.ts) | P1 template; copy for P3 hyperbolic. |
| [`scripts/shoot-pw.mjs`](https://github.com/piyarsquare/animath/blob/2255327/scripts/shoot-pw.mjs) | Per-world headless screenshot driver. |

## Open / not done

1. **P3 — Hyperbolic presenter.** Poincaré-disk render + Fuchsian `develop` within
   the measured budget (`fuchsian`: horizon 6.5 / maxTiles 800). Copy
   `presenters/spherical.ts`'s frame-integration seam (player = kernel `Frame`); the
   octagon genus-2 and 3-/4-cross-cap are the targets.
2. **N-gon mini-map.** `squareMap.ts` is square-only; the hyperbolic octagon needs
   the n-gon edge diagram. Not blocking in P2 (both positive worlds are 4-gons) but
   required for P3.
3. **Sphere mini-map chart mismatch.** The sphere marker uses the `rp2Square`
   hemisphere chart while its decor uses `fullDir` (whole-sphere lon/lat) — a
   pre-existing inconsistency inherited from `sphericalCover`. Revisit with the
   n-gon map / P4.
4. **P4 instruments + free edge-word entry; P5 κ/gluing morph.** As before.
5. **More embedding insets** (Klein figure-8, genus-2) per plan §4 — later phases.

## Context

- **Kernel untouched + frozen.** P2 only *consumes* the kernel
  (`framePos`/`frameForward`/`stepForward`/`turn`/`realize`/`develop`); the
  100-check battery stays green (`npm run verify`). The one shared-chrome edit was
  moving `sq2hemi` into `squareMap.ts`.
- **Why the player is a `Frame` now.** The S01 handoff flagged that the Euclidean
  presenter still walked in flat coords; P2 adopts the kernel-`Frame` player seam,
  which P3 should reuse verbatim.
- **Realization recap** (verified by probing `realize`): ℝP² (`a b a b`) → κ=1,
  chart=false, V=2, hemisphere domain, deck = {id, antipodal(det −1)}; sphere
  (`a a⁻¹ b b⁻¹`) → κ=1, chart=true, V=3, whole-shell chart, trivial deck.
- **Verification:** `npm run build` (CI), `npm run verify` (100-check battery),
  `npm run preview` + `node scripts/shoot-pw.mjs <world> out.png` (eyeball; the
  driver sets the world `<select>`). No big-bang held — `sphericalCover` lived until
  the new presenter's screenshots matched.
- **Branch:** fast-forwarded onto the foundation; a PR from here is stacked on #190
  unless #190 merges to main first.

## Self-reflection

**What I'd do with another session.** P3: copy `presenters/spherical.ts` into a
hyperbolic presenter — player as a kernel `Frame` at κ=−1, render the developed
Fuchsian tiles in the Poincaré disk, and generalise the mini-map to the n-gon edge
diagram (the octagon needs it). The frame seam is already proven across κ=0 and κ=+1,
so κ=−1 should slot in.

**What I'd change about what I produced.** The spherical presenter is a faithful
port that *reuses* the old cover's sphere chrome rather than re-deriving the decor
placement from `realize`'s polygon vertices; for ℝP² the decor still uses `sq2hemi`
rather than mapping (u,v) through the realized geodesic square. It's screenshot-true
and principled where it matters (player + deck + skin from the kernel), but a
fully-from-vertices decor chart would be cleaner and would fix the sphere mini-map
mismatch.

**What I was not asked that matters.** Whether the sphere's mini-map should switch
to an honest equirectangular chart matching its `fullDir` decor (the current
hemisphere chart disagrees with the decor layout). Left as a noted follow-up.

**What we both overlooked.** A second WebGL context for the inset bumps against the
browser's context limit if many viewers stack; it fails quiet (try/catch) but if P4
adds more 3D insets, consider sharing one renderer via scissor viewports.

**What was difficult.** Nothing deep — the kernel made it easy. The only real step
was matching the *initial* camera framing to the baseline (the kernel frame starts
at the north pole; I pinned the start pose to the old `+y` up so screenshots align).

**What would have made it easier.** Already had it: the frozen kernel + the P1
presenter as a template + the headless screenshot driver. Adding the per-world
`<select>` driver up front would have saved a few iterations.

**Follow-up value: MEDIUM** — P2 is complete and correct, but it is the middle of a
three-phase render port; P3 (hyperbolic) is the substantial remaining piece and the
n-gon mini-map it needs is still pending.
