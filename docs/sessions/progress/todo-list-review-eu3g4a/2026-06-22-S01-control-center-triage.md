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
next: Talk through Bucket C (the Solid Worlds in-flight cluster — likely done-but-unmarked) and Bucket D (TODO backlog); decide attribution scope (A/B/C) and whether to bring in PR #222.
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

### Bucket B — needs-dan decisions (Dan's dispositions, 2026-06-22)

| # | Report | Disposition |
|---|---|---|
| 1 | **Attribution policy** (`polygon-world-app-review-8dduma`) | Adopted but never **back-propagated**. Sub-agent scoped the gap (below): 11 EXPLAINERs lack the "Possible sources" block. Scope decision (A/B/C) pending. |
| 2 | **Solid Worlds name** (`solid-worlds-review`, `3d-manifold-worlds`) | **Leave the name** — "not a real problem." Dropped the naming `needs-dan` signal; status deferred to the Bucket C talk-through. |
| 3 | **Argand / fresh-complex-app plan** (`complex-numbers-animath-intro`) | **Keep the name, keep its position** (successor-in-progress to Plane Transform). Flipped the plan `proposed → executed`. |
| 4 | **Complex Particles multi-function plan** (`three-hats-particle-app`) | Sub-agent investigated `claude/sleepy-bardeen-uk0cal` / PR #222 (below). That branch is **complementary to**, not an implementation of, the multi-function plan. |
| 5 | **Explainer-page series** (`complex-particles-guide`) | Genuinely needs review — **medium signal, not a brief decision.** Left flagged as a future review. |

### Bucket C — "in flight" branches (the talk-through)

What's actually open, and whether each is live work or really done-but-unmarked:

- **Argand** (`complex-numbers-animath-intro`, `phone-needed`) — app is **live**
  (`#/argand`); plan now `executed`. Only loose end: mobile verification.
- **Solid Worlds cluster** — three in-progress branches that each *resumed* the same
  app, which is now **live** (`#/solid-worlds`, 8 platycosms per CLAUDE.md):
  - `solid-worlds-review-bju3pc` (06-19) — homology rework; superseded by →
  - `3d-manifold-worlds-imwmal` (06-20) — finished the screw fix + −a2; naming parked.
  - `animath-space-worlds-hm7wui` (06-20) — "resume / orient on a fresh branch."
  - `solid-worlds-decor-refactor` (06-21, **completed**) — Rooms decor, the latest.
  Likely all done-but-unmarked — a Bucket-A-style confirm-and-flip, pending Dan.
- **`claude/sleepy-bardeen-uk0cal`** (PR #222, **open, not merged**) — a real,
  not-in-main Complex Particles UX improvement; see finding below. A bring-it-in call.

### Bucket D — the `TODO.md` backlog (the durable list)

14 open items (2 `!high`, ~7 `!med`, ~5 `!low`). Several are quick doc reconciles
(e.g. agentic-sorting EXPLAINER still names a removed Replicate panel; the missing
"Possible sources" blocks = item #1). Hand-curated; separate from the status/signal
cleanup above. To talk through with Dan.

## Sub-agent findings

### Attribution back-propagation (item #1)

The "Possible sources & where to go further" block is required at the end of each
app's EXPLAINER (or guide). **3 apps complete** (Argand, PolygonWorlds, SolidWorlds);
**11 EXPLAINERs missing it** — 4 already in TODO (ComplexParticles, PlaneTransform,
Correspondence, TreesAndNets) + 7 more (AgenticSorting, FractalsGPU, StableMarriage,
StableMatching, TopologyWalk, TrinaryStars, legacy Fractals [no EXPLAINER at all]).
Every missing app already has a `docs/apps/*.md` guide whose named sources **seed**
the block, so it's a copy-down-and-tighten job, not fresh research. Effort ≈ 2–3 h
for 10 priority apps. Options: **A** (4 TODO apps, ~45 min) · **B** (all 10) ·
**C** (A now, B as a follow-up docs pass).

### `claude/sleepy-bardeen-uk0cal` / PR #222 (item #4)

**Open, not merged; `mergeable_state: dirty`** — conflicts only on the append-only
docs (CLAUDE.md/README.md/TODO.md), trivially keep-both. 16 commits ahead / 6 behind;
merge-base 2026-06-16. **Genuinely not in main** by content (new
`src/lib/functionHandoff.ts`, `layoutCaptions`, `posture` absent from main). A
conservative, additive UX pass on **Complex Particles + Plane Transform**: a calm
default + five "posture" layouts (default stops parking the 4D-rotation rig over the
plot); per-function recommended-view presets; opt-in layout captions; and a pure URL
codec handing a function across the two apps (+ vitest). High-value, low-risk.
**Not** the multi-function plan — it's the *control-surface* taming that plan's pair
mode would later plug into as a sixth posture. Verdict: worth bringing in (re-sync,
keep both doc entries, re-run build); at minimum keep the `functionHandoff` codec +
the generic `layoutCaptions` chrome feature.

## Working notes

<!-- Newest entry first. -->

### 🔵 finding · 12:40 — Sub-agents returned: attribution gap scoped; PR #222 is live, valuable, not-in-main
**Why:** Items #1 and #4 each needed investigation beyond a glance.

Attribution: 11 EXPLAINERs miss the sources block, all seedable from the existing
per-app guides (~2–3 h, phased A/B/C). sleepy-bardeen / PR #222: open + conflicting
only on append-only docs, genuinely not in main, a clean additive Complex Particles
+ Plane Transform UX improvement (postures + per-function presets + opt-in captions +
a cross-app function codec); complementary to — not an implementation of — the
multi-function plan. Full detail under "Sub-agent findings".

### 🟢 code · 12:25 — Logged Dan's Bucket B dispositions (#1–#5); two bookkeeping edits
**Why:** Five parked decisions answered; record them and clear the resolved signals.

#3 Argand: plan → `executed` (keep name + position). #2 Solid Worlds: leave the name;
dropped the naming `needs-dan` on `3d-manifold-worlds-imwmal`. #1 attribution + #4
sleepy-bardeen → dispatched sub-agents (results above). #5 explainer-series: left
flagged as a medium review. Next: talk through Bucket C + D.

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
