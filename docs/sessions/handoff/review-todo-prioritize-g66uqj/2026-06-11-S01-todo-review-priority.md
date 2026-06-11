---
kind: handoff
session: 2026-06-11-S01
date: 2026-06-11
title: Debt pass — lint adoption, cleanup, docs, prioritized roadmap
branch: claude/review-todo-prioritize-g66uqj
slug: review-todo-prioritize-g66uqj
status: completed
build: passing
followup: null
pr: 212
app: general
---

# Debt pass — lint adoption, cleanup, docs, prioritized roadmap

> [!NOTE]
> The session began as a to-do *review* (establish order + priority) and the
> user redirected it to *filling* the debt. Both happened: the debt was paid
> down **and** `PLAN.md` now carries the prioritized roadmap. PR #212 (the work)
> is **merged to main** (`0691fb6`). This handoff is delivered on a separate
> branch (`claude/todo-review-handoff`) because #212 was already merged.

## Summary

A debt-clearing session targeting CLAUDE.md's *Known Issues* (tracker #4) and
the debt-flavored items in the chrome ledger (`docs/redesign/IN-PROGRESS.md`,
#2). Adopted ESLint (lint-only, no formatter — by decision), deleted the
orphaned utilities and empty stubs, sanitized the markdown renderer, cleared
the rollup high audit advisory, extracted a shared probe harness, added a
dev-time layout validator, and rewrote `PLAN.md` as the prioritized roadmap.
Final state: **`npm run lint` 0 errors · build green · 22 vitest tests · all
five headless probes pass.** Merged as PR #212.

## What changed

- **ESLint adopted** (`eslint.config.mjs`, flat config; `npm run lint` script).
  Of 121 initial errors, **95 were the react-hooks v7 React Compiler rules**
  (refs / immutability / purity / set-state-in-effect) — deliberately
  **excluded**, because they reject the ref-mutation patterns the `lib/particles`
  Three.js engine is built on. Only `rules-of-hooks` + `exhaustive-deps` (warn)
  are kept; `no-explicit-any` is warn. The remaining **25 genuine errors** are
  all fixed: 11 unused imports/vars, 9 dead stores in StableMarriage (a
  vestigial `active` loop flag), 4 `i ? lineTo : moveTo` ternary-statements →
  if/else, 4 stale eslint-disable directives, 1 prefer-const. Baseline: **60
  warnings**, accepted — don't add new ones.
- **Deletions:** `lib/ParticleDisplay.ts`, `lib/R2Mapping.ts`, `src/materials/`
  (orphans, grep-verified unimported); `requirements.txt`, `run/setup.sh`
  (empty stubs).
- **XSS:** `Readme.tsx` now passes `marked` output through `DOMPurify.sanitize`
  (added `dompurify` dependency).
- **npm audit:** `npm audit fix` cleared the **rollup high** advisory in place.
  The two remaining esbuild/vite **moderates are dev-server-only** and need a
  breaking vite major (5 → 8) — deferred as its own chore in PLAN.md.
- **`scripts/probe-lib.mjs`** — shared launch / openPage / nav / onTop /
  makeChecker harness; all five probes refactored onto it (435 → ~250 lines)
  and re-verified green against the built app.
- **`validateLayouts`** (in `chrome/workspace/layouts.ts`) + a dev `console.warn`
  in `DesktopWorkspace` — warns when an authored panel rect opens under the rail
  band (`x < WS_RAIL` = 78), the Trees-and-Nets `x:16` bug class. +2 unit tests.
- **Docs:** `PLAN.md` rewritten as the prioritized roadmap (the session's
  chartered deliverable); `AGENTS.md` rewritten (was stale: old AppShell,
  "no automated tests", HTML reports); `ARCHITECTURE.md` banner refreshed;
  `IDEAS.md` three Hopf entries reconciled with their later removal; CLAUDE.md
  *Known Issues* rewritten to the true remainder; BUILDING_AN_APP.md verify
  step gained `npm run lint`.

## Key files

| File | Role |
|---|---|
| [`PLAN.md`](https://github.com/piyarsquare/animath/blob/0691fb6/PLAN.md) | **the prioritized roadmap** — Now / Next / Decisions needed / Later / Standing chores |
| [`eslint.config.mjs`](https://github.com/piyarsquare/animath/blob/0691fb6/eslint.config.mjs) | flat config; documents *why* the React Compiler rules are excluded |
| [`scripts/probe-lib.mjs`](https://github.com/piyarsquare/animath/blob/0691fb6/scripts/probe-lib.mjs) | shared probe harness (the prior chrome-overhaul follow-up) |
| [`src/chrome/workspace/layouts.ts:6`](https://github.com/piyarsquare/animath/blob/0691fb6/src/chrome/workspace/layouts.ts#L6) | `validateLayouts` — rail-band dev warning |
| [`src/components/Readme.tsx:13`](https://github.com/piyarsquare/animath/blob/0691fb6/src/components/Readme.tsx#L13) | DOMPurify-sanitized markdown render |
| [`docs/redesign/IN-PROGRESS.md`](https://github.com/piyarsquare/animath/blob/0691fb6/docs/redesign/IN-PROGRESS.md) | chrome ledger — the "Still open" list PLAN.md ranks; debt session logged in the decision log |

## Open / not done

- **PR #212 is merged** — nothing pending on the debt work itself.
- **lint + test are not CI gates** — CI still runs only `npm run build`. Adding
  `npm run lint` and `npm test` to `.github/workflows/deploy.yml` (or a new CI
  workflow) is a small, optional follow-up to enforce what's now green by
  convention.
- **Vite 5 → 8 major upgrade** — the one remaining audit chore (clears the two
  dev-only moderates). Breaking; scheduled in PLAN.md as its own verified PR.
- **The roadmap is the real handoff.** PLAN.md's *Now* tier for whoever picks
  up next: (1) hardware phone pass on the chrome overhaul, (2) P3 `ViewDef.hud`
  design against TopologyWalk's real overlays, (3) the Polygon Worlds
  path-demonstration redesign (the only HIGH follow-up flag in the digest).

## Context

> [!IMPORTANT]
> The **no-formatter decision is load-bearing**: a repo-wide reformat would
> conflict with every in-flight parallel app branch. ESLint is lint-only by
> design — do not add Prettier. This is recorded in AGENTS.md, eslint.config.mjs,
> CLAUDE.md, and PLAN.md.

> [!CAUTION]
> Don't "fix" the 60 baseline lint warnings or re-enable the react-hooks
> Compiler rules wholesale — the `exhaustive-deps` warnings and ref mutations
> are intentional in the Three.js engine code. The config excludes those rules
> deliberately; widening it will bury real signal.

- The "deploy.yml duplicate `configure-pages` step" from CLAUDE.md's old
  Known Issues was a **stale entry** — already fixed. Verified, not re-fixed.
- This handoff + the final progress-report status flip ride a **new branch**
  (`claude/todo-review-handoff`) and a **new PR**, because #212 was already
  merged. They are docs-only.

## Self-reflection

1. **What would you do with another session?** Wire `npm run lint` + `npm test`
   into CI so the now-green gates can't silently rot — it's the natural
   completion of this session and a ~10-line workflow change. Then start
   PLAN.md's *Now* tier (the hardware phone pass is cheapest).
2. **What would you change about what you produced?** I split the react-hooks
   ruleset by trial — installing, seeing 121 errors, then narrowing. I could
   have read the plugin's v7 changelog first and scoped the config right on the
   first pass instead of triaging 95 Compiler-rule errors to discover they were
   categorically out of scope.
3. **What were you not asked that you think is important?** Whether the ~60
   accepted warnings should ever be driven to zero. I treated them as a frozen
   baseline (matching CLAUDE.md's existing stance), but no one has decided if
   `exhaustive-deps` is permanently waived or just deferred — worth an explicit
   ruling so future agents don't relitigate it per-PR.
4. **What did we both overlook?** The progress report's `pr:` field had to be
   backfilled to 212 in a follow-up commit after the PR was created — the
   handoff/report frontmatter can't know its own PR number at authoring time.
   A tiny `npm run sessions` post-step that stamps the PR from the branch would
   remove that manual round-trip.
5. **What did you find difficult?** Nothing technically hard — the friction was
   judgment calls on *scope*: which lint rules are signal vs. noise for a
   ref-driven Three.js codebase, and which "debt" entries were already stale.
   Both resolved by reading the actual code/workflow rather than trusting the
   doc.
6. **What would have made this task easier?** A one-line note in CLAUDE.md's
   debt list marking which entries were already verified-fixed vs. genuinely
   open would have saved re-checking the deploy workflow and the audit state
   from scratch.
7. **Follow-up value:** LOW — the debt is paid, merged, and verified
   (lint/build/test/probes all green); what remains is the optional CI-gate
   wiring and the deliberately-deferred vite-major chore, both clearly scoped
   in PLAN.md.
