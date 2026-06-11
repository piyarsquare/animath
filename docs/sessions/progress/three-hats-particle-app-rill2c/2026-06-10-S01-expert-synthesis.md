---
kind: three-hats
session: 2026-06-10-S01
date: 2026-06-10
title: "Three hats — Complex Particles: convergence analysis"
branch: claude/three-hats-particle-app-rill2c
slug: three-hats-particle-app-rill2c
status: completed
build: passing
app: complex-particles
---

# Three hats — Complex Particles: convergence analysis

## Plan under review

<details><summary>Original request</summary>

> I want you to start a session. focus is on the complex particle app. I want
> you to run the three hats skill on the complex particle app and report the
> results.

The subject is therefore the **current state** of the Complex Particles app —
`src/animations/ComplexParticles/` plus the `src/lib/particles/` engine,
`src/components/ParticleViewerShell.tsx`, and the supporting libs
(`complexMath.ts`, `viewpoint.ts`, `QuarterTurnControls.tsx`) — reviewed just
after PR #200 landed the projection slider (Perspective ⇠ Torus ⇢ Sphere),
the completed function library, the embed route, and the free-orbit camera.

</details>

The three expert reports this synthesizes:

- [Framework Maintainer](2026-06-10-S01-expert-maintainer.md)
- [Architecture & Quality Consultant](2026-06-10-S01-expert-consultant.md)
- [Math-Viz & Pedagogy Expert](2026-06-10-S01-expert-pedagogy.md)

## 1 · Points of agreement (high confidence)

