---
kind: three-hats
session: 2026-07-06-S01
date: 2026-07-06
title: "Division Bells — Framework Maintainer review"
branch: claude/modest-cannon-umd49e
slug: modest-cannon-umd49e
status: completed
build: n/a
app: general
---

# Division Bells — Framework Maintainer review

I am wearing the **Framework Maintainer** hat: steward of `src/chrome/workspace/`,
the closed 11-archetype rail, `lib/particles` + `ParticleViewerShell`, theming v2,
the append-only parallel-branch contract, and the operational reality that the only
CI gate is `npm run build` (`tsc && vite build`). My job is not to judge whether the
math teaches well (that's the pedagogy hat) or whether the architecture is elegant
(the consultant's hat) — it is to answer one question: **does this proposal fit the
machine we actually have, and will it merge cleanly next to five other in-flight app
branches?**

The short version: yes, this is a well-shaped app that lands squarely in an existing
groove (Argand + Counting the Ways), and the author clearly read the framework. But
the brief is written as if the codebase is a little cleaner than it is, and it
under-counts the shared surface it will touch and over-counts what one session can
build. Details below.

## Plan under review

<details>
<summary>Original request</summary>

> Design review for a new animath app "Division Bells" that teaches Mahalanobis
> separation and Kullback–Leibler divergence as two lenses on the same pair of 2-D
> Gaussians. See the design summary in
> docs/sessions/progress/modest-cannon-umd49e/2026-07-06-S01-mahalanobis-kl-divergence-app.md.
>
> **GOAL:** Teach Mahalanobis separation and Kullback–Leibler (KL) divergence as two
> lenses on the SAME pair of 2-D Gaussians P=N(μ₁,Σ₁), Q=N(μ₂,Σ₂). Framing chosen
> with Dan: "one scene, two lenses." Rendering: SVG + Canvas 2-D (NOT WebGL), like
> Counting the Ways / Stable Matching.
>
> **THE MATH (teaching hook):** KL(P‖Q) = ½[ (μ₂−μ₁)ᵀΣ₂⁻¹(μ₂−μ₁) + tr(Σ₂⁻¹Σ₁) − k −
> ln(detΣ₁/detΣ₂) ], k=2. First term = squared Mahalanobis distance of the means in
> Q's metric. So if Σ₁=Σ₂=Σ: KL = ½·d_M² exactly (Mahalanobis is the mean-shift part
> of KL); if covariances differ, KL adds a covariance-mismatch term and becomes
> ASYMMETRIC (KL(P‖Q)≠KL(Q‖P)) while pooled-Σ Mahalanobis stays symmetric. The app
> decomposes KL live into ½[Mahalanobis²(means) + covariance-mismatch].
>
> **THE SCENE (one immersive 2-D plane view):** Two Gaussians P (blue)/Q (orange),
> each = draggable mean marker + 1σ/2σ covariance ellipses with rotate+scale handles
> (sets Σ via angle+σ₁,σ₂, no matrix typing) + faint canvas density heat. Overlays:
> mean-difference vector; a WHITENING toggle ("view from P's frame") warping the plane
> by Σ^(−1/2) so the reference Gaussian becomes a unit circle and Mahalanobis =
> Euclidean distance; a KL integrand p·log(p/q) SIGNED heat layer showing where
> divergence comes from. Optional second view: 1-D slice along μ₁→μ₂ axis (two bells,
> overlap, log-ratio). Build plane first, add slice if room.
>
> **READOUTS (Analyze tier, shared readouts.tsx Breakdown/StatGrid):** Mahalanobis
> d_M (σ-units) symmetric (pooled Σ) + directed (P's/Q's metric); KL(P‖Q) & KL(Q‖P)
> (nats + bits) asymmetry called out; Breakdown of KL = ½[Mahalanobis² + trace +
> log-det − k]; maybe Bhattacharyya/symmetric KL bonus.
>
> **STRUCTURE:** Folder `src/animations/DivisionBells/` (main .tsx + EXPLAINER.md +
> optional README.md). Pure engine `gaussian2d.ts`: 2×2 SPD matrix (angle+σ₁,σ₂ ↔
> matrix), inverse/det/trace/quadratic form, pdf, Mahalanobis, whitening Σ^(−1/2), KL
> closed form + decomposition, optional Bhattacharyya/Hellinger — unit-tested same
> commit (RECIPE R4). Panels from closed archetype vocab: Define (P/Q, means,
> covariances) · Render (layers + colormap) · Analyze (Mahalanobis + KL breakdown) ·
> optional Drive (sweep μ₂ / morph Σ) · System. One immersive plane view;
> `<Workspace appId="division-bells" …>`. Theme-token driven: colormap from
> `lib/colormapRegistry.ts` (divergent for KL integrand, sequential for density), P/Q
> as `--data-*`, no hardcoded scene colors, tracks skin×mode via
> `useThemeTokens`/`readThemeTokens`. Append-only shared edits: `src/index.tsx` route
> `#/division-bells`, `src/apps.ts`, `src/chrome/catalog.ts` META, `README.md` +
> `CLAUDE.md` rows.
>
> **OPEN QUESTIONS:** which "Mahalanobis separation between two distributions"
> convention (shared-Σ vs pooled Σ=(Σ₁+Σ₂)/2 vs directed-in-Q) — name it honestly;
> canvas density/integrand cost + smoothness on drag / mobile (390×844) without WebGL;
> intuitive Σ-setting via ellipse handles + degenerate/near-singular covariance
> handling (KL→∞, whitening blows up); does whitening (whole plane warps) confuse —
> toggle vs separate view; is two concepts in one app too much or exactly the
> unification that earns it.

</details>

## Executive summary

| Dimension | Verdict | Note |
|---|---|---|
| Fits an existing rendering pattern | ✅ strong | Argand (immersive drag-on-plane SVG) + Counting the Ways (SVG teaching + tested engine) are near-exact precedents |
| Uses the chrome correctly | ✅ mostly | `<Workspace>`, closed archetypes, ControlPanel, readouts.tsx, `usePersistentState` — all correctly named |
| Parallel-branch safety | 🟡 one gap | omits the `previews.tsx` `PreviewKind` edit; Category is a closed set (`Algorithm` is the only fit) |
| Theming v2 compliance | ✅ / 🟡 | brief's `--data-*` for P/Q is *more* correct than the closest precedent; SVG-vs-canvas theming split is real and unstated |
| Canvas density/integrand cost | 🔴 real risk | no in-app full-window 2D density precedent; must use offscreen-buffer + throttle, or defer for MVP |
| Novel interaction (ellipse handles) | 🟡 risk | rotate+scale handles have no shared precedent; sliders-first is the cheap path |
| Engine + unit tests | ✅ strong | matches R4 / BUILDING_AN_APP §6 exactly; degenerate-covariance must be a *requirement*, not an open question |
| Scope for one session | 🟡 broad | ~10 features listed; needs an explicit walking-skeleton cut |

**Bottom line:** endorse building it. Ship a walking skeleton first (means + σ-ellipses
via sliders + the KL/Mahalanobis Breakdown), defer the canvas heat / whitening / slice,
and add the one shared-file edit the brief forgot.

## 1 · Rendering pattern — this is Argand's twin, not new territory

The brief says "SVG + Canvas 2-D, like Counting the Ways / Stable Matching." That's
*almost* right, and the imprecision matters because it hides where the real work is.

- **Counting the Ways** (`CountingTheWays.tsx`) is **SVG-only** in-app. Its lattice,
  histograms and mini-distributions are all `<svg>` with `fill="var(--accent)"` — no
  in-app `<canvas>` at all (the only canvas for that app lives in the gallery
  *preview*). It ships a tested pure engine (`skellam.ts` + `__tests__/`) and uses
  Explain/Lab **modes**.
- **Stable Matching** is **DOM/CSS + SVG**, no canvas.
- The genuinely closest precedent the brief doesn't cite is **Argand**
  (`Argand.tsx`): a single-view, `immersive`, draggable-things-on-a-colored-plane app
  rendered as **SVG** with a floating control HUD overlaid on the view. That is
  Division Bells' silhouette exactly: drag markers on a plane, color-coded handles, an
  immersive fill-the-stage plane.

> [!IMPORTANT]
> **The SVG parts have three strong precedents; the canvas parts have none in a
> full-window app.** Every draggable/vector/ellipse element should be SVG (like Argand
> and Counting the Ways). The *only* thing that wants canvas is the density heat and
> the KL-integrand heat — and that is precisely where the perf and theming complexity
> concentrate (§4). Treat "SVG + Canvas" as "SVG for everything, plus an optional
> canvas heat layer we may or may not ship," not as a 50/50 split.

There *is* an in-app 2D-canvas precedent worth reusing if the heat layer is built:
`AgenticSorting/useCanvas2D.ts` — a DPR-aware `ResizeObserver` helper that sizes the
backing store, ignores zero-size (collapsed windows), and re-attaches on deps change.
Copy that pattern rather than hand-rolling canvas sizing; it already solves the
zero-size-on-collapse trap that BUILDING_AN_APP §4b warns about.

## 2 · Chrome integration — correctly specified, with one omission

The brief names the right pieces: `<Workspace appId="division-bells">`, the closed
archetype vocabulary, ControlPanel primitives, `readouts.tsx` Breakdown/StatGrid,
`usePersistentState`, theme tokens. The archetype mapping it proposes is legal:

| Panel | `arch` | Tier | Legal? |
|---|---|---|---|
| P/Q, means, covariances | `subject` (or split `subject`+`domain`) | Define | ✅ |
| Layers + colormap | `color` (+ maybe `marks`) | Render | ✅ |
| Mahalanobis + KL breakdown | `readout` | Analyze | ✅ |
| Optional sweep μ₂ / morph Σ | `playback` | Drive | ✅ (see §7) |
| System / detail | `quality` | System | ✅ |

No new icons, no vocabulary stretch. Good — that is the single most common way a new
app tries to break the rail contract, and this one doesn't.

> [!WARNING]
> **The brief's "append-only shared edits" list is missing `src/chrome/previews.tsx`
> and understates `catalog.ts`.** The gallery card metadata in `catalog.ts` is
> `{ cat: Category; kind: PreviewKind }` and **both are closed unions**:
>
> - `Category = 'Complex' | 'Fractal' | 'Dynamics' | 'Algorithm'`. A pair-of-Gaussians
>   statistics app has no clean home; `'Algorithm'` is the only defensible fit (it's
>   where Counting the Ways/`skellam` already sits). Live with the loose fit — do **not**
>   add a fifth category (that touches `CATEGORIES` *and* the filter chips and is a
>   framework change, not an app change).
> - `PreviewKind` is a closed union in `previews.tsx`, and **every card must supply a
>   `kind`**. There is no "generic" fallback that reads as this app. So Division Bells
>   must either (a) reuse an existing preview kind that misrepresents it, or (b) add a
>   new kind — which means **three edits to `previews.tsx`**: the union member, a new
>   `DivisionBellsPreview` draw function, and a `switch` case. That file is **not** on
>   CLAUDE.md's append-only list, and a preview is a real deliverable (a cheap 2-Gaussian
>   sketch), not a checkbox.

