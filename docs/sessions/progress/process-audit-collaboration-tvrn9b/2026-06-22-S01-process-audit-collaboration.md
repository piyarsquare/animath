---
kind: progress
session: 2026-06-22-S01
date: 2026-06-22
title: Process audit — collaboration patterns across the project
branch: claude/process-audit-collaboration-tvrn9b
slug: process-audit-collaboration-tvrn9b
status: in-progress
build: passed
followup: null
pr: null
app: docs, general
signals: needs-dan
next: Build the L1 deep-link debug-pose harness + headless mobile smoke (the one rule→check still open; see RECURRING_LESSONS.md + TODO.md) and decide whether to CI-gate `npm run sessions:lint --strict` now that the corpus is at 0 errors.
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

### 🟡 milestone · 06-23 — Phases 3–4 shipped: the write→enact loop is now real
**Why:** Phase 1 built the *detector* (linter); the audit's meta-finding was that the system records lessons but never enacts them. Phases 3–4 close that — promote the dominant recurring lessons into durable rules and stand up the ledger that retires them.

- **Phase 4 (promote W2/W3/W4 into the rules):**
  - W2 "build then ask" → a `[!IMPORTANT]` scope/reference gate at the top of
    `BUILDING_AN_APP.md` (ask the disambiguating question before coding geometry /
    >2-mode features).
  - W4 "untested pure logic" → a §6 "Test pure logic on write" convention + a §7
    checklist line + `npm test` in the Verify block.
  - W3 "green check that isn't real" → self-reflection **Q7** (already in flight):
    name the verification method and whether each passing check tests the
    user-visible claim; set the matching `signals:`.
