---
kind: progress
session: 2026-06-08-S01
date: 2026-06-08
title: Polygon Worlds — geometry kernel (M0 + Phase 0)
branch: claude/polygon-worlds-geometry-oe2iM
slug: polygon-worlds-geometry-oe2iM
status: in-progress
build: passed
followup: high
pr: https://github.com/piyarsquare/animath/pull/190
app: PolygonWorlds
---

# Polygon Worlds — geometry kernel (M0 + Phase 0)

## Session purpose

Execute the build plan's **§9 / M0 + Phase 0**: wire `analyzeSchema` into the host
(zero-risk; verified but unused) so worlds become edge words with a live
χ / orientability / curvature readout; then build the Three.js-free **Cayley–Klein
kernel** + `scripts/verify-geometry.ts` invariant battery (group axioms,
edge-pairing/deck closure, geodesic-closes-with-holonomy, angle-defect = κ·area),
plus `realize(word)` incl. the κ>0 chart and a measured ℍ² tile-growth/horizon-
culling budget. Freeze the kernel interface only once the battery is green. Do not
touch the ad-hoc covers until the new port is verified.

## Previous session

[2026-06-07-S01 — foundation done, full build plan ready](../polygon-worlds/2026-06-07-S01-expert-synthesis.md):
PR #190 ships four worlds via ad-hoc covers; `surfaceSchema.ts` base layer built &
table-verified; three-hats CONDITIONAL GO; complete plan in `docs/polygon-worlds-plan.md`.
No geometry-engine code yet. (Handoff lives under the `polygon-worlds` slug; this
session runs on the new `polygon-worlds-geometry-oe2iM` branch.)

## Working notes

<!-- Newest entry first. -->

### 🟡 milestone · 02:20 — Phase 0 kernel + invariant battery green (68/68)
**Why:** the kernel is the frozen-interface foundation; the plan says freeze only
once the battery is green, so the battery had to come with the kernel.

Built `lib/cayleyKlein.ts` — the Three.js-free unified constant-curvature kernel.
One representation for all κ via **curvature-trigonometry** `Cκ, Sκ` (entire in κ,
analytic κ→0 series, method chosen on `|κt²|` only — no `κ===0` branch). Model:
shell `⟨P,P⟩=1` with form `diag(κ,κ,1)`, basepoint `O=(0,0,1)`. **Isometries are
3×3 matrices = matrix exponentials of the rotation/translation generators**, so
`det=±1` reports orientation and composition is matrix multiply; at κ=0 the
translation generator's exp collapses to a plain Euclidean shift with no special
case. A `Frame` is a group element (parallel transport + holonomy for free). Plus
`distance`, `geodesicPoint`, `originTo`, `angleAt`.

Built `lib/invariants.ts` + `scripts/verify-geometry.ts` (mirrors
`verify-schemas`): **68 checks across κ ∈ {+0.5, 0, −0.5}, all PASS** —
curvature-trig identities + derivative relations, **form preservation by every
generator** (`MᵀGκM=Gκ`), group axioms, geodesic distance=s on the shell (machine
precision), isometry-preserves-distance, det/orientation signs, **Gauss–Bonnet
`excess = κ·area`** (independent: area from side lengths, excess from angle
measurement) and exact anchors (spherical octant excess = π/2; flat square closes
with zero holonomy; hyperbolic triangle negative excess). `npm run build` green;
added `npm run verify[:schemas|:geometry]`. Committed `099b011`, pushed. No app
render wired; covers untouched.

