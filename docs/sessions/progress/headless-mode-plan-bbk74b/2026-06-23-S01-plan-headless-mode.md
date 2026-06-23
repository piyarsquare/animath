---
kind: plan
session: 2026-06-23-S01
date: 2026-06-23
title: Headless mode build-out — deep-link debug-pose harness + mobile smoke
branch: claude/headless-mode-plan-bbk74b
slug: headless-mode-plan-bbk74b
status: proposed
build: unknown
followup: null
pr: null
app: docs, engine
signals: needs-dan
next: Implement Phase 1 (shared URL-pose + HUD scaffolding) on a fresh branch
---

# Headless mode build-out — deep-link debug-pose harness + mobile smoke

> [!NOTE]
> **Status: proposed.** This is the implementation plan for the **L1 positive
> check** (`RECURRING_LESSONS.md`), filed `!high` in `TODO.md`. It is plan-only;
> no code is written this session. Scope was pinned with Dan: **walkers first**
> (generic helper, SolidWorlds + PolygonWorlds as first adopters); mobile smoke
> **advisory-now / gate-later**; **plan-only** this session.

## 1. Why this exists

"Verified headless, never on a real device" is the most-recurring lesson in the
corpus (~14 reflections, `RECURRING_LESSONS.md` L1). The screenshot tooling from
PR #187 lets us *render a frame*, but two gaps remain — and they map to the two
defect classes that actually escape the `tsc && vite build` CI gate:

| Gap | Defect class it closes | Real cases it would have caught |
|-----|------------------------|---------------------------------|
| **(A) Deep-link debug-pose harness + dev HUD** | *Correctness* — a green invariant on a visually-wrong render (L3) | teleporting-world; spoofed chirality probe (W1/W3) |
| **(B) Headless mobile-viewport smoke** | *Runtime* — a crash/NaN that only shows at a real viewport | #216 Torus crash (WebGL context loss); #215 height |

Neither replaces a real-device pass — `phone-needed` stays a standing signal. They
close the **no-cost** verification tier so the next agent can produce a
*reproducible* visual diff instead of shooting a blind default view.

## 2. What already exists (do not rebuild)

- `scripts/shoot.mjs` — headless Chromium + SwiftShader, route + out-path args,
  `SEED_LS`/`SKIN`/`VIEWPORT`/`WAIT_MS` env knobs, prints the live WebGL renderer,
  waits for `<canvas>`, captures `console`/`pageerror` to stdout (`:52-54`).
- `scripts/install_headless_webgl.sh` + the `SessionStart` hook (cloud provisioning).
- `docs/HEADLESS_WEBGL.md`, `npm run shoot`.
- **Precedents to copy, not invent:**
  - URL-query parse: `TrinaryLab.tsx` →
    `new URLSearchParams(window.location.hash.split('?')[1] ?? '')`; the router
    already splits `?query` off the path (`index.tsx:65`).
  - Opt-in HUD overlays: `ChiralityHUD` (SolidWorlds `SolidWorlds.tsx:404-435`),
    `SquareMiniMap` (PolygonWorlds `PolygonWorlds.tsx:605-641`) — both rAF loops
    reading a getter.
  - Existing debug hook: PolygonWorlds `location.search.includes('polydebug')`
    exposes `window.__poly` (`PolygonWorlds.tsx:105`).

## 3. Deliverable A — deep-link debug-pose harness + dev HUD

### A0. The convention (shared, app-agnostic)

One small helper module, `src/lib/debugPose.ts`, that every app can opt into; the
two walkers are the first adopters. It does **not** know app-specific state — it
just parses the query and offers typed accessors:

```ts
// src/lib/debugPose.ts
export function poseParams(): URLSearchParams {
  return new URLSearchParams(window.location.hash.split('?')[1] ?? '');
}
export const pNum  = (p: URLSearchParams, k: string, d: number) => { … };
export const pBool = (p: URLSearchParams, k: string, d: boolean) => { … };
export const pStr  = (p: URLSearchParams, k: string, d: string) => { … };
export const hudEnabled = (p = poseParams()) => p.has('hud') || p.get('debug') === '1';
```

