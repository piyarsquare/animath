---
kind: handoff
session: 2026-06-10-S01
date: 2026-06-10
title: Future-app scoping — emergence, CA, and two ports
branch: claude/future-apps-scoping
slug: future-apps-scoping
status: completed
build: passing
followup: LOW
pr: 210
app: general
---

# Future-app scoping — emergence, CA, and two ports

> [!NOTE]
> **Design/docs session — no `src/` code changed.** Deliverable is one new
> reference doc (`docs/FUTURE_APPS.md`) + an `IDEAS.md` pointer. `npm run build`
> passes (`tsc && vite build`, ✓ built in 5.88s at `93404d1`).

## Summary

Scoped the next wave of animath apps into a single baseline reference,
`docs/FUTURE_APPS.md` — concept, canonical model/math, prior art, and an animath
framework mapping per app. Five areas were researched from knowledge (cellular
automata, firefly synchronization, murmurations/flocking, ant colonies, glassy
networks); **two ports were decoded from source the author shared in-session**
(the private `quantum-tree` app → renamed **"Trees and Nets"**, and a private
Python **GAS** = Gene Advocate System). Landed on **PR #210**. The next build is
**Trees and Nets**, leading with a whole-associahedron view.

## What changed

- **New `docs/FUTURE_APPS.md`** — at-a-glance table + a templated section per app:
  - **Cellular Automata** — Wolfram 1D / Life-like B-S / Lenia; new infra = a
    stateful **GPU ping-pong grid** (FractalsGPU is stateless).
  - **Firefly Synchronization** — Kuramoto + pulse-coupled (Mirollo–Strogatz);
    order parameter `r` as the sync meter; phase-circle + `r(t)` windows.
  - **Murmurations** — Reynolds boids + Vicsek order–disorder transition; Three.js
    instanced agents + spatial hash.
  - **Ant Colonies** — stigmergy / pheromone fields + ACO; **reuses CA's field
    engine + the boids agent layer** (build after those).
  - **Glassy Networks** — spin glass / Ising / annealing, extended with the
    **QUBO / Quadratic Knapsack** optimization face.
  - **Trees and Nets** (port of `quantum-tree`) — classical scope only.
  - **GAS** (port) — replicator dynamics + evolvable advocate/selector modifier.
- **Unifying theme** — GAS (§7) and Glassy Networks (§5) merged under
  **"rugged-landscape exploration"**: Glassy supplies the landscape (Ising→QUBO→
  QKP) + readouts, GAS is a candidate explorer to race vs simulated annealing. This
  was the author's framing ("does GAS ease exploration of glassy landscapes").
- **Trees and Nets scope locked** — port the **classical** machinery only:
  circular orders, energy functions, **circular-decomposable (Kalmanson) metrics**,
  trees, **NeighborNet + neighbor-joining**. The **quantum layer is excluded from
  the build**; it survives only as the recorded open research question (use tree
  geometry + circular path sums + quantum interference/cancellation to search many
  topologies at once). Renamed away from "Quantum Tree" → **"Trees and Nets"**
  (`src/animations/TreesAndNets/`).
- **`IDEAS.md`** — appended a "New app directions" pointer to the new doc.

## Key files

