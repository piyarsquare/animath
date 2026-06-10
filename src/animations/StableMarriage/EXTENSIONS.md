# Stable Marriage — Possible Extensions

A design backlog of explorable ideas for the Stable Marriage app. Each one is a
self-contained mode or experiment that builds on the existing engine
(`StableMarriage.tsx`): `generatePreferences`, `stepSimulation` /
`runToCompletion`, `runHeadlessSimulation`, `verifyStability` (already counts
blocking pairs), and `rankStats` (already computes per-side average ranks and
rank distributions). None of these have been built yet — this file captures the
math, the user-facing payoff, and the concrete engine hooks so a future session
can pick any of them up.

> **One framework note that touches several ideas below.** The current engine
> uses a *mixed-proposer* model: each step picks the proposer's side at random,
> weighted by the **Proposer bias** knob (`stepSimulation`, lines ~620–642). The
> clean theorems about strategy, rotations, and proposer-optimality are stated
> for **deterministic one-sided** deferred acceptance (one side always
> proposes). Most of the strategy/lattice extensions below want a "pure
> one-sided" mode — equivalently, lock the bias to 0% or 100%. Several also need
> a notion the engine currently lacks: **unacceptable partners** (a truncated
> preference list). Adding an "acceptability cutoff" per agent is a shared
> prerequisite for ideas 1, 2, and 4.

---

## A. Strategy & incentives

### 1. Strategic manipulation by a single agent (truncation)

