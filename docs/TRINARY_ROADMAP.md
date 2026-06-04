# Trinary System — Roadmap

A staged plan to mature the Trinary System module: extract its simulation core
into a reusable library, refactor scenarios, consolidate the two catalog entries
into one app, and add first-run onboarding.

## Context

The Trinary System work has grown into a substantial module (~3,900 lines across
`src/animations/TrinaryStars/`). It currently ships as **two separate catalog
entries** — `/trinary` (the interactive Observatory) and `/trinary-lab` (the
ensemble/basin Lab) — that share a single physics core:

- `physics.ts` — restricted N-body leapfrog integrator (`step`), `cloudSpread`,
  `lyapunovRenorm`; `Star`/`Planet`/`SimState` types.
- `presets.ts` — scenario definitions (`PRESETS`, `getPreset`, `buildStars`,
  `orbitFrame`, `launchPlanet`, `recenter`, `TargetId`).
- `analysis/` — trajectory classifier (climate × dynamics → bins/eras),
  `Outcome`/`RunResult`/`Snapshot` types.
- `lab/` — worker pools, GPU runner, basin maps, ensemble aggregation, all
  importing the three modules above via `../physics`, `../presets`, `../analysis`.

This roadmap addresses four needs, in dependency order:

1. **Library extraction** — the integrator + scenario + analysis layer are
   reusable beyond Trinary (future N-body / orbital-mechanics apps), but they're
   currently buried inside one app folder and reached via relative `../` imports.
2. **Scenario refactor** — `presets.ts` couples *the dynamical configuration*
   (stars, masses, dt, softening) with *the planet-launch defaults* and *UI
   blurbs*. Separating these makes scenarios composable and shareable across the
   Observatory, the Lab, and any future consumer.
3. **Consolidation** — two catalog entries for one conceptual app fragments the
   UX and duplicates shell wiring. Merge into a single app with internal
   **Observatory / Lab** tabs.
4. **Onboarding** — first-time users land in a dense control surface with no
   guidance. Add a guided Tour and a Simple/Advanced control split.

### Scope decisions

- **Extract from Trinary only.** Build the shared library so it is cleanly
  reusable, but Trinary is its sole consumer for now. Other N-body/orbital
  systems are *designed-for, not built* — no speculative apps.
- **Flag shared-file edits before making them.** Before touching cross-app/shared
  files (`apps.ts`, `index.tsx`, `Menu`, `AppShell`, `CLAUDE.md`, `README.md`),
  call it out. The chosen consolidation design keeps AppShell untouched (in-app
  tab bar), so the only shared-file change is collapsing two registry entries into
  one.
- **Onboarding designed now, built last.** The Tour + Simple/Advanced split is
  part of this architecture, but implemented as the final phase so it can wrap the
  finished, consolidated surface.

---

## Phase 1 — Extract the shared library (`src/lib/nbody/`)

**Goal:** lift the engine out of the app folder into a first-class shared library
under `src/lib/`, matching the existing `lib/particles/` precedent (which has its
own `index.ts` public re-export barrel).

Create `src/lib/nbody/` with:

| New file | Moved/derived from | Public surface |
|----------|--------------------|----------------|
| `integrator.ts` | `physics.ts` | `Star`, `Planet`, `SimState`, `step`, `cloudSpread`, `lyapunovRenorm` |
| `scenarios.ts` | `presets.ts` (dynamics half) | star builders, `recenter`, `orbitFrame`, `launchPlanet`, `TargetId`, `buildStars` |
| `classify.ts` | `analysis/` | classifier `Analyzer`, `ClassifyParams`, `DEFAULT_CLASSIFY`, `Outcome`, `RunResult`, `Snapshot`, `Segment`, `LabEvent` |
| `index.ts` | — | barrel re-export of the above (mirror `lib/particles/index.ts`) |

**Approach (low-risk, mechanical):**
- Move files; keep symbol names identical so call sites only change import paths.
- Replace `../physics` / `../presets` / `../analysis` imports in `lab/*` and the
  app components with `@/lib/nbody` (the `@/ → src/` alias already exists in
  `tsconfig.json` + `vite.config.ts`). This removes the deep `../../` chains.
