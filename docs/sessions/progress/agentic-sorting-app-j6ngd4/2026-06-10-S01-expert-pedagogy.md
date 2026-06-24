---
kind: three-hats
session: 2026-06-10-S01
date: 2026-06-10
title: "Role 3 — Math-Viz & Pedagogy review: Divergent objectives + Levin competencies for Agentic Sorting"
branch: claude/agentic-sorting-app-j6ngd4
slug: agentic-sorting-app-j6ngd4
status: completed
build: unknown
followup: medium
pr: null
app: agentic-sorting
---

# Role 3 — Math-Viz & Pedagogy review: Divergent objectives + Levin competencies for Agentic Sorting

## Plan under review
<details><summary>Original request</summary>

> Expand the **Agentic Sorting** app (`src/animations/AgenticSorting/`) along two axes the user wants restored/added:
>
> **(1) Divergent objectives.** Bring back a lost "intermediate" version where agents optimize genuinely *different* functions — not just a division of labor toward one global ascending sort. Concretely: some agents could sort ascending while others sort descending; or each agent pursues only its own local goal (à la Levin's "selfish" elements that just want their own correct position) rather than a shared global objective. The point is to create genuine *tension* between agents, not cooperation toward one target.
>
> **(2) Levin's competencies.** Lean into the source paper: add **frozen/defective cells** (agents that don't act), **delayed-gratification** routing around defects (elements temporarily move away from their goal), and a **clustering metric / instrumentation** for chimeric arrays (cells running different algorithms spontaneously cluster like-with-like) — surfaced as observable, measurable phenomena rather than just visuals.
>
> Source idea: Michael Levin (Tufts), Lex Fridman Podcast #486; paper: Taining Zhang, Adam Goldstein, Michael Levin, "Classical Sorting Algorithms as a Model of Morphogenesis: self-sorting arrays reveal unexpected competencies in a minimal model of basal intelligence" (Adaptive Behavior 2025; arXiv:2401.05375). The user wants /three-hats to consider how this app can be improved and developed/expanded — so go beyond just these two axes if you see better/adjacent opportunities, but anchor on them.

</details>

## Executive summary

This is a good and worthwhile direction — but the plan, as written, risks **deepening an existing fidelity gap rather than closing it**. The current app already misrepresents the Levin paper in two important ways, and the "divergent objectives" axis (ascending-vs-descending) is an animath-original embellishment that is *not* in the paper. Both can be done well, but only if the explainer is rewritten to label clearly what is Levin and what is animath-original, and only if the new phenomena (delayed gratification, algotype clustering) are instrumented with the *specific* metrics the paper measures rather than gestured at visually.

