---
kind: plan
session: 2026-06-24-S01
date: 2026-06-24
title: Number Planes — a choice-driven HTML educational page
branch: claude/argand-plane-review-51egvz
slug: argand-plane-review-51egvz
status: proposed
build: passed
followup: null
pr: https://github.com/piyarsquare/animath/pull/237
app: docs, argand
signals: needs-dan
next: Agree the trunk/outline + open questions, then draft the HTML page (prose-first) using the public/*-guide.html format adapted for choose-your-own navigation.
---

# Number Planes — a choice-driven HTML educational page

> [!NOTE]
> The detailed narrative is in [`docs/number-planes-outline.md`](../../../number-planes-outline.md)
> (the working story outline). This is the *execution* plan + the decisions that
> frame it.

## Direction (Dan, 2026-06-24)

After the in-app number-line/tour experiments were shelved (see the
[design-ux-review](2026-06-24-S01-design-ux-review.md) timeline), the work pivots
to **narrative-first**: craft the story as a *document* first, layer interactivity
after. The story stays **in the plane** (no quaternions in the trunk).

## What we're building

An **HTML educational page** in the same family as the existing guides under
[`public/`](../../../../public/) (`complex-*-guide.html`, indexed by
`public/guides.html`): one self-contained file, serif prose, **live embedded
applets** (`#/embed/…`) and source lines — **adapted for choose-your-own-adventure
navigation**:

- **Soft fork** — the reader *chooses `j²`*, and the page responds (the central act
  of the subject made the central act of the page).
- **Hard fork** — at the end: *deeper in 2-D* vs *Hamilton's ℝ³ quest → quaternions*.
- This needs a *small* amount of JS (the current guides are no-JS) for the carried
  choice + branch reveals — keep it minimal; the page must teach prose-first.

## The story spine (full detail in the outline)

Line → **choose how to multiply the plane (`j²`)** → the magnitude it respects
(`|·|_p`) → **how many rails it has** (`t² = p`: 0/1/2 real roots ⇒ spiral / shear /
saddle; split = ℝ×ℝ in the null basis) → iterate and *feel* it → the dial is a
**circle** (dual at `0` and `∞`) → **fork**.

## Decisions logged

- **Stay in 2-D**; quaternions are the optional Branch B only.
- **Naming:** Number Planes; motions **Spin / Shear / Squeeze** — leaning *Squeeze*
  over *Boost* (still deciding; "Boost" imports relativity).
- **CYOA form:** linear trunk + two *genuine* forks (soft `j²`, hard ending); no maze.

## Open questions (need Dan)

Carried from the outline — the `t²=p` spine as §4's backbone; designing the
change-of-basis "find the rails" morph; how interactive the trunk is; default
ending (does Branch B stay optional); soft-fork mechanics (carried state vs walk
all three); scope of Branch A (does `z²+c` / Julia-off-ℂ belong); final naming.

## Next steps (when funded)

1. Converge the outline + open questions with Dan.
2. Draft the page **prose-first** (the guide format), branch structure stubbed.
3. Build the embeddable plane applet (`#/embed/number-planes` on `numberPlanes.ts`):
   the `j²` dial, an orbit showing the rails, the change-of-basis morph.
4. Wire the applet into the page; add it to `public/guides.html`.
