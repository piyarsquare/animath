---
kind: three-hats
session: 2026-06-23-S01
date: 2026-06-23
title: "Three-hats — pedagogy/math-fidelity lens on the headless debug-pose harness"
branch: claude/headless-mode-plan-bbk74b
slug: headless-mode-plan-bbk74b
status: proposed
build: n/a
followup: null
pr: null
app: docs, engine, solid-worlds, polygon-worlds
---

# Three-hats — pedagogy/math-fidelity lens on the headless debug-pose harness

## Plan under review

<details><summary>Original request</summary>

Review the headless-mode build-out plan at docs/sessions/progress/headless-mode-plan-bbk74b/2026-06-23-S01-plan-headless-mode.md — the deep-link debug-pose harness + dev HUD for the topology walkers, and the 390x844 headless mobile smoke pass.

</details>

I am wearing one hat: the **mathematician-educator who uses these walkers to
understand and teach topology, and cares whether the picture is TRUE**. This is
a developer-tooling plan, not a user feature, so my question adapts: *does this
tooling protect and improve the mathematical correctness of what ships?* A
diagnostic HUD and a smoke pass are only worth building if they let a reviewer
**see** that a frame is honest — and the deepest failure mode in this codebase
is a green check that wasn't a real check (L3/W3). I will push hardest exactly
there.

## Executive summary

The plan is well-aimed and reuses the right precedents (`ChiralityHUD`,
`SquareMiniMap`, `__poly`, the `?query` router split). The deep-link harness is
genuinely the missing positive check for L1, and a reproducible pose URL is also
a real pedagogical artifact ("stand here, face the Klein flip"). **But the
plan's central correctness claim is partly circular**, and three of its
proposed readouts are *necessary but not sufficient* to catch the very bugs it
cites. The determinant readout cannot, on its own, certify a wrong-sheet
placement; `setPose` on a flip/screw world is itself an orientation problem that
the HUD reading the same state cannot independently audit; and the smoke pass's
SwiftShader caveat, while honestly named, still risks shipping false confidence
if it ever graduates to a gate. None of these sink the plan — they sharpen it.

| Concern | Severity | One-line |
|---|---|---|
| Determinant-alone can't catch wrong-sheet placement | 🔴 High | det = +1 is satisfied by infinitely many wrong poses |
| HUD reads the same state the probe reads → can co-spoof | 🔴 High | the deepest L3 risk; needs an *independent* witness |
| `setPose` self-validation is circular | 🟡 Medium | "HUD checks the set pose" only checks consistency, not truth |
| Missing invariants a topologist needs to trust a frame | 🟡 Medium | holonomy class, last face crossed, frame continuity, distance-to-seam |
| Pose vocabulary not yet pedagogically named | 🟡 Medium | `x,y,z` is the cube, not the *teaching moment* |
| Smoke green ≠ correct math (false-confidence on graduation) | 🟡 Medium | honestly caveated now; the caveat must survive promotion |

## 1 · Are these the right invariants to surface?

The plan's `DebugState` surfaces: `determinant (±1)`, `cell`, `pos`, `yaw`,
`pitch`, `nearestMarkerDist`, `world`, `look`. Mapped against the two documented
defect classes it claims to close:

| Defect (cited) | What actually went wrong | Does the proposed HUD catch it? |
|---|---|---|
| **Teleporting world** (S06) | the chirality probe *"checks orientation, not continuity"* — a discontinuous jump across the seam left orientation intact | **No, not as specified.** `determinant` + `cell` are both orientation/winding readouts. Nothing in `DebugState` measures **continuity** across a frame step. |
| **Spoofed chirality probe** (S05) | a **pixel** probe was *"spoofed by cyan corner discs"*; the fix was a **geometric** `up×forward` frame check | Partially. The HUD reads the *geometric* `bodyLinear.determinant()`, which is the post-fix honest source — good. But see §2: if `setPose` writes a wrong `bodyLinear`, the HUD echoes the wrong value with full confidence. |

> [!CAUTION]
> **Gotcha — the headline bug this plan exists to catch is the one its HUD does
> not measure.** S06 was a *continuity* failure that *passed* an
> *orientation* probe. The plan's HUD is, again, an orientation/winding panel
> (`determinant` + `cell` + `pos`). A teleport that lands you one cell over with
> the correct handedness would read **green on every field**. The single most
> important addition is a **continuity witness**: the magnitude of the
> per-frame jump in developed world position (and in the body frame), flagged
> when it exceeds a stride. The engine already knows this — `coverEngine.ts:639`
> uses exactly `d > U*0.55 && d < size*0.7` to *skip* the wrap jump when laying
> footprints. Surface that same `d` (and whether a wrap fired this frame) in the
> HUD and you have caught the teleport directly.

