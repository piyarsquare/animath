---
kind: three-hats
session: 2026-09-16-S01
date: 2026-09-16
title: "Split Decision — Framework Maintainer review"
branch: claude/elegant-ride-e1q79l
slug: elegant-ride-e1q79l
status: completed
build: n/a
followup: null
pr: null
app: split-decision
---

# Split Decision — Framework Maintainer review

I am wearing the **Framework Maintainer** hat: steward of `src/chrome/workspace/`,
the closed 11-archetype rail, theming v2, the append-only parallel-branch contract,
the Storeroom, and the operational reality that the only CI gate is `npm run build`
(`tsc && vite build`) on a static GitHub Pages deploy under `base: '/animath/'`. I am
not judging whether the mixability hypothesis teaches well (pedagogy hat) or whether
the engine is elegantly factored (consultant hat). My one question: **does this plan
fit the machine we actually have, and will it merge cleanly next to the other
in-flight app branches without adding to the debt list in CLAUDE.md?**

Short version: this is the best-shaped new-app plan I have reviewed on this repo. It
lands in a groove three apps have already worn (Counting the Ways' Explain/Lab modes
and catalog table, the Trinary Lab's worker pool, Division Bells' presentation
registry), it names its shared-file touches, and it commits to a pure engine with an
acceptance table before any UI. My pushback is on details that experience says
matter: the `src/lib/rng.ts` story is written as if there were one copy to promote
(there are six), two of the six archetype assignments are wrong by the spec's own
definitions, the Lab mode has no panel set, the DOM-grid Arena needs a size cap and
a cheaper reordering technique than "animated transitions" implies, and a "pure
engine first" PR should be a commit boundary rather than something merged to `main`
unrouted. Details below.

## Plan under review

<details>
<summary>Original request</summary>

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

| Area | Verdict | One line |
|---|---|---|
| Fit with the framework | ✅ good | One `<Workspace>`, closed vocabulary, modes per the Counting the Ways precedent, DOM + SVG only |
| History check | ✅ no repeat | Not an abandoned approach; it is the "rugged-landscape explorer" theme from `docs/FUTURE_APPS.md` §5/§7 finally given a concrete app |
| Shared-file surface | 🟡 under-counted | The plan lists five files; a new `PreviewKind` makes `src/chrome/previews.tsx` a sixth, and it is not append-only |
| `src/lib/rng.ts` | 🟡 mis-framed | There are **six** `mulberry32` definitions already; "promoting Trinary's" is the seventh copy unless the PR says so honestly |
| Archetypes | ❌ two wrong | Score is not `domain` and View is not `view` by `archetypes.ts`'s own tips; the Lab mode's panel set is missing |
| Arena (DOM grid) | 🟡 needs a cap | Fine at the plan's sizes (≤ 200 cells); needs a stated ceiling, a transform-based reorder, delegated hover, a phone tap story |
| Workers | ✅ proven path | Trinary's `new URL('./worker.ts', import.meta.url)` pool builds and deploys today; copy it, but shrink the job size |
| Lint / tests | ✅ | 307 tests, 0 lint errors, 58 warnings at baseline; the worker `ctx: any` pattern would add one |
| Storeroom shipping | ✅ endorse | Exactly what the Storeroom was made for; one-flag promotion |
| Phase slicing | 🟡 adjust | Phase 1 as a *commit* boundary, yes; as a PR merged to `main` with no route, no |

## 1 · History and context — does this repeat anything?

The framework has three relevant precedents, and the plan cites all three correctly:

| Precedent | What it settled | Where this plan uses it |
|---|---|---|
| **Counting the Ways** (`#/counting-the-ways`) | Explain \| Lab as top-bar `modes`; sections/views/actions swapped per mode; a cataloged simulator whose `runs` table lives in `useState`, capped at 60 rows, newest first | Watch \| Lab; the sweep catalog |
| **Trinary Lab** (`TrinaryStars/lab/pool.ts`, `worker.ts`, `rng.ts`) | A `WorkerPool` dealing contiguous index ranges to module workers built with `new URL('./worker.ts', import.meta.url)`; seeded `mulberry32` + `runSeed(base, index)` for reproducibility | `lab/pool.ts`, `lab/worker.ts`, seeds |
| **Division Bells** (`DivisionBells/measures.ts`) | A stateless *presentation* registry over a tested pure engine; shipped to the **Storeroom** | `scores.ts` registry; Storeroom shipping |

