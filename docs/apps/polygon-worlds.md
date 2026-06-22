---
kind: app-guide
app: polygon-worlds
route: "#/polygon-worlds"
name: Polygon Worlds
title: Polygon Worlds — developer guide
status: active
build: passed
entry: src/animations/PolygonWorlds/PolygonWorlds.tsx
updated: 2026-06-22
signals: null
next: Build roadmap D (the vertex-ring curvature/holonomy demo) — the highest-value unbuilt feature.
---

# Polygon Worlds — developer guide

> One decorated square, four worlds: glue its edges and let curvature follow —
> walk a torus, Klein bottle, projective plane or sphere in first person.

The living architecture + status doc for this app. Conventions:
[`GUIDE_STYLE.md`](GUIDE_STYLE.md). What this doc type is: [`README.md`](README.md).
The teaching/math ("what am I looking at") lives in
[`EXPLAINER.md`](../../src/animations/PolygonWorlds/EXPLAINER.md), not here.
This is the **2D predecessor of [Solid Worlds](solid-worlds.md)** (the 3-manifold
successor) and the **successor to [Topology Walk](topology-walk.md)** (from which it
inherited its scene "looks").

## Status

- **Route:** `#/polygon-worlds` (no redirects). Listed in the gallery.
- **Stability:** ✅ **active** — the math catalog (12 worlds across flat / spherical /
  hyperbolic covers) is complete and orientation-verified; recent work is UX +
  atmosphere (immersive desktop, scene looks) and the new ℝP²/zip-sphere worlds.
- **Entry:** `PolygonWorlds.tsx` · ~21 ts/tsx files, ~5.7k LOC, subdirs `lib/`,
  `presenters/`, `instruments/`.
- **Build/tests:** covered by `npm run build`; **no `__tests__/`** here. Correctness
  is gated by standalone tsx scripts (`scripts/verify-schemas.ts`,
  `scripts/verify-geometry.ts`, `scripts/probe-trivial-words.ts`) plus the headless
  chirality guard (`scripts/trail-chirality.mjs`). Keep them green.

## Active / Resolved

The per-app control center — hand-maintained.

### Active

- [ ] **!high** Build roadmap **D** — the vertex-ring **curvature/holonomy** demo.
  Flagged the highest-value unbuilt feature in the
  [polygon-walk-continue handoff](../sessions/handoff/polygon-walk-continue-4tyht3/2026-06-14-S01-continue-polygon-walk.md);
  it also unlocks E1 (hyperbolic decor azimuth equivariance).
