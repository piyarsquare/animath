# Future Apps — Baseline Reference

A scoping reference for the next wave of animath apps. This is **background to
draw on later**, not a build plan or a commitment to order. Each section follows
the same template:

- **Concept** — what the app is and why it fits animath.
- **Canonical model(s) / math** — the standard formulations, with equations.
- **Key phenomena** — the "aha" a learner should reach.
- **Prior art** — references and existing visualizations to learn from.
- **animath mapping** — how it lands on the framework: rendering approach,
  [archetype](redesign/DESIGN-SPEC.md) panels, view windows, engine reuse,
  interaction.
- **Open questions** — what to decide before building.

> Conventions live in [`CLAUDE.md`](../CLAUDE.md) and
> [`docs/BUILDING_AN_APP.md`](BUILDING_AN_APP.md). The closed 11-archetype
> vocabulary (Define `subject`/`domain` · Render `view`/`color`/`marks`/`motion`
> · Drive `drive`/`playback` · Analyze `lab`/`readout` · System `quality`) is in
> `src/chrome/workspace/archetypes.ts`. The append-only backlog of smaller ideas
> is [`IDEAS.md`](../IDEAS.md); this doc is for the bigger new directions.

## Candidate apps at a glance

| # | App | Family | Rendering | Status |
|---|-----|--------|-----------|--------|
| 1 | **Cellular Automata** | discrete dynamical systems | GPU ping-pong texture (CPU fallback) | new |
| 2 | **Firefly Synchronization** | coupled oscillators / emergence | Three.js points or 2D canvas | new |
| 3 | **Murmurations (Flocking)** | self-propelled agents / emergence | Three.js instanced + spatial hash | new |
| 4 | **Ant Colonies** | stigmergy / emergence | GPU field + agent layer | new |
| 5 | **Glassy Networks** | disordered systems / optimization | DOM/graph or Three.js + MC | new |
| 6 | **Quantum Tree** | (TBD) | TBD | **port** — repo pending |
| 7 | **GAS — "gene advocate system"** | (TBD) | TBD | **port/confirm** — term + repo pending |

> [!NOTE]
> **Two shared engine investments** show up repeatedly below and are worth
> building once:
> 1. A **stateful GPU grid** (ping-pong framebuffer: read state texture →
>    compute next → swap). `FractalsGPU` is *stateless* per frame; CA, ant
>    pheromone fields, and reaction-diffusion all need this. Build it for CA, reuse
>    for ants.
> 2. An **agent layer + order-parameter readout** (N moving agents with a local
>    interaction rule + a live "how synchronized/ordered are we" timeseries).
>    Fireflies, boids, and ants all share it; `lib/particles` and
>    `chrome/readouts.tsx` already cover most of it.

---

## 1. Cellular Automata

### Concept
A grid of cells, each in a discrete state, all updated in lockstep by a rule
that reads only a cell's local neighborhood. Tiny local rules produce gliders,
oscillators, chaos, and even universal computation — the cleanest possible
"complexity from simplicity" exhibit, and a natural fit for animath's
math-as-spectacle remit.

### Canonical models / math
- **Elementary (1D) CA** — Wolfram's rules 0–255. A cell's next state is a
  function of its three-cell neighborhood `(left, self, right)`; the 8 possible
  patterns map to 8 output bits = the rule number. Rendered as a **space-time
  diagram** (rows = generations). Rule 30 (chaotic/random), Rule 90 (Sierpiński),
  Rule 110 (Turing-complete).
- **Life-like (2D outer-totalistic)** — Conway's Game of Life is **B3/S23**:
  a dead cell with exactly 3 live neighbors is born; a live cell survives with 2
  or 3. The whole Life-like family is captured by **B/S notation** (e.g.
  HighLife `B36/S23`, Day&Night `B3678/S34678`).
  `next(s, n) = born(n) if s==0 else survives(n)`.
- **Multi-state / generations** — e.g. Brian's Brain (ready/firing/refractory),
  cyclic CA. Adds "age" coloring naturally.
- **Continuous CA** — **Lenia** (Bert Chan): continuous state and time, smooth
  kernels and growth functions, producing lifelike "creatures" (orbium).
  **SmoothLife** is the continuous Life. Reaction–diffusion (**Gray–Scott**) is
  a PDE cousin that lives on the same GPU machinery and yields Turing patterns.
- **Wolfram classes** — I uniform, II periodic, III chaotic, IV complex
  ("edge of chaos"). A good organizing idea for the explainer.