**Documented param vocabulary** (HEADLESS_WEBGL.md gains a "Debug-pose deep links"
section). Generic params first, then app-specific position:

| Param | Meaning | Apps |
|-------|---------|------|
| `world=<id>` | world/spec id (`worldById`) | both |
| `look=<id>` | scene look | both |
| `cam=first\|third` | camera mode | both |
| `camd=<n>` | camera distance (third person) | both |
| `yaw=<rad>` `pitch=<rad>` | look orientation | both |
| `x,y,z=<n>` | cube position (−1..1) | SolidWorlds |
| `u,v=<n>` | square chart position (0..1) | PolygonWorlds |
| `hud` / `debug=1` | show the dev HUD | both (opt-in) |

Unknown params are ignored, so apps can extend the vocabulary without breaking the
helper. Position semantics differ per app (3D cube vs 2D chart) by design — the
*helper* is generic; the *mapping* lives in each app.

> Rationale for named scalar params over one opaque `pose=` blob: these URLs are
> **hand-authored** when debugging ("put me at the seam facing the arch"), so
> readability beats compactness.

### A1. Engine seam — add `setPose`

Both walkers compute pose **inside an engine closure**; only PolygonWorlds exposes
a *getter*. Add a symmetric *setter* to each engine interface:

- **PolygonWorlds** — `src/animations/PolygonWorlds/engineTypes.ts`: add
  `setPose(p: { u?: number; v?: number; yaw?: number; pitch?: number }): void`.
  Implement in `fundamentalSquareEngine.ts` by writing the cover's chart position
  and heading (the inverse of the existing `cover.chart()` / `cover.pose()` read at
  `:153,162`). PolygonWorlds already exposes `getPose()`/`getMapState()` — this is
  the missing direction.
- **SolidWorlds** — `src/animations/SolidWorlds/engineTypes.ts`: add the same.
  Implement in `coverEngine.ts` by setting `pos`, resetting `bodyLinear`/`cell` to
  the home frame, and seeding `yawRef`/`pitchRef` in the component. Today the
  engine has only `recenter()` (`:64-98`); generalize it.

Camera mode / world / look are **component state**, not engine state, so they're
set in the component (A2), not via `setPose`.

### A2. Apply params on boot

In each walker's `onMount` (`SolidWorlds.tsx:80-112`, `PolygonWorlds.tsx:90-158`),
after the engine is built:

1. `const p = poseParams();`
2. If `world` present and valid (`worldById` non-null) → set `worldId` **before**
   engine build (move the parse above the build `useEffect`, or gate the initial
   `useState` with a lazy initializer reading the param). World/camera/look feed
   `useState`/`usePersistentState` initial values via lazy initializers so the
   first engine build already uses them.
3. `cam`/`camd`/`look`/`hud` → seed the matching state initializers.
4. `yaw/pitch/x/y/z` (or `u/v`) → call `engine.setPose(...)` once after build.

Edge cases the plan must honor: invalid `world` id → ignore, keep default (don't
crash); params absent → behave exactly as today (zero regression); typing in a
panel must still early-return (the `inFormField()` guard at
`SolidWorlds.tsx:153` / `PolygonWorlds.tsx:198` is untouched).

### A3. Dev HUD (opt-in)

A shared `src/components/DebugPoseHUD.tsx` modeled on `ChiralityHUD`: a fixed-corner
overlay, mounted only when `hudEnabled()`, reading a per-app `getDebug()` in a rAF
loop. The `DebugState` it renders:

```ts
interface DebugState {
  determinant: 1 | -1;             // bodyLinear.determinant() / mapState.flipped
  cell?: Record<'x'|'y'|'z', number>;  // SolidWorlds only
  pos: { x: number; y: number; z?: number };
  yaw: number; pitch: number;
  nearestMarkerDist: number;       // NEW — see A4
  world: string; look: string;
}
```

