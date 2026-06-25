---
kind: handoff
session: 2026-06-24-S01
date: 2026-06-24
title: Argand five-hat review → Number Planes narrative + plan (in-app experiments shelved)
branch: claude/argand-plane-review-51egvz
slug: argand-plane-review-51egvz
status: completed
build: passed
followup: null
pr: https://github.com/piyarsquare/animath/pull/237
app: docs, argand
signals: needs-dan
next: Draft the Number Planes choice-driven HTML page prose-first per the plan — or converge the plan's open questions with Dan first.
---

# Argand five-hat review → Number Planes narrative + plan (in-app experiments shelved)

> [!IMPORTANT]
> **This session ended somewhere very different from where it started.** It began as
> a 5-hat design/UX review of the **Argand** app; it *ended* as **narrative
> co-design for a new educational page ("Number Planes")**, with a long detour
> (number-line mode + a guided tour) that was **built, then deliberately shelved**.
> The thing to continue from is the **plan doc**, not the app.

## Summary

A very long, winding session. Three phases: (1) a **five-hat review** of Argand
(`#/argand`) — synthesis + cross-app "Number Planes"/polar discussions + a verified
attribution scout; (2) **plane-app polish + a math-first foundation** (`numberPlanes.ts`
+ 50 tests) kept; a **number-line/tour/LineTransform experiment** built then **reverted**
(it inherited too much plane-app chrome and the formulation wasn't right); (3) **deep
narrative co-design** with Dan for a *choose-your-own* HTML teaching page about the
three number planes, ending in a single tracked **plan**. PR #237 is green
(build/tests/lint). The app is back to its plain plane state.

## What changed (net, on disk)

**Kept / live:**
- **`src/animations/Argand/numberPlanes.ts`** + `__tests__/numberPlanes.test.ts` — a
  fresh, *math-first* engine designed from the three classes (generic algebra over
  `p=j²`, polar layer, a `plane(p)` strategy). **Dormant** (not wired into any UI),
  but it's the engine the planned page needs. 50 assertions; `npm test` 128/128.
- **Plane-app polish** (Argand): coefficient precision (round-on-drag), de-duplicated
  feed switcher, fixed the Essentials panel overlap, scrubbed the "successor to Plane
  Transform" framing.
- **The five-hat review corpus** + **the consolidated plan** (below).

**Shelved (in git history only — reverted from the tree):** a 1-D **Line mode**
(ticks/±1/fill), a guided **walkthrough/tour**, and a standalone **LineTransform**
view + route. All removed; the app was `git checkout`-reverted to commit `bc404f7`.

## The thing to continue from

> [!IMPORTANT]
> **`docs/sessions/progress/argand-plane-review-51egvz/2026-06-24-S01-plan-number-planes-page.md`**
> (`kind: plan`, `status: proposed`, `signals: needs-dan`) is the **single home** for
> the Number Planes story **and** the build plan. Read it first.

The plan: an **HTML educational page** in the `public/*-guide.html` family (serif
prose + embedded applets + source lines), but **JS-driven** and navigated as a
**curiosity-driven web** — a short **spine** (line → choose `j²` → the magnitude →
how many "rails" `t²=p` → iterate & feel it → the dial is a circle) with **"tell me
more about X"** side-threads (quadratics, p-space, eigenvalues, complex multiplication,
why split = ℝ×ℝ, …) and a terminal **Hamilton → quaternions** leaf. The carried `j²`
choice colors many nodes. Math decided: stay in 2-D; the felt core is **separable
(split, 2 rails) vs. entangled (complex, 0 rails)**.

## Key files

