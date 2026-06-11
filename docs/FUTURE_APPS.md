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
| 5 | **Glassy Networks** | disordered systems / rugged optimization (Ising · QUBO · QKP) | DOM/graph or Three.js + MC | new |
| 6 | **Trees and Nets** (port of "quantum-tree") | phylogenetics / circular-order tree geometry (classical port; quantum stays an open question) | SVG + a little canvas 2D (vanilla JS today) | **port** — source in hand |
| 7 | **GAS** (Gene Advocate System) | evolutionary dynamics / landscape exploration | DOM + time-series (port from Python) | **port** — source in hand |
| 8 | **Fourier Analysis** | spectral analysis / harmonic decomposition | 2D canvas + Three.js (epicycles, spectra) | new |
| 9 | **Eigenvalues & Spectra** | linear operators / spectral geometry ("hear the drum") | Three.js modes + 2D spectrum/readouts | new |
| 10 | **Heat Kernel** | diffusion / `e^{−tL}` / scale-space | GPU/CPU field + manifold surface | new |
| 11 | **Clustering** | unsupervised learning / spectral clustering | 2D canvas + DOM (points, dendrogram) | new |

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

> [!NOTE]
> **The spectral throughline (apps 8–11).** Fourier analysis, eigenvalues, and
> the heat kernel are *one subject seen from three sides* — the spectral theory
> of a self-adjoint operator (the Laplacian above all). Fourier modes **are** the
> eigenfunctions of `−d²/dx²` on the circle; the heat kernel is
> `e^{−tL} = Σ e^{−tλₖ} φₖ φₖ` built from that same eigendata; and **spectral
> clustering** uses the lowest eigenvectors of a graph Laplacian, tying the
> clustering module straight back in. They're scoped as **separate apps** (each
> has its own "aha" and default view), but they should **share a `lib/spectral`
> kernel** — a small symmetric-eigensolver (Jacobi/QR for dense; Lanczos later)
> plus graph-Laplacian builders — built once for Eigenvalues and reused by Heat
> Kernel and Clustering. A shared **"spectrum strip"** readout (the sorted `λₖ`
> as a clickable bar row that drives the other views) would unify their chrome.

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

### Optimization face: QUBO / Quadratic Knapsack — and GAS as an explorer
The spin glass *is* an optimization problem. With `sᵢ = 2xᵢ − 1`, `xᵢ ∈ {0,1}`,
`H = −Σ J_ij sᵢ sⱼ` becomes a **QUBO** (`min xᵀQx`), and the **Quadratic Knapsack
Problem** (QKP) is the same quadratic 0/1 objective under a budget:

  `max Σᵢ pᵢ xᵢ + Σ_{i<j} q_ij xᵢ xⱼ   s.t.  Σᵢ wᵢ xᵢ ≤ C`.

All three (Ising, QUBO, QKP) share one **rugged/glassy landscape** of `2ⁿ` corners
riddled with local optima. That makes "Glassy Networks" the natural home for a
**landscape-exploration playground**: pit different explorers against the *same*
instance and watch how each escapes (or gets trapped in) local minima —
- **Simulated annealing** (temperature schedule, the classic),
- **Population / replicator dynamics**, including **GAS** (§7) — the user's open
  question is precisely *does the advocate/selector modifier ease exploration of a
  glassy landscape?* — i.e. is GAS a competitive population-based metaheuristic vs
  annealing on QKP/QUBO instances,
- (later) **quantum-flavored** views (transverse-field / QAOA), which also link
  back to the Quantum Tree's one-hot + cost-phase/mixer framing (§6).

This is the **"rugged-landscape exploration" theme** that unifies §5 and §7: §5
supplies the landscape (Ising/QUBO/QKP) and the readouts (energy, ground-state
gap), §7 supplies one candidate explorer (GAS). A shared **landscape view** — a
low-dimensional embedding or a 1-flip neighborhood graph colored by energy — and a
shared **"best energy vs steps"** race chart would serve both.

### Open questions
- **Confirmed**: "glassy networks" = **spin glasses / disordered networks** in the
  optimization sense (Ising · QUBO · QKP), not structural-glass/jamming.
- How far into replica/`P(q)` territory to go before it stops teaching? Lean: lead
  with frustration + annealing; keep `P(q)` as an optional Analyze window.
- Build order vs GAS: the shared landscape-exploration UI argues for designing §5
  and §7 together, even if shipped separately.

---

## 6. Trees and Nets (PORT of "quantum-tree")

> [!NOTE]
> **Source in hand** (private repo `piyarsquare/quantum-tree`, shared as a zip).
> The deployed app is `https://piyarsquare.github.io/quantum-tree/`. Baseline
> below is written from the actual source; refine against the code when building.

