---
kind: progress
session: 2026-07-17-S01
date: 2026-07-17
title: Trinary legibility redesign — emphasis vocabulary + panel restructure
branch: claude/trinary-legibility
slug: trinary-legibility
status: complete
build: passing
followup: null
pr: null
app: trinary, chrome
next: Dan reviews the emphasis grammar + task layouts; then migrate other apps' buttons to the Button primitive.
---

# Trinary legibility redesign — emphasis vocabulary + panel restructure

## Session purpose

Dan: "controls were built because I was chasing an idea and they are not readily
apparent to a new user and not easy to traverse the app… there is nothing that
'stands out' in the control space except an occasional run button — something
there might require changing [at] the level of the entire design language."

This session carries out the best recommendations of the 38-finding verified
design review (see the `trinary-system-review` branch's S01 report and the
workflow synthesis). Stacked on `claude/trinary-system-review-59t0w1` (PR #249).

## Previous session

`trinary-system-review/2026-07-17-S01` — fixed the fatal launch defaults, added
the safe-orbit finder + recovery, first engine tests (PR #249, CI green). The
five-lens review workflow (64 raw → 38 verified findings, 0 refuted) and its
synthesis diagnosed four root causes: (A) the design language can display but
cannot *point* (one accent channel, fully spent on passive state); (B) the
closed 11-icon vocabulary resolves archetypes, not panels; (C) control placement
fossilized implementation history; (D) copy drifted from the theming-v2 scene.

## Working notes

### 🟢 code · 03:00 — Application test suite (36 new tests) + two bugs it caught
**Why:** Dan: "please write a test suite for this application. I think there are
some issues." Tests were written against the code's own documented claims.

New suites (301 tests total pass): `analysis.test.ts` (scalars, events,
Analyzer timeline invariants, a synthetic Paradise system), `reversibility.test.ts`
(the leapfrog's exact time-reversibility), `lab/__tests__/lab.test.ts` (seeded
reproducibility contracts, Aggregator vs brute force, the batch runners'
"bit-identical" claim held to exact equality — it holds), `frame.test.ts`
(rotating-frame transform extracted to `frame.ts`: isometry, no mirror,
align-to-+x). Two real issues surfaced and fixed:

1. **`findStableLaunch` off-grid results** — rounded to 0.01 while the sliders
   step 0.05, so a recovered speed could drift on the next drag. Now snaps to
   the control grid *before* probing.
2. **Persistence resurrects the fatal launch** — returning visitors hold
   pre-fix `planetRadius/planetSpeed` in localStorage, so the safe defaults
   never reach them and the planet still explodes (very likely the "current
   starting point is a failure" experience on any browser that visited before
   the fix). New `migrateLegacyLaunch()` maps exact legacy defaults to the
   current safe launch once at mount (Auto mode only; hand-tuned values
   untouched). Verified end-to-end with a seeded browser.

Earlier this session the default was also re-tuned to the edge of stability
(r=3.2, v=0.95 — ghosts branch at t≈84, late ejection t≈427; committed to the
PR #249 branch and merged here). Note: PR #249 alone fixes *fresh* visitors;
the migration in this branch is what fixes *returning* ones.

### 🟢 code · 19:00 — Chrome: the emphasis vocabulary (root cause A + B)
**Why:** "Nothing stands out" is chrome-level and unfixable per-app.

- **`Button` primitive** (`components/ControlPanel`): closed variants
  `primary | secondary | ghost | danger | toggle`, icons only from the closed
  chrome stroke set. Grammar written into DESIGN-SPEC §4.2: **at most one
  primary per panel** (mirrors the strip's one-primary-per-app rule).
- **Accent rebudget**: slider readouts `--accent`→`--fg`; panel/view header
  archetype icons →`--dim`. Accent now marks only touch/on: thumbs, active
  pills, primary buttons, rail active state. The primary verb is now the
  loudest element on screen — by construction.
- **Rail labels**: persistent ~8px per-panel title under each desktop rail icon
  (`SectionDef.railLabel` overrides when the title won't fit; the phone dock
  already proved labels fit the language). Ten panels no longer collapse into
  three identical glyph pairs.
- **Type scale**: `Kicker` promoted into ControlPanel (readouts re-exports),
  new `Note` primitive; four-level scale documented (§4.1). Panel bodies get an
  always-visible thin scrollbar when overflowing (no more mid-sentence cuts).

### 🟢 code · 19:25 — Trinary Wave 1+2: de-fossilize the app (root causes C + D)
**Why:** Place controls where the user's model is, not where the code grew.

- **One panel owns the launch**: x/y/vx/vy spinboxes moved from System into
  Planet launch behind a `Section` fold ("Exact launch state") with a live
  pinned/auto status Kicker; System shrinks to scenario pills + blurb.
  **Find a stable orbit** is the panel's primary Button, with an inline result
  status line ("Found: radius 2.35 at speed 0.80 — launched." / the fallback).
- **Panel consolidation 10→9**: Trails folded into "Viewpoint & trails" (one
  slider, 0=off); Settings merged into Sim (danger-variant reset Button); new
  drive-tier **Hands-on** panel (Place = toggle Button, Scatter) projected into
  the strip: **Pause · Place · Scatter · Restart**.
- **Task-named layouts** (StableMatching precedent): Sandbox (opens the Ghost
  swarm — the headline experiment — on day one), **Ghost swarm**, **Climate &
  sky**, **Rotating frames**; the auto "Everything" remains the full spread.
- **Renames**: "Chaos demo"→"Ghost swarm", "Perturbation ε"→"Ghost spread ε",
  "Luminosity exponent β"→"Brightness vs mass (β)", "Calm threshold"→"Orbit
  calmness cutoff", "Star size (collision)"→"Collision radius",
  "Softening"→"Close-pass smoothing", Star A/B/C→Star 1/2/3 (BasinMap), strip
  Reset→Restart.
- **De-fossilized copy**: tour/EXPLAINER no longer name pre-theming colors
  ("pink ghosts" → "faint ghost copies hugging the bright planet"); star-mass
  sliders carry token-colored swatch dots (`--data-1/4/6`) instead of wrong
  color names ("Star 1 · gold" was a *blue* star); Lab notes name the marks,
  not their hues.
- **Feedback fixes**: Sky sliders auto-enable the sky view; placing a planet
  now exits place mode and unpauses; HUD moved top-right (clear of the panel
  column; offset below the phone chrome bar).
- **Non-destructive knobs**: `Analyzer.retune()` — climate sliders re-label the
  running world live (band re-derived from the same launch S_ref) instead of
  hard-resetting the physics; the Lab keeps a finished census on screen with a
  "previous run" banner when settings change instead of silently wiping
  minutes of compute (only explicit Reset or a fresh Run discards it).

### 🟡 milestone · 19:45 — Verified visually, all green
**Why:** The review was screenshot-driven; the fix must be too.

Headless screenshots (desktop Sandbox + task layouts + Lab + phone) confirm:
labeled rail, the accent-primary "Find a stable orbit" standing out exactly as
intended, analysis strip unobstructed, HUD readable on phone, Layouts menu
reading as a map of destinations. `npm run build` clean · `npm test` 265 passed
(new `Analyzer.retune` test) · lint 0 errors.

## Deferred (Dan's open questions from the synthesis)

1. **Immersive Observatory** — full-stage stars change the app's feel; needs
   Dan's call (the overlap bug it would dissolve is mitigated by the HUD move).
2. **Launch-speed units** (absolute vs ×circular to match the Lab) — changes a
   long-standing control's meaning.
3. **`role: 'start'` on SectionDef** — deferred per the synthesis's bet that
   Button + rebudget + task layouts make the entry point emergent.
4. **Chrome tour framework** (anchored spotlights) and the Explore↔Lab bridge —
   Wave 3, own session.

## Self-reflection

**What went well:** The workflow review's verified findings made this session
mechanical — every change traces to a confirmed problem, and the synthesis's
"smallest set that solves it" discipline kept the chrome addition to one
primitive + one budget rule + one label row. The screenshot loop caught three
real regressions (clipped primary button, buried analysis strip, truncated rail
labels) before commit.

**What to watch:** The accent rebudget touches every app's readouts — a
repo-wide visual change shipped from a Trinary branch. It looks right in the
default skin; other skins/modes were not exhaustively screenshotted. The Lab's
stale-census banner keeps the *snapshot* but not resumability — Run always
starts fresh after a config change; if Dan wants true resume that's engine work.

**Follow-up value:** HIGH — the Button primitive + accent budget are repo-wide
conventions now documented in DESIGN-SPEC/CLAUDE.md; other apps (StableMatching
`.sm2-btn`, DivisionBells `.db-btn`, Argand) should migrate, and the deferred
open questions need Dan's answers.
