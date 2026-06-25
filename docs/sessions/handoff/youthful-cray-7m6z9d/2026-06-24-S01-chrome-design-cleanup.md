---
kind: handoff
session: 2026-06-24-S01
date: 2026-06-24
title: Chrome design cleanup — design-contract hardening (PR #238) + theming-v2 plan
branch: claude/youthful-cray-7m6z9d
slug: youthful-cray-7m6z9d
status: completed
build: passed
followup: null
pr: 238
app: chrome
signals: needs-dan, visual-unverified
next: Merge #238 (chrome contract + foundations, CI green) when ready; then execute the theming-v2 plan (2026-06-24-S02-plan-light-dark-theming.md) next session.
---

# Chrome design cleanup — design-contract hardening (PR #238) + theming-v2 plan

## Summary

Executed the **Claude Design** "design-system hardening" work order (attached zip),
then — at Dan's steer — went deeper into the cross-app design contract and scoped the
next initiative. **PR #238** is open, CI green, **merge-ready**: it delivers semantic/
data tokens on every skin + 3 new skins, a typed colormap registry, per-app transport/
compliance fixes, reactive skin-switching, light-skin contrast fixes, and per-skin
gallery previews. The deeper "every app's *visualization* tracks the skin" work is
written up as a **proposed plan** ([theming v2](2026-06-24-S02-plan-light-dark-theming.md))
for next session. Trinary's UI was tokenized this session as the partial reference.

## What changed (all in PR #238)

- **Tokens & skins** (`theme.css`, `skins.tsx`): `--danger/--success(-soft)`,
  `--shadow-1/2/3`, `--data-1…7`, `--font-scale` on all skins; **3 new skins**
  (Daylight, Primary, Mirage). A `light` flag + `isLightSkin()`, `useThemeId()`, and a
  root `data-scheme` attribute.
- **`useSkin` made reactive** — derives from the live `data-theme` (via `useThemeId`)
  instead of a private `useState`, so skin changes re-theme **everything live, no
  refresh**. This was the root-cause fix for the gallery previews lagging until reload
  (independent `useSkin` instances never synced). Verified with a headless live-switch.
- **Colormap registry** (`lib/colormapRegistry.ts` + `<ColormapPicker>` + 10 tests):
  per-theme maps by family (sequential/divergent/discrete/cyclic); discrete = the skin's
  `--data` tokens. Shader apps stay on GLSL.
- **Per-app compliance**: Stable Matching (reference — transport→strip, matrix via
  registry, CSS tokenized, **light-on-light fixed**); Agentic Sorting + Counting the
  Ways (transport dedup); Trinary (dedup + mode rename **Explore** + Lab transport→strip
  + **UI/HUD tokenized**); Argand (feed single-homed, fullscreen-safe); Correspondence
  (transport→strip). Gallery previews theme per-skin.
- **Review fixes**: Argand fullscreen feed access; light-skin `<select>` rendering
  (via `data-scheme`).

## Key files

| File | Role |
|---|---|
| [`src/chrome/skins.tsx`](https://github.com/piyarsquare/animath/blob/0794709aa93b7362857d424151031f25ab257342/src/chrome/skins.tsx) | reactive `useSkin`/`useThemeId`, `isLightSkin`, `data-scheme`, 8 skins (the live-theming fix) |
| [`src/chrome/theme.css`](https://github.com/piyarsquare/animath/blob/0794709aa93b7362857d424151031f25ab257342/src/chrome/theme.css) | all token blocks + 3 new skins + Phosphor `--font-scale` zoom |
| [`src/lib/colormapRegistry.ts`](https://github.com/piyarsquare/animath/blob/0794709aa93b7362857d424151031f25ab257342/src/lib/colormapRegistry.ts) | the per-theme colormap registry (data-voice colors for DOM apps) |
| [`src/chrome/previews.tsx`](https://github.com/piyarsquare/animath/blob/0794709aa93b7362857d424151031f25ab257342/src/chrome/previews.tsx) | `themeInk()` — gallery previews read live tokens per skin |
| [`src/animations/StableMatching/StableMatching.tsx`](https://github.com/piyarsquare/animath/blob/0794709aa93b7362857d424151031f25ab257342/src/animations/StableMatching/StableMatching.tsx) | the chrome reference + the light-on-light → per-skin-token fix |
| [`docs/sessions/progress/youthful-cray-7m6z9d/2026-06-24-S02-plan-light-dark-theming.md`](https://github.com/piyarsquare/animath/blob/0794709aa93b7362857d424151031f25ab257342/docs/sessions/progress/youthful-cray-7m6z9d/2026-06-24-S02-plan-light-dark-theming.md) | **the theming-v2 plan — the next session's spec** |

## Open / not done

- **Merge #238** when Dan's reviewed — it's a clean "chrome contract + foundations"
  stopping point (build/lint/test green; both light skins contrast-verified).
- **Theming v2** (the plan): light/dark-*paired* themes so every app's viz tracks the
  skin. Folds in: Trinary scene/data recolor, the other WebGL apps, Agentic Sorting's
  deferred discrete-colormap, the Worlds' day/night skies.
- The transient `trigger-deploy` CI red on `0794709` is a GitHub-API 504 (it dispatches
  *main's* deploy; harmless to the PR; clears on next push — my integration can't
  re-run it, 403).

## Context

> [!IMPORTANT]
> The session's design conclusions (locked with Dan, in the v2 plan): **`--accent` is
> UI-voice only** (never encodes data); **data voice** = the colormap registry / `--data`
> / `--success`-`--danger`. **Ordered/polar data** (temperature, good→bad) → *sample a
> registry colormap*; **identity** (stars) → discrete `--data`; **planet** → a neutral.
> The linchpin: scenes that must stay dark want **light/dark-paired themes** — force the
> scene subtree to the theme's dark mode and its objects use the normal tokens at dark
> values (no bespoke scene palette). The `data-scheme` attribute added this session is
> that switch.

> [!NOTE]
> `useSkin()` returns a per-call `useState`; before the fix, a *reader* instance
> (Gallery) never saw a *writer* instance (TopBar SkinPicker). It now derives from the
> DOM attribute, so all consumers stay in sync. Any new "read the current skin" code
> should use `useThemeId()` (reactive), not a fresh `useSkin()[0]`.

## Self-reflection

1. **What would you do with another session?** Execute theming-v2 Phase 0 (the theme
   engine: `light-dark()` token pairs + the missing light/dark companions + the
   force-mode primitive + a canvas token hook), then the Trinary scene and Worlds
   day/night pilots — per the plan.
2. **What would you change about what you produced?** The Trinary "reference" ships in a
   half-state (UI tokenized, scene/data hardcoded). It's a real improvement and the
   deferral is deliberate (v2 makes the rest clean), but a reviewer seeing only the diff
   might read it as inconsistent — the PR body now flags it.
3. **What were you not asked that you think is important?** Whether #238 should be split
   — it grew well past the original 4-phase work order (gallery theming, reactive skins,
   light-on-light, Trinary UI all came from live feedback). It's coherent as "chrome
   contract + foundations," but it's large; I kept it as one PR for continuity.
4. **What did we both overlook?** That tokenizing Stable Matching's panels to follow the
   skin would expose *light-on-light* — fixed-light semantic text (the lattice `#fff`
   fallback, the metric green) was invisible once the panel went white. Caught by Dan in
   Daylight, not by me. Lesson logged: when a background starts following the skin, the
   text on it must too.
5. **What did you find difficult?** Drawing the keep-vs-tokenize line on viz colors —
   much of it is meaningful (rainbow domain, rank ramps, star fields), and the honest
   answer turned out to need an architecture change (light/dark pairs), not a heuristic.
6. **What would have made this task easier?** A `light-dark()`-based theme engine from
   the start — it dissolves the "scene needs its own palette" problem that consumed much
   of the Trinary discussion.
7. **How did you verify this, and does each passing check test the user-visible claim?**
   Mixed, mostly real: build/lint/test by running them (88 tests green); the reactive-
   skin fix by a **headless live-switch test** (load gallery dark → click picker →
   Daylight, no reload → re-themed, the exact user claim); the light-on-light fix and
   every skin by **headless screenshots I actually read** (Daylight/Primary/Phosphor/
   Mirage/dark across the changed apps). Caveat: headless WebGL is SwiftShader, not a
   real GPU, so colors aren't pixel-true and touch/real-device behavior is unverified —
   but the contrast and theming claims are about CSS/token resolution, which the shots
   show faithfully. No green check here stands in for an unmet claim.
8. **Follow-up value:** LOW — #238 is complete and verified; the remaining work
   (theming v2) is a separate, fully-specified initiative, and the one Dan-owned decision
   (merge timing) is tracked.