> [!IMPORTANT]
> **Port scope (decided).** Port the **classical geometry/combinatorics** only:
> **circular orders**, **energy functions**, **circular-decomposable metrics**,
> **trees**, and **NeighborNet + neighbor-joining**. The **quantum layer is out of
> scope for now** — it is *not* built; it survives only as the stated open research
> question below. The app is fundamentally about circular orderings, tree geometry,
> and split networks, so it ships under the name **"Trees and Nets"** (route/folder
> `src/animations/TreesAndNets/`), not "Quantum Tree".

### Concept
A "map" of how **distance data builds phylogenetic trees**, treating tree-building
as **evidence assembly** (energies/scores) before any probability is imposed. For a
set of leaves it shows the competing tree topologies, the **splits** and **circular
orderings** compatible with them, **neighbor-joining**, **NeighborNet** split
networks, and the geometry of tree-space. It is exactly animath's sweet spot: a
deep, honestly-framed mathematical object made interactive, with a companion
working paper supplying the rigor.

### Canonical model / math
- **Quartets & the four-point condition.** For leaves `a,b,c,d` the three unrooted
  quartets are `T0=ab|cd`, `T1=ac|bd`, `T2=ad|bc`; the pair-sums
  `A=d(a,b)+d(c,d)`, `B=d(a,c)+d(b,d)`, `C=d(a,d)+d(b,c)` rank them. The smallest
  wins; treat `H=diag(A,B,C)` as a diagonal Hamiltonian.
- **Evidence before probability.** Keep three layers separate:
  `distance data → evidence/scores/energies → optional probability law`. The
  primitive object is the **centered support map**, not a distribution; a
  **Gibbs posterior** `p(Tᵢ) ∝ exp(−β Eᵢ)` is one optional "closure" with β as a
  display control.
- **Evidence plane.** Center the pair-sums `(A,B,C) → (A−μ,B−μ,C−μ)`; they live in
  a 2D plane — origin = unresolved star, three rays = exact tree-metric directions.
  Radius = resolution, angle = which topology.
- **Assembly operators (the heart).** Quartets → splits
  (`support(ab|cde)=mean[support(ab|cd),ab|ce,ab|de]`), splits → circular orderings
  (mean of displayed splits), and two routes to tree scores:
  `S_quartet(T)` (direct) vs `S_ordering(T)` (log-mean-exp over compatible
  orderings). Agreement ⇒ tree-like coherence; disagreement ⇒ network-like
  conflict.
- **Circular orderings & compatibility.** A `Tᵢ × πⱼ` compatibility matrix links
  topologies to circular orders; the app draws **flip graphs / fibers**
  (associahedron-flavored — see the references: Billera–Holmes–Vogtmann,
  Devadoss, Semple–Steel) showing which orders are compatible with a tree and vice
  versa.
- **Circular-decomposable metrics, NeighborNet & NJ (core of the port).** A metric
  is **circular- (split-) decomposable** when `d = Σ_S w_S δ_S` is a nonnegative sum
  of split metrics `δ_S` whose splits are all **compatible with a single circular
  order** (the Kalmanson condition characterizes such metrics). **NeighborNet**
  estimates these **circular split weights** to produce a split network;
  **neighbor-joining** is the tree special case (a fully *compatible* set of splits
  = a tree). The **energy functions** rank candidate structures: quartet/split
  support, **circular path sums / tour-length** over an ordering, and Kalmanson
  violation as a non-tree-likeness score. These — circular orders, energies,
  circular-decomposable metrics, trees, NeighborNet + NJ — are exactly the port
  scope.

### Key phenomena
The four-point winner; the evidence plane geometry (star ↔ resolved); how the same
distance matrix casts coupled quartet "shadows"; quartets-to-trees **vs**
quartets-to-splits-to-orderings-to-trees disagreeing on network-like data;
neighbor-joining vs split networks; the tree↔circular-order fibers; and β sharpening
a fixed evidence signal into a posterior.

### Prior art
The bundled working paper (`paper/circular_order_tree_working_paper`) and its
references — Billera–Holmes–Vogtmann (BHV tree space), Devadoss (associahedra /
moduli), Semple–Steel and Levy–Pachter (NeighborNet), plus standard NJ and
split-network (SplitsTree) methods.

### animath mapping
- **Rendering**: this is a natural **CSS/DOM + SVG app** — the closest precedent is
  **StableMatching** (DOM/SVG graphs, controls in workspace panels). The current
  app is **dependency-free vanilla JS** drawing many `<svg>` views
  (`neighborJoiningSvg`, `splitChordSvg`, `splitGraphSvg`, `orderedMatrixSvg`,
  the `orderFiber*`/`treeFiber*`/glued-fiber views) plus a little canvas 2D.
