---
kind: app-guide
app: topology-walk
route: "#/topology-walk"
name: Topology Walk
title: Topology Walk — developer guide
status: retiring
build: passed
entry: src/animations/TopologyWalk/TopologyWalk.tsx
updated: 2026-06-22
signals: null
next: Decide its final fate — keep as the unlisted legacy walker, or fully delete once Polygon Worlds covers the corridor worlds.
---

# Topology Walk — developer guide

> Walk a closed surface in first person — twisting corridor or flat torus / Klein
> bottle — and read the topology off your own footprints.

The living architecture + status doc for this app. Conventions:
[`GUIDE_STYLE.md`](GUIDE_STYLE.md). What this doc type is: [`README.md`](README.md).
The teaching/math ("what am I looking at") lives in
[`EXPLAINER.md`](../../src/animations/TopologyWalk/EXPLAINER.md), not here.

> [!IMPORTANT]
> **Being retired.** Topology Walk is **superseded by
> [Polygon Worlds](polygon-worlds.md)**, which generalizes its flat/spherical
> first-person walk to the full fundamental-polygon catalog and inherited its scene
> looks. It was **unlisted from the gallery** (removed from `src/apps.ts` and
> `src/chrome/catalog.ts`) on 2026-06-15 but is still **URL-reachable** — the route is
> kept, and `#/mobius` and `#/wrap-world` **redirect here** (`src/index.tsx`). The one
> thing Polygon Worlds does *not* yet cover is the **corridor (knotted-tube) worlds**,
> which is why the code is kept rather than deleted.

## Status

- **Route:** `#/topology-walk` (`src/index.tsx`). Legacy `#/mobius` and `#/wrap-world`
  redirect here. **Unlisted** — not in the gallery; no card in `catalog.ts`. (It still
  has an entry in `src/apps.ts` and the `topology-walk` category in `categories.mjs`.)
- **Stability:** 🟡 **retiring** — superseded by Polygon Worlds. Kept for the corridor
  worlds (Möbius / twisted tube / trefoil) that Polygon Worlds has no equivalent of.
  No active feature work.
- **Entry:** `TopologyWalk.tsx` · ~13 ts/tsx files, ~3.2k LOC, subdir `shaders/`.
- **Build/tests:** covered by `npm run build`; **no `__tests__/`**. It compiles and
  ships; treat it as frozen.

## Active / Resolved

The per-app control center — hand-maintained.

### Active

- [ ] **!low (product)** Decide Topology Walk's final fate — keep as the unlisted
  legacy walker, or fully delete once/if Polygon Worlds grows corridor worlds. Deleting
  would mean dropping the folder, the `index.tsx` routes (incl. the `#/mobius` /
  `#/wrap-world` redirects), and the `apps.ts` entry (reversible, like `#/fractals-cpu`).
  A product call for Dan; mirrors the Stable Marriage "keep-unlisted-or-delete"
  question in [`docs/sessions/TODO.md`](../sessions/TODO.md).

### Resolved

- [x] **2026-06-15** (`polygon-walk-continue-4tyht3`) — **Retired**: unlisted from the
  gallery (`apps.ts` + `catalog.ts` removed), route + `#/mobius` / `#/wrap-world`
  redirects kept; its corridor **themes** were salvaged into Polygon Worlds' scene
  "looks" (`PolygonWorlds/looks.ts`, minus wall textures/torches/bloom).
  [Handoff.](../sessions/handoff/polygon-walk-continue-4tyht3/2026-06-14-S01-continue-polygon-walk.md)
- [x] **2026-06-14** (`topology-world-review-m9p5as`) — Final "tighten and enrich" pass
  before retirement.
  [Handoff.](../sessions/handoff/topology-world-review-m9p5as/2026-06-14-S01-tighten-and-enrich.md)
- [x] **2026-06-07** (`klein-bottle-fix`) — Unified the two "rectangular" worlds (flat
  + spherical) under one glass / mini-map / other-side presentation; the original
  Klein-bottle orientation fix.

## What it does

A first-person/third-person walk on a closed surface, across two kinds of world chosen
by the **Setting** switch:

- **World panel** (`subject`) — **Setting** (Corridor / Open space flat / Curved
  sphere), then a **Surface** select within it: corridor = Loop (torus tube) / Möbius /
  double / triple twist / trefoil knot; flat = Flat torus / Klein bottle; spherical =
  Sphere / ℝP². Plus a cover-dependent slider (Corridor width / Planet radius).
- **Camera panel** (`view`) — Third-person view, Project avatar into every cell (flat),
  Mini-map, Color each cover cell (flat).
- **Scene panel** (`marks`) — Theme + Floor markers + Cinematic bloom (corridor),
  Glass-floor toggle/opacity (rectangular worlds), Ambient light (corridor).
- **Move & write panel** (`drive`) — Walk speed, Wall text (corridor), Clear trail /
  Clear writing buttons. WASD/arrows or the MovePad walk; drag to look; **Space** (or
  the ✎ pad button) paints the corridor walls.
- **Quality panel** (`quality`) — Cinematic bloom (corridor only).
- **View window** — one first-person view with the MovePad and a per-family **mini-map**
  overlaid (corridor map placeholder, the `FlatMiniMap`, or the `SphereMiniMap` /
  ℝP² square map).

## How the code works

**Three engines behind one shell.** `TopologyWalk.tsx` is the React shell — it owns all
UI state, the panels/view, pointer (look) + keyboard (WASD + Space-to-write) input, and
the mini-maps. It selects one of **three engines by `family`** (`makeEngine`):

