# Mandelbrot ↔ Julia (Correspondence) — Interface Manual

> Purpose: a complete, code-free inventory of the **Mandelbrot ↔ Julia** app
> (route `#/correspondence`) in the animath toolkit — every screen region,
> button, control, panel, overlay, and readout, plus an explicit account of how
> this app uses and deviates from the shared AppShell chrome.
> Scope: this app *and* its relationship to the shared shell. Captured **as
> built** (not a spec), present tense.

## 0. What the app is

Correspondence is a split-pane explorer of the classical Mandelbrot ↔ Julia
relationship for the family `z ↦ z² + c`. The left pane shows the Mandelbrot
set (fix `z₀ = 0`, vary `c`); the right pane shows the Julia set for the
currently selected `c` (fix `c`, vary the starting point). Every point of the
Mandelbrot plane seeds a Julia set, so picking a `c` on the left immediately
redraws the right. Both panes are independent GPU escape-time renderers; a `c`
value can be picked by tap, typed numerically, or animated along a hand-drawn
path.

## 1. Screen layout

Two full-height `FractalPane` viewports sit side by side (stacked vertically on
mobile) beneath the shared top bar, separated by a 1px divider. A custom
draggable **PlaybackFloater** is pinned at bottom-left. Each pane carries a
centered title caption at its top edge.

```
┌──────────────────────────────────────────────────────────────────┐
│ ⌂  ☰  ƒ   Mandelbrot ↔ Julia   c = -0.700 + 0.270i   ⚙  ▶  ?       │  ← shared AppShell top bar
├───────────────────────────────┬────────────────────────────────────┤
│           Mandelbrot          │              Julia                 │  ← centered pane captions
│                               │                                    │
│     (mandelbrot pane,         │      (julia pane, square canvas    │
│      square canvas centered,  │       centered, letterboxed)       │
│      letterboxed)             │                                    │
│        X  ← c marker          │                                    │
│        ╱ ← drawn c-path       │                                    │
│                               │                                    │
├───────────────────────────────┴────────────────────────────────────┤
│ ⠿ ▶  ← PlaybackFloater (collapsed grip + toggle), bottom-left      │
└──────────────────────────────────────────────────────────────────┘
```

- Outer container: `position: absolute; inset: 0`, flex; `row` on desktop,
  `column` on mobile (via `useResponsive().isMobile`); background `#0c0c10`.
- Divider: on desktop the Mandelbrot pane has `border-right: 1px solid #1e293b`;
  on mobile it uses `border-bottom` instead.
- Each pane is `flex: 1`, `position: relative`, `minHeight: 0`.
- Pane captions ("Mandelbrot", "Julia") are absolutely positioned `top: 6px`,
  horizontally centered, white, bold, `font-size: 14`, with a black text-shadow.
- Each pane's WebGL canvas is rendered as a **centered square** (side =
  `min(width, height)`, `margin: auto`), so wide panes letterbox left/right.

## 2. Shared chrome, as this app uses it

Top-bar buttons (left → right), with this app's state:

| Glyph | Label | State in this app |
|-------|-------|-------------------|
| `⌂` | Menu | Active (shown because not on `/`); returns to landing menu. |
| `☰` | Apps | Active; opens drawer Apps tab. |
| `ƒ` | Function | **Dimmed** — `useAppFunctions` is never called; no function picker. |
| title | Title/subtitle | `Mandelbrot ↔ Julia`; subtitle (monospace) is the live `c`, e.g. `c = -0.700 + 0.270i`. Clicking opens Settings. |
| `⚙` | Settings | Active — app fills the Settings tab via `ShellSettings`. |
| `▶` | Actions | Active — app fills the Actions tab via `ShellActions`. |
| `?` | Explainer | Active — `useAppExplainer(explainerText)` registered. |

- **Title/subtitle**: set by `useAppHeader('Mandelbrot ↔ Julia', \`c = …\`)`.
  The subtitle recomputes on every `c` change: `c = {real, 3dp} {+|-} {|imag|, 3dp}i`.
- **Drawer tabs filled**: Settings (full set of sections) and Actions (the
  playback controls). Function tab shows the shell's empty-state. Apps tab is
  the standard shared list.