What the plan does **not** cite, and should, is `docs/FUTURE_APPS.md`. The
2026-06-10 scoping session (`docs/sessions/progress/future-apps-scoping/`) folded
the GAS (Gene Advocate System) idea and Glassy Networks into one
"rugged-landscape exploration" theme: a population searching a landscape, raced
against another optimizer, with sweeps as the readout. Split Decision is the first
concrete app in that theme. That is a point in its favor (it is not a stray idea) and
it means the EXPLAINER's "where to go further" block has an in-repo neighbor to
mention. It also means the shelved GAS notes are the place a *fourth* reproductive
rule would come from later, not this plan.

One history lesson the plan half-learned: **Agentic Sorting started as DOM and its
arena is canvas today** (`AgenticSorting/arena.ts`: "Canvas (not DOM nodes) so the
arena stays legible at hundreds of agents"). The plan says "switch the Arena to
canvas via `useThemeTokens` if the matrix grows past a few thousand cells". Good
instinct, but it needs a number, not "a few thousand" (see §5). CLAUDE.md still calls
Agentic Sorting "(CSS/DOM)", which is stale — not this plan's job to fix, but a
warning that the DOM-vs-canvas decision tends to get revisited after shipping.

> [!NOTE]
> The abandoned-approach check comes back clean. The closest thing to a retired
> pattern here is the per-app `About` section (gone; both markdowns feed the `?`
> modal). The plan already says `EXPLAINER.md` only, which is right.

## 2 · Shared-file surface and parallel-branch safety

The plan lists `src/index.tsx`, `src/apps.ts`, `src/chrome/catalog.ts`, `README.md`,
`CLAUDE.md`. Two corrections and one caution:

1. **`src/chrome/previews.tsx` is a sixth shared file if a new `PreviewKind` is
   added.** The kind is a string-literal union on one line plus a `case` in the
   `Preview` switch plus a new draw function. The union line is *not* append-only:
   two branches each adding a kind both edit that line, and every branch that touched
   previews since Division Bells landed has done exactly this. It is a trivial
   conflict, but it is a conflict, and the plan's own "Risks" section already offers
   the alternative: **reuse `matrix`** (`MatrixPreview` draws a heat grid with a
   stepping selection — close enough to "a matrix sorting itself" for a Storeroom
   card). Add the bespoke preview at promotion time, as its own small commit.

2. **`src/apps.ts` has a documented exception to "append at the end".** Its header
   says: *Keep new apps ABOVE the trailing plane-arithmetic pair* (Plane Transform ·
   Argand). Division Bells and Counting the Ways sit above that pair; Split Decision
   goes after Division Bells, not after Argand. The plan says "append-only" without
   noting this; whoever executes Phase 2 must read the header.

3. `docs/sessions/categories.mjs` already carries `split-decision` (committed in
   `b9638d5`). Good — that is the one shared docs file, and it is done.

The rest is clean: the app is a self-contained folder, `src/lib/rng.ts` is a *new*
file (no conflict surface), and the CLAUDE.md/README rows are appends. Merge order
against the other in-flight branches will not matter.

> [!CAUTION]
> **Gotcha** — the CLAUDE.md routing table and repository-layout tree are the two
> places where parallel branches most often collide on *adjacent* lines. Keep the
> Split Decision row to one line each (long, like the others) and append; do not
> reflow a neighbor.

## 3 · `src/lib/rng.ts` — the duplication is already the norm

The plan proposes "mulberry32 + runSeed, promoted from Trinary's lab/rng.ts (Trinary
left untouched; a later chore can point it here)". That is written as if there were
one copy. There are six:

```text
src/chrome/previews.tsx:104                    function mulberry32   (private)
src/animations/CountingTheWays/skellam.ts:177   export function mulberry32
src/animations/TreesAndNets/lib/mosaic.ts:84    function mulberry32   (private)
src/animations/StableMatching/model.ts:17       export function mulberry32
src/animations/TrinaryStars/lab/rng.ts:8        export function mulberry32  (+ runSeed)
src/animations/AgenticSorting/engine.ts:52      export function mulberry32
```