- **Archetypes**:
  - `subject` — number of leaves (4–7), the distance matrix / presets.
  - `domain` — the distance inputs (editable matrix), leaf labels.
  - `drive` — β (Gibbs temperature) as a *display* closure; sign/scale conventions.
  - `view`/`marks` — the network/tree/fiber SVG renders.
  - `color` — topology colors (the `treeDefs` palette), support sign (coherent vs
    opposing evidence).
  - `lab`/`readout` — the difference engine (`δ_signal=E1−E0`, `δ_deviation=E2−E1`),
    the two tree-score routes side by side, split weights — perfect for the
    Analyze-tier readout primitives.
- **View windows** (animath's multi-window model fits unusually well — each SVG
  becomes its own draggable `ViewDef`): NJ tree · split-network chords/graph ·
  ordered distance matrix · the evidence plane · the tree/order fiber (flip-graph)
  views. Selecting a split/tree/order highlights the contributing quartets across
  windows (the **linked-views** idiom, like Correspondence).
- **No quantum layer** in the port (out of scope) — the Gibbs `β` posterior stays
  only as an optional *classical* display closure on the energies, clearly labeled
  as a display choice.

### Port strategy
Two routes, recommend the second:
1. **Wrap-as-is (fast, ugly):** mount each existing page in a `ViewDef` via a ref +
   `useEffect`, keeping the vanilla JS. Risky — `map.js` (~216 KB) is global,
   ID-coupled DOM code that fights React's lifecycle and animath's conventions
   (TS strict, local state, no global scripts).
2. **Port the math to TS modules + rebuild views in React/SVG (recommended):** the
   logic is well-specified (quartet support, four-point, NJ, splits, compatibility,
   assembly operators) and portable to `src/animations/QuantumTree/lib/*.ts`; then
   each SVG view becomes a React `ViewDef` and the sidebars become archetype
   `SectionDef` panels built on `ControlPanel` + `chrome/readouts.tsx`. More work,
   but idiomatic, testable, and it unlocks animath's linked multi-window UX. The
   self-contained `src/animations/QuantumTree/` folder keeps it parallel-branch safe.

### Open research question (carried, not built)
> Is there a way to use the **tree geometry and circular path sums** to solve for
> the **optimal tree topology** with a **quantum algorithm that searches many
> candidate structures simultaneously** — letting **quantum interference
> (cancellation)** resolve the tree structure (amplitude concentrating on the
> coherent topology while conflicting evidence cancels)?

This is the project's motivating "what if," kept as a documented question. The port
deliberately builds only the **classical** machinery above; that classical layer
(circular-order energies, path sums, split/quartet support, the consistency
constraints) is exactly the substrate such a quantum-search formulation would phase
and mix over, so building it well keeps the door open without committing to it.

### Other open questions
- **MVP scope**: just the **4-leaf** evidence plane + quartet toy (small,
  high-clarity) before the full 4–7 leaf map and the NeighborNet/NJ network views?
  Lean: ship 4-leaf first, then 5, then the map + split networks.
- **App name**: decided — **"Trees and Nets"** (`src/animations/TreesAndNets/`),
  since the quantum layer is excluded.
- **Associahedron view (next-build design goal)**: represent the **entire
  associahedron** — the polytope whose vertices are the trees/triangulations and
  whose edges are flips — not just the per-point **fibers**. Play to animath's
  strengths: the 3D associahedron `K₅` (14 vertices) is a natural **Three.js**
  polytope, and higher ones invite the **projection slider / 4D viewer** machinery.
  The current evidence point would live *inside* this polytope (a position in
  tree-space), making the fibers a local slice of the global object.
- **License/attribution**: the source repo is **private**; confirm it's fine to
  relicense the ported code under animath's terms and how to credit the working
  paper.

---

## 7. GAS — Gene Advocate System (PORT)

> [!NOTE]
> **Source in hand** — a set of Python/NumPy scripts (shared as uploads):
> `01_GAS_model.py` (single run + plots), `02_GAS_model_compute.py` (parameter
> sweep → `GA_table.tsv`), `03_GAS_model_study_results.py` (sweep analysis/plots),
> `04_GAS_model_selector_1.py` (adds an evolvable **selector** axis), and an early
> `hello_model_05.py`. Baseline below is from the code.

### Concept
An **evolutionary-dynamics sandbox** for a population of alleles indexed by two (or
three) traits — a **gene** value `g` that the environment selects on, and an
**advocate** value `a` that is an *evolvable modifier of how selection acts*. In a
**fluctuating environment**, the question is whether the advocate trait (and, in
`04`, a higher-level **selector** that decides whether advocacy is on) raises mean
fitness — an *evolution-of-evolvability / dominance-modifier / bet-hedging* story.
It connects outward to **rugged-landscape exploration** (§5): the population is a
search process on a fitness landscape.

