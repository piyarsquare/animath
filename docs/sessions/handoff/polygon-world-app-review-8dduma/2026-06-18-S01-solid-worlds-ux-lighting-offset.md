---
kind: handoff
session: 2026-06-18-S01
date: 2026-06-18
title: Solid Worlds — interaction/lighting polish + Pairing.offset plumbing
branch: claude/polygon-world-app-review-8dduma
slug: polygon-world-app-review-8dduma
status: completed
build: passing
followup: null
pr: null
app: solid-worlds
signals:
next: Rework homology.ts to a cellular method valid for screw gluings (2× cube subdivision or Bieberbach abelianization) so Hantzsche–Wendt + the amphidicosms can be added with computed, cross-checked H₁.
---

# Solid Worlds — interaction/lighting polish + Pairing.offset plumbing

## Summary

Solid Worlds (`#/solid-worlds`, walk inside a closed flat 3-manifold) already
had Tier 1 + most of Tier 2 built (4 cube worlds, developing-map cover, chiral
trail, computed H₁). This session was a long live-iteration pass with Dan on the
**feel and correctness of the experience**, then the start of extending the
**world catalog**. All UX/lighting work is shipped, built, lint/test-green, and
verified headless. The catalog extension (`Pairing.offset`) is **plumbed but has
no catalog consumer yet** — Hantzsche–Wendt is blocked on a homology rework
(details below). Build is green; nothing half-applied.

## What changed

Shipped this session (newest first), all on Solid Worlds:

- **`Pairing.offset` plumbing** (`be82c95`) — an off-axis translation (cube-edge
  units) beyond the full axial step, i.e. the screw component needed for
  Hantzsche–Wendt. Wired through schema, render engine, and homology's
  `pairingMap`. Existing worlds set no offset → unchanged. Screw worlds are
  **walkable**, but **not yet added** to the catalog (see Open / not done).
- **Holonomy-symmetric lighting** (`9745e20`) — the headline correctness fix.
  The directional key/fill lights are now replicated over the **point-group
  orbit** `{g·dir : g∈G}` at `1/|G|` each (a `max(0,n·l)` sum over an orbit is
  G-invariant yet still directional), and the hemisphere goes `ground = sky`
  whenever a holonomy doesn't fix +y. So lighting respects each world's
  symmetries: equal floor/sky light where top and bottom are identified, and the
  airplane no longer sees the light jump while climbing the decks of the Klein
  world. Superseded two earlier partial fixes (`7c24bf1`, `f1c72d6`).
- **"Show seams" toggle** (`6e68151`) — hide the cube-edge wireframe so the
  tiling reads as a continuous world.
- **Full cover in every mode** (`5de9e49`) — walking renders the identical
  lattice to flying (the earlier grounded-clip made walk look different/"funny").
  Grounded mode now only does an invisible floor-height lock on movement.
- **Corner markers** (`c0328de`, earlier) — 8 balls, one just inside each corner
  (RGB-cube colors); the colors that cluster at a shared vertex read off the
  gluing's identification. **Face labels** toggle too (X/Y/Z + glyph, colored by
  pairing kind). Both default off.
- **Ground-floor + glass-floor experiments reverted** (`feaf69f`) — a separate
  floor plane/material "looked funny"; dropped. Floor is just the room's own.
- **Tuning** (`12:01`/`11:25` notes) — furniture size decoupled from room size
  (one `U` reference scale), fog slider, floor toggle, depth→10, sparser trail,
  instanced cover.

## Key files

