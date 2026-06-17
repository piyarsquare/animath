---
kind: lens
session: 2026-06-17-S01
date: 2026-06-17
title: "Quaternions — lens: The Builder"
branch: claude/quaternion-exploration-app-ig4jmy
slug: quaternion-exploration-app-ig4jmy
status: complete
build: n/a
---

# Quaternions — lens: The Builder (animath framework fit)

<details><summary>Concept under exploration</summary>quaternions — Hamilton's 4D number system (a + bi + cj + dk) and the algebra of 3D rotation: unit quaternions on S³ = SU(2), the sandwich product q v q⁻¹, axis–angle with its half-angle, the SU(2)→SO(3) double cover (q and −q, the 720° belt/plate trick), the Hopf fibration, and the eater.net/3B1B stereographic-S³ picture.</summary></details>

I am the animath framework engineer. My job is not to decide what is *worth*
showing — the other lenses do that — but to say, for each picture the concept
implies, **what the framework renders well and cheaply, what fights it, and how
big each build is**. I read `viewpoint.ts`, `quat4.ts`, `types.ts`,
`archetypes.ts`, `Canvas3D.tsx`, and `QuarterTurnControls.tsx` to ground this.

## What the framework already hands us for free

The reusable surface is larger than it looks, but it is *4D-particle* shaped,
not *rotate-a-mesh* shaped. Concretely:

- **`src/lib/viewpoint.ts`** is the crown jewel. It has `quatMul`, `quatConj`,
  `quatRotate4D` (the two-sided `a·p·conj(b)` map), `makeUnitQuat(angle, axis)`,
  and — the big one — `project(p, mode)` with **`Stereo`** (stereographic from
  the unit-normalized pole, the exact eater.net map) and **`Hopf`** (a *faithful*
  Hopf map landing every point on S²) plus `Torus` (Clifford-torus stereographic,
  the "uncollapsed Hopf"). **The stereographic-S³ and Hopf views the concept
  wants already exist and already ship in Complex Particles.** This is pure
  TypeScript on `THREE.Vector4` — usable from any custom app with no shell.
- **`src/math/quat4.ts`** — `quarterQuat(plane, θ)` left/right unit-quaternion
  builder for the six 4D planes. Less central here (it's for 4D *rotation of the
  preimage*, not 3D-object rotation) but available.
- **`QuarterTurnControls`** — a ready, polished drive-tier rotation UI (eighth
  turns, continuous spins, drop-axis, reset). It is *plane*-oriented (XY…UV), so
  for a 3D-rotation app we'd more likely author a simpler axis–angle panel, but
  it's a proven pattern to copy.