### Canonical model / math (from the code)
- **State** `f[g,a]` (`04`: `f[g,a,s]`), allele frequencies, `Σ f = 1`, over
  `g ∈ {0..G−1}`, `a ∈ {0..A−1}` (`s ∈ {0..S−1}`).
- **Environment** — `E = G!` environments, each a **permutation** of a selection
  vector `select_vector = [1, r, r, …]` (`r = select_rate < 1`), so each environment
  makes a different gene value "best." The environment **switches every `period`
  steps**, cycling — a periodic non-stationary selection pressure.
- **Selection (the advocate rule).** For a mated pair `(g₁,a₁),(g₂,a₂)` in
  environment `e`, fitness is a *blend* of the two gene-selection values:

  `S = α·sel[e,g₁] + (1−α)·sel[e,g₂]`,  `α = ½(1 + ES·sign(a₁−a₂))`.

  `ES = 0` → α = ½ (plain codominant average). `ES = 1` → the **higher-advocate
  allele's gene value fully determines fitness** (advocacy = winner-take-all
  dominance). `04` makes the effect size itself a trait: `ES = ½(eff[s₁]+eff[s₂])`
  with `eff = linspace(0,1,S)`, so a **selector** gene evolves advocacy on/off.
  (Variants in the code: `weighted_advocate_selection`, `best_allele`,
  `worst_allele`.)
- **Replicator step** (one generation): `P = f ⊗ f` (random mating) → `P *= S[e]`
  (select) → `fitness = ΣP` → `P /= fitness` → marginalize to alleles → `f ← f·M`
  (mutation). `M` = uniform gene mutation (`mrate_G`) × **ladder** advocate
  mutation (`mrate_A^{|Δa|}`, normalized) — see `simple_mutation`.
- **Measure** — mean fitness over a window of the run; the **advocate benefit**
  `Δ = fitness(ES=1) − fitness(ES=0)` (and a scaled `Δ/(1−fitness₀)`); swept over
  `{G,A,mrate_G,mrate_A,select_rate,ES,period}`.

### Key phenomena
- In a **static** environment the best gene fixes and the advocate is ~neutral; the
  interesting regime is **fluctuating** environments.
- The advocate changes how fast the population **tracks** environment switches and
  how much **diversity** it hedges — a non-monotone **`Δ` vs (period, mutation,
  select_rate)** surface (the `03`/`04` sweeps), with a sweet spot where advocacy
  pays.
- In `04`, whether the **selector** for advocacy is itself **selected for** — a
  clean evolution-of-evolvability readout.

### Prior art / framing
Replicator dynamics & evolutionary game theory; modifier-gene / dominance-evolution
theory; bet-hedging and evolution of evolvability in fluctuating environments
(Levins, and the modifier-theory literature). The advocate ≈ an evolvable dominance
modifier; the QKP/glassy connection (§5) frames the population as a metaheuristic.

### animath mapping
- **Rendering**: a **CSS/DOM + time-series** app — closest precedents are the
  **Trinary Lab** (ensemble runs + plots) and **StableMatching** (DOM + Analyze
  tier). The replicator math is tiny NumPy (`einsum` over small `G,A,S`) → trivially
  portable to TS typed arrays; **no WebGL needed**.
- **Archetypes**:
  - `subject` — dimensions `G,A` (and `S`); selection rule
    (max-advocate / weighted / best / worst).
  - `domain` — initial allele distribution; environment set + **schedule**
    (`period`, switching).
  - `drive` — **effect size `ES`**, mutation rates (`mrate_G`, `mrate_A`,
    `mrate_S`), `select_rate`.
  - `playback` — run/step/speed/reset (and "run to window").
  - `color` — allele color (gene = hue, advocate = intensity); environment bands on
    the time axis.
  - `lab`/`readout` — **mean fitness over time**, **advocate benefit `Δ`**
    (ES=1 vs 0, side by side), allele trajectories, and the **parameter-sweep
    heatmap** (`Δ` vs `select_rate × period`) — the Analyze-tier centerpiece, built
    on `chrome/readouts.tsx` (Sparkline / MiniHisto / StatGrid).
  - `quality` — iterations.
- **View windows**: (1) allele-frequency trajectories (the `G×A` lines), (2) fitness
  / `Δfitness` over time with environment-switch markers, (3) the sweep heatmap,
  (4) optional **landscape/exploration** view shared with §5.
- **Interaction**: drag `ES` / mutation / `period` and watch trajectories + benefit
  respond live; run advocate-on vs advocate-off side by side.

### Port strategy
A clean rewrite, not a wrap: the model is ~5 small NumPy functions
(`max_advocate_selection`, `simple_mutation`, `run_simulation`) → port to
`src/animations/GAS/lib/model.ts` (replace `einsum`/`ogrid` with explicit small
loops; `G,A,S` are tiny), then build the views in React with `ControlPanel` +
readouts. The expensive **parameter sweep** (`02`) becomes either a precomputed
table shipped as JSON (like `03` reads `GA_table.tsv`) or an in-browser background
sweep with a progress readout. Self-contained `src/animations/GAS/` folder.

