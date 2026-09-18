---
kind: three-hats
session: 2026-09-16-S01
date: 2026-09-16
title: "Three hats · Architecture & Quality Consultant — Split Decision plan"
branch: claude/elegant-ride-e1q79l
slug: elegant-ride-e1q79l
status: completed
build: n/a
followup: null
pr: null
app: split-decision
---

# Three hats · Architecture & Quality Consultant — Split Decision plan

## Plan under review

<details>
<summary>Original request</summary>

# Plan — Split Decision: a genetic algorithm that evolves a matrix split, with sex

A new self-contained app, `src/animations/SplitDecision/`, route `#/split-decision`.
A population of genotypes evolves a two-way split of a binary matrix (rows = cells,
columns = variants) under one of several **selection scores**, some of them
information-theoretic. The experiment is the **reproductive rule**: clonal, sex by
swapping, or **two sexes that each transmit one half of the genome** (one sex passes
on the row half, the other the column half). The app exists to watch those three
rules race on the same landscape and to show where they differ.

This plan replaces the drafted spec (`split-decision-spec.md`, 2026-09-16, written by
an agent from a conversation about the monograph *Bipartite Homomorphism and
Regularization*, 13 September 2026). Dan clarified the intent in this session: the
evolutionary dynamics are the subject; the monograph's statistical machinery (null
ladder, calibration protocols, the Kraft bound) recedes to a later phase or another app.

> [!IMPORTANT]
> **Decisions locked (Dan, 2026-09-16):** (1) The two-sex rule passes the inherited
> half **intact** (no recombination within a sex); more sex rules can be added later.
> (2) No null ladder, samplers, calibration protocols, or Kraft bound in the first
> version. (3) No sonification. (4) Keep the name *Split Decision* and the
> humor-plus-history character names from the spec for the scores and rules.

## Session purpose

Read the drafted spec and the monograph, find out what Dan actually wants, and write
the plan for it. No construction this session.

## Previous session

First tracked session on this branch.

## What the app is for

**One sentence:** a population evolving a split of a matrix, where the reproductive
rule is the experiment and the selection score is the landscape.

**Three things a viewer should see:**

1. **The matrix sorts itself.** With rows ordered by the best genome's row
   probabilities and columns by its column probabilities, a planted checkerboard
   emerges from noise as the population evolves. The split is never drawn as a line;
   it is a reordering that makes the blocks visible.
2. **The genome makes up its mind.** Under fitness evaluated on a *sampled* phenotype,
   genotype entries near ½ produce high-variance offspring, and selection pushes them
   toward 0 or 1. The population's average genome entropy falls: canalization,
   without anyone scheduling an annealing.
3. **The three rules race.** On a strongly planted signal the sexual rules should
   converge fast (good rows are good against nearly any column set: a "mixable"
   landscape). Where the optimum needs a coordinated row-and-column move, the clonal
   rule, the only one that mutates both halves in one lineage, should win.

The third item is a **hypothesis under test** and is labeled as such in the UI. It
comes from the mixability argument (Livnat, Papadimitriou, Dushoff & Feldman 2008)
and the multiplicative-weights reading of sex (Chastain, Livnat, Papadimitriou &
Vazirani 2014). The app measures it; it does not assert it.

**The hook for a mitochondrially minded audience.** The two-sex rule is uniparental
inheritance of one genome component: rows pass through one sex only, columns through
the other, and fitness accrues to the pair. That is the shape of mitonuclear
coadaptation, two genomes with separate transmission that must coordinate. The
explainer says this once, as an analogy, and leaves the biology to the reader.

## The model (what the engine implements)

### Matrix and cut

- `M ∈ {0,1}^{m×n}`, row degrees `r`, column degrees `c`, total ones `e`.
- A **cut** `h = (z, w)`, `z ∈ {0,1}^m`, `w ∈ {0,1}^n`. `R₁ = {i : z_i = 1}`, `C₁ = {j : w_j = 1}`.
- **Block counts** `N_ab` and **capacities** `K_ab = |R_a|·|C_b|`. Aggregated table
  margins `N_a·`, `N_·b` are *not* the degree vectors; keep `{r, c, e}` and `{N, K}`
  as two separately typed structures (the monograph's page-23 distinction).
- The cross-block orientation is `R₁×C₂` and `R₂×C₁`. Cuts `(z, w)` and `(1−z, 1−w)`
  name the same split; readouts treat them as equal.
- A cut with an empty class on either side is **degenerate**.

### Genotype, phenotype, fitness

- **Genotype** `g = (p ∈ [0,1]^m, q ∈ [0,1]^n)`: the probability of putting each row
  in `R₁` and each column in `C₁`. Initialized i.i.d. uniform on [0,1].
- **Phenotype**: one cut sampled `z_i ~ Bernoulli(p_i)`, `w_j ~ Bernoulli(q_j)`.
- **Fitness** `F(g) = S(M; h)` for the chosen score `S`, with `h` drawn fresh at each
  evaluation (**Sampled**, the default) or taken as the rounded genome `z_i = [p_i > ½]`
  (**Rounded**, deterministic ascent; a toggle for contrast).

### Selection scores (the Judges)

A registry in `scores.ts`: `{ id, name, historicalName, formula, blindSpot, score(M, cut) }`.
Log-space for entropies; `0·log 0 = 0`; `H(θ)` the binary entropy in bits.

| Name | History | Score | Trivial cut scores |
|---|---|---|---|
| **Cut and Run** | min-cut (Ford–Fulkerson 1956) | `N₁₂ + N₂₁ − N₁₁ − N₂₂` | `e` (needs the guard) |
| **Hamming's Full Count** | Hamming loss (Hamming 1950); the monograph's complete-template objective `xᵀ(J−2M)y` | Cut and Run, plus zeros counted as evidence: `(N₁₂+N₂₁−N₁₁−N₂₂) + (Z₁₁+Z₂₂−Z₁₂−Z₂₁)` with `Z_ab = K_ab − N_ab` | `e − (mn − e)` (needs the guard) |
| **Pearson's Squint** | Pearson 1900 | `Σ (N_ab − E_ab)² / E_ab`, `E_ab = N_a·N_·b / e` | 0 (degenerate margins) |
| **Shannon's Onesie** | information-theoretic co-clustering (Dhillon, Mallela & Modha 2003) | `I₁ = Σ (N_ab/e) log₂[(N_ab/e) / ((N_a·/e)(N_·b/e))]`, at most 1 bit | 0 |
| **The Full Bernoulli** | block-Bernoulli likelihood ratio (stochastic block model) | `I₂ = H(e/mn) − Σ (K_ab/mn) H(N_ab/K_ab)` bits per cell | 0 |
| **Newman's Leftovers** | modularity (Newman & Girvan 2004; Barber 2007 for bipartite) | `Q = −xᵀ(M − rcᵀ/e)y / e` | 0 |
| **Occam's Invoice** | minimum description length (Rissanen 1978) | bits saved `k = L₀ − L_cut − L_blk` with `L₀ = log₂ C(mn, e)`, `L_cut = log₂(m+1) + log₂ C(m,|R₁|) + log₂(n+1) + log₂ C(n,|C₁|) − 1`, `L_blk = Σ [log₂(K_ab+1) + log₂ C(K_ab, N_ab)]` | negative |

**The guard.** The two edge-count scores award their maximum to the trivial cut
(everything in one block: zero violations, empty classes). Rule: a degenerate cut
scores the score's **neutral value 0** for every score. The four information and
modularity scores already give 0 there by construction; the guard only bites Cut and
Run and Hamming. Near-trivial cuts (one peeled row) remain scoreable; that is those
scores' honest blind spot and the app lets it show.

**Dropped from the spec's roster:** Fisher's Tea Party (a tail probability, not a
score to climb) and Solomon's Split (a size constraint, not a score; a balance
constraint may return later as a phenotype repair step).

