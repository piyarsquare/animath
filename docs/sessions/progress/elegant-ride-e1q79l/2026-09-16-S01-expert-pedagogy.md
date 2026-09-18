---
kind: three-hats
session: 2026-09-16-S01
date: 2026-09-16
title: "Three hats · Pedagogy — Split Decision: is the picture true?"
branch: claude/elegant-ride-e1q79l
slug: elegant-ride-e1q79l
status: completed
build: n/a
followup: medium
pr: null
app: split-decision
signals: needs-dan, not-live
next: Fold the score fixes (orientation, Occam relative form, reflecting mutation, three-curve entropy, two reference lines) into the plan before Phase 1.
---

# Three hats · Pedagogy — Split Decision: is the picture true?

The math-visualization and pedagogy hat. I read the plan as the person who will teach
from it, re-derived every score by hand and by enumeration, reproduced the page-50 trap
numbers, and ran a small GA (10×10 planted, N=64, 8 seeds, 200 generations) to test the
three dynamical claims before they are drawn as pictures. Scripts: `scores.mjs` and
`evolve.mjs` in the session scratchpad; the numbers below are theirs.

## Plan under review

<details>
<summary>Original request</summary>

```markdown
---
kind: plan
session: 2026-09-16-S01
date: 2026-09-16
title: "Plan — Split Decision: a genetic algorithm that evolves a matrix split, with sex"
branch: claude/elegant-ride-e1q79l
slug: elegant-ride-e1q79l
status: proposed
build: n/a
followup: null
pr: null
app: split-decision, engine
signals: needs-dan, not-live
next: Dan reviews this plan; then a /three-hats pass; then Phase 1 (engine + tests).
---

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
```

</details>

## Executive summary

The plan is teachable and its acceptance numbers are right where I could check them
(4×4: Pearson 8, I₁ = 1 bit, I₂ = 1 bit/cell, Occam −4.45 under the code as written;
sparse 8×10: I₂ = 0.273 with a 9/9 split of the 18 ones; page-50: 0.346 → 0.543
reproduced). Five things need fixing before the pictures are honest:

1. **Two formulas are underspecified in a way that flips signs.** Hamming and
   Newman's Leftovers only give the plan's numbers with `x, y ∈ {±1}`; the plan's `Q`
   is then **2× Barber's modularity**. And "cross-block orientation" means `(z, 1−w)`
   is the *opposite* cut (Cut and Run = −40 on the 8×10), which the engine must state.
2. **The guard as written breaks Occam's Invoice.** Sending the degenerate cut to 0
   makes "no split" (0) beat the 4×4 checkerboard (−4.45). Define Occam *relative to
   the no-split code* instead: the trivial cut is then 0 by construction and the
   checkerboard reads **+3.28 bits saved**.
3. **The exact optimum is not the planted split**, even on the plan's own fixtures:
   on the sparse 8×10, The Full Bernoulli peaks at **0.285** one column away from the
   planted 0.273, and Hamming's optimum is a near-trivial peel (40 vs 36). This is
   the monograph's central point showing up in the app; draw both reference lines.
4. **The canalization curve is confounded by the mutation operator.** Clipping to
   [0,1] piles mass at 0 and 1, so entropy falls under *neutral* selection (k = 1:
   0.725 → 0.61 bits/locus by generation 200). The acceptance test "entropy at
   gen 100 < gen 0" passes with no selection at all. Reflect instead of clip, and show
   the neutral curve. The effect itself is real (k = 2 Sampled: 0.725 → 0.53 with
   reflection) and has two nameable parts.
5. **"The sexual rules converge fast" is half true.** In my runs the Mixer wins
   clearly; the **Prom is the slowest rule everywhere**, because a row half is judged
   against a random passenger column half (random-collaborator evaluation, the known
   weakness of cooperative coevolution). State the hypotheses per rule.