### Key phenomena
Gliders/spaceships, guns, still lifes and oscillators; self-organization; the
sensitivity that separates Class III (Rule 30) from Class IV (Rule 110, Life);
universality (Life and Rule 110 are Turing-complete); how a single rule bit flip
changes everything.

### Prior art
Golly (the reference Life simulator), Wolfram's *A New Kind of Science*,
LifeWiki/ConwayLife, Lenia (github.com/Chakazul/Lenia), countless WebGL Life
shaders.

### animath mapping
- **Rendering**: closest sibling is **FractalsGPU** (shader quad + orthographic
  camera + `useViewportGestures`). The new piece is a **ping-pong FBO**: the cell
  state lives in a texture, a fragment shader computes the next generation, and we
  swap read/write targets each step. A small-grid **CPU typed-array** path is a
  fine first cut (and simpler for painting).
- **Archetypes**:
  - `subject` — rule selection: Wolfram rule number (1D), B/S notation (Life-like),
    or a Lenia kernel preset.
  - `domain` — grid size, boundary (torus vs fixed/dead edges), initial condition
    (random density, single cell, loaded pattern).
  - `playback` — play/pause, single-step, generations/sec, and **reset**.
  - `color` — state→palette, optional **age/heat** coloring (how long alive).
  - `marks`/`view` — the cell grid itself; for 1D, the scrolling space-time
    diagram.
  - `readout` — live population, density, change rate (activity), generation
    count; for 1D, an entropy estimate per Wolfram class.
  - `quality` — grid resolution / max generations.
- **View windows**: the grid (2D); for elementary CA, a space-time window. A small
  **rule preview** (the 8-pattern→bit truth table as clickable cells) is a lovely
  `subject` panel.
- **Interaction**: **paint cells** with the pointer to author initial conditions;
  pan/zoom the grid; a **pattern library** (glider, Gosper gun, R-pentomino) as
  presets.
- **Engine reuse**: FractalsGPU's quad/camera/gesture scaffold; new ping-pong
  helper (then reused by Ant Colonies and any reaction-diffusion app).

### Open questions
- GPU statefulness is the only genuinely new infrastructure — start CPU (Life) to
  ship something, then add the GPU path for big grids / Lenia?
- One app spanning 1D + 2D + continuous, or separate apps? (Lean: one app with a
  `subject` mode switch, since the chrome is identical.)

---

## 2. Firefly Synchronization

### Concept
Independent oscillators that nudge each other can spontaneously fall into
lockstep — the textbook example being Southeast-Asian fireflies flashing in
unison. The exhibit: start with random phases, turn up coupling, watch order
emerge, and *measure* it.

### Canonical models / math
- **Kuramoto model** — `N` phase oscillators with natural frequencies `ωᵢ`:

  `dθᵢ/dt = ωᵢ + (K/N) Σⱼ sin(θⱼ − θᵢ)`

  The **order parameter** `r·e^{iψ} = (1/N) Σⱼ e^{iθⱼ}` measures synchrony:
  `r ≈ 0` incoherent, `r → 1` synchronized. There is a **critical coupling**
  `K_c` (for a Lorentzian frequency spread, `K_c = 2/(π·g(0))`) above which a
  macroscopic fraction locks — a continuous phase transition.
- **Pulse-coupled (Mirollo–Strogatz)** — the actual firefly model:
  integrate-and-fire oscillators charge toward a threshold; when one fires it
  bumps every other's phase up by ε. Mirollo & Strogatz proved all-to-all
  pulse-coupled oscillators synchronize for almost all initial conditions.
- **Spatial / topological variants** — couple only to neighbors within a radius
  on a 2D field → traveling phase **waves** and **chimera states** (coexisting
  synchronized and desynchronized regions).

### Key phenomena
Spontaneous synchronization; the order parameter `r` climbing through `K_c`;
sensitivity to frequency spread (heterogeneity fights sync); chimera states;
phase waves across space.

### Prior art
Strogatz, *Sync*; Nicky Case's "Fireflies" explorable; Pikovsky/Rosenblum/Kurths
*Synchronization*; many Kuramoto demos.

### animath mapping
- **Rendering**: a field of fireflies as Three.js **points** (brightness spikes
  near firing phase) or a 2D canvas. The classic companion is the **phase circle**
  (oscillators as dots on the unit circle, with the order-parameter vector drawn
  from center) — a second view window.
