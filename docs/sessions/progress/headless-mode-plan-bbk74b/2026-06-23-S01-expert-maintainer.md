---
kind: three-hats
session: 2026-06-23-S01
date: 2026-06-23
title: Framework-maintainer review — headless debug-pose harness + mobile smoke
branch: claude/headless-mode-plan-bbk74b
slug: headless-mode-plan-bbk74b
status: proposed
build: n/a
followup: null
pr: null
app: docs, engine
signals: needs-dan
next: Confirm the setPose-per-cover cost estimate with Dan before Phase 2/3 sizing
---

# Framework-maintainer review — headless debug-pose harness + mobile smoke

## Plan under review

<details><summary>Original request</summary>

Review the headless-mode build-out plan at docs/sessions/progress/headless-mode-plan-bbk74b/2026-06-23-S01-plan-headless-mode.md — the deep-link debug-pose harness + dev HUD for the topology walkers, and the 390x844 headless mobile smoke pass.

</details>

The plan is `docs/sessions/progress/headless-mode-plan-bbk74b/2026-06-23-S01-plan-headless-mode.md`:
a plan-only session that specs (A) a shared deep-link debug-pose harness
(`src/lib/debugPose.ts`) + opt-in dev HUD (`src/components/DebugPoseHUD.tsx`) +
a `setPose` setter on both walker engine interfaces, and (B) a headless
390×844 mobile smoke sweep (`scripts/smoke.mjs`) wired as a non-blocking
`deploy.yml` step. It is the L1 "positive check" from `RECURRING_LESSONS.md`.

## Executive summary

This is a **good plan with one materially under-costed seam**. The motivation is
exactly right — L1 ("verified headless, never on a real device") is the
single most-recurring lesson in the corpus, and the two deliverables map cleanly
onto the two defect classes that escape `tsc && vite build` (correctness on a
visually-wrong render; runtime crash at a real viewport). The plan correctly
reads the codebase: it knows the router splits `?query`, that PolygonWorlds
already has a `?polydebug` bridge, that the HUD overlays exist to copy, and that
`shoot.mjs` preserves the query in its route arg. The phasing is sane and
parallel-branch-aware, and it explicitly defers the SwiftShader-fidelity limit
to honest framing rather than over-claiming.

My one substantive pushback is on **A1 (`setPose`)**: the plan calls it a
"symmetric setter" and "the missing direction," which undersells it. For
PolygonWorlds the pose lives **three layers down** in three separate
`CoverModel` implementations (euclidean / spherical / hyperbolic), none of
which exposes a `setChart`/`setPose`; for SolidWorlds it means generalizing
`recenter()` while writing into `bodyLinear`/`cell` consistently on flip/screw
worlds — itself the L7 orientation-hardness class the harness is meant to
expose. That is real work, not a getter's mirror image. Everything else I would
ship close to as written, with small adjustments to the CI wiring and the
"URL wins" rule.

| Deliverable | Verdict | Risk |
|---|---|---|
| A0 — shared `debugPose.ts` URL parser | ✅ endorse | low — correctly minimal |
| A1 — `setPose` on both engines | 🟡 endorse with re-sizing | **med-high** — 3-cover plumbing in PolygonWorlds; orientation-correct write in SolidWorlds |
| A2 — apply params on boot | ✅ endorse | low-med — lazy-init ordering needs care |
| A3 — shared `DebugPoseHUD.tsx` | ✅ endorse | low |
| A4 — nearest-marker pure helper + test | ✅ endorse | low — exactly the L4 class |
| B — `smoke.mjs` + detectors | ✅ endorse | med — false-positive tuning |
| B4 — non-blocking `deploy.yml` step | 🟡 endorse with reservation | med — preview-in-Pages-CI is heavier than the lint precedent |

## 1. History & context: does it repeat an abandoned approach?

