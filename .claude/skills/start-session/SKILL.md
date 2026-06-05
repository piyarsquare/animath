---
name: start-session
description: "Start a new working session on animath. Reads the latest handoff, creates a progress report, and presents context. Invoke manually at the beginning of a conversation — never auto-invoke."
disable-model-invocation: true
argument-hint: "[session focus, one sentence]"
---

# Start Session

Initialize a new working session on **animath**. Read the latest handoff, create a
progress report, and present context. Do NOT start any implementation work.

## Steps

1. **Find the latest handoff** — list `docs/sessions/handoff/`, sort by filename,
   read the last one. (If the directory is empty, note that this is the first
   tracked session.)
2. **Determine the session number** — check `docs/sessions/progress/` for today's
   date. If files exist for today (e.g., `2026-06-05-S03-...`), the next session is
   S04. If none exist for today, start at S01.
3. **Get the session focus** — use `$ARGUMENTS` if provided, otherwise ask the user
   (one sentence).
4. **Orient in the repo** — note the **active git branch** and, if the focus names
   one, **which app** (`src/animations/<Name>/`) is in play. Skim `CLAUDE.md` /
   `AGENTS.md` for any conventions relevant to the focus. Remember the
   parallel-branch rule: shared files (`src/index.tsx`, `src/apps.ts`, `CLAUDE.md`,
   `README.md`) are **append-only** — never reorder existing entries.
5. **Create the progress report** at
   `docs/sessions/progress/YYYY-MM-DD-SNN-description.md` with the initial structure
   below.
6. **Present a summary** of the last handoff: status, what was done, what's pending.
   Then wait for the user to direct what to work on.

## Continuity

The latest handoff may or may not be directly relevant to this session. When
presenting the summary:

- If the session focus clearly continues from the handoff, highlight the pending
  items and recommended next steps.
- If the session focus is a **new topic** unrelated to the latest handoff, say so.
  Briefly note the handoff status (so nothing is lost), then focus the summary on
  orienting for the new topic instead.
- If the user's message provides additional context beyond the focus (e.g., "I'm
  not picking up from the handoff" or "this is about something different"), respect
  that framing.

## Progress Report Initial Structure

```markdown
# Progress: YYYY-MM-DD-SNN Description

## Session Purpose

[User's stated focus]

## Repo Context

- Branch: [active git branch]
- App(s) in play: [src/animations/<Name>/ or "shell / framework" or "docs"]

## Previous Session

[One-line summary of latest handoff with filename reference]

---

(Working notes will be prepended below as the session progresses)
```

## Progress Report Rule

**After every state transition: write. After every write: state why.** A state
transition is any change in what the agent is doing — responding to the user,
switching subtasks, finishing a read and starting a write, dispatching a sub-agent,
receiving results. Not just user-facing exchanges; internal transitions count. Both
the write and the why are unconditional. The progress report is the audit trail. If
it wasn't written, it didn't happen.

## Rules

- **The progress report is the memory of the session.** When this context is
  discarded, the progress report is all that remains. Future agents — and the user —
  will rely on it to understand what happened, what was decided, and why. Without
  the Why, the record is incomplete and decisions become unauditable.
- Do NOT begin any implementation, investigation, or code changes.
- Do NOT run scripts or explore the codebase beyond reading the handoff and the
  orientation skim in step 4.
- After presenting the summary, STOP and wait for the user to direct next steps.
- The description in the filename should be lowercase-hyphenated, 2–5 words, derived
  from the session focus.