Names and attributions are mostly sound; two are loose (Ford–Fulkerson for a global
vertex cut; Hardy–Weinberg for free recombination, which is Geiringer's theorem) and
one analogy overreaches in a fixable way (the Prom is closer to *doubly uniparental*
inheritance than to mitonuclear, and its passenger half is exactly the *mother's curse*).

## 1 · Score fidelity — do the seven formulas measure what their names claim?

I re-derived each score and enumerated every cut of the three fixtures. The formulas
are right; three need their conventions pinned.

| Judge | Formula as written | Verified value (4×4 checkerboard) | What it actually measures | Fix needed |
|---|---|---|---|---|
| Cut and Run | `N₁₂+N₂₁−N₁₁−N₂₂` | 8 | `e − 2·(edges cut by the vertex bipartition {R₁∪C₂} / {R₂∪C₁})` — a **global** min-cut, not an s–t cut | orientation: `(z,1−w)` scores `−e` on the 8×10; name it |
| Hamming's Full Count | `Cut + (Z₁₁+Z₂₂−Z₁₂−Z₂₁)` | 16 | `mn − 2·d_H(M, T)` for the checkerboard template `T`; equals `xᵀ(J−2M)y` **only with `x,y ∈ {±1}`** | state the ±1 domain; identity `Ham = 2·Cut + (K₁₁+K₂₂−K₁₂−K₂₁)` explains the peel blind spot |
| Pearson's Squint | `Σ (N−E)²/E` on the **ones** table | 8 | `e·φ²` of the aggregated 2×2 table of ones — a **density-blind** association | define `0/0 = 0` for a zero-ones class; note it is near-monotone with I₁ |
| Shannon's Onesie | `I₁` | 1 bit | mutual information of (row class, column class) for a **uniformly random one** | none; say "samples the ones" |
| The Full Bernoulli | `I₂` | 1 bit/cell | mutual information of (cell value, block) for a **uniformly random cell** = block-model log-likelihood ratio / mn | none; say "samples the cells" — this is the pair of sentences that teaches I₁ vs I₂ |
| Newman's Leftovers | `−xᵀ(M − rcᵀ/e)y / e` | 1.0 with ±1 (0.25 with 0/1) | `= Cut/e + (N₁·−N₂·)(N·₁−N·₂)/e²` — the cut score per edge minus what degrees alone predict; **= 2·Q_Barber** (Barber reads 0.5) | pin ±1; either divide by 2 or say "twice Barber's Q" |
| Occam's Invoice | `L₀ − L_cut − L_blk` | −4.45 | a two-part code, but the baseline `L₀` never pays for `e` while the cut code pays for four counts | see §2 |

> [!CAUTION]
> **Orientation.** With rows A / columns B planted as the cross pair, the planted cut
> in the plan's convention is `z = 1_A, w = 1_{B̄}` (rows A in R₁ and the *other*
> columns in C₁), so that `R₁×C₂ = A×B`. `z = 1_A, w = 1_B` is the worst cut for Cut
> and Run, Hamming and Newman (−40, −80, −1 on the 8×10) and the *same* cut for the
> other four (they see an unordered pair of row and column classes). The fixture file
> must carry the planted cut in the app's orientation, and the "(z,w) ≡ (1−z,1−w)"
> acceptance row should gain a second row: "(z,1−w) ≡ (z,w) for Pearson, I₁, I₂,
> Occam; ≠ for Cut, Hamming, Newman." That 2-fold vs 4-fold symmetry matters in §7.

The decomposition identities are worth printing in the Score panel's Note — they are
what make seven judges into three families rather than seven mysteries:

```text
Hamming  = 2·CutAndRun + (K₁₁ + K₂₂ − K₁₂ − K₂₁)        ← rewards big "zero" blocks; loves the peel on sparse M
Newman   = CutAndRun/e + (N₁· − N₂·)(N·₁ − N·₂)/e²      ← the degree correction is what zeroes the trivial cut
Pearson  = e · φ²(ones table);  I₁ = MI(ones table)     ← density-blind twins (sparse 8×10 = complete 8×10 = 1 bit)
I₂       = MI(cell value; block) = G-statistic/(2·mn·ln 2) ← sees density (0.273 vs 1.000)
```

## 2 · The guard and Occam's Invoice

The guard says "a degenerate cut scores the neutral value 0 for every score", and the
acceptance table then excepts Occam ("negative"). The text and the table disagree, and
the text is dangerous:

| Cut | Occam as written | fair baseline (`+log₂(mn+1)`) | **relative to the no-split code** |
|---|---|---|---|
| 4×4 checkerboard | −4.450 | −0.362 | **+3.282** |
| 4×4 trivial | −7.731 | −3.644 | **0** (by construction) |
| 8×10 complete, planted | 39.204 | 45.543 | **51.173** |
| 8×10 sparse, planted (9/9) | −13.719 | −7.379 | **−1.750** |
| 8×10 sparse, best nondegenerate | −12.434 | — | **−0.465** |
| 8×10 sparse, trivial | −11.969 | −5.629 | **0** |

If the guard zeroes Occam at the degenerate cut, "no split" (0) beats the 4×4
checkerboard (−4.45) and the exact optimum of the flagship fixture under Occam becomes
the empty split. The plan's exception avoids that, but only by leaving Occam's trivial
value uncomparable with the other six (all of which read 0 there).

> [!IMPORTANT]
> **Proposed fix.** Define Occam's Invoice as `k = L(no split) − L(cut)`, where
> `L(no split)` is the *same two-part code* applied to the degenerate cut
> (`log₂(m+1) + log₂(n+1) − 1 + log₂(mn+1) + log₂ C(mn, e)`). Then the trivial cut
> is exactly 0 with no guard, the baseline is a complete code of `M` (it pays for `e`),
> and every judge shares the meaning "0 = no better than no split." The 4×4 acceptance
> value becomes **+3.28 bits saved**; the 8×10 complete becomes **51.17**.

Is it a legitimate two-part code? Yes: per block, a uniform code on the count then a
uniform code on the arrangement (within ½·log₂K of the Bernoulli NML), plus a
canonical-representative cut code (the −1 bit is honest if the encoder always emits
the representative with row 0 in R₁). It is deliberately the most conservative judge:
three extra model-cost terms of ~½·log₂K each. The explainer should say so, because
the sparse 8×10 result — *no cut pays for itself; the best nondegenerate cut is still
0.47 bits worse than saying nothing* — is the monograph's "a structural split, an
optimizer's best contrast and a calibrated departure are three different things" made
visible in one number. That is a payload, not a footnote.

## 3 · The optimum is not the planted split — draw two lines

Enumeration of the plan's own fixtures (nondegenerate cuts):

| Fixture | Judge | Planted cut | Exact optimum | Where |
|---|---|---|---|---|
| 8×10 sparse | The Full Bernoulli | 0.273 | **0.285** | moves one column across |
| 8×10 sparse | Hamming's Full Count | 36 | **40** | the near-trivial peel `R₁ = 7 rows, C₁ = 9 cols` |
| 8×10 sparse | Cut and Run, Pearson, I₁, Newman | 18 / 18 / 1 / 1 | ties | a zero-degree column can sit in either class |
| 8×10 complete | all seven | — | planted (unique for Cut/Ham/Newman; 2 orientations for the rest) | ✓ the acceptance row holds |

Three consequences for the pictures:

- **The Trace needs two reference lines**: *planted* (the structural split's score) and
  *exact optimum* (the Bailiff). When they differ, the viewer is looking at the
  optimizer-vs-structure gap. When the GA ends above the planted line, that is not a
  bug; it is the lesson.
- **The Arena needs a "show planted" outline** (a faint boundary of the planted classes
  in the sorted order) so the evolved contrast and the planted structure can be
  compared by eye.
- **Hamming's blind spot deserves a fixture, not a footnote**: "on the sparse pair,
  Hamming prefers peeling one row and one column and calling everything else zero."
  Verified. That is also why Hamming's trivial-cut value in the table
  (`e − (mn − e)`) depends on *which* trivial cut: `R₁ = all, C₁ = all` scores
  `mn − 2e`, which is **positive** on any sparse matrix. The guard is needed there for
  a different reason than the plan gives (it is the template's zero-fit, not "zero
  violations").
- **Ties and zero-degree lines**: under the four ones-only judges, a zero-degree row or
  column has *no* selection pressure, so its genotype entry drifts and never
  canalizes. The entropy curve will not go to zero on such fixtures; the explainer
  should say "Cut and Run cannot see an empty row" and the Arena hover should show it.

## 4 · Canalization — real, but the plan measures it with a confound

I ran the Monastery on a 10×10 planted matrix (ρ = 1/0, shuffled), N = 64, μ = 0.1,
σ = 0.1, Cut and Run, 8 seeds, 200 generations. Mean genome entropy per locus, bits
(the uniform initialization gives `1/(2 ln 2) = 0.721`, measured 0.725):

| Condition | gen 0 | gen 100 | gen 200 | Reading |
|---|---|---|---|---|
| neutral `k = 1`, **clip** | 0.725 | 0.655 | 0.613 | entropy falls with **no selection** — the clipping atoms at 0 and 1 |
| neutral `k = 1`, **reflect** | 0.725 | 0.728 | 0.704 | flat: the honest null |
| `k = 2` Rounded, reflect | 0.725 | 0.705 | 0.653 | a weak drop with no sampling noise — selection for *mutational* robustness |
| `k = 2` Sampled, reflect | 0.725 | 0.588 | 0.532 | the plan's effect, net of the artifact |
| `k = 2` Sampled, clip | 0.725 | 0.470 | 0.355 | effect + artifact, inseparable |
| `k = 4` Sampled, reflect | 0.725 | 0.533 | 0.479 | stronger selection, faster |

> [!WARNING]
> The acceptance row "Sampled fitness: entropy at generation 100 < generation 0" is
> satisfied by the neutral clipped run (0.655 < 0.725). It tests the mutation
> operator, not canalization. Replace it with "entropy(Sampled, k=2) at gen 100 <
> entropy(k=1) at gen 100 by more than the seed spread", and use a **reflecting**
> (or logit-space) mutation so the neutral curve is flat.

Reasoning about the mechanism, since the app claims it: with one sampled phenotype per
evaluation, a genotype with entries at ½ is a lottery over cuts. *Near the optimum* a
sharp genotype's value is the ceiling, so any fuzz can only lose: fuzzy genotypes
lose tournaments — the plan's story is right there. *Far from the optimum* the picture
is subtler: tournament selection takes the max of `k` draws, which rewards variance
when means are comparable, so early on fuzz is a mild asset (exploration by lottery).
Expect the entropy curve to be flat or slightly rising for the first generations and
to fall once the population finds the basin. That is worth saying in the explainer,
because it is the difference between "annealing" (a schedule) and canalization (a
consequence).

The **Rounded** row is a gift: it shows a second, distinct canalization with no
sampling noise at all — an entry near ½ is one mutation from a sign flip, so lineages
whose entries sit far from ½ are more mutationally robust ("survival of the flattest").
So the Trace can carry three curves from one seed and name the gaps:

```text
neutral (k=1) ─── Rounded ─── Sampled
             ↑ genetic       ↑ environmental
        canalization      canalization
   (robustness to mutation)  (robustness to developmental noise)
```

Both are Waddington's word; Hinton & Nowlan's 1987 "?" alleles being replaced by fixed
alleles once the answer is found is the closest computational ancestor of "the genome
makes up its mind" and belongs in the sources.

One more readout hygiene point: `Σ H(p_i)` averaged over individuals measures
*within-genome* sharpness; it says nothing about *between-individual* diversity (a
converged population of sharp clones and a diverse population of sharp individuals
read the same). Show a second number, the entropy of the population-mean genome
`Σ H(p̄_i)`, and the Population strip stays honest about which is falling.

## 5 · The race and the mixability hypothesis

Same setup, `k = 2`, Sampled, reflecting mutation; "reached" = some individual's
**rounded** cut hits the exact optimum within 200 generations (8 seeds):

| Landscape | Monastery | Mixer | Prom |
|---|---|---|---|
| Cut and Run, ρ = 1/0 | 3/8 | **7/8**, median gen 45 | 1/8 |
| Cut and Run, ρ = 0.8/0.2 | 3/8 | **5/8**, median 69 | 1/8 |
| The Full Bernoulli, ρ = 1/0 | 8/8, median 103 | **8/8**, median 35 | 6/8, median 157 |

Parameters are mine (the plan sets none) and 8 seeds is a smoke test, not a result.
But the pattern is stable across all three landscapes and it splits the plan's
hypothesis 3 in two:

- **Mixer > Monastery on a mixable landscape**: supported, cleanly. This is the
  Fisher–Muller advantage of recombination (Fisher 1930; Muller 1932) dressed as
  mixability. On the planted checkerboard fitness is close to additive across loci
  *once a convention is fixed* (§7), which is precisely the regime where uniform
  crossover combines independently found good rows and good columns.
- **The Prom is not a fast sexual rule; it is the slowest rule.** A row-sex parent's
  `p` is judged with whatever `q` it happened to inherit, and the child's `q` is a
  different one. Selection on rows therefore sees the *average* quality of a row half
  over the column population — early on, noise. This is the random-collaborator
  problem of cooperative coevolution (Potter–De Jong with random rather than best
  collaborators), on top of Sampled-phenotype noise, on top of an effective population
  of N/2 per half. The Prom's interesting comparisons are *Prom vs Mixer* (what intact,
  uniparental transmission costs) and the trap escape (§6), not the signal sweep.

> [!IMPORTANT]
> **State the hypothesis per rule, falsifiably.** H1: at signal ≥ s₀, the Mixer's
> survival curve (fraction of seeds at the optimum by generation g) dominates the
> Monastery's, same N, μ, σ, k. H2: the Prom is slower than the Mixer at every signal
> and converges to single-side-stable cuts (Nash points of the row/column game) more
> often than the Monastery. H3 (trap): started at a strict single-flip local optimum,
> escape ability orders Monastery ≥ Mixer > Prom — because uniform crossover *can*
> assemble a row flip and a column flip from two parents, whereas the Prom's child
> only ever carries one lineage's rows and another's columns, and each flip alone is
> deleterious. The plan's "clonal rule, the only one that mutates both halves in one
> lineage, should win" overstates the Mixer's handicap.

**Generations-to-optimum is the wrong summary statistic** when runs censor at
`G_max` — a median is undefined once more than half the seeds censor (the Prom column
above), and an IQR band on censored data reads as precision it does not have. Plot
**survival curves** (reached-by-g per rule; Kaplan–Meier is exactly right for censoring)
and report the censored fraction and the final gap-to-optimum distribution alongside.
Also define "reached" on the best individual's *rounded* cut, never on a sampled
fitness value (a fuzzy genotype can sample the optimum by luck; with no elitism it can
also lose it next generation — plot best-rounded fitness, not best-sampled).

## 6 · The Prom — what it actually implements, and the biology

Does tournament selection within each sex implement what Dan described? Yes:
"one sex passes on rows, the other columns" is exactly `p` from a row-sex tournament
winner and `q` from a column-sex tournament winner, intact. Two things the plan should
add to keep it honest:

- **Mutation of the passenger half is fitness noise.** The child mutates its whole
  genome, but a row-sex child's mutated `q` is never transmitted; it only perturbs the
  evaluation of its `p`. Say so, or mutate only the transmitted half (a cleaner
  experiment: then the Prom's *only* difference from the Mixer is the transmission
  rule).
- **The Prom's fixed points are the alternating-optimization traps.** A population
  where no single-side change of the row half improves fitness against the column
  population (and vice versa) is a Nash equilibrium of the two-player game whose payoff
  is the score — and a cut stable under all single-side moves is precisely the
  monograph's Two-Step trap. That is the real link between the Prom and the
  monograph, and the trap preset is where it shows. Cooperative coevolution's
  convergence to Nash points rather than global optima (the "relative
  overgeneralization" literature: Wiegand's 2004 dissertation; Panait, Luke & Wiegand,
  mid-2000s; Panait 2010) is the theory to cite once checked.

**The mitonuclear analogy overreaches in one place and undersells in another.** In
mitonuclear coadaptation the nucleus is biparental and recombining; only the
mitochondrion is uniparental. The Prom makes *both* halves uniparental, through
opposite sexes. The literal biological shape of that is **doubly uniparental
inheritance** (the M and F mitochondrial lineages of *Mytilus* mussels, Zouros and
colleagues, mid-1990s) or the conifers, where the chloroplast is paternal and the
mitochondrion maternal (Pinaceae; Neale & Sederoff, late 1980s). Meanwhile the
passenger half is exactly the **mother's curse** (Frank & Hurst 1996; Gemmell, Metcalf
& Allendorf 2004): a mutation in `q` that hurts row-sex individuals is invisible to
`q`'s own evolution, because row-sex individuals never transmit `q`. The plan's
self-reflection asks for a "heritable vs passenger fitness contribution" readout; that
readout *is* the mother's-curse experiment, and the named reader will recognize it.
Keep the mitonuclear sentence as the hook, but let the sources block name the closer
shapes. All four citations above are from memory and must be checked before the
explainer ships.

## 7 · Symmetry: conventions, canonical form, and what "mean genome" means

Every optimum comes in two labelings — `(z,w)` and `(1−z,1−w)` — and under the four
orientation-blind judges in **four** (`(z,1−w)` too). A Mixer child of two parents in
opposite conventions inherits a scrambled cut; a Prom child whose row parent and
column parent hold opposite conventions gets exactly the worst cut. This is the
"competing conventions" problem of GAs (Radcliffe; Schaffer, Whitley & Eshelman, early
1990s). I expected it to sink the sexual rules. It did not, at N = 64: the population
breaks the symmetry by drift within a few generations and hybrids are purged (free vs
gauge-fixed Mixer: 7/8 vs 6/8 reached, medians 45 vs 62). So it is not a race confound
at this size. It *is* a readout confound:

- The population-mean genome is ½ everywhere if half the population holds each
  convention, so any "consensus" strip, entropy of the mean genome, or "converged
  fraction" is meaningless without **canonicalization for display** (flip an
  individual's `(p,q)` so that `p₀ ≥ ½`; under the orientation-blind judges also flip
  `q` so `q₀ ≥ ½`). Cheap; do it in the views, not the engine.
