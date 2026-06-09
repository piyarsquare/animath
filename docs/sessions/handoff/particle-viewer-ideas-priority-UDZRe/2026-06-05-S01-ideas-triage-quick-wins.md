---
kind: handoff
session: 2026-06-05-S01
date: 2026-06-05
title: Particle-viewer ideas triage + quick wins
branch: claude/particle-viewer-ideas-priority-UDZRe
slug: particle-viewer-ideas-priority-UDZRe
status: completed
build: passed
followup: low
pr: null
---

# Particle-viewer ideas triage + quick wins

## What shipped

13 features (+ a removal), each its own commit with a green build:

- **Hopf study view** — one-tap preset: forces Hopf, Motion→Fixed, stops spins, resets 4D orientation.
- **Flexible color** — independent **Hue** and **Brightness** pickers (`ColorQuantity`: phase / magnitude / real / imag, + **Uniform** flat for brightness).
- **Functions** — added `cot`, `arcsin`, `arccos` (branch-aware); grouped the picker into 5 categories via new `Select` optgroup support; added the parameterized **quadratic** `a·z²+b·z+c` (complex coeffs).
- **Domain** — explicit min/max bounds with a **± lock** (two-thumb `RangeSlider` when unlocked); a **Sampling** pattern picker (grid / polar / rings / spokes / web / squares / random).
- **Charts** — Input/Output **polar / log-polar** remap (`chartCoord`).
- **Torus polish** — soft pole-clamp (`POLE_EPS`) + scaffold text labels; the **Hopf fiber-trace overlay** (the interlocking circles).
- **Shared primitives** — commit-on-blur `NumberInput`; dual-thumb `RangeSlider`; `Select` groups.
- **UX** — confirm guard on "Reset settings"; **removed** the Torus "Radius scale: Log" footgun.

> [!CAUTION]
> **Gotcha** The **Torus projection is scale-invariant** — it drops overall `|z|`, keeping only the angles + the `|f|/|z|` ratio. That's why `f = b·z` collapses to a *single* crisp circle (one Hopf fiber). The removed log-radius broke that (nonlinear, un-collapsed it into a fuzzy band off `b=1`). Also: **Motion = Quaternion (default) auto-tumbles the 4D orientation even in Hopf/Torus**, which deforms those nonlinear views — use Fixed / the Hopf study button.

## Key files

| File | Role |
| --- | --- |
| [`ComplexParticles/shaders/index.ts`](https://github.com/piyarsquare/animath/blob/4f2b8f6/src/animations/ComplexParticles/shaders/index.ts) | `calcColor` (hue/brightness quantity), `chartCoord` (polar charts), `applyComplex` (cot/arcsin/arccos/quadratic, indices 19–22), Torus `project` (log-radius removed) |
| [`lib/particles/createParticleGeometry.ts`](https://github.com/piyarsquare/animath/blob/4f2b8f6/src/lib/particles/createParticleGeometry.ts) | `fillPattern` — the 7 sampling layouts; explicit `(xMin,xMax,yMin,yMax)` bounds |
| [`lib/particles/createHopfFibers.ts`](https://github.com/piyarsquare/animath/blob/4f2b8f6/src/lib/particles/createHopfFibers.ts) | Fiber-trace overlay (LineLoops; samples base points on S²) |
| [`lib/particles/useParticleState.ts`](https://github.com/piyarsquare/animath/blob/4f2b8f6/src/lib/particles/useParticleState.ts) | All new persisted state (colorQuantity, brightnessQuantity, bounds + lock, samplePattern, inputCoord/outputCoord, showFibers/fiberDensity) |
| [`components/ControlPanel.tsx`](https://github.com/piyarsquare/animath/blob/4f2b8f6/src/components/ControlPanel.tsx) | `NumberInput`, `RangeSlider`, `Select` groups (optgroups) |
| [`components/ParticleViewerShell.tsx`](https://github.com/piyarsquare/animath/blob/4f2b8f6/src/components/ParticleViewerShell.tsx) | Domain / Color / Camera UI; Hopf study button; `domainExtras` slot (branch range) |
| [`lib/complexMath.ts`](https://github.com/piyarsquare/animath/blob/4f2b8f6/src/lib/complexMath.ts) | CPU mirrors (adaptive sampling): new functions, `functionCategories`, `complexQuadratic`, `QUADRATIC_INDEX` |
| [`IDEAS.md`](https://github.com/piyarsquare/animath/blob/4f2b8f6/IDEAS.md) | Backlog with accurate status markers (source of truth for what's left) |

## Pending / not done

**Big (intentionally deferred):**

- **Unified channel-mapping matrix** — the grand refactor (every axis + color a free source×coordinate assignment). Subsumes drop-axis / charts / color pickers; their plumbing is now all in place. Its own project.
- **Custom `f`** — typed expression → GLSL compiler (+ CPU evaluator for adaptive). The quadratic was the pragmatic stand-in.

**Small polish follow-ups (inside shipped features):**

- **Hopf fibers** — make the Collapse→Hopf slider also shrink the fiber circles to points (they currently just hide past 0.5); option to seed fibers from the function's own graph points.
- **Sampling patterns** — annulus (`rMin>0`) for radial patterns (useful for singular `1/z`, `ln`); sunflower option; per-pattern density (ring/spoke counts).
- **Polar charts** — phase-unwrap for the `arg` seam at ±π.
- **Color as a 4th channel** — judged redundant (Drop-axis + Hue/Brightness already does it); revisit only via the matrix.

> [!NOTE]
> **Note** Old `localStorage` keys are now ignored (harmless): `branchCount`/ `branchIndices`/`branchStyle` (replaced by a sheet *range* `branchMin`/`branchMax`) and `logRadius` (removed).

## Context

- First (and so far only) tracked session on this branch. No PR opened — branch is pushed and ready if one is wanted.
- The session's most instructive thread: a user-reported "fuzzy circle" for `f=b·z` in the Torus view. I wrongly blamed jitter, then sampling, then 4D motion; the user identified it as the **log-radius** option. Confirmed by rendering the exact Torus math headless (PNG via node `zlib`) — see `/tmp/render*.mjs` pattern; those scripts are throwaway, not committed.
- Append-only convention honored: new functions added at the *end* of `functionNames` (persisted index), categories are presentation-only.

## Self-reflection

1. **What would you do with another session?** The annulus (`rMin>0`) sampling control — cheap and genuinely useful for singular functions — then scope the unified channel-mapping matrix properly.
2. **What would you change about what you produced?** I diagnosed the "fuzzy circle" three times wrong before the user found it. I should have reached for the headless render (my eventual proof) *first*, instead of trusting analytic models that each silently assumed default settings.
3. **What were you not asked that you think is important?** Whether to keep the polar/sampling work given the actual bug was log-radius — I kept it (it solves a real, different problem) but didn't explicitly re-justify it until asked.
4. **What did we both overlook?** That a non-default toggle (log-radius) was active the whole time — every model I built assumed Linear, so none could reproduce the report.
5. **What did you find difficult?** Diagnosing a WebGL visual with no way to see the canvas. Resolved by rendering the projection math to PNG headlessly.
6. **What would have made this task easier?** A screenshot/headless-render harness in the sandbox so visual claims can be checked before asserting them.
7. **Follow-up value:** LOW — everything shipped builds and is verified; what remains is the two big deferred items + small polish, all clearly scoped in `IDEAS.md`.
