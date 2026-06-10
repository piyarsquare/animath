# Implementation plan

For an agent with repo access and permission to update main. Work in **phases that each leave main
shippable**. Prefer short-lived feature branches merged per phase (`redesign/p1-tokens`, …); if you
commit straight to main, keep each phase a coherent, revertible series.

## Before you start

1. Read `README.md` + `DESIGN-SPEC.md`; open `Animath.html` in a browser and use it.
2. Inventory the repo: list every app, its current Settings/Actions/Function menu items, and its
   renderer's tunable parameters. Produce `docs/redesign/PARAM-MAP.md` mapping every existing control
   → an archetype panel (use the mapping table in DESIGN-SPEC §3 as the starting point). **Do not
   drop any existing capability** — every old control must land in some panel.
3. Confirm build realities: React version, router (if any), CSS approach (modules/styled/plain).
   Recreate the design with the repo's idioms. The prototype's Babel-in-browser setup is NOT to be
   copied.

## Phase 0 — Design tokens & skins
- Port `theme.css` tokens: the 5 `[data-theme]` blocks, font imports, shared component classes you
  intend to keep as plain CSS (or translate to the repo's styling system).
- Apply `data-theme` at the root; build the `SkinPicker` (5 skins, swatches + names) and persist choice.
- **Accept:** flipping skins restyles the whole app; Phosphor switches type to Space Mono; fonts load.

## Phase 1 — Shell: gallery + routing + Home
- Build the gallery (hero, filter chips, live preview cards) using each app's real renderer as the
  card preview (small, throttled). Route: gallery ⇄ app; brand mark = Home; route survives reload.
- Remove the old landing page and any cross-app nav inside apps.
- **Accept:** can reach every app from the gallery and return via the brand mark; skin persists across.

## Phase 2 — Workspace engine (the core)
Build as reusable components, app-agnostic:
- `Stage` (void canvas + dot grid), `ViewWindow`, `Panel`, `Rail`, `LayoutsMenu`.
- Drag + soft-magnetic snap + tight dock + never-overlap dock + collapse-chain reflow +
  raise-on-touch + resize (views) — port the geometry logic from `workspace.jsx` (functions:
  `snapPos`, `allRects`, `makeSnap`, `makeResize`, `freeSlot`, `collapsePanel`'s chain BFS). This
  logic is framework-agnostic math; porting it nearly verbatim is fine and encouraged.
- Per-app layout persistence + built-in layouts + save/delete custom layouts.
- **Accept:** with one pilot app (Complex Particles), all DESIGN-SPEC §2 behaviors demonstrably work.

## Phase 3 — Migrate all apps onto the vocabulary
- One app per PR/commit-series. For each: define its sections (archetypes per DESIGN-SPEC §3),
  bind every control to the app's real parameters (from PARAM-MAP), define its view window(s).
- Two-view apps: Mandelbrot ↔ Julia (hover/seed link between windows), Plane Transform (input/output).
- Analyze-tier panels use the shared readout primitives, driven by real run data where it exists.
- Delete the old drawer/floater chrome per app as it migrates.
- **Accept (per app):** no old chrome remains; every legacy control reachable; rail icons ∈ the 11.

## Phase 4 — Phone mode
- `usePhone()` (≤740px) → phone chrome: stacked view cards, bottom dock, bottom-sheet panels,
  single-column gallery (DESIGN-SPEC §6). Touch events for any retained drag interactions.
- **Accept:** at 390px wide every app is fully operable; nothing requires hover.

## Phase 5 — Polish & a11y
- Reduced-motion, focus-visible, aria-labels on icon buttons, Escape-to-close, empty states,
  contrast audit per skin.
- **Accept:** keyboard-only pass on one app; Lighthouse a11y ≥ 90.

## Ground rules
- Never modify the math/render engines except to expose parameters the panels need.
- Keep the 11-icon vocabulary closed: a new panel must use an existing archetype (or propose a
  vocabulary change in `IN-PROGRESS.md` — don't silently invent icons).
- Update `IN-PROGRESS.md` at the end of every phase: what shipped, what's open, decisions made.
- After each phase, capture screenshots (desktop + phone, 2–3 skins) into `docs/redesign/shots/`
  for design review.
