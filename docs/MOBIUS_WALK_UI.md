# Möbius Walk — Interface Manual

> **Purpose.** A complete, code-free inventory of the **Möbius Walk** app
> (route `#/mobius`) in the animath toolkit: every screen region, control,
> overlay, and readout — what it is, where it lives, what it does.
> **Scope.** This app *and* the way it consumes the shared **AppShell** chrome,
> because this manual feeds a design review aimed at refining that shell for
> reuse. **Captured as built** from source on `main`; this is a description, not
> a specification. Present tense throughout.

> **In-flight note.** An active branch `claude/mobius-walk-fix` is reworking this
> module (renaming/relocating it toward a **"TopologyWalk"** module and revising
> the EXPLAINER), and additional fixes live on
> `codex/fix-mobius-and-circular-hallway-simulations`. Those reworks are **not**
> merged. This manual documents the **current `#/mobius` MobiusWalk on `main`**
> only and intentionally does not detail the unmerged changes.

---

## 0. What the app is

Möbius Walk is a first-person, fully **on-rails** stroll through a tubular
corridor whose centreline is a circle. The corridor carries a hidden
**half-twist**, so the inside of the tube is topologically a Möbius strip: the
camera is driven automatically forward around the loop forever, and after one
full lap the world returns mirror-reversed (left and right swapped). The
hallway looks ordinary, decorated with a few paintings, arrows, and metallic
torus-knots, with a gentle iridescent shader tinting the walls.

---

## 1. Screen layout

The app is a single full-screen first-person 3D view that fills the area below
the shared top bar. There is no app-drawn HUD, sidebar, or in-canvas readout —
all controls live in the shared chrome.

```
┌──────────────────────────────────────────────────────────────┐
│ ⌂  ☰  ƒ   Möbius Walk  twisted corridor      ⚙   ▶   ?         │  ← shared AppShell top bar
├──────────────────────────────────────────────────────────────┤
│                                                                │
│                                                                │
│            full-screen first-person 3D corridor view           │
│            (Canvas3D / Three.js WebGL canvas, inset:0)         │
│                                                                │
│                                          ┌──────┐              │
│                                          │  ▶   │  ← generic    │
│                                          └──────┘    ActionFloater
│                                                      (draggable)│
└──────────────────────────────────────────────────────────────┘
```

- **Top bar** — shared `AppShell` header (`as-bar`), full width, fixed.
- **3D viewport** — a `<div style={{ position:'absolute', inset:0 }}>` wrapping
  `Canvas3D`, which mounts a Three.js `WebGLRenderer` canvas
  (`touchAction:'none'`, alpha + antialias + `preserveDrawingBuffer`).
- **ActionFloater** — the shared draggable/collapsible floating action panel,
  rendered by the shell (not by the app), because the app registers actions.

---

## 2. Shared chrome, as this app uses it

The app imports only `ShellActions`, `useAppHeader`, and `useAppExplainer` from
`AppShell`. It does **not** use `ShellSettings`, `useAppFunctions`, or
`useActionFloaterOff`.

| Top-bar control | Glyph | State here | Why |
|---|---|---|---|
| Home | `⌂` | **Active** | Shown on every non-`/` route; navigates to menu. |
| Apps | `☰` | **Active** | Always active; opens Apps tab. |
| Function | `ƒ` | **Dimmed** | App never calls `useAppFunctions`; no function picker. |
| Title / subtitle | — | **Active** | Opens Settings tab if present, else Apps. |
| Settings | `⚙` | **Dimmed** | App renders **no** `ShellSettings`; Settings tab is empty. |
| Actions | `▶` | **Active** | App renders one `ShellActions` button. |
| Explainer | `?` | **Active** | App registers `EXPLAINER.md` via `useAppExplainer`. |

- **Title / subtitle** — `useAppHeader('Möbius Walk', twist ? 'twisted corridor'
  : 'untwisted corridor')`. The subtitle (monospace) flips live between
  `twisted corridor` and `untwisted corridor` with the twist toggle.
- **Drawer tabs filled** — only **Apps** (shell-provided) and **Actions** (one
  button). The **Function** and **Settings** tabs show their empty-state
  messages ("No function picker for this view." / "No settings for this view.").
- **useAppFunctions?** No.
- **useAppExplainer?** Yes — `EXPLAINER.md` imported `?raw`.
- **Generic ActionFloater** — **used** (not suppressed, not replaced). The app
  does not call `useActionFloaterOff`, so the shell's standard collapsible `▶`
  floater carries the single action.

