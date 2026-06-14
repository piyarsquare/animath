---
kind: handoff
session: 2026-06-14-S01
date: 2026-06-14
title: Math-and-code guide series — split heavy pages, align plane/particles
branch: claude/complex-particles-guide-tdlhk0
slug: complex-particles-guide-tdlhk0
status: completed
build: passed
followup: null
pr: null
app: docs, complex-particles
signals: phone-needed, not-live
next: Real-device mobile pass on the guide pages; optionally split the rendering guide 2+2.
---

# Math-and-code guide series — split heavy pages, align plane/particles

> [!NOTE]
> This is a **documentation track** (new `docs` category): a series of static
> guide pages under `public/*-guide.html`, each pairing prose + quoted source with
> live `#/embed/` applets. No app/TypeScript behavior changed this session except a
> small additive `pattern=` embed param built earlier in the branch. Expect another
> round of user feedback.

## Summary

The branch ships an 8-file guide series (indexed by `public/guides.html`) that
documents the Complex Particles + Plane Transform viewers. This session's last round
addressed **applet weight** (too many live WebGL iframes per page — browsers cap
concurrent contexts) and **plane/particles confusion**. The two heaviest guides were
each split into Part 1 / Part 2, the duplicate drop-axis applet folded into one, and
the "bare colored plane" figure moved from a Plane Transform embed to a **linear
Complex Particles** plot. Build passes; all pages verified headless. State is
**stable and shippable**; awaiting feedback.

## What changed (this round)

- **Split the two heavy guides into parts**, keeping the original filenames as
  Part 1 so every existing inbound link still resolves:
  - `complex-functions-guide.html` (Pt 1: color · z^n · 1/z · exp) +
    **new** `complex-functions-2-guide.html` (Pt 2: branches · trig · special · field guide).
  - `complex-particles-guide.html` (Pt 1: graph · pipeline · perspective · drop) +
    **new** `complex-particles-2-guide.html` (Pt 2: torus · hopf · quaternions · honesty).
- **Cut applet weight.** Folded the projections guide's two duplicate drop-axis
  explorers into one capable applet (all four Drop buttons + Rotate). Per-page applet
  counts now: functions Pt1 = 3, Pt2 = 3; projections Pt1 = 2, Pt2 = 3. **Max on any
  page is now 4** (the rendering guide); the former 6–7 offenders are gone.
- **Plane/particles alignment.** The functions guide's reference-coloring figure now
  uses `#/embed/complex-particles?fn=linear&proj=dropv&motion=fixed` (verified: renders
  as the flat colored x,y plane). Plane Transform is reserved for figures where the
  two-pane *transformation* is the subject (z^n, exp, sin, Joukowski).
