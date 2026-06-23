---
kind: progress
session: 2026-06-23-S01
date: 2026-06-23
title: Plan the headless mode build-out (debug-pose harness + mobile smoke)
branch: claude/headless-mode-plan-bbk74b
slug: headless-mode-plan-bbk74b
status: in-progress
build: unknown
followup: null
pr: null
app: docs, engine
signals: needs-dan
next: Confirm scope/priorities, then write the kind:plan report for the L1 harness + mobile smoke
---

# Plan the headless mode build-out (debug-pose harness + mobile smoke)

## Session purpose

Build out the **headless mode** for animath. Review all existing documentation on
the problem (reports + TODO), then develop a *complete plan* for the work. This is
the **L1 positive check** from `RECURRING_LESSONS.md` — the highest tool-ROI item
in the 2026-06-22 process audit, requested independently three times across the
topology sessions and filed `!high` in `TODO.md`.

## Previous session

First tracked session on this branch (no handoff folder yet). The work descends
from two prior threads:

- [headless-webgl-cloud 2026-06-07-S01](../headless-webgl-cloud/2026-06-07-S01-headless-webgl-tooling.md)
  — built the **screenshot tooling** that exists today (`scripts/shoot.mjs`,
  `scripts/install_headless_webgl.sh`, `docs/HEADLESS_WEBGL.md`, the `SessionStart`
  hook). Status **completed**, PR #187. That gave us the *ability to render a
  frame*; this session plans the *ability to render a chosen frame and to assert on
  it*.
- [process-audit-collaboration 2026-06-22-S01](../process-audit-collaboration-tvrn9b/2026-06-22-S01-process-audit-findings.md)
  — Tier-1 recs **2 & 3** (debug-pose harness + dev HUD; mobile-viewport smoke) are
  the spec this plan executes. Both filed OPEN, own branch.

## Working notes

### 🟢 code · 15:45 — Phase 4: mobile smoke harness (PASS 17/17) + CI wiring + TODOs
**Why:** the second deliverable — the 390×844 runtime-crash check that escapes `tsc && vite build`; built on the *measured* detector design, not guesswork.

Added `scripts/smoke.mjs` + `npm run smoke` + a separate non-blocking CI workflow:
- **Detectors (grounded in the 14:40 experiment):** `pageerror` + `webglcontextlost`
  are **load-bearing** (fail); `console.error` is **advisory** (warn) with a
  resource-load allowlist; **dead-frame = low luma variance**.
- **Two calibration fixes from running it against real routes** (this is why the
  detector design had to be tested, not assumed):
  1. In-page `drawImage(canvas)` reads **blank on the on-demand-render apps**
     (fractals / plane-transform / correspondence don't run a continuous rAF, so
     their buffer is already cleared) — false "dead frame." **Fix:** measure
     variance over the **canvas-clipped puppeteer screenshot** (the true composited
     frame), round-tripped through an `<img>` (no new deps). Now fractals reads
     var≈3369, not 0.
  2. `#/trinary-lab` is a **DOM/readout Lab** (its first `<canvas>` is a mini-sim),
     not a full WebGL scene → reclassified `webgl:false` (the WebGL Observatory is
     `#/trinary`, var≈1108).
- **Result: PASS 17/17, exit 0**, 2 advisory warnings — a **real benign finding**
  the smoke surfaced: `THREE.RGBELoader: Unsupported type: 1009` (the HDR env map
  fails to load on ComplexParticles, falls back to white). Filed `!low` in TODO.
- **CI:** `.github/workflows/smoke.yml` — PR-triggered, **separate** from
  `deploy.yml` (which skips puppeteer's Chrome), `continue-on-error` (advisory-now /
  gate-later, the `sessions:lint --strict` graduation path). Revision #6.