### Open questions
- **MVP scope**: the live single-run sandbox (advocate on/off in a fluctuating
  environment) first, then the sweep heatmap, then the `04` selector/evolvability
  layer?
- **The glassy bridge** (§5): build the shared landscape-exploration view now, or
  ship GAS as pure evolutionary dynamics first and add the QKP/annealing race
  later? Lean: ship the dynamics sandbox first; design the landscape view with §5.
- **Naming/explainer**: "advocate" is non-standard terminology — the explainer
  should connect it to dominance/modifier-gene language so the math is legible.

---

## 8. Fourier Analysis

### Concept
Any reasonable signal is a sum of pure waves. Fourier analysis is the change of
basis that makes that literal — and the single most reused idea in all of
applied math (audio, optics, PDEs, probability, number theory). The exhibit:
build a function out of rotating arrows, watch its spectrum, and *hear/see* what
adding, removing, or shifting frequencies does.

### Canonical models / math
- **Fourier series** (periodic `f` on `[0,2π)`): `f(x) = Σₙ cₙ e^{inx}`,
  `cₙ = (1/2π)∫ f(x) e^{−inx} dx`. Partial sums converge; **Gibbs phenomenon**
  at jumps is the canonical surprise.
- **Fourier transform** (the line): `f̂(ξ) = ∫ f(x) e^{−2πixξ} dx`. Key laws to
  *show*: linearity, **shift ↔ phase ramp**, **convolution ↔ multiplication**,
  and the **uncertainty** tradeoff (narrow in `x` ⇒ broad in `ξ`).
- **DFT/FFT** — the finite, computable version `Xₖ = Σₙ xₙ e^{−2πikn/N}`; the
  bridge from continuous theory to real signals and the basis for everything
  interactive here.
- **Spectral lens on the Laplacian** — `e^{inx}` are exactly the eigenfunctions
  of `−d²/dx²` on the circle (`λ = n²`). This is the sentence that links app 8
  to apps 9–10.

### Key phenomena
Square/sawtooth waves from sinusoids; **Gibbs overshoot**; the epicycle drawing
(sum of rotating arrows tracing any closed curve); shift→phase and
convolution→product seen live; time–frequency uncertainty; aliasing when `N` is
too small.

### Prior art
3Blue1Brown's "But what is a Fourier series / transform" (epicycles, the
winding-machine integral), Nicky Case-style explorables, the classic
Fourier-draws-a-path demos.

### animath mapping
- **Rendering**: a 2D canvas for the **epicycle** view (sum of rotating arrows
  tracing a target curve) and signal/spectrum plots; optionally a Three.js
  "stacked sinusoids" 3D view. No new heavy engine — `useViewportGestures` for
  pan/zoom of plots.
- **Archetypes**:
  - `subject` — what's being analyzed: a preset wave (square/sawtooth/pulse), a
    user-drawn curve (epicycles), or a sampled signal.
  - `domain` — period/interval, sample count `N`, frequency range.
  - `drive` — number of terms (drag to add/remove harmonics), phase/amplitude of
    a selected mode.
  - `playback` — animate the partial-sum build-up / the epicycle traversal.
  - `color` — amplitude/phase coloring of modes.
  - `readout` — the **spectrum** (magnitude/phase bars — `MiniHisto`), the
    reconstruction error vs term count (`Sparkline`).
- **View windows**: signal (time) · spectrum (frequency) · epicycle drawing —
  the **linked-views** idiom (Correspondence): selecting a spectral bar
  highlights its arrow and its contribution to the signal.
- **Interaction**: **draw a closed curve** → watch its epicycles; drag harmonics
  on/off; shift a frequency and see the phase ramp; toggle aliasing.
- **Engine reuse**: `chrome/readouts.tsx` for the spectrum strip (shared with
  apps 9–11); the **draw-on-the-view** interaction already exists in Plane
  Transform and Correspondence.

### Open questions
- One app spanning series + transform + DFT via a `subject` switch, or start with
  the epicycle/series exhibit (highest clarity, most shareable) and add the
  transform laws later? Lean: epicycles first.
- Audio (Web Audio API) for an actually-audible spectrum — compelling but a new
  capability; defer past MVP.

---

## 9. Eigenvalues & Spectra

### Concept
An eigenvector is the rare direction a linear map only **stretches**, by its
eigenvalue. That one idea is the spine of PCA, vibration, stability, PageRank,
quantum mechanics, and spectral graph theory. The exhibit: see eigenvectors as
the axes a transformation doesn't rotate, then meet the spectrum as the
**resonant modes** of a shape — "can you hear the shape of a drum?"

