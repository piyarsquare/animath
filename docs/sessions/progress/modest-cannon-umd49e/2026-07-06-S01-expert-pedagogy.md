---
kind: three-hats
session: 2026-07-06-S01
date: 2026-07-06
title: "Division Bells — Math-Viz & Pedagogy review"
branch: claude/modest-cannon-umd49e
slug: modest-cannon-umd49e
status: completed
build: n/a
followup: null
app: general
---

# Division Bells — Math-Viz & Pedagogy review

*Reviewer hat: the mathematician-educator who will stand at a board and use this
to teach. I care whether the picture is **true**, not whether it is pretty. I
did the algebra myself and checked it numerically before writing a word below.*

## Plan under review

<details>
<summary>Original request (verbatim)</summary>

> Design review for a new animath app "Division Bells" that teaches Mahalanobis
> separation and Kullback–Leibler divergence as two lenses on the same pair of
> 2-D Gaussians. See the design summary in
> docs/sessions/progress/modest-cannon-umd49e/2026-07-06-S01-mahalanobis-kl-divergence-app.md.
>
> **GOAL:** Teach Mahalanobis separation and Kullback–Leibler (KL) divergence as
> two lenses on the SAME pair of 2-D Gaussians P=N(μ₁,Σ₁), Q=N(μ₂,Σ₂). Framing:
> "one scene, two lenses." Rendering: SVG + Canvas 2-D.
>
> **THE MATH (teaching hook):** KL(P‖Q) = ½[ (μ₂−μ₁)ᵀΣ₂⁻¹(μ₂−μ₁) + tr(Σ₂⁻¹Σ₁) −
> k − ln(detΣ₁/detΣ₂) ], k=2. First term = squared Mahalanobis distance of the
> means in Q's metric. If Σ₁=Σ₂=Σ: KL = ½·d_M² exactly; if covariances differ, KL
> adds a covariance-mismatch term and becomes ASYMMETRIC while pooled-Σ
> Mahalanobis stays symmetric. App decomposes KL live into ½[Mahalanobis² +
> covariance-mismatch].
>
> **THE SCENE (one immersive 2-D plane view):** Two Gaussians P (blue)/Q
> (orange), each = draggable mean marker + 1σ/2σ covariance ellipses with
> rotate+scale handles (sets Σ via angle+σ₁,σ₂) + faint canvas density heat.
> Overlays: mean-difference vector; a WHITENING toggle warping the plane by
> Σ^(−1/2) so the reference Gaussian becomes a unit circle and Mahalanobis =
> Euclidean distance; a KL integrand p·log(p/q) SIGNED heat layer. Optional second
> view: 1-D slice along μ₁→μ₂ axis (two bells, overlap, log-ratio).
>
> **READOUTS:** Mahalanobis d_M (σ-units) symmetric (pooled Σ) + directed;
> KL(P‖Q) & KL(Q‖P) (nats+bits) asymmetry called out; Breakdown KL =
> ½[Mahalanobis² + trace + log-det − k]; maybe Bhattacharyya/symmetric KL.
>
> **STRUCTURE:** `src/animations/DivisionBells/` + pure `gaussian2d.ts` engine
> (unit-tested), Define/Render/Analyze/(Drive)/System panels, one immersive plane
> view, theme-token driven, EXPLAINER.md with the required "Possible sources &
> where to go further" block.
>
> **OPEN QUESTIONS:** which Mahalanobis-between-distributions convention to
> feature (name it honestly); canvas cost on drag/mobile; intuitive Σ-setting +
> degenerate covariance handling (KL→∞, whitening blows up); whitening toggle vs
> separate view; two concepts in one app — too much or the earned unification.

</details>

## Executive summary

**The math in the brief is correct.** I derived the Gaussian-KL closed form from
scratch, matched it against a Monte-Carlo estimate, and confirmed both the
log-det **sign** and the Mahalanobis quadratic form use **Q's precision** (Σ₂⁻¹).
The `Σ₁=Σ₂ ⇒ KL = ½·d_M²` collapse is **exact**. This is a genuine, clean
unification — not a coincidence — and it is worth building.

But "the formula is right" is the *easy* bar. The pedagogy fails or succeeds on
four things the brief currently under-specifies:

