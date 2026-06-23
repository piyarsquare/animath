---
kind: three-hats
session: 2026-06-18-S05
date: 2026-06-18
title: "Three Hats — Framework Maintainer on The Belt"
branch: claude/quaternion-exploration-app-ig4jmy
slug: quaternion-exploration-app-ig4jmy
status: stopped
build: n/a
app: the-belt
---

# Three Hats — Framework Maintainer on The Belt

I am the framework maintainer hat. I read this spec against the actual codebase —
not against the codebase it would be nice to have — and I report what will and
won't survive contact with `tsc && vite build`, the append-only registry, and the
chrome as it is actually wired today. My bias is toward working code over elegant
designs, and toward not paying for abstractions that one app's needs do not
justify.

The short version up front: **this is the cleanest app spec I have reviewed
through this lens in a while.** It correctly diagnoses the one trap most
quaternion-app authors fall into (`quat4.ts`), it picks the right rendering
pattern, it picks the right layout posture (windowed, not immersive), it knows the
registry is append-only, and its archetype assignments are all in-vocabulary. The
concerns below are real but small, and none of them is a redesign. They are
"things a careful builder must not get wrong," not "things wrong with the plan."

## Plan under review

<details>
<summary>Original request (verbatim plan text)</summary>

```markdown
---
kind: plan
session: 2026-06-18-S05
date: 2026-06-18
title: "Quaternions — design-team verdict + build spec (The Belt)"
branch: claude/quaternion-exploration-app-ig4jmy
slug: quaternion-exploration-app-ig4jmy
status: stopped
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

## Executive summary

| Dimension | Verdict | One-line |
|---|---|---|
| History / context awareness | ✅ strong | Knows `quat4.ts` is the wrong tool; knows immersive is for walkers; reverses its own S03 plan with reason. |
| Rendering-pattern fit | ✅ correct | Custom `Canvas3D` scene is exactly the documented path for a bespoke 3D scene. |
| Canvas3D cleanup contract | ✅ correct | Cites the real contract and correctly notes it is cleaner than PolygonWorlds. |
| Archetype assignments | ✅ in-vocabulary | All six panels map to real archetypes; no invented icons. |
| Registry / append-only safety | ✅ safe | Three files, all append-only; no shared-code churn. |
| Layout posture (windowed vs immersive) | ✅ correct | Windowed is right; the override is well-argued. |
| Action strip design | 🟡 mostly right, one snag | Verbs are fine, but `sectionId` must be a Drive-tier panel and the "live untwist" gesture is *not* an action-strip thing. |
| Scope | 🟡 watch | The "earned reveal" unlock + ghost-matrix scrub are real state machinery, not free chrome. The ribbon mesh is correctly flagged as the cost. |
| Assumes codebase cleaner than it is | 🟡 two spots | `THREE.Matrix3`/matrix readout has no existing primitive; the "unlock" persistence has no framework slot — both are the app's own code, fine, but the spec implies more turnkey support than exists. |

## 1 · The `quat4.ts` correction is right, and it is the most important thing in the spec

This is the single claim I most wanted to verify, because getting it wrong would
have poisoned the whole build. **The spec is correct.**

`src/math/quat4.ts` exports exactly one thing — `quarterQuat(plane, θ)` — and it
returns an `{ L, R }` *pair* of `THREE.Quaternion`s meant to be applied as the
**4D** rotation `p ↦ L · p · conj(R)` (see the file's own header comment,
lines 5–10). That is the double-quaternion representation of `SO(4)` plane
rotations used by the particle viewers' `QuarterTurnControls`. It is emphatically
**not** an ordinary 3D rotation, and `THREE.Quaternion`'s `.applyQuaternion` does
the single-sided `q v q⁻¹` action The Belt actually needs.

> [!IMPORTANT]
> **Endorsed without reservation.** The Belt's rotation is ordinary `SO(3)`:
> a single `THREE.Quaternion` and `vec.applyQuaternion(q)`. Using `quat4.ts`
> here would have silently produced a 4D double-rotation and a wrong double-cover
> story. The S03→S05 correction is exactly the kind of history-awareness this
> hat exists to reward.

One subtlety the builder should carry forward: `quat4.ts`'s comment says positive
θ is *clockwise* (+A → −B). When The Belt builds its own `THREE.Quaternion` via
`setFromAxisAngle`, the handedness convention is Three's right-hand rule, which is
the opposite sign sense. This matters only for which way the ribbon visibly twists
vs. which way the readout dial sweeps; pick one and keep the stripe, the dial, and
the `w` readout all consistent (the spec's own "lockstep" guard already demands
this).

## 2 · The Canvas3D cleanup contract — claim verified, and the dig at PolygonWorlds is fair

The spec says: "use the return-the-cleanup-from-`onMount` contract (cleaner than
PolygonWorlds' ref-parked rAF)." Both halves check out.

- The contract is real: `Canvas3D`'s `onMount` is typed `(ctx) => void | (() => void)`
  (`src/components/Canvas3D.tsx:18`), and the returned function is invoked on
  unmount/remount *before* `renderer.dispose()` (lines 50, 73–80). This is also
  the pattern BUILDING_AN_APP.md §5 documents as canonical.
- PolygonWorlds genuinely does *not* use it: its `onMount`
  (`PolygonWorlds.tsx:90`) parks the rAF handle in `rafRef.current`
  (lines 155–157) and tears it down in a **separate** `useEffect(() => () => {…})`
  (lines 214–217). That works, but it splits the lifecycle across two places and
  is the looser pattern. The spec is right to prefer the returned-cleanup form.

> [!CAUTION]
> **The stale-closure gotcha applies in full here.** `onMount` runs once and
> closes over the state it captured (BUILDING_AN_APP.md §5's "Critical gotcha").
> The Belt has a lot of live state the render loop must read every frame — the
> turn angle (0–720°), drag-in-progress, ribbon segment count, mesh choice,
> whether "Why a half" is unlocked. The builder **must** funnel all of that
> through a `refs.current` object updated by small `useEffect`s, and keep
> `onMount`'s `useCallback` deps empty (`[]`), exactly as PolygonWorlds does
> with `worldRef`/`sizeRef`/`propsRef`. If they instead put live state in the
> deps, `Canvas3D` will remount the whole WebGL context on every slider tick.
> This is the bug that broke the old MobiusWalk twist toggle; the spec doesn't
> mention it, and it's the one place a careful builder is most likely to slip.

## 3 · Archetype assignments — all in-vocabulary, all defensible

I checked every panel against `archetypes.ts` (the closed 11). No invented icons,
no tier violations.

| Panel | Proposed `arch` | Valid? | Note |
|---|---|:--:|---|
| Block | `subject` | ✅ | "what you're visualizing" + its params. Correct. |
| Turn | `drive` | ✅ | hands-on manipulation. Textbook `drive`. |
| Readout | `readout` | ✅ | stats/plots. Correct; should use `chrome/readouts.tsx` primitives. |
| Compare | `readout` | ✅ | a second `readout` panel is explicitly allowed (the rail sorts within tier). |
| Why a half | `drive` | 🟡 | defensible — it's a manipulable sandwich scene — but see below. |
| Detail | `quality` | ✅ | resolution/detail/reset. Correct. |

> [!NOTE]
> Two `readout` panels (Readout + Compare) is fine — the spec already knows
> `ParticleViewerShell` ships two `marks` panels, and the rail tier-sorts then
> falls back to authored order (`sortByTier`, `archetypes.ts:35`). No problem.

The one I'd push on is **"Why a half" as `drive`**. It is an *earned reveal*, and
its content is the `q·v·q⁻¹` sandwich on the same scene — that is genuinely a
manipulation surface, so `drive` is correct *if* it stays interactive. But note
the action strip's `sectionId` rule (next section) interacts with this: if the
strip ever projects into "Why a half," it must be Drive-tier, which it is. Good.

The bigger question `drive` raises is **how a panel "unlocks."** There is no
notion of a hidden/locked `SectionDef` in `types.ts` — a section either is in the
`sections` array or it isn't. See §6.

## 4 · The layout posture is right, and the override is well-reasoned

The spec reverses S03's "consider immersive" in favor of a windowed "jeweler's
bench." **I endorse this strongly, and the reasoning is exactly the maintainer's
own.**

`immersive` (WorkspaceProps, `types.ts:133–139`) is "ignored … when there isn't
exactly one view" and is built for first-person walkers (Polygon Worlds is the
only consumer). The Belt's entire pedagogy is *simultaneous comparison* — ribbon
vs. sign vs. ghost matrix at arm's length. That is the opposite of an immersive
single-surface view. Windowed view + floating panels is correct.

> [!WARNING]
> But the spec then says "sign readout in its panel **or a small second view**."
> Pick the panel. A second `ViewDef` is a second draggable/collapsible window the
> user can close and lose — and on phone it becomes a second stacked card, which
> dilutes the one-glance comparison the whole design rests on. The sign belongs
> in the **Readout panel** alongside `w` and the ring, where the readout
> primitives live. Reserve view windows for things the user pans/zooms/orbits.
> "A small second view" is the kind of casual addition that looks free and isn't.

## 5 · The action strip — verbs are fine, but two things need fixing

The strip rules are structural (`types.ts:92–118`, BUILDING_AN_APP.md §4d):
buttons only, ≤5, one primary, **static labels**, and `sectionId` must name a
**Drive-tier** section (dev-warned otherwise).

The proposed set — `Untwist` (primary), `Turn +360°`, `Turn −360°`, `Reset` — is
four buttons, one primary, static labels. That part is clean. Two snags:

1. **`sectionId` must point at a Drive-tier panel.** `Turn` is `drive` ✅. So
   `Untwist`/`Turn ±360°` should set `sectionId: 'turn'`, and `Reset` likewise
   (or `'detail'` if reset-settings lives there — but `Detail` is `quality`,
   System tier, which would trip the dev warning; keep `Reset` projecting into
   `Turn`). The spec doesn't assign `sectionId`s; the builder must, and must keep
   them Drive-tier.

2. **The core loop is a *gesture*, and BUILDING_AN_APP.md §4d says gesture-driven
   viewers should *not* pass actions** — "their begin-affordance is the view
   itself." The Belt is a hybrid: its *primary* interaction is dragging the block
   (a gesture, which argues for a `hint` and no strip), but its *fallback* is
   buttons (`Turn ±360°`). The spec already declares a `hint`, which is the right
   call for the gesture. The strip is then justified only as the
   keyboard/button-only path and the `Untwist`-as-lede framing. **That is a
   legitimate use, but it lives in tension with the doc's guidance, and a
   reviewer should know the spec is leaning on the strip a little harder than the
   "inert without it" bar.** It is not inert — you can drag the block. I'd keep
   the strip (the failed-untwist lede is good pedagogy) but treat it as an
   accelerator, not the begin-affordance, and make sure the `hint` carries the
   first-run story.

> [!NOTE]
> `Untwist` as an *attempt that refuses* at 360° is a nice idea, but the strip's
> labels are static and its buttons can't carry a "this failed, keep going"
> state except via `disabled`. The "refusal-and-wobble" feedback must come from
> the **scene/motion**, not the button. The spec already puts the surprise budget
> on the untwist animation, so this is consistent — just flagging that the button
> itself can't narrate.

## 6 · Where the spec assumes the framework is cleaner than it is

Two places. Neither is fatal; both are "this is your app's own code, not a
turnkey feature," and the spec phrases them as if the chrome helps more than it
does.

> [!WARNING]
> **(a) The "earned reveal / unlock after a 720° cycle" has no framework slot.**
> There is no `locked`/`hidden` flag on `SectionDef` or `LayoutDef` (I read
> `types.ts` end to end). The chrome knows only "section is in the array" and
> "layout opens this section at (x,y)." So the unlock must be **app state**: the
> component holds an `unlocked` boolean (persisted via `usePersistentState` if it
> should survive reload), and conditionally includes the "Why a half" `SectionDef`
> in the `sections` array — or always includes it but renders a locked placeholder
> body until `unlocked`. Both work; both are *the app's* code. The "quiet,
> non-modal 'Why a half?' chip beside the readout" is likewise a custom DOM
> element the app renders inside its Readout panel body — there is no chrome
> affordance for it. The spec describes this as if it were a layout
> ("earned-reveal second layout"), but a `LayoutDef` can't gate itself on app
> state; the gating is component logic, and the layout is just an arrangement that
> happens to open the now-present panel. Fine — but build it as app state, not as
> a layout trick.

> [!WARNING]
> **(b) The ghost 3×3 matrix readout has no existing primitive.** `readouts.tsx`
> ships `Breakdown / MiniHisto / Sparkline / StatGrid / Kicker` — none of them is
> a live 3×3 matrix grid. So "Compare" panel's matrix display is bespoke DOM (a
> CSS grid of nine mono numbers driven off a `THREE.Matrix3` derived from the
> live quaternion each frame — or, better, recomputed in React from the angle so
> it doesn't fight the rAF loop). Easy to write; just not free. The spec's
> "ghost 3×3 matrix panel … made interactive" reads as if a primitive exists.
> It doesn't. (This is a candidate for a *future* shared readout if a second app
> ever wants a matrix, but **do not** abstract it now for one consumer — that is
> exactly the speculative abstraction this hat resists.)

A smaller one: the spec says "Theme tokens for all color (5 skins)." Correct and
required — but the ribbon is a *mesh*, and Three.js materials don't read CSS
custom properties. The builder must read the resolved token values
(`getComputedStyle(document.documentElement).getPropertyValue('--accent')` etc.)
and feed them into the materials, and re-read on skin change. PolygonWorlds and
the other Canvas3D apps already do this dance; copy it. The spec's one-liner
hides a small but real piece of work (skin changes must repaint the mesh).

## 7 · Scope judgement

The spec is honest about its single biggest cost — "the continuous-twist ribbon
mesh is the one real cost — spike it first" — and that is the right instinct. A
`TubeGeometry` (or a custom strip) whose cross-section frames rotate by the
accumulated twist along arclength is the load-bearing geometry, and if it doesn't
look right, nothing else matters. Spiking it first is correct.

What the spec *undercounts*:

| Item | Spec framing | Real cost |
|---|---|---|
| Ribbon mesh | "the one real cost" ✅ | correct — the headline |
| Live matrix readout | implied turnkey | bespoke DOM, ~30 min |
| Unlock state machine + chip | "earned-reveal layout" | app state + persistence + conditional panel, ~1–2 h to feel right |
| Skin → mesh color sync | "theme tokens" | token-read + repaint-on-skin, ~30 min |
| Block↔ribbon coupling correctness | "in lockstep" guard | the actual math binding twist, stripe, dial, `w` to one θ — easy to get subtly wrong |

None of this is scope *creep* — it is all in service of the one lesson, and the
boundary (defer Slerp Racer to its own route) is clean and correct. But the
"v1 = A + earned-reveal C" is meaningfully more than "A alone," and the extra is
mostly the unlock machinery in §6(a), which is invisible in the panel table. A
reviewer signing off on effort should price that in.

> [!NOTE]
> I agree with deferring **Slerp Racer (B)** to its own route. That is the
> framework working as designed: a second app is a second self-contained folder,
> not a mode bolted onto this one. Don't be tempted to add `modes` pills for it
> later — different state, different panels ⇒ different app (BUILDING_AN_APP.md
> §4c is explicit).

## 8 · Parallel-branch safety — clean

The registry edits are exactly the three append-only files plus the two doc files,
and the spec names them correctly: route in `src/index.tsx`, entry in
`src/apps.ts`, META in `src/chrome/catalog.ts`. (It omits the CLAUDE.md route-row
+ tree-line and README.md edits from §3d/§7, but those are also append-only and
the build doesn't gate on them — flagging for completeness, not as a blocker.)

| Shared file | Edit | Append-only? | Conflict risk |
|---|---|:--:|---|
| `src/index.tsx` | `React.lazy` import + `routes['/the-belt']` | ✅ | none if added at end |
| `src/apps.ts` | one `AppDescriptor` at array end | ✅ | none |
| `src/chrome/catalog.ts` | one `META['/the-belt']` entry | ✅ | none — **but see below** |
| `CLAUDE.md` / `README.md` | route row + tree line | ✅ | none |

> [!CAUTION]
> **One catalog gotcha the spec doesn't mention:** `META` in `catalog.ts` keys a
> `kind: PreviewKind` that drives the animated gallery card preview
> (`src/chrome/previews.tsx`). The existing kinds are
> `particles/plane/fractal/julia/trinary/sorting/matrix/polygon/treenet` — none
> of them is a quaternion belt. The builder must either reuse the closest
> existing kind or **add a new `PreviewKind` + a preview renderer in
> `previews.tsx`**. Adding a `PreviewKind` touches `previews.tsx`, which is *not*
> on the append-only shared-file list and is a slightly higher-touch edit. It's
> still additive (new union member + new case), so low conflict risk, but the
> spec's "registry edits" bullet glosses it. Pick a reuse if you can; only add a
> kind if the belt genuinely needs its own card animation.

Also: the route is `#/the-belt` but the app concept is "Quaternions." The
`appId`/persistence namespace and the catalog `id` derive from the hash
(`the-belt`), while the branch slug is `quaternion-exploration-app-ig4jmy`. That's
fine — they don't have to match — but be deliberate: `appId="the-belt"` is the
localStorage namespace forever, so don't rename it later (renames orphan users'
saved layouts). The spec implicitly commits to `the-belt`; good, keep it.

