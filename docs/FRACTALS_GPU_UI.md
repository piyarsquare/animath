# Fractals (GPU) — Interface Manual

> Purpose: a complete, code-free inventory of the user-facing interface of the
> **Fractals** app (GPU; route `#/fractals`) in the animath toolkit — every
> screen region, control, button, overlay, and readout, plus how this app uses
> (or deviates from) the shared **AppShell** chrome. Scope: this single app and
> the shared shell it plugs into. Captured **as built** (it is not a spec) and
> written in the present tense. Source of truth:
> `src/animations/FractalsGPU/FractalsGPU.tsx` and its `README.md` /
> `EXPLAINER.md`, plus the shared components it imports.

## 0. What the app is

Fractals is a GPU-accelerated escape-time fractal viewer. A single full-screen
fragment shader renders one of four families — **Mandelbrot**, **Julia**,
**Burning Ship**, **Tricorn** — by iterating `z ↦ zᵏ + c` per pixel. It supports
a generalized integer power `k`, eight color palettes, three coloring modes,
animated palette cycling, pan/zoom navigation, and an opt-in tap-to-trace mode
that overlays an iteration orbit from the tapped point.

## 1. Screen layout

The app renders two stacked, full-bleed layers filling the content area beneath
the AppShell top bar, plus the shared shell chrome:

- **Shader layer** — a Three.js `WebGLRenderer` canvas (orthographic camera, a
  2×2 plane mesh) drawing the fractal. Hosted in a wrapper `div` positioned
  `absolute; inset: 0` with `touchAction: none`; all gestures attach here.
- **Overlay layer** — a transparent 2D `<canvas>` stacked on top (`zIndex: 1`,
  `pointerEvents: none`) used only to draw the trace orbit polyline.
- **Shared chrome** — the AppShell top bar (top), the slide-out drawer (Settings
  / Actions / Apps / Function tabs), the draggable ActionFloater, and the `?`
  explainer popup.

```
┌──────────────────────────────────────────────────────────────┐
│ ⌂  ☰  ƒ   Mandelbrot  z_{n+1}=z_n^k+c        ⚙   ▶   ?        │  ← AppShell top bar
├──────────────────────────────────────────────────────────────┤
│                                                                │
│            full-screen GPU fractal (shader quad)               │
│            + transparent overlay canvas (orbit trace)          │
│                                                                │
│                                            ┌──────┐            │
│                                            │  ▶   │ ← ActionFloater
│                                            └──────┘  (draggable)│
└──────────────────────────────────────────────────────────────┘
   (slide-out drawer appears from the side when ☰/ƒ/⚙/▶ is tapped)
```

There is no app-specific top-bar cluster (unlike Complex Particles'
quarter-turn floater). The canvas auto-resizes to the mount rect on window
`resize`, re-normalizing the view to the canvas aspect ratio.

## 2. Shared chrome, as this app uses it

This app integrates through the standard AppShell hooks and portals only; it
imports `ShellSettings`, `ShellActions`, `useAppHeader`, `useAppExplainer` from
`components/AppShell`, and `Section`, `Slider`, `Pills`, `Select` from
`components/ControlPanel`. It does **not** import `ToggleMenu`, `useAppFunctions`,
or `useActionFloaterOff`.

Top-bar buttons (left → right) and their state for this app:

| Button | Glyph | State here | Notes |
|--------|-------|-----------|-------|
| Home | `⌂` | active | navigates to `#/` (hidden only on the menu route) |
| Apps | `☰` | active | opens drawer Apps tab |
| Function | `ƒ` | **dimmed** | app never calls `useAppFunctions`, so the ƒ picker is inactive; the fractal-type selector lives in Settings instead |
| Title | — | active | clicking opens Settings (since the app has settings) |
| Settings | `⚙` | active | opens the Settings drawer tab (populated) |
| Actions | `▶` | active | opens the Actions drawer tab (populated) |
| Explainer | `?` | active | opens the help popup (markdown registered) |

- **Title / subtitle** — set via `useAppHeader(TYPE_NAMES[type], FORMULAS[type])`.
  The title is the current fractal's display name (`Mandelbrot`, `Julia`,
  `Burning Ship`, `Tricorn`); the monospace subtitle is its iteration formula:
  - Mandelbrot / Julia: `z_{n+1} = z_n^k + c`
  - Burning Ship: `z_{n+1} = (|Re(z_n)| + i|Im(z_n)|)^k + c`
  - Tricorn: `z_{n+1} = (conj(z_n))^k + c`