- **Archetypes**:
  - `subject` — model (Kuramoto vs pulse-coupled).
  - `domain` — `N`, frequency-spread distribution, coupling topology (all-to-all /
    nearest-k / spatial radius), spatial layout.
  - `drive` — coupling strength `K`, noise.
  - `playback` — play/pause/speed/reset.
  - `color` — phase→hue, or flash brightness.
  - `motion` — the flashing/charging.
  - `readout` — **order parameter `r` over time** (Sparkline = the "sync meter"),
    fraction locked.
- **View windows**: the firefly field + the **phase circle** + an `r(t)`
  timeseries (the two-linked-window idiom from **Correspondence**).
- **Interaction**: drag `K` and watch `r` respond live; add/remove oscillators;
  perturb a cluster and watch it re-lock.
- **Engine reuse**: `lib/particles` points + `useGestureRotation` for the field;
  `chrome/readouts.tsx` Sparkline for `r(t)`.

### Open questions
- Phase circle as a separate ViewDef vs an inset? (Lean: separate window,
  collapsible.)
- All-to-all is O(N²) per step — cap `N` or use a mean-field shortcut (`r,ψ` make
  the Kuramoto update O(N)).

---

## 3. Murmurations (Flocking)

### Concept
Thousands of starlings wheel as one with no leader. Each bird follows a few local
rules; the flock-scale shapes — swirls, density waves, sudden turns — are
emergent. A visually spectacular companion to fireflies (alignment in *space*
rather than *phase*).

