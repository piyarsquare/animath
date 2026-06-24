---
kind: lens
session: 2026-06-18-S05
date: 2026-06-18
title: "Quaternions — design lens: Builder & math fidelity"
branch: claude/quaternion-exploration-app-ig4jmy
slug: quaternion-exploration-app-ig4jmy
status: stopped
build: n/a
app: general
---

# Quaternions — Design Lens: Builder & Math Fidelity

**I back Candidate A (The Belt), built so that C (The Sandwich) is not a buried
"progressive-disclosure panel" but a first-class second layout, with B (Slerp
Racer) deferred to a follow-up app.** The prior plan got the spine exactly
right — C6, the double cover, is where felt and formal coincide (I3) — but it
under-weights one feasibility risk that should reshape the build, and it
mislabels the cheapest high-fidelity move available. This lens fixes both.

## Why A, and why C rides with it (not B)

The atlas is unambiguous: the single richest thing to put under a learner's
hands is the belt/plate twist (I3), and the half/double factor is the concept's
heartbeat (I1), surfacing at C2, C3, and again at C6. That last point is the
lever the prior plan leaves on the table. **The Belt and The Sandwich are the
*same factor of two seen twice*** — the belt's "360° only reaches −q, 720° comes
home" *is* the sandwich's "each side carries θ/2." If the app makes a learner
feel the half once (belt) and then *see why* it is a half once (sandwich), I1 is
satisfied honestly inside one app. That is a stronger pedagogical unit than
A-alone, and it costs far less than A+B because the sandwich reuses the very
same `THREE.Quaternion` and the same scene, just driven differently.

B (Slerp Racer) is excellent but it is a *different app*: different inert-app
shape (a `playback` timeline, two meshes, an Euler-vs-SLERP foil), different
"why care" register (C4/C5, the practitioner), and it does not deepen C6 — it
sits beside it. Folding B in as a "mode" would split the appId's state and
double the surface area for no shared insight. Ship it later as its own route
(`/slerp-racer`) that *links from* The Belt's explainer. Sequence, don't merge.

## (a) Feasibility & cost in this framework

**Pattern: Custom 3D scene via `Canvas3D`** (BUILDING_AN_APP.md §1, row 3). The
canonical reference is `PolygonWorlds.tsx` — its `onMount` returns nothing and
parks the rAF id in `rafRef`, with a separate unmount `useEffect` that calls
`cancelAnimationFrame(rafRef.current)` and disposes (lines 90–158, 214–218). I
recommend the **cleaner Canvas3D contract instead**: have `onMount` *return* the
cleanup closure (the wrapper invokes it before disposing the renderer, see
`Canvas3D.tsx:50,73–80`), so the rAF id and disposables stay local to the
closure. PolygonWorlds predates that and uses refs; we don't have to.

**The critical gotcha applies directly** (§5): `onMount` runs once and closes
over stale state. The drive panel changes the turn angle every frame, so the
loop must read it through a `ref` updated by a one-line `useEffect`
(`turnRef.current = turn`), exactly the `*Ref.current` pattern PolygonWorlds uses
for every slider (lines 177–184). Do **not** put `turn` in the `useCallback`
deps — that remounts the scene and kills the WebGL context on every drag.

**Reuse, concretely:**

- **Orientation math:** `THREE.Quaternion` directly. `setFromAxisAngle(axis,
  angle)` *is* the axis–angle map with the half-angle already inside it — Three
  computes `(sin(θ/2)·axis, cos(θ/2))`. We get the half-angle for free and
  should expose it, not hide it (see fidelity §b).
