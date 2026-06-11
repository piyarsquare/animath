---
kind: three-hats
session: 2026-06-10-S01
date: 2026-06-10
title: Convergence analysis — sign-through-the-floor orientation, three-hats review of Polygon Worlds
branch: claude/polygon-sign-orientation-50exno
slug: polygon-sign-orientation-50exno
status: completed
build: n/a
app: polygon-worlds
---

# Convergence analysis — orientation in Polygon Worlds

## Plan under review

<details><summary>Original request</summary>

"This session is going to focus on the polygon world and I want you to use the
start session skill space I want to talk about what happens to a sign when
viewed through the floor. is it rotated by 180 degrees or is it reflected? I
think there are some residual issues in the app regarding orientation and how
it is expressed in this space. please apply the three hats review to the
polygon world application"

</details>

The three expert reports this synthesizes:

- [Framework Maintainer](2026-06-10-S01-expert-maintainer.md)
- [Architecture & Quality Consultant](2026-06-10-S01-expert-consultant.md)
- [Math-Viz & Pedagogy Expert](2026-06-10-S01-expert-pedagogy.md)

> [!IMPORTANT]
> **Headline answer, unanimous:** a sign viewed through the floor is
> **reflected (mirror-reversed) — always, never merely rotated 180°.** The back
> view of any flat glyph is its front view composed with an orientation-reversing
> map; *which* mirror axis you perceive depends on how you got underneath
> (pitch over vs walk around — the two readings differ by a half-turn, which is
> the source of the folk confusion), but the chirality reversal is
> viewpoint-invariant. "Rotated by 180°" is true only of the 3D **motion**: the
> transparency flip that carries a plaque between faces is a det+1 rotation of
> ℝ³ whose restriction to the sheet is a det−1 reflection — in 3D a rotation,
> on the 2D sheet a reflection. And glass never mirrors *objects*: only ink
> read from its back side reverses. The pedagogy report proves this with
> explicit camera frames and proposes wording for the explainer.

## 1 · Points of agreement (high confidence)

All three experts, working independently, converged on:

| # | Finding | Where |
|---|---|---|
| 1 | The user's suspicion is **correct**: residual orientation issues exist, concentrated in the spherical and hyperbolic presenters. The euclidean (torus/Klein) presenter is clean and is the reference implementation of the S06 doctrine. | all three |
| 2 | **Hyperbolic below-floor decor is a genuine chirality bug**: `bj.scale.set(sc, -sc, sc)` (`hyperbolic.ts:294`, `:308`) is the baked improper transform S06 banned. Worked consequence: under-glass corner plates read **forward** through the glass while the ink beside them correctly reads reversed — one of them is lying, and it is the plates. Fix: rigid turn-over + uniform scale. | all three |
| 3 | **`otherSide.ts` is dead in PolygonWorlds** (zero importers; only TopologyWalk uses its own copy) and its docstring narrates the abandoned mechanism — and mislabels it (`scale(1,−1,−1)` has det +1; it is a rotation, not a "planar mirror"). Delete it. | all three |
| 4 | **The regression guard cannot see any of this.** `scripts/trail-chirality.mjs` probes only the trail's freshest print, on 4 of 6 worlds, never decor, never the far side. Every bug found today ships green. Extend it (far-side assertion: *no left-handed print may ever render on the walking face; left-handed prints exist only below the glass*; a decor probe; sphere/genus-2 controls). | all three |
| 5 | **Prose has drifted from geometry**: the `hyperbolic.ts:39` header and `EXPLAINER.md:69–70` promise "decals mirror-reversed / numbers come back reversed" *on* glide tiles — false under the app's own settled semantics; stale comment at `euclidean.ts:60`; "mirror side / mirror tile" labels quietly re-teach the misconception ("I am now mirrored") the app exists to dispel — rename to "other face". | all three (wording fixes itemized by pedagogy §7) |
| 6 | The S06 ink-on-the-sheet mechanism, the geometry kernel, and the "mirror-reading only ever from a genuine det<0 render transform" law are sound and worth protecting; no new shared abstraction should be invented ahead of a concrete need. | all three |

## 2 · Points of tension — and their adjudication

> [!WARNING]
> The session lead's pre-review brief contained two **wrong expectations**, and
> the maintainer and consultant (who audited code mechanics) inherited them,
> while the pedagogy expert (briefed as the mathematical authority) refuted
> them with a computation the synthesis has independently re-verified. The
> refutations win; details below.

