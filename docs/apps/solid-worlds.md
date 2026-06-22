---
kind: app-guide
app: solid-worlds
route: "#/solid-worlds"
name: Solid Worlds
title: Solid Worlds — developer guide
status: active
build: passed
entry: src/animations/SolidWorlds/SolidWorlds.tsx
updated: 2026-06-21
signals: null
next: Replicate this guide format across the remaining apps; then decide whether to wire docs/apps into the control center.
---

# Solid Worlds — developer guide

> Walk inside a closed 3-manifold built from one glued cube — a room that repeats
> forever — and watch an orientation-reversing loop bring you back mirrored.

The living architecture + status doc for this app. Conventions:
[`GUIDE_STYLE.md`](GUIDE_STYLE.md). What this doc type is: [`README.md`](README.md).
The teaching/math ("what am I looking at") lives in
[`EXPLAINER.md`](../../src/animations/SolidWorlds/EXPLAINER.md); the deep bug
write-up in [`SCREW_BUG.md`](../../src/animations/SolidWorlds/SCREW_BUG.md).

## Status

- **Route:** `#/solid-worlds` (no redirects). Listed in the gallery.
- **Stability:** ✅ **active** — the 3D successor to Polygon Worlds. The 8-world
  flat catalog is complete and **dual-verified**; recent work is the math engine
  (screw-bug fix, 2026-06-20) and the **Rooms** decor layer.
- **Entry:** `SolidWorlds.tsx` · 12 ts/tsx files, ~3.4k LOC, subdirs `lib/`,
  `decor/`, `__tests__/`.
- **Build/tests:** covered by `npm run build`; **53 vitest tests** under
  `__tests__/` (catalog invariants + cell-engine cross-checks). Keep green.

## Active / Resolved

The per-app control center — hand-maintained.

### Active

- [ ] **!low** Make the Rooms ceiling duct world-specific.
  The steel ceiling duct (`decor/rooms.ts`) is drawn on every world; in plain
  (non-inverting) worlds it's a redundant high vent to the same neighbor as the
  arch. It earns its keep only where a gluing flips vertical↔horizontal. Cutting it
  conditionally would tie decor to `spec` (currently spec-independent — see
  Invariants). From `docs/sessions/TODO.md`.
- [ ] **!low** Punch the engine floor plane through at the trapdoor.
  The Rooms floor has a trapdoor hole + rim, but the engine's separate whole floor
  plane still shows under it unless "Floor plane" is off. From `TODO.md`.
- [ ] **!low (shelved)** Decor refactor — split `decor/rooms.ts` per-piece + fix
  object scale. The Rooms decorator is one ~264-line builder; the furniture is
  pinned to the fixed constant `U = 9`, not the room `size`, so objects loom and
  don't track Room-size. This branch (`solid-worlds-decor-refactor`) started here
  before pivoting to build out this doc type; see its
  [progress report](../sessions/progress/solid-worlds-decor-refactor/2026-06-21-S01-rooms-decor-refactor.md).
- [ ] **product (deferred)** App naming — "Solid Worlds" vs *Manifold Walk*. Dan
  deferred the call.

### Resolved

- [x] **2026-06-20** (`3d-manifold-worlds-imwmal`) — Screw bug fixed; all 8
  platycosms **dual-verified**. Two distinct bugs: (A) the boundary gluing "bounced"
  a screwed face back to its source (χ = 1) — fixed with `orbitInCube`; (B) the
  N = 2 vertex link folds on screw worlds (subdivision artifact) — fixed with a
  finer `chooseN`. Added a guard that throws on fractional axial offsets. Full
  write-up: `SCREW_BUG.md`.
  [Handoff.](../sessions/handoff/3d-manifold-worlds-imwmal/2026-06-20-S01-solid-worlds-continue.md)
- [x] **2026-06-20** (`3d-manifold-worlds-imwmal`) — Confirmed the second
  amphidicosm (−a2) = ℤ ⊕ ℤ/4 against the literature (caveat: primary PDFs were
  network-blocked; rests on search summaries + both in-app computations agreeing).
- [x] **earlier** — Rooms decor mode (furnished cube, off-center archways, ceiling
  ducts, solid translucent walls); chirality HUD (original · rotated · mirrored);
  third-person cutaway clip plane; selectable scene "looks".

## What it does

A first-person/third-person walk inside a flat closed 3-manifold. The fundamental
domain is a **cube**; the one knob is **how its faces glue in pairs**.

