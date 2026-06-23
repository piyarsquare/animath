---
kind: three-hats
session: 2026-06-18-S05
date: 2026-06-18
title: "Three Hats — Convergence Analysis on The Belt"
branch: claude/quaternion-exploration-app-ig4jmy
slug: quaternion-exploration-app-ig4jmy
status: stopped
build: n/a
app: the-belt
---

# Three Hats — Convergence Analysis on The Belt

This synthesizes three independent reviews of the S05 design-team verdict + build
spec for **The Belt** (the quaternion double-cover app): the
[Framework Maintainer](./2026-06-18-S05-expert-maintainer.md), the
[Architecture & Quality Consultant](./2026-06-18-S05-expert-consultant.md), and the
[Math-Visualization & Pedagogy](./2026-06-18-S05-expert-pedagogy.md) expert each read
the same spec through their own lens. Where all three agree we have high confidence;
where they diverge we have found a real tension; what none raised is a blind spot.

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
status: stopped
build: n/a
app: general
---

# Quaternions — The Design Team's Verdict

Stage 4 run as a real second team: five model-diverse specialists (Builder/math ·
opus, Game Designer · opus, Educator · haiku, Illustrator · sonnet, Visual Designer ·
sonnet), each consuming the atlas, the live transcript, the foundation, and the
candidate set — then a director-routed critique round to resolve the one real
disagreement. This file is the synthesis.

## Verdict
Build Candidate A — The Belt — unanimously. All five specialists picked A
independently: it is the only candidate that lands on crossing C6 (the felt double
cover, where the atlas says felt = formal), the only one whose core image survives all
five skins and the phone, and the only one that contradicts a learner's intuition hard
enough for the surprise to stick.

v1 scope: ship The Belt with the Sandwich (C) built in as an earned-reveal second
layout — "Why a half" — gated behind a completed 720° cycle. Slerp Racer (B) is
deferred to its own later route.

## The unified visual + interaction spec
Core loop: grab the block and drag it about its axis; the ribbon twists in lockstep
and the sign readout sweeps at exactly half your rate (2:1). The on-ramp's first task
is the failed untwist: "drag one full turn, then try to shake the twist out" — it
refuses until you go around twice.

