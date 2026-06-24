---
kind: handoff
session: 2026-06-23-S01
date: 2026-06-23
title: Repo priorities triage — shelve #223, merge #230, signal sweep, signals/to-do productionized
branch: claude/repo-priorities-review-1kse64
slug: repo-priorities-review-1kse64
status: completed
build: passed
followup: low
pr: null
app: docs
signals: phone-needed
next: Real-device mobile pass via docs/MOBILE_CHECKLIST.md to clear the 5 phone-needed signals; or start the next pedagogy item (Argand explainer / Counting-the-Ways cumulative Lab).
---

# Repo priorities triage — shelve #223, merge #230, signal sweep, signals/to-do productionized

> [!NOTE]
> A **docs/process/triage** session (plus one small app-code fix). No app behavior
> changed except the #230 merge. Build green, `sessions:lint --strict` at 0 errors,
> **no open PRs** when this closed.

## Summary

Started as a priorities review ("what's most important next") and turned into an
execution session that cleared the repo's loose ends. In order: **shelved PR #223**
(the failed quaternion "Belt" app — record kept on main as `stopped`, app code
dropped, the `/explore-concept` skill marked provisional); **fixed + verified +
merged PR #230** (Complex Particles postures/handoff) and closed #222; **swept stale
dashboard state** (in-progress→completed, complete→completed, registered the Counting
the Ways category + wrote its guide, cleared stale `not-live`/`needs-dan`/`visual-
unverified` signals); ran the **mobile smoke** (PASS 17/17) and wrote a standing
**mobile review checklist**; and **productionized the signals/to-do system** (the
`[docs] !high`), restoring the lint corpus to 0 errors in the process.

## What changed

**PR #223 — quaternion shelved (Dan: stop, drop the code).** Brought the exploration
reports onto main as a `stopped` record (incl. the hard-fail reflection); the
`src/animations/TheBelt/` app code + registry edits were never merged and are dropped.
`/explore-concept` skill kept but marked **provisional**. PR commented + closed.

**PR #230 — fixed, verified, merged.** Reviewed the diff; found one real P2 (the
cross-app function handoff overwrote the destination app's *persisted* function).
Fixed with a new `src/lib/useHandoffState.ts` — a persisted setting whose value a
one-time URL seed can override **for the session** without writing through, so a
handoff is transient but in-app changes still persist. **Verified headless** (5/5:
handoff shows the seed, localStorage keeps the saved choice, plain reload reverts,
in-app change persists). Re-verified green against current main, squash-merged
(`b3bb1ca`), closed #222 as superseded.

**Dashboard/status sweep.** 5 stale `in-progress` → `completed`; 31 `complete` →
`completed`; registered the **`counting-the-ways`** category in `categories.mjs` (+
`focused-cerf` slug override) and wrote **`docs/apps/counting-the-ways.md`** (cleared
the App-map `no-guide` drift). Cleared **6 stale `not-live`** (all on main),
**resolved/moot `needs-dan`** (solid-worlds naming, screw-bug/−a2, headless expert
reviews, quaternion), and discharged the **solid-worlds `visual-unverified`** via a
headless render (mirrored FRONT sign + DEBUG POSE HUD confirmed).

**Mobile.** `npm run smoke` @ 390×844 = **PASS 17/17** (2 warnings = the known
RGBELoader HDR fallback). Wrote **`docs/MOBILE_CHECKLIST.md`** — a standing
real-device QA checklist (global phone chrome + per-app, `phone-needed` apps first).

**Signals/to-do productionized (`[docs] !high` → done).** Linter gained `stopped` +
a **frozen-record rule** (shelved reports exempt from the evolving contract) →
corpus **34 → 0 errors**; `REPORT_STYLE.md` + the handoff template + the handoff skill
now **require `signals:`/`next:`** and consult+append `TODO.md`; CI gating confirmed
(`deploy.yml` already runs `--strict`) and shifted left with a new `sessions-lint.yml`.

## Key files

