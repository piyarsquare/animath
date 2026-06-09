# Stable Matching

The **Gale–Shapley** algorithm, the whole **space** of stable matchings, and the
fair solutions and repairs that live inside it.

## Reading the matrix

Rows are group **A**, columns group **B**. Each cell is the potential pair
(A_i, B_j), encoded as **two nested heatmaps** sharing one diverging colour scale
(**BuRd**: **blue = #1 choice → white → red = last**): the **square** is how A_i
ranks B_j, the **circle inside** is how B_j ranks A_i. Shape — square vs circle —
tells the two sides apart, not colour. (Exact ranks show as numbers at small
populations and on hover; with many people the heat carries it.)

As the algorithm runs, **green cells are the current tentative matches**; the
**gold ring** is a proposal; a **purple flash** is a rejection or a partner being
bumped. A held partner's rank only ever improves — that monotone "trade-up" is
exactly *why* one-sided deferred acceptance is stable.

## Deferred acceptance, in rounds

Each **round**, the whole proposing side asks at once; every receiver keeps its
single best offer and rejects the rest; rejected proposers try their next choice.
The **Schedule** sets who proposes:

- **A / B** — always that side. Classical one-sided Gale–Shapley: the result is the
  proposer-optimal stable matching, and it is **always stable**.
- **Alternate / Random** — the sides take turns (or a coin decides). Synchronous
  two-sided deferred acceptance is **usually *not* stable** — it leaves **blocking
  pairs** (purple-ringed: two people who both prefer each other to their partners).

## The common preference

Every member has a hidden **desirability**; each list blends that shared signal
with private taste, weighted by **Consensus** (0% = pure private taste, everyone
wants someone different; 100% = everyone in a group agrees on one ranking). At full
consensus there is a *unique* stable matching — best-with-best on the diagonal.

## Outcome, per side

The **Partner rank by side** panel shows each side's **average partner rank**
(coloured by that average) and its **sorted outcome colourbar** — every person as a
tick, sorted best→worst, on the BuRd scale. The blue/red balance reads like an ECDF:
when A proposes, A's bar is mostly blue and B's reddens — proposer advantage made
visible.

## The space of stable matchings

The stable matchings form a **distributive lattice**. The app exposes it three ways:

- **Footprint** — every cell matched in *some* stable matching is outlined
  (teal dashes). It's just the diagonal at full consensus and fattens into a band as
  consensus drops: the "wiggle room."
- **Jump to a stable solution** — teleport to a named matching: **A/B-optimal** (the
  two extremes), **Egalitarian** (minimum total rank — welfare-best), **Median**
  (everyone's median stable partner — the centre), **Min-regret**, **Sex-equal**
  (balances A's and B's happiness), **Balanced**. Watch the per-side averages pull
  together as you pick a fairer one.
- **Lattice tab** — the Hasse diagram of *all* stable matchings: A-optimal at the
  top, B-optimal at the bottom, each edge a single **rotation**, the named solutions
  flagged. Click a node to load it. It collapses to a single point as consensus → 100%.

## Stabilize (Roth–Vande Vate)

When a run lands unstable, **Stabilize** runs a *random path to stability*: pick a
blocking pair, satisfy it (their old partners go single), repeat. It provably
reaches a stable matching; the purple cells heal one at a time. The number of repair
steps — the **cost to stabilize** — is mapped across consensus in the Lab.

## The Lab

Sweeps both consensus dials and maps a chosen surface, averaging many trials per
cell: **Ranks (A·B)**, **Unstable %** and **Blocking** (the instability of the
synchronous schedules), **# stable** (the lattice size — huge when disordered,
collapsing to 1 at full consensus), and **Repair cost** (RVV steps).
