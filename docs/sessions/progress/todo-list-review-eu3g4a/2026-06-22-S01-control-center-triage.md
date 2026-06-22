---
kind: progress
session: 2026-06-22-S01
date: 2026-06-22
title: Control-center triage — clear stale statuses, signals, and the to-do backlog
branch: claude/todo-list-review-eu3g4a
slug: todo-list-review-eu3g4a
status: in-progress
build: unknown
followup: null
pr: null
app: docs
signals: needs-dan
next: Walk Dan through the gathered buckets easiest-first; flip confirmed "probably done" statuses, then resolve the needs-dan decisions.
---

# Control-center triage — clear stale statuses, signals, and the to-do backlog

## Session purpose

Dan wants to *clear the to-do list* by reviewing the session control center as a
whole. Across the dashboard there are three kinds of loose ends: backlog items
in `TODO.md` still marked **open**, sessions still flagged **in-progress** whose
work has almost certainly **shipped** (status never flipped), and sessions/plans
carrying the **needs-dan** signal (a product call is parked). Gather them
together and work through them **easiest questions first**.

## Previous session

First tracked session on this branch (`todo-list-review-eu3g4a`). The nearest
prior work is the 2026-06-11 to-do review/debt pass
([review-todo-prioritize-g66uqj](../../handoff/review-todo-prioritize-g66uqj/2026-06-11-S01-todo-review-priority.md),
PR #212, merged) — which last *filled* the debt and rewrote PLAN.md. This
session is a fresh, dashboard-wide triage rather than a continuation of that
app work.

## What I gathered

Scanned every report's frontmatter (`status` / `kind` / `signals`) plus
`TODO.md`. The loose ends sort into four buckets, easiest first.

### Bucket A — "probably done" in-progress reports (easy: a yes/no status flip)

Older sessions still `status: in-progress` whose app/feature has clearly shipped
since. Each is a one-question confirm → flip to `completed`:

| Report (slug) | Why it's probably done |
|---|---|
| `klein-bottle-fix` (×3: unify-rectangular, polygon-worlds-app, klein-bottle) | Superseded by Polygon Worlds, which shipped (PR #190). |
| `stable-marriage-styling-ulMPt` (advanced-styling, status-roadmap, simulation-lab, solution-space) | Stable Matching shipped (#189); Stable Marriage card retired (#220). |
| `headless-webgl-cloud` (headless-webgl-tooling) | The SessionStart hook ran this very session — tooling is live. |
| `new-chrome` (design-language-overhaul) | Whole-scale chrome overhaul shipped (#208). |
| `agent-invokable-skills` (#206) | Skills are agent-invokable now (this session used the Skill tool). |
| `session-control-center` (categories-grouping-timeline) | Control center shipped and is what we're reviewing. |
| `session-report-screenshots` | Thumbnails ship in the control center. |
| `trees-and-nets` (#211) | App is in the registry / live route `#/trees-and-nets`. |
| `polygon-worlds-spherical-p2-qgExR` (footsteps-markers-polish) | Polygon Worlds shipped; siblings already `completed`. |
| `polygon-walk-continue-4tyht3`, `topology-world-review-m9p5as` | Polygon Worlds shipped (Topology Walk retired into it). |
| `agentic-sorting-app-j6ngd4` (objectives-and-competencies) | Legibility pass shipped (per TODO note about removed Replicate panel). |

### Bucket B — needs-dan decisions (medium: a product call, some half-answered)

| Report | The parked decision |
|---|---|
| `complex-numbers-animath-intro-jperz6` — plan-fresh-complex-app (proposed) + Argand (in-progress) | Argand was **built** (live `#/argand`). Open call: naming/positioning vs Plane Transform; mark plan executed? |
| `three-hats-particle-app-rill2c` — plan-multi-function (proposed) | Render layers / function overlay / pair mode for Complex Particles — approve, defer, or drop? |
| `complex-particles-guide-tdlhk0` — explainer-series-plan (proposed, not-live) | Explainer-page series roadmap beyond the complex trilogy — green-light? |
| `polygon-world-app-review-8dduma` — solid-worlds-attribution-policy (needs-dan) | Attribution policy looks adopted (ATTRIBUTION.md exists); confirm + close. |
| `solid-worlds-review-bju3pc` / `3d-manifold-worlds-imwmal` (needs-dan) | Screw bug fixed + −a2 naming confirmed (both TODO items checked off). Remaining: app name "Solid Worlds" vs "Manifold Walk". |

### Bucket C — genuinely in flight (leave as-is)

Recent, actively-developed: Argand (`complex-numbers-animath-intro`, phone-needed),
the Solid Worlds branches (`solid-worlds-review`, `3d-manifold-worlds`,
`animath-space-worlds`). Not stale — no action.

### Bucket D — the `TODO.md` backlog (the durable list)

14 open items (2 `!high`, ~7 `!med`, ~5 `!low`). Several are quick doc reconciles
(e.g. agentic-sorting EXPLAINER still names a removed Replicate panel; missing
"Possible sources" blocks). These are hand-curated and separate from the
status/signal cleanup above.

## Working notes

<!-- Newest entry first. -->

### 🟢 code · 12:10 — Bucket A cleared: flipped 21 reports in-progress → completed
**Why:** Dan read through Bucket A and confirmed all of it is finished, so the
stale `in-progress` statuses were pure dashboard noise.

Flipped the frontmatter `status` on every in-progress report in the 12 Bucket A
slug folders (progress + handoff): klein-bottle-fix, stable-marriage-styling,
headless-webgl-cloud, new-chrome, agent-invokable-skills, session-control-center,
session-report-screenshots, trees-and-nets, polygon-worlds-spherical-p2
(footsteps-markers-polish), polygon-walk-continue, topology-world-review,
agentic-sorting-app. Only the frontmatter line was touched; no in-progress
status remains in those folders. Bucket C (Argand, the Solid Worlds branches)
deliberately left untouched.

### 🟣 decision · 11:50 — Triage into four buckets, present easiest-first
**Why:** Dan's ask is dashboard-wide cleanup, not one app. Sorting the loose
ends by *how hard the question is* (status flip < product call) lets us clear
the cheap wins first and reserve discussion for the real decisions.

Buckets A–D above. Awaiting Dan's go on where to start (recommend Bucket A —
confirm-and-flip the probably-done statuses).

### 🔵 finding · 11:40 — The control center surfaces three independent "loose end" channels
**Why:** Needed to know what "Todo / in-progress / needs-dan" actually map to in
the data model before gathering them.

From `build-sessions.mjs`: **status** (`in-progress` vs `completed`, a card
badge), **signals** (`needs-dan` is backfilled for any `kind:plan` +
`status:proposed`, plus explicit declarations; also phone-needed / visual-unverified /
not-live), and the hand-edited **`TODO.md`** backlog panel. These are
orthogonal — a stale `in-progress` status is not the same as an open to-do.

### 🟡 milestone · 11:30 — Session opened; scanned all report frontmatter + TODO.md
**Why:** Establish the full inventory before proposing any cleanup.

Fresh branch, no prior handoff here. Read the nearest prior to-do review for
continuity and the builder source for the status/signal vocabulary.

## Next steps

1. Dan picks a starting bucket (recommend **A**).
2. For each Bucket A item: confirm shipped → flip `status: completed` in
   frontmatter (and drop stale signals). Cheap, mechanical.
3. Work Bucket B decisions one at a time; for executed plans flip
   `status: proposed → executed`; capture naming calls.
4. Reconcile / check off `TODO.md` items as we resolve them.
5. Re-run `npm run sessions` so the control center reflects the cleaned state.
