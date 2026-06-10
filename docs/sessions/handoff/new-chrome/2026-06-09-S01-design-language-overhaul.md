---
kind: handoff
session: 2026-06-09-S01
date: 2026-06-09
title: Design language overhaul — full implementation
branch: claude/new-chrome
slug: new-chrome
status: completed
build: passing
followup: null
pr: null
app: null
---

# Design language overhaul — full implementation

## Summary

This session implemented the complete chrome/UX redesign specified by the
uploaded `design_handoff_animath_ui` bundle (now vendored at `docs/redesign/`):
gallery landing → per-app workspaces where the plots and control panels are
draggable windows on a dotted stage, a left icon rail with a closed
11-archetype panel vocabulary, named per-app layouts, five skins on one
`data-theme` attribute, and a phone re-chrome below 740px. **All 11 apps are
migrated, the old AppShell/drawer/floater chrome is deleted, `npm run build`
is green, and every route is screenshot-verified** (desktop, phone, multiple
skins — see `docs/redesign/shots/`). Mid-session, `origin/main` was merged at
the user's request (bringing Polygon Worlds and the Stable Matching rework,
both absorbed into the overhaul).

## What changed

- **`src/chrome/`** (new): `theme.css` design tokens (Observatory/Paper/
  Spectrum/Blueprint/Phosphor), icon set, SkinPicker + persisted `useSkin`,
  TopBar (brand-mark Home · mode pills · "?" explainer modal · skins), Gallery
  + catalog + cheap canvas previews, readout primitives, and the **workspace
  engine** (`workspace/`): prototype-verbatim snap/dock/pack/collapse-chain
  geometry, pointer-capture dragging, view windows that hide (never unmount)
  when collapsed, built-in + saved layouts persisted per app (`ws:<appId>`).
- **Every app** now renders `<Workspace appId … sections views layouts
  explainer>`; every legacy control survived into an archetype panel per
  `docs/redesign/PARAM-MAP.md` (the no-dropped-capability gate). Floaters
  became drive/playback panels; Trinary's tabs became top-bar mode pills (two
  workspaces, Lab split into Destiny map + Census views); Stable Matching's
  tabs became layouts toggling three view windows (matrix/welfare/lattice).
- **Deleted**: AppShell(.css), ActionFloater(.css), useFloaterDrag, Menu(.css),
  PlaybackFloater, PlaneCurveFloater, QuarterTurnBar. `index.tsx` is a bare
  hash router; `AppDescriptor` moved into `apps.ts`.
- **Docs**: CLAUDE.md / README.md / BUILDING_AN_APP.md rewritten for the new
  framework; `docs/redesign/IN-PROGRESS.md` is the live ledger (decisions +
  carried-forward gaps); `scripts/shoot.mjs` gained a `SKIN` env.

## Key files

| File | Role |
|---|---|
| `src/chrome/workspace/DesktopWorkspace.tsx` | the engine: state, snapping, docking, collapse chains, layouts, persistence |
| `src/chrome/workspace/geometry.ts` | pure window math (ported verbatim from the design prototype) |
| `src/chrome/theme.css` | all design tokens + chrome styles; one `[data-theme]` block per skin |
| `src/components/ParticleViewerShell.tsx` | the pilot: how a rich app assembles panels/views |
| `docs/redesign/PARAM-MAP.md` | every old control → its new panel (checked off) |
| `docs/redesign/IN-PROGRESS.md` | live ledger: status, decisions, open items |

## Open / not done

- **Open a PR** when the user is ready (sync against `main` again at that
  point per CLAUDE.md §Branch sync; the mid-session merge already absorbed
  PRs #193/#197).
- Carried-forward design gaps (logged in IN-PROGRESS): keyboard window
  management, Mandelbrot↔Julia zoom-lock, skin-aware canvas palettes,
  layout rename/export, gallery search, real-renderer card previews.
- A human interaction pass on a real touch device would be prudent (drag/snap
  was verified by code review + static shots; pointer-capture touch dragging
  is implemented but untested on hardware).
- `styles/responsive.ts` (`useResponsive`) is now barely used; candidates for
  cleanup next time someone is in those files.

## Context

- The design bundle is the spec of record: `docs/redesign/{README,DESIGN-SPEC,
  IMPLEMENTATION,IN-PROGRESS}.md`, prototype under `docs/redesign/prototype/`.
  The 11-archetype vocabulary is **closed** — propose changes in IN-PROGRESS,
  don't invent icons.
- Migrations were executed by nine parallel sub-agents (one per app folder),
  each integrated, type-checked, and committed individually — the git history
  reads as one coherent phase series (P0/P1 tokens → P2 gallery → P3 engine +
  pilot → P4 per-app → P4-final shell deletion → P5/P6 sweep).
- Skin and workspace state live in localStorage under `animath:v1:chrome:skin`
  and `animath:v1:ws:<appId>` (versioned `{v:1}`, parse-failure falls back to
  defaults). App settings keys are untouched, so user settings survive.

## Self-reflection

- **What went well**: the PARAM-MAP gate caught everything — no control was
  lost across ~120 of them; parallel per-folder agents with a strict "own
  folder only, no git" contract scaled the migration 9× with zero merge
  conflicts; committing each app only after its agent's tsc pass kept the
  branch history green.
- **What was risky**: building Phase 0/1 while the architecture agent was
  still planning could have produced rework (it didn't — the prototype was
  prescriptive enough); the mid-flight `origin/main` merge added two apps to
  the scope, absorbed cleanly because migrations hadn't started yet.
- **What I'd do differently**: screenshot the *interactive* behaviors (drag
  guides, dock reflow) with a scripted puppeteer session rather than static
  shots; and inventory `StableMatching` after merging main, not before — its
  rework invalidated the first inventory and the migration agent had to
  re-derive it.
- **Follow-up value:** LOW — the chrome migration shipped with no control lost and the branch green; follow-ups are interaction-screenshot tooling, not corrections.

