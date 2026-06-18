---
kind: plan
session: 2026-06-18-S03
date: 2026-06-18
title: Quaternions — candidate apps + draft build plan
branch: claude/quaternion-exploration-app-ig4jmy
slug: quaternion-exploration-app-ig4jmy
status: proposed
build: n/a
---

# Quaternions — From Atlas to App

> Consumes the full prior chain: the foundation
> ([`2026-06-17-S01-concept-foundation.md`](./2026-06-17-S01-concept-foundation.md)),
> the room transcript
> ([`2026-06-18-S03-room-transcript.md`](./2026-06-18-S03-room-transcript.md)),
> and the friction atlas
> ([`2026-06-18-S03-friction-atlas.md`](./2026-06-18-S03-friction-atlas.md)).
> The atlas is the spine; the transcript's phrasings and the foundation's
> formulas are the raw material for the explainer, on-ramp, and panels.

## 1. From atlas to app

The atlas points hard at one crossing. **C6 — the belt carries the sign (the
double cover)** — is the crossing where *felt and formal coincide* and where the
emergent invariants concentrate:

- **I3** (felt anchors cluster at the hardest formal crossing): both pure-felt
  voices, the Belt and the Electron, discharge exactly here.
- **I2** (twin walls): C6 is the closing wall — "a matrix cannot tell $360°$ from
  $0°$; the belt can" — the wall that forces the sign-carrying structure into
  existence.
- **I1** (the half/double heartbeat): C6 is the double-angle face of the same
  factor of two that runs through C2 and C3 — $360°$ reaches only $-q$
  (halfway), $720°$ comes home.