No — and notably, it is **enacting a ledger item rather than re-discovering a
lesson**, which is precisely the loop `RECURRING_LESSONS.md` exists to drive
(WRITE → READ → ENACT → RETIRE). L1 is at 🟡 *Promoted (rule)*; the "Missing the
positive check" note in its row literally names this harness. Building it flips
L1 toward 🟢 and is the highest-tool-ROI backlog item (`TODO.md`, requested
independently three times). That is the system working as designed.

The plan also respects history in the small:

- It reuses the **`?polydebug` precedent** (`PolygonWorlds.tsx:105`) instead of
  inventing a parallel debug channel. That existing bridge already does
  `setYaw`, `clearTrail`, `plantSign`, `auditDecor`, `auditInk` off
  `window.__poly` — so the "engine has a getter but the component pokes refs
  directly for debugging" pattern is established. The new `setPose` is a
  cleaner, typed version of `setYaw`.
- It copies the **opt-in HUD overlay** convention (`ChiralityHUD`,
  `SquareMiniMap`) — both rAF loops reading a getter — rather than introducing
  React-state-driven overlays that would re-render per frame.
- It honors the **"don't persist camera/transient view"** convention by routing
  world/cam/look through `useState`/`usePersistentState` and only the *pose*
  through the engine.

> [!NOTE]
> The one piece of history the plan glosses: PolygonWorlds and SolidWorlds are
> **deliberately not factored into a shared walker engine** (L5 in the ledger
> flags "near-parallel copy instead of factoring" as Open, and a soft
> dedup-lint was *deliberately not added* to avoid fighting in-flight branches).
> The plan's instinct to share `debugPose.ts` + `DebugPoseHUD.tsx` across them is
> the *right* place to share (app-agnostic glue), precisely because the engines
> themselves stay separate. It is not re-litigating the no-shared-engine
> decision. Good.

## 2. Scrutiny (a): is `setPose` on the engine interfaces really clean?

**This is the plan's weakest claim and the place I'd push hardest.** The plan
says (A1): "Both walkers compute pose inside an engine closure; only
PolygonWorlds exposes a *getter*. Add a symmetric *setter*… PolygonWorlds
already exposes `getPose()`/`getMapState()` — this is the missing direction."

The reality from reading the code:

### PolygonWorlds — pose is three layers deep

`fundamentalSquareEngine.ts` does **not** own the pose. It delegates:

```ts
// fundamentalSquareEngine.ts:152,162
const p = cover.pose();              // PlayerPose, read-only
Object.assign(mapState, cover.chart());   // SquareMapState, read-only
```

`cover` is a `CoverModel` (`coverModel.ts:52`) with **three implementations**
(`kind: 'euclidean' | 'spherical' | 'hyperbolic'`). Its interface exposes
`update()`, `pose()`, `chart()` — all read-only — and *no* `setChart`/`setPose`.
So "the inverse of the existing `cover.chart()`/`cover.pose()` read" is not a
one-line setter on the engine: it requires

1. a **new method on the `CoverModel` interface** (`setPose`/`setChart`), and
2. **three implementations** — and the spherical and hyperbolic covers
   parametrize position differently from the euclidean (a planet vs a tiled
   plane), so "write u,v + heading" means three different internal writes, each
   of which must also re-place the camera so the very next `update()` doesn't
   snap back.

The plan's effort estimate ("Phase 2 is the cheaper first integration… it
already has `getPose()`") is backwards on this axis: PolygonWorlds is *cheaper
to wire the boot params and HUD*, but *more expensive to implement `setPose`
correctly* because of the cover indirection. SolidWorlds owns its pose directly
in the engine closure (`pos`, `bodyLinear`, `cell` at `coverEngine.ts:65-68`),
so its `setPose` is a more local edit.

### SolidWorlds — generalizing `recenter()` is an orientation problem

`recenter()` (`coverEngine.ts:720`) is trivial because it writes the **identity
frame**:

