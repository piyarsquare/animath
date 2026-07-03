---
kind: progress
session: 2026-07-03-S01
date: 2026-07-03
title: Number Planes — the living-notebook presentation (the unfolding)
branch: claude/number-plane-notebook-kxvxzj
slug: number-plane-notebook-kxvxzj
status: in-progress
build: unknown
followup: null
pr: null
app: number-plane, docs
signals: needs-dan
next: Converge with Dan on the notebook's presentation design (futuristic + tactile + personal, curated-not-forced) before building.
---

# Number Planes — the living-notebook presentation (the unfolding)

## Session purpose

Present the Number Planes explorations as an **interactive notebook/artifact**:
futuristic feeling, tactile interactions, yet the sense of a **personal
notebook** — a personal exploration, curated and threaded but **not forced** —
rather than an encyclopedia or a textbook. This is the "unfolding" the backlog
carries as the top `number-plane` item: turn the 35-card pile + the Number
Plane app into the living-notebook presentation.

## Previous session

[2026-06-29-S01 — first looks / first page](../number-plane-guide-first-page-zkpnzi/2026-06-29-S01-first-looks-first-page.md)
(PR #245, merged into `number-plane-guide`): built trail page 1, the 35-card
note-card system (`public/number-planes/cards/` + inspector + checker), and the
Number Plane app (`#/number-plane`). Its handoff's `next:` is exactly this
session: *"Dan drives the 'unfolding' — turn the 35-card pile + Number Plane
app into the living-notebook presentation."*

## Working notes

<!-- Newest entry first. One ### per state transition. -->

### 🟣 decision · 20:15 — The garden plan drafted: four beds, three paths, nine seams
**Why:** Dan set the frame: the notebook should carry the last session's rhythm
(question → new way of seeing → the tools to see it) and the right analogy is a
**garden** — we design beds and layouts, many paths natural to the layout, the
visitor never walks into the plantings. He asked for a curatorial review of all
35 cards + the surfaced ideas (with backward projection to the pre-recorded
germ line) to decide the main paths and reveal the seams.

Reviewed the full corpus (all 35 cards, the 2026-06-24 plan, the 2026-06-25 hub
session, the 2026-06-29 marathon) and wrote
[the garden plan](2026-07-03-S01-plan-garden-paths.md) (`kind: plan`,
`status: proposed`). Its skeleton:

- **Four beds**: the Line (forcing) · the Plaza (the choice) · the Three
  Parterres (the worlds) · **the Overlook** (the terrace of unifications).
- **Three paths**: A "Could it be different?" (forcing walk) · B "What does
  each world feel like?" (residents' walk — the app IS this path) · C "It was
  one thing all along" (the overlook climb — the last session's evening).
- **Nine seams** where paths cross (L2=SP, WH's four costumes, CN's
  knife=dial, QD, PT's family-speaks-dual, NH's sticky middles, IN the master
  seam, CR's loop, CK's rhyme) — to be rendered as junctions, real places.
- **Garden principles** for the presentation: depth = proximity (glance/note/
  full as leaning in, not page jumps); junctions are where choice lives; gates
  (orbs) are honest; the walk step is the rhythm; instruments planted in beds;
  the graph is the gardener's plan, not the visitor's map.

### 🔵 finding · 20:00 — The card graph already knows a fourth bed exists
**Why:** Verifying the bed hypothesis against the actual `gathers:` lists
before proposing structure on top of it.

`C2` gathers plaza cards AND terrace cards mixed (`CR, CN, PT, NH` alongside
`L2, PL, DV, QD`); `IN` is tucked into `C3`'s thirteen; **`CK` is gathered by
no core at all** (reachable only via `CN`/`NH`/`IN` opens-links). The
late-evening discussion cards were filed under whichever core was nearest
because they arrived after the core layer was designed. Proposal in the plan:
a fourth core **C4 — "one object in costume"** gathering `[CN, CR, PT, NH,
IN, CK]`, slimming C2 back to the plaza. Awaiting Dan's yes (card edit only).

### 🟡 milestone · 19:53 — Session start: oriented on the unfolding
**Why:** New branch (`claude/number-plane-notebook-kxvxzj`) picking up the
open design problem the 2026-06-29 handoff left as its `next:`. /start-session
run; no implementation yet — the presentation design needs to converge with
Dan first (RECIPES R2: pin scope before building).

Oriented:
- **Branch base:** starts exactly at the `number-plane-guide` tip (`0e6df33`,
  which contains merged PR #245) — so this branch is **stacked on
  `number-plane-guide`**, never to be synced against `main`.
- **On disk:** all the quarried content — 35 cards + inspector + checker
  (`public/number-planes/cards/`, `scripts/check-cards.mjs`), the Number Plane
  app (`src/animations/NumberPlane/`), trail page 1
  (`public/number-planes-line.html` + `guide-deck.{js,css}` +
  `guide-widgets.js`), and the older hub (`number-planes.html`) + themed
  `guides.html` underneath.
- **Design anchors from the prior session:** Dan's living-notebook sketch
  (glowing orbs → note → portal, reader-orderable); order is a *view*, not a
  property; layered card text (`glance` / `## note` / `## full`) exists so the
  presentation can pick depth; the voice is locked (plain, terse,
  example-first, reasoning-"we", never autobiographical "I"); the hand-drawn
  "field notebook" aesthetic was parked as an advanced request. The prior
  handoff's recommendation: make trail pages *views over cards*.
- **This session's brief adds tension to balance:** *futuristic* + *tactile*
  vs *personal notebook*; *curated and threaded* vs *not forced*. The design
  was explored separately with a design agent (outside this repo — no report
  in `docs/sessions/`), so Dan carries that context into this session.