- **Explainer**: registered from `EXPLAINER.md` (`?raw`), shown in the shared
  help modal.
- **Custom floater / deviation**: the app calls **`useActionFloaterOff()`** to
  suppress the shell's generic `ActionFloater`, and ships its own
  **`PlaybackFloater`** instead (because the generic floater has no scrubber).
  The Actions content is defined once (`playbackControls`) and rendered into
  **both** the drawer Actions tab (via `ShellActions`) and the PlaybackFloater
  body — so they stay in sync. Note: `ShellActions` still also portals into the
  shell's hidden `ActionFloater` body, but that floater is rendered inactive
  (hidden) because `actionFloaterOff` is true.
- Keyboard: only the shell's global `Escape` (closes help popup, then drawer).
  The app itself registers no keyboard shortcuts.

## 3. The panes & interactions

Both panes are `FractalPane` instances driven by `useViewportGestures` (Pointer
Events: mouse, pen, touch unified). The gesture element is the pane wrapper, but
math coordinates are computed against the inner square canvas (`coordRef`).

Per-pane gestures:

| Input | Mandelbrot pane | Julia pane |
|-------|-----------------|------------|
| 1-finger / left-button drag | Pans the view (when not in draw mode) | Pans the view |
| 2-finger pinch | Zoom about pinch midpoint (+ pan by midpoint drift) | Same |
| Mouse wheel | Zoom about cursor (`factor = exp(deltaY × 0.0015)`) | Same |
| Clean tap | Picks `c` only if **Pick Julia** is armed (see below) | No tap handler |
| 1-finger drag while **Draw c-path** armed | Draws a path (pan suppressed) | n/a (drawing only wired on Mandelbrot) |

- A "clean tap" fires only in `pan` mode and only if the pointer moved
  < 5px and was held < 350ms.
- **Picking `c`**: `onTap` always calls back to the parent, but the parent only
  accepts it while `selecting` is true (armed by the "Pick Julia c by tap"
  action). On accept it sets `c` and disarms. Tapping without arming does
  nothing.
- **Mandelbrot → Julia link**: changing `c` (by tap, path playback, or the
  numeric inputs) updates the shared `c` state, which is passed as `juliaC` to
  *both* panes. The Julia pane re-renders for the new `c`; the Mandelbrot pane
  uses `c` only to position its marker.
- **`c` marker (`markC`)**: only the Mandelbrot pane receives `markC = c`. It
  renders a white text glyph **`X`** at the `c` location (`pointer-events: none`),
  repositioned in screen space from the view bounds and the centered-square
  geometry.
- **Drawn path overlay**: when a path exists, the pane draws a white SVG
  `polyline` (`stroke-width 1`, no fill) connecting the path points, mapped to
  screen coordinates. Only the Mandelbrot pane is wired for drawing and receives
  the `path` prop; the live in-progress buffer is also rendered.
- The two panes maintain **independent view bounds** (separate pan/zoom state):
  Mandelbrot defaults to `{ x: -2.5…1.5, y: -1.5…1.5 }`, Julia to
  `{ x: -2…2, y: -2…2 }`. There is no link/sync toggle between their views.

## 4. Settings (drawer ⚙)

Rendered via `ShellSettings`, using `ControlPanel` primitives. Sections in order
(✓ = `defaultOpen`):

| # | Section | Icon | Open by default | Contents |
|---|---------|------|-----------------|----------|
| 1 | Iterations | `↻` | ✓ | Max-iterations slider |
| 2 | Mandelbrot palette | `◐` | ✓ | Palette select + offset slider |
| 3 | Julia palette | `◑` | — | Palette select + offset slider |
| 4 | Julia point | `·` | — | Two numeric inputs for `c` |
| 5 | About | `ⓘ` | — | README + interaction hint |

Controls in detail:

- **Iterations → "Max iterations"** (Slider): min `10`, max `1000`, step `10`,
  default `100`. On change the value is rounded and floored to ≥ 1. Shared by
  both panes (one `iter` drives both shaders). Higher = finer escape detail.
- **Mandelbrot palette → "Palette"** (Select), default value `0` (Rainbow).
  Options (shared `PALETTE_OPTIONS`):
  `0 Rainbow`, `1 Fire`, `2 Ocean`, `3 Grayscale`, `4 Viridis`, `5 Magma`,
  `6 Inferno`, `7 Plasma`.
