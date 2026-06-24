---
kind: handoff
session: 2026-06-21-S01
date: 2026-06-22
title: Per-app developer/agent guides — new doc type, all 12 apps, control center consumes them
branch: claude/solid-worlds-decor-refactor-16tusv
slug: solid-worlds-decor-refactor
status: completed
build: passed
followup: null
pr: https://github.com/piyarsquare/animath/pull/229
app: docs
signals:
next: Merge PR #229 to main (then the App-map drops the not-live flag on all 12 guides).
---

# Per-app developer/agent guides — new doc type, all 12 apps, control center consumes them

> [!NOTE]
> This branch **pivoted**. It began as a Solid Worlds decor refactor (split
> `rooms.ts`, fix furniture scale) and became a docs-infrastructure session. No
> app source code changed — the diff is `docs/apps/**` (new) +
> `docs/sessions/build-sessions.mjs`. The original decor work is still open (see
> Open / not done).

## Summary

Created a new doc type — a **per-app developer/agent guide** under `docs/apps/` —
the living architecture + status home for an app, distinct from the per-session
handoffs. Shipped the convention (style spec + template), wrote guides for **all 12
apps**, and taught the session control center to **consume** them: the App-map view
now shows each app's lifecycle status, a guide link, and its open-item count.
Build passes; everything is on PR #229, ready to merge to `main`.

## What changed

**The doc type (`docs/apps/`):**
- `README.md` — what the doc type is, how it relates to EXPLAINER / sessions / CLAUDE.md, the app index (all 12 linked).
- `GUIDE_STYLE.md` — the style spec (mirrors `REPORT_STYLE.md`; itself written in the style). Defines the frontmatter schema (`kind: app-guide`, reusing the `app`/`signals` vocabularies from `categories.mjs`), the fixed 8-section order, status badges, callouts, the Active/Resolved registry format (TODO-aligned), and §4 Building / §5 Updating rules.
- `_template-app-guide.md` — the skeleton.

**The 12 guides** (8 sections each: Status · Active/Resolved · What it does · How the code works · Key files · Invariants & gotchas · Testing · History). Two pilots written by hand (solid-worlds, fractals); the other ten by four parallel agents grouped by family. All pass a frontmatter lint (quoted route matching slug, `app`=slug, required fields).

**Control center consumes guides** (`build-sessions.mjs`): reads `docs/apps/*.md` cross-branch with the same read-only newest-wins dedupe as reports, renders each via `render-report.mjs` to `converted/apps/<slug>/`, and injects a `GUIDES` registry into the **App map**. Each app card gains a lifecycle status badge, a `guide ›` link, and its Active-registry count in the open line; apps with a guide but no sessions now appear (guide-only). `copy-sessions-to-dist.mjs` already ships `converted/apps/` (walks recursively).

> [!IMPORTANT]
> **Decision (YAML):** `route:` must be **quoted** — `route: "#/slug"`. A bare `#`
> starts a YAML comment, so `route: #/slug` parses as null and any tooling loses the
> hash. The lint and `GUIDE_STYLE.md` enforce this; verified the `GUIDES` registry
> emits routes with the hash intact.

## Key files

