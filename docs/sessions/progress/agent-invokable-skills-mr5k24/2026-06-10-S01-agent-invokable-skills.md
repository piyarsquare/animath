---
kind: progress
session: 2026-06-10-S01
date: 2026-06-10
title: Make session skills agent-invokable
branch: claude/agent-invokable-skills-mr5k24
slug: agent-invokable-skills-mr5k24
status: in-progress
build: not-run
followup: null
pr: 206
app: general
---

# Make session skills agent-invokable

## Session purpose

Make the `.claude/skills/` session skills (`start-session`, `handoff`,
`three-hats`) invokable by an agent (not only by a human typing the slash
command), and land it as a quick PR to `main` so it doesn't need revisiting —
then actually run `/start-session` via the Skill tool.

## Previous session

First tracked session on this branch. The most recent handoff for continuity is
[control-center-category-filter / 2026-06-10-S01](../../handoff/control-center-category-filter/2026-06-10-S01.md)
(PR #204, completed, build passing) — a tooling/docs session on the cross-branch
control center that also touched these same skill files. Unrelated topic, but
relevant because it last edited the `handoff`/`start-session` skill descriptions.

## Working notes

<!-- Newest entry first. -->

### 🟡 milestone · 22:07 — Ran /start-session via the Skill tool
**Why:** Demonstrate the fix end-to-end — an agent invoking a skill that was
previously human-only — and open the session record.

After the PR was up, invoked `start-session` through the Skill tool (the very
capability this branch adds). Resolved slug `agent-invokable-skills-mr5k24`
(new branch, no prior handoff), read the latest cross-branch handoff for
continuity, and wrote this progress report.

### 🟢 code · 22:05 — Opened PR #206 to main
**Why:** User asked for a quick PR to `main` so the invocation barrier doesn't
recur.

Committed (`b484c1f`), pushed `claude/agent-invokable-skills-mr5k24`, opened
[PR #206](https://github.com/piyarsquare/animath/pull/206) → `main`. Docs/skill
metadata only — no app or build-surface code changed.

### 🟢 code · 22:03 — Removed `disable-model-invocation` from all three skills
**Why:** That frontmatter flag is exactly what blocks the model/agent from
invoking a skill — it restricts invocation to a human typing the slash command.

Deleted `disable-model-invocation: true` from `start-session`, `handoff`, and
`three-hats`. Reworded each `description` so the trigger is an **explicit
request** (e.g. `/start-session`) rather than spontaneous auto-invocation —
preserving the original "don't fire on your own" intent while allowing an agent
to call them when asked. Updated the matching prose in `CLAUDE.md` and
`AGENTS.md` (both previously said the skills "never auto-invoke") to say they're
invokable by both humans and agents on explicit request. Confirmed the skills
re-registered as model-invokable in the live skill list.

### 🔵 finding · 22:01 — Root cause: `disable-model-invocation: true`
**Why:** Establish why the skills couldn't be agent-invoked before changing
anything.

All three session skills carried `disable-model-invocation: true`. That is the
documented gate that prevents the model (an agent) from invoking a skill; only a
human slash command could trigger them. The descriptions also said "never
auto-invoke," which is the behavior to preserve — the fix is to allow invocation
on request, not to make them auto-trigger.

## Open / not done

- **PR #206 not merged** — awaiting review/merge to `main`. The local branch
  already has the updated skills, so this session can use them now.
- **`npm run build` not run** — changes are docs/skill-metadata only (no `src/`),
  so the build surface is untouched; not run this session.
- **Optional consistency pass** — other `.claude/` skills (e.g. `deep-research`,
  `update-config`) are global/harness skills, not part of this repo's session
  workflow; left untouched. If "all skills" is meant to include any future
  repo-local skills, apply the same frontmatter convention.
