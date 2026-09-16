# Split Decision

A binary matrix — rows are cells, columns are variants, a **1** means the variant
was seen in that cell — and a population trying to **split it in two**: some rows
into R₁, the rest into R₂; some columns into C₁, the rest into C₂. A good split
puts the ones into the two *cross* blocks (R₁×C₂ and R₂×C₁) and leaves the
*diagonal* blocks empty: two populations, each with its own variants.

Several judges score the same split and disagree. A population evolves it by
several reproductive rules and they disagree too. A split decision.

## The genome

Each individual carries a number in [0, 1] for every row and every column: the
**probability** of putting that row in R₁ and that column in C₁. To be scored, an
individual **samples** one split from those probabilities (or, with *Rounded*
fitness, rounds them). The score of that split is its fitness.

That one design choice has a consequence you can watch. A genome sitting near ½
is a lottery: its offspring score all over the place. Near a good split, any fuzz
can only lose, so fuzzy genomes lose tournaments and the population's entries
drift to 0 or 1. The **entropy** curve in the Trace falls: *the genome makes up
its mind*, with nobody scheduling it. The Trace draws two twins from the same
seed for comparison: a **neutral** twin with no selection (its curve stays flat —
the mutation reflects at the edges rather than piling up there) and a **Rounded**
twin (a smaller fall: entries near ½ are one mutation from flipping sign, so
sharp genomes are more robust to *mutation* even without sampling noise).

## The judges (selection scores)

| Judge | History | What it measures | Blind spot |
|---|---|---|---|
| **Cut and Run** | min-cut (Ford & Fulkerson 1956; Kernighan & Lin 1970 as a partition objective) | ones in the cross blocks minus ones in the diagonal blocks | unnormalized: peeling off one row and one column scores almost as well; blind to zeros |
| **Hamming's Full Count** | Hamming distance (1950) to the perfect checkerboard | Cut and Run plus zeros counted as evidence | on a sparse matrix it prefers the peel and calls the rest "zero block" |
| **Pearson's Squint** | Pearson's χ² (1900) on the 2×2 table of ones | how lopsided the table of ones is | sees only ones: a sparse checkerboard and a complete one look the same |
| **Shannon's Onesie** | information-theoretic co-clustering (Dhillon, Mallela & Modha 2003) | the mutual information between a random *one*'s row class and column class, at most 1 bit | samples the ones, so density is invisible |
| **The Full Bernoulli** | the stochastic block model's likelihood ratio (Holland, Laskey & Leinhardt 1983), per cell | the mutual information between a random *cell*'s value and its block | treats every unobserved call as a real zero |
| **Newman's Leftovers** | modularity (Newman & Girvan 2004; Barber 2007 for bipartite graphs) | cross-block ones beyond what the degrees alone predict | its null can predict more than one edge per cell |
| **Occam's Invoice** | minimum description length (Rissanen 1978) | bits saved by describing the matrix through the split, after paying for the split | the most conservative judge: negative means "not worth describing" |

Every judge gives **0** to "no split" (everything in one block), so 0 means "no
better than nothing" for all of them. Try the **Sparse 8×10**: a structurally
perfect split that Occam's Invoice says is not worth its own description, while
Shannon's Onesie gives it the full bit. Same picture, three different questions:
is there structure, how strong is the contrast, is it surprising.

## The worlds (reproductive rules)

| World | History | Rule |
|---|---|---|
| **Muller's Monastery** | clonal reproduction (Muller 1932, 1964) | one parent, copied, then mutated — the only lineage that can move a row entry and a column entry together in one step |
| **Hardy–Weinberg Mixer** | random mating (Hardy 1908; Weinberg 1908), free recombination (Geiringer 1944) | two parents; every entry is a coin flip between them |
| **Potter–De Jong Prom** | a variant of cooperative coevolution (Potter & De Jong 1994) | two sexes: **row-sex** parents pass on the row half, **column-sex** parents the column half, both intact. A child mutates only the half it will transmit; the other half is a passenger it did not choose and will not pass on |

The Prom is the odd one. Each half of the genome is inherited from one sex only —
the shape of *uniparental* inheritance, like a mitochondrial genome that comes
only from the mother, except that here both halves are uniparental through
opposite sexes. Fitness accrues to the pair, so a row half is judged with whatever
column half it happened to inherit. That passenger half is the whole story of
this rule: a mutation there is never seen by its own lineage's selection.

Selection is a tournament of size *k* in every world (draw *k* individuals, keep
the fittest); *k* = 1 is pure drift. Sexes are assigned by a fixed quota each
generation, so neither sex can go extinct.

## What to watch

- **The matrix sorts itself.** Rows are ordered by the population's mean row
  probabilities and columns by its column probabilities, so a planted
  checkerboard emerges from noise as the population converges. The bars on the
  edges are those means; the whiskers are the population's spread — its
  diversity, in the picture. The matrix is stored shuffled: turn *Sort* off to see
  the raw order.