- **World picker** (World panel) — 8 of the 10 flat 3-manifolds (platycosms): the
  3-torus, half-turn & quarter-turn spaces, both amphicosms, both amphidicosms, and
  the orientable **Hantzsche–Wendt** didicosm. The two needing a hexagonal prism
  are out of scope. The panel shows the world's invariants: manifold name,
  orientable?, **H₁**, χ (always 0), and whether it's `verified`.
- **Perspective** — Third person (default) / First person (top-bar mode pills on
  desktop, a pill on phone).
- **View panel** — **Decor** (Diagnostic ↔ Rooms), **Look** (scene theme),
  Camera distance, **Cutaway** (third-person clip gap, as a fraction toward the
  walker), **Cover depth** (rings of repeated copies; default 1), **Room size**,
  **Fog**, **Wall opacity** (Rooms only), and toggles for seams / floor plane /
  face labels / corner markers.
- **Walk panel** — Travel mode (Walk / Drive / Fly) + Speed. WASD/arrows + E/Q (or
  the on-screen move-pad) move; drag to look; pinch/scroll to zoom.
- **Chirality panel + HUD** — the headline instrument. Walk a loop and read your
  **handedness**: ORIGINAL · ROTATED N° · MIRRORED. A rotation is cosmetic (turn
  your body to undo it); a reflection is the real, un-fixable invariant. Optional
  footprint trail.
- **Cube mini-map** — a Schlegel-style wireframe of the fundamental cube; each
  axis's edges are colored by what its pairing does (translation/rotation/glide),
  with a walker dot that turns pink when mirror-reversed.

## How the code works

**Shell ↔ engine split.** `SolidWorlds.tsx` is the React shell: it owns all UI
state (world, view knobs, travel), defines the Workspace panels/view, the HUD,
mini-map, and move-pad, and handles pointer/keyboard input. It holds **no
geometry/topology math** — it drives the engine through refs.

**The cover engine** (`coverEngine.ts`, `makeCoverEngine`) does the work:
1. `buildRoom()` builds **one fundamental cube** — the cube frame, optional floor
   plane + grid, and the interior **decor** (Diagnostic props or the Rooms
   architecture), plus face-label/corner-marker resources.
2. `buildGenerators()` derives the deck-group generators from the world `spec`'s
   per-axis pairings (linear part + offset).
3. `buildCover()` **instances** that one room across `coverDepth` rings via the deck
   group — the hall of mirrors. A cell's +axis wall is literally a neighbor's −axis
   panel, transported by that pairing's gluing.
4. `frame(input)` advances the walk each rAF tick: integrate movement, wrap across
   faces (applying the gluing), update camera/avatar, accumulate the loop's
   holonomy, and recompute chirality.

**Update flow.** Every control in the shell mirrors to a `*Ref` and calls a matching
engine setter (`setRoomSize`, `setCutFrac`, `setWallOpacity`, …) so changes apply
live without a rebuild; changing the **world** disposes and rebuilds the engine.
The shell reads back live state for the HUD/mini-map via `getChirality()` /
`getMapState()` polled in rAF.

