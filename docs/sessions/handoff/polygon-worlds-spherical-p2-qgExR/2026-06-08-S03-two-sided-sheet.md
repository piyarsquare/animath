---
kind: handoff
session: 2026-06-08-S03
date: 2026-06-08
title: Polygon Worlds — the "setting" rework (decor, sheet, lighting) + hyperbolic fundamental-domain fix
branch: claude/polygon-worlds-spherical-p2-qgExR
slug: polygon-worlds-spherical-p2-qgExR
status: completed
build: passed
followup: high
pr: null
app: PolygonWorlds
---

# Polygon Worlds — the "setting" rework + hyperbolic fundamental-domain fix

> [!IMPORTANT]
> **Next session is "the setting":** the trees/columns design, the landmarks +
> labels, the floor opacity, and additional light sources. All three world classes
> (flat, spherical, hyperbolic) now render and walk correctly on the revised model;
> what remains is making the *scene* legible and attractive. Plan:
> [`docs/polygon-worlds-plan.md`](../../../polygon-worlds-plan.md) (P4 territory).

## Summary

This session reworked the **decor / fundamental-sheet model** for the flat and
spherical worlds against a list of strict constraints, then iterated with the user
on several reversals, and finally fixed the **hyperbolic** worlds so the player is
kept in the fundamental domain (no walk-off) and flips to the other side when
crossing a glide edge. Net result: one neutral two-sided sheet; **trees (one face)
vs columns (the other face)** at matching coordinates carry the side; markers held
off the gluing edges; a distinct centre beacon; opaque floor by default (glass
slider to peek under); **warm-above / cool-below lighting**; clear spawns; and a
**camera-distance** control. Build green, 100-check battery green throughout.

## What changed (chronological, newest decisions win)

