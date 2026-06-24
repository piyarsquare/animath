---
kind: plan
session: 2026-06-22-S01
date: 2026-06-22
title: "Process audit — how we work together on animath: findings & recommendations"
branch: claude/process-audit-collaboration-tvrn9b
slug: process-audit-collaboration-tvrn9b
status: executed
build: n/a
followup: medium
pr: null
app: docs, general
signals:
next: Remaining open recs are the L1 debug-pose harness + mobile smoke (rec 2/3, own branch) and Dan's catalog/identity decisions (rec 8). See the adoption banner below.
---

# Process audit — how we work together on animath

*Findings & recommendations. Read-only audit; no process artifacts were changed this
session — adopting any recommendation below is a deliberate follow-up.*

> [!IMPORTANT]
> **Adoption update (2026-06-23).** The recommendations were taken up on this same
> branch; this doc is no longer findings-only. Status of each:
>
> - **Meta-finding (write→enact loop): DONE** — [`RECURRING_LESSONS.md`](../../RECURRING_LESSONS.md) ledger + quarterly cadence.
> - **Rec 1 (scope/reference gate, W2/W7): DONE** — `BUILDING_AN_APP.md` callout + recipe [R2](../../RECIPES.md). *Refined per Dan:* separate exploratory iteration (legitimate) from avoidable guessing; the lever is sharper inputs (other modalities), not more planning.
> - **Rec 4 (is-the-check-real, W3): DONE** — self-reflection Q7 + recipe R3.
> - **Rec 5 (test-on-write rule, W4): DONE (rule)** — `BUILDING_AN_APP.md` §6/§7 + recipe R4. *Open:* back-fill `complexOps.ts` tests.
> - **Rec 6 (lint the reports): DONE + CI** — `npm run sessions:lint`; now a **blocking** `--strict` step in `deploy.yml`. Scraper hardened (recovered 13 dropped reflections).
> - **Rec 7 (signals under-count): PARTIAL** — linter warns "says headless, no signal"; requiring/auto-deriving still open.
> - **Recs 2 & 3 (debug-pose harness + mobile smoke): OPEN** — highest tool-ROI; filed `!high` in `TODO.md` (own branch — touches app/scripts/CI).
> - **Rec 8 (catalog/identity decisions): NEEDS DAN** — the human-only class; still open.
> - **Rec 10 (`package.json` append-only): OPEN** — filed `!low` in `TODO.md`. **Rec 9 (sandbox-gotchas doc): not filed.**
>
> Beyond the plan: the **recipes cookbook** ([`RECIPES.md`](../../RECIPES.md)) turns
> the promoted rules into if-this-then-that form (Dan: *rules get ignored, recipes
> get followed*), wired into `/start-session`.

**Corpus.** 90 progress reports + 38 handoffs across ~33 branch folders
(`docs/sessions/`), plus 50 squash-merged PRs of git history (#172→#229,
2026-06-01 → 2026-06-22). Read by four parallel sub-agents (handoff
self-reflections · progress group A · progress group B · git history), then
synthesized. Branch slugs are cited as evidence throughout.

---

## TL;DR

The collaboration is **healthy and unusually honest**, and the report system
**works as memory**. The problem named in the session brief — *"we keep making
the same sorts of errors"* — is real and has a precise shape:

> The reports **faithfully record** the recurring failures, but nothing converts
> a thrice-repeated lesson into a **process change**. The feedback loop has a
> *write* step (reflections, signals, the Reflections digest) and no
> *read-and-act* step. This audit is the first read-and-act.

Two failures recur across the whole corpus, each **self-diagnosed by the agents
as the costliest habit**, neither ever institutionalized:

1. **"Verified headless, never on a real device."** Flagged in ~14 sessions.
   **Never once closed** in any handoff.
2. **"Build the full feature, then ask."** Over-iterating before pinning scope or
   getting a reference — ~9 sessions, often 3–5 build/revert cycles each.

