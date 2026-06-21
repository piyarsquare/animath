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

### 🔵 finding · 10:25 — Read the app; mapped the scale issue and the guide situation
**Why:** User asked to learn the app fully and whether an app-specific guide stays in sync with code.

Read `decor/rooms.ts`, `textures.ts`, `coverEngine.ts` (the decor build call),
`SolidWorlds.tsx`, and `EXPLAINER.md`.

**`buildRoomsDecor` shape.** One 264-line function (lines 87–351) after a
`kleinBottleGeometry` helper. It receives a `DecorBuildContext` with primitive
helpers (`mesh`, `std`, `localM`, `box`/`cyl` defined inline) plus `U`, `h`,
`wallOpacity`, `onWallMaterial`. Natural seams already exist as comment-banner
blocks: **(1)** room shell — 3 −axis faces, each an arch + a ceiling duct hole
(`wallArchGeo`/`holeGeo`/`buildFace`); **(2)** arch moldings + trapdoor rim;
**(3)** duct steel frames; **(4)** furniture — rug, desk+lamp, picture, fireplace,
chandelier, bookshelf (books/plant/Klein bottle), wardrobe.

**The scale finding.** Two different size bases are in play. The room *shell*
scales off `h = size/2` (so `H` tracks the actual room, default `size = 11` →
`h = 5.5`). But the *furniture* scales off the fixed constant `U = 9` (passed as
`u`), independent of room size. So a book is `u * ~0.15 ≈ 1.35` tall and the desk
top is `u*0.26 × u*0.46 ≈ 2.3 × 4.1` — large absolute objects placed against
`h = 5.5` walls. That decoupling (furniture pinned to `U=9`, walls to `size`) is
why objects loom, and why a bigger Room-size slider doesn't shrink them
relatively. Candidate fix directions: (a) scale furniture off `h` not `U`, and/or
(b) cut the absolute multipliers.

### 🟡 milestone · 10:00 — Session initialized
**Why:** /start-session — orient on a fresh branch before any implementation.

Resolved branch slug `solid-worlds-decor-refactor` (new branch, no prior handoff
folder). Read the latest solid-worlds handoff (screw-bug fix, engine — distinct
topic) and the backlog. Confirmed the target is `src/animations/SolidWorlds/decor/rooms.ts`
(351 lines, single builder). No code read yet — awaiting direction.
