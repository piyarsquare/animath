---
kind: progress
session: 2026-06-25-S01
date: 2026-06-25
title: Theming v2 — light/dark-paired theme engine (Phase 0) + pilots
branch: claude/theming-v2-light-dark-5rdcxv
slug: theming-v2-light-dark-5rdcxv
status: in-progress
build: unknown
followup: null
pr: null
app: chrome, trinary, polygon-worlds, solid-worlds
signals: needs-dan, visual-unverified
next: Execute Phase 0 — convert theme.css tokens to light-dark() pairs + author the missing light/dark companions, then add the <Scheme mode> force-mode primitive + useThemeTokens() canvas hook + identity×mode picker.
---

# Theming v2 — light/dark-paired theme engine (Phase 0) + pilots

## Session purpose

Decouple a theme's **color identity** from its **light/dark mode**. Every theme
gets both a LIGHT and a DARK palette under shared token names (via CSS
`light-dark()`), so a feature that *requires* a mode (star fields / glowing
particle stages → dark; print → light) forces it on its own subtree and its
objects use the **normal tokens at that mode's values** — no bespoke per-app
scene palette — and every app's *visualization* tracks the skin, not just the
chrome.

Scope this session: **Phase 0 (the theme engine)** then the **two pilots**.

- **Phase 0** — convert `theme.css` tokens to `light-dark()` pairs; author the
  missing companions (light Phosphor = the 1980s beige case, light Neon/Mirage,
  dark Primary; theme-tinted darks); add the `<Scheme mode>` force-mode
  primitive, a canvas "read resolved tokens + redraw on change" hook
  (`useThemeTokens()`), and an identity + mode picker.
- **Pilots** — Trinary's star scene (force-dark; stars→discrete `--data`,
  planet→neutral, outcomes→divergent registry colormap) and the Worlds'
  day/night skies (mode = time of day).

## Previous session

First tracked session on this branch (fresh off `main` after PR #238 merged).
The locked spec lives on `main` at
[`youthful-cray-7m6z9d/2026-06-24-S02-plan-light-dark-theming.md`](../youthful-cray-7m6z9d/2026-06-24-S02-plan-light-dark-theming.md);
the foundations (chrome token contract, colormap registry, `data-scheme`
attribute, reactive `useSkin`/`useThemeId`) shipped in
[its S01 handoff](../../handoff/youthful-cray-7m6z9d/2026-06-24-S01-chrome-design-cleanup.md).

## Decisions locked (carried from the plan)

> [!IMPORTANT]
> These are settled — do not relitigate:
> - **`--accent`/`--accent-2` are UI-voice only** — interaction/identity, never data.
> - **Ordered/polar data** (temperature, good→bad outcomes) → *sample a registry
>   colormap* (divergent by goodness; chaos/stat ramps → sequential).
> - **Identity** (the three stars) → discrete `--data` slots of the forced-dark variant.
> - **Planet** → a neutral (the calm subject vs the vivid stars).
> - **Worlds skies = day/night by mode** — light mode = day sky, dark = night sky.
> - **Phosphor's light analog = the 1980s beige computer case** (not the CRT glass).
> - **Worlds skies** use theme colors; the mode *is* the time of day.

## Open questions (to resolve in Phase 0)

- `light-dark()` vs paired `[data-scheme]` blocks — pick after a quick
  browser-support check against the project's targets.
- Mode toggle: global-only, or also per-identity default mode?
- Exact divergent map for outcomes (custom `--success`→`--danger`, or a registry
  entry like RdYlGn) — decide when wiring the Trinary pilot.

## Working notes

<!-- Newest entry first. -->

### 🟡 milestone · 00:03 — Session started; plan read, branch oriented
**Why:** New branch off `main`; need the durable record before any code.

Fresh branch `claude/theming-v2-light-dark-5rdcxv` off `main` (tip `26e00dc`,
the PR #238 merge — chrome contract + foundations). No prior handoff for this
branch; this is the first tracked session.

Read the locked plan
(`youthful-cray-7m6z9d/2026-06-24-S02-plan-light-dark-theming.md`), the
predecessor handoff (#238), and the TODO backlog (theming-v2 is the `!high`
chrome item). Oriented on the two engine files:

- `src/chrome/theme.css` (877 lines) — **8 fixed skins** today, each a single
  `[data-theme="…"]` block: `dark` (Observatory), `light` (Paper), `neon`
  (Spectrum), `blueprint`, `phosphor`, `daylight`, `primary`, `mirage`. No
  light/dark pairing yet — that's the Phase 0 conversion target.
- `src/chrome/skins.tsx` — `SKINS[]` registry, `isLightSkin()`, reactive
  `useSkin`/`useThemeId`, `applySkinAttrs()` (sets `data-theme` + `data-scheme`),
  `SkinPicker`. The `data-scheme` attribute is already the mode switch; the
  picker is identity-only today and needs the mode axis added.

Awaiting Dan's direction on where to begin within Phase 0.
