---
kind: progress
session: 2026-07-06-S01
date: 2026-07-06
title: New app — Mahalanobis separation & Kullback–Leibler divergence
branch: claude/modest-cannon-umd49e
slug: modest-cannon-umd49e
status: in-progress
build: unknown
followup: null
pr: null
app: general
signals: needs-dan
next: Converge with Dan on the scope/framing of the new app (what "separation" and "divergence" should feel like on-screen) before building.
---

# New app — Mahalanobis separation & Kullback–Leibler divergence

## Session purpose

Build a new animath app that explains **Mahalanobis separation** and
**Kullback–Leibler divergence** — two ways of measuring how far apart / how
different two probability distributions are.

## Previous session

New topic, first tracked session on this branch. For continuity: the latest
handoff across the repo is
[clean-up-loose-ends-8b0wqp/2026-07-02-S01](../clean-up-loose-ends-8b0wqp/2026-07-02-S01-clean-up-loose-ends.md)
(accidental-complexity audit + cleanup, **PR #247 — now merged**, build green).
That work is closed and unrelated to this session's focus.

## Working notes

<!-- Newest entry first. -->

### 🟣 decision · 10:15 — Resuming the three hats to weigh *more* divergence measures
**Why:** Dan asked whether Division Bells should include other measures —
**Bayes error, total-variation (TV), Hellinger** (and Bhattacharyya) — and asked
me to put the question back to the three experts while their review context is
still warm. Resuming each agent (context intact) beats asking cold.

All three closed-form for Gaussians, so engine-cheap; the real questions are
scope (Maintainer), a divergence-family abstraction (Consultant), and which are
honest/illuminating + how they relate — Pinsker (TV≤√(KL/2)), Bhattacharyya
bounding Bayes error, the f-divergence family, bounded [0,1] vs unbounded KL
(Pedagogy). Tailored follow-up sent to each; will fold answers into the plan.

### 🟡 milestone · 10:05 — Three-hats review complete + synthesis written
**Why:** All three reviews returned; convergence synthesis captures the plan.

**Unanimous: build it.** Pedagogy re-derived the Gaussian-KL closed form and
Monte-Carlo-checked it (1.5952 vs 1.5939); the `Σ₁=Σ₂ ⇒ KL = ½·d_M²` collapse is
exact. Synthesis:
[2026-07-06-S01-expert-synthesis.md](2026-07-06-S01-expert-synthesis.md) (per-hat
reports linked within). Locked calls: hero Mahalanobis = directed-in-Q; KL
Breakdown = two non-negative bars using the eigenvalue form ½·Σ(λ−1−lnλ); MVP =
single immersive plane, engine-first with tests, heat/whitening/slice deferred;
`logPdf` + running ∫=KL when the integrand heat lands. Blind spot the reviewers
couldn't see: the album-cover gallery tile (added post-dispatch) → new
`previews.tsx` kind.

### 🟣 decision · 09:45 — Gallery tile: inspired by *The Division Bell* album cover
**Why:** Dan asked to base the gallery preview tile on the Pink Floyd *The
Division Bell* (1994, Storm Thorgerson) cover — two giant facing metal-head
profiles in a field at dusk, whose **negative space reads as a third face**.

That maps honestly onto the math: **two facing distributions, and the gap
between them is the divergence/separation** — exactly what the app measures.
Plan for `src/chrome/previews.tsx`: a new preview kind rendering two facing
bell-curve "profiles" (mirrored) with the space between them lit as the
divergence, twilight-sky palette echoing the cover, theme-token aware so it
tracks skins (no hardcoded scene colors — sample the active data/colormap
tokens). Registered via `src/chrome/catalog.ts` META `kind`. Build after the
core app view works.

### 🟣 decision · 09:35 — Name = "Division Bells"; running /three-hats on the design
**Why:** Dan picked the name **Division Bells** (KL *divergence* + *bell* curves,
the Floyd nod) and asked to run `/three-hats` on the design before building — this
is a substantial new app, so a three-lens review de-risks scope/pedagogy first.

Design summary going into the review: two draggable 2-D Gaussians P/Q (mean +
rotatable/scalable σ-ellipses + canvas density), a **whitening** toggle that turns
the reference Gaussian into a unit circle (Mahalanobis = Euclidean in that frame),
a **KL integrand** `p·log(p/q)` signed heat layer, and an Analyze **Breakdown**
that splits `KL = ½[Mahalanobis² + covariance-mismatch]` so matching the ellipses
collapses KL to ½·d_M². Engine `gaussian2d.ts` (pure, unit-tested); optional 1-D
slice view along the μ₁→μ₂ axis. CSS/DOM + SVG + canvas, theme-token driven.

### 🟣 decision · 09:20 — Scope pinned: one scene, two lenses · SVG/Canvas 2-D
**Why:** Asked Dan the two framing decisions up front (R2). Answers: **one shared
scene** where both measures read out live on the SAME pair of Gaussians, rendered
in **SVG + Canvas 2-D** (draggable ellipses + density heat), not WebGL.

The unification is exact and makes a great teaching hook. For P=N(μ₁,Σ₁),
Q=N(μ₂,Σ₂) in k dims:

```
KL(P‖Q) = ½ [ (μ₂−μ₁)ᵀ Σ₂⁻¹ (μ₂−μ₁)   ← squared Mahalanobis of the means, in Q's metric
             + tr(Σ₂⁻¹Σ₁) − k − ln(detΣ₁/detΣ₂) ]  ← covariance-mismatch term
```

So when **Σ₁ = Σ₂ = Σ**, the mismatch term vanishes and **KL = ½·d_M²** exactly —
Mahalanobis *is* the mean-shift part of KL. When the ellipses differ in shape, KL
adds the covariance term and becomes **asymmetric** (KL(P‖Q) ≠ KL(Q‖P)) while the
pooled-Σ Mahalanobis stays symmetric. The app decomposes KL live into these two
pieces — that contrast is the payload.

Next: present a concrete design (engine, panels/views, teaching arc, name
candidates) for sign-off before building; optionally run `/three-hats` on it.

### 🟣 decision · 09:00 — Session opened; orienting on a brand-new app
**Why:** The request is to build a new app teaching Mahalanobis separation and
KL divergence. No prior branch state exists, so this is a clean start.

Ran `/start-session`: resolved branch slug `modest-cannon-umd49e` (new — no
prior handoff/progress folder), read the backlog, RECIPES, and the latest
handoff for continuity. The backlog has no item for this app; it is genuinely
new work.

Before writing any code I want to pin scope with Dan (RECIPE R2 — separate
exploring from guessing). Open questions to converge on:

- **The concept pairing.** Mahalanobis distance measures separation between a
  point (or a distribution's mean) and a distribution, in units of its own
  covariance; KL divergence measures how one full distribution differs from
  another. They're related but not the same object — is the app about *comparing*
  the two lenses on the same pair of Gaussians, or teaching each in turn?
- **The picture.** Most natural home is a 2-D scatter / density plot of two
  Gaussians whose means, covariances (spread + correlation) are draggable, with
  live readouts of Mahalanobis separation and KL divergence as you move them —
  showing e.g. how correlation (whitening) changes "distance" even when the
  Euclidean gap is fixed.
- **Framework fit.** CSS/DOM + SVG (like Counting the Ways / Stable Matching) vs.
  a WebGL density field. Leaning SVG/Canvas 2-D for the draggable-Gaussians story.

Awaiting Dan's direction on framing before building a probe.