### What a topologist wants on-screen to trust a frame

Beyond the proposed fields, here is the readout set I would actually need to
*believe* a walker frame is honest. The good news: the engines already compute
almost all of it; this is mostly *exposing* state, not new math.

| Readout | Why a topologist needs it | Already computed? |
|---|---|---|
| **Holonomy class** (rotation+reflection, not just det) | det collapses a 2:1 worth of information; on the screw worlds the *rotation angle* is the invariant, not the sign. The `ChiralityHUD` already shows `ROTATED n°` — the dev HUD must too, not just `±1`. | Yes — `getChirality().rotationDeg` (`coverEngine.ts:727`). The plan drops it; restore it. |
| **Last face crossed** (which generator was applied) | "which gluing did I just go through" is the single most useful debugging fact when a pose looks wrong — it tells you *which* deck element to suspect. | Partially — `cell` accumulates net crossings, but the *most-recent* axis+sign is not retained. Cheap to add (`lastWrap: {axis, sign}` in the wrap loop at `:617`). |
| **Frame continuity** (Δpos, Δframe this step) | the L3/S06 killer; see callout above. | Computable from `pos`/`bodyLinear` deltas; the engine already gates on `d`. |
| **Distance-to-seam** (per axis: `h() − |pos|`) | lets a deep link target *"just before the seam"* vs *"just after"* — the pedagogically load-bearing pair of frames for showing a flip. | Trivial from `pos` and `h()`. |
| **`perStepDet` (the continuous-step det)** | the engine's own proof that *nothing local flipped*; the reversal is the loop's, not a point's. This is the distinction the whole app teaches. | Yes — `ChiralityState.perStepDet` (always 1 by construction; surfacing it *and asserting it* is the check). |
| **Orientability of the current world** | so a `−1` readout reads as "expected on this non-orientable world" vs "bug on this orientable one". | Yes — `analysis.orientable` (PolygonWorlds `:317`); SolidWorlds has `freeness.ts` H₁. |

> [!IMPORTANT]
> **Decision I'd push:** the dev HUD should not be a *subset* of the shipped
> `ChiralityHUD` — it should be a strict *superset*. Dropping `rotationDeg` to a
> bare `±1` is a regression in fidelity. A topologist reading `det = −1` on the
> quarter-turn space cannot tell a genuine screw reflection from a 90°-rotated
> orientable frame; only the angle disambiguates. Keep the angle; add the four
> rows above.

## 2 · The deepest question — can the HUD itself be spoofed?

