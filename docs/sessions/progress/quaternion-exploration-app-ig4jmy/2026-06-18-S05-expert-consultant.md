---
kind: three-hats
session: 2026-06-18-S05
date: 2026-06-18
title: "Three Hats — Architecture Consultant on The Belt"
branch: claude/quaternion-exploration-app-ig4jmy
slug: quaternion-exploration-app-ig4jmy
status: proposed
build: n/a
app: the-belt
---

# Three Hats — Architecture Consultant on The Belt

I am the Architecture & Quality Consultant: one of three independent reviewers.
I judge this design on structural merits — pattern fit, boundary placement,
maintainability, performance/footprint, and how anyone gains confidence it is
correct given that `npm run build` is the only CI gate. I have no attachment to
the existing code; where a known pattern fits, I will say so, and where the plan
adds complexity without a concrete need, I will push back.

The headline: **this is a well-shaped app for the framework.** The hard parts
(the gated reveal, the 2:1 gearing, the q/−q rendering) reduce to small,
nameable, testable abstractions, and the Builder section already pre-empts the
two traps I would otherwise have led with (the wrong quaternion module, and a
shared camera/block gesture). My concerns are about *where the cost lives* (the
per-frame ribbon mesh) and *where the seams are* (persistence of the unlock, and
verification of math identities that no `tsc` pass can catch).

## Plan under review

<details>
<summary>Original request</summary>