### Reproductive rules (the Worlds)

Non-overlapping generations, population size `N`, no elitism. **Selection** is
tournament selection of size `k` (the "selection strength"; `k = 1` is neutral
drift), chosen because it is scale-free across scores with very different ranges.
**Mutation**: each locus, with probability `μ`, moves by `Normal(0, σ)` and is clipped
to [0,1].

| Name | History | Rule |
|---|---|---|
| **Muller's Monastery** | clonal reproduction (Muller 1964) | one parent; child = parent + mutation. The only rule that can move a row entry and a column entry together in one lineage in one step. |
| **Hardy–Weinberg Mixer** | random mating (Hardy 1908; Weinberg 1908); MWU reading of sex (Chastain et al. 2014) | two parents; uniform crossover per locus over the whole `(p, q)`; then mutation. |
| **Potter–De Jong Prom** | cooperative coevolution (Potter & De Jong 1994) | every individual carries a full `(p, q)` **and a sex** ∈ {row, column}. Mating pairs one row-sex parent with one column-sex parent, each chosen by a tournament within its sex. Child: `p` from the row-sex parent, `q` from the column-sex parent, **both intact**; then mutation. Child's sex: Bernoulli with the sex-ratio parameter (default ½). |

In the Prom, a row-sex individual's `q` is a passenger: it affects that individual's
fitness but is never transmitted by it. That asymmetry is the point.

### Fixtures and generators

- **Planted checkerboard** (generator): `m, n, |R₁|, |C₁|`, cross-block density
  `ρ_in`, diagonal-block density `ρ_out`, seed. Signal = `ρ_in − ρ_out`. The Lab's
  x-axis.
- **The 8×10 pair** (monograph page 46, quoted verbatim): complete (40 edges) and
  sparse (18 edges). Same structure, different density.
- **The Ninety's observed matrix** (monograph page 47): the 4×4 with two complete
  2×2 cross-blocks. Small enough to enumerate every cut.
- **Trap fixtures**: a `(matrix, score, cut)` triple where the cut is a strict local
  optimum under every single-locus flip but not the global optimum, verified by
  enumeration in a test. See the finding below on why the monograph's page-50 example
  qualifies only for one score.
- **Paint mode**: click cells to toggle them (a DOM grid makes this nearly free).

### Exact optimum (the Exhaustive Bailiff)

For `m + n ≤ 20`, enumerate all `2^(m+n−1)` distinct cuts for the chosen score. The
Watch mode draws it as a reference line; the Lab uses it to define
*generations-to-optimum*. Above that size the line is hidden and the Lab reports
generations-to-plateau instead. Also a one-line structural readout, **Tarjan's
Handshake**: does a zero-violation cut with four nonempty classes exist (at least two
components touching each side, counting isolates)?

## UI (React, DOM + SVG, no WebGL)

One `<Workspace appId="split-decision">`, two top-bar modes.

### Watch mode

Views:
- **Arena** — the matrix as a DOM grid. A **Sort by best genome** toggle (default on)
  orders rows by `p_i` descending and columns by `q_j` ascending with animated
  transitions, so a checkerboard emerges as the population converges. Cells tinted by
  their block role under the best individual's rounded cut: the two cross blocks in
  `--data-1` and `--data-2`, diagonal blocks neutral. A bar strip on the left shows
  `p_i`, one on top shows `q_j`. Hover shows the cell's row degree, column degree, and
  block.
- **Population** — every individual as two thin bar strips (`p` over rows, `q` over
  columns), sorted by fitness, opacity by fitness rank; in the Prom, a sex glyph and
  the two sexes in two more discrete data tokens.
- **Trace** — sparklines of best and mean fitness with the exact-optimum line, and the
  population's mean genome entropy `Σ H(p_i) + Σ H(q_j)` (the canalization curve).

Panels (closed archetype vocabulary):

| Panel | arch | Contents |
|---|---|---|
| Matrix | `subject` | fixture picker · planted generator sliders · paint mode toggle |
| Score | `domain` | the seven scores as a Select with the historical name and blind spot as a Note · Sampled / Rounded pill |
| Reproduction | `drive` | rule pills · population size · mutation rate μ and step σ · tournament size k · sex ratio (Prom only) |
| Run | `playback` | play / pause / step / reset · generations per second · seed (editable, replayable) · Initialize: random / at a cut (for trap experiments) |
| Readouts | `readout` | StatGrid: generation, best, mean, entropy, converged fraction, exact optimum, Tarjan's Handshake |
| View | `view` | sort by best genome · show sexes · block tints on/off |

The action strip carries play/pause/step/reset.

### Lab mode

The ensemble experiment, run in a worker pool copied from the Trinary Lab's
`pool.ts` shape. A sweep over planted signal strength (default 6 levels) × the three
rules × R seeds (default 12), each run to `G_max` generations (default 300) and
recording generations-to-optimum (censored at `G_max`). The view plots median with an
interquartile band per rule against signal, with the **hypothesis** stated above the
chart and the Two-Step-with-restarts baseline optional. A **catalog** table logs every
sweep (matrix size, score, rule set, N, μ, σ, k, seeds, result), as Counting the Ways'
Lab does, so sweeps can be compared. A second Lab preset, **Escape the trap**, starts
every individual at a trap fixture's local optimum and measures escape time per rule.

Cost check: 6 × 3 × 12 × 300 generations × N = 64 × O(mn = 200) ≈ 8·10⁸ cell visits;
seconds across four workers, never on the main thread.

### Theming

