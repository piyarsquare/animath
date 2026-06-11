---
kind: three-hats
session: 2026-06-10-S01
date: 2026-06-10
title: Three Hats · Pedagogy & Math-Viz — a sign through the floor is reflected, and where the renderer still lies about it
branch: claude/polygon-sign-orientation-50exno
slug: polygon-sign-orientation-50exno
status: completed
build: n/a
followup: high
pr: null
app: polygon-worlds
---

# Three Hats · Pedagogy & Math-Viz — a sign through the floor is reflected, and where the renderer still lies about it

## Plan under review

<details>
<summary>Original request</summary>

"This session is going to focus on the polygon world and I want you to use the start session skill space I want to talk about what happens to a sign when viewed through the floor. is it rotated by 180 degrees or is it reflected? I think there are some residual issues in the app regarding orientation and how it is expressed in this space. please apply the three hats review to the polygon world application"

</details>

## Executive summary

This review settles the headline question rigorously, restates the app's orientation
invariant in the form I believe it actually has (the deck transformations are **proper
motions of 3-space whose restriction to the sheet is orientation-reversing** — not
improper 3D maps), and audits every place chirality is expressed. The verdict in one
breath:

- **A sign read through the floor is REFLECTED, always** — never "merely rotated 180°."
  The 180° answer is true of a *different object* (the 3D motion that carries a plaque
  from one face to the other), and conflating the two senses is exactly the confusion
  the app exists to dissolve. The explainer should address it head-on; it currently
  doesn't (§1, §8).
- **The euclidean presenter is the gold standard.** Its semantics — flipped cell = rigid
  transparency flip, det+1 in 3D, det−1 on the sheet; backwards text only through the
  glass — is mathematically true and is the *teachable* model (§2, §3).
- **Candidate issue 2 (ℝP²) is real but mislocated.** The far-side badges and Roman
  plates are *correct* as rendered (un-mirrored — by the app's own settled Klein
  semantics they must be, and I refute the lead's expectation that they should read
  reversed). The actual bug is the **ink twin**: `twinM4 = −Id` is the deck of the
  *untwisted* bundle ℝP² × I, while the decor and the explainer commit to the *twisted*
  bundle. The result: mirror footprints lying in the open air on the face you walk —
  the precise misconception ("crossing makes my ink mirrored in place") the app was
  built to dispel. One-matrix fix (§4).
- **Candidate issue 1 (hyperbolic) is half real, and the real half is severe.** The
  below-floor `scale.set(sc, −sc, sc)` is the same baked-mirror bug class S06
  exterminated from the euclidean presenter: under-glass numerals read **forward** in
  the hyperbolic worlds while the ink beside them correctly reads reversed — the same
  pane of glass contradicts itself. The above-floor half of the claim I **refute**:
  un-mirrored decor on det<0 tiles is *correct*; it is the file header and the
  EXPLAINER sentence ("numbers come back reversed") that are wrong (§5).
- `otherSide.ts` is dead in this app and its docstring is mathematically wrong on its
  own terms (it calls `scale(1,−1,−1)` — a rotation — "a planar mirror") (§6).
- The minimap, chart pull-backs, ink frames, and Roman-surface inset are sound; a few
  labels ("mirror side") and two prose claims need renaming/rewriting (§7).

## 1 · The headline question: rotated 180° or reflected?

Set the glyph in the floor plane Π (the xz-plane), unit normal **n** = ŷ pointing up,
and read it through a camera with gaze **g** and image-up **u**; the image-right is
**r** = **g** × **u**. Three propositions settle everything.

**Proposition A (back-view reversal — the answer is "reflected").** The map taking the
above-view image to the below-view image is an orientation-reversing isometry of the
picture plane, for *every* pair of viewing attitudes. Concretely:

```text
above, facing north:  g = −ŷ, u = −ẑ  ⇒  r = (−ŷ)×(−ẑ) =  x̂   image basis (east, north)
below, facing north:  g = +ŷ, u = −ẑ  ⇒  r = (+ŷ)×(−ẑ) = −x̂   image basis (west, north)
below, facing south:  g = +ŷ, u = +ẑ  ⇒  r = (+ŷ)×(+ẑ) =  x̂   image basis (east, south)
```