- **Drawer tabs filled** — **Settings** (`<ShellSettings>`) and **Actions**
  (`<ShellActions>`). Apps and Function tabs are shell-owned; Function shows the
  shell's empty-state message here.
- **Explainer** — registered via `useAppExplainer(explainerText)` from
  `EXPLAINER.md`; shown in the shell's `?` modal.
- **ActionFloater** — the generic draggable floater is **used** (not suppressed
  and not replaced). `<ShellActions>` portals the same action buttons into both
  the Actions drawer tab and the floater body, kept in sync by the shell.

## 3. The main view

Gestures are wired through the shared `useViewportGestures` hook (default `pan`
mode) attached to the shader wrapper. The hook unifies mouse, pen, and touch via
Pointer Events; emitted views are passed through the app's `clamp` callback,
which re-normalizes to the canvas aspect ratio.

| Input | Action |
|-------|--------|
| 1-finger / left-button drag | Pan the viewport (scene follows the finger) |
| 2-finger drag | Pan (midpoint translation) while pinching |
| 2-finger pinch | Zoom about the pinch midpoint |
| Mouse wheel | Zoom about the cursor (`factor = exp(deltaY · 0.0015)`) |
| Clean tap / click | If **Trace mode** is on, spawn an iteration orbit from the tapped point; otherwise nothing |

A "clean tap" is a single pointer that goes down and up with < 5 px of movement
and < 350 ms held; otherwise it is treated as a drag (so panning never spawns a
stray orbit). Trace is gated by the `tracing` action toggle — `onTap` is wired
only while tracing is on.

**What is drawn:** the shader maps each pixel to a complex `c` (Mandelbrot /
Burning Ship / Tricorn start `z = 0`, `k = c`) or to a starting `z` (Julia uses
`z = c`, `k = juliaC`), iterates up to the cap, and colors by escape time with
smooth (logarithmic) banding. The interior (never-escaped) region is colored per
the coloring mode (solid black, or via the inside palette).

**Trace orbit:** on a traced tap the app recomputes the orbit `z₀ → z₁ → …` in
JS (matching the selected family and power), then draws it on the overlay canvas
as a connected polyline. Each segment is colored by an HSL hue that ramps from 0°
to 360° along the path (`hsl(hue,100%,50%)`, line width 2). The orbit is redrawn
on every view change so it tracks pan/zoom.

## 4. Settings (drawer ⚙)

Rendered via `<ShellSettings>` using `ControlPanel` primitives. Four
collapsible `Section`s; the first two start **open**, the last two start
**closed**.

### Function (icon `ƒ`, open by default)

| Control | Type | Label | Options / range | Default | Behavior |
|---------|------|-------|-----------------|---------|----------|
| Fractal type | Select | `Fractal type` | `Mandelbrot`, `Julia`, `Burning Ship`, `Tricorn` | `Mandelbrot` | Switches family; also updates the bar title + formula |
| Power | Slider | `Power k` | min 1, max 10, step 1 | 2 | Integer exponent in `zᵏ + c`; clamped to ≥ 1 and rounded |
| c real | Number input | `c real` | step `any` | -0.7 | **Julia only** — real part of the fixed constant `c` |
| c imag | Number input | `c imag` | step `any` | 0.27015 | **Julia only** — imaginary part of `c` |

The `c real` / `c imag` numeric pair renders only when the fractal type is
`julia` (laid out side by side as raw `cp-row` number inputs, not a
`ControlPanel` primitive).

### Iteration (icon `↻`, open by default)

| Control | Type | Label | Range | Default | Behavior |
|---------|------|-------|-------|---------|----------|
| Max iterations | Slider | `Max iterations` | min 10, max 1000, step 10 | 100 | Iteration cap before a point is treated as interior; rounded, clamped to ≥ 1 |
| Start iteration | Slider | `Start iteration` | min 0, max 500, step 1 | 0 | First iteration index counted toward the interior (limit) magnitude; rounded, clamped to ≥ 0 |

### Color (icon `◐`, closed by default)

| Control | Type | Label | Options | Default | Behavior |
|---------|------|-------|---------|---------|----------|
| Palette | Select | `Palette` | `Rainbow`, `Fire`, `Ocean`, `Grayscale`, `Viridis`, `Magma`, `Inferno`, `Plasma` | `Rainbow` (id 0) | Outside (escape-band) palette |
| Coloring | Pills | `Coloring` | `Escape`, `Limit`, `Layered` | `Escape` | Which surface to color (see §8) |
| Inside palette | Select | `Inside palette` | same 8 palettes | `Rainbow` (id 0) | **Conditional** — shown only when Coloring ≠ `Escape`; palette for the interior magnitude |