- `corridorEngine.ts` — the knotted-tube worlds. Geometry from `corridorGeometry.ts`,
  a custom wall shader in `shaders/corridorMaterial.ts`, optional bloom.
- `flatEngine.ts` — the χ = 0 flat worlds (torus, Klein), tiled universal cover over a
  glass floor.
- `sphericalEngine.ts` — the χ > 0 worlds (sphere, ℝP²), the decorated square charted
  onto a planet.

The shared engine surface is `WorldEngine` (`engine.ts`), with `frame(input)` plus a
bag of optional `set*` setters (`setWidth`, `setTheme`, `setRadius`, …). The shell
holds a `Ctx` (`{ deps, engine, family, surfaceId }`); a surface change that **crosses
the corridor/flat/spherical divide disposes and rebuilds** the engine, while a change
*within* a family reshapes in place via `setSurface?.()`. Per-control effects mirror
state into `optsRef` and call the matching setter so changes apply live. `themes.ts`
holds the corridor atmospheres (the seed for Polygon Worlds' looks); `squareMap.ts`
draws the flat/ℝP² fundamental-domain mini-maps.

> [!NOTE]
> **This is the older "engine-per-family" pattern.** Its successor, Polygon Worlds,
> replaced it with a single facade engine + a `CoverModel` chosen by χ (topology as
> data, read from an edge word). When learning the family, prefer Polygon Worlds'
> architecture; Topology Walk is the historical version.

## Key files

| File | Role |
|---|---|
| [`TopologyWalk.tsx`](../../src/animations/TopologyWalk/TopologyWalk.tsx) | React shell: state, panels, view, three mini-maps, input, engine selection |
| [`engine.ts`](../../src/animations/TopologyWalk/engine.ts) | Shared `WorldEngine` interface + the surface catalog (`SURFACES`, families) |
| [`corridorEngine.ts`](../../src/animations/TopologyWalk/corridorEngine.ts) · [`corridorGeometry.ts`](../../src/animations/TopologyWalk/corridorGeometry.ts) | The knotted-tube worlds + their geometry |
| [`flatEngine.ts`](../../src/animations/TopologyWalk/flatEngine.ts) | χ = 0 flat torus / Klein (tiled cover + glass floor) |
| [`sphericalEngine.ts`](../../src/animations/TopologyWalk/sphericalEngine.ts) | χ > 0 sphere / ℝP² (planet chart) |
| [`themes.ts`](../../src/animations/TopologyWalk/themes.ts) | Corridor atmospheres — **salvaged into Polygon Worlds' `looks.ts`** |
| [`squareMap.ts`](../../src/animations/TopologyWalk/squareMap.ts) | The fundamental-domain mini-map (flat + ℝP² square) |
| [`shaders/corridorMaterial.ts`](../../src/animations/TopologyWalk/shaders/corridorMaterial.ts) | The corridor wall shader |
| [`footprints.ts`](../../src/animations/TopologyWalk/footprints.ts) · [`glassSurface.ts`](../../src/animations/TopologyWalk/glassSurface.ts) · [`otherSide.ts`](../../src/animations/TopologyWalk/otherSide.ts) | The oriented-footprint trail, glass floor, mirrored underside |
| [`EXPLAINER.md`](../../src/animations/TopologyWalk/EXPLAINER.md) | The **?** modal text |

## Invariants & gotchas

> [!CAUTION]
> **Gotcha — the reversed "F" is intentional content.** Topology Walk paints footprints
> as an "F" that comes back as a mirror "Ⅎ" across an orientation flip; this is a
> deliberate det < 0 on the *content*. Polygon Worlds takes the **opposite** pedagogy
> (you carry your frame; the mirror is only seen *through the glass*). The two were
> audited and chosen to differ — **do not "fix" one to match the other**, it is a
> product decision.

- **Window key handlers early-return** when `document.activeElement` is a form control
  (`INPUT`/`TEXTAREA`/`SELECT`) — without it, WASD / Space would walk and stamp writing
  while the user types in the Wall-text field.
- **Engine rebuild only on family cross.** Switching surfaces inside the same family
  reshapes in place; only crossing corridor ↔ flat ↔ spherical disposes + rebuilds. Keep
  that boundary if you touch the surface-change effect.
- **The redirects are load-bearing.** `#/mobius` and `#/wrap-world` resolve here; don't
  drop them while the route exists (old deep links rely on them).
- **Don't invest in new features here** — fixes belong in Polygon Worlds unless they're
  specific to the corridor worlds it doesn't have.

## Testing & verification

- `npm run build` — the CI gate.
- Headless screenshot: `node scripts/shoot.mjs '#/topology-walk' shot.png` (the default
  surface is the Klein bottle); `#/mobius` should resolve to the same component.
- By eye: a Möbius lap rolls the world 180° (you walk back onto the former ceiling); on
  the Klein bottle the footprints across the red gluing come back mirror-reversed; on
  the plain torus / Loop they never do.

## History & sources

- **Built/iterated by:** `klein-bottle-fix` (origin + rectangular-world unification),
  `topology-world-review-m9p5as` (final enrich pass), and `polygon-walk-continue-4tyht3`
  (retirement + theme salvage) — all under [`docs/sessions/`](../sessions/).
- **Possible sources:** see the EXPLAINER (Jeff Weeks' first-person closed-surface
  walks; the Möbius/Klein/ℝP² classics; the cross-cap / Roman / Boy's-surface
  immersions of ℝP²).
