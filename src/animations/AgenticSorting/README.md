# Agentic Sorting Lab

A concurrent sorting simulation where autonomous agents with distinct behavioral
strategies work simultaneously to sort a population of values.

## Concept

Instead of a single sorting algorithm operating top-down, the array is populated
with **agents** that each follow their own local strategy. Every simulation cycle,
a random subset of agents "wakes up" and applies its rule, producing emergent
sorting behavior from the interaction of many independent actors.

## Agent Types

| Agent | Strategy | Sorting Analog |
|---|---|---|
| **Standard** | Compares with a random adjacent neighbor and swaps if out of order | Bubble sort |
| **Blind Date** | Picks a random agent *anywhere* in the array and swaps if misordered | Randomized comparison sort |
| **Nomadic** | Always drifts left when smaller than its left neighbor | Insertion-style left drift |
| **Patrolling** | Maintains a direction; swaps on contact, reverses when "happy" | Cocktail shaker sort |
| **Perfectionist** | Scans the entire right tail to find the minimum and swaps into place | Selection sort |

## Parameters

- **Global Density** -- number of agents in the array (10--150).
- **Processing Delay** -- milliseconds between simulation cycles.
- **Population Mix** -- relative proportion of each agent type (weights 0--100).

## Observations

- A pure **Blind Date** population converges fastest because it breaks locality,
  reducing global entropy in large jumps.
- **Perfectionist** agents are expensive per wakeup (linear scan) but place
  elements exactly once they fire.
- Mixed populations often outperform homogeneous ones because different
  strategies complement each other: local refiners (Standard, Patrolling) clean
  up after long-range movers (Blind Date, Perfectionist).