Palette option list comes from `PALETTE_OPTIONS` in `lib/colormaps.ts` (ids:
0 Rainbow, 1 Fire, 2 Ocean, 3 Grayscale, 4 Viridis, 5 Magma, 6 Inferno,
7 Plasma; 4–7 are matplotlib polynomial fits).

### About (icon `ⓘ`, closed by default)

Renders the app's `README.md` through the shared `Readme` markdown component,
followed by a dimmed hint line: "Drag to pan · pinch or wheel to zoom. Open
Actions and toggle 'Trace mode' to spawn iteration paths by tap/click."

## 5. Actions

Rendered via `<ShellActions>` as four stacked buttons (mirrored into the
ActionFloater). No `ControlPanel` primitive is used; they are hand-styled
`<button>`s.

| Action | Label (state) | Behavior |
|--------|---------------|----------|
| Trace toggle | `Trace mode (off)` ↔ `Trace mode: tap to spawn orbit` | Toggles `tracing`. When on, the button is highlighted (accent border + translucent yellow `rgba(255,212,0,0.18)` fill) and canvas taps spawn orbits |
| Clear orbit | `Clear orbit` | Clears the traced orbit overlay. Disabled-looking (cursor `not-allowed`, 50% opacity) while no orbit exists |
| Color cycle | `Start color cycle` ↔ `Stop color cycle` | Toggles `animating`; runs a rAF loop incrementing the palette `offset` `(o+1) % 256` each frame, scrolling the palette bands. Button is green (`#10b981`) when off, red (`#ef4444`) when running |
| Reset view | `Reset view` | Resets the view to `xMin -2.5, xMax 1.5, yMin -1.5, yMax 1.5` (aspect-normalized) and sets Max iterations back to 100 |

## 6. App-specific overlays / HUD / readouts

- **Trace orbit overlay** — the only app-specific on-canvas graphic: a
  hue-ramped polyline of the iteration path on the transparent overlay canvas
  (see §3). Present only after a traced tap; cleared by "Clear orbit", a fractal
  family change does not auto-clear it.
- **No coordinate or zoom readout.** The app does not display the current
  center, bounds, zoom factor, or pixel-to-math mapping anywhere. Each slider
  shows its own numeric value (via the `ControlPanel` row value), but there is no
  HUD for the viewport.

## 7. Explainer popup (`?`)