- **Phase 3 (the write→enact mechanism):** new
  [`docs/sessions/RECURRING_LESSONS.md`](../../RECURRING_LESSONS.md) — a ledger of
  the seven ≥3-recurrence lessons (L1–L7) with a Status (Open → Promoted rule →
  Promoted rule+check → Intrinsic), where each rule + check lives, and a documented
  **cadence** (re-run an audit of this shape ~quarterly / when the digest's top
  cluster isn't yet in the ledger). Wired into `REPORT_STYLE.md` and the
  self-reflection protocol so a recurring promoted lesson gets *reopened*, not
  re-logged. The report-format fragility class is recorded as the one already at 🟢
  rule+check (REPORT_STYLE + `sessions:lint`) — the template for the rest.
- **Backlog:** noted partial progress on the `[docs] !high` signals item; filed the
  two speced-but-unbuilt checks (L1 deep-link debug-pose harness + headless mobile
  smoke; `package.json` → append-only list) as their own TODO items (former Phase 5).

Verify: `npm run sessions:lint` still 0 errors / 140 advisory warnings; `npm run
sessions` green, `registry drift: none`. **Self-disclosure (L1, honestly):** all of
this is docs/process — verified by the linter + sessions build, *not* in a running
WebGL context; no app code changed, so no device check applies.

### 🟢 code · 19:20 — Phase 1 shipped: report linter + scraper hardening recovers 13 dropped reflections
**Why:** Build the validator that makes digest-breaking drift visible, and enact the "scraper hardening" lesson the category-filter session named and deferred — closing a twice-written, never-acted loop.

New `docs/sessions/lint-sessions.mjs` (+ `npm run sessions:lint`, advisory by
default / `--strict` for CI) validates every report against the contract:
frontmatter enums, `slug==folder`, resolvable `app`/`signals` tokens, a
scraper-parseable Self-reflection level, and closed-vocab timeline types. First
run found **31 errors / 118 warnings** — all matching audit findings (24
headless-no-signal = W1; 19 off-spec timeline types = the polygon-walk drift; 13
bold-wrapped Follow-up levels silently dropping from the digest).

Root-cause fixes (single-file, no cross-branch report rewriting):
- **Hardened the scraper** (`build-sessions.mjs:41`) to tolerate non-ASCII
  hyphens + bold/italic-wrapped levels → **13 reflections recovered** (70→83 of
  83 parse; digest 44 entries). Unit-tested.
- **Taxonomy drift fixed** — `argand` + `solid-worlds` were shipped apps missing
  from `categories.mjs` (12 reports' chips misresolved); added them + slug
  overrides. The linter caught a registry↔taxonomy gap the App-map's guide-drift
  check doesn't cover.
- Accepted `executed` as a real plan status (badge greens it); `complete` is now
  a soft nudge. Backfilled 2 genuine errors on dead branches (Stable Marriage
  deleted, agentic-sorting merged) → **0 errors, `--strict` passes**.

140 advisory warnings remain (legacy `build: passing`, off-spec types,
headless-no-signal) — surfaced for going-forward discipline, deliberately **not**
mass-fixed across other branches (preserving append-only discipline).

### 🟣 decision · 18:30 — Productionize the loop: Phases 1–4 on this branch
**Why:** Dan declared the report-style/template/reflection files in-scope (now merged into this branch) and approved Phases 1–4; this is the `[docs] !high` "productionize the signals/to-do system" backlog item, the audit's own top lever.

Sequence (my call): **Phase 1** report linter (`npm run sessions:lint`,
`lint-sessions.mjs`) → **Phase 2** make `signals:` trustworthy → **Phase 3**
recurring-lessons ledger + cadence (the write→enact mechanism) → **Phase 4**
promote W2/W3/W4 into `BUILDING_AN_APP.md` + the self-reflection protocol. Phase 5
(debug-pose harness, mobile smoke, append-only `package.json`) is specced as
TODOs, not built here (it touches app/scripts/CI — own branches). Linter runs
**advisory** first (warns on the historical corpus; never rewrites other
branches' reports), CI-gating deferred until the corpus is clean.

### 🔵 finding · 18:10 — Merged main; reviewed the control-center self-audit; it confirms the meta-finding
**Why:** Dan asked to pull main, review the latest control-center changes, and see how the recent control-center sessions intersect with this audit.

Merged `origin/main` (clean — Stable Marriage deleted, 9 EXPLAINER source
blocks, the self-auditing App-map). `npm run build` and `npm run sessions` both
green; 132 reports now (my two audit docs included). The newest control-center
work is the **registry↔guides self-audit** (`build-sessions.mjs`): it parses
`src/apps.ts` from main and badges App-map cards `⚠ no guide` / `⚠ retired`,
with a drift callout. **The intersection is exact:**

- The triage session (`todo-list-review-eu3g4a`) built the *structural* half of
  my **meta-finding** — a CI-style check that promotes a recurring drift class
  into an automated detector — and its own #1 next step is the **same** as my
  Tier-3 recs: *"productionize the signals/to-do system… nothing yet enforces
  that a new app ships with a guide or that a session declares its signals."*
  Detection without enforcement = surfaced-but-not-enacted.
- The category-filter session's "Open / not done" **named my Tier-3 #6 (lint the
  reports) verbatim** — *"Making the regex tolerant would stop the problem
  recurring. Left as a judgment call"* — then the same format drift recurred
  (off-spec entry types in `polygon-walk-continue`). A lesson written twice,
  enacted zero times: the precise failure my audit names.
- Live proof of the gap: the drift check currently fires `stable-marriage
  (retired)` because the 6 dead branches the triage flagged for deletion (403-
  blocked) still carry the retired guide at their tips. The detector works; the
  enforcement/cleanup it implies is stuck on a human/permission step.

> [!IMPORTANT]
> **Coordination constraint discovered:** the triage handoff says report-style /
> template / reflection-protocol changes are *owned by a separate thread Dan is
> running* — do not edit `REPORT_STYLE.md`, `_template-*.md`, or
> `self-reflection.md` here. My Tier-3 recommendations are **input to that
> thread**, not work for this branch. This branch stays findings-only.

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
