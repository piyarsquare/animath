---
kind: progress
session: 2026-07-17-S01
date: 2026-07-17
title: Trinary System review — safe default launches
branch: claude/trinary-system-review-59t0w1
slug: trinary-system-review
status: complete
build: passing
followup: null
pr: null
app: trinary
next: Optional follow-ups — tune default speed/ε if the fan-out still reads slow; consider a general "Find a stable orbit" affordance beyond the failure hint.
---

# Trinary System review — safe default launches

## Session purpose

The Trinary System's out-of-the-box experience is a failure: on first load the
planet falls into a star within ~2 sim-seconds ("explodes in the sun"). Give the
default a better start, then review the app in general and suggest improvements.

## Previous session

First tracked session on this branch. (Latest handoffs across the repo are
unrelated app branches — Division Bells, Solid Worlds, Argand — nothing to
continue here.)

## Working notes

### 🟡 milestone · 14:30 — All six review suggestions implemented + verified
**Why:** Dan said "fix them all." Each is now landed, built, tested, and driven.

1. **Systematic safe launch** — a *derived* radius proved unreliable (Pythagorean
   ejects a star → excursion→∞; Binary is hierarchical), and a bare single-probe
   finds chaotic knife-edges (an r that survives at v dies at v±0.01). So added
   `findStableLaunch(stars, target, opts)` — an engine helper that sweeps radius
   outward, uses the local circular speed, and returns the first orbit that keeps
   a real *clearance* margin from every star across a long probe. Pure, adapts to
   current masses, tested (asserts the returned orbit genuinely survives).
2. **Chaos legibility** — default `speed` 1 → 1.5× so the ghost fan-out reads sooner.
3. **Pythagorean copy** — blurb now frames the planet as a witness, not a resident.
4. **Graceful failure** — when the planet falls into a star, a hint toast appears
   over the scene with a one-click **Find a stable orbit** button (also added to
   the Planet-launch panel). Drove it with Puppeteer: bad launch (r=1.5) → planet
   destroyed → click → launch becomes r=3.25 → **planet bound, paradise 100%**.
5. **Naming** — `Observatory.tsx` (the analysis HUD) renamed to `AnalysisHUD.tsx`.
6. **Engine tests** — added `integrator.test.ts` (symplectic energy bound, momentum
   conservation, frozen-planet no-op; analyzer destroyed/habitable classification)
   and extended `scenarios.test.ts` (findStableLaunch survivability, circularSpeed).

`npm test` → 263 passed; `npm run build` clean; lint 0 errors. Verified visually
across all four scenarios + the failure/recovery flow.

### 🟡 milestone · 13:05 — Fix applied, verified visually + regression-tested
**Why:** Close the loop — the fix must be real (not just simulated) and locked in.

Changed the four `launch` defaults in `src/lib/nbody/scenarios.ts`, rebuilt, and
screenshotted each scenario headless after ~15–22s of simulation:

- **Figure-Eight** (default): planet bound, HABITABLE, paradise 100% — a wide arc
  well clear of the figure-eight loop. (Was: destroyed at t≈2.4.)
- **Moth**: planet bound, HABITABLE, paradise 85%.
- **Pythagorean**: planet bound and witnessing the violent stellar encounter
  (tangled trails, one star flung out), climate timeline a rich paradise→chaotic mix.

Added `src/lib/nbody/__tests__/scenarios.test.ts` (the engine had **zero** tests):
integrates each scenario's default launch through the real leapfrog and asserts
the planet isn't destroyed early (with a margin over the kill radius), holds the
default scenario to a stricter long-run "bound" bar, and covers `recenter` /
`launchPlanet` geometry. `npm test` → 253 passed; `npm run build` clean.

### 🔵 finding · 12:20 — Three of four scenario launch defaults destroy the planet
**Why:** Confirm the reported failure and check whether it's isolated to the default.

Re-implemented the exact `nbody` leapfrog + `launchPlanet` geometry in a
standalone script and simulated every scenario's shipped launch default:

| Scenario | Current launch | Fate |
|---|---|---|
| Figure-Eight (default) | bary, r=1.8, v=1.1 | **destroyed** at t≈2.4 |
| Moth | bary, r=2.2, v=1.1 | **destroyed** at t≈2.4 |
| Pythagorean | bary, r=4.0, v=1.6 | **destroyed** at t≈7.5 |
| Binary + Star | binary, r=1.6, v=1.1 | bound (fine) |

The planets launch *inside* the region the stars sweep through, so a close pass
consumes them almost immediately. Only Binary + Star (a genuine circumbinary
orbit well outside a tight inner pair) survives.

