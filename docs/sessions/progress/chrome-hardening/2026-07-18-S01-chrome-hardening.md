---
kind: progress
session: 2026-07-18-S01
date: 2026-07-18
title: Chrome hardening — failure containment, a11y batch, layout clamp
branch: claude/chrome-hardening
slug: chrome-hardening
status: complete
build: passing
followup: null
pr: null
app: chrome
next: Remaining external-review items — Start-here gallery row + card metadata, layered explainers, reduced-motion previews, tablet breakpoint.
---

# Chrome hardening — failure containment, a11y batch, layout clamp

## Session purpose

Execute the top shared-chrome items from the external product review (GPT sol
5.6, relayed by Dan 2026-07-18): catastrophic WebGL failure containment, the
mechanical accessibility batch, and viewport-clamped layouts. These are the
fix-once-benefit-everywhere items; the editorial items (Start-here row, layered
explainers, Paper-as-default) are deliberately left for Dan's direction.

## Previous session

`trinary-legibility/2026-07-17-S01` — merged to main as PR #250.

## Working notes

### 🟢 code · 18:20 — WebGL failure containment + route titles
**Why:** With WebGL unavailable, 3D routes threw during renderer creation and
blanked the whole page unrecoverably (review finding #4, verified reproducible).

- `chrome/RouteBoundary.tsx` — per-route error boundary, keyed by route so
  navigation always recovers; named error panel with Home (a real link) +
  Retry; recognizes WebGL-flavored errors and explains likely causes.
- `Canvas3D` — `hasWebGL()` capability probe (cached) + try/catch around
  renderer creation; on failure renders an in-place "3D view unavailable"
  notice INSIDE the view body, so the workspace chrome (rail, panels, action
  strip) stays fully alive — verified: under `--disable-3d-apis` the Trinary
  workspace renders completely with only the Orbit view reporting.
- Route titles: `document.title = "<App> · animath"` per route (appends to the
  boot title so Cloudflare preview branch names survive).

### 🟢 code · 18:24 — A11y batch (all shared chrome)
**Why:** Review finding #5 — every item mechanical, every item fix-once.

- **ExplainerModal focus trap**: focus moves into the dialog on open, Tab
  cycles inside it, Esc closes, focus restores to the opener. Verified by
  driving 12 Tab presses headlessly — focus never escaped, and closing put it
  back on the "?" button.
- **Real links**: gallery cards and the TopBar Home brand are now `<a href>`
  (copyable, open-in-new-tab, link-list navigable) instead of hash-mutating
  buttons; CSS normalized so they render identically.
- **`<main>` landmark** on the gallery scroll region.
- **`aria-pressed`** on every Pills segmented button (was CSS-color-only state).

### 🟢 code · 18:26 — Viewport-clamped layouts
**Why:** Authored layouts use absolute positions against a roomy reference
viewport; on shorter stages panels extended past the overflow:hidden edge and
became unreachable (Argand "Essentials runs 136px below the fold"; the same
class bit Trinary's Sandbox during the legibility work).

`clampToViewport()` in `workspace/layouts.ts` (pure, unit-tested): panels keep
their whole card on-stage (a too-tall card pins to the top and its body
scrolls); view rects clamp and shrink to fit. `applyLayout` takes an optional
viewport; `DesktopWorkspace` passes the stage size (window minus the 54px bar)
at initial load and on every layout pick. Null/degenerate viewports are no-ops
so tests and persisted-state paths are unaffected.

### 🟡 milestone · 18:30 — Verified end-to-end
**Why:** The review's findings were empirical; the fixes must be too.

Headless verification: (1) `--disable-3d-apis` browser → Trinary and Solid
Worlds both render contained fallbacks with the chrome alive, Home reachable —
no blank pages; (2) gallery shows 12 `<a>` cards + `<main>`; (3) route titles
"Trinary System · animath" / "Stable Matching · animath"; (4) the focus trap
holds and restores. `npm test` 307 pass (4 new clamp tests) · build clean ·
lint 0 errors.

## Deferred (need Dan's editorial direction)

- Start-here gallery row + per-card metadata (level/time/GPU/question) —
  additive `catalog.ts` schema, but WHICH three apps lead is Dan's call.
- Layered explainers (callouts → why → derivation → methods/sources).
- Paper as default theme; category taxonomy rename.
- Reduced-motion/offscreen-paused previews; tablet breakpoint (coarse-pointer).

## Self-reflection

**What went well:** All three items were genuinely fix-once — no app files
touched at all. The no-WebGL verification proved the containment design choice
(probe in Canvas3D rather than only the boundary) right: the workspace chrome
surviving makes the failure feel local, not fatal.

**What to watch:** The clamp runs at layout application, not on window resize —
resizing smaller after opening can still push panels off-stage until the next
layout pick. Acceptable for now (the review's bug was at load), noted as a
possible follow-up. `PANEL_W = 268` duplicates the CSS width constant.

**Follow-up value:** MEDIUM — the deferred editorial items are the remaining
half of the external review, and they need Dan's choices before implementation.
