---
kind: plan
session: 2026-07-02-S02
date: 2026-07-02
title: Deep codebase review — accidental-complexity audit
branch: claude/clean-up-loose-ends-8b0wqp
slug: clean-up-loose-ends-8b0wqp
status: proposed
build: passed
followup: null
pr: null
app: general
signals: needs-dan
next: Dan to approve the "quick wins" tier (dead-file/dead-export/probe-script/stale-doc deletions) and decide the 4 judgment calls (TopologyWalk, Argand engines, *_UI.md docs, Trinary color pipeline).
---

# Deep codebase review — accidental-complexity audit

A full "have we overcomplicated anything" sweep of animath, run as **16 parallel
reviewers** (13 area reviewers + 3 cross-cutting hunters: dead-code, duplication,
convention-drift), each grounding findings in `rg`/`grep` against the real code
with an *essential-vs-accidental* filter, followed by adversarial spot-checks of
the load-bearing structural claims. This report deduplicates and ranks the
verified findings, and ends with a two-tier action list (safe quick wins vs.
decisions for Dan).

> [!NOTE]
> **The codebase is in good shape.** The framework's core — the workspace engine,
> the app-registry/routing protocol, persistence, the closed icon vocabulary, the
> particle engine, the theming token system, the CI workflows, dependencies — is
> clean and well-reasoned. Almost everything below is *accretion at the edges*:
> retired-app residue, dead files/exports left after refactors, one-off scripts,
> and pre-redesign docs. The one structural item worth real thought is the
> duplicated df64 shader; the rest is deletion and small consolidation.

## Executive summary

The audit found **no architectural overcomplication in the live framework** — the
patterns the project standardized on (self-contained app folders, `<Workspace>`,
`usePersistentState`, the colormap registry, the 11-archetype rail) are respected
almost everywhere. The accidental complexity is concentrated in five buckets:
(1) a **duplicated df64 deep-zoom shader** copy-pasted between the two fractal
apps — the single genuine maintenance hazard; (2) a **~2,200-line layer of
pre-redesign `*_UI.md` docs** describing a chrome (`AppShell`) that no longer
exists, one of them for a *deleted* app; (3) the **retired TopologyWalk app**
(~2,500 lines, gallery-hidden, imported by nothing); (4) **two parallel Argand
math engines** (a tested-but-dead one and an untested-but-live one); and (5) a
long tail of **dead files, dead exports, and one-off probe scripts**. The headline
recommendation: do the mechanical deletions now (they're low-risk and shrink the
repo by thousands of lines), and bring four judgment calls to Dan.

## Methodology & confidence

- **16 reviewers**, each returning findings with file:line evidence and a grep
  that proves the claim. Every "X is dead" claim required a repo-wide symbol
  search including dynamic references (route map, `apps.ts`, `catalog.ts`, `?raw`
  imports, CI, npm scripts).
- **Adversarial verification** already earned its keep: one hunter flagged
  `runBattery` (PolygonWorlds/lib/invariants.ts) as dead — but it's called by
  `scripts/verify-geometry.ts` (`npm run verify:geometry`). **Dropped.** Treat any
  single-source "dead" claim below as high- but not absolute-confidence; a
  `npm run build` + the existing probes confirm each deletion.
- **Corroboration is strong on the big items:** `styles/responsive.ts` (3
  reviewers), the df64 duplication (3 reviewers), the Argand engine split (3
  reviewers), and the stale `*_UI.md` layer (2 reviewers) independently converged.
- I directly re-verified the structural claims: TopologyWalk *is* still at
  `apps.ts:76` (despite docs saying it was removed) yet absent from `catalog.ts`
  META; `MAX_ITER 4000` appears in 4 places; the 3 orphaned `.html` files,
  `responsive.ts`, `uniforms.d.ts`, and `unported_examples/` all exist.

---

## Findings by theme (ranked)

### T1 — Duplicated df64 deep-zoom shader (the one real hazard) · HIGH

