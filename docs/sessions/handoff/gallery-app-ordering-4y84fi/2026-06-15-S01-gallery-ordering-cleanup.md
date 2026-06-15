---
kind: handoff
session: 2026-06-15-S01
date: 2026-06-15
title: Gallery ordering cleanup — feature top three, retire Stable Marriage card, demote Topology Walk
branch: claude/gallery-app-ordering-4y84fi
slug: gallery-app-ordering-4y84fi
status: completed
build: passed
followup: low
pr: 220
app: chrome
signals: not-live
next: At merge keep every app's apps.ts entry and apply this curated order (apps.ts was reordered, not appended).
---

# Gallery ordering cleanup — feature top three, retire Stable Marriage card, demote Topology Walk

## Summary

A small, complete chrome session: re-curate the landing gallery. The gallery card
order is a pure function of the `apps` array order in `src/apps.ts` (the catalog
just maps over it), so the work was a **reorder of `apps.ts`** plus **dropping one
`META` entry** in `src/chrome/catalog.ts`. Shipped, built green, verified with a
headless screenshot, pushed; [PR #220](https://github.com/piyarsquare/animath/pull/220)
tracks the branch. Nothing left open except the merge caveat below.

## What changed

Two files, both chrome:

1. **`src/apps.ts` reordered** so the gallery leads with the three requested apps and
   demotes Topology Walk to last. New order: **Complex Particles · Fractals · Polygon
   Worlds** · Plane Transform · Mandelbrot↔Julia · Trinary · Stable Marriage ·
   Agentic Sorting · Stable Matching · Trees and Nets · **Topology Walk**. All apps
   other than the four moved keep their prior relative order ("just the named
   changes", per the user).
2. **`src/chrome/catalog.ts`** — removed the `/stable-marriage` entry from the `META`
   map. The catalog builds `CARDS` via `apps.filter(a => META[a.hash])`, so dropping
   the entry **retires the gallery card while keeping the `#/stable-marriage` route
   live and unlisted** — exactly how `#/fractals-cpu` is handled. Stable Marriage was
   retired in favor of Stable Matching. Updated the header comment to document this
   "present only if it has a META entry" retirement mechanism (and dropped the stale
   "9 cards" / "append-only" wording).

**Resulting visible gallery (10 cards):** Complex Particles · Fractals · Polygon
Worlds · Plane Transform · Mandelbrot↔Julia · Trinary · Agentic Sorting · Stable
Matching · Trees and Nets · Topology Walk. The `marriage` `PreviewKind` in
`previews.tsx` is now unused but harmless (left in place).

Verified: `npm run build` passes (Stable Marriage still compiles — route intact);
headless shot of `#/` confirms the new top row and no Stable Marriage card.

## Key files

| File | Role |
|---|---|
| [`src/apps.ts:14`](https://github.com/piyarsquare/animath/blob/553dfe71128df4bc421b2028a786546c3f72bf02/src/apps.ts#L14) | The canonical registry; **its array order = gallery card order**. Reordered here. |
| [`src/chrome/catalog.ts:28`](https://github.com/piyarsquare/animath/blob/553dfe71128df4bc421b2028a786546c3f72bf02/src/chrome/catalog.ts#L28) | `META` map → an app shows a card only if it has an entry; `/stable-marriage` removed. `CARDS` (L46) filters+maps `apps`. |

## Open / not done

Nothing functional is pending — the task is complete and merged into PR #220.

> [!WARNING]
> **`src/apps.ts` was reordered, not appended.** It is normally append-only across
> parallel app branches. If `main` merged any new apps after this branch forked, do
> **not** blindly accept a "take both" auto-merge — that would scramble the curated
> order. At merge: keep every app's entry, then apply this branch's intended order
> (top three featured, Topology Walk last). `catalog.ts`'s `META` map is order-
> independent, so only `apps.ts` needs the careful resolution.

## Context

- **Decisions this session** (both from the user via AskUserQuestion): retire =
  **hide from gallery** (keep route), not delete; ordering = **just the named
  changes**, not a full re-sort.
- The branch is **not deployed** (`signals: not-live`) — GitHub Pages builds only
  from `main`. To preview the reordered gallery before merge, check out the branch
  and `npm run build && npm run preview`, or view PR #220's preview if one is wired.
- If the user later wants Stable Marriage **fully** deleted (folder + route in
  `index.tsx` + `apps.ts` entry), that's the follow-on; this session deliberately
  left the route live and reversible.

## Self-reflection

1. **What would you do with another session?** Nothing required. Optional polish:
   confirm with the user whether Stable Marriage should eventually be fully deleted
   (folder/route), and remove the now-unused `marriage` `PreviewKind` if so.
2. **What would you change about what you produced?** Nothing substantive. The
   change is minimal and matches the request exactly.
3. **What were you not asked that you think is important?** Whether the
   `#/stable-marriage` route should keep a discoverable entry point at all, or be
   considered dead (it's now reachable only by direct URL, like `#/fractals-cpu`).
4. **What did we both overlook?** Nothing of consequence. The one residual is the
   unused `marriage` preview kind — cosmetic.
5. **What did you find difficult?** Nothing — the gallery's single-source-of-order
   design (`apps.ts` → `catalog.ts`) made this a two-file change.
6. **What would have made this task easier?** It was already easy; the clear
   AskUserQuestion answers removed the only ambiguity up front.
7. **Follow-up value:** LOW — change is complete, built, and verified; the only
   real carry-over is the merge-order caution on `apps.ts`, already flagged in the PR.
