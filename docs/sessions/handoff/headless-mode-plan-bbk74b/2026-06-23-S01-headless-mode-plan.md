---
kind: handoff
session: 2026-06-23-S01
date: 2026-06-23
title: Headless mode build-out — debug-pose harness + mobile smoke (shipped)
branch: claude/headless-mode-plan-bbk74b
slug: headless-mode-plan-bbk74b
status: completed
build: passed
followup: low
pr: 234
app: docs, engine
signals: phone-needed
next: Give Solid Worlds a genuine independent witness (filed in TODO), or fix the RGBELoader HDR finding
---

# Headless mode build-out — debug-pose harness + mobile smoke (shipped)

> [!NOTE]
> Plan → three-hats review → pre-build experiment → 5 implementation phases, all in
> one session. The plan + the three expert reviews + synthesis are committed in this
> branch's `progress/` folder; this handoff distills the *implementation*.

## Summary

Built the **L1 positive check** — the highest-ROI item in the corpus (~14
reflections, requested independently 3×): the missing automated check behind
"verified headless, never on a real device." Two deliverables, both shipped and
verified: **(A)** a deep-link **debug-pose harness + opt-in dev HUD** that lets
`shoot.mjs` reproduce an *exact* walker frame from a shareable URL (adopted by
Polygon Worlds + Solid Worlds), and **(B)** `npm run smoke` — a 390×844 headless
pass over every route that fails on the runtime-crash/blank-frame class escaping
`tsc && vite build` (**PASS 17/17**, non-blocking PR CI). `RECURRING_LESSONS.md`
**L1 is now 🟢 (rule + check)**. Build ✓ · 64/64 tests ✓ · lint 0 errors.

## What changed

**Shared scaffolding (Phase 1)** — `src/lib/debugPose.ts` (app-agnostic hash-query
pose parser + `hudEnabled` + `frozenTime` + the `DebugState` type),
`src/components/DebugPoseHUD.tsx` (opt-in corner HUD), `src/lib/nearestMarker.ts`
(pure, unit-tested). Nothing user-visible.

**Pre-build experiment** — a one-off headless probe (in scratch) measured the two
uncertainties the three-hats synthesis flagged, *changing* the plan:
- **Determinism holds at idle** → the `freeze`/`t=` param is insurance, not a
  precondition (downgraded). Walkers don't animate without input.
- **`gl.readPixels` is unreliable** (all-black on `preserveDrawingBuffer:false`) →
  the dead-frame detector reads the **screenshot**, not `readPixels`.
- **Variance, not brightness** (ComplexParticles: mean 23 but variance 3086).
- **Clean routes log baseline resource `console.error`s** (404 + cert) with
  `pageerror`=0 → the smoke gate keys on `pageerror`+`webglcontextlost`.

**Walker adoption (Phases 2–3)** — added `setPose` to each engine (PolygonWorlds
`CoverModel`/euclidean presenter; SolidWorlds `coverEngine`, generalizing
`recenter()`). **Position + heading only** — flipped/screw sheets are reached by
*walking* across a seam (engine derives the frame), which sidesteps both the
frame-seeding cost and the "det validates itself" circularity. Boot params
(`world`/`look`/`cam`/`camd`/`yaw`/`pitch`/`x,y,z`|`u,v`/`hud`) read via a ref so
`onMount` stays dependency-free; URL wins over session defaults; `look` overrides
engine-level (no persisted-state clobber). PolygonWorlds carries an *independent*
ink-handedness `witness` (`debugProbe`); SolidWorlds does **not** (deferred — see
Open).

**Mobile smoke (Phase 4)** — `scripts/smoke.mjs` + `npm run smoke`. Running it
against the real catalog forced two calibration fixes: in-page `drawImage(canvas)`
reads blank on the on-demand-render apps (fractals/plane-transform/correspondence),
so it now measures variance over the **canvas-clipped screenshot** round-tripped
through an `<img>`; and `#/trinary-lab` is a DOM Lab, reclassified. CI in
`.github/workflows/smoke.yml` (PR-triggered, separate from `deploy.yml`,
`continue-on-error`).