### T1 — ℝP² far side: should decor be mirrored? (No — the ink twin is the real bug.)

- **Maintainer + consultant** (following the lead's brief): far-side decor
  should be placed through the genuine det<0 `twinM4`, like the ink twin;
  proper-rotation placement is the bug.
- **Pedagogy (refutation, adopted):** the face-swapping deck of the thickened
  shell — `(x,t) ↦ (−x,−t)`, the twisted I-bundle — is **proper in 3D**: its
  differential at the shell is `2p̂p̂ᵀ − I` (eigenvalues +1 radial, −1, −1
  tangent), det **+1**. Verified independently by the synthesis. So rigid,
  un-mirrored far-side trees/columns/plates are exactly what the true deck
  produces — identical phenomenology to the far side of a Klein glide, which
  the user approved in S06. The genuine inconsistency the lead smelled is
  real, but inverted: **the ink twin uses −Id, the deck of the *untwisted*
  bundle ℝP² × I** — it preserves the radial coordinate, so mirror footprints
  render in open air **on the walking face**, teaching precisely the
  misconception ("crossing the seam mirrored your ink in place") the app was
  built against. Fix: the twin becomes `−s·Id` with
  `s = (R−LIFT)/(R+LIFT)` — mapping the lifted ink shell onto the *inner*
  radius at the antipode, so old prints hang under the glass, mirror-reversed,
  and Klein and ℝP² become one story.
- The consultant's independent observation that "the face is a Z/2
  co-orientation datum the deck matrix −Id cannot supply" in fact *supports*
  the adjudication: the model-swap decor was right all along.

> [!CAUTION]
> Implementation note for the twin fix: build the matrix as
> `new THREE.Matrix4().makeScale(−s, −s, −s)` — do **not**
> `multiplyScalar(−s)` the existing 4×4 (that scales the homogeneous row too).
> The twin must be rebuilt when `setRadius` changes R.

### T2 — Hyperbolic above-floor decor on det<0 tiles: mirror it? (No — fix the prose.)

- **Maintainer + consultant:** flipped tiles show un-mirrored chiral badges,
  contradicting the file header and EXPLAINER — route decor orientation
  through the det<0 tile transform.
- **Pedagogy (refutation, adopted):** by the settled Klein semantics, the
  above-floor content of a flipped tile is the *other face walked directly*:
  bottom-face decor carried up by (rigid authoring turn-over) ∘ (transparency
  flip) — two proper motions whose in-plane composition is (reflection) ∘
  (reflection) = rotation. Columns and Roman plates on glide tiles must read
  **upright and un-mirrored**, exactly as the code renders and exactly as
  `euclidean.ts:180–186` documents. Applying a mirror there would
  re-introduce, in hyperbolic dress, the "mirror-written plaques on the
  walking face" bug the user caught in S06. **The header and EXPLAINER
  sentences are the bug** — rewrite them: *glide tiles wear the other face's
  skin, upright; the reversed numbers are underneath, through the glass*
  (true on screen once the below-floor fix from §1.2 lands).

### T3 — Remedy shape: shared seam vs minimal per-presenter fixes

- **Consultant:** introduce a `sheetPose.ts` seam (det+1 frames + explicit
  `face`) and route hyperbolic + spherical decor through it; pure no-WebGL
  `verify-decor.ts` battery first.
- **Maintainer:** smallest fixes per presenter; "share the law and the test,
  not a helper."
- **Adjudication:** the T1/T2 refutations remove the seam's main motivation —
  above-floor decor needs *no* mirror routing, and spherical decor placement
  stays as-is. What remains for a seam is the azimuth-equivariance wart
  (decor attitude ignores the deck's rotational part — pedagogy §5c, ranked
  polish by all). **Adopt the maintainer's shape now** (two local geometry
  fixes + guards + prose), and revisit the consultant's seam only if/when the
  azimuth fix is taken up. The consultant's *test-first* instinct survives
  intact: extend the guards before touching geometry, and watch them go red.

### T4 — Severity

Maintainer HIGH · consultant MEDIUM · pedagogy HIGH. The pedagogy framing
decides it: the ℝP² twin is not a wart but an actively misleading picture in
the app's core demonstration. **HIGH.**

## 3 · Blind spots (none of the three addressed)