Going underneath flips the sign of **g**, hence the sign of **r** relative to **u** —
the image basis changes orientation, det = −1, no matter how you got there. A flat
glyph viewed from behind is mirror-reversed. Period. It is never the 180°-rotated
version: the in-plane π-rotation is (x,z) ↦ (−x,−z), det = +1, and neither row above
produces it.

**Proposition B (the axis is an artifact; the chirality flip is the invariant).** The
two below-views differ from each other by exactly an in-plane π-rotation: *pitching
over* (still facing north) reads as a left–right flip (east↔west); *walking around*
(now facing south) reads as a top–bottom flip (north↔south). This is the source of
the lay confusion the user is circling: someone comparing a top–bottom-flipped "E"
to the original can talk themselves into "it's just rotated." It isn't — an F or R
gives it away instantly — but the *apparent mirror axis* genuinely depends on the
viewer's approach, while the chirality reversal does not. The lead's analysis of this
point is correct and I endorse it.

**Proposition C (where "rotated 180°" IS the right answer).** The rigid motion that
carries a physical plaque from face-up to face-down — the **transparency flip**, a
π-rotation about an axis lying in Π — is a det+1 motion of ℝ³ whose *restriction to
the plane* is the reflection across that axis (det −1 in O(2)). Reflections of the
plane extend to rotations of space: that single sentence is the conceptual hinge of
this entire app, because the Klein bottle's glide reflection (2D, improper) is
realized in the renderer as the transparency flip (3D, proper) — `euclidean.ts:312`,
`S.makeRotationAxis(glideDir, Math.PI)`. So the user's two candidate answers are both
right *about different objects*: the **viewing relation** between the two readings is
a reflection; the **motion** that explains how a thing got to the other face (or how
you got under it) is a 3D rotation.

**Proposition D (ink on glass vs object behind glass).** Transmission through glass
preserves the chirality of 3D objects — a left shoe behind a window is still a left
shoe; glass is not a mirror. What reverses is the *reading of 2D ink*, and only
because you are on the anti-normal side of the figure. The lead's third distinction
is correct. The app's covenant — "you never become mirrored; you are looking at the
back of your own ink" — is precisely Proposition D promoted to a world model.

> [!IMPORTANT]
> **Verdict on the lead's answer: endorsed, with one refinement.** Everything in the
> lead's headline paragraph checks out. The refinement (load-bearing for issues 1–2
> below): the lead later calls the ℝP² shell deck "improper." It is not — see §2. The
> deck transformations of this app's sheets are all **proper in 3D**; the orientation
> reversal lives entirely in their restriction to the surface.

**Is the distinction surfaced anywhere in the app?** No. EXPLAINER.md uses the
through-the-glass story (correctly) but never separates the three senses, and never
points out the best control experiment the app already contains: **on the torus**
— fully orientable — looking down through the glass shows the Roman corner numerals
mirror-reversed. Nothing topological has happened; that is Proposition A in a flat
orientable world. The topology enters only in whether *your own ink* can end up on
the other face: impossible on the torus, inevitable on Klein/ℝP²/Dyck. §8 proposes
the paragraph.

## 2 · The invariant, restated precisely

The S06 invariant — "mirror-reading is only ever produced by a genuine det<0 render
transform" — is right but under-specified, because *which* determinant (2D-on-the-sheet
or 3D-ambient) matters. The audit below needs the sharp version, so here it is.

The app's world model is the **thickened sheet**: surface × interval, with trees-face
and columns-face. For a non-orientable surface the consistent choice is the **twisted
I-bundle** — the unique choice making the 3D world orientable, i.e. making "you never
become mirrored" *true* (ℝP² twisted-thickened is ℝP³ minus a ball, orientable; the
untwisted ℝP² × I is a non-orientable 3-manifold in which the walker's own body would
return mirrored). The deck transformations of the rendered cover are then:

| World | Deck element on the cover | det in ℝ³ | det on the sheet | Swaps faces? |
|---|---|:--:|:--:|:--:|
| Torus | lattice translations | +1 | +1 | no |
| Klein (glide) | translation ∘ π-rotation about the glide axis | **+1** | **−1** | yes |
| ℝP² | antipodal ∘ radial face-swap | **+1** | **−1** | yes |
| Dyck / cross-caps (glide) | hyperbolic transparency flip along the glide geodesic | **+1** | **−1** | yes |

