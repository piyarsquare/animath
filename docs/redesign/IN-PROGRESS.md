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
- **Gallery previews**: cheap 2D-canvas sketches, not the real renderers —
  ~10 simultaneous WebGL contexts on the landing page is fragile; revisit later (user decision).
  Now **one flavor per app** (was 3 shared flavors): warping plane grid, palette-cycling
  Mandelbrot, Mandelbrot↔Julia split with a moving c, twisting corridor, Gale–Shapley proposal
  round, concurrent sorting agents, preference-matrix lattice walk, glued-square torus walk.
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

## Resolved prototype-era sections (kept for the record)

- ~~Designed but mocked~~ — every panel control is bound to real app state
  (the PARAM-MAP gate, Phase 4); analyze-tier readouts show real run data;
  gallery previews are authored per-app sketches (see decision above).
- ~~Designed for 3 apps in depth, 5 by analogy~~ — every app's panels were
  validated against the actual code during its migration.
- ~~Explainer placement~~ — the top-bar "?" modal (see decision above).
- ~~Touch on desktop-sized touch devices~~ — windows use pointer-capture
  events (mouse, touch, pen).
- ~~Dock/rail overflow invisible~~ — both bars show fade + chevron scroll
  hints at whichever edge has more content.

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
- **Archetype icon collisions** (raised from Agentic Sorting, but chrome-wide):
  because the vocabulary is a *closed 11-icon set* while apps routinely have more
  than one panel per tier, the **same glyph stands for different objects** in one
  app's rail — Agentic Sorting alone shows the bar-chart icon for both *Metrics*
  and *Track agent* (both `readout`), one `subject` glyph for both *Scenarios* and
  *Array*, and the same `chart` layout icon on two layouts. The rail leans on the
  panel *title* to disambiguate, so an icon-only glance is ambiguous. Options to
  weigh later: per-panel icon variants within a tier, a numeric/letter affix, or
  the more expressive UI being explored separately — register only; do not widen
  the vocabulary unilaterally (it's frozen by decision below).
- **Phone**: no landscape spec; one sheet at a time; no drag-reorder of view
  cards.
- **Embeds phase 2** (docs/EMBEDS.md): the `s=` catch-all param and the
  "Embed this view" share dialog.

## Deliberate removals (do not resurrect without discussion)
- The old **draggable floater** → replaced by openable `drive` panels you can place beside the plot.
- The old **in-app cross-app switcher** → gallery is the only hub.
- **Settings / Actions / Function / About** menu taxonomy → replaced by the 11-archetype vocabulary.

## Decision log (running)
- 2026-06: Workspace model chosen over fixed inspector (A) and bottom dock (C) after exploration;
  phone mode inherits C's bottom-sheet pattern.
- 2026-06: Vocabulary frozen at 11 archetypes / 5 tiers.
- 2026-06: Skins frozen at 5; Phosphor doubles as the "all-mono" stress test of the type system.
- 2026-06: View windows gain a **fullscreen** toggle (desktop + phone) implemented as a CSS-only
  restyle of the same DOM node (fixed inset-0) so WebGL contexts survive; fullscreen is transient
  (not persisted). Phone view cards gain a bottom **resize grip**; per-view heights persist under
  `animath:v1:wsphone:<appId>` (parallel to the desktop `ws:<appId>` rects).
- 2026-06: Particle camera became a **free-orbit quaternion** (trackball, no pole stops); the
  Camera panel gains a Drag: Orbit | Pan pill.
- 2026-06: **Stereo retired** (it was the same stereographic map as Torus); the projection pills
  became **one slider with sticky labeled stops** — Perspective ⇠ Torus ⇢ Sphere (= Hopf
  internally) — fractional positions are live GPU morphs, the axis cross fades toward the torus,
  and the drop axis and slider release each other (most recent intent wins). Hopf fiber overlay
  and "Hopf study view" removed.
- 2026-06: **Embeddable applets** (docs/EMBEDS.md): chrome-less `#/embed/...` routes for the
  particle and plane viewers, URL-configured with ephemeral state; reference host page at
  `/embed-demo.html`.