- **`src/math/quat4.ts`** is a *4D-plane* rotation builder (`quarterQuat` returns
  an `{L, R}` pair for the particle viewers' `L·p·conj(R)` double-sided action).
  The prior plan cites it as "a quaternion-rotation builder already in the repo";
  that is misleading. It is **not** the 3D-rotation tool for this app — the
  sandwich here is the *3D* `q v q⁻¹` on a `THREE.Vector3`, which is just
  `vec.applyQuaternion(q)`. quat4.ts is a useful *read* (it shows the repo's
  convention that a 4D rotation is genuinely two-sided), but I would not import
  it. Flagging this so the builder doesn't waste a session wiring it in.
- **Camera orbit:** `useGestureRotation` is bound to `ParticleState` and cannot
  be dropped in as-is. Lift its **turntable pattern** (the `turntableQuat(az,el)`
  helper + `ORBIT_SENSITIVITY` + the pole clamp, lines 19–23, 145–154) into a
  ~40-line local hook over plain `useState`. This keeps the project's
  *looking-vs-navigating* law (camera orbit must stay visually distinct from
  turning the block — that conflation *is* foundation §5.5/§5.8).
- **Key handler guard:** copy the `inFormField()` early-return verbatim
  (PolygonWorlds 193–212) for the `Turn +360°` keyboard affordance.
- **Ribbon geometry:** the one genuinely new piece (see risk below).

**The ribbon is the only real cost, and it gates the recommendation.** A belt
twisting continuously with the block is a `THREE.TubeGeometry` (or a custom
`BufferGeometry` strip) whose frames interpolate from 0 twist at the fixed wall
to the block's full orientation at the clip — rebuilt each frame from the
current `turn`. This is cheap (a few hundred segments) and robust *as a
visual*, but the "won't untwist until 720°" must be an **honest geometric
consequence**, not a scripted animation. The safe construction: parameterize the
ribbon's twist as a continuous function of arc length `s∈[0,1]` whose endpoint
twist equals the accumulated turn; an "Untwist" attempt tries to slide the
*homotopy* (loop the belt end around) and the residual twist is `turn mod 720°`
mapped to whether a full untwist exists. **I would spike this geometry first**
(half a session) before committing — the prior plan's self-reflection flags the
same thing, and it is correct that this single question gates everything.

**`SectionDef[]` (archetypes from the closed vocabulary):**

| Panel | id | `arch` | Tier | Body (ControlPanel primitives) |
|---|---|---|---|---|
| **Block** | `block` | `subject` | Define | `Select` mesh (book / plate / hand); `Checkbox` ribbon on/off; `Slider` ribbon width |
| **Camera** | `camera` | `view` | Render | `Pills` orbit Turntable\|Free; reset-view button |
| **Turn** | `turn` | `drive` | Drive | axis `Pills` (X/Y/Z) or a small axis pad; **`Slider` turn 0–720°**; the hands-on control, mirrored by the action strip |
| **Sandwich** | `sandwich` | `drive` | Drive | the staged `q v q⁻¹`: a `Slider` for θ, a Pills toggle "show left-mult / show inverse-mult"; drives the *same* scene into a vector-rotation diorama |
| **Sign dial** | `signal` | `readout` | Analyze | the q↔−q ring; live `(a,b,c,d)` components; "total angle turned"; "belt slack? yes/no"; built from `chrome/readouts.tsx` (`StatGrid`, `Kicker`) |
| **Compare** | `compare` | `readout` | Analyze | the ghost 3×3 matrix (returns at 360°) beside belt/sign state — the Skeptic's resolution, `StatGrid` |
| **Detail** | `detail` | `quality` | System | `Slider` ribbon segments; render quality |

That is **two `drive` panels** (`turn`, `sandwich`) — legal: the vocabulary
allows shared archetypes (ParticleViewerShell ships two `marks` panels), and the
rail tier-sorts them together. **Two `readout` panels** likewise.

**`ViewDef[]`:**

- **One primary `view`** `belt`: block + twisting ribbon in a `Canvas3D` scene,
  wrapped `position:absolute; inset:0; touchAction:'none'`, camera-orbit
  gestures inside the body. `hint: 'turn the block one full turn — then try to
  undo the twist'` (the whole lesson is latent in that first action). Strongly
  consider `immersive` so the ribbon fills the stage (desktop twin of phone solo
  view), panels floating over it.
- **The sign dial is a `readout` *panel*, not a second view.** It is a 2D SVG
  gauge, ~140px; making it a draggable view window over-weights it and invites
  the "this is the whole space of quaternions" misread (fidelity §b.3).

**Layouts:** `Feel the twist` (default — belt view + Turn + Sign dial) and
`Why a half` (belt view reused as a vector diorama + Sandwich + Compare, with
`views: {}` unchanged since there's one view). Compact/Everything auto-append.

**Action strip** (`ActionDef[]`, the app is inert until you turn it):
`Turn +360°` (primary), `Turn −360°`, `Reset`, `Untwist` — all
`sectionId:'turn'`, ≤5, one primary. Correct call by the prior plan.

**Registry edits** (append-only): `index.tsx` lazy + route `/the-belt`;
`apps.ts` descriptor; `catalog.ts` META (`kind:'trinary'` is the honest
fallback, but a bespoke twisting-ribbon preview in `previews.tsx` is the gallery
card's best hook — worth the hour). Plus the CLAUDE.md/README.md rows.

## (b) Math fidelity — where a pretty picture would lie

This is the keeper's section. Three places the obvious visual teaches a **false
mental model**, and how to render honestly.

**1. q vs −q must be shown as two *distinct points* mapping to one *identical*
pose — never as "the quaternion changed but nothing happened."** The honest
rendering: the **block's pose is literally computed from q** (`block.quaternion =
q`), and a ghost overlay computes the same pose from `−q`
(`block.quaternion = q.clone().multiplyScalar(-1)` — wait: that is *not* how you
negate a THREE.Quaternion's action; you must set all four components negative,
`new Q(-q.x,-q.y,-q.z,-q.w)`). Render both; they **coincide pixel-for-pixel**.
That coincidence — two visibly different dots on the sign dial, one block — *is*
the double cover. The lie to avoid: animating q "flipping" while the block sits
still implies the sign is a hidden gremlin. It is not hidden; it is *redundant in
the pose and decisive in the path*. The Skeptic's own words ("the quaternion
keeps the path") are the honest framing.

**2. The half-angle must be visible as a *ratio*, never asserted.** The
foundation §5.3 and the atlas C3 both demand: the **object turns by θ while the
quaternion's internal angle turns by θ/2**. Render this literally — a second
small arc on the sign dial sweeps at exactly half the rate of the block's
visible turn, side by side, *live*. The false model to refuse: a label that just
*says* "½θ." The honest mechanism is the staged sandwich (the `sandwich` panel):
left-multiply `q·v` produces a quaternion with a **nonzero scalar part** (the
vector "leaves pure" — show the scalar component lifting on a 4th-axis readout
bar), and right-multiply by `q⁻¹` **cancels that scalar and doubles the wanted
rotation**. The doubling is *why* each side carries half. Showing only the net
result ("see, it rotated by θ") hides the entire point of C3.

**3. The sign dial projects S³ to a single great circle — it must be labeled as
such, or it lies by omission.** The dial faithfully shows the q,−q **diameter**
(the great circle through q and −q) but hides the rest of the 3-sphere. The
caveat from the prior plan (its §"Honest caveats" #2) is right and must be in the
UI, not just the explainer: title the gauge "the q / −q circle" (a *slice*), not
"the space of quaternions." **Do not** reach for stereographic-S³ or the Hopf
fibration here (foundation §4, quarantined by I4) — they are earned advanced
depth, not the entry point, and dropping them in would betray the
"need-before-object" directive.

**4. The belt is a *demonstration*, not a *derivation* — say so.** The link from
"ribbon won't untwist" to "q→−q" is *asserted by the sign dial running in
lockstep with the twist*, not proven. This is honest **if and only if** the two
are visibly coupled (same θ drives both) and the app calls it a demonstration of
orientation entanglement. The bridge the prior plan's self-reflection worried
about is exactly this: the sign dial is what makes the belt *mean* the double
cover. Build that coupling as the core invariant, not a decoration.

## Takeaways

1. **Ship The Belt with The Sandwich as a co-equal second layout (`Why a
   half`), and defer Slerp Racer to its own later route.** The belt and the
   sandwich are one factor-of-two seen twice (I1); B is a different app. This is
   my sharpest disagreement with the prior plan, which buries C and folds in B.
2. **The sign dial running in *exact lockstep* with the ribbon twist (same θ
   drives both) is non-negotiable** — that coupling is the only honest bridge
   from "felt twist" to "q→−q double cover"; without it the belt is a parlor
   trick. Label the dial as the q/−q *slice*, never "the space of quaternions."
3. **Spike the continuous-twist ribbon geometry before committing the build**,
   render q and −q as two distinct points hitting one identical pose, and show
   the half-angle as a live half-rate arc — never a static "½θ" label. And
   ignore the prior plan's `quat4.ts` reuse: this app's rotation is 3D
   `applyQuaternion`, not the 4D `{L,R}` pair.
</content>
</invoke>