All three experts **endorse the app and its architecture** — no one calls for
a rewrite. The maintainer calls the engine/shell/app split "the best-factored
corner of the repository"; the consultant independently validates the
headless-engine pattern (React owns settings, refs own frame state, GPU owns
the math) and the decision to hand-roll the Three bridge rather than adopt
react-three-fiber; the pedagogy expert verified the projection formulas
against the actual GLSL and found them *exact* (the Hopf map is the real
S³→S² map; the scaffold tori are the true stereographic images of the
Clifford tori; the Stereo→Torus dedup in PR #200 was mathematically correct).

Beyond the global endorsement, specific findings converged independently:

| Finding | Maintainer | Consultant | Pedagogy |
|---|---|---|---|
| `startAnimationLoop` has no cancellation; `onMount` returns no cleanup → every route visit leaks an immortal rAF loop + undisposed GPU resources, despite `Canvas3D` documenting exactly that cleanup contract | **#1 High** | **P1 bug** | — (out of lens) |
| `EXPLAINER.md` documents the removed pre-PR-#200 UI (Hopf study view, fiber controls, Collapse slider, "Stereographic"), omits Tiles/Net, and keeps a false conformality claim | **#2 High** | — | **#1** |
| Branch controls/sheets apply to single-valued functions (e.g. `exp` draws N identical additive clouds — N× brightness and draw cost); PlaneTransform already gates on `MULTIVALUED_INDICES`, ComplexParticles ignores it | **#3 High** | — | **#3 / #6** |
| The multi-way TS×2 + GLSL×2 function dispatch has no lockstep guard, and drift already happened once (PlaneTransform rendered fns 19–22 as identity) | **#4 Med** | **P2/P6** | (implicit in cbrt/Γ findings) |

> [!IMPORTANT]
> Two findings were reached **independently from different directions**, which
> is the strongest signal this review produces: the **rAF/resource leak**
> (maintainer from the unused `Canvas3D` contract; consultant from lifecycle
> analysis) and the **stale explainer** (maintainer from PR-#200 history;
> pedagogy from teaching the UI as documented and finding it gone).

Also shared: both maintainer and consultant explicitly **endorse the recent
perf work** (4 Hz orientation throttle, DPR cap) and the persistence design
(`usePersistentState` with the null-key embed opt-out), and both rate the
comment culture unusually high.

## 2 · Points of tension (requires discussion)

**T1 — Extract the render-mode subsystem into the engine, or wait?**
The consultant wants `createBranchObjects` (the 5 material factories,
visibility matrix, and `userData` tag protocol — ~450 lines straddling the
app/engine boundary) extracted into `lib/particles` *before* the next
particle-viewer feature (P4, ~1 day), because "copy the canonical consumer"
currently means copying plumbing. The maintainer explicitly forbids exactly
this: *"do not extract the multi-sheet orchestration into the engine until a
second consumer exists"* — speculative abstraction is how the repo got its
previous debt. **Resolution:** the trigger condition is concrete — extract
*when the next particle viewer is started*, not before, and budget the
consultant's day into that app's estimate. Until then, soften CLAUDE.md's
"canonical, simplest consumer" wording (maintainer #7) so the next author
isn't surprised.

**T2 — How much testing does a no-test repo take on?**
The consultant proposes a half-day vitest harness over the pure-math seams
(`complexMath` golden values, `quat4`/`viewpoint` properties, `embedParams`
round-trip, a GLSL dispatch-coverage assertion) as an *unconditional* P2. The
maintainer's milder version is a dispatch-count assertion or generating the
GLSL ladders from one table (#4, Medium). This is a repo-policy question —
CLAUDE.md currently records "no tests" as a known limitation, not a choice to
defend. **Resolution:** the GLSL/TS parity guard is justified by an actual
past failure and both hats want it in some form — do at least that. The wider
vitest harness is cheap and high-leverage but should be a deliberate
repo-level decision (it adds a CI surface beyond `npm run build`).

**T3 — Changing defaults.** The pedagogy expert wants Motion → Fixed by
default (auto-tumble scrambles the axis reading for first-time learners) and
suggests z² as the landing function; the other two don't weigh in. This is a
taste/product call, cheap to flip, but it changes the first impression of the
flagship app — a user decision, not an engineering one.

## 3 · Blind spots (none of the three addressed)

1. **No runtime confirmation.** Every headline finding — the rAF leak, the
   sheet-jitter misregistration, the N×-brightness artifact — was derived by
   reading code. The repo *has* a headless WebGL harness
   (`scripts/shoot.mjs`, the session-start hook installs Chrome libs); a
   30-minute probe could confirm the leak (rAF counter across route swaps)
   and screenshot the sheet offset before any fix is written.
2. **Other `Canvas3D` consumers may share the leak.** The consultant flags
   this in self-reflection but nobody audited PlaneTransform, TopologyWalk,
   PolygonWorlds, etc. for the same missing-cleanup pattern. If the fix lands
   in `createAnimationLoop`/the engine, the siblings should be swept too.
3. **Accessibility beyond color.** The pedagogy hat covered CVD palettes; no
   one looked at keyboard operability of the workspace windows from this
   app's perspective, reduced-motion preferences (auto-tumble + spin vs
   `prefers-reduced-motion`), or screen-reader labeling of the control
   panels.
4. **The embed surface as a correctness liability.** `embedParams` URLs now
   freeze app semantics (function indices, projection names) into external
   documents; none of the three asked what happens to published embeds when
   indices or modes change. The append-only discipline covers it implicitly —
   it should be stated explicitly in `docs/EMBEDS.md`.
5. **The sheet-jitter defect's blast radius.** Pedagogy found `seed = 0`
   shifting Sheet/Tile/Net by (−0.1, −0.1); nobody checked whether the same
   geometry is consumed elsewhere (e.g. the embed route's default render
   mode, gallery previews).

## 4 · Recommended action

A single fix-it session, in this order (items 1–5 ≈ one day, all
within-the-lines of every expert):

1. **Verify at runtime, then fix the lifecycle leak** — make
   `startAnimationLoop` return a stop function; return full cleanup (cancel
   rAF; dispose geometries/materials/textures/scaffold) from
   `ComplexParticles.onMount`; fix the dep-less resize effect (stale
   `uResolution` in Net mode) and add tween-cancellation handles. (M#1, C P1–P3)
2. **Sheet seed fix** — fill sheet/tile/net `seed` buffers with 0.5 in
   `createSheetGeometry.ts` so default jitter no longer translates the
   surface off the point cloud. (P#2 — a one-liner ×4)
3. **Gate branch controls on `MULTIVALUED_INDICES`** — clamp `branchCount`
   to 1 and hide the controls for single-valued functions, matching
   PlaneTransform. (M#3, P#3)
4. **Rewrite `EXPLAINER.md` (+ touch `README.md`)** against the shipped UI:
   the projection slider and its three stops, no Hopf-study/fiber controls,
   document Tiles + Net, drop the conformality claim, and add the
   "numerical honesty" paragraph (pole floors, the 10³ cap, the soft-floored
   torus pole, ln-only inverse-trig sheets). (M#2, P#1+#7)
5. **Minimal dispatch guard** — at least a dispatch-count assertion between
   `complexMath.ts` and both GLSL ladders; ideally generate the ladders from
   one table. (M#4, C P6)

Then, as scheduled follow-ups rather than now: per-sheet color channel and
the Γ/cbrt honesty fixes (P#4–6); the vitest harness pending a repo-level
decision (T2); `createBranchObjects` extraction deferred to the next particle
viewer (T1); default-motion change pending user preference (T3); a sweep of
sibling apps for the same missing-cleanup pattern (blind spot 2).

## Verdict

All three hats endorse the app: the architecture is sound, the math is
verified-correct where it matters most, and the recent PR #200 work improved
it. The review's actionable core is small and sharp — one real resource leak,
one one-line geometry defect, one missing gate, and documentation that
describes an app that no longer exists. Roughly one day of work closes the
gap between what the app *is* (very good) and what it *says and spends*.

## Self-reflection

1. **What would you do with another session?** Run the headless harness to
   confirm the rAF leak and screenshot the sheet-jitter offset, then execute
   the five-step fix list above — the findings are specific enough to act on
   directly.
2. **What would you change about what you produced?** The three experts were
   given overlapping file lists, which produced good independent confirmation
   but also triple-read the same code; a fourth, cheaper "runtime prober"
   agent using `scripts/shoot.mjs` would have converted two static findings
   into verified facts.
3. **What were you not asked that you think is important?** Whether the
   repo should adopt a test runner at all (T2) is a policy fork the user
   should decide once, not per-finding.
4. **What did we both overlook?** The sibling `Canvas3D` apps probably share
   the leak pattern; this review scoped to one app but the fix belongs to the
   engine.
5. **What did you find difficult?** Adjudicating T1 (extract vs wait) — both
   positions are principled; the resolution (extract at the moment of the
   second consumer) is a compromise, not a proof.
6. **What would have made this task easier?** A `scripts/probe.mjs`
   interaction harness (already wished for in the new-chrome handoff) — the
   review would have shipped with runtime evidence instead of code-derived
   claims.
7. **Follow-up value:** **MEDIUM** — the analysis is consistent and
   triple-sourced, but its two highest-priority findings are unverified at
   runtime; confirmation is cheap and would harden them to certainty.
