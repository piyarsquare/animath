---
kind: handoff
session: 2026-06-23-S01
date: 2026-06-23
title: Screenshot tour — full-site capture (targeting · detail levels · skins)
branch: claude/gracious-ptolemy-boebnp
slug: gracious-ptolemy-boebnp
status: completed
build: passed
followup: low
pr: null
app: general
signals: visual-unverified
next: Run the "Screenshot tour" workflow (Actions) or `npm run tour` for a visual pass; `--skins all` for theme QA, `--detail overview` for a fast thumbnail. Consider gating it on PRs that touch chrome/apps.
---

# Screenshot tour — full-site capture (targeting · detail levels · skins)

> [!NOTE]
> Pure tooling/infra session — no app behavior or `src/` runtime code changed
> (one read of `src/chrome/skins.tsx` informed a bug fix in the script). Two
> commits, both pushed to the branch.

## Summary

Built a reusable "see the whole site" screenshot harness, `scripts/tour.mjs`
(`npm run tour`), that drives the real built app in headless Chromium (software
WebGL via ANGLE + SwiftShader, same as `scripts/shoot.mjs`) and captures every
app in desktop + phone form factors across each app's modes and layouts. A full
default run is **107 shots, 0 failures**. Then added three follow-up features on
request: (1) **target** a specific app/gallery, (2) **detail levels**
`overview → standard → everything`, (3) a **skins/themes** dimension. Routes are
read from `src/apps.ts` and skins from `src/chrome/skins.tsx`; modes/layouts are
discovered from the live DOM. Shipped with a `workflow_dispatch` CI workflow,
`docs/SCREENSHOTS.md`, and an `index.html` contact sheet. Build passes.

## What changed

Two commits (`e54503a` initial tour; `7ed3187` the three enhancements):

- **`scripts/tour.mjs`** — the driver. Walks `routes × viewports × modes ×
  layouts (× skins)`, writes `screenshots/<app>/<vp>__[skin__]<mode>__<layout>.png`
  plus `manifest.json` and a searchable `index.html`. Auto-builds if `dist/` is
  missing and self-serves `vite preview` if no server is reachable (else reuses
  `BASE_URL`). Each (route, viewport, skin) loads in an **isolated browser
  context** so apps start from their true defaults (the workspace persists layout
  to `localStorage`, so isolation is what prevents layout bleed across the tour).
- **Targeting** — positional args (or `ONLY=`) substring-match a route hash/slug
  (`npm run tour -- trinary`, `-- gallery`); `--list` prints routes + skins +
  detail levels and exits.
- **Detail levels** (`--detail` / `DETAIL`, default `everything`): `overview`
  (pristine default only), `standard` (every layout at default mode + every other
  mode at its default), `everything` (full mode × layout cross-product). Verified
  monotonic on Counting the Ways: **2 → 6 → 8** shots. The `standard` modes pass
  runs *before* any layout click so each mode is captured at its own pristine
  default (avoids carried-over layout).
- **Skins** (`--skins` / `SKINS`, `all` or a comma list of ids/names; `--skin`
  for one). Fixed a real bug: `skins.tsx` reads the skin from `localStorage` as a
  **raw id** (`phosphor`), not JSON — the first version seeded `JSON.stringify`
  (`"phosphor"`) which silently fell back to the default skin. Now seeds raw;
  verified Phosphor/Blueprint/Neon render correctly (incl. the gallery's
  skin-aware preview canvases, which depend on React `useSkin` state).
- **`.github/workflows/screenshots.yml`** — on-demand (`workflow_dispatch`)
  workflow with `only` / `detail` / `viewports` / `skins` inputs; installs Chrome
  runtime libs (mirrors `scripts/install_headless_webgl.sh`), builds, serves,
  runs the tour, uploads `screenshots/` as an artifact.
- **`docs/SCREENSHOTS.md`**, a `CLAUDE.md` Quick Reference line, and `.gitignore`
  (`screenshots/`, `scratch-smoke/` — generated artifacts, not committed).

## Key files