This is the one place the brief will surprise the builder. It is not hard, but it is an
extra ~40-line draw function and a shared-file touch the plan doesn't budget. Add it to
the checklist now.

## 3 · Theming — the brief is *more* correct than the precedent, and should say so

CLAUDE.md's locked color roles: `--accent`/`--accent-2` are **UI-voice only, never
data**; unordered identity → `--data-1..7`; ordered/polar → a registry colormap.

The brief proposes **P/Q as `--data-*`** and colormaps for the heat (divergent for the
signed KL integrand, sequential for density). That is textbook-correct and I endorse it
without reservation.

> [!NOTE]
> The closest precedent actually **bends** this rule: Counting the Ways paints its two
> data channels with `var(--accent)` and `var(--accent-2)` (see the `Lattice`
> component's `fill={onDiag ? 'var(--accent-2)' : 'var(--accent)'}`), justified by a
> code comment ("both theme tokens, so every skin works"). Don't copy that shortcut.
> Division Bells has *two labeled identities* (P, Q) — that is the exact use case
> `--data-1`/`--data-2` exists for. Using accent for P and accent-2 for Q would read as
> a bug to the next maintainer and would collide with the UI voice on some skins.

Two theming subtleties the brief should nail down:

1. **SVG themes for free; canvas does not.** SVG `fill="var(--data-1)"` resolves live
   against `data-theme`/`data-scheme` with zero JS (Counting the Ways relies on this).
   But `ctx.fillStyle = 'var(--data-1)'` on a canvas is a no-op — `var()` doesn't
   resolve in the 2D context. So the heat layers **must** read resolved hexes via
   `readThemeTokens`/`useThemeTokens` and pass hex strings (and `hexToRgb` from
   `colormapRegistry` for `ImageData`). The brief cites the right helpers; just be
   explicit that only the canvas layers need them and the SVG layers must **not**
   duplicate that work.
2. **Track skin × mode, do not force dark.** A Gaussian density plot is not a "glowing
   particle stage," so it should follow the user's mode (native/light/dark), not force
   dark like Complex Particles/Trinary. The brief's "tracks skin×mode via
   `useThemeTokens`" is correct — and SVG gets this automatically, so a canvas redraw
   effect must depend on **both** `themeId` and `themeMode` (theming v2 rule #3;
   `useThemeTokens` already keys on both).

## 4 · The canvas heat layer is the one genuine engineering risk

This is where I push hardest, because it is the part with no in-repo precedent at
full-window scale and the part the brief flags but does not resolve.

Evaluating two 2-D Gaussian pdfs per pixel, per frame, while dragging, on a phone
(390×844 at DPR 2–3 ≈ 1.5–2.4M device pixels) is a lot of `Math.exp` in a `requestAnimationFrame`
loop with no GPU. The KL integrand `p·log(p/q)` adds a `log` and a second pdf per pixel.
Done naively this will jank on drag on exactly the device the brief worries about.

The repo already contains the mitigation pattern, in the gallery previews: the
fractal/Julia previews compute into a **small offscreen canvas** (110–260 px on a side)
and `drawImage`-upscale with smoothing. That is the move here too:

- Render heat to a **downsampled offscreen buffer** (~160–220 px major axis), upscale
  with `imageSmoothingEnabled`. The density field is smooth; bilinear upscaling hides
  the low resolution completely.
- **Decouple recompute from drag.** Redraw the heat on pointer-**up** (or a throttled
  rAF, not every pointermove). During a drag, move the SVG markers/ellipses (cheap) and
  leave the last heat frame in place, or recompute at an even lower res. The Mahalanobis/
  KL readouts (§6) recompute instantly — they are closed-form scalars, not per-pixel.
- **Precompute per-pixel constants.** Σ⁻¹ and the normalizer are constant across the
  frame; the per-pixel cost is one quadratic form + one `exp`.

> [!IMPORTANT]
> My recommendation: **the density heat and the integrand heat are the two most
> deferrable features in the whole brief.** They are eye-candy that carries the entire
> non-WebGL perf risk. Ship the MVP (§8) without them, prove the unification story with
> SVG ellipses + the Breakdown, then add the heat as a follow-up with the offscreen-buffer
> discipline above. If the heat *is* in the first cut, make "offscreen buffer + throttled
> recompute" a hard requirement, not a nice-to-have — retrofitting it after a naive
> version is more work than doing it once.

## 5 · `immersive` vs. windowed vs. the optional second view — pick one now

The brief says "one immersive plane view" **and** "optional second view: 1-D slice …
add slice if room." Those two sentences are in tension with the actual `Workspace`
contract:

```
immersive?: boolean — "when set and the app has a single view, that view fills the
stage … Ignored on phone … and when there isn't exactly one view."
```

So the moment a second `ViewDef` (the slice) exists, `immersive` silently becomes a
no-op and the app falls back to windowed. You cannot have "immersive plane **plus** a
slice window." Three coherent options, choose deliberately:

| Option | Shape | Precedent | My lean |
|---|---|---|---|
| A. Immersive single plane | one view, `immersive`, readouts as floating panels | **Argand** | ✅ for MVP |
| B. Windowed multi-view | plane window + slice window, no `immersive` | Counting the Ways, Correspondence | if the slice is core |
| C. Immersive plane, slice as an inset | one view node containing plane + a small SVG slice strip | (bespoke, but legal) | good compromise |

> [!NOTE]
> Argand proves option A is exactly right for a draggable-on-a-plane app, and it keeps
> the Analyze readouts as floating panels the user can move over the plane. I'd build A,
> and if the slice earns its place, fold it into the same view node (option C) as a
> bottom strip rather than promoting it to a second window and losing immersive. Don't
> design for both A and B at once — that ambiguity is the "build the maximal version
> then ask" trap BUILDING_AN_APP calls out as the costliest recurring habit.

## 6 · Engine + tests — the strongest part of the brief

`gaussian2d.ts` as a pure, unit-tested module (2×2 SPD via angle+σ₁,σ₂; inverse/det/
trace/quadratic form; pdf; Mahalanobis; whitening Σ^(−1/2); KL closed form +
decomposition) is exactly what the framework wants (BUILDING_AN_APP §6, RECIPE R4). It
is all cheap, closed-form, and eminently testable — Counting the Ways' `skellam.ts` is
the template. This is textbook.

Two correctness requirements I want promoted from "open question" to "must":

- **Degenerate / near-singular covariance is not an open question — it is a hard
  requirement.** Σ → singular makes KL → ∞ and Σ^(−1/2) undefined; the whitening warp
  blows up; the ellipse collapses to a line. The engine must **floor the eigenvalues**
  (σ_min > 0) at construction, and the UI must clamp the σ sliders/handles above zero.
  Ship a unit test for the degenerate path (a near-singular Σ returns finite,
  clamped values and a well-defined whitening) so the next session can re-run it.
- **Name the Mahalanobis convention in the readout, not just the docs.** The brief's
  open question (shared-Σ vs pooled Σ=(Σ₁+Σ₂)/2 vs directed-in-Q) is genuinely a
  pedagogy call (the other hat should weigh in), but the framework requirement is
  simple: whatever you compute, **label each number with its convention in the
  StatGrid/Breakdown** — "d_M (pooled Σ)", "d_M→Q (Q's metric)". The brief already
  proposes showing symmetric-pooled + both directed, which is the honest resolution.
  Endorse — just make the labels carry the convention so the number is never ambiguous.

The KL Breakdown collapsing to ½·d_M² when the ellipses match is the **payload of the
whole app**, and it is the cheapest thing in the brief to build (three scalars into a
`readouts.tsx` `Breakdown`). Build that first; it is the demo that justifies the app.

## 7 · Action strip & modes — probably neither, and that's fine

- **No action strip** for the MVP. BUILDING_AN_APP §4d is explicit: "Gesture-driven
  viewers (pan/zoom/draw apps) should **not** pass actions — their begin-affordance is
  the view itself." Division Bells' begin-affordance is dragging the means/ellipses.
  Argand (the closest precedent) ships no action strip. Only if the optional **Drive**
  panel (auto-sweep μ₂ / morph Σ) is built does a `playback` archetype + a small
  action strip (Play/Pause/Reset projecting that panel) become appropriate.
- **No modes** needed. Unlike Counting the Ways (Explain/Lab), Division Bells is one
  coherent scene. The whitening toggle, layer toggles, etc. are all Render-tier
  checkboxes/pills — not top-bar modes. Keep it single-mode.

## 8 · Scope — draw the walking-skeleton line explicitly

Counting one feature per noun, the brief lists roughly: draggable means · rotatable +
scalable 1σ/2σ ellipses (drag handles) · density heat · mean-difference vector ·
whitening warp · signed KL-integrand heat · optional 1-D slice · Mahalanobis readouts
(symmetric + 2 directed) · KL(P‖Q) & KL(Q‖P) in nats+bits · KL Breakdown · optional
Drive sweep · optional Bhattacharyya/Hellinger. That is ~13 features. History (and
BUILDING_AN_APP's boxed warning) says a session that tries to land all of that ends in
3–5 build/revert cycles.

Because each app is a self-contained folder and each feature here is independently
additive, the clean move is a small, shippable core first:

> [!IMPORTANT]
> **Proposed MVP (the walking skeleton):**
> 1. `gaussian2d.ts` + tests (all the math, including whitening & Bhattacharyya — math
>    is cheap and belongs in the engine regardless of what the UI shows yet).
> 2. SVG plane, immersive (option A): draggable P/Q **mean markers** + **1σ ellipses**
>    whose shape is set by **angle + σ₁ + σ₂ sliders** in the Define panel
>    (`ControlPanel.Slider` — zero-risk), plus the mean-difference vector.
> 3. Analyze readout: KL(P‖Q), KL(Q‖P), d_M, and the **KL Breakdown** collapsing to
>    ½·d_M² when the ellipses match. **This is the payload.**
>
> **Deferred, each its own follow-up:** rotate+scale **drag handles** on the ellipses
> (novel UI — see §9); **density heat** + **integrand heat** (the canvas perf risk,
> §4); the **whitening warp** (visually powerful but the "does it confuse?" open
> question is unresolved — ship it once, behind a toggle, after the core reads clearly);
> the **1-D slice**; **Bhattacharyya/Hellinger** in the readout.

Every deferred item is a clean addition to the same folder — nothing about shipping the
skeleton first blocks or complicates them. That is the whole point of the
self-contained-app design.

## 9 · Interaction: sliders before handles

Rotate + scale handles on an SVG ellipse (grab a rim handle to scale an axis, grab a
rotation handle to spin) are a **genuinely novel interaction with no shared precedent**.
`chrome/workspace/drag.ts` (pointer-capture helper) and `useViewportGestures` exist, but
neither gives you ellipse-handle semantics — it's bespoke pointer-event math (screen →
plane coords → decompose into angle/σ, respecting the whitening transform if active).
It's buildable, but it is the single most likely thing to eat a session, and it is
**not** required to tell the story.

> [!NOTE]
> Set Σ with **angle + σ₁ + σ₂ sliders** first (three `ControlPanel.Slider`s, exactly
> how a first version should look — and how Counting the Ways sets its rates). The
> ellipses redraw from those. Drag handles are a delightful enhancement to add once the
> math and the readout story are proven, not a prerequisite. Leading with the handles
> inverts the risk.

## 10 · Operational & parallel-branch check

| Concern | Status |
|---|---|
| `npm run build` (only CI gate) | Pure TS/React/SVG + a small canvas — no new deps, no build config. ✅ |
| New dependencies | None needed. Do **not** pull in a matrix/stats lib for a 2×2 case — hand-roll it (the repo hand-rolls `quat4`, `complexMath`, `nbody`). ✅ |
| Base-aware assets | No `public/` assets; nothing to path. ✅ |
| Append-only shared files | `index.tsx`, `apps.ts`, `catalog.ts`, `README.md`, `CLAUDE.md` — additive rows, keep Division Bells **above** the trailing plane-arithmetic pair in `apps.ts` (per that file's header note). ✅ **plus the missing `previews.tsx` edit (§2).** |
| Persistence | `usePersistentState` under a `division-bells:` namespace for μ, angle, σ, layer toggles — settings, not the transient drag. ✅ |
| Phone (≤740px) | Immersive solos the plane already; keep Define-panel slider rows narrow-friendly; `touchAction:'none'` on the plane; and the canvas heat (if shipped) must respect the §4 throttle or it will jank the phone the brief is worried about. 🟡 |
| Tests as a CI gate | Remember: `npm test`/`npm run lint` are **green-by-convention, not gates**. The `gaussian2d.test.ts` won't fail the build if it regresses — so the discipline of writing it and running `npm test` locally is the only thing protecting the engine. ✅ (with eyes open) |

Nothing here threatens the parallel-branch model. The bulk of the app is a
self-contained folder; the shared edits are additive; the only non-obvious shared touch
is `previews.tsx`, which still merges cleanly if appended.

## Verdict

**Endorse — build it.** Division Bells is a legitimately good fit: it reuses the Argand
"immersive draggable plane" shape and the Counting the Ways "SVG teaching app + tested
pure engine" shape, invents no new chrome, respects the closed archetype vocabulary, and
its core teaching hook (KL decomposing into ½·d_M² + a covariance term) is both exact and
cheap to render. The author read the framework and it shows.

**What I endorse without reservation:**
- The `gaussian2d.ts` pure-engine-with-tests structure (R4 / BUILDING_AN_APP §6).
- P/Q as `--data-*` and colormaps for heat — *more* theming-v2-correct than the closest
  precedent, which bends the accent-is-not-data rule.
- Single immersive plane view (Argand-style), no modes, no action strip.
- Showing symmetric-pooled **and** both directed Mahalanobis, honestly labeled.

**What concerns me (in priority order):**
1. **The canvas density/integrand heat is the only real engineering risk** and the brief
   flags but doesn't resolve it. No full-window in-app 2D-density precedent exists;
   naive per-pixel-per-frame Gaussian eval will jank on the 390×844 phone the brief
   names. Mitigate with the offscreen-buffer + throttled-recompute pattern (fractal
   previews + `AgenticSorting/useCanvas2D`) — or defer the heat entirely for MVP.
2. **Scope breadth** (~13 features) with no explicit skeleton line — the classic
   build-maximal-then-ask trap. Cut to the §8 MVP.
3. **The missing `previews.tsx` `PreviewKind` edit** — an un-budgeted shared-file touch
   and a real (small) deliverable, plus the reminder that `Category` is closed and
   `'Algorithm'` is the only fit.

**What I would change before a line of code:**
- Add `src/chrome/previews.tsx` (new `PreviewKind` + draw fn + switch case) to the
  shared-file checklist; assign `cat: 'Algorithm'`.
- Reframe "SVG + Canvas" as "SVG for all interactive/vector elements; canvas only for an
  optional, deferrable heat layer."
- Set Σ with angle/σ sliders in v1; make ellipse rotate/scale **drag handles** a
  follow-up, not a prerequisite.
- Promote degenerate/near-singular covariance from "open question" to a hard engine
  requirement (eigenvalue floor + a committed test for the degenerate path).
- Resolve the immersive-vs-slice fork now: immersive single plane (option A) for MVP;
  fold the slice in as an inset (option C) only if it earns its place — never a second
  window that silently kills `immersive`.

None of these are blockers. They are the difference between one clean session that lands
a shippable core and a thrash session that half-builds ten features. Ship the skeleton,
prove the ½·d_M² collapse, and let the heat and the whitening warp be the victory laps.

## Self-reflection

1. **What would you do with another session?** Prototype the one thing this review
   couldn't settle from reading code: whether an offscreen-downsampled canvas density
   field actually stays smooth-enough and jank-free while dragging on a real phone. That
   is the load-bearing uncertainty behind my "defer the heat" recommendation, and I
   argued it from the fractal-preview precedent rather than a measurement.
2. **What would you change about what you produced?** I'd compress §1–§3 — there's some
   overlap between "SVG themes for free" appearing in both the rendering-pattern and the
   theming sections. A tighter report would state it once.
3. **What were you not asked that you think is important?** Whether the KL integrand heat
   (signed `p·log(p/q)`) is even legible as a *diverging* field to a first-time viewer,
   or whether it just looks like noise — that's a pedagogy question, but it directly
   affects whether the canvas risk (§4) is worth taking at all. I flagged it as
   deferrable; the pedagogy hat should decide if it's worth building.
4. **What did we both overlook?** The brief and I both initially under-weighted that
   `PreviewKind`/`Category` are closed unions — I caught it by reading `catalog.ts` and
   `previews.tsx` directly rather than trusting the brief's shared-file list. It's the
   kind of thing that only surfaces from the actual types.
5. **What did you find difficult?** Staying in lane. Several of the sharpest questions
   (which Mahalanobis convention, does whitening confuse, is the integrand legible) are
   pedagogy calls, and I had to keep translating them into framework requirements
   ("whatever you pick, label it") rather than answering them.
6. **What would have made this task easier?** A one-line note in the brief on the
   intended MVP cut — most of my §8 is reconstructing a skeleton the author may already
   have in mind but didn't write down.
7. **How did you verify this, and does each passing check test the user-visible claim?**
   Reasoning only, grounded in reading the actual source: `types.ts` (confirmed
   `immersive` requires exactly one view), `catalog.ts` + `previews.tsx` (confirmed the
   closed `Category`/`PreviewKind` unions), `CountingTheWays.tsx` (confirmed SVG-only +
   accent-as-data), `Argand.tsx` (confirmed immersive drag-on-plane precedent),
   `AgenticSorting/useCanvas2D.ts` (confirmed the DPR-canvas helper),
   `useThemeTokens.ts`/`colormapRegistry.ts` (confirmed the canvas-theming path). No code
   was run — this is a design review, so there is no build to verify; `build: n/a` is
   honest. The one claim I could not check without a device is the canvas perf ceiling,
   and I've marked it as the follow-up.
8. **Follow-up value:** MEDIUM - the review is correct and complete as a framework
   critique, but the single highest-risk item (canvas density perf on mobile) is
   argued-from-precedent, not measured, and a cheap prototype would either confirm
   "defer the heat" or unlock shipping it in v1.

## Follow-up: additional divergence measures

Dan asks whether to add **Bayes error, TV, Hellinger, Bhattacharyya**. My maintainer
answer starts by refusing the framing: these are **not four independent measures**.
They collapse into **three lenses**, and two of the four are the same object as a third.

| Measure | Closed form for 2-D Gaussians? | Really a distinct lens? |
|---|---|---|
| **Bhattacharyya** D_B | ✅ exact, cheap — same Σ̄⁻¹ quadratic form as pooled-Σ Mahalanobis + a log-det | ✅ the **symmetric sibling** of KL: same two-term structure |
| **Hellinger** H | ✅ but H² = 1 − exp(−D_B) — a monotone transform of Bhattacharyya | ❌ no new information; a rescaling into [0,1] |
| **Bayes error** ε | 🟡 only for equal Σ; unequal Σ ⇒ numeric integration | ✅ the **operational** lens: "how often would you misclassify?" |
| **TV** | 🟡 same — TV = 1 − 2ε = 1 − overlap; no elementary form for unequal Σ | ❌ same object as Bayes error, less intuitive |

> [!WARNING]
> **The brief's premise "all four have cheap closed forms" is half-wrong.**
> Bhattacharyya/Hellinger are exact and cheap. **TV and Bayes error are NOT** — for
> unequal covariances the decision region {p>q} is a quadric, not a half-plane, and the
> integral is not elementary. Shipping a "TV" that is silently only correct when Σ₁=Σ₂
> is exactly the fabricated-precision trap the attribution policy warns against. The
> cheap exact form (2Φ(d_M/2)−1-style) exists **only in the equal-Σ case**; general Σ
> needs numeric quadrature.

**1 · Scope discipline — where the line is.** Include a measure only if it adds a
**lens**, not a **number**. The test: does it reinforce the "mean-shift term +
covariance-mismatch term" decomposition, or is it a monotone rescaling of something
already shown?
- **Bhattacharyya** passes: its first term *is* the pooled-Σ Mahalanobis (÷8), so it has
  the **identical two-part structure as KL but symmetric** — it deepens the brief's own
  "KL asymmetric vs pooled-Σ Mahalanobis symmetric" contrast instead of diluting it. It
  is the single most on-theme addition available.
- **Bayes error** passes as the **operational payoff** — "if you guessed P vs Q from one
  draw, how often would you be wrong?" is more intuitive than any divergence and answers
  *why anyone should care*. But show it via the cheap **Bhattacharyya bound**
  (ε ≤ ½·exp(−D_B)) by default; make the exact numeric integration an opt-in later tier.
- **Hellinger** fails: it's 1 − BC. At most a derived caption under Bhattacharyya, never
  its own headline row.
- **TV** fails as a headline: it's the same object as Bayes error (less intuitive) and
  carries the correctness trap. Represent the whole overlap/TV/Bayes cluster with **one**
  number — Bayes error — and mention TV as its complement in the EXPLAINER.

**MVP staging (unchanged):** none of these are MVP. MVP stays engine+tests → means +
ellipses → the KL = ½·d_M² collapse. The family is a **Tier-2 "third lens" increment**,
and Bhattacharyya + Bayes-via-bound ship **together as one coherent addition**, not five
scattered rows. Hellinger/TV are **EXPLAINER "see also," never readout rows.**

**2 · Layout — no new chrome, closed vocabulary intact (confirmed).** They live in the
existing Analyze `readout` panel:
- Reuse **`Breakdown`** for both KL *and* Bhattacharyya — both decompose into
  mean-term + covariance-term, so the same primitive shows the same story twice
  (symmetric vs asymmetric side by side). This is the payoff of the shared decomposition.
- **`StatGrid`** for the scalar values, **`Kicker`** to label each lens
  (Information · Similarity · Decision).
- Hide the secondary lenses behind a **disclosure** (the `ColormapPicker`
  "Other families (advanced)" pattern is the in-repo precedent for a folded-away
  advanced section). Default view shows KL + Mahalanobis; "more measures" expands.
- If it ever outgrows one panel, a **second `readout` panel** ("Measures") is legal —
  panels may share an archetype (`ParticleViewerShell` ships two `marks` panels). No new
  icon, no vocabulary stretch, no chrome change. Confirmed clean.

**3 · Cost/debt — the code is cheap; the attention is not.** Bhattacharyya/Hellinger are
a few lines + tests on machinery `gaussian2d.ts` already computes. The real costs are
(a) exact TV/Bayes numeric integration — *not* cheap, correctness-sensitive, and
adjacent to the same non-WebGL cost concern as the density heat; and (b) **cognitive
real-estate**: five numbers in a teaching app is a glossary, not a lesson. The
"it's only a few lines" argument is a trap — marginal code is cheap, marginal attention
is expensive. Gate on lens-vs-number, not lines-of-code.

**4 · Recommendation.**
- **MVP:** KL + Mahalanobis only. No change to the §8 skeleton.
- **Tier 2 — "the third lens":** add **Bhattacharyya** (symmetric decomposition, shown
  in a second `Breakdown` beside KL's) **+ Bayes error via the Bhattacharyya bound**
  (the "why care" payoff), behind a disclosure, organized by lens with the collapse
  relationships shown (all become functions of d_M when Σ₁=Σ₂).
- **See-also only (EXPLAINER / derived captions):** **Hellinger** (= 1 − BC) and
  **TV/overlap** (= 1 − 2ε).
- **Never silently:** exact TV/Bayes for unequal Σ — only via honest numeric integration
  in a later session, domain-labeled.

Net: a *curated subset of two* (Bhattacharyya + Bayes-via-bound), as one Tier-2 lens,
turns a good two-lens app into an excellent three-lens app. Adding **all four raw
measures** turns it into a dashboard and would earn a scope-creep flag from this hat.
