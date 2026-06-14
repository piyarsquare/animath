---
kind: progress
session: 2026-06-13-S01
date: 2026-06-13
title: Mobile workspace full-height fix (dvh)
branch: claude/mobile-fullscreen-panel-height-7014r5
slug: mobile-fullscreen-panel-height-7014r5
status: completed
build: passed
followup: low
pr: https://github.com/piyarsquare/animath/pull/215
app: chrome
---

# Mobile workspace full-height fix (dvh)

## Session purpose

On mobile, a fullscreen panel (and the default immersive view) did not extend
the full screen — a dotted dead band showed at the bottom. Find why and fix it.

## Previous session

First tracked session on this branch (no `/start-session` was run; report
written retroactively).

## Working notes

<!-- Newest entry first. -->

### 🟢 code · 13:55 — Switch the root height chain to dynamic viewport units
**Why:** `height: 100%` doesn't track the mobile visible viewport; `dvh` does.

- `index.html`: `#root { height: 100%; height: 100dvh; }` (the `100%` line is the
  fallback for browsers without `dvh`). Everything below inherits from it.
- `src/chrome/theme.css`: pinned the explicit fullscreen card to `height: 100dvh`
  (`.am-phone-view.am-ws-full`), since `position: fixed; inset: 0` is unreliable
  under iOS's dynamic toolbar.

Build passed; lint at baseline. Merged as #215.

### 🔵 finding · 13:50 — Root cause: a pure `height: 100%` chain
**Why:** the dead band is the `.am-phone-scroll` stage background showing through.

The full-height layout chains percentage heights `html → body → #root → .am-app
→ .am-phone-scroll → .am-phone-view` (the view is `flex: 1 1 0`). On a real
mobile browser `height: 100%` resolves against the initial containing block,
which does **not** follow the visible viewport as the address bar shows/retracts
— so the content box ends up shorter than the screen and the bottom strip falls
through to the dotted stage. No `transform`/`filter`/`contain` on any ancestor
(ruled out the containing-block theory).

### 🔵 finding · 13:42 — Reproduces only on real mobile, not headless
**Why:** narrows the cause to the dynamic-toolbar viewport, not the CSS itself.

Headless Chromium at a phone viewport (390×844) fills correctly in both the
immersive and explicit-fullscreen states (`getBoundingClientRect` → full 844),
because software Chromium has no dynamic toolbar. So the bug is the
`100%`-vs-`dvh` mismatch that only a real mobile browser exhibits.

## Self-reflection

**Follow-up value:** LOW

The fix is the canonical `dvh` remedy and is verified not to regress in headless,
but I could **not reproduce the actual failure** here (no dynamic toolbar in
SwiftShader/headless), so real-device confirmation was deferred to the user. The
pattern worth remembering: any future full-bleed mobile surface should start from
`dvh`, never a `height: 100%` chain. Low follow-up because the change is small,
isolated to two lines, and already merged.