Ones drawn in `--fg`, block roles and sexes from the discrete `--data-1..4` tokens,
accent reserved for controls. Canvas is not needed in v1; if the matrix grows past a
few thousand cells, switch the Arena to canvas via `useThemeTokens`.

## Files

```
src/animations/SplitDecision/
  SplitDecision.tsx      the app: modes, panels, views, <Workspace>
  splitDecision.css
  EXPLAINER.md           the ? modal (ends with "Possible sources & where to go further")
  matrix.ts              BinaryMatrix · Degrees {r,c,e} · Cut · BlockTable {N,K} · blockTable() · fixtures · planted()
  scores.ts              the seven-score registry · degenerate guard · exactOptimum() · handshake()
  evolve.ts              Genotype · Individual (genome + sex) · Population · step(pop, cfg, rng) → {pop, stats} · the three rules
  lab/pool.ts            worker pool (Trinary shape)
  lab/worker.ts          runs one (signal, rule, seed) job to G_max
  lab/sweep.ts           sweep config + result types
  views/Arena.tsx  views/Population.tsx  views/Trace.tsx  views/Sweep.tsx
  __tests__/scores.test.ts   __tests__/evolve.test.ts
src/lib/rng.ts           mulberry32 + runSeed, promoted from Trinary's lab/rng.ts (Trinary left untouched; a later chore can point it here)
```

Shared files touched, append-only: `src/index.tsx`, `src/apps.ts`,
`src/chrome/catalog.ts` (category `Algorithm`, a new preview kind or a reused one),
`README.md`, `CLAUDE.md` (routing row + layout line). `docs/sessions/categories.mjs`
already carries the `split-decision` category (added this session).

## Acceptance (the tests Phase 1 must pass)

Numbers verified by enumeration this session unless marked otherwise.

| Fixture | Check | Value |
|---|---|---|
| Ninety's observed 4×4, balanced cut | Pearson's Squint | 8 |
| same | Shannon's Onesie | 1 bit |
| same | The Full Bernoulli | 1 bit/cell |
| same | Occam's Invoice (homogeneous code) | −4.45 bits (negative; see finding) |
| 8×10 complete vs sparse | Shannon's Onesie | 1 vs 1 |
| same | The Full Bernoulli | 1.000 vs 0.273 bit/cell |
| same | Cut and Run | 40 vs 18 |
| same | Tarjan's Handshake | true, true |
| any matrix, trivial cut | all seven scores | 0 (guard) except Occam negative |
| any matrix, `(z,w)` vs `(1−z,1−w)` | every score | equal |
| page-50 4×4, cut `z=(0,1,0,1)`, `w=(1,0,0,1)` | Newman's Leftovers: strict local under all 8 single flips, global 0.543 | local 0.346 |
| planted 8×10, ρ_in=1, ρ_out=0 | exactOptimum for each score = the planted cut | by enumeration |
| evolve, fixed seed | identical trajectory on two runs | deterministic |
| evolve, strong signal, N=64, each rule, a named seed | reaches the exact optimum within 300 generations | asserted per seed |
| evolve, Sampled fitness, fixed seed | mean genome entropy at generation 100 < generation 0 | canalization |
| Prom | every child's `p` equals its row-sex parent's `p` before mutation | intact transmission |

## Findings this session

### 🔵 finding — the page-50 trap is a trap only under the balance constraint

The monograph's alternating counterexample (page 50) holds for balanced single-side
moves. Under unconstrained single-locus flips, which is what a GA's mutation does, the
same cut is a strict local optimum only for **Newman's Leftovers** (local 0.346, global
0.543). For Cut and Run, Hamming, Shannon's Onesie, and The Full Bernoulli a single
flip already improves it. So the trap fixture must be defined operationally (strict
local under all single flips, verified by enumeration), and the plan uses the page-50
matrix with the modularity score as the first such fixture. A small search for traps
under the other scores is a Phase 1 stretch.

### 🔵 finding — the drafted spec's Occam's Invoice numbers do not follow from its own code

The spec's §3.1 says the Kraft bound lands on 0.20 and 1/45. Those come from a
fiber-indexed code (`log₂ 90` baseline, balanced-partition cut code) that the spec's
§2.2 never defines. Under the §2.2 homogeneous code the 4×4 checkerboard *loses*
4.45 bits. For this app that is only a fitness-scale curiosity (Occam's Invoice can be
negative, meaning "not worth describing"), recorded here so a later statistics phase
does not inherit the inconsistency.

### 🔵 finding — the spec's Two-Step trap used an undefined formalism

Its diag(2,3) example is the monograph's abstract page-18 score matrix with linear
terms, not a binary M. The page-50 binary example is the one to quote.

## Phases

**Phase 1 — Engine.** `matrix.ts`, `scores.ts`, `evolve.ts`, `lib/rng.ts`, and the
two test files with every row of the acceptance table. Pure TypeScript, no UI.
`npm test` green.

**Phase 2 — Watch.** The workspace, the six panels, Arena with sort-by-genome
animation, Population, Trace, registration in the three shared files, EXPLAINER.md,
README and CLAUDE.md rows. Ships in the gallery **Storeroom** until Dan promotes it.
`npm run build` and `npm run lint` clean; a headless tour screenshot in this
folder's `assets/`.

**Phase 3 — Lab.** Worker pool, sweep, the curves view, the catalog table, the
Escape-the-trap preset. The mixability hypothesis gets its first real curves.

**Later, in this order of likely value:** more sex rules (recombination within a
sex, so the Prom becomes an (m+n)-player game; mate choice as a signaling game, the
Mishra angle); a balance constraint as phenotype repair (Solomon's Split returns);
the monograph's statistics as a separate mode or app (null ladder, search-aware
calibration of "the evolved split", the Kraft bound), where the spec's remaining
material lives; observation masks and structural zeros.

## Risks and open questions

- **Tournament selection vs fitness-proportional.** Tournament is scale-free and
  simple; the MWU reading of sex assumes fitness-proportional selection under weak
  selection. If the Lab's curves are to be compared with that theory, a
  fitness-proportional option with a temperature will be needed. Not v1.
- **Sex-ratio drift in the Prom.** With the child's sex drawn at ½, small populations
  can lose one sex. Rule: if a sex is empty, the generation's pairing falls back to the
  Mixer for that generation and the readout flags it. Cheap and honest.
- **Attribution.** All the citations above match my training knowledge as of this
  session, except that I could not reach arxiv.org from the sandbox to check the
  Hardin et al. 2024 reference the spec carried; it is not needed in v1. The
  cooperative-coevolution convergence-to-Nash result (Wiegand, Panait and Luke, early
  2000s) and the mitonuclear coadaptation literature (Rand, Haney & Fry 2004 is the
  review I recall) need a check before they go into EXPLAINER.md. The monograph itself
  is a private working manuscript; the explainer credits it as "a September 2026
  working monograph" without naming correspondents unless Dan says otherwise.
