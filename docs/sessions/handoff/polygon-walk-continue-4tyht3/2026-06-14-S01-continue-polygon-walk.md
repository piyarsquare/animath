---
kind: handoff
session: 2026-06-14-S01
date: 2026-06-15
title: Polygon Worlds — new worlds, immersive desktop, scene looks, Topology Walk retired
branch: claude/polygon-walk-continue-4tyht3
slug: polygon-walk-continue-4tyht3
status: completed
build: passed
followup: null
pr: null
app: polygon-worlds, chrome
---

# Polygon Worlds — new worlds, immersive desktop, scene looks, Topology Walk retired

> [!NOTE]
> Long session, two arcs. **Arc 1 (math/worlds + beauty):** finished roadmap A1/A2
> (new ℝP² + zip-sphere worlds), hardened the chirality guard, added soft shadows.
> **Arc 2 (UX, the bulk of recent work):** a desktop "immersive" mode, a scene
> "looks" system salvaged from the now-retired Topology Walk, and a string of
> layout/mobile/atmosphere fixes from live user feedback. Everything is committed
> and pushed to the branch; build passes; **no PR opened** (not requested).

## Summary

PolygonWorlds (`src/animations/PolygonWorlds/`) gained four new worlds and a full
UX/atmosphere pass. The walker now runs **full-bleed on desktop** (new opt-in
`immersive` workspace mode), carries selectable **scene looks** (Daytime / Overcast /
Ember dusk / Moonlit), and its controls were reorganized (world picker in the World
panel, primary verbs in a bottom action strip, perspective as top-bar pills on
desktop / a View-sheet toggle on phone). **Topology Walk was retired** — unlisted from
the gallery, route kept. All 12 worlds pass the chirality guard; build + lint are
green (0 errors, 60 baseline warnings). The branch is ahead of `main` and has **not**
been synced/merged.

## What changed

**New worlds (roadmap A1 + A2).** `rp2hex` (`a b c a b c`), `rp2oct` (`a b c d a b c d`)
— smooth hexagonal/octagonal ℝP² (same antipodal deck as square ℝP², charted via a new
polygon-gauge map `ngon2hemi`/`hemi2ngon`); and `zipsphere6`/`zipsphere8`
(`a a⁻¹ b b⁻¹ …`) — round spheres cut along a star tree, drawn with stitched seam arcs.
The square `sphere` now also shows its 2 seams. Chirality guard extended and **green on
all 12 worlds** (both faces of every flip world), decor 0 improper everywhere.

**Beauty.** Soft `PCFSoftShadowMap` shadows gated to the flat (euclidean) worlds; a sun
disc in the gradient environment map. A **bloom** experiment was built then **reverted**
(user: "looks terrible") — `bloom.ts` deleted, render path back to direct
`renderer.render`.

**Desktop "immersive" mode** (chrome, opt-in). New `immersive?: boolean` on
`WorkspaceProps`; on a single-view app the view fills the stage below the top bar
(frameless, no dotted void) with rail/panels/action-strip overlaid — the desktop twin
of the phone solo view. Gated; other apps unaffected.

**Scene "looks"** (`looks.ts`, salvaged from Topology Walk's corridor themes, minus the
wall textures/torches/bloom). A look sets sky/fog tint + exposure + the shared light
rig's colors/intensities, scaled by the per-cover lighting profile. **Topology Walk
retired** — removed from `apps.ts` + `catalog.ts`; route + `#/mobius`/`#/wrap-world`
redirects kept (URL-reachable).

