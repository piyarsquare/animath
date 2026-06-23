<!-- docs/sessions/RECURRING_LESSONS.md — the write→enact ledger.
================================================================================
HAND-CURATED. This is the missing half of the report system. The session reports
are excellent at *recording* lessons (every handoff's `## Self-reflection`, scraped
into the control center's Reflections digest) but had no mechanism for *enacting*
them: a lesson could recur a dozen times and still only ever be re-written, never
turned into a rule. This ledger is that mechanism.

THE LOOP (the meta-finding of the 2026-06-22 process audit):

  1. WRITE   — each session writes its `## Self-reflection`; the digest surfaces
               the recurring follow-ups (npm run sessions → Reflections view).
  2. READ    — on a cadence (see below), re-scan the digest for any lesson that
               appears in ≥3 reflections and isn't already enacted here.
  3. ENACT   — promote it: write a durable RULE (a line in BUILDING_AN_APP.md /
               CLAUDE.md / a skill / the self-reflection protocol) and, where
               possible, a CHECK (a linter rule, a test, a CI gate) that makes the
               drift visible automatically.
  4. RETIRE  — record it here as PROMOTED with where the rule + check live, so it
               stops being re-discovered. A promoted lesson that recurs anyway is a
               sign the rule isn't landing — reopen it, don't just re-log it.

CADENCE — run a process audit of this shape roughly quarterly (or whenever the
Reflections digest's top-severity cluster is something not yet in this ledger).
The audit is: read the digest → fill/advance this ledger → land the rules+checks.
The first pass was 2026-06-22 (`process-audit-collaboration-tvrn9b`).

WHEN YOU TOUCH THIS FILE: it is not append-only chrome — it's a living ledger.
Advance an entry's Status, don't just append a duplicate. Keep L-numbers stable
(BUILDING_AN_APP.md cites L2 and L4 by number).
================================================================================
-->

# Recurring lessons ledger · animath

The promote-and-retire loop that closes the report system. Background: the
[process-audit findings](progress/process-audit-collaboration-tvrn9b/2026-06-22-S01-process-audit-findings.md)
("**the system is excellent at recording lessons and has no mechanism for enacting
them**"). Each entry is a lesson that recurred across **≥3** session reflections;
**Status** tracks how far it's been turned into a rule + an automated check.

Promoted lessons that have a clean trigger are also enacted as **if-this-then-that
recipes** in [`RECIPES.md`](RECIPES.md) — the cookbook agents read at session start
(L1–L4 → R1–R4). Norms get skimmed past; recipes get followed, so prefer adding a
recipe there when you promote an entry below.

Status legend:

- 🔴 **Open** — recurs; not yet promoted to a durable rule.
- 🟡 **Promoted (rule)** — a written rule now exists; no automated check yet, so
  drift is still caught only by review.
- 🟢 **Promoted (rule + check)** — a rule *and* a detector (linter / test / CI)
  exist; recurrence should now surface automatically.
- ⚪ **Intrinsic** — a genuine difficulty, not a process gap; the remedy is a
  practice to respect, not a rule to enforce.

| # | Recurring lesson | ~Freq | Status | Rule lives in | Check |
|---|------------------|-------|--------|---------------|-------|
| **L1** | Verified headless, never on a real device — visual/touch/"feel" claims ship as hypotheses; the one defect class that escapes CI is mobile/runtime | ~14 | 🟡 Promoted (rule) | self-reflection Q7 (declare the method + set `visual-unverified`/`phone-needed`); `signals:` in REPORT_STYLE §1.2 | Linter heuristic warns when a handoff says "headless/unverified" but declares no signal (`lint-sessions.mjs`). **Missing the positive check:** the deep-link debug-pose harness + headless mobile-viewport smoke (Tier-1 recs 2–3) — see TODO.md |
| **L2** | Build the full feature, then ask — the maximal/wrong-reading version finished before a cheap "how far / which meaning?" check; 3–5 build-revert cycles. *Refined 2026-06-23:* the cost is **avoidable thrash** (a knowable target guessed at), not **exploratory iteration** (the target is only discoverable by building) — the lever is sharper inputs (a reference in any modality), not more up-front planning | ~9 | 🟡 Promoted (rule) | `BUILDING_AN_APP.md` top callout + recipe **R2** ("separate exploring from guessing") | Not automatable; relies on the build-flow reflex + three-hats reviews |
| **L3** | A green check that wasn't a real check — an invariant/probe passed while the user-visible result was wrong (matching H₁/χ on a broken complex; chirality probe green on a teleporting world) | ~6 | 🟡 Promoted (rule) | self-reflection Q7 ("does each passing check test the user-visible claim?") | No generic detector possible; the harness in L1 would have caught the specific topology cases |
| **L4** | Missing committed unit tests for testable pure logic — pure math/engine verified with throwaway `/tmp` scripts that never land, despite the vitest harness existing | ~6 | 🟡 Promoted (rule) | `BUILDING_AN_APP.md` §6 ("Test pure logic on write") + §7 checklist | No detector yet (can't tell a "should-be-tested" module from a view); could later assert per-app `__tests__/` coverage of `lib/`-style helpers |
| **L5** | Near-parallel copy instead of factoring; long branchy files — a near-duplicate engine/component flagged as "the debt the next session pays" (~340-line decor, ~600-line plane, ~650-line component) | ~5 | 🔴 Open | — | — (candidate: a soft size/duplication lint, deliberately not added — would fight in-flight branches) |
| **L6** | Estimating complexity before reading the code it touches — "scoped as pure data before reading the gluing assumptions"; "installed a lint ruleset blind, then triaged 95 out-of-scope errors" | ~4 | 🔴 Open | — | — (overlaps L2's "pin scope" reflex; read the touched code before estimating) |
| **L7** | Reasoning about orientation/chirality without seeing it — the *intrinsic* hardness of handedness bookkeeping (the screw bug was "two independent bugs"; only the determinant settled three self-consistent ℝP² models) | ~6 | ⚪ Intrinsic | practice: front-load a reference + a det/continuity check before moving any symmetry (noted in W7 of the findings) | the L1 harness makes the visual check possible; the math check is per-app (det/continuity probes) |

## How report-system fragility was closed (the meta-lesson)

The report *format* breaking the digests silently (off-spec timeline types,
non-ASCII hyphens, bold-wrapped `Follow-up value`, non-enum `followup:`/`signals:`)
recurred and forced a full hand-backfill once. That class is now **🟢 Promoted
(rule + check)**: the contract is documented in `REPORT_STYLE.md` and validated by
`npm run sessions:lint` (`docs/sessions/lint-sessions.mjs`). The deploy workflow now
runs `sessions:lint -- --strict` as a **non-blocking** step (`continue-on-error`), so
off-spec reports surface in CI logs; promote it to a hard gate once it's proven quiet.
The scraper was also hardened to tolerate the historical variants. This
is the template for every other entry: a written contract **plus** a detector that
makes the next drift loud instead of silent.

## Still to enact (tracked in `TODO.md`)

The two highest-ROI checks named by the audit are speced but not built — they live
in the backlog so this ledger stays honest about what is rule-only vs rule+check:

- **L1 positive check** — deep-link debug-pose harness (URL → camera/world/pose for
  `shoot.mjs`) + an opt-in dev HUD, and a headless mobile-viewport smoke pass
  (390×844, assert no console error / no NaN-in-shader across routes). Requested
  independently three times across the topology sessions.
- Add **`package.json`** to the append-only protected-file list (the one real
  conflict-marker near-miss landed there, not in CLAUDE.md/apps.ts/index.tsx).