- **The two reference lines.** The Trace marks the **planted** split's score and
  the **exact optimum** (found by trying every split, when the matrix is small
  enough). They need not agree: on the sparse pair, some judges prefer a split one
  column away from the planted one. When the population climbs above the planted
  line, that is not a bug. It is the difference between a structural split and an
  optimizer's best contrast.
- **Linkage — what the rule does to the population.** The *Linkage* view correlates
  every pair of loci across the population and draws the matrix, ordered like the
  Arena and split into the row half and the column half. This is where the three
  rules look most different, and the reason is mechanical:

  | | within rows | within columns | across the halves |
  |---|---|---|---|
  | **Mixer** | at the line | at the line | at the line |
  | **Monastery** | high | high | high |
  | **Prom** | high | high | **at the line** |

  "At the line" means the mean |r| sits at what independent loci would produce. For
  the Mixer that is **linkage equilibrium**: every locus is a coin flip between two
  parents, associations are broken every generation, and the population ends up fully
  described by its allele frequencies alone — Geiringer's theorem (1944), and the
  condition under which sex reads as multiplicative-weights updates per locus. The
  Monastery copies whole genomes, so whatever selection builds is inherited. The Prom
  takes its rows from one parent and its columns from another, chosen independently,
  so it is the one rule that cannot build an association *between* the halves — which
  is exactly the association a coordinated row-and-column move would need. The trap is
  that fact with consequences.

  A single cell needs |r| above about 2/√N before it means anything; the three summary
  means are compared against √(2/π)/√N, which is what a mean |r| reads when nothing is
  linked. Once the population converges every locus is fixed and there is nothing left
  to correlate, so the matrix empties — the readout says how many loci still vary.

- **The race** (a hypothesis, not a result): on a strong planted signal, the Mixer
  should beat the Monastery — good rows are good against almost any column set,
  so recombining them pays. The Prom, judged against random passenger halves,
  should be slower than the Mixer everywhere. Where the optimum needs a
  coordinated row-and-column move (a *trap*), the Monastery should escape most
  easily. The **Lab** measures these: a sweep over planted signal strength races the
  rules and plots what fraction of seeds reached the optimum by each generation, with
  each prediction printed next to what was observed.

  The Lab's other preset starts every individual *inside* a trap and times the escape.
  One measured warning, stated in its panel: at a mutation rate of 0.1 or below, no
  rule escapes at all — every individual begins at exactly 0 or 1, and a reflecting
  step of 0.1 cannot carry a locus back across ½ against selection. That is a finding
  rather than a failure (a strict local optimum with no standing variation is
  absorbing), but you have to raise the mutation rate toward 0.2 before the rules can
  be told apart.

## Possible sources & where to go further

How this was reached: from a September 2026 working monograph on cell-by-variant
matrices (whose fixtures the 4×4, the 8×10 pair and the trap are quoted from), and
from Dan's question "what if a population evolved the split — maybe even with
sex?" The names are jokes with real history behind them. What it lands near, with
pointers to check before relying on them:

- **Probability-vector genotypes**: Baluja's PBIL (1994) and the compact genetic
  algorithm (Harik, Lobo & Goldberg, 1999) evolve exactly this kind of genome.
- **Canalization**: Waddington's word (1942). Hinton & Nowlan (1987), where
  learnable "?" alleles get replaced by fixed ones once the answer is found, is the
  closest computational ancestor of "the genome makes up its mind"; "survival of
  the flattest" (Wilke et al., 2001) is the Rounded twin's gap.
- **Linkage equilibrium**: Geiringer's theorem (1944) is the result that free
  recombination drives a population to independence across loci — what the Mixer's
  pale correlation matrix is showing. Linkage disequilibrium and its decay are
  standard population genetics; any text covers the measure.
- **Why sex**: Fisher (1930) and Muller (1932) on recombination speeding
  adaptation; the *mixability* argument (Livnat, Papadimitriou, Dushoff & Feldman,
  *PNAS* 2008) and sex as multiplicative-weights updates on a coordination game
  (Chastain, Livnat, Papadimitriou & Vazirani, *PNAS* 2014). Their reading assumes
  weak, fitness-proportional selection; the tournaments here are stronger.
- **Cooperative coevolution**: Potter & De Jong (PPSN 1994). Its tendency to settle
  on Nash points of the row/column game rather than the global optimum
  (Wiegand's dissertation; Panait, Luke and colleagues, mid-2000s — as recalled,
  check the exact papers) is why the Prom's fixed points are the alternating
  heuristic's traps.
- **Uniparental inheritance**: the mitonuclear coadaptation literature (Rand,
  Haney & Fry's 2004 review, as recalled); *doubly* uniparental inheritance in
  *Mytilus* mussels (Zouros and colleagues, 1990s) is the literal shape of the Prom;
  the passenger half is the *mother's curse* (Frank & Hurst 1996; Gemmell, Metcalf
  & Allendorf 2004).
- **The judges' own papers** are named in the table above; for the two-way split
  as *biclustering*, Hartigan (1972) and the survey by Madeira & Oliveira (2004).
- **The statistics this app leaves out** — search-aware calibration, fixed-margin
  nulls, and why a p-value for a split you searched for must pay for the search —
  are the monograph's subject and a later chapter here.