- **`<Workspace>`** gives us, free: `immersive` single-view (fills the stage —
  Polygon Worlds uses it), an `actions` strip (≤5 verbs projected from a
  drive/playback panel), split **`panes`** (two pictures, one window, fixed equal
  split — Plane Transform's domain/image), top-bar **mode pills**, the `?`
  explainer, skins, layouts + persistence. Split panes are a perfect fit for an
  **object ↔ S³-map** side-by-side.
- **`Canvas3D`** — turnkey Three.js scene/camera/renderer with the resize +
  cleanup contract already wired (collapsed windows report zero size and are
  ignored, so WebGL state survives collapse/fullscreen).

**The honest verdict on the shell:** `ParticleViewerShell` + `lib/particles` is
**function-graph oriented** (domain sampling, colormaps, render modes over a
complex function). A quaternion *rotation* app has a different subject — a rigid
object and a path on S³ — so it should be a **custom `Canvas3D` + `<Workspace>`
app**, the way Trinary, Polygon Worlds, and Correspondence are. We reuse
`viewpoint.ts`'s math and `project()`, not the shell. That is the single most
important framing decision and it makes the build *smaller*, not larger, because
we skip the multi-sheet material plumbing.

## Candidate pictures, rated by build cost

Costs are S (≈ hours, one panel + straightforward geometry), M (≈ a day, custom
geometry or two linked views), L (multi-day, novel interaction or animation
nobody in the repo has built).

### 1. Live 3D object rotated by a unit quaternion — **S, the spine**

A mesh (a lit cube/teapot/airplane/asymmetric "F") with `mesh.quaternion` driven
by app state. Three.js *is* quaternions natively — `THREE.Quaternion`,
`setFromAxisAngle`, `slerp` are all built in. The axis–angle panel (axis on S²
via two sliders or a draggable handle + a θ slider) writes straight to the mesh.
A readout panel shows `(w, x, y, z)`, θ, axis, and the live half-angle. **This is
the cheapest, highest-value picture in the whole concept** and the framework was
born to render it. Camera orbit is standard `Canvas3D` + a small gesture handler
(copy `useGestureRotation`/`useViewportGestures` patterns). **Cost: S.**

### 2. Stereographic S³ view (eater.net / 3B1B) — **S–M, mostly already built**

`project(q, ProjectionMode.Stereo)` maps a unit quaternion in `THREE.Vector4`
form to a point in ℝ³. To reproduce the eater.net picture we render: the current
`q` as a dot; its **antipode `−q`** as a second dot (the double cover, free —
just negate); and optionally the **path** `q(t)` swept as the object rotates
(a polyline of recent projected positions). The reference frame (unit basis
quaternions 1, i, j, k projected) anchors it. All math exists; the work is
assembling points/lines into a Three.js scene and a camera. **Cost: S for the
single dot + antipode; M if we add the swept great-circle path and a tasteful
reference cage.** This is the picture the concept's gold-standard demands and the
framework is *unusually* well-positioned to ship it.

### 3. Object ↔ S³ side-by-side (split `panes`) — **M, high payoff**

Picture 1 in the left pane, picture 2 in the right pane, **one window**, sharing
one `q` state. This is exactly what `PaneDef`/`panes` exists for (Plane
Transform's reference consumer). The payoff is enormous pedagogically: the
learner sees the *same* `q` as both an orientation and a point on S³, killing the
"confuse the quaternion with the rotation it encodes" pitfall (foundation §5.5).
**Cost: M** (two Three.js contexts, but each is cheap; the wiring is the
established split-pane pattern). Two WebGL contexts in one window is untried in
the repo's split panes (Plane Transform's panes are 2D shader quads) — a small
**risk** to verify, but `Canvas3D` instances are independent so it should hold.

### 4. Euler / gimbal-lock comparison — **M**

Three nested gimbal rings (yaw/pitch/roll) as Three.js tori, driven by three
Euler sliders, with the same object inside. As pitch → 90° two rings align and a
DOF visibly collapses; a "same orientation, two Euler paths" readout drives the
point home. Geometry is simple (three `TorusGeometry` rings + the object); the
*content* is the work — choosing the failure demo and the side-by-side
quaternion-doesn't-lock counterpoint. **Cost: M.** Pure standard Three.js, no
framework friction.

### 5. Hopf fibration — **M, math is free, the render is the cost**

`project(p, ProjectionMode.Hopf)` is faithful and already used by Complex
Particles, but the *classic Hopf picture* (nested Villarceau-circle tori, each
fiber a linked ring) is a **rendering** task: sample base points on S², lift each
to its S¹ fiber, stereographically project the fibers to linked circles, color by
base point. That's a custom geometry builder, not a one-liner. The repo has the
projection but not this assembly. **Cost: M** (more if we want the gorgeous
nested-torus look with many fibers and transparency tuning). Best framed as an
*advanced/optional* view, per the foundation's own warning that Hopf is "easy to
admire without understanding."

### 6. 720° belt / plate trick — **L, the framework's weak spot**

This is the one picture that **fights** us. Animating a physically convincing
twisted belt (or a hand-held plate on a tracked arm) that *untangles* after 720°
requires either a deformable ribbon mesh with per-segment twist or an articulated
arm rig — neither exists in the repo and both are genuinely hard to get
*legible*. The honest, cheap alternative the framework *can* do well: render the
**quaternion path on the stereographic S³ view** and show that a 360° object
turn traces a path from `q` to `−q` (a half-loop that does *not* close) while
720° returns to `q` (a closed loop). That re-expresses the spinor weirdness using
picture 2's machinery at **S–M cost** and is arguably *more* rigorous than a
belt. I'd recommend shipping the S³-path version and treating a literal belt as
out-of-scope or a stretch goal. **Belt mesh: L and risky; S³-path proxy: S–M.**

### 7. Non-commutativity (X-then-Y vs Y-then-X) — **S**

Two copies of the object, same two rotations applied in both orders, ending in
visibly different poses. Trivial with `THREE.Quaternion` multiplication. A great
cheap "aha" that drops straight onto picture 1's machinery. **Cost: S.**

### 8. SLERP path / interpolation — **S**

`THREE.Quaternion.slerp` is built in; animate the object from `q₀` to `q₁` along
the great-circle arc, optionally tracing that arc in the S³ view (reusing picture
2). A `playback`-tier panel (play/scrub) drives it; the `actions` strip surfaces
play/reset. **Cost: S**, and it reuses the S³ view to *show* the arc is a
geodesic.

## Archetype mapping (the panels write themselves)

The closed 11-archetype vocabulary covers this app cleanly — no new icons needed
(per `archetypes.ts`, the vocabulary is closed):

- **`subject`** — choose the object/mesh (cube · airplane · asymmetric F · teapot).
- **`domain`** — set `q` directly: axis (S² handle or two angle sliders) + θ.
- **`view`** — camera/projection: which view(s) shown, S³ projection mode
  (Stereo vs Hopf vs Torus — *exactly* the `ProjectionMode` enum).
- **`color`** — color the object faces / the S³ dots & paths.
- **`drive`** — hands-on rotation (the axis–angle/quarter-turn controls;
  compose-two-rotations toggle).
- **`playback`** — SLERP transport (play / step / scrub between `q₀`, `q₁`),
  the 360°↔720° sweep.
- **`readout`** — the live `(w,x,y,z)`, θ, half-angle, axis, `q·(−q)` double-cover
  badge, gimbal-lock indicator. Uses `chrome/readouts.tsx` primitives
  (StatGrid / Kicker).
- **`quality`** — fiber count / path-length / DPR.

A `marks` panel (how the S³ dots/fibers are drawn) and `motion` (idle auto-spin)
round it out. **Mode pills** could switch top-level chapters
(Rotate · S³ · Gimbal · Hopf), or those can be **layouts** (open/close views) —
the latter is cheaper and matches Stable Matching's matrix/welfare/lattice
pattern.

## Reuse opportunities and risks, summarized

**Reuse (free or near-free):**
- `viewpoint.ts` `project()` Stereo/Hopf/Torus + `quatMul`/`quatConj` — the S³
  and Hopf maps are *done and shipping*.
- `THREE.Quaternion` native (`setFromAxisAngle`, `slerp`, multiply) for all
  object rotation — no custom math needed for the spine.
- `<Workspace>` split `panes` for object↔S³; `immersive` for a focused solo
  view; `actions` strip for play/reset; layouts for chapters.
- `Canvas3D`'s resize/cleanup/collapse-survival contract.
- `chrome/readouts.tsx` for the analyze panels; `ControlPanel` primitives for
  every control.

**Risks / friction:**
- **Two WebGL contexts in one split-pane window** is untried (Plane Transform's
  panes are 2D shader quads). Low risk — `Canvas3D` instances are independent —
  but verify early. *Mitigation:* if it stutters, make the S³ view a separate
  view window instead of a pane (the framework supports either).
- **Belt/plate trick (picture 6)** is genuinely hard — deformable ribbon or
  articulated rig, neither in the repo. *Mitigation:* ship the S³-path spinor
  proxy (S–M) instead; treat a literal belt as a stretch goal.
- **Hopf classic render (picture 5)** — the projection is free but the
  nested-fiber *assembly* is custom geometry; budget M and keep it optional.
- `ParticleViewerShell` is a **temptation trap** — it looks reusable but its
  function-graph orientation would force the rotation subject into the wrong
  mold. Build custom on `Canvas3D` instead; it's *less* code.

## Takeaways for a visualization

1. **The spine is cheap and the framework was built for it.** A live 3D mesh
   driven by `THREE.Quaternion` (axis–angle in, sandwich semantics shown) plus a
   stereographic-S³ view reusing `viewpoint.ts`'s *already-shipping* `project()`
   is an **S/S–M** build. The app's core — picture 1 + picture 2 in a split
   `panes` window with one shared `q` — is the highest-payoff, lowest-cost
   combination available and directly defuses the worst learner pitfall (object
   vs. quaternion). Build this first.

2. **Show the double cover and the 720° truth in S³, not as a belt.** Negating
   `q` is free; rendering the rotation *path* on the stereographic S³ view turns
   the spinor weirdness (360° → `−q`, 720° → closed loop) into an **S–M** picture
   that is more rigorous than an expensive (**L**, risky) animated belt. Let the
   framework's strength (S³ projection) carry the concept's hardest idea.

3. **Custom `Canvas3D` + `<Workspace>`, archetypes off the shelf, no
   `ParticleViewerShell`.** The panels map onto the closed vocabulary with no new
   icons; chapters become layouts (cheap) before mode pills. This keeps the build
   conflict-free, on-pattern, and scoped to its own self-contained folder.

## Self-reflection

1. **What would you do with another session?** Prototype the split-pane two-WebGL
   spike (picture 3) to confirm two `Canvas3D` instances share a window cleanly,
   and sketch the S³ swept-path geometry — those are the two unverified assumptions
   behind my cost estimates.
2. **What would you change about what you produced?** I gave cost letters from
   reading, not from a spike; the M/S boundary on the S³ swept-path could move once
   built. I'd flag those two as "estimated, unspiked" more loudly.
3. **What were you not asked that you think is important?** Performance budget:
   Hopf with many fibers + transparency, plus a second live context, could push DPR
   limits on phones. The `quality` panel should cap fiber count and path length;
   worth an explicit note to the synthesis.
4. **What did we both overlook?** Phone/`usePhone` behavior of a split-pane
   two-canvas view — phones solo views and re-chrome; the object↔S³ pair may need a
   phone-specific fallback (stack or tab) rather than side-by-side panes.
5. **What did you find difficult?** Drawing the line between "free" and "near-free"
   for the S³ views — the *math* is shipping, but the *render assembly* (paths,
   reference cage, Hopf tori) is real work that's easy to under-bill.
6. **What would have made this task easier?** A quick grep of how Plane Transform
   wires its two panes (I inferred the contract from `types.ts` rather than reading
   its consumer); confirming whether panes can each host a `Canvas3D` would have
   firmed up picture 3's cost.
7. **Follow-up value:** LOW — the feasibility ranking is sound and grounded in the
   actual code; the only open items are two small spikes (two-canvas panes, S³ path
   geometry) that refine cost estimates but won't change which pictures are
   buildable.
