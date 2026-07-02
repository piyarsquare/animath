---
kind: three-hats
session: 2026-06-29-S01
date: 2026-06-29
title: "Reclassifying Number Planes cards by object-type — pedagogy & math-viz review"
branch: claude/number-plane-guide-first-page-zkpnzi
slug: number-plane-guide-first-page-zkpnzi
status: complete
build: n/a
---

# Reclassifying Number Planes cards by object-type — a math-viz & pedagogy review

*Lens: the mathematician-educator who will actually use this notebook to learn and to teach "why complex numbers are special." I read the cards as a reader first, a taxonomist second.*

## Plan under review

<details><summary>Original request</summary>

Reclassify the Number Planes note-cards by OBJECT-TYPE as the primary `type`: domain · observation · theorem · note · widget · topic (+ candidate additions: definition, question). Definitions: domain = a space/structure the math is about (the line, ℂ, dual, split, ℝ×ℝ, the p-circle); observation = a noticed phenomenon pre-proof; theorem = a precise provable claim; note = connective remark/aside/glue; widget = an interactive instrument; topic = an area to expand into (≈ today's orbs); definition = naming a term; question = a motivating question driving the notebook. Demote line/space to a *domain tag* (or drop). Re-atomize so each card is ONE object-type (CX currently bundles a domain ℂ + observations + theorems + a widget + topic links; it explodes into ~5 objects). This changes the card count from 27 (atoms-by-story-role); likely grows. Keep the Markdown+YAML format, the typed-link graph, and layered glance/note/full.

QUESTIONS: (1) Is object-type the right primary classification and is the set complete/coherent? (2) Does re-atomizing help comprehension+reuse or fragment reading + multiply maintenance — right granularity? (3) How should type interact with the typed link graph and with layered glance/note/full (does atomization make "## full" redundant)? (4) Risks + smallest de-risking first step.

</details>

## What the notebook actually is right now

Before judging the reclassification I want to name, precisely, what is on the table — because the plan proposes to trade one organizing axis for another, and the two axes are not measuring the same thing.

The current `kind` is explicitly **two things fused**: a *subject* (which part of the story — `line` vs `space`) and a *role* (what the card does — `knob`, `facet`, `tangent`, `orb`). The README says this out loud and even pre-authorizes a future split into two fields. So the current scheme is not "atoms-by-story-role" alone; it is a deliberate (subject × role) matrix collapsed into one label for now.

The proposed scheme is a **third, orthogonal axis**: the *epistemic object-type* of the card's content — is this a space, a noticing, a proved claim, a definition, a question, an aside, an instrument, a portal?

Here is the same seven-card sample, read on all three axes, so we can see what each buys:

| card | current `kind` (subject×role) | story beat | proposed object-type | is that clean? |
|---|---|---|---|---|
| `L1` | line | "a number is two operations" | **definition** (of *number system*) | yes — it names + fixes a term |
| `AX` | line | "why we fix addition" | **theorem-ish** ("+ must be a group to subtract") + a **note** on the choice | mixed: a *because* argument, not a stated theorem |
| `L2` | line | "treat coordinates as strangers" | **observation** ("this is a real multiplication") that resolves to a **theorem** ("it *is* the split plane") | two objects fused on purpose |
| `PL` | knob | "the plane has one dial" | **theorem** ("multiplication ≡ one real parameter `j²=p`") + a **widget** | clean-ish; the dial is a widget |
| `DV` | knob | "three planes at the cuts" | **theorem** (classification up to iso) + **widget** | clean |
| `WH` | space | "how many rails?" | **question** → **theorem** (rails = real roots of `t²=p`) | question and answer fused |
| `CX` | space | "the plane that spins" | **domain** ℂ + 3 **observations** + 2 **theorems** + **widget** + 2 **topic** links | the plan's poster child for explosion |

Two things jump out immediately from this table, and they frame the whole review.

**First:** object-type is a *genuinely different and genuinely useful* axis. Every card really does have an object-type, and today it is invisible. A learner cannot currently tell, without reading the body, whether `WH`'s "rail count = roots of `t²=p`" is a *guess we're about to test* or a *fact we've proved*. That distinction is the spine of mathematical thinking, and the notebook is currently silent on it. **The plan has identified a real gap.**

**Second:** almost every good card is *already* more than one object-type, and that is not sloppiness — it is the shape of understanding. `WH` is a question welded to its answer *because the welding is the payload*: "we asked whether a plane can have a slide-only direction; the answer is a clean count." `L2` is an observation welded to its resolution *because the surprise is the point*: "we tried the dumbest multiplication and it turned out to be a named, structured object." The plan's instinct to make object-type visible is right. Its instinct to make object-type the *atom boundary* — one card, one type — is where I get off the bus.

> [!NOTE]
> The distinction the plan is reaching for — **observation** (pre-proof noticing) vs **theorem** (proved claim) — is the single most pedagogically valuable idea in this whole proposal. Keep it. Just don't spend it on splitting cards.

## Question 1 — Is object-type the right *primary* classification, and is the set complete/coherent?

### The set has real fidelity problems

I'll take the proposed labels as a mathematician-educator and check each against how the word is actually used, because a living notebook that teaches will have these labels read *by learners*, not just by the authoring tool. Semantic hygiene here is load-bearing.

| label | verdict | the problem |
|---|---|---|
| **domain** | ✗ collides badly | In every calculus and analysis course a learner has ever taken, "domain" means *the input set of a function* (domain/range/codomain). This notebook is literally *about* functions on ℂ (`CX`: "the plane your analytic functions ride on"). Calling ℂ-the-structure a "domain" will actively mislead. The right words already exist: **space**, **structure**, **system**, or **carrier**. This is a fidelity error, not a nitpick. |
| **observation** | ✓ excellent | Pre-proof noticing is exactly the right category and it is *missing* today. Keep. |
| **theorem** | ⚠ over-claims | Is `PL`'s "multiplication = one parameter `j²=p`" a *theorem*? It's a classification lemma / a normal-form result. Is `L1` a theorem? No — it's a **definition** unpacked. Is `AX`'s "fix addition" a theorem? It's a *design decision justified by a demand*, closer to a **principle** or **rationale**. Labeling all of these "theorem" inflates the word and teaches learners that a definition-unpacking is a proof. That is a genuine pedagogical harm — the theorem/definition confusion is one of the most common undergraduate failure modes, and this taxonomy would *institutionalize* it. |
| **note** | ✓ but it's the sink | Fine as connective glue, but "note" will silently absorb everything that resists typing. Watch its census: if >40% of cards end up "note," the taxonomy isn't paying rent. |
| **widget** | ✓ but it's already a field | The `figures:` frontmatter *already* attaches interactive instruments to cards. A widget is a *component of* a card, not a card-type. Promoting it to a primary type double-encodes what `figures:` handles and orphans the instrument from the claim it illustrates. |
| **topic** | ✓ = today's `orb` | This is just the `orb` role renamed. Fine, but it's a rename, not a discovery. |
| **definition** (candidate) | ✓ worth having | Yes — and *more* important than the plan credits. `L5` (stretchable), `L1` (number system), the *rail* coinage in `WH` are definitions, and separating them from "note" is genuinely clarifying. See below. |
| **question** (candidate) | ✓✓ should be first-class, but as a *facet not a card* | The notebook's whole engine is Korzybski's "could it be different?" Questions drive it. But a question is rarely a *standalone card* — it's the **glance** line of the card that answers it. `L2`'s glance already *is* a question ("What if the coordinates have nothing to do with each other?"). `WH`'s title *is* a question. Making questions their own cards would sever every question from its answer. See Q2. |

> [!WARNING]
> **"domain" is the wrong word.** It collides head-on with domain/range in a notebook that is explicitly about functions on the plane. Use **space** or **structure**. This alone would confuse the exact learner the notebook is trying to serve.

### Is object-type the right *primary* axis? No — it's the right *secondary* axis

Here is my central claim. The three axes are all real:

- **subject/story-zone** (line → plane → beyond) — *the reading order, the narrative scaffold*
- **role** (knob / facet / tangent / orb) — *how the card behaves in the graph*
- **object-type** (space / observation / theorem / definition / question / note) — *the epistemic status of the content*

The plan proposes to promote object-type to *primary* and demote subject (line/space) to "a tag, or drop." **This inverts the axis that a learner actually navigates by.** A person learning "why ℂ is special" does not move question → observation → domain → theorem as an abstract type-progression floating free of content. They move **along the story**: *the line and its forced rules* → *the one dial* → *the three planes* → *only one is a field* → *why*. The line/space subject axis *is* that story. It is the McPhee structure the README brags about. Demoting it to a tag throws away the narrative scaffold and keeps the filing cabinet.

Object-type should be *added as a second field* (the README already blesses splitting `kind` into two), decorating each card so the observation/theorem arc becomes visible — **without** becoming the sort key and **without** becoming the atomization rule.

> [!IMPORTANT]
> The right move is **additive, not substitutive**: keep `kind` (subject × role) as the reading axis, add an `object:` field (space / observation / theorem / definition / question-as-glance / note) as the epistemic axis. Two orthogonal fields, exactly as the README already anticipated. Do not make object-type primary; do not drop line/space.

## Question 2 — Does re-atomizing to one-type-per-card help comprehension, or fragment reading?

This is the crux, and my answer is: **it fragments reading and multiplies maintenance, and it does so precisely on the cards that carry the "aha."**

### The aha *is* the fusion of observation and theorem

Consider what the plan does to `CX`. Today `CX` is a single glowing orb — "Multiply = turn. The plane that spins." — that opens into: *here is the space; here is what you notice (it turns, no rails, √−1 lives here); here is why (the norm is positive-definite, that's what makes it a field, same fact as no real eigenvector).* That is a **complete thought**: a phenomenon, its consequences, and its proof, in one breath. It is the model of how a mathematician holds an idea.

The plan explodes `CX` into ~5 cards: the domain ℂ, three observation-cards, and the field-theorem lives over in `FD`. Now trace the learner's path to the single most important sentence in the whole notebook — *"positive-definite norm ⇒ only 0 is non-invertible ⇒ field ⇒ this is the reason ℂ is special."* Under atomization that sentence is split across `CX`-observation ("it turns"), a separate `CX`-observation ("no rails"), the `WH` theorem (rail count), and the `FD` theorem (only one is a field), with the *causal chain between them* — the "same fact as" that welds rotation to field-ness — living **in the links, not in any card**. The links carry structure; they do not carry *argument*. You cannot narrate a proof through edge-types.

This is the failure mode: **atomization by object-type shatters the causal arc into nodes and loses the connective tissue that is the actual mathematics.** "We noticed X; here is why X is true" is *one card* when it lands; splitting it into an observation-card and a theorem-card makes the reader reassemble the argument themselves — which is exactly the work the notebook was supposed to do for them.

> [!CAUTION]
> The plan's own example betrays it. `CX` "explodes into ~5 objects" is described as a *feature*. But `CX` is the best card in the deck *because* it fuses domain + noticing + proof into one glowing orb. Exploding it is exploding the payload.

### Where atomization *does* help: the transclusion pattern already solves it

The notebook already has the right tool for genuine reuse: `kind: facet` + `![[id]]` transclusion. `L5` (stretchable) is a definition that lives *inside* `CX`, `FD`, and `higher` without owning an orb. That is atomization done right — a *shared fragment* is extracted **only when it is actually shared**, and it appears *in context* wherever it's used, so nothing is fractured.

The lesson: **atomize on reuse, not on type.** Extract a card when two other cards need the same piece (that's `L5`, and *stretchable* is genuinely reused). Do *not* extract a card because its content happens to be "an observation" — an observation that is used once belongs welded to the claim it motivates.

### The maintenance cost is real and asymmetric

| dimension | today (27 cards, subject×role) | proposed (one-type-per-card, "likely grows") |
|---|---|---|
| card count | 27 | ~40–50+ (CX alone ×5; every space-card sheds its observations/theorems) |
| edges to maintain | moderate; edges connect *ideas* | balloons; every split adds "observation → its own theorem" edges that used to be adjacency in one body |
| "one product, three planes" figure on `CX` | rides with the claim it illustrates | orphaned from whichever fragment it lands on |
| reading a complete idea | one orb → one note | orb → note → follow `leans-on` → follow `same-as` → reassemble |
| the "aha" | in the card | in the reader's head, if they follow the right edges in the right order |

Granularity has an optimum, and the current deck is *near* it. The right granularity for a living notebook is **"one complete thought per card"** — which is usually (setup + noticing + why), i.e. multiple object-types — not "one object-type per card."

## Question 3 — Type × the link graph × the glance/note/full layering

### Does atomization make `## full` redundant? Partly — and that's a warning sign, not a win

The plan half-suspects this, and it's right to. Today the layering is *depth*: glance (orb) → note (terse house voice) → full (textbook: statements, proofs). The `## full` of `CX` is where the *theorem* lives ("the norm `a²+b²` is positive-definite, so the only non-invertible element is 0; that is exactly what makes it a field"). The `## note` is where the *observations* live ("multiplying turns the plane; no real rails; √−1 lives here").

So the glance/note/full stack **already encodes an object-type gradient**: glance ≈ the phenomenon named, note ≈ observations, full ≈ theorem-with-proof. The layering is doing the observation/theorem separation *within the card, in reading order*, which is exactly where a learner wants it: *notice first, prove second, on the same card.*

If you atomize by object-type, you've moved that gradient from *depth-within-a-card* to *breadth-across-cards*. Then yes, `## full` becomes thin — because the "full" of an observation-card is just the observation restated, and the "full" of a theorem-card is the whole card. **That thinning is the taxonomy telling you it has fought the layering that was already doing the job.** The glance/note/full stack is a *better* observation/theorem separator than card-splitting, because it keeps notice-then-prove **adjacent and ordered**.

> [!TIP]
> The glance → note → full progression *is* the "we noticed X; here's why X is true" arc, already built, already in reading order. The plan's best goal is achieved by the layering the plan would undermine. Make the arc *explicit* by lightly labeling the layers (a `▸ noticed` / `▸ why` micro-heading), not by splitting cards.

### The link graph gets noisier, and its edge-types are already the right ones

The typed edges — `same-as`, `contrasts`, `opens`, `leans-on`, `used-for` — are *idea-relations*, and they're good. Note `WH`'s `same-as: [CX, DU, SP]`: one count, three faces. That edge carries a real insight. Atomization forces a new, *lower-value* class of edge: "this observation-card `leans-on` this theorem-card that proves it" — edges that used to be **paragraph adjacency inside one body**. You'd be converting free, in-context, correctly-ordered narration into edges the reader must traverse and re-order. The graph should connect *ideas*; don't make it connect *fragments of one idea*.

## Question 4 — Risks, and the smallest de-risking first step

### Risks, ranked by how much they hurt the learner

1. **Loss of the narrative scaffold** (HIGH). Demoting line/space drops the McPhee spine. A learner navigates the *story*, not a type-index. This is the biggest risk and it's structural, not cosmetic.
2. **Fracturing the aha** (HIGH). Splitting observation from theorem across cards destroys the "notice → why" arc on exactly the cards (`CX`, `WH`, `L2`) where it's the payload.
3. **"domain" collision** (MEDIUM-HIGH). A live fidelity error in a functions-on-ℂ notebook. Cheap to avoid (use *space*), expensive to leave.
4. **"theorem" inflation** (MEDIUM). Mislabeling definitions/principles as theorems mis-teaches the theorem/definition boundary — the notebook would model bad hygiene.
5. **Maintenance blow-up** (MEDIUM). ~2× card count, worse edge count, orphaned figures — friction against the "copy-by-parts, reorder-is-a-view" ethos.
6. **`## full` hollowing** (LOW-MEDIUM). Symptom of fighting the layering; annoying, not fatal.

### The smallest de-risking first step

Do **not** reclassify or re-atomize anything yet. Instead, run a **one-pass, additive, zero-split experiment** on the existing deck:

1. **Add a second frontmatter field `object:`** to every card — the epistemic type — *without touching `kind`, without splitting a single card, without moving any prose.* Values: `space` / `observation` / `theorem` / `definition` / `question` / `note`. (Rename `domain`→`space` and drop `widget` as a card-type before you start.)
2. Where a card is genuinely two-typed (most of the good ones), **allow a list**: `object: [observation, theorem]`. This *records* the fusion instead of forbidding it, and immediately surfaces the "notice→prove" cards as exactly the ones with two-element `object:`.
3. **Label the layers inside the note/full body** with a light micro-heading — `▸ what we notice` / `▸ why it's true` — so the observation→theorem arc is *visible in reading order* without splitting the card.
4. **Look at the census.** How many cards are pure-observation? Pure-theorem? Two-typed? If almost everything is two-typed (my prediction), that's the data proving one-type-per-card is wrong for this material — and you've learned it for the cost of a frontmatter field, not a re-atomization.
5. Let the `figures:` field keep owning widgets; let `L5`-style `facet` keep owning genuine reuse. Neither needs a new primary type.

This gives the plan *everything it actually wants* — the observation/theorem distinction made explicit, definitions distinguished, questions honored (as glances) — at ~1 hour of frontmatter edits and **zero risk to the reading experience**. If, after seeing the census and living with the labels, splitting a specific fat card earns its keep, split *that one card* by hand. Never as a blanket rule.

## Honest-framing check

The README's voice contract — plain, example-first, terse, "could it be different?", McPhee/Korzybski/Bryson — is a *pedagogical* contract, and the reclassification stresses it in one specific way worth naming: **a type-first deck reads like a catalog; a story-first deck reads like an argument.** Korzybski's "could it be different?" is a *question chained to a consequence* (`L2`: what if strangers? → oh, that's the split plane). Chop the question onto its own card and the chain snaps; the curiosity has nowhere to fall. The current deck honors the contract *because* its cards are complete thoughts. Keep object-type as annotation and the contract is safe; make it the atom and the voice goes from "watch this move" to "see entry 34-b."

## Verdict

**Concerns → would change (adopt the goal, reject the mechanism).**

- **Endorse the diagnosis.** Object-type is a real, currently-invisible axis, and the **observation vs theorem** distinction is genuinely powerful pedagogy. The plan found a real gap.
- **Reject "object-type as *primary*."** It inverts the axis learners navigate by. Keep subject (line → plane → beyond) as the narrative spine; **add** object-type as a *second field*, exactly as the README already blesses (subject × role → subject × role × object). Do **not** demote or drop line/space.
- **Reject one-type-per-card atomization.** The best cards (`CX`, `WH`, `L2`) fuse observation+theorem *because that fusion is the aha*. Atomize on **reuse** (the existing `facet`/`![[id]]` pattern), never on type. Exploding `CX` explodes the payload.
- **Fix the labels before anything else.** `domain` → **space/structure** (it collides with domain/range in a functions notebook). Don't over-claim **theorem** for definitions and design-principles — add **definition** and a **principle/rationale** value and use them honestly. Keep **question** as a *glance*, not a card. Drop **widget** as a card-type — `figures:` already owns it.
- **Don't undercut the layering.** glance → note → full *already* separates notice from proof, in reading order, adjacent. That's a *better* observation/theorem separator than card-splitting; splitting hollows out `## full`, which is the taxonomy telling on itself.
- **Smallest first step:** add an `object:` field (list-valued where fused) + light `▸ noticed / ▸ why` in-body labels, split nothing, then read the census. ~1 hour, zero reading-flow risk, and the two-typed census will settle the atomization question with data.

Net: the plan's *insight* deserves to ship; its *mechanism* would trade a learner's story for a filer's tidiness. Ship the annotation, keep the narrative.

## Self-reflection

1. **What would you do with another session?** Actually run the additive experiment on all 27 cards — assign `object:` values across the full deck and produce the census table I only predicted. That census is the real evidence, and I reasoned it rather than measured it.
2. **What would you change about what you produced?** I'd tighten the "theorem inflation" section into a concrete relabeling table for every current card (which are truly theorems, which are definitions, which are principles) — I asserted the pattern but only sampled it.
3. **What were you not asked that you think is important?** Whether the *inspector tool* (`index.html`) and `manifest.json` regeneration cost anything under a second field vs a split — a UI that filters by object-type is cheap; one that must re-thread a doubled graph is not. The maintenance question has a tooling half I only gestured at.
4. **What did we both overlook?** That `figures:` already *is* the widget field — the plan proposes "widget" as a primary object-type while the frontmatter already models widgets as card *components*. That double-encoding is a clean argument against "widget" that neither the plan nor my first pass foregrounded.
5. **What did you find difficult?** Separating the plan's genuinely good idea (make observation/theorem visible) from its bad mechanism (make it the atom) without sounding like I was rejecting the whole thing. The two are welded in the request the way the aha is welded in `CX`.
6. **What would have made this task easier?** A rendered view of the page-1 deck (`number-planes-line.html` doesn't exist at the given path — only the cards + inspector do), so I judged the reading experience from the cards and README rather than the actual deck-in-motion.
7. **How did you verify this, and does each passing check test the user-visible claim?** Reasoning only, grounded in a close read of README + 12 cards. No build, no tests — this is a design review, so "verification" is fidelity of the read. I read enough of the deck (line-zone L1/L2/AX, knobs PL/DV, spaces CX/FD/WH, facet L5, tangent tropical, orb higher) to trust the object-type census I *predict*, but I did not enumerate all 27, so the census claim in Q2 is an informed projection, not a count. `signals: none` — nothing visual/phone here.
8. **Follow-up value:** MEDIUM — the recommendation is sound and complete as a review, but the decisive artifact (a full-deck `object:` census confirming most cards are two-typed) is predicted, not produced; running it would either confirm the verdict with data or surface the minority of cards where atomization genuinely helps.