---

## 3. The view & interactions

Movement is **fully automatic / on-rails**; there are **no camera, look, or
manual-steering controls**. The camera is driven by the app's own
`requestAnimationFrame` loop:

- Each frame advances a parametric position `camPosT` along the loop by
  `(speed * dt) / (2π · radius)` (modulo 1), i.e. constant arc-length speed.
- `paramToFrame` places the camera on the corridor centreline and orients it to
  look forward (down `−n`/inward, `b` up) along the twisting frame.
- A small vertical **bob** is added: `0.05 · sin(10 · camPosT · π)` on the
  camera's local Z, giving a gentle walking sway.

| Interaction | Result |
|---|---|
| Mouse / touch on the canvas | **No effect** — no pointer/gesture handlers are attached. The view is non-interactive. |
| Window / container resize | Handled by `Canvas3D` (`ResizeObserver` + window resize): updates camera aspect, renderer size, pixel ratio (DPR capped at 2). |
| `Escape` key | Shell behavior: closes the explainer popup, then the drawer. |

- **Speed** — fixed by the `speed` prop (`MobiusWalkProps.speed`, **default 2**).
  It is **not exposed** as a UI control; the route mounts the component with the
  default. There is no play/pause, no scrubber, no direction control.
- **Camera config** (set in `onMount`): `fov = 70`, `near = 0.05`, `far = 100`.

---

## 4. Settings (drawer ⚙)

**None.** The app renders no `ShellSettings`, so `hasSettings` is false: the
`⚙` button is dimmed and the Settings drawer tab shows "No settings for this
view."

All corridor parameters are compile-time constants (`DEFAULT_PARAMS` in
`corridorGeometry.ts`) and are **not** surfaced as controls:

| Parameter | Value | Meaning |
|---|---|---|
| `radius` | `20` | radius of the centreline circle |
| `width` | `1.5` | corridor half-width |
| `height` | `2.5` | corridor half-height |
| `segments` | `800` | longitudinal segments (≥500 looks smooth) |
| `tiltTurns` | `1` | half-twists (1 → Möbius; overridden at mount, see §5) |

No `ControlPanel` primitives (`Section`, `Slider`, `Pills`, `Select`,
`Checkbox`) are used anywhere in this app.

---

## 5. Actions

A single action, rendered via `ShellActions` (so it appears in **both** the
Actions drawer tab and the floating `ActionFloater`):

| Control | Type | Label | Behavior |
|---|---|---|---|
| Twist toggle | `<button>` (hand-rolled, inline-styled) | `Disable twist` when twisted; `Enable Möbius twist` when untwisted | Toggles the `twist` boolean. |

Details:

- The button is **not** a `ControlPanel` primitive; it is a raw `<button>` with
  inline styles wrapped in a `<div className="cp-section-body">`.
- Styling: `padding 12px 16px`, `borderRadius 6`, `1px solid var(--cp-border)`,
  text color `var(--cp-fg)`, `fontSize 14`. Background reflects state —
  `rgba(255, 212, 0, 0.18)` (amber tint) when twisted, else
  `rgba(255,255,255,0.06)`.
- **Effect of toggling.** Flipping `twist` changes the header subtitle and
  changes `onMount`'s dependency array (`[speed, twist]`), which causes
  `Canvas3D` to remount: the scene is rebuilt with
  `tiltTurns: twist ? 1 : 0`. So "twist on" → single half-twist (Möbius);
  "twist off" → `tiltTurns = 0`, a plain untwisted ring corridor.
- There is **no** play/pause, reset, or direction action. The walk auto-runs
  from mount and cannot be paused or reversed from the UI.

---

## 6. App-specific overlays / HUD / readouts

**None.** The app draws nothing outside the shared chrome — no FPS counter, no
position readout, no minimap, no in-canvas text. The only on-screen affordance
beyond the top bar is the shell's generic `ActionFloater` (a draggable panel
that collapses to a `▶` button with a `⠿` drag grip, expands to a header with
the app title and `×`, and mirrors the twist toggle).

---

## 7. Explainer popup (?)

