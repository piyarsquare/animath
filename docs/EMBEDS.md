# Embeddable applets — design + status

> Status: **phase-1 pilot built** (2026-06-10, branch `claude/new-chrome`):
> embed routes for Complex Particles and Plane Transform, the readable-params
> codec, optional in-applet buttons, and the reference host page are live;
> the `s=` catch-all and the "Embed this view" share dialog are still to do.
>
> Try it: `<site>/embed-demo.html` hosts two live applets in plain iframes:
>
> ```html
> <iframe src="https://piyarsquare.github.io/animath/#/embed/plane-transform?fn=exp"
>         width="640" height="380" loading="lazy" allowfullscreen></iframe>
> <iframe src="https://piyarsquare.github.io/animath/#/embed/complex-particles?fn=exp&proj=dropy&motion=fixed&buttons=dropx,dropy,rotate"
>         width="640" height="380" loading="lazy" allowfullscreen></iframe>
> ```
>
> Supported params (see `src/lib/embedParams.ts`): `fn` `p` `q` `render`
> `proj` `motion` `spin` `count` `colorby` `colormap` `extent` `caption`
> `controls` `buttons` (particles); `fn` `p` `q` `extent` `caption`
> `controls` (plane). `buttons=dropx,dropy,…,rotate` overlays projection
> switchers on the applet; drop buttons freeze the motion, Rotate restores
> the full 4D view with the quaternion tumble.

## Goal

Let an author writing an explainer (a blog post, a course page, any web page)
embed **live, interactive animations** from animath apps — e.g. a Complex
Particles view showing `e^z` as a tumbling 4D sheet — inside their document,
configured to a specific pedagogical moment (function, projection, render
mode, camera, motion).

The motivating example: an essay on visualizing complex functions that
alternates prose with live views from Complex Particles (particle cloud and
Sheet/Tiles/Net render modes — "complex sheet" is a render mode of the same
app, so one mechanism covers both).

## Approach: iframe embeds first, web components later (maybe)

Two candidate architectures:

| | A · iframe embed route | B · web-component bundle |
|---|---|---|
| Author writes | `<iframe src="…#/embed/…?fn=exp">` | `<script src="animath.js">` + `<animath-view …>` |
| Infrastructure | none new — same Pages deploy | new lib build, hosting/versioning, npm or CDN |
| Isolation (CSS, WebGL, crashes) | free (browser-enforced) | must be engineered (shadow DOM, context limits) |
| Bundle cost per page | per-iframe load, code-split route keeps it lean | one shared runtime, lighter for many embeds |
| Version skew | author always gets the deployed version | author pins a version (good and bad) |
| Effort to first embed | small | large |

**Recommendation: build A now.** It reuses the deployed static site as the
applet host, gets isolation and updates for free, and an essay can embed it
today from any platform that allows iframes. The pieces built for A (the
settings codec, the chrome-less embed shell) are exactly the pieces B would
need, so B stays open as a later packaging layer if a no-iframe story becomes
important.

## The pieces (phase 1, Complex Particles pilot)

### 1. Settings codec — `src/lib/embedParams.ts`

A versioned, two-layer encoding of a viewer's configuration into URL query
params:

- **Readable knobs** for the params an author would hand-edit in a document:
  `fn` (function name), `p`/`q`, `render` (points|sheet|tiles|net), `proj`
  (perspective|stereo|hopf|torus|dropx|…), `motion` (quaternion|fixed),
  `spin` (comma list of planes, e.g. `xy,uv`), `colormap`, `colorby`,
  `count`, `extent`.
- **Catch-all** `s=<base64url JSON>` for everything else (the persisted-
  settings field names already enumerate the serializable subset — the codec
  reuses them, so it never invents a second vocabulary). Readable knobs win
  over the catch-all when both are present.
- `v=1` version prefix; unknown/garbled params fall back to defaults, never
  crash the embed.

### 2. Embed shell — `src/embed/EmbedShell.tsx` + route `#/embed/:appId`