| File | Role |
|---|---|
| [`scripts/tour.mjs:273`](https://github.com/piyarsquare/animath/blob/7ed3187/scripts/tour.mjs#L273) | `captureVariants` — the detail-level logic (overview / standard / everything) per route+viewport |
| [`scripts/tour.mjs:144`](https://github.com/piyarsquare/animath/blob/7ed3187/scripts/tour.mjs#L144) | `resolveSkins` — `all` / id / name → skin ids; `readRoutes`/`readSkins` above it parse the source registries |
| [`scripts/tour.mjs:354`](https://github.com/piyarsquare/animath/blob/7ed3187/scripts/tour.mjs#L354) | the skin-seed fix — `evaluateOnNewDocument` writes the **raw** skin id to localStorage before boot |
| [`src/chrome/skins.tsx:29`](https://github.com/piyarsquare/animath/blob/7ed3187/src/chrome/skins.tsx#L29) | `loadSkin()` — the gotcha: reads localStorage raw (not via `usePersistentState`/JSON) |
| [`.github/workflows/screenshots.yml:13`](https://github.com/piyarsquare/animath/blob/7ed3187/.github/workflows/screenshots.yml#L13) | CI workflow inputs (only / detail / viewports / skins) |
| [`docs/SCREENSHOTS.md`](https://github.com/piyarsquare/animath/blob/7ed3187/docs/SCREENSHOTS.md) | usage + flags/env reference |

## Open / not done

- **Screenshots are git-ignored** (generated, ~19MB for the default run). They
  reach a human via the CI artifact, a local `npm run tour`, or the files
  delivered in chat. Dan was offered committing a baseline set into the repo and
  chose not to this session — revisit if a GitHub-viewable baseline is wanted.
- The tour captures **settled frames only** — not transient/interaction states
  (the "?" explainer modal, a fullscreen view, mid-animation, hover, fractal
  trace orbits). Worth adding if those need eyeballing.
- Not wired as a **PR gate / visual-diff** — it's `workflow_dispatch` only. A
  natural next step is a baseline + diff to catch chrome/app regressions.

## Context

- Rendering is **software WebGL (SwiftShader)** — there's no GPU in the
  container/CI. Colors/anti-aliasing can differ subtly from a real GPU; fine for
  "see the whole site", but don't treat a shot as pixel-true to production.
- Run pattern matches the existing probes: `npm run build && (npm run preview &)
  && npm run tour`, or just `npm run tour` (it self-serves). Pass flags through
  npm with `--`: `npm run tour -- trinary --detail everything --skins all`.
- DOM contract the tour depends on (stable today): mode pills
  `.am-pills[role=tablist] .am-pill[role=tab]`; desktop Layout menu
  `.am-layouts-btn` → `.am-layouts-menu .am-lay-item` (active = `.am-on`, name in
  `.am-lay-meta > span`); phone view-chips `.am-phone-layouts .am-chip`; gallery
  filters `.am-gal-filters .am-chip`. If those class names change, update the
  `list*`/`select*` helpers in `tour.mjs`.

## Self-reflection

1. **What would you do with another session?** Wire the tour into CI as a
   regression aid: capture a committed baseline and post a visual diff (or the
   contact sheet) on PRs that touch `src/chrome` or an app. Add capture of
   transient states (explainer modal, fullscreen, mid-animation) and per-app
   skin strips.
2. **What would you change about what you produced?** The skins dimension does a
   fresh page load per skin (correct, since the gallery previews read React
   `useSkin` state) but it's slower than necessary; for non-gallery routes a live
   `SkinPicker` click would re-render without a reload. The `index.html` is one
   monolithic page; for `--skins all --detail everything` it'd be large and could
   paginate or lazy-virtualize.
3. **What were you not asked that you think is important?** Whether to commit a
   baseline set for visual regression (asked at the end; Dan declined for now),
   and whether production fidelity matters enough to ever render on a real GPU.
4. **What did we both overlook?** Software-WebGL ≠ production GPU (subtle color/AA
   differences). And the tour only sees settled frames — interaction-driven looks
   (trace orbits, playing sims, hover, the "?" modal) aren't captured, so "see the
   whole site" is really "see every static default of the whole site."
5. **What did you find difficult?** Making mode/layout/skin combinations
   deterministic given the workspace persists layout to `localStorage` (layouts
   carry over once you start clicking). Resolved with an isolated browser context
   per route and a modes-before-layouts ordering in `standard`.
6. **What would have made this task easier?** A machine-readable hook for the
   chrome's current state — e.g. `data-app`/`data-mode`/`data-layout` on the
   shell root — would beat scraping class names. And a documented skin-storage
   contract (raw id, not JSON) would have pre-empted the seeding bug.
7. **How did you verify this, and does each passing check test the user-visible
   claim?** Method: **headless software-WebGL screenshots, inspected directly** by
   reading the rendered PNGs (gallery desktop+mobile, Fractals "Everything",
   Polygon Worlds third-person, Stable Matching lattice + mobile dock, Trinary
   Lab/Census, Argand in Phosphor + Blueprint, gallery in Neon) — these test the
   real user-visible output, not a proxy. Detail levels verified by **counts**
   (overview 2 → standard 6 → everything 8 on Counting the Ways, and the standard
   set included `lab` at its own default, confirming no carry-over). The skin fix
   was verified visually (themes now actually apply). `npm run build` passes
   (`tsc && vite build`, 6.72s). Caveat: rendering is **software WebGL**
   (SwiftShader), not a real GPU — I inspected the tool's actual output, but
   production pixel fidelity (real-GPU colors/AA) is unverified, so I set the
   `visual-unverified` signal rather than imply pixel-truth.
8. **Follow-up value:** LOW — the tooling is complete, tested end-to-end, and
   pushed; follow-up (CI gating, visual diff, transient-state capture) would add
   depth, not correct anything.
