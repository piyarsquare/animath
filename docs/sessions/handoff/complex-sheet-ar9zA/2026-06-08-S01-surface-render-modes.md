---
kind: handoff
session: 2026-06-08-S01
date: 2026-06-08
title: Surface render modes (Sheet · Tiles · Net) + colormaps & sampling
branch: claude/complex-sheet-ar9zA
slug: complex-sheet-ar9zA
status: completed
build: passed
followup: low
pr: null
app: ComplexParticles
---

# Surface render modes (Sheet · Tiles · Net) + colormaps & sampling

> [!NOTE]
> All work is on **`origin/complex-sheet`** (tip `81af245`). It is **not merged to
> `main` and not deployed** to GitHub Pages — view it by running the branch
> locally (`npm run dev`). The companion progress report has the full timeline.

## Summary

Grew `ComplexParticles` from a points viewer into a multi-mode complex-function
surface viewer, all inside the existing `lib/particles` engine +
`ParticleViewerShell` (no new route / `apps.ts` entry). There are now four render
modes — **Points**, **Sheet** (translucent fill + rectangular wireframe, with
adaptive dissolve-to-points), **Tiles** (oriented surfels that tear apart where
the map stretches), and **Net** (a polar fiber net of circles/rays as fat
ribbons). Color gained a 14-entry **colormap** system (perceptual + cyclic +
diverging, log-scaled, repeatable, driven by a chosen Quantity/Brightness),
**external directional lighting** (inside-vs-outside), and **reciprocal
(log-radial) sampling** that applies to every mode. The settings panel was then
decluttered to show only mode-relevant controls. `npm run build` passes.

## What changed

Each feature is its own commit (history is intentionally fine-grained because the
container kept reverting the local checkout — see Context):

| Commit | Feature |
|---|---|
| `6e99207` / `3b71adb` | Sheet **adaptive density** (dissolve to points where stretched) + edge-fade; max resolution 200→500 |
| `70d7d6d` | **Tiles** render mode (oriented surfels, `Tile size` cap) |
| `77d3afc` | **Sequential colormaps** for magnitude (reuse `lib/colormaps.ts`) |
| `92d9df3` | **External light** (directional + cool/dim back-face = inside/outside) on Sheet/Tiles |
| `902fabb` | **Net** render mode (polar fiber net: circles + rays) |
| `f132697` | Net **independent Circles/Rays toggles** (rays default off), Circles max 250 |
| `3031f4c` | Colormaps **log-scaled** + **Repeat (log bands)** |
| `a8d588f` | **Reciprocal (log-radial) sampling** for all modes (`domainWarp`) |
| `6027c29` | Net **Width + Resolution** (screen-space ribbons; was 1px LineSegments) |
| `1ee72b3` | **+6 colormaps**: Turbo, Cubehelix, Hot, Copper, Cool, Cool–warm |
| `939525c` | **Declutter** settings panel (mode/colormap-aware control visibility) |
| `81af245` | Colormaps **honor Quantity + Brightness** selectors (fix declutter over-hide) |

## Key files

<!-- Links pinned to commit 81af245. -->

