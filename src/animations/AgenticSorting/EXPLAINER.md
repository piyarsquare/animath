# Agentic Sorting

What if a sort weren't one top-down procedure operating *on* a passive array, but
**many little agents** — one per slot — each following a simple local rule and
pursuing its own position? Order, when it appears, is *emergent*: a global
property (sortedness) arising from purely local actions.

> **Start here:** the **Scenarios** panel has five one-click demos — Clustering,
> Robustness, Delayed gratification, Phase separation, and "the even mix is slow."
> Each sets up the population and view that make one idea visible, then runs it.

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

## From one run to many (Sandbox vs Lab)

One run tells you a story; many runs tell you a *distribution*. To go beyond
one-shot, open the **Lab** (the top-bar mode) — full batch experiments over
headless runs: **Compare** each pure algotype head-to-head (this is where "Blind
Date sorts in ~545 swaps" comes from), **Monte-Carlo** the current mix, or
**Sweep** one knob across its range. Measure cycles-to-sort, swaps, final
sortedness, or clustering, with mean ± sd over the trials.

Because each agent rule is a pure function, thousands of trials run in a moment.

## The knobs

- **Array size / Wake rate** — how many agents, and what fraction act per cycle.
- **Population mix** — the proportion of each algotype.
- **Objective** — one shared goal (selfish ascending) vs mixed (phase separation).
- **Frozen / defective** — share of immovable obstacle cells.
- **Step interval** — milliseconds between cycles.

## Possible sources & where to go further

Pointers for going deeper, not priority claims.

- **The direct source** — the cell-view framing, the clustering-of-like-agents
  result, and "competencies no rule encodes" are from **Taining Zhang, Adam
  Goldstein & Michael Levin**, *Classical Sorting Algorithms as a Model of
  Morphogenesis: self-sorting arrays reveal unexpected competencies in a minimal
  model of basal intelligence* (*Adaptive Behavior*, 2025;
  [arXiv:2401.05375](https://arxiv.org/abs/2401.05375)).
- **Levin's broader program** — diverse intelligence and "basal cognition" in
  unconventional substrates — is the context that motivates *measuring* the
  competencies rather than just watching them; see Michael Levin's work on
  collective/agential behavior in non-neural systems.
- **The classic sorts** the algotypes echo — bubble, insertion, selection,
  cocktail-shaker — are textbook material (Knuth, *The Art of Computer
  Programming*, Vol. 3); the app only claims the *honest* analogies.
- **Emergent order from local rules** sits near the wider tradition of
  self-organization and cellular automata (von Neumann, Wolfram) and the
  statistical-physics reading of the **Phase separation** mode (coarsening into
  monotone domains resembles spinodal decomposition / Ising-like domain growth).
- The **divergent-objectives / Phase separation** mode is an animath-original
  extension, not part of the Levin paper.
