# Division Bells

Two bell curves — Gaussians **P** and **Q** — sit on the plane. Drag their centers,
tilt and stretch their ellipses, and watch two different answers to one question:
**how far apart are these two distributions?**

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