> [!IMPORTANT]
> **Convention chosen (resolves an ambiguity in the plan's sketch):** the plan
> wrote both "κ = curvature (κ>0 sphere)" and "form diag(1,1,−κ)" — opposite sign
> conventions. The kernel takes **κ = Gaussian curvature** (matches the χ→curvature
> table, the load-bearing decision) with form `diag(κ,κ,1)`. Documented in the
> kernel header. This is the one place I departed from the literal plan text.

### 🟡 milestone · 01:46 — M0 shipped: host reads topology from `analyzeSchema`
**Why:** the plan's zero-risk first win — make the foundation word-driven before
touching any cover, banking a real improvement immediately.

Each `WorldSpec` now carries its canonical **edge word** (torus `a b a⁻¹ b⁻¹`,
Klein `a b a⁻¹ b`, ℝP² `a b a b`, sphere `a a⁻¹ b b⁻¹`); `analyzeWorld(spec)` runs
the verified base layer and the Settings readout shows **live χ / orientability /
curvature / surface name** from it (not the stored cover invariants). Confirmed in
three ways: `npm run build` green; `verify-schemas.ts` (extended with a
world-word↔stored-invariants consistency check) all PASS; headless screenshot of
the open Settings drawer shows *"Edge word a b a⁻¹ b · Klein bottle · non-orientable
· χ = 0 · flat (κ = 0)"*. Rendering still via the ad-hoc covers — zero engine risk.
Committed `fa5a776`, pushed.

### 🟣 decision · 01:42 — Rebase this branch onto `claude/polygon-worlds`
**Why:** the geometry work must build on the verified foundation; the user chose a
linear-on-foundation history over a merge.

`git rebase --onto` hit conflicts because the foundation branch was cut from an
older `main`; since (a) `origin/claude/polygon-worlds` already contains all of
current `main` and (b) this branch's only unique commit was the progress report, I
reset hard onto the foundation and cherry-picked the report on top. Result: clean
linear history, build green, force-pushed.

### 🔵 finding · 00:00 — Branch is based on `main`; foundation is on `claude/polygon-worlds`
**Why:** the assigned dev branch (`claude/polygon-worlds-geometry-oe2iM`) was cut
from `main`, so it has none of the PolygonWorlds app, the plan, or `surfaceSchema.ts`
— all of which live on the unmerged `claude/polygon-worlds` (PR #190).

Read the four required context docs directly from `origin/claude/polygon-worlds`:
the foundation handoff, `docs/polygon-worlds-plan.md`, `surfaceSchema.ts`, and the
three-hats expert synthesis. Settled decisions confirmed understood (χ picks the
geometry; κ>0 polygon is a chart onto the round sphere, κ≤0 isometric domain; one
Cayley–Klein kernel with analytic κ→0; `DevelopPolicy` strategy; per-κ presenter;
skin-swap/flip from `det(deck)<0`; no big-bang). Prerequisite before any engine
code: bring the foundation onto this branch (`git merge origin/claude/polygon-worlds`).

## Plan for this session (M0 + Phase 0)

- [x] **Foundation** — rebase this branch onto `origin/claude/polygon-worlds`.
- [x] **M0** — host reads topology from `analyzeSchema`; live invariants readout.
      Shipped (`fa5a776`).
- [x] **Phase 0 kernel core** — `lib/cayleyKlein.ts` (points (x,y,w), form
      diag(κ,κ,1), analytic κ→0) + `lib/invariants.ts` + `scripts/verify-geometry.ts`.
      68/68 green (`099b011`).
- [ ] **`realize(word)`** — `lib/realize.ts`: tie `analyzeSchema`'s edge pairings to
      the kernel (regular polygon vertices + side-pairing isometries; κ from χ — flat
      regular, hyperbolic solved via `cosh(√−κ R)=cos(π/m)/sin(α)`, positive = chart).
- [ ] **`DevelopPolicy`** — `lib/develop.ts`: finite / lattice / Fuchsian tile
      enumeration with horizon culling.
- [ ] **Deck-closure battery** — extend `verify-geometry` with edge-pairing/deck
      relation closure (boundary-word product = identity) + holonomy-from-topology.
- [ ] **ℍ² budget** — measure tile-growth + horizon-culling cost.

> [!NOTE]
> **Checkpoint here.** M0 is shipped and the kernel + 68-check battery are green —
> the hard, interface-defining core is proven. The remaining Phase-0 items
> (`realize`/`develop`/deck-closure/perf) are the next chunk; the positive-curvature
> **chart** relation-closure is the subtlest piece and is coupled to the P2
> spherical presenter, so it wants care rather than a rush.

## Decisions & rationale

> [!IMPORTANT]
> Carried-in settled decisions (from the plan — not re-litigated): χ selects the
> model; realize every word (κ>0 = chart onto smooth round sphere, no cone points
> in the walk; κ≤0 = isometric fundamental domain); single Cayley–Klein kernel,
> analytic κ→0 (no `κ===0` branch); `DevelopPolicy` strategy; per-κ presenter seam;
> skin-swap + normal-flip driven by `det(deck)<0`; keep working covers until each
> port is screenshot-green.
