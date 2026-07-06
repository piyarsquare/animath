# Mobile review checklist — animath

A standing manual-QA checklist for the **phone UI** (≤ 740px, where the workspace
re-chromes into stacked view cards + a bottom dock + bottom sheets — DESIGN-SPEC §6).

## Why this file exists

Headless smoke (`npm run smoke`, 390×844) confirms **no route crashes or
blank-frames** on load, but it runs **software WebGL (SwiftShader)** — which
tolerates NaN that real mobile GPUs crash on, and is not pixel-true. So a green
smoke is a *crash baseline*, **not** a mobile-correctness check. Layout, touch
gestures, dock/sheet behavior, and real-GPU rendering still need a **real device**.
That gap is what the `phone-needed` dashboard signal tracks; clearing it means
walking an app through the relevant section below on an actual phone.

> **How to use:** open each route on a real phone (or a device emulator with a real
> GPU), work the checks, and tick them. When every box for an app passes, clear that
> app's `phone-needed` signal in its session report / app guide.

## Smoke baseline (headless, not a substitute for device testing)

- **2026-06-24** — `npm run smoke` @ 390×844: **PASS 17/17**, 2 warnings, both the
  known `THREE.RGBELoader: Unsupported type: 1009` on `#/complex-particles` and
  `#/embed/complex-particles` (HDR env map silently falls back — tracked as
  `[complex-particles] !low`). No `pageerror` / `webglcontextlost`; lowest variance
  `#/trees-and-nets` (35.1) still above the dead-frame floor.

## Global chrome (check once, on any app)

- [ ] **Gallery** (`#/`) — cards reflow to one column; hero + filter chips legible
      and tappable; preview canvases render; scroll is smooth.
- [ ] **Top bar** — brand-mark Home, title/formula, mode pills, **?**, SkinPicker
      all fit without overflow; mode pills are tappable; `?` modal scrolls and closes.
- [ ] **Bottom dock** — the rail's archetypes are reachable from the dock; opening a
      panel raises a **bottom sheet** (one at a time); sheet dismisses by swipe/tap-away.
- [ ] **Stacked view cards** — each view is a card; cards scroll; a card height-resizes
      from its **bottom grip**; collapsing a view doesn't unmount it (WebGL survives).
- [ ] **Action strip** — for apps with primary verbs, the strip sits **above the dock**
      (never hidden behind it) and its ≤5 buttons are tappable.
- [ ] **Fullscreen** — a view goes full screen, the WebGL context survives, and the
      restore/Esc affordance is reachable (no trapped state).
- [ ] **Skins** — switch skins; the phone UI (dock, sheets, cards) restyles correctly.

## Per-app — `phone-needed` apps first

### Argand (`#/argand`) — `phone-needed` (Argand session reports)
Immersive plot + bottom control HUD; pointer-capture SVG gestures.
- [ ] The **bottom HUD** (feed switcher + `t` scrubber + j² morph) clears the phone
      dock and stays usable (lifted above the dock, per design).
- [ ] **Handle drags** work by touch: `z` (circle), `α₁` (diamond), `α₀` (square),
      `α₂` (triangle, quadratic) — each draggable without fighting the page scroll.
- [ ] **Pinch-zoom** and **two-finger pan** move the plane; double-tap recenters.
- [ ] Top-bar **feed pills** (Point/Shape/Grid) and **Degree** switch work; Play paces.
- [ ] Editing a value in a panel does **not** also drag the plane (form focus guarded).

### Complex Particles (`#/complex-particles`) — particle viewer
- [ ] **1-finger drag orbits** the camera; **2-finger pinch** zooms; 2-finger drag pans.
- [ ] The phone **Drag: Orbit | Pan** pill toggles 1-finger behavior.
- [ ] The **4D Rotation** panel (eighth-turn ↻/↺ + spin toggles) is reachable as a
      sheet and the buttons work by touch.
- [ ] Projection slider (Perspective ⇠ Torus ⇢ Sphere) morphs smoothly; no GPU crash
      on a real device (watch for the RGBELoader fallback — lighting may look flat).
- [ ] Posture **layouts** (Single / Representations / …) load without overflowing.

### Plane Transform (`#/plane-transform`) & Correspondence (`#/correspondence`)
- [ ] Split/linked views render side-by-side or stack sensibly at 390px.
- [ ] Drag-pan + pinch/wheel-zoom navigate each pane; taps register.

### The complex guide pages (`public/complex-*-guide.html`) — `phone-needed` (`[docs] !med`)
Verified on desktop only; iframes pinned to 400px, body to 720px.
- [ ] Each guide's **live applets** (1–3 WebGL contexts per page) load on a phone
      without exhausting GPU contexts or crashing; scrolling past them is smooth.
- [ ] Iframe applets are interactive by touch (or degrade gracefully); text reflows.
- [ ] Check at least: `complex-functions-guide`, `complex-particles-guide`,
      `complex-rendering-guide`, `complex-plane-transform-guide`.

## Per-app — the rest (general phone pass)

- [ ] **Fractals** (`#/fractals`) — drag-pan, pinch/wheel-zoom, **Trace** tap-to-orbit.
- [ ] **Polygon Worlds** (`#/polygon-worlds`) — first-person walk: the **MovePad** /
      on-screen controls drive movement; immersive view fills the stage; no key-handler
      hijack while typing in a panel.
- [ ] **Solid Worlds** (`#/solid-worlds`) — walk + camera controls by touch; Cutaway /
      Decor / Wall-opacity sheets usable; chirality HUD legible.
- [ ] **Trinary** (`#/trinary`, `#/trinary-lab`) — Observatory + Lab modes; sliders/
      play controls tappable; the Lab table scrolls.
- [ ] **Stable Matching** (`#/stable-matching`) — matrix / welfare / lattice layouts
      reflow; DOM controls tappable.
- [ ] **Agentic Sorting** (`#/agentic-sorting`) — animation runs; controls reachable.
- [ ] **Trees and Nets** (`#/trees-and-nets`) — associahedron + mosaic render and pan.
- [ ] **Counting the Ways** (`#/counting-the-ways`) — Explain lattice + distribution
      strips fit; **Play tutorial** transport on the action strip clears the dock;
      fullscreen grows the distributions (not the grid); Lab table scrolls.

## Known issues to confirm on device

- [ ] **RGBELoader HDR fallback** (`[complex-particles] !low`) — on
      `#/complex-particles` the HDR env map fails to load (`Unsupported type: 1009`)
      and lighting falls back; confirm the viewer still looks acceptable on a phone
      (or fix `lib/textures.ts` first).

## Sign-off

| Area | Device / OS / browser | Date | By | Result |
|---|---|---|---|---|
| Global chrome | | | | |
| Argand | | | | |
| Complex Particles | | | | |
| Complex guide pages | | | | |
| (other apps) | | | | |
