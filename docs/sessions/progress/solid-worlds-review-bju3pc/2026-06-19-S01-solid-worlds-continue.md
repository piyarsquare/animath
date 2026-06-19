---
kind: progress
session: 2026-06-19-S01
date: 2026-06-19
title: Solid Worlds — review state & plan the next push
branch: claude/solid-worlds-review-bju3pc
slug: solid-worlds-review-bju3pc
status: in-progress
build: passing
followup: null
pr: null
app: solid-worlds
signals: needs-dan
next: Rework homology.ts to a gluing-agnostic method (2× cube subdivision or Bieberbach abelianization) so screw worlds (Hantzsche–Wendt + amphidicosms) can join the catalog with computed, cross-checked H₁.
---

# Solid Worlds — review state & plan the next push

## Session purpose

Continue work on **Solid Worlds** (`#/solid-worlds`, walk inside a closed flat
3-manifold; the 3D successor to Polygon Worlds). The name may want
reconsidering. First task: review where the last session left things and lay out
the next steps before touching code.

## Previous session

First tracked session on **this** branch (`claude/solid-worlds-review-bju3pc`).
The app's prior work lives under the sibling branch folder — latest handoff:
[`polygon-world-app-review-8dduma/2026-06-18-S01-solid-worlds-ux-lighting-offset.md`](../../handoff/polygon-world-app-review-8dduma/2026-06-18-S01-solid-worlds-ux-lighting-offset.md),
with the standing tiered plan at
[`…/2026-06-18-S01-solid-worlds-plan.md`](../polygon-world-app-review-8dduma/2026-06-18-S01-solid-worlds-plan.md).
That branch's Solid Worlds code is **already present on this branch** (engine,
4-world flat catalog, chiral HUD, computed H₁, `Pairing.offset` plumbing).

## Working notes

### 🔵 finding · 20:01 — Reviewed handoff + plan; state confirmed on-branch
**Why:** Orientation before any work, per /start-session.

State as inherited (all shipped, build/lint/test green per the handoff, verified
headless):

- **Tier 1 complete + most of Tier 2.** `src/animations/SolidWorlds/` has the
  developing-map cover engine (`coverEngine.ts`), a 4-world flat catalog
  (`worlds.ts`: 3-torus, half-turn, quarter-turn, amphicosm), the chirality HUD
  (original · rotated · mirrored), and **computed** H₁ via Smith normal form
  (`lib/homology.ts`).
- **Last session's headline fixes** were experiential: holonomy-symmetric
  lighting (lights replicated over the point-group orbit so floor/sky match where
  faces are identified), full cover in every mode, "show seams" toggle, corner
  markers + face labels, furniture/room scale decoupling, fog.
- **`Pairing.offset` is plumbed but unused.** The screw (off-axis) translation
  needed for Hantzsche–Wendt is wired through schema/engine/homology, but **no
  catalog world uses it yet** — because `computeHomology` *crashes* on a screw
  gluing (perpendicular offset staggers the faces, breaking the sign-fold vertex
  identification and the fixed `EDGE_INDEX` lookup).

The gating next step (last session's recommendation): rework `homology.ts` to a
method agnostic to the gluing's combinatorial niceness — either a **2× cube
subdivision** (gluings become cellular, existing Smith-form code applies) or
**abelianizing the Bieberbach group** (H₁ = Γᵃᵇ) — then add Hantzsche–Wendt + the
amphidicosms with computed/cross-checked invariants, plus the still-missing
**vertex-link = S² manifold certifier** and a **3D walk-the-loop chirality
harness**.

Open question flagged for Dan: the per-cell "Floor plane" toggle is now
independent of any "ground" concept and may want relabeling/reconciling.

### 🟣 decision · 20:01 — Holding for Dan's direction
**Why:** /start-session ends at orientation; the user asked for a state review +
next-steps read before choosing what to build.

Awaiting direction on which thread to pull: (a) the homology rework → screw
worlds, (b) the manifold certifier + chirality harness, (c) experiential/UX
polish, or (d) the naming question.

## Where we are (summary for Dan)

**Built and shipped:** a walkable, first-person flat 3-manifold explorer with 4
worlds, symmetry-correct lighting, a working chirality HUD, and homology computed
(not curated) for everything currently in the catalog. It's a real, correct Tier-1
app with most of Tier 2 done.

**The one wall:** the catalog can't grow to the *interesting* flat worlds
(Hantzsche–Wendt, the amphidicosms) until `homology.ts` stops assuming clean
opposite-face pairing. The `offset` data path is already there; only the invariant
computation blocks it.

**Bigger forks still ahead** (the plan's Tiers 2–4): the manifold certifier
(reuse Polygon Worlds' `surfaceSchema.ts` on each vertex link), a headless 3D
chirality test, then the genuinely new graphics work — the curved (S³/H³) renderer
that unlocks lens spaces, the Poincaré sphere, Seifert–Weber.

**Naming:** "Solid Worlds" pairs with "Polygon Worlds" (domain shape → app name).
Alternatives noted in the plan: *Manifold Walk* (pairs with *Topology Walk*),
*Space Worlds*. Open for revisiting this session.