### Canonical models / math
- **Matrix eigenproblem** — `A v = λ v`. For symmetric `A`, real eigenvalues and
  orthogonal eigenvectors (the **spectral theorem** `A = Σ λₖ vₖ vₖᵀ`); the
  **ellipse image of the unit circle** has its axes along the eigenvectors
  (SVD/quadratic-form picture).
- **Operator spectra** — the Laplacian `−Δ φ = λ φ` with boundary conditions:
  eigenfunctions are the **standing-wave modes** of a drum/string/membrane,
  `λ` their squared frequencies. **Kac's question** "can you hear the shape of a
  drum?" (answer: no — isospectral non-congruent drums exist, Gordon–Webb–Wolpert)
  is the showpiece. **Weyl's law** ties the counting `N(λ)` to area.
- **Graph Laplacian** — `L = D − W` (or normalized `I − D^{−1/2}WD^{−1/2}`):
  `λ₀ = 0`, the **Fiedler value `λ₁`** measures connectivity, and its eigenvector
  gives the best bisection — the hinge to spectral clustering (app 11).
- **Power iteration / Rayleigh quotient** — how eigenvalues are actually found,
  and a lovely animation (a random vector swinging onto the dominant eigenvector).

### Key phenomena
Eigen-axes as the un-rotated directions; the spectral theorem as a sum of rank-1
projectors; drum modes and nodal lines; isospectrality ("can't hear the shape");
the Fiedler vector cutting a graph; power iteration converging.

### Prior art
3Blue1Brown "Eigenvectors and eigenvalues"; Chladni plates (real drum modes);
Kac (1966) and the Gordon–Webb–Wolpert isospectral drums; spectral graph theory
(Spielman, Chung).

### animath mapping
- **Rendering**: a **2×2 / 3×3 transformation** view (unit circle → ellipse, with
  eigen-axes drawn) in 2D canvas; **drum modes** as a Three.js surface
  (colored eigenfunction `φₖ` over a membrane, with nodal lines); a **spectrum
  strip** of sorted `λₖ`. Needs the new **`lib/spectral`** symmetric eigensolver
  (the shared investment).
- **Archetypes**:
  - `subject` — what has a spectrum: an editable matrix, a drum/domain shape, or a
    graph.
  - `domain` — matrix entries / domain geometry / graph topology.
  - `drive` — drag matrix entries (watch eigenvalues move), or **power-iteration**
    step.
  - `view`/`marks` — the ellipse + eigen-axes, or the modal surface; nodal lines.
  - `color` — eigenfunction sign/amplitude.
  - `playback` — animate a vibrating mode (`φₖ cos(√λₖ t)`), or power iteration.
  - `readout` — the **spectrum** (`MiniHisto`/bar strip, clickable to select a
    mode), Rayleigh quotient, Weyl-law count.
- **View windows**: transformation/modal view · the spectrum strip · (graph mode)
  the graph with the Fiedler split. Click a `λₖ` bar → that eigenvector/mode lights
  up everywhere (linked views).
- **Interaction**: drag matrix entries or domain handles and watch the spectrum
  respond; pick a mode to vibrate; compare two **isospectral drums** side by side.
- **Engine reuse**: `lib/particles`/`Canvas3D` for the modal surface;
  `chrome/readouts.tsx` spectrum strip; **`lib/spectral`** (new, then reused by
  Heat Kernel and Clustering).

### Open questions
- Three faces (matrix · drum · graph) in one app via `subject`, or split the
  graph face into Clustering? Lean: matrix + drum here; graph spectrum lives in
  Clustering, cross-linked.
- Eigensolver scope: dense symmetric Jacobi/QR is plenty for teaching sizes; defer
  Lanczos/sparse until a real need.

---

## 10. Heat Kernel

### Concept
Let heat diffuse and watch sharp structure melt into smooth structure at a rate
set by the geometry. The **heat kernel** is the Green's function of that flow —
and a Rosetta stone linking diffusion, the Laplacian spectrum, Brownian motion,
Gaussian blur, and "scale space." The exhibit: drop a hot spot, watch it spread,
and reveal that diffusion is just the spectrum decaying mode-by-mode.

### Canonical models / math
- **Heat equation** `∂u/∂t = Δu`; solution `u(t) = e^{tΔ} u₀`. On a domain with
  Laplacian eigenpairs `(λₖ, φₖ)`,
  `u(x,t) = Σₖ e^{−λₖ t} ⟨u₀,φₖ⟩ φₖ(x)` — **high frequencies die fastest**
  (this is *why* diffusion smooths, and the direct sequel to apps 8–9).
