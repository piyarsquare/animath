---
kind: handoff
session: 2026-06-22-S01
date: 2026-06-23
title: Process audit — findings enacted (ledger, recipes, report linter + CI gate)
branch: claude/process-audit-collaboration-tvrn9b
slug: process-audit-collaboration-tvrn9b
status: completed
build: passed
followup: low
pr: null
app: docs, general
signals: needs-dan
next: Build the L1 deep-link debug-pose harness + headless mobile smoke (highest-ROI rule→check still open; TODO.md), and have Dan close the standing catalog/identity decisions (rec 8).
---

# Process audit — findings enacted (ledger, recipes, report linter + CI gate)

> [!NOTE]
> Docs/process work only — **no app code changed**. The deliverable is the
> process machinery itself. Verified by `npm run build`, `npm run sessions`, and
> `npm run sessions:lint -- --strict`; nothing here runs in a WebGL context, so
> no device check applies.

## Summary

A cross-corpus audit of how we collaborate (90 progress reports + 38 handoffs +
50 squash-merged PRs) found the report system is **excellent at recording
lessons and had no mechanism for enacting them** — a lesson could recur a dozen
times and only ever be re-written. This session built that missing half: a
**report linter** that makes digest-breaking drift loud (now a blocking CI gate),
a **recurring-lessons ledger** that promotes a ≥3×-recurring lesson into a durable
rule and retires it, the **promotion of the three dominant lessons into rules**,
and a **recipes cookbook** that recasts those rules as if-this-then-that triggers
(Dan: *rules get ignored, recipes get followed*). The loop is now closed and
self-maintaining. What remains is genuine tooling (a debug-pose harness) and the
catalog/identity decisions only Dan can make.

## What changed

Landed across four commits (`bb3a581` linter → `8fa060c` ledger+rules →
`95f6ea0` recipes+CI → `026557b` blocking gate + W2 refinement):

- **Report linter** — `docs/sessions/lint-sessions.mjs` (+ `npm run sessions:lint`,
  `--strict` for CI). Validates frontmatter enums, `slug==folder`, resolvable
  `app`/`signals` tokens, a scraper-parseable Self-reflection level, and
  closed-vocab timeline types. First run: 31 errors / 118 warnings — all matching
  audit findings. Hardened the scraper (`build-sessions.mjs`) to tolerate non-ASCII
  hyphens + bold-wrapped levels → **recovered 13 silently-dropped reflections**.
  Backfilled the genuine errors → **0 errors**; 140 advisory warnings remain
  (legacy, deliberately not mass-rewritten across other branches).
- **Recurring-lessons ledger** — `docs/sessions/RECURRING_LESSONS.md`: the seven
  ≥3×-recurrence lessons (L1–L7) with a Status ladder (🔴 Open → 🟡 rule → 🟢
  rule+check → ⚪ Intrinsic), where each rule + check lives, and a **quarterly
  cadence**. The write→READ→ENACT→RETIRE loop.
- **Three lessons promoted into rules** — W2 "build then ask" → scope/reference
  gate atop `BUILDING_AN_APP.md`; W4 "untested pure logic" → §6/§7 + `npm test`;
  W3 "green check that isn't real" → self-reflection **Q7**.
- **Recipes cookbook** — `docs/sessions/RECIPES.md`: L1–L4 as WHEN/THEN/DONE-WHEN
  recipes, wired into `/start-session` (step 6).
- **CI gate** — `deploy.yml` runs `sessions:lint -- --strict` as a **blocking**
  step. `--strict` fails only on errors (corpus is at 0), so advisory warnings
  don't trip it; a future digest-breaker now fails the deploy.
- **W2 refined (Dan, 06-23)** — separated **avoidable thrash** (guessing at a
  knowable target) from **exploratory iteration** (the target is only discoverable
  by building; over-planning can stall it). The lever is **sharper inputs in other
  modalities**, not more planning. Folded into recipe R2, ledger L2, and the guide
  callout.

## Key files