## 9 · Operational reality — will it build and deploy?

Yes, with no special handling.

- **`tsc && vite build`:** nothing here needs anything `tsc` can't check. The
  union type on `ViewDef` (node XOR panes) is satisfied by a single `node` view.
  `ActionDef` is a plain object array. No `any` needed.
- **Static GitHub Pages under `base: '/animath/'`:** The Belt loads no public
  assets (no HDR, no textures) — it's pure procedural geometry + theme colors.
  So the `import.meta.env.BASE_URL` asset-path trap **doesn't even apply here**,
  which is a nice property. If the builder later adds a texture, the rule kicks
  in; for v1, no risk.
- **No tests/lint as CI gates:** consistent with everything else; the spec
  doesn't propose adding tests, which is fine (the chrome's pure logic is the
  only thing under vitest, and this app adds no pure-logic-in-chrome).
- **`React.lazy` code-split:** standard; the spec says to do it. Good.

> [!NOTE]
> The ribbon mesh is the only perf concern, and it's local: a `TubeGeometry`
> rebuilt every frame as the twist changes would thrash. The builder should
> either (a) build the geometry once at max segments and animate the twist via a
> per-vertex shader/attribute or a material uniform, or (b) rebuild only on
> discrete segment-count changes and twist via the cross-section frames computed
> in the vertex stage. Rebuilding `TubeGeometry` from scratch each drag-frame is
> the naive trap. The spec says "spike it first," which will surface this — good.