```markdown
---
kind: plan
session: 2026-06-18-S05
date: 2026-06-18
title: "Quaternions — design-team verdict + build spec (The Belt)"
branch: claude/quaternion-exploration-app-ig4jmy
slug: quaternion-exploration-app-ig4jmy
status: proposed
build: n/a
app: general
---

# Quaternions — The Design Team's Verdict

Stage 4 run as a real **second team**: five model-diverse specialists (Builder/math · opus, Game Designer · opus, Educator · haiku, Illustrator · sonnet, Visual Designer · sonnet), each consuming the atlas, the live transcript, the foundation, and the candidate set — then a director-routed **critique round** to resolve the one real disagreement. This file is the synthesis.

## Verdict
**Build Candidate A — *The Belt* — unanimously.** All five specialists, reasoning from different lenses on different models, picked A independently: it is the only candidate that lands on crossing **C6** (the felt double cover, where the atlas says *felt = formal*), the only one whose core image survives all five skins and the phone, and the only one that *contradicts a learner's intuition* hard enough for the surprise to stick.

**v1 scope (resolved in the critique round):** ship The Belt with the **Sandwich (C)** built in as an **earned-reveal second layout — "Why a half"** — *gated behind a completed 720° cycle*. **Slerp Racer (B)** is deferred to its own later route. This was the live disagreement (Educator: ship A alone; Builder: C co-equal; Game Designer: C as earned reveal); the room converged on the earned-reveal middle — see the critique outcome below.

## The critique round (scope: does v1 include the Sandwich?)
- **Builder** (opening): C and the belt are *the same factor of two seen twice* (atlas I1) — the learner only believes the double cover is fundamental, not a belt trick, when the factor surfaces a second way. Conceded that co-equal *at launch* spoils the surprise; moved to: build C in v1 but as an earned reveal.
- **Educator**: accepted, and **sharpened the gate** — unlocking after a single 360° teaches nothing; the learner must *feel the failure then the success* (turn to 360°, ribbon still twisted; push to 720°, it unwinds) before earning "why two?"
- **Game Designer** (close): ratified the 720°-completion trigger but fixed the framing — 720° is the *unlock condition*, never a stated goal. Two felt beats: (1) near 360° the ribbon stays twisted, sign sits at −q, and the only affordance is **"keep going"** (not reset) — the productive frustration; (2) pushing through to 720° lands clean, q snaps to +q, and *that* fires the unlock. The reveal is a quiet, non-modal **"Why a half?"** chip beside the readout, claimed on the learner's terms; claiming it restages the *same block and ribbon* into the sandwich q·v·q⁻¹ — "you turned the frame once (q), but a vector you carry is hit on both sides, so it feels the rotation twice; that is why 360° was only half-untwisted and why the visible angle is θ/2." Felt mystery and math answer are one object, shown from two sides.

## The unified visual + interaction spec
### Core loop (Game Designer)
Grab the block and **drag it about its axis**; the ribbon twists in lockstep and the sign readout sweeps at **exactly half your rate** (2:1) — one full hand-turn drives the sign only halfway home (to −q). The hand learns θ/2 before the head does. The on-ramp's first posed task is the **failed untwist**: "drag one full turn, then try to shake the twist out" — it refuses until you go around twice. This reframes The Belt from *sandbox* → **puzzle box whose lock is the double cover**.

### Readout hierarchy (resolves the Visual-Designer ↔ Builder ↔ Illustrator tension)
Encode q vs −q **shape-first and multi-channel — never color alone** (accessibility):
1. **Primary (felt):** the **painted center stripe** down the ribbon (Illustrator). At 0° and 720° it faces the same way at both ends — "home." At 360° it has done one half-rotation: correct at the clamp, **facing the wrong way at the block**. A stripe pointing the wrong way is legibly *wrong* with no labels, no color theory, no math.
2. **At-a-glance confirm:** the live scalar **w = −1.000** number in the mono font (Visual Designer) — ticks to −1 at 360°, back to +1 at 720°. Direct, readable in every skin.
3. **Optional depth:** the **q-vs-−q ring** (the S³ great circle) — *not* required to deliver the lesson; offered for the curious. The sign dial runs in **exact lockstep with the twist** — one θ drives both — which is the only honest bridge from felt twist to q→−q (Builder).
4. **The Skeptic's resolution:** a **ghost 3×3 matrix** panel that returns to *identity at 360°* while the stripe, ribbon, and sign do not — "the matrix is the block; the quaternion is the belt" made interactive.

### Making 360° ≠ 720° unmistakable (Illustrator)
At 360°, **three readouts disagree on purpose**: block face home (compass-rose upright) and matrix = identity *both say "home,"* while stripe-wrong-way and sign = −q *say "not yet."* The learner **scrubs the turn slider** between 360° and 720° and watches only the ribbon and sign change while block and matrix stay locked at identity — no memory required; both states live on one scrub.

### Motion (Visual Designer)
Spend the surprise budget (exactly one) on the **untwist**: a single designed moment (~1.25 s, two phases — twist peaks tighten, then either a clean dissolve at 720° or a refusal-and-wobble at 360°). Everything else is real-time response to the drag.

### Layout (Illustrator — overrides the prior plan)
**Windowed "jeweler's bench," not `immersive`.** The learner must compare ribbon, sign readout, and ghost matrix *simultaneously at arm's length*; immersive hides the panel chrome and is for first-person walkers. This reverses the S03 plan's "consider immersive."

### Learning arc (Educator), mapped to atlas crossings
1. **Feel the resistance** (C6/C1) — turn to 360°, the belt won't undo. *Self-check:* "Can you undo it?" (No.)
2. **Recognize the pattern** (C6) — push to 720°, it unwinds. *"What if you turn again?"* (Twist returns — periodicity, felt.)
3. **Name the structure** (C6) — the ghost matrix returns at 360° but the belt doesn't: the quaternion carries the *path* the matrix throws away.
4. **Understand the cost** (C3) — the earned "Why a half" reveal: the two-sided sandwich forces θ/2.
5. **(deferred)** the practitioner payoff — gimbal lock / SLERP (C4/C5) → the Slerp Racer sequel.
Self-check is **predict-then-reveal** at every beat. Curious beginner can stop after beat 3; a working mathematician continues into the sandwich and (later) the ring.

## Build spec (Builder — with fidelity guards)
> [!IMPORTANT]
> **Correction to the S03 plan:** do **not** use `src/math/quat4.ts` — that is the 4D {L,R} plane-rotation builder for the particle viewers. This app's rotation is ordinary 3D: `THREE.Quaternion` + `vec.applyQuaternion(q)`.

- **Engine/pattern:** custom `Canvas3D` scene; use the **return-the-cleanup-from-`onMount`** contract (cleaner than PolygonWorlds' ref-parked rAF). The **continuous-twist ribbon mesh is the one real cost — spike it first** (a `TubeGeometry`/lathe-style strip whose cross-sections rotate along its length by the accumulated twist).
- **Reuse:** `useGestureRotation` (`src/lib/particles/`) for the **camera orbit only**, kept strictly separate from the *block's* rotation (the looking-vs-navigating convention). Theme tokens for all color (5 skins).
- **Panels (`SectionDef[]`, archetypes from the closed vocabulary):**

| Panel | arch | Tier | Contents |
|---|---|---|---|
| **Block** | subject | Define | mesh (hand / plate / dish / framed compass-rose), ribbon on/off, width |
| **Turn** | drive | Drive | drag the block, or axis dial + **turn slider 0–720°**; sign geared 2:1 |
| **Readout** | readout | Analyze | live w (→ −1 at 360°), stripe/belt-slack state, total angle; ring dial (optional) |
| **Compare** | readout | Analyze | ghost 3×3 matrix vs belt/sign — the Skeptic's resolution, scrubbable |
| **Why a half** | drive | Drive | *earned reveal (unlocks after one 720° cycle)* — the q·v·q⁻¹ sandwich on the same scene |
| **Detail** | quality | System | ribbon segments, render quality, reset settings |

- **`ViewDef[]`:** one primary **windowed** view (block + twisting ribbon); sign readout in its panel or a small second view. **On-ramp:** block at rest, flat ribbon, `hint: "drag the block one full turn — then try to undo the twist."`
- **Action strip (`ActionDef[]`, ≤5, one primary):** `Untwist` (attempt — primary), `Turn +360°`, `Turn −360°`, `Reset`. (Game Designer: the *failed* untwist is the lede, so `Untwist` leads.)
- **Explainer (`?`):** open with Hamilton's transcript line — *"the part I would most want a learner to feel — the belt going slack only at the second turn — I never had a name for at all"* — then C1's wall (no three-number system; a product like 3·21 = 63 has no three-square home, so it needs a fourth slot) and the belt as payoff. Source from foundation §1/§3/§5 + the formula reference.
- **Registry edits (append-only):** new route `#/the-belt` in `src/index.tsx` (`React.lazy`), entry in `src/apps.ts`, metadata in `src/chrome/catalog.ts`.