| File | Role |
|---|---|
| [`docs/sessions/RECURRING_LESSONS.md`](https://github.com/piyarsquare/animath/blob/026557b/docs/sessions/RECURRING_LESSONS.md) | The write→enact ledger — L1–L7, Status ladder, cadence. The audit's core deliverable. |
| [`docs/sessions/RECIPES.md`](https://github.com/piyarsquare/animath/blob/026557b/docs/sessions/RECIPES.md) | If-this-then-that cookbook (R1–R4); read at session start. |
| [`docs/sessions/lint-sessions.mjs`](https://github.com/piyarsquare/animath/blob/026557b/docs/sessions/lint-sessions.mjs) | The report linter; `--strict` exits non-zero **only on errors** (line ~262). |
| [`.github/workflows/deploy.yml:37`](https://github.com/piyarsquare/animath/blob/026557b/.github/workflows/deploy.yml#L37) | Blocking `sessions:lint -- --strict` CI step. |
| [`docs/BUILDING_AN_APP.md:21`](https://github.com/piyarsquare/animath/blob/026557b/docs/BUILDING_AN_APP.md#L21) | Scope/reference gate callout (W2), with the exploring-vs-guessing refinement. |
| [`.claude/prompts/self-reflection.md`](https://github.com/piyarsquare/animath/blob/026557b/.claude/prompts/self-reflection.md) | Q7 (is-the-check-real) + ledger pointer. |
| [`.claude/skills/start-session/SKILL.md:60`](https://github.com/piyarsquare/animath/blob/026557b/.claude/skills/start-session/SKILL.md#L60) | Step 6 now reads RECIPES.md. |
| [`docs/sessions/progress/process-audit-collaboration-tvrn9b/2026-06-22-S01-process-audit-findings.md`](https://github.com/piyarsquare/animath/blob/026557b/docs/sessions/progress/process-audit-collaboration-tvrn9b/2026-06-22-S01-process-audit-findings.md) | The full findings + recommendations, with the adoption scorecard banner. |

## Open / not done

- **Rec 2/3 — debug-pose harness + headless mobile smoke** (`!high` in `TODO.md`).
  A URL param driving camera/world/pose for `shoot.mjs` + an opt-in dev HUD, plus a
  390×844 smoke pass asserting no console error / no NaN-in-shader. Highest tool-ROI
  item; requested independently 3× across the topology sessions. Own branch — it
  touches app/scripts/CI, not docs. This is the one thing that would actually close
  W1 ("verified headless, never on device"), still 🟡 rule-only.
- **Rec 5 follow-up** — back-fill `complexOps.ts` (and Trees-and-nets) vitest files.
- **Rec 7** — make `signals:` required at handoff or auto-derive it from the prose;
  the linter currently only *warns* when a report says "headless" with no signal.
- **Rec 10** — add `package.json` to the append-only protected-file list (`!low`).
- **Rec 9** — a "sandbox gotchas" doc (not yet filed).

> [!IMPORTANT]
> **Rec 8 needs Dan.** The standing irreversible catalog/identity calls have sat
> open the entire 22-day window and only he can move them: Argand vs. Plane
> Transform (supersede or coexist?), Stable Matching's fate (keep unlisted or
> delete?), Solid Worlds → Manifold Walk rename?, the plane/particles unification
> model. They block nothing technical but compound ambiguity every session.

## Context

- **The most leveraged human-side change** (Dan asked, and accepted with a
  caveat): supply scope + a reference *in any modality* up front for visual work.
  His caveat is now first-class in the process — exploratory building is legitimate
  and over-planning can stall; the target is found *by* building. So R2 distinguishes
  the honest first probe (keep it small + reversible) from the third revert cycle on
  something a cheap reference would have settled. Don't read R2 as "always plan first."
- **Coordination note (now resolved):** mid-session the report-style/template/
  reflection files were owned by a separate Dan thread; he later merged them into
  this branch and approved editing them, which is why Q7 and the ledger pointers
  live there now.
- **Why the CI gate is safe to block:** `--strict` is `process.exit(strict &&
  totalErr ? 1 : 0)` — errors only. The 140 advisory warnings (legacy `build:
  passing`, off-spec timeline types, headless-no-signal) are *not* errors and will
  not fail CI. Promoting the warnings to errors later would need a corpus cleanup
  first; not done deliberately (would fight in-flight branches).

## Self-reflection

1. **What would you do with another session?** Build the Rec 2/3 debug-pose harness
   + mobile smoke — it's the only item that converts the dominant recurring failure
   (W1/L1) from rule-only to rule+check, and the corpus has asked for it by name
   three times. Also back-fill `complexOps.ts` tests to close Rec 5.
2. **What would you change about what you produced?** The recipes and the prose
   rules now say overlapping things in three places (BUILDING_AN_APP callout,
   RECIPES.md, the ledger). That's intentional redundancy for discoverability, but
   it's now three spots to keep in sync — if they drift, the cookbook should win.
   I'd consider making the prose rules *point at* the recipe rather than restate it.
3. **What were you not asked that you think is important?** Whether the blocking CI
   gate should fail the *deploy* (it does now) or just a *PR check* — a malformed
   session report will currently block the site from deploying, which is arguably
   too coupled. Worth revisiting if it ever bites.
4. **What did we both overlook?** Rec 9 (the sandbox-gotchas doc) never got filed
   to TODO.md — it's the one recommendation with no home now. Minor, but it's the
   kind of thing this very audit exists to stop dropping.
5. **What did you find difficult?** Nothing technically hard; the judgment call was
   calibrating R2 so it didn't over-correct into "always plan," which Dan explicitly
   pushed back on. Encoding a tension (explore vs. don't-guess) as a usable recipe
   rather than a platitude took a couple of passes.
6. **What would have made this task easier?** A pre-existing convention for where
   cross-cutting process docs live (ledger/recipes/lint all landed in
   `docs/sessions/` by analogy, not by a stated rule).
7. **How did you verify this, and does each passing check test the user-visible
   claim?** Method: `npm run build` (green, 7.4s), `npm run sessions` (green,
   registry drift none), and `npm run sessions:lint -- --strict` (exit 0). These
   genuinely test the user-visible claims here, because the "product" *is* the
   reports/linter/build — the check and the deliverable are the same artifact, the
   rare case where a green check isn't a proxy. **L1 honesty:** no WebGL/visual/
   device surface was touched, so `visual-unverified`/`phone-needed` correctly do
   not apply (set `needs-dan` only, for rec 8). The one thing I did *not* verify is
   the blocking CI gate firing on a real malformed report in GitHub Actions — I
   verified the exit-code logic by reading it and running `--strict` locally, not by
   pushing a deliberately broken report.
8. **Follow-up value:** LOW — the loop is closed and self-maintaining; the open
   items are a separate tooling branch (harness) and Dan-only decisions, both
   tracked. Nothing here is at risk of being wrong.
