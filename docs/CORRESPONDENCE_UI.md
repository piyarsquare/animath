# Mandelbrot ↔ Julia (Correspondence) — Interface Manual

> Purpose: a complete, code-free inventory of the interface of the **Mandelbrot ↔ Julia** app
> (hash route `#/correspondence`) in the *animath* toolkit — every screen region, button, control,
> panel, overlay, and readout, plus how this app uses or deviates from the shared **AppShell** chrome.
> Scope: this app and its interaction with the shared shell. Captured **as built** (from source), in
> present tense; this is a snapshot, not a specification.

## 0. What the app is

Correspondence is a side-by-side **split-pane fractal explorer**. The left pane renders the
**Mandelbrot set** (iterating `z ↦ z² + c` from `z₀ = 0` while varying `c`); the right pane renders
the **Julia set** for the currently selected parameter `c`. Every point in the Mandelbrot pane names
a `c`, and choosing one immediately re-seeds the Julia pane — making the Mandelbrot pane a "map of
every Julia set at once." A user can pick a single `c`, or draw a **c-path** and play it back to watch
the Julia set morph continuously as `c` sweeps along the curve.

## 1. Screen layout

Below the shared AppShell top bar, the app fills the viewport with a flex container (`#0c0c10`
background). On wide screens the two panes sit **side by side** (`row`), separated by a 1px divider
(`#1e293b`) on the Mandelbrot pane's right edge. On mobile (`isMobile` via `useResponsive`) they stack
**vertically** (`column`) with the divider as a bottom border on the Mandelbrot pane. Each pane is a
square WebGL canvas centered (`margin: auto`) inside its half; the canvas side length is `min(width,
height)` of the half, so letterbox gutters appear when the half is non-square. A static label sits
top-center of each pane: **"Mandelbrot"** (left) and **"Julia"** (right), white bold 14px with a black
text-shadow. The app-specific **PlaybackFloater** floats over the canvases (default bottom-left).

```
┌──────────────────────────────────────────────────────────────────┐
│ ⌂  ☰  ƒ   Mandelbrot ↔ Julia   c = -0.700 + 0.270i   ⚙  ▶  ?       │  ← shared AppShell top bar
├───────────────────────────────┬────────────────────────────────────┤
│           Mandelbrot          │              Julia                 │
│      ┌───────────────┐        │       ┌───────────────┐            │
│      │  WebGL canvas │        │       │  WebGL canvas │            │
│      │      X  ←mark │        │       │  (Julia for c)│            │
│      │  ~ c-path ~   │        │       │               │            │
│      └───────────────┘        │       └───────────────┘            │
│ ┌──────────────┐│             │                                    │
│ │ ⠿ PLAYBACK  ×││▌ ← scrubber │                                    │
│ │ [actions...] ││             │                                    │
│ └──────────────┘│             │                                    │
└───────────────────────────────┴────────────────────────────────────┘
                          (panes stack vertically when isMobile)
```

## 2. Shared chrome, as this app uses it

The top bar (rendered by `AppShell`, left→right) for this app:

| Bar element | State here | Notes |
|---|---|---|
| ⌂ Home | active | Shown because route ≠ `/`; navigates to the landing menu. |
| ☰ Apps | active | Opens drawer Apps tab. |
| ƒ Function | **dimmed** | App never calls `useAppFunctions`, so no function picker; tab shows "No function picker for this view." |
| Title / subtitle | set | Title **"Mandelbrot ↔ Julia"**; monospace subtitle is the live `c` value, formatted `c = {real.toFixed(3)} {+/−} {abs(imag).toFixed(3)}i` (e.g. `c = -0.700 + 0.270i`). Clicking the title opens Settings. |
| ⚙ Settings | active | App fills it via `<ShellSettings>`. |
| ▶ Actions | active | App fills it via `<ShellActions>`. |
| ? Explainer | active | App registers markdown via `useAppExplainer(explainerText)`. |

