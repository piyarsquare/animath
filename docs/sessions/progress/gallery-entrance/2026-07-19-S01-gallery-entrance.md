---
kind: progress
session: 2026-07-19-S01
date: 2026-07-19
title: Gallery entrance, layered explainers, calmer previews
branch: claude/gallery-entrance
slug: gallery-entrance
status: completed
build: passed
followup: null
pr: null
app: chrome
next: Fold in the contrast-audit agent's proposal when it lands; per-app explainer content polish can follow at leisure.
---

# Gallery entrance, layered explainers, calmer previews

## Session purpose

Execute Dan's answers to the post-review questions (2026-07-18): a quiet
entrance led by Complex Particles · Trinary System · Polygon Worlds;
question-led card text; GPU badges (no guided/open-lab chip); the reviewer's
five categories; layered explainers ("fix it"); keep the moving gallery but
calm it; keep Observatory as default; no tablet work; contrast pass delegated
to an agent; Trinary leftovers parked.

## Working notes

### 🟢 code · 13:10 — Catalog + gallery entrance
**Why:** Dan: Complex Particles leads ("needs a friendly front door"), then
Trinary, Polygon Worlds; "something quieter" than "New here?"; better card text.

- `catalog.ts`: five categories (Transformations · Iteration & Chaos ·
  Algorithms & Emergence · Geometry & Topology · Probability & Inference),
  per-card `question` (the leading line — a question or crisp statement),
  `starter: 1|2|3`, `gpu: true` on the seven WebGL apps.
- `Gallery.tsx`: with no filter active, a **Start here** row (the three
  starters) then **Everything** — both labeled by quiet mono kickers with a
  hairline, no chatty copy. Filters show everything flat. Cards render the
  question in place of the registry blurb, with a small GPU badge in the meta
  row (courtesy, not warning — failure is contained since #252).

### 🟢 code · 13:12 — Layered explainer ("fix it")
**Why:** The "?" modals ran thousands of pixels and sometimes overflowed.

`splitExplainer()` (fence-aware, unit-tested ×4): the dialog opens on the
intro + first `##` section; every later section folds behind a native
`<details>` disclosure styled as a quiet mono summary. **No EXPLAINER.md was
rewritten** — the attribution blocks ("Possible sources…") survive as their
own folded layer, per policy. CSS: the dialog never scrolls horizontally
(pre/table/img contained). Verified live: Trinary's modal is now 726px tall
with 6 folded sections.

### 🟢 code · 13:13 — Calmer previews
**Why:** Dan: keep the moving gallery, "reduce the speeds… less frenetic."

Global 0.65× time scale on the shared preview loop (motion stays, slower), and
`prefers-reduced-motion` now renders the synchronous first frame as a still
with no loop. Offscreen pause already existed (IntersectionObserver).

### 🟡 milestone · 13:15 — Verified
Gallery screenshot confirms the entrance (kickers, starters with questions,
GPU badges, five chips); modal drive confirms 6 folds + no horizontal
overflow. `npm test` 311 pass (4 new splitter tests) · build clean · lint 0
errors · sessions-lint 0 errors.

## In flight

A background agent is running the systematic contrast audit (item 8) —
deliverable is a PROPOSAL (per-skin token adjustments + focus-color strategy),
to be committed here for Dan's approval when it lands. No tokens changed yet.

## Decisions honored (no action)

Observatory stays default (4) · moving gallery stays (6) · no tablet mode (7)
· Trinary leftovers parked (9) · no guided/open-lab chip (2).

## Self-reflection

**What went well:** Every answer mapped to a small, testable change; the
layered explainer needed zero content rewrites because the split is structural.

**What to watch:** The five-category re-bin is my judgment for the edge cases
(Trees and Nets → Algorithms & Emergence; Argand → Transformations) — cheap to
move if Dan disagrees. The 0.65× preview scale is uniform; if specific cards
still read frenetic, a per-kind scale map is the next lever.

**Follow-up value:** LOW — remaining items are the contrast proposal (in
flight) and optional per-app explainer content polish.