## Verdict

**Endorse the build, with a short punch-list.** This spec understands the
codebase's history and constraints better than most app specs that reach this
hat. The `quat4.ts` correction alone would justify the S03→S05 round; the
windowed-not-immersive reversal and the correct `Canvas3D` cleanup contract show
the same care. Scope is bounded, parallel-branch safety is clean, and it will
build and deploy with no special handling.

**What I endorse outright:**
- `quat4.ts` avoidance → `THREE.Quaternion` + `applyQuaternion` (§1).
- Custom `Canvas3D` scene with returned-cleanup `onMount` (§2).
- All six archetype assignments (§3).
- Windowed layout, not immersive (§4).
- Deferring Slerp Racer to its own route (§7).
- Append-only registry edits (§8).

**What I'd change or watch (the punch-list):**
1. **Put the sign readout in the Readout *panel*, not a second view window** (§4).
   "A small second view" is a stealth cost that breaks the one-glance comparison.
2. **Build the unlock as app state, not as a layout** (§6a). There is no
   locked-section primitive; the "Why a half?" chip and gating are custom
   component logic + `usePersistentState`. The spec's "earned-reveal layout"
   framing oversells chrome support.
3. **The ghost matrix is bespoke DOM** (§6b) — write it for this app; do *not*
   add it to `readouts.tsx` for a single consumer.