- Keep the library **app-agnostic**: no React, no Three.js, no DOM. The integrator
  and classifier are already pure TS — preserve that boundary so future consumers
  (and the lab's web workers, which already import these) stay clean.
  `lab/worker.ts` / `lab/basinWorker.ts` importing the pure modules is the key
  constraint to protect.

**Critical files touched:** all of `src/animations/TrinaryStars/lab/*`,
`TrinaryStars.tsx`, `Observatory.tsx`, `SkyView.tsx`, `MiniSim.tsx` (import paths
only). New tree under `src/lib/nbody/`.

**Cross-app flag:** none — internal to the Trinary folder + new lib. Verify
`npm run build` passes before moving on.

---

## Phase 2 — Scenario refactor

**Goal:** decouple the three concerns currently fused in `presets.ts`.

`presets.ts` today mixes: (a) the **dynamical configuration** (`make()` star
builder, `dt`, `starSoft`, `hasBinary`), (b) **planet-launch defaults** (`target`,
`planetRadius`, `planetSpeed`), and (c) **presentation** (`name`, `blurb`). The
Lab's `EXPERIMENTS` array is a *second*, parallel scenario concept layered on top.

**Approach:**
- In `src/lib/nbody/scenarios.ts`, define a `Scenario` type that separates the
  pure dynamical spec (`makeStars`, `dt`, `softening`) from a `LaunchDefaults`
  block from a presentation block. Keep `buildStars`, `orbitFrame`, `launchPlanet`
  as the composition helpers (already pure).
- Keep the existing four presets (Figure-Eight, Moth, Pythagorean, Binary+Star)
  as data; the refactor is structural and **behaviour-preserving** — identical
  initial conditions and dt values, just reorganized fields.
- Have the Lab's `EXPERIMENTS` reference scenarios by id rather than re-encoding
  defaults, so Observatory and Lab draw from one scenario registry.

**Critical files:** `src/lib/nbody/scenarios.ts`, `lab/TrinaryLab.tsx`
(EXPERIMENTS), `lab/runner.ts`, `lab/rng.ts`, `lab/gpu.ts`, `Observatory.tsx`,
`TrinaryStars.tsx`.

**Cross-app flag:** none — internal. `npm run build` must pass; spot-check that
all four presets still launch identically in dev.

---

## Phase 3 — Consolidate `/trinary` + `/trinary-lab` into one app

**Goal:** one catalog entry, one route, internal **Observatory / Lab** tabs.

**Chosen design — in-app tab bar (keeps AppShell untouched):**
- A new top-level component owns a `mode: 'observatory' | 'lab'` state and renders
  a lightweight in-canvas tab switcher, lazy-mounting the existing Observatory and
  Lab views. Both already call `useAppHeader` independently, so the active view
  continues to drive the shell title; no AppShell API change is required.
- Preserve deep-link compatibility: the Observatory reads a world from the hash
  query and the Lab's basin map links back into it. Map the old routes
  (`#/trinary`, `#/trinary-lab`) onto the single route + a `tab=` query (or a
  `#/trinary/lab` sub-path) so existing shared links still resolve. Add a small
  redirect for the legacy `/trinary-lab` hash.

**Why this design:** it avoids editing the shared `AppShell` (no new "shell mode"
surface for other branches to conflict with). The only shared-file change is the
registry collapse below.

**Shared-file changes — flag before editing:**
- `src/apps.ts` — collapse the two entries (`/trinary`, `/trinary-lab`) into one
  (`/trinary`, "Trinary System"). This is a *removal/merge*, not an append, so it
  deviates from the append-only convention in `CLAUDE.md` — explicit heads-up
  required.
- `src/index.tsx` — remove the `/trinary-lab` route + lazy import; keep `/trinary`
  pointing at the consolidated component (plus the legacy redirect).
- `CLAUDE.md` + `README.md` — update the Routing table / app list to reflect one
  Trinary app.

**Cross-app flag:** yes — pause and confirm before editing `apps.ts` /
`index.tsx`. `npm run build` must pass; manually verify both tabs render and
legacy links redirect.

---

## Phase 4 — Onboarding (designed now, built last)

**Goal:** make the consolidated app approachable on first visit.

1. **Simple / Advanced control split.** The Lab already has a
   `ViewMode = 'simple' | 'advanced'` concept — generalize it to the Observatory.
   In Simple mode, `<ShellSettings>` shows only high-signal controls (scenario
   picker, launch, trails, play/pause); Advanced reveals the full surface
   (softening, mass multipliers, classifier params, reference-frame selector).
   Default new users to Simple, persist the choice via `usePersistentState`
   (`lib/usePersistentState.ts`).

2. **Guided Tour.** A short, dismissable step sequence (welcome → pick a scenario
   → launch a planet → watch the ghost cloud diverge → open the Lab tab) shown on
   first visit, gated by a persisted "seen tour" flag, re-launchable from the
   Explainer/Actions. A self-contained overlay component inside the Trinary folder
   (no AppShell change); reuse `ControlPanel` styling for consistency.

**Critical files:** new `Tour.tsx` (+ small CSS), edits to the consolidated
component and `Observatory.tsx` to honor `viewMode`, and `EXPLAINER.md`.

**Cross-app flag:** none — within the Trinary folder.

---

## Verification (run after each phase)

- `npm run build` — the only CI gate (`tsc && vite build`); must pass after every
  phase since there are no tests/linter.
- `npm run dev` → `http://localhost:5173/animath/#/trinary`:
  - **Phase 1/2:** all four scenarios launch with identical behaviour; ghost
    cloud diverges; Lab basin map + census still run (workers + GPU paths).
  - **Phase 3:** single catalog entry; Observatory⇄Lab tab switch works; legacy
    `#/trinary-lab` and shared deep-links (hash-query world / basin click-through)
    still resolve.
  - **Phase 4:** first visit shows the Tour and Simple mode; Advanced reveals full
    controls; both choices survive reload (localStorage).
- Sanity-check `lab/worker.ts` + `lab/basinWorker.ts` still bundle (the library
  must stay React/Three-free for the worker entry points).

## Sequencing & risk

Phases are ordered by dependency: 1 → 2 are internal, mechanical, and reversible;
3 is the only one touching shared files (flagged); 4 is additive and last. Each
phase is independently shippable and build-green, so work can pause or get review
between any two.