```ts
recenter() {
  pos.set(0, 0, 0); bodyLinear.identity();
  cell.x = 0; cell.y = 0; cell.z = 0; hasStamp = false;
  ...
}
```

`setPose({x,y,z,yaw,pitch})` is not that. Setting an arbitrary in-cube position
is fine, but the plan itself flags (Risk §6) that **`setPose` correctness on
flip/screw worlds is itself an orientation problem (L7)**. If the deep link is
meant to "put me at the seam facing the arch on the mirrored sheet," then
`setPose` must be able to seed a **non-identity `bodyLinear`** (a flipped/rotated
carried frame) — otherwise it can only ever place you on the home sheet, and the
most valuable debug poses (the chirality cases the harness exists to reproduce)
are exactly the ones it can't express. The plan's param table only carries
`x,y,z,yaw,pitch` — no sheet/cell/determinant selector — so as specced,
**`setPose` reproduces position+heading but not the developing-frame state**,
which is the thing W1/W3 (teleporting-world, spoofed chirality) were about.

> [!WARNING]
> **Re-size A1 before committing to the phasing.** As written the plan implies
> `setPose` is a getter's mirror. It is: (1) a new `CoverModel` interface method
> + 3 implementations in PolygonWorlds; (2) a frame-seeding generalization of
> `recenter()` in SolidWorlds that, to be useful for the chirality cases, needs
> a way to express the non-identity sheet. Recommend the plan either (a) scope
> `setPose` to position+heading only and state plainly that *sheet/holonomy is
> reached by walking there in the deep link* (you can still author a URL that
> teleports near a seam and take one step), or (b) add a `cell=`/`sheet=` param
> and own the frame-seeding cost explicitly. Option (a) is the honest minimal
> cut for this branch; (b) is the complete version. Don't let the plan ship the
> middle, where `setPose` exists but silently can't reach the interesting poses.
</br>

A pragmatic middle the plan doesn't consider: for the chirality reproductions,
you may not need `setPose` to *write* the frame at all — you can deep-link
position+heading and let an extra param (`steps=`, or a target cell the walker
auto-walks toward) drive the developing map honestly through the real gluing.
That keeps the engine seam tiny and means the HUD's determinant readout is
testing a genuinely-developed frame, not one you hand-set (which would be its
own L3 "green check that wasn't a real check" risk — a hand-set determinant
proves nothing).

## 3. Scrutiny (b): the non-blocking `deploy.yml` smoke step

The plan models B4 on the existing `sessions:lint -- --strict` precedent. Two
things to separate:

**The `continue-on-error` pattern itself — fine and well-precedented.** The
deploy already runs `sessions:lint -- --strict` (deploy.yml:38). The
RECURRING_LESSONS "meta-lesson" section explicitly documents the graduation
path: land a check as non-blocking, prove it quiet, promote to a hard gate. A
non-blocking smoke step fits that template exactly. Endorse the *shape*.

**The *cost* of what runs inside it — heavier than the lint precedent, and in
the wrong job.** `sessions:lint` is a fast pure-Node parse. The proposed step is
`npm run build && (npm run preview &) && sleep 5 && npm run smoke`, which:

- boots a **headless Chromium with SwiftShader** and iterates **~18 routes** at
  a real viewport with multi-second settles each (the plan itself sets
  `WAIT_MS ~3500` for ComplexParticles and an 8s canvas wait). That is plausibly
  **2–5 minutes of CPU-bound software rasterization** added to the *Pages deploy
  job* on every push to `main`.
- requires the **puppeteer Chrome download that the deploy job currently
  skips on purpose** — `deploy.yml:34-35` sets `PUPPETEER_SKIP_DOWNLOAD: 'true'`
  with the comment "The Pages build doesn't screenshot anything." Adding smoke
  to this job **reverses that deliberate optimization** and re-adds the ~150MB
  download + the `install_headless_webgl.sh` system-lib provisioning, which today
  only runs in the cloud `SessionStart` hook, not in GitHub Actions at all. The
  plan does **not** account for getting SwiftShader's apt dependencies installed
  in the CI runner.

