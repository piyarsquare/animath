---
kind: three-hats
session: 2026-06-23-S01
date: 2026-06-23
title: Three-hats synthesis — headless-mode build-out plan
branch: claude/headless-mode-plan-bbk74b
slug: headless-mode-plan-bbk74b
status: proposed
build: n/a
---

# Three-hats synthesis — headless-mode build-out plan

## Plan under review

<details><summary>Original request</summary>

Review the headless-mode build-out plan at docs/sessions/progress/headless-mode-plan-bbk74b/2026-06-23-S01-plan-headless-mode.md — the deep-link debug-pose harness + dev HUD for the topology walkers, and the 390x844 headless mobile smoke pass.

</details>

Convergence analysis across the three expert reviews:

- [Framework Maintainer](2026-06-23-S01-expert-maintainer.md) — operational/parallel-branch lens
- [Architecture & Quality Consultant](2026-06-23-S01-expert-consultant.md) — patterns/verification lens
- [Math-Viz & Pedagogy](2026-06-23-S01-expert-pedagogy.md) — correctness/fidelity lens

## 1. Points of agreement (high confidence)

All three endorse the plan's **direction** and converge on several specifics:

| Agreement | Maintainer | Consultant | Pedagogy |
|-----------|:---------:|:----------:|:--------:|
| **Deliverable A (deep-link pose + HUD) is the strong, correct part — ship it** | ✅ | ✅ (A's three-layer split is "the plan's strongest part") | ✅ ("skeleton is right") |
| **`lib/debugPose.ts` is correctly minimal, not over-abstraction** | ✅ | ✅ | — |
| **Reusing `ChiralityHUD`/`SquareMiniMap` + pure-helper-with-vitest (L4) is right discipline** | ✅ | ✅ | ✅ |
| **The smoke pass's "catches #216" claim is OVERSTATED** — SwiftShader *tolerates* the exact NaN real GPUs crash on | (implied) | ✅ narrow to "boot/blank failures" | ✅ "honest framing must go further" |
| **The `webglcontextlost` detector is the genuine prize of the smoke pass** | — | ✅ | — |
| **Reproducible deep-link is also a shareable teaching artifact** | — | — | ✅ |

> [!IMPORTANT]
> The unanimous read: **Deliverable A is sound and should proceed; Deliverable B's
> *value proposition* needs to be narrowed and its detectors hardened before it
> gates anything.** No expert wants to stop the work; all three want the
> correctness/determinism story tightened before Phases 2–4.

## 2. Points of tension (require a decision)

### T1 — `setPose` scope: cheap mirror vs. owning the frame (Maintainer ⟂ Pedagogy)

The **maintainer** says `setPose` is *materially under-costed*: it is **not** a
getter's mirror. PolygonWorlds keeps pose three layers down across three `CoverModel`
implementations with no setter; SolidWorlds' `recenter()` writes only the **identity**
frame. To reach the chirality/flip cases the harness exists for, you'd need to seed a
**non-identity developing frame** (the L7 problem) — which the `x/y/z/yaw/pitch` param
table *cannot express*.

The **pedagogy** expert independently lands on why seeding the frame is also *wrong*:
"`setPose` validates itself via the determinant" is **circular** — the determinant
confirms self-consistency, not correspondence to the world.

**Resolution (the two objections cancel):** make `setPose` **position + heading only**;
reach flipped/screw sheets by **walking or placing across a seam** and letting the
**engine** apply the holonomy. This (a) sidesteps the maintainer's frame-seeding cost
and (b) removes the pedagogy's circularity in one move — the frame you observe is the
one the engine *derived*, not one the harness *asserted*. The param table stays as-is.

### T2 — How much diagnostic to surface (Maintainer "resize down" ⟂ Pedagogy "add more")

The maintainer wants to **limit** scope; the pedagogy expert wants **more** witnesses
(per-frame jump/continuity witness; an *independent* probe; `loop=`/`seam=` path
encoding; a round-trip-walk test). These reconcile because the witnesses the pedagogy
expert wants are **cheap and already computed**: the SolidWorlds engine has a jump
witness at `coverEngine.ts:639`; PolygonWorlds has a geometric `debugProbe` (post-S05).
Surfacing an *existing independent* quantity is not the heavy frame-seeding the
maintainer is guarding against — so: **keep `setPose` minimal (T1) but add the
continuity/independent witness to the HUD.**

### T3 — Where the smoke pass runs in CI (Maintainer correction to the plan)

The plan §4.4 proposed mirroring the `sessions:lint --strict` `continue-on-error` step
**inside `deploy.yml`**. The maintainer flags this as **wrong**: `deploy.yml`
deliberately sets `PUPPETEER_SKIP_DOWNLOAD` and the Pages runner lacks the SwiftShader
runtime libs. **Decision: a separate PR-triggered workflow**, not the deploy job. The
"advisory-now/gate-later" graduation still holds — just in its own workflow.

## 3. Blind spots (none fully addressed by the plan)

> [!WARNING]
> **B1 — Determinism. The plan claims "same view twice" but nothing freezes the
> frame.** (Consultant; missed by the plan and the other two experts.) The walkers run
> a wall-clock `getDelta()` rAF with time-based motion. A deep link sets the *pose* but
> not the *clock* — two shots of the same URL can differ. **Without a freeze
> (a `?freeze`/`t=` param, disabling animation, or settle-on-idle instead of a fixed
> `WAIT_MS`), the harness's core promise is unmet.** This is arguably the single most
> important gap.

- **B2 — Two debug-query conventions.** PolygonWorlds' existing `polydebug` reads
  `location.search`; the new helper reads the **hash**-query (`#/route?…`). A real
  latent inconsistency (consultant confirmed in code) — unify them.
- **B3 — No round-trip.** The HUD shows pose but doesn't **emit** the reproducible URL.
  A "copy deep-link" affordance closes the loop (author a frame → get a shareable URL)
  and is what makes it a teaching artifact (consultant + pedagogy).
- **B4 — Dead-frame detector is brightness-based.** Can't separate a legitimately dark
  look (`moonlit`) from a dead frame. Use **variance** instead of mean brightness, or
  **force a bright look via the `SEED_LS` the harness already has** before the readPixels
  scan (consultant).

## 4. Recommended action

**Proceed — Deliverable A, Phase 1 scaffolding, as written.** Before Phases 2–4, fold
in the following revisions (most are *narrowing*, not new work):

1. **`setPose` = position + heading only** (T1). Document that flipped/screw sheets are
   reached by walking/placing across a seam — the engine derives the frame. Removes both
   the under-costing and the circularity.
2. **HUD adds an independent continuity/jump witness** (T2/B-correctness), sourced from
   the engine quantity that already exists (`coverEngine.ts:639`; PolygonWorlds
   `debugProbe`) — not just the determinant the probe itself reads.
3. **Add determinism** (B1): a `freeze`/`t=` param (or settle-on-idle) so a shot is
   actually reproducible. **This is a precondition for the acceptance criterion "lands
   the same view twice."**
4. **Unify the debug-query convention** (B2) and **add a "copy deep-link" round-trip**
   (B3).
5. **Narrow Deliverable B's claim** to *boot / blank / context-loss* failures; make
   **console + `webglcontextlost`** the load-bearing detectors; replace the brightness
   threshold with **variance or a forced bright look** (B4). Drop or caveat "catches
   #216."
6. **CI: a separate PR-triggered smoke workflow** (T3), not the Pages-deploy job.
   `PUPPETEER_SKIP_DOWNLOAD` stays off in deploy.
7. **"URL wins" must short-circuit `usePersistentState`'s load** (maintainer), not merely
   supply its initial value.
8. *Optional pedagogy stretch (defer):* `loop=`/`seam=` path encoding + a round-trip-walk
   unit test — the holonomy-after-a-loop is what a topology teacher actually wants, but
   it's a v2.

> [!NOTE]
> **One cheap experiment settles the two highest-stakes uncertainties** (consultant
> flagged these as reasoned-from-code, not measured): a single `shoot.mjs` run that
> (a) double-shoots one URL to confirm/deny the determinism gap, and (b) checks whether
> `gl.readPixels` returns usable data on a SwiftShader framebuffer at all. Run it at the
> top of implementation, before committing to B's detector design.

Net: the plan is **endorsed in direction and in Deliverable A**; Deliverable B is
**rescoped to what software-WebGL can honestly assert**; and one real blind spot
(determinism) is promoted to a precondition.

## Self-reflection

**Q1 — What was the actual ask vs. what I did?** Synthesize three expert reviews of a
plan into a convergence analysis. I read all three verdicts, mapped agreements/tensions/
blind spots, and resolved the one apparent expert conflict (T1/T2) rather than just
reporting it.

**Q2 — Where did I extrapolate beyond evidence?** The T1/T2 resolution ("position+heading
only, walk across seams, engine derives the frame") is *my* synthesis, not stated by any
single expert — it's an inference that the maintainer's and pedagogy's objections cancel.
It should be validated against the actual engine APIs before being treated as settled.

**Q3 — What would change my conclusion?** If `setPose` position+heading alone cannot in
fact place the walker onto a flipped/screw sheet without seeding a frame (i.e. if you
*must* start mid-cell on the wrong sheet), T1's tidy resolution collapses and the
frame-seeding cost is unavoidable. Unverified against code.

**Q4 — Verification method.** Reasoning over three committed reports + the plan; **not**
run against code or a live render. No build/test executed by this synthesis step.

**Q5 — Biggest risk in my output?** Presenting the T1/T2 resolution with more confidence
than an unverified API inference warrants.

**Q6 — Follow-up signal.** `visual-unverified` (the underlying determinism/correctness
claims remain reasoned-from-code until the one-shot experiment in §4 is run).

**Q7 — Does each conclusion test the user-visible claim?** Partly. The synthesis
correctly elevates the determinism blind spot (which directly governs the "reproducible
frame" user-visible promise), but its own resolutions are design recommendations, not
checks — they become real only when Phase 1 code + the §4 experiment run.

**Follow-up value:** HIGH — the T1/T2 resolution and the determinism precondition should
be confirmed by a short `shoot.mjs` experiment + an engine-API read before the plan is
revised and implemented.
</content>
