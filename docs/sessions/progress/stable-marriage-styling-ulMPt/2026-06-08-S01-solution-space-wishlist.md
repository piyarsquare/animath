---
kind: progress
session: 2026-06-08-S01
date: 2026-06-08
title: Stable Matching — solution-space wishlist & tiered plan
branch: claude/great-thompson-ko30di
slug: stable-marriage-styling-ulMPt
status: in-progress
build: passed
followup: Roadmap/reference — drives the next several build sessions.
pr: https://github.com/piyarsquare/animath/pull/189
app: StableMatching
---

# Stable Matching — solution-space wishlist & tiered plan

> [!NOTE]
> A complete record of the solution-space vision for the app: **what the space of
> stable solutions is, where the named solutions live in it, how to traverse it,
> the algorithmic alternatives + the "resolver," the canonical *fair* algorithms,**
> and a kicker — **preference falsification** — that may deserve its own app. The
> back half is a **tiered, stepwise build plan**. This is the reference doc the
> next several sessions build against.

## 0 · The one idea that powers almost all of it

The set of stable matchings of an instance is not a random pile — it is a
**distributive lattice** (Conway's theorem; see Knuth, *Mariages Stables*, and
Gusfield & Irving, *The Stable Marriage Problem: Structure and Algorithms*, 1989).

- Order matchings by "every A-member weakly prefers their partner."
- **Top** = A-proposing Gale–Shapley (best for A, worst for B).
- **Bottom** = B-proposing GS. Everything else lives strictly between them.
- We already compute both extremes in `galeShapley.ts:extremal()`.

The moves between matchings are **rotations** (small cycles of pairs; eliminating
one slides every involved A-member to their next stable partner). The whole
lattice is encoded by the **rotation poset**:

- At most **n(n−1)/2 rotations**, buildable in **O(n²)**.
- **Stable matchings ↔ closed down-sets of the rotation poset.** You never
  enumerate n! matchings — you enumerate down-sets of a small poset.

> [!IMPORTANT]
> **The rotation poset is the keystone engine** (`rotations.ts`). One O(n²)
> structure yields *all* of the following. Extracting it is the highest-leverage
> move — exactly the role `galeShapley.ts` played for the visualizer.

| Want | From the rotation poset |
|---|---|
| List all stable matchings | enumerate its closed down-sets |
| **Count** them | = number of antichains / closed sets |
| **Stable-pair footprint** | union of matched pairs over all matchings |
| Each person's stable partners | the partner interval they cycle through |
| **Egalitarian** (min Σrank) | min-weight closed set → **min-cut** on the poset |
| **Median** matching | each agent's median stable partner |
| **Minimum-regret** | minimax over the poset |

> [!CAUTION]
> **Counting stable matchings is #P-complete** in general (Irving & Leather, 1986)
> — the lattice can be exponentially large. Our instances are *correlated* (the
> consensus knob), so the lattice is usually small and **collapses to a single
> point at full consensus**. Strategy: enumerate for small/moderate n, **cap** the
> enumeration ("≥ 500…"), and treat the blow-up itself as the science (Tier 1).

---

## 1 · The wishlist (feature catalog)

### 1.1 Seeing the space

- **Stable-pair footprint.** Outline every matrix cell matched in *some* stable
  matching. Shows the "wiggle room": just the diagonal at full consensus, fattening
  into a band as consensus drops. (Overlay on the existing matrix.)
- **Count-vs-consensus curve.** Sweep consensus, count the lattice size, plot the
  *glassiness collapse to 1* — huge lattice in the disordered (low-consensus)
  regime, exactly one stable matching at full consensus. An order/disorder phase
  curve. (Lab.)
- **Lattice Hasse diagram (small n).** Draw the actual lattice: each node a stable
  matching, A-optimal at top, B-optimal at bottom, edges = single rotations. Click
  a node → load it into the matrix. The space made literally spatial.
- **Rotation slider.** A 1-D walk A-optimal → B-optimal, eliminating rotations one
  at a time, animating partners trading. Cheap; makes proposer advantage visceral.

### 1.2 Where the named solutions live

Mark, in the lattice / on the per-side averages, *where each canonical matching
sits*. This is the "geography" of the space:

- **A-optimal** (top) and **B-optimal** (bottom) — the extremes.
- **Egalitarian** — minimizes total rank; the welfare-best point.
- **Median** — each person's median stable partner; the center of mass.
- **Minimum-regret** — protects the worst-off person.
- **Sex-equal / balanced** — the most balanced *between A and B* (NP-hard).

Lit up on the Hasse diagram and called out on the A/B average strips we just
built, this directly answers "what is the *fair* outcome, and how far is it from
where the proposing side ended up?"

### 1.3 Ways of traversing the space

- **Rotation elimination** — the canonical lattice walk (Tier 3 slider/diagram).
- **Roth–Vande Vate random path to stability** (the **resolver**) — from *any*
  matching (incl. our often-unstable synchronous runs), repeatedly satisfy a
  blocking pair → converges to *a* stable matching. Animates purple cells healing;
  samples the *interior* of the lattice.
