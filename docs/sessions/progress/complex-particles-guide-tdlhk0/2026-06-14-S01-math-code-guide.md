---
kind: progress
session: 2026-06-14-S01
date: 2026-06-14
title: A math-and-code user guide for Complex Particles
branch: claude/complex-particles-guide-tdlhk0
slug: complex-particles-guide-tdlhk0
status: in-progress
build: passed
followup: null
thumbnail: assets/2026-06-14-S01-guide-top.png
pr: null
app: complex-particles
---

# A math-and-code user guide for Complex Particles

## Session purpose

Create a **user guide** for Complex Particles that explains the *math behind the
visualizations* — not the specific functions/curves, but the **equations and
transformations** that turn a 4-D point `(x, y, u, v)` into the 3-D points on
screen, and what determines the **quaternion rotations**. The guide should read
like a **code manual crossed with math instruction**: styled like the embed demo
(`/embed-demo.html` — article prose with live `<iframe>` applets), but going
further by quoting **specific lines of source** to show how each equation is
actually computed.

## Previous session

First tracked session on this branch. The most recent particle handoff is
[`complex-particles-torus-crash-tile` S02](../../handoff/complex-particles-torus-crash-tile/2026-06-14-S02-domain-region.md)
(PR #216): smoothed the continuous perspective floor and added a polar
**Domain region** radius band — independent of this documentation work, but it
confirms the current state of the projection math (`viewpoint.ts` /
`shaders/index.ts`) that the guide will document.

## Working notes

<!-- Newest entry first. -->

### 🟡 milestone · 14:40 — Functions guide written + verified
**Why:** Second page complete; build green and both new embed kinds confirmed live.

`public/complex-functions-guide.html` — *What the functions do*, same series
style. Eight sections: color-as-fingerprint (`calcColor` core) → z^n angle-doubling
(`complexSquare`/`complexCube`) → 1/z inside-out + the pole guard (`complexInv`) →
exp (`complexExp`) → ln & the branch index, finite-sheet roots (`complexLnBranch`,
`complexSqrtBranch`, `branchPeriod`) → trig-is-exp (`complexSin`) → Joukowski /
Möbius / Gamma (`complexJoukowski`, `complexGamma` reflection) → a "read any
function at a glance" field-guide table. Plane-Transform embeds show f warping the
colored plane; the √z particle embed shows the two-sheet Riemann surface.

![√z two-sheet Riemann surface (particle embed)](assets/2026-06-14-S01-sqrt-sheets.png)

`npm run build` passes; copies to `dist/`. Headless: `plane-transform?fn=exp`
(two-pane domain·image) and `complex-particles?fn=sqrt&render=Sheet` both report
live WebGL and render the expected pictures. Cross-linked both guides' footers.

### 🟢 code · 14:35 — Second page: the functions guide
**Why:** User asked for a companion explaining the functions — how each is
computed and what that means for its transformation — plus where else this
exposition would help.

Building `public/complex-functions-guide.html` in the same series style. Key
illustration vehicle: the **Plane Transform** embed
(`#/embed/plane-transform?fn=…`, params from `embedParams.ts` →
`parsePlaneEmbed`: `fn p q extent caption controls`), which shows `f` warping the
colored plane (domain · image) — exactly "what the computation means." Multivalued
sheets use the particle embed (`render=Sheet`). Sections: color-as-fingerprint →
z^n (angle-doubling) → 1/z & poles → exp → ln + the branch index (finite-sheet
roots: `branchPeriod` 2/3/q) → trig-is-exp → special (Joukowski/Möbius/Gamma) →
a "read any function at a glance" field guide. Quotes `complexMath.ts` (the
readable reference) with the GLSL twin noted. Cross-links with guide 1.

### 🟡 milestone · 12:55 — Guide written + verified headless; discoverability wired
**Why:** Deliverable complete; build green and every applet confirmed live.

Wrote `public/complex-particles-guide.html` — a standalone serif article
(embed-demo styling, extended with a TOC, displayed-equation blocks, and dark
code listings carrying `file:line` captions + accent-highlighted comments). Eight
sections: 4-D graph → the `surfacePos` pipeline → Perspective → Drop-axis →
Torus → Hopf/Sphere → quaternion rotations → numerical honesty. Each pairs a
real embed `<iframe>` with the exact source it documents.

`npm run build` passes; the page copies to `dist/complex-particles-guide.html`.
Verified headless via `scripts/shoot.mjs`: the `torus` (Möbius) and `hopf` (exp)
embeds both report live WebGL (SwiftShader, `ok:true`) and render the
nested-donut / full-sphere pictures the prose describes — the RGBELoader error is
just the headless HDR env map, not a shader fault. Screenshotted the full page
(top + quaternion section) — listings, equations, table, and applets all compose.

![Guide top — title, contents, and the 4-D graph section](assets/2026-06-14-S01-guide-top.png)

Wired discoverability: a closing link from `embed-demo.html` → the guide, and a
"Built so far" note in `docs/EMBEDS.md` naming both host pages. No app code
touched — purely additive docs.

### 🔵 finding · 12:30 — `surfacePos()` is the whole pipeline in one function
**Why:** Found the single source-of-truth transform to anchor the guide on.

Read `complexMath.ts`, `shaders/index.ts`, and `createAnimationLoop.ts`. The
GLSL `surfacePos(vec2 zc)` is the entire 4D→3D path in seven lines: `domainWarp`
→ `applyComplex` (→ `(u,v)`) → `chartCoord` → assemble `vec4(zP.x,zP.y,fP.x,fP.y)`
→ `quatRotate4D(p4, uRotL, uRotR)` → `project(p4, uProjMode)` → `*1.5`. That's the
guide's centerpiece. And `createAnimationLoop` answers "what determines the
quaternions": the default tumble composes `quarterQuat('XY',t·.5)·('YU',t·.7)·
('XV',t)` into `dynL/dynR`, then multiplies the user's accumulated `rotL/rotR`
(eighth-turns + spins). `project()` (GLSL mode 0–7) mirrors `viewpoint.ts` 1:1.

### 🟢 code · 12:20 — Plan confirmed; entering implementation
**Why:** User answered the last two scoping questions; build is green-lit.

- **Audience:** *teach the 4-D math from scratch* — explain quaternions, S³,
  stereographic projection, and the Hopf map, not just the code. Self-contained
  math instruction.
- **Code layers:** user deferred to my call. Decision: **TypeScript is the
  spine** (`viewpoint.ts` `project()` and `quat4.ts` `quarterQuat` read like the
  equations), **add GLSL only where the GPU path is the real one and differs** —
  the floored perspective denominator, the soft-floored torus pole, and the
  `|f|>10³` pole clamp. Avoids doubling every snippet.

Artifact: `public/complex-particles-guide.html` (standalone serif article, live
`<iframe>` applets + quoted code, deploys to `/animath/`). 7 sections: 4-D
graph → Perspective → Drop-axis → Torus → Hopf/Sphere → Quaternion rotations →
Numerical honesty. Each pairs a real embed URL with its source lines. Will
verify embeds render headless before finalizing.

### 🟣 decision · 12:12 — Format chosen: standalone HTML page, hand-quoted code
**Why:** Two scope questions genuinely shaped the build; user answered both.

- **Format:** a **standalone HTML article** under `public/` (like
  `embed-demo.html`) — serif prose, live `<iframe>` applets between sections,
  *and* quoted code blocks. Deploys at `/animath/<name>.html`.
- **Code fidelity:** **hand-quoted snippets** with `file:line` references (not
  pinned-commit permalinks). Keep snippets short and faithful to the live source.

Next: present the section-by-section build plan for confirmation, then write the
page (no app code changes — additive doc only).

### 🟣 decision · 12:08 — Scoped the task before starting
**Why:** The user asked me to explain back what they want and why before any work.

Oriented via the start-session skill: this is a new branch (no prior handoff
here). Read the core math sources the guide must document — `lib/viewpoint.ts`
(the `project()` projection modes: Perspective divide, Stereo, Hopf map, Torus
stereographic, drop-axis), `math/quat4.ts` (`quarterQuat` — the L·p·conj(R)
plane rotations), the existing `EXPLAINER.md` (already strong conceptual prose),
and `public/embed-demo.html` (the stylistic reference: serif article with live
iframe applets). Confirmed the guide is *additive* documentation, not a code
change to the app. Awaiting user confirmation of scope/format/location before
building.
