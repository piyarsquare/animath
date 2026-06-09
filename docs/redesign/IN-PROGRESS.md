# In progress / known gaps

The live ledger of design areas that are **intentionally unfinished** in the prototype, plus open
questions. The implementing agent should update this file as phases land.

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
