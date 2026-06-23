---
kind: progress
session: 2026-06-23-S01
date: 2026-06-23
title: Repo priorities review — what to do next
branch: claude/repo-priorities-review-1kse64
slug: repo-priorities-review-1kse64
status: in-progress
build: unknown
followup: null
pr: null
app: docs
signals: needs-dan
next: Pick the top item(s) from the prioritized list and spin a focused session/branch.
---

# Repo priorities review — what to do next

## Session purpose

Dan: "use our app map and session information to identify the most important next
items in the repo." A triage/orientation pass — read the backlog, the roadmap, the
recent handoffs, and the open PRs, then surface the highest-leverage next work. No
implementation.

## Previous session

First tracked session on this branch. Most recent landed work (both 2026-06-23):
the **headless debug-pose harness + mobile smoke** (#234, `headless-mode-plan`) and
the **screenshot tour** (#235, `gracious-ptolemy`). The last triage pass was
`todo-list-review` (2026-06-22): control-center cleanup + the self-auditing App-map.

## Working notes

### 🟢 code · 23:40 — Shelved #223 (quaternion / The Belt) as stopped; app code dropped
**Why:** Dan: "223 was not a successful app — shelf as stopped, but all quaternion
app code can go away entirely; commit skills only as provisional."

Decision (Dan-picked): **land the record on `main`, close #223.** The Belt app code
(`src/animations/TheBelt/` + registry edits to `apps.ts`/`catalog.ts`/`previews.tsx`/
`index.tsx`/`CLAUDE.md`/`README.md`) was never on `main` and is **not** brought over —
it dies with the branch. Onto this branch I checked out **only** the exploration
reports (the full record incl. the hard-fail reflection) and the `/explore-concept`
skill. Then:
- Handoff S08 → `status: stopped`, `followup: null`, new SHELVED `[!CAUTION]` banner;
  `next:` rewritten to "shelved, do not resume by extending."
- 15 live reports (4 `in-progress` + 11 `proposed` plans) → `status: stopped` so the
  dashboard shows no active/awaiting-Dan quaternion work; 18 genuinely-`complete`
  artifacts left as-is.
- `/explore-concept` skill marked **provisional**: `status: provisional` +
  `PROVISIONAL/EXPERIMENTAL` description prefix + a `[!CAUTION]` banner pointing at the
  hard-fail diagnosis. (Per Dan's standing rule: commit skills only as provisional.)
- Build unaffected (docs/skill only; nothing under `src/` changed).
Next: close PR #223 pointing at this shelving.

### 🔵 finding · 23:19 — Synthesized the prioritized next-items list
**Why:** The session focus is to identify, not implement; this is the deliverable.

Read `TODO.md`, `PLAN.md`, the three most recent handoffs (todo-list-review,
headless-mode-plan, gracious-ptolemy), recent `main` log (#229–#235 landed), and the
two open PRs (#230 postures, #223 quaternion scoping). Sorted the corpus into:
content/pedagogy work (Argand explainer, Counting-the-Ways Lab), known real bugs
(RGBELoader HDR), de-risking (hardware phone pass), process leverage (productionize
signals/to-do), and the next app wave (`lib/spectral`). Presented to Dan for a pick.

### 🟣 decision · 23:15 — Treat this as analysis, deliver the ranked list
**Why:** `/start-session` says stop after the summary, but the explicit focus is the
prioritization itself — so the summary *is* the ranked recommendation, then wait.

## Candidate next items (working list)

See the chat summary for the full reasoning. Top contenders, by leverage:

1. **`[docs] !high` — Productionize the signals/to-do system** (process leverage;
   the one `!high` in the backlog).
2. **Open PRs need landing/closing** — #230 (Complex Particles postures) awaits
   review/merge; #222 to be closed in its favor; #223 (quaternion scoping) is a
   draft awaiting a re-run decision.
3. **`[complex-particles] !med` — Argand explainer + tools** for complex/dual/
   split-complex (the app is built, needs the teaching layer + "get played" time).
4. **`[counting-the-ways] !med` — cumulative Lab** (Dan flagged 2026-06-23: "the lab
   needs work, showing cumulative results").
5. **`[complex-particles] !low` — RGBELoader HDR fix** (small, real, isolated bug).
6. **`PLAN.md` "Now" — hardware phone pass** on the chrome overhaul (de-risk the
   largest recent change; needs a real device — Dan-gated).
7. **Next app wave — `lib/spectral` first** (unlocks 4 apps; deliberate effort).

## Self-reflection

_(to be filled at handoff)_
