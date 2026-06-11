# Agentic Sorting Lab

A concurrent, **cell-view** sorting simulation: every element of the array is an
autonomous **agent** that runs its own local rule and pursues its own position.
There is no top-down sorter — sortedness, when it appears, is emergent.

## Where the idea comes from

The framing follows Taining Zhang, Adam Goldstein & Michael Levin, *Classical
Sorting Algorithms as a Model of Morphogenesis: self-sorting arrays reveal
unexpected competencies in a minimal model of basal intelligence* (Adaptive
Behavior, 2025; [arXiv:2401.05375](https://arxiv.org/abs/2401.05375); discussed
by Levin on Lex Fridman Podcast #486). Treating array elements as agents, they
measured competencies that **none of the rules explicitly encode** — most
strikingly, *clustering by algotype* and *robustness to defective cells*.

This app is built to make those competencies **measurable**, with readouts rather
than just a moving picture.

## The agents (algotypes)

| Agent | Strategy | Classic analog |
|---|---|---|
| **Standard** | compares a random adjacent neighbor, swaps if out of order | bubble sort |
| **Blind Date** | compares a partner anywhere in the array | randomized compare-swap |
| **Nomadic** | only inspects the neighbor behind it, drifting toward its goal | insertion-style drift |
| **Patrolling** | keeps a heading; swaps on contact, reverses when settled | cocktail-shaker sort |
| **Perfectionist** | scans the right tail for the extreme value and pulls it in | selection sort |

An agent's **algotype** (its rule) is independent of its **value** and its
**position** — exactly the distinction the paper draws.

## What you can measure

- **Sortedness** — fraction of adjacent pairs already ascending (1 = sorted).
- **Inversions** — out-of-order pairs; 0 ⇒ ascending-sorted.
- **Monotone runs** — number of monotone domains; the metric for the phase-
  separation mode (a single sort → 1; two opposed domains → ~2).
- **Clustering** — *excess homophily over chance* in algotype adjacency. The
  chance baseline is subtracted, so a positive value is real clustering, not just
  a restatement of the population mix.
- **Best reachable** — with frozen cells pinned, the highest sortedness still
  attainable; the gap to 1.0 is the damage the defects impose.

## Two objective modes

- **Selfish (ascending)** — faithful to the paper: every agent pursues the same
  ascending order, each by its own local rule. Converges. Use this to see
  clustering and defect-robustness.
- **Phase separation** — an **animath-original** extension *not* in Levin's work:
  agents disagree on direction (some ascending, some descending). The array
  generally does not fully sort; it forms monotone domains instead. Watch
  **Monotone runs**, not sortedness.

## Sandbox vs Lab

The top-bar pills switch between two modes:

- **Sandbox** — the live simulation, with the arena, the all-agent **Trajectories**
  plot (every agent's distance-to-home over time, warm = backtracked = delayed
  gratification), the single-agent tracker, and a **Replicate** panel that re-runs
  the current settings on many fresh instances and shows the outcome distribution.
- **Lab** — batch experiments over headless runs:
  - **Compare** — each pure algotype (and the current mix) head-to-head; the
    source of head-to-head numbers like "Blind Date ≈ 545 swaps."
  - **Monte-Carlo** — the current mix repeated on many seeds (same parameters,
    different instances); a histogram of the outcome.
  - **Sweep** — vary one knob (array size, frozen %, wake rate, descending share)
    across its range and plot the outcome curve.

  Outcomes: cycles-to-sort, total swaps, final sortedness, clustering reached —
  each as mean ± sd, with a convergence rate (a condition that doesn't fully sort
  within the cycle cap is reported at the cap).

> A note the Lab makes vivid: an equal five-way mix is *slower to fully sort* than
> its best pure strategies — the long tail of far-from-home elements leans on the
> minority of long-range agents. "More variety" is not automatically "faster."

## Parameters

- **Array size** (16–400) and **Wake rate** (fraction of agents acting per cycle).
- **Population mix** — relative proportion of each algotype.
- **Objective** — uniform (selfish) vs split (phase separation), with a descending
  share.
- **Frozen / defective** — share of immovable obstacle cells.
- **Step interval** — milliseconds between cycles.

## Notes on honesty

- *Standard*, *Nomadic*, and *Patrolling* are *loose* echoes of their named sorts;
  *Perfectionist* (≈ selection) and *Blind Date* are faithful.
- "Competencies" here means *measured behavior* (clustering, robustness), not a
  claim that the cells are intelligent.
