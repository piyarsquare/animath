# animath — Design Specification

Source of truth for exact values: `theme.css` (tokens + component CSS) and the `.jsx` reference files.
This document explains the system so you can rebuild it idiomatically.

---

## 1. Information architecture

```
Gallery (landing)  ──click card──▶  Workspace for app X
       ▲                                   │
       └────────── brand mark (Home) ──────┘
```

- **No cross-app switcher inside an app.** The gallery is the only hub. The brand mark (top-left,
  reveals a small home glyph on hover) returns to it.
- **Route, skin, and per-app workspace state persist** (prototype uses `localStorage`; use whatever
  the repo prefers — URL params for route are encouraged).
- App catalog is grouped by topic (Complex analysis / Fractals / Dynamics / Algorithms). Gallery
  shows: kicker, hero title, one-line tagline, category filter chips, and one card per app
  (live animated preview, category label, name + glyph, one-line blurb, hover reveals "Open workspace").

## 2. The workspace — "everything is a window"

The stage is a full-viewport **void canvas**: `--bg` with a 24px dot grid
(`radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 1.5px)`).

Two kinds of windows live on it, sharing one interaction model:

### View windows (the plots)
- Card chrome: `--panel-solid` bg, `--border-strong` 1px border, 13px radius, `--shadow`,
  header (window icon in `--accent`, Space Grotesk 12.5px/700 title, collapse chevron), body = canvas.