1. **No expert ran the app.** All findings are static-analysis + geometry; the
   worked consequences (forward-reading under-glass plates; open-air mirror
   prints) should be confirmed with `?polydebug` screenshots before and after
   the fixes — the S06 lesson ("my screenshots verified frames seconds after
   the crossing, never the crossing instant") generalizes: probe the exact
   claimed symptom.
2. **Masking interactions when fixing in sequence.** The consultant warned the
   hyperbolic missing-rotation currently masks the baked mirror for some decor;
   the below-floor fix must be validated per decor *kind* (plates lie in-plane,
   badges stand vertical — they fail differently under `scale.y = −1`).
3. **The sphere world (orientable, χ=2) as a control** appears in no report's
   test plan beyond "add missing worlds": its invariant — *your own ink can
   never end up behind the glass* — is the cheap negative control for the twin
   fix.
4. **The vertex-plate holonomy ring** (pedagogy §5c) doubles as a candidate for
   the open S06 curvature-demonstration decision; nobody connected the two
   explicitly. Worth raising when the user picks a curvature demo.

## 4 · Recommended action (ranked, illumination per line of code)

1. **Guards first, red first**: extend `trail-chirality.mjs` with the far-side
   ℝP² assertion and an under-glass decor probe; add sphere + genus-2
   controls. Confirm they fail on today's code.
2. **ℝP² ink twin → `makeScale(−s,−s,−s)`**, `s = (R−LIFT)/(R+LIFT)`, rebuilt
   on radius change (one matrix; converts the app's worst
   misconception-generator into its best demonstration).
3. **Hyperbolic below-floor decor → rigid turn-over** + uniform scale
   (restores "through-glass text reads backwards" in the χ<0 worlds).
4. **Prose pass** (zero risk): the "Through the glass" explainer paragraph
   answering the user's question (pedagogy §8 has draft text); fix the two
   false "mirror-reversed on glide tiles" claims; rename "mirror side/tile" →
   "other face"; fix `euclidean.ts:60`; delete `otherSide.ts`; American
   spellings in `decor.ts`/EXPLAINER; write the one-line law into
   `inkTrail.ts`'s header: *deck = proper in 3D; orientation reversal only as
   its restriction to the sheet; mirror-reading only through glass.*
5. **Polish, optional:** hyperbolic decor azimuth equivariance (and only then
   reconsider the consultant's `sheetPose` seam).

## Verdict

The user's instinct was right twice over: there *are* residual orientation
issues, and the rotated-vs-reflected question is exactly the right probe — the
two real geometry bugs (ℝP² ink twin on the wrong bundle; hyperbolic baked
under-floor mirror) are both places where the code answers "rotated" (or
nothing) where the math answers "reflected through the glass." Equally
important: two of the lead's candidate *fixes* would have re-broken
user-approved behavior; the review structure caught that before any code was
touched. Fix the twin, fix the turn-over, fix the words, and grow the guard so
none of it can silently regress.

## Self-reflection

1. **What would you do with another session?** Implement §4 in order —
   guards red, twin fix, turn-over fix, prose — and verify each with
   `?polydebug` screenshots of the exact claimed symptom (under-glass plate
   reading; seam-crossing revisit of old ink).
2. **What would you change about what you produced?** The lead's brief stated
   the ℝP²/hyperbolic expectations as near-conclusions; two of three experts
   inherited them. Candidate findings should be handed to experts as *open
   questions with the opposing case stated*, and the mathematical-authority
   framing that let the pedagogy expert dissent should be given to all three.
3. **What were you not asked that you think is important?** Whether
   TopologyWalk — which still *uses* its `otherSide.ts` and the old engines —
   has the same baked-mirror class of bugs; this review was scoped to
   PolygonWorlds only.
4. **What did we both overlook?** Run-time verification. Every claim here is
   static; the S06 history shows orientation bugs in this app are found by
   *walking*, not by reading.
5. **What did you find difficult?** Adjudicating T1: three self-consistent
   stories (mirror the decor / mirror the ink / both fine) differ only in
   which bundle over ℝP² the shell realizes; the det computation of the
   face-swapping deck's differential was the only reliable arbiter.
6. **What would have made this task easier?** A written statement of the app's
   orientation law in the source tree (it lives only in the S06 handoff);
   recommendation §4.4 adds it to `inkTrail.ts`.
7. **Follow-up value:** HIGH — two well-scoped geometry fixes and a guard
   extension are specified but not yet implemented; until they land, the app
   actively teaches a misconception on ℝP² and in the χ<0 under-glass view.
