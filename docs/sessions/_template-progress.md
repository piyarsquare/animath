---
kind: progress
session: [YYYY-MM-DD-SNN]
date: [YYYY-MM-DD]
title: [Description]
branch: [claude/<branch>]
slug: [<branch-slug>]
status: in-progress
build: unknown
followup: null
pr: null
app: [app slug(s), comma-separated — e.g. stable-marriage; or chrome / engine / docs / general; null ⇒ inferred]
signals: [optional — needs-dan / phone-needed / visual-unverified / not-live; omit if none]
next: [optional — one short line: the single most useful next action]
---

# [Description]

## Session purpose

[User's stated focus.]

## Previous session

[One-line summary of the latest handoff, with a relative link to its file — or
"first tracked session on this branch".]

## Working notes

<!-- Newest entry first. One ### per state transition. The renderer turns this
     section into the rich timeline rail. Format each heading exactly:
       ### <emoji> <type> · HH:MM — <what>
     type ∈ decision | code | finding | blocker | milestone
     emoji: 🟣 decision · 🟢 code · 🔵 finding · 🔴 blocker · 🟡 milestone
     Follow each with a "**Why:** …" line, then optional body paragraphs. -->

### 🟡 milestone · [HH:MM] — [Entry title]
**Why:** [reason for this transition]

[what happened]

<!-- Screenshots (optional, when the state is visual — a render, UI diff, chart):
     store under this report's assets/ and reference it relatively. The first image
     (or the `thumbnail:` frontmatter field) becomes the control-center thumbnail.
       ![what to look at](assets/[session]-[name].png)
     Capture headless: `node scripts/shoot.mjs '#/route' assets/<name>.png`. -->

