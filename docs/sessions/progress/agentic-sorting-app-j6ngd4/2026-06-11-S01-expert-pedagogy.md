---
kind: three-hats
session: 2026-06-11-S01
date: 2026-06-11
title: "Role 3 — Math-Viz & Pedagogy: Agentic Sorting legibility"
branch: claude/agentic-sorting-app-j6ngd4
slug: agentic-sorting-app-j6ngd4
status: completed
build: unknown
followup: null
pr: null
app: agentic-sorting
---

# Role 3 — Math-Visualization & Pedagogy: Agentic Sorting legibility

## Plan under review
<details><summary>Original request</summary>

> "This app is still something of a hot mess. can you please [review] to see what we can do to improve the legibility?"
>
> Context: The Agentic Sorting app (`src/animations/AgenticSorting/`) models Levin's "self-sorting arrays" (arXiv:2401.05375): each array element is an agent running its own algotype (Standard≈bubble, Blind Date≈random compare-swap, Nomadic≈insertion-ish, Patrolling≈cocktail-shaker, Perfectionist≈selection). It measures emergent competencies — clustering by algotype, robustness to frozen/defective cells, and delayed gratification (a Trajectories plot of every agent's distance-to-home over time, warm=backtracked). It has a **Sandbox** mode (live arena + trajectories + metrics + single-agent Track + Replicate) and a **Lab** mode (batch experiments: Strategies / Mixes / Monte-Carlo / Sweep incl. a two-type blend sweep, over 4 metrics: cycles-to-sort, swaps, final sortedness, clustering). Divergent objectives (selfish-ascending vs an animath-original phase-separation mode) also exist. The user wants the app to be more **legible** — easier to understand what you're looking at and learn the ideas from.

</details>

## Executive summary

The engine, the metrics, and the prose are individually strong. The README and
EXPLAINER are some of the most honest, well-calibrated science writing in the
repo — they cite the paper correctly, flag the loose-vs-faithful sort analogies,
and clearly mark phase separation as animath-original. The Okabe–Ito palette is a
good accessibility default. **None of that is the problem.**

The problem is **first contact**. A newcomer who opens the app lands on the
`setup` layout — three control panels (Array, Run, Population mix) and a static
arena — and is handed a wall of ~7 sliders plus a five-row mix editor *before
they have seen the thing move or been told what the thing is*. The three headline
competencies (clustering, robustness, delayed gratification) — the entire reason
this app exists — are **not surfaced as anything you can reach in one click**.
You have to know to: turn on split objective, or raise frozen %, or open the
Trajectories window, or color By algotype, and *then* read the right one of eight
numbers. The app is a laboratory bench with no posted experiments. A motivated
learner can get there; a casual visitor bounces.

So the headline is: **the app teaches the mechanics (here are the knobs) but not
the ideas (here is the surprise).** The single highest-value change is a small set
of one-click **preset scenarios**, each of which jumps to a layout + settings that
*stages* one competency, paired with a one-line "what to watch." Everything else
(relabeling, metric gating, trajectory legend) is secondary polish on top of that.

This review is **analysis only** — nothing is implemented.

> [!NOTE]
> I anchored the paper claims against my own knowledge of Zhang, Goldstein &
> Levin (arXiv:2401.05375). The three competencies the app names — algotype
> *clustering*, *robustness* to frozen cells, and *delayed gratification*
> (elements moving away from home before converging) — are the three the paper
> actually foregrounds. The app's framing is faithful. The phase-separation mode
> is correctly disclaimed as not-in-paper.

---

## 1 · First contact: what a newcomer actually sees

I walked the default entry as a first-timer would.