### Math-fidelity guards (Builder + Game Designer — reject these)
- No **bare twist-meter** divorced from the live quaternion; the sign must run in lockstep with the twist (one θ drives both).
- Render q and −q as **two distinct points hitting a pixel-identical pose**; show the half-angle as a **live half-rate arc**, never a static "½θ" label.
- **No partial untwist at 360°** (it is fully obstructed, full stop), no **turn quantization**, no **"fewest turns" scoring** (rewards a wrong model), no **shared camera/block gestures**.

## Next steps
Run **`/three-hats`** on this spec, then **`BUILDING_AN_APP.md`**. The deferred **Slerp Racer (B)** is the natural follow-on app once The Belt ships.
```

</details>

## 1 · Pattern recognition — what this resembles, and what to borrow

Naming the moving parts in terms of patterns the team has already shipped (or
that the wider front-end world has solved) is the fastest way to de-risk the
build. None of the three hard parts is novel; each maps onto a small, known
shape.

| Plan feature | Pattern it is | Precedent / where it's solved | Implication |
|---|---|---|---|
| Custom block + twisting ribbon in a Three.js scene | Scene-graph + rAF loop behind `Canvas3D` | `TopologyWalk`, `PolygonWorlds` (BUILDING_AN_APP §1, "Custom 3D scene") | Standard path; no new abstraction needed |
| The 2:1 gearing (sign sweeps at half the twist rate) | A **single derived quantity** — `q = quatFromAxisAngle(axis, θ/2)` | `THREE.Quaternion.setFromAxisAngle` already halves the angle internally | The gearing is *not* a feature to build; it's the math. See §3 |
| Gated "Why a half" reveal | A **tiny state machine** with one persisted boolean (`locked → unlocked`) | `LayoutDef` + `views[id].open` (StableMatching), `usePersistentState` | Lives in React state, not in the scene. See §4 |
| q vs −q both hitting an identical pose | **Two values, one render** (a function, not stored duplicate state) | n/a — derive both signs from one θ | A fidelity property, verifiable by a pure assertion. See §6 |
| Block rotation vs camera orbit separation | **Looking vs navigating** split | `useGestureRotation` (camera only); the convention is repo-wide | The plan respects it explicitly — good |
| Ghost 3×3 matrix that returns to identity at 360° | **Derived readout** (pure fn of θ) | `chrome/readouts.tsx` primitives | Pure; trivially testable |

> [!NOTE]
> The single most important pattern observation: **almost none of the "design"
> needs to live in the imperative scene code.** The gearing is one line of
> quaternion math, the gate is one boolean, the matrix is `Matrix3.makeRotation`.
> The scene's only genuinely custom asset is the ribbon mesh (§5). That is a
> healthy complexity distribution — the novel cost is isolated to one object.

The plan also correctly rejects two not-invented-here temptations the framework
already solves: it does **not** roll its own gesture handler (reuses
`useGestureRotation` for the camera) and does **not** invent a tab bar for the
reveal (it uses the layout/section mechanism). I would only add: it should also
**not** roll its own persistence — `usePersistentState` / `clearPersistedState`
(`src/lib/usePersistentState.ts`) is the exact tool for the unlock flag (§4).

## 2 · Structural soundness — are the boundaries in the right place?

The framework draws three boundaries an app must respect: the **`<Workspace>`
chrome** (windows, rail, layouts, persistence of window state), the **app's
scene/state** (everything in `ComplexParticles`-style local `useState`/`useRef`),
and — new for this app — the **gated-reveal state**. The plan places all three
correctly.

| Boundary | Plan's placement | Assessment |
|---|---|---|
| Chrome vs app scene | One windowed `ViewDef` (block+ribbon) + `SectionDef[]` panels, all standard | ✅ Textbook. "Windowed, not `immersive`" is the right call — `immersive` is for single-view first-person walkers (types.ts: "Ignored … when there isn't exactly one view"), and the whole pedagogy is *simultaneous comparison* of ribbon, sign, and matrix |
| Twist (model) vs camera (view) | `useGestureRotation` for camera **only**, block drag is its own handler | ✅ Honors looking-vs-navigating; this is also a correctness guard (a shared gesture would let an orbit silently advance θ) |
| Gate state vs everything else | "earned-reveal second layout" + a `usePersistentState` flag | ⚠️ Mostly right, but the **mechanism for the gated panel is underspecified** — see §4. "Layout" and "panel that unlocks" are two different framework concepts and the plan conflates them |
| Readouts | `readout`-tier panels using shared primitives | ✅ Matches the Analyze-tier convention; the ghost matrix and `w` value are exactly what `StatGrid`/`Kicker` are for |
| Action strip | `Untwist`/`Turn ±360°`/`Reset`, ≤5, one primary | ⚠️ See §7 — the strip has a **static-label** contract and a **`sectionId` projection** contract that the plan's `Untwist`-leads framing must be checked against |

> [!WARNING]
> **The one conflated concern: "layout" vs "panel reveal."** The plan calls
> "Why a half" both an *earned-reveal second layout* (Verdict) and a *panel in
> the `SectionDef[]` table* (`drive`/Drive tier, "unlocks after one 720°
> cycle"). These are different framework levers:
> - A **layout** (`LayoutDef`) is a named arrangement in the top-bar Layout
>   menu — always visible there, can't be "locked."
> - A **panel** (`SectionDef`) is a rail icon the user can open anytime — the
>   rail tier-sorts *all* declared sections; there is no built-in "hidden until
>   unlocked" affordance.
>
> Neither natively supports "appears only after a 720° cycle." The cleanest
> resolution (see §4) is: keep "Why a half" a normal `SectionDef`, gate its
> *availability* in app state, and render the rail entry / a "Why a half?" chip
> conditionally. Decide which lever before building, or the reveal will fight
> the chrome.

## 3 · The 2:1 gearing — a derived quantity, not a feature

The plan treats the 2:1 ratio as a designed behavior ("the sign readout sweeps
at exactly half your rate"). Architecturally it is the *opposite* of a feature:
it is what falls out for free if you build the quaternion correctly, and it is a
feature only if you build it wrong.

`THREE.Quaternion.setFromAxisAngle(axis, θ)` stores `(sin(θ/2)·axis, cos(θ/2))`.
So if the block's visual rotation is driven by the **accumulated turn angle θ**
and the quaternion `q` is `setFromAxisAngle(axis, θ)`, then:

- the block/ribbon turn by θ,
- the scalar `w = cos(θ/2)` is already at −1 when θ = 360° and back to +1 at
  θ = 720°,
- the q/−q point on S³ has gone exactly halfway round at θ = 360°.

The gearing is `cos(θ/2)` versus `θ`. There is **one source of truth** — the
accumulated θ — and every readout is a pure function of it. This is exactly the
Builder's fidelity guard ("one θ drives both") and it is structurally enforced if
the team resists the temptation to store `w` (or the ring angle) as *separate*
state.

> [!CAUTION]
> **The seam to guard:** a `THREE.Quaternion` *cannot represent θ > 360°* — it
> normalizes the half-angle and collapses q(θ) and q(θ+720°). So the
> **accumulated turn θ must be its own scalar state** (a plain number,
> 0–720°+), and the quaternion is *derived* from it each frame, never the
> source. If the team instead drives the scene from a stored `THREE.Quaternion`,
> the double-cover lesson **vanishes** — q and −q would be indistinguishable and
> the belt would untwist at 360°. This is the single highest-leverage
> correctness invariant in the app, and it is invisible to `tsc`. Make θ-the-
> scalar the model and write an assertion around it (§6).

## 4 · The gated reveal — a small state machine, and where it persists

The reveal is a two-state machine: `locked` → (`θ reaches 720°`) → `unlocked`,
plus an optional `claimed` once the user taps the "Why a half?" chip. This is
trivial in React state. The real questions are *persistence* and *the chrome
mechanism*.

```text
state: 'locked' | 'unlocked' | 'claimed'
transition: on θ crossing 720° (first time)  → 'unlocked'
            on chip click                    → 'claimed'  (restages the scene)
