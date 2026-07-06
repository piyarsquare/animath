---
kind: progress
session: 2026-07-02-S01
date: 2026-07-02
title: Clean up loose ends
branch: claude/clean-up-loose-ends-8b0wqp
slug: clean-up-loose-ends-8b0wqp
status: completed
build: passed
followup: LOW
pr: 247
app: general, fractals, chrome, docs
signals: visual-unverified
next: Review + merge PR #247. Then (deferred to Dan / a notebook thread) the Argand/Number-Plane final unified format and Argand's theme-token wiring.
---

# Clean up loose ends

## Session purpose

Clean up loose ends — a sweep over the backlog's small open items rather than a
single-app feature build. Awaiting Dan's direction on which items to take.

## Previous session

First tracked session on this branch. For continuity, the most recent handoff
across all branches is
[fractal-df64-precise-fix / 2026-06-29-S01](../../handoff/fractal-df64-precise-fix/2026-06-29-S01.md)
(df64 deep zoom + auto-iterations; status completed, follow-up LOW — its open
items are merging PR #243 and the future perturbation engine, a separate arc
from this session's cleanup focus).

## Working notes

### 🟡 milestone · 14:40 — Follow-on tidy pass; session complete
**Why:** Dan: "look for any other low-hanging cleanup ops." Swept the residue left
by the archive/reorg and closed the session.

- **Stale docs:** deleted two executed-plan docs (`docs/polygon-worlds-plan.md`,
  `docs/TRINARY_ROADMAP.md`); bannered the two completed redesign docs
  (`CHROME-REVIEW.md`, `IMPLEMENTATION.md`) as historical/implemented.
- **Dead `#/topology-walk` refs after the archive:** the load-bearing one was
  `smoke.mjs` (still testing it as `webgl:true` → now the WebGL-less gallery
  fallback, a false test) — removed. Also `shoot.mjs` examples, the Mobile-checklist
  item, PLAN.md's P3 HUD reference (→ live Polygon/Solid Worlds), and the three-hats
  skill (→ live `docs/apps/*.md` + DESIGN-SPEC instead of the deleted `*_UI.md`).
- **Left alone (deliberately):** `unported_examples/` (a distinct staging convention),
  provenance mentions of Topology Walk, export-narrowing (churn ≫ value).
- Discovery scan clean: no orphaned app guides (`drift: none`), no broken doc links,
  no debt markers beyond the legitimate df64 `TODO`.

### 🟣 decision · 05:20 — Gallery: keep Complex Particles as the flagship
**Why:** Dan: "please keep complex particles at the top." Investigation (his three
"in flight" apps) found **no buried Number-Plane app** — that realization exists only
as the dormant, tested `numberPlanes.ts` engine inside Argand + a planning doc.
Resolution: Complex Particles returns to first; the trailing gallery cluster is just
the **plane-arithmetic pair** (Plane Transform · Argand) — the two unmerged "number
planes" realizations — held together until a separate notebook thread settles the
final artifact. `apps.ts` header documents the one deliberate exception to
append-only ordering.

### 🟣 decision · 05:10 — Tier-3 decisions from Dan, executed (see S02 report)
**Why:** Dan directed the Tier-3 follow-through from the review.

- **TopologyWalk → archived** to `archive/animations/TopologyWalk/` (out of the build,
  kept "to search its bones," esp. the Möbius corridor engine that has no live
  successor). Routes + `apps.ts` entry removed; legacy hashes fall back to the gallery.
- **Stale `*_UI.md` docs → deleted** (8 pre-redesign UI manuals + `GLOBAL_APP_DESIGN.md`).
- **Argand engine-merge → deferred** pending the notebook thread's format decision
  (→ the gallery clustering above instead).

### 🟢 code · 04:36 — Quick-wins tier + df64 extraction landed (PR #247)
**Why:** Dan approved the first two tasks. Opened draft PR #247 and executed:
- **Deleted** dead files (`styles/responsive.ts`, `types/uniforms.d.ts`,
  `unported_examples/fractint-simulator.tsx`), 3 orphaned `.html` session
  artifacts, and ~10 orphaned one-off scripts (probe-*, shoot-pw, sign-shots,
  test-rotations, probe-trivial-words).
- **Removed ~15 grep-confirmed dead exports** across viewpoint/debugPose/
  complexOps/Trees/PolygonWorlds/SolidWorlds/FractalPane (+ the private helpers
  `rgba`, `combinations` they orphaned).
- **Dead UI plumbing:** CorridorPreview + `'corridor'` kind, the `hue` prop chain.
- **American-spelling pass** (14 fixes incl. one user-facing string) + tokenized
  StableMatching's hardcoded grays (`var(--border)`).
- **df64 extraction (T1):** new `lib/df64.ts` (`DF64_GLSL`, `splitDouble`,
  `MAX_ITERATIONS`, `suggestedIter`); both fractal shaders now inline it like
  `PALETTE_GLSL`. The one real structural fix.
- **Two review claims REFUTED by verification and dropped:** `runBattery` (used by
  `verify-geometry.ts`) and the stone/metal particle textures (live via the Texture
  picker — `textureNames` includes them). Left `numberPlanes.kindLabel` in place
  since that whole file is pending the T4 engine-merge decision.

Verified: `npm run build` green, `npm run lint` 0 errors, `npm test` 212/212 pass,
`df64-gpu-probe` passes, and both `#/fractals` + `#/correspondence` render correctly
(screenshotted — shaders compile with the inlined DF64_GLSL). Tier-3 decisions
(TopologyWalk, Argand engines, `*_UI.md` docs, Argand theming) left for Dan.

### 🟡 milestone · 02:45 — Review complete → full report written
**Why:** All 16 reviewers finished. Findings synthesized into
[2026-07-02-S02-deep-codebase-review.md](2026-07-02-S02-deep-codebase-review.md)
(kind: plan, status: proposed). Note on process: the background subagents did NOT
survive a container suspend/resume — 10 of them completed ~2h before I noticed but
their completion notifications were lost; I recovered their final findings from the
transcript files. Lesson: for a long fan-out in this environment, prefer
synchronous agents or check the task output files rather than trusting
notifications alone. Headline: codebase is healthy; accidental complexity is
edge-accretion (duplicated df64 shader, stale *_UI.md docs, retired TopologyWalk,
two Argand math engines, dead files/exports, one-off scripts). Awaiting Dan's
go on the quick-wins tier + 4 judgment calls.

### 🟢 code · 16:52 — 15 review subagents launched; results streaming
**Why:** Fan-out running. 12 area reviewers + 3 cross-cutting hunters
(dead-code, duplication, convention-drift), each grounding findings in rg/grep
with an essential-vs-accidental filter. First two back: **workspace engine**
(clean — all 11 archetypes used; minor over-exports `stampZ`/`layoutViews`,
Desktop/Phone view-chrome duplication) and **chrome core** (dead `hue` prop
through catalog→Gallery→Preview; orphan `CorridorPreview`/`'corridor'` kind for
retired TopologyWalk; unused `Breakdown` readout + `search`/`list` icons;
escStack vs useEscLayer confirmed NOT redundant). Collecting the rest, then I'll
adversarially spot-check the notable ones and synthesize the report.

### 🔴 blocker · 16:40 — Workflow tool permission stream fails; pivot to Agent fan-out
**Why:** Three `Workflow(...)` invocations in a row failed with "Tool permission
stream closed before response received" — a harness-level permission handshake
failure, not a denial. Rather than keep retrying, I'm running the same review
structure with parallel **Agent** subagents (a working permission path):
~15 reviewers (12 areas + 3 cross-cutting hunters) in parallel, then I
adversarially verify the notable findings and synthesize the report myself.

### 🟣 decision · 16:32 — Session pivots to a full deep review of the codebase
**Why:** Dan: the apps and the run/deploy machinery were developed incrementally;
periodically we must review whether any aspect has become overcomplicated. He
asked me to organize a complete review.

Plan: a multi-agent review workflow — ~14 parallel reviewers (11 area reviewers
covering chrome, workspace engine, particles, fractals, worlds, Trinary/nbody,
DOM apps, Argand/PlaneTransform, TreesAndNets, shared lib, build/deploy tooling,
docs + session machinery; plus 3 cross-cutting hunters for dead code,
duplication, and convention drift), then a dedup pass, adversarial verification
of every finding, and a completeness critic whose gaps spawn a second round.
Output: a prioritized review report committed to this branch. Inline scouting
already noted: PR #243 (fractal auto-iterations) has merged; `scripts/` carries
~10 one-off probe scripts; `docs/` has UI-snapshot files for deleted/retired
apps (StableMarriage, TopologyWalk); `chrome/previews.tsx` is 948 lines; the
session-report machinery is ~2,000 lines of .mjs.

### 🟡 milestone · 16:27 — Session started
**Why:** /start-session invoked with focus "clean up loose ends."

New branch `claude/clean-up-loose-ends-8b0wqp` (slug
`clean-up-loose-ends-8b0wqp`), first session (S01). Read the latest handoff
(fractal-df64-precise-fix, 2026-06-29) and the backlog (`docs/sessions/TODO.md`).
The focus is a cleanup sweep, so the natural candidates are the backlog's small
!low/!med items (HDR loader fix, lint-warning drive-down, guide copy-edit pass,
CLAUDE.md slimming, residual DOM-color tokenization, …) plus any open PR
housekeeping (e.g. #243). Presented the orientation summary; waiting for Dan to
pick the targets before touching code.
