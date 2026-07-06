---
kind: handoff
session: 2026-07-02-S01
date: 2026-07-02
title: Clean up loose ends — accidental-complexity audit + executed cleanup
branch: claude/clean-up-loose-ends-8b0wqp
slug: clean-up-loose-ends-8b0wqp
status: completed
build: passed
followup: LOW
pr: 247
app: general, fractals, chrome, docs
signals: visual-unverified
next: Review + merge PR #247. Deferred to Dan / a notebook thread: the Argand/Number-Plane final unified format, then Argand's theme-token wiring.
---

# Clean up loose ends — accidental-complexity audit + executed cleanup

## Summary

A periodic "have we overcomplicated anything" review of animath, run as a
16-reviewer fan-out with adversarial verification, then executed as a cleanup on
**PR #247** (open, build green). The framework core is healthy; the accidental
complexity was edge-accretion. Landed: dead-file/script/export deletions, a shared
**`lib/df64.ts`** (the one real structural fix — the deep-zoom shader was copy-pasted
across two apps), an American-spelling pass, TopologyWalk **archived** (not deleted),
the stale pre-redesign `*_UI.md` docs deleted, and the complex-plane apps reordered.
Verification caught **two false-positive "dead" claims** and kept them.

## What changed

**The review** — full findings + evidence + 3-tier action list in the S02 report
(link below). 16 reviewers (13 area + dead-code/duplication/convention-drift hunters),
each grep-grounded; the notable structural claims re-verified by hand.

**Tier 1 — quick wins (committed):**
- Deleted dead modules (`styles/responsive.ts`, `types/uniforms.d.ts`,
  `unported_examples/fractint-simulator.tsx`), 3 orphaned `.html` session artifacts,
  ~10 orphaned one-off scripts (`probe-*`, `shoot-pw`, `sign-shots`, `test-rotations`,
  `probe-trivial-words`), ~15 grep-confirmed dead exports (+ the private helpers
  `rgba`/`combinations` they orphaned), `CorridorPreview` + `'corridor'` kind, the
  dead `hue` prop chain.
- American-spelling pass (14 fixes incl. one user-facing string); StableMatching's
  hardcoded neutral grays → `var(--border)` (fixes light skins).

**Tier 2 — df64 extraction:** `lib/df64.ts` (`DF64_GLSL` + `splitDouble`/
`MAX_ITERATIONS`/`suggestedIter`), inlined into both fractal shaders like
`PALETTE_GLSL`. `MAX_ITER 4000` went from 4 hardcoded copies to 1.

**Tier 3 — decisions (Dan):**
- **TopologyWalk archived** to `archive/animations/TopologyWalk/` (out of the build,
  kept for reference; the Möbius corridor engine has no live successor). Routes +
  `apps.ts` entry removed; `#/topology-walk|mobius|wrap-world` fall back to the gallery.
- **Stale `*_UI.md` docs deleted** (8 UI manuals + `GLOBAL_APP_DESIGN.md`, superseded
  by `docs/apps/*.md`) + two executed-plan docs (`polygon-worlds-plan.md`,
  `TRINARY_ROADMAP.md`); two completed redesign docs bannered historical.
- **Gallery:** Complex Particles stays the flagship (first); the trailing cluster is
  the **plane-arithmetic pair** (Plane Transform · Argand) — unmerged "number planes"
  realizations — held until a notebook thread settles the final format.
- **Follow-on tidy:** fixed dead `#/topology-walk` references after the archive
  (notably `smoke.mjs`'s route table — it was testing the archived route as
  `webgl:true`); repointed the three-hats skill off the deleted docs.

**Two claims refuted by verification (kept, not removed):** `runBattery` (used by
`scripts/verify-geometry.ts`) and the stone/metal particle textures (live via the
Texture picker — `textureNames`).

## Key files

