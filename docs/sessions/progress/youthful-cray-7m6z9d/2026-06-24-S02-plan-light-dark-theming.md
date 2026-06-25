---
kind: plan
session: 2026-06-24-S02
date: 2026-06-24
title: Theming v2 — light/dark-paired themes (decouple identity from mode)
branch: claude/youthful-cray-7m6z9d
slug: youthful-cray-7m6z9d
status: proposed
build: unknown
followup: null
pr: null
app: chrome
signals: needs-dan
next: Execute Phase 0 (theme engine) — convert theme.css tokens to light-dark() pairs + add the missing light/dark companions, then the force-mode primitive + canvas token hook.
---

# Theming v2 — light/dark-paired themes (decouple identity from mode)

> [!NOTE]
> A **proposed** plan, scoped this session (`youthful-cray-7m6z9d`) on top of the
> chrome-hardening PR #238. Execute next session. This is the durable spec.

## Goal

Make each **theme** an *identity* that exists in **both a light and a dark mode**,
under shared token names, so:

- the user picks an identity + mode (or the identity's default mode);
- a feature that **requires** a mode (a glowing particle stage, a star field →
  dark; a printout → light) forces it on its own subtree, and every token there
  resolves to *that theme's* values for *that mode*;
- everything else just inherits the user's choice.

This dissolves the "the viz uses its own color scheme" problem the owner raised:
once a dark-required scene forces dark mode, its objects use the **normal tokens**
(`--data`, `--fg`, a neutral) resolved at the theme's dark values — no bespoke
per-app scene palette. The dark variant is **theme-tinted** (Observatory blue-black,
Blueprint drafting-blue, Mirage plum), so a forced-dark star field still carries the
theme's character — not generic black.

## Why (the problem this solves)

Today a "skin" conflates a color **identity** (Observatory gold, Phosphor green…)
with a **mode** (light/dark): 8 skins, 5 dark + 3 light, each fixed. Contexts that
*need* a surface (the always-dark star stage, additive-glow particles) can't ride
the normal tokens, because `--data`/`--fg` are tuned to the skin's background and
flip on light skins (in Daylight they go dark → invisible on a black scene). The
result is apps hardcoding their own on-dark palettes — "each app its own scheme."

## The architecture

1. **Tokens carry both modes.** Define each token with the native CSS
   `light-dark(<light>, <dark>)` and drive selection by `color-scheme`. One line
   carries both values; no doubled blocks. (Conservative fallback if `light-dark()`
   support is a concern: paired `[data-theme=x][data-scheme=light|dark]` blocks +
   the scene wrapper carrying `data-theme` + `data-scheme`.)
2. **Mode axis already exists.** The `data-scheme="light|dark"` attribute added in
   PR #238 (for native `<select>` rendering) is the switch. The root carries the
   user's chosen mode; `color-scheme` follows it.
3. **Force-mode primitive.** A tiny `<Scheme mode="dark">` wrapper (sets
   `color-scheme: dark` / `data-scheme`) any feature drops around a surface that
   requires a mode. Under it, `light-dark()` tokens resolve to that mode.
4. **Identity × mode picker.** The SkinPicker becomes identity list + a mode toggle.
   `useSkin`/`useThemeId` carry mode (persisted).

## The app contract (every app respects these 4 rules)

1. **No hardcoded color** — every color is a token or a registry colormap, so it
   resolves to the current theme × mode.
2. **Declare a mode requirement** — a surface that needs dark (glow, star field) or
   light wraps itself in `<Scheme mode>`; everything else inherits the user's choice.
3. **Canvas/WebGL reads tokens reactively** — engines read the *resolved* token
   values (`getComputedStyle`) and redraw on theme/mode change (`useThemeId` is the
   trigger; formalize a `useThemeTokens()` hook).
4. **Data voice ≠ UI voice** — data uses the registry / `--data` / `--success` /
   `--danger`; `--accent`/`--accent-2` stay UI-only (interaction/identity), never
   data.

## Per-app blast radius

| App | Surface | Mode need | Work |
|---|---|---|---|
| **Stable Matching** | DOM/SVG | agnostic | ✓ none — already tokens + registry |
| **Counting the Ways** | DOM/SVG | agnostic | ✓ none — already token-clean |
| **Argand** | SVG | agnostic | small: bg→`--viz-bg`, marks→`--data` identity |
| **Trees & Nets** | SVG + 3D | agnostic | small: tokenize SVG colors |
| **Agentic Sorting** | DOM + canvas | agnostic | medium: agents→discrete `--data` (registry), canvas reads tokens + redraws |
| **Fractals GPU** | shader | agnostic | small: viewport bg→`--viz-bg`; keep palette |
| **Correspondence** | shader | agnostic | small: same as Fractals |
| **Plane Transform** | shader panes | agnostic | small: pane bg→`--viz-bg`, draw accents→tokens; keep rainbow |
| **Complex Particles** | WebGL glow | **needs dark** | medium: force-dark; clear-color→dark `--viz-bg`; read tokens + redraw; keep GLSL domain palette |
| **Trinary** | WebGL scene + DOM | scene **needs dark** | medium: force-dark scene (stars/planet/ghost from dark tokens); HUD/Lab done (#238); outcomes→registry divergent; mini-canvases read tokens |
| **Topology Walk** | WebGL immersive | **needs dark** | low (retiring): force-dark + look |
| **Polygon / Solid Worlds** | WebGL sky walkers | **day/night by mode** | medium: sky + lighting follow the theme's light/dark (day=light, night=dark); HUD→tokens |

**Pattern:** DOM/SVG apps mostly *just work* once tokenized (two already do); the
real plumbing is the WebGL/canvas apps (force-mode wrapper + token-reading + redraw).

## Decisions locked this session

- **Worlds skies = day/night by mode**, using theme colors (light mode = day sky,
  dark mode = night sky). The mode *is* the time of day.
- **Outcomes** (Trinary climate, sim outcomes, census bins) → **sample a divergent
  colormap** by goodness/polarity (happy at the good end, failures clustered toward
  bad). Chaos ramp + stat magma → registry sequential maps. The colormap carries the
  ordering, so "cold = blue" stops being an arbitrary `--data` pick.
- **Stars** = three *distinct identities* (colored by index, no temperature meaning)
  → discrete `--data` slots of the **forced-dark** variant (read bright-on-dark, and
  theme-tinted automatically). Not a colormap, not `--accent`.
- **Planet** = distinct identity, **neutral** ("the calm subject" vs the vivid
  stars) → the dark variant's neutral (`--fg`/a neutral token under forced-dark).
- **`--accent` is UI-only** — interaction/identity, never data.
- **Phosphor gets a light analog** — the beige 1980s computer *case* (not the CRT
  glass). Every identity gets both modes; where an identity is mode-intrinsic, the
  companion variant primarily serves forced-mode subtrees.

## Phasing

- **Phase 0 — Theme engine (prerequisite, the bulk).** `theme.css` → `light-dark()`
  token pairs; author the missing companions (light Phosphor/Neon/Mirage, dark
  Primary, theme-tinted darks). `skins.tsx`/picker → identity + mode model + toggle;
  `useSkin`/`useThemeId` carry mode. The `<Scheme mode>` primitive + `useThemeTokens()`
  canvas hook. Verify all identities × both modes across the chrome.
- **Phase 1 — Pilots.** Trinary star scene (force-dark, stars/planet/ghost from dark
  tokens, outcomes via divergent registry) and the Worlds (day/night sky). These two
  prove the force-mode + canvas-token path end-to-end.
- **Phase 2 — Roll out** the contract to the remaining WebGL/canvas apps (Complex
  Particles, Plane Transform, Fractals, Correspondence, Trees) + finish the
  DOM tokenization (Agentic discrete-registry, Argand marks).
- **Phase 3 — Sweep & verify** every app × every identity × both modes (tour across
  skins+modes); update DESIGN-SPEC + PARAM-MAP.

## Open questions (small)

- `light-dark()` vs paired `[data-scheme]` blocks — pick in Phase 0 after a quick
  browser-support check against the project's targets.
- Whether the mode toggle is global-only or also per-identity-default (some
  identities prefer one mode by default).
- Exact divergent map for outcomes (`--success`→`--danger` custom, or a registry
  entry like RdYlGn) — decide when wiring Phase 1.

## Relationship to PR #238

#238 delivers the chrome contract + foundations this builds on: the token set, the
3 new skins, the **colormap registry**, per-app transport/compliance, the **reactive
`useSkin`/`useThemeId`**, the `data-scheme` attribute, and the **Trinary UI/HUD
tokenization** (the partial reference — scene/data deferred here, intentionally, so
v2's force-dark mechanism makes it nearly free). #238 is a clean merge point; this is
the next initiative.
