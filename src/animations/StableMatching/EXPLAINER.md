# Stable Matching

The **Gale–Shapley** algorithm, **stable matchings**, and how well a matching
satisfies everyone's preferences.

## Reading the matrix

Rows are group **A**, columns group **B**. Each cell is the potential pair
(A_i, B_j), encoded as **two nested heatmaps** sharing one diverging colour scale
(**BuRd**: **blue = #1 choice → white → red = last**): the **square** is how A_i
ranks B_j, the **circle inside** is how B_j ranks A_i. Shape — square vs circle —
tells the two sides apart, not colour. So a row is A_i's preferences as a colour
gradient, a column is B_j's. (Exact ranks show as numbers at small populations and on
hover; with many people the heat carries it.)

As the algorithm runs, **green cells are the current tentative matches**; the
**gold ring** is the proposal happening now; a **red flash** is a rejection. A
matched pair stays green only while it survives — receivers keep trading **up**, so
a held partner's rank only ever improves. That monotone "trade-up" is exactly *why*
the result is stable.

## Deferred acceptance

1. A free proposer proposes to its most-preferred partner not yet asked.
2. The receiver **holds** whichever suitor it ranks best so far and rejects the rest.
3. Rejected proposers move down their list and try again.

It always terminates at a **stable matching** — no **blocking pair**, i.e. no two
people who both prefer each other to their current partners. If any survive (they
can't, for a completed run) they light up red.

## The common preference — and the diagonal

Every member has a hidden **desirability**; each person's list blends that shared
signal with private taste, weighted by **Consensus**:

- **0%** — pure private taste; everyone wants someone different.
- **100%** — everyone in a group agrees on one ranking of the other group.

Turn **Order by global preference** on (default) and the rows/columns sort by
desirability. At high consensus the matched green cells snap to the **diagonal** —
best-with-best — because everyone shares one order. (At low consensus the matches
scatter; people simply want different things.)

## The metric: total rank

The honest measure of a matching is **how good a partner everyone gets** — the
**total rank** (sum of every matched person's partner-rank; **lower = happier**),
shown per side and combined, with a distribution of who got their #1, #2, …
Counter-intuitively, **low** consensus gives the **best** total rank: when people
want different partners there's enough to go around; when everyone chases the same
few "stars," most settle for worse. The **Lab** sweeps both consensus dials and maps
this welfare surface, averaging many trials per cell so it's signal, not noise.

## Who proposes

- **A proposes / B proposes** — classical one-sided Gale–Shapley.
- **Market** — a bias-weighted coin picks the proposer each step; still stable, but
  no longer a canonical matching.