- **Heat kernel** `K_t(x,y) = Σₖ e^{−λₖ t} φₖ(x) φₖ(y)`; on `ℝⁿ` it's the
  **Gaussian** `(4πt)^{−n/2} e^{−|x−y|²/4t}` — so diffusion = Gaussian blur and
  `t` is "scale." On the circle it's a **theta function** (the Fourier tie-back).
- **Discrete/graph heat** `u(t) = e^{−tL}u₀`; **diffusion maps** (Coifman–Lafon)
  embed data by heat flow — the bridge to clustering (app 11).
- **Probabilistic face** — `K_t` is the transition density of **Brownian motion**;
  heat flow = the PDE shadow of random walks (ties to the agent apps).
- **Geometry** — the short-time trace `Σ e^{−λₖ t} ∼ (4πt)^{−n/2}(Vol + …)`
  ("hearing" volume/curvature), connecting back to Weyl (app 9).

### Key phenomena
Smoothing as spectral decay (watch each mode's coefficient fall like `e^{−λt}`);
Gaussian blur **is** diffusion; scale-space (features merging as `t` grows);
heat flow respecting geometry (slow across bottlenecks — the clustering hint);
the random-walk ↔ heat-equation duality.

### Prior art
Evans, *PDE*; Rosenberg, *The Laplacian on a Riemannian Manifold*; Coifman–Lafon
diffusion maps; scale-space theory (Lindeberg); every image-blur demo.

### animath mapping
- **Rendering**: two faces. **Field face** — diffuse a 2D heat field on the
  **CA ping-pong GPU grid** (shared with app 1), or CPU for small grids. **Manifold
  face** — heat on a Three.js surface/graph via `u(t)=Σ e^{−λₖt}…` using the
  **`lib/spectral`** eigendata (shared with app 9).
- **Archetypes**:
  - `subject` — substrate: 2D field, a surface/drum, or a graph/point cloud.
  - `domain` — geometry/boundary; initial heat `u₀` (paint hot spots).
  - `drive`/`playback` — **time `t`** as the master control (scrub diffusion),
    play/step; diffusivity.
  - `color` — temperature colormap.
  - `motion` — the spreading itself.
  - `readout` — the **spectral decay** (`Σ` coefficients `e^{−λₖt}` as a falling
    bar strip — the same spectrum strip as app 9), total heat (conserved),
    entropy/spread over time.
- **View windows**: the diffusing field/surface · the spectrum-decay strip ·
  (optional) a `u₀` vs `u(t)` before/after **split view** (Plane Transform's
  `panes`). Selecting a mode in the strip isolates its `e^{−λt}` contribution.
- **Interaction**: **paint hot spots**, scrub `t` (the hero control), watch the
  spectrum strip drain; compare diffusion on two geometries.
- **Engine reuse**: CA's ping-pong field (app 1) for the 2D face; `lib/spectral`
  + `Canvas3D` (app 9) for the manifold face; readouts for the decay strip. Heat
  Kernel is **cheapest to build after CA and Eigenvalues exist**.

### Open questions
- Lead with the 2D field (immediate, shares CA engine) or the spectral
  decomposition (the deeper idea, shares `lib/spectral`)? Lean: 2D field first for
  the "blur = diffusion" punch, then reveal the spectral view.
- How explicitly to draw the random-walk duality — a Brownian-motion overlay is
  lovely but is arguably its own exhibit.

---

## 11. Clustering

### Concept
Find the groups in unlabeled data — the canonical *unsupervised* learning task,
and a clean stage for "the algorithm's assumptions decide what it sees." The
exhibit: scatter points, run competing clustering methods on the **same** data,
and watch where each one's notion of "a cluster" succeeds or fails — culminating
in **spectral clustering**, which routes the whole thing back through eigenvalues
and the heat kernel.

### Canonical models / math
- **k-means** — minimize within-cluster variance `Σᵢ ‖xᵢ − μ_{c(i)}‖²` by Lloyd's
  alternation (assign → recenter). Fast, but assumes round, comparably-sized
  blobs; sensitive to `k` and init (**k-means++**).
- **Gaussian mixtures (EM)** — soft assignment via `K` Gaussians fit by
  Expectation–Maximization; captures elliptical clusters and uncertainty.
- **DBSCAN** — density-based (`ε`, `minPts`): finds **arbitrary shapes** and marks
  outliers, no `k` needed — the foil that cracks the "two moons" k-means fails on.
- **Hierarchical (agglomerative)** — merge nearest clusters by a linkage
  (single/complete/average/Ward) → a **dendrogram** you cut at a chosen height.
- **Spectral clustering** — build an affinity `W` (e.g.
  `W_ij = e^{−‖xᵢ−xⱼ‖²/2σ²}` — *a heat kernel*), form the graph Laplacian
  `L = D − W`, embed with its **lowest eigenvectors**, then k-means there. Cuts
  non-convex clusters that k-means can't — and is **literally apps 9–10 applied to
  data** (Fiedler vector, diffusion distance).
- **Evaluation** — inertia/elbow, **silhouette**, and (with labels) ARI/NMI.

### Key phenomena
k-means' round-blob bias (fails on two moons / concentric rings); DBSCAN finding
shape and outliers; the dendrogram and where you cut it; **spectral clustering
succeeding via the graph Laplacian's eigenvectors** (the throughline payoff);
how `k`, `σ`, `ε`, and linkage change the answer; that there's **no single right
clustering**.

### Prior art
Hastie–Tibshirani–Friedman, *ESL*; von Luxburg, "A Tutorial on Spectral
Clustering"; the scikit-learn "clustering comparison" plate; Ng–Jordan–Weiss
spectral clustering; DBSCAN (Ester et al.).

### animath mapping
- **Rendering**: a **2D canvas** point scatter with cluster coloring + centroids /
  density reachability / affinity edges, plus a **DOM/SVG dendrogram** — closest
  precedents are **StableMatching** (DOM/SVG + Analyze tier) and the fractal/plane
  2D viewers. Spectral mode reuses **`lib/spectral`** (graph Laplacian eigenvectors,
  shared with apps 9–10).
- **Archetypes**:
  - `subject` — algorithm (k-means / GMM / DBSCAN / hierarchical / spectral).
  - `domain` — dataset (blobs / moons / rings / uniform / **drawn points**), `N`,
    noise.
  - `drive` — `k`, or `ε`/`minPts`, or linkage, or affinity `σ` — the knob that
    *is* the lesson; **place seeds by tapping**.
  - `playback` — step the iterations (Lloyd assign/recenter, EM E/M, agglomerative
    merges) — algorithms-as-animation, like Stable Matching's rounds.
  - `color` — cluster assignment; soft responsibilities (GMM); core/border/noise
    (DBSCAN).
  - `lab`/`readout` — **silhouette** and inertia (`StatGrid`/`Sparkline`), the
    elbow curve, the **eigenvalue strip** in spectral mode (the shared spectrum
    readout), and a small-multiples "same data, every method" comparison.
- **View windows**: the scatter · the dendrogram (hierarchical) or the spectral
  **embedding** (points in eigenvector coordinates) · a metrics panel. In spectral
  mode the affinity-graph view and the eigen-embedding are **linked** (pick an
  eigenvector → recolor).
- **Interaction**: **draw/scatter points**, drag the knob (`k`/`ε`/`σ`) and watch
  clusters reform live, step the algorithm, and **race methods on one dataset**.
- **Engine reuse**: 2D canvas + `useViewportGestures`; DOM/SVG dendrogram à la
  StableMatching; `chrome/readouts.tsx`; **`lib/spectral`** for the spectral
  method — which makes Clustering the natural **capstone** of the spectral trio
  (it consumes the Laplacian eigensolver app 9 builds and the heat-kernel affinity
  app 10 explores).

### Open questions
- One app with an algorithm `subject` switch (best for the "same data, different
  assumptions" lesson) vs separate apps. Lean: **one app**, switchable — the
  comparison *is* the point.
- Spectral mode depends on `lib/spectral`; ship the classic four (k-means / GMM /
  DBSCAN / hierarchical) first, add spectral once Eigenvalues lands?
- Dimensionality: keep it 2D for legibility, or allow a projected high-D dataset
  (ties to a future PCA/embedding exhibit)?

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
5. **Glassy Networks** + **GAS** — design **together** (the shared
   rugged-landscape-exploration view and "best-energy-vs-steps" race); both lean on
   the Analyze tier and the existing DOM-graph approach. GAS is a clean port of
   small NumPy; Glassy supplies the Ising/QUBO/QKP landscape.
6. **Trees and Nets** (classical port of quantum-tree — circular orders, energies,
   circular-decomposable metrics, trees, NeighborNet + NJ; quantum layer excluded) —
   port the math to TS + rebuild views (source in hand), and design the **whole-
   associahedron** view; biggest single port, but an unusually good fit for the
   multi-window + 3D UX. **Slated as the next build.**

Both ports (Trees and Nets, GAS) now have **source in hand**; the gating items are
licensing/attribution for the private repos and choosing each MVP's first slice.

7. **Spectral wave** (apps 8–11) — build around the shared `lib/spectral` kernel
   and spectrum-strip readout. **Fourier Analysis** is the most self-contained and
   shareable (epicycles, no eigensolver) — a good standalone start. **Eigenvalues
   & Spectra** builds the symmetric eigensolver; **Heat Kernel** then reuses it
   (and the CA ping-pong field) almost for free; **Clustering** is the capstone
   that consumes both (spectral clustering = the Laplacian eigensolver + a
   heat-kernel affinity). Independent of the emergence apps (1–4) — schedule by
   appetite.