**Two independent homology engines** (this is the app's spine):
- `lib/freeness.ts` — the **authoritative** H₁ from the deck group's abelianization
  (point group + Reidemeister–Schreier lattice → Smith normal form), plus a
  **free-action test** certifying a genuine manifold (vs a cone-point orbifold).
- `lib/homology.ts` — the glued-cube **cell complex**: an independent χ and a
  cross-check H₁. A world is `verified` only when the two agree (and χ = 0 and the
  vertex links are spheres). See `solidSchema.ts → analyzeSolid`.

## Key files

| File | Role |
|---|---|
| [`SolidWorlds.tsx`](../../src/animations/SolidWorlds/SolidWorlds.tsx) | React shell: state, panels, view, ChiralityHUD, SolidMiniMap, MovePad, input |
| [`coverEngine.ts`](../../src/animations/SolidWorlds/coverEngine.ts) | The engine: build room → generators → cover instancing → walk loop → chirality |
| [`engineTypes.ts`](../../src/animations/SolidWorlds/engineTypes.ts) | Shared types + defaults (`DEFAULT_ROOM_SIZE = 11`, `DEFAULT_COVER_DEPTH = 1`) |
| [`solidSchema.ts`](../../src/animations/SolidWorlds/solidSchema.ts) | `SolidWorldSpec`, `analyzeSolid` (the `verified` gate), axis helpers |
| [`worlds.ts`](../../src/animations/SolidWorlds/worlds.ts) | The 8-world catalog (`SOLID_WORLDS`, `DEFAULT_WORLD_ID`) |
| [`looks.ts`](../../src/animations/SolidWorlds/looks.ts) | Selectable scene "looks" (distilled from Topology Walk's themes) |
| [`textures.ts`](../../src/animations/SolidWorlds/textures.ts) | Canvas textures: face motif, rug, picture, footprint, face label, sign |
| [`decor/rooms.ts`](../../src/animations/SolidWorlds/decor/rooms.ts) | The **Rooms** decorator (furnished cube, archways, ducts, solid translucent walls) |
| [`lib/freeness.ts`](../../src/animations/SolidWorlds/lib/freeness.ts) | Authoritative Γᵃᵇ H₁ + free-action manifold test |
| [`lib/homology.ts`](../../src/animations/SolidWorlds/lib/homology.ts) | Cube cell complex: χ + cross-check H₁ (`orbitInCube`, `chooseN`) |
| [`__tests__/`](../../src/animations/SolidWorlds/__tests__/) | `gab.test.ts`, `solidSchema.test.ts` — catalog + cross-check regressions |
| [`SCREW_BUG.md`](../../src/animations/SolidWorlds/SCREW_BUG.md) | Deep write-up of the 2026-06-20 screw-bug fix |

## Invariants & gotchas

> [!CAUTION]
> **Gotcha** — a world is `verified` only when **both** homology engines agree
> (`lib/freeness.ts` is authoritative; the cell complex cross-checks). Never mark a
> world verified from the cell complex alone, and never treat the vertex-link sphere
> test as a manifold-vs-orbifold detector — that's the free-action test's job.

- **Decor is spec-independent.** The Rooms/diagnostic decor draws **only the three
  −axis faces**; the deck instancing transports them to neighbors' +axis walls. Put
  **no gluing math in the decor** — that's what makes openings line up across rooms
  for free. (The "ceiling duct world-specific" backlog item is hard precisely
  because it would break this.)
- **Emissive-only lighting.** Lamps/fire/chandelier are emissive materials, *not*
  real point lights — real lights would multiply across the cover and fight the
  holonomy-symmetrized lighting.
- **Cutaway clip plane** is shared **by reference** across all cover materials
  except the floor (which stays whole); avatars live outside `coverRoot` so they
  never clip.
- **`verified` needs both engines to agree.** Never mark a world verified from the
  cell complex alone — `lib/freeness.ts` is authoritative; the vertex-link sphere
  test catches broken gluings but is *not* a manifold-vs-orbifold detector (a cone
  point's link is still a sphere). The free-action test is.
- **The cell complex is only valid when the cube is one fundamental domain**
  (perpendicular screws). It **throws** on a fractional axial offset rather than
  report a meaningless χ.
- **Screw worlds need a finer subdivision** (`chooseN` returns 2·N₀); H₁/χ are
  subdivision-invariant so values are unaffected.
- **`coverDepth` is session-only** (not persisted) so the default always wins on
  load — a stale stored value would hide the hall-of-mirrors depth.
- **Window key handlers early-return** when `document.activeElement` is a form
  control, so typing in panels doesn't drive the walker.

## Testing & verification

- `npm test` — runs the vitest suite, including the 53 Solid Worlds tests (catalog
  invariants, the `verified` gate, boundary closure, axial-offset rejection).
- `npm run build` — the only CI gate; must pass.
- Headless screenshot: `node scripts/shoot.mjs '#/solid-worlds' shot.png`. Note the
  default route loads the 3-torus; other worlds are chosen via the World picker
  (persisted in localStorage) — there's no URL param to preselect one.
- By eye: walk the **x-loop in Klein × Circle** and confirm the handedness HUD flips
  to MIRRORED (and the mini-map dot turns pink); confirm a screw world's World
  panel reads "cross-checked".

## History & sources

- **Built/iterated by:** `3d-manifold-worlds-imwmal` (screw fix + dual-verify),
  `solid-worlds-review-bju3pc`, `animath-space-worlds-hm7wui`, and the
  `solid-worlds-decor-refactor` branch (this doc) — all under
  [`docs/sessions/`](../sessions/).
- **Possible sources:** see the EXPLAINER's "Possible sources & where to go
  further" (Jeff Weeks' *Curved Spaces* / *The Shape of Space*, Conway–Rossetti's
  platycosm naming, Hantzsche–Wendt 1935).
