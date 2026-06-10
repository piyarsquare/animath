---
kind: progress
session: 2026-06-10-S01
date: 2026-06-10
title: Polygon Worlds — sign-through-the-floor orientation question + three-hats review
branch: claude/polygon-sign-orientation-50exno
slug: polygon-sign-orientation-50exno
status: in-progress
build: unknown
followup: null
pr: null
app: polygon-worlds
---

# Polygon Worlds — sign-through-the-floor orientation question + three-hats review

## Session purpose

Settle the question: when a sign is viewed *through the floor* in Polygon
Worlds, should it appear rotated by 180° or reflected? The user suspects
residual orientation issues in how chirality is expressed in the app. Then
apply the three-hats review to the Polygon Worlds application as a whole.

## Previous session

First tracked session on this branch. The latest handoff overall is directly
relevant: [2026-06-09-S06 — ink-on-the-sheet trail](../../handoff/polygon-worlds-spherical-p2-qgExR/2026-06-09-S06-ink-on-the-sheet-trail.md)
(branch `claude/polygon-worlds-spherical-p2-qgExR`) — the trail was rebuilt as
"one canonical trail, no mirror flags", the Klein glide deck became a rigid
π-rotation ("transparency flip"), and the invariant was set: *backwards text
only ever appears through the glass*. Open items there: the curvature-
demonstration choice (holonomy square recommended, undecided) and a parked
camera/headlamp bug.

## Working notes

### 🟡 milestone · 22:40 — Three-hats review complete; synthesis written
**Why:** All three expert reports returned; convergence analysis adjudicates
their disagreements.

Reports: [maintainer](2026-06-10-S01-expert-maintainer.md) ·
[consultant](2026-06-10-S01-expert-consultant.md) ·
[pedagogy](2026-06-10-S01-expert-pedagogy.md) ·
[synthesis](2026-06-10-S01-expert-synthesis.md).

**Unanimous:** through-the-floor = reflected, always; hyperbolic below-floor
`scale(sc,−sc,sc)` is a real baked-mirror bug; `otherSide.ts` is dead + stale;
the chirality guard sees none of it; prose has drifted (the "mirror-reversed
on glide tiles" claims are false).

**Adjudicated against the lead's brief (pedagogy's refutations win, verified
by direct computation):** the ℝP² face-swapping shell deck is *proper* in 3D
(dF = 2p̂p̂ᵀ − I, det +1), so far-side decor is chirally correct as rendered —
the real bug is the **ink twin using −Id (the untwisted bundle)**, which
floats mirror footprints on the walking face; fix = twin → −s·Id,
s = (R−LIFT)/(R+LIFT). Likewise hyperbolic above-floor det<0 decor is correct
un-mirrored (Klein-approved semantics); the prose is what must change. Two of
the lead's candidate fixes would have re-broken S06-repaired behavior.

**Recommended order:** guards red-first → ℝP² twin fix → hyperbolic rigid
turn-over → prose pass (incl. "Through the glass" explainer paragraph) →
optional azimuth polish.

### 🔵 finding · 21:55 — Pre-review investigation: the answer is "reflected," and three residual suspects found
**Why:** Before dispatching the three hats, establish the geometry and locate the
code that expresses it, so the experts review concrete claims instead of vibes.

**The math.** A sign viewed through the floor is **reflected (mirror-reversed),
never merely rotated 180°.** The back view of any flat glyph composes its front
appearance with an orientation-reversing map of the visual plane; which mirror
*axis* you perceive depends on how you got underneath (turning around reads as a
left–right flip, pitching over as a top–bottom flip — the two differ by an
in-plane π-rotation, the source of the usual confusion), but the chirality
reversal is viewpoint-invariant. "Rotated by 180°" is correct only in a
different sense: the rigid **transparency flip** (π about an in-plane axis) that
carries a physical plaque from one face to the other is a det+1 motion of
3-space whose restriction to the sheet is an orientation-reversing (glide)
isometry — *in 3D it's a rotation; on the 2D sheet it's a reflection.* Third
distinction: glass only mirrors ink **on** the sheet; a 3D object *behind*
glass is seen as it is, and a vertical plaque read from its back is reflected
because back-views of flat glyphs always are — not because of the glass.

**Residual suspects in the code** (to be verified/refuted by the review):

1. **`presenters/hyperbolic.ts` `placeDecor` (≈ lines 286–309)** — above-floor
   decor is placed by **position + uniform scale only**: the in-plane mirror of
   a det<0 tile (and even the rotation of a det>0 tile) is never applied to the
   decor's orientation, though the header comment (line 37) claims "decals
   mirror-reversed." This is the same class of bug as the old Klein
   `scaleY(−1)` deck. Below-floor decor uses `scale.set(sc, -sc, sc)` — the
   **baked mirror S06 banned** in the euclidean presenter ("never
   `scale.y = −1`").
2. **`presenters/spherical.ts` `buildMarkers` (≈ lines 117–146)** — on ℝP² the
   antipodal decor copies are placed by **proper** shortest-arc rotations
   (`setFromUnitVectors`), not through the genuine det<0 deck (`twinM4`) that
   the ink-trail twin uses — so far-side chiral badges/Roman plates likely read
   **un-mirrored** beside genuinely mirrored footprints.
3. **`otherSide.ts`** — dead module (no importers in PolygonWorlds), whose doc
   comment still describes the abandoned `scale(1,-1,-1)` per-cell mirror
   story, contradicting the current rigid-flip invariant.

The euclidean presenter itself appears to honor the S06 invariant (rigid
π-rotation deck; sheet-coordinate ink; "backwards text only ever appears
through the glass").

### 🟣 decision · 21:58 — Dispatching the three-hats review
**Why:** The user asked for the full three-lens review of Polygon Worlds with
the orientation question as the focus; the suspects above go to the experts as
claims to check, not conclusions.

### 🟡 milestone · 21:37 — Session opened; orienting
**Why:** /start-session — read the S06 ink-trail handoff, created this report.

The session focus continues the S06 chirality story but probes a specific
worry: the appearance of a sign seen through the floor (rotated π vs.
reflected) and whether the app still expresses orientation incorrectly
anywhere. Plan: first analyze the geometry question, inspect the relevant
transforms (`presenters/euclidean.ts`, `decor.ts`), then run `/three-hats`
on the Polygon Worlds app.