### 🔵 finding · 12:40 — Survivable launches exist for all but keep chaos legible
**Why:** A safe default must still show the app's headline demo — ghosts fanning out.

Scanned radius × speed × launch-angle, measuring long-run fate (T=1200), the
12-ghost cloud-spread growth, and orbit framing. Chosen launches (verified bound
past any realistic viewing window, angle 0):

| Scenario | New launch | Fate @ T=1200 | min star dist |
|---|---|---|---|
| Figure-Eight | bary, r=3.2, v=1.0 | bound | 1.75 |
| Moth | bary, r=3.5, v=0.95 | bound | 1.12 |
| Pythagorean | bary, r=5.0, v=0.55 | survives to t≈1124, then ejected | 0.29 |
| Binary + Star | binary, r=1.6, v=1.1 | bound (unchanged) | 1.03 |

Trade-off noted: very wide circumbinary orbits (r≥4) survive but are too regular
— the ghost cloud barely fans out, so the chaos demo falls flat. r≈3.2 keeps a
visible fan-out (cloud spread ~0.16 by t≈120) while staying safe. Pythagorean is
inherently destructive (Burrau's problem — three stars fall from rest and eject
one of their own); no in-frame orbit survives forever, but r=5/v=0.55 lets the
planet witness the whole spectacle and end by being flung into the dark rather
than incinerated.

### 🟣 decision · 12:45 — Fix all four launch defaults, not just the default scenario
**Why:** Any scenario a user clicks is a "first impression"; three were broken.

## Suggestions for improvement (broader review) — all implemented

All six were implemented this session (see the 14:30 milestone). Original notes
kept below for the reasoning; #1 landed as an *empirical* finder rather than a
closed-form derivation, because the physics defeats a derived radius.

1. **Derive the safe launch radius instead of hardcoding it** (root cause of this
   bug). Each scenario hand-picks a `radius`; three were wrong. A helper that
   returns a radius as a multiple of the stars' max excursion from the barycenter
   (say 2.5–3×) would make *every* current and future scenario safe by
   construction, and the per-scenario number becomes an optional override. The new
   test guards the current values but doesn't prevent a future scenario shipping a
   fresh bad one.

2. **The chaos demo is slow to read at the default speed.** The headline effect —
   the ghost cloud fanning out — takes ~80 sim-time to become visually obvious at
   `speed = 1`, and the ghosts are nearly coincident on first load (see the
   screenshots: no visible fan yet at t≈8–12). Options: bump the default `speed`
   to ~1.5×, raise the default ghost `ε` slightly, or auto-scatter once after a
   few seconds. Worth a quick experiment — it's the app's signature moment.

3. **Pythagorean is inherently destructive.** Even with the new witness orbit the
   planet is eventually ejected (t≈1124). That's physically honest (Burrau's
   problem *is* about the stars destroying their own configuration), but the blurb
   sells it as a place to "launch the planet." Consider copy that frames the planet
   as a witness to violence rather than a resident — sets the right expectation.

4. **Graceful failure UX.** When the reference planet dies there's a flare and the
   sky view detonates, but no nudge toward recovery. If a launch dies within a few
   sim-seconds, a one-line hint ("try a wider orbit, or the ◯ Circular orbit speed
   button") would turn a dead end into a teaching moment. The "Circular orbit
   speed" button already exists and is the right escape hatch — surface it.

5. **Naming friction (minor).** `Observatory.tsx` is the analysis HUD, but the
   user-facing *view* is labeled "Explore" and the old name "Observatory" still
   shows as the persisted mode id and in a skin display name — three meanings for
   one word (the code comments already flag this). A rename pass would reduce
   confusion for the next editor.

6. **Engine test coverage (partly addressed).** This session added the first
   `nbody` tests (scenario survivability + geometry). The integrator itself
   (energy conservation of the symplectic scheme over a long run) and the analyzer
   (climate/era classification) are still untested and are good candidates.

## Self-reflection

**What went well:** Reproduced the failure quantitatively before touching code
(standalone re-impl of the engine), which turned "the planet explodes" into a
measurable fate + min-distance and let me scan the launch space for a fix that
*also* preserves the chaos demo rather than just moving the planet far away.
Verified visually (headless screenshots) and locked the fix with the engine's
first tests.

**What to watch:** The launch radii are still magic numbers — suggestion #1 is the
real fix. And I widened Moth/Pythagorean beyond the reported default; those are
lower-traffic but were equally broken, so the scope creep is justified and covered
by the new test.

**Follow-up value:** MEDIUM — the default is fixed and tested, but the safe-radius
derivation (#1) and chaos legibility (#2) are worth a follow-up session.
