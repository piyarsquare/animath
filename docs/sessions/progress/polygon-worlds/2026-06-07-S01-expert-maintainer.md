---
kind: three-hats
session: 2026-06-07-S01
date: 2026-06-07
title: Polygon Worlds — full geometry + skins + exploration layer (plan review)
branch: claude/polygon-worlds
slug: polygon-worlds
status: completed
build: unknown
followup: medium
pr: 190
---

# Polygon Worlds — full geometry + skins + exploration layer (plan review)

## What I read, and the shape of the codebase as it stands

I read the whole `PolygonWorlds/` folder, the verification spike (`scripts/verify-schemas.ts`), the surface-tour roadmap, and CLAUDE.md. The app today (PR #190, eight commits deep, last touched 2026-06-07) is a working first-person walker over **four square gluings**: torus, Klein, ℝP², sphere. Its real architecture is already a layered thing:

- **Base layer (just landed):** `surfaceSchema.ts` — pure algebra, edge word → χ / orientability / curvature / classification + `EdgePairing[]`. No Three.js. Table-verified by `scripts/verify-schemas.ts` (11 rows + a parser check, `process.exit(fail?1:0)`). This is the single best thing in the codebase: a checkable oracle for the topology.
- **Host:** `PolygonWorlds.tsx` — React state, gestures, the `ShellSettings`/`ShellActions` panels, the mini-map, the move-pad.
- **Facade:** `fundamentalSquareEngine.ts` — owns lights, avatar, trail, frame orchestration; delegates to a `CoverModel`.
- **Covers:** `euclideanCover.ts` (tiled flat plane) and `sphericalCover.ts` (fixed planet, walk the tangent frame). Chosen by `deriveGeometry(spec).cover`.
- **Shared mechanics, already factored:** `decor.ts` (the tree/column landmarks, authored in unit-square (u,v)), `squareMap.ts` (one parameterised mini-map), `glassSurface.ts`, `footprints.ts`, `otherSide.ts` (a declared-but-unimplemented seam for the normal-flip).

> [!NOTE]
> **Note** Crucially, **the base layer is already abstracted but the geometry layer is not yet**. `worldSpec.ts` hardcodes four `WORLDS` with stored χ; the two covers are ad-hoc; the sphere uses a lon/lat texture hack and a separate equirectangular chart. The plan targets exactly this gap. So this is not a from-scratch proposal — it is the next layer down on a base that was deliberately built to receive it (`EdgePairing` exists precisely "for the future geometry layer to build the edge-pairing isometries"). That framing matters for the whole review.

## The core question: is "one engine for all κ" overreach, or good consolidation?

This is the hat's central worry. We have a documented cautionary tale: `ARCHITECTURE.md` proposed a `core/widgets/ui` reorg that was never adopted, and CLAUDE.md now warns it is "aspirational." We also have a success story: the three near-identical complex viewers collapsed into `lib/particles` + `ParticleViewerShell`. The discriminator between those two outcomes is concrete and I'll apply it here.

| Discriminator | ARCHITECTURE.md (failed) | lib/particles (won) | This plan |
| --- | --- | --- | --- |
| Consolidated *existing, duplicated, working* code? | No — proposed a layout for code that wasn't written that way | Yes — three real viewers, line-for-line near-identical | **Partly.** Euclidean+spherical are real and duplicative; hyperbolic is *new*, not a dedup. κ-unification is forward-looking, not a merge of three existing things. |
| Abstraction had an independently-checkable spec? | No | Yes — visual output, copy ComplexParticles, compare | **Yes, and this is the strongest argument for it.** The `Geometry` interface is isometry algebra; it can get its own table-verification spike just like `surfaceSchema`. |
| Touches shared/framework files? | Yes — restructured `components/`, `lib/` | No — added a new `lib/` subtree, opt-in | **No** — entirely inside `PolygonWorlds/`. Append-only safe (see §5). |
| Reduced net surface area? | Would have churned everything | Yes — three folders → one engine | **Net new.** Retires 2 covers + worldSpec, adds 3 geometries + polygon realisation + deck group + develop. Bigger after, not smaller. |

My read: the κ-engine is **the good kind of abstraction, but for a different reason than lib/particles**. lib/particles won by *removing duplication*. This plan wins (if it wins) by *matching the math*: uniformization genuinely says Euclid/sphere/hyperbolic are one theory at three curvatures, and the base layer already proved that an edge-word-driven, no-special-cases abstraction is buildable and checkable here. The danger is not the *idea* — it's the **blast radius of doing all of it at once**. The right move is to keep the `Geometry` interface but stage it so each κ ships behind the same interface incrementally, and never let the abstraction get ahead of a verification spike.

> [!IMPORTANT]
> **Decision I'd push** Endorse the `Geometry`-interface direction. Reject "retire the two covers *now*." Build the interface, port **Euclidean** to it first while the two existing covers stay live as the reference oracle, and only delete a cover once its geometry-engine replacement passes a side-by-side visual + a numeric holonomy check. That is how lib/particles actually happened (ComplexParticles was the canonical consumer proving the engine before the old viewers were deleted).

## Does it strand PR #190, or build on it?

#190 is mid-flight with torus/Klein/sphere/ℝP² working and a freshly-verified base layer. The plan explicitly says "the current ad-hoc euclideanCover/sphericalCover, the lon/lat sphere hack, hardcoded WORLDS all retire." Taken literally that *rewrites the working app*. Taken as a roadmap it *extends* it. The plan's own phasing (P1 Euclidean general → P2 Spherical → P3 Hyperbolic) is the extend-reading, and that's the one to commit to.

> [!WARNING]
> **Warn** **Land #190 first as-is.** It is a complete, shippable app: four worlds, a verified base layer, a mini-map, trails. Merging it banks the value and de-risks the branch (which has been open and accreting). The κ-engine should be a *follow-on* branch (`claude/polygon-worlds-geometry`), not a force-push that invalidates eight reviewed commits. The base layer is the bridge: it survives untouched into the new branch, so nothing is stranded. Rewriting in place on the same open PR is the one path I'd veto — it makes the diff unreviewable and risks regressing four working worlds for a phase-1 that only reaches Euclidean.

One subtlety: `surfaceSchema.ts` is built but **not yet wired into the app** (grep shows it's imported only by the verify script, not by `PolygonWorlds.tsx` or `worldSpec.ts`). So today's app still runs on the hardcoded `WORLDS`. The *first* integration step — independent of the whole κ-engine — is to have the host read χ / orientability / pairings from `analyzeSchema` instead of the stored constants. That is a small, high-value, low-risk commit that makes the verified base layer load-bearing and is a natural part of #190's finish or the immediate next commit. It is also the cheapest proof that the abstraction-down-to-the-host actually closes.

## Operational reality: build, bundle, static Pages

The only CI gate is `npm run build` = `tsc && vite build`. No tests, no lint. Three constraints follow:

- **Bundle size / code-split.** Every route is `React.lazy`-imported, so PolygonWorlds is already its own chunk. A hyperbolic-geometry engine (Möbius/SL(2,ℝ), Fuchsian deck group, develop loop) is *pure math in TS* — kilobytes, not megabytes. It does **not** pull a new heavyweight dep; Three.js is already loaded for every 3D app. So the bundle worry is mild *as long as no new npm package is added* (no hyperbolic-geometry library, no symbolic-math dep — write the ~200 lines by hand). I'd make "zero new runtime dependencies" a hard constraint on this work. The extrinsic-embedding insets (cross-cap/Roman/Boy/genus-2 meshes) are the only real size risk — generate them procedurally at runtime, never ship baked geometry assets.
- **tsc strict is the whole safety net.** A general `Geometry` interface with point+frame, geodesicStep, isometry compose/inverse, develop is exactly the kind of code where strict typing pays for itself — make the interface tight (branded vector types for ℝ²/S²/ℍ² points if feasible, or at least distinct named types) so a κ-mismatch is a compile error, not a silent NaN.
- **Static Pages, base `/animath/`.** No server, no runtime asset fetches beyond `import.meta.env.BASE_URL`. The plan is all client-side compute, so this is a non-issue — but it forecloses any "precompute a tiling server-side" shortcut. The develop loop must be cheap enough to run in rAF on a phone (the app already ships a touch move-pad), which constrains how many cover copies you develop per frame. The Euclidean cover already caps at (2K+1)²=25 cells; the hyperbolic develop needs an analogous hard radius cap or it explodes (the hyperbolic plane has exponentially many tiles per unit radius — this is the real performance cliff, not bundle size).

> [!CAUTION]
> **Gotcha** The hyperbolic develop is the one place "operational reality" bites hard. Octagon tiling of ℍ² grows exponentially with hyperbolic radius; a naïve "develop neighbours" with a fixed graph-distance K will either be too sparse (visible holes at the horizon) or blow the frame budget. This needs an explicit design answer (Dirichlet-domain culling by screen-space / distance, like HyperRogue's cell horizon) before P3, and it should be prototyped as a standalone perf spike, not discovered in the app.

## Parallel-branch safety: does P4 bleed into shared code?

The framework's conflict-freedom rests on apps being self-contained folders that touch only append-only shared files (`index.tsx`, `apps.ts`, `CLAUDE.md`, `README.md`). PolygonWorlds already owns those four lines. I checked each plan element against that boundary:

| Plan element | Lives in | Shared-file risk |
| --- | --- | --- |
| `Geometry` interface + 3 impls, polygon realisation, deck group, develop | `PolygonWorlds/` | none — pure app-folder TS |
| P4 free-edge-word UI (complexity ladder + free entry) | `PolygonWorlds.tsx` via `ShellSettings` + `ControlPanel` primitives | none — uses existing `Select`/`Slider`; `SCHEMA_LADDER` already exists in the app folder |
| ~6 instruments (holonomy, angle-sum, compass, hall-of-mirrors…) | `PolygonWorlds/` + `ShellActions` | watch — see below |
| Mini-map generalised to n-gon | `squareMap.ts` (app folder) | none |
| Embedding insets | app folder; second canvas/WebGL viewport | none (but bundle — see §4) |

So the answer is reassuring: **almost nothing bleeds**. The free-word UI and instruments are authored with the existing `ControlPanel` primitives and the `ShellSettings`/`ShellActions` portals — exactly the supported integration surface — so they stay inside the folder.

> [!WARNING]
> **Warn — the one temptation to resist** The instruments (normal-flip, parallel-transport compass, geodesic-return) are described in the surface-tour doc as "engine-agnostic, so they compose with the shared player layer." That phrasing could tempt someone to lift them into `lib/` "so TopologyWalk can share them too." **Don't — not in this plan.** PolygonWorlds and TopologyWalk are *separate apps*; a premature shared `lib/topology` would (a) churn a shared location two branches depend on, breaking the append-only guarantee, and (b) repeat the ARCHITECTURE.md mistake of abstracting across consumers that haven't both shipped. Keep instruments in the app folder. If, after both apps ship, the duplication is real and stable, *then* extract — the lib/particles way (extract from working duplicates, not ahead of them).

## Tech-debt accounting: does retiring the covers reduce debt or trade it?

The plan retires `euclideanCover.ts`, `sphericalCover.ts`, the lon/lat sphere hack, and the hardcoded `WORLDS`. Let me tally honestly, because "consolidation" can be debt-laundering.

**Genuine debt it removes:**

- The lon/lat sphere texture + equirectangular `drawSphereMap` chart is an acknowledged hack ("the equirectangular sphere chart … stays in the host" — i.e. it dodged the unification). A real S²-as-S²⊂ℝ³ geometry kills it cleanly.
- The two covers have real near-duplication: both build glass, footprints, decor placement, an inner/under shell, a camera-follow. `otherSide.ts` already documents this duplication and declares a seam. Unifying the *develop/render* pipeline is a legitimate dedup of that, in the lib/particles spirit.
- `worldSpec.ts` storing χ as a constant while a verified `analyzeSchema` sits unused is latent debt (two sources of truth for the same invariant). Deriving everything from the edge word removes it.

**Debt it trades in:**

- A general isometry/develop engine is *harder to eyeball-verify* than two concrete covers. Today a reviewer can read `euclideanCover.update` and see exactly what happens. A κ-keyed develop loop with Möbius composition is correct-by-construction *only if the math is right*, and there is no test runner to catch a sign error. This is the central trade: **concreteness-you-can-read** for **generality-you-must-trust**.
- The mitigation already exists in this very folder: `scripts/verify-schemas.ts`. The geometry layer must get an analogous spike (see §8). With it, the trade is favourable — you swap "two readable files" for "one general engine + a numeric oracle," which is strictly better than the base layer's status quo. Without it, the trade is *bad* and I would not endorse retiring the covers.

> [!IMPORTANT]
> **Decision** Net: retiring the covers **reduces** debt *conditional on* a verification spike for the geometry layer landing *before* the second cover is deleted. Make the spike a gating deliverable of P1, not a P4 afterthought.

## Verification: keeping the general engine honest with no test runner

This is where the plan is strongest and where I'd hold it most firmly to account. The base layer set the precedent: `scripts/verify-schemas.ts` is a standalone `tsx` script, 42 lines, a table of known surfaces, `process.exit(fail?1:0)`. It is not in the CI gate (`npm run build`), but it is runnable (`npx tsx scripts/verify-schemas.ts`) and it makes the algebra *auditable*. The geometry layer can and must get the same treatment. Concretely, a `verify-geometry.ts` spike that asserts, per κ, properties that have closed-form answers:

| Property | What to assert | Why it catches real bugs |
| --- | --- | --- |
| Isometry group axioms | `compose(g, inverse(g)) ≈ identity`; associativity on random triples | Catches a wrong matrix/Möbius formula immediately |
| Edge-pairing closure | For the torus word, the deck relator `aba⁻¹b⁻¹` composes to identity (the vertex-cycle condition) | Proves the pairings glue smoothly — the Gauss-Bonnet/corner-angle condition, numerically |
| Geodesic-return holonomy | Walk a closed loop; the returned frame's rotation/reflection matches the surface (torus: +1, Klein loop: reflection) | This is literally Euler's instrument #1 — the verification *is* the pedagogy |
| Triangle angle excess | angle sum − π ≈ (curvature)·area for a small geodesic triangle, all three κ | Validates the metric; catches a curvature-sign flip |
| Corner angle of the regular 2n-gon | Euclid square = 90°, hyperbolic octagon = 45° (8×45=360) | Validates the polygon-realisation solve for κ |

> [!NOTE]
> **Note — the lovely part** The instruments and the verification are **the same code at two callsites**. Euler's geodesic-return / angle-sum / parallel-transport probes are exactly the assertions a `verify-geometry.ts` would make. So the plan's P4 instruments and the P1 verification spike are not separate work — building the verification spike *first* de-risks the engine *and* prototypes the instruments headlessly (no rendering, no React, fast to iterate). I'd reorder: write the headless geometry + its verification spike as step zero, render second. That inverts the plan's "render-first, instruments-in-P4" ordering and is the single biggest improvement I'd make.

## Scope: is this too much for one app / one plan? Where is the MVP line?

Plainly: **yes, as a single unit of work this is too much.** The plan bundles (1) a 3-geometry isometry engine, (2) square→octagon polygon realisation, (3) a deck group + develop pipeline, (4) a re-authored two-sided presentation across κ and orientability, (5) an n-gon mini-map, (6) ~6 instruments, (7) the normal-flip, (8) extrinsic embedding insets, with a world-morph "later." That is six months of one app. The good news is the plan *already phases it* (P1–P4); my job is to sharpen where the shippable milestones are so each phase is independently mergeable and the branch never sits broken.

| Milestone | Contents | Mergeable on its own? |
| --- | --- | --- |
| **M0 — bank #190** | Land the four working worlds + base layer as-is; wire host to `analyzeSchema` | Yes — already done bar the wiring |
| **M1 — geometry spike (headless)** | `Geometry` interface + Euclidean impl + `verify-geometry.ts`. No rendering change. | Yes — additive, build stays green, covers untouched |
| **M2 — Euclidean on the engine** | Port the flat cover onto the develop pipeline; delete `euclideanCover.ts` once side-by-side matches | Yes — torus/Klein still work, now via the general path |
| **M3 — Spherical on the engine** | S²⊂ℝ³ impl; kills the lon/lat hack + equirectangular chart; sphere/ℝP² via the engine | Yes |
| **M4 — Hyperbolic octagon** | ℍ² impl + Fuchsian develop + horizon culling; genus-2 | Yes — the headline new topology |
| **M5 — instruments** (one at a time) | normal-flip first (instrument zero), then hall-of-mirrors (nearly free), then holonomy/angle-sum | Each is one small additive commit |
| **M6 — free-word UI + insets** | `SCHEMA_LADDER` picker + free entry; embedding insets | Yes |

**The MVP I'd actually draw the line at: M0–M2.** That delivers the thesis ("one engine, the flat worlds prove it, the math is verified") without the hyperbolic perf cliff or the embedding-asset bundle risk. It is a complete, defensible increment that retires *one* cover and the χ-duplication, and it leaves the spherical cover working in parallel until M3 replaces it. Everything past M2 is genuinely valuable but is "later," and pretending otherwise is how a branch stays open for months and rots against `main`.

## Smaller maintainer notes

- **Persistence.** The current app uses raw `useState`, not the framework's `usePersistentState`. With a free edge-word and many knobs incoming, adopt `usePersistentState` (namespaced) for *settings* (word, arrangement, speed) but not transient view state — per the CLAUDE.md convention. Cheap, and it's the framework-blessed path.
- **The `otherSide.ts` seam is good foresight.** It declares the normal-flip contract without implementing it — exactly the right way to leave a hook. The κ-engine should honour that contract so the flip lands "as a small, uniform addition rather than a per-engine hack" (its own words). Don't discard it in the rewrite.
- **Mini-map generalisation is lower-risk than it looks.** `squareMap.ts` is already parameterised by edge spec; an n-gon version is a bounded, self-contained canvas change. Good early P4 win.
- **Engine-rebuild churn.** `PolygonWorlds.tsx` currently `dispose()`s and rebuilds the whole engine on every world/landmark change (`useEffect` on `[spec, props]`). With a heavier geometry engine, that full teardown per knob-change may stutter; consider whether a κ-switch can re-key the existing engine rather than rebuild. Not blocking, but watch it once the engine is non-trivial.
- **CLAUDE.md / README / Routing.** When PolygonWorlds finalises, it owes its append-only rows in the Routing table, the layout tree, `apps.ts`, and README — added at the *end*, never reordering. I did not see PolygonWorlds in the CLAUDE.md Routing table yet; that's a finish-line checklist item.

## Verdict

> [!IMPORTANT]
> **Endorse — with structure** The "develop via edge-isometries, one κ-keyed `Geometry` engine" direction is sound and is the *good* kind of consolidation, not the ARCHITECTURE.md kind. It matches the math (uniformization), stays entirely inside the self-contained app folder (no append-only churn, no shared-lib temptation if the instruments are kept local), adds no runtime dependencies, and — decisively — it descends from a base layer that already proved an edge-word-driven, special-case-free, *table-verified* abstraction is buildable here.

**Concerns I'd hold the plan to:**

1. **Don't rewrite #190 in place.** Land the four working worlds first; build the engine on a follow-on branch with the base layer as the bridge. Wire the host to `analyzeSchema` as the small first integration step.
2. **Verification spike is a gating deliverable, not P4.** Write the headless geometry + a `verify-geometry.ts` (group axioms, edge-pairing closure, holonomy, angle excess) *before* rendering and *before* deleting any cover. With no test runner, this is the only thing keeping a general engine honest — and it doubles as the prototype for the instruments.
3. **Stage by mergeable milestone (M0–M6); MVP at M0–M2.** Each phase must leave `npm run build` green and the app playable. Delete a cover only after its replacement passes a side-by-side. Hyperbolic horizon-culling needs its own perf spike before P3.
4. **No new npm deps; procedural embedding meshes only.** The bundle risk is the insets, not the math.
5. **Keep instruments in the app folder.** Resist lifting them to `lib/` to share with TopologyWalk until both apps have shipped and the duplication is real.

Reframed in one line: *endorse the engine, reject the big-bang.* The plan's instinct is right; its risk is entirely in trying to do all seven things on one branch in one pass. Phased behind a verification spike, this is the best app in the repo. Done big-bang, it strands a working PR behind an unverifiable rewrite.

## Self-reflection

1. **What would you do with another session?** Actually draft the `Geometry` interface signature and a skeleton `verify-geometry.ts` in TypeScript, so the M1 spike is a concrete artifact rather than a recommendation. I asserted "it can be verified like surfaceSchema" — proving it with even a Euclidean-only stub would convert an endorsement into a de-risked plan.
2. **What would you change about what you produced?** I leaned on prose where a single sequence diagram of the develop loop (edge word → pairings → deck group → develop → render) would carry more. I also didn't quantify the hyperbolic frame budget — "exponential growth" is correct but a maintainer wants a number (tiles within radius R for the {8,8} tiling) to size the horizon cap.
3. **What were you not asked that you think is important?** The relationship to TopologyWalk. These are two apps walking closed surfaces from a near-identical roadmap doc; whether they should eventually merge or stay distinct is a real framework question I flagged only as "don't share the instruments yet." That decision deserves its own review.
4. **What did we both overlook?** Mobile/perf as a first-class constraint. The app ships a touch move-pad and runs in rAF; a hyperbolic develop loop on a phone GPU is the most likely place this plan fails *operationally* rather than mathematically, and neither the plan nor my review gave it a budget.
5. **What did you find difficult?** Distinguishing "good consolidation" from "overreach" when the target is partly new code (hyperbolic) rather than pure dedup — the lib/particles analogy only half applies, and I had to find a second justification (it matches the math / descends from a verified base) to land the call.
6. **What would have made this task easier?** Seeing the actual PR #190 diff and review state (the `gh pr view` call returned nothing here), and a one-paragraph statement from the author of how literally "retire the covers" was meant — rewrite-in-place vs roadmap. Most of my hedging is around that ambiguity.
7. **Follow-up value:** MEDIUM — the verdict is sound and complete as a review, but the highest-leverage next step (drafting the `Geometry` interface + verification spike to prove the central claim) is real, additive work that would materially de-risk the plan.
