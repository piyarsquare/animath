---
kind: handoff
session: 2026-06-22-S01
date: 2026-06-22
title: Control-center triage + a self-auditing App-map (registry ↔ guides)
branch: claude/todo-list-review-eu3g4a
slug: todo-list-review-eu3g4a
status: completed
build: passed
followup: null
pr: null
app: docs
signals: needs-dan
next: Productionize the signals/to-do system (TODO `[docs] !high`) so the dashboard stays rich by construction; Dan must delete 6 dead remote branches (this env can't — 403).
---

# Control-center triage + a self-auditing App-map (registry ↔ guides)

> [!NOTE]
> Dashboard-wide cleanup session (no app/engine code). Touched only session
> reports, `docs/`, the control-center builder, and removed the retired Stable
> Marriage app's residue. Build is green.

## Summary

Dan asked to "clear the to-do list" by reviewing the whole session control center.
I sorted every loose end into four buckets (easiest-first) and worked them with
Dan: **21 stale `in-progress` reports → `completed`**, **5 parked `needs-dan`
decisions resolved**, the in-flight branches reconciled, and `TODO.md` filled out.
Three concrete deliverables landed: the **attribution back-fill** (9 EXPLAINERs got
"Possible sources" blocks), **Stable Marriage fully eliminated**, and — the headline
— the **App-map is now self-auditing**: the builder reads `src/apps.ts` and
reconciles registry ↔ guides ↔ reports, flagging drift on each card. That check
caught two real gaps, which I then fixed (wrote the missing Argand guide, removed
the retired Stable Marriage guide).

## What changed

**Self-auditing App-map** (`docs/sessions/build-sessions.mjs`). The control center
never read the app registry, so a retired app could keep its guide and a shipped app
could ship with no guide, silently. Now the build:
- parses `src/apps.ts` (from `main`) into a `registry` map and reconciles it against
  the per-app guides → a `drift` list (logged at build time);
- badges each App-map card **⚠ no guide** (registered, no guide) or **⚠ retired**
  (guide, not in registry), with a top **"registry drift"** callout;
- links each card's **"N backlog"** count to the filtered To-do (`#cat=<app>`).
- Verified live: building against `main` logged `drift: argand(no-guide)`.

**Guide drift fixed.** Wrote `docs/apps/argand.md` (the live `#/argand` app had no
guide; `status: active`, mirrors the other guides) and removed the retired
`docs/apps/stable-marriage.md`. After both, a branch build reads `drift: none`.

**Triage (with Dan):**
- **Bucket A** — flipped 21 reports `in-progress → completed` across 12 slug folders
  (work had shipped; status never updated).
- **Bucket B** — 5 `needs-dan` calls: keep Argand's name+position (plan → `executed`);
  leave the Solid Worlds name; PR #222 is complementary, bring it in; explainer-series
  is a real future review.
- **Attribution** — sub-agent added tailored "Possible sources" blocks to **9
  EXPLAINERs**; I web-verified the four obscurest citations (all correct).
- **Stable Marriage eliminated** — deleted `src/animations/StableMarriage/`, its
  route + lazy import, the `apps.ts` entry, the `marriage` PreviewKind/`MarriagePreview`
  in `chrome/previews.tsx`, and README/CLAUDE/catalog references.
- **PR #230** opened (postures UX, re-homed from `sleepy-bardeen`/#222 onto
  `claude/complex-particles-postures`); **#222 closed** pointing at it.
- **Dead-branch review** — 6 merged/closed branches are safe to delete; this
  environment is blocked (see below).

## Key files

