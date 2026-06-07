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

## Live preview (while on a branch)

GitHub Pages only deploys from `main`, so a branch's reports aren't on the Pages
site yet. To see the **rendered** HTML live from the current branch, use githack
(a Cloudflare-fronted renderer that serves any branch/path). Build the links with
the **full branch name** (not the slug):

- Dashboard: `https://raw.githack.com/piyarsquare/animath/<branch>/docs/sessions/index.html`
- This session's report:
  `https://raw.githack.com/piyarsquare/animath/<branch>/docs/sessions/progress/<branch-slug>/<file>.html`

The dashboard's internal links are relative, so clicking from the rendered index
navigates to the rendered reports. githack caches briefly — if a just-pushed change
isn't showing, hard-refresh or append `?v=<short-sha>` to bust the cache. (Once the
branch merges to `main`, the same reports are at
`https://piyarsquare.github.io/animath/sessions/`.) Note the report must be
**committed and pushed** before githack can render it.

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
   Include the **live preview links** (see "Live preview" above) — the githack
   dashboard URL and this session's report URL — so the user has a one-click way to
   the rendered view. (Commit + push the new progress report first, or note that the
   links go live once pushed.) Then wait for the user to direct what to work on.

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

Copy the canonical skeleton `docs/sessions/_template-progress.html` to the report
path and fill in the `[bracketed]` placeholders. It is a **self-contained HTML
document** that links the shared stylesheet (`../../report.css`) and enhancer
(`../../report.js`), and carries a machine-readable `report-meta` JSON island the
dashboard generator reads — keep that island accurate (update `status`/`build`/`pr`
as the session progresses).

Author with the components the stylesheet/script already provide — don't hand-roll
markup:

- **Working notes = a timeline.** Each state transition is one
  `<li class="tl" data-type="…">` inside `<ol class="timeline">`, **newest first**.
  `data-type` ∈ `decision | code | finding | blocker | milestone` (sets the dot
  colour + chip). Give each a `<p class="tl-time">HH:MM</p>`, a `<span class="chip
  chip-…">`, an `<h3>` (WHAT), and `<p class="why"><strong>Why:</strong> …</p>`.
- **Callouts** to flag things: `<p class="callout callout-{note|warn|decision|gotcha}">`.
- **Table of contents** builds itself from `<nav class="toc" data-autobuild>` — no
  manual upkeep; just write `<h2>` sections inside `<div class="content">`. Heading
  ids, anchors, scroll-spy, expand/collapse-all and back-to-top come from
  `report.js`. (It all degrades gracefully with JS off.)
- **Badges** on the Build line: `badge-ok` (passed) / `badge-bad` (failed) /
  `badge-warn` (not run).

The richness lives in `report.css` / `report.js`; keep the report itself simple,
semantic HTML.

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
