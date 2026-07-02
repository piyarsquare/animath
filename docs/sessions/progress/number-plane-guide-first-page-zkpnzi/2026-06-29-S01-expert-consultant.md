---
kind: three-hats
session: 2026-06-29-S01
date: 2026-06-29
title: "Architecture review — reclassifying Number Planes cards by object-type"
branch: claude/number-plane-guide-first-page-zkpnzi
slug: number-plane-guide-first-page-zkpnzi
status: completed
build: n/a
---

# Architecture review — reclassifying Number Planes cards by object-type

An external Architecture & Quality lens on the proposal to make **object-type** the
primary classification of the Number Planes note-cards, re-atomize `CX`-style bundles
into one-object-per-card, and (implicitly) reshape the typed-link graph. Reviewed
against the live artifact: 27 cards, the `kind = (subject × role)` frontmatter, the
`index.html` inspector, and the five-edge typed graph.

## Plan under review

<details>
<summary>Original request</summary>

Reclassify the Number Planes note-cards by OBJECT-TYPE as the primary `type`: domain ·
observation · theorem · note · widget · topic (+ candidate additions: definition,
question). Definitions: domain = a space/structure the math is about (the line, ℂ,
dual, split, ℝ×ℝ, the p-circle); observation = a noticed phenomenon pre-proof; theorem
= a precise provable claim; note = connective remark/aside/glue; widget = an
interactive instrument; topic = an area to expand into (≈ today's orbs); definition =
naming a term; question = a motivating question. Demote line/space to a *domain tag*
(or drop). Re-atomize so each card is ONE object-type (CX currently bundles a domain ℂ
+ observations + theorems + a widget + topic links; it explodes into ~5 objects). This
changes the card count from 27 (atoms-by-story-role); likely grows. Keep the
Markdown+YAML format, the typed-link graph (leans-on/opens/same-as/contrasts/used-for),
and layered glance/note/full.

QUESTIONS: (1) Is object-type the right primary classification and is the set
complete/coherent? (2) Does re-atomizing help comprehension+reuse or fragment reading +
multiply maintenance — right granularity? (3) How should type interact with the typed
link graph (type-aware semantics?) and with layered glance/note/full (does atomization
make "## full" redundant)? (4) Risks + smallest de-risking first step.

</details>

## What exists today (ground truth)

Before judging the change, the current design deserves a fair reading, because the plan
partly reinvents things the artifact already got right.

- **27 cards**, one `.md` file each, Markdown + a small restricted-YAML frontmatter.
- **`kind` is an explicit two-axis merge.** The README says so in as many words:
  *"`kind` names two things at once — the *subject* and the *role* … A card is really
  **(subject, role)**; today `kind` merges them. Split into two fields if it ever earns
  it."* The six values decompose as:

  | `kind` | Subject axis | Role axis |
  |---|---|---|
  | `line` | number line | main-thread beat |
  | `space` | a plane (ℂ/dual/split/ℝ²) | main-thread beat |
  | `knob` | mechanism/dial | control you turn |
  | `facet` | fragment | transcluded-only |
  | `tangent` | side-topic | written detour |
  | `orb` | future/adjacent topic | stub portal |

- **A five-edge typed graph**: `same-as` · `contrasts` · `opens` · `leans-on` ·
  `used-for`. `same-as`/`contrasts` are undirected; the rest directed. Rendered both
  directions (back-references) by the inspector.
- **Three body depths**: `glance` (frontmatter, the collapsed orb text) · `## note`
  (default terse card) · `## full` (textbook depth, statements + proofs).
- **Transclusion** via `![[id]]` for `facet` fragments (`L5` *stretchable* pulled into
  `FD` and `CX`), and inline `[[id]]` cross-refs.
- The inspector (`index.html`) is a **dependency-free** ~380-line file that parses the
  restricted YAML itself, groups the sidebar by `KIND_ORDER`, colors nodes by `kind`,
  and colors edges by type. **This is the verification surface** — there is no
  `npm run build` coverage of these public files; correctness is "open the inspector,
  eyeball the graph."

> [!NOTE]
> The plan's premise — "classify by story-role" — is only half true. The current system
> already classifies by a *role × subject* pair and openly flags the merge as
> provisional. The real proposal is: **change the primary axis from role to
> object-type, and split bundled cards.** That is a smaller, sharper claim than "the
> cards aren't typed," and it should be evaluated as such.

## The pattern-recognition lens: what this resembles

This is a **digital garden / Zettelkasten** built on **docs-as-data (frontmatter CMS)**
with an aspiration toward a **typed knowledge graph**. Each established model has a
verdict baked into decades of practice.

| Established model | What it says about typing | Bearing on this plan |
|---|---|---|
| **Zettelkasten (Luhmann)** atomic notes | One idea per note; *links carry the structure, not a taxonomy of note kinds*. Luhmann had essentially **no note-type field** — only IDs and links. | Cautions against a rich node-type enum as the primary axis. The value was atomicity + links, not classification. |
| **Digital gardens / Obsidian** | Frontmatter `tags:` are **facets, not a single primary class**. A note is `#concept #open` at once. Folder-as-type is an anti-pattern the community moved away from. | Strongly favors **orthogonal facets** (type-tag *and* subject-tag) over one primary `type`. |
| **Semantic web / RDF + schema.org** | Nodes get an `rdf:type` (often several); **edges are typed and their domain/range are constrained** by the node types. This is the maturest model of "type nodes AND edges." | This is the plan's implicit destination. RDF's lesson: typed edges are powerful **but the maintenance cost is real** — every triple must satisfy domain/range or the graph is "invalid," and nobody validates it by hand. |
| **Topic Maps (ISO 13250)** | Topics (typed) + associations (typed, with typed *roles* at each end). Historically **out-competed by RDF for being too heavy** for its payoff. | A direct warning: a fully role-typed association model is more ceremony than a 27-node hand-maintained garden can carry. |
| **Bloom's-taxonomy content typing / LOM** | Educational-object typing (definition/example/exercise/assessment). Useful for *reuse and sequencing*, brittle when items are multi-purpose. | `observation/theorem/definition/question` is a Bloom-flavored content-type axis. Good for pedagogy; the brittleness warning applies to bundled cards. |
| **DITA (docs-as-data topic typing)** | Concept / Task / Reference as *distinct topic types with distinct required structure*. Enforces one-type-per-topic — exactly the plan's "one object-type per card." | The closest precedent to the plan's **strong** form. DITA works **because a schema enforces it and a build validates it**. Without validation you get the discipline cost without the payoff. |

> [!IMPORTANT]
> Every model that types **both** nodes and edges (RDF, Topic Maps, DITA) pays for it
> with **schema + a validator**. Here the only "build" is `npm run build` (which never
> touches `public/`) and a hand-run inspector. **Typed edges without a validator is the
> worst quadrant**: you carry the notation cost and get none of the guarantee. This is
> the single most important structural finding of this review.

## Q1 — Is object-type the right *primary* axis, and is the set well-factored?

### Primary vs. orthogonal facets

The plan treats "type" as *the* primary classification, demoting line/space to a
domain-tag. **This is the wrong framing.** Two independent questions are being asked of
every card:

1. **What kind of thing is it?** (domain / observation / theorem / definition /
   question / widget / topic / note)
2. **What is it about?** (the line / ℂ / dual / split / ℝ² / the dial / meta-algebra)

These are **orthogonal facets**. `CX` is a *domain* that is *about ℂ*; `WH` is a
*theorem* (or observation) that is *about all three planes*; `autodiff` is a *topic*
that is *about the dual number's application*. A card has **both** a type and a
subject, and neither subsumes the other. The digital-garden and RDF traditions both
land here: **two tag fields, not one primary class.**

Concretely, keep the two-axis structure the README already anticipated, but **rename
and re-populate the axes**:

- `type:` — object-type (the plan's enum)
- `subject:` / `domain:` — a *tag* (which can be multi-valued: `WH` is about `[CX, DU, SP]`)

This preserves the current sidebar (group by whichever axis you want; the inspector
already groups by `KIND_ORDER` and could group by either), makes ℂ-the-domain vs.
theorem-about-ℂ expressible without a card explosion, and matches the artifact's own
stated intention. **The plan's "demote line/space to a domain tag" instinct is right;
its "make type the single primary axis" instinct is not.**

### Is the type set MECE-ish?

Test the proposed `{domain, observation, theorem, note, widget, topic, definition,
question}` against the 27 cards.

| Type | Clean examples | Boundary problems |
|---|---|---|
| **domain** | CX, DU, SP, L1(line) | Is `PL` ("the plane has one knob") a domain or a mechanism/knob? Is `CR` ("the dial is a circle") a domain (the p-circle) or an observation? |
| **observation** | WH ("one count, three faces"), the "multiply=turn" line inside CX | vs. **theorem**: WH's `## full` *proves* it. Observation-before-proof and theorem-with-proof may be the **same card at two depths**, not two cards. |
| **theorem** | FD ("only one is a field"), the (−1)(−1)=+1 result in L4 | Same collision with observation. Also: is FD a theorem or a domain-claim *about* the field ℂ? |
| **note** | AX ("why we fix addition"), L3 ("what we ask of multiply") | "Connective glue" is a **residual bucket** — anything not clearly the other seven. Residual categories always swell; watch it. |
| **widget** | the `figures:` blocks | **These are already a first-class field (`figures:`)**, not cards. Promoting them to cards is a regression (see Q2). |
| **topic** | all 11 `orb` cards, `tangent` cards | Clean. This is just `orb`/`tangent` renamed, and it's the best-motivated part of the plan. |
| **definition** (candidate) | L5 (*stretchable*) | Already handled: `kind: facet` + transclusion. `definition` ≈ `facet` with a name. Reasonable, but it's a rename of an existing solved case. |
| **question** (candidate) | L2 ("treat the two numbers as strangers"), higher ("can we go higher?") | Genuinely present in the corpus as a *rhetorical framing*, rarely as a standalone card. Risk: every card *opens* with a question; making "question" a type invites splitting the hook off every card. |

Findings:

- **`observation` vs `theorem` is not a clean partition** — it's the **glance/note vs
  full depth axis** wearing a costume. Nearly every `space` card *observes* a
  phenomenon in `## note` and *proves* it in `## full`. Splitting these into two cards
  fights the three-depth design the plan says it wants to keep. **This pair is
  over-factored.**
- **`widget` should not be a node type.** Figures are already structured data attached
  to the card they illustrate (`figures:` with `widget`, `op`, `show`, `caption`).
  A widget with no host card is meaningless; a widget *is* an attribute of its subject.
- **`note` is a residual bucket** and will accrete. Acceptable only if you accept it as
  "unclassified/glue" and periodically drain it.
- **`domain / topic / definition` are the well-motivated core** and map almost 1:1 onto
  today's `space+line` / `orb+tangent` / `facet`. The plan's genuine content is:
  *rename the role axis to a cleaner type vocabulary and split the subject out as a
  tag.*

> [!WARNING]
> The set is **under-factored in one place and over-factored in two**. Under: it lacks
> a clean home for **mechanism/knob** cards (`PL`, `CR`, `QD`, `DV`) — the plan folds
> them into `domain`, losing the "you turn this" semantics the current `knob` role
> captures. Over: `observation`/`theorem` duplicate the depth axis, and `widget`
> duplicates the `figures:` field. A better-factored type set is roughly
> **{domain, mechanism, claim, definition, topic, note}** — where `claim` absorbs both
> observation and theorem (the proof lives in `## full`), and `widget` stays an
> attribute.

## Q2 — Re-atomization: right granularity, or fragmentation?

The plan's sharpest move is exploding `CX` (domain + observations + theorems + widget +
topic links) into ~5 objects. Evaluate against **atomicity's actual purpose**, which in
Zettelkasten/DITA is **independent reuse and stable linking** — *not* small-for-its-own-sake.

**Reuse test:** does any of `CX`'s pieces get **transcluded or linked-to
independently**? The corpus already shows the mechanism for the one place this happens:
*stretchable* is split into `L5` (a `facet`) precisely because `FD` and `CX` both need
it. That is atomization *earned by reuse*. By contrast, "the observation that
multiplying by a complex number turns the plane" is only ever used **inside the story
of ℂ**. Splitting it out creates a card nothing else points to — a fragment, not an
atom.

**Reading-flow cost:** the corpus is a *narrative* ("the before-the-plane beats," "the
plane will leave exactly one choice"). Cards reference each other as story beats
(`L4 → L3`, "the plane will leave exactly one"). Shattering `CX` into five stubs means
a reader following the main thread now hits five card-boundaries where there was one
coherent beat. Zettelkasten atomicity assumes **non-linear browsing**; this artifact is
**partly linear** (the `line` beats L1→L5, the `space` triple). Over-atomizing a
narrative is a known failure mode of digital gardens — "note soup," where every idea is
a stub and no page teaches anything on its own.

**Maintenance multiplier:** 27 → likely 50-70 cards. Every split multiplies:

- `manifest.json` entries (hand-regenerated via the `ls *.md` recipe — more files, more
  drift risk).
- edges: an internal `[[...]]` reference inside `CX` becomes an **inter-card edge** that
  must be added to `links:` and kept consistent both directions.
- the graph's legibility: the force-directed SVG layout in `index.html` is tuned for
  ~27 nodes (`R = min(W,H)*0.34`, repulsion `6500/d²`, 340 iterations). At 60+ nodes it
  will hairball. **The visualization does not scale linearly with node count.**

> [!IMPORTANT]
> **Atomize by reuse, not by type.** The right rule is the one the corpus already
> follows for `L5`: *split a piece out only when a second card needs to point at it
> independently.* Splitting `CX` five ways because it "contains five object-types" is
> typing-driven fragmentation — it manufactures nodes with in-degree ≤ 1 that exist
> only to satisfy the taxonomy. That is the classic over-normalization mistake (3NF for
> a spreadsheet nobody joins).

**Where atomization *does* pay:** if a theorem like FD or WH is genuinely referenced by
several planes and by future `orb` expansions, keeping it as its own card (as it already
is) is correct. The corpus's *existing* granularity — one card per story beat, with
`facet` for the one reused fragment — is close to optimal. The plan would move it from
"right-sized" toward "over-atomized."

## Q3 — Type × edges, and type × depth

### Type-aware edges: desirable in theory, unaffordable here

RDF/Topic Maps show the endgame: `observation --about--> domain`,
`theorem --proves--> claim`, `widget --demonstrates--> observation`. This is elegant and
*would* let the inspector validate ("a `proves` edge must end at a `claim`"). But:

- **The current five edges are already semantically rich and type-agnostic on purpose.**
  `leans-on`/`opens`/`same-as`/`contrasts`/`used-for` describe the *rhetorical* relation
  (this beat depends on that one; this orb opens onto that topic). They read well without
  knowing endpoint types.
- Adding **endpoint-type constraints** requires a **validator** to be worth anything, and
  there is none. Without it, a `proves` edge pointing at a `domain` is just as "valid" as
  one pointing at a `claim` — the constraint is documentation, not enforcement.
- **Cost/benefit:** the payoff of typed edges is (a) validation and (b) richer queries
  ("show me every widget that demonstrates a theorem"). With 27-70 hand-maintained cards
  and a human eyeballing the graph, **neither payoff materializes.** You'd add a
  domain/range table to the README that nothing checks.

> [!NOTE]
> **Recommendation: keep edges type-agnostic; do NOT constrain endpoints by type.** If
> you want *any* type-awareness, the cheap, high-value version is **presentational**:
> the inspector already colors nodes by `kind` and edges by relation — let it also, say,
> render `topic`-type targets with the "open tab" styling. That's zero-schema
> type-awareness. Reserve true typed-edge domain/range for the day a validator ships
> (which the "verification is `npm run build` + manual" constraint says is not now).

A small, honest middle path: add **one** derived, unenforced convention that the
inspector can surface — e.g. an `opens`-edge *from* a non-topic *to* a `topic` is the
"portal" relation, and the inspector labels it. This buys legibility without a schema.

### Does atomization make `## full` redundant?

**No — and this is a reason to be skeptical of the split.** The plan proposes splitting
observation (pre-proof) from theorem (proof), which is *exactly* what `## note` (the
phenomenon) and `## full` (the statement + proof) already do **within one card**. So:

- If you keep glance/note/full, the observation→theorem split is **redundant with the
  depth axis** — you'd be encoding the same distinction twice (once as card-type, once
  as body-section), and they *will* drift.
- If you split into separate observation and theorem *cards*, then `## full` on the
  observation card has nothing to say (the proof moved), and the theorem card's `##
  note` and `## full` collapse — so `## full` becomes redundant on **both** halves.

Either way it's a conflict. **The depth axis (note/full) and a hypothetical
observation/theorem type axis are the same distinction.** Pick one. The existing choice
— **depth, inside one card** — is the better one: it keeps the phenomenon and its proof
together (how the math actually reads) and preserves progressive disclosure.

> [!IMPORTANT]
> **Do not add `observation` and `theorem` as separate types.** They re-encode the
> note/full depth split you are keeping. Collapse them to a single `claim` type whose
> `## note` states the phenomenon and `## full` proves it — precisely today's `space`
> cards.

## Q4 — Risks and the smallest de-risking first step

### Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Node explosion hairballs the graph view** (`index.html` layout tuned for ~27) | High | High | Cap growth; tune force params; or split the graph by subject-facet |
| **Typed edges without a validator** — cost, no guarantee | High if adopted | Med | Don't type edges now; keep them rhetorical |
| **observation/theorem duplicates note/full** — silent drift | High if adopted | Med | Collapse to `claim`; keep depth axis |
| **`note` residual bucket swells** | Med | Low | Accept as "glue," drain periodically |
| **Manifest/back-reference drift** at higher card count (all hand-maintained) | Med | Med | A tiny `npm run` lint that checks manifest ⊇ files and every `[[id]]`/`links` target exists |
| **Reading flow fragments** (narrative shattered into stubs) | Med | High | Atomize by reuse, not by type |
| **Losing the `knob`/mechanism semantics** by folding into `domain` | Med | Med | Keep a `mechanism` type |
| **`widget`-as-node loses the `figures:` host binding** | High if adopted | Med | Keep widgets as `figures:` attributes |

### Smallest de-risking first step

The plan is really **three separable changes** bundled together. Unbundle and do only
the cheapest, most reversible one first:

1. **(Change A) Split the axis** — add `type:` and `subject:` fields **alongside** the
   existing `kind:`, leaving `kind` and everything else untouched. Populate `type` from
   the refined enum ({domain, mechanism, claim, definition, topic, note}) and `subject`
   as a tag. **No card is split. No edge changes. No card count change.** The inspector
   keeps working (it reads `kind`); you can *optionally* teach it to group by `type`
   in ~10 lines.
2. (Change B) Re-atomize bundled cards — deferred, done case-by-case, only where reuse
   is demonstrated.
3. (Change C) Type-aware edges — deferred indefinitely, gated on a validator.

> [!IMPORTANT]
> **Smallest de-risking step = Change A on ONE cluster, e.g. the three planes
> (`CX`/`DU`/`SP`) plus `WH`/`FD`.** Add `type:`/`subject:` to those five files, teach
> the inspector to *display* the new fields (a badge), and look at the graph. This is
> ~30 minutes, fully reversible (new frontmatter keys the old parser ignores), and it
> answers the real question — *does dual-facet typing read better than merged `kind`?*
> — without touching card count, edges, or the narrative. **Verification is exactly the
> project's stated surface: open `index.html` over http and eyeball it; `npm run build`
> is irrelevant to `public/` and won't regress.** If dual-facet typing feels right on
> five cards, roll it across all 27. Only *then* consider splitting anything.

## Verdict

**Concerns — would change substantially before adopting.**

- **Endorse:** the instinct that `kind` conflates two axes (the README already says so),
  and the `orb`→`topic`, `facet`→`definition` renames. Cleaning the "what is it about"
  tag out of the type is the right move.
- **Would change:** make **type and subject orthogonal facets** (two tag fields), *not*
  a single primary `type` with subject demoted. This is what every mature model
  (Obsidian, RDF, DITA) actually does.
- **Reject as proposed:** (a) `observation` + `theorem` as separate types — they
  duplicate the `note`/`full` depth axis and will drift; collapse to one `claim`.
  (b) `widget` as a node type — it's already the `figures:` attribute. (c) Type-aware
  edges — unaffordable without a validator; the current rhetorical edges are correct.
  (d) Wholesale re-atomization of `CX`-style cards — **atomize by reuse, not by type**;
  the corpus's `L5`-facet pattern already shows the right rule, and splitting narrative
  beats into in-degree-1 stubs is over-normalization that will hairball the graph.
- **Do first:** the additive `type:`/`subject:` frontmatter on one 5-card cluster,
  verified by eyeballing the inspector. Reversible, schema-free, and it settles the core
  question before any irreversible split.

The plan's diagnosis (the type axis is muddy) is sound; its prescription (one primary
object-type + explode every bundle) over-reaches into a heavier model than a
hand-maintained 27-card garden with no validator can carry. Ship the faceting; defer the
fragmentation.

