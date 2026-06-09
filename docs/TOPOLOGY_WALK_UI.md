# Topology Walk — Interface Manual

> **Purpose.** A complete, code-free inventory of the **Topology Walk** app
> (route `#/topology-walk`; the legacy `#/mobius` and `#/wrap-world` hashes
> redirect to it) in the animath toolkit: every screen region, control, overlay,
> and readout — what it is, where it lives, what it does.
> **Scope.** This app *and* the way it consumes the shared **AppShell** chrome,
> because this manual feeds a design review aimed at refining that shell for
> reuse. **Captured as built** from source; this is a description, not a
> specification. Present tense throughout.
> **Supersession.** This manual **replaces** the now-obsolete
> `docs/MOBIUS_WALK_UI.md`: the former on-rails Möbius Walk was renamed and
> rewritten into this player-driven, multi-world surface walker.

---

## 0. What the app is

Topology Walk is a first-person walk on a **closed surface** in which you read
the topology off your own footprints. One **Setting** switch picks the kind of
world: a **Corridor** — a twisting (Möbius, double/triple twist) or knotted
(trefoil) enclosed tube you walk *through*, where "up" is glued to the floor's
surface normal so a Möbius lap rolls the whole world over — or an **Open space**
— an intrinsically flat **torus** or **Klein bottle** you walk *across*, where
nothing flips locally and you discover the gluing only by traveling past
repeated landmarks. You are not on rails: you steer with WASD/arrows or an
on-screen pad, drag to look, and watch oriented **F**-arrow footprints come back
mirror-reversed wherever the surface reverses orientation.

---

## 1. Screen layout

A single full-screen first-person 3D view fills the area below the shared top
bar. The app draws several of its own overlays on top of the canvas: a movement
pad, a top instruction strip, and (corridor only) a mini-map frame.

```
┌──────────────────────────────────────────────────────────────┐
│ ⌂  ☰  ƒ   Topology Walk  Möbius corridor    ⚙   ▶   ?         │  ← shared AppShell top bar
├──────────────────────────────────────────────────────────────┤
│        Drag to look · WASD / arrows move · Space (✎) writes    │  ← top instruction strip
│                                              ┌────────┐        │
│                                              │  Map   │        │  ← mini-map frame (corridor only)
│            full-screen first-person 3D view  └────────┘        │
│            (Canvas3D / Three.js WebGL canvas, inset:0)         │
│                                                    ▲           │
│                                                  ◀ ▼ ▶  ← MovePad
│                                                  ✎ (corridor)  │
│                                          ┌──────┐              │
│                                          │  ▶   │  ← generic ActionFloater (draggable)
│                                          └──────┘              │
└──────────────────────────────────────────────────────────────┘
```

- **Top bar** — shared `AppShell` header, full width, fixed.
- **3D viewport** — a `<div style={{ position:'absolute', inset:0, cursor:'grab', touchAction:'none' }}>`
  wrapping `Canvas3D`, which mounts the Three.js `WebGLRenderer` canvas. The div
  owns the look-drag pointer handlers.
- **MovePad** — a 150×150 cluster of glassy buttons bottom-right (`bottom:20,
  right:20`, `zIndex:20`), always present.
- **Top instruction strip** — centered, dim white text, top of the viewport,
  `pointerEvents:none`; its wording switches by world family.
- **Mini-map frame** — a 150×150 bordered box top-right (`top:12, right:12`),
  shown **only** in the corridor family when Mini-map is on (the 3D inset is
  drawn by the renderer into this corner; this DOM box is just the frame + "MAP"
  label).
- **ActionFloater** — the shared draggable/collapsible floating action panel,
  rendered by the shell because the app registers actions.

---

## 2. Shared chrome, as this app uses it

The app imports `ShellActions`, `ShellSettings`, `useAppHeader`, and
`useAppExplainer` from `AppShell`, and `Section`, `Slider`, `Select`, `Pills`,
`Checkbox` from `ControlPanel`. **Unlike the old Möbius Walk** (which had empty
Settings/Function tabs and a single hand-rolled `<button>` in Actions), this app
**conforms to the shell**: it fills the Settings tab with real `ShellSettings`
content built entirely from `ControlPanel` primitives. It is a positive
reference example for shell reuse.