| Step | What happens | Verdict |
|---|---|---|
| Open app | Lands in **Sandbox**, `setup` layout | Static arena (not running) + 3 panels |
| Look left | Array · Run · Population mix panels, ~7 sliders + 5 mix rows | Wall of controls, no narrative |
| Look at arena | Bars above/below a midline, labeled "Positive"/"Negative" | Pretty, but *why* is it a sort? No motion until START |
| Want the "aha" | Nothing tells you what the aha **is** or how to reach it | The competencies are invisible at rest |
| Press START | It sorts. Bars climb toward a ramp. | Satisfying — but looks like any sort viz |

The competencies are all **opt-in and undiscoverable**:

- **Clustering** needs: mixed population (default OK) + Color by **Algotype**
  (default OK) + *knowing to watch like-colors drift together* + reading the
  Clustering number. Nothing prompts this.
- **Robustness** needs: raise **Frozen / defective** off its default of 0, then
  notice the **Best reachable** hint appears, then understand the ceiling idea.
- **Delayed gratification** needs: open the **Trajectories** window (closed in the
  `setup` layout!) *or* click an agent to Track it — and ideally with frozen cells
  present, where the effect is strongest.

> [!CAUTION]
> **The default layout hides the single most distinctive visual in the app.** The
> `setup` layout sets `trajectories: { open: false }`. The all-agent Trajectories
> plot — the population-wide delayed-gratification picture, the thing no other
> sorting viz has — is invisible on first load. A first-timer must switch layouts
> to `analysis` to even know it exists.

### The numbers problem

When you *do* press START, the Metrics panel shows **eight** numbers at once:
Sortedness, Inversions, Monotone runs, Clustering, Cycles, Wakeups, Swaps,
Descending — plus a sparkline and a conditional ceiling hint. For a first-timer,
seven of those eight are noise relative to whichever idea they're currently
chasing. There is no signal about **which number to read when**.

---

## 2 · The aha path — proposed default + preset scenarios

This is the core recommendation. The app needs a **guided spine**: a better
default, and a handful of named one-click scenarios that each stage exactly one
idea. Concretely:

### 2a · Better default view

> [!IMPORTANT]
> **Decision proposal** — default to a layout that shows the arena **and** the
> Trajectories plot, color **By algotype**, mixed population, *auto-started* (or
> with a single obvious START), and with the Metrics panel **collapsed to one
> headline number** appropriate to the objective. The current `analysis` layout is
> already close — it opens both views — but it leads with Metrics rather than the
> picture. Make "see it move, both panels visible" the thing you land on, not the
> bench-setup screen.

The first thing a learner should see is the surprising thing — agents of a color
drifting together — not a form.

### 2b · Named preset scenarios (the headline ask)

Each preset = one click → sets the relevant knobs, picks the right layout, picks
the right color mode, and (ideally) surfaces a one-line caption "watch X." These
map one-to-one onto the paper's competencies plus the animath extension.

| Preset | Sets | What it stages | Watch |
|---|---|---|---|
| **Clustering** ("birds of a feather") | mixed 5-way, color = Algotype, no frozen, arena view | like-algotype agents drift together | **Clustering** rises above 0% |
| **Robustness to defects** | frozen ≈ 20–30%, single or mixed pop, arena + ceiling hint | array sorts *around* immovable cells | **Sortedness** approaches **Best reachable** ceiling |
| **Delayed gratification** | frozen ≈ 15%, Trajectories open + Track on, mid array size | agents move *away from home* before converging | warm lines in **Trajectories** rise then fall |
| **Phase separation** (animath-original) | split objective, ~50% descending, *local* types only (no Blind Date), color = Objective | order splits into opposed domains, not one sort | **Monotone runs** falls toward ~2; sortedness stalls near ½ |
| **More isn't faster** (Lab) | Lab → Strategies, equal mix vs pures, metric = Cycles | the equal mix is *slower* than its best pures | the **Mix** bar is taller than the fastest pure |

Five presets cover all three Levin competencies, the extension, and the README's
buried "variety isn't speed" nuance. That last one is currently a sentence in the
README that **most users will never read in the context where it bites** — turning
it into a one-click Lab experiment is exactly the "surface the nuance where users
meet it" the brief asks for.

