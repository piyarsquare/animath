---
kind: three-hats
session: 2026-06-23-S01
date: 2026-06-23
title: Expert consultant review — headless debug-pose harness + mobile smoke
branch: claude/headless-mode-plan-bbk74b
slug: headless-mode-plan-bbk74b
status: proposed
build: n/a
followup: high
pr: null
app: docs, engine
signals: needs-dan
next: Resolve the determinism gap (freeze time / settle-on-idle) before Phase 4 is treated as a real gate
---

# Expert consultant review — headless debug-pose harness + mobile smoke

## Plan under review

<details><summary>Original request</summary>

Review the headless-mode build-out plan at docs/sessions/progress/headless-mode-plan-bbk74b/2026-06-23-S01-plan-headless-mode.md — the deep-link debug-pose harness + dev HUD for the topology walkers, and the 390x844 headless mobile smoke pass.

</details>

I am wearing the **Architecture & Quality / front-end systems** hat: no attachment
to the existing code, judging the plan on its structural merits, its
maintainability, and — because this is fundamentally a *verification* proposal —
on whether the proposed checks actually catch the defects they claim to catch.

## Executive summary

This is a well-scoped, well-phased plan whose **two halves are not equally
sound**. Deliverable A (deep-link debug-pose + HUD) is structurally excellent:
it reuses an established URL-as-state pattern, draws the right boundary between a
generic parser and per-app mapping, and adds exactly one new computation. I would
ship it close to as-written.

Deliverable B (mobile smoke) is **directionally right but under-specified on the
one axis that matters most for a screenshot harness: determinism**. The plan
selects three good detectors but never addresses how it gets a *reproducible
frame* out of a continuous-rAF, `getDelta()`-timed walker. A `WAIT_MS` settle is
not a frame-pinning strategy; it is a race. The `readPixels` "dead-frame"
detector is the weakest of the three and, as specified, will be the flakiest
thing in CI. And the plan's stated honest caveat — SwiftShader tolerates the exact
NaN that #216 exploited — quietly undercuts B's headline justification more than
the plan admits.

My verdict: **approve A; approve B's *console + context-loss* detectors;
send the determinism strategy and the dead-frame detector back for a design
pass before B is wired anywhere near a gate.** Details below.

| Area | Assessment |
|---|---|
| A0 generic helper vs per-app mapping boundary | ✅ correct, composes beyond two walkers |
| A1 `setPose` engine seam | ✅ right seam; SolidWorlds needs care (below) |
| A2 URL-wins-over-persisted rule | 🟡 right default, but a real precedence trap |
| A3 HUD overlay (render-prop / rAF polling) | ✅ sound; tree-shaking claim needs a check |
| A4 nearest-marker pure helper | ✅ exemplary — the one new bit, unit-tested |
| B determinism / frame-pinning | ❌ **the blind spot** — unaddressed |
| B1/B2 console + context-loss detectors | ✅ the real value; catch the #216 class |
| B2 readPixels dead-frame detector | 🟡 weak proxy, flaky as specified |
| B "catches #216 on SwiftShader" | ⚠️ overclaimed — see §6 |
| Query location (`hash` vs `search`) | 🟠 latent inconsistency with `polydebug` |

---

## 1 · Pattern recognition — what this resembles, and what to borrow

The plan is, at heart, two well-known patterns. Naming them sharpens what "good"
looks like and exposes the corners the plan skips.

**Deliverable A is URL-as-state / deep-linkable state** — the same pattern as a
router query, Redux-state-in-URL, or a Grafana/Observable "permalink to this
view." The canonical concerns of that pattern are: (a) a single parse seam,
(b) precedence vs other state sources, (c) round-tripping (can the app *emit* the
URL it can *consume*?), and (d) graceful degradation on unknown/garbage params.
The plan nails (a) and (d) explicitly, addresses (b) (the "URL wins" rule), and —
notably — **skips (c)**. See §4.

**Deliverable B is a headless smoke / golden-frame harness** — the Puppeteer/
Playwright smoke pattern. Prior art here is mature and the plan should lean on its
lessons harder than it does:

