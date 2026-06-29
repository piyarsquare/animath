---
kind: progress
session: 2026-06-29-S01
date: 2026-06-29
title: Number Planes guide — "first looks" + what a first page should be
branch: claude/number-plane-guide-first-page-zkpnzi
slug: number-plane-guide-first-page-zkpnzi
status: in-progress
build: unknown
followup: null
pr: null
app: docs, argand
signals: needs-dan
next: Hands-on discussion of "first looks" — settle what the reader sees first on the Number Planes page before changing the artifact.
---

# Number Planes guide — "first looks" + what a first page should be

## Session purpose

Continue work on the **Number Planes** guide (stacked branch off
`number-plane-guide`). Hands-on session: discuss some **"first looks"** and what
a **first page** might look like — i.e. converge on what the reader should
encounter first before touching the artifact.

## Previous session

Stacked on `number-plane-guide`. The most recent tracked work
([2026-06-25-S01](../number-plane-guide/2026-06-25-S01-number-plane-rename.md),
PR #244) built `public/number-planes.html` (715 lines): a prose-first
"circle-the-core-from-many-lenses" hub page with a carried `j²` choice
(Spin/Shear/Boost) that live-rewrites the prose, a ring of perspectives + lens
deck (4 lenses fully written: Multiplication · Magnitude · Rails · Iteration;
4 stubbed), and a themed `guides.html` gallery + shared skin layer
(`guide-theme.css` / `guide-skin.js`) so the static guides mirror the app's 8
skins. Applet slots are styled placeholders (no `#/embed/number-planes` route
yet). Full design story + node map + open questions:
[the Number Planes page plan](../argand-plane-review-51egvz/2026-06-24-S01-plan-number-planes-page.md)
(`kind: plan`, `status: proposed`).

**Open from that work:** finish the 4 stub lenses; build the
`#/embed/number-planes` applet on the dormant, 50-test `numberPlanes.ts` engine;
settle the where-do-guides-live fork (in-chrome native skins vs. static mirror);
and Theming v2 (#239) landing sharpened the drift risk of the static mirror.

## Working notes

<!-- Newest entry first. -->

### 🟡 milestone · 12:30 — Session start: oriented, awaiting "first looks" discussion
**Why:** New branch (`number-plane-guide-first-page-zkpnzi`) continuing the
Number Planes guide; this is a hands-on discussion session, so pin the topic
with Dan before any artifact change (RECIPES R2 — separate exploring from
guessing).

Oriented:
- **Branch** is stacked on `number-plane-guide` (merge-base = its tip
  `b3b07d9`), **not** `main` — so any future sync targets that base, never `main`.
- **On disk now:** `public/number-planes.html` (715 lines, the hub+lenses page),
  `public/guides.html` (themed gallery), `guide-theme.css` / `guide-skin.js`
  (shared skin layer). The dormant engine is `src/animations/Argand/numberPlanes.ts`.
- Read the prior progress (#244 work) + the full page plan + the TODO backlog.

The session focus is **"first looks" and what a first page might look like** —
i.e. the reader's entry experience, which the current page opens with a sticky
`j²` chooser + perspective ring + lens deck. Stopping here to discuss with Dan
what the *first* thing a reader meets should be before changing anything.
</content>
</invoke>
