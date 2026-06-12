---
kind: handoff
session: 2026-06-12-S01
date: 2026-06-12
title: Bounded orbit · mobile layout · checkboxes · loading screen · randomized hero
branch: claude/particle-rotation-mobile-layout-nlworx
slug: particle-rotation-mobile-layout-nlworx
status: completed
build: passing
followup: null
pr: null
app: complex-particles, chrome
---

# Bounded orbit · mobile layout · checkboxes · loading screen · randomized hero

> [!NOTE]
> A user-driven polish session: nine small, mostly independent fixes across the
> particle viewer and the workspace chrome. All committed and pushed to the
> branch; no PR opened yet (user has not asked).

## Summary

A sweep of UX fixes requested live by the user, one after another. Started with
two Complex Particles asks (restore the bounded camera orbit; make mobile views
fill the screen) and grew into a chrome-wide polish pass: visible checkboxes in
every skin, mobile sheet layering, a branded loading screen, single-tap menu
dismiss, per-skin `color-scheme`, no first-paint skin flash, and a "package
drop" randomized landing hero. Build/lint/tests green throughout (`tsc && vite
build` passes; `npm test` 22/22; `npm run lint` 0 errors, 60 baseline warnings).
Everything verified with headless screenshots + scripted interaction.

## What changed

1. **Bounded "turntable" orbit is the default again** (was a free trackball that
   was hard to recenter). New persisted `orbitMode` (`turntable` | `free`) with
   a Camera-panel **Orbit** toggle. Turntable accumulates azimuth/elevation in
   refs → writes `camQuat`, so pan/reset/Hopf-ambient-orbit are unchanged; a
   drag re-syncs from the current orientation on pointer-down.
2. **Mobile views fill the screen.** Phone top bar floats as a translucent pill;
   view cards flex-fill the stage. **Single-view apps go full-bleed (immersive)**
   with the bar + dock overlaid and a floating full-screen button to escape to
   chrome-free fullscreen. Multi-view apps split the stage.
3. **Checkboxes visible in every skin.** Native checkboxes painted from the
   unset page `color-scheme`, so light-accent skins (Blueprint) lost the box.
   Replaced with one global token-styled `input[type="checkbox"]` in theme.css.
4. **Phone bottom sheet sits above the action strip** (was z 50 vs actionbar
   130 — buttons poked through). Lifted sheet/scrim to 135/136.
5. **Branded loading screen** for lazy routes (was a blank div): pulsing brand
   mark + spinning accent ring, skin-aware. Wired in `index.tsx` + `App.tsx`.
6. **Single-tap menu dismiss on mobile.** Scrims dismissed on `onClick` on bare
   divs (Safari needs two taps); switched to `onPointerDown` + `cursor:pointer`.
7. **`color-scheme` per skin** so native selects/scrollbars match.
8. **No first-paint skin flash** — `index.html` boot script seeds `data-theme`
   + per-skin body background before the bundle loads.
9. **Randomized landing hero** (package drop): "Small worlds you can A, B, and
   C." — three random verbs, strangest last, click-to-reroll with cross-fade.
   Blueprint verbs use `--accent-2` (its accent == fg); Phosphor title drops to
   30px (mono display font ran wide).

## Key files

| File | Role |
|---|---|
| [`src/lib/particles/useGestureRotation.ts:134`](https://github.com/piyarsquare/animath/blob/d21074a0078776f3a641d5203fda35c1997907e7/src/lib/particles/useGestureRotation.ts#L134) | Orbit branch: bounded turntable vs free trackball |
| [`src/lib/particles/useParticleState.ts:38`](https://github.com/piyarsquare/animath/blob/d21074a0078776f3a641d5203fda35c1997907e7/src/lib/particles/useParticleState.ts#L38) | `orbitMode` + `azimuthRef`/`elevationRef` |
| [`src/components/ParticleViewerShell.tsx:301`](https://github.com/piyarsquare/animath/blob/d21074a0078776f3a641d5203fda35c1997907e7/src/components/ParticleViewerShell.tsx#L301) | Camera-panel Orbit toggle |
| [`src/chrome/workspace/PhoneWorkspace.tsx:29`](https://github.com/piyarsquare/animath/blob/d21074a0078776f3a641d5203fda35c1997907e7/src/chrome/workspace/PhoneWorkspace.tsx#L29) | `immersive` flag + floating full-screen button + onPointerDown scrim |
| [`src/chrome/workspace/layers.ts:26`](https://github.com/piyarsquare/animath/blob/d21074a0078776f3a641d5203fda35c1997907e7/src/chrome/workspace/layers.ts#L26) | z-scale: phoneScrim/phoneSheet above actionbar |
| [`src/chrome/theme.css:283`](https://github.com/piyarsquare/animath/blob/d21074a0078776f3a641d5203fda35c1997907e7/src/chrome/theme.css#L283) | Global checkbox; immersive/phone CSS; hero verb rules + skin overrides |
| [`src/chrome/LoadingScreen.tsx`](https://github.com/piyarsquare/animath/blob/d21074a0078776f3a641d5203fda35c1997907e7/src/chrome/LoadingScreen.tsx) | Suspense fallback splash |
| [`src/chrome/heroVerbs.ts`](https://github.com/piyarsquare/animath/blob/d21074a0078776f3a641d5203fda35c1997907e7/src/chrome/heroVerbs.ts) | Verb pool + `rollHeroVerbs()` |
| [`src/chrome/Gallery.tsx:18`](https://github.com/piyarsquare/animath/blob/d21074a0078776f3a641d5203fda35c1997907e7/src/chrome/Gallery.tsx#L18) | Hero markup + reroll/cross-fade |
| [`index.html:21`](https://github.com/piyarsquare/animath/blob/d21074a0078776f3a641d5203fda35c1997907e7/index.html#L21) | Per-skin boot background + data-theme seed script |

## Open / not done

- **No PR.** Branch `claude/particle-rotation-mobile-layout-nlworx` is 9 commits
  ahead, build green. Open one when the user asks; sync `main` first per
  CLAUDE.md (append-only shared files: `index.tsx`, `apps.ts`, `CLAUDE.md`,
  `README.md` — this session touched `index.tsx`, `index.html`, `CLAUDE.md`).
- **Not tested on a real device.** Everything mobile/touch was verified in
  headless Chromium with touch emulation. The **single-tap dismiss** fix targets
  an iOS-Safari clickability heuristic that cannot be reproduced here — highest
  unproven item. Recommend a real-phone pass on the preview build.
- **Orbit *feel* unverified by hand** — bounded recentering was validated by
  logic + static screenshots, not by actually dragging.

## Context

- Verification was done by building, serving `npm run preview` (port 4173), and
  driving `scripts/shoot.mjs` (headless WebGL via SwiftShader) at `VIEWPORT=...`.
  For touch/interaction I wrote one-off puppeteer scripts **inside the repo dir**
  (so `puppeteer` resolves from `node_modules`) and deleted them after.
- To screenshot a non-default skin: `SKIN=blueprint node scripts/shoot.mjs '#/' out.png`.
  To screenshot a checkbox panel: seed `SEED_LS` with `viewType:"2"` (Hopf) to
  surface the Camera panel's "Reference scaffold" checkbox.
- The randomized hero's `rollHeroVerbs()` is intentionally tier-sorted (tier-2
  "out-there" verb lands last). Blueprint is the only skin where `--accent` ==
  `--fg`; if a new skin does the same, give it the `--accent-2` verb override.
- The "package drop" source files (`landing-explore/handoff/*`) were unzipped to
  `/tmp`, **not** committed — only the ported TS/CSS landed.

## Self-reflection

1. **What would you do with another session?** Run the whole branch on a real
   iOS device and Android, focused on the single-tap dismiss and the bounded
   orbit feel; then open the PR (sync `main`, re-run build) and offer to watch CI.
2. **What would you change about what you produced?** I'd consolidate the many
   small commits' verification into one place earlier, and I'd have screenshotted
   all five skins for the hero on the *first* pass instead of catching the
   Blueprint/Phosphor regressions on a second round.
3. **What were you not asked that you think is important?** Whether the immersive
   full-bleed mobile mode should also apply to the layout-tab apps (Stable
   Matching) where only one view is open at a time — I scoped it to
   `views.length === 1`, which is defensible but a judgment call worth confirming.
4. **What did we both overlook?** Initially, that the hero verb color is invisible
   when a skin's accent equals its text color — a class of "token collision" that
   could recur. A small contrast assertion across skins would catch it.
5. **What did you find difficult?** Reproducing device-specific touch behavior in
   a headless, GPU-less container — I could prove `onPointerDown` fires, but not
   the actual iOS heuristic the bug came from.
6. **What would have made this task easier?** A skin-matrix screenshot helper
   (loop all five skins for a route in one command) and a tiny harness to open a
   panel sheet/menu, so touch-dismiss and per-skin checks aren't one-off scripts.
7. **Follow-up value:** MEDIUM — the code is correct and verified structurally,
   but the two feel/touch-centric fixes (single-tap dismiss, orbit recentering)
   are unproven on the real devices the complaints came from; a short real-device
   pass would convert them from high-confidence to confirmed.