| File | Role |
|---|---|
| [`2026-07-02-S02-deep-codebase-review.md`](https://github.com/piyarsquare/animath/blob/e79fe3e2233e8bebf18682c058b21376eda001b9/docs/sessions/progress/clean-up-loose-ends-8b0wqp/2026-07-02-S02-deep-codebase-review.md) | The full audit: findings, evidence, 3-tier action list, decisions |
| [`src/lib/df64.ts`](https://github.com/piyarsquare/animath/blob/e79fe3e2233e8bebf18682c058b21376eda001b9/src/lib/df64.ts) | New shared df64 module (`DF64_GLSL` + JS helpers) — the one structural fix |
| [`src/apps.ts:12`](https://github.com/piyarsquare/animath/blob/e79fe3e2233e8bebf18682c058b21376eda001b9/src/apps.ts#L12) | Gallery order; header documents the trailing plane-arithmetic pair (append-only exception) |
| [`archive/README.md`](https://github.com/piyarsquare/animath/blob/e79fe3e2233e8bebf18682c058b21376eda001b9/archive/README.md) | The new archive convention (retired-but-kept code, out of the build) |
| [`src/animations/FractalsGPU/FractalsGPU.tsx:6`](https://github.com/piyarsquare/animath/blob/e79fe3e2233e8bebf18682c058b21376eda001b9/src/animations/FractalsGPU/FractalsGPU.tsx#L6) | Consumes `DF64_GLSL`; sibling `Correspondence/FractalPane.tsx` does too |

## Open / not done

- **Review + merge PR #247** (draft-then-ready; build green, 212 tests pass).
- **Argand / Number-Plane final format** — deferred pending a separate notebook thread.
  The "Number Plane" realization was never its own app; it's the dormant, tested
  `src/animations/Argand/numberPlanes.ts` engine + a planning doc, while the live app
  runs on the untested `complexOps.ts`. Two engines for one job (T4 in the report) —
  do NOT fold them until the format is decided.
- **Argand theming** — Argand is theme-blind (hardcoded 7-color palette, ignores
  skin×mode). Mechanical `--data`-token wiring is possible now but entangled with the
  same "what is this app" question; left for after the format lands.
- Lower-value leftovers noted but not done: export-narrowing (churn ≫ value), the two
  remaining `npm audit` dev-only advisories.

## Context

> [!IMPORTANT]
> **`archive/` is a new top-level convention this session.** Nothing under it is
> built (`tsconfig` includes only `src/`), routed, or imported. Its relative imports
> no longer resolve, so reviving a module means fixing paths, not just moving it back.
> Distinct from `src/unported_examples/` (incoming staging), which I left in place.

> [!CAUTION]
> The **df64 GLSL is now shared but the standalone probe scripts still inline their
> own copy** (`scripts/df64-{gpu,image}-probe.mjs`) — they're outside `src/`. They
> validate the algorithm, not the app's shader wiring; the app shaders were verified
> by rendering `#/fractals` + `#/correspondence` (screenshots).

> [!NOTE]
> The Workflow tool's permission handshake failed repeatedly in this environment, so
> the review ran on parallel **Agent** subagents. Those did **not** survive a
> container suspend/resume — 10 of 16 finished but their completion notifications were
> lost; I recovered their results from the transcript files. For a long fan-out here,
> prefer synchronous agents or check the task output files rather than trusting
> notifications alone.

## Self-reflection

1. **What would you do with another session?** Nothing on this cleanup — it's landed
   and verified. The real next move is a *design* session (with the notebook thread)
   on the Argand/Number-Plane artifact, which unblocks both the engine merge (T4) and
   Argand theming. Everything else in the review's Tier-2/3 is optional polish.
2. **What would you change about what you produced?** I trusted two single-source
   "dead code" claims far enough to write them into the report before verifying
   (`runBattery`, stone/metal textures) — both were false. Verification caught them
   before any deletion, but I'd flag single-source deletion claims as unverified *in
   the report itself* next time, not just in the execution.
3. **What were you not asked that you think is important?** Whether the ~15 dead
   exports should have been a separate PR from the df64 refactor — I batched all of
   Tier-1/2/3 into #247. It's all reviewable (mostly deletions), but a reviewer who
   wants to scrutinize the df64 change has to wade through the archive move.
4. **What did we both overlook?** Initially, that `smoke.mjs` hardcodes a route table
   — archiving TopologyWalk left it testing a dead route as `webgl:true`. Caught in
   the follow-on tidy pass, but it would have been a confusing CI signal otherwise.
5. **What did you find difficult?** Recovering the stranded subagent results after the
   suspend/resume — the harness warns against reading the JSONL transcripts (context
   overflow), so I had to extract just each agent's final message via a targeted
   Python pass rather than reading the files.
6. **What would have made this task easier?** A working Workflow tool (its permission
   stream failed), or synchronous agents from the start — the background fan-out's
   fragility across the suspend cost real confusion ("are they still running?").
7. **How did you verify this, and does each passing check test the user-visible
   claim?** Methods: `npm run build` (green, the real CI gate), `npm run lint` (0
   errors), `npm test` (212/212 — confirms the removed TreesAndNets exports were truly
   test-dead), `scripts/df64-gpu-probe.mjs` (df64 algorithm), and **headless
   screenshots** of `#/fractals`, `#/correspondence`, the reordered gallery, and the
   `#/topology-walk` fallback (tests the user-visible render/order claims). All
   rendering was **headless SwiftShader**, not a real GPU — hence
   `signals: visual-unverified`. The df64 extraction is byte-identical GLSL, so
   behavior-preservation rests on that + the two apps compiling and rendering.
8. **Follow-up value:** LOW — the shipped cleanup is complete and verified; the one
   substantive open item (the Argand/Number-Plane format) is a deliberately-deferred
   design decision waiting on an external thread, not a correction to this work.