- "Initialize at a cut" for trap experiments and any future structured-population or
  restart feature will re-create mixed conventions on purpose; then the Prom's two
  sexes each have to settle the *same* convention — a coordination game with two pure
  equilibria, which is a signaling-game story the named reader would enjoy. That is a
  Later item, but the engine should keep a "convention fraction" stat from day one so
  it can be plotted when the time comes.
- The Arena tinting the two cross blocks in `--data-1` / `--data-2` "under the best
  individual's rounded cut" will **swap colors** whenever the best individual changes
  convention. One more reason for a single cross tint (§10).

## 8 · What the viewer sees — Arena, Population, Trace

**First ten seconds.** A matrix of noise, press play, blocks emerge. Good hook, with
three conditions that the plan does not state:

1. **The generator must shuffle rows and columns.** If the planted classes are stored
   contiguously, turning "sort" off shows the checkerboard at generation 0 and the
   reveal is fake. Store the permutation; display in stored order; sort reveals.
2. **The default fixture must be big enough to take a visible while.** The 4×4 is
   solved before the eye adjusts; the 8×10 at ρ = 1/0 in a few generations. A 10×10
   planted at ρ ≈ 0.9/0.1 keeps `m + n = 20` (the Bailiff still runs) and takes tens
   of generations at N = 64. A stretch that would lift the Bailiff limit for the three
   linear judges (Cut, Hamming, Newman): enumerate `z` only and solve each column's
   `w_j` by best response — `2^(m−1)·mn` instead of `2^(m+n−1)`, so 16×40 is exact.
