---
kind: progress
session: 2026-06-07-S01
date: 2026-06-07
title: Polygon Worlds — base layer, plan review, and report tooling
branch: claude/polygon-worlds
slug: polygon-worlds
status: completed
build: passed
followup: high
pr: https://github.com/piyarsquare/animath/pull/190
app: PolygonWorlds
---

# Polygon Worlds — base layer, plan review, and report tooling

## Session purpose

Continue the **Polygon Worlds** app (one decorated fundamental polygon → four
worlds by edge‑gluing): finish the curved worlds correctly, lay the principled
**base layer** the user asked for ("one sheet, a curvature, paired edge
assignments; works for any edge word"), get the full geometry plan reviewed, and —
mid‑session — adopt the repo's new Markdown session‑report system and make the
Pages control center refresh itself.

## Previous session

[2026-06-07-S02 — Polygon Worlds app (Phase 1)](../klein-bottle-fix/2026-06-07-S02-polygon-worlds-app.md):
stood the app up as a new self‑contained module (Euclidean cover, torus + Klein),
shipped on PR #190.

## Working notes

### 🟢 code · 20:55 — CI: report‑change → Pages redeploy dispatcher
**Why:** the cross‑branch control center only refreshed on push‑to‑main / daily
cron, so a report added or edited on a feature branch lagged the live page.

Added `.github/workflows/redeploy-on-report.yml`: on push of any
`docs/sessions/**/*.md` (added, modified, or deleted) to a non‑main branch, it
dispatches the **main** "Deploy demo" run, which re‑fetches all branch tips and
rebuilds `control-center.html`. Dispatches `ref=main`, so the deployed app stays
main's build — only the session index updates. Active on branches carrying the
file (repo‑wide once on main).

> [!NOTE]
> Could not trigger a deploy from here to verify live — the GitHub MCP integration
> token is restricted (`403`). That's a different, more‑restricted token than the
> Actions `GITHUB_TOKEN` the dispatcher uses (`workflow_dispatch` is exempt from
> the GITHUB_TOKEN recursion rule), so the dispatcher should still fire.

### 🟢 code · 20:30 — Migrated this branch's reports to Markdown
**Why:** main landed #191 (session reports HTML → Markdown + YAML, cross‑branch
control center); bring the branch into form per `docs/sessions/MIGRATION.md`.

Merged `origin/main` (clean), converted every remaining `.html` report → `.md` via
`convert-html.mjs` and `git rm`'d the HTML, and added the three‑hats review as
Markdown. `npm run sessions` builds clean (**17 reports · 8 sessions · 6
branches**); generated artifacts stay gitignored.

### 🟣 decision · 19:30 — Three‑hats review of the geometry plan → CONDITIONAL GO
**Why:** before rewriting the foundation into a general
develop‑via‑edge‑isometries engine (square → octagon, κ ∈ {0,+,−}), pressure‑test
it across all targets.

All three lenses endorse the direction and the base layer, but gate it. See the
[synthesis](./2026-06-07-S01-expert-synthesis.md) (+ maintainer / consultant /
pedagogy).

> [!IMPORTANT]
> The pedagogy lens found a real flaw: "realize every word as a *regular* 2n‑gon
> with one tuned corner angle" only holds when all corners glue to one vertex
> class (V = 1) — **false** for ℝP² (V = 2) and the sphere (V = 3), where it
> inserts hidden cone points. Fix = a **V = 1 realizability gate** (straight out of
> the base layer) + a **Phase‑0** Cayley‑Klein `(x,y,w)` kernel and invariant
> battery before the curved phases; keep the working covers until the port is
> green; ship the extrinsic embedding inset with the first non‑orientable surface.

### 🟡 milestone · 18:30 — Base layer: edge‑word → surface schema engine
**Why:** the user asked to "back up" to one principled base (a sheet, a curvature,
paired edge assignments) that works for *any* edge word, not per‑surface hacks.

`surfaceSchema.ts` (pure math, no Three.js): from any 2n‑gon edge word in
`a,b,…` with/without inverses it derives χ (union‑find on corners), orientability,
forced curvature sign, and the classification name — canceling pairs handled
automatically. `scripts/verify-schemas.ts` checks `analyze()` against the full
classification tables (2‑gon … 8‑gon) — **all rows pass**.

### 🟢 code · 17:30 — Sphere is one‑sided; user‑controlled decor; tree numbers
**Why:** user feedback — the sphere wrongly split into trees/columns hemispheres
(it's orientable: one walkable skin), and tree number decals were buried in the
foliage.

Sphere now wears one skin on the outer surface with columns on the inner shell
(adjacent‑fold intent); ℝP² keeps the antipodal split. Added **Landmarks** count
(1–14) + **Arrangement** (scattered/grid/ring) settings; moved the tree number to
the trunk so it reads on both forms.

### 🟢 code · 16:30 — Spherical cover: all four worlds + tunable floor
**Why:** complete the static engine across torus / Klein / sphere / ℝP².

Added the spherical cover (great‑circle walk, inner shell), a colored floor *slab*
with tunable thickness and square size, and the under‑surface fixes. One facade +
two cover models; build green, screenshot‑verified in headless software‑WebGL.

### 🟡 milestone · 15:30 — Polygon Worlds created as a new app (PR #190)
**Why:** the unified "one square, four worlds" vision is a new primitive, built
clean rather than patched into TopologyWalk.

New self‑contained app at `#/polygon-worlds`, reusing the shared lib; TopologyWalk
left intact. PR #190 opened.

## Status

- ✅ Base layer (`surfaceSchema.ts`) built + table‑verified; **not yet wired into
  the app** (the cheap next win the maintainer flagged).
- 🟡 App (PR #190): torus / Klein / sphere / ℝP² walkable; build green; the curved
  cases are the ad‑hoc covers that the reviewed plan will replace.
- ✅ Reports migrated to Markdown; control center auto‑redeploys on report change.

> [!WARNING]
> Open design debt from the review: the geometry realizer must respect vertex
> classes (V), and the spherical cases must be the adjacent‑fold / antipodal‑S²
> realization — not "the square engine at κ > 0". Resolve before the curved
> rewrite.

## Next

Session **handed off**. The complete build plan is written and is where the next
session picks up:

- 📋 **Plan:** [`docs/polygon-worlds-plan.md`](../../../polygon-worlds-plan.md) — soup‑to‑nuts.
- 📨 **Handoff:** [`…/handoff/polygon-worlds/2026-06-07-S01-foundation-and-plan.md`](../../handoff/polygon-worlds/2026-06-07-S01-foundation-and-plan.md).

Start at the plan's **§9 / M0 + Phase 0**: wire `analyzeSchema` into the host
(zero‑risk), then build the Cayley–Klein kernel + `verify-geometry.ts` battery;
freeze the kernel interface only once the battery is green; don't touch the working
covers until each port is screenshot‑green.

> [!NOTE]
> The "V > 1 realizer" debt flagged above is **resolved** in the plan: realize the
> smooth model (round sphere for κ>0) with the polygon as a *chart* — so we realize
> every word (2‑gons, the 4‑gon and 6‑gon spheres/ℝP²) with no cone points, and
> disclose the chart distortion.
