---
kind: handoff
session: 2026-06-07-S01
date: 2026-06-07
title: Polygon Worlds — foundation done, full build plan ready
branch: claude/polygon-worlds
slug: polygon-worlds
status: completed
build: passed
followup: high
pr: https://github.com/piyarsquare/animath/pull/190
app: PolygonWorlds
---

# Polygon Worlds — foundation done, full build plan ready

> [!IMPORTANT]
> **Next session starts here →** [`docs/polygon-worlds-plan.md`](../../../polygon-worlds-plan.md)
> (the complete soup‑to‑nuts build plan). Begin at its **§9 / M0 + Phase 0**: wire
> `analyzeSchema` into the host, then build the Cayley–Klein kernel +
> `verify-geometry.ts` battery. Don't touch the working covers until the port is green.

## Summary

**Polygon Worlds** is a new app (PR #190): walk a closed surface in first person,
built from one decorated fundamental polygon whose edge gluings decide the topology
and whose curvature is forced by it. This session shipped the app's four worlds
(torus / Klein / sphere / ℝP²) via *ad‑hoc covers*, then **laid the principled
foundation** to replace them: a verified edge‑word → invariants base layer
(`surfaceSchema.ts`), a three‑hats review of the full geometry plan, and — folding
in the review + a key realization decision — a **complete build plan**
(`docs/polygon-worlds-plan.md`). Mid‑session we also adopted the repo's new
Markdown report system and wired auto‑redeploy CI. No geometry‑engine code yet:
the next session executes the plan.

## What changed

- **New app, four worlds (PR #190).** `#/polygon-worlds`: one decorated square,
  edge‑gluing selects the world; torus / Klein (Euclidean cover) + sphere / ℝP²
  (spherical cover). Built clean, reusing the shared lib; TopologyWalk untouched.
  Includes the sphere‑is‑one‑sided fix, user‑controlled landmark count/arrangement,
  tunable floor slab/square size, glass + inner shell, and the square mini‑map.
- **Base layer — `surfaceSchema.ts` (verified).** From any 2n‑gon edge word it
  derives χ (union‑find on corners), orientability, forced curvature, classification,
  and edge pairings — no per‑surface special cases; canceling pairs handled.
  `scripts/verify-schemas.ts` passes the full classification tables (2‑gon … 8‑gon).
- **Three‑hats review** of the geometry plan → **CONDITIONAL GO** (see the
  [synthesis](../../progress/polygon-worlds/2026-06-07-S01-expert-synthesis.md)).
  Endorsed the develop‑via‑edge‑isometries direction; flagged the regular‑polygon
  realizer, the need for an early invariant battery, and no big‑bang.
- **Realization decision** (resolves the review's cone‑point objection): for κ>0 the
  polygon is a **chart** onto the genuinely smooth round sphere (distances distort,
  no cone points in the walk); for κ≤0 it's an *isometric* fundamental domain. So we
  realize **every** word — 2‑gons, all 4‑gons incl. the sphere/ℝP², the 6‑gon
  degenerate forms. χ picks the geometry; edge count is presentation.
- **Complete build plan** — `docs/polygon-worlds-plan.md`: the contract, the kernel
  (Cayley–Klein, `DevelopPolicy`, invariant battery), the per‑κ presenter seam, the
  tools/instruments, verification discipline, and mergeable phasing
  (M0 → Phase‑0 spike → Euclidean → Spherical → Hyperbolic → Instruments → morph).
- **Report system migrated** to Markdown + YAML (merged main #191); converted this
  branch's reports; control center builds clean.
- **CI: auto‑redeploy** — `redeploy-on-report.yml` re‑deploys the Pages control
  center whenever a `docs/sessions/**/*.md` report changes on any branch (verified
  firing).

## Key files

| File | Role |
|---|---|
| [`docs/polygon-worlds-plan.md`](https://github.com/piyarsquare/animath/blob/4dc0c6a/docs/polygon-worlds-plan.md) | **The plan. Start here next session.** |
| [`src/animations/PolygonWorlds/surfaceSchema.ts`](https://github.com/piyarsquare/animath/blob/4dc0c6a/src/animations/PolygonWorlds/surfaceSchema.ts) | Verified base layer: word → χ / orientability / curvature / edge pairings |
| [`scripts/verify-schemas.ts`](https://github.com/piyarsquare/animath/blob/4dc0c6a/scripts/verify-schemas.ts) | Table‑verification of the base layer (`npx tsx scripts/verify-schemas.ts`) |
| [`src/animations/PolygonWorlds/fundamentalSquareEngine.ts`](https://github.com/piyarsquare/animath/blob/4dc0c6a/src/animations/PolygonWorlds/fundamentalSquareEngine.ts) | Current facade (one facade + two ad‑hoc covers — to be replaced) |
| [`src/animations/PolygonWorlds/sphericalCover.ts`](https://github.com/piyarsquare/animath/blob/4dc0c6a/src/animations/PolygonWorlds/sphericalCover.ts) | The lon/lat sphere realization the plan retires |
| [`docs/sessions/progress/polygon-worlds/2026-06-07-S01-expert-synthesis.md`](https://github.com/piyarsquare/animath/blob/4dc0c6a/docs/sessions/progress/polygon-worlds/2026-06-07-S01-expert-synthesis.md) | Three‑hats convergence (+ the verbatim plan reviewed) |
| [`.github/workflows/redeploy-on-report.yml`](https://github.com/piyarsquare/animath/blob/4dc0c6a/.github/workflows/redeploy-on-report.yml) | Auto‑redeploy the control center on any report change |

## Open / not done

1. **The geometry engine is not built** — the four worlds still render through the
   ad‑hoc covers. The whole of `docs/polygon-worlds-plan.md` (M0 → P5) is pending.
2. **Immediate next step (M0 + Phase 0):** wire `analyzeSchema` into the host (zero
   risk — it's verified but currently unused), then build the **Cayley–Klein kernel
   + `verify-geometry.ts` invariant battery**; freeze the kernel interface only once
   the battery is green. No cover is touched until then.
3. **PR #190** is open with all the app work; not merged. The plan's M0 banks it.

## Context

- **The realization rule is settled:** χ picks the model (round sphere / plane /
  hyperbolic); the polygon is a *chart* for κ>0 and an *isometric* domain for κ≤0.
  This is the answer to the review's V>1 cone‑point objection — realize the smooth
  model, disclose the chart distortion, let the instruments read the true metric.
- **Honesty requirement** carried into the plan: never claim uniform curvature while
  inserting cone points; the mini‑map polygon is a chart, not an isometric copy.
- **Reports are Markdown now**; new reports use `_template-{progress,handoff}.md`;
  the cross‑branch control center is `npm run sessions` → `control-center.html`
  (gitignored, deployed to `/animath/sessions/`). Any report `.md` change on a
  branch carrying `redeploy-on-report.yml` auto‑refreshes the live page.
- **Verification tooling available:** `npm run build` (only CI), headless
  software‑WebGL screenshots (`npm run shoot` + puppeteer), and the schema battery
  pattern to copy for `verify-geometry.ts`.

## Self-reflection

**What I'd do with another session.** Execute the plan exactly as written: M0
(`analyzeSchema` wiring) + Phase‑0 (Cayley–Klein kernel + invariant battery), since
that proves the foundation before any cover is rewritten and unblocks every phase.

**What I'd change about what I produced.** I drafted the original geometry plan with
the "regular 2n‑gon, one corner angle" realizer that the pedagogy review correctly
demolished. A 20‑minute check of the base layer's vertex count against the headline
words *before* writing the plan would have caught the cone‑point issue myself.

**What I was not asked that matters.** Whether the spherical realization should be
the round‑sphere chart vs an isometric polygon — resolved with the user this session
(chart), but it was the load‑bearing decision and could have been surfaced earlier.

**What we both overlooked.** A concrete performance budget for hyperbolic tiling
(tiles / FPS / mobile) — flagged qualitatively, never quantified; the plan makes it
a Phase‑0 spike deliverable.

**What was difficult.** Reconciling "one unified kernel, no special cases"
(consultant) with "the sphere genuinely is a different, finite cover" (the math) —
resolved by χ‑selects‑model + a `DevelopPolicy` strategy, which is honest rather than
forced.

**What would have made it easier.** Writing the plan to a file from the start (it
was inline text to `/three-hats`), so the review and the plan lived together. Done
now: `docs/polygon-worlds-plan.md` + the embedded‑request convention in the
three‑hats skill.

**Follow‑up value: HIGH** — the foundation is verified and the full plan is written;
the next session can build straight from it with the hardest design questions
already resolved.