- **Mandelbrot palette → "Offset"** (Slider): min `0`, max `255`, step `1`,
  default `0`; rounded. Shifts the color band cycle for the Mandelbrot pane.
- **Julia palette → "Palette"** (Select): same option list, default `0`
  (Rainbow). Independent of the Mandelbrot palette.
- **Julia palette → "Offset"** (Slider): min `0`, max `255`, step `1`,
  default `0`; rounded. Independent of the Mandelbrot offset.
- **Julia point** — two side-by-side numeric `<input type="number" step="any">`
  fields labeled **"c real"** and **"c imag"** (hand-rolled with `cp-row`
  classes, not a ControlPanel primitive). Defaults `c = (-0.7, 0.27015)`.
  Editing either sets `c` directly (invalid input coerces to `0`); this also
  drives the Julia pane and the Mandelbrot marker.
- **About** — renders `README.md` through `Readme` (marked), followed by a dim
  11px hint line: "Drag panes to pan · pinch / wheel to zoom · tap "Pick Julia"
  then tap the Mandelbrot to choose c."

No conditional Settings controls; all sections always present.

## 5. Actions

Defined once as `playbackControls` and shown in both the drawer Actions tab and
the PlaybackFloater. They are custom `ActionButton`s (styled `<button>`s, not
ControlPanel `Pills`) plus one Slider. Top→bottom:

| Control | Label (state-dependent) | Style / enable | Effect |
|---------|--------------------------|----------------|--------|
| Button | `Pick Julia c by tap` → `Tap Mandelbrot to pick…` when armed | Highlighted when `selecting` (yellow accent border/tint) | Arms tap-to-pick; next clean tap on Mandelbrot sets `c`. |
| Button | `Draw c-path` → `Finish drawing path` while drawing | Highlighted when `drawingPath` | Toggles draw mode on the Mandelbrot pane; drag draws the curve. |
| Button | `Clear path` | Disabled when `path.length === 0` | Stops playback and clears the path; resets progress to 0. |
| Button | `Play path` → `Stop playback` while playing | **Primary** (green `#10b981`); disabled when `path.length < 2` | Starts/stops animating `c` along the path. |
| Button | `Pause` → `Resume` | Shown **only while playing** | Pauses/resumes the animation in place. |
| Slider | **Speed** | min `0.005`, max `0.5`, step `0.005`, default `0.02`; format 3dp | Path-traversal rate (path-index units per frame). |

ActionButton styling notes: padding `12px 16px`, left-aligned text, accent
border when `active`, green fill + bold + white text when `primary` and enabled,
50% opacity + `not-allowed` cursor when disabled.

## 6. The PlaybackFloater (app-specific)

A custom collapsible, draggable panel — the app's signature deviation from the
generic `ActionFloater` — providing an always-on-screen home for the action
controls plus a vertical seek scrubber. Visually it shares the "PlaneCurveFloater"
language: translucent dark background (`rgba(12,12,16,0.72)`), 8px backdrop blur,
1px subtle border, 10px rounded corners, drop shadow. Default position
`bottom: 16px; left: 16px`, `z-index: 30`, width `248px`
(`max-width: calc(100vw - 32px)`). Repositionable via `useFloaterDrag`.

**Collapsed state** (initial; `open = false`):
- A compact row: a drag grip glyph **`⠿`** (title "Drag to move") and a toggle
  button showing the icon **`▶`** (accent color, 34×34) with `aria-label`
  "Show Playback panel" and tooltip "Playback".
- Clicking the toggle expands the panel. Dragging the grip moves it.

**Expanded state** (`open = true`):
- **Header** (doubles as drag handle): grip `⠿`, title **"Playback"**
  (uppercase, letter-spaced, dim), and a close button **`×`** (`aria-label`
  "Hide Playback panel") that re-collapses.