Drawer tabs filled: **Apps** (shell-provided), **Settings**, **Actions**. **Function** is empty.

**Deviation — its own floater.** The app calls `useActionFloaterOff()`, which suppresses the generic
`ActionFloater` (the shell's draggable ▶ mirror of the Actions tab). In its place the app renders its
own `<PlaybackFloater>` over the canvas. The actions themselves are defined **once** (`playbackControls`)
and rendered into **both** the drawer's Actions tab (via `<ShellActions>`) and the PlaybackFloater body,
keeping the two in sync. Note: `<ShellActions>` still also portals into the now-hidden generic floater's
body target, but that floater is inactive (`af-inactive`) because `useActionFloaterOff` is set.

The app does **not** use `Canvas3D` or any particle-engine shell; each pane is a hand-rolled Three.js
`WebGLRenderer` with an orthographic camera and a single full-quad `ShaderMaterial`.

## 3. The panes & interactions

Both panes are instances of `FractalPane`, wired with `useViewportGestures` (`coordRef` = the canvas,
so math coordinates map to the centered square, not the full half). Gestures per pane:

| Gesture | Mode | Effect |
|---|---|---|
| 1-finger / mouse drag | pan (default) | Pans the viewport (updates that pane's `ViewBounds`). |
| 1-finger drag | draw (Mandelbrot only, when "Draw c-path" is active) | Records a polyline of `c` points; tap is suppressed. |
| Clean tap (move < 5px, held < 350ms) | pan | Fires `onTap`. On Mandelbrot this calls `onPickC` — but **only takes effect while "Pick Julia c" is armed** (`selecting`); otherwise ignored. The Julia pane has no `onPickC`, so taps there do nothing. |
| 2-finger drag | both | Pans about the pinch midpoint (combined with pinch). |
| 2-finger pinch | both | Zooms about the pinch midpoint. |
| Mouse wheel | both | Zooms about the cursor (`factor = exp(deltaY · 0.0015)`). |

There is **no hover-to-pick** — selecting `c` requires the explicit two-step "arm, then tap" flow (or
typing/drawing). Moving in the Mandelbrot pane only changes `c` through tap-pick or path playback; the
shared `c` state then re-renders the Julia pane in real time via the shader `c` uniform.

**Overlays drawn inside the Mandelbrot pane only** (it receives `markC`, `drawing`, `path`):
- **Marker** — a white text glyph **`X`** positioned at `markC` (= current `c`), `pointer-events: none`.
  Hidden if `markC` is unset.
- **c-path polyline** — a white SVG `polyline` (stroke width 1) tracing the recorded/drawn path points
  in screen space. Drawn from the `path` prop, or the in-progress draw buffer.

The Julia pane receives neither `markC` nor path props, so it shows no marker or path overlay.

## 4. Settings (drawer ⚙)

Rendered into `<ShellSettings>` as `Section`s (collapsible; chevron `▸`). Open-on-load state noted.

| Section | Icon | Open by default | Controls |
|---|---|---|---|
| **Iterations** | `↻` | yes | `Slider` **"Max iterations"** — min 10, max 1000, step 10, default 100. Formatted as integer; value is rounded and clamped to ≥1 on change. Shared by both panes (`maxIter` uniform). |
| **Mandelbrot palette** | `◐` | yes | `Select` **"Palette"** (options below), default 0 (Rainbow). `Slider` **"Offset"** — min 0, max 255, step 1, default 0 (rounded); shifts the escape-band color cycle (`offset` uniform). Applies to the Mandelbrot pane only. |
| **Julia palette** | `◑` | no | `Select` **"Palette"**, default 0. `Slider` **"Offset"** — min 0, max 255, step 1, default 0. Applies to the Julia pane only. Independent from the Mandelbrot palette/offset. |
| **Julia point** | `·` | no | Two numeric `<input type="number" step="any">` fields, side by side: **"c real"** and **"c imag"**, bound directly to `c.real` / `c.imag` (parsed as float, `\|\| 0` fallback). Editing either retargets the Julia set immediately. |
| **About** | `ⓘ` | no | Renders `README.md` via `<Readme>`, plus a dim 11px hint: *"Drag panes to pan · pinch / wheel to zoom · tap 'Pick Julia' then tap the Mandelbrot to choose c."* |

**Palette options** (shared `PALETTE_OPTIONS`, value→label): 0 Rainbow, 1 Fire, 2 Ocean, 3 Grayscale,
4 Viridis, 5 Magma, 6 Inferno, 7 Plasma. (Schemes 0–3 are hand-rolled; 4–7 are matplotlib polynomial fits.)

No "link palettes" / "sync views" / "reset" control exists in Settings. The two palette sections and the
two pane viewports are fully independent; there is no control to mirror zoom/pan between panes.

## 5. Actions

Actions live in the `playbackControls` fragment, rendered into the Actions tab and the PlaybackFloater.
They are `ActionButton`s (a local left-aligned button component: yellow-bordered/yellow-tinted when
`active`, green `#10b981` + bold white when `primary`, 50% opacity + `not-allowed` when `disabled`) plus
one shared `Slider`.

| Action | Label (toggles) | Style | Enabled when | Effect |
|---|---|---|---|---|
| Pick `c` | "Pick Julia c by tap" → "Tap Mandelbrot to pick…" (active) | active toggle | always | Arms `selecting`; the next clean tap on the Mandelbrot sets `c` and disarms. |
| Draw path | "Draw c-path" → "Finish drawing path" (active) | active toggle | always | Toggles `drawingPath`; while on, the Mandelbrot pane is in draw mode and a 1-finger drag records the c-path. |
| Clear path | "Clear path" | normal | path length > 0 | Stops playback and clears the path / resets progress. |
| Play / Stop | "Play path" → "Stop playback" | **primary** (green) | path length ≥ 2 | Starts/stops rAF playback sweeping `c` along the path. |
| Pause / Resume | "Pause" → "Resume" | normal | only rendered while `playing` | Toggles `paused` without stopping the loop. |
| Speed | `Slider` **"Speed"** | — | always | min 0.005, max 0.5, step 0.005, default 0.02; formatted `toFixed(3)`. Advance-per-frame along the path (a comment notes Speed lives here as an action rather than in Settings). |

## 6. The PlaybackFloater (app-specific)

`PlaybackFloater` is the app's signature custom floating panel — a draggable, collapsible panel pinned
by default to the **bottom-left** (`bottom:16px; left:16px; z-index:30`), `248px` wide (capped at
`100vw − 32px`), dark translucent (`rgba(12,12,16,0.72)`) with `backdrop-filter: blur(8px)`. It uses the
shared `useFloaterDrag` hook for repositioning. Title here is **"Playback"**; default collapsed glyph is **▶**.

**Collapsed state** (`pf-collapsed`, default on mount, `open = false`): a compact row with a drag grip
**`⠿`** ("Drag to move") and a 34×34 toggle button showing the **▶** glyph (accent yellow `#ffd400`),
tooltip = title, `aria-label="Show Playback panel"`. Clicking it expands.

**Expanded state**: a header row (doubling as the drag handle) with grip **`⠿`**, the uppercase title
**"PLAYBACK"** (CSS `text-transform: uppercase`), and a **`×`** close button (`aria-label="Hide Playback
panel"`) that re-collapses. Below is `pf-main`, a two-column layout:
- **`pf-body`** (left column) — the `playbackControls` (the same action buttons + Speed slider from §5).
- **`pf-scrubber`** (right column) — a **vertical timeline scrubber**, 22px wide, `cursor: ns-resize`.
  Track is a 6px rounded bar; **bottom = path start (0), top = path end (1)**. A yellow `pf-scrubber-fill`
  grows from the bottom to the current progress, and a white circular `pf-scrubber-thumb` (yellow border)
  sits at the progress height. It is `role="slider"` with `aria-valuemin/max/now` (0–100). Dragging it
  (`onScrub`) seeks to a normalized position along the path and sets `c` by linear interpolation between
  the two bracketing path points. **Grabbing the scrubber while playing pauses playback** (so the user
  keeps control). When the path has < 2 points the scrubber is disabled (`pf-scrubber-disabled`: 40%
  opacity, no pointer events).

Playback engine details: `playPath` resumes from the current scrubbed position (or restarts from the top
if at/after the end), advances `progress` by `speed` each animation frame, interpolates `c` between
adjacent path points, and stops at the final point. `stopPath` cancels the loop and clears playing/paused.
The progress (0..1) drives the scrubber fill/thumb height.

## 7. Explainer popup (?)

The **?** button opens the shell's help modal with `EXPLAINER.md` rendered as markdown. Its content:
both fractals come from one rule, `z ↦ z² + c`. It frames the two "questions" — Mandelbrot fixes `z₀ = 0`
and varies `c` (a `c` is in the set if the orbit stays bounded); Julia fixes `c` and varies the starting
point `z₀` (the Julia set is the boundary between bounded and escaping starts). It explains the
correspondence: the Mandelbrot set is a map of every Julia set; `c` inside Mandelbrot → **connected**
Julia set, `c` outside → a disconnected **dust** (Cantor set) — the *Fundamental Dichotomy*. It notes that
local shapes match near Misiurewicz boundary points (Tan Lei's theorem), and that boundary `c` gives the
most intricate Julia sets. It closes with the controls: tap **Pick Julia c** then tap the Mandelbrot, or
draw a **c-path** and play it back; the side scrubber seeks along the path.

## 8. Domain notes

- **Iteration**: the fragment shader iterates `z ↦ zᵖ + k` with the `power` uniform fixed at **2** (the
  inner power loop is hard-capped at <10). For Mandelbrot (`fType=0`): `z₀ = 0`, `k = pos`. For Julia
  (`fType=1`): `z₀ = pos`, `k = c`. Escape test: `dot(z,z) > 4.0` (|z| > 2), up to `maxIter`.
- **Coloring**: escape index `i` maps to a band `t = mod(i·10 + offset, 256)`, fed to `paletteColor(t,
  scheme)`. Interior (non-escaping) points land at `i = maxIter`. Each pane has its own palette + offset.
- **Default views**: Mandelbrot `x∈[-2.5,1.5], y∈[-1.5,1.5]`; Julia `x,y ∈ [-2,2]`. Default `c =
  -0.7 + 0.27015i`.
- **Correspondence**: picking/drawing `c` in the Mandelbrot pane re-seeds the Julia pane live, exactly
  the relationship the explainer describes.

## 9. Persistence

**None.** Correspondence does not import or use `usePersistentState`; all state (`mandelView`,
`juliaView`, `c`, `iter`, `paletteM/J`, `offsetM/J`, `path`, `speed`, playback flags) is plain
`useState`/`useRef` and resets on reload. There is no localStorage namespace and no "Reset to defaults"
action. The PlaybackFloater also resets to **collapsed** and to its default bottom-left position on every
mount (drag position is not persisted).

## 10. Component / file map

| Concern | File |
|---|---|
| App root: split-pane layout, shared `c`/view/iter/palette state, playback engine, Settings, Actions | `src/animations/Correspondence/Correspondence.tsx` |
| Single fractal pane: Three.js renderer, `z²+c` shader, gestures, `X` marker, path polyline | `src/animations/Correspondence/FractalPane.tsx` |
| Custom floating panel + vertical scrubber | `src/animations/Correspondence/PlaybackFloater.tsx` / `PlaybackFloater.css` |
| About text (Settings) | `src/animations/Correspondence/README.md` |
| Explainer text (? popup) | `src/animations/Correspondence/EXPLAINER.md` |
| Top bar, drawer tabs, `useAppHeader` / `useAppExplainer` / `useActionFloaterOff` / `ShellSettings` / `ShellActions` | `src/components/AppShell.tsx` |
| Generic (suppressed here) action floater | `src/components/ActionFloater.tsx` |
| Floater drag behavior | `src/components/useFloaterDrag.ts` |
| Settings form primitives (`Section`/`Slider`/`Select`) | `src/components/ControlPanel.tsx` |
| Pan / pinch / wheel / tap / draw gestures | `src/lib/useViewportGestures.ts` |
| Shared palette GLSL + dropdown options | `src/lib/colormaps.ts` |
| Responsive breakpoint hook | `src/styles/responsive.ts` |

## 11. Seams & observations for the redesign

The most important section for refining the shared shell. Friction points, especially deviations:

1. **Ships its own floater instead of the generic `ActionFloater` — the key "one action model" data
   point.** The app calls `useActionFloaterOff()` and renders `PlaybackFloater` because the generic
   floater has no concept of a **timeline/scrubber** or a persistent progress readout. The actions are
   defined once and portaled into the Actions tab *and* the custom floater, so the app effectively
   re-implements the shell's mirror-the-actions pattern by hand. This argues that a redesigned action
   model should support a first-class "transport/scrubber" affordance (progress + seek + play/pause)
   rather than only flat button stacks — otherwise every playback-style app forks its own floater.
   `PlaybackFloater` and the generic `ActionFloater` are also near-duplicates (drag grip `⠿`, collapse
   toggle, `useFloaterDrag`, translucent panel), so there is real duplication to consolidate.

2. **The same actions are mounted in three DOM locations; one is dead.** `<ShellActions>` portals into
   both the drawer Actions tab and the *hidden* generic floater body, while the app *also* renders the
   same `playbackControls` directly inside `PlaybackFloater`. So the action JSX exists in three places
   (drawer tab, dead generic-floater body, live PlaybackFloater). The dead copy is harmless but shows the
   shell's "actions are always mirrored into the generic floater" assumption doesn't cleanly support
   apps that opt out.

3. **Controls are mixed across Settings and Actions in non-obvious ways.** "Speed" is a Slider living in
   the **Actions** group (with a code comment justifying it), while palette/iteration/`c` live in
   Settings. The Pick/Draw/Play workflow is split between an armed mode (Pick), a toggle mode (Draw), and
   transport (Play/Pause/Stop). A redesign could clarify where transient "do it now" controls vs. mode
   toggles vs. persistent settings belong.

4. **Duplicated per-pane controls with no link option.** Mandelbrot and Julia each get their own
   palette + offset section, and each pane pans/zooms independently, but there is no "link palettes" or
   "sync views" control. For a two-pane app this is a recurring pattern the shell offers no help for.

5. **Coordinate duplication between shader and overlays.** The canvas is a centered square smaller than
   its half, so gesture math depends on `coordRef`, and the marker/path overlays (`toScreen` /
   `crossStyle`) must re-derive the same letterbox offset and the same screen↔math mapping the shader
   uses. This duplicated mapping is fragile and a candidate for a shared helper.

6. **Custom, hand-rolled controls bypass shell primitives.** The `ActionButton` component and the two
   numeric `c` inputs are hand-styled with inline styles and raw `<input type="number">` rather than
   `ControlPanel` primitives (there is no button or number-input primitive in `ControlPanel`). Adding a
   `Button`/`NumberField` primitive to the shell would remove this bespoke styling and unify look.

7. **Subtitle repurposed as a live readout.** The bar subtitle is used as a real-time `c` value display
   that updates every frame during playback, relying on `useAppHeader` re-firing on every `c` change. A
   redesign might offer an explicit "status/readout" slot distinct from a static formula subtitle.

8. **No persistence.** Unlike the particle viewers, none of this app's settings survive reload, and there
   is no reset action. If persistence becomes a shell-level convention, this app is currently an outlier.