| Top-bar control | Glyph | State here | Why |
|---|---|---|---|
| Home | `⌂` | **Active** | Shown on every non-`/` route; navigates to menu. |
| Apps | `☰` | **Active** | Always active; opens Apps tab. |
| Function | `ƒ` | **Dimmed** | App never calls `useAppFunctions`; no function picker. |
| Title / subtitle | — | **Active** | Opens Settings tab (settings present). |
| Settings | `⚙` | **Active** | App renders `ShellSettings` (`hasSettings` true). |
| Actions | `▶` | **Active** | App renders `ShellActions` (one or two buttons). |
| Explainer | `?` | **Active** | App registers `EXPLAINER.md` via `useAppExplainer`. |

- **Title / subtitle** — `useAppHeader('Topology Walk', def.short)`. The
  monospace subtitle is the active surface's `short` descriptor and updates live:
  `loop corridor`, `Möbius corridor`, `double-twist corridor`,
  `triple-twist corridor`, `trefoil-knot corridor`, `flat torus`,
  `flat Klein bottle`.
- **Drawer tabs filled** — **Apps** (shell-provided), **Settings** (rich), and
  **Actions** (1–2 buttons). The **Function** tab shows its empty-state ("No
  function picker for this view.").
- **useAppFunctions?** No.
- **useAppExplainer?** Yes — `EXPLAINER.md` imported `?raw`.
- **Generic ActionFloater** — **used** (not suppressed): the app does not call
  `useActionFloaterOff`, so the shell's standard collapsible `▶` floater mirrors
  the Actions content.

---

## 3. The view & interactions

Movement is **player-driven** — there is no autopilot. The app runs its own
`requestAnimationFrame` loop that gathers movement intent + look angles each
frame and hands them to the active world engine's `frame(...)`.

**Movement model.** Forward/back and strafe intents (each −1..1) are taken from
keys + the MovePad. Travel speed is `moveSpeed · dt`; in the corridor this
advances arc length `s` along the centerline and a clamped lateral offset `w`;
in flat worlds it advances `(px, pz)` on the plane. A stride phase accumulates
while moving to animate the avatar's legs/arms.

**Look / camera.** Dragging the canvas (one pointer) rotates yaw/pitch
(`LOOK_SENS = 0.0035`); pitch is clamped to ±`MAX_PITCH` (1.3 rad). In
first-person the camera sits at eye height (corridor `EYE_HEIGHT = 1.6`, flat
`EYE = 1.7`) looking along the yaw/pitch heading; "up" follows the corridor's
twisting frame (so the world rolls over on a Möbius lap) or world-Y on the flat
plane. **Third-person** swaps to a chase cam pulled back + up behind the avatar
(distance scales up on narrow/portrait aspects).

| Interaction | Result |
|---|---|
| Drag (mouse/1 finger) on canvas | Look around — yaw (horizontal), pitch (vertical, clamped ±1.3 rad). |
| `W` / `↑` | Move forward |
| `S` / `↓` | Move back |
| `A` / `←` | Move left (strafe) |
| `D` / `→` | Move right (strafe) |
| `Space` | Write wall text (corridor only); one-shot, ignores key-repeat |
| MovePad `▲ ◀ ▶ ▼` | Move (pointer hold = key hold) |
| MovePad `✎` | Write wall text (corridor only) |
| Window / container resize | `Canvas3D` updates camera aspect, renderer size, DPR (capped). |

- **Camera config** — corridor: `fov 75`, `near 0.05`, `far 200`; flat:
  `fov 75`, `near 0.05`, `far 400`.
- The third-person default is screen-size dependent: **third-person ON** on
  roomy screens, **OFF** (first-person) on portrait/small screens
  (`isCramped()`: portrait or shorter side < 560 px). Bloom defaults follow the
  same rule (off when cramped).

---

## 4. Settings (drawer ⚙)

Rendered via `ShellSettings`, built from `ControlPanel` primitives. Sections
are listed top-to-bottom. The **Scene** and **Writing** sections render **only**
in the corridor family; **World** is always present. **All three sections that
render are `defaultOpen`.**

### World (icon `∞`, `defaultOpen`) — always shown

| Control | Type | Label | Range / options | Default | Behavior |
|---|---|---|---|---|---|
| Setting | `Pills` | `Setting` | `Corridor (hallway)` / `Open space` | — (derived from surface) | Switches world family; lands on the last surface you used in that family (Corridor→`Möbius strip`, Open→`Flat torus` first time). |
| Surface | `Select` | `Surface` | family-filtered list (see below) | corridor: `Möbius strip` | Picks the specific surface within the current family. |
| Third-person view | `Checkbox` | `Third-person view` | on/off | screen-dependent (on unless cramped) | Toggles chase cam vs first-person. |
| Walk speed | `Slider` | `Walk speed` | min 1, max 16, step 0.5 (1 dp) | 6 | Movement speed multiplier. |
| (note line) | text | — | corridor vs flat hint | — | "Walk a lap of the Möbius corridor…" / "Red edges glue with a flip…". |

Surface `Select` options are filtered to the active family:

- **Corridor:** `Loop (torus tube)` (`loop`), `Möbius strip` (`mobius`),
  `Double twist` (`double`), `Triple twist` (`triple`),
  `Trefoil knot` (`trefoil`).
- **Open space (flat):** `Flat torus` (`torus`), `Klein bottle` (`klein`).

### Scene (icon `✦`, `defaultOpen`) — corridor only

| Control | Type | Label | Range / options | Default | Behavior |
|---|---|---|---|---|---|
| Theme | `Select` | `Theme` | `Steel panels`, `Spaceship`, `Rainbow road`, `Dragon's belly`, `Test chamber`, `Moonlit ruin` | `Steel panels` | Swaps wall texture, palette, fog, lighting rig + bloom params. |
| Floor markers (UP arrows) | `Checkbox` | `Floor markers (UP arrows)` | on/off | on | Shows/hides the floor decal strip (forward arrows + "UP"). |
| Cinematic bloom (GPU) | `Checkbox` | `Cinematic bloom (GPU)` | on/off | screen-dependent (on unless cramped) | Routes rendering through the `UnrealBloomPass` composer. |
| Mini-map | `Checkbox` | `Mini-map` | on/off | on | Shows/hides the corner inset map (and its DOM frame). |
| Corridor width | `Slider` | `Corridor width` | min 0.8, max 4, step 0.1 (1 dp) | 1.5 (`DEFAULT_PARAMS.width`) | Rebuilds corridor geometry at the new half-width; clears trail + writing. |
| Ambient light | `Slider` | `Ambient light` | min 0, max 2.5, step 0.05 (shown as %) | 1 (= 100%) | Scales ambient + hemisphere light intensity. |

### Writing (icon `✎`, `defaultOpen`) — corridor only

| Control | Type | Label | Range / default | Behavior |
|---|---|---|---|---|
| Wall text | text `<input>` (hand-styled, in a `cp-row`) | `Wall text` | `maxLength 24`, default `MÖBIUS` | The string painted on a wall when you press Space / `✎`. |
| (note line) | text | — | — | "Aim at a wall and press Space (or ✎) to paint it…". |

---

## 5. Actions (drawer ▶ / floater)

Rendered via `ShellActions` (mirrored into both the Actions tab and the
`ActionFloater`). Buttons are hand-styled `<button>`s inside a `cp-section-body`
div (not `ControlPanel` primitives).

| Control | Type | Label | Visibility | Behavior |
|---|---|---|---|---|
| Clear trail | `<button>` | `Clear trail` | always | Clears the footprint trail for the active engine. |
| Clear writing | `<button>` | `Clear writing` | corridor only | Removes all wall-text decals. |

---

## 6. App-specific overlays / HUD

- **MovePad** (always) — bottom-right 150×150 cluster: `▲` forward, `◀` left,
  `▶` right, `▼` back, glassy translucent buttons (`blur(6px)`); in the corridor
  family a teal-tinted `✎` write button sits bottom-left of the pad. Pointer
  hold = key hold.
- **Top instruction strip** (always) — centered dim text; corridor copy: "Drag to
  look · WASD / arrows move · Space (or ✎) writes your text on the wall"; flat
  copy: "Drag to look · WASD / arrows or the pad to walk · landmarks repeat —
  mirrored on the Klein bottle".
- **Mini-map** (corridor only, when enabled) — a DOM frame (bordered, rounded,
  shadowed) with a small uppercase "MAP" label top-right; the renderer draws a
  scissored inset 3D orbiting view of the loop into that corner, showing the
  centerline ribbon (magenta one edge, cyan the other — they **swap** around a
  Möbius loop) plus a yellow cone marker for the player.
- **Footprints / writing** — drawn in-scene, not as DOM overlays (see §8).
- **Third-person avatar** — a small stylised orange-bodied / slate-limbed walker
  (capsule torso, sphere head, forward "nose" cone, swinging legs+arms) shown
  when third-person is on.
- **Readouts** — none (no FPS, coordinate, or progress numbers).

---

## 7. Explainer popup (?)

`EXPLAINER.md`, shown in the shell's help modal. Summary:

- **Premise.** Walk a closed surface in first person and discover its shape by
  reading your own footprints; one **Setting** switch moves between **Corridor**
  (a twisting/knotted tube walked through) and **Open space** (a flat plane with
  glued edges walked across). The **torus** appears in both — as a ring corridor
  (Loop) and a flat room (Flat torus).
- **Corridor worlds.** You walk the floor; "up" is always the floor's surface
  normal. Loop = plain ring; Möbius = one half-twist (non-orientable; one lap
  rolls the world 180° so you end up where the ceiling was, a second lap
  restores it); Double/Triple = more half-twists; Trefoil = knotted centerline.
  A mini-map's edge colors swap around a Möbius loop. Themes change scenery and
  lighting; **Space (or ✎)** writes glowing text on walls — found again flipped
  from the other side.
- **Flat worlds.** Intrinsically flat — walking feels normal, nothing flips
  locally. The single square tile (**fundamental domain**) has glued edges,
  tiled seamlessly (the **universal cover**), so you keep passing the **same
  numbered pillars**. Flat torus: both edge pairs glue straight (Asteroids /
  Pac-Man). Klein bottle: the **red** edge pair glues with a **flip**, so every
  other column is mirror-reversed (non-orientable).
- **Reading footprints.** Oriented arrows with the letter **F** and a
  cyan-left / magenta-right split; identical on orientable worlds, but
  **mirror-reversed** (F → Ⅎ, colors swapped) across any orientation flip —
  overhead after a Möbius lap, or across the Klein bottle's red gluing. A plain
  arrow would hide a reflection; the F can't.
- **Walking it.** Drag to look, WASD/arrows or the pad to move, toggle
  third-person to watch the avatar lay the trail. No autopilot.

---

## 8. Domain notes — surfaces, gluing, engines

**Surface families.** Seven surfaces in two families (`engine.ts` `SURFACES`):

| id | label | family | header `short` |
|---|---|---|---|
| `loop` | Loop (torus tube) | corridor | loop corridor |
| `mobius` | Möbius strip | corridor | Möbius corridor |
| `double` | Double twist | corridor | double-twist corridor |
| `triple` | Triple twist | corridor | triple-twist corridor |
| `trefoil` | Trefoil knot | corridor | trefoil-knot corridor |
| `torus` | Flat torus | flat | flat torus |
| `klein` | Klein bottle | flat | flat Klein bottle |

**The half-twist / identification.**

- *Corridor* (`corridorGeometry.ts`): a closed rectangular-section tube swept
  along a centerline. For loops the centerline is a circle of `radius 20`; the
  cross-section frame rotates about the tangent by `τ = π · tiltTurns · t` over a
  lap, so `tiltTurns = 1` is a single half-twist (Möbius), `2`/`3` are
  double/triple. `loop` = `tiltTurns 0`. `trefoil` uses a `space:'knot'`
  centerline (torus knot, `knotP 2`, `knotQ 3`). The camera-phase period wraps
  after 2 laps when `tiltTurns` is odd (Möbius/triple), 1 lap otherwise. Default
  corridor: `width 1.5`, `height 2.5`, `segments 800`.
- *Flat* (`flatEngine.ts`): an intrinsically flat plane. The fundamental domain
  is an `L = 30` square; the view tiles `(2K+1)² = 5×5` copies (`K = 2`) around
  the player (the universal cover). For the **Klein bottle**, every odd column of
  cells is mirrored (`scale z = −1` where `(I & 1)`), realizing the flip-gluing;
  the **torus** tiles all copies straight. Boundary edges are drawn red
  (left/right, the flip pair) and blue (top/bottom, straight pair); seven colored
  numbered pillars (`1`–`7`) act as recurring landmarks.

**Footprints as topology evidence** (`footprints.ts`): each step lays a flat
arrow textured with the letter **F** and a cyan-left / magenta-right split — both
chiral. The trail mesh is rendered through whatever (possibly
orientation-reversing) parent transform the world uses — the Möbius surface
normal, a mirrored Klein cell — so on any orientation flip the F returns
reversed and the colors swap. Trails: corridor `FOOT_MAX 1400`, spacing 1.4;
flat `TRAIL_MAX 1500`, spacing 1.6.

**Wall writing** (corridor only): `Space`/`✎` raycasts the gaze (reach
`WRITE_REACH = 8`) onto the nearest wall and stamps a glowing-ink text plane
(yellow `#ffef6b`, Georgia serif) aligned to local up; up to `MAX_WRITE = 60`
decals are kept. Because the panel rides the strip, it reads reversed from the
other side of a Möbius lap.

**Engine split.** Both worlds implement a shared `WorldEngine` interface
(`engine.ts`): `frame(input)`, `clearTrail()`, `dispose()`, plus optional
family-specific setters (`setSurface`, `setWidth`, `setTheme`, `setAmbient`,
`setMarkers`, `setBloom`, `setMiniMap`, `clearWriting`). `makeCorridorEngine`
sweeps the twisting/knotted tube (owns theme lighting, emitter torches, bloom
composer, mini-map scene, wall writing); `makeFlatEngine` tiles the fundamental
domain. The host (`TopologyWalk.tsx`) rebuilds the engine only when crossing the
corridor↔flat divide; same-family surface changes call `setSurface` to reshape
in place.

---

## 9. Persistence

**Nothing persists.** The app does **not** use `usePersistentState`,
`localStorage`, or any storage key. All settings are plain `useState`:
`surfaceId`, `moveSpeed`, `width`, `ambientMul`, `themeId`, `thirdPerson`,
`markers`, `bloom`, `miniMap`, `wallText` — every one resets to its default on
mount / app switch. Transient walk state (arc length / `px,pz`, yaw/pitch,
stride phase, footprints, wall decals) lives in refs and engine state and is
likewise reset on remount. `thirdPerson` and `bloom` defaults are computed once
from screen size at mount.

---

## 10. Component / file map

| Concern | File |
|---|---|
| App component: state, render loop, header/explainer/settings/actions wiring, look-drag, keys, MovePad, mini-map frame | `src/animations/TopologyWalk/TopologyWalk.tsx` |
| World contract + surface table (`WorldEngine`, `SURFACES`, `Family`, `surfaceDef`) | `src/animations/TopologyWalk/engine.ts` |
| Corridor (twisting/knotted tube) engine: lighting, emitter torches, bloom composer, mini-map, wall writing | `src/animations/TopologyWalk/corridorEngine.ts` |
| Flat (torus / Klein) engine: fundamental-domain tiling, pillars, mirroring | `src/animations/TopologyWalk/flatEngine.ts` |
| Corridor geometry + framing (`makeCorridorGeometry`, `frameAt`, `DEFAULT_PARAMS`, knot/loop) | `src/animations/TopologyWalk/corridorGeometry.ts` |
| Oriented F-arrow footprint trail (chiral texture) | `src/animations/TopologyWalk/footprints.ts` |
| Corridor themes (palette/texture/lighting/bloom) + floor-marker / glow textures | `src/animations/TopologyWalk/themes.ts` |
| Third-person avatar mesh + stride animation | `src/animations/TopologyWalk/character.ts` |
| Corridor wall PBR material per theme | `src/animations/TopologyWalk/shaders/corridorMaterial.ts` |
| Explainer markdown (`?` popup) | `src/animations/TopologyWalk/EXPLAINER.md` |
| Shared Three.js scene/camera/renderer wrapper | `src/components/Canvas3D.tsx` |
| Shared chrome, header/explainer/settings/actions hooks + portals | `src/components/AppShell.tsx` |
| Shared form primitives (`Section/Slider/Pills/Select/Checkbox`) | `src/components/ControlPanel.tsx` |
| Shared draggable action panel | `src/components/ActionFloater.tsx` |

---

## 11. Seams & observations for the redesign

The most important section: where this app conforms well to the shared shell,
and where rough edges remain.

1. **Now a good shell citizen (the headline change).** Unlike the old Möbius
   Walk — which left Settings/Function tabs empty and shoved a single hand-rolled
   toggle into Actions — Topology Walk renders a real, multi-section
   `ShellSettings` panel built entirely from `ControlPanel` primitives
   (`Pills`/`Select`/`Checkbox`/`Slider`), with three `Section`s and sensible
   `defaultOpen` state. The `⚙` button is lit and the settings drawer is rich.
   This is the kind of conformance the review wants to make the default.

2. **A reusable `WorldEngine` pattern that isn't yet shared.** The app already
   factors a clean `WorldEngine` interface with two interchangeable
   implementations behind it and a host that swaps/reshapes engines and pushes
   per-control setters. This mirrors what `lib/particles` did for 4D viewers but
   lives **inside the app folder**. If a redesign wants more "walk a surface"
   apps, lifting this engine contract (+ the shared player layer: drag-look,
   MovePad, footprints, avatar, chase cam) into `lib/` would be a strong reuse
   win — much as `lib/particles`/`ParticleViewerShell` standardized particle
   viewers.

3. **No persistence, though every control is a `useState`.** Sibling apps adopt
   `usePersistentState` so settings survive reload; here theme, world, speed,
   width, wall text, and toggles all reset on mount. This is the most obvious
   low-effort conformance gap — the controls are already shaped exactly like the
   persistable settings other apps store.

4. **Hand-rolled bits remain at the edges.** Two places still bypass the design
   system: the **Actions** buttons (`Clear trail` / `Clear writing`) are inline-
   styled `<button>`s rather than a `ControlPanel` action primitive, and the
   **Wall text** field is a hand-styled `<input>` inside a `cp-row` (no shell
   text-input primitive exists). The MovePad, instruction strip, and mini-map
   frame are also bespoke DOM. A shell with canonical "action button" and
   "text field" primitives — and perhaps a shared on-canvas D-pad / instruction-
   strip — would absorb these.

5. **The mini-map is split between renderer and DOM.** The map's frame + "MAP"
   label are a DOM overlay, but the actual map view is a scissored viewport drawn
   by the engine into the same corner — a coupling that has to keep CSS-pixel math
   in sync with the renderer. A shared "inset viewport" helper would remove the
   hand-coordination.

6. **Screen-size defaults are computed imperatively at mount.** `thirdPerson` and
   `bloom` initial values come from an `isCramped()` check rather than the shell's
   `useResponsive` hook; fine, but a shared responsive-default convention would
   keep these consistent with other apps.