1. **Decor API + two-sided sheet** (`cad350c`). `decor.ts` now exposes
   `makeTop(i)` / `makeBottom(i)` (a tree/centre-spire on top, a column/centre-spire
   on the bottom) and a landmark set with kinds `interior` / `center`. Each landmark
   `i` has fixed `(uᵢ, vᵢ)`; **tree on top, column on bottom at the same `(u,v)`,
   grown away from the sheet** (no penetration). `euclidean` tiles per-cell slabs and
   flips a non-orientable cell with `scale.y = −1`; `spherical` puts trees on the
   outer shell, columns on the inner, with a clear radial gap (fixing "columns inside
   trees"). Added `setCameraDistance` through the cover/engine interfaces + a slider.
2. **Opaque floor, warm/cool light, off-edge markers** (`99d1161`). Floor is opaque
   at default opacity (no show-through while walking; lower the Glass slider to peek
   under). A **warm** directional light from above + a **cool** one from below tint
   the two sides. On-edge boundary markers removed (they split half-tree/half-column
   at a gluing edge and read as confused) — markers stay clear of the boundary.
3. **Dropped the per-side tile colour** (`542a344`). Both faces are now one neutral
   colour; trees vs columns (+ the warm/cool light) carry the side. (Note: this
   commit's message also mentions a hyperbolic fix that was *lost in a git reset* —
   the real hyperbolic fix is `585ea61`.)
4. **Hyperbolic kept in the fundamental domain + flips sides** (`585ea61`). See the
   working notes; this is the important one.

## Key files

| File | Role |
|---|---|
| [`decor.ts`](https://github.com/piyarsquare/animath/blob/585ea61/src/animations/PolygonWorlds/decor.ts) | The landmark set + `makeTop`/`makeBottom` builders + centre beacon. **Start here for the "setting".** |
| [`presenters/euclidean.ts`](https://github.com/piyarsquare/animath/blob/585ea61/src/animations/PolygonWorlds/presenters/euclidean.ts) | Flat: per-cell two-sided slabs, sheet-flip, side-aware footprints, clear spawn. |
| [`presenters/spherical.ts`](https://github.com/piyarsquare/animath/blob/585ea61/src/animations/PolygonWorlds/presenters/spherical.ts) | Sphere/ℝP²: neutral two-sided shell, outer trees / inner columns. |
| [`presenters/hyperbolic.ts`](https://github.com/piyarsquare/animath/blob/585ea61/src/animations/PolygonWorlds/presenters/hyperbolic.ts) | Poincaré disk; player stays in the fundamental domain via the `h` tracker. |
| [`fundamentalSquareEngine.ts`](https://github.com/piyarsquare/animath/blob/585ea61/src/animations/PolygonWorlds/fundamentalSquareEngine.ts) | Facade: shared lights (warm above / cool below), avatar, frame loop. **Add light sources here.** |
| [`PolygonWorlds.tsx`](https://github.com/piyarsquare/animath/blob/585ea61/src/animations/PolygonWorlds/PolygonWorlds.tsx) | Host: Settings sliders (landmarks, arrangement, opacity, camera distance, …). |
| [`scripts/shoot-pw.mjs`](https://github.com/piyarsquare/animath/blob/585ea61/scripts/shoot-pw.mjs) | Per-world headless screenshot driver. |

## Open / not done — "the setting" (next session)

The mechanics are correct; the scene needs design love. Concretely:

1. **Trees / columns design.** They're crude (cylinder + cone trunk; plain
   cylinder). Make them attractive and unmistakably two distinct "kinds", and
   ensure the chiral number+arrow **decal reads clearly** (it's the orientation cue).
   The user noted melding tree+column into a single morphable cue is a *later*
   idea — for now keep them distinct but improve them.
2. **Landmarks + labels.** Number labels are small and can be hard to read at
   distance / on the column body. Revisit size, placement, contrast, and whether
   labels should always face the camera (billboard) vs the current fixed +x decal.
3. **Floor opacity.** Default is opaque; the Glass slider reveals the underside.
   Reconsider the default + the feel of the glass reveal (and the below-floor
   footprints when flipped).
4. **Additional light sources.** Currently one warm (above) + one cool (below)
   directional + ambient, in `fundamentalSquareEngine.ts`. Consider fill lights, a
   subtle hemisphere light, or per-world tuning so the scene reads well in all three
   geometries (the sphere planet currently reads a bit dark).

Carried-over (not "setting", but pending):
- **Sphere chart pole-clumping** — equirectangular `fullDir` collapses v=0/1 markers
  to the poles. Accept-and-disclose vs distribute-by-area.
- **N-gon mini-map** exists (`polygonMap.ts`); the sphere mini-map still uses the
  hemisphere chart while its decor uses whole-sphere lon/lat (pre-existing mismatch).
- **P4 instruments + free edge-word entry; P5 κ/gluing morph** (the plan).

## Context (read before touching the code)

- **decor.ts is the shared "setting" source.** All three presenters consume
  `decor.props` + `makeTop(i)` / `makeBottom(i)`. Change the look there once and it
  lands in every world. `makeTop` = tree (or gold centre spire); `makeBottom` =
  column (or magenta centre spire). All decor materials are **`DoubleSide`** because
  the euclidean flip scales a cell by `y = −1` (don't switch them to `FrontSide`).
- **The three presenters use three movement models** (by design):
  - *euclidean* — player walks the infinite cover (world coords unbounded); a 5×5
    block of cells re-centres on them; non-orientable flip = per-cell `scale.y=−1`.
  - *spherical* — player is a kernel `Frame` on a fixed planet; walks its surface.
  - *hyperbolic* — player frame stays det>0; a separate deck element `h` re-centres
    the tiling and `det(h)` flips the global skin. **Never reduce the player frame
    through a glide** (it inverts the controls — that bug cost this session time).
- **Lighting is in the facade** (`fundamentalSquareEngine.ts`), shared by all worlds:
  warm `DirectionalLight` from `(0.4,1,0.3)`, cool from `(−0.35,−1,−0.2)`, ambient.
- **Verification:** `npm run build` (CI), `npm run verify` (schemas + 100 geometry
  invariants — kernel is frozen, keep it green), and `npm run preview` + `node
  scripts/shoot-pw.mjs <world> out.png` (the driver sets the world `<select>`;
  worlds: `torus klein rp2 sphere genus2 crosscap3`). The preview server dies
  between long gaps — restart with `nohup npm run preview &` and check `:4173`.
- **Git hygiene lesson:** a `git reset --soft` + re-commit earlier left the local
  branch on a stale base and silently dropped working-tree changes from the pushed
  history; recovered with `git reset --hard origin/<branch>`. If local/remote
  diverge, trust the remote (it had the good work) and re-apply the one file.
  **Avoid backticks in `git commit -m` strings** (shell command-substitution ate a
  word once); use `git commit -F -` with a heredoc.

## Self-reflection

**What I'd do with another session.** Exactly the planned "setting" work: redesign
the tree/column meshes (and the decal legibility), tune labels, and add fill
lighting. I'd also resolve the sphere pole-clumping since it's the one remaining
"looks like a bug" artifact.

**What I'd change about what I produced.** I spent a long time root-causing the "tan
ramp" (a tree at the spawn point) by visual bisection; a quick `console.log` of the
nearest-marker distance, or a wireframe pass, would have found it faster. And I let a
git reset corrupt the local branch — I should have checked `git log` against the
remote before re-committing.

**What I was not asked that matters.** Whether the floor opacity / glass-reveal is
even desirable as a default, or whether the "other side" should only ever be reached
by an explicit normal-flip move (the plan's "dive through the floor"). Worth settling
during the setting work.

**What we both overlooked.** The decal on the column body vs the trunk — the number
legibility differs between trees and columns; the setting pass should unify it.

**What was difficult.** Keeping the non-orientable orientation bookkeeping straight
across three different movement models — especially that the hyperbolic flip must
live in a *separate* tracker, not the player frame.

**What would have made it easier.** A tiny on-screen debug HUD (player det, current
tile, nearest-marker distance) would have made the spawn and flip bugs obvious. Worth
adding a dev-only readout next session.

**Follow-up value: HIGH** — the geometry/mechanics are correct and stable, but the
app's *legibility and appeal* now hinge entirely on the setting work, which is
unstarted.
</content>