> [!TIP]
> Presets are cheap to build here because every knob is already a single state
> setter and layouts already exist as data. A preset is just `{ settings patch,
> layoutId, colorBy, caption }`. This is a small, self-contained "scenarios" panel
> (archetype `subject` or a thin top-of-rail strip), not an engine change.

### 2c · A "what am I watching" caption line

Each preset should drop a single sentence into a fixed caption slot near the
arena (not buried in a panel's `as-hint`). The app already writes excellent
one-liners — they're just attached to the wrong place (inside collapsible control
panels the user may never open). Promote one active caption to the view.

---

## 3 · Naming & labeling audit

Mostly good. The terms are consistent and honest. Specific issues, ranked:

| Term / label | Where | Issue | Suggestion |
|---|---|---|---|
| "Positive" / "Negative" arena labels | `arenaNode` | Cryptic. Values are −100..100; a newcomer reads "positive/negative *what*?" | "Large values ↑ / Small values ↓" or "High / Low". The point is *magnitude*, not sign. |
| "Home" vs "goal" | trajNode says "home"; trackNode says "distance to **goal**"; metrics.ts `homeIndex` | Two words for one concept. | Pick one (**home**) everywhere. "Distance to home." |
| "Selfish (ascending)" | Objective pills | "Selfish" is doing rhetorical work the newcomer hasn't earned yet — every agent wants the *same* order, which doesn't feel selfish. The selfishness is conceptual (each acts locally for itself). | Consider "Shared goal (ascending)" for the pill, keep the "selfish" framing for prose. Or add a tooltip. |
| "Wake rate" | Run panel | Fine once you know it; unexplained on first contact. | A hint: "fraction of agents that act each cycle." |
| "Monotone runs" | Metrics | Correct term, but opaque to a non-mathematician; only meaningful in phase-sep mode yet always shown. | Show it **only** (or emphasized) in split mode; tooltip "number of sorted stretches (1 = fully sorted)." |
| "Clustering" = excess homophily | Metrics / README | The README explains "excess homophily over chance" beautifully; the *panel* just says "Clustering +12%" with no anchor. | Inline micro-caption: "+% = more clumped than random." |
| "Best reachable" / "ceiling" | Metrics hint | Good, but only appears when frozen > 0 — so the robustness story is invisible until you stumble onto it. | Surface via the Robustness preset. |
| "Replicate" vs "Monte-Carlo" | Sandbox vs Lab | These are *the same operation* (re-run current settings on N seeds). Two names for one thing across two modes. | Acknowledge the equivalence in the Replicate hint ("this is Monte-Carlo on your current settings") — it already half-does this. |
| Lab x-axis labels `Std/Blind/Nomad/Patrol/Perfect` | Lab.tsx `SHORT` | Fine, consistent with the agent names. | OK. |
| Blend sweep label `% Blind Date` | runLab | Clear. | OK. |

### Trajectories legibility (the signature plot)

The Trajectories plot is the app's best original idea and its least legible
artifact. Audit:

- **Axes are unlabeled as axes.** There are corner labels "Far from home" (top) /
  "Home (sorted)" (bottom) and a legend, but **no x-axis label at all** — the
  horizontal axis is *time* (sample index), and nothing says so. A first-timer
  cannot know the lines move left-to-right in time.
- **The y-scale is auto-normalized to max distance** and unlabeled numerically.
  That's fine for shape-reading but means "Home" isn't anchored at a known value.
- **The warm/cool legend is good** ("backtracked" / "straight to goal") but the
  *meaning* of a warm line — rose above its start before falling — is only in a
  code comment and the Track panel hint, not next to the plot.
- The buffer **freezes at 360 samples** (`TRAJ_MAX`) with no indication; a learner
  watching a slow run may think the plot "stopped working."