- **Lattice meet/join** — combine two stable matchings (each agent's better/worse
  of the two partners) → another stable matching. A tactile "algebra of fairness."
- **Jump-to** — teleport directly to any named solution (1.2).

### 1.4 Algorithmic alternatives + the resolver

Current engines: one-sided GS (always stable, extremal), the synchronous round
schedules (**often unstable** — this branch's finding), and `market()`.

- **Resolver = Roth–Vande Vate (1990), "random paths to stability"** (Econometrica).
  Provably converges from any starting matching. The **number of repair steps** is
  a "cost to stabilize" Lab surface (harder = more steps at low consensus).

### 1.5 Canonical *fair* algorithms

Each selects one point in the lattice; each ties to the per-side averages (a fair
point pulls A's and B's averages together).

| Notion | Optimizes | Tractable? |
|---|---|---|
| **Egalitarian** | min **Σ ranks** (total welfare) | ✅ Poly — min-cut on rotation poset (Irving–Leather–Gusfield 1987) |
| **Median** | each gets their median stable partner | ✅ Poly (Teo–Sethuraman 1998) |
| **Minimum-regret** | min the worst-off rank (minimax) | ✅ Poly (Gusfield 1987) |
| **Sex-equal** | min \|ΣA − ΣB\| ranks | ❌ NP-hard (Kato 1993) — approx only |
| **Balanced** | min max(ΣA, ΣB) | ❌ NP-hard (Feder) — approx only |

Two facts worth surfacing in the explainer:

- **No stable mechanism is strategy-proof for both sides** (Roth 1982 impossibility).
  GS is truthful for the *proposing* side only (Dubins–Freedman); receivers can
  sometimes game it. That asymmetry *is* the proposer advantage.
- Egalitarian / median are the honest answer to "what's the *fair* outcome" —
  neither extreme, but the welfare-best or central point.

### 1.6 🎯 The kicker — Preference falsification (candidate standalone app)

> [!TIP]
> **"Gaming the Match."** Every agent *knows the algorithm* and reports a strategic
> **"official rank"** — not their true preference — to chase a secret goal. This is
> a different interaction model (a strategy/game layer), and likely **its own app**.

The theory it dramatizes:

- **Proposing side: honesty is a dominant strategy** (Dubins–Freedman). They can't
  do better by lying.
- **Receiving side can profitably manipulate** — most cleanly by **truncation**
  (declaring acceptable partners below a cutoff as "unacceptable," forcing the
  algorithm to a better stable partner). Also permutation and coalitional games.
- **Roth's impossibility**: no stable mechanism makes truth-telling dominant for
  everyone.

What the app would show:

- A **true-prefs vs reported-prefs editor** per agent (drag to reorder, set a
  truncation cutoff).
- Run GS on *reported* lists; measure each agent's **gain/loss vs truthful**.
- **Best-response dynamics** and (small n) **Nash equilibria** of the reporting
  game — watch agents iteratively adjust their lies until no one can improve.
- A **manipulability heat** — which receivers can game the match, and by how much,
  as a function of consensus (manipulability should fall as preferences correlate).

Why standalone: the editor + best-response + equilibrium machinery is a *game*
layer, not a matching visualizer. It reuses `model.ts` + the GS engine but adds a
whole interaction model. Candidate route: `#/strategic-matching`. (Decision
deferred — could also ship as an advanced *mode* of Stable Matching first.)

---

## 2 · Tiered, stepwise build plan

Each tier is independently shippable, builds on the prior, and is verified by
`npm run build` + a screenshot (and, where math is involved, a brute-force
cross-check at small n). Effort: **S / M / L**.

### Tier 0 — Engine: the rotation poset · **M** · *(no deps)*

- New `rotations.ts`: from `extremal()` (A-optimal & B-optimal), find all
  rotations and build the rotation poset (Gusfield–Irving, O(n²)).
- API: `allStableMatchings(inst, cap?) → Matching[]`, `stablePairs(inst) → Set`,
  `countStable(inst, cap?) → {count, capped}`.
- **Verify:** brute-force enumerate all n! matchings at n ≤ 7 and cross-check the
  set/count exactly. This is the only place we can be wrong about the math, so test
  it hard.
- **Deliverable:** the keystone. No UI yet (or a debug count in the headline).

### Tier 1 — Footprint + count · **S–M** · *(deps: T0)*

- **Footprint overlay**: outline every cell in `stablePairs` on the matrix
  (a distinct stroke; legend key). Toggle in Display.
- **Count headline**: "k stable matchings" (or "≥ cap") in the metrics row.
- **Count-vs-consensus** Lab surface/curve: the glassiness collapse to 1.
- **Verify:** footprint = diagonal at consensus 100%; widens at 0%. Count = 1 at
  full consensus.
- **Deliverable:** the first visible solution-space payoff (one screenshot sells it).

### Tier 2 — Named solutions + "jump to" · **M** · *(deps: T0)*

- Compute **egalitarian** (min-cut on poset; or min-Σrank over the enumerated set
  for small n), **median**, **minimum-regret**, and **sex-equal/balanced**
  (brute over the enumerated set, small n only).
- **Jump-to** dropdown in Actions: A-optimal / B-optimal / egalitarian / median /
  min-regret / sex-equal — load it into the matrix.
- Mark each on the **per-side average strips** (a tick where each named solution's
  A/B averages fall) — shows fairness pulling A and B together.
- **Verify:** egalitarian Σrank ≤ both extremes; sex-equal minimizes |ΣA−ΣB| over
  the enumerated set.
- **Deliverable:** "where the named solutions live," numerically.

### Tier 3 — Lattice geography · **L** · *(deps: T0, T2)*

- **Hasse diagram** (small n, gated by lattice size): nodes = stable matchings,
  edges = single rotations, A-optimal top → B-optimal bottom; the named solutions
  (T2) highlighted in place.
- Click node → load into matrix. **Rotation slider** = a path down the lattice.
- Optional: **meet/join** — pick two nodes, show their lattice combination.
- **Verify:** node count = T1 count; top/bottom = extremes; every edge is one
  rotation.
- **Deliverable:** the centerpiece — the space made spatial.

### Tier 4 — The resolver (RVV) · **M** · *(deps: T0 for "did it land in the lattice?")*

- From the (often unstable) synchronous result, run **Roth–Vande Vate**: pick a
  blocking pair, satisfy it, animate purple cells healing; repeat to stability.
- **Cost-to-stabilize** Lab surface: # repair steps vs consensus (A×B).
- Optional: which lattice point did RVV land on (mark it on the Hasse diagram)?
- **Verify:** always terminates at 0 blocking pairs; the landing matching is in the
  T0 stable set.
- **Deliverable:** "use an alternative mode + a resolver," realized.

### Tier 5 — Preference falsification · **L** · *(candidate standalone app; deps: GS engine)*

- True-vs-reported preference editor; run GS on reported lists; per-agent gain/loss.
- Best-response dynamics; small-n Nash equilibria; manipulability-vs-consensus heat.
- **Decision first:** standalone app (`#/strategic-matching`) vs advanced mode of
  Stable Matching. Recommend a thin in-app spike before committing to a new route.
- **Deliverable:** the strategic "kicker."

### Critical path & sequencing

```
T0 (rotations.ts) ──┬─> T1 footprint + count        [start here — visible fast]
                    ├─> T2 named solutions + jump-to
                    │       └─> T3 lattice diagram   [centerpiece]
                    └─> (T4 resolver — semi-independent; needs T0 only to verify)
T5 falsification — independent track; decide app-vs-mode before building.
```

> [!IMPORTANT]
> **Recommended first build: Tier 0 → Tier 1.** It de-risks the only mathematically
> tricky part (the rotation engine, cross-checked by brute force), and Tier 1 turns
> it into a screenshot-able payoff — the footprint and the collapse-to-1 curve —
> in one step.

## 3 · Open decisions

| # | Decision | Default |
|---|---|---|
| E1 | Egalitarian via min-cut vs brute-over-enumerated-set | Brute for small n first; min-cut later if n grows |
| E2 | Enumeration cap value + how "≥ cap" is surfaced | cap 500; show "≥ 500 (capped)" |
| E3 | Lattice diagram gating (max nodes to draw) | gate at ~64 nodes; else show count only |
| E4 | Preference falsification: standalone app vs advanced mode | Spike as a mode; promote to `#/strategic-matching` if it earns it |
| E5 | Many-to-one / capacities (from prior roadmap §6.1) | Out of scope here; revisit after T3 |

## Self-reflection

1. **Confidence.** High on the math: the lattice/rotation structure, the #P-hardness
   of counting, and the poly-time egalitarian/median/min-regret vs NP-hard
   sex-equal/balanced split are all standard results (Gusfield–Irving;
   Irving–Leather–Gusfield; Teo–Sethuraman; Kato; Roth–Vande Vate). The strategy
   facts (Dubins–Freedman truthfulness for proposers; Roth impossibility;
   receiver truncation) are standard.
2. **What could bite.** The rotation-poset implementation is the one place a bug
   would be silent — hence the brute-force cross-check is non-negotiable in T0.
   Counting/lattice features must be gated by n or they blow up.
3. **Bias.** This plan is enumeration-first (brute over the stable set for small n)
   to ship fast and stay verifiable, deferring the asymptotically-better min-cut
   egalitarian until n actually demands it.
4. **Not done.** No code written for any tier yet — this is the reference plan.
5. **Follow-up value:** MEDIUM — a verifiable reference plan, but no code exists yet; building the solution-space tiers is where the value lands.