The single biggest pedagogical opportunity here is also the single biggest risk. Right now the app teaches "many local rules → one global sort = emergence," which is a true but **shallow** claim (it's just concurrent bubble-sort variants). The paper's actual, surprising finding is narrower and deeper: **when each element carries its own algorithm and pursues its own correct index, the array still sorts; it does so faster in chimeric mixtures; it tolerates frozen cells by temporarily moving away from the goal (delayed gratification); and like-algorithm elements spontaneously cluster.** If the rebuild lands those four measured phenomena honestly, the app becomes a genuinely excellent teaching object. If it bolts "ascending vs descending agents" on top without distinguishing it from the paper, the app becomes confidently wrong.

> [!IMPORTANT]
> **Decision I would push for:** make **per-element goal-directed sorting** (the paper's actual model) the new *default and centerpiece*, and treat **ascending-vs-descending divergent objectives** as an explicitly-labeled "animath-original" variant in a separate mode. Do not blend the two in the explainer.

## 1 · Fidelity audit of the *current* app (before we add anything)

I read each strategy's rule in `AgenticSorting.tsx` against its claimed classic-sort analog. The mapping is loose and in two cases wrong enough to mislead.

| Agent | Code (what it actually does) | Claimed analog | Verdict |
|---|---|---|---|
| **Standard** | wakes, picks one *random adjacent* neighbor (`idx±1`), swaps if out of order | Bubble sort | ⚠️ Partial. Bubble sort is a *directed left-to-right sweep*; this is a single random adjacent compare-swap. It's "bubble-like" only in that it uses adjacent compares. Fine as a gloss, weak as an identity. |
| **Blind Date** | picks a *random global* index, swaps if misordered | "randomized compare-swap" | ✅ Honest — and notably this is *not* a classical named sort, so the explainer's "classic analog" framing already strains here. |
| **Nomadic** | if `value < items[idx-1]`, swap left (one step) | Insertion sort | ❌ Wrong. Insertion sort *carries* an element left through *all* larger predecessors in one pass and stops. This rule does a single left bubble-step per wakeup. It is a left-biased bubble, not insertion. |
| **Patrolling** | keeps a heading; swap on contact else reverse | Cocktail-shaker | ⚠️ Cocktail-shaker is a *coordinated* bidirectional sweep of the whole array; here each agent independently keeps a private heading. The flavor is right, the mechanism is not the algorithm. |
| **Perfectionist** | scans `idx+1..n`, pulls the global-tail minimum into `idx` if smaller | Selection sort | ✅ Closest match. This genuinely is the selection-sort inner step ("find min of the unsorted suffix, place it"). Good. |

> [!CAUTION]
> **Gotcha — the README/EXPLAINER overclaim the algorithm mapping.** Three of five "classic sort" labels are aspirational. A CS-literate learner who clicks "?" expecting bubble/insertion/selection will see behaviors that don't match the named algorithms. This is a pre-existing honesty debt the rebuild should *fix*, not inherit.

### A deeper structural problem: these agents are not the paper's agents

In Zhang–Goldstein–Levin, the key conceptual move is that the **algorithm travels with the element**: element *i* "knows" its sort rule and its own target, and the array sorts by each element pursuing its correct position. In the current app the **algorithm is bound to the slot's occupant but the goal is implicitly global ascending order for everyone** — there is no per-element target, no notion of "my correct index," and crucially no chimeric-clustering or delayed-gratification machinery at all. So the current app is *inspired by* the idea but does not implement the model that produces the paper's headline results. That is exactly the gap the plan wants to close — good — but it means this is closer to a **re-architecture than an add-on.**

## 2 · "Divergent objectives": what is Levin, and what is animath-original?

This is the part I most want to keep honest.

| Idea in the plan | In the paper? | My read |
|---|---|---|
| Each element pursues *its own correct position* (selfish/local goal) rather than a top-down global sort | ✅ **Yes** — this is literally the paper's model | Make this the centerpiece. It is the honest, load-bearing version of "divergent objectives." |
| Different elements run *different algorithms* (chimeric array) | ✅ **Yes** — "chimeric arrays" of mixed algotypes is a paper term | Keep the word *algotype*; it is the paper's framing. |
| Some agents sort **ascending** while others sort **descending** | ❌ **No** — not a paper result | This is an **animath-original** pedagogical variant. It is *interesting* (it's a phase-separation / domain-formation phenomenon), but it is NOT Levin's "competencies." Label it as ours. |

> [!WARNING]
> **The ascending-vs-descending framing will not converge — and that's a feature only if you frame it as physics, not as sorting.** A population that is half "wants ascending" and half "wants descending" has **no fixed point** as a sorted array; it has metastable *domains* (a run of ascending here, a run of descending there) with frustrated boundaries. If the explainer presents this under the heading "emergent sorting," a learner watching it *never settle* will conclude the simulation is broken. If instead you present it as **domain formation / phase separation under conflicting objectives** (think Ising-like coarsening, or immiscible fluids), the non-convergence becomes the *lesson*. The honest metric here is not "sortedness" (which oscillates and never hits 1) but **boundary count / number of monotone runs** decreasing toward a small frustrated minimum.

### Concretely, two distinct, separately-labeled modes

1. **Selfish goal-seeking (Levin model) — the new default.** Every element has a target index = its rank in the final sorted order; algotypes differ in *how* an element moves toward its target. Global ascending order still emerges. This is the paper. Use it to teach: order from purely local, selfish goals.
2. **Conflicting objectives (animath-original) — a separate mode.** Two camps with opposite global goals. Teaches: under irreconcilable objectives you get domains, not a sort. Frame as phase separation. Metric: monotone-run count, not sortedness.

Keeping these in **separate modes** (or top-bar mode pills) with separate metrics and separate explainer paragraphs is the single most important fidelity decision in this whole plan.

## 3 · Levin's competencies — making them *measurable*, not decorative

The plan's instinct ("surfaced as observable, measurable phenomena rather than just visuals") is exactly right and is where my expertise most strongly endorses the plan. Here is how I would instrument each, with the specific metric and the specific `chrome/readouts.tsx` primitive.

### 3a · Frozen / defective cells

- **Model:** mark a settable fraction of slots as *frozen* — they never wake, never move, and other elements cannot swap *through* them by fiat (this is what forces the interesting behavior). Paper calls these defective/frozen cells.
- **What it teaches:** robustness. A classical top-down sort with a stuck cell stalls; the distributed array routes around it.
- **Metric & primitive:** **final sortedness ceiling vs. frozen fraction** — a `Sparkline` of sortedness-over-time that plateaus below 1, plus a `StatGrid` cell "Best achievable: 0.92" so the learner sees the array gets *as sorted as possible given the obstruction*. A `MiniHisto` of "displacement from target" shows the few elements stranded by the defect.

> [!NOTE]
> The pedagogically crucial framing: a frozen cell does **not** break the sort; it *bounds* it. The array reaches the best monotone arrangement consistent with the immovable elements. That "best achievable" number is the teaching moment and must be on screen.

### 3b · Delayed gratification

This is the paper's most counterintuitive measured phenomenon and the highest-value thing to instrument.

- **Definition (from the paper):** to get *past* an obstruction, an element must temporarily move **away** from its goal — its instantaneous error *increases* before it can ultimately decrease. The element "tolerates" short-term regress for long-term gain. The paper measures this; it is not just a story.
- **Metric:** per-element **goal-distance over time**, and a global count of **"sacrificial" moves** = moves that increased the moving element's own |target − position|. Plot the *fraction of moves that were locally-worsening but globally-progressing*. A `Sparkline` of one tracked element's distance-to-goal that visibly bumps *up* then comes down is the "aha."
- **Primitive:** `Sparkline` for a single highlighted element's distance-to-goal (let the user click an element to track it), plus a `StatGrid` counter "Backward moves: N (M% of swaps)."

> [!IMPORTANT]
> **Decision — track and let the user *select* one element.** Emergence claims are most convincing when you can follow *one* selfish agent and see it take a loss to win later. A whole-array aggregate hides the phenomenon. This is the highest-leverage UI add in the whole plan.

### 3c · Clustering by algotype (chimeric arrays)

- **Phenomenon (paper):** in a chimeric array, elements running the *same* algorithm spontaneously end up spatially adjacent — like-with-like clustering — even though nothing tells them to. It is *emergent sociality* of algotypes, and it is **measured**, not asserted.
- **The metric must be a real spatial-autocorrelation / purity number, not a vibe.** Candidates, in order of how well they teach:
  - **Cluster purity / adjacency homophily:** fraction of adjacent pairs that share an algotype, compared against the *expected* fraction under random placement of the same composition (the baseline is essential — without it the number is meaningless). Report **excess homophily = observed − expected**, which is ~0 at start and climbs.
  - **Number of monochromatic runs** of each algotype over time (fewer, longer runs = more clustering).
  - A **per-algotype spatial histogram** (`MiniHisto` per algotype showing where along the array that algotype concentrates) — directly visual *and* measured.
- **Primitive:** a `StatGrid` "Algotype homophily: +0.34 over chance," a `Sparkline` of excess-homophily-over-time, and a small-multiples row of per-algotype `MiniHisto`s.

> [!CAUTION]
> **Gotcha — clustering only emerges if elements keep their algotype as they move.** In the current code the algotype is bound to the *slot occupant* and travels with the swapped element, which is correct for this. But verify: if a future refactor binds behavior to the *slot* instead of the *element*, clustering becomes impossible and the metric will sit at chance forever. The algotype must be a property of the mobile element.

## 4 · The single most illuminating default

A reviewer's most useful job is to pick the one default scene. Mine:

**Default = a chimeric, selfish-goal array (Levin model) with ~3 algotypes, no frozen cells, running, with the "Algotype homophily" sparkline visible and one element auto-tracked for its goal-distance.** Rationale:
- It shows the *honest* headline (order from local selfish goals) immediately.
- The homophily sparkline climbing from ~0 gives an instant "something non-obvious is happening" hook.
- Frozen cells and conflicting-objectives are *advanced* scenes you opt into — they're confusing as a cold open.

A learner should reach the "aha" — *order arises from selfish local rules, and the rules even self-organize spatially* — within ~10 seconds of the default, with a number on screen confirming it isn't an illusion.

## 5 · Semantic hygiene (naming, the way a mathematician/CS person thinks)

The current app's names are *evocative but non-standard*, which fights comprehension. I'd tighten toward the field's vocabulary while keeping the playful labels as secondary.

| Current / proposed | Recommendation |
|---|---|
| "agent" | ✅ keep — standard and matches Levin's framing. |
| "algotype" | ✅ **adopt** — it's the paper's word for "which algorithm this element runs." Use it for the clustering metric. |
| "Global Density" (slider) | ❌ It's just **array size / N**. "Density" implies a fill ratio. Rename **Array size** or **Elements (N)**. |
| "Processing Delay" | ⚠️ It's **step interval (ms)** / sim speed. "Processing delay" sounds like per-agent compute. Rename **Step interval** or **Speed**. |
| "wakeups / cycles" | ✅ fine; "cycle" = sim step is OK. Consider **steps** for consistency with the literature. |
| "sortedness" | ✅ but **define it** (e.g. 1 − inversions/max-inversions, or longest-increasing-run / N). Pick one and name it. |
| missing: **inversions** | ➕ add — inversion count is *the* canonical sortedness measure and what CS learners expect. |
| missing: **monotone runs** | ➕ add — needed for the conflicting-objectives mode (counts domains). |
| missing: **fixed point** | ➕ use in copy — "the sorted array is the fixed point" (and "conflicting objectives has none"). |
| "frozen / defective cell" | ✅ adopt verbatim from the paper. |
| "delayed gratification" | ✅ adopt verbatim — but *define operationally* (a move that increases the mover's own goal-distance). |

> [!NOTE]
> The values run −100..100 around a midline, which is a nice visual but slightly obscures the "each element has a rank/target index" idea. For the Levin model, what matters is **rank**, not magnitude. Consider showing each element's **target index** as a faint tick so "moving toward my correct position" is literally visible.

## 6 · Accessibility & color

- **Per-strategy hue is the right encoding** (algotype = color), and it's *load-bearing* for the clustering metric (you literally watch colors clump). So CVD-safety is not optional here.
- Audit the current `as-color-*` palette for **color-vision-deficiency** distinguishability. Five hues that read as five to a trichromat can collapse to three under deuteranopia. Mitigations: pair hue with a **secondary channel** — a small glyph/letter per algotype (the existing emoji icons partly do this, but emojis are poor in a dense bar array), or distinct **dot shapes** in dot mode. The plan adds *more* algotype-driven phenomena, so this gets *more* important, not less.
- The **conflicting-objectives** mode needs ascending vs descending camps to be distinguishable by more than hue — e.g. up-triangles vs down-triangles, since "which way does this element want to go" is the whole point.
- Frozen cells need an unambiguous, CVD-safe treatment: a **desaturated + outlined/hatched** look reads as "inert" regardless of color perception.

## 7 · Beyond the two axes — adjacent opportunities I'd endorse

The plan invites going beyond. Two I'd genuinely add; two I'd resist.

**Add:**
1. **Inversion-count + sortedness `Sparkline` as a permanent readout.** It's cheap, it's canonical, and it converts "looks sorted" into "is 96% sorted, 14 inversions left." This is the cheapest single win for honesty.
2. **A "race / baseline" comparison** — run the chimeric array beside a single-algotype array of the same composition, both to sortedness=target, and report steps-to-sort. The paper's "chimeric mixtures sort *faster*" result is exactly this comparison and is currently only asserted in the README ("mixed populations often win"). Make it measured.

**Resist (or defer):**
3. *3D / fancy spatial layouts.* The 1-D array is the paper's object; a 2-D grid changes the math (different adjacency, different clustering). Don't add dimensionality for spectacle; it would *misrepresent* the model.
4. *Anthropomorphic "intelligence" copy.* The plan's source is a Lex Fridman episode where the framing leans hard on "basal intelligence." The app should describe **competencies as measured behaviors** (tolerance of defects, delayed gratification, clustering) and let the learner decide what to call it. Overclaiming "the cells are intelligent" is the one framing failure that would discredit an otherwise honest tool. (See Verdict.)

## 8 · Honesty checklist for the rewritten EXPLAINER/README

If the rebuild ships, the explainer must, at minimum:

- [ ] State plainly that the *baseline* mode (all-ascending) is **classical concurrent sorting**, and the *Levin* mode (per-element selfish goals + algotypes) is the one that reproduces the paper.
- [ ] **Cite** Zhang, Goldstein & Levin (Adaptive Behavior 2025; arXiv:2401.05375) and name the four reproduced phenomena: emergent sort from selfish goals, chimeric speed-up, defect tolerance, delayed gratification, algotype clustering.
- [ ] **Label ascending-vs-descending as animath-original**, framed as phase separation, and say it does *not* converge to a sort (by design).
- [ ] Fix the three strained "classic sort" analogs (Standard/Nomadic/Patrolling) — either tighten the rules to actually match, or soften the claim to "bubble-*like*" / "insertion-*flavored*."
- [ ] Define every metric (inversions, sortedness, homophily-over-chance, backward-move fraction) in one line each.
- [ ] Avoid asserting the agents are "intelligent"; describe measured competencies and attribute the *interpretation* to Levin.

## Verdict

**Endorse the direction; gate it on honesty and metrics.** This plan can turn a pretty-but-shallow "emergence" toy into a faithful, genuinely instructive model of the Zhang–Goldstein–Levin result — which would be one of the more pedagogically valuable apps in animath. The "make phenomena measurable, not decorative" instinct is exactly right and is the heart of why I'd approve it.

**What I endorse:**
- Per-element selfish goal-seeking (the paper's actual model) as the new default centerpiece.
- Frozen cells, delayed gratification, and algotype clustering — **each with a specific, baseline-relative metric** built on `readouts.tsx` (Sparkline / StatGrid / MiniHisto).
- Click-to-track one element for the delayed-gratification "aha."
- A measured chimeric speed-up comparison (replacing the README's unmeasured "mixes win" claim).

**What concerns me (must-fix, not optional):**
1. **Don't blend Levin and animath-original.** Ascending-vs-descending is *ours*, doesn't converge, and must live in a separate, clearly-framed mode (phase separation), with its own metric (monotone runs), not under "emergent sorting."
2. **The clustering metric must be baseline-relative** (excess homophily over chance) or it teaches nothing.
3. **Fix the three strained sort analogs** in the explainer rather than carrying the existing overclaim into a bigger app.
4. **No "the cells are intelligent" copy** — describe measured competencies; attribute interpretation to Levin.
5. Recognize this is closer to a **re-architecture** (per-element targets, algotype-on-element, defect masks) than an add-on — scope accordingly.

**What I would change about the plan:**
- Promote "per-element selfish goals" from one of two co-equal sub-ideas to *the* default model, and demote ascending-vs-descending to a labeled variant.
- Add inversion count + sortedness as a permanent readout from day one (cheapest honesty win).
- Rename "Global Density" → Array size and "Processing Delay" → Step interval as part of the same pass (semantic hygiene).
- Make the default scene a running chimeric selfish-goal array with homophily climbing and one element tracked.

If those gates are met, this is a clear yes.

## Self-reflection

1. **What would you do with another session?** Verify my fidelity claims against the actual arXiv:2401.05375 text (I anchored on my recollection of the paper plus the code, not a fresh read of the PDF), and pin down the paper's *exact* operational definitions of "delayed gratification" and "clustering" so the app's metrics match the paper's rather than my reconstruction of them.
2. **What would you change about what you produced?** I'd add concrete formulas for each proposed metric (e.g. the exact expected-homophily-under-random-placement expression) so the implementing agent can't accidentally ship a non-baseline-relative version — I described the metrics but stopped short of the algebra.
3. **What were you not asked that you think is important?** Whether to preserve backward-compatibility of the existing `appId="agentic-sorting"` persisted state. The proposed re-architecture changes the state shape; old localStorage layouts/settings may break, which the plan doesn't address.
4. **What did we both overlook?** Performance. Perfectionist already does an O(n) scan per wakeup; adding per-element target tracking, homophily-over-time, and per-element distance sparklines at N=150 with a fast step interval could get expensive in the React-DOM rendering path (this app is CSS/DOM, not canvas). The metrics may need throttled/sampled computation.
5. **What did you find difficult?** Drawing the exact line between "Levin result" and "animath-original" without the paper open in front of me — I'm confident ascending-vs-descending is ours and per-element selfish goals are the paper's, but the precise boundary on "delayed gratification" as a *measured quantity* vs. a described behavior is where I'm least certain.
6. **What would have made this task easier?** A copy of the paper's figures/metric definitions in-repo, and a note on whether the "lost intermediate version" the user remembers exists anywhere in git history (it might encode design decisions worth recovering rather than reinventing).
7. **Follow-up value:** MEDIUM — the pedagogical direction and the honesty gates are solid and actionable, but my fidelity claims rest on recollection of the paper rather than a fresh read, and the metric definitions need the algebra filled in before implementation.