### Canonical models / math
- **Reynolds boids (1986)** — three steering rules within a perception radius:
  **separation** (avoid crowding), **alignment** (match neighbors' heading),
  **cohesion** (steer toward local center of mass). Velocity is the weighted sum,
  speed-clamped. Optional: goal seeking, predator avoidance, wind/bounds.
- **Vicsek model (1995)** — minimal self-propelled particles at constant speed:
  `θᵢ(t+1) = ⟨θ⟩_{|r|<R} + noise`. Exhibits a **non-equilibrium order–disorder
  phase transition**: the polarization order parameter
  `φ = |(1/N) Σ vᵢ| / v` jumps as noise/density crosses a threshold.
- **Real-flock findings** (Cavagna/Ballerini, STARFLAG) — interaction is
  **topological** (≈7 nearest neighbors) not metric; correlations are
  **scale-free** (the flock is "critical").

### Key phenomena
Flocking from local rules; the Vicsek order–disorder transition; metric vs
topological interaction; collective turns and density waves; predator-driven
splitting/flash expansion.

### Prior art
Reynolds boids; Couzin et al. collective-motion models; Vicsek et al.; the
STARFLAG project; many WebGL boids demos.

### animath mapping
- **Rendering**: Three.js **instanced** oriented marks (cones/triangles) in 3D
  (or 2D). Neighbor search is the perf crux → **spatial hash grid**; CPU is fine
  to a few thousand, GPU-texture neighbor search later.
- **Archetypes**:
  - `subject` — boids vs Vicsek.
  - `domain` — `N`, perception radius, speed, world size + topology (torus/bounded).
  - `drive` — the three weights (separation/alignment/cohesion), noise, predator.
  - `playback` — play/speed/reset.
  - `color` — by heading, speed, or local order.
  - `marks`/`motion` — oriented bodies in flight.
  - `readout` — **polarization `φ`**, mean nearest-neighbor distance, correlation
    length (StatGrid + Sparkline).
  - `quality` — agent count.
- **View windows**: the flock (3D, camera-orbit gestures) + an order-parameter
  timeseries.
- **Interaction**: orbit/zoom the camera (particle-viewer gesture conventions);
  **tap to drop a predator**; drag weights to morph behavior.
- **Engine reuse**: Three.js scene + `useGestureRotation` from `lib/particles`;
  `chrome/readouts.tsx`. Shares the **agent + order-parameter** pattern with
  fireflies.

### Open questions
- 2D (cleaner pedagogy, the classic murmuration silhouette) vs 3D (truer, but
  camera adds friction)? Lean 3D with a strong default camera, since the engine is
  built for it.
- Spatial-hash now vs naive O(N²) first.

---

## 4. Ant Colonies

### Concept
Ants find near-shortest paths with no map and no leader, by depositing and
following **pheromone** — *stigmergy*, where the environment carries the memory.
A different mechanism from fireflies/boids (which couple agent-to-agent): here
agents couple **through a shared field**, which is why the user flagged it as "a
different order."

### Canonical models / math
- **Agent-based foraging** — ants random-walk on a grid, deposit a "to-home"
  pheromone while searching and a "to-food" pheromone after finding food, and bias
  their steps up the relevant gradient. Two scalar **fields** evolve by
  **deposit + diffuse + evaporate** — i.e. a CA-like field update — and trails
  self-reinforce. Emergent shortest-path trails appear without any global plan.
- **Ant Colony Optimization (ACO, Dorigo)** — on a graph (e.g. TSP), edge choice
  probability

  `p_ij ∝ τ_ij^α · η_ij^β`  (pheromone `τ`, heuristic `η = 1/d`),

  with update `τ_ij ← (1−ρ)·τ_ij + Σ Δτ_ij`. Converges to short tours; the
  exploration/exploitation knobs are `α, β, ρ`.
- **Double-bridge experiment** (Deneubourg) — the canonical demo that the colony
  selects the shorter of two branches.

### Key phenomena
Emergent trails; shortest-path selection (double bridge); evaporation as
forgetting (balancing exploration vs exploitation); robustness — break a trail and
the colony re-routes.

### Prior art
Dorigo, *Ant Colony Optimization*; Deneubourg's bridge experiments; NetLogo
"Ants"; Sayama's *Intro to the Modeling and Analysis of Complex Systems*.

### animath mapping
- **Rendering**: a **pheromone field** as a GPU texture (the **same ping-pong
  machinery as Cellular Automata** — diffusion + evaporation is a CA step) plus an
  **agent layer** of ant points on top. So CA + boids together de-risk this app.
- **Archetypes**:
  - `subject` — foraging-on-grid vs ACO-on-graph.
  - `domain` — world/grid, nest + food placement, obstacles, ant count.
  - `drive` — evaporation `ρ`, deposit amount, sensing angle/distance, `α/β`.
  - `playback` — play/speed/reset.
  - `color` — pheromone heatmap (to-home vs to-food as two channels), ants.
  - `marks`/`motion` — ants moving; the glowing field.
  - `readout` — food returned over time, trail length, convergence (Sparkline).
- **View windows**: the world (field + ants) + a metrics timeseries; for ACO, a
  graph/TSP window.
- **Interaction**: **tap to place** food, nest, or obstacles; drag evaporation and
  watch trails sharpen or fade.
- **Engine reuse**: the CA ping-pong field + the boids agent layer + readouts. A
  richer spatial cousin of the existing **AgenticSorting** (concurrent agents).

### Open questions
- Grid-field sim (visually richer, shares CA engine) vs ACO-on-graph (cleaner
  optimization story)? Lean: grid sim first; ACO graph as a `subject` mode later.
- Build **after** CA and boids so the shared engine pieces already exist.

---

## 5. Glassy Networks

### Concept
A network of variables with **random, conflicting (frustrated)** interactions has
a **rugged energy landscape** full of metastable valleys — so it relaxes slowly
and gets *stuck*: the physics of glasses, and the same structure behind hard
combinatorial optimization. The exhibit: cool the system and watch frustration,
metastability, and the gap between fast (stuck) and slow (ground-state) cooling.

### Canonical models / math
- **Ising / spin glass** — spins `sᵢ ∈ {±1}` with energy

  `H = − Σ_{⟨i,j⟩} J_ij sᵢ sⱼ  (− h Σᵢ sᵢ)`,

  where the couplings `J_ij` are **quenched random** (±J or Gaussian).
  **Edwards–Anderson** = on a lattice; **Sherrington–Kirkpatrick** = fully
  connected (mean-field).
- **Frustration** — a loop (e.g. a triangle) with an odd number of
  antiferromagnetic bonds *cannot* satisfy all bonds at once; frustration is the
  source of the rugged landscape and ground-state degeneracy.
- **Dynamics** — **Glauber/Metropolis Monte Carlo** at temperature `T`;
  **simulated annealing** lowers `T` on a schedule to seek the ground state.
- **Order parameters** — energy `H`, magnetization `m`, EA order parameter and the
  **overlap distribution `P(q)`** between replicas (the fingerprint of replica
  symmetry breaking, Parisi 2021 Nobel).
- **Why it matters beyond physics** — spin glass ≡ Ising ≡ QUBO ≡ Max-Cut;
  **Hopfield networks** (associative memory) and **Boltzmann machines** are the
  same energy model; annealing is a general optimization metaphor.

### Key phenomena
Frustration (the unsatisfiable triangle); degenerate ground states; **hysteresis**
and **aging** (slow relaxation); landscape ruggedness; **slow cooling finds the
ground state, fast cooling gets trapped** — glassiness made visible.

### Prior art
Parisi (Nobel 2021); Mézard–Parisi–Virasoro, *Spin Glass Theory and Beyond*;
Hopfield (1982); Kirkpatrick et al. on simulated annealing; Newman & Barkema for
the Monte Carlo.

### animath mapping
- **Rendering**: a **graph/lattice** of spins — nodes colored by spin, **edges
  colored by `J` sign and by satisfied/frustrated** — rendered as DOM/SVG (the
  **StableMatching lattice** is the precedent) or Three.js for 3D lattices, with
  Monte Carlo running live. This app leans hard on the **Analyze tier**.
- **Archetypes**:
  - `subject` — model (2D lattice / SK / Hopfield) and disorder distribution.
  - `domain` — `N`, topology, frustration density, external field.
  - `drive` — temperature `T`, field `h`, annealing schedule.
  - `playback` — MC steps/sec, run/step/reset, "anneal" action.
  - `color` — spin up/down; bond satisfied vs frustrated (the pedagogical
    centerpiece).
  - `marks`/`motion` — flipping spins.
  - `lab`/`readout` — energy and magnetization over time, specific heat, the
    **`P(q)` overlap histogram** (MiniHisto), ground-state-gap meter.
- **View windows**: the spin network + an energy-vs-time/temperature plot +
  (optionally) an overlap-distribution histogram.
- **Interaction**: flip a spin by tapping; drag `T` (watch order melt/freeze);
  run an anneal and compare fast vs slow schedules side by side.
- **Engine reuse**: StableMatching's DOM-graph approach; `chrome/readouts.tsx`
  (MiniHisto/Sparkline/StatGrid) is tailor-made for the analysis tier.

### Open questions
- Confirm "glassy networks" means **spin glasses / disordered networks** (the
  assumption here) vs glassy dynamics in another sense (structural glass, jamming,
  glassy *neural* nets). Scope hinges on this.
- How far into replica/`P(q)` territory to go before it stops teaching? Lean: lead
  with frustration + annealing; keep `P(q)` as an optional Analyze window.

---

## 6. Quantum Tree (PORT)

> [!IMPORTANT]
> **Port — source repo pending.** This currently lives in a **separate GitHub
> repository** the user will point me to. My GitHub scope is restricted to
> `piyarsquare/animath`, so to port it the repo needs to be **added to the
> session** (`list_repos` → `add_repo`) or shared another way.

### What I need to write the baseline
- Repo URL + access, and a one-line description (best guess: a quantum-circuit /
  quantum-state **tree** or a measurement/decision tree visualization — to
  confirm).
- Current stack (React/TS? plain JS? Python? WebGL/SVG?) and what it renders.
- The interaction model and any math (state vectors, amplitudes, Born-rule
  branching?).

### Likely animath mapping (to refine once visible)
If it's already TS/React + WebGL/SVG, the port is mostly **re-chroming**: wrap the
existing scene as a `ViewDef`, move its controls into archetype `SectionDef`
panels, register it in `apps.ts` / `index.tsx` / `catalog.ts`, and add an
`EXPLAINER.md`. If it's Python/other, it's a rewrite against the framework. The
self-contained-folder rule (`src/animations/QuantumTree/`) keeps it conflict-free.

---

## 7. GAS — "gene advocate system" (PORT / CONFIRM)

> [!IMPORTANT]
> **Term + source to confirm.** "Gene advocate system / GAS" needs disambiguation
> before baseline work. Candidate readings to confirm with the user:
> - a **gene-regulatory-network** simulator (genes activating/repressing each
>   other; Boolean or ODE networks),
> - a **genetic-algorithm sandbox** (evolution/selection over a population),
> - or a specific **named existing project** (like the quantum tree) in another
>   repo.

### What I need
The exact name/meaning, whether it's a port (repo + access) or a new build, and a
one-line description of what it shows. Once confirmed, it gets a full section like
the others — and if it's a gene-regulatory-network it pairs naturally with the
emergence family above.

---

## Suggested sequencing (non-binding)

A dependency-aware order, *if* we build the new ones:

1. **Cellular Automata** — ships the stateful GPU-grid primitive (or a CPU Life
   first); high payoff, self-contained.
2. **Firefly Synchronization** — establishes the agent + order-parameter pattern;
   small and striking.
3. **Murmurations** — reuses the agent/readout pattern in 3D.
4. **Ant Colonies** — reuses CA's field engine **and** the agent layer, so it's
   cheapest once 1 & 3 exist.
5. **Glassy Networks** — independent track; leans on the Analyze tier and the
   existing DOM-graph approach.
6–7. **Quantum Tree** and **GAS** — port effort gated on seeing the source repos.
