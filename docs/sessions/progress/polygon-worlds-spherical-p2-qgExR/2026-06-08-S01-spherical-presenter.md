---
kind: progress
session: 2026-06-08-S01
date: 2026-06-08
title: Polygon Worlds P2 — spherical presenter on the kernel
branch: claude/polygon-worlds-spherical-p2-qgExR
slug: polygon-worlds-spherical-p2-qgExR
status: in-progress
build: passed
followup: null
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

## Working notes

<!-- Newest entry first. -->

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