`EXPLAINER.md` (shown in the shell's `?` modal) explains escape-time fractals:
pick a complex `c` and start `z`, iterate `z ↦ zᵏ + c`; bounded-vs-escaping is
the fractal boundary. It contrasts the **Mandelbrot set** (fix `z₀ = 0`, vary
`c`) with the **Julia set** (fix `c`, vary `z₀`), and notes **Burning Ship**
(abs of real/imag parts before powering) and **Tricorn** (conjugate `z` each
step). It covers escape radius / escape time and smooth (`log|z|`) coloring with
a solid interior, then describes the knobs (**Power k**, **Iterations**,
**Coloring mode**) and that clicking the fractal traces an orbit.

## 8. Domain notes

- **Escape-time core** — per pixel the shader iterates up to `min(iter, 1000)`
  steps, breaking when `|z|² > 4` (escape radius 2). The generalized power loop
  multiplies `z` by itself `k−1` times (`k` capped at 100 in-shader).
- **Four families** (shader `type` ids): 0 Mandelbrot (`z₀=0`), 1 Julia
  (`z₀=c`, constant `juliaC`), 2 Burning Ship (replace `z` with
  `(|Re z|, |Im z|)` before powering), 3 Tricorn (conjugate `z`, i.e. negate
  imaginary part, before powering).
- **Smooth escape value** — for escaped points,
  `escVal = i + 1 − log₂(log|z|)`, then mapped to a band index
  `mod(floor(escVal·10), 255)`, offset by the animation `offset`, then to
  `paletteColor`.
- **Interior coloring** — for non-escaped points the shader tracks the max
  `|z|` reached from `startIter` onward and maps `clamp(maxMag·128, 0, 255)`
  through the inside palette.
- **Coloring modes** — `escape` (id 0): outside colored, inside solid black.
  `limit` (id 1): inside colored by the interior magnitude, outside black.
  `layered` (id 2): both surfaces colored.

## 9. Persistence

**None.** All state is plain `useState` (`view`, `type`, `juliaC`, `iter`,
`startIter`, `palette`, `power`, `colorMode`, `insidePalette`, `offset`,
`animating`, `tracing`). The app does not import `usePersistentState`, so nothing
survives a reload — every setting (palette, fractal type, Julia `c`, zoom, etc.)
resets to defaults on remount. (Camera/view and the orbit overlay would in any
case be transient view state.)

## 10. Component / file map

| Concern | File |
|---------|------|
| App component, shader, all controls/actions | `src/animations/FractalsGPU/FractalsGPU.tsx` |
| In-app About text | `src/animations/FractalsGPU/README.md` |
| `?` explainer text | `src/animations/FractalsGPU/EXPLAINER.md` |
| Top bar, drawer, tabs, integration hooks, portals, help modal | `src/components/AppShell.tsx` |
| Settings/Actions primitives (Section/Slider/Pills/Select) | `src/components/ControlPanel.tsx` |
| Draggable on-canvas actions mirror | `src/components/ActionFloater.tsx` |
| Markdown renderer for About / explainer | `src/components/Readme.tsx` |
| Pan / pinch / wheel / tap gestures for 2D viewports | `src/lib/useViewportGestures.ts` |
| GLSL palettes + palette option list | `src/lib/colormaps.ts` |
| Responsive breakpoints hook | `src/styles/responsive.ts` |

## 11. Seams & observations for the redesign

The most important section for the shared-shell review. Friction points and
deviations, roughly in priority order:

1. **CLAUDE.md / README claim FractalsGPU uses the legacy `ToggleMenu`; the code
   does not.** `FractalsGPU.tsx` imports only `ShellSettings` / `ShellActions`
   and the `ControlPanel` primitives — there is no `ToggleMenu` import and no
   custom overlay menu. The repository docs (and `ToggleMenu.tsx`'s own comment)
   are stale on this point. The app is, in fact, a clean consumer of the standard
   drawer. **Recommendation:** treat this app as fully migrated and fix the docs;
   `ToggleMenu` may now be dead code for this route.

2. **Actions are hand-styled `<button>`s, not `ControlPanel` primitives.** All
   four action buttons use inline styles and ad-hoc colors (`#10b981`,
   `#ef4444`, `rgba(255,212,0,0.18)`) rather than `Pills`/`Section` styling.
   This diverges from the consistency the shell aims for, and the toggle-state
   styling (Trace mode highlight, color-cycle start/stop) is bespoke. A shared
   "toggle action button" / "primary action" primitive would let this app drop
   its inline styles and match other apps.

3. **The fractal-type selector lives in Settings instead of the shell's Function
   picker.** This app has a natural "function" axis (four families) but never
   calls `useAppFunctions`, so the top-bar `ƒ` button stays dimmed and the family
   is buried in Settings → Function. Other apps surface their variant through the
   `ƒ` picker. Wiring `useAppFunctions` here would align the app with the shell
   convention and free the `ƒ` button. (Power `k` and Julia `c` would remain in
   Settings.)

4. **Julia `c` inputs bypass the primitive set.** The `c real` / `c imag` pair
   are raw `<input type="number">` elements inside `cp-row` markup rather than a
   `ControlPanel` field. There is no numeric-input primitive in `ControlPanel`
   (only Slider/Select/Pills/Checkbox), so the app rolls its own — a gap worth
   filling with a shared `NumberField` for any app that needs free numeric entry.

5. **No coordinate/zoom readout despite a navigable viewport.** Unlike a typical
   fractal explorer, there is no center/zoom HUD. If the shell grows a shared
   readout/HUD slot for 2D viewers (this app + Correspondence both use
   `useViewportGestures`), it would standardize that affordance.

6. **No persistence.** The app uses plain `useState` everywhere; the shell's
   companion `usePersistentState` is not adopted, so settings reset on reload.
   Other apps persist their settings — this is an inconsistency in the toolkit's
   behavior rather than a shell-API problem.

7. **Two zoom idioms coexist in one app, but intentionally.** Wheel zoom uses an
   exponential factor about the cursor; pinch zoom uses a ratio about the
   midpoint. Both flow through the same `useViewportGestures` helper and the
   same `clamp` aspect-normalization, so this is shared, not duplicated — noted
   only to confirm it is not a seam.