A chrome-less wrapper: **just the view**, filling the iframe, plus

- a quiet corner badge ("animath ⧉") linking to the full workspace with the
  same settings (the embed → app handoff is the same codec);
- optional `caption=` text under the view;
- `controls=0|1` — off by default; `1` overlays the minimal gesture surface
  (orbit/pan/zoom already work; no panels, no rail);
- pause-when-offscreen via IntersectionObserver (a long essay may hold many
  embeds; only visible ones animate — same pattern as the gallery previews)
  and `loading="lazy"` in the recommended snippet;
- embed-tuned defaults (lower particle count unless `count=` says otherwise).

State is **ephemeral**: `useParticleState` already supports `storageKey:
undefined`, so embeds never read or write a visitor's saved settings.

### 3. Share affordance — "Embed this view"

The workspace top bar gains a share action (near the `?`): it serializes the
**current** settings through the codec and offers

- the embed URL,
- a copy-ready `<iframe>` snippet (with `loading="lazy"`, sensible
  width/height, `allowfullscreen`),
- a "copy link to this view" variant (full app, same settings).

This is the authoring workflow: configure the view by playing with it, then
copy the embed code into the document.

### 4. Docs

`docs/EMBEDS.md` (this file) gains a usage section when built; `README.md`
gets a short "Embedding" note. A demo explainer page (e.g.
`docs/articles/complex-functions.html` or a Markdown page rendered by the
sessions pipeline) can serve as the reference embed host on the same Pages
site.

> **Built so far:** reference host pages ship under `public/` (copied to the
> Pages root) and cross-link:
> - `embed-demo.html` — the minimal "Seeing e^z" demo.
> - `complex-functions-guide.html` — *What the functions do*: how each `f` is
>   computed (`complexMath.ts`) and what it does to the plane (Plane Transform
>   embeds).
> - `complex-particles-guide.html` — *From 4D to your screen*: the 4D→3D
>   projections and quaternion rotations (`viewpoint.ts`, `quat4.ts`, the
>   `surfacePos` shader).
> - `complex-rendering-guide.html` — *How the surface is drawn*: the render
>   modes (Points/Sheet/Tiles/Net) and adaptive density
>   (`createParticleGeometry.ts` + the per-mode shaders).
>
> A roadmap for extending the series to the other apps (and the embed-route
> investment that unlocks them) is in the branch's session reports
> (`docs/sessions/.../2026-06-14-S02-explainer-series-plan.md`).

## Phase 2+ (separately scoped)

- **More apps**: the codec is per-app (each app declares its param table);
  Plane Transform and the fractal viewers are natural next pilots. Multi-view
  apps embed one named view (`view=` param).
- **Web-component packaging** (approach B) if iframe-less embedding becomes a
  requirement: wrap EmbedShell + codec in a custom element, lib-mode Vite
  build, versioned releases.
- **Poster/screenshot export** (PNG of the current view) — cheap once the
  share dialog exists; useful for static contexts (papers, slides).

## Constraints noted

- GitHub Pages sends no `X-Frame-Options`, so the deployed site is already
  frameable — no config needed.
- Many iframes on one page each get their own WebGL context; browsers cap
  contexts per page (~8–16). Pause-offscreen keeps memory and contexts in
  check for long documents; the docs should recommend ≤ 4 simultaneous
  visible embeds.
- The hash router means embed URLs are `…/animath/#/embed/…` — fine for
  iframes; no server-side routing needed.

## URL compatibility contract

Published embed URLs freeze app semantics into external documents: `fn=`
names index into `functionNames`, `proj=` aliases map to `ProjectionMode`
values, and render/motion names map to their registries. Those registries are
therefore **append-only with stable meanings** — never reorder or repurpose
an existing function index, projection alias, or mode name, or every embed
already published in an article silently changes its picture. Retiring a
value means keeping its alias parsing as a redirect to the successor (as
`proj=stereo` now maps to the Torus projection).
