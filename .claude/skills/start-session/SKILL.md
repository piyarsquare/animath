---
name: start-session
description: "Start a new working session on animath. Reads the latest handoff, creates a progress report, and presents context. Invoke manually at the beginning of a conversation — never auto-invoke."
disable-model-invocation: true
argument-hint: "[session focus, one sentence]"
---

# Start Session

Initialize a new working session on **animath**. Read the latest handoff, create a
progress report, and present context. Do NOT start any implementation work.

## Path Convention (read first)

Session logs are **committed to the repo** and partitioned **per branch** so
parallel branches never collide. Each report is a **self-contained HTML document**
(we use HTML, not Markdown, for the richer rendering — tables, badges, collapsible
sections). Everything this session writes goes under a branch-slug folder:

```
docs/sessions/progress/<branch-slug>/YYYY-MM-DD-SNN-description.html
docs/sessions/handoff/<branch-slug>/YYYY-MM-DD-SNN-description.html
```

`<branch-slug>` = the current branch (`git branch --show-current`) with the
`claude/` prefix stripped and any `/` turned into `-` — e.g. `claude/menu-bar`
→ `menu-bar`. The folder name is a pure function of the branch (no shared index
to merge), so two branches can never write the same path. **Keep branch names
short and topical** so the folders stay tidy.

## Steps

1. **Resolve the branch slug** — run `git branch --show-current`, strip a leading
   `claude/`, replace `/` with `-`. Use it for every path below; create the
   `docs/sessions/{progress,handoff}/<branch-slug>/` folders if they don't exist.
2. **Find the latest handoff for this branch** — list
   `docs/sessions/handoff/<branch-slug>/`, sort by filename, read the last one. If
   that folder is empty (new branch), fall back to the single most-recent handoff
   across all branch folders for continuity, and note that this is the first
   tracked session on this branch.
3. **Determine the session number** — check
   `docs/sessions/progress/<branch-slug>/` for today's date. If files exist for
   today (e.g., `2026-06-05-S03-...`), the next session is S04. If none exist for
   today, start at S01.
4. **Get the session focus** — use `$ARGUMENTS` if provided, otherwise ask the user
   (one sentence).
5. **Orient in the repo** — note which **app** (`src/animations/<Name>/`) the focus
   names, if any. Skim `CLAUDE.md` / `AGENTS.md` for any conventions relevant to the
   focus. Remember the parallel-branch rule: shared files (`src/index.tsx`,
   `src/apps.ts`, `CLAUDE.md`, `README.md`) are **append-only** — never reorder
   existing entries.
6. **Create the progress report** at
   `docs/sessions/progress/<branch-slug>/YYYY-MM-DD-SNN-description.html` with the
   initial HTML structure below.
7. **Present a summary** of the last handoff: status, what was done, what's pending.
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

Write a **self-contained HTML document** linking the shared stylesheet at
`../../report.css` (the relative path from `docs/sessions/progress/<branch-slug>/`).
Use real HTML structure — tables, `<details>`, badges — not Markdown. Start from
this skeleton:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Progress · YYYY-MM-DD-SNN Description</title>
  <link rel="stylesheet" href="../../report.css">
</head>
<body>
<main class="report">
  <header>
    <p class="kicker">Progress report</p>
    <h1>YYYY-MM-DD-SNN — Description</h1>
    <dl class="meta">
      <div><dt>Branch</dt><dd><code>&lt;active git branch&gt;</code> · slug <code>&lt;branch-slug&gt;</code></dd></div>
      <div><dt>App(s)</dt><dd>src/animations/&lt;Name&gt;/ — or "shell / framework" / "docs"</dd></div>
      <div><dt>Build</dt><dd><span class="badge">not yet run</span></dd></div>
    </dl>
  </header>

  <section>
    <h2>Session purpose</h2>
    <p>[User's stated focus]</p>
  </section>

  <section>
    <h2>Previous session</h2>
    <p>[One-line summary of the latest handoff, with a relative link to its file]</p>
  </section>

  <section class="log">
    <h2>Working notes</h2>
    <!-- Prepend the newest entry directly below; one <article class="entry"> per
         state transition. Each entry states WHAT happened and WHY. -->
    <article class="entry">
      <h3>[Entry title]</h3>
      <p class="why"><strong>Why:</strong> [reason for this transition]</p>
      <p>[what happened]</p>
    </article>
  </section>
</main>
</body>
</html>
```

Badge classes for the Build line: `badge badge-ok` (passed), `badge badge-bad`
(failed), `badge badge-warn` (not run / unknown).

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
- Do NOT run scripts or explore the codebase beyond resolving the branch slug,
  reading the handoff, and the orientation skim in step 5.
- After presenting the summary, STOP and wait for the user to direct next steps.
- The description in the filename should be lowercase-hyphenated, 2–5 words, derived
  from the session focus.