> [!IMPORTANT]
> **Don't bolt smoke onto the Pages-deploy job.** Two cleaner options, in order
> of preference:
> 1. A **separate `smoke` workflow** triggered on PR / push (not gated to
>    deploy), so a slow software-WebGL sweep never sits on the critical path to
>    publishing the site, and so the deploy job keeps `PUPPETEER_SKIP_DOWNLOAD`.
>    This is also more useful — you want smoke on PRs *before* merge, not at
>    deploy time after merge.
> 2. If it must live in `deploy.yml`, give it its **own job** that needs nothing
>    and blocks nothing (parallel to `build`), with its own Chrome install step,
>    so the deploy artifact upload isn't waiting on a 3-minute SwiftShader sweep.
>
> The plan's "mirror the `sessions:lint` step" instinct is right about
> *blocking semantics* but wrong about *placement*: lint is cheap and shares the
> build job's setup; smoke is expensive and needs setup that job deliberately
> avoids.
</br>

Also verify before wiring: `npm run preview` serves at `:4173` and the plan's
`sleep 5` may be too short for the first cold `vite preview` on a CI runner; the
existing docs use `sleep 3` for a *local* preview but CI is colder. Prefer a
wait-on-port loop over a fixed sleep (flaky-sleep is its own recurring CI sin).

## 4. Scrutiny (c): is `debugPose.ts` over-abstraction for two adopters?

**No — it's correctly minimal, and arguably it's barely an abstraction at all.**
The proposed module is four tiny functions: `poseParams()` (the exact
`hash.split('?')[1]` idiom already used in `TrinaryLab.tsx` and the router),
plus `pNum`/`pBool`/`pStr`/`hudEnabled` typed accessors. This is the kind of
6-line helper that earns its place the moment a *second* caller would otherwise
copy-paste the `URLSearchParams` + `Number()` + `NaN`-guard dance. Two adopters
named, a third implied (any future walker / `BUILDING_AN_APP.md` mention), and
the parsing is genuinely identical across them.

The line the plan draws is the right one: **the helper is generic (parse), the
mapping is per-app (what `u,v` vs `x,y,z` mean)**. That keeps app-specific pose
semantics out of the shared module, so it never grows a `switch (app)`. This is
the opposite of premature abstraction — it's the small-shared-glue layer that
L5's "near-parallel copy" lesson actually *wants* (share the glue, not the
engine).

One nit: `debugPose.ts` and the `?polydebug` `window.__poly` bridge will now
coexist in PolygonWorlds. They serve different needs (test-harness poking vs
boot-time deep-link), but the plan should say a sentence about whether
`?polydebug` stays, gets folded into the new `hud`/`debug=1` vocabulary, or is
left alone. Leaving it alone is fine — but name it, so the next reader doesn't
think one supersedes the other.

`DebugPoseHUD.tsx` as a shared component is a slightly bigger bet than the
parser, since SolidWorlds wants `cell` and PolygonWorlds wants `flipped`. The
plan's `DebugState` interface handles that with an optional `cell?` field, which
is fine for two apps. If a third app needs a differently-shaped readout, the
honest move is to let it pass its own rows rather than growing `DebugState` into
a union — but that's a future concern, not a now one. Endorse as specced.

## 5. Scrutiny (d): "URL param wins over persisted state"

The plan proposes (Risk §6): **URL param wins over persisted/default when
present** ("it's an explicit request"), flagged `needs-dan`.

I endorse this as the default, with the framework-correctness caveat that it's
**slightly subtle to implement given `usePersistentState`'s lazy initializer**.
Today `usePersistentState(key, initial)` seeds from `load(key, initial)` in a
`useState(() => …)` (usePersistentState.ts:35). To make the URL win, you
**cannot** just set state in an effect after mount — the engine is built in
`onMount` from refs seeded at first render (e.g. `worldRef.current = spec` where
`spec = worldById(worldId)`), so a post-mount `setWorldId` would rebuild the
engine (the `useEffect([spec])` rebuild path) — a visible flash and a wasted
build. The plan's A2 already half-sees this ("set `worldId` *before* engine
build… lazy initializer reading the param").