| File | Role |
|---|---|
| [`src/animations/SolidWorlds/coverEngine.ts`](https://github.com/piyarsquare/animath/blob/be82c95/src/animations/SolidWorlds/coverEngine.ts) | The engine. `computePointGroup` + `applyLightSymmetry` (orbit-symmetrized lights); `buildGenerators` (now applies `offset`); `buildCover` (corner/label/seam instancing, floor-height lock in `frame`). |
| [`src/animations/SolidWorlds/solidSchema.ts`](https://github.com/piyarsquare/animath/blob/be82c95/src/animations/SolidWorlds/solidSchema.ts#L74) | `Pairing` now has optional `offset`. `analyzeSolid` (orientability + calls homology). |
| [`src/animations/SolidWorlds/lib/homology.ts`](https://github.com/piyarsquare/animath/blob/be82c95/src/animations/SolidWorlds/lib/homology.ts) | H₁ via Smith normal form. **Sign-fold vertex identification assumes clean opposite-face pairing — breaks on screws** (the thing to rework). `pairingMap` now reads `offset`. |
| [`src/animations/SolidWorlds/worlds.ts`](https://github.com/piyarsquare/animath/blob/be82c95/src/animations/SolidWorlds/worlds.ts) | The 4-world catalog (3-torus, half/quarter-turn, amphicosm). Where HW + amphidicosms get added once homology handles them. |
| [`src/animations/SolidWorlds/SolidWorlds.tsx`](https://github.com/piyarsquare/animath/blob/be82c95/src/animations/SolidWorlds/SolidWorlds.tsx) | App shell: world select, View-panel toggles (seams/floor/labels/corners), look, fog, depth. |
| [`docs/sessions/progress/polygon-world-app-review-8dduma/2026-06-18-S01-solid-worlds-plan.md`](https://github.com/piyarsquare/animath/blob/be82c95/docs/sessions/progress/polygon-world-app-review-8dduma/2026-06-18-S01-solid-worlds-plan.md) | The standing tiered plan (`kind: plan`). |

## Open / not done

- **The homology rework is the gating next step.** `computeHomology` *crashes*
  on a screw world (a perpendicular `offset` staggers the faces, so the cube no
  longer pairs opposite-faces as whole squares; the sign-fold vertex
  identification and the fixed `EDGE_INDEX` lookup both break). Two routes:
  **(recommended) a 2× cube subdivision** — at half-edge resolution the gluings
  become cellular and the existing Smith-form code applies; or **abelianizing the
  Bieberbach group** (H₁ = Γᵃᵇ). A verified torsion-free ℤ/2×ℤ/2 screw set for
  HW is in the progress note (half-turns about x/y/z with cyclic −1 offsets) — use
  `computeHomology` as the oracle (target χ = 0, H₁ = (ℤ/4)²) once it's reworked.
- **Then add HW + the amphidicosms** to `worlds.ts` with computed invariants, and
  do the **vertex-link = S² manifold certifier** (reuse PolygonWorlds'
  `surfaceSchema.ts`) + a **3D walk-the-loop chirality harness** (still the
  flagged Tier-2 gap).
- **Smaller open question for Dan:** the per-cell "Floor plane" toggle (a lattice
  grid) is now independent of any "ground" concept — may want reconciling/relabel.

## Context

- This branch is **app-local** to Solid Worlds + the docs (attribution policy,
  earlier in the session). The only shared-file edits are append-only catalog
  rows; sync with `main` only when finalizing a PR (no PR yet).
- The session also (earlier) landed the **AI-collaboration attribution policy**
  (`ATTRIBUTION.md` + CLAUDE.md standing instruction + per-app "Possible sources"
  blocks) — see the 23:55 / 23:51 progress notes; that work is complete.
- Verification was almost all **headless screenshots** (`puppeteer` + swiftshader
  against `npm run preview`) since the lighting/UX changes are visual; assets are
  in the progress folder's `assets/`.
- No PR opened; everything is pushed to `claude/polygon-world-app-review-8dduma`.

## Self-reflection

1. **What would you do with another session?** The homology rework (2× cube
   subdivision or Bieberbach abelianization), then add Hantzsche–Wendt + the
   amphidicosms with computed/cross-checked H₁, then the vertex-link manifold
   certifier and a 3D walk-the-loop chirality harness.
2. **What would you change about what you produced?** I scoped the cube
   platycosms as "pure data" before reading `homology.ts`'s gluing assumptions;
   HW actually needs both the `offset` extension and a homology rework. Caught
   before shipping anything wrong, but the estimate was over-confident.
3. **What were you not asked that you think is important?** Whether the per-cell
   "Floor plane" toggle should be reconciled with the (removed) ground/glass-floor
   idea, and whether the new lighting symmetrization deserves a one-line HUD note
   as a teaching moment ("lighting symmetrized over the ℤ/2×ℤ/2 holonomy").
4. **What did we both overlook?** That world-fixed lights fundamentally can't be
   consistent under nontrivial holonomy — we reached the point-group orbit-sum
   only after two partial fixes. Naming the invariance principle up front would
   have saved a round.
5. **What did you find difficult?** Getting HW's face-pairing data right without
   fabricating it. Deriving a torsion-free ℤ/2×ℤ/2 screw set and using
   `computeHomology` as the oracle is what surfaced the staggered-face crash —
   the honesty rule did real work.
6. **What would have made this task easier?** A homology method agnostic to the
   gluing's combinatorial niceness from the start (subdivision/abelianization);
   the CW-on-8-vertices shortcut is elegant but is exactly what blocks screws.
7. **Follow-up value:** MEDIUM — everything shipped is correct and verified, but
   the catalog is incomplete by design: the `offset` plumbing has no catalog
   consumer until the homology rework lands, which is the clear high-value next.