- **Body** (`pf-main`, two columns):
  - **Controls column** (`pf-body`): the same `playbackControls` (Pick / Draw /
    Clear / Play / Pause / Speed) described in §5.
  - **Scrubber column** (`pf-scrubber`): a 22px-wide vertical seek track,
    `cursor: ns-resize`, `role="slider"` ("Playback position", value 0–100).
    - Track: 6px wide rounded bar; an accent **fill** grows from the bottom and
      a circular white **thumb** (accent border) sits at the current position.
    - **Orientation**: bottom of the track = path start (`0`), top = path end
      (`1`). Drag maps `clientY` to `1 - (y - top)/height`, clamped 0..1.
    - Disabled (grayed, `pointer-events: none`, 40% opacity) when there are
      fewer than 2 path points (`scrubDisabled = path.length < 2`).

**Playback / scrubbing behavior** (driven by parent state):
- **Play path** interpolates `c` linearly between consecutive path points,
  advancing `progress` by `speed` (path-index units) each animation frame.
  Resuming after the end restarts from 0; partway resumes from the current
  scrubbed position. On reaching the end it snaps `c` to the last point, sets
  progress to 1, and stops.
- **Pause/Resume** freezes/continues the frame loop without losing position.
- **Scrubbing** the side track calls `seek(t01)`: it jumps `c` to the
  interpolated path position; if currently playing, grabbing the scrubber sets
  `paused` so the user stays in control.
- **progress** (0..1) is reflected back into the scrubber fill/thumb height.

## 7. Explainer popup (?)

`EXPLAINER.md` (shown in the shared help modal) explains: two fractals from one
rule `z ↦ z² + c`, side by side. It frames the **two questions** — Mandelbrot
fixes `z₀ = 0` and varies `c` (a point is in the set if the orbit stays
bounded); Julia fixes `c` and varies the start point (the set is the boundary
between bounded and escaping starts). It states **why they correspond**: the
Mandelbrot set is a map of every Julia set at once; `c` inside Mandelbrot →
connected Julia set, `c` outside → a disconnected "dust" (Cantor set) — the
*Fundamental Dichotomy*. It notes local shape similarity near the boundary (Tan
Lei, Misiurewicz points). The **Controls** section: tap "Pick Julia c" then tap
the Mandelbrot; or draw a c-path and play it back (the Julia set morphs as `c`
traces the curve); the side scrubber seeks along the path.

## 8. Domain notes

- Both panes share one fragment shader (`fType` uniform selects Mandelbrot=0 /
  Julia=1). Mandelbrot iterates `z₀ = 0`, `k = pos`; Julia iterates `z₀ = pos`,
  `k = c`.
- Escape-time loop: iterate up to `maxIter`, escaping when `dot(z,z) > 4.0`
  (|z| > 2). The `power` uniform is fixed at `2` (the inner power loop computes
  `z²`). Coloring band `t = mod(i·10 + offset, 256)`, fed to `paletteColor`.
- **Palettes** (shared `lib/colormaps.ts`): schemes 0–3 are hand-rolled
  (Rainbow = phase-shifted sines; Fire; Ocean; Grayscale as fallback); 4–7 are
  matplotlib perceptual maps via polynomial fits (Viridis, Magma, Inferno,
  Plasma).
- **Mandelbrot↔Julia correspondence**: see §7. The marker `X` on the Mandelbrot
  plane shows which `c` currently seeds the Julia pane.

## 9. Persistence

**Nothing persists.** All state is plain `useState`/`useRef` — none of the
fields use `usePersistentState`, and the app passes no `storageKey`. Reloading
resets everything to its initial value:
- `c = (-0.7, 0.27015)`, `iter = 100`, both palettes `0`, both offsets `0`,
  `speed = 0.02`.
- Transient by nature and also not persisted: both panes' view bounds (pan/zoom),
  the drawn `path`, `selecting`/`drawingPath`/`playing`/`paused`/`progress`
  flags, and the PlaybackFloater's open/position state.

## 10. Component / file map