SolidWorlds wires `getDebug` off the existing `getChirality()` + `getMapState()`;
PolygonWorlds off `getPose()` + `getMapState()`. The HUD is **text-only**,
`pointer-events:none`, and never mounts unless the param is present — zero impact on
the shipped UI.

### A4. Nearest-marker distance (the one new computation)

The only diagnostic not already computed. Add a small pure helper that, given the
player position and the world's landmark/marker positions (PolygonWorlds
`landmarkCount`/`arrangement`; SolidWorlds decor markers), returns the min distance.
Keep it **pure and unit-tested** (`__tests__/`), honoring L4 — this is exactly the
"testable pure logic" class.

### A5. Using it from `shoot.mjs`

No script change needed for capture — the route arg already carries the query:

```bash
npm run shoot \
  '#/solid-worlds?world=amphicosm&x=0.1&y=0.2&z=0.3&yaw=1.5&pitch=0.1&look=dusk&hud' \
  out.png
```

`shoot.mjs` already re-prepends `#/`; confirm it preserves the `?query` (it uses
`route.replace(/^#?\/?/, '#/')`, which keeps the query — verify in Phase 1).

## 4. Deliverable B — headless mobile smoke (`scripts/smoke.mjs`)

### B1. What it does

Iterate **all routes** at **390×844**, boot each in headless SwiftShader, and fail
(exit 1) on any of three detectors. Matches the `verify-*.ts` convention
(`process.exit(fails ? 1 : 0)`, stdout summary).

Route list (single source, exported so it can't drift): 13 public + the WebGL
legacy/merged routes (`#/mobius`, `#/wrap-world`, `#/trinary-lab`) + the 2 embeds.
DOM-only routes (`#/argand`, `#/agentic-sorting`, `#/stable-matching`,
`#/fractals-cpu` (Canvas2D), `#/`) get **console/pageerror checks only**.

### B2. The three detectors (console scraping alone is insufficient)

Three.js **swallows shader-compile errors** — the #216 crash surfaced as silent
**WebGL context loss**, not a console error. So:

1. **Console/JS errors** — `page.on('console', m => m.type()==='error')` +
   `page.on('pageerror')` → record + fail. (Half-wired in `shoot.mjs:52-54`.)
2. **WebGL context loss** — `evaluateOnNewDocument` to register a
   `canvas.addEventListener('webglcontextlost', …)` flag *before* boot (animath has
   **no** such handler today); fail if it fires within the settle window.
3. **NaN / dead-frame scan** — after settle, `gl.readPixels` a small sample and
   fail if it's all-black/all-NaN on a route that should render (cheap proxy for the
   "garbage rasterization" failure mode). Tune thresholds to avoid false positives
   on legitimately dark looks (e.g. `moonlit`).

### B3. Timing & robustness

`WAIT_MS` ~3500 for the HDR-loading ComplexParticles route; wait for `<canvas>`
(8 s) on WebGL routes; per-route try/catch so one failure doesn't abort the sweep;
print a `PASS n/m` summary with the failing routes named. Optional `--shots` flag
to also dump a PNG per route into a gitignored dir for eyeballing.

### B4. Wiring

- `package.json`: `"smoke": "node scripts/smoke.mjs"` (append — and add
  `package.json` to the protected-file list per the open TODO).
- `deploy.yml`: add a **non-blocking** `continue-on-error` step
  (`npm run build && (npm run preview &) && sleep 5 && npm run smoke`) mirroring the
  `sessions:lint -- --strict` pattern — surfaces in CI logs without blocking merges.
  Promote to a hard gate once proven quiet (the established graduation path).
- `docs/HEADLESS_WEBGL.md`: document `npm run smoke` + the detectors + the
  known-dark-look caveat.

