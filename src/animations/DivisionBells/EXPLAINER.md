# Division Bells

Two bells — Gaussians **P** and **Q** — and one question: **how far apart are they?**
Start **On a line** (two bell curves on one axis), where each answer is something you
can *see* and point at; switch to **On the plane** for the 2-D generalization.

## On a line — the measures you can see

Two bell curves on a shared axis. Drag the peaks:

- **Mahalanobis separation** is the **gap between the peaks, measured in bell-widths
  (σ)** — read it straight off the **σ-ruler** under the curves ("the peaks are 2.4 σ
  apart"; count the ticks). It uses the pooled width σ = √((σ₁²+σ₂²)/2), so it is
  always defined and symmetric.
- The **divergence** is the **shaded lens where the bells overlap** — the *confusable*
  region. Its area is the **overlap**; the best possible classifier told to tell P
  from Q still misclassifies **½·overlap** of the time (equal priors) — the **Bayes
  error**. The curves' crossing point is the **decision boundary**. Pull the bells
  apart and the lens — and the error — shrink; push them together and it grows. That
  is the divergence, *felt*.

The prior π(P) tilts the decision boundary: if P is the more likely class, the
boundary shifts toward Q and the error drops.

## On the plane — the same ideas in 2-D

Switch to *On the plane* and each bell becomes an ellipse you can drag, tilt and
stretch; the full divergence family (KL, Bhattacharyya, Hellinger, TV, Bayes error,
Wasserstein-2), the decision-overlap field, and the whitening view live there.

## Mahalanobis separation — distance in the distribution's own units

Euclidean distance treats every direction equally. **Mahalanobis** distance doesn't:
it measures the gap between the means in units of the spread, so a step *along* a
wide axis counts for less than a step *across* a narrow one. Formally the squared
separation of the means, measured in Q's covariance, is

$$d_M^2 = (\mu_P-\mu_Q)^\top\,\Sigma_Q^{-1}\,(\mu_P-\mu_Q).$$

It is reported in **σ-units**: `dₘ = 2` means "two standard deviations apart, once
you account for the shape." (Whiten the plane — squash Q into a unit circle — and
Mahalanobis becomes ordinary straight-line distance. That view is coming.)

## Kullback–Leibler divergence — how one distribution differs from another

**KL divergence** `KL(P‖Q)` measures the information lost when Q is used to stand in
for P. It is *not* symmetric — `KL(P‖Q) ≠ KL(Q‖P)` in general — and it is unbounded,
so it is a **divergence**, not a distance. Watch the two directions disagree as you
give the bells different shapes.

## The bridge (why they're in one picture)

For two Gaussians the KL divergence splits exactly into two non-negative pieces:

$$KL(P\|Q) = \underbrace{\tfrac12\,d_M^2}_{\text{mean shift}} \;+\; \underbrace{\tfrac12\sum_i(\lambda_i - 1 - \ln\lambda_i)}_{\text{covariance mismatch}},$$

where the λᵢ compare the two covariances. The first term **is** the squared
Mahalanobis separation. So:

- **Match the two shapes** (the *Match shapes* preset) and the covariance term
  vanishes: `KL = ½·d_M²` exactly. Mahalanobis *is* the mean-shift part of KL.
- **Make the shapes differ** and the covariance term switches on — and that term is
  what makes KL asymmetric.

Set the two means equal (*Concentric*) and the mean term is zero, yet KL is still
positive: two distributions can share a center and still be different.

## What's honest here

- `dₘ` is the *directed* Mahalanobis (in Q's metric) — the one that appears inside
  `KL(P‖Q)`. A second, **pooled/symmetric** Mahalanobis is shown separately; away
  from the equal-shape case the two numbers differ, and neither is "the" Mahalanobis
  distance without saying which metric.
- KL is in **nats** (natural log); the bits column divides by ln 2.
- Very thin ellipses are clamped to a minimum width so the divergences stay finite —
  a truly degenerate (zero-width) Gaussian has infinite KL.

## Possible sources & where to go further

Reached here by asking, in two different vocabularies, "how far apart are two
Gaussians?" — but both measures are classical, and both are worth reading in the
original:

- **P. C. Mahalanobis, "On the generalised distance in statistics" (1936).** The
  whitened, covariance-aware distance; still the standard for outlier and
  separation questions.
- **S. Kullback & R. A. Leibler, "On information and sufficiency" (1951)**, and
  Kullback's *Information Theory and Statistics*. The origin of the divergence and
  its information reading.
- The **closed form for the Gaussian KL** (and its mean/covariance split) is a
  standard exercise in multivariate statistics and appears in most machine-learning
  texts (e.g. Bishop, *Pattern Recognition and Machine Learning*) — a good next
  step is to derive it and see the Mahalanobis term fall out.
- **Where to go further:** the same two bells support a whole *family* of "how
  different" measures — the **Bhattacharyya** coefficient and **Hellinger** distance
  (bounded, symmetric), **total variation**, and the **Bayes error** (the best
  classifier's mistake rate), tied together by **Pinsker's inequality** and the
  **Bhattacharyya bound**. They are the natural sequel to this pair.