| File | Role |
|---|---|
| [`lib/particles/createSheetGeometry.ts`](https://github.com/piyarsquare/animath/blob/81af245/src/lib/particles/createSheetGeometry.ts) | Sheet fill/wire, `createTileGeometry`, `createNetGeometry` (net = screen-space ribbon quads via `aOther`/`aSide`) |
| [`lib/particles/types.ts`](https://github.com/piyarsquare/animath/blob/81af245/src/lib/particles/types.ts) | `renderModes` (Points/Sheet/Tiles/Net), `colormapNames` (14) |
| [`lib/particles/useParticleState.ts`](https://github.com/piyarsquare/animath/blob/81af245/src/lib/particles/useParticleState.ts) | All persisted state for the new controls |
| [`lib/particles/useUniformSync.ts`](https://github.com/piyarsquare/animath/blob/81af245/src/lib/particles/useUniformSync.ts) | Syncs new uniforms to every material |
| [`lib/colormaps.ts`](https://github.com/piyarsquare/animath/blob/81af245/src/lib/colormaps.ts) | Shared palette GLSL + `PALETTE_OPTIONS` (also used by fractal viewers) |
| [`ComplexParticles/shaders/index.ts`](https://github.com/piyarsquare/animath/blob/81af245/src/animations/ComplexParticles/shaders/index.ts) | `vsCommon`: `domainWarp` (reciprocal), `surfacePos`, colormap branch; point/sheet/tile/net shaders + `applyExternalLight` |
| [`ComplexParticles/ComplexParticles.tsx`](https://github.com/piyarsquare/animath/blob/81af245/src/animations/ComplexParticles/ComplexParticles.tsx) | Per-branch materials/meshes for all 5 object types; geometry/visibility/uniform effects |
| [`components/ParticleViewerShell.tsx`](https://github.com/piyarsquare/animath/blob/81af245/src/components/ParticleViewerShell.tsx) | Color / Surface / Domain control sections (mode-aware) |

## Open / not done

- **Merge + deploy.** Branch is not merged to `main`; nothing is live yet. Before a
  PR: `git fetch && git merge origin/main`, keep every app's append-only entries,
  re-run `npm run build`. The user has not yet asked for a PR.
- **Docs.** README/EXPLAINER cover Sheet but **not** Tiles/Net/colormaps/lighting/
  reciprocal sampling. Worth a pass before merge.
- **Polish (all optional, low value):** context-aware colormap default (magnitude
  for sequential maps vs phase for HSV); dedicated sheet opacity; independent
  reciprocal-sampling depth (currently tied to domain extent); optional screen-space
  (rather than world) cap for Tiles; start Net rays off-origin so they don't bundle
  at the Torus core when enabled.

## Context

- **Container instability (important).** This cloud container repeatedly reset the
  **local** working tree to an old commit (`6fd2683`) mid-session while
  `origin/complex-sheet` stayed current. Always start a turn with
  `git fetch origin complex-sheet && git reset --hard origin/complex-sheet`, and
  commit + push after each change. Treat origin as the source of truth.
- **Branch naming.** Designated branch is `claude/complex-sheet-ar9zA` (hence the
  slug), but the actual remote branch carrying the work is **`complex-sheet`**.
- **Verification.** Done headlessly via SwiftShader screenshots, seeding the
  viewer's `localStorage` (`animath:v1:complex-particles:<field>`) to set modes —
  there is no test runner; `npm run build` is the only CI check.
- **Net math note.** Circles (constant |z|) relate to Hopf fibers — for f=z a
  domain circle *is* a Hopf fiber; for zⁿ it's a (1,n) torus knot. Rays converge at
  the Torus center because they all share z=0.

## Self-reflection

1. **Another session?** Polish + docs: context-aware colormap default, dedicated
   sheet opacity, independent reciprocal depth, and writing up the new modes in
   README/EXPLAINER. Then a merge-to-main PR.
2. **Change about what I produced?** The declutter over-hid the Quantity/Brightness
   color selectors and needed a follow-up fix; a clearer "which control belongs to
   which mode" model up front would have avoided the round-trip.
3. **Not asked that's important?** Whether to merge/deploy — none of this is live
   yet, so users (and the Pages site) don't see it until a PR lands.
4. **What did we both overlook?** Net rays still pass through the exact origin, so
   they bundle at the Torus core; an inner-radius start would tidy that.
5. **Difficult?** The container reverting the local checkout — mitigated by
   per-turn `reset --hard origin` and frequent pushes.
6. **Easier?** A harness helper to drive in-app controls (beyond seeding
   `localStorage`) would speed visual iteration.
7. **Follow-up value:** <span class="badge badge-ok">LOW</span> — all features
   build, are pushed, and were verified; what remains is optional polish, docs, and
   the merge decision.
