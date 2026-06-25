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

### 🟣 decision · 00:18 — Adjusted model (Dan) + the CSS engine architecture
**Why:** Dan refined the two-mode plan into **three** modes, and the three-mode
requirement settles the long-open `light-dark()`-vs-paired-blocks question — and
forces a specific variable structure to make it leak-proof under nesting.

**Dan's adjusted model.** Each theme has its own **native** mode *plus* a **light**
and a **dark** mode (three value-sets per element, often equal). **Default =
native**; light and dark are **overrides**. Any element may draw from native,
light, or dark. A theme may opt to set "dark = native for all elements" (e.g.
Observatory) — that must be **free** (no re-authoring).

> [!IMPORTANT]
> **`light-dark()` is out** — it carries exactly two values; we need three
> (native/light/dark). So the engine is **paired `[data-scheme]` blocks** keyed
> on a three-valued mode attribute. (Resolves Phase-0 open question #1.)

**The variable architecture (family vars + fallback).** The naive "sparse
descendant-override" approach **leaks** under force-mode nesting: a force-dark
subtree under a *light* root inherits the root's light deltas for any token the
dark block doesn't restate — so "dark = native" can't be the empty block Dan
wants. Fix: three namespaces.

- **Consumed token** `--bg` — what all CSS/JS reads. Set *only* by the shared mode
  blocks (never authored per-theme directly).
- **Native source** `--bg-n` — the theme's native value (today's values, renamed).
- **Companions** `--bg-lt` / `--bg-dk` — sparse light/dark overrides (omit ⇒ native).

Shared, theme-independent blocks do the mode selection (with native fallback, so
an omitted companion costs nothing):

```css
[data-theme]            { --bg: var(--bg-n); … }                  /* native default */
[data-scheme="light"]   { color-scheme: light; --bg: var(--bg-lt, var(--bg-n)); … }
[data-scheme="dark"]    { color-scheme: dark;  --bg: var(--bg-dk, var(--bg-n)); … }
```

Per-theme blocks shrink to **palette data only**: native sources `--bg-n…` (+ the
intrinsic `color-scheme`) plus whatever sparse `-lt`/`-dk` companions that theme
needs. The consumed-token plumbing lives once in the shared blocks. This is
leak-proof (a forced subtree's `[data-scheme]` rule re-derives every consumed
token from inherited family members) **and** makes "dark = native" free (omit the
`-dk` companions → fallback to `-n`). Only the ~32 mode-varying color/shadow tokens
get families; structural tokens (z-layers, radii, fonts, eases) stay plain.

**Attribute semantics change.** `data-scheme` is repurposed from "derived
light/dark (for `<select>` UA rendering)" to **the user's chosen mode**
(`native` default · `light` · `dark`); the root carries identity (`data-theme`) ×
mode (`data-scheme`), both persisted. `<Scheme mode>` sets `data-scheme` on a
subtree. `color-scheme` (for native widgets) comes from the theme block in native
and from the mode blocks when forced — `<select>` rendering stays correct.

**Build order (de-risk the engine before 8× design authoring):** shared blocks +
convention → convert all 8 themes to family vars (mechanical rename, dark=native
free) → `<Scheme>` primitive + `useThemeMode`/`useThemeTokens` hooks + picker mode
toggle → author the missing companions (light Phosphor/Neon/Mirage, dark Primary,
theme-tinted darks) → verify every identity × 3 modes via screenshots. Then the
Trinary divergence-map pilot (Dan wants to eyeball it).

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
