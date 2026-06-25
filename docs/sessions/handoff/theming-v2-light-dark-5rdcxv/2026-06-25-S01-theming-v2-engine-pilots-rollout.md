---
kind: handoff
session: 2026-06-25-S01
date: 2026-06-25
title: Theming v2 — identity × mode engine + Trinary/Worlds + suite rollout (PR #239)
branch: claude/theming-v2-light-dark-5rdcxv
slug: theming-v2-light-dark-5rdcxv
status: in-progress
build: passed
followup: null
pr: 239
app: chrome, trinary, polygon-worlds, solid-worlds, plane-transform
signals: needs-dan, visual-unverified
next: Finish the rollout — Argand (equation-identity colors → theme-dynamic), Trees & Nets, Agentic Sorting, TrinaryLab console, Worlds walk-pad/instruction HUD + spherical sky-dome retint.
---

# Theming v2 — identity × mode engine + Trinary/Worlds + suite rollout

## Summary

Built the **theming v2 engine** (each theme is an *identity* with three *modes*:
native/light/dark) and rolled the "every color tracks the theme" contract across
most of the app suite. **PR #239** is open, CI green (lint/smoke + Cloudflare),
Cloudflare preview live at `https://claude-theming-v2-light-dark.animath.pages.dev`.
Build green, lint at the 60-warning baseline (no new), 88 tests throughout.

**Dan's standard (adopted):** "for each app, list out every color and colormap,
mark the hardcoded ones, and assign each to a theme value." Mapping rules:
identity sets → `--data` slots; structure → neutrals (`--dim`/`--dim-2`/`--fg`);
focal/UI → `--accent`/`--accent-2` (never data); ordered/outcome data → registry
colormaps; text → theme fonts. **Physical light** (fire, lamps, the insolation
sky) stays warm by design — it depicts light, not data.

## The engine (Phase 0)

- **`theme.css`** — every mode-varying token is a family: `--x-n` native source +
  sparse `--x-lt`/`--x-dk` companions; shared `[data-scheme=native|light|dark]`
  blocks map the consumed `--x` with native fallback (so "dark = native" is free).
  Leak-proof under nesting → paired blocks, not `light-dark()`. All 8 themes have
  all three modes (incl. the beige-case light Phosphor).
- **`skins.tsx`** — `data-scheme` = the user's mode (default native); `ThemeMode`,
  `resolveScheme`, `useThemeMode`/`useThemeModeId`; picker has a Native/Light/Dark
  toggle. **`Scheme.tsx`** = `<Scheme mode>` force-mode primitive.
  **`useThemeTokens.ts`** = reactive canvas token reader (+ `readThemeTokens`).
- **`colormapRegistry.ts`** — added `sampleContinuous`, `lerpStops`, exported `hexToRgb`.

## Rollout status

| App | State |
|---|---|
| chrome engine | ✅ |
| Trinary (scene force-dark, timeline, **Lab Destiny Map** fate/chaos/stat) | ✅ |
| Polygon Worlds (day/night sky + **full decor**) | ✅ |
| Solid Worlds (sky + decor + diagnostic + rooms + HUDs + **avatars**) | ✅ |
| Plane Transform (viewport/pane/stroke/pill) | ✅ |
| Fractals GPU · Correspondence · Counting the Ways · Stable Matching | ✅ already clean |
| **Argand** | ⏳ equation-identity colors |
| **Trees & Nets** · **Agentic Sorting** | ⏳ |
| TrinaryLab console stat-text/histograms · Worlds walk-pad/instruction HUD · spherical sky-dome retint | ⏳ loose ends |

## Decisions locked (with Dan, this session)

- **Outcomes → divergent registry colormap** sampled by goodness (coolwarm
  flipped so good = cool pole). Used in Trinary's Observatory timeline *and* the
  Lab fate map. Chaos/stat → **sequential** registry maps.
- **Identity → spread `--data` slots** (Trinary stars 1·4·6, not adjacent 1·2·3)
  so hues read distinct. Dan: the data palette may itself need wider separation in
  some themes — a possible palette-quality follow-up.
- **Worlds = day/night by mode** via a default `auto` look (light→daytime,
  dark→moonlit); manual looks override.

## Key files

| File | Role |
|---|---|
| `src/chrome/theme.css` | family-var tokens + shared mode blocks (the engine) |
| `src/chrome/skins.tsx` · `Scheme.tsx` · `useThemeTokens.ts` | mode model, force-mode, canvas hook |
| `src/lib/colormapRegistry.ts` | `sampleContinuous`/`lerpStops`/`hexToRgb` |
| `src/animations/TrinaryStars/{TrinaryStars,Observatory}.tsx`, `lab/{BasinMap,MiniSim,themeColors}.ts(x)` | Trinary scene + divergence + Lab |
| `src/animations/PolygonWorlds/decor.ts` (`setDecorPalette`/`getDecorPalette`) | Polygon decor palette |
| `src/animations/SolidWorlds/decor/rooms.ts` (`setRoomPalette`), `coverEngine.ts` (`DiagPalette`, avatars), `SolidWorlds.tsx` (HUD) | Solid decor + HUD |

## How to resume the rollout

The two reusable patterns:
1. **DOM/SVG/canvas (React):** read tokens with `useThemeId` + `getComputedStyle`
   (or `useThemeTokens`); for canvas, keep a palette ref refreshed on `themeId`
   and redraw. Inline styles can use `var(--token)` directly (live).
2. **Imperative 3D engines (built once):** read a palette at build; recolor live
   by depending the React rebuild effect on `themeId`/`themeMode` (Worlds pattern),
   or keep material refs + an `applyPalette()` (Trinary scene pattern).

**Argand** specifically: the exported color consts in `ArgandPlane.tsx`
(`Z_COL/A1_COL/A0_COL/A2_COL/F_COL/FIX_COL/CRIT_COL`) are equation-coded
identities used in *both* the SVG plane and the `Argand.tsx` panel labels — make
them theme-dynamic (a `useArgandColors()` hook → `--data` slots: z=1, α₁=5, α₀=7,
α₂=6, f=2, z*=4, crit=`--dim`) and thread through both files so the equation
color-coding stays consistent.

## Verification

Headless screenshots read for every milestone (gallery, Stable Matching, Trinary
Observatory+Lab, both Worlds across themes/modes). Caveat: headless WebGL is
SwiftShader, not a real GPU — color/contrast claims are about CSS/token resolution
which the shots show faithfully; live-switch verified at-load + via the reactive
`useThemeId` path (Phase 0 proved a real click-switch). The Lab needed a scripted
"Render map" click to exercise.

## Self-reflection

1. **What would you do with another session?** Finish the rollout: Argand
   (equation colors), Trees & Nets, Agentic Sorting, then the loose ends, each
   audited per Dan's rule and screenshot-verified.
2. **What would you change about what you produced?** Some 3D decor recolors via a
   full engine *rebuild* on theme switch (Worlds), which resets the walker to
   center — acceptable but slightly jarring; a material-ref `applyPalette` (like
   the Trinary scene) would be smoother if it matters.
3. **What were you not asked that you think is important?** Whether the `--data`
   palettes themselves need wider hue separation (Dan flagged the stars). A
   palette-quality pass on `theme.css` `--data-*` could help every identity viz at
   once.
4. **What did we both overlook?** The default Solid Worlds decor is *Diagnostic*,
   not *Rooms* — easy to theme only Rooms and miss the actual default view (caught
   and fixed). Lesson: check the default mode/state before declaring an app done.
5. **What did you find difficult?** Deciding realism-vs-theming for decor (trees,
   fire, suns). Resolved by a rule: physical light stays physical; everything else
   tracks tokens.
6. **What would have made this task easier?** A shared "scene palette from tokens"
   helper — each 3D app reimplements a `readPalette()`/`setPalette()`; a small
   `lib/scenePalette.ts` could dedupe the pattern across Trinary/Worlds/future apps.
7. **How did you verify, and does each check test the user-visible claim?** Build +
   lint + tests by running them; theming by headless screenshots I actually read,
   across themes/modes, per app. The claims are about token resolution, which the
   shots show. Live-switch-without-reload for the heavy 3D decor is wired (rebuild
   on `themeId`) but only verified at-load, not by a headless click — flagged.
8. **Follow-up value:** MEDIUM — the engine + the heavy WebGL apps are done and
   verified; the remainder is a well-scoped, mechanical continuation of the same
   audit→map pattern (Argand/Trees/Agentic + loose ends), with the Argand approach
   spelled out above.