Readout hierarchy (multi-channel, never color alone): (1) painted center stripe down
the ribbon (primary, felt); (2) live scalar w = −1.000 number (at-a-glance confirm);
(3) the q-vs-−q ring on S³ (optional depth); (4) a ghost 3×3 matrix that returns to
identity at 360° while the belt does not (the Skeptic's resolution).

Layout: windowed "jeweler's bench," not immersive. Motion: spend the one surprise
beat on the untwist (~1.25 s).

Build spec: custom Canvas3D scene, return-the-cleanup-from-onMount; spike the
continuous-twist ribbon mesh first; reuse useGestureRotation for camera orbit only;
THREE.Quaternion + applyQuaternion (NOT src/math/quat4.ts). Panels: Block (subject),
Turn (drive, 0–720° slider, sign geared 2:1), Readout (readout), Compare (readout,
ghost matrix), Why a half (drive, earned reveal), Detail (quality). Action strip:
Untwist (primary), Turn +360°, Turn −360°, Reset. Append-only registry edits:
#/the-belt route, apps.ts entry, catalog.ts metadata.

Math-fidelity guards (reject): bare twist-meter divorced from the live quaternion;
static "½θ" labels; partial untwist at 360°; turn quantization; "fewest turns"
scoring; shared camera/block gestures.
```

</details>

## Headline

All three hats say **build it** — independently, and with unusual agreement that this
is a clean, well-grounded spec. None recommends a redesign, a different candidate, or
a re-scope. The work that remains is a **pre-build punch-list**, and the three lists
overlap heavily on a small number of concrete invariants. The one place the experts
genuinely pull in different directions is the **painted center stripe** — the spec's
designated *primary* readout — which the pedagogy hat believes may be mathematically
unfaithful, while the maintainer and consultant treat it as a settled implementation
detail.

> [!IMPORTANT]
> The single most consequential finding, raised independently by **all three** in
> different vocabulary, is that **θ must be tracked as a continuous accumulated scalar,
> the one source of truth** — never reconstructed from a stored `THREE.Quaternion`
> (which normalizes the half-angle and collapses q/−q, silently destroying the
> double-cover lesson while still passing `npm run build`). This is the load-bearing
> invariant of the whole app.

## 1. Points of agreement (high confidence)

| # | Convergent finding | Maintainer | Consultant | Pedagogy |
|---|---|---|---|---|
| A | **Build The Belt; the candidate choice and v1 scope are right.** | ✅ | ✅ | ✅ |
| B | **θ-as-continuous-scalar is the load-bearing invariant** (a quaternion alone can't carry θ > 360°). | ✅ (#7: funnel state through refs) | ✅ (#1, top-ranked) | ✅ (#3: w=−1 only if path-tracked) |
| C | **The `quat4.ts` correction is correct and important** — ordinary SO(3) via `THREE.Quaternion`, not the 4D {L,R} builder. | ✅ (verified `quat4.ts:11`) | ✅ (a trap pre-empted) | ✅ (right rotation model) |
| D | **The ribbon mesh is the one real cost; spike it first, and animate by mutating in place** (uniform/attribute), not per-frame `TubeGeometry` rebuilds. | ✅ (#8) | ✅ (#3, cites `createAnimationLoop.ts`) | ✅ (spike is also the fidelity test) |
| E | **The "earned reveal" needs a real mechanism decision** — there is no locked-section / locked-layout primitive in the framework. | ✅ (#2: app state + `usePersistentState` + conditional `SectionDef`) | ✅ (#2: layout-vs-locked-panel conflation) | — |
| F | **Windowed "jeweler's bench" over `immersive` is correct** (immersive is for single-view walkers; this app needs simultaneous comparison). | ✅ | ✅ | ✅ |
| G | **Extract the lesson's pure math (θ → readouts) and unit-test it** — the biggest confidence lever given CI is only `npm run build`. | (implied via refs) | ✅ (#explicit: a `belt.ts`) | ✅ (#3: regression test `scalar(q(360°)) ≈ −1`) |
| H | **The multi-channel, never-color-alone encoding and the failed-untwist on-ramp are keepers.** | ✅ | ✅ | ✅ (explicitly protects) |

Findings **B**, **D**, **E**, and **G** are the four that should be closed *before*
the first real commit. They are mutually reinforcing: tracking θ as a scalar (B) is
also what makes the pure-math module (G) testable, and the gate (E) is a small state
machine over that same scalar.

## 2. Points of tension (require a decision)

### T1 — The painted center stripe: primary readout, or unfaithful prop?

This is the one substantive disagreement.

- **Pedagogy (dissent):** Under a naive uniform twist, a stripe painted down the
  ribbon **returns home at 360°** (the block has gone all the way around), so it does
  *not* legibly say "the wrong way." The faithful invariant is the belt's *refusal to
  flatten without rotating the ends* — literally π₁(SO(3)) = ℤ/2. If the stripe
  returns home, it must be **demoted** from primary; treat this as a pass/fail
  acceptance test of the ribbon spike.
- **Maintainer / Consultant (implicit):** Both treat the stripe as a normal
  implementation detail of the mesh and raise no fidelity objection — their concern is
  that *whatever* the readout is, it must be driven by the single θ scalar.

**Resolution path:** this is an *empirical* question, not a debate. The ribbon spike
(already scheduled first) must include the stripe and answer: *does the stripe read as
"wrong" at 360° and "home" at 720°?* If yes, keep it primary. If no, promote the
belt's *end-rotation-cannot-be-undone* behavior to primary and demote the stripe to
decoration. **Do not lock the readout hierarchy until the spike answers this.**

### T2 — Is the "Why a half" reveal a *layout* or a *locked panel*?

The spec uses both words. The maintainer and consultant agree the framework has
**neither** a locked-layout nor a locked-section primitive, but they lean slightly
differently on the fix:

- **Maintainer:** build it as **app state + `usePersistentState` + a conditionally
  included `SectionDef`** (don't invent a layout primitive).
- **Consultant:** flags it as a conflation to *resolve before building*, and frames
  the unlock as a tiny **3-state machine with one persisted, edge-latched boolean**
  (and reset must re-lock).

These are compatible, not contradictory — the consultant specifies the *state shape*,
the maintainer specifies the *rendering mechanism*. The decision to record: a single
persisted boolean `unlocked`, latched on the **edge** of crossing 720°, gating a
conditionally rendered `SectionDef`; "Reset settings" must clear it.

### T3 — How loud may the I1 ("one factor of two") framing be?

- **Pedagogy:** the headline claim that the belt's 720° and the sandwich's θ/2 are
  "the same factor of two" **conflates three distinct facts** (π₁(SO(3))=ℤ/2; the 2:1
  cover map q→−q; the quadratic sandwich action). They are three symptoms of one
  structural cause, *not one theorem*; the reveal copy ("hit on both sides → feels it
  twice → that is why 360° was only half-untwisted") is a **non-sequitur** —
  two-sidedness explains θ/2, not the 720°. The belt must be framed as a
  **demonstration, not a proof.**
- **Maintainer / Consultant:** silent (out of lens) — they don't evaluate the claim.

There is no *contradiction* here (the others simply didn't opine), but it is a tension
between the design team's persuasive framing and what is mathematically defensible.
**The math hat wins on math:** soften I1 from "the same factor" to "the same structure
seen from two sides," and rewrite the reveal copy so it does not assert that
two-sidedness causes the 720°.

## 3. Blind spots (none addressed, or only one did)

| Blind spot | Who, if any | Why it matters |
|---|---|---|
| **Phone one-thumb ergonomics: block-rotation vs camera-orbit.** | None (the *plan's own* self-reflection #4 flagged it; no expert resolved it). | The looking-vs-navigating split is the core gesture, and "survives the phone" was a *selection criterion* for The Belt. Needs a concrete one-thumb answer (e.g. drag = twist the block, two-finger = orbit) before the gesture code is written. |
| **The spin-½ / electron-720° bridge is silently omitted.** | Pedagogy only (#4). | The atlas's C6 has an "Electron voice"; dropping it amputates half the payoff. Cheap fix: one honest analogy paragraph in the Explainer (framed as analogy, not identity). |
| **Skin color into the Three.js material.** | Maintainer only (#5). | Materials don't see CSS tokens; the 5-skin promise requires reading theme vars into the material at mount/skin-change. A known gotcha, easy to miss. |
| **`PreviewKind` for the gallery card.** | Maintainer only (#6). | `catalog.ts` needs a reuse-or-add decision for the preview; a twisting-ribbon preview may need a new cheap canvas preview. |
| **Per-frame numeric readout throttling.** | Consultant only (#4). | Live `w = −1.000` and a matrix updating every frame can thrash React; throttle to a sensible cadence. |
| **What "untwist" *is* as an operation.** | Implicit across all. | The action-strip `Untwist` is the lede but the spec never defines whether it animates θ back toward 0 along the path or attempts-and-refuses at 360°. Needs a precise definition tied to the θ scalar. |

The phone-ergonomics gap is the most important of these — it was the plan author's own
top worry and no reviewer closed it, so it remains genuinely open.

## 4. Recommended action

**Green light to build, gated on a ribbon spike and four recorded decisions.** Concrete
sequence:

1. **Spike the twisting-ribbon mesh first** (all three agree). Build it as
   *build-once, mutate-in-place* (uniform/attribute driven), not per-frame
   `TubeGeometry`. The spike has **two exit criteria**: (a) it animates smoothly on
   mobile segment counts; (b) **it answers T1** — does the painted stripe read "wrong
   at 360° / home at 720°"? Keep the stripe primary only if (b) passes; otherwise
   promote the end-rotation-refusal invariant.
2. **Extract a pure `belt.ts`** (θ → {w, sign, stripe state, matrix, ring angle}) with
   θ as a **continuous accumulated scalar** the single source of truth, and add unit
   tests — at minimum `scalar(q(360°)) ≈ −1`, `scalar(q(720°)) ≈ +1`, and the 2:1
   gearing. This closes invariant **B** and lever **G** at once.
3. **Record the reveal mechanism (T2):** one persisted boolean `unlocked`, latched on
   the 720° edge, gating a conditionally rendered `SectionDef`; "Reset settings"
   re-locks. Not a layout primitive.
4. **Soften the I1 framing (T3)** in the plan and the Explainer copy: "same structure,
   two views," not "same factor / feels it twice → 720°." Frame the belt as a
   *demonstration* of π₁(SO(3))=ℤ/2, not a proof, and add the one-paragraph spin-½
   bridge as an honest analogy.
5. **Answer the phone gesture split** (blind spot) before writing gesture code: a
   one-thumb scheme that keeps block-twist and camera-orbit distinct on a small screen.
6. Carry the maintainer's smaller punch-list into the build (sign readout in the
   Readout *panel* not a second view; skin color into the material; `PreviewKind`
   decision; Drive-tier `sectionId`s for the action strip; throttle per-frame
   readouts).

> [!NOTE]
> Steps 1–4 are the "before first real commit" set. Step 1 is also the cheapest way to
> de-risk the largest unknown, and it doubles as the empirical referee for the only
> genuine expert disagreement (the stripe). After the spike returns, the spec is ready
> for `BUILDING_AN_APP.md` with no further review needed.

## Self-reflection

1. **What would you do with another session?** Run the ribbon spike myself — it is the
   single artifact that resolves the one open expert disagreement (the stripe) and
   de-risks the largest cost, so it converts this paper review into a verified one.
2. **What would you change about what you produced?** The synthesis leans on the three
   agents' returned summaries plus their files; I did not independently re-derive the
   π₁(SO(3)) vs cover-map distinction, I trusted the pedagogy hat. That call is
   standard math and I'm confident, but it's a delegation.
3. **What were you not asked that you think is important?** Whether The Belt's name and
   route (`#/the-belt`) should foreground "quaternions" for discoverability — a learner
   searching the gallery for quaternions may not connect "The Belt."
4. **What did we both overlook?** A concrete definition of the `Untwist` action as an
   operation on the θ scalar — it is the action-strip lede but underspecified; I caught
   it only as a blind-spot row, not a resolved decision.
5. **What did you find difficult?** Weighing T1 fairly: the maintainer and consultant
   didn't object to the stripe, but their silence is *absence of evidence* (out of
   lens), not endorsement — so I had to avoid reading a 2-to-1 "win" into a question
   only one hat was equipped to judge.
6. **What would have made this task easier?** The very ribbon spike the spec defers —
   an interactive prototype would have answered T1 empirically instead of leaving it as
   a flagged tension.
7. **Follow-up value:** MEDIUM — the verdict (build, gated on a spike + four decisions)
   is sound and the convergence is real, but the stripe-fidelity question is empirical
   and unresolved until the spike runs.
