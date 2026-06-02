# Stable Marriage

The **Gale–Shapley** algorithm and the idea of a **stable matching**.

## The problem

Two groups (here "men" and "women") each rank everyone in the other group. A
**matching** pairs them up. A pair is a **blocking pair** if two people who
are *not* matched to each other would both rather be together than stay with
their current partners — an unstable situation, since they'd defect. A
matching with **no blocking pairs** is **stable**.

## Gale–Shapley

Repeat until everyone is matched:

1. An unmatched proposer proposes to their most-preferred partner among those
   they haven't asked yet.
2. The receiver **tentatively** accepts if single, or if they prefer the new
   proposer to their current tentative partner (dropping the old one).
3. Rejected proposers move on to their next choice.

**Theorem (Gale & Shapley, 1962):** this always terminates, and the result is
always **stable**. The *Stability* tab checks this by counting blocking
pairs — for a completed run, it finds zero.

## Proposer advantage

The side that *proposes* does systematically better. Gale–Shapley produces
the **proposer-optimal** stable matching: every proposer gets the best
partner they could have in *any* stable matching, and every receiver gets
their worst. The **Asker vs Asked** averages make this visible.

## The knobs

- **Consensus** — how much everyone agrees on who is desirable. At 0%,
  preferences are random noise; at 100%, everyone shares one ranking, so the
  competition for the same top choices is fiercest.
- **Proposer bias** — the share of proposals coming from the men's side.
  Slide it to watch the proposer advantage shift.
- The **Lab** sweeps consensus for *both* groups and heat-maps the average
  rank each side ends up with.