And it is where the **Skeptic's hardest challenge was answered by a strip of
leather, not an argument** — the single sharpest piece of content the room
produced ("the matrix is the block; the quaternion is the belt — it carries the
extra bit, the sign, that says which way you got here"). For animath's
manipulate-to-learn ethos, the directive (I3) is explicit: *the richest thing to
put under a learner's hands is the belt/plate twist.*

The recommended app is therefore built on **C6 as the spine**, with **C4** (the
gimbal-lock foil → the unit surface) and **C5** (the unit-length surface as the
home stage) as the supporting structure, and **C3** (the half-angle via the
sandwich) and **C7** (non-commutativity = cross product) as progressive-disclosure
depth. C1 (no three numbers) lives in the explainer as the originator's framing.

## 2. Candidate app concepts

### Candidate A — **The Belt** (a felt double-cover sandbox)

You see a small block (a hand/plate/dish mesh) you can rotate by dragging, with a
ribbon — the belt — running from the block to a fixed wall, twisting as you turn.
A live readout shows the **quaternion $q$ traveling on a 2D "sign dial"** (the
great circle through $q$ and $-q$, projected to a ring) so you watch $q$ slide to
$-q$ over one turn and home over two. You *do* the turning and try to shake the
twist out; the belt refuses until you have gone around twice. A "ghost matrix"
panel shows the $3\times3$ matrix returning after $360°$ while the belt/ribbon and
the sign dial do not — the Skeptic's own resolution, made interactive.

- **What it teaches:** the double cover as the thing a matrix throws away; $q$ vs
  $-q$; that $360° \ne$ home; orientation-entanglement as a felt fact.

### Candidate B — **Slerp Racer** (the practitioner's interpolation foil)

You set a start pose and an end pose for a mesh, then watch **two interpolators
race**: an Euler-angle slew (which can whip / jam at gimbal lock) and a
quaternion **SLERP** great-circle slew (even). A small inset shows the two
orientations as points on the projected unit surface with the SLERP arc drawn
between them. Scrub the interpolation; drag the poses near a gimbal-lock
configuration to provoke the whip.

- **What it teaches:** C4 + C5 — *why practitioners switched*; gimbal lock; the
  unit surface as the place an even arc lives (Shoemake's "live on the skin").

### Candidate C — **The Sandwich** (why the angle is halved)

A single vector (an arrow) sits at the center. You build a unit quaternion with an
axis–angle dial, then watch the **two-sided action $q\,v\,q^{-1}$** play out as two
staged multiplications: left-multiply (the arrow leaves "pure," sprouting a scalar
part shown as it lifts off the 3-space), right-multiply by the inverse (the scalar
cancels, the rotation doubles). A side-by-side shows **object turns by $\theta$ /
internal angle turns by $\theta/2$.**

- **What it teaches:** C3 — the half-angle as a mechanical consequence of acting
  from both sides to keep the vector pure.

### Scoring

| Candidate | Framework fit | Pedagogical payoff | Visual appeal |
|---|---|---|---|
| **A — The Belt** | **High** — a custom `Canvas3D` scene (block + ribbon mesh) with drag-orbit gestures already in `lib/particles/useGestureRotation`; quaternion math is `THREE.Quaternion` + `src/math/quat4.ts`; the sign dial is a small 2D readout. No 4D projection plumbing required. | **High** — sits on the deepest crossing where felt = formal (I3); resolves the Skeptic's "why not a matrix"; the belt is a thing hands already trust. | **High** — a twisting ribbon is striking and legible; the "won't undo until 720°" is a genuine surprise on screen. |
| **B — Slerp Racer** | **High** — `Canvas3D` mesh + a `playback` action strip (Play/Step/Reset) is squarely the documented inert-app pattern; SLERP is in the foundation's formula reference and `THREE.Quaternion.slerp`. | **High** — the practitioner "why care," gimbal lock, the unit surface earned from failure (C4/C5). | **Med** — two meshes slewing is clear but less visceral than a tangle; the whip is brief. |
| **C — The Sandwich** | **Med** — staging "a scalar part lifts off 3-space" honestly needs a 4th-axis cue; doable but fiddlier; closest to the existing particle/projection machinery yet not a natural `ParticleViewerShell` fit. | **High** — kills the single most common "huh?" (the half-angle). | **Med** — abstract; the "garbage cancels" step is subtle to render without clutter. |

## 3. Recommendation

**Build Candidate A — *The Belt* — first**, with Candidate B (Slerp Racer)
folded in as a second **layout/mode** once A ships. A is the strongest on every
axis and, decisively, it lands on the crossing the atlas says is the spine: the
one place where *touching the thing is understanding the math* (I3), and the one
content the room manufactured that nothing in the foundation states outright (the
belt = the sign the matrix hides). B is the natural sequel because it shares the
unit surface (C5) and supplies the "why care" that A's depth assumes; C is best
held as a progressive-disclosure panel *inside* A (the sandwich explains the
half-turn the belt makes you feel), not a separate app.

## 4. Draft build plan

**Engine / pattern.** Custom Three.js scene via `Canvas3D` (BUILDING_AN_APP.md §1,
"Custom 3D scene" — copy `PolygonWorlds`/`TopologyWalk` for the `onMount` +
cleanup pattern). Orientation math from `THREE.Quaternion`; reuse drag-orbit from
`src/lib/particles/useGestureRotation.ts` for *camera* look (kept separate from
the block's rotation, per the project's looking-vs-navigating convention). The
block's rotation is driven by a dedicated drive panel and by dragging the block
itself. **Reuse:** `src/math/quat4.ts` is a quaternion-rotation builder already in
the repo; `lib/colormaps.ts` if the ribbon is shaded by twist density.

**`SectionDef[]` panels** (archetypes from the closed vocabulary in
`src/chrome/workspace/archetypes.ts`):

| Panel | `arch` | Tier | Contents |
|---|---|---|---|
| **Block** | `subject` | Define | choose the mesh (hand / plate / dish), ribbon on/off, ribbon width |
| **Turn** | `drive` | Drive | axis–angle dials + a **turn slider 0–720°**; the hands-on rotation. Mirrored by the action strip |
| **Sign dial** | `readout` | Analyze | the $q$-vs-$-q$ ring (great circle through $q,-q$), current quaternion components, total angle turned, "belt slack? yes/no" |
| **Compare** | `readout` | Analyze | the ghost $3\times3$ matrix (returns at $360°$) beside the belt/sign state — the Skeptic's resolution |
| **Sandwich** | `drive` | Drive | *(progressive disclosure)* the $q\,v\,q^{-1}$ staging that explains why $360°$ only reaches $-q$ (folds in Candidate C) |
| **Detail** | `quality` | System | ribbon segment count, render quality |

**`ViewDef[]` view(s).** One primary `view`: the block + twisting ribbon in a
`Canvas3D` scene, drag to orbit the *camera*, a separate handle/panel to turn the
*block*. Wrap in the standard `position:absolute; inset:0; touchAction:'none'`
window body. Consider `immersive` (the desktop twin of phone solo view) so the
ribbon fills the stage with the panels floating over it. The sign dial can be a
small second `view` or live in its readout panel.

**On-ramp view (most illuminating first frame).** The block at rest with a flat,
untwisted ribbon and a `hint: 'drag the block one full turn — then try to undo the
twist'`. The whole lesson is latent in that first action: turn once, fail to
undo; turn again, succeed.

**Explainer angle (originator's framing, from the transcript).** Open with
Hamilton's own words from the room: *"the part I would most want a learner to feel
— the belt going slack only at the second turn — I never had a name for at all."*
Then C1's wall as the back-story (no three-number system; $15$ is not a sum of
three squares, so the product needs a fourth slot), and the belt as the payoff:
the matrix is the block, the quaternion is the belt. Source the EXPLAINER.md from
the foundation's §1, §3, §5 and the formula reference (axis–angle, the sandwich,
the double cover).

**Action strip** (`ActionDef[]`, BUILDING_AN_APP.md §4d — the app is partly inert
until you turn the block): `Turn +360°` (primary), `Turn −360°`, `Reset`,
`Untwist` (attempt to shake the loop free) — `sectionId: 'turn'`, ≤5, one primary.

**Route / registry edits** (all append-only, per §3 and §8):

- `src/index.tsx` — `const TheBelt = React.lazy(() => import('./animations/TheBelt/TheBelt'))` + `'/the-belt': TheBelt` in `routes`.
- `src/apps.ts` — `{ hash: '/the-belt', name: 'The Belt', icon: '🎗', blurb: 'Turn it once and the twist won\'t leave — turn it twice and it does. The double cover you can feel.' }`.
- `src/chrome/catalog.ts` — `'/the-belt': { cat: 'Dynamics', kind: 'trinary' }` (closest existing preview kind; a bespoke preview is a nice-to-have).
- `CLAUDE.md` Routing table + repo-tree line; `README.md` app list + tree.

**Honest caveats (what the picture distorts).** (1) The belt/ribbon is a *model*
of orientation entanglement, not a derivation — the connection between "ribbon
won't untwist" and "$q \to -q$" is asserted by the sign dial, not proven; label it
as a *demonstration*. (2) The sign dial projects the unit 3-sphere to a single
great circle — it shows the $q,-q$ diameter faithfully but hides the rest of
$S^3$; do not let it read as "the whole space of quaternions." (3) Camera-orbit
and block-turn must stay visually distinct or learners will conflate "I moved my
view" with "I turned the object" — the exact pure-vs-unit / point-vs-action
confusion in the foundation's §5.8 and §5.5. (4) The Hopf fibration and full
stereographic-$S^3$ pictures (foundation §4, quarantined) are deliberately **not**
the entry point — they are optional advanced depth, earned only after the belt.

## 5. Next steps

Run **`/three-hats docs/sessions/progress/quaternion-exploration-app-ig4jmy/2026-06-18-S03-concept-plan.md`**
before building — review *The Belt* through the framework-maintainer,
architecture-consultant, and math-viz/pedagogy lenses, especially: is the
ribbon-mesh twist cheap and robust in `Canvas3D`, and is the "ribbon ⇒ sign"
claim pedagogically honest or does it need an explicit bridge to the $q,-q$ dial?

## Self-reflection

1. **What would you do with another session?** Prototype the ribbon-twist geometry
   in `Canvas3D` to confirm the "won't untwist until 720°" is renderable as a
   continuous mesh deformation rather than a scripted animation — that single
   feasibility question gates the whole recommendation. I would also draft the
   actual SLERP-vs-Euler race math for the folded-in Candidate B layout.
2. **What would you change about what you produced?** The sign-dial readout is the
   weakest-specified piece; I asserted "great circle through $q$ and $-q$" but did
   not pin down how a learner reads belt-slack off it without it feeling like a
   separate, unmotivated gauge. That bridge is exactly the C6 friction and
   deserves more design.
3. **What were you not asked that you think is important?** Whether the belt-trick
   is honest *enough* — it is a demonstration of orientation entanglement, not a
   proof of the double cover, and an app that over-claims "see, quaternions!"
   would betray the very precision the foundation models. I flagged it as caveat
   (1) but it is really a pedagogical fork worth a decision.
4. **What did we both overlook?** A bespoke gallery preview for a twisting ribbon
   (`src/chrome/previews.tsx`) — I defaulted to the `trinary` kind, but the twist
   is so visually distinctive that a custom preview would carry the gallery card.
   Minor, but it is the app's best hook.
5. **What did you find difficult?** Keeping the transcript's voices genuinely
   orthogonal under the press rule without letting the writer's hindsight leak in
   — the temptation to have a voice "already know" the resolution and skip the
   friction. The belt sequence in particular had to be carried out beat by beat
   (turn once, fail, turn twice, succeed) rather than summarized, or the felt
   content evaporates.
6. **What would have made this task easier?** A rendered example of an existing
   ribbon/strip mesh in the codebase; I had to reason about `Canvas3D` twist
   geometry from the corridor/scene apps (`TopologyWalk`, `PolygonWorlds`) without
   confirming a ribbon primitive exists.
7. **Follow-up value:** MEDIUM — the plan is internally consistent and well-sourced,
   but the two load-bearing feasibility questions (ribbon-twist as a continuous
   mesh; the ribbon⇒sign pedagogical bridge) are unverified and would materially
   shape the build; `/three-hats` plus a quick `Canvas3D` spike would resolve both.
