---
kind: progress
session: 2026-06-21-S01
date: 2026-06-21
title: Per-app developer/agent guides — a living architectural doc per app (PIVOTED from decor refactor)
branch: claude/solid-worlds-decor-refactor-16tusv
slug: solid-worlds-decor-refactor
status: in-progress
build: unknown
followup: null
pr: null
app: docs
signals: null
next: Phase 1 — inventory what durable, structural per-app information already exists (and where the gaps are) before designing the guide template.
---

# Per-app developer/agent guides — a living architectural doc per app

## Session purpose

**Pivoted** mid-session. The branch began as a Solid Worlds decor refactor (split
`rooms.ts`, fix object scale — that orientation work is preserved in the timeline
below and remains valid for later). The new focus:

Build a **per-app developer/agent guide** doc type for every app in the repo — a
**living document** for an app's development, distinct from the session-specific
handoffs. Each guide should carry:

- **Status registry** — what's *active* (in-progress / planned) vs *resolved*.
- **Feature information** — what the app does and offers.
- **How the code works** — architecture, key files, data flow (the app-scoped
  equivalent of `CLAUDE.md`).
- An **app-specific "control center"** — the per-app rollup that the global
  control center does across all apps.

Scope: all apps — Solid Worlds, Complex Particles, the agent apps, Topology,
Fractals, etc. **Explicitly NOT** the complex-particles `public/*-guide.html`
pages: those are *teaching* material (what-am-I-looking-at, math pedagogy), not an
architectural/use manual for developers.

**Phase 1 (this step): information gathering** — survey what long-term, structural
information about each app already exists in the repo, and where it lives, so the
guide template is grounded in (and can absorb) what's already written.

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

### 🔵 finding · 12:50 — PR note: quote the `#` route in YAML frontmatter
**Why:** Reviewer flagged that a bare `#` in `route:` starts a YAML comment, so any
tooling reading `route` would parse it as null/empty.

The format-upgrade commit had already dropped the `#` (`route: /solid-worlds`),
which sidestepped the comment bug but made the value unfaithful to the real hash
route and inconsistent with the body/README (`#/solid-worlds`). Fixed properly:
**quote the real hash route** — `route: "#/solid-worlds"` — in both pilots, the
template, and the `GUIDE_STYLE.md` schema, plus an explicit "quote it" note in the
spec (schema comment + field-table row). Verified both pilots parse `route` with
the hash intact. PR #229 updates on push.

### 🟢 code · 12:30 — Upgraded the doc type to the session YAML+Markdown conventions
**Why:** Dan asked to use the session files' format and add organized structure +
build/update rules.

- Added `docs/apps/GUIDE_STYLE.md` — the style spec (mirrors `REPORT_STYLE.md`;
  itself written in the style). Defines the frontmatter schema (`kind: app-guide` +
  controlled `status`/`build`/`signals` vocabularies reused from
  `categories.mjs`), the fixed 8-section order, status badges, callouts, the
  Active/Resolved registry format (TODO-aligned task lists, `- [x] date (branch)`
  resolved entries), and **§4 Building / §5 Updating** rules.
- Renamed `_TEMPLATE.md` → `_template-app-guide.md` (session `_template-<kind>.md`
  convention) with the full frontmatter schema.
- Brought both pilots into the format: richer frontmatter (kind/title/build/signals/
  next, `route` without `#`), ✅ status badges, standardized Resolved entries, and a
  demonstrative `> [!CAUTION]` callout in Solid Worlds' invariants.
- Updated `README.md` to point at `GUIDE_STYLE.md` for the rules and list the
  folder's files.

PR #229 updates on push.

### 🟡 milestone · 11:55 — Phase 2 draft: doc type + two pilot guides written
**Why:** Prove the template on a doc-rich and a doc-thin app before scaling.

Created the new doc type under `docs/apps/`:
- `README.md` — the convention: what this doc type is (vs EXPLAINER / sessions /
  CLAUDE.md, in a table), the 8 sections each guide carries, how to keep it current
  (hand-maintained registry, update with behavior changes), and the app index.
- `_TEMPLATE.md` — the skeleton (frontmatter + 8 sections with guidance comments).
- `solid-worlds.md` — **rich pilot.** Full Active/Resolved registry (the 2 TODO
  items + shelved decor refactor + deferred naming; resolved = screw fix + −a2 +
  Rooms/HUD), feature inventory, shell↔engine architecture, key-files table,
  invariants (decor spec-independence, emissive-only lights, dual homology engines,
  cutaway-by-reference, session-only coverDepth), testing notes.
- `fractals.md` — **thin pilot.** Single-file GPU viewer; the template scaled down
  cleanly (Active = none tracked; gotchas = shader caps, the dual GPU/JS iteration
  paths, aspect normalization, mount-as-state, DPR cap).

Eight-section template held at both extremes. Awaiting sign-off before replicating.

