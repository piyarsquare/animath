---
kind: three-hats
session: 2026-06-10-S01
date: 2026-06-10
title: PolygonWorlds orientation review — Architecture & Quality Consultant hat
branch: claude/polygon-sign-orientation-50exno
slug: polygon-sign-orientation-50exno
status: completed
build: n/a
app: polygon-worlds
---

# PolygonWorlds orientation review — Architecture & Quality Consultant hat

## Plan under review

<details>
<summary>Original request</summary>

"This session is going to focus on the polygon world and I want you to use the
start session skill space I want to talk about what happens to a sign when
viewed through the floor. is it rotated by 180 degrees or is it reflected? I
think there are some residual issues in the app regarding orientation and how
it is expressed in this space. please apply the three hats review to the
polygon world application"

</details>

## Executive summary

The user's instinct is right, and the architecture explains exactly *why* it is
right. After S06, the **ink trail** has a principled orientation mechanism: one
canonical buffer, written from an explicit affine frame whose handedness *is*
the chirality, rendered only through genuine transforms (`inkTrail.ts`). The
**decor does not have that mechanism** — each presenter improvises its own
placement, and two of the three improvisations violate the invariant the trail
work established ("mirror-reading is only ever produced by a genuine det<0
render transform; decor that grows down is rigidly rotated, never
`scale.y = −1`").

I verified all three candidate issues in code, and they are real:

| # | Where | What | Severity |
|---|---|---|---|
| 1 | `presenters/hyperbolic.ts:271–315` | Above-floor decor placed by **position + uniform scale only** — the tile transform's rotation *and* reflection never reach the object's orientation; below-floor decor uses the banned `scale.set(sc, -sc, sc)` (lines 294, 308) | ❌ invariant violation, twice |
| 2 | `presenters/spherical.ts:113–146` | Antipodal/inner decor oriented by `setFromUnitVectors` (shortest-arc proper rotation, **arbitrary azimuth**), not by the genuine det<0 deck `twinM4` that the ink twin two paragraphs below uses | ❌ decor and ink disagree about the same deck map |
| 3 | `otherSide.ts` | Dead module (zero importers inside PolygonWorlds) whose doc *recommends* the abandoned `scale(1, -1, -1)` approach | ⚠ stale doc that contradicts the invariant |

The structural diagnosis: the S06 fix was applied **where the symptom
appeared** (the euclidean presenter, where the user saw mirror-written
plaques), and the invariant was written down in a handoff document rather than
given an enforcing seam in the code. The euclidean presenter honors it because
its render map is affine, so the scene graph *is* the seam (per-cell parent
matrices). The other two presenters have no equivalent seam, so each re-derives
orientation ad hoc — and gets it wrong in a different way.

The remedy I recommend is **not** per-presenter patching. It is to promote the
trail's own technique — *transport an explicit frame through the whole render
transform, let its handedness carry the chirality* — into a shared placement
seam (`sheetPose.ts`) that all decor flows through. The per-frame cost on the
hyperbolic side is ~2% of the projection work it already does. The verification
contract is a pure (no-WebGL) placement battery under `npm run verify`, plus a
`decorProbe()` twin of the existing `debugProbe()` for the headless harness.

## 1 · The geometry question, as an architecture requirement

The session lead's analysis is correct and I endorse it, with one sharpening
that matters for code: **"reflected" and "rotated 180°" are answers to two
different questions**, and the codebase must keep them distinct because it
implements both.

- *What does ink on the sheet look like from the other side?* **Reflected.**
  Viewing a flat glyph from behind composes its front appearance with an
  orientation-reversing map of the picture plane. Which mirror axis you
  perceive depends on how you got underneath; the chirality reversal does not.
- *What rigid motion carries a plaque from one face of the slab to the other?*
  **A π-rotation about an in-plane axis** — det+1 in 3-space, restricting to an
  orientation-reversing isometry of the sheet. This is `euclidean.ts:186–199`
  ("the transparency flip") and it is the only legal way to put 3D furniture on
  the underside.

The two compose: rigid flip (det+1 in 3D) = face swap × in-plane mirror. Drop
either factor and you get one of the two historical bugs — `scale.y = −1`
(keeps the face swap, drops the mirror: S06's Klein deck bug) or position-only
placement (drops both: today's hyperbolic decor). The invariant in
`docs/sessions/handoff/polygon-worlds-spherical-p2-qgExR/2026-06-09-S06-ink-on-the-sheet-trail.md`
encodes exactly this. The architecture question is: **where does the code make
dropping a factor impossible?** Today: nowhere.

## 2 · How orientation flows today — the consumption matrix

The producer side is sound. The kernel (`lib/realize.ts:149–165`) builds
side-pairing isometries whose `det < 0` is the single source of truth for
orientation reversal; `lib/invariants.ts` verifies `orientability ⇔ det signs`
(line 325) among 17 checks, run by `scripts/verify-geometry.ts`. `develop.ts`
enumerates deck elements uniformly. Every presenter consumes the *same* element
list. The trouble is entirely in **how each presenter converts a deck element
into an object pose**:

| Artifact | Euclidean | Spherical | Hyperbolic |
|---|---|---|---|
| Tile/edge geometry | parent matrix (`euclidean.ts:312–315`) | chart bake | per-frame `projectM(Mtiles, ·)` ✅ |
| Decor **position** | authored in cell space, parent matrix ✅ | `dir · R` via chart ✅ | `applyMat(el.m, hp)` then project ✅ |
| Decor **orientation** | inherited from parent matrix ✅ | `setFromUnitVectors(upY, ±dir)` — arbitrary azimuth, never the deck map ❌ | none at all (identity) ❌ |
| Decor **face/side** | rigid π-rotation about glide axis ✅ | model swap (`makeTop`/`makeBottom`) ✅ | model swap ✅, but underside via `scale.set(sc, -sc, sc)` ❌ |
| Ink trail | one buffer, per-cell mesh instances through genuine matrices ✅ | main mesh + twin through genuine `twinM4` ✅ | stamp triples re-projected through `Mtiles·γ` ✅ |

Read the columns: the ink row is uniformly green because S06 built it one
mechanism; the decor orientation row is green only where the scene graph
happened to do the work for free. **The same orientation rule is expressed
three different ways because there is no seam that owns it.** That is the
design flaw behind every residual issue; the individual bugs below are its
instances.

## 3 · Finding: hyperbolic decor ignores the tile transform's orientation

`presenters/hyperbolic.ts` `placeDecor` (lines 271–315):

```ts
// hyperbolic.ts:291–294 — position + uniform scale; orientation never set
aj.position.copy(tmp); aj.scale.set(sc, sc, sc);
bj.position.copy(tmp); bj.scale.set(sc, -sc, sc);   // mirror below the floor
```

Three distinct defects in four lines:

1. **The det<0 tile's in-plane mirror never reaches the decor.** Prop
   *positions* go through the deck element (`tile.props = applyMat(el.m, hp)`,
   line 151), so the *layout* mirrors correctly — but each object renders in
   identity orientation. On a flipped tile the chiral number badges and the
   flat corner-disc numerals read **un-mirrored**. The file header (lines
   38–39) claims "trees ↔ columns, decals mirror-reversed" — the code delivers
   only the first half. Doc-as-spec drift: the comment asserts behavior the
   code does not implement, which is worse than no comment.
2. **Even det>0 tiles' rotations are dropped.** Every copy of corner disc "3"
   faces the same world direction instead of being the deck-image of one
   canonical disc. This breaks the app's core pedagogy ("every tile is the same
   decorated polygon seen through a deck element") independently of chirality,
   and it is why the bug is hard to *see*: trees and columns are nearly
   rotation-symmetric, so only the chiral decals betray it.
3. **`bj.scale.set(sc, -sc, sc)` is the banned baked mirror**, verbatim the
   pattern the S06 handoff outlawed ("decor that grows down must be rigidly
   rotated, never `scale.y = −1`"). It is currently visually masked by defect
   1 — there is no rigid deck transform on hyperbolic decor for the baked
   reflection to cancel against — which is exactly how the euclidean version of
   this bug stayed invisible until the deck became rigid. Fixing defect 1
   without fixing defect 3 will resurface mirror-written plaques on the walking
   face, the same failure sequence as S06 item 3.

> [!CAUTION]
> **Gotcha** — these three defects are coupled. A "small" patch that adds the
> tile rotation to `aj` will *appear* to work and silently break `bj`; the safe
> change is the whole-frame placement described in §6.

## 4 · Finding: spherical decor and the ink twin disagree about the same deck map

`presenters/spherical.ts` builds the genuine det<0 deck matrix once
(`twinM4`, lines 74–76) and uses it for the ink twin exactly as the invariant
prescribes (lines 161–165: a second mesh over the same buffer with
`matrix.copy(twinM4)`). Two paragraphs up, `buildMarkers` (117–146) places the
antipodal decor copies by:

```ts
// spherical.ts:113–116 — shortest-arc proper rotation, azimuth uncontrolled
function place(g: THREE.Group, dir: THREE.Vector3, radius: number, outward: boolean) {
  g.position.copy(dir).multiplyScalar(radius);
  g.quaternion.setFromUnitVectors(upY, outward ? dir : dir.clone().negate());
}
```

`setFromUnitVectors` gives the minimal proper rotation taking +y to the radial
direction. Consequences:

- The antipodal copy's **chirality is wrong** (a proper rotation cannot
  reproduce the antipodal map's in-surface reflection — the chiral badges on
  the −d copies read un-mirrored), and
- the **azimuth is arbitrary even on the orientable sphere** — outer copies are
  not coherent images of one decorated chart, just objects individually aimed
  "up." The decorated-domain story holds only positionally.

One genuine subtlety deserves to be written down as a contract, because it is
the conceptual knot a newcomer will hit: **the spherical deck matrix does not
carry the face swap.** The antipodal map −I maps the outward normal at `d` to
the outward normal at `−d` (it preserves co-orientation of the shell) while
reversing in-surface orientation. The face swap — columns growing outward on
the antipodal half — is *co-orientation transport on a one-sided surface*, a
Z/2 datum on top of the deck matrix, which is precisely why `buildMarkers`
hand-swaps `makeTop`/`makeBottom`. The model swap is therefore **correct and
must stay explicit**; only the orientation should come from `twinM4` (push the
outer copy's frame through it, then compose the rigid face turn). Contrast the
euclidean world, where the π-rotation deck transform carries face swap and
mirror together. Any unified seam must represent `face` as explicit data, not
hope to read it off `det`. (The ink is exempt: ink lives *in* the sheet and is
legitimately visible from both sides, so the twin mesh through bare `twinM4`
is right — `LIFT` side is cosmetic.)

## 5 · Finding: dead module with anti-invariant documentation, plus doc drift

- **`otherSide.ts` has zero importers in PolygonWorlds** (the identically-named
  module in `TopologyWalk/` is separately owned and used there). Its docstring
  describes the flat other-side as "a per-cell `under` group reflected by
  `scale(1, -1, -1)`" — the exact approach S06 abandoned. A newcomer grepping
  for the chirality story will find prose recommending the banned pattern with
  no marker that it is stale. **Delete it**; if the normal-flip roadmap seam is
  still wanted, re-declare it against the `CoverModel` interface it would
  actually extend.
- `euclidean.ts:60` — the `Cell` interface comment still reads
  `matrix = translate(cellOrigin) · scale(1, flip, 1)`; the code (312–315) has
  been the rigid rotation since S06.
- `hyperbolic.ts:38–39` — the "decals mirror-reversed" overclaim (§3).

Small items individually, but they are all the *same* failure: the chirality
story lives in comments and a handoff file, and nothing reconciles prose with
code. That is what an executable contract fixes (§7).

## 6 · Pattern recognition, and the structurally-right remedy

What this app is doing has names:

- **Quotient-space rendering by deck-transform instancing** — draw one
  fundamental domain's content through a list of group elements. The standard
  practice (portal renderers; HyperRogue's hyperbolic tilings, which compose
  view × deck element × projection per tile, exactly this app's `Mtiles·γ`) is
  to make the composed transform the *only* thing that places content.
- **Scene-graph transform propagation** — the euclidean presenter's per-cell
  parent groups. This is the ideal seam *when the render map is affine*. It
  cannot port to the hyperbolic presenter: a hyperboloid isometry followed by
  the Poincaré projection is not a `Matrix4`, so there is no parent matrix to
  set. (It *can* port to the spherical presenter — the sphere renders linearly,
  which is why the ink twin works as a plain matrixed mesh.)
- **Frame transport by finite differences** — the trail's "stamp triple"
  (position + step-ahead + step-left, projected, with `normal = f × l`) is a
  numerical Jacobian: the standard way to push an oriented frame through a
  nonlinear map. **The codebase already contains the right mechanism; it is
  just private to the ink.**

> [!IMPORTANT]
> **Decision proposed** — one placement seam, `sheetPose.ts`, built from the
> trail's own frame idea. Not per-presenter patches.

```ts
// the genuine render transform, reified
interface SheetFrame {
  pos: THREE.Vector3;
  fwd: THREE.Vector3;   // image of the anchor's +u direction (length = local scale)
  left: THREE.Vector3;  // image of the anchor's +v-ish direction
  up: THREE.Vector3;    // geometric up at the anchor (unit)
  face: 0 | 1;          // explicit Z/2 face datum (see §4 — not derivable from det alone everywhere)
}
// SheetFrame → rigid pose: ALWAYS det+1; handedness of (fwd, left, up)
// decides model face + the rigid in-plane turn. scale.y = −1 becomes unrepresentable.
function poseFromFrame(f: SheetFrame): { quaternion: THREE.Quaternion; scale: number; modelFace: 0 | 1 };
```

Per presenter:

- **Euclidean** — already conforms; its parent matrices *are* frames. Optionally
  re-express through the seam for uniformity, or leave as the affine fast path
  with a comment pointing at the contract. Zero runtime change.
- **Spherical** — derive each anchor's frame from the chart differential
  (`dirFor`'s Jacobian — this also fixes the arbitrary azimuth on the plain
  sphere); derive the antipodal frame by pushing it through `twinM4` and
  setting `face` from the seam-crossing parity. Replaces `place()`; ~30 lines;
  per-frame cost zero (markers rebuild only on radius/world change).
- **Hyperbolic** — per anchor, project a triple exactly like the ink does:
  precompute home-domain `(anchor, anchor+δe₁, anchor+δe₂)` per tile next to
  `tile.props` (one-time, mirrors lines 137–154), then per frame 2 extra
  `projectM` calls per anchor beyond the one already made. Budget: `N_DECOR(16)
  × (≈8 props + ≈8 corners) ≈ 256 anchors → ~512 extra projections/frame`,
  against `rebuildEdges`' existing `tiles × m × EDGE_SEGS × 2 ≈ 20–90k`
  projections and `rebuildInk`'s up to `TRAIL_MAX(360) × N_DECOR(16) × 3 ≈ 17k`
  — **about 2% added to the per-frame projection load, zero added draw calls**.
  The conformal scale stops being a separate `(1 − r²)` computation: it *is*
  the frame vectors' length, the same unification the ink already enjoys
  (`hyperbolic.ts:199–201` vs `:330–334`). Below-floor decor becomes
  `poseFromFrame` with the face turn — the baked `-sc` dies.

Cost/benefit of the alternative (per-presenter minimal patches): smaller diff
today, but it writes the orientation rule a *fourth, fifth, and sixth* way, the
coupling trap in §3 stays armed, and the next decor feature (the roadmap
normal-flip, holonomy-square markers) re-rolls the dice. The seam costs maybe
150 lines once and makes the invariant a type-level property.

## 7 · Verification contract — making the invariant unbreakable

Today's confidence chain for decor orientation is: `npm run build` (types
only) → kernel battery (`verify-geometry.ts`, det signs at the *producer*) →
`trail-chirality.mjs` (the *ink* consumer, strict positive-sign on both faces,
four worlds) → **human eyeballs through SwiftShader screenshots for everything
decor**. The decor consumer is exactly the unguarded link, and both verified
bugs live there. Three layers, strongest first:

1. **Pure placement battery — `scripts/verify-decor.ts`, no WebGL, add to
   `npm run verify`.** Factor placement into pure functions
   `(tileElement, anchor) → SheetFrame → pose` and assert, for every world ×
   every rendered tile × every chiral anchor:
   - `sign(inPlaneDet(frame)) === sign(det(tile) · det(h))` — the frame's
     handedness equals the composed transform's;
   - `det(poseMatrix) > 0` for every placed object — **no baked mirrors,
     structurally** (this single assertion would have caught both `scale.set(sc,
     -sc, sc)` and the S06 euclidean bug);
   - `modelFace === flipParity ⊕ faceTransport` — the face datum matches the
     topology.
   This is the test that makes the invariant *unbreakable*: it runs in node in
   milliseconds, covers all worlds including the ones the headless script
   can't reach quickly, and doubles as the executable spec a newcomer reads
   instead of archaeology through handoff files.
2. **`decorProbe()` beside `debugProbe()`** on `CoverModel` + the `?polydebug`
   bridge (`PolygonWorlds.tsx:84–91`): signed as-rendered handedness of a
   designated chiral decal (a corner-disc plate is ideal — flat, numbered,
   per-tile) on (a) the player's tile and (b) the nearest flipped/antipodal
   tile, read with `inkTrail.chirality`'s cyan/magenta technique or a numeral
   analog. Sibling script `decor-chirality.mjs` cloned from
   `trail-chirality.mjs:120–135`'s strict-positive verdict logic. This is the
   end-to-end guard layer 1 cannot give (it sees the real meshes after every
   refactor of the plumbing).
3. **Keep the trail suite strict-positive** (it already is) and note in the
   contract file *why* sign-consistency alone is insufficient — that lesson
   (handoff item 5, the orientation-reversing Poincaré projection) is currently
   recorded only in a session document.

Failure modes the seams leave open even after this: the *qualitative* read
("does the F look right to a human through glass") still needs the screenshot
spot-check, and frame-*continuity* across fold events is probed by nothing (the
S06 self-reflection flagged this; it remains true).

## 8 · Maintainability

Can a newcomer follow the chirality story in six months? Today: only by
reading a handoff file in `docs/sessions/` plus six long header comments, two
of which are wrong (§5) — and the best statement of the invariant lives in a
*branch-partitioned session doc*, not next to the code. The complexity itself
is justified (the subject matter is genuinely about orientation transport; you
cannot simplify the math away), but its *expression* is not: one rule, three
dialects, two of them buggy. After the §6/§7 remedy the story compresses to:
"all placement goes through `SheetFrame`/`poseFromFrame`; handedness is data;
`verify-decor.ts` is the spec." That is a story a newcomer can hold.

## Verdict

**Endorsed:**

- The kernel/presenter boundary (`lib/realize`, `lib/develop`,
  `lib/cayleyKlein` + invariants battery) — clean, pure, verified at the right
  level; the det<0 signal is produced correctly and uniformly.
- The ink-trail architecture (`inkTrail.ts`) — genuinely excellent: explicit
  frames, handedness as data, one buffer, genuine transforms, an end-to-end
  probe. It is the *model* for the fix, not part of the problem.
- The euclidean presenter's transparency-flip cells, and the lead's geometry
  answer (reflected through the floor; "rotated 180°" only as the rigid
  carrier between faces).
- The spherical model swap staying explicit — the face is a bundle datum the
  deck matrix cannot supply (§4); any "just use the matrix" unification that
  erases it would be wrong.

**Concerns:**

- Both verified decor bugs are *instances of a missing seam*, not isolated
  slips; patching them in place leaves the rule expressed N+2 ways and the
  §3 coupling trap armed.
- The invariant's only durable home is a session handoff document; in-code
  comments have already drifted against the code twice (§5).
- Decor orientation has zero automated coverage while being the app's central
  pedagogical claim.

**Concrete changes, in order:**

1. Add `scripts/verify-decor.ts` (pure placement battery, `npm run verify`)
   *before* touching presenters — red first on today's code.
2. Introduce `sheetPose.ts` (`SheetFrame` + `poseFromFrame`, det+1 by
   construction, explicit `face`); route hyperbolic and spherical decor through
   it (frame triples / chart Jacobian + `twinM4`). Euclidean may stay on its
   affine fast path with a pointer to the contract. ~2% added hyperbolic
   per-frame projection cost, zero added draw calls.
3. Add `decorProbe()` + `decor-chirality.mjs` for end-to-end coverage.
4. Delete `otherSide.ts`; fix the stale comments at `euclidean.ts:60` and
   `hyperbolic.ts:38–39`; move the invariant statement from the handoff into a
   short header in `sheetPose.ts` so the spec lives where the code lives.

## Self-reflection

1. **What would you do with another session?** Write `verify-decor.ts` against
   the current code to confirm it fails exactly where §3/§4 predict (the
   strongest possible validation of this review), and prototype the hyperbolic
   frame-triple placement to measure the real per-frame cost instead of
   estimating ~2%.
2. **What would you change about what you produced?** The §4 face-transport
   argument (−I preserves co-orientation; the face swap is a separate Z/2
   datum) is reasoned, not machine-checked; I would rather have demonstrated it
   with a ten-line numeric script than prose. The ~2% cost figure is an
   operation count, not a measurement.
3. **What were you not asked that you think is important?** Whether the
   spherical ink twin's `LIFT` side (outer vs inner at the antipode) matters —
   I concluded it is cosmetic because ink is in-sheet and DoubleSide, but the
   reasoning was subtle enough that it deserves the same explicit treatment as
   the decor; and the hyperbolic `rebuildEdges` cost (all tiles, every frame,
   tens of thousands of projections) which dwarfs everything else per frame and
   was never profiled.
4. **What did we both overlook?** The decor draw-call footprint: ~16 cells × 4
   groups × multi-mesh props is on the order of a thousand visible meshes in
   hyperbolic worlds, an obvious InstancedMesh candidate — orthogonal to
   orientation but it should be weighed before the placement refactor so the
   seam is designed for instanced consumers too.
5. **What did you find difficult?** Deciding whether the spherical antipodal
   decor is "wrong" or "differently right" — it took the co-orientation
   transport argument to separate the correct part (the model swap) from the
   incorrect part (the orientation), and a naive "use the genuine matrix
   everywhere" recommendation would have introduced a new bug (trees outward at
   the antipode).
6. **What would have made this task easier?** An in-repo statement of the
   chirality invariant (it lives only in a session handoff), and any existing
   pure test of decor placement to use as a fixture.
7. **Follow-up value:** MEDIUM — the findings are code-verified and the remedy
   is concrete, but the contract test should be written and run red/green to
   convert this review's claims from argued to demonstrated.
