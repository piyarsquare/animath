# In progress / known gaps

The live ledger of design areas that are **intentionally unfinished** in the prototype, plus open
questions. The implementing agent should update this file as phases land.

## Implementation status (repo, branch claude/new-chrome)

- ✅ **PARAM-MAP gate** — `docs/redesign/PARAM-MAP.md` (all 10 apps; Polygon Worlds, merged from
  main mid-overhaul, mapped during its migration).
- ✅ **Phase 0/1 — tokens & skins**: `src/chrome/theme.css` (5 `[data-theme]` blocks + am-*
  component styles), fonts via `<link>`, `useSkin`/`SkinPicker`, persisted `chrome:skin`,
  ControlPanel restyled to tokens (`--cp-*` aliased), `scripts/shoot.mjs` takes `SKIN` env.
- ✅ **Phase 2 — gallery + routing**: Gallery at `#/` (hero, chips, 10 preview cards from
  `chrome/catalog.ts`), TopBar (brand-mark Home, mode pills, "?" explainer modal, SkinPicker),
  old Menu deleted; `MIGRATED` route set governs the two-chrome interregnum.
- ✅ **Phase 3 — workspace engine + pilot**: `src/chrome/workspace/` (geometry math ported
  verbatim; pointer-capture drag; soft-magnetic snap + guides; tight dock; never-overlap
  freeSlot; collapse-chain reflow; raise-on-touch; view windows hide-don't-unmount; per-app
  layout persistence `ws:<appId>`; built-in + saved layouts; PhoneWorkspace dock/sheet).
  Complex Particles pilots it (Essentials/Appearance/Rotate layouts).
- ✅ **Phase 4 — all 11 apps migrated** (Complex Particles, Fractals, Mandelbrot ↔ Julia,
  Plane Transform, Topology Walk, Trinary Observatory + Lab, Stable Marriage,
  Stable Matching, Agentic Sorting, Polygon Worlds; legacy `#/fractals-cpu` kept
  unlisted with a minimal Home affordance). Old chrome deleted: AppShell,
  ActionFloater, useFloaterDrag, Menu, PlaybackFloater, PlaneCurveFloater,
  QuarterTurnBar. PARAM-MAP fully checked off; the only new view surface found
  during migration (Stable Matching's lattice) got its own view window + layout.
- ✅ **Phase 5 — phone mode** verified at 390×844 (gallery single-column; stacked
  view cards + bottom dock + sheets on the apps).
- ✅ **Phase 6 — polish baseline**: focus-visible rings, prefers-reduced-motion,
  Escape-to-close on menus/modals/sheets, aria-labels on all icon-only chrome
  buttons, hit targets (40px rail / 44px dock), screenshot sweep across skins in
  `shots/`. Docs updated (CLAUDE.md, README.md, BUILDING_AN_APP.md).

## Decisions added during implementation

- **Explainer surface**: top-bar "?" → modal (ExplainerModal wrapping the existing Readme
  renderer). The modal carries `EXPLAINER.md` + the old About `README.md` joined with a rule, so
  the drawer's About section content survives.
- **Gallery previews**: the cheap 2D-canvas mocks (ported from viz.jsx), not the real renderers —
  ~10 simultaneous WebGL contexts on the landing page is fragile; revisit later (user decision).
- **Catalog**: 10 cards — the 8 designed apps + Stable Matching + Polygon Worlds (new app merged
  from main). Legacy `#/fractals-cpu` stays an unlisted route (user decision).
- **Trinary tabs → TopBar mode pills** (Observatory | Lab), hash routes and Lab URL-query config
  preserved; each mode is its own Workspace (`trinary-obs` / `trinary-lab`).
- **StableMatching visualizer/lab tabs → built-in layouts** toggling two view windows.
- **Saved layouts capture view geometry** too (spec over prototype, DESIGN-SPEC §2).
- **View windows collapse by hiding, not unmounting** (WebGL state survives); `Canvas3D` ignores
  zero-size resizes.
- **Pointer events** (capture-based) for window drag/resize — desktop touch works, closing one
  IN-PROGRESS gap below.

## Designed but mocked (needs real wiring)
- **All panel controls are local-state mocks.** Sliders/pills/toggles render and remember their own
  value but drive nothing. Real implementation binds them to app parameters (see PARAM-MAP you will
  produce in IMPLEMENTATION step 2).
- **Analyze-tier readouts show illustrative data** (Trinary outcome percentages, survival curve,
  sorting race, marriage rank stats). Bind to real batch-run results; the visual grammar
  (Breakdown / MiniHisto / Sparkline / StatGrid) is the spec.
- **Gallery card previews** are mock canvases (`viz.jsx`). Use the real renderers, small + throttled.

## Designed for 3 apps in depth, 5 by analogy
Complex Particles, Fractals, and Trinary System were designed against the real repo's controls.
The other five (Plane Transform, Mandelbrot ↔ Julia, Topology Walk, Stable Marriage, Agentic
Sorting) have **plausible control sets designed from the app concepts** — validate each against the
actual code's capabilities and adjust panel contents (not the archetypes) accordingly.

## Still open after implementation (carried forward)

- **Keyboard window management** (move/dock/cycle windows without a pointer) —
  panels/rail/menus are keyboard-operable; window placement is not.
- **Linked-view extras** for Mandelbrot↔Julia (viewport zoom-lock toggle);
  seed propagation works as before.
- **Skin-aware canvas palettes**: engines keep their own colors; only the
  chrome + `--viz-bg` follow the skin (gallery previews branch light/dark).
- **Saved-layout management**: naming still via `window.prompt`; no rename/
  reorder/export.
- **Gallery search** (no UI yet).
- **Real-renderer gallery previews** (cards use cheap canvas mocks by decision).

## Not yet designed (open branches)
- **Linked-view semantics** for the two-view apps: exact hover/seed propagation, viewport lock
  toggle behavior between Mandelbrot↔Julia windows. Prototype shows the windows, not the link logic.
- **Saved-layout management:** prototype uses `window.prompt` for naming; no rename, no reorder,
  no export/import of layouts.
- **Phone:** no landscape spec; one sheet at a time (no split/stacked sheets); no drag-reorder of
  view cards; dock has no overflow indicator beyond scroll.
- **Touch support on desktop-sized touch devices** (windows currently mouse-event-driven).
- **Keyboard window management** (move/dock/cycle windows without a pointer) — needed for full a11y.
- **Explainer surface:** each app has `about` copy in the catalog; current design surfaces it only on
  gallery cards. An in-workspace "?" affordance was prototyped earlier and removed — decide placement.
- **Gallery search** (catalog supports it conceptually; no UI built).
- **Skin-aware canvases:** define per-skin palettes for the real renderers (prototype only branches
  light vs dark).

## Deliberate removals (do not resurrect without discussion)
- The old **draggable floater** → replaced by openable `drive` panels you can place beside the plot.
- The old **in-app cross-app switcher** → gallery is the only hub.
- **Settings / Actions / Function / About** menu taxonomy → replaced by the 11-archetype vocabulary.

## Decision log (running)
- 2026-06: Workspace model chosen over fixed inspector (A) and bottom dock (C) after exploration;
  phone mode inherits C's bottom-sheet pattern.
- 2026-06: Vocabulary frozen at 11 archetypes / 5 tiers.
- 2026-06: Skins frozen at 5; Phosphor doubles as the "all-mono" stress test of the type system.
