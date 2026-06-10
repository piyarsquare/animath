---
kind: three-hats
session: 2026-06-10-S01
date: 2026-06-10
title: Three hats · Framework Maintainer — sign orientation in Polygon Worlds
branch: claude/polygon-sign-orientation-50exno
slug: polygon-sign-orientation-50exno
status: completed
build: n/a
followup: null
pr: null
app: polygon-worlds
---

# Three hats · Framework Maintainer — sign orientation in Polygon Worlds

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

The user's instinct is right, and the history says exactly where to look. S06
(handoff: `docs/sessions/handoff/polygon-worlds-spherical-p2-qgExR/2026-06-09-S06-ink-on-the-sheet-trail.md`)
established the app's one orientation law — **mirror-reading is only ever
produced by a genuine det<0 render transform; never by flags, per-side
rebuilds, or baked `scale.y = −1`** — and then enforced it in *two* places: the
ink trail (all three presenters) and the **euclidean presenter's decor**. It
was never enforced in the **hyperbolic or spherical decor**, and the S06
self-reflection even confesses the blind spot ("Whether the *decor* — not just
the trail — obeyed the chirality story" was the thing nobody asked). Eight
months of consolidation history in this repo (the three near-identical complex
viewers that drifted apart until they were forcibly merged into
`lib/particles`) says what happens next if this is left alone: three
presenters, three different answers to "what does a sign look like from the
other side," and a regression guard that only watches one of them.

Concretely, I verified in code:

1. **Hyperbolic decor violates the S06 law twice** — flipped tiles show
   un-mirrored chiral badges beside genuinely mirrored ink, and below-floor
   decor uses the exact `scale.set(sc, -sc, sc)` pattern S06 banned and
   removed from the euclidean presenter
   (`src/animations/PolygonWorlds/presenters/hyperbolic.ts:286-309`).
2. **Spherical ℝP² antipodal decor is placed by a proper rotation**, not
   through the genuine det<0 deck (`twinM4`) that the ink twin two lines away
   uses (`src/animations/PolygonWorlds/presenters/spherical.ts:113-146`).
3. **`otherSide.ts` is a dead module** whose doc comment narrates the
   *abandoned* `scale(1,-1,-1)` mirror story — stale history sitting inside
   the app folder, contradicting the current invariant
   (`src/animations/PolygonWorlds/otherSide.ts`).
4. The **regression guard tests only the trail**, in only four of six worlds,
   and has no concept of decor chirality (`scripts/trail-chirality.mjs`).

The geometry question itself ("rotated 180° or reflected?") is settled —
**reflected** — and the codebase already contains the canonical proof of it:
the euclidean presenter's user-approved transparency flip. The residual issues
are precisely the places where the code still answers "rotated" (proper
rotation, model swap, baked scale) where the law requires "reflected through a
genuine det<0 transform."

## 1 · The geometry question, from the maintainer's chair

The lead's analysis is correct and — more importantly for me — it is *already
the app's official doctrine*, written down twice:

- `inkTrail.ts:4-27`: "you never *become* mirrored — you are on the other side
  of the sheet, looking at the back of the ink." A flat glyph seen from its
  back composes its front appearance with an orientation-reversing map.
  Chirality reversal is the invariant; which mirror axis you perceive depends
  on how you got underneath (your own proper rotation composes on top).
- `presenters/euclidean.ts:22-28`: the rigid π-rotation about the glide axis
  ("flip the transparency over") is a det+1 motion of 3-space whose
  *restriction to the sheet* is the orientation-reversing in-plane reflection
  (`reflectInPlane`, `euclidean.ts:96-103`). That is the precise sense in
  which "rotated 180°" is true — and it is exactly why "rotated" and
  "reflected" are not in conflict: one names the 3D motion, the other names
  its 2D shadow.

So the answer to the user is: **a sign viewed through the floor is
mirror-reversed, always**; "rotated by 180°" correctly describes only the
rigid 3D move that carries a plaque from one face to the other, and that move
*is* a reflection as far as anything written on the sheet is concerned. The
S06 Klein-deck fix (`scaleY(−1)` → `makeRotationAxis(glideDir, π)`) was this
exact theorem landing in code, after the user *felt* the wrong version.

One extension the lead is also right about and which matters for the app's
glass metaphor: the floor mirrors only **ink on the sheet**. A 3D object
behind glass (a tree under the floor) is seen as-is — it is its flat decals
(badges, numeral plates) that read reversed. The decor JSDoc
(`decor.ts:10-14`) states this correctly; two of three presenters fail to
implement it.

> [!IMPORTANT]
> **Decision-grade framing.** This review is not proposing a new orientation
> model. The model exists, is user-approved, and is implemented correctly in
> one presenter (euclidean) and in the ink path of all three. The work is to
> finish rolling the *existing* law out to the two decor paths that predate it.

## 2 · Finding: hyperbolic decor breaks the law twice (and its own header lies)

`presenters/hyperbolic.ts` header, lines 36–39, promises:

```ts
// hyperbolic.ts:36-39 (file header)
// ... crossing a glide edge ... flips the skin of *every* tile
// (det(h)·det(γ) < 0) — you genuinely flip to the other side
// (trees ↔ columns, decals mirror-reversed) — ...
```

The ink path delivers this. `rebuildInk` (lines 321–343) projects every stamp
through the full composed transform `M = mul(Mtiles, tiles[i].m)`; where
`det < 0` the projected left vector genuinely lands on the right and the
derived normal points down — mirror ink with no flags. Correct, and S06-tested.

The decor path does not. `placeDecor` (lines 271–315):

```ts
// hyperbolic.ts:280-294
const flipped = detH * tile.det < 0;      // your side × the tile's side
const above = flipped ? cell.columns : cell.trees;   // ← model swap ONLY
...
aj.position.copy(tmp); aj.scale.set(sc, sc, sc);     // ← no rotation, no mirror
bj.position.copy(tmp); bj.scale.set(sc, -sc, sc);    // ← the banned baked mirror
```

Three distinct defects, in descending severity:

**2a — Flipped tiles show un-mirrored chiral decals beside mirrored ink.**
The flip is expressed *only* by swapping which model group is visible
(trees ↔ columns). The chiral devices — the number+arrow badges
(`decor.ts:110-119`, explicitly "the canonical orientation cue the app is
built on") and the Arabic/Roman corner plates — render with identical
handedness on flipped and unflipped tiles. Walk crosscap3 to a glide
neighbor: your footprints in that tile are genuinely mirror-reversed; the
badge on the column next to them reads perfectly normal. The app's two
orientation instruments contradict each other in the same camera frame. The
EXPLAINER promises the opposite to the user (`EXPLAINER.md:69-70`: "the glide
tiles wear the **mirror** skin (numbers come back reversed)") — claim shipped,
code not.

**2b — Below-floor decor uses the banned baked mirror.** `bj.scale.set(sc,
-sc, sc)` is character-for-character the pattern S06 removed from the
euclidean presenter (S06 handoff, "Load-bearing geometric facts": "Decor that
'grows down' must be *rigidly rotated*, never `scale.y = −1`"). The rigid
turn-over and the baked y-flip differ by exactly one in-plane reflection, so
whichever through-the-glass reading the user approved in the euclidean worlds
(Roman plates mirror-reversed through the glass), the hyperbolic worlds show
the opposite — and disagree with the under-glass ink sitting beside them,
which goes through the genuine transforms. Same world-story element, two
presenters, two answers.

**2c — Decor ignores the rotational part of the tile transform entirely.**
Every copy of every prop faces the same world azimuth regardless of which deck
element placed its tile; the ink in the same tile rotates correctly. The
3-fold `numberRing` (`decor.ts:305-316`) partially masks this, which is
presumably why nobody has noticed. Cosmetic on its own, but it matters for the
fix: there is no per-tile orientation slot to "just add the mirror to" — the
honest fix derives a full frame per prop, which fixes 2a and 2c in one move.

> [!CAUTION]
> **Gotcha for whoever fixes this:** `Object3D.quaternion` cannot represent a
> det<0 transform. The fix must place decor children by **matrix**
> (`matrixAutoUpdate = false`), exactly the way the spherical presenter already
> draws its ink twin (`spherical.ts:161-165`). Attempting to keep
> position/quaternion/scale decomposition will silently re-launder the mirror
> into a scale flag — the very thing the law bans.

The smallest honest fix follows the ink's own recipe, already in this file:
for each prop, project **three domain points** (the prop, a small step "ahead,"
a small step "left") through the same `Mtiles`-composed transform the ink uses,
build the basis from the differences (det<0 falls out for free), and set the
child's matrix. Below-floor decor is the same matrix composed with a rigid π
turn-over about an in-plane axis — the euclidean rule transplanted. Delete the
`-sc`. This is ~30 lines confined to `placeDecor`, no new files, no shared-file
edits, no new abstraction.

## 3 · Finding: spherical ℝP² antipodal decor bypasses the genuine deck

`presenters/spherical.ts` has the genuine det<0 transform *in hand* — it
builds `twinM4` from the developed deck element (lines 73–76) and uses it,
correctly, for the trail twin:

```ts
// spherical.ts:161-165 — the correct pattern, three lines below the wrong one
const inkTwin = new THREE.Mesh(ink.geometry, ink.material);
inkTwin.matrixAutoUpdate = false; inkTwin.matrix.copy(twinM4);
```

But `buildMarkers` (lines 117–146) places the antipodal decor copies by
`deckDir(d)` (the *position* through the deck) plus
`place()` → `quaternion.setFromUnitVectors(upY, dir)` (lines 113–116) — a
**shortest-arc proper rotation** with arbitrary azimuth. Position goes through
the deck; orientation does not. Result: on ℝP², the far hemisphere's badges
and Roman plates read un-mirrored beside trail footprints that are genuinely
mirrored through `twinM4`. Same contradiction as the hyperbolic case, and the
EXPLAINER again promises the correct behavior (`EXPLAINER.md:41-45`: "the
trees there wear columns and the trail's antipodal image is its mirror twin").

Smallest honest fix: compute the home copy's placement matrix (it is already
position + that quaternion), and set the antipodal copy's matrix to
`twinM4 · M_home` with `matrixAutoUpdate = false`. The trees↔columns model
swap stays — that is the face story, which is separate from and additional to
the in-plane mirror. The antipodal map carries outward normals to outward
normals, so this composition needs no special-casing; its det<0 does the
mirroring.

The inner-shell copies (`place(cIn, d, R*SHELL_GAP, false)`) use a proper
rotation — no baked mirror, so no law violation — but their azimuth is
likewise arbitrary rather than the through-sheet image of the outer copy.
Acceptable residual; note it, don't block on it.

## 4 · Finding: `otherSide.ts` is dead code narrating the abandoned model

Verified by grep: **zero importers** of `src/animations/PolygonWorlds/otherSide.ts`
anywhere in `src/` — the only `otherSide` importers are TopologyWalk's own
copy (`TopologyWalk/engine.ts:2`, `flatEngine.ts:6`, `sphericalEngine.ts:6`).
The PolygonWorlds copy is a byte-level near-duplicate of TopologyWalk's
(the diff is two British spellings — `realise`/`realisation` — that the
TopologyWalk copy had Americanized per CLAUDE.md and this copy did not), and
its doc comment teaches the *pre-S06* model:

```ts
// otherSide.ts:12-14
//  - **flat** (torus / Klein): a per-cell `under` group reflected by
//    `scale(1, -1, -1)` — a planar mirror through the floor — ...
```

That is the exact mechanism S06 spent a session eradicating. A future agent
grepping this folder for "mirror"/"other side" guidance will find an
authoritative-sounding module describing the banned approach. This is the most
dangerous kind of debt in an agent-developed repo: **stale doctrine**, not
just dead bytes. CLAUDE.md already lists "orphaned utilities" as a known debt
class; this one is worse than `lib/ParticleDisplay.ts` because it actively
misleads.

Fix: `git rm` the file. It costs nothing — TypeScript dead code isn't even
caught by the build (no `noUnusedLocals` cross-file effect), so nothing can
regress. TopologyWalk keeps its own copy, which is genuinely used there.

## 5 · Smaller drift, same family

| Where | What | Cost |
|---|---|---|
| `presenters/euclidean.ts:60` | Stale comment on `Cell.group`: `// matrix = translate(cellOrigin) · scale(1, flip, 1)` — describes the pre-S06 transform; the code three screens down uses `makeRotationAxis(glideDir, π)` (line 312). The one-line comment contradicts the file's own 16-line header. | One line; fix when touching the file. |
| `presenters/hyperbolic.ts:39` | Header claims "decals mirror-reversed" — true of ink, false of decor. Becomes true once §2 lands; until then it is the comment a future agent will trust over the code. | Fix the code, keep the comment. |
| `EXPLAINER.md:69-70`, `41-45` | User-facing copy promises mirrored numbers on glide tiles / antipodal mirror twins. Ahead of the code in two of three presenters. | Same — code catches up. |
| `glassSurface.ts:57-80` | Exported `applyGlass()` has zero callers in PolygonWorlds (all three presenters use `glassState` and assign fields themselves); the JSDoc still narrates "flatEngine and sphericalEngine" — **TopologyWalk** engine names. Copied-module drift, same lineage as `otherSide.ts` but the module is half-alive. | Trim the dead export + fix the doc names when convenient. |
| `engineTypes.ts:41` + `fundamentalSquareEngine.ts:109` | `setColorCells(on)` is a required interface member implemented as `() => {}` — a stub from a removed feature. | Remove from the interface or mark optional. |
| `EXPLAINER.md:64`, `decor.ts:5,21`, `otherSide.ts:9,22` | British spellings (`centre`, `coloured`, `realise`) against CLAUDE.md's explicit American-English rule. | Mechanical sweep; bundle with any docs touch. |

None of these blocks anything; together they are the sediment that makes the
next orientation bug harder to reason about. The pattern to notice: every
single stale item above is *about the flip story*. That is not a coincidence —
it is the part of the app that changed most recently and most subtly.

## 6 · Operational reality: what the guard covers, and what it must grow

The repo's only CI gate is `npm run build` (tsc + vite). **None** of the
findings above can ever trip it — orientation bugs are type-correct. The real
guards are the headless scripts, run by hand:

- `npm run verify` (`scripts/verify-geometry.ts`, `verify-schemas.ts`) — pure
  kernel invariants (`lib/invariants.ts`). Presenter code is invisible to it.
  Decor orientation can never fail here.
- `scripts/trail-chirality.mjs` — the S06 guard. Strong where it looks:
  end-to-end, exact geometry probe (`debugProbe` → `ink.chirality`), strict
  positive-sign requirement (upgraded after sign-consistency masked the
  projection-handedness bug). But:

| Gap | Detail |
|---|---|
| **Decor: untested entirely** | The probe reads only the freshest ink quad. Both §2 and §3 ship today with the guard green. This is the exact blind spot S06's self-reflection named. |
| **Worlds: 4 of 6** | `WORLDS = [torus, klein, crosscap3, rp2]` (line 29-34). No `sphere` (orientable spherical control) and no `genus2` (orientable hyperbolic control). Orientable controls are what caught the projection-handedness bug class. |
| **Not in CI** | Needs `npm run preview` + puppeteer (a devDependency, so at least it installs with `npm ci`) + SwiftShader at ~7× real time (a Klein crossing ≈ 30 s headless, per S06). Fine as a hand-run gate; do not promise more than that in docs. |

**What the guard should grow to cover** (smallest honest version):

1. Extend the `?polydebug` bridge (`PolygonWorlds.tsx:85-91`) with a
   `decorProbe()` beside `probe()`: for the nearest flipped-tile landmark and
   the nearest below-floor landmark, return `sign(det(renderMatrix))` of the
   decor child as rendered — after the §2/§3 fixes that matrix exists and is
   the truth. Add a per-`CoverModel` optional, mirroring how `debugProbe`
   already threads through `coverModel.ts:68` → `fundamentalSquareEngine.ts:115`.
2. In the chirality script (or a sibling `decor-chirality.mjs` — keep
   `trail-chirality.mjs` stable, it is the proven harness), assert in each
   non-orientable world: **ink sign and decor sign agree in the same tile**,
   on both faces. Agreement-with-ink is the right assertion — it tests the
   law ("one mechanism, genuine transforms") rather than a per-presenter
   constant.
3. Add `sphere` and `genus2` as orientable controls to the world list. Cheap
   (the harness loops a list) and they close the "orientation-reversing
   projection sneaks in" class for the two presenters that currently have no
   orientable coverage at all.

## 7 · Scope and parallel-branch safety

Everything proposed lives inside `src/animations/PolygonWorlds/` plus
`scripts/` — no `index.tsx`, `apps.ts`, or catalog edits, so there is no
append-only shared-file exposure and no conflict surface with parallel app
branches. The fixes also respect the boundary `coverModel.ts:6-24` documents
on purpose: the three covers "are different mathematical objects and are NOT
merged." I want to say this loudly because the obvious *wrong* response to
"three presenters express orientation three ways" is a shared
`orientDecor()` abstraction. Don't. The presenters' placement math is
genuinely different (lattice matrices vs. quaternions on a shell vs. projected
Möbius frames); what they must share is the **law** and the **test**, not a
helper. The ink trail is the proof this works: `inkTrail.ts` shares only the
buffer/quad/probe mechanics, and each presenter feeds it through its own
genuine transforms. Decor should converge to the same shape — shared decor
*models* (already true: `decor.ts`), per-presenter genuine *placement*.

Scope boundary for the session: fix decor orientation in two presenters,
delete one dead file, grow the guard. Out of scope: the S06-parked
camera/headlamp bug, the pending curvature-demonstration decision (holonomy
square — still awaiting the user's pick), any presenter unification, any
change to the euclidean presenter beyond its one stale comment.

## Verdict

**Endorse:**

- The lead's geometry answer — *reflected*, with "rotated 180°" valid only as
  the name of the rigid transparency-flip whose in-plane restriction is the
  reflection. It matches the app's own user-approved doctrine (S06, ink trail,
  euclidean decor) exactly. Tell the user: the app's flat worlds already
  render the correct answer; the curved worlds' decor doesn't yet.
- All three candidate residual issues, confirmed in code at the cited lines.
  The lead's read of `hyperbolic.ts` `placeDecor`, `spherical.ts`
  `buildMarkers`, and `otherSide.ts` is accurate; I extended it with the
  azimuth defect (§2c), the half-alive `glassSurface.ts` drift, the
  EXPLAINER-ahead-of-code mismatches, and the guard's missing orientable
  controls.

**Concerns:**

- The fix has a trap: det<0 placement **must** go through `Object3D.matrix`
  with `matrixAutoUpdate = false` (the `inkTwin` pattern). Any
  quaternion/scale decomposition reintroduces the banned flag in disguise.
- The guard must be grown **in the same session** as the fix. S06 proved the
  pattern: an invariant without its probe was re-broken within one session of
  being stated. If decor chirality lands unprobed, finding §2 will simply
  recur the next time someone touches `placeDecor`.
- Do not let this session drift into presenter unification or the curvature
  demo. The `coverModel.ts` non-merge boundary is load-bearing and correct.

**What I would change, smallest-fix-first:**

1. Delete `src/animations/PolygonWorlds/otherSide.ts` (dead, doctrinally
   stale; zero risk).
2. Fix the one-line stale comment `euclidean.ts:60`.
3. Hyperbolic `placeDecor`: replace `scale.set(sc, -sc, sc)` with the rigid π
   turn-over, and place above-floor decor by a projected three-point frame
   through the same composed transform the ink uses (matrix placement; fixes
   mirror + azimuth together). ~30 lines, one function.
4. Spherical `buildMarkers`: place antipodal copies via
   `twinM4 · M_home`, `matrixAutoUpdate = false`; keep the model swap.
5. Grow the guard: `decorProbe()` on the debug bridge; ink-sign ≡ decor-sign
   assertion per non-orientable world; add `sphere` + `genus2` controls.
6. Sweep the stale prose (hyperbolic header becomes true via #3;
   `glassSurface.ts` doc names; British spellings) in the same commit as the
   code it describes.

Verification for the session: `npm run build` (the only CI gate), then
`npm run preview` + the chirality script(s) on all six worlds, with
screenshots of a flipped-tile badge beside a flipped-tile footprint as the
human-eyeball artifact — that pairing is the user's original question made
visible.

## Self-reflection

1. **What would you do with another session?** Implement fixes 1–5 from the
   verdict and run the grown guard end-to-end headless (budgeting for the ~7×
   SwiftShader slowdown). The analysis is done; the remaining value is in
   working code plus the probe that keeps it working.
2. **What would you change about what you produced?** I argued the
   baked-mirror vs. rigid-turn-over reading difference (§2b) by composition
   ("they differ by exactly one in-plane reflection, so the readings are
   opposite") rather than by running the app and photographing a Roman plate
   through the glass in both world families. The argument is sound, but this
   codebase's history (S06 caught two bugs only when pixels were compared)
   says screenshots beat derivations here.
3. **What were you not asked that you think is important?** Whether the
   spherical *sphere* world (not just ℝP²) and *genus2* have any orientation
   coverage at all — they don't, in any script. Orientable controls are how
   this repo previously caught a whole bug class (the projection-handedness
   fix in S06 came from upgrading the torus control's assertion).
4. **What did we both overlook?** The minimap. `chart()` reports `flipped`
   and the map renders a "mirror side / mirror tile" label, but nothing tests
   that the *map's* arrow/marker handedness agrees with the 3D scene — the
   S06 Klein bug was originally noticed as "the walk contradicted the
   minimap's own gluing arrows." The map is a third orientation presenter and
   it is as unguarded as the decor was.
5. **What did you find difficult?** Being certain about perceived reading
   direction for the baked-mirror case without a render — chirality
   composition across "which face, which side of the glass, which way is the
   viewer facing" has exactly the trap S06's author fell into. I anchored
   every claim to the user-approved euclidean behavior plus pure composition,
   rather than re-deriving perception from scratch.
6. **What would have made this task easier?** A `decorProbe()` that already
   existed. The entire §2/§3 investigation would have been one script run.
   That asymmetry — trail probed, decor not — is itself the finding.
7. **Follow-up value:** HIGH — the review's conclusions are code-verified, but
   the app ships user-visible orientation contradictions in two of three world
   families until the fixes and the grown guard land.