Check the ℝP² row, since the lead flagged it as the subtlest: with the shell as
S² × [−ε, ε] at radius R + t, the deck is (u, t) ↦ (−u, −t). Its differential in the
frame {tangent e₁, e₂, radial e_r} is (−1, −1, −1)·(face-swap correction): the map is
(radial inversion about radius R) ∘ (−Id), and det = (−1)·(−1)·… = (+1). Equivalently:
the antipodal map on S² is orientation-reversing **as a surface map** (it reverses the
outward coorientation), and composing with the radial swap restores the ambient
orientation. So:

> [!IMPORTANT]
> **The corrected invariant.** Every deck transformation of the thickened sheet is a
> **proper** motion of 3-space (det +1) — nothing in the scene graph should ever carry
> a baked improper transform. Orientation-reversal exists only as the **restriction of
> a proper 3D motion to the 2D sheet** (the transparency flip), and mirror-*reading*
> exists only as **viewing flat ink from its anti-normal side** (through the glass).
> The two statements together imply the user-facing rule: *backwards text only ever
> appears through the glass* — and they imply it for orientable worlds too.

This is exactly what the euclidean presenter implements, and it is the yardstick the
other two presenters must be measured against. It also corrects the session lead's
framing of issue 2: since the ℝP² shell deck is proper, the far-side plates must read
**un-mirrored** on the face you walk — not mirror-reversed as the lead expected.

## 3 · Audit: the euclidean presenter (reference implementation — clean)

`presenters/euclidean.ts` realizes the invariant end to end. Verified by reading the
transforms, not the comments:

- Flipped cell = `makeRotationAxis(glideDir, π)` (`euclidean.ts:312`): proper, face
  swap + in-plane reflection across the glide axis in one motion. The glide axis is
  taken parallel to the glide generator's translation (`euclidean.ts:88-95`) — correct;
  a glide reflection's mirror line is parallel to its translation.
- Bottom-face decor turned over **rigidly** about the same axis (`euclidean.ts:186-198`),
  so flip ∘ turn-over = translation: on a flipped cell, columns and Roman plates come up
  upright and un-mirrored. This is the user-approved S06 behavior and the semantic
  anchor for everything below.
- Ink stamps pulled back through the *current home-cell transform* into sheet
  coordinates (`euclidean.ts:319-335`): on the flipped face the in-plane numbers are
  reflected across the glide axis and the frame handed to `setQuad` is genuinely
  left-handed with normal down (`euclidean.ts:155-163` — `leftV` negated with face).
  Mirror ink in the buffer is produced by a real pull-back through a real reflection.
  ✅ correct.
- The fold stays a pure translation (`euclidean.ts:262-287`); the chart applies
  `reflectInPlane` — a genuine det<0 *2D* map — for the classic exit-at-v /
  re-enter-at-1−v (`euclidean.ts:342-357`). ✅ correct, and the minimap arrows agree.
- Control experiment present: on the torus, under-glass Roman plates (rigidly turned
  over) read reversed from above — Proposition A on an orientable world. ✅.

I found nothing to fix here. Two-sentence appreciation as the pedagogy reviewer: the
fact that the *same* π-rotation is simultaneously "the Klein deck," "how you turn over
a transparency," and "a 2D reflection" is the best single idea in this app, and the
euclidean code now states it three times in three registers (cell transform, decor
turn-over, ink pull-back) consistently.

## 4 · Issue 2 (ℝP², `presenters/spherical.ts`): verified — but the bug is the ink twin, not the plates

**What the lead claimed:** antipodal decor copies are placed by proper shortest-arc
rotations rather than through the genuine det<0 `twinM4`; since the shell deck is
improper, far-side badges and Roman plates *should* read mirror-reversed, and the app
showing them un-mirrored beside genuinely mirrored footprints means the cover
contradicts itself.

**What is actually true** (the contradiction is real; its resolution is inverted):