- **Name and preview.** *Split Decision* stays. The gallery preview needs a new
  `PreviewKind` (a tiny matrix sorting itself) or reuse of `matrix`.

## Self-reflection

1. **What would you do with another session?** Run `/three-hats` on this plan, then
   Phase 1. The engine is small enough that Phase 1 and the tests fit one session.
2. **What would you change about what you produced?** The acceptance row for
   "each rule reaches the optimum within 300 generations" pins seeds without knowing
   the dynamics yet; it may need loosening to "at least 10 of 12 seeds" once real
   runs exist.
3. **What were you not asked that you think is important?** The Prom's passenger
   half (a row-sex individual's untransmitted `q`) is where the interesting biology
   sits, and no readout in the plan isolates it. A "heritable vs passenger fitness
   contribution" readout would be a cheap, distinctive addition.
4. **What did we both overlook?** Whether fitness should be evaluated once per
   individual per generation or averaged over several sampled phenotypes. One sample
   gives the canalization story; the plan commits to one sample and says so.
5. **What did you find difficult?** Separating three authors' intentions: the
   monograph's, the drafting agent's, and Dan's. The history Dan pasted resolved it.
6. **What would have made this task easier?** The spec arriving with the
   conversation that produced it, as it eventually did.
7. **How did you verify this, and does each passing check test the user-visible
   claim?** Enumeration scripts in the session scratchpad for the 90-matrix fixture,
   the 8×10 pair, the page-23 margins example, and the page-50 trap under both
   balanced and unconstrained moves. No app code exists yet, so nothing user-visible
   is verified; `signals: not-live` and `needs-dan` are set.
8. **Follow-up value:** MEDIUM — the plan is complete for Phase 1, but the Lab's
   hypothesis and the acceptance seeds need real runs before they are trustworthy.

</details>

## Executive summary

The plan is sound where it matters most: the engine is pure, the fitness functions
are a registry, the seed is the replay key, the heavy sweep goes to workers, and the
tests are named before the code exists. Those are the four decisions I would have
pushed for, and they are already made. My concerns are about the *shape* of two
things and the *honesty* of three acceptance rows:

1. **The three "Worlds" should be compositions of operators, not three
   hand-written rules.** Select, mate, mutate and evaluate as separate pure
   functions (the DEAP toolbox model), with each World a small table row. The plan
   itself forecasts more sex rules; a fourth World written as a fourth `switch`
   arm is where the file starts to rot. This also makes the Prom's intact-transmission
   test a one-liner instead of a "set μ = 0 and hope" workaround.
2. **`score(M, cut)` recounts the matrix per score.** Count the 2×2 block table
   once per evaluation and give every score the table (plus degrees). The seven
   scores then cost O(1) each, and the enumerator, the readouts and a future
   score-sweep all share one counting path.
3. **"Reaches the exact optimum" needs a definition before it becomes a
   metric.** Under Sampled fitness a mediocre genome can produce an optimal cut by
   luck; the Lab's generations-to-optimum must be read off a deterministic
   phenotype (the rounded best or the population consensus), not the best sampled
   score.
4. **The sex-ratio fallback is a rule change mid-run.** A Prom generation that
   "falls back to the Mixer" is a contaminated Prom sample in the Lab's curves.
   Draw sexes by a seeded quota (exactly `round(N·r)` row-sex children) and the
   extinction branch, the flag and the caveat all disappear.
5. **The named-seed acceptance rows are brittle by construction.** Any refactor
   that reorders a single RNG draw silently changes every trajectory. Keep one exact
   determinism test (a hash of the population), and make the "converges" and
   "canalizes" claims statistical over a seed batch with a control condition.

Everything else is polish: decouple the simulation tick from React's render tick,
animate the Arena reorder with transforms on keyed cells, promote the RNG (and
ideally a generic pool) to `src/lib`, and persist the Lab catalog as
version-stamped config + summary rows.

## 1 · Pattern recognition: what this is, and what it already resembles in-repo

| Piece of the plan | Known pattern | Nearest in-repo precedent | Verdict |
|---|---|---|---|
| `step(pop, cfg, rng) → {pop, stats}` | pure simulation reducer | `AgenticSorting/engine.ts` `step(state, rand)`; its `lab.ts` reruns the same reducer headless | ✅ house style; keep the signature pure and allocation-light |
| the seven Judges in `scores.ts` | fitness-function registry (presentation metadata over pure math) | `DivisionBells/measures.ts` over `gaussian2d.ts` | ✅ right pattern; change the compute signature (§2.2) |
| the three Worlds | evolutionary-computation **operator model** (DEAP `toolbox.register('select' / 'mate' / 'mutate')`, algorithms as loops over operators) | none yet | ⚠️ the plan writes rules, not operators (§2.1) |
| `lab/pool.ts` + `lab/worker.ts` | work-queue worker pool with streamed results and main-thread aggregation | `TrinaryStars/lab/{pool,worker,ensemble}.ts` | ✅ correct choice at this cost; consider promoting a generic pool (§4.3) |
| `mulberry32` + `runSeed` | seeded PRNG, per-run seed from (base, index) | **six** private copies of `mulberry32` in `src/` today (`previews.tsx`, `CountingTheWays/skellam.ts`, `TreesAndNets/lib/mosaic.ts`, `StableMatching/model.ts`, `TrinaryStars/lab/rng.ts`, `AgenticSorting/engine.ts`) | ✅ promoting to `src/lib/rng.ts` is overdue; this app should be the seventh consumer, not the seventh copy |
| Arena as a DOM grid that reorders itself | keyed-element FLIP / transform reorder (the Observable GA and sorting demos all do this) | `AgenticSorting` animates DOM swaps, but with short color/scale transitions, not positional ones | ⚠️ needs an explicit render strategy (§4.1) |
| Lab catalog table | append-only run log | `CountingTheWays` `runs: useState<Run[]>` capped at 60, in-memory | ⚠️ CTW's runs cost microseconds; these cost seconds (§6.5) |

The plan is not inventing anything the repo does not already do; it is assembling
four proven pieces. The only place it departs from a well-known model is the
reproductive rules, and that is the one place I would change the design.

## 2 · Structural soundness

### 2.1 Operators, not rules

The plan describes the Worlds as three prose rules and forecasts more ("recombination
within a sex", "mate choice as a signaling game"). Each rule is really a triple:

| World | `select` | `mate` | `mutate` |
|---|---|---|---|
| Muller's Monastery | tournament(k) over the whole population, one parent | identity (clone) | Gaussian step, clip |
| Hardy–Weinberg Mixer | tournament(k), two parents | uniform crossover per locus over `(p, q)` | same |
| Potter–De Jong Prom | tournament(k) **within each sex**, one parent per sex | `p` from the row parent, `q` from the column parent, both intact | same |

Mutation and tournament are identical across all three; only parent-choice and
recombination differ. Writing that as operators costs nothing and buys three things:

```ts
// evolve.ts — the operator model (sketch)
export type Sex = 'row' | 'col';
export interface Genome { p: number[]; q: number[] }
export interface Individual extends Genome { sex: Sex; fit: number; cut: Cut | null }

export type Rng = () => number;
export type Select  = (pop: Individual[], k: number, rng: Rng) => Individual;
export type Mate    = (parents: Individual[], rng: Rng) => Genome;   // pure; NO mutation here
export type Mutate  = (g: Genome, mu: number, sigma: number, rng: Rng) => Genome;

export interface Rule {
  id: RuleId;
  /** How parents are chosen for one child. 'sexed' means one tournament per sex. */
  parents: 'one' | 'two' | 'sexed';
  mate: Mate;
}
export const RULES: Record<RuleId, Rule> = {
  clonal: { id: 'clonal', parents: 'one',   mate: ([a]) => cloneGenome(a) },
  mixer:  { id: 'mixer',  parents: 'two',   mate: uniformCrossover },
  prom:   { id: 'prom',   parents: 'sexed', mate: ([row, col]) => ({ p: row.p.slice(), q: col.q.slice() }) },
};

export function step(pop: Individual[], M: BinaryMatrix, cfg: EvolveConfig, rng: Rng): { pop: Individual[]; stats: GenStats }
```

1. **The Prom test becomes exact.** `RULES.prom.mate([row, col], rng)` returns a
   genome whose `p` `toEqual`s `row.p` and whose `q` `toEqual`s `col.q`, with no
   mutation in the way. The plan's row "every child's `p` equals its row-sex
   parent's `p` before mutation" otherwise needs `μ = 0` or an instrumented `step`,
   both of which test a proxy.
2. **A fourth World is a table row.** "Recombination within a sex" is
   `mate: ([row, col]) => ({ p: crossover(row.p, other.p), … })` with `parents:
   'sexed-pairs'`; mate choice is a different `Select`. No new `switch` arm in
   `step`, no re-reading a 150-line function to add one.
3. **The RNG consumption order is local to each operator**, which makes the
   determinism contract (§3) documentable per function rather than per rule.

`step` then reads as a loop: evaluate → for each child slot: pick parents by
`rule.parents` → `rule.mate` → `mutate` → assign sex → collect stats. A newcomer in
six months can follow it top to bottom.

> [!IMPORTANT]
> **Recommendation** — make `select`, `mate`, `mutate`, `evaluate` separate exported
> pure functions from day one, with the three Worlds as rows in a `RULES` table. It is
> not more code than three inline rules; it is the same code with names.

### 2.2 Score signature: give the scores the block table, not the matrix

The plan's registry entry is `score(M, cut)`. Every one of the seven scores is a
function of the 2×2 block table `{N, K}` and the degrees `{r, c, e}` alone (the
modularity term `xᵀ(rcᵀ/e)y` is `(Σ_{R₁} r_i)(Σ_{C₁} c_j)/e`, which the table's
margins and class sums supply). So:

```ts
export interface ScoreSpec {
  id: ScoreId;               // plain, greppable: 'edgeCount' | 'hamming' | 'pearson' | 'mutualInfo' | 'bernoulli' | 'modularity' | 'mdl'
  name: string;              // 'Cut and Run' — the UI voice
  historicalName: string;    // 'min-cut (Ford–Fulkerson 1956)'
  formula: string; blindSpot: string;
  /** Neutral value returned for a degenerate cut; 0 for all seven (the guard). */
  score(t: BlockTable, d: Degrees): number;
}
export function blockTable(M: BinaryMatrix, cut: Cut): BlockTable   // O(e + m + n) with a ones list; the only counting loop
export function evaluate(M, d, cut, spec): number                    // guard + spec.score
```

Consequences: the exhaustive enumerator counts once per cut and scores seven
times in O(1) (useful the day the Readouts show "how would the other Judges rate
this cut?", which they should); the Lab can later sweep scores without touching the
counting path; and the guard lives in one `evaluate`, not seven closures. Store `M`
as a list of one-coordinates alongside the dense grid so `blockTable` is O(e), not
O(mn): on the sparse 8×10 (18 edges) that is a 4× difference, and it is what makes
the cost check in §4.2 conservative.

> [!NOTE]
> Keep the ids plain English and the humor as display metadata. `grep modularity`
> must find the modularity score. The character names are a feature of the UI, not
> of the code.

### 2.3 Module boundaries

| Module | Owns | May import | Test surface |
|---|---|---|---|
| `matrix.ts` | `BinaryMatrix`, `Degrees`, `Cut`, `BlockTable`, `blockTable()`, fixtures, `planted(spec, seed)` | `lib/rng` | table invariants, fixtures' edge counts |
| `scores.ts` | `ScoreSpec` registry, `evaluate()` (guard), `exactOptimum()`, `isStrictLocalOptimum()`, `handshake()` | `matrix` | the acceptance values, property tests |
| `evolve.ts` | operators, `RULES`, `EvolveConfig`, `initPopulation()`, `step()` | `matrix`, `scores`, `lib/rng` | determinism, operators, statistics over seeds |
| `lab/sweep.ts` | `SweepConfig`, job index ↔ `(signal, rule, seed)`, `runJob()` (one run to `G_max`), `summarize()` (median/IQR per cell) | `evolve`, `matrix` | index bijection, `summarize` on synthetic rows, one tiny end-to-end run |
| `lab/worker.ts` | message loop only | `sweep` | none (thin) |
| `lab/pool.ts` | queue + streaming | — | none (or promote the generic one, §4.3) |
| `views/*`, `SplitDecision.tsx` | React only | everything above | not unit-tested (by repo convention) |

Two rules keep this honest: **nothing under `views/` or the `.tsx` may call a
`Rng`** (the Watch loop owns one `rng` for the simulation and hands it to `step`;
paint mode, "initialize at a cut" and the generator button do not touch it), and
**`lab/worker.ts` imports only `sweep.ts`** so Vite's worker bundle never pulls
React. `runJob()` lives in `sweep.ts`, not in the worker, so the test can call the
exact function the worker runs.

### 2.4 The `Individual` type

`{p, q, sex}` is right; `sex` is dead weight in two of three Worlds but a nullable
field costs more branches than it saves. Add `fit` and `cut` to the individual: under
Sampled fitness the phenotype is a random variable, and the views need *the* cut that
was scored (the Arena tints blocks by "the best individual's rounded cut", which is a
third object; be precise about which of the three the Arena shows — I would show the
sampled cut that earned the fitness, and label it). Plain `number[]` over
`Float64Array`: 30 loci × 64 individuals makes allocation irrelevant and plain
arrays read better in tests (`toEqual`) and clone structurally through
`postMessage` without ceremony.

### 2.5 Fitness caching and "the best"

Evaluate each individual exactly once per generation and store it (the plan implies
this; say it). Tournament then compares stored `fit` values; it never re-samples.
That is what makes the cost `N` evaluations per generation and the trajectory a pure
function of the seed.

## 3 · The seed/replay contract

The plan promises "seed (editable, replayable)". For that to be a contract rather than
a hope:

1. **The config is the key.** `EvolveConfig` must carry every parameter that touches
   the trajectory: matrix source (fixture id or planted spec + matrix seed), score,
   rule, fitness mode, `samplesPerEval` (fixed at 1 today, named now so a later slider
   is additive), `N`, `k`, `μ`, `σ`, sex ratio, init mode (random / at cut), and the
   run seed. Plus an `engine: number` version. Any persisted thing (catalog rows,
   share links later) stores the whole config and is invalidated by `engine`.
2. **One code path.** Watch mode and the Lab worker must both call the same `step`
   from the same module; the only difference is who owns the loop. This is
   structurally true if `runJob` lives in `sweep.ts` and Watch calls `step` directly.
3. **Draw order is documented and frozen.** Write the order at the top of `step`
   (evaluate all → for each child slot in index order: parents, mate, mutate loci in
   order, sex) and treat a change as an `engine` bump. Selection is the usual leak:
   `tournament` must draw exactly `k` indices per call, never "until distinct".
4. **No `Math.random` in the engine.** A three-line vitest reading the source of
   `evolve.ts`/`scores.ts`/`matrix.ts`/`sweep.ts` and asserting the string is absent
   is a crude but real guard; it is the check that turns the rule into a detector.
5. **Selection as a discriminated union now.** `selection: { kind: 'tournament'; k }`
   today; `{ kind: 'proportional'; beta }` later is then additive to the config and
   to the persisted rows, instead of a second parameter that half the stored configs
   lack.

## 4 · Performance and footprint

### 4.1 Watch mode: the simulation is free, the render is not

Simulation: 60 gen/s × N = 64 × O(e + m + n ≈ 100) ≈ 4·10⁵ cell visits per second.
Nothing. The costs are all in React and layout:

| Surface | Elements | At 60 Hz | Recommendation |
|---|---|---|---|
| Arena, 20×30 | 600 cells + 50 bars | ~600 style diffs/frame ≈ 1–3 ms; fine but pointless | render at most once per animation frame, and only when the frame's state changed |
| Arena reorder | a permutation of 20 rows × 30 cols | a `transition` that never completes if the order changes every 16 ms | see below |
| Population, N = 64 | 64 × 30 = 1920 bars | too many SVG rects at 60 Hz | throttle to ~10 Hz, or draw as a small canvas, or show the top 32 |
| Trace | 3 sparklines | trivial | ring buffer capped at ~2000 points |

**Decouple the sim tick from the render tick.** Do not `setState` per generation
(CountingTheWays' `setInterval` + `setFrame` pattern is right for a 12-frame tutorial,
wrong for a 60 Hz simulation). Run the population in a `useRef`, advance it inside one
`requestAnimationFrame` loop with an accumulator (`gensPerSecond` × Δt, so 500 gen/s
"fast forward" costs nothing extra), and publish a snapshot to React state once per
frame. AgenticSorting already uses the rAF shape.

**Animate reorder with transforms on keyed cells.** Render each cell once, keyed by
`(i, j)`, absolutely positioned via `transform: translate(colX[j], rowY[i])` with
`transition: transform 300ms`. A new permutation is 600 string updates; the
compositor does the motion. CSS grid `order` is not animatable; re-keying by position
destroys the motion. This is the standard FLIP-lite for this size.

**The sort key must be stable enough to animate.** Ordering rows by the *best
individual's* `p` under Sampled fitness flickers: the argmax changes identity every
generation early on, and at convergence the `p_i` tie at 0/1 so any unstable sort
jitters. Use the **population-mean genome** (or a fitness-weighted mean) as the sort
key, break ties by original index, and re-sort at most every ~250 ms so transitions
finish. This is also more honest: "the matrix sorts itself" is a population-level
claim.

**When to switch the Arena to canvas:** past ~2–3k cells, or when the reorder
animation is no longer wanted. Paint mode survives the switch (hit-test =
`floor(x / cellSize)`); hover tooltips are the thing you lose. The plan's "v1 DOM,
canvas later via `useThemeTokens`" is the right call; write the Arena so the
cell-render is one function and the swap is local.

### 4.2 Lab: the cost check is realistic, and the dials can blow it up

Recomputing the plan's estimate: 6 signals × 3 rules × 12 seeds = 216 runs; × 300
generations × N = 64 = 4.1·10⁶ evaluations; × O(200) dense counting = 8.3·10⁸ (the
plan's figure), or × O(~100) with the ones-list = ~4·10⁸. JS does 10⁸–10⁹ simple
operations per second, so 1–8 s single-threaded and 0.3–2 s across four workers.
Realistic. Two cautions:

- Each run is ~5–40 ms. Make a **job = one run** (or a handful), not Trinary's
  48-run blocks; 216 messages is nothing, and per-run streaming lets the curve fill
  in visibly (the Trinary Lab's best feature).
- The dials scale as `signals × rules × seeds × G_max × N × (e + m + n)`. At a 20×30
  matrix, N = 256, G_max = 1000 the same sweep is ~3·10¹⁰: minutes, not seconds. Show
  the estimated evaluation count next to the Run button and gray it past a budget.

**Message design.** Post the `SweepConfig` once; a job is a flat index `i`, and
the worker derives `(signalIdx, ruleIdx, seedIdx)` by mixed radix and the run seed by
`runSeed(base, i)`; it **builds the planted matrix itself** from `(matrixSeed, signal)`
so no matrix crosses the wire (the trap preset ships its fixture in the config). The
result row is small and fixed:

```ts
interface JobResult {
  i: number; signalIdx: number; ruleIdx: number; seedIdx: number;
  gensToOptimum: number | null;   // null = censored at G_max
  finalBest: number; finalEntropy: number;
}
```

`summarize(rows)` (median, IQR, censored fraction per `(signal, rule)`) is a pure
function in `sweep.ts` with its own test on hand-written rows. Censoring at `G_max`
means a median can itself be censored; the chart should draw that as an arrow, not a
point.

### 4.3 The pool: copy, or promote?

The plan copies `TrinaryStars/lab/pool.ts` and leaves Trinary untouched (branch
safety). That pool is bound to `RunResult`/`EnsembleConfig`/`targetMass`; a generic
`WorkerPool<Cfg, Result>` is ~80 lines and this app is the second consumer. The
repo's ledger already flags near-parallel copies as its top open debt (L5). I would
promote a generic pool to `src/lib/workerPool.ts` in Phase 3 and leave Trinary's
re-pointing as the same "later chore" the plan already schedules for `rng.ts`. If the
session is time-boxed, the copy is acceptable; record it as debt.

### 4.4 Bundle

DOM + SVG, no Three.js, behind `React.lazy`: a few tens of kB. The worker is a
separate Vite chunk. No concern.

## 5 · Verification: the acceptance table audited

| Row | What it tests | Claim or proxy | Fragility | Change |
|---|---|---|---|---|
| Ninety 4×4 values (Pearson 8, Onesie 1 bit, Bernoulli 1 bit/cell, Occam −4.45) | the score formulas on a known cut | the numbers the readouts show: **claim** | none | keep; these are the anchors |
| 8×10 complete vs sparse | same, on a bigger fixture; density sensitivity | claim | none | keep |
| trivial cut → 0 (guard), Occam negative | the guard | claim | none | keep; add "one-row peel is *not* guarded" so the blind spot the explainer promises is real |
| `(z,w)` vs `(1−z,1−w)` equal | complement symmetry | claim | as written it is one example | make it a **property test**: 200 random `(M, cut)` pairs × all seven scores; add **transposition** `S(M,(z,w)) = S(Mᵀ,(w,z))` |
| page-50 trap under modularity (local 0.346, global 0.543) | the trap fixture's definition | claim | none | keep; implement via an exported `isStrictLocalOptimum()` used by the test and by the "Initialize at a cut" readout |
| planted 8×10, ρ_in = 1, ρ_out = 0: `exactOptimum` = the planted cut | the enumerator + the generator | claim | none | also assert **uniqueness** (only the planted cut and its complement attain the max) for the scores where that holds |
| fixed seed → identical trajectory | determinism | claim | none | hash the population after 50 generations; run it for each rule and each fitness mode |
| each rule reaches the optimum within 300 gens, named seed | convergence | **proxy**, and brittle | any RNG-order change flips it; "reaches" undefined (§5.1) | replace with: 12 seeds, ≥ 10 reach a *sustained* rounded-best optimum by G = 300 on ρ_in = 1, ρ_out = 0; per rule |
| Sampled fitness, entropy(100) < entropy(0), fixed seed | canalization | proxy: entropy also falls under drift and under Rounded | one seed | test the **contrast**: mean over 8 seeds, Sampled entropy drop > Rounded entropy drop by a margin — that is claim #2 |
| Prom child `p` = row parent's `p` before mutation | intact transmission | claim, if operators exist | needs `μ = 0` otherwise | test `RULES.prom.mate` directly (§2.1) |

### 5.1 "Reached the optimum" needs a definition

Under Sampled fitness the best *score* in a generation belongs to a sampled cut. A
genome with entries at ½ can sample the optimal cut by luck at generation 12 and never
again. If the Lab records `gensToOptimum = 12` for that run, the mixability curves are
measuring luck. Define the event on a deterministic phenotype: **the first generation
at which the rounded genome of the fittest individual (or the population's rounded
mean genome) scores the exact optimum, sustained for `s` consecutive generations**
(`s = 5` is enough). Put the definition in the explainer next to the chart; it is
the kind of thing a reader will ask.

The same definition should drive the Trace's "converged fraction" readout, so Watch
and Lab agree on what convergence means.

### 5.2 Property tests worth their five lines each

- `blockTable`: `ΣN_ab = e`, `ΣK_ab = mn`, `0 ≤ N_ab ≤ K_ab`, row/column class sizes
  sum to `m`/`n`.
- Bounds: Onesie ≤ 1 bit; Bernoulli ∈ [0, H(e/mn)]; Pearson ≥ 0; Hamming = Cut and
  Run + zeros term (the identity in the plan's own table).
- `exactOptimum` on a random 4×4 equals a brute-force loop over all 2⁸ cuts written
  independently in the test (the enumerator's only real check).
- `runSeed(base, i)` is injective over `i < 10⁴` for a few bases (a collision would
  give two Lab runs the same trajectory).
- Job index bijection in `sweep.ts`: `decode(encode(s, r, k)) = (s, r, k)` for every
  cell.

### 5.3 The statistical tests and CI

Twelve seeds × 300 generations × three rules on an 8×10 is ~7·10⁵ evaluations, well
under a second; the statistical rows are cheap enough for `npm test` on every run.
Set `G_max` and the seed batch in the test so a slower rule (the plan's own hypothesis
says the clonal rule may be slower on mixable landscapes) has room; a rule that fails
its own convergence test on a maximally planted signal is a bug, not a finding.

## 6 · Decisions weighed

### 6.1 Tournament vs fitness-proportional

Endorse tournament for v1: scale-free across scores whose ranges differ by orders of
magnitude (Occam's Invoice is negative, Cut and Run is in edges, the information scores
are in bits), `k = 1` is neutral drift for free, and it composes with Sampled fitness as
"noisy tournament", which is well studied. The MWU reading needs proportional
selection under weak selection; add it later as the second arm of the discriminated
union in §3.5, with a temperature. Not v1, as the plan says.

### 6.2 One sampled phenotype vs averaging

One sample is the mechanism behind claim #2 (entries near ½ are punished because their
offspring are high-variance), so averaging would weaken the very effect the app
teaches. Commit to one, name `samplesPerEval: 1` in the config now, and let a later
slider show the effect fading as samples grow. That is a better lesson than a hidden
constant.

### 6.3 The sex-ratio fallback

Reject the fallback. It is a silent rule change mid-run, it adds a branch and a flag,
and any Lab row that took it is a mixed sample. Assign children's sexes by a **seeded
quota**: exactly `round(N·r)` row-sex, the rest column-sex, order shuffled by the run
RNG. With `0 < r < 1` and `N ≥ 2` both sexes always exist; the sex-ratio slider still
does what it says; determinism is unaffected. If Dan later wants stochastic sex
determination as a feature (drift to extinction is a real phenomenon), add it as an
option with its own honest readout. A one-individual sex is still legal (its
tournament is trivial); document that as the inbreeding corner.

### 6.4 The Rounded fitness toggle

Keep it. It is one branch in `evaluate` and it is the **control** for claim #2: the
canalization curve under Sampled versus its absence under Rounded is the picture, and
§5's contrast test needs it. Its complexity is close to zero; its pedagogical value is
the app's second promise.

### 6.5 Persisting the Lab catalog

CountingTheWays keeps its catalog in memory because a run costs microseconds and
is re-drawable at will. A Split Decision sweep costs seconds and a reload should not
erase it. Persist **config + summary rows** (not per-run traces) with
`usePersistentState`, capped (~40 sweeps, a few kB), stamped with `engine` so a stale
row is dropped rather than misread. Because the config is the replay key, every
persisted row is regenerable with one click ("Re-run"), which is worth more than the
row itself.

### 6.6 Trap fixtures

The plan's operational definition (strict local optimum under all single flips,
verified by enumeration) is the right one and the finding that only modularity traps
the page-50 cut is the kind of correction that earns the test. Ship
`isStrictLocalOptimum(M, spec, cut)` and let the "Initialize at a cut" panel display
"this cut is a strict local optimum under {Judges}" live; the Phase 1 stretch (search
for traps under other scores) becomes a test that walks random 4×4 matrices and logs
what it finds.

### 6.7 Elitism

"No elitism" plus Sampled fitness means the best-so-far can vanish. That is the
right default for the canalization story, but the Trace's `best` will be noisy. Plot
`best` and a running `best-ever` (of the rounded genome, per §5.1); the gap between
them is itself a readout of the sampling noise.

## 7 · Maintainability in six months

- **The `.tsx` is the risk.** CountingTheWays is 672 lines with panels, views and lab
  in one file; the ledger's L5 is exactly that shape. The plan already puts views
  under `views/`; do the same for the six panel bodies (`panels.tsx`) and the Watch
  loop (`useWatchLoop.ts`: refs, rAF, snapshot publishing). Target the main file at
  ~250 lines of wiring.
- **Names.** Plain ids in code, character names in display metadata (§2.2). A
  reader hunting for the Prom rule should find `prom` in `RULES`, and the comment
  should say "Potter–De Jong Prom" once.
- **Config in one type.** `EvolveConfig` is the single object that Watch, the Lab,
  the catalog, the tests and a future share link all speak. Resist per-panel state
  that is not a field of it.
- **Docs that ship with the code.** The draw-order comment in `step`, the "reached"
  definition in `sweep.ts`, and the guard's rationale in `evaluate` are the three
  comments a newcomer needs; the explainer carries the rest.

## Verdict

**Endorse**

- The four load-bearing decisions: pure engine, score registry, seed-as-replay-key,
  workers for the sweep. All match the repo's proven patterns.
- Tournament selection, one sampled phenotype, the Rounded toggle as the control, the
  operational trap definition, storeroom-first shipping, tests named before code.
- Promoting `mulberry32`/`runSeed` to `src/lib/rng.ts` (six private copies exist).
- Watch-mode cost is trivial; Lab cost estimate is realistic at defaults.

**Concerns**

- Rules written as prose/switch arms rather than composable operators; the Prom test
  and every future sex rule pay for it.
- `score(M, cut)` recounts the matrix per score; the guard is replicated per score.
- "Reaches the optimum" is undefined under Sampled fitness; the Lab metric can
  measure luck.
- The sex-ratio fallback silently changes the rule mid-run and contaminates Lab
  samples.
- Named-seed acceptance rows break on any RNG-order refactor and test a proxy.
- No render strategy for a 600-cell animated reorder at 60 gen/s; sort-by-best flickers.
- A second copied worker pool (L5).

**Would change**

1. `evolve.ts`: export `select`/`mate`/`mutate`/`evaluate`; `RULES` as a table; `step`
   as a loop over them; draw order documented; `Math.random` source guard test.
2. `scores.ts`: `score(table, degrees)` over a single `blockTable()`; ones-list
   storage; `isStrictLocalOptimum()` exported.
3. Define "reached" as a sustained rounded-genome optimum; use it in both Watch's
   converged readout and the Lab's metric.
4. Seeded sex quota instead of the fallback; drop the flag.
5. Acceptance: one exact determinism hash; convergence and canalization as seed-batch
   tests with a Rounded control; complement and transposition symmetry as property
   tests; Prom tested through `mate`.
6. Watch loop: rAF with accumulator, population in a ref, one snapshot per frame;
   Arena cells keyed and transform-positioned; sort key = population-mean genome,
   re-sorted ≤ 4 Hz.
7. Lab: job = one run, matrix built in the worker, `JobResult` fixed and small,
   `summarize()` pure and tested, an evaluation-count estimate next to Run, catalog
   persisted as version-stamped config + summary.
8. `EvolveConfig` with `engine`, `samplesPerEval`, and `selection` as a discriminated
   union, so every later addition is additive.

## Self-reflection

1. **What would you do with another session?** Read the drafted spec
   (`split-decision-spec.md`) and the monograph pages the plan cites, to check the
   score formulas' constants (the Occam `−1` term, the modularity normalization)
   against their sources rather than against the plan's own restatement.
2. **What would you change about what you produced?** The operator-model sketch is
   the one place I wrote code; I would have liked to also sketch the rAF loop, since
   the render/sim decoupling is where a copy of CountingTheWays' timer would go wrong
   silently.
3. **What were you not asked that you think is important?** Which of the three cuts
   (sampled phenotype, rounded genome, population consensus) each view shows. The plan
   uses all three without naming them, and the "reached" ambiguity in §5.1 is one
   symptom of that.
4. **What did we both overlook?** A share link. The config-is-the-key design makes
   "copy a URL that replays this run" nearly free, and it is the best way to send Dan a
   surprising Lab result; nothing in the plan mentions it.
5. **What did you find difficult?** Judging the DOM-reorder performance without a
   prototype; the numbers in §4.1 are reasoning, not measurements.
6. **What would have made this task easier?** A one-paragraph statement of the
   RNG draw order and the three cut definitions in the plan itself; both reviews
   would then have been checks rather than proposals.
7. **How did you verify this, and does each passing check test the user-visible
   claim?** Reasoning only, against the repo's existing code (read: the Trinary pool
   and worker, AgenticSorting's reducer and chunked lab, CountingTheWays' timer and
   catalog, DivisionBells' registry, the six `mulberry32` copies, vitest config). The
   cost arithmetic in §4.2 was recomputed by hand. No code was run; the performance
   claims in §4.1 are estimates and should be checked with the Phase 2 build.
8. **Follow-up value:** MEDIUM — the review is complete for the plan as written, but the
   render-strategy numbers and the "reached" definition need a real Phase 1/2 build to
   confirm they hold.