The clean implementation is a **param-aware initial value at the
`useState`/`usePersistentState` call site**, e.g.

```ts
const p = poseParams();            // once, module-top of the component
const [worldId, setWorldId] = useState(() => {
  const w = p.get('world');
  return w && worldById(w) ? w : DEFAULT_WORLD_ID;
});
```

For `usePersistentState`-backed values, "URL wins over persisted" means the URL
param must be checked **before** the persisted load, i.e. the call becomes
`usePersistentState(pk('look'), p.get('look') ?? defaultLook)` — but note that
makes the URL value the *fallback*, and the **persisted value still wins** if one
exists, because `load()` returns the stored value over the initial. So to truly
make URL win you must **bypass persistence when the param is present** (pass
`key = null` for that field when the URL sets it, or write the URL value into the
store first). The plan should call this out concretely; "URL wins" is a one-liner
to state and a genuine gotcha to implement, and getting it half-right yields the
confusing "my deep link is ignored because I once changed that setting" bug.

> [!IMPORTANT]
> **Decision to confirm with Dan, and refine:** URL-wins is the right default,
> *but only the params explicitly present in the URL should override*; absent
> params must fall through to persisted-then-default unchanged (the plan's
> "params absent → behave exactly as today" zero-regression promise). The
> implementation detail above (URL param must short-circuit `usePersistentState`'s
> load, not merely supply its `initial`) is the part most likely to be
> mis-built; spell it out in Phase 1.
</br>

## 6. Parallel-branch safety & shared-file churn

This is where I'd normally worry most, and the plan is **mostly disciplined**:

| File touched | Append-only? | Plan's handling | Assessment |
|---|---|---|---|
| `package.json` | per open TODO, should be | adds `"smoke"` script; plan *also adds package.json to the protected list* | ✅ good — closes the TODO in-flight |
| `deploy.yml` | not on protected list | one new step/job | ⚠️ shared infra; low conflict odds but see §3 placement |
| `src/lib/debugPose.ts` | **new file** | additive | ✅ zero conflict |
| `src/components/DebugPoseHUD.tsx` | **new file** | additive | ✅ zero conflict |
| `src/animations/PolygonWorlds/*` | self-contained folder | engine + onMount edits | ✅ isolated to its app |
| `src/animations/SolidWorlds/*` | self-contained folder | engine + onMount edits | ✅ isolated to its app |
| `coverModel.ts` interface (PolygonWorlds) | within the app | new method + 3 impls | ✅ in-app, but see §2 cost |
| `HEADLESS_WEBGL.md`, `BUILDING_AN_APP.md`, `RECIPES.md`, `RECURRING_LESSONS.md`, `TODO.md` | docs | additive / ledger advance | ✅ correct (ledger is a living advance, not append) |

The two genuinely-shared files are **`package.json`** and **`deploy.yml`**. The
plan handles package.json model-citizen-ly (appends the script *and* adds the
file to the protected list, enacting the other open TODO). `deploy.yml` is the
one to watch — but it's rarely touched by app branches, so the conflict risk is
low; the substantive concern there is §3 (placement), not churn.

