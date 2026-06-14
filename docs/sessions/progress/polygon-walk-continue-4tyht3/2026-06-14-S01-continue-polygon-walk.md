---
kind: progress
session: 2026-06-14-S01
date: 2026-06-14
title: Continue the Polygon Worlds walk
branch: claude/polygon-walk-continue-4tyht3
slug: polygon-walk-continue-4tyht3
status: in-progress
build: unknown
followup: null
pr: null
app: polygon-worlds
---

# Continue the Polygon Worlds walk

## Session purpose

Continue work on the polygon walk (`src/animations/PolygonWorlds/`). Specific
target to be set with the user after reviewing the standing roadmap.

## Previous session

First tracked session on this branch (forked from current `main`, tip
`0d2cb60`). Continuity picks up from the most recent polygon handoff:
[`polygon-sign-orientation-50exno/2026-06-10-S01`](../../handoff/polygon-sign-orientation-50exno/2026-06-10-S01-sign-orientation-review.md)
— orientation fixed end-to-end, two-sided glass **sign** instrument added,
euclidean presenter generalized to arbitrary realized polygons (+hexagonal
torus/Klein worlds), and a four-part improvement roadmap left open. That work
is merged to `main`. Build: passed; follow-up value: MEDIUM.

## Working notes

<!-- Newest entry first. -->

### 🟡 milestone · 22:50 — A1 verified green end-to-end; committed
**Why:** the focused chirality guard is the decisive correctness test for a
non-orientable walker world.

Focused `trail-chirality` run on the ℝP² family (`rp2`, `rp2hex`, `rp2oct`):
**all three PASS** — `A=cyan@+axis B=cyan@+axis` (a fresh print reads correct
on BOTH faces across the seam), `decor 0/N improper`, mirror ink at
`29.880 < 30.000` (below the glass). The new hex/oct worlds reproduce the
proven square ℝP²'s behavior exactly. Flipped-face render confirms the
footprint, the hexagon minimap (amber/flipped marker), and the Roman-surface
embedding inset all read correctly. EXPLAINER gains two rows (`abcabc`,
`abcdabcd` → projective plane again). Committing.

> [!NOTE]
> A1 done. Remaining roadmap-A item is **A2 (zip spheres)** — a bigger lift
> (cut-tree charts); the hex/oct zip-sphere words realize as `chart:true`
> (lon/lat fullDir), so they would *load* on the existing sphere path but
> without word-faithful seams. Deferred as a separate, scoped effort.

### 🟢 code · 22:35 — A1 implemented; build/lint green; smoke test passes
**Why:** finished the edits and ran the fast headless smoke + the focused
chirality guard.

Changes (all on `claude/polygon-walk-continue-4tyht3`):
- `squareMap.ts`: + `ngon2hemi` / `hemi2ngon` / `ngonBoundaryRadius` — the
  polygon-gauge chart (boundary→equator, center→pole; reduces to `sq2hemi`
  structure).
- `spherical.ts`: `nGon = antipodal && !spec.edges`; `ngonDir`,
  `cornerPlacements()` (m vertices at their azimuths), and a `chart()`
  branch using `hemi2ngon`. Square ℝP² / round sphere paths untouched.
- `worldSpec.ts`: + `rp2hex`, `rp2oct`.
- `PolygonWorlds.tsx`: `polygonSpec` rhoV=1 for spherical (was Poincaré tanh).
- `immersions.ts`: + `rp2hex`/`rp2oct` → Roman surface (marker rides true dir).
- `scripts/trail-chirality.mjs`: + the two worlds to the guard.

`npm run build` ✓, `npm run lint` ✓ (0 errors). Headless smoke (walk + plant a
sign on rp2/rp2hex/rp2oct): **decor 0/N improper** and **mirror ink below the
glass** on all three; minimap renders the hexagon/octagon with numbered
corner chips; render looks correct (see assets). Awaiting the focused A/B
chirality guard (does a fresh print read right on BOTH faces across the seam).

![rp2hex render](assets/2026-06-14-S01-rp2hex.png)

### 🟢 code · 22:05 — Implementing roadmap A1: smooth hex/oct ℝP² worlds
**Why:** the user said "proceed as far as you can"; A1 is the handoff's
recommended next target, a complete shippable unit, and lowest-risk.

Investigation settled the design. Kernel probes confirm the new words realize
as **smooth hemispheres** (R=π/2, `chart:false`) with deck group `{Id, −Id}`
(antipodal, det<0) — *identical* deck structure to the square ℝP², so the
twin/ink/sign/seam logic is word-agnostic. The only square-specific pieces are
(1) the chart map `sq2hemi`, (2) the 4 `CHART_CORNERS`, (3) `chart()`'s
`rp2Square` player marker.

Plan (isolates risk — the proven square path stays untouched, branch on
`nGon = !spec.edges`, mirroring the minimap's existing `edges ? square : polygon`
split):
- `worldSpec.ts`: +`rp2hex` (`a b c a b c`), +`rp2oct` (`a b c d a b c d`).
- `squareMap.ts`: + `ngon2hemi` / `hemi2ngon` (a polygon-gauge chart that
  reduces to `sq2hemi` semantics — boundary→equator, center→pole).
- `spherical.ts`: branch `dirFor`, corner markers (4→m at vertex azimuths),
  and `chart()` on `nGon`.
- `PolygonWorlds.tsx`: `polygonSpec` rhoV=1 for spherical (was tanh — Poincaré).
- `immersions.ts`: register the new ids → the Roman-surface ℝP² immersion
  (marker rides true `dir`, so it works for any ℝP² word).
- Guard: extend `scripts/trail-chirality.mjs` world list; build + lint.

### 🟡 milestone · 19:31 — Session opened, oriented on polygon roadmap
**Why:** /start-session — read the latest polygon handoff and orient before
picking a target.

New branch with no prior handoff; pulled context from the
`polygon-sign-orientation-50exno` S01 handoff (the most recent of the polygon
lineage). Confirmed PolygonWorlds is on `main` with the sign instrument,
hexagonal worlds, and orientation guards in place. Standing roadmap items
(A–F) summarized for the user; awaiting direction on which to pursue.