**Controls reorg + fixes** (from live feedback). World picker lives in the **World
panel** (grouped `Select`; title opens it); primary verbs (Plant/Clear signs, Clear
trail) in a bottom-center **action strip**; First/Third person as **top-bar pills on
desktop**, a **View-sheet toggle on phone** (the phone bar was overflowing); panels
consolidated 6→4; default layout opens just World. Daytime sky black→soft blue then
**brightened** to a sunny midday. The sphere's atmosphere now responds to looks (its
sky is a `skyDome` mesh hiding `scene.background`, so it got a retintable dome —
`paintDome` + `setSky` on the `CoverModel`). In immersive desktop the vertical rail is
replaced by a **horizontal icon row in the top bar** (`Rail orientation="horizontal"`)
and the bar **title is hidden** (it duplicated the rail's World icon).

## Key files

| File | Role |
|---|---|
| [`PolygonWorlds.tsx:437`](https://github.com/piyarsquare/animath/blob/339c27d0679af30ebaf676196c46022a17e42fad/src/animations/PolygonWorlds/PolygonWorlds.tsx#L437) | App: `immersive`, desktop-only `modes` pills, `actions`, World-panel picker, look state |
| [`looks.ts:39`](https://github.com/piyarsquare/animath/blob/339c27d0679af30ebaf676196c46022a17e42fad/src/animations/PolygonWorlds/looks.ts#L39) | The 4 scene looks (atmosphere presets) |
| [`fundamentalSquareEngine.ts:127`](https://github.com/piyarsquare/animath/blob/339c27d0679af30ebaf676196c46022a17e42fad/src/animations/PolygonWorlds/fundamentalSquareEngine.ts#L127) | `applyLook`/`applyAtmosphere`/`setLook`; calls `cover.setSky` |
| [`presenters/spherical.ts:83`](https://github.com/piyarsquare/animath/blob/339c27d0679af30ebaf676196c46022a17e42fad/src/animations/PolygonWorlds/presenters/spherical.ts#L83) | `paintDome` + `setSky` — retintable sky dome (sphere atmosphere) |
| [`worldSpec.ts:48`](https://github.com/piyarsquare/animath/blob/339c27d0679af30ebaf676196c46022a17e42fad/src/animations/PolygonWorlds/worldSpec.ts#L48) | World ids incl. new `rp2hex`/`rp2oct`/`zipsphere6`/`zipsphere8` |
| [`chrome/workspace/types.ts:139`](https://github.com/piyarsquare/animath/blob/339c27d0679af30ebaf676196c46022a17e42fad/src/chrome/workspace/types.ts#L139) | `immersive?: boolean` on WorkspaceProps |
| [`chrome/workspace/DesktopWorkspace.tsx:31`](https://github.com/piyarsquare/animath/blob/339c27d0679af30ebaf676196c46022a17e42fad/src/chrome/workspace/DesktopWorkspace.tsx#L31) | `soloImmersive`; horizontal rail in bar; hide title |
| [`chrome/workspace/Rail.tsx:43`](https://github.com/piyarsquare/animath/blob/339c27d0679af30ebaf676196c46022a17e42fad/src/chrome/workspace/Rail.tsx#L43) | `orientation` prop (horizontal top-bar variant) |
| [`chrome/TopBar.tsx:40`](https://github.com/piyarsquare/animath/blob/339c27d0679af30ebaf676196c46022a17e42fad/src/chrome/TopBar.tsx#L40) | `hideTitle` (immersive + phone-with-extra) |
| [`scripts/trail-chirality.mjs`](https://github.com/piyarsquare/animath/blob/339c27d0679af30ebaf676196c46022a17e42fad/scripts/trail-chirality.mjs) | The decisive orientation guard (run per-world or all 12) |

## Open / not done

- **Clouds (future).** Scoped in the progress report's top note. Simple version = a
  procedural cloud dome tied into the looks. **But the sky likely needs to be
  cover-aware** — it may depend on which side of the sheet the walker is on in
  non-orientable worlds, so treat it as part of the `CoverModel`/deck, not static
  chrome. Prototype on orientable worlds first.
- **Roadmap B/C/D unpicked** — the marquee features (D = vertex-ring **curvature/
  holonomy demo**; C = ℝP² **inside-walk**; B). D is the highest-value next build.
- **E1** (hyperbolic decor azimuth equivariance) — deferred to land *with* D, where the
  rotation becomes visible/verifiable. **E2** (klein6 glide-crossing smoothness pixel
  guard) — a new permanent guard, not yet built.
- **Narrow-desktop bar clip:** between ~740–860px the immersive top bar overflows ~20px
  (skin-picker edge). Cosmetic; reclaim space by shortening the perspective pills or
  moving perspective into the View panel on desktop too.
- **Not synced to `main`.** Before any PR: `git fetch && git merge origin/main`, keep
  every app's entries in the append-only shared files, re-run `npm run build`.

## Context

- **Shared chrome touched** (all additive/gated; safe for parallel branches but worth a
  re-check on merge): `types.ts`, `DesktopWorkspace.tsx`, `ViewWindow.tsx`, `Rail.tsx`,
  `TopBar.tsx`, `theme.css`. CLAUDE.md + Routing table updated (Topology Walk marked
  unlisted/retiring; PolygonWorlds notes its looks).
- **Two pedagogies, deliberately different** (audited this session, item F): Topology
  Walk shows the flip via a reversed "F" (intentional det<0 on content); PolygonWorlds
  *hides* it (you carry your frame; mirror only through the glass). Don't "fix" one to
  match the other — it's a product decision.
- **Verification tooling:** headless screenshots via puppeteer + swiftshader
  (`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`); the
  `?polydebug` query flag exposes the `__poly` bridge (map/probe/clearTrail) for guards.
- **Looks persist** under `polygon-worlds:look`; world selection is session-only by
  design. Daytime is the engine's original rig (no regression) over the new blue sky.

## Self-reflection

1. **What would you do with another session?** Build roadmap **D** (the curvature/
   holonomy demo) — highest-value unbuilt feature, and it unlocks E1. Failing that,
   prototype the cover-aware cloud sky on orientable worlds.
2. **What would you change about what you produced?** The top bar accreted across
   feedback rounds (world picker in → out; pills added; rail moved in). Each step was
   user-directed and sound, but one deliberate "immersive desktop bar" layout up front
   would have avoided the narrow-width overflow left behind. The View panel is also now
   the densest (Look + camera + scale).
3. **What were you not asked that you think is important?** Whether looks should persist
   per-world or globally (currently global) — a night ℝP² + a day torus may beat one
   look everywhere.
4. **What did we both overlook?** That atmosphere (sky/clouds), like the trail and sign,
   is genuinely *cover-dependent* in non-orientable worlds — the user flagged it for
   clouds, but the same applies to any future skybox/horizon treatment.
5. **What did you find difficult?** Making one "look" read consistently across three
   very different renderers (flat background+fog vs. a sphere's sky-dome-over-shell vs.
   hyperbolic disk) — the sphere needed a separate retint path the others don't.
6. **What would have made this task easier?** A single sky/atmosphere abstraction owned
   by the `CoverModel` (each cover renders its own sky) instead of the engine reaching
   into `scene.background`/fog plus a cover-specific dome hook. That's also the right
   foundation for clouds.
7. **Follow-up value:** LOW — everything shipped is verified (build/lint green, guard
   green on all 12 worlds, screenshots across covers/devices) and self-contained; the
   open items are new features and one cosmetic narrow-width nit, not corrections.