| File | Role |
|---|---|
| [`docs/sessions/build-sessions.mjs:261`](https://github.com/piyarsquare/animath/blob/7f5cb1e1801a0ca7e7b05043fef7baaefdaed881/docs/sessions/build-sessions.mjs#L261) | Registry parse from `src/apps.ts` + drift reconciliation (`registry`, `drift`, build-time log) |
| [`docs/sessions/build-sessions.mjs:511`](https://github.com/piyarsquare/animath/blob/7f5cb1e1801a0ca7e7b05043fef7baaefdaed881/docs/sessions/build-sessions.mjs#L511) | `REGISTRY` / `DRIFT` serialized into the page |
| [`docs/sessions/build-sessions.mjs:633`](https://github.com/piyarsquare/animath/blob/7f5cb1e1801a0ca7e7b05043fef7baaefdaed881/docs/sessions/build-sessions.mjs#L633) | `renderAppMap`: registry merge, per-card drift badge, callout, backlog link |
| [`docs/apps/argand.md`](https://github.com/piyarsquare/animath/blob/7f5cb1e1801a0ca7e7b05043fef7baaefdaed881/docs/apps/argand.md) | New per-app guide for the live `#/argand` app |
| [`docs/sessions/TODO.md`](https://github.com/piyarsquare/animath/blob/7f5cb1e1801a0ca7e7b05043fef7baaefdaed881/docs/sessions/TODO.md) | The durable backlog (App-map item updated; top lever = productionize signals/to-do) |
| [`src/apps.ts`](https://github.com/piyarsquare/animath/blob/7f5cb1e1801a0ca7e7b05043fef7baaefdaed881/src/apps.ts) | The app registry the self-audit reads (source of truth) |

## Open / not done

- **Report-style / template improvements are owned by a separate thread Dan has
  running.** Do **not** touch `docs/sessions/REPORT_STYLE.md`, the `_template-*.md`
  skeletons, or the reflection protocol here — defer to that thread.
- **Top backlog lever:** `[docs] !high` — productionize the signals/to-do system
  (teach agents to author `signals:`/`next:` + append `TODO.md` by convention), so
  the dashboard stays rich without manual triage. The self-audit is the structural
  half of this; the authoring discipline is the other half.
- **App-map polish remaining:** open the map from an app chip; trend lines over time.
- **PR #230** awaits review/merge; **#222** left open for Dan to close.

> [!IMPORTANT]
> **6 dead remote branches need deletion and this environment can't do it** (HTTP
> 403 on `git push --delete`; the GitHub MCP exposes no delete-branch tool). Dan
> must delete from the GitHub UI or a local clone:
> `sleepy-bardeen-uk0cal`, `polygon-world-mobile-layout-ipup3u`,
> `mobile-fullscreen-panel-height-7014r5`, `review-todo-prioritize-g66uqj`,
> `future-apps-scoping`, `session-control-center-categories`. All their reports are
> preserved on `main` or the active successor branch.

## Context

> [!CAUTION]
> The builder reads guides and the registry from **git refs**, not the working tree
> — `registry` comes from `MAIN_REF` (`origin/main`) and guides are deduped across
> branch tips. So the **deployed** control center (built from `main`) will keep
> showing `Argand — registered, no guide` until **this branch merges** (the merge
> carries the new guide, removes the SM guide, and drops SM from `apps.ts`), after
> which it reads clean. A local build on this branch already shows `drift: none`.

Drift semantics: `registered + guide` = healthy; `registered, no guide` = ⚠ no
guide; `guide, not registered` = ⚠ retired; `neither` = a meta category
(chrome/docs/engine/general) and is left unflagged — that's why only true apps get
drift badges. The registry regex pairs each `hash: '/slug'` with the next `name:`
in `apps.ts`; embed routes aren't in `apps.ts`, so they're correctly excluded.

## Self-reflection

1. **What would you do with another session?** Productionize the signals/to-do
   system (the `[docs] !high` item): the self-audit now *detects* registry/guide
   drift, but nothing yet *enforces* that a new app ships with a guide or that a
   session declares its signals. Wiring that into the skills/templates is the
   natural next step — and the report-style thread is adjacent, so coordinate.
2. **What would you change about what you produced?** The drift is computed against
   `origin/main` only, so a feature branch's own fixes don't show as resolved in its
   local build until merge. That's defensible (the dashboard mirrors the deployed
   site) but mildly surprising; a one-line note in the App-map UI ("drift measured
   against main") would remove the confusion.
3. **What were you not asked that you think is important?** Whether the self-audit
   should also flag the *third* leg — apps with a registry entry **and** a guide but
   **no sessions/backlog** (documented but inert), or report `app:` slugs that match
   no category key. I left those unflagged to avoid noise.
4. **What did we both overlook?** Initially I assumed a local build would show the
   "retired" badge for Stable Marriage; it doesn't, because `main` still has SM in
   both `apps.ts` and the guide until this branch merges. The retired-branch logic is
   correct but only *visibly* fires post-merge — verified by reasoning, not a live render.
5. **What did you find difficult?** Keeping the ref-vs-working-tree distinction
   straight: the builder ignores uncommitted files, so "did it work?" had to be
   answered from the build log + git refs, not the files I'd just written.
6. **What would have made this task easier?** A tiny fixture/test for
   `build-sessions.mjs` drift reconciliation would let the next agent verify both
   branches (no-guide / retired) without crafting branch state by hand.
7. **Follow-up value:** LOW — the self-audit is complete and verified live
   (`drift: argand(no-guide)` against main, `drift: none` on-branch), the build is
   green, and the triage is done; remaining items are tracked in `TODO.md` and the
   report-style work is owned elsewhere.
