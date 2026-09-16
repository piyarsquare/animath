---
kind: three-hats
session: 2026-09-16-S01
date: 2026-09-16
title: "Three hats — convergence analysis of the Split Decision plan"
branch: claude/elegant-ride-e1q79l
slug: elegant-ride-e1q79l
status: completed
build: n/a
followup: null
pr: null
app: split-decision, engine
---

# Three hats — convergence analysis of the Split Decision plan

Synthesis of the three independent reviews of the Split Decision plan:
[Framework Maintainer](2026-09-16-S01-expert-maintainer.md) ·
[Architecture Consultant](2026-09-16-S01-expert-consultant.md) ·
[Math-Viz & Pedagogy](2026-09-16-S01-expert-pedagogy.md). Each was written without
sight of the others. Where all three land on the same point we treat it as settled;
where they diverge, the decision is recorded here with its reason. The decisions are
folded into the plan as a dated **Revisions after three-hats** section.

## Plan under review

<details><summary>Original request (the plan as reviewed, verbatim, blockquoted)</summary>

> 
> # Plan — Split Decision: a genetic algorithm that evolves a matrix split, with sex
> 
> A new self-contained app, `src/animations/SplitDecision/`, route `#/split-decision`.
> A population of genotypes evolves a two-way split of a binary matrix (rows = cells,
> columns = variants) under one of several **selection scores**, some of them
> information-theoretic. The experiment is the **reproductive rule**: clonal, sex by
> swapping, or **two sexes that each transmit one half of the genome** (one sex passes
> on the row half, the other the column half). The app exists to watch those three
> rules race on the same landscape and to show where they differ.
> 
> This plan replaces the drafted spec (`split-decision-spec.md`, 2026-09-16, written by
> an agent from a conversation about the monograph *Bipartite Homomorphism and
> Regularization*, 13 September 2026). Dan clarified the intent in this session: the
> evolutionary dynamics are the subject; the monograph's statistical machinery (null
> ladder, calibration protocols, the Kraft bound) recedes to a later phase or another app.
> 
> > [!IMPORTANT]
> > **Decisions locked (Dan, 2026-09-16):** (1) The two-sex rule passes the inherited
> > half **intact** (no recombination within a sex); more sex rules can be added later.
> > (2) No null ladder, samplers, calibration protocols, or Kraft bound in the first
> > version. (3) No sonification. (4) Keep the name *Split Decision* and the
> > humor-plus-history character names from the spec for the scores and rules.
> 
> ## Session purpose
> 
> Read the drafted spec and the monograph, find out what Dan actually wants, and write
> the plan for it. No construction this session.
> 
> ## Previous session
> 
> First tracked session on this branch.
> 
> ## What the app is for
> 
> **One sentence:** a population evolving a split of a matrix, where the reproductive
> rule is the experiment and the selection score is the landscape.
> 
> **Three things a viewer should see:**
> 
> 1. **The matrix sorts itself.** With rows ordered by the best genome's row
>    probabilities and columns by its column probabilities, a planted checkerboard
>    emerges from noise as the population evolves. The split is never drawn as a line;
>    it is a reordering that makes the blocks visible.
> 2. **The genome makes up its mind.** Under fitness evaluated on a *sampled* phenotype,
>    genotype entries near ½ produce high-variance offspring, and selection pushes them
>    toward 0 or 1. The population's average genome entropy falls: canalization,
>    without anyone scheduling an annealing.
> 3. **The three rules race.** On a strongly planted signal the sexual rules should
>    converge fast (good rows are good against nearly any column set: a "mixable"
>    landscape). Where the optimum needs a coordinated row-and-column move, the clonal
>    rule, the only one that mutates both halves in one lineage, should win.
> 
> The third item is a **hypothesis under test** and is labeled as such in the UI. It
> comes from the mixability argument (Livnat, Papadimitriou, Dushoff & Feldman 2008)
> and the multiplicative-weights reading of sex (Chastain, Livnat, Papadimitriou &
> Vazirani 2014). The app measures it; it does not assert it.
> 
> **The hook for a mitochondrially minded audience.** The two-sex rule is uniparental
> inheritance of one genome component: rows pass through one sex only, columns through
> the other, and fitness accrues to the pair. That is the shape of mitonuclear
> coadaptation, two genomes with separate transmission that must coordinate. The
> explainer says this once, as an analogy, and leaves the biology to the reader.
> 
> ## The model (what the engine implements)
> 
> ### Matrix and cut
> 
> - `M ∈ {0,1}^{m×n}`, row degrees `r`, column degrees `c`, total ones `e`.
> - A **cut** `h = (z, w)`, `z ∈ {0,1}^m`, `w ∈ {0,1}^n`. `R₁ = {i : z_i = 1}`, `C₁ = {j : w_j = 1}`.
> - **Block counts** `N_ab` and **capacities** `K_ab = |R_a|·|C_b|`. Aggregated table
>   margins `N_a·`, `N_·b` are *not* the degree vectors; keep `{r, c, e}` and `{N, K}`
>   as two separately typed structures (the monograph's page-23 distinction).
> - The cross-block orientation is `R₁×C₂` and `R₂×C₁`. Cuts `(z, w)` and `(1−z, 1−w)`
>   name the same split; readouts treat them as equal.
> - A cut with an empty class on either side is **degenerate**.
> 
> ### Genotype, phenotype, fitness
> 
> - **Genotype** `g = (p ∈ [0,1]^m, q ∈ [0,1]^n)`: the probability of putting each row
>   in `R₁` and each column in `C₁`. Initialized i.i.d. uniform on [0,1].
> - **Phenotype**: one cut sampled `z_i ~ Bernoulli(p_i)`, `w_j ~ Bernoulli(q_j)`.
> - **Fitness** `F(g) = S(M; h)` for the chosen score `S`, with `h` drawn fresh at each
>   evaluation (**Sampled**, the default) or taken as the rounded genome `z_i = [p_i > ½]`
>   (**Rounded**, deterministic ascent; a toggle for contrast).
> 
> ### Selection scores (the Judges)
> 
> A registry in `scores.ts`: `{ id, name, historicalName, formula, blindSpot, score(M, cut) }`.
> Log-space for entropies; `0·log 0 = 0`; `H(θ)` the binary entropy in bits.
> 
> | Name | History | Score | Trivial cut scores |
> |---|---|---|---|
> | **Cut and Run** | min-cut (Ford–Fulkerson 1956) | `N₁₂ + N₂₁ − N₁₁ − N₂₂` | `e` (needs the guard) |
> | **Hamming's Full Count** | Hamming loss (Hamming 1950); the monograph's complete-template objective `xᵀ(J−2M)y` | Cut and Run, plus zeros counted as evidence: `(N₁₂+N₂₁−N₁₁−N₂₂) + (Z₁₁+Z₂₂−Z₁₂−Z₂₁)` with `Z_ab = K_ab − N_ab` | `e − (mn − e)` (needs the guard) |
> | **Pearson's Squint** | Pearson 1900 | `Σ (N_ab − E_ab)² / E_ab`, `E_ab = N_a·N_·b / e` | 0 (degenerate margins) |
> | **Shannon's Onesie** | information-theoretic co-clustering (Dhillon, Mallela & Modha 2003) | `I₁ = Σ (N_ab/e) log₂[(N_ab/e) / ((N_a·/e)(N_·b/e))]`, at most 1 bit | 0 |
> | **The Full Bernoulli** | block-Bernoulli likelihood ratio (stochastic block model) | `I₂ = H(e/mn) − Σ (K_ab/mn) H(N_ab/K_ab)` bits per cell | 0 |
> | **Newman's Leftovers** | modularity (Newman & Girvan 2004; Barber 2007 for bipartite) | `Q = −xᵀ(M − rcᵀ/e)y / e` | 0 |
> | **Occam's Invoice** | minimum description length (Rissanen 1978) | bits saved `k = L₀ − L_cut − L_blk` with `L₀ = log₂ C(mn, e)`, `L_cut = log₂(m+1) + log₂ C(m,|R₁|) + log₂(n+1) + log₂ C(n,|C₁|) − 1`, `L_blk = Σ [log₂(K_ab+1) + log₂ C(K_ab, N_ab)]` | negative |
> 
> **The guard.** The two edge-count scores award their maximum to the trivial cut
> (everything in one block: zero violations, empty classes). Rule: a degenerate cut
> scores the score's **neutral value 0** for every score. The four information and
> modularity scores already give 0 there by construction; the guard only bites Cut and
> Run and Hamming. Near-trivial cuts (one peeled row) remain scoreable; that is those
> scores' honest blind spot and the app lets it show.
> 
> **Dropped from the spec's roster:** Fisher's Tea Party (a tail probability, not a
> score to climb) and Solomon's Split (a size constraint, not a score; a balance
> constraint may return later as a phenotype repair step).
> 
> ### Reproductive rules (the Worlds)
> 
> Non-overlapping generations, population size `N`, no elitism. **Selection** is
> tournament selection of size `k` (the "selection strength"; `k = 1` is neutral
> drift), chosen because it is scale-free across scores with very different ranges.
> **Mutation**: each locus, with probability `μ`, moves by `Normal(0, σ)` and is clipped
> to [0,1].
> 
> | Name | History | Rule |
> |---|---|---|
> | **Muller's Monastery** | clonal reproduction (Muller 1964) | one parent; child = parent + mutation. The only rule that can move a row entry and a column entry together in one lineage in one step. |
> | **Hardy–Weinberg Mixer** | random mating (Hardy 1908; Weinberg 1908); MWU reading of sex (Chastain et al. 2014) | two parents; uniform crossover per locus over the whole `(p, q)`; then mutation. |
> | **Potter–De Jong Prom** | cooperative coevolution (Potter & De Jong 1994) | every individual carries a full `(p, q)` **and a sex** ∈ {row, column}. Mating pairs one row-sex parent with one column-sex parent, each chosen by a tournament within its sex. Child: `p` from the row-sex parent, `q` from the column-sex parent, **both intact**; then mutation. Child's sex: Bernoulli with the sex-ratio parameter (default ½). |
> 
> In the Prom, a row-sex individual's `q` is a passenger: it affects that individual's
> fitness but is never transmitted by it. That asymmetry is the point.
> 
> ### Fixtures and generators
> 
> - **Planted checkerboard** (generator): `m, n, |R₁|, |C₁|`, cross-block density
>   `ρ_in`, diagonal-block density `ρ_out`, seed. Signal = `ρ_in − ρ_out`. The Lab's
>   x-axis.
> - **The 8×10 pair** (monograph page 46, quoted verbatim): complete (40 edges) and
>   sparse (18 edges). Same structure, different density.
> - **The Ninety's observed matrix** (monograph page 47): the 4×4 with two complete
>   2×2 cross-blocks. Small enough to enumerate every cut.
> - **Trap fixtures**: a `(matrix, score, cut)` triple where the cut is a strict local
>   optimum under every single-locus flip but not the global optimum, verified by
>   enumeration in a test. See the finding below on why the monograph's page-50 example
>   qualifies only for one score.
> - **Paint mode**: click cells to toggle them (a DOM grid makes this nearly free).
> 
> ### Exact optimum (the Exhaustive Bailiff)
> 
> For `m + n ≤ 20`, enumerate all `2^(m+n−1)` distinct cuts for the chosen score. The
> Watch mode draws it as a reference line; the Lab uses it to define
> *generations-to-optimum*. Above that size the line is hidden and the Lab reports
> generations-to-plateau instead. Also a one-line structural readout, **Tarjan's
> Handshake**: does a zero-violation cut with four nonempty classes exist (at least two
> components touching each side, counting isolates)?
> 
> ## UI (React, DOM + SVG, no WebGL)
> 
> One `<Workspace appId="split-decision">`, two top-bar modes.
> 
> ### Watch mode
> 
> Views:
> - **Arena** — the matrix as a DOM grid. A **Sort by best genome** toggle (default on)
>   orders rows by `p_i` descending and columns by `q_j` ascending with animated
>   transitions, so a checkerboard emerges as the population converges. Cells tinted by
>   their block role under the best individual's rounded cut: the two cross blocks in
>   `--data-1` and `--data-2`, diagonal blocks neutral. A bar strip on the left shows
>   `p_i`, one on top shows `q_j`. Hover shows the cell's row degree, column degree, and
>   block.
> - **Population** — every individual as two thin bar strips (`p` over rows, `q` over
>   columns), sorted by fitness, opacity by fitness rank; in the Prom, a sex glyph and
>   the two sexes in two more discrete data tokens.
> - **Trace** — sparklines of best and mean fitness with the exact-optimum line, and the
>   population's mean genome entropy `Σ H(p_i) + Σ H(q_j)` (the canalization curve).
> 
> Panels (closed archetype vocabulary):
> 
> | Panel | arch | Contents |
> |---|---|---|
> | Matrix | `subject` | fixture picker · planted generator sliders · paint mode toggle |
> | Score | `domain` | the seven scores as a Select with the historical name and blind spot as a Note · Sampled / Rounded pill |
> | Reproduction | `drive` | rule pills · population size · mutation rate μ and step σ · tournament size k · sex ratio (Prom only) |
> | Run | `playback` | play / pause / step / reset · generations per second · seed (editable, replayable) · Initialize: random / at a cut (for trap experiments) |
> | Readouts | `readout` | StatGrid: generation, best, mean, entropy, converged fraction, exact optimum, Tarjan's Handshake |
> | View | `view` | sort by best genome · show sexes · block tints on/off |
> 
> The action strip carries play/pause/step/reset.
> 
> ### Lab mode
> 
> The ensemble experiment, run in a worker pool copied from the Trinary Lab's
> `pool.ts` shape. A sweep over planted signal strength (default 6 levels) × the three
> rules × R seeds (default 12), each run to `G_max` generations (default 300) and
> recording generations-to-optimum (censored at `G_max`). The view plots median with an
> interquartile band per rule against signal, with the **hypothesis** stated above the
> chart and the Two-Step-with-restarts baseline optional. A **catalog** table logs every
> sweep (matrix size, score, rule set, N, μ, σ, k, seeds, result), as Counting the Ways'
> Lab does, so sweeps can be compared. A second Lab preset, **Escape the trap**, starts
> every individual at a trap fixture's local optimum and measures escape time per rule.
> 
> Cost check: 6 × 3 × 12 × 300 generations × N = 64 × O(mn = 200) ≈ 8·10⁸ cell visits;
> seconds across four workers, never on the main thread.
> 
> ### Theming
> 
> Ones drawn in `--fg`, block roles and sexes from the discrete `--data-1..4` tokens,
> accent reserved for controls. Canvas is not needed in v1; if the matrix grows past a
> few thousand cells, switch the Arena to canvas via `useThemeTokens`.
> 
> ## Files
> 
> ```
> src/animations/SplitDecision/
>   SplitDecision.tsx      the app: modes, panels, views, <Workspace>
>   splitDecision.css
>   EXPLAINER.md           the ? modal (ends with "Possible sources & where to go further")
>   matrix.ts              BinaryMatrix · Degrees {r,c,e} · Cut · BlockTable {N,K} · blockTable() · fixtures · planted()
>   scores.ts              the seven-score registry · degenerate guard · exactOptimum() · handshake()
>   evolve.ts              Genotype · Individual (genome + sex) · Population · step(pop, cfg, rng) → {pop, stats} · the three rules
>   lab/pool.ts            worker pool (Trinary shape)
>   lab/worker.ts          runs one (signal, rule, seed) job to G_max
>   lab/sweep.ts           sweep config + result types
>   views/Arena.tsx  views/Population.tsx  views/Trace.tsx  views/Sweep.tsx
>   __tests__/scores.test.ts   __tests__/evolve.test.ts
> src/lib/rng.ts           mulberry32 + runSeed, promoted from Trinary's lab/rng.ts (Trinary left untouched; a later chore can point it here)
> ```
> 
> Shared files touched, append-only: `src/index.tsx`, `src/apps.ts`,
> `src/chrome/catalog.ts` (category `Algorithm`, a new preview kind or a reused one),
> `README.md`, `CLAUDE.md` (routing row + layout line). `docs/sessions/categories.mjs`
> already carries the `split-decision` category (added this session).
> 
> ## Acceptance (the tests Phase 1 must pass)
> 
> Numbers verified by enumeration this session unless marked otherwise.
> 
> | Fixture | Check | Value |
> |---|---|---|
> | Ninety's observed 4×4, balanced cut | Pearson's Squint | 8 |
> | same | Shannon's Onesie | 1 bit |
> | same | The Full Bernoulli | 1 bit/cell |
> | same | Occam's Invoice (homogeneous code) | −4.45 bits (negative; see finding) |
> | 8×10 complete vs sparse | Shannon's Onesie | 1 vs 1 |
> | same | The Full Bernoulli | 1.000 vs 0.273 bit/cell |
> | same | Cut and Run | 40 vs 18 |
> | same | Tarjan's Handshake | true, true |
> | any matrix, trivial cut | all seven scores | 0 (guard) except Occam negative |
> | any matrix, `(z,w)` vs `(1−z,1−w)` | every score | equal |
> | page-50 4×4, cut `z=(0,1,0,1)`, `w=(1,0,0,1)` | Newman's Leftovers: strict local under all 8 single flips, global 0.543 | local 0.346 |
> | planted 8×10, ρ_in=1, ρ_out=0 | exactOptimum for each score = the planted cut | by enumeration |
> | evolve, fixed seed | identical trajectory on two runs | deterministic |
> | evolve, strong signal, N=64, each rule, a named seed | reaches the exact optimum within 300 generations | asserted per seed |
> | evolve, Sampled fitness, fixed seed | mean genome entropy at generation 100 < generation 0 | canalization |
> | Prom | every child's `p` equals its row-sex parent's `p` before mutation | intact transmission |
> 
> ## Findings this session
> 
> ### 🔵 finding — the page-50 trap is a trap only under the balance constraint
> 
> The monograph's alternating counterexample (page 50) holds for balanced single-side
> moves. Under unconstrained single-locus flips, which is what a GA's mutation does, the
> same cut is a strict local optimum only for **Newman's Leftovers** (local 0.346, global
> 0.543). For Cut and Run, Hamming, Shannon's Onesie, and The Full Bernoulli a single
> flip already improves it. So the trap fixture must be defined operationally (strict
> local under all single flips, verified by enumeration), and the plan uses the page-50
> matrix with the modularity score as the first such fixture. A small search for traps
> under the other scores is a Phase 1 stretch.
> 
> ### 🔵 finding — the drafted spec's Occam's Invoice numbers do not follow from its own code
> 
> The spec's §3.1 says the Kraft bound lands on 0.20 and 1/45. Those come from a
> fiber-indexed code (`log₂ 90` baseline, balanced-partition cut code) that the spec's
> §2.2 never defines. Under the §2.2 homogeneous code the 4×4 checkerboard *loses*
> 4.45 bits. For this app that is only a fitness-scale curiosity (Occam's Invoice can be
> negative, meaning "not worth describing"), recorded here so a later statistics phase
> does not inherit the inconsistency.
> 
> ### 🔵 finding — the spec's Two-Step trap used an undefined formalism
> 
> Its diag(2,3) example is the monograph's abstract page-18 score matrix with linear
> terms, not a binary M. The page-50 binary example is the one to quote.
> 
> ## Phases
> 
> **Phase 1 — Engine.** `matrix.ts`, `scores.ts`, `evolve.ts`, `lib/rng.ts`, and the
> two test files with every row of the acceptance table. Pure TypeScript, no UI.
> `npm test` green.
> 
> **Phase 2 — Watch.** The workspace, the six panels, Arena with sort-by-genome
> animation, Population, Trace, registration in the three shared files, EXPLAINER.md,
> README and CLAUDE.md rows. Ships in the gallery **Storeroom** until Dan promotes it.
> `npm run build` and `npm run lint` clean; a headless tour screenshot in this
> folder's `assets/`.
> 
> **Phase 3 — Lab.** Worker pool, sweep, the curves view, the catalog table, the
> Escape-the-trap preset. The mixability hypothesis gets its first real curves.
> 
> **Later, in this order of likely value:** more sex rules (recombination within a
> sex, so the Prom becomes an (m+n)-player game; mate choice as a signaling game, the
> Mishra angle); a balance constraint as phenotype repair (Solomon's Split returns);
> the monograph's statistics as a separate mode or app (null ladder, search-aware
> calibration of "the evolved split", the Kraft bound), where the spec's remaining
> material lives; observation masks and structural zeros.
> 
> ## Risks and open questions
> 
> - **Tournament selection vs fitness-proportional.** Tournament is scale-free and
>   simple; the MWU reading of sex assumes fitness-proportional selection under weak
>   selection. If the Lab's curves are to be compared with that theory, a
>   fitness-proportional option with a temperature will be needed. Not v1.
> - **Sex-ratio drift in the Prom.** With the child's sex drawn at ½, small populations
>   can lose one sex. Rule: if a sex is empty, the generation's pairing falls back to the
>   Mixer for that generation and the readout flags it. Cheap and honest.
> - **Attribution.** All the citations above match my training knowledge as of this
>   session, except that I could not reach arxiv.org from the sandbox to check the
>   Hardin et al. 2024 reference the spec carried; it is not needed in v1. The
>   cooperative-coevolution convergence-to-Nash result (Wiegand, Panait and Luke, early
>   2000s) and the mitonuclear coadaptation literature (Rand, Haney & Fry 2004 is the
>   review I recall) need a check before they go into EXPLAINER.md. The monograph itself
>   is a private working manuscript; the explainer credits it as "a September 2026
>   working monograph" without naming correspondents unless Dan says otherwise.
> - **Name and preview.** *Split Decision* stays. The gallery preview needs a new
>   `PreviewKind` (a tiny matrix sorting itself) or reuse of `matrix`.
> 
> ## Self-reflection
> 
> 1. **What would you do with another session?** Run `/three-hats` on this plan, then
>    Phase 1. The engine is small enough that Phase 1 and the tests fit one session.
> 2. **What would you change about what you produced?** The acceptance row for
>    "each rule reaches the optimum within 300 generations" pins seeds without knowing
>    the dynamics yet; it may need loosening to "at least 10 of 12 seeds" once real
>    runs exist.
> 3. **What were you not asked that you think is important?** The Prom's passenger
>    half (a row-sex individual's untransmitted `q`) is where the interesting biology
>    sits, and no readout in the plan isolates it. A "heritable vs passenger fitness
>    contribution" readout would be a cheap, distinctive addition.
> 4. **What did we both overlook?** Whether fitness should be evaluated once per
>    individual per generation or averaged over several sampled phenotypes. One sample
>    gives the canalization story; the plan commits to one sample and says so.
> 5. **What did you find difficult?** Separating three authors' intentions: the
>    monograph's, the drafting agent's, and Dan's. The history Dan pasted resolved it.
> 6. **What would have made this task easier?** The spec arriving with the
>    conversation that produced it, as it eventually did.
> 7. **How did you verify this, and does each passing check test the user-visible
>    claim?** Enumeration scripts in the session scratchpad for the 90-matrix fixture,
>    the 8×10 pair, the page-23 margins example, and the page-50 trap under both
>    balanced and unconstrained moves. No app code exists yet, so nothing user-visible
>    is verified; `signals: not-live` and `needs-dan` are set.
> 8. **Follow-up value:** MEDIUM — the plan is complete for Phase 1, but the Lab's
>    hypothesis and the acceptance seeds need real runs before they are trustworthy.

</details>

## Executive summary

All three reviewers endorse the plan's shape and its four load-bearing choices: a
pure engine tested before any UI, a score registry, the seed as the replay key, and
a worker pool for the sweep. None found a fabricated citation or an abandoned
approach being repeated. The corrections cluster into three groups:

| Group | What changes | Who raised it |
|---|---|---|
| **Engine honesty** | Occam's Invoice measured against the no-split code (no guard exception); reflecting mutation so the neutral entropy curve is flat; `x, y ∈ {±1}` pinned; Newman's Leftovers normalized to Barber's Q; the planted cut carried in the app's orientation | Pedagogy |
| **Engine structure** | select / mate / mutate / evaluate as operators with the three Worlds as table rows; scores take the block table, counted once from a ones list; `runJob` pure in `sweep.ts`; seeded sex quota instead of a fallback; "reached" defined on the rounded genome, sustained | Consultant, Maintainer |
| **Framework fit** | Score → `subject`, Matrix → `domain`, View → `marks`; a Lab panel set; reuse the `matrix` preview kind; the `main` PR lands with Phase 2, not Phase 1; cut the Two-Step baseline; defer "initialize at a cut" to Phase 3 | Maintainer |

Two findings from the pedagogy review change what the app will *say*: on the plan's
own sparse fixture the exact optimum is not the planted split (so the Trace needs two
reference lines), and in an 8-seed smoke test the two-sex Prom was the **slowest**
rule on every landscape, not a fast sexual rule. The hypothesis is restated per rule.

## 1 · Points of agreement (high confidence)

| Point | Maintainer | Consultant | Pedagogy |
|---|---|---|---|
| Pure engine + enumeration-verified acceptance table before UI | ✅ | ✅ | ✅ |
| `scores.ts` as a Division Bells-style registry with `blindSpot` first-class | ✅ | ✅ | ✅ |
| Tournament selection for v1; fitness-proportional later as an additive option | ✅ (implicit) | ✅ | ✅ |
| One sampled phenotype per evaluation; **Rounded** kept as the control | ✅ | ✅ | ✅ (it shows a second, distinct canalization) |
| `src/lib/rng.ts` as the *first shared* copy; Trinary untouched; the six existing copies logged as a TODO line | ✅ | ✅ | — |
| Sort the Arena by the **population mean** genome, throttled, never by the best individual | — | ✅ | ✅ |
| Reorder with absolutely positioned, `(i,j)`-keyed cells and `transform` transitions | ✅ | ✅ | — |
| "Reached the optimum" defined on the **rounded** genome, sustained for a few generations, shared by Watch and Lab | — | ✅ | ✅ |
| Named-seed acceptance rows are brittle proxies; use one determinism hash plus seed-batch tests with a control | ✅ | ✅ | ✅ |
| Block table counted once per evaluation over the ones list; scores O(1) from `{N, K}` + degrees | ✅ | ✅ | — |
| `runJob` pure in `lab/sweep.ts`, worker a thin typed wrapper, job = one run | ✅ | ✅ | — |
| Trap fixtures defined operationally; `isStrictLocalOptimum()` exported | — | ✅ | ✅ |
| Storeroom first; promotion is one flag | ✅ | ✅ | — |
| Attributions: nothing fabricated; two loose (Ford–Fulkerson, Hardy–Weinberg); the biology pointers must be checked before EXPLAINER.md | ✅ | — | ✅ |

## 2 · Points of tension (decided here)

| Tension | Positions | Decision | Reason |
|---|---|---|---|
| **Sex-ratio extinction** | Plan: fall back to the Mixer for a generation and flag it. Consultant: seeded quota, exactly `round(N·r)` row-sex children. | **Quota.** | A fallback is a rule change mid-run and contaminates Lab samples. Stochastic sex determination can return later as an honest option. |
| **Prom mutation** | Plan: mutate the whole child. Pedagogy: mutate only the transmitted half, or disclose that passenger mutation is evaluation noise. Consultant: uniform `mutate` operator across rules. | **Mutate only the transmitted half** in the Prom (`mutate` receives a locus mask; the mask is all-true for the other two rules). | Then the Prom's *only* difference from the Mixer is the transmission rule, which is the experiment. The operator model absorbs it as a mask, not a branch. |
| **The guard and Occam's Invoice** | Plan: degenerate cut = 0 for every score, Occam excepted. Pedagogy: define Occam relative to the no-split code so the trivial cut is 0 by construction. | **Relative to the no-split code.** | Removes the table's exception and gives every judge the same meaning of zero ("no better than no split"). The sparse 8×10 then reads *no cut pays for itself*, which is the monograph's point in one number. Values re-verified in Phase 1 tests. |
| **Modularity normalization** | Plan: `Q = −xᵀCy/e` (2× Barber). Pedagogy: divide by 2 or label it. | **Barber's Q** (`−xᵀCy / 2e`). | Matches the literature the name cites; the page-50 trap values halve exactly (0.173 local, 0.271 global). |
| **Mutation operator** | Plan: Gaussian step, clip. Pedagogy: clipping creates atoms at 0/1 so entropy falls under neutral drift. | **Reflect** at 0 and 1. | The canalization claim needs a flat neutral curve to be a claim at all. |
| **Block tints** | Plan: two cross blocks in `--data-1`/`--data-2`. Pedagogy: one cross tint. | **One tint.** | The two cross blocks play the same role; two hues swap when the best individual flips convention and are not CVD-safe in every skin. Position carries the structure after sorting. |
| **Lab summary statistic** | Plan: median ± IQR. Consultant: median with censored arrow. Pedagogy: survival curves. | **Survival curves** (fraction reached by generation g, per rule) plus the censored fraction. | A median is undefined once more than half the seeds censor, which the Prom column already does in the smoke test. |
| **Lab catalog persistence** | Maintainer: never persist the sweep catalog. Consultant: persist config + summary rows, engine-stamped. | **Persist config + summary**, capped, engine-stamped (a Phase 3 decision). | Sweeps cost seconds, not microseconds; the config-is-the-key design makes every row regenerable. |
| **Worker pool** | Maintainer: copy Trinary's shape. Consultant: promote a generic `WorkerPool<Cfg, Result>` to `src/lib`. | **Copy in Phase 3**, record as L5 debt. | Time-boxed; the copy is small and proven. Promote when a third consumer appears. |
| **Phase 1 as a PR** | Plan: implied. Maintainer: commit boundary only; the `main` PR lands with Phase 2. | **Commit boundary.** | An unrouted engine folder on `main` is the shape of debt the repo has already paid to remove once. |
| **The hypothesis** | Plan: "the sexual rules converge fast." Pedagogy: Mixer yes, Prom slowest everywhere (random-collaborator evaluation, effective N/2 per half). | **Restate per rule (H1–H3)**; the Prom's interesting comparisons are Prom-vs-Mixer and trap escape. | The smoke test is 8 seeds with the reviewer's parameters, not a result, but the mechanism is textbook and the app must not be built to report it as a surprise. |

## 3 · Blind spots (none of the three addressed, or only in passing)

- **Which cut each view shows.** Three objects exist under Sampled fitness: the
  sampled phenotype that earned the fitness, the rounded genome, and the population
  consensus. The consultant names the ambiguity; nobody assigns each view its cut.
  Decision: Arena tints by the **population-mean rounded cut** (the same object it
  sorts by); the Population strips show each individual's genome; a small "sampled
  phenotype" flicker for the best individual is a Phase 2 stretch that would make the
  canalization mechanism visible.
- **Trace y-axis across scores.** The seven scores live on different scales (bits,
  edges, chi-square, negative bits). Tournament selection is scale-free; the plots are
  not. Decision: the Trace shows the selected score's own units with the two reference
  lines; no cross-score normalization in v1.
- **Effective population size in the Prom** is N/2 per half, so the three rules are
  unequal at the same N. The Lab must state that it matches evaluations per generation,
  not lineages.
- **Zero-degree rows and columns** are invisible to the four ones-only judges, so their
  genotype entries never canalize. The entropy readout excludes them; the explainer
  says so in one sentence.
- **A share link** falls out of the config-is-the-key design for free. Later, not v1,
  but the `EvolveConfig` type should be serializable from day one.
- **Phone.** Hover does not exist; tap = inspect unless paint mode is on. The Storeroom
  card is acceptable without a phone pass; promotion is not.
- **The trap under the other six judges.** Only modularity traps the page-50 cut. A
  test that walks random 4×4 matrices and logs strict local optima under each judge
  is cheap and would supply fixtures.

## 4 · Recommended action

1. **Amend the plan** with a dated *Revisions after three-hats* section recording every
   decision in §2 and the archetype, panel, and phase-slicing corrections. Done in the
   same commit as this synthesis.
2. **Phase 1 now**, on this branch, as a commit boundary: `src/lib/rng.ts`,
   `matrix.ts`, `scores.ts`, `evolve.ts`, `lab/sweep.ts` (pure `runJob` +
   `summarize`), and the two test files with the revised acceptance table (Occam
   relative to no-split; Barber's Q; the `(z,1−w)` symmetry row; the neutral-control
   canalization contrast; the seed-batch convergence test; the Prom tested through
   `mate`). `npm test` green.
3. **Phase 2** lands the `main` PR: route, Storeroom card with the reused `matrix`
   preview, Arena sorted by the population mean with transform reorder and one cross
   tint, Trace with planted and exact-optimum lines and the three entropy curves,
   Population last, the corrected archetypes, an Essentials layout, a headless
   screenshot, EXPLAINER.md with the checked-or-flagged sources block.
4. **Phase 3** as its own PR: worker pool copy, survival-curve Lab, persisted catalog,
   Escape-the-trap with "initialize at a cut".

## Self-reflection

1. **What would you do with another session?** Run the pedagogy reviewer's smoke test
   again with the Phase 1 engine and 30+ seeds per cell before writing any hypothesis
   text into the Lab; and search random 4×4 matrices for trap fixtures under the other
   six judges.
2. **What would you change about what you produced?** The tension table decides ten
   things in one pass; two of them (catalog persistence, generic pool) are Phase 3
   decisions that could have waited. They are recorded so Phase 3 does not re-litigate
   them, but they are the least certain rows.
3. **What were you not asked that you think is important?** Whether the app's name
   still fits now that the judges are the landscape rather than the subject. It does
   (the population decides a split, and the judges still disagree), but the explainer's
   first line should say what "split decision" now means.
4. **What did we both overlook?** Every reviewer treated the 8×10 sparse matrix as
   reconstructed from the plan's numbers; the plan says "quoted verbatim" but does not
   quote it. Phase 1 must paste the monograph's page-46 matrices literally.
5. **What did you find difficult?** Keeping the pedagogy review's simulation results
   in their place: they are strong signals about the Prom, obtained with parameters the
   plan never set, and the synthesis had to use them to restate the hypothesis without
   promoting them to findings.
6. **What would have made this task easier?** A plan that stated the RNG draw order,
   the `±1` convention, and the three cut definitions up front; two of the three
   reviews would then have been checks rather than proposals.
7. **How did you verify this, and does each passing check test the user-visible
   claim?** Reading the three reports in full and cross-checking their claims against
   each other and against my own enumeration scripts from the planning session (the
   page-50 modularity numbers, the 4×4 and 8×10 values). The Occam-relative values
   (+3.28, 51.17, −0.47) and the entropy figures come from the pedagogy review's
   scripts and are re-verified by the Phase 1 tests, not by this synthesis. Nothing
   user-visible exists yet.
8. **Follow-up value:** MEDIUM — the decisions are concrete and cheap to apply, but the
   Prom's behavior and the hypothesis text depend on real runs with the real engine.