| Concern | File |
|---------|------|
| App container, split layout, shared state (`c`, palettes, iter, path), playback engine, Settings/Actions wiring | `src/animations/Correspondence/Correspondence.tsx` |
| Single GPU fractal pane (shaders, gestures, marker, path overlay) | `src/animations/Correspondence/FractalPane.tsx` |
| Custom draggable playback panel with side scrubber | `src/animations/Correspondence/PlaybackFloater.tsx` + `PlaybackFloater.css` |
| About text | `src/animations/Correspondence/README.md` |
| `?` explainer | `src/animations/Correspondence/EXPLAINER.md` |
| Shared chrome, hooks (`useAppHeader`/`useAppExplainer`/`useActionFloaterOff`), `ShellSettings`/`ShellActions` | `src/components/AppShell.tsx` |
| Settings primitives (`Section`/`Slider`/`Select`) | `src/components/ControlPanel.tsx` |
| Generic action floater (suppressed here) | `src/components/ActionFloater.tsx` |
| Floater drag behavior | `src/components/useFloaterDrag.ts` |
| Pan/zoom/tap/draw gestures | `src/lib/useViewportGestures.ts` |
| Palette GLSL + dropdown options | `src/lib/colormaps.ts` |
| Mobile/desktop breakpoint | `src/styles/responsive.ts` |

## 11. Seams & observations for the redesign

The most decision-relevant section: where this app strains or departs from the
shared shell.

1. **Ships its own floater instead of the generic one (the "one action model"
   question).** This is the headline deviation. The shell offers a draggable
   `ActionFloater`, but it has no scrubber, so the app calls
   `useActionFloaterOff()` and ships `PlaybackFloater`. The two floaters
   duplicate ~all of their structure (collapsed `⠿` grip + toggle, draggable
   header, `×` close, `useFloaterDrag`, near-identical CSS) — the only real
   addition is the vertical scrubber column. A reusable shell floater that
   accepts an optional "extra rail"/scrubber slot would let this app drop its
   bespoke copy. Note also the redundancy: `ShellActions` still portals into the
   hidden generic floater even though it's suppressed.

2. **Action controls double as live transport, not one-shot actions.** The
   "Actions" model in the shell implies discrete commands, but here the panel is
   a *stateful transport* (arm-to-pick, draw toggle, play/stop, pause/resume,
   speed). Buttons relabel themselves by state and one (Pause/Resume) appears
   only mid-playback. The shell has no concept of a toggle/armed action or a
   transport, so the app hand-rolls `ActionButton` (custom inline-styled
   `<button>`) rather than using ControlPanel `Pills`/`Checkbox`. A first-class
   "toggle action" and/or "transport" primitive would help.

3. **Settings vs Actions placement is ad hoc.** "Speed" is a Slider that lives
   in **Actions** (with a code comment explaining the choice), while iterations
   and palettes are in Settings — and the **Julia point `c`** numeric editor is
   in Settings even though picking/animating `c` is the app's central *action*.
   The boundary between "settings" and "actions" is fuzzy and decided per-app.

4. **Duplicated per-pane controls.** Mandelbrot and Julia each get their own
   palette+offset section (4 controls, two near-identical `Section`s). There is
   no shared/link affordance; a user wanting matching palettes must set both.
   A "linked controls" or grouped multi-target pattern is absent.

5. **Two zoom/coordinate idioms.** The panes use `useViewportGestures`
   (pan/pinch/wheel on 2D view bounds), while the PlaybackFloater scrubber is a
   separate hand-built vertical pointer-drag slider — two unrelated drag idioms
   in one screen. Neither is the ControlPanel `Slider`. Consolidating drag-based
   inputs would reduce surface area.

6. **Hand-rolled inputs bypass primitives.** The `c real`/`c imag` numeric
   fields use raw `<input type="number">` with `cp-row` classes rather than a
   ControlPanel primitive — there is no numeric-input primitive in the shared
   set (only Slider/Pills/Select/Checkbox), so number entry is reinvented.

7. **No persistence, unlike sibling viewers.** The particle viewers persist
   settings via `usePersistentState`; this app persists nothing, so palettes and
   iteration count reset on reload. If persistence becomes a shell-level
   expectation, this app is an outlier.

8. **Marker/overlay rendering is bespoke geometry.** The `X` marker and SVG path
   overlay each recompute the centered-square letterbox mapping by hand
   (duplicated `toScreen`/`crossStyle` math). A shared 2D-viewport overlay
   helper (matching `useViewportGestures`' coordinate model) would remove this
   duplication and the screen/math-Y flip handling repeated across files.
</content>
</invoke>