```

| Question | Recommendation | Rationale |
|---|---|---|
| Where does the flag live? | App-local `usePersistentState('the-belt:unlocked', false)` | It's a *setting-like* fact (CLAUDE.md: persist settings, not transient view state). A returning learner who already earned it shouldn't be re-locked |
| Should it persist at all? | **Probably yes, but make it resettable** | The "Reset settings to defaults" action (`clearPersistedState('the-belt')`) must also re-lock, or QA/teachers can never re-experience the gate. The Detail panel's reset must cover it |
| How does the panel become reachable? | Keep "Why a half" a normal `SectionDef`; conditionally include it in the `sections` array (or render a "Why a half?" chip that opens it) | Matches the framework — there is no native lock affordance on rail icons. Conditionally building `sections` is clean and re-renders correctly |
| What does "restages the same scene" mean structurally? | A **mode flag on the existing scene** (`reveal: boolean`), read by the rAF loop via a ref, that adds the second `q⁻¹` multiply and the half-rate arc | Avoids a second scene/context. This is the `refs.current` pattern from BUILDING_AN_APP §5's "critical gotcha" |

> [!IMPORTANT]
> **Decision needed before build:** does the unlock persist across reloads? I
> recommend **yes + resettable**. Either way, the persisted key must be
> namespaced under `the-belt:` and wiped by the same `clearPersistedState`
> the Detail panel's reset calls — otherwise the reset button silently lies
> (clears sliders, leaves the gate), which is exactly the kind of partial-reset
> bug that survives a green `npm run build`.

> [!CAUTION]
> **Gotcha — the 720° edge trigger.** "First time θ crosses 720°" is an
> *edge*, and edges are where rAF/state bugs breed. If the unlock is computed
> from `θ >= 720` every frame, dragging back below 720° and forward again
> re-fires the surprise-budget animation. Latch it: once `θ >= 720` has been
> seen, set `unlocked` and never recompute it from θ. Drive the one-shot
> untwist animation off the *transition*, not the *predicate*. (The
> `lastReal`/`transitioning` latching in `createAnimationLoop.ts` lines 71–116
> is the local idiom to copy.)

## 5 · Performance & footprint — the ribbon mesh is the only real risk

The plan is right to flag the ribbon as "the one real cost" and to spike it
first. I want to be precise about *what* the cost is and *which* implementation
avoids it, because the naive reading ("rebuild `TubeGeometry` each frame") is the
trap.

| Aspect | Risk | Mitigation |
|---|---|---|
| Per-frame `new THREE.TubeGeometry(...)` | **Real and avoidable.** Allocating + uploading a fresh BufferGeometry every frame churns GC and re-uploads to GPU each rAF — visible jank on phones | Build the geometry **once** at a fixed segment count; each frame, **mutate** the `position`/`normal` `BufferAttribute` in place and set `needsUpdate = true`. `createAnimationLoop.ts` (lines 146–155) does exactly this for the axis lines — copy that idiom |
| Segment count | A twist that varies smoothly along the length needs enough cross-sections; too many = per-frame CPU cost in the mutate loop | Expose **ribbon segments** in the Detail/`quality` panel (the plan already lists it). Default modestly (e.g. 64–128 cross-sections); let power users raise it. Mobile reads the same default |
| Draw cost | One ribbon + one block + axes = trivial draw count | Not a concern. GPU is idle here vs the fractal/particle apps |
| Recompute trigger | If the ribbon only changes when θ changes, rebuilding every frame even at rest wastes battery | Gate the mutate on "θ changed since last frame" (or `block is being dragged`). At rest, skip the rebuild and even the `renderer.render` if nothing moved — though a static render each frame is cheap and simpler |
| Bundle | `React.lazy` route + Three.js (already in the bundle) + a few KB of app code | ✅ Negligible. Three is shared; the app is code-split per the route map |
| DPR | `Canvas3D` already caps `setPixelRatio` at 2 (line 47) | ✅ Inherited |

> [!WARNING]
> **The performance contract is "build once, mutate in place."** If the spike
> builds `new TubeGeometry` per frame and "works on my desktop," it will pass
> `npm run build` and ship a phone-janky app — there is no perf gate. Make the
> spike's success criterion explicit: *zero geometry allocations in the steady-
> state rAF loop, measured*. The repo's own axis-update code is the reference
> implementation of the right approach.

A secondary, subtler perf seam: the **React-state-per-frame** trap. The live
`w = −1.000` readout and the ghost matrix update continuously while dragging. If
those are React state pushed every frame, the **whole workspace chrome
re-renders at drag rate** — the exact jank `createAnimationLoop.ts` lines
174–184 throttle to 4 Hz with a 250 ms guard. The Belt should do the same:
throttle the numeric readouts (a few updates/second is plenty for a number a
human reads), keep the *visual* ribbon/stripe at full frame rate inside the
scene.

## 6 · Verification & contracts — gaining confidence with no test gate

This is where I am most useful, because the app's correctness lives almost
entirely in math identities that `tsc` and a glance cannot confirm. The good
news: the model (θ-as-scalar → derived quaternion/matrix/sign) is **pure and
unit-testable**, even though CI only runs `npm run build`. The team should write
vitest specs (`src/**/__tests__/`) for the pure core *even though they aren't a
gate* — they are the only honest check on the lesson.

| Invariant (the contract) | How to verify | Seam |
|---|---|---|
| `w = cos(θ/2)`: −1 at θ=360°, +1 at θ=720°, +1 at θ=0 | Pure unit test on the derive fn | Extract θ→{q, w, matrix, stripeAngle} into a **pure module** (e.g. `belt.ts`), test it. Don't bury it in the rAF closure |
| q and −q render a **pixel-identical pose** | Assert `matrixFromQuat(q)` ≈ `matrixFromQuat(neg(q))` componentwise | Pure; this is the "two values, one render" property the Builder demands |
| Ghost matrix = identity at θ=360° **and** at 720° | Pure test: `Matrix3.makeRotation(axis, θ)` at both → ≈ I | This is the crux of the "three readouts disagree" beat — verify it, don't eyeball it |
| Block/ribbon **not** untwisted at 360° (full obstruction) | Geometric: ribbon end-frame orientation ≠ start-frame at θ=360°, = at 720° | Test the ribbon cross-section frame fn at θ ∈ {360,720} |
| Unlock latch fires once; reset re-locks | State-machine test + manual: earn it, reset, confirm re-locked | The persistence seam from §4 |
| Camera orbit never advances θ | Manual: orbit hard, confirm w/ribbon unchanged | The looking-vs-navigating boundary; assert by inspection that no camera handler writes θ |
| Reset clears **all** persisted keys incl. unlock | Manual + grep the keys under `the-belt:` | The partial-reset trap from §4 |

> [!NOTE]
> **Recommendation: extract the math to a pure `belt.ts` and unit-test it.**
> The framework already runs vitest (`npm test`) over `src/**/__tests__/` for
> the chrome's pure logic. The Belt's lesson *is* pure logic (θ → readouts).
> Putting it behind a pure boundary turns "did we get the double cover right?"
> from a manual squint into three assertions. This is the single biggest
> confidence lever available given the thin CI, and it costs ~20 lines of test.

The other verification reality: the *felt* parts (does the stripe read as
"wrong," does the untwist feel like relief) are genuinely manual and visual —
the REPORT_STYLE screenshot guidance applies. Budget a real-device phone pass
(the plan's pedagogy assumes the comparison reads at "arm's length"; on a phone
the windows stack, so confirm the ribbon + sign + matrix are all reachable
without losing the comparison).

## 7 · Maintainability — can a newcomer follow it in six months?

Yes, *if* the θ-as-scalar model and the pure `belt.ts` boundary are in place.
The danger to future-readability is the rAF closure capturing stale state — the
documented "critical gotcha" (BUILDING_AN_APP §5) that "broke the old MobiusWalk
twist toggle." The plan's choice to use the **return-cleanup-from-`onMount`**
contract (over PolygonWorlds' ref-parked rAF) is the right modern idiom and
matches `Canvas3D`'s documented contract (lines 12–18, 50, 73–80). Good.

| Maintainability factor | State | Note |
|---|---|---|
| Complexity justified? | ✅ Mostly | The gate adds genuine state-machine complexity for a genuine pedagogical payoff. Not gold-plating |
| Single source of truth | ⚠️ Depends on build | θ-scalar must be the model (§3). If the team stores derived values, future readers will not understand why dragging back breaks |
| File shape | ✅ | One `.tsx` (state + panels + views) + `belt.ts` (pure math) + `ribbon.ts` (mesh build/mutate). Matches the "pull logic into sibling `.ts`" convention |
| Stale-closure risk | ⚠️ Known trap | Use the `refs.current` + stable `onMount` pattern; the reveal mode and θ must be read through refs in the loop |
| Naming | — | Call the route/appId consistently `the-belt` across `index.tsx`, `apps.ts`, `catalog.ts`, and `appId`/persistence namespace |

## 8 · Smaller structural notes

- **Action strip contract (types.ts 92–118).** Labels are **static strings**
  (no live numbers) and each action `sectionId` must name a **Drive-tier**
  panel (dev-warned otherwise). `Untwist`/`Turn ±360°`/`Reset` are static — ✅.
  Point them at the `Turn` panel (Drive). But note the strip is a *projection*
  of a drive/playback panel; `Untwist` and `Turn ±360°` are app verbs that
  belong in the `Turn` panel too, so the strip stays a projection, not a new
  surface. Confirm `Untwist`-as-primary doesn't imply a control that exists
  *only* on the strip.
- **On-ramp `hint`.** The `ViewDef.hint` is **per-session, never persisted**
  (types.ts 40–45) and clears on first pointer interaction. The plan's "drag
  one full turn, then try to undo" is two beats but the hint clears on the
  *first* pointer-down — so the "then try to undo" half won't survive as a
  hint. Consider the failed-untwist instruction living in the on-ramp posed
  task / a transient overlay, not solely the `hint`.
- **Drag-the-block gesture.** This is new (not `useGestureRotation`, which is
  camera-only). It needs its own pointer-capture handler scoped to the block,
  with the same form-control early-return guard the repo uses (`useGestureRotation`
  lines 56–60; BUILDING_AN_APP §4b key-handler note) so a turn slider drag in a
  panel doesn't also spin the block.
- **`quat4.ts` correction is correct and load-bearing.** The Builder's
  `> [!IMPORTANT]` is right: `src/math/quat4.ts` is the 4D {L,R} plane-rotation
  builder for particle viewers (used in `createAnimationLoop.ts` line 124). This
  app wants ordinary `THREE.Quaternion`. Following the wrong one would be a
  category error that compiles fine.
- **Two readouts vs one view.** The plan wavers ("sign readout in its panel or a
  small second view"). Prefer the **panel** — a second `ViewDef` is a full
  window with its own resize/collapse/fullscreen; the sign is a readout, which
  is what the `readout`-tier panel + `chrome/readouts.tsx` primitives are for.
  Fewer windows, less persisted-geometry surface.

## Verdict

**Endorse — build it, with three pre-build decisions resolved.** This is a
structurally sound app whose complexity is justified and well-distributed: the
novel cost is isolated to one mesh, and the conceptually hard parts collapse into
small, testable, pure abstractions that fit the framework's existing levers
(`Canvas3D`, `useGestureRotation`, `SectionDef`/layouts, `usePersistentState`).
The Builder section has already pre-empted the two traps I would have led with.

**Concerns (ranked):**

1. **θ-as-scalar must be the single source of truth** (§3). A stored
   `THREE.Quaternion` silently kills the double-cover lesson and passes the
   build. Highest-leverage invariant; assert it.
2. **"Layout" vs "locked panel" is conflated** (§2, §4). Decide the chrome
   mechanism for the gated reveal before building — there is no native "locked
   rail icon."
3. **Ribbon perf is "build once, mutate in place"** (§5), not per-frame
   `TubeGeometry`. Make the spike's success criterion *zero steady-state
   allocations*, measured, with the axis-update code as the reference.

**Changes I'd require before "go":**

- Resolve the unlock-persistence decision (persist + resettable recommended) and
  ensure `clearPersistedState('the-belt')` re-locks (§4).
- Extract the θ→readouts math into a pure `belt.ts` and write vitest specs for
  the four identities in §6 (even though CI won't gate them).
- Latch the 720° unlock on the *edge*, not the predicate (§4 gotcha).
- Throttle the per-frame numeric readouts to a few Hz to avoid chrome-wide
  re-renders (§5), mirroring `createAnimationLoop.ts`.

**Changes I'd suggest but not block on:**

- Keep the sign as a `readout` panel, not a second view (§8).
- Move the "then try to undo" beat off the one-shot `hint` (§8).

Net: green light. The design is honest about its one real cost and respects the
framework's boundaries. Get the θ-model and the reveal-mechanism decisions right
on paper first, and the build is low-risk.

## Self-reflection

1. **What would you do with another session?** Sketch the actual `belt.ts`
   signature (`θ → { q, negQ, w, matrix3, ribbonFrames, stripeAngle }`) and the
   four vitest assertions, so the pure-core boundary is concrete rather than a
   recommendation. I'd also prototype the ribbon mutate-in-place loop to confirm
   the BufferAttribute approach handles a length-varying twist cleanly.
2. **What would you change about what you produced?** I leaned on inference about
   the `THREE.Quaternion` half-angle storage and the >360° normalization
   collapse; both are standard and I'm confident, but I did not run code to
   confirm the exact behavior in this repo's Three version. A one-line REPL check
   would have made §3 airtight rather than reasoned.
3. **What were you not asked that you think is important?** Whether the unlock
   should be per-device (localStorage) or fully ephemeral — this is a genuine
   product decision (a classroom on shared machines behaves differently than a
   solo learner) that the plan leaves open and I could only flag.
4. **What did we both overlook?** The interaction between the `hint`
   (clears on first pointer-down) and the *two-step* on-ramp instruction — the
   plan's lede ("drag, then try to undo") cannot fully live in the single-shot
   `hint` field, which neither the plan nor the chrome's `hint` contract
   anticipates.
5. **What did you find difficult?** Distinguishing where the plan's "earned-
   reveal layout" maps onto `LayoutDef` vs `SectionDef` — the framework has both
   a layout system and a section system and neither has a native "locked"
   concept, so the right mechanism required reasoning rather than citing.
6. **What would have made this task easier?** The S03 plan and the atlas/
   foundation the spec references were not in scope to read; having the prior
   plan would have let me check whether the "windowed not immersive" reversal
   and the Slerp-Racer deferral were consistent with earlier commitments.
7. **Follow-up value:** MEDIUM — the review is correct and complete as an
   architectural critique, but the two load-bearing claims (θ-as-scalar
   invariant, build-once-mutate ribbon) deserve a quick code-spike confirmation
   before the team commits, and the unlock-persistence decision is a real open
   product question.
