# Stable Matching

The **Gale–Shapley** algorithm, **stable matchings**, and who holds the power in a
two-sided market.

## The problem

Two groups, **A** and **B**, each rank everyone in the other group. A **matching**
pairs them up. A pair is **blocking** if two people *not* matched to each other would
both rather be together than keep their current partners — they'd defect. A matching
with **no blocking pair** is **stable**.

## The hidden variable: a common preference

Every member has a latent **desirability** (the grey bar). Each person's ranked list
blends that shared signal with private taste, controlled by **Consensus**:

- **0%** — pure private taste; everyone's list is different.
- **100%** — everyone in a group ranks the other group *identically* (the shared
  desirability order). Competition for the same few "stars" is fiercest.

So *Consensus is the weight on the common preference* — turn it up to watch the
population agree.

## Who proposes (the modes)

- **A proposes / B proposes** — classical one-sided Gale–Shapley. It always
  terminates at a stable matching, and that matching is **proposer-optimal**: the
  proposing side gets the best partner it could have in *any* stable matching, the
  receiving side the worst. Set the default here to *see the theorem*.
- **Market** — each step a (biased) coin picks who proposes. An idealized two-sided
  market: still stable, but it lands on *some* stable matching, generally neither
  extreme. The asker advantage here is **emergent**, not the 1962 theorem.

## The honest metric: proposer advantage

How much does proposing actually matter? Run Gale–Shapley **from each side** and
compare the two results — the **gap** between the best and worst stable matching a
side can be in. That gap *is* the proposer advantage, and it's a property of the
instance, not of the random order of proposals.

Its punchline: as **Consensus → 100%** the gap **collapses to zero** — under a fully
shared common preference the stable matching is **unique** (best-with-best), so it no
longer matters who proposes. The **Lab** sweeps both consensus dials and maps this
surface; each cell averages many trials, so what you see is signal, not noise.
