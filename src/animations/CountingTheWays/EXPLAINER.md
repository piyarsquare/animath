# Counting the Ways

You have two independent things you can count — say **repeats gained** and
**repeats lost** at a microsatellite locus — each a Poisson count with its own
rate. You never see the two counts separately; you only see their **difference**.
That difference follows the **Skellam distribution**, and when you write its
formula a **modified Bessel function** `I_{|k|}` appears. This app shows that the
Bessel function is nothing to fear: it is just a sum.

## The one picture

The grid is every possible pair `(gained, lost)`, shaded by how likely it is —
the product of the two Poisson distributions drawn along the top and left edge.
Fix a difference `k` and one **diagonal** lights up: every cell on it gains
exactly `k` more than it loses. To produce a net change of `k` you can gain `k`
and lose `0`, or gain `k+1` and lose `1`, or gain `k+2` and lose `2`, … — one
rung per row of the diagonal.

**Add those rungs up and you get `P(K = k)`.** Pull the constants out front and
the leftover sum is exactly the Bessel series

```
I_k(z) = Σ  (z/2)^(2n+k) / ( n! (n+k)! ),   z = 2·√(μ₁·μ₂)
```

so **the Bessel function is the diagonal sum**. Press *Walk* and watch the sum
build rung by rung until it lands on the value in the formula.

## The three modes

- **Explain** — the lattice, the diagonal, the accumulating sum, and the
  color-linked formula. The conditional bars at the bottom answer the title
  question directly: given the difference is `k`, the probability that it came
  from a particular `(gained, lost)` pair is one Bessel term divided by the
  Bessel sum.
- **Sample** — draw the two counts at random and keep only the difference. The
  histogram converges to the same Skellam curve; the sample mean tracks `μ₁−μ₂`
  and the variance tracks `μ₁+μ₂`.
- **Fit** — generate synthetic differences and recover the two rates from just
  the sample mean and variance (`μ̂₁=(s²+m̄)/2`, `μ̂₂=(s²−m̄)/2`). The fitted
  Skellam — Bessel and all — lands on the data, with no scary words required.

## Possible sources & where to go further

- **J. G. Skellam (1946)**, "The frequency distribution of the difference
  between two Poisson variates," *J. Royal Statistical Society* — the difference
  distribution and its Bessel-function form. (Irwin gave a related result the
  same era.)
- **Modified Bessel function of the first kind** `Iₙ` — any reference on Bessel
  functions (e.g. Abramowitz & Stegun, Ch. 9) for the series used here; the
  identity `Iₙ(z)=Σ (z/2)^{2m+n}/(m!(m+n)!)` is what the diagonal sum reproduces.
- **Microsatellites / short tandem repeats** — the stepwise mutation model
  (Ohta & Kimura, 1973; Valdes, Slatkin & Freimer, 1993) treats repeat-length
  change as gains minus losses, which is where a difference-of-Poissons (Skellam)
  fit naturally shows up.
- For estimation beyond moments, search "Skellam distribution maximum
  likelihood"; the method-of-moments fit here is the interpretable first step,
  exact in the first two moments.
