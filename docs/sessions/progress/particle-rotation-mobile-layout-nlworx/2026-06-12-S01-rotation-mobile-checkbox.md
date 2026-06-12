---
kind: progress
session: 2026-06-12-S01
date: 2026-06-12
title: Bounded turntable orbit · full-bleed mobile views · checkbox skin bug
branch: claude/particle-rotation-mobile-layout-nlworx
slug: particle-rotation-mobile-layout-nlworx
status: in-progress
build: passing
followup: null
pr: null
app: complex-particles, chrome
---

# Bounded turntable orbit · full-bleed mobile views · checkbox skin bug

## Session purpose

Two user-reported regressions/asks on Complex Particles + the workspace chrome:

1. The camera orbit was changed to a free (unbounded) trackball, which made the
   view too hard to recenter by hand. Restore the **bounded** orbit as the
   default and keep the unbounded one as an opt-in mode.
2. On mobile, the view windows were small fixed-height cards that hid most of
   the visualization. Make the views **fill the screen** with the toolbar
   floating above.

Then, mid-session: a follow-up bug — **checkboxes don't render their box in
some skins (e.g. Blueprint)**.

## Previous session

First tracked session on this branch. For continuity, the most recent
particle-app work is the three-hats review under
`../three-hats-particle-app-rill2c/` (lifecycle leak fix + branch gating); this
session is a separate, user-driven polish pass, not a direct continuation.

## Working notes

<!-- Newest entry first. -->

### 🟢 code · 16:28 — Token-styled checkbox (visible in every skin)

**Why:** Root cause confirmed — the shared `ControlPanel` checkbox was a bare
native `<input type="checkbox">` styled only with `accent-color`. Native
checkboxes paint from the page `color-scheme` (which is unset), so in Blueprint
(accent ≈ white `#f2f6ff`) the box read as a featureless block.

Replaced the native box with a custom one drawn from theme tokens in
`ControlPanel.css`: `appearance: none`, a `--cp-fg-dim` border on a panel-solid
fill when unchecked, an accent fill + `--accent-fg` checkmark (`::after`) when
checked, plus hover/focus-visible states. Verified via `scripts/shoot.mjs` in
Blueprint (checked: white box + dark-blue check; unchecked: outlined empty box)
and the default dark skin (gold box + dark check). Build green.

### 🔵 finding · 16:16 — Checkbox box missing in some skins (reported)

**Why:** User reports the checkmark boxes don't show in some modes, e.g.
Blueprint. Opening an investigation; not yet root-caused.

Suspect the `Checkbox` control in `components/ControlPanel` and the skin token
values in `chrome/theme.css` (Blueprint `[data-theme]` block) — likely a
`border`/`background` that collapses to the panel color, or a box-shadow-based
border that a skin overrides. To confirm next.

### 🟡 milestone · 16:10 — Both asks shipped and pushed

**Why:** Build/test/lint green and screenshots confirm the behavior; pushed to
the feature branch.

`npm run build` ✓, `npm test` ✓ (22), `npm run lint` ✓ (0 errors, 60 baseline
warnings). Mobile + desktop screenshots verified via `scripts/shoot.mjs`.
Commit `2afe887`.

### 🟢 code · 16:05 — Full-bleed mobile views + floating top bar

**Why:** Fixed 56vw cards hid most of the visualization on phones.

Phone top bar (`.am-phone-app > .am-bar`) now floats as a translucent pill;
view cards flex-fill the stage between it and the floating dock (one open view
fills the screen, several split it). The bottom grip now resizes the whole card
via flex-basis (`PhoneWorkspace.tsx`). Touched `theme.css` phone block only —
desktop layout untouched (selectors are phone-scoped).

### 🟢 code · 16:00 — Bounded "turntable" orbit restored as default

**Why:** The free trackball tumbled past the poles and could roll, so a drifted
view was hard to recenter.

Added an `orbitMode` setting (`turntable` default | `free`), persisted, with a
new Camera-panel **Orbit** toggle. Turntable accumulates azimuth/elevation in
refs and writes `camQuat`, so camera placement, pan, reset, and the Hopf/Torus
ambient orbit are all unchanged; a turntable drag re-syncs az/el from the
current orientation on pointer-down. Files: `useParticleState`,
`useGestureRotation`, `useViewControls`, `ParticleViewerShell`, `CLAUDE.md`.

### 🔵 finding · 15:58 — The "full rotation" was the free trackball

**Why:** Locating what to revert.

`useGestureRotation.ts` 1-finger drag composed incremental quaternions about the
camera's own axes (no pole limit). Git history shows the prior bounded version
(commit `3689d85`) used clamped azimuth/elevation. Decided to reimplement
bounded-on-`camQuat` rather than revert the state model, so both modes coexist.