### 🟣 decision · 11:25 — Phase 2 plan locked (location · registry · rollout)
**Why:** Dan answered the three design questions.

- **Location:** `docs/apps/<slug>.md` — centralized, cross-linkable like the session
  hub (not co-located in the app folder).
- **Registry:** the per-app control center is a **hand-maintained Active / Resolved
  section** inside the doc (no new tooling; sessions edit it at handoff, like TODO.md).
- **Rollout:** **pilot two contrasting apps** before scaling. Chosen pair:
  **Solid Worlds** (doc-rich, multi-file engine) + **Fractals/GPU** (gallery
  headline but doc-thin, single file) — stress-tests the template at both extremes.

Deliverable this session: `docs/apps/_TEMPLATE.md` + `docs/apps/README.md`
(the convention) + the two pilot guides, for sign-off before replicating.

### 🔵 finding · 11:10 — Phase 1 inventory: where durable per-app info lives today
**Why:** Map the existing long-term structural info per app before designing the
guide, so the template absorbs what's written rather than duplicating it.

**Eleven source types carry durable per-app info, across three layers:**

*Layer A — the cramped canonical descriptions (architecture + lore):*
1. **`CLAUDE.md` Repository Layout tree** — per-app prose, one-liner (Fractals) to
   a ~70-line wall of dense text (SolidWorlds). The single richest "what + how
   built" source, but unstructured, hard to maintain, mixes architecture/feature/
   history.
2. **`CLAUDE.md` Routing table** — per-app route + one-liner.
3. **`src/apps.ts`** — canonical registry (hash/name/icon/blurb), 12 listed apps.

*Layer B — per-app docs in the app folder (the closest existing analogues):*
4. **`EXPLAINER.md`** — every app but legacy Fractals has one; teaching / "what am
   I looking at" + "Possible sources." Pedagogy, not architecture.
5. **`README.md`** — optional "About"; substantive in ~8 apps, stub/absent in the
   rest (SolidWorlds, PolygonWorlds, TreesAndNets, Trinary, TopologyWalk have none).
6. **Ad-hoc deep design docs — the gems:** `SolidWorlds/SCREW_BUG.md` (308 lines),
   `StableMarriage/EXTENSIONS.md` (383 lines). Exactly the "how the code works /
   why it's built this way" content the new doc wants — but no convention, only two
   apps have one.

*Layer C — the session stream + backlog (development narrative + active/resolved):*
7. **`docs/sessions/{handoff,progress}/<branch>/`** — session-specific, mapped to
   apps via `app:` frontmatter / slug inference. The raw material the living doc
   distills. Wildly uneven coverage (see below).
8. **`docs/sessions/TODO.md`** — curated backlog tagged `[category] !priority`; the
   closest thing to an active/resolved registry, but **cross-app**, not per-app.
9. **Control center App-map view** (`build-sessions.mjs` → `renderAppMap`) — already
   a per-app rollup (latest · risk · open · next), computed client-side from cards +
   TODO. The cross-app "control center"; Dan wants a per-app dedicated twin.
   `categories.mjs` holds the canonical app↔category taxonomy + the `signals:` vocab.

*Context (framework-level, not per-app):* `ARCHITECTURE.md` (historical),
`docs/BUILDING_AN_APP.md`, `docs/redesign/*`, project `README.md`; plus code header
comments + per-app `__tests__` (encode invariants — SolidWorlds has them).

**Coverage is wildly uneven** (doc-richness, not code size):
- **Rich:** PolygonWorlds (~26 reports, 136-line EXPLAINER, 5677 LOC), Complex
  Particles (~21 reports + teaching guides), Solid Worlds (~10 reports, SCREW_BUG.md).
- **Moderate:** Agentic Sorting (8 reports, README+EXPLAINER), Stable
  Matching/Marriage (EXTENSIONS.md), Trinary (4219 LOC but thin docs).
- **Thin (≈ EXPLAINER + one CLAUDE.md line only):** Fractals, Mandelbrot↔Julia
  (Correspondence), Plane Transform, Topology Walk (retiring).

**Punchline:** no existing source is a clean match. The target content is split
across A (cramped/unstructured), B (great but ad-hoc, 2 apps), and C (cross-app,
session-scoped). The new per-app guide should be the **home that consolidates A's
architecture prose + B's deep docs + a per-app slice of C's active/resolved
registry** — co-located in the app folder, structured, and maintained as the living
dev doc.

### 🟣 decision · 10:40 — Pivot the branch to a per-app developer/agent guide doc type
**Why:** Dan wants a living architectural/status document per app — the app-scoped
twin of `CLAUDE.md` + a per-app control center — separate from session handoffs.
The decor refactor is shelved (its findings preserved above). Phase 1 = inventory
existing durable per-app info. The complex-particles teaching guides are out of
scope (pedagogy, not architecture).

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