- [ ] **!med** Cover-aware sky / clouds. Atmosphere is genuinely *cover-dependent* in
  non-orientable worlds (it should depend on which side of the sheet you're on), so a
  skybox/cloud treatment belongs in the `CoverModel`/deck, not static chrome. Prototype
  on orientable worlds first.
- [ ] **!low** Narrow-desktop bar clip — between ~740–860px the immersive top bar
  overflows ~20px (skin-picker edge). Cosmetic; reclaim space by shortening the
  perspective pills or moving perspective into the View panel on desktop too.
- [ ] **!low** Roadmap **B/C** (ℝP² inside-walk) and **E2** (a `klein6` glide-crossing
  smoothness pixel guard) remain unpicked.

### Resolved

<!-- newest first -->
- [x] **2026-06-15** (`polygon-walk-continue-4tyht3`) — Four new worlds
  (`rp2hex`, `rp2oct`, `zipsphere6`, `zipsphere8`); desktop **immersive** mode;
  **scene looks** salvaged from Topology Walk; controls reorg (World-panel picker,
  bottom action strip, perspective pills); chirality guard **green on all 12 worlds**.
  Topology Walk retired (unlisted, route kept). A bloom experiment was built and
  **reverted** ("looks terrible").
  [Handoff.](../sessions/handoff/polygon-walk-continue-4tyht3/2026-06-14-S01-continue-polygon-walk.md)
- [x] **2026-06-10** (`polygon-sign-orientation-50exno`) — Sign-orientation review +
  the two-faced glass sign (amber front / cyan back ink); the "through the glass:
  backwards or upside-down?" pedagogy.
  [Handoff.](../sessions/handoff/polygon-sign-orientation-50exno/2026-06-10-S01-sign-orientation-review.md)
- [x] **2026-06-08/09** (`polygon-worlds-spherical-p2`) — The three presenters
  (Euclidean, spherical, hyperbolic); the two-sided sheet; the "ink on the sheet"
  canonical trail; the Setting.
- [x] **2026-06-07/08** (`polygon-worlds`, `polygon-worlds-geometry`) — Foundation:
  the edge-word schema base layer (`surfaceSchema.ts`) and the constant-curvature
  geometry kernel (`lib/`).

## What it does

A first-person/third-person walk on a closed surface. The fundamental domain is a
**decorated polygon** (trees on one face, columns on the other); the one knob is
**how its edges glue in pairs** — and that single choice forces the curvature.

- **World panel** (`subject`) — the world picker, a grouped `Select` over the 12-world
  catalog, grouped by the cover that χ forces: **Flat · χ = 0** (square + hexagonal
  torus, square + hexagonal Klein), **Sphere · χ > 0** (ℝP² square/hex/oct, round
  sphere, hex/oct zip-spheres), **Hyperbolic · χ < 0** (double torus, Dyck's three
  cross-caps). The panel reads back the live invariants — edge word, surface name,
  orientability, χ, curvature sign — **computed from the edge word** via
  `analyzeWorld` → `surfaceSchema.analyze`, not from a stored table.
- **View panel** (`view`) — scene **Look** (Daytime / Overcast / Ember dusk /
  Moonlit), Camera distance (third person only), and a cover-dependent scale slider
  (Square/Polygon size flat · Disk scale hyperbolic · Planet radius spherical) plus
  Floor thickness on the flat worlds. On phone, the perspective pill rides here.
- **Landmarks & sign panel** (`marks`) — Landmark count + Arrangement, Glass-floor
  opacity, and the two-faced **glass sign**'s Front/Back text. Each sign face carries
  its own ink; read from the back it is mirror-reversed — the orientation cue in your
  own words.
- **Walk panel** (`drive`) — Walk speed. WASD/arrows or the on-screen MovePad walk;
  drag to look; pinch/scroll to zoom.
- **Action strip** (always-on) — **Plant sign** + **Clear** (a chooser: trail / signs /
  both). On phone these fold into the bottom dock (`phoneActionsInDock`).
- **Perspective** — Third person (default) / First person, as top-bar mode pills on
  desktop; a View-sheet pill on phone.
- **View window** (`immersive`) — one first-person view that fills the stage below the
  top bar, with the **square mini-map**, the **MovePad**, and the **embedding inset**
  (the Steiner Roman surface for ℝP²) overlaid.

## How the code works

**Shell ↔ engine split.** `PolygonWorlds.tsx` is the React shell: it owns all UI state
(world, look, scale, landmarks, sign text), defines the Workspace panels/view/actions,
the mini-map and MovePad overlays, and handles pointer (look/pinch) + keyboard (WASD)
input. It holds **no geometry math** — it drives the engine through refs.

**The facade engine** (`fundamentalSquareEngine.ts`, `makeFundamentalSquareEngine`)
owns only what is genuinely shared — the lights (a warm "above" key + a cool "below"
key so the two faces read differently, plus a hemisphere fill and a camera headlamp,
all scaled by a per-cover `lightingProfile`), the walker avatar, the atmosphere/look,
and the per-frame orchestration. It delegates **all world rendering + movement** to a
**`CoverModel`** chosen by the topology.

**The one real seam is the cover** (`coverModel.ts`). χ picks the universal cover, and
each cover is a different mathematical object that is *not* merged — it owns its own
scene objects, movement integration, camera placement, ink trail, and the chart back
to the fundamental polygon:
- `presenters/euclidean.ts` — χ = 0: a tiled square slid under a fixed player over a
  glass floor.
- `presenters/spherical.ts` — χ > 0: the decorated polygon charted onto a fixed planet
  the camera walks around (plus the retintable `skyDome` for looks).
- `presenters/hyperbolic.ts` — χ < 0: the Poincaré disk, the tiling flowing past a
  centered player.

**The topology is data, not code.** A world is a `WorldSpec` (`worldSpec.ts`) whose
**source of truth is its edge word** (e.g. `a b a⁻¹ b⁻¹`). `surfaceSchema.ts` is a
rendering-free base layer that parses a word and derives everything — vertex
identifications (union-find on corners), χ = V − E + F, orientability, curvature sign,
and the surface name — with no per-surface special case. `deriveGeometry` maps the
sign of χ to the cover. `lib/realize.ts` develops the polygon's geometry from the word;
`lib/invariants.ts` is the kernel's correctness battery.

**Update flow.** Every control mirrors to a `*Ref` and calls a matching engine setter
(`setLook`, `setSquareSize`, `setFloorOpacity`, `setRadius`, `setCameraDistance`, …) so
changes apply live. Changing the **world** (or the landmark set) **disposes and
rebuilds** the engine. The shell reads back live state for the mini-map + embedding
inset via `getMapState()` / `getPose()` polled in rAF.

**Test seam.** `?polydebug` in the URL attaches a `window.__poly` bridge (map / probe /
clearTrail / plantSign / `auditDecor` / `auditInk`) so the headless guards can read the
walker's chart and audit that every decor mesh is placed by a proper (det > 0)
transform. No effect on the shipped app.

## Key files

| File | Role |
|---|---|
| [`PolygonWorlds.tsx`](../../src/animations/PolygonWorlds/PolygonWorlds.tsx) | React shell: state, panels, immersive view, mini-map, MovePad, embedding inset, input |
| [`fundamentalSquareEngine.ts`](../../src/animations/PolygonWorlds/fundamentalSquareEngine.ts) | Facade engine: shared lights/avatar/atmosphere + frame orchestration; picks a CoverModel |
| [`coverModel.ts`](../../src/animations/PolygonWorlds/coverModel.ts) | The `CoverModel` interface — the one seam that differs per cover |
| [`worldSpec.ts`](../../src/animations/PolygonWorlds/worldSpec.ts) | The 12-world catalog (`WORLDS`), `deriveGeometry` (χ → cover), `analyzeWorld` |
| [`surfaceSchema.ts`](../../src/animations/PolygonWorlds/surfaceSchema.ts) | Rendering-free base layer: parse edge word → χ / orientability / name (union-find) |
| [`looks.ts`](../../src/animations/PolygonWorlds/looks.ts) | The 4 scene looks (atmosphere presets), distilled from Topology Walk's themes |
| [`presenters/euclidean.ts`](../../src/animations/PolygonWorlds/presenters/euclidean.ts) · [`spherical.ts`](../../src/animations/PolygonWorlds/presenters/spherical.ts) · [`hyperbolic.ts`](../../src/animations/PolygonWorlds/presenters/hyperbolic.ts) | The three covers (flat / sphere / Poincaré disk) |
| [`lib/realize.ts`](../../src/animations/PolygonWorlds/lib/realize.ts) · [`develop.ts`](../../src/animations/PolygonWorlds/lib/develop.ts) · [`invariants.ts`](../../src/animations/PolygonWorlds/lib/invariants.ts) | Constant-curvature geometry kernel + correctness battery |
| [`inkTrail.ts`](../../src/animations/PolygonWorlds/inkTrail.ts) · [`sign.ts`](../../src/animations/PolygonWorlds/sign.ts) | The "ink on the sheet" canonical trail + the two-faced glass sign |
| [`decor.ts`](../../src/animations/PolygonWorlds/decor.ts) | Landmark props (trees/columns) + arrangements |
| [`squareMap.ts`](../../src/animations/PolygonWorlds/squareMap.ts) · [`polygonMap.ts`](../../src/animations/PolygonWorlds/polygonMap.ts) | The fundamental-domain mini-map (square + n-gon variants) |
| [`instruments/embeddingInset.tsx`](../../src/animations/PolygonWorlds/instruments/embeddingInset.tsx) · [`immersions.ts`](../../src/animations/PolygonWorlds/instruments/immersions.ts) | The extrinsic embedding inset (Steiner Roman surface for ℝP²) |
| [`EXPLAINER.md`](../../src/animations/PolygonWorlds/EXPLAINER.md) | The **?** modal text |

## Invariants & gotchas

> [!CAUTION]
> **Gotcha — orientation is genuine, never faked.** The ink trail is stored **once**,
> with no mirror flags; every mirror-reversed appearance comes from a genuine det < 0
> render transform (viewing the back of your own ink). All non-ink decor must be placed
> by a **proper (det > 0)** world transform — `auditDecor` (under `?polydebug`) throws
> up any offenders. Don't introduce a mirrored mesh to "look right"; it breaks the
> certificate that the world's non-orientability is real.

- **Topology is read from the edge word, not the stored constants.** The World panel's
  readout uses `analyzeWorld` → `surfaceSchema.analyze(spec.word)`. The `chi` /
  `orientable` fields on `WorldSpec` are the square worlds' presentation of the same
  gluing; keep them consistent with the word, but the word is the source of truth (this
  is the seam that lets free edge-word entry drop in later).
- **The three covers are different objects and are not merged.** Each `CoverModel` owns
  its own trail, chart, and camera. Keeping the boundary explicit is also what keeps a
  future gluing/curvature morph expressible.
- **Window key handlers early-return** when `document.activeElement` is a form control
  (`INPUT`/`TEXTAREA`/`SELECT`), so typing in the sign fields doesn't walk the avatar.
  Note `keyup` always releases the movement flag (a key let go while a field has focus
  must not leave the walker stuck).
- **Persist settings, not view state.** Genuine settings (`moveSpeed`, scale, opacity,
  landmarks, look, sign text) use `usePersistentState`; the **selected world**, the
  third-person toggle, and the camera distance are **session-only** by design (you land
  predictably; camera orbit is transient per convention).
- **Looks are global, not per-world.** Stored under `polygon-worlds:look`. (Whether
  they *should* be per-world is an open product question — see the handoff.)
- **`immersive` is a single-view contract.** The app passes `immersive` to fill the
  stage; the rail becomes a horizontal top-bar row and the bar title is hidden (it
  duplicated the World icon). This is shared, gated chrome — don't regress it for other
  apps.

## Testing & verification

- `npm run build` — the CI gate.
- **Schema battery:** `npx --yes tsx scripts/verify-schemas.ts` — every catalog word
  against the classification tables (χ / orientability / curvature / surface family).
- **Geometry kernel:** `npx --yes tsx scripts/verify-geometry.ts` — the
  constant-curvature invariants every cover must satisfy.
- **Smooth-flat catalog:** `npx --yes tsx scripts/probe-trivial-words.ts` — which n-gon
  words give cone-point-free flat worlds.
- **Chirality guard:** `node scripts/trail-chirality.mjs` (per-world or all 12) — the
  decisive orientation test that the freshest print reads correctly in the character's
  frame on **both** sides of the sheet.
- Headless screenshots: `node scripts/shoot.mjs '#/polygon-worlds' shot.png`, or the
  world-selector driver `node scripts/shoot-pw.mjs <worldId> out.png`; sign captures via
  `scripts/sign-shots.mjs`.
- By eye: cross a flipped edge on the Klein bottle and confirm the mini-map flags the
  *other face*, the landmarks swap trees ↔ columns, and your earlier footprints hang
  under the glass mirror-reversed; on the torus they never do.

## History & sources

- **Built/iterated by:** `polygon-worlds` (foundation), `polygon-worlds-geometry`
  (kernel), `polygon-worlds-spherical-p2` (presenters + trail + setting),
  `polygon-sign-orientation-50exno` (sign), `polygon-walk-continue-4tyht3` (new worlds,
  immersive, looks, Topology Walk retirement), and the early `klein-bottle-fix` /
  `complex-sheet` work — all under [`docs/sessions/`](../sessions/).
- **Possible sources:** see the EXPLAINER's "Possible sources & where to go further"
  (Jeff Weeks' *Torus Games* and *The Shape of Space*; the classification of surfaces
  by edge words; Gauss–Bonnet; the Steiner Roman surface).