| File | Role |
|---|---|
| [`…/2026-06-24-S01-plan-number-planes-page.md`](https://github.com/piyarsquare/animath/blob/5072454/docs/sessions/progress/argand-plane-review-51egvz/2026-06-24-S01-plan-number-planes-page.md) | **START HERE** — the Number Planes story + the choice-driven-web build plan + open questions |
| [`…/2026-06-24-S01-expert-synthesis.md`](https://github.com/piyarsquare/animath/blob/5072454/docs/sessions/progress/argand-plane-review-51egvz/2026-06-24-S01-expert-synthesis.md) | The five-hat review synthesis (R1 UX + R2 cross-app + R2.6 polar) |
| [`…/2026-06-24-S01-attribution-sources.md`](https://github.com/piyarsquare/animath/blob/5072454/docs/sessions/progress/argand-plane-review-51egvz/2026-06-24-S01-attribution-sources.md) | Web-verified sources + a drop-in EXPLAINER block (staged, not applied) |
| [`src/animations/Argand/numberPlanes.ts`](https://github.com/piyarsquare/animath/blob/5072454/src/animations/Argand/numberPlanes.ts) | Math engine for the page (dormant); `mulG`/`normG`/`powReal`/polar/`plane(p)` |
| [`src/animations/Argand/__tests__/numberPlanes.test.ts`](https://github.com/piyarsquare/animath/blob/5072454/src/animations/Argand/__tests__/numberPlanes.test.ts) | 50 assertions (norm-multiplicativity, polar round-trip, fixed points) |
| [`public/guides.html`](https://github.com/piyarsquare/animath/blob/5072454/public/guides.html) | Index of the existing guide-page family (the format to match) |
| [`src/animations/Argand/Argand.tsx`](https://github.com/piyarsquare/animath/blob/5072454/src/animations/Argand/Argand.tsx) | The live plane app (restored; uses `complexOps.ts`, not `numberPlanes.ts`) |

## Open / not done

- **The page itself is not built** — only planned. The plan's **open questions** (spine
  vs. side-thread cut; design the change-of-basis "find the rails" morph; carried-`j²`
  mechanics; Squeeze vs. Boost) need Dan before drafting.
- **`numberPlanes.ts` is dormant** — not imported by any component. The planned
  `#/embed/number-planes` applet would be its first consumer.
- **`complexOps.ts` (the *live* app math) still has no tests** — the review's Tier-0
  item; `numberPlanes.ts` is tested, but the app runs on `complexOps.ts`.
- **Five-hat review Tier-1 items remain open on the plane app** (the one real
  correctness bug = fabricated dual/split quadratic fixed points; the centered hint
  pill; clipped "Re") — see the synthesis. Untouched if anyone resumes plane polish.
- **PR #237 sprawls** (review docs + plane polish + numberPlanes + plan + shelved
  experiments in history). Could be tidied/split; not blocking.

## Context

> [!NOTE]
> **Naming:** the idea is **Number Planes**; the three motions **Spin / Shear /
> Squeeze** (Dan leans *Squeeze* over *Boost*, which imports relativity — undecided).
> Keep proper nouns (Cayley–Klein, Minkowski, Galilean) to a sources aside.

- **The math that got nailed down this session** (all in the plan doc): the `t²=p`
  spine (0/1/2 real roots = complex/dual/split = 0/1/2 rails); split ≅ ℝ×ℝ via
  idempotents `e±=(1±j)/2` in the null basis; `|·|` is always `|·|_p=√|x²−p·y²|`
  (net/area scaling, so "|α|<1 ⇒ attractor" is complex-only); the dial is a **circle**
  (dual at `p=0` *and* `p=∞`; `x↔y` is `p↦1/p`); eigenvectors-as-"rails".
- **Verification** was `npm run build` (green) + `npm test` (128/128) + `sessions:lint
  --strict` (0 errors) at each commit, plus headless screenshots for the shelved
  visual work. The narrative phase is reasoning/design only.
- The app was reverted with `git checkout bc404f7 -- Argand.tsx ArgandPlane.tsx` +
  removing `tour.ts` and `LineTransform/`; that's why the shelved code lives only in
  history.

## Self-reflection

1. **What would you do with another session?** Converge the plan's open questions with
   Dan (especially the spine/side-thread cut and the change-of-basis morph), then draft
   the first few nodes of the page **prose-first** in the guide format, with a JS
   navigation skeleton — and stub the `#/embed/number-planes` applet on `numberPlanes.ts`.
2. **What would you change about what you produced?** I built the number-line/tour
   detour *into the plane app* before checking the formulation was right — it inherited
   chrome it shouldn't have and had to be reverted. I should have separated "is this the
   right model?" from "build it" one cycle earlier (the recurring "separate exploring
   from guessing" lesson, R2 in RECIPES — it recurred here).
3. **What were you not asked that you think is important?** Whether PR #237 should be
   split — the review (mergeable docs) and the narrative/engine work have become one
   sprawling PR. Worth deciding before it grows further.
4. **What did we both overlook?** That `complexOps.ts` — the math the *shipping* app
   actually runs on — is still untested; the new tests cover `numberPlanes.ts`, which
   nothing uses yet. The safety net is on the dormant module, not the live one.
5. **What did you find difficult?** Keeping the design from over-reaching: each "make
   it teach better" instinct pulled toward more UI, when the right move was less. The
   reset to "write the document first" only landed after several wrong turns.
6. **What would have made this task easier?** Pinning the *artifact* (a prose-first
   HTML page, not an in-app mode) at the start. Most of the churn was discovering that
   the teaching belongs in a document, not bolted onto the plane viewer.
7. **How did you verify this, and does each passing check test the user-visible
   claim?** Code phases: `npm run build` + `npm test` (128/128) + `sessions:lint
   --strict` — all real and green. Shelved visual work: headless screenshots (real, but
   the *animations*/touch were `visual-unverified`, now moot since reverted). The final
   deliverable (the plan + narrative) is **design/reasoning only** — no executable claim
   to verify; the math was checked by derivation, not code.
8. **Follow-up value:** MEDIUM — the plan is coherent and the math is solid, but the
   page is unbuilt and several design forks need Dan's call before drafting; and the
   live app still carries the review's open Tier-1 items plus an untested `complexOps.ts`.