| File | Role |
|---|---|
| [`docs/FUTURE_APPS.md`](https://github.com/piyarsquare/animath/blob/93404d1/docs/FUTURE_APPS.md) | The deliverable — baseline reference for all 7 candidate apps |
| [`docs/FUTURE_APPS.md` §5](https://github.com/piyarsquare/animath/blob/93404d1/docs/FUTURE_APPS.md) | Glassy Networks + QUBO/QKP + the shared landscape-exploration playground |
| [`docs/FUTURE_APPS.md` §6](https://github.com/piyarsquare/animath/blob/93404d1/docs/FUTURE_APPS.md) | Trees and Nets — locked classical scope, math, port strategy, associahedron goal |
| [`docs/FUTURE_APPS.md` §7](https://github.com/piyarsquare/animath/blob/93404d1/docs/FUTURE_APPS.md) | GAS — model from the Python source, animath mapping, clean-rewrite port |
| [`IDEAS.md`](https://github.com/piyarsquare/animath/blob/93404d1/IDEAS.md) | Pointer to the new doc (append-only backlog) |

## Open / not done

- **PR #210 awaiting merge** (`future-apps-scoping` → `main`). Build green.
- **Next build: Trees and Nets** — to start immediately on a **new branch** while
  the uploaded source is still available this session. Lead design goal: represent
  the **entire associahedron** (vertices = trees/triangulations, edges = flips), not
  just the per-point fibers — `K₅` (14 vertices) as a Three.js polytope; higher ones
  via the projection/4D machinery; the evidence point sits *inside* the polytope and
  the fibers become a local slice.
- **Licensing/attribution** for both private source repos before any code lands.
- Build-order recommendation: design **Glassy Networks + GAS together** (shared
  landscape UI); CA ships the GPU-grid primitive that Ant Colonies later reuses.

## Context

> [!CAUTION]
> **The two ports' source is NOT in the repo.** It lives only in this session's
> `/tmp` (quantum-tree zip at `/tmp/qt-unzip/quantum-tree-main/`; GAS `.py` files in
> the uploads dir). It is session-scoped and will be lost when the container is
> reclaimed. The next agent building Trees and Nets should work from it *this
> session* or have the author re-share it. Nothing from those private repos was
> committed into animath.

- **Trees and Nets stack today**: dependency-free vanilla JS drawing many `<svg>`
  views (`map.js` ~216 KB, plus `four.html`/`five.html`) + a little canvas 2D, with
  a LaTeX working paper (BHV tree space, Devadoss associahedra, NeighborNet). The
  recommended port is a **rewrite** (math → TS modules, views → React/SVG `ViewDef`s
  + archetype panels), not a wrap of the ID-coupled global JS.
- **GAS model** is ~5 small NumPy functions (replicator + advocate selection +
  ladder mutation in a periodically switching environment) → a clean TS rewrite,
  DOM/time-series app, Analyze-tier; no WebGL.
- The session also (earlier) merged PR #206 making the session skills
  agent-invokable; this branch was forked from `main` after that merge.

## Self-reflection

1. **What would you do with another session?** Start the **Trees and Nets** build
   (the stated plan): port the classical math (quartet/four-point, splits,
   circular-decomposable/Kalmanson, NeighborNet, NJ, circular path-sum energies) to
   TS modules, then prototype the **whole-associahedron** view (`K₅` as a Three.js
   polytope) with the evidence point living inside it.
2. **What would you change about what you produced?** The doc is long for a
   "baseline"; the five researched apps could each be a touch tighter. The two ports
   earn their length because they're decoded from real source.
3. **What were you not asked that you think is important?** Whether any of these
   should be split into their own per-topic design docs now (I consolidated into one
   file, splittable later) and the **licensing** of the two private source repos
   before porting — flagged but unresolved.
4. **What did we both overlook?** Nothing blocking. One latent risk: the uploaded
   port source is session-scoped (`/tmp`), so if the build doesn't start this
   session the info must be re-shared (called out in Context).
5. **What did you find difficult?** Reverse-engineering GAS from terse, partly
   commented-out NumPy (advocate rule, the einsum replicator step, the selector
   axis in `04`) precisely enough to write a faithful model — and confirming the
   author's glassy-landscape/QKP connection rather than guessing it.
6. **What would have made this task easier?** A one-line README in each shared
   source bundle stating intent; and clarity up front that GAS, glassy networks, and
   QKP were one theme (it emerged mid-session).
7. **Follow-up value:** LOW — the reference is complete, internally consistent, and
   build-green; remaining items are the next build itself (a separate task) and the
   licensing call, both already flagged.
