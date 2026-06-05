---
name: handoff
description: "Create a handoff document for the current animath session. Invoke manually at the end of a conversation — never auto-invoke."
disable-model-invocation: true
---

# Handoff Document Generator

Create a handoff document for the current session. ONLY write the document — do NOT
fix, investigate, or run any code (except `npm run build` for build status).

## Steps

1. Resolve the **branch slug**: `git branch --show-current`, strip a leading
   `claude/`, replace `/` with `-` (e.g. `claude/menu-bar` → `menu-bar`).
2. Find the current session's progress report in
   `docs/sessions/progress/<branch-slug>/` (most recent by filename).
3. Read the progress report to understand what happened this session.
4. Run `npm run build` to get current build status (`tsc && vite build` — the only
   CI check), unless it was already run recently in this session. Note the result
   (pass / fail + first error).
5. Write the handoff to `docs/sessions/handoff/<branch-slug>/` with the **same
   filename** as the progress report (create the folder if needed).

## Path & Filename Convention

Session logs are committed and partitioned per branch:
`docs/sessions/handoff/<branch-slug>/YYYY-MM-DD-SNN-description.md` — the filename
must match the progress report exactly, and the `<branch-slug>` folder must match
the one the progress report lives in.

## Document Structure

Follow the structure of existing handoffs in `docs/sessions/handoff/`. The format
adapts to the session type, but always includes:

```markdown
# Handoff: YYYY-MM-DD-SNN Description

## Status: [Completed | In Progress | Design Only | Investigation Only] (brief qualifier)

One-sentence summary of what this session was.

## Branch / PR

- Branch: [git branch] — pushed: [yes/no]
- PR: [#number + title, or "none"]

## What Changed
(or "What We Found" for investigation sessions, "The Problem" for design sessions)

Concrete description of changes, findings, or design decisions. Include code
snippets, data, or tables where they help the next agent understand quickly.

## Key Files

| File | Role |
|------|------|
| `src/path/to/file.tsx:line` | What it does / why it matters |

## Pending / Not Done

What was NOT completed. Be specific — include commands ready to run, decisions not
yet made, validation not yet performed.

## Context

- Links to related sessions (previous and next)
- Any cross-cutting concerns the next agent needs to know (e.g. shared-file /
  parallel-branch overlap, persisted-settings keys touched)

## Build Status

`npm run build`: passed / failed (first error: …), or "not run" with reason.
```

After the document, append the **Self-Reflection Protocol**
(`.claude/prompts/self-reflection.md`) — read that file and add its section to the
end of the handoff.

## Rules

- Distill, don't copy — the handoff should be shorter and more focused than the
  progress report.
- Write for the next agent who has zero memory of this session.
- Include specific file paths with line numbers for key code locations
  (`src/...tsx:line`).
- Include concrete data (numbers, timings, build result) not vague descriptions.
- If the session was investigation/design only with no code changes, say so
  explicitly at the top.
