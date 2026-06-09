# Agentic Sorting

What if sorting weren't one top-down algorithm, but **many little agents**
each following a simple local rule? Order emerges from their interaction.

## Emergent sorting

Each slot in the array holds an **agent**. On every cycle a random subset
"wakes up" and applies its own rule — a swap or a move. No agent has a global
view, yet the array still marches toward sorted order. That's *emergence*: a
global property (sortedness) arising from purely local actions.

## The strategies — and their classic analogs

| Agent | Local rule | Classic sort it echoes |
|---|---|---|
| **Standard** | compare a random *adjacent* neighbor, swap if out of order | Bubble sort |
| **Blind Date** | compare a random agent *anywhere*, swap if misordered | randomized compare-swap |
| **Nomadic** | drift left while smaller than the left neighbor | Insertion sort |
| **Patrolling** | keep a heading, swap on contact, reverse when settled | Cocktail-shaker sort |
| **Perfectionist** | scan the whole right tail, pull the minimum into place | Selection sort |

## Why mixes win

- **Blind Date** converges fastest on its own: by comparing across long
  distances it removes large-scale disorder in single jumps.
- **Perfectionist** is expensive per wake-up (a full scan) but places an
  element exactly, once it fires.
- **Mixed populations** often beat any single type. Long-range movers
  (Blind Date, Perfectionist) do the coarse work while local refiners
  (Standard, Patrolling, Nomadic) clean up behind them — a division of
  labor.

## The knobs

- **Global density** — how many agents fill the array.
- **Processing delay** — milliseconds between simulation cycles.
- **Population mix** — the relative proportion of each strategy.
