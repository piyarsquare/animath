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

so **the Bessel function is the diagonal sum**.

## Rates, and where they come from

You can set the two rates `μ₁, μ₂` directly, or switch *Rates from* to a
**length law** `f(L) = softplus(a + b·L)`: the rate of gains and of losses each
grow with the allele length `L`, and the app reads `μ₁, μ₂` off the two curves at
the length you choose. (Below the hinge `L* = −a/b` the rate is tiny; above it it
rises with slope `b` per repeat.)

## The two modes

- **Explain** — the lattice, the diagonal, and the color-linked formula. Press
  **Play tutorial** to build the whole grid step by step: the two Poisson margins,
  then every cell as a product `P(gained=x)·P(lost=y)`, then the diagonal summed
  rung by rung onto `P(K = k)`. The conditional bars at the bottom answer the
  title question directly: given the difference is `k`, the probability it came
  from a particular `(gained, lost)` pair is one Bessel term divided by the
  Bessel sum.
- **Lab** — a cataloged simulator. Each run draws a sample from the current rates,
  recovers `μ̂₁, μ̂₂` from just the sample mean and variance
  (`μ̂₁=(s²+m̄)/2`, `μ̂₂=(s²−m̄)/2`), and logs a row. Re-run to watch the recovery
  wobble with the seed; change the rates to compare. The fitted Skellam — Bessel
  and all — lands on each logged run's histogram.

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