## 5. Phasing

1. **Phase 1 — shared scaffolding (no app behavior change yet).**
   `lib/debugPose.ts` + `components/DebugPoseHUD.tsx` + the `nearestMarker` pure
   helper **with its vitest file**. Build + unit test green. Lowest risk; nothing
   user-visible.
2. **Phase 2 — PolygonWorlds adoption.** It already has `getPose()` and a debug
   precedent, so it's the cheaper first integration. Add `setPose`, wire boot
   params + HUD + `getDebug`. Verify headless with a known deep link.
3. **Phase 3 — SolidWorlds adoption.** Same, plus generalizing `recenter()` into a
   `setPose`. Verify the chirality HUD still reads correctly and a seam-facing deep
   link reproduces.
4. **Phase 4 — `scripts/smoke.mjs`** + `npm run smoke` + the non-blocking
   `deploy.yml` step + HEADLESS_WEBGL.md. Run it once across all routes; fix or file
   any real defects it surfaces (don't bury them).
5. **Phase 5 — ledger close-out.** Flip `RECURRING_LESSONS.md` L1 to **🟢 Promoted
   (rule + check)** with pointers to the harness + smoke; check off the `TODO.md`
   line; note the new debug-deep-link convention in `BUILDING_AN_APP.md` (so new
   walkers adopt it) and in `RECIPES.md` (R-entry: *when verifying a walker change,
   shoot the exact pose, don't eyeball the default view*).

Each phase is independently shippable; 1 can land alone, 2/3 are parallelizable,
4 depends on nothing in 1–3.

## 6. Risks & open questions

- **SwiftShader fidelity vs real mobile GPU.** The smoke pass runs on software
  WebGL, which *tolerates* exactly the NaN the #216 bug exploited on real hardware.
  The `readPixels`/context-loss detectors are proxies, not the real device. Honest
  framing in the doc: this closes the *no-cost* tier and catches gross failures;
  `phone-needed` stays. (Mitigation idea, out of scope: a deliberate NaN-probe build
  flag that asserts in-shader — heavier, defer.)
- **Setting world before first engine build.** Cleanest via lazy `useState`
  initializers that read the param; needs care that the persisted value
  (`usePersistentState`) doesn't override an explicit URL param. **Proposed rule:
  URL param wins over persisted/default** when present (it's an explicit request).
  Confirm with Dan if the opposite is wanted.
- **`setPose` correctness on flip/screw worlds** is itself an orientation problem
  (L7) — the HUD's determinant readout is the check that the set pose is on the
  right sheet. Good: the harness validates itself.
- **Dead-frame false positives** on dark looks — tune, or skip the readPixels
  detector for known-dark looks; keep console + context-loss always-on.
- **Param vocabulary churn.** Locking names now (`world/look/cam/camd/yaw/pitch/
  x,y,z/u,v/hud`) avoids each app inventing its own; documented in one place.

## 7. Acceptance criteria

- A single shareable URL reproduces an exact walker frame headlessly
  (`npm run shoot '#/solid-worlds?…' out.png` lands the same view twice).
- `?hud` shows determinant / cell / nearest-marker without affecting the shipped UI
  (no param → byte-identical behavior to today).
- `npm run smoke` exits non-zero on an injected console error / context loss, and
  green across all routes on a clean tree; runs in CI as a visible non-blocking step.
- `nearestMarker` helper has a committed vitest file (L4 honored).
- L1 flipped to 🟢 in the ledger; TODO line checked off; convention documented in
  HEADLESS_WEBGL.md + BUILDING_AN_APP.md + a RECIPES R-entry.

## 8. Suggested next step

Optionally run **`/three-hats`** on this plan (framework-maintainer lens will have
opinions on the shared-helper vs per-app split and the CI wiring) before Phase 1.
Otherwise, start Phase 1 on a fresh implementation branch — it's pure additive
scaffolding with a unit test and no user-visible change.
</content>
