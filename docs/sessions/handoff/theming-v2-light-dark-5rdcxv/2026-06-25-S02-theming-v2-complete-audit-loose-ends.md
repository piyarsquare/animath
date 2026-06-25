---
kind: handoff
session: 2026-06-25-S02
date: 2026-06-25
title: Theming v2 complete — full rollout + audit fixes + loose ends cleared
branch: claude/theming-v2-light-dark-5rdcxv
slug: theming-v2-light-dark-5rdcxv
status: completed
build: passed
followup: null
pr: 239
app: chrome, trinary, polygon-worlds, solid-worlds, fractals, correspondence, plane-transform, complex-particles, trees-and-nets, agentic-sorting
signals: needs-dan, visual-unverified
next: Merge PR #239 into main first (it's reviewed + clean); then sync the other two branches onto the new main — amazing-mccarthy is conflict-free, pensive-pasteur conflicts only on TreesAndNets.tsx (re-apply the small color-token pass on its new code).
---

# Theming v2 complete — full rollout + audit fixes + loose ends cleared

## Summary

Theming v2 (each skin = an **identity** × three **modes**: native/light/dark) is
**done and shipped on PR #239** across the entire app suite — engine, both pilots,
the full per-app rollout, an independent-auditor pass with its findings fixed, and
the three named loose ends cleared. Dan reviewed the Cloudflare preview and called
it "ready to go" (he'll send more edits later). The only app left untouched is
**Argand** (deliberately skipped — it was in active development; its foundation
landed on main via #237, so it's now the one remaining un-themed app and the natural
follow-up). Build green · lint 0 errors (58, under baseline) · 88 tests.

## What changed

This handoff covers the **second** session on the branch (the engine + rollout are
detailed in the [S01 progress report](../../progress/theming-v2-light-dark-5rdcxv/2026-06-25-S01-theme-engine-phase0.md)).
This session: audit → fix → clear loose ends → wrap up.

**Audit-fix batch (`ef1c08c`)** — ran 3 independent auditors, fixed the findings:
- **HIGH:** a skin switch in the Worlds reset the walker to center (the
  theme-triggered engine rebuild dropped the pose). Now the chart/cube position is
  captured before dispose and restored after — but only for a *theme-only* rebuild;
  a genuine world change still drops the walker fresh (`prevSpecRef` distinguishes).
- Canvas/WebGL theme effects that follow the user's mode now depend on **both**
  `themeId` and `themeMode` (a same-identity native↔light↔dark switch was missed):
  Agentic, Trees & Nets (`g3` + both Graph3D keys), Solid Worlds minimap/cube-map.
- Hardening: `ControlPanel` select → `color-scheme: inherit`; `cornerColor`
  interpolates `--data` past 7 landmarks; NaN-guarded the registry clamps; dead
  `OBJECTIVE_COLORS`/`FROZEN_COLOR` exports removed; `readDecorPalette` moved below
  imports.
- Docs: theming v2 documented in `CLAUDE.md` (new *Theming* section) + `theme.css` header.

**Loose-ends batch (`6203889`)**:
- **TrinaryLab console** — outcome colors sample the theme's divergent fate ramp
  (shared with the Destiny Map via `outcomeHex`); the record/longest-era highlight is
  a discrete `--data` token; outcome-named stat text borrows that outcome's color.
  The `Histogram` + `LaunchSpace` canvases read `--viz-bg`/`--dim`/`--data` live, so
  plot beds, axis text, sampling box, sample dots and region tints track skin × mode.
- **Worlds chrome** — floating walk-pad, instruction hint (now a themed pill), and
  the Polygon Worlds mini-map frame/label use the panel tokens; the mini-map
  edge-pairing colors track the discrete `--data` palette (matching Solid Worlds).
- **Spherical sky-dome** — **verified already working** (light→daytime, dark→moonlit
  via the look system). An earlier "doesn't retint" read was a screenshot-harness
  artifact: the mode `localStorage` seed was double-JSON-encoded, so the mode read as
  native both times. The chrome mode key stores a **plain** string, not a
  JSON-encoded one — `SEED_LS='{"animath:v1:chrome:mode":"light"}'`, not `"\"light\""`.

## Key files

| File | Role |
|---|---|
| [`src/animations/PolygonWorlds/PolygonWorlds.tsx`](https://github.com/piyarsquare/animath/blob/6203889/src/animations/PolygonWorlds/PolygonWorlds.tsx) | Walker-pose preservation on theme rebuild; walk-pad/pill/mini-map chrome → panel tokens; mini-map edge colors → `--data` |
| [`src/animations/SolidWorlds/SolidWorlds.tsx`](https://github.com/piyarsquare/animath/blob/6203889/src/animations/SolidWorlds/SolidWorlds.tsx) | Same pose fix; walk-pad/pill chrome; minimap/cube-map deps on `themeId`+`themeMode` |
| [`src/animations/TrinaryStars/lab/TrinaryLab.tsx`](https://github.com/piyarsquare/animath/blob/6203889/src/animations/TrinaryStars/lab/TrinaryLab.tsx) | Console outcome/stat/histogram colors + LaunchSpace canvas themed |
| [`src/animations/TrinaryStars/lab/themeColors.ts`](https://github.com/piyarsquare/animath/blob/6203889/src/animations/TrinaryStars/lab/themeColors.ts) | `outcomeHex` / `OUTCOME_GOODNESS` — the shared divergent fate ramp |
| [`src/chrome/theme.css`](https://github.com/piyarsquare/animath/blob/6203889/src/chrome/theme.css) | The family-var engine (`--x-n` + sparse `-lt`/`-dk`, shared `[data-scheme]` blocks) — see its `THEMING v2` header |
| [`src/chrome/Scheme.tsx`](https://github.com/piyarsquare/animath/blob/6203889/src/chrome/Scheme.tsx) | `<Scheme mode>` force-mode primitive |
| [`src/chrome/useThemeTokens.ts`](https://github.com/piyarsquare/animath/blob/6203889/src/chrome/useThemeTokens.ts) | Reactive canvas token reader (`useThemeTokens`/`readThemeTokens`) |
| [`src/lib/colormapRegistry.ts`](https://github.com/piyarsquare/animath/blob/6203889/src/lib/colormapRegistry.ts) | Family-typed colormaps; `themeMapsFor`/`sampleContinuous`/`lerpStops` |
| [`CLAUDE.md`](https://github.com/piyarsquare/animath/blob/6203889/CLAUDE.md) | New *Theming (v2)* section documenting the contract |

## Open / not done

- **Argand** — the only un-themed app. Skipped this round (in active development; its
  foundation merged to main via #237). When its dev settles, run the same per-app
  color audit: equation-identity colors (`Z/A1/A0/A2/F/FIX/CRIT`) → `--data` slots,
  structure → neutrals, focal → `--accent`.
- **Guide pages** (`public/guides.html` etc., on the `amazing-mccarthy` branch) carry
  their own skin layer (`guide-skin.js` mirrors the 8 skins). With the mode axis added,
  the guides may want a mode toggle too — a follow-up, not a blocker.
- **Lint baseline** is 58 warnings (`exhaustive-deps`/`no-explicit-any`); none new.

## Context — merging the other live branches into main

Dan asked how to land the other branches. The map (file overlap with this branch,
computed against current `origin/main` = `9af344b`):

| Branch | What it is | Overlap with theming-v2 |
|---|---|---|
| `claude/theming-v2-light-dark-5rdcxv` (#239) | this branch | — |
| `claude/amazing-mccarthy-0lwb1m` | Number Planes + guide pages (`public/` HTML, `guide-skin.js`) | **none** — `public/` only |
| `claude/pensive-pasteur-ewpdqb` | Trees & Nets quantum-tree port (big: new lib/views + `TreesAndNets.tsx` +227) | **`TreesAndNets.tsx`** (real) + `CLAUDE.md` (append-only) |

**Recommended order:**
1. **Merge #239 (theming-v2) first.** It's reviewed, `mergeable_state: clean` against
   current main (the #237 Argand merge touched different files), and it's the
   foundational engine change everything else should build on.
2. **`amazing-mccarthy`** — conflict-free with theming-v2 (zero file overlap). Sync
   onto the new main, `npm run build`, merge. (It may have its own overlap with main
   from #237's numberPlanes work — check separately.)
3. **`pensive-pasteur`** — the only real code conflict, and only in `TreesAndNets.tsx`.
   That branch substantially rewrote the app (new `views/`, `lib/`); theming-v2 made a
   *small* color-token pass on the old file (`C_FLIP`/`C_CROSS` → `--data-2`/`--data-5`,
   the `g3` useMemo keyed on `themeId`+`themeMode`, Graph3D keys). Resolve by **keeping
   pensive-pasteur's structure** and **re-applying the theming token swaps on top of its
   new code** — it's mechanical (the same `--data` rules, the same `useThemeId`/
   `useThemeModeId` deps). Best done as the final step of *that* branch's wrap-up so its
   author owns the merged result. `CLAUDE.md` resolves append-only (keep both entries).

The append-only convention (CLAUDE.md §"Parallel branches") keeps the *registry* files
(`index.tsx`/`apps.ts`/`CLAUDE.md`/`README.md`) conflict-free — but theming-v2 is the
one cross-cutting branch that edited existing apps' colors, so the single genuine merge
is the TreesAndNets overlap above. Everything else is additive.

## Self-reflection

1. **What would you do with another session?** Do the Argand theming pass (the one
   remaining app) once its dev branch settles, and add the mode toggle to the guide
   pages. Also drive a real headless click-through of a live mode switch (most
   verification was at-load across themes, not mid-session toggles).
2. **What would you change about what you produced?** The TrinaryLab `LaunchSpace`
   physics-region tints borrow outcome colors via a local `withA()` hex→rgba helper —
   that idiom (and the token-reader idiom) now recurs in several apps; a shared
   `withAlpha`/canvas-token helper would cut the duplication (auditor M5, left as-is).
3. **What were you not asked that you think is important?** The merge strategy for the
   sibling branches — Dan asked at the end, and it surfaced that theming-v2 is the one
   branch the append-only rule *doesn't* fully protect (it edits existing apps), so its
   merge order genuinely matters. Documented above.
4. **What did we both overlook?** Initially, that the spherical sky "bug" wasn't a bug
   at all — I chased it for several screenshots before realizing my test harness was
   double-encoding the mode seed. The real lesson is a harness gotcha, now documented.
5. **What did you find difficult?** Distinguishing a theme-rebuild from a world-rebuild
   for the pose fix (solved with `prevSpecRef`), and the preview-server lifecycle in
   this environment (backgrounded `&` processes get reaped; `run_in_background` is the
   reliable way).
6. **What would have made this task easier?** A documented note in the screenshot
   harness that chrome `mode`/`skin` keys are stored as plain strings (not
   usePersistentState's JSON encoding) — it cost a wrong conclusion. Worth adding to
   `docs/SCREENSHOTS.md`.
7. **How did you verify this, and does each passing check test the user-visible claim?**
   Automated: `npm run build` (the only CI gate) + `npm run lint` (0 errors) + `npm test`
   (88) on every batch. Visual: headless screenshots via `scripts/shoot.mjs` across
   identities × modes — confirmed the sphere is daytime in light mode / moonlit in dark,
   the TrinaryLab console + Worlds chrome theme in light mode, and the walker-pose fix by
   code reasoning (the rebuild path) rather than a live toggle capture. The pose-restore
   and the same-identity mode-switch redraw were verified by reasoning + build, not a
   recorded mid-session toggle — hence `signals: needs-dan` for his hands-on pass.
8. **Follow-up value:** LOW — the shipped work is complete and verified; remaining items
   (Argand, guide-page mode toggle, the merge of sibling branches) are additive
   follow-ups, not corrections to this work.
