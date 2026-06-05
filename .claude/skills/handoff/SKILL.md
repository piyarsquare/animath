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
`docs/sessions/handoff/<branch-slug>/YYYY-MM-DD-SNN-description.html` — the filename
must match the progress report exactly (including the `.html` extension), and the
`<branch-slug>` folder must match the one the progress report lives in.

## Document Structure

The handoff is a **self-contained HTML document** (we use HTML, not Markdown, for
the richer rendering) linking the shared stylesheet at `../../report.css` (the
relative path from `docs/sessions/handoff/<branch-slug>/`). Follow the structure of
existing handoffs in `docs/sessions/handoff/`. The format adapts to the session
type, but always includes the sections below:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Handoff · YYYY-MM-DD-SNN Description</title>
  <link rel="stylesheet" href="../../report.css">
</head>
<body>
<main class="report">
  <header>
    <p class="kicker">Handoff</p>
    <h1>YYYY-MM-DD-SNN — Description</h1>
    <dl class="meta">
      <div><dt>Status</dt><dd><span class="badge badge-ok">Completed</span> [or In Progress / Design Only / Investigation Only + brief qualifier]</dd></div>
      <div><dt>Branch</dt><dd><code>[git branch]</code> — pushed: [yes/no]</dd></div>
      <div><dt>PR</dt><dd>[#number + title, or "none"]</dd></div>
      <div><dt>Build</dt><dd><span class="badge badge-ok">npm run build: passed</span> [or badge-bad + first error, or badge-warn "not run" + reason]</dd></div>
    </dl>
    <p>[One-sentence summary of what this session was.]</p>
  </header>

  <section>
    <h2>What changed</h2> <!-- or "What we found" (investigation) / "The problem" (design) -->
    <p>Concrete description of changes, findings, or design decisions. Use
    <code>&lt;pre&gt;</code>, <code>&lt;table&gt;</code>, etc. where they help the
    next agent understand quickly.</p>
  </section>

  <section>
    <h2>Key files</h2>
    <table>
      <thead><tr><th>File</th><th>Role</th></tr></thead>
      <tbody>
        <tr><td><code>src/path/to/file.tsx:line</code></td><td>What it does / why it matters</td></tr>
      </tbody>
    </table>
  </section>

  <section>
    <h2>Pending / not done</h2>
    <p>What was NOT completed. Be specific — include commands ready to run,
    decisions not yet made, validation not yet performed.</p>
  </section>

  <section>
    <h2>Context</h2>
    <ul>
      <li>Links to related sessions (previous and next).</li>
      <li>Cross-cutting concerns (shared-file / parallel-branch overlap,
      persisted-settings keys touched).</li>
    </ul>
  </section>

  <!-- Self-Reflection section appended here (see below). -->
</main>
</body>
</html>
```

After the document body, append the **Self-Reflection Protocol**
(`.claude/prompts/self-reflection.md`) — read that file and add its section, **as
the HTML `<section class="self-reflection">` shown there**, just before
`</main>`.

## Rules

- Distill, don't copy — the handoff should be shorter and more focused than the
  progress report.
- Write for the next agent who has zero memory of this session.
- Include specific file paths with line numbers for key code locations
  (`src/...tsx:line`).
- Include concrete data (numbers, timings, build result) not vague descriptions.
- If the session was investigation/design only with no code changes, say so
  explicitly at the top.
