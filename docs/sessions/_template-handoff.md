---
kind: handoff
session: [YYYY-MM-DD-SNN]
date: [YYYY-MM-DD]
title: [Description]
branch: [claude/<branch>]
slug: [<branch-slug>]
status: completed
build: unknown
followup: null
pr: null
app: [app slug(s), comma-separated — e.g. stable-marriage; or chrome / engine / general; null ⇒ inferred]
---

# [Description]

> [!NOTE]
> [If the session was investigation/design only with no code changes, say so here.]

## Summary

[2–4 sentences for the next agent, who has zero memory of this session: what this
was, where it landed, what state it's in.]

## What changed

[Or "What we found" / "The problem". The substance of the session.]

## Key files

| File | Role |
|---|---|
| [`path:line`](https://github.com/piyarsquare/animath/blob/<SHA>/<path>#L<line>) | [what it is / why it matters] |

<!-- Pin links to the commit <SHA> so they don't rot. -->

## Open / not done

[What's pending, and the recommended next step.]

## Context

[Anything the next agent needs that isn't obvious from the diff.]

## Self-reflection

<!-- Append the Self-Reflection Protocol from .claude/prompts/self-reflection.md -->