- **Drag** by header. **Resize** by bottom-right handle (min 220×150; right/bottom edges snap to other
  windows' edges). **Collapse** to header. **Raise on any mousedown.**
- **Fullscreen** (header toggle): a CSS-only restyle of the same node (WebGL survives). While a
  view is fullscreen, the **rail stays live** and panels it opens **float above** the fullscreen
  canvas; the action strip persists; the fullscreen header carries its own **?** explainer button.
  **Esc peels one transient layer per keypress** (menu/sheet/modal → fullscreen) and never closes
  panels (✕-only). Window z is compacted to 1..n on load/raise; the layer scale lives in
  `chrome/workspace/layers.ts` ↔ the `--z-*` tokens.
- **Split views** (CHROME-REVIEW P5): a view may declare `panes` instead of `node` — two
  pictures that are one mathematical unit render side-by-side inside ONE window with a fixed
  **equal** split (no draggable divider: equal inscribed squares are the invariant that keeps a
  domain/image pair scale-commensurable). Drag/resize/collapse/fullscreen/layout act on the
  pair as a unit. Plane Transform is the reference consumer: one window `z ↦ f(z)` with panes
  `z — domain` / `w = f(z) — image` (matching its embed presentation).
- **Start hints** (CHROME-REVIEW P2): gesture-driven views may declare `hint` — a short,
  math-anchored invitation ("tap to choose c — the Julia set follows") rendered as a centered
  pass-through pill on the view-overlay layer until the view's first pointer interaction.
  Per-session only, never persisted. Apps whose begin-affordance is a button use the action
  strip instead; future view HUDs (P3) share this overlay layer.
- Defined per app in the catalog (`views: [{id,title,kind,x,y,w,h}]`). Mandelbrot ↔ Julia opens
  with **two linked windows** (`Mandelbrot — pick c` / `Julia(c)`) — there the linkage is by
  *parameter*, not scale, and independent pan/zoom is a feature, so it stays two windows.

### Control panels
- Open/close from the **left icon rail**; also closable via ✕ in the panel header.
- 268px wide, auto height. Header: archetype icon (accent), title, collapse chevron, ✕.
- **Soft-magnetic snapping** while dragging: snap targets are stage edges (8px margin), the rail's
  right edge, and every other window's edges (align left/right edges; dock flush below/above/beside).
  Lock threshold ≈ 14px; a 1.5px accent **guide line** shows the live snap edge.
- **Tight docking:** locked edges touch exactly (no gutter).
- **Never-overlap docking:** if a drop would cover another window, the panel docks flush below it;
  if the column is full it flows to the top of the next column — it never clamps into an overlap.
- **Collapse-chain reflow:** collapsing/expanding a panel moves the chain of panels docked below it
  so the stack closes up / pushes out (BFS down touching edges, x-overlap, ≤6px tolerance).
- **Raise-on-touch:** any mousedown brings a window to the top of the z order.
- **Empty state:** with no panels open, a centered hint: “No panels open — click an icon on the rail…”

### Left icon rail
- Floating pill column at stage left: 40×40 icon buttons, one per panel/section of the active app.
- Buttons sort by **tier** (see §3) with 1px separators between tiers. Active = accent icon +
  `--accent-soft` bg + 3px accent bar at left. Hover tooltip: panel title + small mono uppercase
  tier label in accent.

### The action strip (always-on primary verbs)

Some apps are inert until acted on — without a visible Play the user doesn't know where to
begin (CHROME-REVIEW §1). Those apps pass `actions: ActionDef[]` and the chrome renders an
**always-on strip**: a floating pill bottom-center of the stage (desktop) / a row docked above
the dock (phone), never draggable, never closable, persistent through fullscreen
(`--z-actionbar`).

- The strip is a **projection of an existing drive/playback panel** — the few verbs a
  first-timer needs (play/pause, step, finish, reset, launch). Rich controls (speed, schedules)
  stay in the panel. `sectionId` names the projected section (dev-warned if not Drive tier).
- **Buttons only** (the type has no node slot), at most **5** render, **labels are static**
  verbs (no live readouts), at most one `primary` (accent). Toggles surface `aria-pressed`;
  the strip is `role="toolbar"`. **Step is first-class** beside Play in algorithm apps.
- Action sets may be **contextual** (swap with app mode — e.g. Stable Matching's run ↔ repair
  replay) but the strip's position never moves.
- Gesture-driven apps (fractals, plane, particles) get **no strip** — their begin-affordance
  is the view itself (start hints, CHROME-REVIEW P2).
- **Embeds:** the embed routes' URL-configured `buttons=` row is the strip's embed form;
  simulation-app embeds must include their primary verbs there.

### Layouts
- Top-bar control `Layout: <name>` opens a menu of **built-in layouts per app** (e.g. Compact = rail
  only; Essentials; Everything; Trinary: Sandbox / Lab; Stable Marriage & Agentic Sorting:
  Setup / Analysis) plus user-saved layouts (“Save current layout…”, deletable).
- Any manual move/open/close marks the layout `Custom *`. Layout state = the `open` map
  (panel id → {x, y, z, collapsed}) and view-window geometry.

## 3. The panel vocabulary — 11 archetypes, 5 tiers

**Every panel in every app is one of these.** One icon = one meaning, everywhere. The rail always
orders by tier: Define → Render → Drive → Analyze → System. A new app never introduces new icons —
only a subset of this alphabet.

| Tier | Archetype | Icon | Meaning |
|---|---|---|---|
| Define | `subject` | ƒ (fx) | What you are visualizing (function, set, surface, array, preferences) |
| Define | `domain` | grid | Input space, viewport, or starting layout |
| Render | `view` | camera | Projection & camera |
| Render | `color` | palette | Coloring scheme |
| Render | `marks` | sparkles | How points/cells/lines are drawn |
| Render | `motion` | waves | Continuous animation (morph, drift) |
| Drive | `drive` | move-pad | Hands-on manipulation (4D rotation, seed picking, walking, agents) |
| Drive | `playback` | play | Time transport — play, step, scrub, speed |
| Analyze | `lab` | flask | Batch experiments over many runs |
| Analyze | `readout` | chart | Stats, plots, histograms |
| System | `quality` | gear | Resolution, iteration depth, performance |

### Mapping the old chrome
| Old (repo) | New |
|---|---|
| “Function” menu | `subject` panel |
| “Settings” drawer | split into `domain` / `view` / `color` / `marks` / `quality` panels |
| “Actions” menu | `drive` and/or `playback` panels |
| Draggable floater (flips/rotations) | the `drive` panel — open it and drag it next to the plot |
| “About” | Explainer copy (app `about` text; surface as you see fit, e.g. a modal or gallery card) |

### Per-app sections (as designed — validate against real capabilities)
- **Complex Particles:** subject Function · domain Domain · view Camera · color Color · marks Particles · motion Motion · drive 4D Rotation · quality Detail
- **Fractals:** subject Set · domain Viewport · color Palette · quality Iteration
- **Trinary System:** subject Stars · domain Planet · domain Layout · playback Playback · lab Batch run · readout Outcomes · readout Survival curve
- **Plane Transform:** subject Function · domain Grid · color Color · marks Grid style · motion Morph · drive Handles · quality Detail (+ two views)
- **Mandelbrot ↔ Julia:** subject Set · domain Viewport · color Palette · drive Seed · playback Morph · quality Iteration (+ two linked views)
- **Topology Walk:** subject Surface · view Camera · color Color · marks Mesh · drive Move · quality Tessellation
- **Stable Marriage:** subject Preferences · domain Population · playback Playback · readout Matching stats · readout Rounds
- **Agentic Sorting:** subject Array · drive Agents · playback Run · readout Metrics · readout Race

### Readout primitives (shared)
`Breakdown` (labeled % bars), `MiniHisto` (bar histogram + mono caption), `Sparkline` (filled SVG
line), `StatGrid` (2×2 stat cards), `Kicker` (mono uppercase section label). Use these for all
Analyze-tier content so labs feel consistent.

## 4. Type system

| Role | Font | Used for |
|---|---|---|
| Display | **Space Grotesk** 400–700 | wordmark, titles, panel/window headers, gallery hero |
| UI | **Hanken Grotesk** 400–800 | labels, buttons, body |
| Mono | **Space Mono** 400/700 | numeric readouts, coordinates, kickers, tier badges |

Google Fonts import is in `theme.css`. The **Phosphor** skin overrides display+UI to Space Mono.

## 5. Skins (design tokens)

One attribute — `data-theme` on the root — restyles everything. Each skin is a token block in
`theme.css`. Tokens: `--bg --viz-bg --panel --panel-solid --panel-2 --fg --dim --dim-2 --accent
--accent-fg --accent-soft --accent-2 --border --border-strong --hover --active --shadow --track
--dot-color` (+ optional font overrides).

| id | Name | Character | bg | accent |
|---|---|---|---|---|
| `dark` | Observatory | ink blue · refined gold (default) | `#0a0c12` | `#ffce47` |
| `light` | Paper | warm paper · deep amber | `#f0ede4` | `#b67d10` |
| `neon` | Spectrum | space black · cyan + magenta | `#05060f` | `#34e6cf` |
| `blueprint` | Blueprint | drafting blue · chalk lines, brighter dots | `#0e2148` | `#f2f6ff` |
| `phosphor` | Phosphor | CRT green, **all-mono type** | `#03100a` | `#3dff7a` |

Skin picker: pill button (3 swatch dots + name) in gallery and workspace bars; dropdown lists all
skins with name + blurb + dots. Adding a skin = one token block + one registry entry.

Canvas engines should read the skin too (the prototype's mocks treat any non-`light` skin as dark).

## 6. Phone mode (≤ 740px)

- **Gallery:** single-column cards, hero scales down (34px title), bar tagline hidden.
- **Workspace re-chromes** (same vocabulary, no floating windows):
  - View windows → full-width stacked cards (56vw tall, max 340px), same header style, no drag.
  - Rail → **bottom dock**: horizontally scrollable icon+label buttons, same tier separators,
    active = accent.
  - Panel → **bottom sheet** (max 72% height): grip, header = icon + title + mono tier badge +
    close chevron, scrollable body, scrim behind; one sheet at a time; scrim tap closes.
  - Layouts menu hidden on phone.
- Implementation: a `usePhone()` matchMedia hook choosing `PhoneWorkspace` vs `DesktopWorkspace`.

## 7. Interaction details worth preserving

- Drag uses pointer deltas against the window's start position; on release, clear guides.
- Snap guides: 1.5px accent lines across the full stage, slight glow, removed on settle.
- All entrance animations are short (≈160–300ms, `cubic-bezier(.2,.7,.3,1)`) and **must respect
  `prefers-reduced-motion`** (disable, don't leave content hidden).
- `:focus-visible` ring: 2px accent outline, 2px offset.
- Gallery cards lift 3px on hover with shadow; "Open workspace →" affordance fades in.
- Minimum hit targets 40px on desktop chrome, 44px+ on phone dock/sheet.

## 8. Accessibility

- Every icon-only button has a title/aria-label (rail, dock, window chrome).
- The rail tooltip text = accessible name. Sheet/menus close on Escape (desktop) and scrim tap.
- Maintain contrast: `--dim` on `--bg` is the floor; never set body text below it.