The emulated-double-precision GLSL (`dfAdd`/`dfMul`/`dfNeg`/`dfAbs`, Dekker split
`4097.0`) is **byte-for-byte identical** between
`src/animations/FractalsGPU/FractalsGPU.tsx:106-132` and
`src/animations/Correspondence/FractalPane.tsx:111-137`. The iteration ceiling
`MAX_ITER = 4000` is hardcoded in **four** places (`FractalsGPU.tsx:29,99`,
`FractalPane.tsx:105`, `Correspondence.tsx:13`), and the JS `splitDouble` +
`clampIter`/`suggestedIter` helpers are duplicated alongside. The df64 handoff
already shows a precision fix had to be mirrored into both files — the exact
copy-paste smell.

- **Why it's not cheap duplication:** any change to the emulated-double arithmetic
  or the escape ceiling must be applied twice, silently, or the two viewers drift
  out of numerical agreement.
- **The project already knows how to share GLSL:** `lib/colormaps.ts:13` exports
  `PALETTE_GLSL` as a template string that *both* shaders inline. The df64 block
  should follow the same pattern.
- **Recommendation:** extract the EFT primitives + `MAX_ITER` into a `DF64_GLSL`
  const (new `lib/df64.ts` or beside `PALETTE_GLSL`), inline in both shaders; lift
  `splitDouble`/`clampIter`/`MAX_ITERATIONS` into one shared JS helper.
- **Effort:** low (text is already identical → behavior-preserving). **Risk:** low
  (verify with `scripts/df64-gpu-probe.mjs`). *Also: `FractalPane.tsx` declares its
  shader strings inside the component body — hoist to module scope during this.*

### T2 — Pre-redesign `*_UI.md` documentation layer is stale · HIGH (docs)

Eight `docs/*_UI.md` "Interface Manual" files (**2,232 lines**) document a chrome
called **`AppShell`** with a "drawer + tabs + ActionFloater" — none of which exist
anymore (the live chrome is `src/chrome/` `<Workspace>`). `AppShell` survives in
`src/` only as historical comments. Sub-items:

- **`STABLE_MARRIAGE_UI.md` documents a DELETED app** under a dead route
  (`#/stable-marriage`; the live app is `#/stable-matching`). Unambiguously safe
  to delete.
- **`GLOBAL_APP_DESIGN.md`** (344 lines) exists only to index the `*_UI.md` set and
  references a doc that no longer exists (`MOBIUS_WALK_UI.md`).
- These are fully superseded by the **live `docs/apps/*.md` guide system** (13
  guides, YAML frontmatter, consumed by `build-sessions.mjs`) — which is current
  and complete (no stale `stable-marriage.md`).
- **Recommendation:** `git rm` the eight `*_UI.md` files + `GLOBAL_APP_DESIGN.md`.
  Nothing in build/CI/src consumes them. **Effort:** trivial. **Risk:** very low.

### T3 — Retired TopologyWalk app (~2,500 lines) · MEDIUM · NEEDS DAN

TopologyWalk is superseded by Polygon Worlds and is **gallery-hidden**
(`catalog.ts` META has no `/topology-walk` entry), **imported by nothing**, and
reachable only via the lazy route + two legacy redirects (`#/mobius`,
`#/wrap-world`) that have no in-product links.

- **Latent inconsistency to fix regardless:** CLAUDE.md and
  `docs/apps/topology-walk.md` claim it was "removed from apps.ts," but the entry
  is **still present at `src/apps.ts:76-79`** (inert, since catalog filters by
  META). Reconcile this either way.
- **The one thing with no Polygon Worlds equivalent** is the twisting **Möbius
  corridor** (`corridorEngine.ts` + `corridorGeometry.ts` + shaders). A straight
  delete loses it.
- **`character.ts` is byte-identical** between PolygonWorlds and TopologyWalk
  (resolved automatically by deleting TW).
