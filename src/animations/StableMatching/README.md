# Stable Matching

A clean rebuild of the stable-marriage lab around a **pure engine** and an honest
metric. Two groups rank each other; the **Consensus** dials set how much each group
shares a **common preference** (a latent desirability signal blended with private
taste).

- **Engine** (`model.ts` + `galeShapley.ts`) — a reproducible, seeded preference
  generator and one deferred-acceptance algorithm with two modes: classical
  **one-sided** Gale–Shapley (proposer-optimal; the theorem holds) and a **market**
  variant (bias-weighted mixed proposing; stability holds, optimality is emergent).
  Analysis: blocking-pair check, rank stats, and `extremal()` — the two extremal
  stable matchings and the **gap** between them.
- **Visualizer** — step/play through proposals; the common preference is visible as a
  desirability bar; the headline metric is the proposer-advantage **gap**, which
  collapses to zero under full consensus.
- **Lab** — sweeps consensus A × B and heat-maps the gap (or per-side average rank),
  **averaging many trials per cell** so the surface is honest.

Built framework-native (AppShell `ShellSettings`/`ShellActions` + `ControlPanel`
primitives, `usePersistentState`).