1. **Which Mahalanobis?** The brief silently mixes *three different* Mahalanobis
   conventions (Q's-metric directed, pooled-Σ, shared-Σ) that give different
   numbers off the collapse. Left unlabeled, this is the single most likely way
   the app teaches something false.
2. **The covariance-mismatch term** should be shown as **½Σ(λ−1−lnλ)** over the
   eigenvalues of Σ₂⁻¹Σ₁ — manifestly ≥ 0, per-axis, and directly readable off
   the whitened picture — **not** as the brief's "trace + log-det − k" which is
   individually meaningless and sign-error-prone (I made exactly that sign slip
   mid-derivation; see the working notes).
3. **Whitening must name its target and honor the OTHER ellipse.** Whitening by
   Q turns Q into a unit circle but leaves P as a residual ellipse whose axes
   *are* the mismatch term. That residual ellipse is the payoff, not a bug to
   hide.
4. **Field ≠ scalar.** The signed `p·log(p/q)` heat is a *density*; KL is its
   *integral*. Learners will read "KL lives where the map is bright." A running
   total tying field → number is mandatory, not optional.

Verdict up front: **endorse with concerns** — build it, but fix the naming and
the breakdown before writing the engine, because those are correctness issues
dressed as UI choices.

---

## 1 · Is the closed form right? (worked check)

Let me derive it so the sign is not taken on faith. For `p = N(μ₁,Σ₁)`,
`q = N(μ₂,Σ₂)` in `k` dims,

```
log p(x) = −k/2·log2π − ½·log|Σ₁| − ½(x−μ₁)ᵀΣ₁⁻¹(x−μ₁)
log q(x) = −k/2·log2π − ½·log|Σ₂| − ½(x−μ₂)ᵀΣ₂⁻¹(x−μ₂)

log(p/q) = ½·log(|Σ₂|/|Σ₁|) − ½(x−μ₁)ᵀΣ₁⁻¹(x−μ₁) + ½(x−μ₂)ᵀΣ₂⁻¹(x−μ₂)
```

Take `E_p[·]` (so `x ~ N(μ₁,Σ₁)`). Two standard identities:

```
E_p[(x−μ₁)ᵀΣ₁⁻¹(x−μ₁)] = tr(Σ₁⁻¹Σ₁) = k
E_p[(x−μ₂)ᵀΣ₂⁻¹(x−μ₂)] = tr(Σ₂⁻¹Σ₁) + (μ₁−μ₂)ᵀΣ₂⁻¹(μ₁−μ₂)
```

(the second because `E_p[(x−μ₂)(x−μ₂)ᵀ] = Σ₁ + (μ₁−μ₂)(μ₁−μ₂)ᵀ`). Substituting:

```
KL(P‖Q) = ½[ tr(Σ₂⁻¹Σ₁) + (μ₂−μ₁)ᵀΣ₂⁻¹(μ₂−μ₁) − k + ln(|Σ₂|/|Σ₁|) ]   (canonical)
```

The brief writes `− ln(det Σ₁/det Σ₂)`. Since `−ln(|Σ₁|/|Σ₂|) = +ln(|Σ₂|/|Σ₁|)`,
**the brief's form is identical to the canonical one.** ✔

> [!NOTE]
> **1-D sanity check.** Set `k=1`. The formula gives
> `ln(σ₂/σ₁) + (σ₁²+(μ₁−μ₂)²)/(2σ₂²) − ½`, the textbook 1-D Gaussian KL. ✔

**Numerical confirmation** (2-D, random Σ, 8·10⁵ samples):

| quantity | value |
|---|---|
| brief closed form | **1.5952** |
| Monte-Carlo `E_p[log p/q]` | 1.5939 |
| `½·(μ₂−μ₁)ᵀΣ₂⁻¹(μ₂−μ₁)` (Mahalanobis half) | 1.1152 |
| covariance-mismatch remainder | 0.4801 |

Closed form and Monte-Carlo agree to MC noise. **The Mahalanobis term uses
Σ₂⁻¹ = Q's precision, and the log-det sign is correct as written.**

> [!IMPORTANT]
> **Decision — the brief's headline identity is mathematically correct as
> written.** No fix needed to the formula. The work below is about how it is
> *labeled and drawn*, where the real risks live.

---

## 2 · The `Σ₁=Σ₂` collapse (exact, not approximate)

Set `Σ₁=Σ₂=Σ` in the canonical form:

```
tr(Σ⁻¹Σ) = k     ln(|Σ|/|Σ|) = 0
⇒ KL = ½[ (μ₂−μ₁)ᵀΣ⁻¹(μ₂−μ₁) + k − k − 0 ] = ½·(μ₂−μ₁)ᵀΣ⁻¹(μ₂−μ₁) = ½·d_M²
```

Numerically: with equal covariances my run gave `KL = 2.6145` and
`½·d_M² = 2.6145` — **exact to all printed digits, both directions**. And in
this case `KL(P‖Q)=KL(Q‖P)` because the shared Σ makes the quadratic form
direction-independent and the trace/log-det terms vanish either way.

This is the **earned unification** the brief is right to feature: at equal
covariance the two lenses literally coincide (`KL = ½·d_M²`, symmetric). It is
not a numerical coincidence — it falls straight out of the trace and log-det
zeroing.

---

## 3 · The covariance-mismatch term: use the eigenvalue form

The brief proposes the Analyze breakdown

```
KL = ½[ Mahalanobis² + trace + log-det − k ]
```

as four separate bars. **Do not render it that way.** The `trace`, `log-det`,
and `−k` pieces are individually meaningless and can each be positive or
negative; only their *combination* is a well-defined non-negative quantity. I
literally introduced a `−logdet` vs `+logdet` sign slip while coding the check
(see working notes) — if *I* trip on it mid-derivation, a learner reading three
disconnected bars will absolutely misread it.

The honest, robust form is the **eigenvalue decomposition**. Let `λ₁,λ₂` be the
eigenvalues of the relative covariance `M = Σ₂⁻¹Σ₁`. Then

```
covariance-mismatch = ½[ tr(Σ₂⁻¹Σ₁) − k − ln(det Σ₁/det Σ₂) ]
                    = ½ Σᵢ ( λᵢ − 1 − ln λᵢ )
```

because `tr M = Σλᵢ`, `k = Σ1`, and `ln det M = Σ ln λᵢ`. Each summand
`g(λ) = λ − 1 − ln λ` is **≥ 0**, zero iff `λ=1` (convex, minimized at 1). So:

- the mismatch is **manifestly non-negative** (as any part of a KL must be) —
  the picture *proves* `KL ≥ 0` instead of asserting it;
- it is a **sum of per-axis penalties**, each measuring how far one principal
  ratio of P-relative-to-Q is from 1;
- it maps one-to-one onto the whitened picture (§4): `λ₁,λ₂` are the squared
  semi-axes of P's residual ellipse after whitening by Q.

Numerical check (same run): `λ = (2.635, 0.415)`, `g = (0.666, 0.294)`,
mismatch `= ½(0.666+0.294) = 0.4803`, and `½·d_M² + mismatch = 1.1152 + 0.4803
= 1.5955 ≈ 1.5952` KL. ✔

> [!TIP]
> Render the breakdown as **two bars** — `½·d_M²` (mean shift) and
> `½Σg(λᵢ)` (shape mismatch) — with the mismatch bar optionally split into its
> two per-axis `½·g(λᵢ)` pieces on hover. This is the picture that teaches; the
> four-term algebra is the thing you're *hiding* behind it.

---

## 4 · Whitening — name the target, keep the other ellipse honest

The brief: "warping the plane by Σ^(−1/2) so **the reference Gaussian** becomes a
unit circle and Mahalanobis = Euclidean." Two things must be nailed down or this
overlay quietly lies.

**(a) Which Gaussian is whitened, and it is not "the reference."** The word
*reference* is overloaded here: in `KL(P‖Q)`, **P** is the reference/data (the
distribution you integrate against), but the Mahalanobis metric inside KL is
**Q's** (`Σ₂⁻¹`). Whitening "so Mahalanobis = Euclidean" means whitening by
**Q**, i.e. `x ↦ Σ₂^(−1/2)(x−μ₂)`, which sends **Q → N(0,I)** (unit circle) — the
*model*, not the "reference distribution." Calling Q "the reference Gaussian"
collides with P being the reference of the divergence. **Say instead:** "whiten
*into Q's metric* (Q becomes a unit circle); this is the frame in which
`KL(P‖Q)`'s mean-term is a plain Euclidean length." And **bind the whitening
target to the featured KL direction**: viewing `KL(Q‖P)` should whiten by P.

**(b) What happens to P under Q's whitening — the payoff, not a nuisance.**
Under `x ↦ Σ₂^(−1/2)(x−μ₂)`:

```
Q  →  N(0, I)                               unit circle
P  →  N( Σ₂^(−1/2)(μ₁−μ₂),  Σ₂^(−1/2)Σ₁Σ₂^(−1/2) )
```

P is generally **still an ellipse** — its covariance `Σ₂^(−1/2)Σ₁Σ₂^(−1/2)` has
the same eigenvalues `λ₁,λ₂` as `Σ₂⁻¹Σ₁`. So in the whitened frame the **entire
KL is legible in one picture**:

- the whitened mean-gap has Euclidean length `d_M` (Q's metric) ⇒ mean term
  `= ½·d_M²`;
- P's residual ellipse has semi-axes `√λ₁, √λ₂` ⇒ mismatch `= ½Σg(λᵢ)`.

Only when `Σ₁=Σ₂` does P *also* become a unit circle — and that is exactly the
visual signature of the collapse (§2): "when both whitened ellipses are unit
circles, KL is pure `½·d_M²`." That is the single best frame in the app for the
aha. I would make the whitened view a first-class toggle and consider it the
*reveal* step of a guided arc.

> [!CAUTION]
> **Gotcha — pick the symmetric square root.** `Σ^(−1/2)` is only defined up to
> an orthogonal factor. Use the **symmetric PSD** square root (from the
> eigendecomposition), not Cholesky: it whitens by pure rotate-then-scale of the
> principal axes, so P's residual ellipse keeps its honest orientation. Cholesky
> injects an extra shear that makes the residual look wrong even though distances
> are still correct.

---

## 5 · *Which* Mahalanobis? Name it or mislead

This is the open question the brief flags, and it is the one that most threatens
correctness. "Mahalanobis distance between two distributions" is **not one
thing.** There are (at least) three conventions, and they give **different
numbers** everywhere except the collapse:

| convention | formula (of the means) | symmetric? | where it lives |
|---|---|:--:|---|
| **directed, in Q's metric** | `√[(Δμ)ᵀ Σ₂⁻¹ (Δμ)]` | ✗ | the term *inside* `KL(P‖Q)` |
| **shared-Σ (classical, Mahalanobis 1936)** | `√[(Δμ)ᵀ Σ⁻¹ (Δμ)]`, one common Σ | ✓ | LDA / two groups, one within-cov |
| **pooled Σ̄=(Σ₁+Σ₂)/2** | `√[(Δμ)ᵀ Σ̄⁻¹ (Δμ)]` | ✓ | the mean-term of **Bhattacharyya** |

Key facts the app must respect:

- The Mahalanobis that appears in the **KL breakdown is the *directed, in-Q's-metric*
  one** — full stop. If the headline "symmetric d_M" readout uses the **pooled**
  metric (as the design summary says), then the app is showing **two different
  Mahalanobis numbers**, and the `KL = ½[d_M² + …]` identity holds for the
  *directed* one, **not** the pooled one, off the collapse.
- At the collapse (`Σ₁=Σ₂`), all three coincide — directed-in-Q, shared, and
  pooled `Σ̄=Σ` are equal — so there is no ambiguity *at the aha itself*. The
  ambiguity only bites when covariances differ, which is exactly when learners
  are watching the breakdown.
- The pooled/Bhattacharyya mean-term carries a **1/8**, not **1/2**:
  `D_B = ⅛(Δμ)ᵀΣ̄⁻¹(Δμ) + ½ln( |Σ̄| / √(|Σ₁||Σ₂|) )`. If you surface
  Bhattacharyya, do **not** let its factor bleed into the KL breakdown's ½.

> [!IMPORTANT]
> **Decision — feature the *directed, in-Q's-metric* Mahalanobis as "the"
> `d_M` in the KL breakdown**, labeled `d_M(μ₁→Q)` ("how many σ the means are
> apart, measured in Q's frame"). Offer the **symmetric pooled** one as a clearly
> separate, secondary readout labeled "symmetric separation (pooled metric,
> Bhattacharyya-style)" — never just "Mahalanobis distance," which reads as *the*
> canonical number. The brief's framing "KL is asymmetric while pooled Mahalanobis
> stays symmetric" is *true* but slightly apples-to-oranges; state it precisely:
> *"There is a symmetric separation that ignores shape (pooled metric). KL's mean
> term is a **directed** Mahalanobis in the model's metric, and KL adds a shape
> penalty on top — that is why KL is asymmetric and the pooled number is not."*

---

## 6 · The KL integrand: field is not the scalar

The signed heat `p·log(p/q)` is the right *per-point contribution density*, and
its **integral** over the plane is `KL(P‖Q)`. Two honesty requirements:

**(a) Show the running total, or learners conflate the map with the number.**
The heat map is a *field*; KL is one *scalar*. Without a "∫ = KL" tie — a running
sum, or a filling bar that accumulates as you sweep the plane — the natural
misreading is "KL is wherever it's bright." Worse, the field is **signed**:
`p·log(p/q) < 0` wherever `q > p`. There is real cancellation, and the positive
and negative lobes both matter. A learner who sees only the bright positive lobe
will overcount. Put the signed total on screen next to the field.

**(b) The signed field is where asymmetry becomes visceral — use it.**
`KL(P‖Q)` and `KL(Q‖P)` produce **different fields** (different reference density
weighting, different metric). Toggling the direction and watching the heat
*re-shape* is the best possible demonstration that KL is directional. Pair it
with the 1-D slice (two bells + `log(p/q)`): the slice is where the asymmetry is
readable as "which bell sits in whose tail."

**(c) The tail blow-up is a feature, disclose it.** Where Q's density is tiny but
P has mass, `p·log(p/q) → large positive`. This is precisely the **mode-covering
/ zero-avoiding** pressure of forward KL: `KL(P‖Q)` punishes Q for being too
narrow to cover P. Reverse `KL(Q‖P)` is **mode-seeking / zero-forcing**.

> [!NOTE]
> **Name the folklore carefully.** "Mode-covering" and "mode-seeking" describe
> what a *minimizer* does when you *fit* one Gaussian to the other. This app does
> **not** minimize — it drags fixed shapes. So frame it as the *penalty
> structure* that causes that behavior: "forward KL blows up in Q's thin tails
> under P's mass ⇒ it pushes a fitted Q to spread and cover; reverse KL ignores
> those regions ⇒ it lets a fitted Q collapse onto one mode." Show the integrand
> asymmetry as the *reason*; don't claim the app is doing the fitting.

---

## 7 · Units, and what is (not) a distance

Small things that a careful teacher will not forgive if they're wrong:

| item | correct statement |
|---|---|
| KL units | **nats** with natural log; **bits** with log₂. `KL_bits = KL_nats / ln2`. Show both, label both. |
| Mahalanobis units | **σ-units** (dimensionless "number of standard deviations"); `d_M²` is in σ². |
| the ½ | intrinsic to the Gaussian (the ½ in the exponent), **not** a unit conversion. `KL_nats = ½·d_M²` — the ½ belongs with the *nats*; in bits it's `d_M²/(2ln2)`. |
| Mahalanobis is a **distance** | with a *fixed* metric it is a genuine metric on points (symmetric, triangle inequality — it's Euclidean after whitening). |
| KL is **not** a distance | asymmetric, no triangle inequality, unbounded (→∞). It **is** ≥ 0 (Gibbs) and 0 iff `P=Q`. Call it a **divergence**, never a distance. |

> [!WARNING]
> **Naming discipline is load-bearing here.** "Division Bells" is a lovely name,
> but the app must never print "KL distance." Reserve **separation** for
> Mahalanobis, **divergence** for KL, and never let **distance** attach to KL in
> any label, tooltip, or explainer sentence. This is the difference between the
> app teaching the concept and teaching a common misconception.

One more subtlety worth stating in the EXPLAINER: even the symmetric *pooled*
Mahalanobis of the means is **not** a metric on distributions — two Gaussians
with the *same mean* but different covariance have Mahalanobis-separation **0**
yet **KL > 0**. That degenerate case is not a wart; it is the cleanest single
demonstration that the two lenses are genuinely different (see §9).

---

## 8 · Degenerate covariances — disclose, don't clamp-and-hide

As an ellipse collapses (`σ→0`), `det Σ → 0`, `Σ⁻¹` blows up, and `KL → ∞`
(whenever the other distribution has spread or mean-offset in the collapsing
direction). The whitening `Σ^(−1/2)` blows up too (one axis → ∞ scale). Handling:

- **Clamp `σ_min > 0`** in the engine so nothing NaNs, **but surface the trend**:
  let the KL readout visibly climb toward ∞ as the user shrinks an ellipse rather
  than silently pinning a finite number. That climb is itself the lesson — *KL
  punishes an overconfident (too-narrow) model without bound.*
- When whitening would blow up, **fade or cap** the warp and post a one-line
  "near-singular: whitening undefined" rather than rendering garbage.
- The 1-σ / 2-σ ellipses and rotate/scale handles are the honest UI for setting Σ
  via `(angle, σ₁, σ₂)` — good choice; that parameterization keeps Σ **positive
  definite by construction** (no way to enter an invalid matrix), which is worth
  keeping precisely *because* it forecloses the worst degeneracies.

---

## 9 · Conceptual clarity, defaults, and the teaching arc

**Is the default view the most illuminating?** Two separated Gaussians with
*identical* covariance is the wrong first frame — it hides everything
interesting. Two with *wildly different* shape is overwhelming. I'd open on:

1. **moderate separation, moderately different covariance** — both KL terms
   nonzero, `KL(P‖Q) ≠ KL(Q‖P)` visibly, so the app's whole thesis is on screen
   at rest.

And I would hard-wire **two one-tap presets** that are the pedagogical backbone:

- **"Match the shapes"** (set `Σ₁ := Σ₂`) → watch the mismatch bar go to 0 and
  `KL → ½·d_M²`, symmetric. *This is the collapse; it should be a button, not a
  thing the user stumbles into by hand-dragging two ellipses into agreement.*
- **"Concentric"** (set `μ₁ := μ₂`, keep shapes different) → **Mahalanobis
  separation = 0 while KL > 0**. This is the sharpest possible proof that the two
  lenses measure different things, and it's the case a "distance" intuition gets
  most wrong.

**Two concepts in one app — too much, or earned?** *Earned* — the identity is
exact — **but only if staged.** Dropping Mahalanobis + KL + whitening + signed
integrand + asymmetry + nats/bits on the user at once will bury the aha. Borrow
Counting the Ways' **Explain / Play** structure:

- **Stage 1 (equal covariance):** only means move; show `d_M` and `KL` agreeing
  (`KL = ½·d_M²`). Establish that the two lenses *can* coincide.
- **Stage 2 (unlock shape):** covariance handles appear; the mismatch bar grows
  out of zero and asymmetry emerges. The extra term is introduced as a *thing you
  earned by breaking the equal-cov assumption*, not a term dropped from the sky.
- **Stage 3 (whiten):** the reveal — Q → unit circle, P → residual ellipse whose
  axes are the mismatch; the whole KL becomes one readable picture.

That progression turns "coincidence-looking result" into "of course — the mean
part was always Mahalanobis; the shape part is the new tax."

---

## 10 · Semantic hygiene & naming (a checklist for the build)

| use | not |
|---|---|
| P / Q, with a fixed legend (P = blue = data/reference; Q = orange = model) | "distribution 1 / 2" drifting between panels |
| **separation** (Mahalanobis) | "distance" for KL |
| **divergence** (KL) | "KL distance" |
| **precision** `Σ⁻¹` when you mean the inverse | conflating covariance and precision in labels |
| **principal axes / eigen-directions** of Σ | "the axes" (ambiguous vs screen axes) |
| `d_M(μ₁→Q)` (directed) vs "pooled separation" | one unlabeled `d_M` |
| "into Q's metric" for whitening | "the reference becomes a circle" |

Pin the P/Q ↔ color ↔ role mapping once and never let it float; the asymmetry
story is unreadable if the learner has to re-derive which bell is which.

---

## 11 · Accessibility & color

- **Blue/orange for P/Q is a good, CVD-safe choice** — it's one of the few
  two-class pairs distinguishable across deuteran/protan/tritan deficiencies.
  Keep it, and back it with shape/position redundancy (labels, the mean markers),
  not color alone.
- **The signed integrand needs a diverging colormap anchored at 0** — pull from
  animath's `colormapRegistry` **divergent** family (theme-tracking per
  CLAUDE.md's Theming v2), *not* red-green. Anchor white/neutral at exactly 0 so
  the sign of the contribution is legible.
- **Dynamic range:** the integrand is dominated by a few tail cells. Use a
  **signed-log** or symmetric percentile clip so the sign *structure* is visible
  and not swamped by the peak; otherwise the map reads as "one hot spot."
- **Assumed background:** ellipses, rotate/scale handles, and `p·log(p/q)` don't
  require the learner to know eigendecomposition — good. But the EXPLAINER should
  *offer* the eigenvalue reframe (`λ−1−lnλ`) as the "why it's always ≥ 0" without
  *requiring* matrix algebra to reach the aha. Two reading depths, like the rest
  of animath.

---

## 12 · The attribution block ("Possible sources & where to go further")

Per animath convention, the EXPLAINER must end with honest, non-fabricated
pointers. Suggested, all **verifiable-in-spirit, no invented DOIs/exact dates**:

- **P. C. Mahalanobis (1936)**, "On the generalised distance in statistics,"
  *Proc. National Institute of Sciences of India* — the origin of the distance;
  note it is the **shared/within-group covariance** setting, which is why
  "between two distributions" needs disambiguation.
- **S. Kullback & R. A. Leibler (1951)**, "On information and sufficiency,"
  *Annals of Mathematical Statistics* — the divergence and its
  information/sufficiency framing. (Kullback's *Information Theory and
  Statistics* book expands it.)
- **The Gaussian-KL closed form** — standard; any multivariate-statistics or
  machine-learning text (e.g. Bishop, *Pattern Recognition and Machine Learning*;
  or Cover & Thomas, *Elements of Information Theory*, for the KL/entropy side).
  Don't attribute the closed form to a single paper — it's folklore.
- **A. Bhattacharyya (1943)**, on a measure of divergence between statistical
  populations — for the **pooled-Σ symmetric separation** and the Bhattacharyya
  coefficient (frame it as "the symmetric cousin," honestly, not as the same
  object).
- **Information geometry** — S. Amari's work (e.g. *Information Geometry and Its
  Applications*) for KL as a divergence on a statistical manifold, and why it is
  *not* a metric (dually flat, Fisher metric locally). A "next step" pointer, not
  a claim the app teaches this.
- **Mode-covering vs mode-seeking** — flag as **folklore from variational
  inference** (widely discussed in VI / variational-Bayes references; e.g.
  Bishop Ch. 10 discusses forward vs reverse KL behavior) rather than crediting a
  single origin.

> [!TIP]
> Follow the CLAUDE.md rule verbatim: *name what you can stand behind; flag
> uncertainty; never fabricate a DOI or exact date.* For Mahalanobis/KL/Bhattacharyya
> the years above are safe and standard; for the folklore items, say "folklore"
> rather than inventing a citation.

---

## Verdict

**Endorse — with concerns (all fixable before the engine is written).**

The headline is solid: the KL formula is **correct as written** (verified
analytically and numerically), and the `Σ₁=Σ₂ ⇒ KL=½·d_M²` unification is
**exact** and genuinely worth teaching. This is a real "one scene, two lenses,"
not a stretch.

**Would-change (correctness-critical, do before building):**

1. **Disambiguate Mahalanobis (§5).** The featured `d_M` in the KL breakdown must
   be the **directed, in-Q's-metric** one; label the pooled/symmetric one
   separately and never call either "the Mahalanobis distance." This is the top
   correctness risk.
2. **Render the mismatch as ½Σ(λ−1−lnλ) (§3)**, not "trace + log-det − k."
   Manifestly ≥ 0, per-axis, sign-safe, and it maps onto the whitened picture.
3. **Whitening names its target and shows the residual ellipse (§4)**; use the
   symmetric square root; bind the whitening target to the featured KL direction.
4. **Signed integrand ships with a running "∫ = KL" total (§6)** and a diverging,
   zero-anchored, signed-log colormap — the field is not the scalar.
5. **Never label KL a "distance" (§7, §10).**

**Would-change (pedagogy, strongly recommended):**

6. **Stage the reveal (§9)** — equal-cov first, unlock shape, then whiten — and
   wire the **"Match shapes"** and **"Concentric"** presets as the two teaching
   anchors (the collapse, and the `d_M=0` yet `KL>0` case).

**Endorsements (keep as-is):**

- The `(angle, σ₁, σ₂)` ellipse handles — PSD-by-construction, forecloses invalid Σ.
- Blue/orange P/Q — CVD-safe.
- The optional 1-D slice — the cleanest home for the asymmetry / log-ratio story.
- SVG + Canvas 2-D — right tool; WebGL would be overkill and the density/integrand
  heat is the only canvas-cost concern (throttle the signed-integrand recompute on
  drag; it's a full-field pass — recompute on drag-end or at reduced resolution
  during drag).

If items 1–5 land, this is one of the more honest information-geometry teaching
toys I've seen proposed, precisely because the unification is exact rather than
hand-wavy.

---

## Follow-up: additional divergence measures

*Dan asks whether to add **Bayes error**, **total-variation (TV)**,
**Hellinger**, and **Bhattacharyya** to the Mahalanobis + KL pairing. Short
answer from the fidelity lens: **yes to Bayes error + Bhattacharyya + Hellinger,
and make Bayes error the operational anchor** — but only if the app treats the
**relationships** as the payload, not the pile of numbers. I re-verified every
closed form and bound below numerically (2-D Gaussians, grid-integrated to 5
digits) before writing it.*

### The through-line: how confusable are the two bells?

Right now the app risks reading as "two unrelated formulas that happen to share a
term." The measures Dan lists all answer **one operational question**: *if a
classifier is shown a sample and told to call it P or Q, how often must it be
wrong?* That lowest-possible error rate is the **Bayes error**, and every other
measure is either **a bound on it** (Bhattacharyya, Hellinger, Pinsker/KL) or
**an exact re-expression of it** (TV). Making Bayes error the anchor reframes the
app from *"Mahalanobis + KL"* to *"how far apart are two distributions, by every
honest yardstick — and why the yardsticks agree."* **I strongly recommend that
reframe.** It is the thing that makes the collection feel like one idea.

### The exact 2-D-Gaussian closed forms (verified)

With `Σ̄ = (Σ₁+Σ₂)/2` and `Δμ = μ₂−μ₁`:

```
Bhattacharyya distance   D_B = ⅛·Δμᵀ Σ̄⁻¹ Δμ  +  ½·ln( det Σ̄ / √(det Σ₁ det Σ₂) )
Bhattacharyya coeff      BC  = ∫√(pq) dx = exp(−D_B)              ∈ (0,1]   CLOSED FORM
Hellinger (squared)      H²  = 1 − BC = 1 − exp(−D_B)            ∈ [0,1]    CLOSED FORM
Hellinger distance       H   = √(1 − BC)                          ← a true METRIC
```

Numerical check (my run): `D_B = 0.4333`, `BC = 0.64838` (closed) `= 0.64838`
(grid ∫√(pq)); `H² = 0.35162` both ways. ✔ The first term of `D_B` is **⅛·d_M²
in the pooled metric** — note the **⅛**, versus KL's **½** on the same kind of
quadratic form; do not let those factors cross-contaminate.

> [!CAUTION]
> **Gotcha — TV and Bayes error have NO elementary closed form for two general
> Gaussians.** Both reduce to `∫ min(p,q)` (or `∫|p−q|`), which for unequal
> covariances has a curved decision boundary and needs a **numeric overlap
> integral** (a 2-D grid/quadrature, or the 1-D integral along the slice for the
> equal-covariance case). This is a genuine asymmetry with BC/Hellinger/KL, which
> *are* closed-form. The app must label TV/Bayes-error readouts as **computed
> numerically** — and it's cheap here (one grid pass, the app already rasterizes
> the density field), so it's honest *and* affordable.

### The relationships (this is the payload)

For **equal priors** `π₁=π₂=½` (the natural default; expose priors later):

| relationship | statement | type | verified |
|---|---|---|---|
| Bayes error ↔ TV | `P_e = ½(1 − TV)` (since `∫min(p,q) = 1 − TV`) | **exact** | `0.18235 = 0.18235` ✔ |
| Bayes error ↔ overlap | `P_e = ½·∫min(p,q)` = half the overlap mass | **exact** | ✔ |
| Bhattacharyya bound | `P_e ≤ ½·BC = ½·e^(−D_B)` (Chernoff at s=½; tighter is `min_s …`) | **upper bound** | `0.18235 ≤ 0.32419` ✔ |
| Hellinger ↔ BC | `H² = 1 − BC` | **exact** | ✔ |
| Hellinger ↔ TV | `H² ≤ TV ≤ H·√(2−H²)` | **two-sided bound** | `0.352 ≤ 0.635 ≤ 0.761` ✔ |
| Pinsker (ties to KL) | `TV ≤ √(KL/2)` (KL in nats) | **upper bound** | `0.635 ≤ 1.052` ✔ |

Read as a chain, this is the lesson: **the bounded measures (TV, Hellinger, BC,
Bayes error) all live in `[0,1]` and sandwich each other; KL sits *above* them,
unbounded, connected only by the one-way Pinsker inequality.** That single
picture — a stack of `[0,1]` measures with KL escaping to ∞ off the top — is the
most honest way to show *why KL is the odd one out* (unbounded, asymmetric, not a
metric) while the others are tame.

### Bounded-vs-unbounded, metric-vs-divergence (keep this straight)

| measure | range | symmetric? | true metric? |
|---|---|:--:|:--:|
| Bayes error `P_e` | `[0, ½]` | ✓ | — (an error rate, not a distance) |
| TV | `[0,1]` | ✓ | ✓ (a genuine metric) |
| Hellinger `H` | `[0,1]` | ✓ | ✓ (a genuine metric) |
| Bhattacharyya coeff `BC` | `(0,1]` | ✓ | — (a *similarity*, `1`⇒identical) |
| Bhattacharyya *distance* `D_B` | `[0,∞)` | ✓ | ✗ (fails triangle inequality) |
| KL | `[0,∞)` | ✗ | ✗ |
| Mahalanobis (fixed metric) | `[0,∞)` | ✓* | ✓ on points |

`*` symmetric only within one fixed metric; the directed-in-Q's-metric one used
inside KL is not (see §5). Note the subtlety worth teaching: **`D_B` is not a
metric, but `√(1−e^(−D_B)) = H` is** — the same information, monotonically
re-mapped into a bounded metric. That's a small, honest "aha" about how
distance-like a divergence can be made.

### Ranking: illuminating vs cluttering

1. **Bayes error — include, as the operational anchor.** It's the *meaning* of
   "how different," it's visual (overlap area), and it unifies the rest. Highest
   value.
2. **Bhattacharyya (coeff + distance) — include.** Closed-form, it's the natural
   bound on Bayes error, and `D_B`'s `⅛·d_M²(pooled)` term rhymes with KL's
   `½·d_M²(Q-metric)` — a direct bridge to the app's existing spine. It also
   *is* the pooled-Σ Mahalanobis the §5 discussion already needs.
3. **Hellinger — include (lightweight).** One line off BC (`H²=1−BC`), and it's
   the app's chance to show a *true bounded metric*, contrasting KL. Cheap payoff.
4. **TV — include as the readout that equals `½(1−overlap)`**, i.e. render it
   *as* the Bayes-error/overlap story rather than as a seventh independent number.
   Its operational tie (`P_e = ½(1−TV)`) is the point; standalone it clutters.
5. **Chernoff (general `s`) — mention, don't build.** The tighter-than-½ bound is
   a nice footnote (`min_s ∫p^s q^(1−s)`) but adds a slider for marginal insight;
   leave it to the EXPLAINER's "go further."

> [!IMPORTANT]
> **Decision — recommended set:** Bayes error (anchor) · Bhattacharyya (BC + D_B)
> · Hellinger · TV-as-`½(1−overlap)`, on top of the existing Mahalanobis + KL.
> That's **six lenses that are really one question** plus the two the app was
> built around. Present them in an **Analyze "Yardsticks" panel** as the chain
> above (bounded stack + KL escaping), not as eight loose stat tiles.

### Honesty traps specific to this addition

- **Overlap shading ≠ KL integrand field.** Two *different* heat layers will be
  on the same plane: the **overlap region** `min(p,q)` (unsigned, its area = Bayes
  mass, symmetric) and the **KL integrand** `p·log(p/q)` (signed, directional,
  integrates to KL). Learners *will* conflate them. Never show both lit at once;
  gate them behind the active lens, and label the overlap "misclassification
  mass" and the integrand "KL contribution (signed)." They answer different
  questions and one is symmetric while the other is not.
- **Disclose TV/Bayes numeric provenance** (above) — a small "≈ (numeric)" tag.
- **Never call KL or `D_B` a metric.** TV and Hellinger are metrics; say so
  explicitly *by contrast*, because that contrast is half the lesson.
- **Priors:** `P_e = ½(1−TV)` and `P_e ≤ ½·BC` are the **equal-prior** forms.
  Default to equal priors, and if you ever expose a prior slider, switch to
  `P_e = π₁ − ∫max(0, π₁p − π₂q)` / `P_e ≤ √(π₁π₂)·BC` and relabel — don't leave
  the ½'s hard-coded.

### Recommended teaching order (extending §9's arc)

1. **Overlap first (Bayes error).** Before any formula: shade `min(p,q)`, say
   "this area is how often the best possible classifier is wrong." Concrete,
   operational, no math.
2. **TV = ½(1−overlap).** Name the overlap's complement; introduce TV as the same
   fact renamed. Bounded `[0,1]`, a metric.
3. **Bhattacharyya + Hellinger as the *bounds*.** "Here's a closed-form number
   that upper-bounds that error (`½·BC`) and a bounded metric built from it
   (`H`)." Now the learner has closed forms that *predict* the overlap without
   integrating.
4. **KL last, as the outlier.** "Every measure so far lives in `[0,1]`. KL
   doesn't — it runs to ∞, it's asymmetric, it's not a metric — and Pinsker
   (`TV ≤ √(KL/2)`) is the one bridge back." This is where KL's strangeness
   becomes a *feature* the learner can place, not a wart.
5. **Mahalanobis threads through** as the mean-separation seen in three metrics
   (Q's inside KL at `½`, pooled inside `D_B` at `⅛`, shared at the collapse).

That ordering makes Bayes error the floor everyone stands on and KL the ceiling
that isn't there — which is exactly the honest hierarchy.

> [!WARNING]
> **Scope check.** Six measures is a lot; the §9 warning about staging applies
> *doubly*. Do **not** surface all of them at rest. Ship Mahalanobis + KL as the
> spine (the exact unification is still the headline), and put the yardstick
> family behind a progressive-disclosure "compare all measures" step. The
> relationships are the payload; a wall of eight simultaneous numbers is the
> anti-payload.

---

## Self-reflection

1. **What would you do with another session?** Prototype the **whitened-frame
   payoff picture** (Q → unit circle, P → residual ellipse with axes √λᵢ) on
   paper/SVG to confirm it reads at a glance, and draft the exact EXPLAINER
   wording for the three-convention Mahalanobis disambiguation — the place words
   most easily go wrong.
2. **What would you change about what you produced?** I could have sketched the
   actual `gaussian2d.ts` API (signatures for `klDivergence`, `mahalanobis`,
   `whiten`, `mismatchByEigen`) so the build has a typed contract, not just prose
   recommendations. I stayed at the design layer as the hat's role dictates.
3. **What were you not asked that you think is important?** Canvas performance of
   the signed-integrand field on drag — it's an O(pixels) recompute per frame; I
   flagged throttling but didn't benchmark. Also the interaction between the
   whitening warp and the workspace's draggable-window chrome (does the warp
   apply to the whole view node or a sub-layer?) — an integration detail worth
   pinning early.
4. **What did we both overlook?** The brief's "trace + log-det − k" breakdown is
   not just ugly but actively **sign-error-prone** — I proved that by making the
   exact sign slip while coding the verification. The eigenvalue reframe isn't a
   nicety; it's the difference between a robust and a fragile implementation.
5. **What did you find difficult?** Keeping the *three* Mahalanobis conventions
   straight in prose without a metric subscript on every symbol — which is itself
   the evidence that the app must label them explicitly, or every user hits the
   same confusion I did.
6. **What would have made this task easier?** A `numpy` in the sandbox (I fell
   back to pure-Python 2×2 linear algebra); it worked but was fiddly. Not a
   blocker.
7. **How did you verify this, and does each passing check test the user-visible
   claim?** **Method: analytical derivation + independent numerical check
   (reasoning + a pure-Python Monte-Carlo/closed-form comparison).** The closed
   form matched Monte-Carlo KL (1.5952 vs 1.5939), the equal-cov collapse matched
   `½·d_M²` exactly (2.6145), and the eigenvalue mismatch reconstructed the KL
   remainder (½·d_M² + ½Σg(λ)= KL). These test the *math claims* the app rests on,
   which is exactly the user-visible payload. **Not verified:** any actual UI,
   colormap legibility, canvas performance, or whitening render — none exists yet;
   those are design recommendations, not checked behavior. No `signals:` for
   visual/device checks apply because nothing was built to check.
8. **Follow-up value:** MEDIUM — the math verdict is solid and complete, but the
   five correctness-critical labeling/rendering fixes need a builder to actually
   land them in the engine and EXPLAINER; without that follow-through the app
   could still ship a mislabeled Mahalanobis and teach the misconception the
   review exists to prevent.