3. **Sort by the population, not by "the best genome".** Under Sampled fitness the
   best-of-generation is a noisy label and can change convention; a sort keyed on it
   will jitter and occasionally flip the whole picture. Key the sort on the
   canonicalized population-mean genome with a short EMA (or hysteresis: only re-rank a
   row when its key crosses a neighbor's by a margin). The row/column bar strips then
   show `p̄_i` with a whisker for the interquartile spread — that is the one place
   population diversity becomes visible *in the Arena*, and it answers "does reordering
   hide diversity" with "no, the whiskers are the diversity".

**Population view.** Sorting individuals by fitness with opacity by rank is fine; add
the canonical flip so the strips read as one convention, and mark sex by *shape* (a
filled vs outlined bar end, or the letters R/C in the strip label), never by hue alone
(StableMatching's square-vs-circle is the house precedent).

**Trace.** Four lines, two shaded: best-rounded and mean fitness; the *planted* and
*exact-optimum* reference lines; and the entropy sparkline with its neutral twin
(§4). If a shadow `k = 1` population is too costly on phone, precompute the neutral
entropy curve once per (μ, σ, operator) — it does not depend on the matrix.

## 9 · Names and attributions

| Name | Attribution in plan | Verdict | Suggested wording |
|---|---|---|---|
| Cut and Run | min-cut (Ford–Fulkerson 1956) | loose: FF is the s–t max-flow/min-cut theorem; this score is a global vertex-bipartition cut | "min-cut (the cut side of Ford & Fulkerson's 1956 theorem; as a partition objective, Kernighan & Lin 1970)" |
| Hamming's Full Count | Hamming 1950 | ✓ Hamming distance to the checkerboard template | add "`x,y ∈ {±1}`" |
| Pearson's Squint | Pearson 1900 | ✓ | say "chi-square of the *ones* table (`e·φ²`)" so the density blindness is not a surprise |
| Shannon's Onesie | Dhillon, Mallela & Modha 2003 | ✓ exact: their loss in MI between row and column clusters, ones as mass | — |
| The Full Bernoulli | "stochastic block model" | ✓ but uncited | Holland, Laskey & Leinhardt 1983 for the SBM; the score is its log-likelihood ratio per cell |
| Newman's Leftovers | Newman & Girvan 2004; Barber 2007 | ✓ names; normalization is 2× Barber | "twice Barber's Q; the ½ ceiling of two equal modules reads 1 here" or divide by 2 |
| Occam's Invoice | Rissanen 1978 | ✓ (two-part codes; Wallace & Boulton 1968 is the older cousin) | — |
| Muller's Monastery | Muller 1964 | ✓ real (the ratchet) but the race's ancestor is Muller 1932 / Fisher 1930 | "Muller 1932 (why sex speeds adaptation); Muller 1964 (the ratchet)" |
| Hardy–Weinberg Mixer | Hardy 1908; Weinberg 1908 | defensible for "random mating"; HW is one-locus genotype frequencies, while free recombination → linkage equilibrium is **Geiringer 1944** | keep the name; credit Geiringer in the sources |
| Potter–De Jong Prom | Potter & De Jong 1994 | ✓ (PPSN III); the Prom is a one-population variant with the passenger half as the collaborator | say "a variant" |
| Tarjan's Handshake | (implied Tarjan 1972) | whimsical; connectivity by DFS predates him (Hopcroft & Tarjan 1973 for linear time) | fine as a joke; do not claim invention |
| Mixability / MWU | Livnat et al. 2008; Chastain et al. 2014 | ✓ both PNAS; MWU needs weak selection + fitness-proportional (plan notes it) | — |

No fabricated citations found. The plan's own hedges (Wiegand/Panait/Luke; Rand, Haney
& Fry 2004) are correctly hedged. Additional sources the explainer's closing block
should consider, all from memory and to be checked: Waddington 1942 (canalization);
Hinton & Nowlan 1987 (learning guiding evolution — the "?" alleles); Wilke et al. 2001
(survival of the flattest, for the Rounded gap); Baluja 1994 PBIL and Harik, Lobo &
Goldberg 1999 compact GA (probability-vector genotypes — the nearest computational
relatives of this genome); Hartigan 1972 (direct clustering of a data matrix — the
two-way split as biclustering); the DUI and mother's-curse pointers of §6. The
explainer should say, in the house style, that the app was *reached* from the
monograph and Dan's "maybe even have sex", and *lands near* these.

## 10 · Accessibility and honesty of the eye candy

- **Block tints.** `--data-1` vs `--data-2` is blue vs teal in Observatory and mint vs
  green in one skin — not a CVD-safe pair everywhere, and the two cross blocks play the
  *same* role. Use **one** cross tint and rely on position (after sorting, the blocks
  are where they are); diagonal blocks unwashed. That also removes the color swap of
  §7. Sexes: shape or glyph, hue as a bonus only.
- **Ones in `--fg`** is right; on phone the cell glyph must survive at ~8px — a filled
  square, not a dot.
- **Animated reordering** is the one piece of motion that carries meaning; every other
  animation (opacity by rank, sparkline growth) should be static-if-reduced-motion.
- **Numbers that mislead by precision**: Occam in bits to two decimals is honest; I₂
  to three decimals on a 4×4 is not. Show two significant figures in the StatGrid and
  full precision on hover.
- **The "hypothesis under test" banner** in the Lab must show the *current* result
  next to the prediction ("predicted: Mixer < Monastery; observed: 7/8 vs 3/8 at
  ρ = 1/0"), so the app never reads as asserting what it measures.

## Verdict

**Endorse**

- The framing: rule = experiment, score = landscape; three things to see; the
  hypothesis labeled as such. This is the right shape for a sophisticated audience.
- The seven-judge registry with `blindSpot` as a first-class field, and dropping
  Fisher's Tea Party and Solomon's Split.
- Sampled-phenotype fitness as the canalization mechanism (it is real: 0.725 → 0.53
  bits/locus against a flat neutral of 0.70 in my runs) and the Rounded toggle as its
  control — which turns out to be a second, distinct canalization.
- The Prom as designed: intact halves, tournaments within sex, sex drawn at ½, the
  passenger half named as "the point". The mother's-curse readout from the plan's own
  self-reflection should be promoted into Phase 2.
- The Bailiff, the trap fixtures defined operationally, and the page-50 modularity
  numbers (reproduced exactly; e.g. `M = 1101/1110/1010/0100` with the stated cut).

**Concerns**

- `x, y ∈ {±1}` is nowhere stated; Newman's Leftovers is 2× Barber's Q; orientation
  `(z,1−w)` is a different cut for three judges and the same cut for four.
- The guard's "0 for every score" would make "no split" the Occam optimum of the
  flagship fixture. The acceptance table's exception papers over a design flaw.
- The canalization acceptance test passes under neutral selection because clipping
  creates atoms at 0 and 1.
- "The sexual rules converge fast" lumps the Mixer (true) with the Prom (slowest rule
  in every run). Median generations-to-optimum is undefined for the Prom column.
- Sorting the Arena by "the best genome" jitters, can flip convention, and hides
  diversity; tinting two symmetric blocks in two hues swaps colors and is not CVD-safe
  in every skin.
- The reference line "exact optimum" will sit above the planted score on the plan's
  own sparse fixture; without a *planted* line the viewer will read that as failure.
- Two attributions are loose (Ford–Fulkerson, Hardy–Weinberg) and the mitonuclear
  analogy names the wrong biological shape while missing the right one.

**Would change**

1. Pin `x, y ∈ {±1}` in `scores.ts`; carry the planted cut in the app's orientation;
   add the `(z,1−w)` symmetry row to acceptance (equal for four judges, not three).
2. Occam's Invoice relative to the no-split code (trivial = 0 by construction;
   4×4 = +3.28, 8×10 complete = 51.17, sparse best = −0.47 < 0 — the monograph's point).
3. Reflecting (or logit-space) mutation; three-curve entropy (neutral · Rounded ·
   Sampled); acceptance test against the neutral run; population-mean-genome entropy as
   a second readout.
4. Two reference lines (planted, exact optimum); "show planted" outline in the Arena;
   Hamming's peel on the sparse pair as a named fixture.
5. Hypotheses H1–H3 per rule; survival curves instead of median ± IQR; "reached" on
   the rounded cut; best-rounded fitness in the Trace.
6. Canonicalize genomes for display (`p₀ ≥ ½`, and `q₀ ≥ ½` for orientation-blind
   judges); sort the Arena on the smoothed population mean with whiskers; one cross
   tint; sex by shape; shuffle in the generator; default 10×10 at ρ ≈ 0.9/0.1.
7. Mutate only the transmitted half in the Prom (or say the passenger mutation is
   evaluation noise); keep a convention-fraction stat.
8. Attribution wording per §9; sources block gains Geiringer, Fisher/Muller 1932,
   Hinton & Nowlan, Waddington, PBIL/cGA, Hartigan, SBM, and the DUI / mother's-curse
   pointers, each flagged "check before shipping" until someone does.

## Self-reflection

1. **What would you do with another session?** Rerun the race with the plan's
   eventual defaults and 30+ seeds per cell, add the Prom with transmitted-half-only
   mutation, and test the mixed-convention initialization to see whether the Prom's
   two sexes can settle a convention at all. Then search the 4×4 space for trap
   fixtures under the other six judges (the modularity search took seconds).
2. **What would you change about what you produced?** The simulation uses my own μ,
   σ, N and only 8 seeds; the *ordering* Mixer > Monastery > Prom was stable across
   three landscapes, but the medians are not numbers to quote. I also assumed the
   sparse 8×10 splits its 18 ones 9/9 because that reproduces the plan's 0.273; the
   monograph's actual matrix may differ in ways that change the Hamming/I₂ optima
   (though not the lesson).
3. **What were you not asked that you think is important?** Whether the Watch mode
   should expose the *sampled* cut at all. Under Sampled fitness the phenotype the
   score saw is not the rounded genome the Arena draws; a "show sampled phenotype"
   flicker for the best individual would make the canalization mechanism visible
   rather than inferred from a sparkline.
4. **What did we both overlook?** Zero-degree rows and columns: four judges cannot
   see them, so their genotype entries never canalize and the entropy floor is
   fixture-dependent. The explainer needs one sentence and the entropy readout should
   exclude or mark them. Also the Prom's effective population size (N/2 per half)
   makes the three rules unequal at the same N; matching evaluations per generation
   is fair, matching lineages is not, and the Lab should say which it matches.
5. **What did you find difficult?** Separating "the sexual rules" into two very
   different objects. The plan's hypothesis reads naturally until you run the Prom
   and it comes last; the reason (random-collaborator evaluation) is textbook once
   seen, but the plan's language would have led Phase 3 to report it as a surprise.
6. **What would have made this task easier?** The 8×10 sparse matrix and the page-50
   matrix quoted in the plan (I reconstructed both from the acceptance numbers), and
   the plan's default μ, σ, N so the simulation matched what Phase 1 will build.
7. **How did you verify this, and does each passing check test the user-visible
   claim?** Enumeration (`scores.mjs`) for every fixture value, the exact optima,
   the Occam variants and the page-50 search; simulation (`evolve.mjs`, 8 seeds) for
   the entropy and race claims; reasoning only for the attributions and the biology
   pointers (all flagged as to-check). Nothing user-visible exists yet, so the
   visual recommendations (sort hysteresis, tints, whiskers) are reasoning only —
   `visual-unverified` will apply once Phase 2 renders them.
8. **Follow-up value:** MEDIUM — the fixes are concrete and cheap, but the race
   numbers need a proper sweep with the real engine before the Lab's hypothesis text is
   written, and the four biology citations need a check before EXPLAINER.md ships.