So the honest framing is: **this app would be the first consumer of a shared
`src/lib/rng.ts`, and the seventh site of the function.** I still endorse creating
it, for three reasons that are specific to this app rather than abstract tidiness:

- The worker and the main-thread Watch loop must produce identical trajectories from
  the same seed (acceptance row "identical trajectory on two runs"). One module,
  imported by both, is the cheapest guarantee.
- `runSeed(base, index)` is exactly the sweep's per-(signal, rule, seed) derivation.
- A per-app copy would be the seventh; a shared one is the first that can retire
  the others.

What I would change: do **not** touch Trinary in this PR (it just had a large
overhaul, #250, and its lab tests pin `rng.ts` behavior), and do not promise "a later
chore can point it here" in a code comment — promises in comments rot. Instead, add
one line to `docs/sessions/TODO.md` at handoff: `[engine] !low consolidate the six
mulberry32 copies onto src/lib/rng.ts (Trinary, StableMatching, AgenticSorting,
CountingTheWays, TreesAndNets, previews)`. That is where deferred chores live in this
repo, and the control center surfaces it.

Keep `rng.ts` tiny: `mulberry32`, `runSeed`, and nothing else. The temptation will be
to add `randn` (the plan's `Normal(0, σ)` mutation step needs one) — put the
Box–Muller in `evolve.ts`, where its call order is part of the tested trajectory,
not in the shared module where a later "improvement" silently changes every app's
seeds.

## 4 · Workers, the static deploy, and testability

The Trinary pool is the right thing to copy and it is *proven*: it builds under
Vite 5 with `base: '/animath/'`, deploys to GitHub Pages, and runs in the tour's
Puppeteer. Points the copy must keep or change:

| Item | Trinary today | For Split Decision |
|---|---|---|
| Worker construction | `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })` | Same — this is the only form Vite bundles as a base-aware chunk |
| Pool size | `min(8, max(2, hardwareConcurrency − 1))` | Same |
| Job granularity | `JOB = 48` contiguous run indices | **`JOB = 1`–`4`.** A Trinary run is cheap and there are thousands; a Split Decision job is one (signal, rule, seed) to `G_max = 300` × N = 64 × O(mn) ≈ 4·10⁶ cell visits — already tens of ms. With 216 jobs and `JOB = 48` the sweep curve would arrive in five lumps; with `JOB = 1` it streams |
| Worker typing | `const ctx: any = self` | Adds a `no-explicit-any` warning. Use `/// <reference lib="webworker" />` and `self as unknown as DedicatedWorkerGlobalScope`, with a discriminated union for messages. Zero new warnings is the rule (CLAUDE.md debt item 1) |
| Lifecycle | `poolRef.current?.dispose()` on unmount and on config change (`TrinaryLab.tsx:382, 389`) | Same, plus dispose on **mode switch** (Watch ⇄ Lab unmounts the Lab view, as Counting the Ways swaps its `views` array) |
| Fallback | `HAS_WORKERS` guard in BasinMap | Cheap to add: if `typeof Worker === 'undefined'`, run jobs on the main thread with `setTimeout(0)` yields (`AgenticSorting/lab.ts` `runExperiment` is the pattern) |

**Testability is the real design constraint.** `pool.ts` and `worker.ts` cannot run
under vitest (no `Worker` in Node). So the function the worker calls must be pure
and live in `lab/sweep.ts`: `runSweepJob(job, cfg) → SweepResult`, with
`worker.ts` a ten-line wrapper. Then `__tests__/evolve.test.ts` can assert
generations-to-optimum on a fixed seed *through the same code path the Lab uses*,
which is what makes the acceptance row "reaches the exact optimum within 300
generations" a test of the user-visible claim rather than a proxy.

The cost estimate (8·10⁸ cell visits across four workers) checks out
(6 × 3 × 12 × 300 × 64 × 200 = 8.3·10⁸). Two engine notes that affect it:

- **Occam's Invoice** needs `log₂ C(K, N)` for K up to mn. Precompute a
  log-factorial table once per matrix (length mn + 1) in `matrix.ts`; do not call a
  gamma function per evaluation.
- **Sampled fitness** draws m + n Bernoullis per individual per generation on top of
  the O(mn) block count. Fine. But the block table should be computed from `(z, w)`
  by one pass over the matrix's *ones* (a list of (i, j) pairs, length e), not over
  all mn cells — on sparse fixtures that is a 5× saving for free.

> [!IMPORTANT]
> **Decision I would record:** `vitest` (v4) and `eslint` stay non-CI by convention,
> as CLAUDE.md says. This app's tests are the first with a worker in the loop; keep
> `pool.ts`/`worker.ts` free of logic so the convention holds without a Node
> worker shim.

## 5 · The Arena — DOM grid with animated reordering

The plan's sizes are small: 4×4, 8×10, and a planted generator whose Lab default is
mn = 200. The exact-optimum cap (`m + n ≤ 20`) also hints at ≤ 10×10 as the
"normal" Watch size. At those sizes a DOM grid is the right call and paint mode is,
as the plan says, nearly free. The problems start when someone drags the generator
sliders, so the plan needs three concrete commitments:

1. **A ceiling.** Cap the generator at `m·n ≤ 1600` (e.g. 40×40) for the DOM Arena.
   Above that, the plan's "switch to canvas" clause fires — but that is a second
   renderer, so the honest v1 choice is to make 1600 the slider maximum and say so in
   the panel. React reconciling 1600 keyed cells per generation at 30 generations/s
   is ~50k element updates per second; that is where DOM grids start to jank on a
   phone.

2. **How rows and columns move.** "Animated transitions" on a CSS grid with changing
   `grid-row`/`grid-column` does not animate — the browser snaps. The technique that
   works with one style write per cell and no layout thrash is the one
   `StableMatching`'s heatmap already uses: **absolutely positioned cells** with
   `transform: translate(x, y)` computed from the current row/column permutation and
   `transition: transform 300ms`. Keys stay `(i, j)`, so React never reorders DOM
   nodes; only the transform changes. Two rules on top: honor
   `prefers-reduced-motion` (DESIGN-SPEC §7 — disable the transition, never hide
   content), and **skip the transition when the generation rate exceeds ~10/s**, or
   the animation never finishes before the next re-sort and the checkerboard never
   settles visually. Better still, re-sort at a throttled cadence (every k
   generations or every 250 ms), not every generation.

3. **Hover and touch.** "Hover shows the cell's row degree, column degree, and
   block" means 1600 `onMouseEnter` handlers if done per cell. Use one delegated
   handler on the grid reading `data-i`/`data-j`. On phone there is no hover; a tap
   must do it — and the plan also uses click for **paint mode**. Pick one: tap =
   inspect by default, tap = toggle only while paint mode is on, and say which in the
   panel. The phone re-chrome (`PhoneWorkspace`: stacked cards 56vw tall, one sheet
   at a time) will show the Arena as a card ≤ 340 px tall; a 40×40 grid is 8 px cells
   there. Acceptable for a Storeroom app; not acceptable for promotion without a
   phone pass (`signals: phone-needed` at handoff).

The **Population** view has the same shape of problem: "every individual as two thin
bar strips" is N × (m + n) rects — 64 × 18 = 1152 at the defaults, 64 × 80 at 40×40.
Make it one SVG with `<rect>`s, update it at the throttled cadence, and consider
showing the top 32 by fitness rather than all N. I would build Arena and Trace first
and let Population be the last Phase 2 item; it is the one most likely to be cut to a
sparkline of "converged fraction" if time runs out, and nothing else depends on it.

The **Watch loop** itself is not a concern: N = 64 × O(mn = 200) per generation is
~13k operations; 60 generations/s is under a million per second on the main thread.
Keep the population in a `useRef`, run it from one rAF (or a `setInterval` at the
"generations per second" rate) and publish stats to React state at ≤ 10 Hz — the
`rafRef` pattern in Agentic Sorting and Counting the Ways.

## 6 · Archetypes — two of six are wrong, and the Lab has none

The rail sorts by tier then authored order, so a wrong archetype does not break
anything — but the icons are the closed vocabulary, one icon = one meaning across
every app, and `archetypes.ts` writes the meaning next to each one. Checking the
plan's table against those tips:

| Panel | Plan | `archetypes.ts` tip for that arch | Verdict | Use instead |
|---|---|---|---|---|
| Matrix | `subject` | "What you are visualizing" | 🟡 defensible | `domain` — "input space, viewport or starting layout"; the matrix is the instance, as `StableMatching`'s **Instance** panel (`domain`) and Trinary's **Planet launch** (`domain`) |
| Score | `domain` | "Input space, viewport or starting layout" | ❌ | `subject` — the score *is* the landscape the population climbs; it is what the trace and the sort visualize. This is the app's ƒ |
| Reproduction | `drive` | "Hands-on manipulation" | 🟡 defensible | Keep `drive`: Agentic Sorting's **Agents** panel (the actors and their rates) is `drive` and this is the same object — the rule that moves the population. If a second `subject` is preferred (the rule is "the experiment"), that is also within precedent (ParticleViewerShell ships two `marks`) |
| Run | `playback` | "Time transport — play, step, scrub" | ✅ | Move **seed** and **Initialize: random / at a cut** out; they are starting conditions (`domain`, into the Matrix panel) or reproduction inputs. Run should be transport + rate only, matching what the action strip projects |
| Readouts | `readout` | "Stats & plots" | ✅ | — |
| View | `view` | "Projection & camera" | ❌ | `marks` — "how points or cells are drawn": sort-by-genome, block tints, sex glyphs are all cell drawing. `view` is reserved for cameras/projections (Complex Particles, Polygon Worlds); a DOM app has none |

With Matrix → `domain` and Score → `subject`, the rail reads Define: ƒ Score, ▦
Matrix — which is also the teaching order (pick the landscape, then the instance).
Six panels is fine; Counting the Ways has five in Explain and Stable Matching has
more. The archetype-collision issue registered in `IN-PROGRESS.md` (same glyph for
two panels in one tier) does not arise here if the assignments above are used — each
tier has at most one of each icon except Define, where ƒ and ▦ are distinct.

**The Lab mode has no panel set.** The plan describes the Lab's *view* (curves,
catalog table, hypothesis line, Escape-the-trap preset) and its worker cost, but the
Counting the Ways precedent swaps `sections` per mode and the plan never says which
panels the Lab shows. It needs at least:

- a `lab` panel (flask) — signal levels, seeds R, `G_max`, which rules, the
  Escape-the-trap preset, pool status — the one panel the Lab's action strip projects
  (`Run sweep` primary · `Stop` · `Clear catalog`, as Counting the Ways does with
  `Run & log` / `Clear`);
- Score (`subject`) and Reproduction (`drive`) reused from Watch, since the sweep is
  parameterized by them;
- a `readout` for the selected sweep's numbers, if the curves view does not carry
  them.

Matrix (`domain`) is *not* reused in the Lab — the Lab generates planted matrices
from the signal axis — which is a nice clarity: the Lab's x-axis replaces the
fixture picker. Write that down so Phase 3 does not re-open it.

> [!NOTE]
> Mode persistence: Division Bells persists its mode
> (`usePersistentState(NS + ':mode')`), Counting the Ways does not
> (`useState`). Either is within precedent; persist it here, because a user
> returning to compare sweeps wants to land in the Lab.

## 7 · Watch + Lab as modes — matches precedent, with one engine consequence

Top-bar `modes` are for "genuinely different apps-within-the-app — separate state,
separate panels" (BUILDING_AN_APP §4c), versus layouts for "modes of looking" at
the same state. Watch and Lab have different state (one live population vs. a sweep
catalog), different panels, different views, and different action strips. Modes are
right, and Watch \| Lab reads as well as Explain \| Lab and Observatory \| Lab.

The consequence the plan does not mention: switching modes **unmounts the other
mode's view**. The Watch population must live in a ref (or module state), not in
the Arena component, so switching to the Lab and back does not reset generation 0;
and the running loop must pause on switch (Counting the Ways pauses its tutorial the
same way). Conversely the Lab's pool must `dispose()` on leaving the Lab. Neither is
hard; both are the kind of thing that gets discovered in a bug report if not
written into the plan.

Layouts: the plan mentions none. Counting the Ways ships one **Essentials** per
mode and lets Compact/Everything be auto-appended. Do the same; a Watch Essentials
of Score · Matrix · Run (with Reproduction closed) is what a first-time visitor
should see, and `Everything` will take care of the rest.

## 8 · Theming — the simplest story in the repo, keep it that way

The plan's token plan is correct and complete for a DOM + SVG app: ones in `--fg`,
block roles `--data-1`/`--data-2`, sexes `--data-3`/`--data-4`, accent for controls
only. No canvas means no `useThemeTokens`, no `themeId` effects, nothing to rebuild
on a skin switch. Two details:

- The shared `Sparkline` in `chrome/readouts.tsx` draws in `--accent`. That is the
  chrome's own primitive and is accepted in every lab; but the **Trace view** needs
  two series (best, mean), a reference line (exact optimum) and the entropy curve —
  four things the single-series `Sparkline` cannot do. Write `views/Trace.tsx` as
  its own SVG and color the series with `var(--data-*)` (Division Bells' SVG reads
  `var()` directly; no token reads needed). Do not extend `readouts.tsx` for one
  consumer.
- Opacity-by-fitness-rank in the Population view is fine in both modes; a
  `--data-*` fill at low opacity over `--panel-2` stays legible in light and dark
  because the tokens are mode-resolved. Nothing to do, just do not hardcode a
  fallback hex.

## 9 · State, persistence, lint

| Concern | Rule | The plan |
|---|---|---|
| Settings | `usePersistentState('split-decision:<field>')` for score, rule, N, μ, σ, k, sex ratio, sort toggle, fixture id, seed, mode | Implied; make the seed persisted (it is a setting the plan calls "editable, replayable") |
| Transient state | Never persist population, generation, the sweep catalog, or window state | The catalog stays in `useState` like Counting the Ways' `runs` (capped at 60 — cap the sweeps at a small number too; each holds 216 results) |
| Reset | `clearPersistedState('split-decision')` behind a `danger` button in the System tier is the convention for particle viewers; optional here | Not mentioned; optional |
| Imports | Relative (`../../chrome/...`) inside the app, as Counting the Ways; `@/` also fine — match the file | Unstated; either is fine, be consistent within the folder |
| Lint | 0 errors, no new warnings; tests are under `src/` so they lint too | The worker's `any` is the only trap (§4) |
| Tests | `src/**/*.test.ts` picked up by `vitest.config.ts`; put them in `__tests__/` | Matches |
| Buttons | ≤ 1 `primary` per panel; icons from `chrome/icons` | The action strip's `Play` is the primary; the Run panel must then not have a second |

One thing to add: the plan's **paint mode** edits the matrix, and the matrix is a
fixture. Editing a fixture should flip the fixture picker to "Custom" and not be
persisted (a painted 40×40 matrix is 1600 booleans — persisting it is cheap, but
then the "fixture" the user reloads into is not the one named in the picker). Say
which; I would not persist.

## 10 · Scope — the boundary is clear, three things are creeping over it

The locked decisions do their job: no null ladder, no calibration, no Kraft bound, no
sonification, intact-half transmission only. Seven scores in a registry is the
Division Bells shape and I accept it (the registry makes the seventh cost the same
as the fourth). Three rules is the whole point. What I would cut or defer from v1:

1. **The "Two-Step-with-restarts baseline" in the Lab.** It is a fourth search
   algorithm, not a reproductive rule, and it needs its own implementation, its own
   restart schedule, and its own place on the curves. The plan calls it optional;
   make it *absent* from v1 and list it under "Later".
2. **Initialize: at a cut** and the **Escape-the-trap** preset belong together in
   Phase 3; the Run panel should not carry an initializer in Phase 2 that nothing
   uses yet.
3. **Tarjan's Handshake** is cheap and stays — but it is one line in the StatGrid,
   not a panel or a view. The plan already has it right; I am noting it so it does
   not grow.

Conversely, one thing is *missing* that the framework expects: a **start hint** or
an inert-state check. The Arena on first load shows a noise matrix and a paused
population; the action strip's `Play` is the begin-affordance, so no `hint` is
needed — but the strip must exist from the first Phase 2 commit, not be added later
(CHROME-REVIEW P1: "phone opens every app inert today" was the bug the strip fixed).

## 11 · Storeroom and phase slicing

**Storeroom: endorse.** The Storeroom exists "for experiments that aren't ready";
Division Bells is there today. A Watch-only Split Decision whose headline hypothesis
has no curves yet is exactly that. Promotion is flipping `storeroom: true` off on
the app's own `META` line — one line, conflict-free — plus the bespoke preview if
wanted. Note the tour script reads `src/apps.ts`, not the catalog, so the app gets
screenshotted from day one regardless; that is a feature (the handoff's headless
shot is free).

**Phase 1 as a pure-TS PR: adjust.** A pure engine with vitest coverage and no
shared-file edits is the safest possible merge, and I like that the acceptance
table exists before any UI. But merged to `main` it is an unrouted folder — dead
code until Phase 2 — and every other app on this repo (Division Bells #248,
Counting the Ways, Trinary #250) landed engine + tests + UI together. My preference:

- Phase 1 is a **commit boundary** (or a draft PR) on this branch: engine + tests,
  `npm test` green, a handoff that says so.
- The PR to `main` is opened after Phase 2, when there is a route, a Storeroom
  card, and a screenshot. If the sessions run long, a Phase 1 PR is acceptable as a
  fallback — but then its description must say "engine only, unrouted; Phase 2
  follows on this branch", so nobody later "cleans up" the orphan folder the way
  the 2026-06-11 debt session deleted `lib/ParticleDisplay.ts`.

Phase 3 (Lab) as a separate PR is fine and preferable: it is the part with the
worker, the most build risk, and the least shared-file surface (none — it is all
inside the app folder plus one `modes` entry).

> [!WARNING]
> The acceptance row "each rule reaches the exact optimum within 300 generations
> on a named seed" is the one test most likely to become a flake-magnet after any
> change to RNG call order (mutation loop reordered, Box–Muller cached, tournament
> sampling tweaked). Pin the seeds *and* loosen the assertion to "≥ 10 of 12 pinned
> seeds reach optimum − ε", as the plan's own self-reflection anticipates. Keep the
> "identical trajectory on two runs" test as a same-process comparison, never a
> golden-number snapshot.

## 12 · Small things the executor will hit

- `src/apps.ts`: insert **above** the trailing plane-arithmetic pair (header note).
- Category `Algorithm` (with Stable Matching, Agentic Sorting, Trees and Nets,
  Counting the Ways). Right.
- `appId="split-decision"` = the route id = the persistence namespace. Right.
- `EXPLAINER.md` ends with "Possible sources & where to go further"; the plan's
  attribution notes flag the two references that need checking (cooperative
  coevolution's Nash result; the mitonuclear review). Flagging them in the
  explainer as "as I recall" is the policy; do not resolve them by guessing.
- `README.md`: one bullet in the app list and one line in the tree. The plan says
  "README" without the tree line; add it.
- The `label` on the top-bar subtitle: Counting the Ways puts live numbers in
  `subtitle` (`μ₁=… μ₂=…`). A `gen 120 · best 0.87` subtitle would be in keeping.
- `docs/SCREENSHOTS.md` / `npm run tour -- --app split-decision` for the handoff's
  `assets/` shot; the plan says "headless tour screenshot" — that is the command.

## Verdict

**Endorse:**

- The app's shape: one `<Workspace>`, Watch \| Lab modes on the Counting the Ways
  precedent, DOM + SVG with no WebGL, a pure engine with an enumeration-verified
  acceptance table before any UI.
- `scores.ts` as a presentation registry over tested math (the Division Bells
  pattern), with the degenerate-cut guard stated as a rule.
- Copying the Trinary worker pool shape; it is the one proven path for module
  workers under the `/animath/` base.
- Shipping Phase 2 to the Storeroom and promoting on a one-line flag.
- Creating `src/lib/rng.ts` — as the *first shared* copy, with a TODO.md line to
  retire the other six, and Trinary untouched.
- The theming plan (`--fg` / `--data-1..4`, accent for controls only) — the simplest
  compliant story an app here has had.

**Concerns:**

- Two archetypes are wrong by `archetypes.ts`'s own tips (Score is not `domain`,
  View is not `view`), and the Lab mode has no panel set at all.
- The DOM Arena has no size ceiling and "animated transitions" is not a technique;
  the phone has no hover and paint-click and tap-inspect collide.
- A new `PreviewKind` makes `previews.tsx` a sixth shared file with a non-append
  union line; the plan under-counts its shared surface by one.
- The worker copy would add a `no-explicit-any` warning verbatim; `pool.ts` and
  `worker.ts` are untestable under vitest unless the job function lives elsewhere.
- Trinary's `JOB = 48` batching would make the sweep curve arrive in five lumps.
- Phase 1 merged to `main` as an unrouted folder is the shape of debt the 2026-06-11
  session spent a day deleting.
- Mode switching unmounts views; the Watch population and the Lab pool need
  explicit survive/dispose rules.

**What I would change:**

1. Matrix → `domain`, Score → `subject`, View → `marks` (rename it "Cells"); move
   seed + initializer out of Run; add the Lab's panel set (a `lab` panel projected
   by `Run sweep · Stop · Clear`, reusing Score and Reproduction).
2. Cap the generator at `m·n ≤ 1600`; reorder with absolutely positioned cells and
   `transform` transitions (the Stable Matching heatmap technique), throttled to
   ≤ 10 re-sorts/s and off under `prefers-reduced-motion`; one delegated hover
   handler; tap = inspect unless paint mode is on.
3. Reuse `kind: 'matrix'` for the Storeroom card; add the bespoke preview at
   promotion.
4. `lab/sweep.ts` owns `runSweepJob` (pure, tested); `worker.ts` is a typed
   ten-line wrapper with no `any`; `JOB` = 1–4; dispose the pool on mode switch.
5. Phase 1 = commit/draft-PR boundary on this branch; the `main` PR lands with
   Phase 2 (route + Storeroom card + screenshot). Phase 3 as its own PR.
6. Cut the Two-Step baseline from v1; defer "Initialize at a cut" to Phase 3 with
   Escape-the-trap.
7. Loosen the per-seed acceptance row to "≥ 10 of 12 pinned seeds" and keep the
   determinism test a same-process comparison.
8. Add the TODO.md line for the `mulberry32` consolidation instead of a comment
   promising a later chore; insert the `apps.ts` entry above the plane pair.

## Self-reflection

1. **What would you do with another session?** Read the drafted `split-decision-spec.md`
   the plan says it replaces (it is not in the repo, so I reviewed the plan on its own
   terms) and prototype the absolutely-positioned reorder at 40×40 in the Stable
   Matching heatmap to confirm the 1600-cell ceiling I asserted rather than measured.
2. **What would you change about what you produced?** The archetype section is the
   strongest part because it is checked against `archetypes.ts` and existing
   assignments; the Arena performance numbers are experienced estimates, not
   measurements, and I should say so more loudly there.
3. **What were you not asked that you think is important?** CLAUDE.md still
   describes Agentic Sorting as "(CSS/DOM)" while its arena is canvas — a stale line
   that would have misled the plan's DOM-vs-canvas reasoning if it had leaned on it.
   And `npm test` now prints rolldown/oxc deprecation warnings from vitest 4 on
   vite 5 — a symptom of the vite-major upgrade chore CLAUDE.md already schedules,
   not this plan's concern, but it will confuse the first executor who sees it.
4. **What did we both overlook?** Whether the seven scores' *ranges* (bits, counts,
   chi-square, negative bits) need normalizing for the Trace view's shared y-axis
   and the "converged fraction" readout — tournament selection is scale-free, but
   the plots are not. The plan is silent; so was I until this line.
5. **What did you find difficult?** Keeping the maintainer's lens and not drifting
   into the consultant's (the `runSweepJob` factoring is on the border) or the
   pedagogy hat's (I said nothing about whether Watch's three "things a viewer
   should see" are the right three).
6. **What would have made this task easier?** The drafted spec in the repo, and a
   sentence in the plan stating the generator's slider maxima — half of §5 is
   guessing the sizes the plan intends.
7. **How did you verify this, and does each passing check test the user-visible
   claim?** Reasoning against the source: I read `archetypes.ts`, `types.ts`,
   `catalog.ts`, `previews.tsx`, `apps.ts`, the Trinary pool/worker/rng, Counting
   the Ways' mode assembly, Division Bells' registry, and grepped every `mulberry32`
   definition and every `arch: 'domain'` assignment. I ran `npm test` (307 passing)
   and `npm run lint` (0 errors, 58 warnings) to state the baseline. Nothing here
   is user-visible yet; no app code exists. The Arena performance figures are
   reasoning only (`visual-unverified` would apply once built).
8. **Follow-up value:** MEDIUM — the review is complete for a plan-stage decision, but two of its recommendations (the 1600-cell ceiling and the reorder technique) are estimates that Phase 2 should measure before treating as rules.