4. **Assign Drive-tier `sectionId`s to every action** and treat the strip as an
   accelerator over the `hint`-driven gesture, not the begin-affordance (§5).
5. **Skin colors must be read into the mesh material and re-read on skin change**
   (§6) — Three materials don't see CSS tokens.
6. **Mind the `PreviewKind`** in `catalog.ts` — reuse one if possible; only add a
   kind (touching `previews.tsx`) if the card genuinely needs it (§8).
7. **Funnel all live state through refs; keep `onMount` deps `[]`** (§2 caution) —
   the single most likely build-time bug.
8. **Spike the twisting ribbon mesh first and animate twist via uniform/attribute,
   not by rebuilding geometry each frame** (§9).

None of these is a redesign. If the builder works the punch-list, this ships
clean and adds **zero** technical debt to the shared surfaces. Proceed to
`BUILDING_AN_APP.md`.

## Self-reflection

1. **What would you do with another session?** Read the S03 plan this one
   "reverses" and the `/explore-concept` atlas/foundation it cites, to confirm
   the pedagogy claims (the C-crossing taxonomy, the "felt = formal" framing)
   aren't load-bearing on something I didn't see. I reviewed the build/framework
   surface, which is my hat, but I took the design-team narrative at face value.
2. **What would you change about what you produced?** I'd add a concrete code
   sketch of the refs-driven `onMount` + the conditional-section unlock, since
   those are the two places I predict the builder will stumble and a skeleton
   would de-risk them more than prose.
3. **What were you not asked that you think is important?** Whether `#/the-belt`
   vs the "Quaternions" concept name causes discoverability friction — the
   gallery card says one thing, the URL another. Worth a deliberate naming call.
4. **What did we both overlook?** The CLAUDE.md / README.md doc edits (§3d) are
   omitted from the spec's registry-edits bullet, and the `PreviewKind` decision
   in `catalog.ts` is glossed. Minor, but real append-surface touches.
5. **What did you find difficult?** Nothing was hard to verify — every technical
   claim mapped to a readable file. The judgement calls (action strip as
   accelerator vs. begin-affordance; how much the unlock machinery costs) are
   genuinely arguable, not factual, so I flagged rather than ruled.
6. **What would have made this task easier?** A pointer to whether a quaternion
   `PreviewKind` is wanted, and the S03 plan text inline, so I didn't have to
   infer what "reverses the S03 plan" changed.
7. **Follow-up value:** LOW — the spec is sound and buildable; the punch-list is
   polish and trap-avoidance, not correction. The one item that could mislead a
   builder (unlock-as-layout vs. unlock-as-state) is flagged clearly enough that
   no further review is needed before building.
