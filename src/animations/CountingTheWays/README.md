# Counting the Ways — the Skellam difference and its Bessel function

A difference of two independent Poisson counts is **Skellam**-distributed, and
its probability mass function contains a **modified Bessel function of the first
kind**. That Bessel function looks intimidating when it falls out of a fit, but
it has a plain meaning: it counts — and weights — *every way the two counts can
produce the same difference*. This app makes that literal.

## The mathematics

Let `X ~ Poisson(μ₁)` and `Y ~ Poisson(μ₂)` be independent, and `K = X − Y`.
Then

```
P(K = k) = Σ_{y≥max(0,−k)} P(X = k+y) · P(Y = y)
         = Σ_n  e^{−μ₁} μ₁^{k+n}/(k+n)! · e^{−μ₂} μ₂^{n}/n!
         = e^{−(μ₁+μ₂)} (μ₁/μ₂)^{k/2} · Σ_n (√(μ₁μ₂))^{2n+k} / ( n! (n+k)! )
         = e^{−(μ₁+μ₂)} (μ₁/μ₂)^{k/2} · I_{|k|}( 2√(μ₁μ₂) ).
```

The final sum is, term for term, the series of the modified Bessel function
`I_{|k|}`. So the Bessel function is the **un-normalized diagonal sum**: each of
its terms is the joint probability of one `(X, Y)` pair on the line `X − Y = k`,
after the constant factors `e^{−(μ₁+μ₂)}` and `(μ₁/μ₂)^{k/2}` are pulled out.

### The conditional probabilities

Dividing each diagonal term by the whole sum gives the **conditional
distribution of the underlying counts given the difference**:

```
P(rung = n | K = k) = [ (z/2)^{2n+|k|} / (n!(n+|k|)!) ] / I_{|k|}(z),   z = 2√(μ₁μ₂).
```

This is the sense in which "a Bessel function gives the conditional
probabilities": the Bessel value is the normalizing constant, and each
conditional probability is a single Bessel-series term divided by it.

## Using it

- **Explain** is the heart: drag `μ₁`, `μ₂` and the difference `k`, then *Walk*
  the diagonal so the running sum builds visibly to `P(K=k)`. The factored
  formula is color-linked to the picture — the highlighted `Iₖ` chip is the
  diagonal sum.
- **Sample** draws the two counts at random (a seeded generator) and keeps the
  difference; the histogram converges to the Skellam curve and the empirical
  mean/variance track `μ₁−μ₂` and `μ₁+μ₂`.
- **Fit** generates synthetic differences and recovers both rates by the method
  of moments. It is deliberately *synthetic* data: the point is to watch the fit
  recover known truth, so the same machinery on real data feels trustworthy.

## Where it comes from (microsatellites)

The motivating case is modeling microsatellite (short-tandem-repeat) length
change as **repeats gained minus repeats lost**, each Poisson — a difference of
Poissons, i.e. a Skellam, whose fit surfaces the Bessel function. The *Generic
X, Y* framing drops the biology if you just want the distribution.

See `EXPLAINER.md` for a short tour and the **Possible sources** pointers.