| File | Role |
|---|---|
| [`docs/apps/GUIDE_STYLE.md`](https://github.com/piyarsquare/animath/blob/59b2da77b02a8312846faeca4d2f16fa1754b71f/docs/apps/GUIDE_STYLE.md) | The style spec + build/update rules — read this before writing/editing a guide |
| [`docs/apps/_template-app-guide.md`](https://github.com/piyarsquare/animath/blob/59b2da77b02a8312846faeca4d2f16fa1754b71f/docs/apps/_template-app-guide.md) | Copy to start a new guide |
| [`docs/apps/solid-worlds.md`](https://github.com/piyarsquare/animath/blob/59b2da77b02a8312846faeca4d2f16fa1754b71f/docs/apps/solid-worlds.md) | The rich gold-standard example |
| [`docs/sessions/build-sessions.mjs:112`](https://github.com/piyarsquare/animath/blob/59b2da77b02a8312846faeca4d2f16fa1754b71f/docs/sessions/build-sessions.mjs#L112) | `isGuide` + hoisted `BRANCHES` (guide discovery) |
| [`docs/sessions/build-sessions.mjs:239`](https://github.com/piyarsquare/animath/blob/59b2da77b02a8312846faeca4d2f16fa1754b71f/docs/sessions/build-sessions.mjs#L239) | §3b: dedupe + render guides → `GUIDES` registry |
| [`docs/sessions/build-sessions.mjs:560`](https://github.com/piyarsquare/animath/blob/59b2da77b02a8312846faeca4d2f16fa1754b71f/docs/sessions/build-sessions.mjs#L560) | `renderAppMap` rewrite (consumes `GUIDES`) |

## Open / not done

- **Merge PR #229 to main.** Until then the App-map flags all 12 guides `not-live`
  (correct — they're branch-only). This is the `next:` action.
- **The original Solid Worlds decor refactor** is still unstarted: split
  `decor/rooms.ts` per-piece and fix furniture scale (it's pinned to the constant
  `U = 9`, not the Room-size slider). Captured in `solid-worlds.md`'s Active list
  and `TODO.md`.
- **`CLAUDE.md` consolidation (deliberately deferred).** Now that every app has a
  guide, each app's long prose block in `CLAUDE.md` could shrink to a one-line
  pointer. Touches the shared append-only file — left for its own pass.
- **Guide-surfaced app problems** (now in each guide's Active registry + TODO):
  Agentic Sorting's EXPLAINER/README still describe a removed **Replicate** panel;
  Trees and Nets is ~half-built (Nets half + energies unbuilt); several EXPLAINERs
  (complex family, Trees and Nets) lack the "Possible sources" attribution block;
  Stable Matching's `allStableBrute` isn't committed as a test.
- **Optional follow-up:** wire `docs/apps/` into a dedicated control-center view or
  link the App-map's `guide ›` from elsewhere; not required (App-map suffices).

## Context

- The session build reads **`refs/remotes/origin/*`**, not the working tree — a
  guide must be **pushed** before `npm run sessions` will see it. Generated outputs
  (`control-center.html`, `converted/`) are **gitignored** (regenerated on deploy),
  so they aren't in the diff.
- Branch is docs-only and does **not** touch the append-only shared files
  (`src/index.tsx`, `src/apps.ts`, `CLAUDE.md`, root `README.md`), so the merge to
  `main` should be conflict-free.
- Verified end-to-end: `npm run sessions` rendered all 12 previews, injected the
  `GUIDES` JSON, scope line reads "12 app guides", App-map JS references
  `guideBadge`/`cc-apguide`.

## Self-reflection

1. **What would you do with another session?** Start the `CLAUDE.md` slim-down
   (replace each app's prose block with a one-line pointer to its guide), and fix
   the concrete doc-lag the guides surfaced — especially Agentic Sorting's removed
   Replicate panel, which is user-facing and wrong today.
2. **What would you change about what you produced?** The four agent-written guides
   are good but not eyeball-verified line-by-line by me; depth/voice vary slightly
   between families. A consistency editing pass would tighten them. I also didn't
   add a unit/snapshot test for the new `build-sessions` guide path — it's verified
   by running, not asserted.
3. **What were you not asked that you think is important?** Whether the guides
   should eventually be the *single* source (collapsing the CLAUDE.md blocks) or
   stay a parallel richer copy. I flagged it but it's a real fork worth a decision.
4. **What did we both overlook?** That `build-sessions` reads origin refs, not the
   working tree — caught during verification (had to push before the build saw the
   guides). Worth remembering for anyone testing guide changes locally.
5. **What did you find difficult?** Keeping four parallel agents consistent without
   them touching shared files; solved by forbidding README/shared edits and doing
   the index + commit centrally.
6. **What would have made this task easier?** A pre-existing machine-readable app
   registry (status, entry file, tests) — much of each guide's Status section was
   reconstructed by hand from CLAUDE.md + the folder.
7. **Follow-up value:** LOW — the infrastructure is complete and verified (build +
   sessions pass); follow-up is polish (CLAUDE.md consolidation, fixing the
   doc-lag the guides honestly flagged) rather than correction.