This is the L3 question and the plan half-acknowledges it ("the HUD's
determinant readout is the check that the set pose is on the right sheet"). I do
not think that claim survives scrutiny.

**The structural problem.** The HUD reads `getChirality()`/`getMapState()`,
which read `bodyLinear`/`cell`/`pos` — *the exact same engine state that
`setPose` writes and that `frame()` mutates*. So the HUD is a **mirror of the
probe's state, not an independent witness of it**. If `setPose` puts you on the
wrong sheet by writing a wrong `bodyLinear`, `getChirality()` faithfully reports
that wrong `bodyLinear`'s determinant — and the HUD glows green-consistent with
a wrong world. This is *precisely* the S05 shape (the probe and the thing it
measured shared a representation) one abstraction level up.

> [!CAUTION]
> **A diagnostic that reads the same possibly-wrong state it is meant to audit
> is not a check — it is an echo.** `determinant(bodyLinear)` answering
> "is this pose's frame right-handed?" tells you the *frame you stored* is
> right-handed. It does not tell you the frame you stored is the *correct* frame
> for *this position in this world*. Those are different claims, and the gap
> between them is exactly where wrong-sheet bugs live.

**What an independent witness looks like.** The codebase already contains the
template for breaking this circularity — and the plan should adopt it rather
than reinvent it:

- PolygonWorlds' `debugProbe()` measures handedness from the **rendered
  footprint geometry** (`up×forward`), *not* from the state variable that drives
  it (`engineTypes.ts:55`). The post-S05 fix was specifically to stop reading a
  representation that the state could spoof and instead read a *consequence*.
- `auditInk()` compares **mirror-print radius vs walking-shell radius** — a
  second, geometrically-independent quantity that must agree.

The analogue for the dev HUD: surface **two derivations of the same invariant
that come from different code paths**, and flag any disagreement. Concretely:

| Invariant | Path A (state) | Path B (independent) | Agreement check |
|---|---|---|---|
| Handedness | `bodyLinear.determinant()` | `det` of the freshest **rendered footprint** frame (`debugProbe`) | A === B or **flag** |
| Position in cube | `pos` (engine var) | back-projected from the **camera matrix** the renderer actually used | within ε or **flag** |
| Cell / world wrap | `cell` accumulator | sign of `worldById(world)` generator applied to raw position | consistent or **flag** |

This is more than the plan scopes — but **without at least one independent
witness, the harness reproduces the L3 failure it was commissioned to end**.
The whole justification ("make headless verification HONEST") rests on the HUD
not being co-spoofable, and as specified it is. I would make the
*single-witness-is-an-echo* point a first-class risk in the plan, not a
footnote, and add `debugProbe()` to `DebugState` for at least PolygonWorlds
(it already exists; SolidWorlds should gain the 3D analogue).

## 3 · Is `setPose` self-validation circular?

The plan: *"`setPose` correctness on flip/screw worlds is itself an orientation
problem (L7) — the HUD's determinant readout is the check that the set pose is
on the right sheet. Good: the harness validates itself."*

**"The harness validates itself" is the sentence to be most suspicious of.**
What the determinant readout actually validates is **internal consistency**:
that the `bodyLinear` you wrote has the determinant you intended. It does *not*
validate **correspondence to the world** — that the pose lands on the sheet the
mathematics says it should. On a screw world the difference is the entire bug
class: the 2026-06-20 screw fix was *"two independent bugs"* settled only by
*"the determinant"* plus *a finer subdivision and gluing by the whole in-cube
orbit* (CLAUDE.md, SCREW_BUG.md). A `setPose` that seeds the wrong orbit member
would produce a self-consistent, green-det, **wrong** frame.

> [!WARNING]
> **`setPose` introduces a new way to be wrong that the old code path didn't
> have.** Today, every frame's `bodyLinear` is *reached continuously* from the
> identity by composing deck generators (`coverEngine.ts:622-626`) — it is
> correct by construction of the walk. `setPose` lets you *teleport into* a
> frame, bypassing that construction. The determinant readout cannot tell a
> continuously-reachable frame from one that isn't. The honest self-check is not
> "does det read right" but **"is the set pose reachable by an actual walk?"** —
> e.g. set the pose, then assert that `frame()`-stepping a closed loop back to
> the origin returns `bodyLinear` to (a deck-conjugate of) identity. That is a
> *behavioral* check on a *consequence*, and it is the kind that does not lie.

Recommendation: keep `setPose`, but **scope its claim honestly in the plan** —
"the HUD confirms the set frame is *self-consistent*; correctness on
flip/screw worlds is verified by a round-trip walk test, not by the readout."
And add that round-trip assertion to the unit-test set (it is pure engine logic,
so it belongs there per L4 anyway).

## 4 · Reproducibility as pedagogy — is the vocabulary expressive enough?

A deep link that reproduces an exact frame is a **shareable teaching artifact**,
and the plan rightly notes the URLs are hand-authored. As a teacher, I judge the
vocabulary by whether I can encode a *pedagogically meaningful pose* and whether
it is *named the way a topologist thinks*.

**Expressiveness — mostly yes, with gaps:**

| I want to link a student to… | Expressible today? |
|---|---|
| "Stand at the seam, facing the arch" | Partly — `x,y,z,yaw,pitch` can place it, but I must compute the seam coordinate by hand. A `seam=<axis>±` shorthand ("snap to the +x face") would make these URLs authorable. |
| "The frame just *before* the Klein flip" / "…just *after*" | Only by manual ε offsets. A `seam=+x&eps=-0.02` pair would make the *before/after* couplet — the core teaching unit — trivial and exact. |
| "After one full loop, showing you returned mirrored" | **Not expressible.** The vocabulary sets a *static* pose; it cannot express *"having walked this loop."* For a non-orientable world the *whole point* is the holonomy after a path — a static pose with `det=−1` looks identical to a bug. A `loop=x,x,y` (apply these generators) param would let a link *demonstrate* holonomy, not just assert it. |
| "From the third-person chirality view" | Yes — `cam=third`, `camd`. Good. |

> [!TIP]
> The most valuable pedagogical link is not a *pose* but a *path*: "walk this
> closed loop and watch the readout flip." Consider a `loop=` (or `path=`)
> param applying a generator word, with the HUD then showing the resulting
> holonomy. This turns the harness from a screenshot tool into a *proof
> animation* link — and it doubles as the round-trip correctness check from §3.

**Naming — adequate but not topologist-native.** `x,y,z` is the *cube*, not the
*concept*. A topologist thinks in **face/generator** terms ("I crossed the
A-pairing"), **chart coordinates**, and **holonomy words**. The proposed names
won't mislead, but `seam`, `face`, `loop`/`word`, and naming the world by its
mathematical id (`quarter-turn`, `hantzsche-wendt`) rather than an opaque slug
would let the URL read like a sentence a topologist would say. Lock the
*generic* names now (good instinct), but reserve room for these
*semantic* shortcuts — they are what make the link a teaching artifact rather
than a coordinate dump.

## 5 · Is the SwiftShader caveat honest enough?

The plan states it plainly: *"software WebGL tolerates exactly the NaN the #216
bug exploited on real hardware… `phone-needed` stays."* That is the right
disclosure, and I credit it. Two refinements:

> [!CAUTION]
> **Green smoke ≠ correct math, and green smoke ≠ runs-on-a-phone.** The smoke
> pass detects *gross* failure (console error, context loss, dead frame). It
> says nothing about whether the topology is right (that's deliverable A's job)
> and — by the plan's own admission — nothing about the real-GPU NaN. The
> danger is the **graduation step**: the plan proposes promoting smoke "to a
> hard gate once proven quiet." A *quiet* SwiftShader gate is the most seductive
> green-check-that-wasn't of all, because it will be quiet *precisely on the
> NaN cases SwiftShader tolerates*. Promotion must not be read as "now mobile is
> covered." I'd write into the plan: **the smoke gate, even when hard, never
> retires `phone-needed`** — it is a floor (catches regressions software WebGL
> *can* see), never a ceiling.

The `readPixels` dead-frame detector is a real fidelity hazard too: a
legitimately dark look (`moonlit`, `dusk`) is indistinguishable from a dead
frame to an all-black test, and a *garbage* frame (the actual failure mode) need
not be all-black. The plan notes the dark-look false-positive but not the
**false-negative**: a NaN-corrupted frame can rasterize to plausible-looking
non-black garbage. Frame *darkness* is a weak proxy for frame *correctness*. Far
better, where cheap: a **golden-frame hash** per pose-deep-link (deliverable A's
reproducibility makes this possible — same URL, same bytes, §7 already asserts
"lands the same view twice"). That turns "did it render *something*" into "did
it render *the* something," which is the only pixel check worth gating on.

## 6 · What the plan gets right (credit where due)

- **Reuses, doesn't reinvent.** `ChiralityHUD` as the HUD template, the
  `?query` router split, `__poly` precedent, the `verify-*.ts` exit-code
  convention — all correct precedents, all cited with line numbers.
- **Pure helper + committed test for `nearestMarker`** honors L4 explicitly —
  this is the lesson recurring as recently as Argand/Trees shipping testless.
- **Non-blocking-then-graduate CI path** mirrors the `sessions:lint --strict`
  pattern that is the codebase's established, proven-quiet graduation template.
- **"URL param wins over persisted"** is the right default for a *debug* link
  (explicit request beats sticky state) — confirm with Dan as flagged, but it's
  the correct call.
- **Honest about not replacing a real device.** `phone-needed` stays a standing
  signal; that framing is exactly right and must be preserved through §5's
  graduation.

## 7 · Concrete additions I'd make to the plan

1. **Add a continuity witness to `DebugState`** — per-frame `Δpos` and a
   `wrappedThisFrame` flag (the engine already gates footprints on this `d`).
   *This is the single change that makes the HUD catch the headline S06
   teleport bug it currently misses.*
2. **Restore `rotationDeg` and add `perStepDet` + `orientable`** to the HUD —
   det-alone under-reports holonomy on screw worlds.
3. **Add at least one independent witness** (`debugProbe()` for PolygonWorlds
   now; the 3D analogue for SolidWorlds) and display *both* derivations with a
   disagreement flag. Without this the harness can co-spoof (§2).
4. **Re-scope the `setPose` self-validation claim** to "self-consistency, not
   correctness," and add a **round-trip-walk unit test** (set pose → walk a
   closed generator word → assert `bodyLinear` returns to a deck-conjugate of
   identity). Pure logic; belongs in `__tests__/` per L4.
5. **Add `seam`/`eps` (and ideally `loop`/`word`) params** so the
   *before/after-the-flip* couplet and the *holonomy-after-a-path*
   demonstration — the actual teaching units — are authorable.
6. **Replace (or back) the dead-frame detector with a golden-frame hash** per
   reproducible deep link; gate on *that*, not on darkness.
7. **Write into the plan that the smoke gate never retires `phone-needed`**, and
   that promotion to a hard gate is a regression-floor, not mobile coverage.

## Verdict

**Proceed — but harden the correctness story before Phase 2/3, because as
written the harness can reproduce the exact L3 failure it was built to end.**
The skeleton is right: reuse of `ChiralityHUD`, the reproducible deep link as a
teaching artifact, the pure-helper-plus-test discipline, and the
honestly-caveated smoke pass are all sound. My three load-bearing objections are
(1) the HUD measures *orientation/winding* but the headline teleport bug is a
*continuity* failure it would not see — add a per-frame jump witness, which the
engine already computes; (2) a HUD reading the same `bodyLinear` the probe
writes is an **echo, not a check** — it needs at least one independent witness
(PolygonWorlds' geometric `debugProbe` is the existing template); and (3)
"`setPose` validates itself via the determinant" is **circular** — det confirms
self-consistency, not correspondence to the world, so add a round-trip-walk
test for the real check. Fix these and the tooling genuinely protects the math.
Ship it as specified and you get a prettier, more reproducible version of the
green-check-that-wasn't.

For the pedagogy: the reproducible link is excellent; push it one step further
to encode *paths and seams*, not just static poses — the holonomy-after-a-loop
link is the artifact a topology teacher actually wants.

## Self-reflection

1. **What would you do with another session?** Read `coverEngine.ts`'s wrap loop
   and PolygonWorlds' `coverModel.debugProbe`/`auditInk` implementations in full,
   and sketch the concrete `DebugState` continuity-witness fields and the
   round-trip-walk test signature, so the recommendations land as diffs rather
   than prose.
2. **What would you change about what you produced?** I asserted the HUD "would
   read green on a teleport" from the *shape* of `DebugState` plus the S06
   finding; I did not run a teleport and observe it. The claim is well-grounded
   (the fields are orientation/winding; S06 is documented as a continuity-not-
   orientation failure) but it is reasoning, not a reproduction.
3. **What were you not asked that you think is important?** Whether the smoke
   gate's graduation to "hard gate" could be *misread* as mobile coverage — I
   raised it unprompted because it is the next green-check-that-wasn't waiting to
   happen.
4. **What did we both overlook?** The plan and I both initially treated `det`
   as the chirality check; the codebase's own S05 history (geometric probe beats
   pixel probe) is the proof that a *single* representation is spoofable, and
   that lesson applies one level up to the HUD itself.
5. **What did you find difficult?** Distinguishing self-consistency from
   correctness for `setPose` precisely enough to be actionable rather than
   merely skeptical — the round-trip-walk test is my attempt to make the
   distinction operational.
6. **What would have made this task easier?** A one-line spec of the exact
   `bodyLinear`/`cell` mutation `setPose` would perform on a screw world; without
   it I reasoned about the orientation hazard from the existing `recenter()` and
   the wrap loop.
7. **How did you verify this, and does each passing check test the user-visible
   claim?** Reasoning only, over the plan plus the cited engine source
   (`coverEngine.ts`, both `engineTypes.ts`, the HUD components) and the
   RECURRING_LESSONS / process-audit W1/W3 records. No code run, no frame shot —
   this is a design review. My structural claims (HUD reads probe state; det
   under-reports holonomy; continuity is unmeasured) are grounded in the read
   source, but the behavioral claim ("a teleport reads green") is unreproduced.
   Setting `visual-unverified` would be apt for any follow-up that acts on it.
8. **Follow-up value:** MEDIUM — the verdict is sound and the additions are
   concrete, but items 1–4 of §7 (continuity witness, independent witness,
   round-trip test) deserve a short implementation-design pass before Phase 2 so
   they ship *with* the harness rather than after it.
</content>
</invoke>