**The idea.** Gale–Shapley is *not* strategy-proof for the receiving side. A
receiver who knows the preference profile can misreport — specifically, *truncate*
her list (declare partners below some cutoff "unacceptable", even though they
aren't) — and end up with a strictly better partner.

**The math.**
- *Proposers can't gain.* Truth-telling is a dominant strategy for the proposing
  side (Dubins–Freedman 1981; Roth 1982).
- *Receivers can.* By truncating, a receiver can obtain her partner in the
  *receiver-optimal* stable matching — her best achievable partner — and never
  anything better (Demange–Gale–Sotomayor 1987, "limits on manipulation").
  Truncation strategies suffice; she never needs to reorder.
- *It's risky.* Truncate too aggressively (above her best stable partner) and the
  rejection cascade leaves her **unmatched** — worse than honesty. The safe
  cutoff requires knowing the profile.

**Worked example** (men propose; cyclic 3×3 — also the seed for idea 2):

```
m1: w1>w2>w3      w1: m2>m3>m1
m2: w2>w3>w1      w2: m3>m1>m2
m3: w3>w1>w2      w3: m1>m2>m3
```

Honest men-proposing GS gives every man his #1 and every woman her #3
(`m1w1, m2w2, m3w3`). If **w1 truncates to "only m2 acceptable"**, the rejection
chain reshuffles the whole board and she lands her #1 (`m2`). Her honest result
was her #3 — a two-rank gain by lying.

**What to build.** A "Manipulation" mode: pick one agent, show her honest
outcome, let her drag a truncation cutoff on her own list, re-run one-sided DA,
and display the before/after partner + a banner ("she reached her best stable
partner" / "she truncated too far → unmatched").

**Engine hooks.** Needs the acceptability-cutoff prerequisite; a deterministic
one-sided run; reuse `rankStats` for the before/after rank readout.
**Size:** medium.

---

### 2. The stable-matching lattice & rotation explorer

**The idea.** The set of *all* stable matchings of a profile is not a pile — it's
a **distributive lattice**, with the proposer-optimal matching at the top and the
receiver-optimal at the bottom. You travel down it by eliminating **rotations**:
cyclic partner-swaps. This is the structure behind "exploring all stable
positions," and it's directly tied to coalitional lying.

**The math.**
- Every stable matching corresponds to a *down-set of rotations* (which cycles
  you've fired).
- *Reachability* (Gale–Sotomayor 1985; Roth 1984): when men propose truthfully,
  the set of Nash-equilibrium outcomes of the women's lying game is **exactly**
  the set of stable matchings of the true preferences. For any stable matching μ,
  if **each woman truncates right after her μ-partner**, men-proposing GS outputs
  μ. So the coalition can steer the result to *any* node in the lattice — and
  nothing outside it.
- *Choosing truncation depth = choosing which rotations to fire = choosing your
  lattice node.* Woman-optimal is the focal point (it Pareto-dominates the other
  stable matchings for women), but the interior nodes are reachable equilibria
  too.

**Worked example** (same cyclic 3×3). The lattice is a clean chain of two
rotations with three stable matchings:

| Node | Matching | Women get | Women's report |
|---|---|---|---|
| top (man-optimal) | m1w1, m2w2, m3w3 | all #3 | tell the truth |
| middle | m1w2, m2w3, m3w1 | all #2 | truncate at 2nd choice |
| bottom (woman-optimal) | m1w3, m2w1, m3w2 | all #1 | truncate at 1st choice |

**What to build.** A lattice visualizer: enumerate stable matchings (small n),
draw them as a Hasse diagram, let the user click a rotation-cycle to fire it and
walk the lattice, and show the truncation profile each woman would report to
realize the selected node. The rotation cycles are literally the "frustration
cycles" worth animating.

**Engine hooks.** Needs a stable-matching enumerator (rotation poset, or
brute-force for n ≤ ~8) — new logic. Reuse `verifyStability` to sanity-check each
node. **Size:** large (the most ambitious idea here, but the highest payoff
pedagogically).

---

## B. Welfare & stability

### 3. Price of stability — stable vs. welfare-optimal

**The idea.** Stability has a cost. Compare the best *stable* matching against the
matching that maximizes *total* happiness (minimizes total rank) ignoring
stability. The gap can be large, and it falls almost entirely on the receiving
side.

**The math.** For random preferences with n per side (men proposing):

| Matching | Proposing side avg rank | Receiving side avg rank |
|---|---|---|
| Stable (proposer-optimal) | ≈ ln n | ≈ n / ln n |
| Welfare-optimal (min total two-sided rank) | ≈ √n | ≈ √n |

Stability is costly — but welfare maximization isn't free for the *proposer*
either. Minimizing the **total two-sided rank** balances the two sides at ≈ √n
each: it lifts the receiving side dramatically (from ≈ n/ln n down to ≈ √n) but
pulls the proposing side *down* from its near-optimal ≈ ln n to ≈ √n. The reason
the welfare floor is √n and not a constant: a low *combined*-rank edge has to be
good for **both** endpoints, and a person has only ~k²/n partners who rank each
other within their mutual top k — so mutually-top-k matches don't become
plentiful until k ≳ √n. The net price of stability is still large (the receiving
side's ≈ n/ln n vs. ≈ √n dominates), and the **Consensus** knob is the dial for
how bad the stable side gets: high consensus (everyone agrees who's desirable) ⇒
fierce competition ⇒ the receiving side's rank balloons. Low consensus ⇒ nearly
everyone can get a top choice ⇒ stability is almost free.

**Contrasting insight worth surfacing.** *Highly symmetric* instances can have
**zero** gap. In the cyclic 3×3 above, *all six* perfect matchings have identical
total rank (12) — there's no welfare lever at all. The gap is an artifact of
*asymmetry*, which is exactly what consensus + noise produces.

**What to build.** A side-by-side panel: the GS stable matching vs. the
min-total-rank matching (solved as an assignment problem — Hungarian algorithm),
with both total welfares and the blocking-pair count of the optimal one. A small
multiple across consensus levels makes the n/ln n blow-up visible.

**Engine hooks.** Add a min-cost assignment solver (cost = rank). Reuse
`rankStats` and `verifyStability`. The Lab's heatmap machinery
(`runHeadlessSimulation`, `Heatmap`) is a ready home for a "price of stability vs.
consensus" sweep. **Size:** medium.

---

### 4. Near-stable matchings — trading frustration for welfare

**The idea (the "one frustration" question).** A blocking pair is one frustrated
couple. Instead of demanding *zero* blocking pairs, ask: **if we tolerate just
one (or k) blocking pairs, how much total happiness can we buy?** Define

> **f(k) = maximum total welfare over all matchings with at most k blocking
> pairs.**

`f(0)` is the best stable matching; `f(∞)` is the welfare-optimal matching
(idea 3). The frontier `f(0), f(1), f(2), …` is the explorable object. The
sharp form of your question: *is `f(1)` ever dramatically better than `f(0)`?* —
i.e., does the **first** unit of tolerated frustration unlock a big welfare jump?

**What the theory suggests.**
- The *total* attainable gain `f(∞) − f(0)` is large for random/high-consensus
  instances (the receiving side falls from ≈ n/ln n toward the ≈ √n welfare floor;
  see idea 3), so there is real room.
- Whether the **first** blocking pair captures a big chunk of it is an empirical,
  instance-dependent question — which is exactly why a tool is the right way to
  study it. A natural **hypothesis**: returns are concentrated and diminishing —
  the highest-value blocking pair (the one resolving the worst frustration) is
  worth the most, so `f(1) − f(0)` is often the biggest single step, and the
  effect is most dramatic at **high consensus** (where stability hurts most).
- Caution: symmetric instances (idea 3) have a *flat* frontier — `f(k)` is
  constant — so the tool should let you hunt across seeds/consensus for the
  dramatic cases rather than assume them.

**What to build.** A "relax stability" slider: allow up to k blocking pairs, find
the welfare-maximizing matching subject to that budget (exact for small n via
search; a local-search heuristic for larger n — start from welfare-optimal and
repair down to k blocking pairs), and plot the `f(k)` curve. Highlight *which*
pair you let frustrate and *who* benefits. The headline readout: "tolerating 1
frustrated couple raised average happiness from X to Y."

**Engine hooks.** `verifyStability` already returns the blocking-pair *count* —
extend it to return the *list* of blocking pairs. Reuse `rankStats` for welfare.
**Size:** medium–large (the optimization is the hard part; small-n exact search
ships first).

---

## C. Perturbations & dynamics

### 5. Entrant externalities — "add a couple and watch the dominoes"

**The idea.** Matching outcomes are *non-monotone* under entry. Adding agents
triggers rejection chains that can demote a whole sequence of incumbents.

**The math (direction is predictable).** Under men-proposing DA:
- Adding a **man** weakly **helps every woman** and weakly **hurts every man**.
- Adding a **woman** does the mirror image.
- A **couple** does both: the new woman pressures incumbent women down, the new
  man pressures incumbent men down.

**Worked example.** Two happy couples (`m1–w1` at #1/#1, `m2–w2` at #1/#2), then a
new man **m3** and woman **w3** arrive:

```
m1: w1>w2>w3      w1: m3>m1>m2     ← w1 secretly prefers the newcomer
m2: w1>w2>w3      w2: m1>m2>m3
m3: w1>w2>w3      w3: m1>m2>m3
```

Re-running GS gives `m3–w1, m1–w2, m2–w3`: **both incumbent men slide down a
notch** (m1: #1→#2, m2: #2→#3), women rise. Average rank 1.5 → 1.67. Scale it up
and the cascade can be a chain of length ~n.

**What to build.** An "inject agents" control: pause a completed matching, add one
man + one woman with chosen (or random) preferences, re-run, and **animate the
rejection chain** — color each incumbent by how many ranks they moved. The
asker/asked averages tick in real time.

**Engine hooks.** The engine already supports asynchronous proposals; needs the
ability to grow `n` mid-run and re-seed `nextProposalIndices`. Reuse `PersonRow`'s
rank badge for the delta coloring. **Size:** medium.

---

### 6. Hot newcomers — rank inflation vs. structural breakups

**The idea.** Suppose everyone is in a *perfect* mutual-first-choice matching
(pure bliss), then two universally-desirable, mutually-uninterested newcomers
("Alice" and "Bob") arrive wanting to maximize misery. How much damage can they
do? The surprising answer: **far less than intuition says.**

**The math.**
- A mutual-first-choice matching is the *unique* stable matching, and is normally
  bulletproof — but only while incumbents rank their own partner #1. If the
  newcomers are ranked *above* incumbents' partners, blocking pairs reappear.
- **But each newcomer occupies exactly one slot.** Bob (a man) marries exactly one
  woman; once he does, no *other* woman who longs for him forms a blocking pair,
  because Bob himself doesn't want to leave. He neutralizes his own disruptive
  potential by saying "I do" once.
- So hotness splits into two effects: **rank inflation** (subjective, nearly
  universal — everyone's partner now feels like #2 because there's an
  unreachable #1) vs. **actual breakups** (structural — at most ~**two** couples,
  the ones the newcomers physically marry into).
- The cascade can't propagate because **no incumbent prefers a *different*
  incumbent to their own partner** — stability shields the population. To actually
  reshuffle everyone you need ~n disruptive newcomers, not two supermodels:
  **damage scales with the *number* of newcomers, not their hotness.**

**Worked example.** Three blissful couples; Bob and Alice on top of every list,
loathing each other:

```
m1: Alice>w1>w2>w3     w1: Bob>m1>m2>m3
m2: Alice>w2>w3>w1     w2: Bob>m2>m3>m1
m3: Alice>w3>w1>w2     w3: Bob>m3>m1>m2
Bob: w1>w2>w3>Alice    Alice: m1>m2>m3>Bob
```

Result: `m1–Alice`, `w1–Bob` (two incumbents trade *up* and are delighted),
`m2–w2`, `m3–w3` **stay together** but now feel #2. Average rank 1.0 → 1.5: a
near-universal one-notch malaise, but only one incumbent couple actually
dissolved (and happily).

**What to build.** A special case of idea 5's injector: seed a perfect
mutual-first matching (all green/#1), drop in two universally-top-ranked
adversarial agents, and visually separate **longing** (flipped to #2, same
partner) from **losing** (actually re-wired). A counter: "couples actually broken:
2; people merely envious: n−2."

**Engine hooks.** Same as idea 5, plus a "perfect matching" seed generator (assign
mutual #1) and a two-tone highlight. **Size:** small once idea 5 exists.

---

### 7. Continuous-time / dynamic matching

**The idea.** Real markets aren't a single batch. Agents *arrive and depart* over
time, and matches form continuously. The central tension is **thickness vs.
speed**: waiting to accumulate more candidates improves match quality, but
waiting risks agents leaving unmatched (and leaves people lonely meanwhile).

**The math / landscape.** This is the dynamic-matching literature (e.g.
Akbarpour–Li–Saberi on waiting and market thickness; online bipartite matching;
Doval on dynamically stable matching). Key questions a sandbox can make tangible:
- *Greedy vs. patient policies*: match each arrival immediately to the best
  available partner, vs. batch arrivals into periodic clearings. How does average
  match quality and the unmatched/"perished" rate trade off?
- *What does "stable" even mean over time?* A pair can become blocking only while
  both are present; dynamic stability has to account for arrivals/departures.
- *Cost of impatience*: agents with short "patience windows" (depart if unmatched
  in time) systematically do worse — a timing disadvantage that connects directly
  to idea 8.

**What to build.** A timeline mode: agents appear on a clock with random
arrival/departure times; a policy knob (immediate-greedy ↔ periodic-batch ↔
threshold-wait); live readouts of average match rank, fraction matched, and
fraction who departed unmatched. A second curve sweeps the batching interval to
show the thickness/speed frontier.

**Engine hooks.** The biggest departure from the current static model — needs an
event/clock layer and per-agent arrival/departure/patience. The proposal
mechanics and `rankStats` carry over. The Lab's batched-compute pattern
(`runBatch`) is a good template for sweeping the policy parameter.
**Size:** large.

---

### 8. Timing & the cost of missing a round ("out sick")

**The idea.** What does it cost to show up late? The answer is a genuinely
surprising teaching moment, because it depends entirely on *what kind of market*
you're in — and in the textbook case the cost is **exactly zero**.

**The math.**
- **One-shot deferred acceptance is order-independent** (McVitie–Wilson). The
  men-proposing algorithm produces the *same* man-optimal stable matching no
  matter the order in which free agents propose. So if you're merely "slow within
  a single clearing" — your proposals come later but your preferences are still in
  the pool — **you pay nothing**. Lateness inside one DA run is irrelevant.
- **Missing the round entirely is a different story.** If the market *clears
  without you* and you only get matched in a later, separate round on whoever is
  left over (the residual market), the cost can be severe: you're choosing from
  the rejects, and by the rural-hospital-style structure the leftovers are
  exactly the partners no one in the first round wanted. This is the real-world
  cost (think admissions rounds, or residency-match SOAP for the unmatched).

So the headline: **the penalty for "out sick" is not about timing within the
algorithm — it's about whether the market re-clears with you included (no cost)
or freezes the first-round matches and hands you the residuals (large cost).**

**What to build.** A two-part demo. (a) *Order-independence*: run the same
instance with several proposal orders and show the identical result — late
proposers, same outcome. (b) *Missed round*: hold one agent out, clear the market,
**freeze** those matches, then let the latecomer match only against the unmatched
remainder, and show how far below their full-participation outcome they land.
A slider for "how many agents arrive late" sweeps the residual-market penalty.

**Engine hooks.** Order-independence is almost free to demo — run
`runToCompletion` with shuffled proposal orders and diff the results. The
residual-market case needs a "lock matched agents, re-open the rest" step. Reuse
`rankStats` for the full-participation vs. residual comparison. **Size:** small.

---

## Suggested build order

1. **Acceptability cutoff** (shared prerequisite) → unlocks 1, 2, 4.
2. **Timing / order-independence (8)** and **entrant injector (5)** — small,
   high-insight, mostly reuse existing machinery; **hot newcomers (6)** falls out
   of 5.
3. **Single-agent manipulation (1)** and **price of stability (3)** — medium, both
   land big "aha" moments and reuse `rankStats` / `verifyStability`.
4. **Near-stable frontier (4)** and the **rotation/lattice explorer (2)** — the
   deepest payoffs; tackle once the cutoff and welfare-comparison pieces exist.
5. **Continuous-time (7)** — the largest, most architecturally distinct; arguably
   its own sibling app rather than a mode.

## References

- Gale & Shapley (1962), *College Admissions and the Stability of Marriage*.
- Dubins & Freedman (1981); Roth (1982) — strategy-proofness for proposers.
- Demange, Gale & Sotomayor (1987) — limits on manipulation.
- Gale & Sotomayor (1985); Roth (1984) — equilibria = stable matchings; coalitional
  truncation.
- McVitie & Wilson (1971) — order-independence of deferred acceptance.
- Gusfield & Irving (1989), *The Stable Marriage Problem* — rotations & the lattice.
- Knuth; Pittel — average-case rank asymptotics (≈ ln n vs ≈ n/ln n).
- Akbarpour, Li & Saberi; Doval — dynamic / continuous-time matching.
</content>
</invoke>
