---
kind: plan
session: 2026-06-14-S02
date: 2026-06-14
title: An explainer-page series for animath — roadmap beyond the complex trilogy
branch: claude/complex-particles-guide-tdlhk0
slug: complex-particles-guide-tdlhk0
status: proposed
build: passed
followup: null
thumbnail: assets/2026-06-14-S02-net-inverse.png
pr: null
app: docs, complex-particles
signals: needs-dan, not-live
next: Decide whether to fund the embed-route work (B0) that unlocks app-specific guides.
---

# An explainer-page series for animath — roadmap beyond the complex trilogy

## What exists now

Three standalone guide pages ship under `public/` (deploying to the Pages root),
each pairing serif prose with **a live embedded applet** and **the exact source
lines** that compute the math. They cross-link as a trilogy:

1. **`complex-functions-guide.html`** — *What the functions do*: how each `f` in
   `lib/complexMath.ts` is computed and what it does to the plane.
2. **`complex-particles-guide.html`** — *From 4D to your screen*: the 4-D graph,
   the projections (`viewpoint.ts`), and the quaternion rotations (`quat4.ts`).
3. **`complex-rendering-guide.html`** — *How the surface is drawn*: the render
   modes and adaptive density (`createParticleGeometry.ts` + the per-mode shaders).

The **format is proven and cheap to extend**: a single self-contained HTML file
(inline CSS, no build step, no JS), live applets via the existing `#/embed/…`
routes (`docs/EMBEDS.md`), code quoted by hand with `file:line` captions, and
headless verification via `scripts/shoot.mjs`.

## The gating constraint (read this first)

Live embeds **only exist for two apps**: Complex Particles and Plane Transform
(`src/lib/embedParams.ts`, routes `#/embed/complex-particles` and
`#/embed/plane-transform`). Every guide above reuses them. **Any guide about a
different app needs either (a) a new embed route for that app, or (b) static
images / short screen captures.** This splits the roadmap cleanly into "cheap"
(reuses existing embeds) and "needs infrastructure first."

So the roadmap has two tracks, and **Track B's first task is an embed-route
investment** that unlocks every app-specific guide after it.

---

> **Update (S02, 2026-06-14):** Track A is **done** — all three pages built and
> verified, plus the **Guides hub** (`public/guides.html`). A2 needed a small
> additive `pattern=` embed param (now in `embedParams.ts`). The trilogy +
> these three + the hub = six cross-linked pages. Track B (B0 embed-route
> investment → B1–B4) remains the open roadmap.

## Track A — reuses existing embeds (cheap, high-confidence)

### A1. "How a complex number becomes a color" — coloring & colormaps
**Status: DONE (S02) · `public/complex-color-guide.html`**

The rendering guide and the functions guide both touch domain coloring lightly.
A dedicated page would cover the full `calcColor` (shaders/index.ts:331–401):

- phase → hue, magnitude → brightness (the default), and the **Quantity** selector
  (phase / log-modulus / real / imag) that re-targets the hue axis;
- the independent **Brightness** channel;
- the **sequential colormaps** (Viridis / Magma / Inferno / Plasma / Fire / Ocean,
  via `lib/colormaps.ts` `PALETTE_GLSL`) that replace the HSV wheel;
- **contour repeat** (`uColorRepeat`) — the seamless mirrored banding that turns a
  colormap into level sets;
- color-by **domain vs range** (`uColorBy`).

Embeds: `#/embed/complex-particles?...&colormap=2&colorby=range` etc. — all params
already in `embedParams.ts`. **Recommended next page.**

### A2. "Sampling the plane" — the domain patterns
**Status: DONE (S02) · `public/complex-sampling-guide.html`** (added a `pattern=` embed param)

Grid / Polar / Rings / Spokes / Web / Squares / Random from `fillPattern`
(`createParticleGeometry.ts`). Note: `SamplePattern` is **not** an embed param
today, so this either (a) folds into the rendering guide as an extra section, or
(b) gets a small `pattern=` addition to `parseParticleEmbed`. Lowest priority —
likely a section, not a page.

### A3. "Two planes, one map" — Plane Transform deep-dive
**Status: DONE (S02) · `public/complex-plane-transform-guide.html`**

The functions guide uses Plane Transform as an illustration; a dedicated page
could explain the domain↔image linkage, the grid-warp rendering, and how it is the
same `f` as the 4-D viewer seen as a flat transformation. Modest value given the
overlap — **optional**.

---

## Track B — needs an embed route or static media first

### B0. **Embed routes for the other apps** (the enabling investment)
**Status: proposed · effort: M–L · unblocks B1–B4**

