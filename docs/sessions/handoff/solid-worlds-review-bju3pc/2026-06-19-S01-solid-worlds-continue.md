---
kind: handoff
session: 2026-06-19-S01
date: 2026-06-20
title: Solid Worlds — 4 new platycosms (Γᵃᵇ-verified), FRONT/BACK sign, verified-gate fix
branch: claude/solid-worlds-review-bju3pc
slug: solid-worlds-review-bju3pc
status: completed
build: passing
followup: null
pr: null
app: solid-worlds
signals: visual-unverified
next: Confirm −a2 = ℤ⊕ℤ/4 against Conway–Rossetti Table 6; then fix the cell-engine screw bug (lib/homology.ts) to graduate the two screw worlds (didicosm, second amphidicosm) from experimental to dual-verified.
---

# Solid Worlds — 4 new platycosms (Γᵃᵇ-verified), FRONT/BACK sign, verified-gate fix

## Summary

Grew the Solid Worlds catalog from **4 to 8** of the ten flat 3-manifolds
(platycosms), including the famous **Hantzsche–Wendt** manifold, by building an
independent, screw-safe homology (the deck group's abelianization, **Γᵃᵇ**) and a
group-theoretic **free-action** manifold test — because the existing cube cell
complex (`lib/homology.ts`) has a real orientation-sign bug on screw gluings. H₁
in the app now comes from Γᵃᵇ; the cell complex is kept only as a cross-check.
Also replaced the see-through "HELLO" sign with a solid two-sided **FRONT/BACK**
slab, and fixed a reviewer-caught bug where the didicosm was mislabeled
"dual-verified". Build/lint/test all green (29 SolidWorlds tests).

## What changed

Four commits this session (on top of the inherited homology-rework work):

1. **`8386b42` — independent Γᵃᵇ + verified classifier.** Built
   `abelianizationH1` and `isFreeAction` in `lib/freeness.ts` (point group +
   Reidemeister–Schreier lattice with word-tracking → integer relation matrix →
   Smith form). Cross-check found **610 of 1030 free specs disagree with the cell
   engine — and Γᵃᵇ is right every time** (e.g. cell reports ℤ⊕ℤ/8 for a
   quarter-turn+screw that is plainly ℤ⊕ℤ/2). Classification by the trustworthy
   key (orientability, holonomy order, Γᵃᵇ) yields **exactly the 8
   cube-expressible platycosms** (tricosm/hexacosm correctly absent — they need a
   hexagonal prism). Γᵃᵇ yields **Hantzsche–Wendt = ℤ/4⊕ℤ/4**, the known value.

2. **`53492c7` — added the 4 new worlds.** `analyzeSolid` rewired: H₁ from Γᵃᵇ
   (authoritative), manifold from `isFreeAction`, χ from the free-action theorem
   (=0). New worlds with clean, verified generators: second amphicosm (ℤ²), first
   amphidicosm (ℤ⊕(ℤ/2)²), second amphidicosm (ℤ⊕ℤ/4), didicosm/Hantzsche–Wendt
   (ℤ/4⊕ℤ/4). EXPLAINER + CLAUDE.md + sources (Conway–Rossetti, Hantzsche–Wendt)
   updated. Original 4 worlds untouched.

3. **`a152455` — FRONT/BACK sign.** The old sign was one double-sided plane with a
   single texture, so its back was the front texture seen through (looked like
   letters bleeding through). Replaced with a thin `BoxGeometry` slab carrying a
   `FRONT` face and a `BACK` face; the opaque slab between them blocks all
   see-through.

4. **`1e77986` — verified-gate fix (reviewer-caught).** `verified` was
   `hom.h1===ab.h1 && hom.euler===0`, ignoring `hom.manifold`. The didicosm's cell
   complex matches H₁/χ but its own vertex-link cert returns `false`, so the panel
   claimed "the cell complex agrees" about a complex that rejects the manifold
   cert. Added `&& hom.manifold`. Now `verified` is true **exactly on the
   screw-free worlds**; both screw worlds (didicosm, second amphidicosm) ship
   **experimental (Γᵃᵇ-only)**. Added a regression test.

## Key files

| File | Role |
|---|---|
| [`lib/freeness.ts:299`](https://github.com/piyarsquare/animath/blob/1e7798651d440c0bb2dda6f1d9b9c5858b31fc27/src/animations/SolidWorlds/lib/freeness.ts#L299) | `abelianizationH1` — the authoritative, screw-safe H₁ (deck-group Γᵃᵇ) |
| [`lib/freeness.ts:172`](https://github.com/piyarsquare/animath/blob/1e7798651d440c0bb2dda6f1d9b9c5858b31fc27/src/animations/SolidWorlds/lib/freeness.ts#L172) | `isFreeAction` — the genuine manifold certificate (vs cone-point orbifold) |
| [`solidSchema.ts:169`](https://github.com/piyarsquare/animath/blob/1e7798651d440c0bb2dda6f1d9b9c5858b31fc27/src/animations/SolidWorlds/solidSchema.ts#L169) | `analyzeSolid` — H₁ from Γᵃᵇ, manifold from freeness, `verified` cross-check gate |
| [`worlds.ts:74`](https://github.com/piyarsquare/animath/blob/1e7798651d440c0bb2dda6f1d9b9c5858b31fc27/src/animations/SolidWorlds/worlds.ts#L74) | The 4 new platycosms (lines 74/84/94/104) with curated generators + H₁ |
| [`lib/homology.ts`](https://github.com/piyarsquare/animath/blob/1e7798651d440c0bb2dda6f1d9b9c5858b31fc27/src/animations/SolidWorlds/lib/homology.ts) | Cube cell complex — **known screw bug**; now cross-check only |
| [`coverEngine.ts:260`](https://github.com/piyarsquare/animath/blob/1e7798651d440c0bb2dda6f1d9b9c5858b31fc27/src/animations/SolidWorlds/coverEngine.ts#L260) | The new solid FRONT/BACK sign (slab + two one-directional faces) |
| [`__tests__/gab.test.ts:62`](https://github.com/piyarsquare/animath/blob/1e7798651d440c0bb2dda6f1d9b9c5858b31fc27/src/animations/SolidWorlds/__tests__/gab.test.ts#L62) | Regression: matching H₁/χ ≠ verified when the cell link cert fails |
| [`SolidWorlds.tsx:248`](https://github.com/piyarsquare/animath/blob/1e7798651d440c0bb2dda6f1d9b9c5858b31fc27/src/animations/SolidWorlds/SolidWorlds.tsx#L248) | HUD "cross-checked" vs "experimental" status line |

## Open / not done

- **Two screw worlds are experimental (Γᵃᵇ-only).** Didicosm and second
  amphidicosm are correct (Γᵃᵇ + freeness), but the cell cross-check fails them.
  Fixing the cell-engine screw bug graduates both to dual-verified — the clean
  follow-up. The bug is an orientation-sign / link-cert error in
  `lib/homology.ts` for rotated/reflected staggered (screw) gluings; it does
  **not** affect the shipped catalog's displayed values.
- **−a2 naming unconfirmed.** Second amphidicosm = ℤ⊕ℤ/4 was derived by
  elimination (Γᵃᵇ and cell agree on the *value*); confirm the name↔invariant
  pairing against Conway–Rossetti, *Describing the Platycosms* (arXiv:math/0311476),
  Table 6.
- **BACK face not visually confirmed.** Headless screenshot shows the opaque
  FRONT face renders (no see-through); BACK is correct by construction but wasn't
  observed from behind (the 3-torus cover faces all signs front-on to the camera).
- **Catalog is 8/10 by design.** The tricosm and hexacosm need a hexagonal prism,
  not a cube — out of scope for this app's cube schema.

## Context

- **Why Γᵃᵇ over fixing the cell engine:** Γᵃᵇ *is* the definition (H₁ = π₁ᵃᵇ),
  it's rigorous and screw-safe, and the cell bug is subtle/intermittent. The cell
  engine stays for χ and as the cross-check that powers the `verified` flag.
- **`verified` semantics:** true ⟺ the cube cell complex *fully* agrees (same H₁,
  χ=0, **and** its own vertex-link manifold cert passes). This is exactly the
  documented "trusted only on the screw-free worlds" stance, now enforced.
- The four catalog worlds' generators were each verified (free + correct Γᵃᵇ +
  orientability) before being added; 3/4 also happen to have a clean cell
  cross-check, only the didicosm/−a2 don't.
- Test layout: `__tests__/gab.test.ts` (Γᵃᵇ + catalog + the regression),
  `__tests__/solidSchema.test.ts` (cell-engine tests scoped to the screw-free
  worlds via a `SCREW_FREE` filter).

## Self-reflection

1. **What would you do with another session?** Fix the cell-engine screw bug in
   `lib/homology.ts` (isolate the boundary-orientation sign error under staggered
   reflected/rotated gluings) so the didicosm and second amphidicosm become
   dual-verified, then remove the experimental badge. Also visually confirm the
   BACK sign face from behind in a rotation world.
2. **What would you change about what you produced?** The `verified` flag now
   leans on the buggy cell engine's manifold cert — it's honest (demotes screw
   worlds) but means "experimental" really tracks "screw-free-ness," not a genuine
   second opinion. A second *independent* homology (e.g. a CW complex built from
   the free-action orbit directly) would be a truer cross-check than the cube
   cell complex.
3. **What were you not asked that you think is important?** Whether to rename the
   app ("Solid Worlds" vs *Manifold Walk*) — flagged in the prior progress note,
   still open. And whether the experimental worlds should be visually marked in
   the world picker, not just the HUD.
4. **What did we both overlook?** Initially, that a matching H₁/χ on a broken cell
   complex isn't a real cross-check — the reviewer caught the didicosm
   mislabeling. The lesson generalized: the cell complex can match invariants
   while failing its own manifold cert.
5. **What did you find difficult?** Pinning the cell-engine screw bug — it's
   intermittent across specs (some screw gluings are correct, some not), so I
   chose to quarantine it behind Γᵃᵇ rather than chase it this session.
6. **What would have made this task easier?** The authoritative Conway–Rossetti
   platycosm H₁ table on hand (to name survivors directly instead of by
   elimination), and a headless harness that can drive the walker to an arbitrary
   pose for visual checks.
7. **Follow-up value:** MEDIUM — the shipped catalog is correct and green, but two
   worlds remain experimental pending the cell-engine fix, and the −a2 name wants
   a reference confirmation.
