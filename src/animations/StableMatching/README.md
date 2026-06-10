# Stable Matching

A stable-matching explorer built around a **pure engine** and the **solution
space**. Two groups rank each other; the **Consensus** dials set how much each group
shares a **common preference** (a latent desirability signal blended with private
taste).

## Engine

- **`model.ts`** — a reproducible, seeded common-preference generator (rank matrices
  precomputed).
- **`galeShapley.ts`** — deferred acceptance: classical one-sided GS (proposer-optimal,
  always stable) and `runRounds` (synchronous schedules A / B / alternate / random),
  plus blocking-pair and rank stats.
- **`rotations.ts`** — the solution-space engine. Enumerates *every* stable matching
  by rotation-elimination from the A-optimal matching (the lattice top), and derives
  the stable-pair **footprint**, the **count**, the named solutions
  (A/B-optimal, **egalitarian**, **median**, **min-regret**, **sex-equal**,
  **balanced**), and the **lattice** Hasse layout. Cross-checked against a brute-force
  n! enumeration in `scripts/test-rotations.ts` (1440 cases).
- **`resolver.ts`** — Roth–Vande Vate "random path to stability": repair any
  (possibly unstable) matching to a stable one by satisfying blocking pairs, recording
  each step for animation.

## Views

- **Visualizer** — step/play the rounds on the Lego matrix; per-side average + sorted
  outcome colorbars; the **stable-pair footprint**; **jump to** any named stable
  solution; **Stabilize** an unstable run (animated RVV repair).
- **Lattice** — the Hasse diagram of all stable matchings (A-optimal top → B-optimal
  bottom, edges = rotations, named solutions flagged); click a node to load it.
- **Lab** — sweeps consensus A × B and maps a surface (ranks, unstable %, blocking,
  **# stable matchings**, **repair cost**), averaging many trials per cell.

A key finding lives here: synchronous two-sided deferred acceptance is usually **not**
stable, and the lattice of stable matchings is largest in the disordered
(low-consensus) regime, **collapsing to a single point** at full consensus.

Built framework-native on the Workspace chrome (archetype panels — Algorithm ·
Instance · Display · Playback · Lab — plus the Matching matrix / Welfare surface /
Stable-matching lattice view windows, switched by the Run / Lab / Lattice layouts),
with `ControlPanel` primitives and `usePersistentState`.
