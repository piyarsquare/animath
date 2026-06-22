---
kind: progress
session: 2026-06-22-S01
date: 2026-06-22
title: Process audit — collaboration patterns across the project
branch: claude/process-audit-collaboration-tvrn9b
slug: process-audit-collaboration-tvrn9b
status: completed
build: n/a
followup: null
pr: null
app: docs, general
signals: needs-dan
next: Audit the 90 progress reports + 38 handoffs + git history for recurring strengths, weaknesses, and repeated errors; assess whether the report patterns are working.
---

# Process audit — collaboration patterns across the project

## Session purpose

Consolidate what we've learned about *how we work together* across animath —
and what we keep failing to learn (the same classes of error recurring). Conduct
an audit of the progress reports, handoffs, and git history to identify
strengths, weaknesses, areas to improve/expand, and process changes that could
improve our ability to work together. Key question: **are the report patterns
successful?**

## Previous session

Not a continuation. Latest handoff across all branches is
[`complex-numbers-animath-intro-jperz6` · Argand app](../complex-numbers-animath-intro-jperz6/2026-06-22-S01-argand-app.md)
(status: completed, build passing) — a new entry-point app for complex numbers.
This audit is a **new, cross-cutting topic**, not a pickup of that work. First
tracked session on this branch (`process-audit-collaboration-tvrn9b`).

## Working notes

### 🟡 milestone · 17:05 — Findings report written and committed
**Why:** All four audit agents returned and converged; synthesized into the deliverable Dan asked for (findings + recommendations, no process edits this round).

Report at
[`2026-06-22-S01-process-audit-findings.md`](2026-06-22-S01-process-audit-findings.md).
Headline verdict: **report patterns are successful as memory, only partly as a
learning loop** — they faithfully record recurring failures but nothing converts
a thrice-repeated lesson into a process change. Two dominant recurring failures
(W1 "verified headless, never on device" — ~14×, never closed; W2 "build the
feature, then ask" — ~9×). Strengths: honesty rigor, verification batteries,
append-only discipline (zero conflict markers committed), genuine cross-session
continuity. 10 prioritized recommendations across 4 tiers, plus the meta-finding:
promote any lesson appearing in ≥3 reflections into a durable rule + CI check,
then retire it from the recurring list. **Adopting any recommendation is a
separate follow-up** — flagged `needs-dan`.

### 🔵 finding · 16:55 — Handoff + progress-A agents returned: two recurring failures dominate
**Why:** Both the self-reflection digest (38 handoffs) and the progress-A timeline read (18 branches) converge on the same two PROCESS failures; recording before the final agent so synthesis is grounded.

The two self-acknowledged recurring failures, each named by the agents
themselves as the costliest habit, neither institutionalized:
1. **"Verified headless, never on a real device"** — flagged ~14 sessions,
   *never once closed* in any handoff. The one risk flag that recurs unresolved
   across the whole corpus (the topology/SolidWorlds HIGH/MEDIUM chains, by
   contrast, *do* get closed). Under-counted by the `signals:` field
   (`phone-needed`/`visual-unverified` applied ~2× vs ~14× actual).
2. **"Build the full feature, then ask"** — over-iterating before pinning scope
   or getting a reference; ~9 sessions, self-diagnosed repeatedly
   (torus-crash-tile quadrant/tint built-then-trimmed; topology seam 4
   attempt-revert cycles; Argand twice-replaced animations).

Other recurring classes: (C) green check that wasn't a real check (~6 — broken
cell complex passing H₁/χ; chirality probe green on a teleporting world);
(D) missing committed unit tests for testable pure logic (~6 — infra now exists
but new apps still ship without); (F) near-parallel copy instead of factoring +
long branchy files (~5). Strengths: non-fabrication honesty rigor, math
verification batteries, append-only discipline (zero conflict markers ever
committed), strong cross-session continuity (no branch started cold when a
handoff existed). **Why-line discipline genuinely works** (no empty Whys; ~half
carry real causal/mechanistic reasoning) but **format/frontmatter fragility has
real cost** — off-spec entry types + `followup` casing variants forced a full
backfill session because they broke the Reflections scraper. Deferred-decision
bottleneck is the human, specifically for irreversible **catalog/identity**
calls (Argand↔Plane Transform, Stable Marriage↔Matching, Solid Worlds rename —
all still open) and teaching-claim validation.

### 🔵 finding · 16:48 — Git-history agent returned: rework is real but absorbed pre-merge
**Why:** First of four audit agents completed; recording before synthesis so the signal isn't lost if context is discarded.

50 squash-merged PRs (#172→#229) over 22 days, ~2.4 PRs/day, linear history,
153 Claude co-author trailers / 673 squashed sub-commits. **~10% of sub-commits
are corrective** but almost all are paid down *inside* the feature branch before
merge — only 3 of 50 PRs were standalone fix PRs. Append-only shared-file
discipline (CLAUDE.md touched in 25 PRs, apps.ts 13, index.tsx 12) is holding —
**no conflict markers ever committed to tracked files**; the one near-miss was
`package.json` (not on the append-only list — candidate to add). The single
defect class that escapes the desktop `tsc && vite build` gate: **mobile/runtime
regressions** (#215 height, #216 Torus crash on phones) — device-specific, so
invisible to CI. Message hygiene strong (2 auto-named `Claude/<slug>` titles the
only blemish). Three remaining agents (handoffs, progress A, progress B) running.

### 🟣 decision · 16:40 — Scope set: evidence-grounded findings report, full-corpus agent-assisted
**Why:** Dan chose "Findings report + recommendations" as the deliverable (no process edits this round) and "Full corpus, agent-assisted" depth.

Plan: fan out 4 sub-agents over the corpus, each returning *structured findings*
(not file dumps): (1) all 38 handoffs → recurring-error frequency analysis from
the Self-reflection sections + follow-up values; (2) progress reports group A;
(3) progress reports group B; (4) git history → revert/fixup/build-break/merge
patterns and commit-message quality. Then synthesize into a committed audit doc.
Deliverable is analysis + recommendations only — implementing the changes is a
separate follow-up.

### 🟡 milestone · 16:36 — Session started; oriented for the process audit
**Why:** start-session skill — read latest handoff + backlog, established this is a meta/process topic spanning all branches, not a single-app task.

Inventory at start: **90 progress reports**, **38 handoffs** across **~33 branch
folders** under `docs/sessions/`. A directly-relevant backlog item already exists
— `[docs] !high Productionize the signals/to-do system — teach agents to author
it` — which this audit should inform. Waiting for Dan to confirm scope/approach
before reading the corpus.
