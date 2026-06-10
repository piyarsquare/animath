---
kind: handoff
session: 2026-06-10-S01
date: 2026-06-10
title: Chrome polish, complete function set, embeds pilot, projection slider
branch: claude/new-chrome
slug: new-chrome
status: completed
build: passing
followup: null
pr: pending
app: null
---

# Chrome polish, complete function set, embeds pilot, projection slider

## Summary

A long feedback-driven session on the workspace-chrome branch (renamed from
`claude/dazzling-goodall-1afsbr` to `claude/new-chrome` at the start, closing
PR #199). It hardened the new chrome from real phone use (fullscreen +
resizable views, scroll hints, a mobile performance pass), gave every gallery
card an app-specific animation, completed the complex-function library across
both viewers, shipped the first embeddable-applet routes with a reference
host page, and unified the projections into one sticky-stop slider
(Perspective ⇠ Torus ⇢ Sphere) after the user spotted that Stereo and Torus
were the same map. Build green; `main` was merged at finalization (only
`StableMarriage/EXTENSIONS.md` arrived); PR to be opened from this handoff.

## What changed

- **Workspace chrome**: every view window gets a fullscreen toggle (CSS-only
  restyle of the same DOM node so WebGL survives; Esc restores); phone view
  cards height-resize from a bottom grip (persisted `wsphone:<appId>`); the
  rail and phone dock show fade+chevron scroll hints; the top-bar
  title/formula is a button that opens the Function panel (`titlePanel`).
- **Gallery**: one authored preview flavor per app (10 total) — including a
  two-sheet domain/range Plane Transform card and a 4D-cloud-with-axes
  particle card; previews pause when scrolled away. Fixed a real bug: first
  rAF timestamps can precede `performance.now()`, so `t` went negative and
  `events[-1]` crashed draw loops — `useCanvas` clamps `t ≥ 0`.
- **Function library**: 13 new functions (indices 23–35, append-only) in
  `lib/complexMath.ts` and both GLSL dispatches — sec, csc, arctan, arccot,
  arcsec, arccsc, 1/z², sinh, cosh, tanh, arcsinh, arccosh, arctanh —
  branch-aware through their ln; shared `MULTIVALUED_INDICES`; PlaneTransform
  brought to full dispatch parity (it silently rendered 19–22 as identity);
  quadratic entry via the new `ComplexInput` row (`a = [re] + [im]·i`).
- **Performance (mobile)**: the per-frame orientation-matrix React push (a
  full chrome re-render at 60fps under the default tumble) throttled to 4 Hz;
  DPR capped at 2 in PlaneTransform/FractalsGPU/Correspondence; per-frame
  layout reads replaced with ResizeObserver caches; backdrop blurs dropped
  below 740px.
- **Camera**: free-orbit quaternion (trackball, no pole stops; ambient
  Yaw/Pitch/Roll and Reset compose on it); Drag: Orbit | Pan pill.
- **Embeds (docs/EMBEDS.md phase 1)**: chrome-less `#/embed/complex-particles`
  and `#/embed/plane-transform` routes, URL-configured (fn, render, proj,
  spin, buttons, caption, …), ephemeral state, corner badge to the full app;
  in-applet projection buttons (`buttons=dropx,dropy,rotate`); reference host
  `public/embed-demo.html` tells the e^z story with two live iframes.
- **Projection slider**: Stereo retired (same stereographic map as Torus);
  one slider `projMix ∈ [0,2]` with sticky labeled stops Perspective / Torus
  / Sphere; fractional positions are live GPU morphs (second leg = fiber
  collapse); the 4D axis cross fades toward the torus; drop axis and slider
  release each other (most recent intent wins). Hopf fiber overlay + "Hopf
  study view" removed. The `Slider` primitive gained reusable `stops`.

## Key files