`EXPLAINER.md` (shown in the shell's help modal). Summary:

- A first-person stroll down a corridor built on a **Möbius strip** — a surface
  with only one side and one edge.
- **One side, one edge** — analogy of giving a paper strip a 180° half-twist and
  gluing the ends; a finger traced along the middle covers both apparent faces
  without lifting, so there is only one side, and the boundary is one loop.
- **Non-orientability** — the half-twist makes the surface non-orientable: no
  consistent global "up" or clockwise/counterclockwise. Walking all the way
  around returns you **mirror-reversed** (left/right swapped); a second lap
  restores normal.
- **What you're seeing** — walls parametrized along the strip; the iridescent
  shading tracks position around the loop so you can gauge progress. The
  "impossible" join is genuine topology, not a rendering trick.

(Note: `README.md` is a separate, shorter developer-facing blurb and is **not**
wired into the shell's About/explainer here.)

---

## 8. Domain notes — geometry, twist, objects, shader

**Corridor geometry (`corridorGeometry.ts`).**

- The centreline is a circle of `radius` in the XY-plane:
  `c = (r·cosφ, r·sinφ, 0)`, with `φ = 2π·t`, `t ∈ [0,1]`.
- A **Frenet-style frame** is built per ring: `tangent = (−sinφ, cosφ, 0)`,
  outward `normalRef = (−cosφ, −sinφ, 0)`, `binormal = (0,0,1)` (Z-up).
- The **twist** is a rotation of the cross-section about the tangent by
  `τ = π · tiltTurns · t`. With `tiltTurns = 1`, the frame rotates a total of
  `π` (a single half-twist) over one lap → Möbius topology. `tiltTurns = 0`
  gives no twist (ordinary ring).
- Each ring has 4 vertices at offsets `(±width, ±height)` along the rotated
  `(n, b)`. Normals are stored **inward** (`−n`) and the material renders
  `BackSide`, so the viewer is inside the tube. `segments = 800` rings.
- `paramToFrame(t, u, v)` returns a world position and a quaternion (basis:
  X = `−tangent`, Y = `b`, Z = `−n`) used both to fly the camera and to place
  decorative objects in the corridor's local frame.

**Decorative objects (`objects.ts`).** `instantiateObjects()` builds a
`THREE.Group` of 7 items placed by `paramToFrame` at fixed `t` positions and
`(u,v)` offsets:

| `t` | kind | offset (u,v) |
|---|---|---|
| 0.05 | painting | (0.9, 0) |
| 0.15 | painting | (−0.9, 0) |
| 0.25 | arrow | (0, −1.2) |
| 0.40 | helix | (0, 0) |
| 0.55 | painting | (0.9, 0) |
| 0.70 | helix | (0, 0) |
| 0.85 | arrow | (0, −1.2) |

- **painting** — `PlaneGeometry(1.2, 0.8)`, `MeshStandardMaterial` (DoubleSide)
  textured from an embedded base64 **JPEG** data URI; rotated 180° about Y so
  the art faces inward.
- **arrow** — `PlaneGeometry(0.6, 0.6)`, transparent `MeshBasicMaterial`
  textured from an embedded base64 **PNG** data URI.
- **helix** — `TorusKnotGeometry(0.3, 0.08, 128, 16, 2, 3)`,
  `MeshPhysicalMaterial` (`roughness 0.3`, `metalness 0.7`, `color 0x7799ff`,
  `iridescence 0.15`).

Textures are inline data URIs (per `README.md`: previously external files, now
embedded so the demo runs offline).

**Wall material (`shaders/corridorMaterial.ts`).** `MeshPhysicalMaterial` with
`roughness 0.2`, `metalness 0.4`, `side: BackSide`, `clearcoat 0.1`,
`transmission 0.05`, `iridescence 0.2`, `color 0x445566`. An `onBeforeCompile`
hook injects GLSL into the `color_fragment` chunk that computes a
view-dependent `facing = dot(normal, vViewPosition)/length(vViewPosition)` and
mixes in a `0.5 + 0.3·sin(2π·facing)` hue shift at 15% — the "iridescent" wall
tint that tracks orientation around the loop.

**Lighting.** `AmbientLight(0xffffff, 0.35)` plus a `DirectionalLight(0xffffff,
1.0)` at `(5, 2, 3)`.

---

## 9. Persistence

**Nothing persists.** The app does not use `usePersistentState`,
`localStorage`, or any storage key. The only React state is:

- `twist` (`useState(true)`) — resets to twisted on every mount.
- `camPosT` / `clockRef` — refs holding transient walk progress and a
  `THREE.Clock`; not persisted.

On reload (or any app switch) the walk restarts from `camPosT = 0` with the
twist enabled.

---

## 10. Component / file map

| Concern | File |
|---|---|
| App component, render loop, header/explainer/actions wiring | `src/animations/MobiusWalk/MobiusWalk.tsx` |
| Corridor mesh geometry + camera/object framing (`makeCorridorGeometry`, `paramToFrame`, `DEFAULT_PARAMS`) | `src/animations/MobiusWalk/corridorGeometry.ts` |
| Decorative objects + inline texture data URIs (`instantiateObjects`, `OBJECTS`) | `src/animations/MobiusWalk/objects.ts` |
| Iridescent wall material + GLSL hue-shift hook | `src/animations/MobiusWalk/shaders/corridorMaterial.ts` |
| Explainer markdown (`?` popup) | `src/animations/MobiusWalk/EXPLAINER.md` |
| Developer README (not shown in-app) | `src/animations/MobiusWalk/README.md` |
| Shared Three.js scene/camera/renderer wrapper | `src/components/Canvas3D.tsx` |
| Shared chrome, header/explainer/actions hooks, portals | `src/components/AppShell.tsx` |
| Shared draggable action panel | `src/components/ActionFloater.tsx` |
| Catalog entry (`#/mobius`, name, icon `∞`, blurb) | `src/apps.ts` |

---

## 11. Seams & observations for the redesign

The most important section: where this app re-implements, deviates from, or
under-uses the shared shell.

1. **The lone action bypasses `ControlPanel` primitives.** The twist toggle is a
   hand-rolled `<button>` with inline styles and raw color literals
   (`rgba(255,212,0,0.18)` amber when active), wrapped in a bare
   `cp-section-body` div. The shell offers `Checkbox` and `Pills` that express
   exactly this on/off state with consistent styling. This is the clearest
   deviation: a boolean toggle living in **Actions** rather than **Settings**,
   styled outside the design system. A reusable shell would benefit from a
   canonical "toggle action" primitive so apps stop hand-coding active-state
   colors.

2. **A toggle that triggers a full scene rebuild.** Flipping `twist` is in
   `onMount`'s dependency array (`[speed, twist]`), so each toggle **remounts**
   `Canvas3D` — disposing and re-creating the renderer, geometry, materials,
   textures, and animation loop, and resetting walk progress to 0. The shell's
   `onMount`-once contract gives apps no clean "update uniforms / params without
   remount" path, so a settings change here is unexpectedly heavyweight. A
   redesign could offer an `onUpdate(ctx, params)` companion to `onMount`.

3. **Settings tab is empty though the app has obvious parameters.** Radius,
   width, height, segments, twist count, walk speed, and decoration density are
   all hard-coded constants/props. The `⚙` button sits dimmed even though this
   is a parameter-rich app. Speed in particular is a *prop* (`speed = 2`) with
   no route or UI to set it. The shell makes "no settings" easy but offers no
   nudge toward exposing parameters — worth considering for the review since
   most sibling apps populate Settings richly.

4. **The render/animation loop is app-owned and lifecycle-fragile.** The
   `requestAnimationFrame` loop is started inside `onMount` but **no cleanup
   function is returned**, so the rAF is never cancelled on unmount/remount —
   each twist toggle or navigation can leave an orphaned loop rendering into a
   disposed renderer (`Canvas3D` does call the returned cleanup, but this app
   returns none). Centralizing the loop (as the particle viewers do via
   `startAnimationLoop`) or having the shell own rAF would remove this footgun.

5. **README vs EXPLAINER wiring.** The app ships both `README.md` and
   `EXPLAINER.md` but only wires `EXPLAINER.md` into the `?` popup; `README.md`
   has no in-app surface (the particle viewers render README as "About"
   automatically via `ParticleViewerShell`). The shell's About/explainer split
   is inconsistently realized across app types.

6. **No interaction at all on a 3D canvas.** Unlike the particle and fractal
   viewers, this view ignores pointer/touch/keyboard entirely (movement is
   on-rails, no pause/scrub/reverse). The shell has no shared notion of
   "playback transport" — Correspondence ships its own `PlaybackFloater`, this
   app ships nothing. A shared transport/playback control (play/pause/speed)
   would serve both and is a strong candidate for the reusable chrome.
</content>
</invoke>