- **Nav + taxonomy.** Part 1 pages get a "Continue to Part 2" button; Part 2 pages a
  "← Part 1" link. `guides.html` lists both parts; `docs/EMBEDS.md` notes the split.
  Added a **`docs` category** to `docs/sessions/categories.mjs` (label "Docs /
  Guides", hue 130) and tagged this track's reports `app: docs, complex-particles`.

Earlier in the branch (see the S01 progress log): built the math trilogy
(functions / projections / rendering), three "going deeper" pages (color, sampling,
plane-transform), the `guides.html` hub, and a small additive `pattern=` embed param.

## Key files

| File | Role |
|---|---|
| [`public/guides.html`](https://github.com/piyarsquare/animath/blob/3518250/public/guides.html) | Series index hub; lists both parts of the split guides |
| [`public/complex-functions-guide.html`](https://github.com/piyarsquare/animath/blob/3518250/public/complex-functions-guide.html) | Functions Pt 1 (color, powers, poles, exp) — linear-particle plane figure |
| [`public/complex-functions-2-guide.html`](https://github.com/piyarsquare/animath/blob/3518250/public/complex-functions-2-guide.html) | Functions Pt 2 (branches, trig, special, field guide) |
| [`public/complex-particles-guide.html`](https://github.com/piyarsquare/animath/blob/3518250/public/complex-particles-guide.html) | Projections Pt 1 (graph, pipeline, perspective, drop) |
| [`public/complex-particles-2-guide.html`](https://github.com/piyarsquare/animath/blob/3518250/public/complex-particles-2-guide.html) | Projections Pt 2 (torus, hopf, quaternions, honesty) |
| [`public/complex-rendering-guide.html`](https://github.com/piyarsquare/animath/blob/3518250/public/complex-rendering-guide.html) | Render modes — still **4 applets** (the remaining heaviest page) |
| [`docs/EMBEDS.md`](https://github.com/piyarsquare/animath/blob/3518250/docs/EMBEDS.md) | Embed-param reference + the guide-series inventory |
| [`docs/sessions/categories.mjs:27`](https://github.com/piyarsquare/animath/blob/3518250/docs/sessions/categories.mjs#L27) | New `docs` category + `guide`/`instruction`/`explainer` aliases |
| [`src/animations/ComplexParticles/embedParams.ts`](https://github.com/piyarsquare/animath/blob/3518250/src/animations/ComplexParticles/embedParams.ts) | Embed URL params incl. the `pattern=` addition; `buttons=` overlay |

## Open / not done

- **Rendering guide is still 4 applets** — acceptable but the only page above the
  others. If a future round wants strict consistency, split it 2+2
  (Points+Sheet / Tiles+Net) the same way.
- **Deeper plane/particles unification** the user hinted at ("bring them more in
  line") is a larger design question, deliberately left for a dedicated pass — this
  session only did the one concrete swap (bare plane → linear particles).
- **Track B of the series plan** (`2026-06-14-S02-explainer-series-plan.md`) is still
  open: app-specific guides (Fractals/Correspondence, Topology, Trinary, Stable
  Matching) gated on the **embed-route investment (B0)** — those apps have no
  `#/embed/` routes yet.
- **Not a PR yet** (`pr: null`). When finalizing: `git fetch && git merge origin/main`,
  keep every app's append-only entries, re-run `npm run build`.

## Context

- The guides live in `public/` and are copied to the Pages root by the deploy
  workflow; they are **not** part of the SPA bundle. Edit and reload — no rebuild
  needed for local viewing, but `npm run build` must still pass (it copies `public/`).
- To preview an embed headlessly: `npm run build && (npm run preview &)` then
  `node scripts/shoot.mjs 'embed/complex-particles?fn=linear&proj=dropv' out.png`
  (WAIT_MS env tunes settle time). SwiftShader WebGL works in this container.
- Embed params of note: `fn`, `proj` (perspective/torus/hopf/dropx…dropv), `render`
  (points/sheet/tiles/net), `motion`, `spin`, `pattern` (grid/rings/spokes/web),
  `colorby`, `colormap`, `buttons` (overlay: dropx,dropy,dropu,dropv,rotate). Full
  list in `docs/EMBEDS.md`.
- The split keeps inbound links alive because Part 1 reuses the original filename;
  do **not** rename Part 1 files.

## Self-reflection

1. **What would you do with another session?** Act on the next round of user
   feedback. If none specific: split the rendering guide 2+2 for consistency, and
   sketch the plane/particles unification (a shared "what plane am I looking at"
   convention across both viewers' guides).
2. **What would you change about what you produced?** I authored the four split files
   as full `Write`s rather than surgical edits, duplicating the shared `<style>`
   block four more times. A shared CSS file (or a tiny build step) would remove the
   copy-paste drift risk across now-8 guide pages.
3. **What were you not asked that you think is important?** Whether these guides
   should be linked from the in-app **?** explainer or the gallery, so users actually
   discover them — right now `guides.html` is only reachable if you know the URL.
4. **What did we both overlook?** Mobile: each guide pins `iframe` height to 400px and
   the body to 720px; I verified desktop composition only. Small-screen layout and
   whether 2–3 live WebGL contexts are tolerable on a phone are unverified.
5. **What did you find difficult?** Deciding split granularity without over-fragmenting
   into a dozen tiny pages. Settled on 2 parts each (cap ~3 applets) as the balance
   between page weight and not exploding the file count.
6. **What would have made this task easier?** A shared guide template/partial for the
   `<head>`+CSS+footer, and an automated per-page applet-count check so "too many
   iframes" is caught mechanically rather than by eye.
7. **Follow-up value:** LOW — output is complete, builds, and is verified on desktop;
   follow-up is the user's next feedback round plus optional polish (rendering split,
   mobile check, discoverability).