1. **The decor is chirally correct as rendered.** `buildMarkers` (`spherical.ts:117-146`)
   places the far-side copies at the genuine deck direction (`ad = deckDir(d)` *does*
   go through `twinM4`, `spherical.ts:77-78`) and gives them proper-rotation attitudes
   (`place()`, `spherical.ts:113-116`). By §2 the true deck is **proper in 3D**, so its
   images of trees/columns/plates are rigid, un-mirrored copies — the same chirality
   class the shortest-arc rotation produces. The only deviation from the exact deck
   image is **azimuth** (which way the plate's numeral faces), the same minor
   equivariance wrinkle as §5c. A walker crossing the seam should — and does — find
   Roman plates and columns that read **upright and un-mirrored**, exactly as on the
   far side of a Klein glide. That is the settled, user-approved semantics of this app.

2. **The ink twin uses the wrong deck.** `twinM4` is −Id (the only free isometric
   involution of S²; `develop()` finds it as the det<0 element). But −Id **preserves
   the radial coordinate**: it maps ink floating at radius R + LIFT (`writeStamp`,
   `spherical.ts:169-173`, normal = outward `posU`; `inkTrail.ts:52`, LIFT = 0.12) to
   ink floating at radius R + LIFT *at the antipode* — i.e. **onto the outer, walked
   face**. −Id is the deck of the *untwisted* bundle ℝP² × I, the model in which the
   far hemisphere would wear trees again and the walker's own body would return
   mirrored. The decor (trees↔columns swap at the antipode) and EXPLAINER.md ("your
   old footprints now show **through the glass floor**, mirror-reversed") both commit
   to the *twisted* model. The render therefore mixes two different quotients:
   **columns on the far side (twisted) + open-air mirror footprints (untwisted).**
   The cover contradicts itself, exactly as the lead observed — but the fix is to fix
   the twin, not to mirror the plates.

3. **Why it matters pedagogically (this is the worst lie in the app).** With the −Id
   twin, a walker who crosses the seam and revisits old ground finds mirror-reversed
   prints lying *on the face they are walking*, interleaved at the same LIFT height
   with their new forward prints. The picture says: "crossing the seam mirrored your
   ink in place." That is precisely the misconception — *crossing a flipped edge ≠
   becoming mirrored* — the entire ink-on-the-sheet redesign exists to dispel. With
   the true deck, those prints hang **under the glass**, mirror-reversed, and the
   Klein and ℝP² experiences become one story.

4. **The fix is one matrix.** The true deck near the shell maps a tangent quad at
   radius R + LIFT to its antipodal image at radius R − LIFT with the *same* in-plane
   (mirrored) glyph — to first order in LIFT/R it is

   ```ts
   // spherical.ts — the ink twin must be the face-swapping deck, not −Id:
   const s = (R - LIFT) / (R + LIFT);
   inkTwin.matrix.copy(twinM4).multiplyScalar(...)   // i.e. M = −s·Id (det = −s³ < 0)
   ```

   −s·Id maps the ink shell R + LIFT exactly onto R − LIFT at the antipode; its
   in-plane action equals the true deck's (both are the antipodal differential, the
   genuine surface mirror), and the residual difference from the radial-swap deck is
   second order for a zero-thickness decal. The twin then reads mirror-reversed
   **through the glass** from the walking side — chirality produced by a genuine
   det<0 transform, position produced by the genuine face swap. (Note the twin must be
   rebuilt when `setRadius` changes R.) The strict chirality script never caught this
   because it probes only the main mesh (`debugProbe`, `spherical.ts:274`); it should
   gain a far-side assertion: *no left-handed print may ever render on the walking
   face; left-handed prints exist only below the glass.*

**Answer to the lead's direct question** ("what should a walker crossing the seam see
on the floor plates?"): Roman plates, upright, un-mirrored, walked directly — and the
Arabic plates of the same corners beneath the glass, mirror-reversed; old footprints
likewise beneath the glass, mirror-reversed, at the antipodes of where they were laid.
Identical phenomenology to crossing a Klein glide edge. The seam is not a magic
mirror; it is the edge of the chart.

## 5 · Issue 1 (hyperbolic, `presenters/hyperbolic.ts` `placeDecor`): split verdict

### 5a · Below the floor: a genuine chirality lie — confirmed, severity high

`placeDecor` places under-floor decor with `bj.scale.set(sc, -sc, sc)`
(`hyperbolic.ts:294` and `:308`) — a **baked improper transform**, the exact bug class
S06 removed from the euclidean presenter ("decor that grows down must be rigidly
rotated, never `scale.y = −1`"). Consequence, worked through for the corner plates:
the plate's glyph lives in the horizontal plane; `scale.y = −1` leaves its in-plane
content untouched and merely drops it below the floor, so **viewed from above through
the glass it reads forward**. The truthful rigid turn-over reflects the in-plane
content, so through the glass it reads **reversed** — as it does in the euclidean
worlds and as Proposition A demands for the back of any flat figure. Meanwhile the
hyperbolic **ink** is projected through genuinely det<0 composed transforms
(`rebuildInk`, `hyperbolic.ts:321-343` — derived normal `f×l` points down, mirror ink
under the glass, correct ✅). So in crosscap3, the same pane of glass shows
forward-reading plates beside reversed-reading footprints. One of them is lying, and
it is the plates.

**Fix:** replace the baked mirror with a rigid turn-over + uniform scale — e.g.
`bj.quaternion.setFromAxisAngle(X_AXIS, Math.PI); bj.scale.setScalar(sc)`. The choice
of in-plane axis affects only azimuth (see 5c); the load-bearing property is det+1.

### 5b · Above the floor on det<0 tiles: the code is right, the prose is wrong — lead's claim refuted

The lead expected the in-plane mirror across the glide to be applied to badges and
corner plates on flipped tiles, citing the file header ("decals mirror-reversed",
`hyperbolic.ts:39`) and EXPLAINER.md ("glide tiles wear the mirror skin — numbers come
back reversed", `EXPLAINER.md:69-70`). By the settled Klein semantics this expectation
is **wrong**: the above-floor content of a flipped tile is the *other face walked
directly* — bottom-face decor carried up by (rigid turn-over) ∘ (transparency flip),
a composition of two proper motions whose in-plane part is (reflection) ∘ (reflection)
= rotation. The columns and Roman plates of a glide tile must read **upright and
un-mirrored**, exactly as the euclidean comment block states (`euclidean.ts:180-186`)
and exactly as the code currently renders them. Applying a mirror there would
re-introduce, in hyperbolic dress, the very "mirror-written plaques on the walking
face" bug the user caught in S06.

What must change is the **language**: `hyperbolic.ts:39` and the EXPLAINER sentence
both promise mirror-reversed numbers *on* the glide tiles. The truthful sentence is:
*glide tiles wear the other face's skin — columns and Roman plates, upright; the
reversed numbers are underneath, through the glass* (which, after 5a is fixed, will
actually be true on screen). Today the renderer satisfies neither reading of the
current sentence — on top it is un-reversed (correct, contradicting the prose), under
glass it is also un-reversed (incorrect, contradicting the prose) — a perfect storm of
claim/render mismatch the user was right to smell.

### 5c · All tiles: decor attitude ignores the deck's rotational part — minor, real

Every decor copy is placed by position + scale only (`hyperbolic.ts:286-309`); no
orientation from `Mtiles·γ` is ever applied. In the euclidean lattice this is exact
(the deck has no rotational part); in hyperbolic it is a genuine equivariance error —
the deck images of one corner plate face inconsistent azimuths across tiles. It is
chirality-safe (no mirror is introduced) and nearly invisible at decor scale, so I
rank it polish — but note it forfeits a teaching opportunity: at a polygon vertex,
the ring of 2n tile-images of the corner plates would exhibit the rotational holonomy
that *is* the angle-sum story. Fix opportunistically by applying the in-plane rotation
part of the composed transform at each prop position.

## 6 · Issue 3 (`otherSide.ts`): confirmed — dead and stale

No import of `PolygonWorlds/otherSide.ts` exists anywhere in the app (only
TopologyWalk imports *its own* copy). Beyond being dead, its docstring is wrong in a
way this review should put on record: it describes the flat under-side as "reflected
by `scale(1, −1, −1)` — a planar mirror through the floor" (`otherSide.ts:12-14`).
`diag(1, −1, −1)` has det = **+1**; it is the π-rotation about x̂ — a transparency
flip, not a mirror. (Amusingly, the "wrong" old mechanism it documents was proper all
along; the module mislabels it.) Delete the file; if the normal-flip roadmap item ever
lands, re-derive the contract from the current presenters rather than this text.

## 7 · The remaining orientation surfaces — claim-by-claim audit

| Surface | Claim / behavior | Verdict |
|---|---|---|
| Ink frames (`inkTrail.ts:107-114`, cyan-left convention; `euclidean.ts:155-163`) | handedness of the frame is the chirality; no flags | ✅ true |
| Klein chart pull-back (`euclidean.ts:342-357`) | genuine 2D reflection; exit at v, re-enter at 1−v | ✅ true |
| ℝP² chart (`squareMap.ts:64-71`) | antipodal pull-back (−X, −Y) — in-plane this is a π-rotation, det +1; the orientation reversal rides the face swap, which the amber flag carries | ✅ correct (worth a comment) |
| Minimap `flipped` flag + amber marker | flags the face, not a mirroring of *you* | ✅ sound mechanism |
| Labels `· mirror side` / `· mirror tile` (`PolygonWorlds.tsx:414`, `:426`) | wording | ⚠ rename to **"· other face"** — "mirror side" quietly re-teaches "I am now mirrored", the exact wrong model; squareMap.ts:28 "mirror sheet" likewise |
| World panel: "Crossing a flipped edge swaps trees ↔ columns" (`PolygonWorlds.tsx:248`) | | ✅ true and well put |
| EXPLAINER: "old footprints show through the glass floor, mirror-reversed … you never become mirrored" (`EXPLAINER.md:30-33`) | | ✅ true on Klein; **false on ℝP² as rendered** until §4 lands |
| EXPLAINER: "the trail's antipodal image is its mirror twin" (`EXPLAINER.md:44`) | | ⚠ true of chirality, silent on the face; after §4, say "its mirror twin, on the other face" |
| EXPLAINER: "glide tiles wear the mirror skin (numbers come back reversed)" (`EXPLAINER.md:69-70`) | | ❌ wrong — rewrite per §5b |
| `hyperbolic.ts:39` header "(trees ↔ columns, decals mirror-reversed)" | | ❌ wrong — same rewrite |
| Roman-surface inset (`instruments/embeddingInset.tsx`) | "because the immersion identifies antipodes, near-side and mirror-side land on the same point" | ✅ true (x↦(xy, yz, zx) is even) and a lovely witness of x∼−x; it makes no chirality claim, correctly — the Roman surface could not honestly carry one (it is an immersion with cross-caps) |
| Decor design comments (`decor.ts:5-14`, `:110-119`) | "chiral decals read reversed only when seen THROUGH the sheet" | ✅ the right spec — the hyperbolic and ℝP² renderers just don't fully meet it yet |
| Spelling | `centre`/`colour` in EXPLAINER.md:64 and decor.ts comments | ⚠ CLAUDE.md mandates American spelling in prose *and* comments |

## 8 · What to teach, and the most illuminating fix

**Add a "Through the glass" paragraph to EXPLAINER.md** answering the user's question
in the app's own vocabulary. Proposed content (compressed):

> **Backwards, or just upside-down?** Any flat sign read from its back is
> **mirror-reversed** — try it on the torus: the Roman numerals under the glass read
> backwards, and nothing topological has happened. *Which* axis looks flipped depends
> on how you got underneath (pitch over: left–right; walk around: top–bottom — the two
> differ by a half-turn), but the reversal itself is unavoidable. Turning a plaque
> over is a **rotation** of space whose shadow on the sheet is a **reflection** — that
> one fact is the whole Klein bottle gluing. And glass never mirrors *things*: a
> column behind the floor is just a column; only ink read from behind reverses. The
> topology enters exactly here: on the torus your own footprints can never end up
> behind the glass — on the Klein bottle, ℝP², and the cross-cap worlds, they must.
> Meeting your own backwards footprints under the floor is the certificate that your
> world is non-orientable.

**Most illuminating fix, ranked** (illumination per line of code):

1. **§4, the ℝP² ink twin** (−s·Id). One matrix; converts the app's worst
   misconception-generator into its best demonstration, and unifies Klein and ℝP²
   into one experience — crossing *any* flipped edge sends your ink behind the glass.
2. **§5a, the hyperbolic under-floor rigid turn-over.** Restores "through-glass text
   reads backwards" in the χ<0 worlds and removes the plates-vs-ink contradiction.
3. **§8 explainer paragraph + §5b/§7 prose corrections + label rename.** Zero risk,
   directly answers the user's question for every future reader.
4. §5c azimuth equivariance and §6 deletion: polish.
5. **Guard it:** extend `scripts/trail-chirality.mjs` with the far-side assertion
   (cross the ℝP² seam; require the freshest *walking-face* print right-handed and
   any left-handed print to sit below the glass) so the twin deck can never silently
   regress to −Id.

## Verdict

**Endorse.** The lead's answer to the headline question (reflected, always; axis
ambiguity explains the folk confusion; 180° is true only of the 3D motion; glass
mirrors ink, not objects) — adopt it, and put it in the explainer. The euclidean
presenter and the ink-on-the-sheet mechanism are mathematically true and are the
right pedagogy; the closed-form invariant of §2 ("deck = proper in 3D; reversal only
as restriction to the sheet; mirror-reading only through glass") is worth writing
into `inkTrail.ts`'s header as the one-line law of the app.

**Concerns.**
1. The ℝP² ink twin realizes the *untwisted* bundle while everything else realizes
   the *twisted* one — the rendered cover is two incompatible quotients at once, and
   the visible symptom (open-air mirror footprints on the walking face) teaches the
   precise falsehood the app was built against. This is the highest-value fix in the
   app right now.
2. The hyperbolic under-floor `scale(sc, −sc, sc)` is a baked improper transform —
   the bug class this codebase already exterminated once — and makes through-glass
   numerals read forward in the χ<0 worlds, contradicting both the euclidean worlds
   and the ink beside them.
3. Two pieces of prose (EXPLAINER hyperbolic sentence; hyperbolic.ts header) promise
   mirror-reversed numbers *on* glide tiles. The math says, and the settled Klein
   semantics agree: un-mirrored on top, reversed only underneath. Fix the words, not
   the geometry.

**Would change, concretely:** (1) twin matrix → −((R−LIFT)/(R+LIFT))·Id, rebuilt on
radius change, plus the far-side chirality regression; (2) rigid turn-over for
hyperbolic under-floor decor; (3) the "Through the glass" explainer paragraph and the
two prose corrections; (4) rename "mirror side/tile" → "other face"; (5) delete
`otherSide.ts`; (6) opportunistically, deck-rotation azimuths for hyperbolic decor —
and consider the vertex-plate holonomy ring as a future curvature demonstration
alongside the holonomy square already on the roadmap.

**Refuted from the brief:** far-side ℝP² badges/plates should *not* be mirrored
(§4.1); above-floor det<0 hyperbolic decor should *not* receive the in-plane glide
mirror (§5b); the thickened-shell deck is proper, not improper (§2). Each refutation
follows from the same invariant the prior session established — the candidate fixes,
applied as proposed, would have re-broken what S06 repaired.

## Self-reflection

1. **What would you do with another session?** Implement fixes 1–3 and the far-side
   chirality regression, then verify on screen (headless `?polydebug` walk across the
   ℝP² seam and a crosscap3 glide, screenshotting the under-glass plates) — this
   review is static analysis; the renderer deserves to be caught in the act.
2. **What would you change about what you produced?** I would have liked to include
   screenshots demonstrating the −Id twin's open-air mirror prints and the
   forward-reading hyperbolic under-plates; I argued them from the transforms instead
   of observing them, trading vividness for time.
3. **What were you not asked that you think is important?** Whether `develop()`'s
   "the det<0 element" is *unique* for richer words — for ℝP² the Z/2 deck makes
   `find()` safe, but a future free-word UI could hand `twinM4` a different improper
   element than the face-swap partner expects; the twin-deck construction should be
   derived per-element, not fished out by sign.
4. **What did we both overlook?** That the app already contains the perfect control
   experiment for the user's question — reversed Roman numerals under the *torus*
   floor — and never points the learner at it. The cheapest aha in the whole review
   is one sentence of explainer prose.
5. **What did you find difficult?** Keeping the four determinants straight (2D
   in-plane, 3D ambient, surface-with-coorientation, composed render transform) while
   auditing three presenters with three different realizations of "the same" deck;
   the ℝP² twisted-vs-untwisted bundle distinction took the longest to pin down and
   is exactly where the lead's framing and mine diverge.
6. **What would have made this task easier?** A single written statement of the §2
   invariant in the codebase (it currently lives diffused across five comment blocks);
   and the far-side chirality assertion existing already — both bugs found here are
   invisible to the current probe by construction.
7. **Follow-up value:** HIGH — the analysis identifies two render-level orientation
   bugs and refutes two of the brief's proposed fixes; if the implementing session
   acts on the brief instead of this report, it will re-break user-approved behavior.