| File | Role |
|---|---|
| [`src/lib/useHandoffState.ts`](https://github.com/piyarsquare/animath/blob/c6a103cde85139c3f6de792aff5d8f71a29672fd/src/lib/useHandoffState.ts) | The #230 P2 fix: session-override-without-persist (cross-app handoff doesn't clobber saved function) |
| [`docs/apps/counting-the-ways.md`](https://github.com/piyarsquare/animath/blob/c6a103cde85139c3f6de792aff5d8f71a29672fd/docs/apps/counting-the-ways.md) | New per-app guide (cleared the App-map no-guide drift) |
| [`docs/MOBILE_CHECKLIST.md`](https://github.com/piyarsquare/animath/blob/c6a103cde85139c3f6de792aff5d8f71a29672fd/docs/MOBILE_CHECKLIST.md) | Standing real-device QA checklist; the discharge path for the 5 `phone-needed` signals |
| [`docs/sessions/lint-sessions.mjs:36`](https://github.com/piyarsquare/animath/blob/c6a103cde85139c3f6de792aff5d8f71a29672fd/docs/sessions/lint-sessions.mjs#L36) | `stopped` status + the frozen-record rule (shelved reports exempt) |
| [`docs/sessions/categories.mjs`](https://github.com/piyarsquare/animath/blob/c6a103cde85139c3f6de792aff5d8f71a29672fd/docs/sessions/categories.mjs) | `counting-the-ways` category + `focused-cerf` slug override |
| [`.github/workflows/sessions-lint.yml`](https://github.com/piyarsquare/animath/blob/c6a103cde85139c3f6de792aff5d8f71a29672fd/.github/workflows/sessions-lint.yml) | PR-time `sessions:lint --strict` (deploy.yml already gates main) |

## Open / not done

- **5 `phone-needed` signals** (Argand ×2, complex-particles-guide, headless ×2) —
  real-device only; `docs/MOBILE_CHECKLIST.md` is their discharge path. Smoke can't
  clear them (software-WebGL ≠ device).
- **Explainer-series proposed plan** (`complex-particles-guide` S02) — parked
  `needs-dan`, **medium** priority; rescope (per-app guides already shipped #229).
- **`stable-marriage(retired)` App-map drift** — a stale guide on other branch tips;
  clears as those branches merge/drop. Not actionable here.
- **~130 advisory lint warnings** — mostly `build: passing`/`complete` wording and
  non-canonical Follow-up lines; low-priority normalization.
- **Pedagogy backlog** (highest product value): Argand explainer (`!med`),
  Counting-the-Ways cumulative Lab (`!med`), RGBELoader HDR fix (`!low`).

## Context

> [!IMPORTANT]
> Shelving the quaternion exploration onto main imported ~34 reports using
> experimental kinds (`lens`/`dialogue`/`atlas`) and the new `stopped` status, which
> **broke `deploy.yml`'s existing `sessions:lint --strict` gate** (it asserts 0
> errors). Resolved by adopting `stopped` + a frozen-record exemption rather than
> faking metadata. Lesson: importing a foreign report corpus can trip the lint gate —
> run `sessions:lint --strict` after any bulk report move.

> [!NOTE]
> Branch is off `main` (not stacked); all shared-file edits are additive
> (`categories.mjs`, `TODO.md`, `REPORT_STYLE.md`, templates — append/extend, no
> reorder). The #230 merge already landed on main; this branch carries the docs/process
> work and is mergeable clean (verified at each step).

## Self-reflection

1. **What would you do with another session?** The real-device mobile pass (the
   checklist is ready), then the pedagogy work (Argand explainer / Counting-the-Ways
   cumulative Lab) — that's where product value now is, with the loose ends cleared.
2. **What would you change about what you produced?** I marked the whole quaternion
   folder `stopped` to make it frozen/exempt; a few of those were genuinely completed
   sub-artifacts. It's defensible (a shelved initiative) but slightly lossy vs.
   per-report precision — the alternative (normalizing 22 records' kinds) was worse.
3. **What were you not asked that you think is important?** Whether the `stopped`
   frozen-record exemption is too broad — it skips *all* contract checks for stopped
   reports, so a genuinely malformed stopped report would pass silently. Acceptable
   (they're frozen records) but worth knowing.
4. **What did we both overlook initially?** That my own quaternion shelving broke the
   pre-existing `deploy.yml` lint gate — caught only when investigating the signals/to-do
   path, not when shelving. A `sessions:lint` run right after the shelve would have
   surfaced it immediately (now codified in the handoff skill).
5. **What did you find difficult?** Drawing the line on `needs-dan` clears — closing a
   decision is Dan's call, so I cleared only those with documented resolution and
   presented the rest, rather than unilaterally deciding.
6. **What would have made this task easier?** A one-shot "signals digest" command
   (declared + derived per session) — I reconstructed it from `grep` + reading
   `build-sessions.mjs`'s derivation logic.
7. **How did you verify this, and does each passing check test the user-visible
   claim?** Mixed, mostly real: #230's fix by a **headless Puppeteer test of the exact
   user-visible claim** (5/5, incl. catching+correcting a same-route-hash harness
   artifact); build/test/lint by running them (build ✓, 78/78 tests, lint 0 errors);
   the merge cleanliness by an actual worktree merge with current main; the mobile
   **smoke** by running it (PASS 17/17 — a *crash/blank baseline*, NOT a device check,
   so the `phone-needed` signals correctly stay); the solid-worlds `visual-unverified`
   by **inspecting the actual headless render** (content verified, though software-WebGL
   is not pixel-true). The signals/to-do gate by `sessions:lint --strict` exit 0 + a
   site build. No green check here stands in for an unmet claim.
8. **Follow-up value:** LOW — every deliverable is verified and committed; the open
   items are real-device verification (needs hardware), Dan-owned decisions, and
   lower-priority polish/pedagogy, all tracked in `TODO.md`.