## Self-reflection

1. **What would you do with another session?** Actually apply Change A to the five-card
   cluster (`CX`/`DU`/`SP`/`WH`/`FD`) and add the ~10-line inspector badge, then screenshot
   the graph at that state — turning this paper recommendation into a demonstrated A/B.
2. **What would you change about what you produced?** I asserted the force-layout
   "hairballs" past ~60 nodes from reading the params, not from running it at scale;
   a quick synthetic test (duplicate cards to 60 and open the graph) would make that
   claim empirical rather than reasoned.
3. **What were you not asked that you think is important?** Whether the *narrative
   reading order* (L1→L5 beats, the plane triple) should be a first-class artifact —
   a `sequence:`/`next:` field — since the corpus is partly linear. That tension (garden
   vs. guided path) underlies the atomization question and wasn't in the brief.
4. **What did we both overlook?** That `manifest.json` is hand-regenerated and there is
   no lint tying it to the files or checking that `[[id]]`/`links` targets exist. Any
   card-count growth makes that drift the most likely *actual* breakage, independent of
   the taxonomy debate.
5. **What did you find difficult?** Distinguishing the plan's genuine content (rename the
   role axis, split the subject out) from its overreach (single primary type, explode
   bundles), because the request phrases both as one move.
6. **What would have made this task easier?** A stated success criterion for the
   reclassification — is the goal better reuse, better browsing, better authoring, or
   validation? The right taxonomy depends on which, and it was left implicit.
7. **How did you verify this, and does each passing check test the user-visible claim?**
   Reasoning only, grounded in a full read of the 27 cards' frontmatter, the README, and
   the complete `index.html` inspector (parser, layout params, edge/kind tables). No code
   was run; this is a design review, so "verification" is the fidelity of the reading, not
   a passing build. Claims about the graph's scaling behavior are reasoned from the layout
   constants, not measured — flagged as such in reflection #2. Signal: `visual-unverified`
   (the graph-scaling claim was not rendered).
8. **Follow-up value:** MEDIUM — the analysis is complete and the recommendation stands,
   but the concrete de-risking step (apply Change A to five cards + inspector badge, and
   empirically check graph scaling) is unstarted and would convert advice into evidence.