> [!WARNING]
> The Trajectories plot is doing the heaviest pedagogical lifting (it *is* the
> delayed-gratification competency) with the lightest labeling. Add an explicit
> "time →" x-label, a one-line "lines that rise then fall = moved away from home
> first," and a subtle "captured" state when the buffer fills.

---

## 4 · Honest framing audit

This is the app's strongest dimension. Verified claims against the paper:

| Claim in app | Accurate? | Note |
|---|---|---|
| Cell-view / agents-not-procedure framing | ✅ | Faithful to the paper's central move |
| Clustering by algotype is emergent / no rule encodes it | ✅ | This is the paper's headline result |
| Robustness to defective cells | ✅ | Paper studies frozen/damaged cells |
| Delayed gratification (move away before converging) | ✅ | Paper observes this; app visualizes it well |
| "545 swaps" for Blind Date | ⚠️ | App-measured, not from paper — and the README/EXPLAINER both *say* it's app-measured. Honest, but make sure no one reads it as a paper figure. The "≈" and "this is where it comes from" framing handle this. |
| Phase separation is animath-original, not Levin | ✅✅ | Clearly and repeatedly disclaimed. Excellent. |
| Sort-analogy fidelity (loose vs faithful) | ✅ | The fidelity note is exemplary honesty |
| "Competencies = measured behavior, not intelligence" | ✅ | README's "Notes on honesty" nails the basal-intelligence caveat |

**No overclaiming found.** The one nuance buried in docs but not surfaced in the
UI is the README's "an equal five-way mix is *slower* to fully sort than its best
pure strategies." That's a genuine, slightly counterintuitive result and it lives
only in a README blockquote. Per §2b, promote it to the "More isn't faster"
preset so users meet it where it bites, not only where it's documented.

> [!NOTE]
> The phase-separation disclaimer is currently in three places (EXPLAINER, README,
> and the Array-panel hint). That's good. The one place it's *missing* is the
> Objective pill itself — selecting "Phase separation" gives no inline "(our
> extension, not in the paper)" marker. A tiny "★ animath-original" tag on that
> pill or its hint would keep the honesty at the point of choice.

---

## 5 · Metric legibility — which number, when?

There are effectively **two metric vocabularies** and they're presented flat:

**Sandbox readouts (8):** Sortedness, Inversions, Monotone runs, Clustering,
Cycles, Wakeups, Swaps, Descending — plus conditional Best-reachable.
**Lab outcome metrics (4):** Cycles to sort, Total swaps, Final sortedness,
Clustering reached.

Problems:

1. **No gating by context.** Monotone runs is only the right lens in phase-sep
   mode; Clustering is only meaningful for mixed populations; Best reachable only
   matters with frozen cells. All are shown unconditionally (except Best reachable,
   which correctly gates on `hasFrozen`). The app *knows* the context — it could
   visually emphasize the relevant metric.
2. **Throughput vs outcome are mixed.** Cycles/Wakeups/Swaps (cost) sit in the same
   panel as Sortedness/Clustering (achievement). The panel already groups them with
   a "Throughput" kicker — good — but a first-timer reads eight equal-weight cards.
