---
kind: progress
session: 2026-06-25-S01
date: 2026-06-25
title: Number Plane app — continuing the Argand → Number Plane rename + narrative
branch: claude/amazing-mccarthy-0lwb1m
slug: amazing-mccarthy-0lwb1m
status: in-progress
build: unknown
followup: null
pr: null
app: argand, docs
signals: needs-dan
next: Converge scope with Dan — is this a rename of the live #/argand app to "Number Plane(s)", the planned choice-driven HTML page, or both? Also settle singular vs plural naming.
---

# Number Plane app — continuing the Argand → Number Plane rename + narrative

## Session purpose

Continue the work on the **Number Plane** app, which is to be the rename of the
**Argand Plane** app (`#/argand`). (User framing at session start.)

## Previous session

First tracked session on this branch (`amazing-mccarthy-0lwb1m`). The work
continues directly from the **Argand five-hat review** session on
`argand-plane-review-51egvz` (PR #237, merged) — see its
[handoff](../argand-plane-review-51egvz/2026-06-24-S01-design-ux-review.md) and the
[Number Planes page plan](../argand-plane-review-51egvz/2026-06-24-S01-plan-number-planes-page.md)
(`kind: plan`, `status: proposed`, `signals: needs-dan`).

That session: (1) ran a five-hat design/UX review of Argand; (2) kept a math-first
engine `numberPlanes.ts` (+ 50 tests, dormant) and some plane-app polish; (3) built
then **shelved** an in-app number-line/tour experiment; (4) co-designed a
**curiosity-driven HTML "Number Planes" teaching page** plan with Dan. The page is
**planned, not built**; several design forks need Dan before drafting.

## Working notes

<!-- Newest entry first. -->

### 🟡 milestone · 17:20 — Session start: oriented, awaiting scope decision
**Why:** New branch continuing the Argand → Number Plane work; need Dan to pin the
artifact before any building (RECIPES R2 — separate exploring from guessing).

Read the prior handoff + the Number Planes page plan + the TODO backlog. Current
state on disk:

- `#/argand` is registered in `src/apps.ts` as **"Argand Plane"** (icon `∡`); it
  runs on `complexOps.ts` (untested) and ships `numberPlanes.ts` dormant alongside.
- The prior plan describes a **separate HTML page** (`public/*-guide.html` family,
  JS-driven, curiosity-web), *not* a rename of the app. The user's framing this
  session ("the Number Plane **app** which will be the rename for the Argand plane")
  points at the live app. **These may be the same effort or two — needs Dan.**

Open questions to converge before building (carried from the plan + raised by the
rename framing):

1. **Scope**: rename the live `#/argand` app to "Number Plane(s)"? Build the planned
   HTML page? Both? Is the page the app's `?` explainer, or a standalone guide?
2. **Naming**: "Number Plane" (singular, the user's phrasing) vs "Number Planes"
   (plural, the plan's — the *family* complex/dual/split). The app shows one plane
   at a time but the concept is the family.
3. The plan's own open questions (spine vs side-thread cut, the change-of-basis
   "find the rails" morph, carried-`j²` mechanics, Squeeze vs Boost naming).

Also open on the live app (five-hat Tier-1, from the synthesis): the fabricated
dual/split **quadratic fixed points** (drawn as confident gold dots — a real
correctness bug), the centered hint pill, the clipped "Re" label; and
`complexOps.ts` still has no tests.

Stopping here to let Dan direct scope.
</content>
</invoke>