Per Dan's request, filed the **SolidWorlds independent-witness** follow-up in TODO
(revision #2, deferred from Phase 3).

### 🟢 code · 15:24 — Phase 3: SolidWorlds adopts the harness (verified headless)
**Why:** the 3-manifold walker — where the teleporting-world / spoofed-probe bugs lived; completes the "walkers first" scope.

Wired the deep-link + HUD into SolidWorlds, mirroring Phase 2:
- **Engine seam:** generalized `recenter()` into `setPose({u,v,w})` on `SolidEngine`
  + `coverEngine` (cube coords −1..1 → world `pos`, frame upright, cell/holonomy
  cleared). Position only; heading is the host yaw (grounded modes re-lock `v` to
  floor height next frame — use `fly`/`x,z` for an exact drop).
- **Boot params** (`world`/`cam`/`camd`/`yaw`/`pitch`/`look`/`x,y,z`): lazy
  `useState` initializers (URL wins; `world` validated against `SOLID_WORLDS`),
  `look` overridden engine-level, `x,y,z` → `setPose`, all read via the bootRef so
  `onMount` stays dependency-free.
- **HUD** (`?hud`): world·look, pos (u,v,w), yaw/pitch, **determinant** (from
  `mapState.mirrored` — the dual-verified screw-safe invariant), `cell`, and
  `nearestMarker` = distance to the nearest cube vertex (reusing the existing
  `CUBE_CORNERS` as markers via the Phase-1 helper).

**Verified headless** at 390×844: `?world=half-turn&x=0.4&z=-0.3&yaw=0.8&look=dusk&
cam=third&camd=8&hud` drops the walker off-center in the half-turn dicosm, third
person, with the HUD + the existing ChiralityHUD ("ORIGINAL") both reading. Build ✓
· **64/64 tests** ✓ · lint 0 errors.

> [!NOTE]
> **Honest scope on the independent witness (revision #2).** PolygonWorlds got a
> genuine independent `witness` (ink handedness via `debugProbe` — a different code
> path than the chart). **SolidWorlds carries none yet** — it has no geometric
> ink-probe analog, and inventing one correctly is its own task (and risks the very
> L3 "green check that wasn't" the harness exists to prevent: e.g. measuring the
> per-step developing determinant is subtle — it's legitimately −1 on a
> glide-reflection wrap, not +1, an L7 trap). Its determinant is already the
> authoritative, dual-verified, screw-safe invariant, so the echo risk is milder
> than PolygonWorlds' ink case. **Deferred** as a follow-up, not faked.

### 🟢 code · 15:01 — Phase 2: PolygonWorlds adopts the harness (verified headless)
**Why:** the cheaper first integration (it already exposes `getPose`/`getMapState`/`debugProbe`); proves the convention end-to-end.

Wired the debug-pose deep link + HUD into PolygonWorlds (euclidean χ=0 worlds):
- **Engine seam (`setPose`, position+heading-only per revision #1):** added
  `setPose?(u,v)` to `CoverModel` + implemented in the **euclidean** presenter
  (inverse of `chart()`'s home-cell branch; resets `flipAcc=0`, clears the trail so
  there's no streak). Threaded `setPose({u,v})` through `PolygonEngine`. Spherical/
  hyperbolic no-op for now (optional). Heading stays the host's look-yaw — flipped
  sheets are reached by *walking* across a seam, not seeded.
- **Boot params** (`PolygonWorlds.tsx`): `world`/`cam`/`camd` via lazy `useState`
  initializers (URL wins over the session default; `world` validated against
  `WORLDS`); `yaw`/`pitch` → refs; `look` overridden **engine-level** (doesn't
  clobber the user's persisted look); `u,v` → `engine.setPose` — all read via a ref
  so `onMount` stays dependency-free (no new `exhaustive-deps` warning).
- **HUD** (`?hud`/`?debug`): mounts the shared `DebugPoseHUD` showing world·look,
  pos (u,v), yaw/pitch, **determinant** (chart flip bookkeeping) cross-checked by the
  independent **`witness`** = ink handedness (`debugProbe`, a *different* code path),
  plus `nearestMarker` (chart-space, via the Phase-1 helper). Guarded the witness to
  show only when finite (empty trail after `setPose` → omit).
- Refined `DebugState`: `jump` → a labeled `witness {label,value}` that fits both
  walkers' independent checks.

**Verified headless** at 390×844 (eyeballed PNGs): `?world=klein&u=…&v=…&yaw=…&
look=dusk&cam=third&hud` lands the Klein bottle in third person with the HUD
readout; `?world=torus&look=moonlit&cam=first` flips to a cool first-person torus —
every param takes. Build ✓ · **64/64 tests** ✓ · lint 0 errors (no new warnings).

> [!NOTE]
> **Reproducibility nuance (refines revision #3 again).** Two shots of the *same*
> deep link from *separate* Chromium processes differ by ~96 B / 336 KB — visually
> identical, a handful of sub-pixel SwiftShader differences (cross-process float
> nondeterminism), **not** an app pose difference. So a future visual-diff/smoke
> gate must compare with a **pixel tolerance** (coarse hash / per-pixel threshold),
> never `cmp`. Within a single page load the frame is byte-stable (the 14:40
> experiment).

### 🔵 finding · 14:40 — Pre-Phase-2 experiment: measured the two reasoned-from-code uncertainties
**Why:** the synthesis flagged determinism + `readPixels` as the highest-stakes unknowns; a single `shoot.mjs`-style run settles both before building on them.

Ran a headless probe at **390×844** over `#/solid-worlds`, `#/polygon-worlds`,
`#/complex-particles` (double-sampled each frame ~600 ms apart, via both a composited
`drawImage→getImageData` path and live `gl.readPixels`). Eyeballed the PNGs — all three
render genuine scenes (SolidWorlds 3-Torus with the avatar + FRONT sign + ChiralityHUD
"ORIGINAL"; ComplexParticles' vivid phase cloud). Results **revise three plan
assumptions**:

1. **Determinism gap did NOT manifest at idle.** All three routes — including
   ComplexParticles — produced **byte-identical** frames A vs B (0/128 grid cells
   changed; mean+variance identical to 2 dp). With no input the walkers' rAF is
   effectively static. → **Downgrade `freeze`/`t=` from a precondition to insurance**
   for *animated* states (continuous spin, n-body Trinary). The "same view twice"
   acceptance criterion already holds for static poses. (Still keep `frozenTime()` —
   cheap, and needed the moment a spin is on.)
2. **`gl.readPixels` is unreliable; the composited/screenshot path is not.** readPixels
   returned real data for the two walkers but **all-black** for ComplexParticles
   (preserveDrawingBuffer:false), while `drawImage→getImageData` (and the puppeteer
   screenshot) captured all three correctly. → **The smoke dead-frame detector must
   read the screenshot, not `gl.readPixels`.** (Confirms the consultant's suspicion
   concretely.)
3. **Variance, not brightness.** ComplexParticles is *dark but alive* — mean luma
   **23**, 83% black pixels, yet **variance 3086**. A brightness/black-fraction
   threshold would false-flag it dead; variance cleanly separates it from a blank
   frame. → **Dead-frame check = low variance, not low brightness.**

Plus a **new** finding the plan didn't anticipate:

4. **Every clean route logs baseline `console.error`s** (a 404 + an `ERR_CERT_AUTHORITY_INVALID`
   resource-load failure), but `pageerror` count was **0** and no `webglcontextlost`
   fired anywhere. → A naive "fail on any console.error" smoke gate would false-positive
   on **all** routes. **Key the detector on `pageerror` (JS exceptions) + `webglcontextlost`
   as load-bearing; treat `console.error` as advisory with a resource-load allowlist
   (`net::ERR_*`, HTTP 4xx).** Net baseline-green result: the walkers + particles throw
   no JS exceptions and lose no context at mobile viewport.

### 🟢 code · 13:42 — Phase 1 scaffolding landed (build + tests + lint green)
**Why:** Dan approved starting Phase 1 — the pure additive scaffolding, no app behavior change.

Added three app-agnostic modules + a unit test:
- **`src/lib/debugPose.ts`** — hash-query pose parser: `poseParams()`,
  `pNum/pBool/pStr`, `hudEnabled()`, and `frozenTime()` (the determinism param from
  synthesis revision #3, parseable from day one). Also exports the shared
  **`DebugState`** interface — including the independent **`jump`** witness field
  (revision #2), so engines can import the type without pulling React.
- **`src/lib/nearestMarker.ts`** — the one diagnostic not already computed; pure,
  dimension-agnostic (`distance`, `nearestMarker`, `nearestMarkerDistance`).
- **`src/lib/__tests__/nearestMarker.test.ts`** — 11 cases (2D/3D, empty, ties,
  Infinity) honoring L4 (test pure logic on write).
- **`src/components/DebugPoseHUD.tsx`** — shared opt-in HUD modeled on
  `ChiralityHUD`: a `pointer-events:none` corner overlay polling a `get()` →
  `DebugState` in a rAF loop, rendering whichever fields are present. Never mounts
  unless `?hud`/`?debug` — zero impact on the shipped UI.

Verified: `npm run build` ✓ (tsc + vite), `vitest` 11/11 ✓, `eslint` 0 errors on the
new files. No shared registry files touched (parallel-branch safe). Next:
Phase 2 — PolygonWorlds adoption (it already exposes `getPose()`), preceded by the
one `shoot.mjs` determinism/`readPixels` experiment the synthesis flagged.

### 🔵 finding · 12:50 — Reviewed all headless documentation; the task is L1's two named checks
**Why:** the focus said "review all the documentation on this problem in reports and todo" before planning.

The "headless mode" build-out is precisely the **L1 positive check** named in three
places that all agree:

- `RECURRING_LESSONS.md` L1 (~14 recurrences, 🟡 rule-only): *"Verified headless,
  never on a real device."* The rule + signals exist; the **check is missing** — the
  deep-link debug-pose harness + headless mobile smoke.
- `TODO.md` line 48 (`!high`, own branch): two deliverables —
  **(a)** a URL param that sets camera/world/pose so `shoot.mjs` can reproduce an
  *exact* frame, plus an opt-in **dev HUD** (player determinant, current tile,
  nearest-marker distance); **(b)** a `shoot.mjs` pass at **390×844** across all
  routes asserting **no console error / no NaN-in-shader**.
- Process-audit findings Tier-1 recs 2–3 (the originating spec).

What already exists (don't rebuild): `scripts/shoot.mjs` (route + out-path args;
`SEED_LS`, `SKIN`, `WAIT_MS`, `VIEWPORT` env knobs; prints the live WebGL renderer
string; waits for `<canvas>`), the cloud install hook, and `npm run shoot`.

Why it matters (the defects it would have caught, per the audit): the
**teleporting-world** and **spoofed-probe** cases (W1/W3 — a green invariant on a
visually-wrong render), and the **#216 Torus crash / #215 height** runtime defects
that escape the `tsc && vite build` gate.

### 🟡 milestone · 13:40 — Three-hats review complete; plan revised
**Why:** Dan asked me to run the multi-lens review; it surfaced concrete revisions worth folding into the plan before any implementation.

Ran `/three-hats` (maintainer · consultant · pedagogy + synthesis, all committed in
this folder). Unanimous: **direction + Deliverable A endorsed**; **Deliverable B
rescoped**. Key outcomes folded into the plan as §9:
- **`setPose` = position + heading only** — the maintainer's "under-costed" and the
  pedagogy's "det-validates-itself is circular" objections *cancel*: walk/place
  across a seam, let the engine derive the frame.
- **Determinism is the real blind spot** (consultant): walkers run wall-clock
  `getDelta()` rAF; a pose-only link isn't reproducible without a `freeze`/`t=`
  param. Promoted to a precondition for "same view twice."
- **HUD needs an *independent* continuity/jump witness** (engine already computes one,
  `coverEngine.ts:639`), not just the determinant the probe reads.
- **Smoke: narrow to boot/blank/context-loss** (SwiftShader tolerates the #216 NaN);
  console + `webglcontextlost` are load-bearing; CI goes in a **separate PR workflow,
  not deploy.yml**.
- One cheap `shoot.mjs` experiment (double-shoot + `readPixels` probe) settles the two
  reasoned-from-code uncertainties before implementation.

### 🔵 finding · 13:10 — Walker pose surface mapped; precedents already exist
**Why:** deliverable (a) needs the exact state, engine seams, and URL/HUD precedents to be a real plan.

- **URL parse precedent already in-repo:** `TrinaryLab.tsx` uses
  `new URLSearchParams(window.location.hash.split('?')[1] ?? '')`; the router
  (`index.tsx:65`) already splits `?query` off the path; PolygonWorlds already
  reads `location.search.includes('polydebug')` to expose `window.__poly`.
- **Diagnostics already computed:** SolidWorlds `getChirality()` (determinant ±1,
  rotation angle) + `getMapState()` (u,v,w, cell) in `coverEngine.ts:724-741`;
  PolygonWorlds `mapState.flipped` + u,v + `getPose()` exposed on the engine.
  **Nearest-marker distance is the one quantity not yet computed** (needs a
  landmark scan).
- **HUD templates exist:** `ChiralityHUD` (SolidWorlds) and `SquareMiniMap`
  (PolygonWorlds) are both rAF-loop overlays reading a getter — copy them for a
  shared `DebugPoseHUD`.
- **The seam to add:** PolygonWorlds engine exposes `getPose()` but **neither
  walker exposes a pose *setter***; SolidWorlds engine only has `recenter()`. So
  the harness must add a `setPose(...)` to each engine interface.
- **Why URL params (not just `SEED_LS`):** `worldId`/`thirdPerson`/`camDistance`
  are **session-only `useState`** (not persisted), so `SEED_LS` can't reach them —
  a deep-link param is the only way to pin world + camera for a shot.

### 🔵 finding · 13:05 — Smoke-pass surface mapped (routes + how the crash class shows up)
**Why:** the plan's deliverable (b) needs the exact route enumeration and a real detection mechanism, not a hand-wave.

Exploration of `src/index.tsx` + `src/apps.ts`: **19 resolvable hash routes**
(13 public catalog + 4 legacy/merged: `#/fractals-cpu`, `#/mobius`, `#/wrap-world`,
`#/trinary-lab` + 2 embeds). **10 are WebGL** (Three.js/Canvas3D), **9 DOM/CSS**
(Argand, AgenticSorting, StableMatching, Fractals2D-CPU=Canvas2D, Gallery).

Key technical finding for NaN detection: **Three.js swallows shader-compile errors**
— they never reach `console`. The #216 Torus crash surfaced as **WebGL context
loss / black canvas** (a NaN written to a varying via `normalize(cross(du,dv))` with
a ~0 cross product; SwiftShader tolerates it, real mobile GPUs hard-crash). So the
smoke pass needs **three detectors**, not just console scraping:
1. `page.on('console', type==='error')` + `page.on('pageerror')` → exit non-zero
   (already half-wired in `shoot.mjs:52-54`).
2. A `webglcontextlost` listener (animath has **none** today) — register one before
   boot and fail if it fires.
3. A `gl.readPixels` framebuffer scan for NaN/all-black after settle.

Conventions to match: `verify-*.ts` scripts exit 0/1; `shoot.mjs` is `.mjs`/ESM,
waits for `<canvas>` (8 s) then `WAIT_MS` (2500, bump to ~3500 for HDR on
ComplexParticles). All apps are `React.lazy` (Suspense `LoadingScreen`).

### 🟣 decision · 12:55 — Scope pinned with Dan (3 answers)
**Why:** L2 ("build the full thing before asking") is itself the audit's top lesson; pin scope before drafting.

1. **Harness reach:** *Topology walkers first* — build the URL-pose param + dev HUD
   for **SolidWorlds & PolygonWorlds** (where teleporting-world / spoofed-probe bugs
   lived), with a **generic convention** others can adopt later. Not all WebGL apps.
2. **Mobile smoke CI:** *Advisory now, gate later* — ship `npm run smoke` + doc,
   wire into `deploy.yml` as a **non-blocking** step (`continue-on-error`) like
   `sessions:lint`, promote to a hard gate once proven quiet.
3. **Deliverable:** *Plan only this session* — write the complete `kind: plan`
   report (`status: proposed`); implementation is a later branch. Optional
   `/three-hats` review of the plan.

### 🟡 milestone · 12:50 — Session oriented; drafting the plan next
**Why:** progress report is the session's memory; record the orientation before planning.

Branch `claude/headless-mode-plan-bbk74b` (first session). The deliverable is a
plan, not yet code — a `kind: plan` report in this branch's `progress/` folder.
</content>
</invoke>