3. **Inversions is nearly redundant** with Sortedness for a newcomer (both say "how
   far from sorted"). Inversions is O(n²) and exact; Sortedness is the intuitive
   one. Consider demoting Inversions to a secondary/expandable readout.

| Metric | Read it when | Currently signposted? |
|---|---|---|
| Sortedness | always (the headline) | yes (sparkline) |
| Clustering | mixed population, color=algotype | no inline anchor |
| Monotone runs | phase-separation mode | no — shown always |
| Best reachable | frozen > 0 | yes (gated hint) ✅ |
| Inversions | rarely (redundant for newcomers) | no |
| Cycles / Swaps | comparing efficiency (Lab) | grouped under Throughput ✅ |

**Proposal:** make the Metrics panel *context-aware* — promote the one metric that
matches the active scenario to a hero stat, demote the rest into a collapsible
"more" group. The Lab's `labMetric` hint already does excellent context guidance
("Clustering is only meaningful for the mixed population; try Final sortedness for
non-converging cases") — bring that same just-in-time guidance to the Sandbox.

---

## 6 · Information architecture — what to hide / group

The Sandbox exposes **7 panels**; the Lab **5**; two view windows; two modes.
That's a lot of surface for an app whose ideas are three. Grouping proposal:

| Tier | Panels | Keep open by default? |
|---|---|---|
| **First contact** | Scenarios (new), Run (START), the arena + trajectories views | Yes |
| **Tuning** | Array, Population mix, Display | One click away |
| **Analysis** | Metrics (context-aware), Track agent, Replicate | Behind the analysis layout |

- **Population mix** is a 5-row editor with per-row description paragraphs — it's
  ~500px tall and dominates the rail. Most users never need to touch all five.
  Consider a compact "balanced / pick one / custom" front with the full editor
  behind a disclosure.
- **Track agent** and **Trajectories** overlap conceptually (single vs all-agent
  delayed gratification). Keep both, but let the Track panel *point at* the
  Trajectories plot ("this is one of the lines over there").
- **Replicate** (Sandbox) and the whole Lab **Monte-Carlo** are the same idea.
  Fine to keep both, but the Replicate hint should say so explicitly to reduce the
  "wait, what's the difference?" tax.

> [!NOTE]
> The two-mode split (Sandbox / Lab) is *good* IA — it cleanly separates "watch one
> run" from "measure many." Keep it. The legibility fix is within each mode, not in
> the split.

---

## 7 · Accessibility

| Item | State | Note |
|---|---|---|
| Categorical color (algotype/objective) | ✅ Okabe–Ito | Good CVD-safe choice, documented in arena.ts |
| Frozen-cell color (#9aa0a6 gray) + 0.55 alpha | ✅ | Distinct from the palette; the dimming reads as "inert" |
| Trajectory heat ramp (cool→warm) | ⚠️ | A *sequential* ramp on a diverging-ish meaning. The warm=backtracked encoding leans on hue **and** opacity (0.14→0.92) and draw order, which helps. But warm/cool ramps are the classic CVD trap. Since it also encodes via opacity + on-top ordering, it's *probably* OK — but worth a redundant cue (e.g. warm lines slightly thicker). |
| Color-only legends | ⚠️ | The mix panel pairs color dots with **icons + names** ✅. The objective color (blue/orange) is color-only in the arena — the "Objective" hint names them, which mitigates. |
| Text density | ⚠️ | Panel hints are good but long; per-agent descriptions in the mix panel are a lot of prose stacked vertically. Fine as reference, heavy as default. |
| Emoji agent icons (👤🎲🏃👮🧐) | ⚠️ | Cute but semantically thin and inconsistent across platforms/skins. They don't *teach* the rule. The color dot + name carries the load; the emoji is decoration. Low priority, but consider dropping for a tiny rule-glyph or nothing. |

No contrast or keyboard issues spotted in the canvas path (it's a static viz with
pointer-to-track; no keyboard trap since there are no window-level key handlers
here, so the CLAUDE.md form-control guard isn't needed).

---

## 8 · Smaller correctness/clarity notes

- **American-English check:** prose is clean (color, behavior, analyze,
  normalize). "Vermillion" in arena.ts is a color *name* (the Okabe–Ito swatch),
  not a spelling issue. No British spellings found. ✅
- **`emptyMetrics` shows `sortedness: 1`** before first generation — so the very
  first frame can read "100% sorted" on a shuffled array for an instant. Cosmetic,
  but a first-timer glancing at "Sortedness 100%" on a clearly-unsorted arena is a
  small credibility hit. Initialize from the generated population.
- **Trajectories buffer freeze (360 samples)** is silent (noted in §3).
- **The `setup` layout's name "Setup"** signals "configure me" — reinforcing the
  bench-not-experiment feeling. If the default becomes scenario-led, rename/retire
  it.
- **Subtitle copy** is good ("Emergent order from selfish local rules") — keep it;
  it's a better one-line hook than anything currently *in* the viewport.

---

## Verdict

Prioritized. The app's *content* is excellent and honest; the deficit is entirely
**guidance and first contact**. Ranked by pedagogical payoff per unit effort:

1. **[HIGH] Add one-click preset scenarios** (§2b) — five presets covering
   clustering, robustness, delayed gratification, phase separation, and
   "more isn't faster." This is *the* fix: it converts a bench into a set of
   staged experiments and makes every competency reachable and captioned. Cheap to
   build (settings patch + existing layout id + caption).
2. **[HIGH] Fix the default view** (§2a) — land on a running (or one-tap) arena +
   **Trajectories visible**, color by algotype, with a single headline metric — not
   the `setup` form. Stop hiding the signature plot on load.
3. **[MEDIUM] Make Metrics context-aware** (§5) — promote the one metric that
   matches the active scenario; collapse the rest. Bring the Lab's excellent
   just-in-time metric guidance into the Sandbox.
4. **[MEDIUM] Label the Trajectories plot** (§3) — explicit "time →" x-axis,
   inline "rise-then-fall = moved away from home first," and a "captured" state at
   buffer freeze.
5. **[LOW] Relabeling pass** (§3) — "Positive/Negative" → "High/Low";
   unify "home"/"goal"; tooltip "Wake rate," "Monotone runs," "Clustering";
   tag the Phase-separation pill as animath-original at the point of choice.
6. **[LOW] Declutter the rail** (§6) — compact the Population-mix editor behind a
   disclosure; group Analysis panels behind the analysis layout.
7. **[LOW] Cosmetic correctness** (§8) — fix the initial "Sortedness 100%" flash;
   reconsider the emoji agent icons; add a redundant cue to the trajectory heat
   ramp for CVD.

**One sentence:** Build the five preset scenarios and fix the default to lead with
the moving picture — do those two and the "hot mess" becomes a guided tour;
everything else is polish.

## Self-reflection

1. **What would you do with another session?** Prototype the five preset scenarios
   as a concrete data structure and storyboard each one's caption + which metric it
   promotes, then user-test the "first 30 seconds" path against the current
   default. I'd also spec the context-aware Metrics panel precisely (which metric
   is hero in which of the {uniform, split} × {frozen, no-frozen} × {pure, mixed}
   states).
2. **What would you change about what you produced?** I reviewed the code and prose
   but did not run the app, so my "first contact" walkthrough is reconstructed from
   the layout/state code, not lived. A live pass might re-rank the smaller items.
3. **What were you not asked that you think is important?** Whether the Lab is
   pedagogically *over-built* for the app's three ideas — 4 experiment kinds × 4
   metrics × a sweep param menu is a lot of machinery; a casual learner may never
   need Mixes or the blend sweep. Worth asking if the Lab itself should lead with
   one "headline experiment."
4. **What did we both overlook?** Mobile/phone re-chrome. The app has two view
   windows + a tall mix panel; on the ≤740px phone layout (stacked cards + bottom
   sheets) the legibility story may be quite different and I didn't evaluate it.
5. **What did you find difficult?** Judging the trajectory heat-ramp's CVD safety
   without rendering it — it mixes hue, opacity, and z-order, which is hard to call
   from source alone.
6. **What would have made this task easier?** A running instance (or screenshots of
   the default view, the Trajectories plot mid-run, and the phone layout) to
   ground the first-contact claims.
7. **Follow-up value:** LOW — the analysis is complete and the recommendations are
   actionable as-is; a live/phone pass would refine priority ordering and the
   trajectory-CVD call but is unlikely to change the headline (presets + default).