- **Settle-on-idle, not fixed sleep.** Every robust visual-regression tool
  (Playwright's `toHaveScreenshot`, Percy, Loki, Storybook test-runner) learned
  the same lesson: a fixed `WAIT_MS` is a flake generator. They settle on a
  *signal* — network idle, fonts loaded, an explicit `window.__ready` flag, or
  animation disabled. The plan keeps `WAIT_MS ~3500` from `shoot.mjs`. For a
  *screenshot you eyeball once* that's fine; for a *CI gate run 19×* it is the
  wrong primitive (§5).
- **Determinism is the precondition, not a nice-to-have.** Golden-frame tools
  freeze the clock (`page.evaluate` to stub `Date.now`/`performance.now`, or
  `clock.install()` in Playwright) and disable CSS/JS animation. The walkers run a
  continuous rAF driven by `THREE.Clock.getDelta()` (`PolygonWorlds.tsx:145`,
  `clockRef.current.start()` at `:141`). Two runs will *not* render the same frame
  unless time is pinned. The plan's acceptance criterion "*lands the same view
  twice*" (§7) is **not achievable** under the current design without a
  frame-pinning mechanism the plan does not specify. This is the headline gap.

> [!CAUTION]
> **Gotcha — the plan asserts a property it has no mechanism to deliver.**
> Acceptance criterion 1 ("the same view twice") requires a deterministic frame.
> The walkers' pose is mostly input-driven (good — no input means no movement), so
> a *static* pose may in practice be stable. But the *lighting, fog, and any
> idle animation* still ride a wall-clock-timed loop, and `getDelta()` returns a
> nonzero first delta whose size depends on load latency. The plan must either (a)
> prove the walker frame is time-invariant when idle, or (b) add a freeze hook.
> Right now it does neither.

---

## 2 · Structural soundness — are the boundaries right?

This is the plan's strongest dimension, and I want to be specific about *why* the
A-side boundaries are good, because they are the part most likely to be eroded
during implementation.

### 2.1 The three-layer split is correct

```
lib/debugPose.ts        — generic: parse the query, typed accessors, hudEnabled()
  (per app) boot mapping — semantic: which param drives which piece of state
  engine.setPose(...)    — mechanical: write pose into the developing-map closure
```

This is the right factoring. The helper knows *nothing* app-specific (it parses
`URLSearchParams` and coerces), the **mapping** (does `z` mean cube-z or
chart-w?) lives in the app where the semantics live, and the **mechanism**
(`setPose`) lives in the engine that owns the closure state. Each layer can change
without touching the others. This composes past the two walkers: any future app
opts in by importing `debugPose` and writing its own ~6-line mapping. The plan is
right to resist a single opaque `pose=` blob — named scalars are the correct
choice for *hand-authored* debug URLs, and it justifies that explicitly.

### 2.2 `setPose` is the right seam — but it is not symmetric work across the two engines

The plan frames `setPose` as "the missing inverse of the existing getter,"
symmetric across both walkers. It is **not** symmetric, and the plan slightly
undersells SolidWorlds' difficulty:

| | PolygonWorlds | SolidWorlds |
|---|---|---|
| Existing read | `getPose()` + `getMapState()` (`engineTypes.ts:51-54`) | `getMapState()` + `getChirality()` |
| Existing reset | (none explicit) | `recenter()` (`coverEngine.ts:720-723`) |
| Pose state to set | chart `u,v` + heading (presenter-internal) | `pos`, `bodyLinear`, `cell`, `yaw/pitch` |
| Difficulty | writes go *through the CoverModel presenter* | writes the developing-map frame directly |

For SolidWorlds, `setPose` must seed `pos`, **reset `bodyLinear` to identity and
`cell` to `{0,0,0}`**, then place position — i.e. it is `recenter()` plus a
position/heading write, which the plan correctly identifies ("generalize
`recenter`"). Good. The subtle part the plan flags but should *emphasize*: setting
a position is one thing; setting it **on the correct orientation sheet** is the
L7 orientation problem all over again. If you teleport into a flipped cell you
must decide whether `bodyLinear` carries the flip. The plan's answer — "the HUD's
determinant readout is the check" — is clever (the harness validates itself) but
means **`setPose` for SolidWorlds is only meaningful for poses within the home
fundamental cube** (det = +1, cell = origin). That is a real semantic limitation
and should be stated as such: *the deep link reproduces a pose in the
fundamental domain; it does not reproduce "having walked through three glide
reflections."* For a debug harness that is the right scope — but say it.

For PolygonWorlds the harder issue is the opposite: pose is owned by the
*presenter* (`cover.chart()` / `cover.pose()` are reads at
`fundamentalSquareEngine.ts:152,162`), and there are **three** presenters
(euclidean/spherical/hyperbolic). A `setPose(u,v)` written against the euclidean
presenter may be meaningless or unimplemented for the spherical one. The plan says
"write the cover's chart position" as if `CoverModel` has one setter; it does not
today. **`setPose` on PolygonWorlds is really `CoverModel.setChart?.()` across
three presenters, optional per presenter** — which is fine, but it is more surface
than "add one method to the interface." Phase 2 is not as cheap as billed.

### 2.3 The query-location inconsistency (latent bug)

The plan's helper reads the query from **inside the hash**:

```ts
new URLSearchParams(window.location.hash.split('?')[1] ?? '')   // #/poly?u=0.3
```

But the **existing** PolygonWorlds debug hook reads the query from
`location.search` — the *real* query string before the `#`:

```ts
if (location.search.includes('polydebug')) { … }   // PolygonWorlds.tsx:105
```

These are two different places a `?…` can live. The router splits on the hash
(`index.tsx:65`, `hash.split('?')[0]`), so the *app's* convention is hash-query —
making the plan's choice the correct one. But it means **`?hud` and `?polydebug`
would live in different parts of the URL**, which is a maintenance trap: a future
reader will copy one and wonder why the other doesn't fire. The plan should
either (a) migrate `polydebug` to the same hash-query seam as part of Phase 2
(cheap, and unifies the debug story), or (b) explicitly document the split. Right
now it does neither, and "reuse the `polydebug` precedent" (§2 of the plan) papers
over the fact that the precedent reads a *different query*. Flag and unify.

> [!IMPORTANT]
> **Recommendation.** Fold `polydebug` into `debugPose` (it becomes
> `hudEnabled()` plus the typed accessors) during Phase 2, so there is **one**
> debug-query convention, read from **one** place. This is the cheapest moment to
> do it and it removes the inconsistency before SolidWorlds copies the pattern.

---

## 3 · Verification & contracts — the three detectors

This is the core of a verification proposal, so I will be blunt about each
detector's strength.

### 3.1 Detector 1 — console / pageerror scraping ✅

Correct and cheap. Already half-wired in `shoot.mjs:52-54`. The only refinement:
the current code *logs* console errors; the smoke script must *record and fail* on
them, and it should **allow-list** known-benign warnings or it will be noisy
(Three.js emits deprecation warnings; the HDR loader can warn). The plan says
"record + fail" — good — but does not mention an allow-list, which it will need on
first contact with reality. Add one.

### 3.2 Detector 2 — `webglcontextlost` via `evaluateOnNewDocument` ✅✅

This is the **best** detector in the plan and the one genuinely tied to the #216
defect class. Registering the listener *before* boot is exactly right (the app has
no such handler today — confirmed: no `webglcontextlost` anywhere in the engines).
This is the seam that would actually have caught the #216 Torus crash, because —
as the plan correctly notes — Three.js swallows shader-compile failures and the
symptom was context loss, not a console error. Keep this always-on, no allow-list,
hard signal. If only one detector survives to become a gate, it should be this
one.

One addition: also listen for `webglcontextcreationerror` on the canvas, which
fires when context creation *fails* outright (a different failure mode from a lost
context). Cheap, same seam.

### 3.3 Detector 3 — `readPixels` dead-frame scan 🟡 (the weak one)

This is the detector I would not gate on, and I want to lay out exactly why, because
the plan's own risk section gestures at the problem without resolving it.

**Problem A — reliability of `readPixels` on SwiftShader.** `readPixels` against
the *default framebuffer* after a Three.js render is fragile: the canvas may have
been cleared/swapped, `preserveDrawingBuffer` matters (it is `true` in `Canvas3D`
— good, but the walkers may use their own renderer config), and SwiftShader's
async readback timing differs from hardware. Reading from the **canvas 2D context
via `drawImage` + `getImageData`** is often more reliable than `gl.readPixels` for
a "is this frame all one color" check, because it samples the *composited* result
the screenshot would capture. The plan should pick the readback path
deliberately; "`gl.readPixels` a small sample" is under-specified.

**Problem B — the dark-look false-positive, and the proposed mitigation is
hand-wavy.** The plan acknowledges `moonlit`/dark looks trip an all-black check,
and proposes "tune thresholds, or skip readPixels for known-dark looks." That is
not a design; it is a TODO. A threshold tuned to pass `moonlit` is a threshold
that *also passes a genuinely dead black frame* — the two are not separable by a
brightness threshold, which is the whole problem. Better framings:

- **Variance, not brightness.** A dead frame is *uniform* (all one color, dark or
  light); a real render — even a dark one — has spatial variance. Sample a grid of
  pixels and fail only if their **variance is below ε** (and, optionally, the mean
  alpha is ~0). This separates "dark scene" from "no scene" far more robustly than
  a brightness floor. Still imperfect (a fog-saturated frame is low-variance) but
  much better than a black-level threshold.
- **Pin the look.** The smoke run should force a *known, mid-bright* look via
  `SEED_LS` (the harness already supports seeding localStorage) so it never
  samples a dark look in the first place. This is strictly better than tuning, and
  the plan already has the mechanism — it just doesn't connect it to the
  dead-frame detector.

> [!WARNING]
> **The dead-frame detector, as specified, will be the flakiest thing in CI.**
> A brightness threshold cannot distinguish a dark scene from a dead one. Replace
> it with a **variance** check and/or **force a bright look via `SEED_LS`** for the
> smoke run. If neither is done, keep this detector *advisory-only* and never let
> it gate — the context-loss detector is the one that earns the gate.

### 3.4 What none of the three detectors catch (be honest in the doc)

The plan's gap table claims B closes the "*runtime crash/NaN that only shows at a
real viewport*" class. The three detectors catch: a thrown error, a lost context,
and a uniform frame. They **do not** catch:

- a *visually wrong but non-crashing* render at 390×844 (#215 was a *height* bug —
  layout, not WebGL; none of the three detectors see layout). The plan lists #215
  in its motivation table but no detector addresses it. To catch #215-class you
  need a *layout assertion* (canvas dimensions, scroll overflow, element
  visibility), not a framebuffer scan. Either add a cheap DOM assertion (canvas
  fills its container; no horizontal scroll) or drop the #215 claim.
- a NaN that SwiftShader *tolerates* — which is, by the plan's own admission, the
  #216 mechanism. See §6.

---

## 4 · Maintainability & the missing round-trip

**Can a newcomer follow it in 6 months?** The A-side: yes, easily — a 5-line
parser, a documented param table, one HUD component modeled on an existing one.
The complexity is justified and the vocabulary lock (§6 of the plan) is exactly
the right instinct (one documented table beats each app inventing `?px=`/`?posx=`).

The one maintainability gap is the **round-trip**, the (c) I flagged in §1. The
plan lets you *consume* a pose URL but never *produce* one. In practice the most
valuable affordance of a deep-pose system is a **"copy link to this view" button**
(or, minimally, the HUD printing the current URL). Without it, authoring a debug
URL means hand-computing `yaw`/`pitch`/`x,y,z` radians — exactly the friction the
plan elsewhere optimizes away by choosing readable named params. The HUD *already
reads* all the state it would need to emit the URL. Adding a one-line
`?…`-string to the HUD's text output (copy-paste-able) is nearly free and turns
"author a debug URL" from a chore into "walk there, copy the line." I would make
this a first-class acceptance criterion, not an afterthought.

> [!TIP]
> The HUD already polls determinant / cell / pos / yaw / pitch every frame. Have it
> render the corresponding `#/<app>?…` string as its last line. The reproduction
> workflow becomes: walk to the bug, read the line, paste into `shoot.mjs`. That is
> the single highest-leverage addition to the A side, and it costs ~10 lines.

---

## 5 · Performance & footprint

| Concern | Assessment |
|---|---|
| HUD bundle impact when unused | 🟡 **Verify the tree-shaking claim** |
| HUD rAF polling cost | ✅ negligible (text-only, one getter read) |
| `nearestMarker` per-frame cost | 🟡 depends — see below |
| Smoke wall-clock across 19 routes on SwiftShader | ⚠️ **the real cost** — quantify it |

**Tree-shaking.** The plan asserts the HUD has "zero impact on the shipped UI"
because it "never mounts unless the param is present." Mounting is a *runtime*
guard; it does **not** remove the component from the bundle. `DebugPoseHUD.tsx` is
imported statically by each walker, so its code ships to every user regardless of
the `?hud` flag. For a text-only overlay this is a few KB — acceptable — but the
plan's claim is wrong as stated. If the goal is genuinely zero shipped bytes, the
HUD must be `React.lazy`-loaded behind the `hudEnabled()` check. I would *not*
bother (the KB is trivial) but I *would* fix the claim: say "negligible bytes,"
not "zero impact." Precision here matters because the same loose reasoning ("it's
behind a flag so it's free") is how dev-only code creeps into prod bundles.

**`nearestMarker` cost.** Pure and unit-tested — exemplary (this is the plan's
best small decision and honors L4). One caveat: if it is O(markers) per frame and
the HUD polls every frame, fine at ~dozens of markers, but note it only needs to
run when `hudEnabled()`. The plan implies that (HUD-only) but should state it —
don't compute nearest-marker on every shipped frame.

**Smoke wall-clock — the unquantified cost.** 19 routes × (HDR load + 3.5s settle
+ readback) on *software* WebGL. ComplexParticles alone wants 3500ms; SwiftShader
boot per route is multiple seconds. This is plausibly a **2–5 minute** CI step.
The plan makes it `continue-on-error` (good — non-blocking), but a 3-minute
non-blocking step that everyone learns to ignore has negative value: it costs CI
minutes and trains people to skip the logs. Two mitigations the plan should adopt:
(1) **parallelize** across routes (Puppeteer can run N pages, or shard); (2) settle
on a `window.__ready` signal instead of a fixed 3.5s ceiling per route (§1) so fast
routes don't pay the slow route's tax. As specified (serial, fixed waits) the
wall-clock is the hidden cost that will get the step deleted in six months.

---

## 6 · The SwiftShader honesty problem (B's headline is overclaimed)

The plan's own risk #1 is the most important sentence in the document, and it
deserves to be elevated from "risk" to "scope boundary":

> SwiftShader … *tolerates* exactly the NaN the #216 bug exploited on real
> hardware.

If that is true — and it is the standard behavior; software rasterizers clamp/skip
NaN where a real GPU driver kills the context — then **the smoke pass cannot catch
a #216-class NaN defect**, because on SwiftShader the bug *does not reproduce*.
The context never gets lost, so detector 2 never fires; the frame rasterizes
(garbage-but-not-uniform), so detector 3 may pass; nothing throws, so detector 1
is silent. The plan lists "#216 Torus crash" as the marquee case B would catch
(gap table, §1), and then in §6 concedes B *wouldn't* catch its NaN. **These two
statements are in tension and the plan should resolve it in the doc, not bury the
resolution in a risk bullet.**

What B *does* honestly catch: gross failures — a route that throws on boot, a
shader that fails to compile *and* loses the context even on SwiftShader, a
genuinely blank render. That is real value (it closes the "did this route even
load at a phone viewport" tier for free). But the framing must change from
"catches #216" to "catches the *boot/blank* failures #216 was *adjacent to*; the
NaN itself still needs `phone-needed`." The plan's "honest framing in the doc"
instinct is right — I am asking for it to be *more* honest and to fix the gap
table accordingly. The deferred "in-shader NaN-assert build flag" is the only
thing that would truly catch the NaN headless; the plan is right to defer it, but
then it must not claim the cheap path catches what only the deferred path would.

---

## 7 · Smaller findings

- **Route list as single source — good, but watch the DOM/WebGL split.** The plan
  routes DOM-only apps (`#/argand`, `#/agentic-sorting`, …) to console-checks-only.
  Correct. But `#/fractals-cpu` is Canvas2D and `#/fractals` (GPU) is WebGL — the
  split must be by *renderer*, not by "is it a fractal." The plan gets this right
  (it lists fractals-cpu as Canvas2D) — just make the route table carry an explicit
  `kind: 'webgl' | 'dom' | 'canvas2d'` tag so the detector dispatch is data-driven,
  not a hand-maintained `if` ladder that drifts.
- **`shoot.mjs` query preservation — verify, don't assume.** The plan says
  "confirm it preserves the `?query`" (§A5). I checked: `route.replace(/^#?\/?/, '#/')`
  operates on the *leading* `#/` only and leaves the rest (including `?…`) intact, so
  it does preserve the query. ✅ But the plan correctly flags it as a Phase-1
  verify-step — keep that.
- **`preserveDrawingBuffer: true`** in `Canvas3D` (`:42`) is what makes the
  screenshot/readPixels reliable for *those* apps. The walkers may construct their
  own renderer (SolidWorlds calls `renderer.localClippingEnabled = true` directly on
  a passed renderer — so they *do* use `Canvas3D`'s renderer). Confirm every smoke
  target's renderer has `preserveDrawingBuffer` or `readPixels`-after-render may read
  a cleared buffer. This interacts with detector 3's reliability (§3.3).
- **`continue-on-error` graduation path is the right call.** Mirroring the
  `sessions:lint --strict` "advisory now, gate later" pattern is exactly the
  established convention. No objection. Just make sure the *quiet* bar for promotion
  is "the dead-frame detector has been made non-flaky" (§3.3), not merely "it didn't
  fail this week."
- **StrictMode double-invoke.** `index.tsx:81` wraps the app in `StrictMode`, which
  double-invokes effects in dev. The boot-param `setPose` lands in `onMount`; confirm
  applying the pose twice is idempotent (it should be — it's an absolute set, not a
  delta — but the SolidWorlds `recenter`-then-place path must be verified
  idempotent). Cheap to check, annoying to debug if missed.

---

## 8 · What I would change before Phase 1

1. **Add a determinism mechanism to B** (freeze the clock or prove idle-frame
   time-invariance), or downgrade acceptance criterion 1 from "same view twice" to
   "loads and renders." Do not ship a "reproducible" claim you can't back. *(blocking
   for B-as-gate; not blocking for A)*
2. **Replace the dead-frame brightness threshold with a variance check and/or a
   forced bright look via `SEED_LS`.** *(blocking for detector-3-as-gate)*
3. **Fix the gap table / §6 tension**: stop claiming the cheap smoke catches the
   #216 NaN; claim what it actually catches (boot/blank). *(doc honesty — blocking)*
4. **Add the round-trip**: HUD prints the reproducible `?…` URL. *(high-leverage,
   non-blocking)*
5. **Unify `polydebug` into `debugPose`** so there is one debug-query convention
   read from one place. *(non-blocking, cheapest now)*
6. **Correct the tree-shaking claim** ("negligible bytes," not "zero impact") and
   gate `nearestMarker` to HUD-only. *(precision — non-blocking)*
7. **Quantify and parallelize the smoke wall-clock**, settle-on-signal not
   fixed-wait. *(prevents the step from being ignored/deleted)*

None of these block Deliverable A's Phase 1, which is pure additive scaffolding and
should proceed. They gate **B's promotion to anything load-bearing**.

## Verdict

**Approve Deliverable A; conditionally approve Deliverable B's console +
context-loss detectors; send B's determinism strategy and dead-frame detector back
for a design pass before either becomes a gate.**

Deliverable A is the strongest part of the plan: the generic-helper / per-app-
mapping / engine-`setPose` three-layer split is the correct factoring, it reuses an
established URL-as-state pattern, it composes past the two walkers, and its one new
computation is pure and unit-tested. My only substantive A asks are the missing
**round-trip** (have the HUD emit the reproducible URL — the single
highest-leverage addition) and **unifying the two debug-query conventions**
(`polydebug` reads `location.search`; the new helper reads the hash-query — a
latent inconsistency). SolidWorlds' `setPose` is meaningfully harder than the plan
implies (it is `recenter` + place, valid only within the home cube) and
PolygonWorlds' is presenter-plural; neither is fatal, both should be stated.

Deliverable B is directionally right and its **context-loss detector is the real
prize** — the seam that would actually have caught the #216 *symptom*. But the plan
has a **determinism blind spot**: it claims reproducibility it has no mechanism to
deliver, because the walkers run a wall-clock-timed rAF and the plan never freezes
the frame. Its **dead-frame detector** cannot distinguish a dark scene from a dead
one with a brightness threshold and will be the flakiest thing in CI as specified
(use variance, or force a bright look via the `SEED_LS` mechanism the harness
already has). And the plan's own honest caveat — SwiftShader tolerates the #216
NaN — means B's marquee claim ("catches #216") is overstated and should be
narrowed to "catches boot/blank failures." Fix the determinism story, harden the
dead-frame detector, and correct the doc's claims, and B becomes a genuinely
useful no-cost tier. As written, ship its console+context-loss half as advisory and
hold the rest.

## Self-reflection

1. **What would you do with another session?** Actually run `scripts/shoot.mjs`
   twice against an identical walker pose URL to empirically test whether the idle
   frame is deterministic on SwiftShader — that single experiment would convert my
   "determinism is unaddressed" *argument* into a *measurement* and settle whether
   the gap is fatal or merely cosmetic. I would also prototype the variance-based
   dead-frame check on a real dark-look screenshot to confirm it separates
   `moonlit` from black.
2. **What would you change about what you produced?** It is long; a maintainer in a
   hurry needs the §0 summary table and the Verdict, and I front-loaded both, but
   the middle could be 20% shorter. I leaned hard on the determinism point — if
   measurement shows idle walker frames *are* stable, I over-weighted it.
3. **What were you not asked that you think is important?** Whether the *real-device*
   tier (`phone-needed`) has any cheaper substitute than a human with a phone — e.g.
   BrowserStack/Sauce real-device clouds in CI. The plan and request both treat
   real-device as irreducible; that may be a false constraint worth a sentence.
4. **What did we both overlook?** The round-trip / "copy this view's URL" affordance
   — the plan optimizes hard for *readable* hand-authored URLs but never lets the
   app *emit* one, which is the higher-leverage half of a deep-link system. Neither
   the plan nor the review request mentioned it until I named it.
5. **What did you find difficult?** Judging SwiftShader's NaN-tolerance behavior
   from reasoning alone — I am confident in the direction (software rasterizers
   tolerate what drivers kill) but not in the specifics for this exact shader, and
   that uncertainty rides directly on top of B's headline justification.
6. **What would have made this task easier?** A captured before/after screenshot of
   the #216 failure (what did the *broken* frame actually look like on SwiftShader
   vs hardware?) would let me judge whether detector 3 would have caught it, instead
   of reasoning about it abstractly.
7. **How did you verify this, and does each passing check test the user-visible
   claim?** Method: **reasoning + static code reading only.** I read both engines,
   `Canvas3D`, the router, `shoot.mjs`, the existing `polydebug` hook, and the
   verify-script conventions, and I confirmed concrete facts (the query lives in the
   hash; `polydebug` reads `location.search` — a real inconsistency; `shoot.mjs`'s
   regex preserves the query; no `webglcontextlost` handler exists today). I did
   **not** run anything: I did not execute `shoot.mjs`, did not test SwiftShader's
   NaN behavior, and did not measure idle-frame determinism — so my two most
   load-bearing claims (the determinism gap and the SwiftShader-tolerates-NaN point)
   are *reasoned, not measured*. They are the first things a follow-up should test.
   Setting `signals: needs-dan` (a precedence decision and a scope-honesty call are
   on Dan) and `followup: high` accordingly.
8. **Follow-up value:** HIGH — the two pivotal claims (determinism gap; SwiftShader
   masks the #216 NaN) are reasoned from code, not empirically verified, and both
   could be settled with one 10-minute `shoot.mjs` experiment; if idle frames turn
   out deterministic the B-side critique softens materially.