Everything else below is detail and remedy for those two, plus a verdict on the
report patterns themselves.

---

## Are the report patterns successful?

**Yes as memory; only partly as a learning loop.** The direct question from the
brief, answered with evidence:

**What works (keep):**

- **Continuity is genuine.** No branch ever started cold when a relevant handoff
  existed. The handoff `next:` field is consumed *and amended* by the next
  session — even across branch boundaries (the Solid Worlds work threaded
  `polygon-world-app-review-8dduma` → `solid-worlds-review-bju3pc` →
  `3d-manifold-worlds-imwmal`, each reading the *other* slug's handoff). Sessions
  even **self-correct stale inherited backlog** ("PLAN.md's HIGH path-redesign
  item is stale — it was resolved in S06", `topology-world-review-m9p5as`).
- **The `**Why:**` discipline carries real reasoning, not ritual.** No empty Why
  lines were found. ~50% encode a causal/mechanistic *reason* ("Adreno faults the
  GPU on NaN shader output; desktop/SwiftShader don't"; "`height:100%` doesn't
  track the mobile visible viewport, `dvh` does"); the highest-value ones are the
  **fork/deferral rationales** (*why not* to build a thing, *which* of several
  paths) that would otherwise be lost. ~40% are honest prompt-provenance ("user
  asked for X"); only ~10% perfunctory restatement.
- **The long technical chains close their follow-ups.** Every HIGH/MEDIUM
  follow-up on the Polygon/Solid Worlds lineages was picked up and resolved
  (the screw-homology bug is the textbook case: flagged MEDIUM → quarantined →
  fixed → dropped to LOW with a dated edit).

**What doesn't (fix):**

- **The recurring lesson never becomes a rule.** "Verified headless, not on
  hardware" is flagged ~14× and closed 0×; it even reached PLAN.md's *Now* tier
  and *still* recurs. The Reflections digest *surfaces* these — but surfacing is
  not acting.
- **The format the digests depend on is fragile and silently breaks.** Off-spec
  entry types (`🟢 fix`/`feature`/`layout`/`beauty` in `polygon-walk-continue-4tyht3`,
  outside the closed decision/code/finding/blocker/milestone set), non-ASCII
  hyphens, HTML spans, and `followup:` casing variants have each broken the
  Reflections scraper — forcing an entire backfill sub-task in
  `control-center-category-filter` to repair 10 historical reports.
- **Discipline decays in long sessions.** The well-run reports keep `**Why:**` on
  every entry; the marathon `polygon-walk-continue-4tyht3` session dropped the Why
  label on most later entries and invented type words. The information usually
  survived in the body, but the contract lapsed.
- **`followup:` is sometimes abused as free-text status** (`stable-marriage-styling-ulMPt`:
  `followup: Tiers 0–4 shipped; Tier 5 pending`) where the schema wants
  `low/medium/high/null` — which breaks severity sorting.

---

## Strengths to preserve

1. **Non-fabrication honesty rigor — the strongest, most consistent signal.**
   Sessions repeatedly chose a vaguer-but-true result over a crisp fabricated one,
   and made *code throw rather than lie* (the SolidWorlds engine throws on a
   fractional axial offset "rather than lie"; the −a2 citation was flagged as
   search-derived, not primary-source, when arXiv 403'd). This is the
   ATTRIBUTION/CLAUDE.md honesty policy actually working.
2. **Verification batteries before/with the build.** Independent check suites are
   a repeated win and were named the single biggest enabler: PolygonWorlds' 100-
   check geometry battery ("caught the polygon-formula bug immediately"),
   SolidWorlds' dual-engine Γᵃᵇ vs cell-complex cross-check, StableMatching's
   1440-case brute force.
3. **Append-only shared-file discipline holds under real pressure.** CLAUDE.md was
   touched in 25 of 50 PRs, `apps.ts` in 13, `index.tsx` in 12 — yet **no conflict
   markers were ever committed to tracked files** (`git log -S'<<<<<<<'` is empty).
   A 9-app parallel chrome migration (`new-chrome`) merged with zero conflicts.
4. **Squash-merge keeps rework off `main`.** ~10% of sub-commits are corrective,
   but only 3 of 50 PRs were standalone fix PRs — churn is paid down inside the
   feature branch before it lands. The `npm run build` gate is load-bearing and
   PR bodies self-certify it ("build + 53 vitest tests + lint all green").
5. **Three-hats reviews catch real errors** before they ship (the F9 geometric
   overclaim, the cone-point realizer, two wrong ℝP² fixes when briefed
   adversarially).

---

## Recurring weaknesses & repeated errors

Ranked by frequency across the corpus; each is **PROCESS** unless noted.

### W1 — "Verified headless, never on a real device" (~14 sessions; never closed)

The dominant gap. The sandbox has no real GPU/touch device, so visual, touch, and
"feel" claims ship as hypotheses. `klein-bottle-fix` is the extreme: *"Nothing
here was verified in a running WebGL context… logically complete, visually
unverified"* — the entire chirality logic shipped on hand-traced confidence
(followup HIGH). The one defect class that **escaped to production** is exactly
this: mobile runtime crashes invisible to a desktop `tsc && vite build` (PR #216
Torus NaN→Adreno fault; PR #215 viewport height). Under-counted by `signals:`
(`phone-needed`/`visual-unverified` applied ~2× vs the ~14× the condition exists).

> [!NOTE]
> Three separate sessions (`animath-space-worlds-hm7wui`, `3d-manifold-worlds-imwmal`,
> `solid-worlds-review-bju3pc`) **independently requested the same fix**: a
> deep-link URL param to drive camera/world/pose for reproducible screenshots,
> plus a dev HUD (player determinant, current tile, nearest-marker distance). The
> corpus is asking for this tool by name and it has not been built.

### W2 — "Build the full feature, then ask" (~9 sessions; self-named costliest habit)

Building the maximal version of a feature, or the wrong reading of an ambiguous
instruction, before a cheap "how far / which meaning?" check.

- `complex-particles-torus-crash-tile`: built the full quadrant/filter/tint
  feature (2 commits) then **removed it in one** at the user's request.
- `topology-world-review-m9p5as`: **four full attempt-revert cycles** on the ℝP²
  seam (~5 hours) ending in a total `git checkout` to baseline. Self-reflection:
  *"After the second rejection I should have stopped coding and insisted on a
  reference."*
- `complex-numbers-...-jperz6` (Argand): *"I twice replaced an animation I had just
  shipped… could have asked the disambiguating question before building."*
- `polygon-worlds-spherical-p2-qgExR`: the trail/footprint layer rebuilt across
  S03–S06, then declared "not correct" and reset; *"I should have asked which
  'side' up front — cheap to clarify, expensive to iterate visually."*

The agents that adopted an up-front spec/questionnaire (S05→S06) measurably
reduced the thrash — so the fix is known and works, just not standard.

### W3 — A green check that wasn't a real check (~6 sessions; CORRECTNESS)

An automated probe or invariant passed while the user-visible result was wrong,
because the check measured the wrong thing.

- `solid-worlds-review-bju3pc`: a matching H₁/χ on a *broken* cell complex isn't a
  cross-check — the `verified` gate ignored `hom.manifold`, so a mislabeled
  didicosm passed (the reviewer caught it).
- `polygon-worlds-spherical-p2-qgExR` S06: *"the chirality probe checks
  orientation, not continuity — green probes happily coexisted with a teleporting
  world."* S05: a pixel probe was *spoofed by cyan corner discs*.
- `particle-viewer-ideas-priority-UDZRe`: *"diagnosed the 'fuzzy circle' three
  times wrong… analytic models each silently assumed default settings"* (a
  non-default log-radius toggle was on the whole time).

### W4 — Missing committed unit tests for testable pure logic (~6 sessions)

Pure math/engine logic verified with throwaway `/tmp` scripts that were never
committed, *despite a vitest harness existing*. `complex-numbers-...-jperz6`:
*"No unit tests for `complexOps.ts` despite it being eminently testable… I
verified with throwaway scripts that weren't committed."* The infrastructure
arrived (SolidWorlds/StableMatching now have real suites) but **the habit
recurs** — Argand and Trees-and-nets still shipped testless.

### W5 — Near-parallel copy instead of factoring; long branchy files (~5 sessions)

`klein-bottle-fix`: *"built the spherical engine as a near-parallel copy of the
flat one rather than factoring the shared concept — precisely the debt the next
session has to pay."* Recurs as ~340-line single-function decor (`rooms.ts`),
~600-line `ArgandPlane.tsx`, ~650-line StableMarriage component — each flagged as
"the file to refactor."

### W6 — Estimating complexity before reading the code it touches (~4 sessions; CORRECTNESS)

`polygon-world-app-review-8dduma`: *"scoped the cube platycosms as 'pure data'
before reading homology.ts's gluing assumptions… the estimate was
over-confident."* `review-todo-prioritize-g66uqj`: installed a lint ruleset blind,
then triaged 95 errors only to find them out of scope.

### W7 — Reasoning about orientation/chirality without seeing it (~6 sessions; intrinsic)

The dominant "what was difficult" answer for the topology family — distinct from
W1 in that it is the *intrinsic* hardness of handedness bookkeeping, not just the
tooling gap. The screw bug was "two independent bugs," intermittent across specs;
three self-consistent ℝP² models, only the determinant settled it. This one is
less "fixable" and more "respect it: front-load a reference and a det/continuity
check before moving any symmetry."

---

## Environment & tooling friction (external, recurring)

Worked around, rarely a hard block, but it taxes every session and weakened one
literature claim:

- **Sandbox 403s** on deploy trigger, branch deletion, and primary-source PDF
  fetch (arXiv/nLab/Wikipedia all 403'd in `3d-manifold-worlds-imwmal`, forcing a
  citation to rest on search summaries).
- **Container instability:** working tree reset to an old commit mid-session
  (`complex-sheet-ar9zA`); `vite preview` SIGTERM'd / exit-144
  (`agentic-sorting-app-j6ngd4`); `npm ci` cold-start build failure.
- **Wrong default branch on clone** — several polygon sessions opened on a
  harness-default branch and had to fetch/checkout the real one.
- **A GitHub UI branch rename silently closed PR #180** (`menu-bar`), costing a
  fresh PR.
- **`package.json` is not on the append-only protected list** — the one near-miss
  where conflict markers reached a remote merge commit was in `package.json` (not
  CLAUDE.md/apps.ts/index.tsx/README.md). Candidate to add to the list.

---

## The human-in-the-loop bottleneck

Implementation decisions are made autonomously and well. The reliably **deferred**
class is **irreversible catalog/identity choices** — and they *accumulate
unresolved* across many sessions:

- Should **Argand supersede Plane Transform**? (open; both live side-by-side).
- **Stable Marriage**'s fate — keep unlisted or delete? (open).
- Rename **Solid Worlds → Manifold Walk**? (deferred by Dan).
- The `!high` **plane/particles unification** mental model (open in TODO.md).
- **Teaching-claim validation** — "are the Lab's batch numbers trustworthy as a
  teaching claim?" — has no owner.

These block nothing technical but compound ambiguity, and several have sat open
for the entire 22-day window.

---

## Recommendations

Prioritized; each maps to the weaknesses above. **Findings-only — none applied
this session.** Most are small edits to the process artifacts
(`.claude/skills/*`, `docs/sessions/_template-*`, `REPORT_STYLE.md`,
`BUILDING_AN_APP.md`, `self-reflection.md`, CLAUDE.md).

### Tier 1 — attack the two dominant recurring failures

1. **Add a scope/reference gate before building visual or multi-mode features
   (→ W2, W7).** Bake a single cheap question into the build flow: *"which
   interpretation / how far should this go — and is there a reference image?"*
   before coding geometry or a feature with >2 modes. The corpus already proved
   the questionnaire works (S05→S06); make it a step in `BUILDING_AN_APP.md` and
   the build skills rather than a lesson each agent re-learns.

2. **Build the deep-link debug-pose harness + dev HUD (→ W1, W3).** A URL param
   that sets camera/world/pose for `shoot.mjs`, plus an opt-in HUD (determinant,
   tile, marker distance). Requested independently three times. It converts
   "verified headless" from a blind hypothesis into a reproducible visual diff and
   would have caught the teleporting-world and spoofed-probe cases. Highest
   tool-ROI item in the audit.

3. **A headless mobile-viewport smoke check (→ W1).** The *only* defect class that
   escapes CI is mobile/runtime. A `shoot.mjs` pass at 390×844 across all routes
   asserting no console error / no NaN-in-shader would have caught the #216 Torus
   crash cheaply. Not a substitute for a real-device pass, but it closes the
   no-cost tier. (Real-device passes remain a standing `signals: phone-needed`.)

### Tier 2 — make checks honest, and lock in tests

4. **"Does the passing check test the user-visible claim?" line in the handoff
   self-reflection (→ W3).** One prompt question forcing the agent to name what its
   green probe actually measures vs what the user sees. Cheap; directly targets the
   most dangerous (correctness) recurrence.

5. **Test-on-write gate for pure logic (→ W4).** `BUILDING_AN_APP.md`: a new app
   with a pure math/engine module must ship a committed vitest file. The harness
   exists; the discipline doesn't. Start by back-filling `complexOps.ts`.

### Tier 3 — harden the report system itself

6. **Lint the reports (→ report fragility).** Extend `build-sessions.mjs` (or add
   `npm run sessions:lint`) to reject: off-spec entry types, non-ASCII hyphens /
   HTML in scraped sections, non-enum `followup:` values, and out-of-order
   timelines. The scraper has already broken twice and forced a manual backfill —
   a validator pays for itself immediately.

7. **Make `signals:` required at handoff, or auto-derive it (→ W1 under-counting).**
   The real risk indicator today is the free-text phrase "verified headless," not
   the field. Auto-deriving `phone-needed`/`visual-unverified` from the text (or
   requiring the field) makes the dashboard's risk view trustworthy.

8. **Close the standing catalog/identity decisions in one Dan pass (→ bottleneck).**
   Argand↔Plane Transform, Stable Marriage's fate, Solid Worlds' name, the
   plane/particles model. They're cheap to decide and expensive to leave open.

### Tier 4 — environment papercuts

9. **One "sandbox gotchas" doc** (wrong default branch on clone, container reset
   to old commit, 403 on deploy/branch-delete/PDF, `npm ci` cold start) so each
   session stops rediscovering them. Some live in CLAUDE.md; the branch-checkout
   one doesn't.

10. **Add `package.json` to the append-only protected list** (the one real
    conflict-marker near-miss landed there).

---

## The meta-finding

The single most important takeaway: **the system is excellent at *recording*
lessons and has no mechanism for *enacting* them.** The Reflections digest was
built to surface recurring follow-ups — and it does — but "surfaced" and "fixed"
are different states, and nothing moves an item between them. The fix is
structural and small: a recurring lesson that appears in ≥3 reflections should be
*promoted* out of the per-session reflection stream into a durable rule (a line in
`BUILDING_AN_APP.md` / a skill / a CI check) and then *removed* from the recurring
list. This audit performed that promotion manually for the first time; doing it on
a cadence (a quarterly "process audit" of exactly this shape) would close the loop
the report system was always missing.