> [!NOTE]
> The plan creates **two new top-level shared modules** (`lib/debugPose.ts`,
> `components/DebugPoseHUD.tsx`). These are new files (no conflict), but they do
> add to the surface a new app must know about. The plan already commits to
> documenting the convention in `BUILDING_AN_APP.md` + a `RECIPES.md` R-entry,
> which is the right way to keep new shared surface discoverable rather than
> orphaned. Make sure the RECIPES entry is concrete ("to verify a walker change,
> shoot the exact pose") — that's the line that actually changes behavior.
</br>

## 7. Tech-debt ledger: does it add or reduce debt?

**Net debt-reducer**, on balance:

- **Reduces** the L1/L3 gap from rule-only to rule+check (the headline win).
- **Honors L4** by committing a vitest file for `nearestMarker` — exactly the
  "testable pure logic gets a committed test" class the ledger keeps flagging.
  Note: `npm test` is **not a CI gate** (only `npm run build` is), so the new
  test green-ness rides on convention — fine, but the plan shouldn't imply the
  test *gates* anything.
- **Closes** the package.json protected-list TODO as a side effect.
- **Adds** a small amount of surface (two shared modules, two new engine
  methods, one new `CoverModel` method + 3 impls). The `setPose`-per-cover work
  (§2) is the only place it risks *adding* debt — if `setPose` is bolted onto
  three covers hastily to hit the phase deadline, that's new branchy code in the
  exact engines L5 already flags as long. Do it deliberately or scope it down.

One consistency check the plan gets right: it keeps the HUD **`pointer-events:
none`, text-only, never-mounted-without-the-param**, so the shipped UI is
byte-identical without `?hud`. That's the correct "debug instrument, not a
feature" posture and matches the existing `?polydebug` discipline.

## 8. Scope: too much, too little, boundary clear?

Scope was pinned (walkers first; advisory-now/gate-later smoke; plan-only this
session) and the plan **stays inside it**. The phasing is genuinely
independently-shippable (Phase 1 is pure additive scaffolding + a unit test; 2/3
parallelize; 4 depends on nothing in 1–3). I'd make two scope adjustments:

1. **Split Phase 1's HUD from its parser.** `debugPose.ts` + the `nearestMarker`
   helper + its test are *truly* zero-risk and could land first/alone.
   `DebugPoseHUD.tsx` is slightly more (it bakes the `DebugState` shape both apps
   must satisfy) — fine to keep in Phase 1, but if `DebugState` proves contentious
   it shouldn't block the parser landing.
2. **Move `setPose` decision (§2) to the front.** Whether `setPose` writes the
   developing frame or just position+heading changes the param vocabulary
   (`cell=`/`sheet=`?) and the Phase 2/3 cost. That's a "decide before building,"
   not a "discover while building" question (L2/L6) — answer it in the plan,
   don't let Phase 2 discover it.

The smoke detector tuning (B2.3 readPixels on dark looks) is correctly called out
as a risk and correctly mitigated (keep console + context-loss always-on; make
the dead-frame scan skippable per known-dark look). Good — that's the detector
most likely to cry wolf and the plan already knows it.

## Verdict

**Endorse, with one re-sizing and one CI-placement change before implementation
starts.**

What I endorse as written:

- The whole **motivation and framing** — this is the ledger's enact-loop working,
  the highest-ROI backlog item, and the honest "closes the no-cost tier,
  `phone-needed` stays" framing is exactly right.
- **A0 `debugPose.ts`** — correctly minimal, not over-abstraction; the
  generic-parser / per-app-mapping split is the right seam.
- **A3/A4** — the shared HUD and the unit-tested `nearestMarker` helper (honors
  L4); HUD discipline (opt-in, pointer-events:none, never-mounts) is correct.
- **B detectors** — three-detector design (console + context-loss + dead-frame)
  is sound; the context-loss listener via `evaluateOnNewDocument` before boot is
  the right way to catch the #216-class silent failure.
- **Parallel-branch hygiene** — new files + self-contained folders + closing the
  package.json TODO in-flight.

What concerns me / what I'd change:

1. **Re-cost A1 `setPose`.** It is *not* a getter's mirror. PolygonWorlds needs a
   new `CoverModel.setPose` + **three cover implementations**; SolidWorlds needs
   a frame-seeding generalization of `recenter()` that, to reach the chirality
   cases the harness exists for, must express a **non-identity developing
   frame** — itself the L7 orientation problem. **Decide in the plan:** scope
   `setPose` to position+heading and reach interesting sheets by *walking* in the
   deep link (tiny seam, and the HUD's determinant then tests a genuinely
   developed frame, avoiding a hand-set-determinant L3 trap), **or** add a
   `cell=`/`sheet=` param and own the frame-seeding cost. Don't ship the middle.
2. **Don't put smoke in the Pages-deploy job.** It reverses the deliberate
   `PUPPETEER_SKIP_DOWNLOAD` optimization, needs SwiftShader apt-deps the CI
   runner doesn't have today, and adds minutes of software-WebGL to the publish
   critical path. Run it as a **separate PR/push workflow** (more useful — catches
   regressions before merge) or at least its **own non-blocking job**. Replace
   the fixed `sleep 5` with a wait-on-port loop.
3. **Spell out "URL wins" concretely.** It must **short-circuit
   `usePersistentState`'s load**, not merely supply its `initial` — otherwise a
   previously-persisted value silently beats the deep link. Confirm the default
   with Dan; only present params override, absent ones fall through unchanged.

None of these block Phase 1 (pure scaffolding + test), which can start
immediately. They block the *sizing* of Phases 2–4, which is exactly what a
plan review is for.

## Self-reflection

1. **What would you do with another session?** Read the three `CoverModel`
   implementations end-to-end (euclidean/spherical/hyperbolic) to give a concrete
   line-count estimate for `setPose` per cover, and read the SolidWorlds
   `develop`/`frame` path to confirm whether a non-identity `bodyLinear` can be
   safely seeded mid-stream or only at a cell boundary. That would turn my §2
   "re-size it" into an actual number.
2. **What would you change about what you produced?** I leaned on the plan's own
   risk section for the L7/flip-world point rather than independently proving
   that `setPose` can't reach the mirrored sheet — I inferred it from the param
   table lacking a sheet selector plus `recenter()` writing identity, which is
   strong but not a code-traced proof.
3. **What were you not asked that you think is important?** Whether the smoke
   sweep should run in the *cloud agent session* (where SwiftShader is already
   provisioned by the SessionStart hook) as the primary venue, with CI as
   secondary — that may be the more natural home than GitHub Actions, and the
   plan treats CI as the default without weighing it.
4. **What did we both overlook?** The interaction between the new `?hud`/`debug=1`
   vocabulary and the existing `?polydebug` `window.__poly` bridge — the plan
   doesn't say whether they merge, coexist, or one retires. Minor, but a future
   reader will wonder.
5. **What did you find difficult?** Confirming the true cost of `setPose` without
   reading all three cover implementations — I established the *shape* of the cost
   (interface + 3 impls + camera re-place) from the `CoverModel` interface and the
   engine delegation, but not the magnitude.
6. **What would have made this task easier?** A one-line note in the plan stating
   whether `setPose` is meant to reproduce only position+heading or the full
   developing frame — that single ambiguity drove most of my §2.
7. **How did you verify this, and does each passing check test the user-visible
   claim?** Reasoning only, over the actual source: I read both engine interfaces,
   both `onMount` paths, `coverModel.ts`, the `recenter()` impl, `deploy.yml`,
   `package.json`, `usePersistentState.ts`, the router, and the ledger/TODO. I ran
   no build or test (this is a plan review; build: n/a). My structural claims
   (cover indirection, `recenter()` writes identity, the `PUPPETEER_SKIP_DOWNLOAD`
   optimization, router preserves `?query`) are grep/read-verified; my cost
   *magnitude* claim for `setPose` is inferred, not measured. `signals: needs-dan`
   set (the URL-wins rule and the `setPose` scope are Dan-facing decisions).
8. **Follow-up value:** MEDIUM — the review is sound and actionable, but the
   `setPose`-per-cover cost should be pinned with a real read of the three cover
   implementations before Phases 2/3 are scheduled.
</content>
</invoke>
