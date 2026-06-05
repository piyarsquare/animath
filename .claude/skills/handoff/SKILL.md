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
6. Regenerate the dashboard: run `node docs/sessions/build-index.mjs` (rewrites
   `docs/sessions/index.html` from the reports' metadata islands).

## Path & Filename Convention

Session logs are committed and partitioned per branch:
`docs/sessions/handoff/<branch-slug>/YYYY-MM-DD-SNN-description.html` — the filename
must match the progress report exactly (including the `.html` extension), and the
`<branch-slug>` folder must match the one the progress report lives in.

## Document Structure

Copy the canonical skeleton `docs/sessions/_template-handoff.html` and fill in the
`[bracketed]` placeholders. It is a **self-contained HTML document** linking
`../../report.css` + `../../report.js` and carrying a `report-meta` JSON island
(keep it accurate — the dashboard reads it). Always includes: **status/branch/PR/
build** in the header `dl.meta`; **What changed** (or "What we found" / "The
problem"); **Key files**; **Pending / not done**; **Context**; **Self-reflection**.

Use the stylesheet's components rather than hand-rolling:

- **Key files** in a `<table>` with `<th data-sort>` headers (sortable via
  `report.js`). Make each `file:line` a real link — wrap it
  `<a class="codelink" href="https://github.com/piyarsquare/animath/blob/<SHA>/<path>#L<line>"><code>path:line</code></a>`
  and **pin to the commit `<SHA>`** so links don't rot.
- **Callouts** for the one thing the next agent must know:
  `<p class="callout callout-gotcha"><span class="callout-label">Gotcha</span>…</p>`.
- The TOC, anchors and scroll-spy build themselves from the `<h2>` sections inside
  `<div class="content">` — no manual upkeep.

Append the **Self-Reflection Protocol** (`.claude/prompts/self-reflection.md`) as the
HTML `<section class="self-reflection">` shown there, just before `</div>` (end of
`.content`).

## Rules

- Distill, don't copy — the handoff should be shorter and more focused than the
  progress report.
- Write for the next agent who has zero memory of this session.
- Include specific file paths with line numbers for key code locations
  (`src/...tsx:line`).
- Include concrete data (numbers, timings, build result) not vague descriptions.
- If the session was investigation/design only with no code changes, say so
  explicitly at the top.