| File | Role |
|---|---|
| [`src/chrome/workspace/ViewWindow.tsx`](https://github.com/piyarsquare/animath/blob/eebc0e66ac4e0c15c143387bb4bcc233877da448/src/chrome/workspace/ViewWindow.tsx) | fullscreen toggle (CSS-only, WebGL survives) |
| [`src/chrome/previews.tsx`](https://github.com/piyarsquare/animath/blob/eebc0e66ac4e0c15c143387bb4bcc233877da448/src/chrome/previews.tsx) | per-app gallery animations + offscreen pause |
| [`src/lib/complexMath.ts`](https://github.com/piyarsquare/animath/blob/eebc0e66ac4e0c15c143387bb4bcc233877da448/src/lib/complexMath.ts) | complete function set, `MULTIVALUED_INDICES`, categories |
| [`src/lib/particles/useViewControls.ts`](https://github.com/piyarsquare/animath/blob/eebc0e66ac4e0c15c143387bb4bcc233877da448/src/lib/particles/useViewControls.ts) | `handleProjMix` (slider), drop-axis interplay, free-orbit ambient controls |
| [`src/lib/embedParams.ts`](https://github.com/piyarsquare/animath/blob/eebc0e66ac4e0c15c143387bb4bcc233877da448/src/lib/embedParams.ts) | embed URL codec (particles + plane) |
| [`public/embed-demo.html`](https://github.com/piyarsquare/animath/blob/eebc0e66ac4e0c15c143387bb4bcc233877da448/public/embed-demo.html) | reference embed host (the e^z article) |
| [`docs/EMBEDS.md`](https://github.com/piyarsquare/animath/blob/eebc0e66ac4e0c15c143387bb4bcc233877da448/docs/EMBEDS.md) | embeds design + status |
| [`docs/redesign/IN-PROGRESS.md`](https://github.com/piyarsquare/animath/blob/eebc0e66ac4e0c15c143387bb4bcc233877da448/docs/redesign/IN-PROGRESS.md) | live ledger (cleaned of resolved prototype-era sections) |

## Open / not done

- **Open PR** → being created from this handoff (main already merged).
- **Embeds phase 2**: the `s=` catch-all param and the "Embed this view"
  share dialog (configure visually → copy iframe snippet) — the next
  highest-leverage piece for the user's explainer workflow.
- **Manual chore for the user**: delete the stale `claude/dazzling-goodall-1afsbr`
  branch on GitHub (branch deletion is 403-blocked from this environment);
  the control center shows its stale reports until then.
- Carried-forward ledger items (IN-PROGRESS): keyboard window management,
  Mandelbrot↔Julia zoom-lock, skin-aware canvas palettes, layout
  rename/export, gallery search, phone landscape.
- A hands-on phone pass is still prudent (fullscreen, grips, dock hints, and
  the perf fixes were verified headlessly, not on hardware).

## Context

- The session's full narrative (16 timeline entries with verification
  screenshots) is in the progress report next to this handoff.
- `optgroup` needed explicit styling — browser default white strip made the
  function categories unreadable on dark skins; if new native popups appear,
  style them in `ControlPanel.css`.
- Embed routes assume the hash router's "match on path, query stripped"
  behavior; embed state is ephemeral by `storageKey: undefined` /
  null-key `usePersistentState`.
- `ProjectionMode.Stereo` still exists in the enum (persisted values, embed
  alias) but is unreachable from the UI; `sphere` and `hopf` both map to the
  Hopf mode.

## Self-reflection

1. **What would you do with another session?** Build the "Embed this view"
   share dialog — it completes the authoring loop the embeds exist for — and
   do a real-device phone pass on fullscreen/grips/scroll-hints.
2. **What would you change about what you produced?** The embed apply-once
   effects in ComplexParticles depend on child-effect ordering (Canvas3D
   mounting first); it works and is commented, but a small explicit
   "engine-ready" callback would be sturdier.
3. **What were you not asked that you think is important?** The deployed
   Pages site still serves `main`'s old chrome; once this PR merges, embeds
   and the demo page go live — worth announcing in the PR body so the URL
   change in workflows is expected.
4. **What did we both overlook?** The Stereo/Torus duplication sat through
   the whole redesign until the user spotted it; similar latent duplication
   may exist (e.g. Drop projections vs. orthographic slices) — an audit of
   `viewpoint.ts` would be cheap.
5. **What did you find difficult?** Diagnosing the "less smooth since
   reskin" report — the root cause (per-frame React state from the rAF loop)
   predated the reskin and only became expensive with the bigger tree.
6. **What would have made this task easier?** A scripted interaction harness
   (the ad-hoc puppeteer probes were rewritten ~6 times); promoting them
   into a `scripts/probe.mjs` utility would pay for itself next session.
7. **Follow-up value:** **LOW** — the branch is complete and verified;
   follow-ups are new features (share dialog) and hardware validation.