Generalize the embed pattern (`embedParams.ts` + an `Embed*` wrapper per app, as
Complex Particles / Plane Transform already do) to at least Fractals and one
geometry app. Each app declares its own readable param table; the chrome-less
route renders one view. This is the single highest-leverage task for the series —
do it once and every app becomes guide-able with live applets. Scope per app is
small (a param codec + a thin wrapper component), but it touches app code, so it
wants its own focused session and `npm run build` gate.

### B1. Fractals — escape-time iteration & the Mandelbrot ↔ Julia correspondence
**Status: proposed · effort: M · embeds: needs B0 (fractals route)**

Highest audience appeal outside the complex trilogy. Content: the escape-time
algorithm (`z → z² + c`, iteration count → color), the palette mapping
(`lib/colormaps.ts`), Burning Ship / Tricorn variants, and — the centerpiece — the
**Mandelbrot ↔ Julia correspondence** (the `Correspondence` split-pane app is
purpose-built for this: a point in the Mandelbrot set *is* a Julia set). Source:
`animations/FractalsGPU/`, `animations/Correspondence/`. Pairs beautifully with the
two-pane embed idea once B0 lands.

### B2. Closed surfaces — Topology Walk & Polygon Worlds
**Status: proposed · effort: M · embeds: needs B0 or captures**

Gluing one polygon into every closed surface (torus, Klein bottle, projective
plane) and walking it first-person. Deep, beautiful topology. Caveat: first-person
view is awkward in a tiny iframe, so this may lean on **short screen captures** +
diagrams rather than a live embed even after B0. Source: `animations/TopologyWalk/`,
`animations/PolygonWorlds/` (+ `corridorGeometry.ts`, the gluing tables).

### B3. The three-body problem — Trinary Stars
**Status: proposed · effort: M · embeds: needs B0 or captures**

The gravitational integrator (`lib/nbody/`), sensitive dependence / chaos, and the
Observatory↔Lab framing. Rich physics; the Lab's ensemble view is a strong visual.

### B4. Algorithms as geometry — Stable Matching & Trees and Nets
**Status: proposed · effort: M–L · embeds: needs B0 or static**

Two algorithmic stories: **Gale–Shapley** and the **lattice of stable matchings**
(`animations/StableMatching/`), and the **associahedron** / M̄₀,ₙ(ℝ)
(`animations/TreesAndNets/`, `lib/associahedron.ts`). Niche but mathematically
deep; lower priority than B1–B3.

---

## Meta-move — a Guides hub

**Status: `guides.html` DONE (S02)** — the index page ships, grouping the six
pages into "The math" + "Going deeper" and linking the embed demo. Still open:
the **Gallery link** and the **EXPLAINER deep-links** (both touch app code).

Once there are 4+ pages, collect them into a small **`guides.html` index** (same
serif styling) and:

- link it from the **Gallery** (a quiet "Guides" entry) so the pages are
  discoverable, not just deep-linkable;
- have each app's in-app **?** explainer (`EXPLAINER.md`) **deep-link** to its
  guide ("Read the full guide →"), tying the conceptual popup to the code manual;
- list the hub on the sessions control center / `docs/EMBEDS.md` as today.

This is an XS task and worth doing as soon as the trilogy + A1 are live.

---

## Recommended order

1. **A1 — coloring & colormaps** (cheap, completes the "complex viewer" quartet).
2. **Guides hub + gallery link + EXPLAINER deep-links** (makes all four
   discoverable).
3. **B0 — generalize embed routes** (the unlock; its own session).
4. **B1 — Fractals / Correspondence** (highest appeal once B0 lands).
5. **B2 / B3** as appetite allows; **B4** last.

## Risks / notes

- **Code drift.** The guides quote `file:line` ranges by hand. If the shaders or
  `complexMath.ts` are edited, captions can go stale. Mitigation: the quotes are
  short and conceptual; consider a lightweight check later, but it is not worth
  automating yet for three pages.
- **Base-path caveat.** The pages render anywhere, but their embedded applets need
  the SPA, which is built with Vite `base: '/animath/'` — so applets are live on
  GitHub Pages (served under `/animath/`) but may be blank on a Cloudflare
  `*.pages.dev` deploy served at the root. A relative-base (`base: './'`) change
  would fix all mount points but is a **shared-config** edit affecting every app
  and branch — propose separately, not bundled into a guide.
- **Append-only discipline.** These are all `public/` additions; no shared-file
  edits beyond `docs/EMBEDS.md` notes, so the work stays conflict-free with the
  parallel app branches.
