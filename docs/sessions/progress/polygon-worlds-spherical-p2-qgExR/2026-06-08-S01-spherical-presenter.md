---
kind: progress
session: 2026-06-08-S01
date: 2026-06-08
title: Polygon Worlds P2 — spherical presenter on the kernel
branch: claude/polygon-worlds-spherical-p2-qgExR
slug: polygon-worlds-spherical-p2-qgExR
status: completed
build: passed
followup: medium
pr: null
app: PolygonWorlds
---

# Polygon Worlds P2 — spherical presenter on the kernel

## Session purpose

Build **P2 (Spherical presenter)** of the Polygon Worlds geometry engine: render
ℝP² (smooth hemisphere, Z/2 deck) and the sphere (chart) from the frozen
Cayley–Klein kernel via a new `presenters/spherical.ts` (copying the P1 pattern in
`presenters/euclidean.ts`); disclose the chart distortion; ship the extrinsic
embedding inset (first non-orientable surface); screenshot-match `sphericalCover`,
then retire it.

## Previous session

[S01 geometry kernel](../polygon-worlds-geometry-oe2iM/2026-06-08-S01-geometry-kernel.md)
(branch `claude/polygon-worlds-geometry-oe2iM`, PR #190): M0 + Phase 0 + P1 done —
the kernel is built, frozen, 100-check battery green; the flat worlds render through
it and `euclideanCover` is retired. `sphericalCover` remains for P2 to replace.

## Status & follow-ups

P2 is complete: both positive worlds render through the kernel, `sphericalCover` is
retired, the chart distortion is disclosed, and the ℝP² embedding inset ships.
Carried forward:

- **P3 — Hyperbolic presenter.** Poincaré-disk render + Fuchsian develop within the
  measured budget (`fuchsian` defaults: horizon 6.5 / maxTiles 800). The player is
  now a kernel `Frame`, so the P3 presenter can copy the same frame-integration seam
  spherical uses.
- **N-gon mini-map.** `squareMap.ts` is square-only. Both P2 worlds are 4-gons so it
  was *not* blocking, but the hyperbolic octagon (genus-2) needs the n-gon edge
  diagram — do it in P3.
- **Sphere mini-map chart.** The sphere marker uses `rp2Square` (hemisphere chart)
  while its decor uses `fullDir` (whole-sphere lon/lat) — a pre-existing mismatch
  inherited from `sphericalCover`. Honest-but-imperfect; revisit with the n-gon map / P4.
- **Embedding insets for the others.** Klein (figure-8) and genus-2 insets per the
  plan's §4 — later phases.

## Working notes

<!-- Newest entry first. -->

### 🟡 milestone · 15:40 — P2 embedding inset shipped: ℝP² Roman surface
**Why:** the plan ships the extrinsic embedding inset *with the first non-orientable
surface* ("same walk, wildly different shape"), and ℝP² is it.

`instruments/embeddingInset.tsx` renders ℝP² **immersed in 3-space** via the
**Steiner Roman surface** — the image of the quadratic map `(a,b,c)↦(ab,bc,ca)` on
the unit sphere. Being quadratic it identifies antipodes, so it *factors through
ℝP²* and immerses the projective plane; fully procedural (no asset import). A tiny
self-contained renderer (own WebGL context + rAF, disposed on unmount) shows the
lobed surface slowly spinning with the **player's marker riding it**. The marker is
read from the existing mini-map chart (`sq2hemi`, moved to `squareMap.ts` next to
its inverse `rp2Square`) — so no new kernel plumbing — and because `u,v` is always
the z≥0 representative, the marker lands on the **same Roman point** whether the
player is on the near or the antipodal mirror sheet, making `x∼−x` visible as one
dot. Shown only for ℝP². Screenshot-confirmed (inset bottom-left on ℝP², absent on
the sphere). Build green; verify 100/100. Committed `2255327`, pushed.

### 🟡 milestone · 15:25 — P2 core shipped: spherical presenter on the kernel; sphericalCover retired
**Why:** port the χ>0 worlds onto the frozen kernel and prove parity before deleting
the ad-hoc cover (no big-bang), mirroring P1.

`presenters/spherical.ts` renders ℝP² + sphere from the kernel. At κ=+1 the model
shell *is* the unit sphere, so the player is a kernel **`Frame`** (`framePos·R`
places it; `stepForward`/`turn`/`stepHeading` walk it — the player-as-frame refactor
the S01 handoff flagged). `realize()` decides the realization by V-structure:

- **ℝP²** — isometric hemisphere square; the **Z/2 antipodal deck** comes from
  `develop()`, and that one `det<0` element drives **both** the trees↔columns
  skin-swap on z<0 **and** the mirror footprint twin — replacing the cover's
  hard-coded `scale(-1,-1,-1)`/`negate()`.
- **sphere** — `real.chart` is true, so the square is spread over the whole shell
  (distances distort; the inner shell is the back face seen through the glass).

All sphere chrome (planet skin, seam ring, inner shell, glass, footprints, camera,
square chart) preserved. **Screenshot-matched** the old `sphericalCover` for both
worlds: static views align with the baselines; walked views confirm the trail lays
down, and on ℝP² **crossing the seam flips to the mirror side** (mini-map reads
"Projective plane · mirror side") with the trail reversed. Wired the facade to the
new presenter and **retired `sphericalCover.ts`**. Initial frame set to the old
start pose (`pos=+y, fwd=−z`) so framing matches. Build green; verify 100/100.
Committed `7bd86c9`, pushed. Added `scripts/shoot-pw.mjs` (per-world driver).

> [!IMPORTANT]
> **No kernel change.** P2 consumes the frozen kernel (`framePos`/`frameForward`/
> `stepForward`/`turn`/`develop`/`realize`) unchanged; the 100-check battery stays
> green. The only shared-chrome edit was moving `sq2hemi` into `squareMap.ts`.

### 🔵 finding · 15:12 — Probed the kernel for the two positive worlds; captured baselines
**Why:** ground the presenter design in `realize`/`develop`'s actual output and
have a screenshot target before touching `sphericalCover` (no big-bang).

`realize(parseWord(...))` for the positive words confirms the design is clean:

- **ℝP² (`a b a b`):** κ=1, **chart=false (isometric)**, V=2, circumradius π/2 —
  the fundamental domain is the **upper hemisphere**, its 4 corners on the equator
  at the 45° diagonals (exactly the old cover's `sq2hemi` corners). `develop`
  returns **2 deck elements**: identity (det +1, centre = north pole) and the
  **antipodal map (det −1, centre = south pole)** — the Z/2 deck, with the
  trees↔columns skin-swap and the mirror trail falling out of `det<0`.
- **Sphere (`a a⁻¹ b b⁻¹`):** κ=1, **chart=true**, V=3 — the pillowcase spread
  over the whole sphere; deck trivial.

The κ=1 model shell `⟨P,P⟩=1` with form diag(1,1,1) *is* the unit sphere in ℝ³, so
`framePos(frame)` lands directly on it and world = `framePos·R`. The player becomes
a kernel `Frame` (the refactor the S01 handoff recommended), and the antipodal twin
/ skin-swap that `sphericalCover` hard-codes (`scale(-1,-1,-1)`, `negate()`) now
come from the kernel deck group instead. Both positive worlds are **4-gons**, so
`squareMap` already covers them — the n-gon mini-map generalisation is a P3
concern, not blocking here. Baselines captured (sphere, ℝP², klein) via a new
`scripts/shoot-pw.mjs` world-selector driver; build green on the foundation tip.

### 🟣 decision · 15:00 — Stack this branch on the geometry foundation
**Why:** the task branch was cut from `main`, but P2 must build on the verified
kernel (`claude/polygon-worlds-geometry-oe2iM` / PR #190), which is not yet merged.

Fast-forwarded `claude/polygon-worlds-spherical-p2-qgExR` onto
`origin/claude/polygon-worlds-geometry-oe2iM` (my HEAD was an ancestor, so it was a
clean ff — no merge commit, no unique commits lost). The branch now carries the
kernel, `realize`/`develop`, and `presenters/euclidean.ts`. A PR from here would be
stacked on #190.
</content>
</invoke>