**Docs + ledger (Phase 5)** — `docs/HEADLESS_WEBGL.md` (deep-link vocabulary +
smoke), `RECURRING_LESSONS.md` L1→🟢, `RECIPES.md` R1, TODO check-offs,
`package.json` added to the append-only protected-file list.

## Key files

| File | Role |
|---|---|
| [`src/lib/debugPose.ts`](https://github.com/piyarsquare/animath/blob/74aff96/src/lib/debugPose.ts) | Hash-query pose parser + `DebugState` type (the convention) |
| [`src/components/DebugPoseHUD.tsx`](https://github.com/piyarsquare/animath/blob/74aff96/src/components/DebugPoseHUD.tsx) | Shared opt-in dev HUD (mounts only on `?hud`/`?debug`) |
| [`src/lib/nearestMarker.ts`](https://github.com/piyarsquare/animath/blob/74aff96/src/lib/nearestMarker.ts) | Pure nearest-marker distance (+ `__tests__`, 11 cases) |
| [`scripts/smoke.mjs`](https://github.com/piyarsquare/animath/blob/74aff96/scripts/smoke.mjs) | `npm run smoke` — 390×844 all-route crash/blank check |
| [`.github/workflows/smoke.yml`](https://github.com/piyarsquare/animath/blob/74aff96/.github/workflows/smoke.yml) | Non-blocking PR smoke CI (separate from deploy) |
| [`src/animations/PolygonWorlds/presenters/euclidean.ts:448`](https://github.com/piyarsquare/animath/blob/74aff96/src/animations/PolygonWorlds/presenters/euclidean.ts#L448) | `setPose(u,v)` impl (inverse of `chart()`) |
| [`src/animations/SolidWorlds/coverEngine.ts:724`](https://github.com/piyarsquare/animath/blob/74aff96/src/animations/SolidWorlds/coverEngine.ts#L724) | `setPose({u,v,w})` (generalized `recenter`) + `getChirality`/`getMapState` |
| [`docs/HEADLESS_WEBGL.md`](https://github.com/piyarsquare/animath/blob/74aff96/docs/HEADLESS_WEBGL.md) | The user-facing doc for both deliverables |
| [`docs/sessions/RECURRING_LESSONS.md`](https://github.com/piyarsquare/animath/blob/74aff96/docs/sessions/RECURRING_LESSONS.md) | L1 ledger row — now 🟢 (rule + check) |

## Open / not done

> [!NOTE]
> **Post-merge review fix (Codex P2):** a debug-pose deep link's *position* didn't
> survive startup — the parent `useEffect([spec])` runs right after `Canvas3D`'s
> `onMount` (children-first effect order), disposed the freshly-built engine, and
> rebuilt it without the pose, so `?u=…&v=…` / `?x=…` settled back to default spawn
> (world/cam/look survived as React state). Fixed by skipping that first redundant
> rebuild in both walkers. Confirmed by reading the HUD `pos` against the URL
> (`u=0.2,v=0.85` → HUD `pos 0.20 0.85`). The lesson: the HUD exists to make exactly
> this visible, and the original verification didn't read it against the params.

- **Solid Worlds independent witness** (`[solid-worlds] !med` in TODO) — the one
  intentional gap. PolygonWorlds cross-checks its chart bookkeeping with an
  independent geometric probe; SolidWorlds shows only the (dual-verified)
  determinant. Deferred, not faked, because a wrong witness is the exact L3 trap
  the harness exists to prevent (e.g. the per-step developing determinant is
  legitimately −1 on a glide wrap — an L7 subtlety). Plumb into `DebugState.witness`.
- **RGBELoader HDR finding** (`[complex-particles] !low` in TODO) — the smoke pass
  surfaced `THREE.RGBELoader: Unsupported type: 1009`; the HDR env map silently
  fails on ComplexParticles and falls back. Benign but real; fix in `lib/textures.ts`.
- **Smoke → hard CI gate** — currently `continue-on-error`. Drop that once it's
  proven quiet across a few PRs (the `sessions:lint --strict` graduation path).
- **`freeze`/`t=`** param is parsed but no app consumes it yet (insurance for any
  future animated/spin state).

> [!CAUTION]
> Two headless shots of the *same* deep-link URL from *separate* processes are
> **visually identical but not byte-identical** (sub-pixel SwiftShader float
> nondeterminism). Compare frames with a **pixel tolerance**, never `cmp`.

> [!IMPORTANT]
> The smoke CI is a **separate** workflow on purpose. `deploy.yml` sets
> `PUPPETEER_SKIP_DOWNLOAD` (no Chrome) and the Pages runner lacks SwiftShader libs —
> don't move the smoke step into it.

## Context

- Branch is off `main` (not stacked); diff is ~3041 insertions across src/scripts/
  docs, no unrelated work. Append-only shared files touched: `package.json` (added
  `smoke` script), `CLAUDE.md`, plus the docs ledger — all additive.
- The walkers early-return on `inFormField()` (typing in a panel mustn't drive the
  scene); the HUD/pose wiring left that untouched.
- Verify any walker pose change headless with a deep link, not the default view:
  `node scripts/shoot.mjs '#/solid-worlds?world=half-turn&x=0.4&z=-0.3&yaw=0.8&cam=third&hud' shot.png`.

## Self-reflection

1. **What would you do with another session?** Build the Solid Worlds independent
   witness (the deferred item) so its headless verification is honest end-to-end like
   PolygonWorlds', and fix the RGBELoader HDR bug the smoke surfaced. Both are filed.
2. **What would you change about what you produced?** The DebugPoseHUD position is a
   hand-tuned corner offset (`top:180,right:12`) chosen to dodge each walker's
   existing overlays — fragile if those overlays move. A more robust approach would
   anchor it relative to a known-empty region or render it via portal above the
   panels.
3. **What were you not asked that you think is important?** Whether the deep-link
   vocabulary should also drive the *non-walker* WebGL apps (fractals center/zoom,
   particle camera) — they'd benefit from reproducible frames too, but it was
   deliberately out of scope ("walkers first").
4. **What did we both overlook?** Two things. (a) Cross-process renders aren't
   byte-identical — caught during Phase 2 and documented (pixel-tolerance rule).
   (b) **The pose-survival bug** (Codex P2): a debug-pose deep link's *position* was
   silently discarded by the mount-time engine rebuild. My verification read the HUD
   for world/cam/look but never compared the HUD's `pos` to the URL's `u,v`/`x,y,z` —
   so the one check the HUD was built to enable is exactly the one I skipped. A
   reviewer bot caught it; fixed + re-verified by reading `pos` against the params.
   This is a live instance of L1/L3 ("verified headless ≠ tested the specific claim").
5. **What did you find difficult?** Deciding the Solid Worlds witness honestly. The
   pull to surface *something* labeled "independent witness" was strong, but every
   cheap candidate was either an echo of the determinant or an L7 trap (per-step det
   is −1 on glide wraps). Choosing to defer rather than fake it was the right call but
   not the comfortable one.
6. **What would have made this task easier?** A shared "diagnostics overlay" slot in
   the workspace chrome (a designated, collision-free HUD region) would have removed
   the per-app position tuning.
7. **How did you verify this, and does each passing check test the user-visible
   claim?** Mixed, mostly real — but with one **caught miss**. Solid: `nearestMarker`
   by committed vitest (11 cases); the smoke pass by running it to PASS 17/17 *and*
   watching it correctly FAIL (trinary-lab dead-frame, RGBELoader) before calibration;
   reproducibility by a real two-shot `cmp` revealing the byte-vs-visual nuance. The
   **miss**: I verified the harness by reading screenshots for world/cam/look, but
   *not* the `pos` value against the exact URL params — so a real correctness bug (pose
   not surviving startup) shipped to the PR and was caught in review, then fixed and
   re-verified by reading `pos` (`u=0.2,v=0.85` → HUD `pos 0.20 0.85`). The standing
   **proxy**: the smoke's dead-frame variance is a blank-detector, not a correctness
   check — SwiftShader tolerates the NaN real mobile GPUs crash on, so green smoke ≠
   correct mobile render. Documented; `phone-needed` stays a standing signal.
8. **Follow-up value:** LOW — the deliverables are complete and verified (incl. the
   reviewer-caught pose-survival fix, re-verified against the HUD); the two open TODO
   items (SolidWorlds witness, RGBELoader fix) are enhancements/cleanup, not
   corrections to what shipped.
