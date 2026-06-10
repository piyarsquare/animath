# Agentic Sorting

What if a sort weren't one top-down procedure operating *on* a passive array, but
**many little agents** — one per slot — each following a simple local rule and
pursuing its own position? Order, when it appears, is *emergent*: a global
property (sortedness) arising from purely local actions.

This "cell-view" framing follows Zhang, Goldstein & Levin, *Classical Sorting
Algorithms as a Model of Morphogenesis* (Adaptive Behavior, 2025;
[arXiv:2401.05375](https://arxiv.org/abs/2401.05375)), which found that even
these minimal systems show **measurable competencies that no rule explicitly
encodes**. The aim here is to *measure* those competencies, not just watch pretty
bars move — so the picture stays honest about what is and isn't happening.

## The agents (algotypes)

Each agent runs one rule — its **algotype**. The five here echo classic sorts to
varying degrees (only the honest analogies are claimed):

| Agent | Local rule | Classic analog |
|---|---|---|
| **Standard** | compare a random *adjacent* neighbor, swap if out of order | bubble sort |
| **Blind Date** | compare a partner *anywhere*, swap if misordered | randomized compare-swap |
| **Nomadic** | only inspect the neighbor *behind* it; drift toward its goal end | insertion-style drift |
| **Patrolling** | keep a heading; swap on contact, reverse when settled | cocktail-shaker sort |
| **Perfectionist** | scan the whole right tail, pull the extreme value into place | selection sort |

> Fidelity note: *Standard*, *Nomadic* and *Patrolling* are *loose* echoes — e.g.
> Nomadic is really a one-sided bubble, not true insertion. *Perfectionist*
> (≈ selection) and *Blind Date* are the faithful ones.

## What to measure

- **Clustering (the Levin result).** With a mixed population — a *chimeric* array —
  color **By algotype** and watch like-with-like agents drift together. The
  **Clustering** readout reports *excess homophily over chance*: 0 means the mix
  is no more clumped than a random shuffle, **+%** means real clustering — a
  meta-pattern implemented in none of the rules.
- **Robustness to defects.** Turn up **Frozen / defective** to pin some cells in
  place as immovable obstacles. The array still sorts the movable cells around
  them; the **Best reachable** ceiling shows the most order possible with the
  defects pinned, and the agents get close to it.

## Divergent objectives (an animath-original)

In the paper every cell sorts toward the **same** order. Switching **Objective**
to **Phase separation** is *our* extension, not Levin's: agents disagree about
which way order should run (some ascending, some descending). The array generally
**never fully sorts** — sortedness stalls near ½. With *local* agents (Standard,
Nomadic, Patrolling) it coarsens into monotone **domains**, like phase separation,
and the **Monotone runs** readout falls; **Blind Date's** long-range swaps
frustrate that, keeping the array churned. Watch **Monotone runs**, not sortedness
— global sortedness no longer tells the story.

## The knobs

- **Array size / Wake rate** — how many agents, and what fraction act per cycle.
- **Population mix** — the proportion of each algotype.
- **Objective** — one shared goal (selfish ascending) vs mixed (phase separation).
- **Frozen / defective** — share of immovable obstacle cells.
- **Step interval** — milliseconds between cycles.
