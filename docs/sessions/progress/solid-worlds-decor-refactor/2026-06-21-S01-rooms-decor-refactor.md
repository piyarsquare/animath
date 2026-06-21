---
kind: progress
session: 2026-06-21-S01
date: 2026-06-21
title: Solid Worlds — split rooms.ts decor per-piece + revisit object scale
branch: claude/solid-worlds-decor-refactor-16tusv
slug: solid-worlds-decor-refactor
status: in-progress
build: unknown
followup: null
pr: null
app: solid-worlds
signals: visual-unverified
next: Read rooms.ts (~351 lines) and map the single builder into walls / openings / furniture pieces before touching scale.
---

# Solid Worlds — split rooms.ts decor per-piece + revisit object scale

## Session purpose

Address the self-reflection follow-up on the Solid Worlds **Rooms** decor:

1. `decor/rooms.ts` is now a long single function (~351 lines); it would read
   better split per-piece (**walls / openings / furniture**).
2. Absolute sizes are large (a book is ~1.6 units in an 11-unit room) — consistent,
   but it's why objects loom up close. Revisit the scale.

This is a **visual/design refactor of the decor layer only** — no engine-math
change (the cover/deck instancing transports the −axis faces; decor must stay
spec-independent, as CLAUDE.md notes).

## Previous session

First tracked session on **this** branch. The most recent solid-worlds handoff is
[`3d-manifold-worlds-imwmal/2026-06-20-S01`](../../handoff/3d-manifold-worlds-imwmal/2026-06-20-S01-solid-worlds-continue.md):
the cell-engine **screw bug** was fixed, so all 8 catalog platycosms are now
dual-verified (build + 53 tests + lint green). That was **engine math**; this
session is a **separate decor/readability topic** and does not pick up from it.
Two related backlog items remain (`docs/sessions/TODO.md`): make the Rooms ceiling
duct world-specific (!low), and punch the engine floor plane through at the trapdoor
(!low) — both decor, both out of scope unless they fall naturally out of the refactor.

## Working notes

<!-- Newest entry first. One ### per state transition. -->

### 🟡 milestone · 10:00 — Session initialized
**Why:** /start-session — orient on a fresh branch before any implementation.

Resolved branch slug `solid-worlds-decor-refactor` (new branch, no prior handoff
folder). Read the latest solid-worlds handoff (screw-bug fix, engine — distinct
topic) and the backlog. Confirmed the target is `src/animations/SolidWorlds/decor/rooms.ts`
(351 lines, single builder). No code read yet — awaiting direction.