- **Recommendation (Dan's call):** either **delete the folder + `apps.ts` entry**
  (~2,500-line clean removal; redirects fall back to Gallery), or **port the
  corridor into PolygonWorlds as a 4th "look" first, then delete.** Absent a reason
  to keep the corridor, deletion is the clean move.

### T4 — Two parallel Argand math engines · MEDIUM · NEEDS DAN

`Argand/numberPlanes.ts` (290 lines, **tested with ~30–50 assertions**) and
`Argand/complexOps.ts` (387 lines, **untested**) implement the *same* p=j²
generalized algebra (mul/conj/norm/inv/div/exp/log/powReal/affine/fixedPoint/
polyEval/polyFixedPoints/criticalPoint), bodies line-for-line equivalent modulo
`{re,im}` vs `{x,y}` naming. **The live app imports `complexOps`; `numberPlanes`
is imported only by its own test.** So the *tested* engine is dead and the
*shipping* engine is untested — two authoritative copies of delicate algebra (the
p→0 continuation in exp/log) that can silently drift.

- **Neither is a strict superset** (numberPlanes adds a polar layer + `plane(p)`
  strategy; complexOps adds all the Argand animation/format/snap helpers), so it's
  not a trivial swap.
- **Recommendation (Dan's call):** fold `complexOps` onto the `numberPlanes` core
  (thin `{re,im}`↔`{x,y}` shim; delete the duplicated primitives from complexOps,
  keep its Argand-specific path/format layer) — this puts the *live* math under the
  existing suite and removes the second copy. Mirroring tests onto complexOps
  instead would lock in the duplication. **Effort:** medium; tests de-risk it.

### T5 — Dead files, orphaned modules & dead exports · LOW · mostly trivial

High-confidence deletions (grep-proven zero callers). **Quick wins:**

| Item | Location | Notes |
|---|---|---|
| `styles/responsive.ts` (whole module, 8 exports) | `src/styles/responsive.ts` | Superseded by `usePhone.ts`; **3 reviewers**. Delete file + CLAUDE.md tree line. |
| `types/uniforms.d.ts` (whole file) | `src/types/uniforms.d.ts` | `QuatUniform`/`ProjectionUniforms` unreferenced; only file in `src/types/`. |
| `unported_examples/fractint-simulator.tsx` (543 lines) | tsconfig-excluded | Inert dead stash; duplicates FractalsGPU. Delete (git preserves). |
| `CorridorPreview` + `'corridor'` PreviewKind (~45 lines) | `chrome/previews.tsx` | Preview for retired TopologyWalk; no card maps to it. |
| Dead `hue` prop (catalog→Gallery→Preview) | `catalog.ts`, `Gallery.tsx`, `previews.tsx` | Threaded but never read; stale JSDoc. |
| `stone`/`metal` particle textures (~90 lines) + persisted `textureStyle` | `lib/textures.ts`, `useParticleState` | No UI ever requests them (checker only). |
| `Breakdown` readout (unused) + `search`/`list` icons | `chrome/readouts.tsx`, `icons.tsx` | Judgment: readouts.tsx is a curated toolkit — trimming optional. |
| ~15 dead exports | see list below | `makeUnitQuat`+`Axis4D` (viewpoint), `frozenTime` (debugPose), `hornerAt`/`hornerWaypoints`/`addPath` (complexOps), `treeSupport`/`makeMetric`/`MAP_BETA`/`canonicalCircularOrderId` (Trees), `dot3`/`frameLeft`/`tanK` (cayleyKlein), `SCHEMA_LADDER`/`wordToString` (surfaceSchema), `faceMotifTexture`/`rotationAngleDeg` (SolidWorlds), `kindLabel` (numberPlanes), `screenToComplex` (FractalPane), `paramToFrame` (corridorGeometry). |

Plus ~30 complexMath helpers and several `*Props`/`make*Texture`/`skellam` symbols
that are `export`ed but used only in-file — **over-exports, not dead code**: drop
the `export` keyword to signal the real public surface (cosmetic, batch later).

> [!NOTE]
> **Known-parked, decide explicitly:** `TreesAndNets/lib/{associahedron,mosaic}.ts`
> (427 lines, the Fibers explorer) are genuinely dead and **untested** (so they can
> bitrot). Backlog says "leave parked." Options: annotate as parked, or delete (git
> restores). Also `fattenTree.ts`'s `fattenedMetric`/`companionSide` and much of
> `trees.ts` are tested-but-unsurfaced engine — cheap to carry, just annotate.

### T6 — One-off probe scripts in `scripts/` · LOW-MED (Dan's flagged area)

Dan specifically flagged the run/deploy machinery. The **workflows (5) and
dependencies are clean and well-reasoned** (no puppeteer/playwright duplication —
playwright is only a transitive vitest optional peer). The accidental complexity is
**~10 orphaned one-off scripts** with zero npm/CI/doc callers, all from
point-in-time investigations:

- **Delete:** `probe-actionbar.mjs`, `probe-fullscreen.mjs`, `probe-hints.mjs`,
  `probe-raf.mjs`, `probe-split.mjs`, `probe-lib.mjs` (serves only those five),
  `shoot-pw.mjs` (misnamed — imports puppeteer, not playwright; a Polygon-Worlds-only
  duplicate of `shoot.mjs`), `sign-shots.mjs`, `test-rotations.ts`,
  `probe-trivial-words.ts`. All grep-proven orphaned; behaviors now covered by
  `smoke.mjs`/`tour.mjs`.
- **Keep** (documented reusable harnesses): `df64-gpu-probe.mjs`,
  `df64-image-probe.mjs`, `trail-chirality.mjs`, `verify-schemas.ts`,
  `verify-geometry.ts` — consider giving them npm aliases so their run-command is
  discoverable, and giving the `verify-*` batteries a real test/CI home so they
  can't silently rot (they're the only correctness gate for the geometry kernel and
  aren't CI-gated; also `npx --yes tsx` re-downloads `tsx` each run — add it as a
  devDep).
- **Minor:** `screenshots.yml:53-65` hand-mirrors the apt list from
  `install_headless_webgl.sh` (drift risk).

### T7 — Trinary theming-v2 migration debris · MEDIUM

Two items left behind when BasinMap moved to theme-tracking ramps:

- **Dead per-pixel basin path** (~80 lines): `computeBasinPixel` → `computeStatPixel`
  → `runPlanet`/`runPlanetLyap` (`lab/basin.ts`, `lab/runner.ts`) — superseded by the
  batched path, zero callers.
- **Vestigial `rgb` color pipeline:** BasinMap explicitly *ignores* the engine's
  precomputed colors (comment at `BasinMap.tsx:386-391`), yet `computeBasinRange`
  still fills an `rgb` Uint8Array, the worker **serializes it across `postMessage`**,
  and the GPU path recomputes it — all discarded. An entire parallel palette
  (`OUTCOME_RGB`/`chaosColor`/`statColor`/ramps) exists to populate a thrown-away
  field. **Recommendation:** drop the `rgb` field + those color fns; `paint`
  reconstructs everything from outcome/t/stat. Shrinks the worker payload.

### T8 — Duplicated CPU dispatch ladder in complexMath · MEDIUM

`lib/complexMath.ts` has two 37-case ladders — `applyComplex` (`:323`) and
`applyComplexBranch` (`:364`) — byte-identical except the multivalued cases pass
`branch` vs principal. `applyComplex(z,t)` ≡ `applyComplexBranch(z,t,0)`. One caller
each (ComplexParticles' adaptive eval; PlaneTransform). **Recommendation:** delete
`applyComplex` (+ the branchless `complexBranchSqrtPoly` twin), have ComplexParticles
call `applyComplexBranch(pt, idx, 0)`. Add a couple of round-trip asserts (this
library has no tests today).

### T9 — Smaller duplication (consolidate opportunistically) · LOW

- **2D shader-quad scaffold** (renderer + ortho-cam + PlaneGeometry(2,2) + DPR-cap +
  ResizeObserver + rAF, incl. an identical vertex shader) duplicated between
  `FractalsGPU.tsx` and `FractalPane.tsx` — a `useShaderQuad({fragmentShader,
  uniforms, fitMode})` hook would absorb both. Pairs with T1.
- **Star-mass control cluster** copy-pasted between Trinary Observatory
  (`TrinaryStars.tsx:885-898`) and Lab (`TrinaryLab.tsx:440-445`).
- **`mulberry32`** copy-defined in 5 files; **`SimState` literal** with hardcoded
  `planetSoft: 0.05` in 7; **`hexToRgb`** reimplemented in StableMatching while it
  imports the registry that exports it. Each a tiny shared-helper win.
- View header/body + rail tier-separator logic duplicated Desktop↔Phone workspace
  (small shared `<ViewChrome>` / `tierGroups()` helper).

### T10 — Convention drift · LOW-MED

- **Argand is theme-blind** (imports no theme hook at all) and hardcodes a 7-color
  data palette (`Z_COL`/`A0/1/2_COL`/`F_COL`/`FIX_COL`/`CRIT_COL` at
  `ArgandPlane.tsx:12-18`) plus inline scene hex. Contradicts the "every app's
  visualization tracks skin×mode" + "data from `--data` tokens" mandate. **The
  strongest theming gap.** Map onto `--data-1..7` via `useThemeTokens`.
- **CountingTheWays** uses `--accent`/`--accent-2` as a **two-category data**
  palette (the two Poisson arms) — the locked roles reserve accent for UI-voice;
  move to `--data-1/2`.
- **StableMatching** left neutral structural grays hardcoded (`#3a3a48` edge,
  `#3a3a44` tick at `:255,793,798`) in the *same* component that migrated its label
  colors — breaks light skins. Use `var(--border)`/neutral tokens.
- **TreesAndNets** weight ramp keys on `themeId` only, ignoring `themeMode`
  (`views/themeColors.ts`), so a forced light/dark leaves the ramp native-tuned.
- **~14 British spellings** in code comments (+ one user-facing string,
  `BasinMap.tsx:773` "randomise"): colour/minimising/stylised/parameterised/
  orthonormalise/Quantised/realised/randomise(d)/amortised across StableMatching,
  PolygonWorlds, TrinaryStars, TopologyWalk. Trivial normalize-to-American pass.
- Persistence (`usePersistentState`) and the archetype icon vocabulary are
  **fully respected** — no drift.

### T11 — Oversized components (informational, not defects) · LOW

`TrinaryStars.tsx` (1,129), `ComplexParticles.tsx` (994), `previews.tsx` (948),
`StableMatching.tsx` (936), `AgenticSorting.tsx` (902), `PlaneTransform.tsx` (855),
`ParticleViewerShell.tsx` (773). All are **cohesive** (the framework's "whole app +
controls in one component" shape), not accidental. Natural extractions exist where
they'd also localize other findings — TrinaryStars' `Trail`/`makeGlowTexture`/frame
math + the `onMount` engine; ComplexParticles' material factories +
`rebuildBranchObjects` into a `useBranchObjects` hook — but do these **only when the
file is touched anyway**. Not a cleanup in themselves.

---

## Clean bill of health (checked, no action)

- **Workspace engine** — all 11 archetypes used, every geometry/layout fn has real
  callers, no over-general props. (2 minor over-exports.)
- **App-registry / routing / catalog triple** — the append-only 3-file protocol is
  *intended* (documented, enables gallery-hidden routes + parallel branches), not
  redundancy.
- **Embed apps** — exemplary thin wrappers (17/16 lines), no re-implemented viewer
  logic.
- **CI workflows (5)** — all distinct and justified; no redundancy. **Dependencies**
  clean (no puppeteer/playwright duplication).
- **Persistence, projection math, gesture hooks** — centralized/correctly separate.
- **SolidWorlds / PolygonWorlds** — the `freeness.ts`↔`homology.ts` redundancy is
  **deliberate dual-verification**, correctly not flagged.
- **Session machinery** (~1,633 lines .mjs) — proportionate to its CI-gated,
  deployed, cross-branch value. Not overcomplicated.
- **AgenticSorting theming-v2** migration is *done* (the backlog's deferred
  colorblind-palette item is complete).

## Dropped (adversarial verification)

- **`runBattery`** (PolygonWorlds/lib/invariants.ts) — flagged dead by a hunter, but
  used by `scripts/verify-geometry.ts` (`npm run verify:geometry`). Not dead.

---

## Action list

### Tier 1 — Quick wins (low risk, safe to just do; gated by `npm run build`)

1. **Delete dead files:** `styles/responsive.ts`, `types/uniforms.d.ts`,
   `unported_examples/fractint-simulator.tsx` (+ `.gitkeep` decision), the 3 orphaned
   `klein-bottle-fix/*.html` session files. *(~1,200 lines)*
2. **Delete ~10 orphaned scripts:** the five `probe-*` + `probe-lib.mjs`,
   `shoot-pw.mjs`, `sign-shots.mjs`, `test-rotations.ts`, `probe-trivial-words.ts`.
3. **Remove dead exports/plumbing:** the ~15 dead exports in T5, `CorridorPreview`
   + `'corridor'` kind, the `hue` prop chain, `stone`/`metal` textures.
4. **American-spelling pass:** the ~14 British spellings in T10.
5. **Reconcile the TopologyWalk doc/registry inconsistency** (apps.ts:76 vs docs).
6. **Fix StableMatching hardcoded grays** (`#3a3a48`/`#3a3a44` → neutral tokens).

> Suggested as a single "cleanup" PR (each is independent; build stays green). Net
> ≈ 2,000–2,500 lines removed before any of the bigger items.

### Tier 2 — Consolidations (small–medium, low risk, high value)

7. **Extract `DF64_GLSL` + `splitDouble`/`MAX_ITER`/`clampIter`** into a shared
   `lib/df64.ts` (T1) — the highest-value structural fix.
8. **Trinary debris:** delete the dead per-pixel basin path + the vestigial `rgb`
   pipeline (T7).
9. **Collapse the `applyComplex` twin ladder** (T8) + add round-trip asserts.
10. Opportunistic small helpers: `useShaderQuad` (T9), shared `mulberry32`,
    StableMatching `hexToRgb` import, `readThemeColorHex` helper.

### Tier 3 — Needs a decision from Dan

- **T3 TopologyWalk:** delete outright (~2,500 lines), or port the Möbius corridor
  into PolygonWorlds as a 4th "look" first, then delete?
- **T4 Argand engines:** fold `complexOps` onto the tested `numberPlanes` core
  (recommended), or defer until the planned "Number Planes" page?
- **T2 `*_UI.md` docs:** confirm deletion of the 8 stale UI manuals +
  `GLOBAL_APP_DESIGN.md` (superseded by `docs/apps/*.md`). Also the executed plan
  docs (`TRINARY_ROADMAP.md`, `polygon-worlds-plan.md`) → delete or archive?
- **T5 Fibers code:** annotate `associahedron.ts`/`mosaic.ts` as parked, or delete?
- **T10 Argand theming:** wire Argand onto `--data` tokens + `useThemeTokens` (also
  fixes its skin×mode blindness) — larger than a quick win, worth scheduling.

## Working notes

### 🟡 milestone · 02:45 — All 16 reviewers complete; report synthesized
**Why:** The fan-out finished (10 results were stranded ~2h by a container
suspend/resume that lost their completion notifications, then recovered from the
transcript files; 5 arrived by notification; the convention-drift hunter — dropped
from the first launch and relaunched — landed last). Structural claims
re-verified directly. This report deduplicates and ranks the verified findings.
