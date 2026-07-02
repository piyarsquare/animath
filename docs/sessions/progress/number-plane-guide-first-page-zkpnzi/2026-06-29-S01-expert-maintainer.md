---
kind: three-hats
session: 2026-06-29-S01
date: 2026-06-29
title: "Framework-maintainer review — reclassifying the Number Planes cards by object-type"
branch: claude/number-plane-guide-first-page-zkpnzi
slug: number-plane-guide-first-page-zkpnzi
status: complete
build: n/a
followup: medium
pr: null
app: docs
---

# Framework-maintainer review — reclassifying the Number Planes cards by object-type

This is a single-lens review (the **framework maintainer** hat only) of a proposal
to reclassify the 27 Number Planes note-cards. My job is not to judge whether the
mathematics-pedagogy taxonomy is *good* (that is the pedagogy hat) but whether the
change is **operationally safe**, **consistent with how this repo actually works**,
and **not re-litigating a decision the cards already made and documented**.

Headline: the cards' README already anticipates and answers most of this proposal,
and the proposal's biggest risk is not the taxonomy — it is the **atomization
multiplier** landing on a hand-rolled YAML parser, a manually-maintained
`manifest.json`, and a link graph whose integrity nothing checks.

## Plan under review

<details>
<summary>Original request</summary>

Reclassify the Number Planes note-cards by OBJECT-TYPE as the primary `type`: domain · observation · theorem · note · widget · topic (+ candidate additions: definition, question). Definitions: domain = a space/structure the math is about (the line, ℂ, dual, split, ℝ×ℝ, the p-circle); observation = a noticed phenomenon pre-proof; theorem = a precise provable claim; note = connective remark/aside/glue; widget = an interactive instrument; topic = an area to expand into (≈ today's orbs); definition = naming a term; question = a motivating question driving the notebook. Demote line/space to a *domain tag* (or drop). Re-atomize so each card is ONE object-type (the CX card currently bundles a domain ℂ + observations + theorems + a widget + topic links; it would explode into ~5 objects). This changes the card count from the current 27 (which were atoms-by-story-role); it will likely grow. Keep the Markdown+YAML format, the typed-link graph (leans-on/opens/same-as/contrasts/used-for), and layered glance/note/full text.

QUESTIONS: (1) Is object-type the right primary classification and is the set complete/coherent? (2) Does re-atomizing (one object per card) help comprehension+reuse or fragment reading and multiply maintenance — what's the right granularity? (3) How should type interact with the typed link graph (type-aware link semantics?) and with layered glance/note/full (does per-object atomization make "## full" redundant)? (4) Risks, and the smallest first step to de-risk before rewriting 27→N files.

</details>

## Executive summary

| Question | Maintainer verdict (one line) |
|---|---|
| (1) Is object-type the right primary axis? | Partly. Object-type is a legitimate **secondary** facet, but making it the sole *primary* `kind` discards the story-role information the README says the cards are organized by. Prefer **two fields**, not a replacement. |
| (2) Right granularity for re-atomization? | **The proposal's own granularity is wrong.** "One object-type per card" is an ontology-driven rule, not a use-driven one. The cards are already atoms-by-story-role, which is the granularity the *reader* and the *deck* consume. Exploding CX into 5 files buys reuse the notebook does not yet need and multiplies the maintenance surface. |
| (3) Type × graph × layered text? | Type-aware link *validation* is cheap and worth it; type-aware link *semantics* is over-engineering. Atomization does **not** make `## full` redundant — glance/note/full is a **reading-depth** axis, orthogonal to object-type. |
| (4) Smallest de-risking first step? | Do **not** rewrite files first. Add `type:` as an **additive second field** on the existing 27 cards, teach the inspector to read it (or ignore it gracefully), and write a **link-integrity + manifest-drift checker**. Only split cards where a *concrete* second consumer exists. |

> [!IMPORTANT]
> **Decision I would push for:** keep the 27 files, add `type:` alongside `kind:`,
> and gate any file-count growth behind a demonstrated second consumer. This is the
> repo's own append-only, cheap-to-sync philosophy applied to card content.

## 1 · History & context — the cards already made this decision, on purpose

Before treating this as a greenfield taxonomy question, read what the artifact says
about itself. `public/number-planes/cards/README.md` is unusually explicit, and it
directly pre-empts the proposal:

> `kind` names two things at once — the *subject* and the *role*. … A card is
> really **(subject, role)**; today `kind` merges them. **Split into two fields if
> it ever earns it.**

This matters for the maintainer hat in three ways.

**(a) The proposal is not new — it is one half of an already-anticipated split.**
The README explicitly names a `(subject, role)` decomposition and reserves the right
to split `kind` into two fields. The proposal's "object-type" axis is *very close to*
the **subject** half (domain ≈ space; the line-beats; topic ≈ orb), and it proposes
to **demote or drop** exactly the field (`line`/`space`) that the README calls the
*subject*. So the proposal is not adding a missing axis — it is **renaming and
partially discarding an axis the authors deliberately kept**, while re-deriving the
role axis under new names (observation/theorem/note/widget ≈ role). A maintainer
should be skeptical of a "reclassify from scratch" framing when the existing scheme
is a documented, deliberate two-in-one that the authors said they'd formalize
*additively*.

**(b) The current classification is by story-role, and there is a live consumer for
that.** The README's first sentence: *"Order is a view; the graph lives in each
card's links."* The cards are atoms **sized to be beats in a narrative** ("the
'before the plane' beats", "a detour off the main thread you take and return from").
The kinds `line`/`knob`/`tangent`/`orb` are *dramaturgical*, not ontological — they
tell the page-1 deck how to pace and portal. Object-type (theorem vs observation)
carries almost none of that pacing information. Reclassifying by object-type
optimizes for a *librarian's* view of the pile at the cost of the *author's* view
that the whole system was built to serve.

**(c) This is an authoring artifact, not a shipped feature.** Confirmed on this
branch: `public/number-planes/` contains only `cards/` — the `number-planes-line.html`
page-1 deck the prompt references **does not exist here yet**. No entry in
`src/apps.ts`, `src/index.tsx`, or `src/chrome/catalog.ts` references these cards.
Nothing in `src/` imports them. They are served statically (via `public/` → `dist/`
copy) and consumed only by `cards/index.html`, a standalone inspector. That cuts
both ways:

- *Lower stakes:* a bad taxonomy here cannot break the build or a shipped app. `npm
  run build` (tsc + vite) does not compile or validate these `.md`/`.html` files at
  all — they are opaque assets. So the CI safety net that catches most repo mistakes
  **does not exist for this content**. That is an argument for *manual* discipline,
  not for freedom.
- *Higher change-cost-per-benefit:* because nothing consumes the `type` field yet,
  every hour spent perfecting an ontology is spent on an artifact with **zero current
  readers of that field**. The maintainer's instinct — *prefer working content over
  elegant ontology* — is sharpest exactly when the ontology has no consumer to
  justify it.

> [!NOTE]
> This does not mean the proposal is wrong to want object-type. It means the burden
> of proof is "show the consumer that needs it," and right now that consumer (the
> deck) is unbuilt. Design the field with the deck, not before it.

## 2 · Operational reality — what actually breaks

The proposal says "keep the Markdown+YAML format" and "keep the typed-link graph."
Both of those are load-bearing, hand-rolled, and more fragile than the proposal
credits. Here is the concrete blast radius.

### 2.1 · The frontmatter parser is a restricted-YAML subset — new fields can silently misbehave

`cards/index.html` ships its **own** ~35-line YAML parser (`parseFront`, lines
118–163). It is not `js-yaml`; it handles exactly:

- top-level `key: scalar`
- top-level `key: [a, b, c]` inline list (via `parseScalar`)
- a **map of scalars** under a bare `key:` (used by `links:`)
- a **list of maps** under `figures:` (special-cased by name, line 137)

The good news: a **new top-level scalar** `type: theorem` parses fine — it matches
the `key: value` branch (line 159) and lands in `out.type`. So the *minimum* version
of the proposal (add a scalar `type:`) will not break the parser.

The traps, in order of likelihood:

| If the new schema does… | Then the parser… | Severity |
|---|---|---|
| `type: theorem` (bare scalar) | works | ✅ none |
| `type: [theorem, observation]` (a card is two types) | parses as a **list** — but every downstream `KIND[c.type]` lookup expects a string; you get `KIND["theorem,observation"]` → undefined color/label | ⚠️ silent mis-render |
| a **nested** `type:` block (e.g. `type:\n  primary: theorem`) — because `figures` is the *only* name that triggers the list-of-maps branch, any *other* nested key hits the **map-of-scalars** branch (line 151) and quietly flattens | works only if the structure is exactly a flat scalar map; anything deeper is dropped | ⚠️ silent data loss |
| a `type` value with a `:` or `#` in it, or a multi-line `>`/`\|` block scalar | `parseScalar` does no escaping/folding; a `#` is **not** stripped as a comment | ⚠️ malformed value |
| renaming `kind:` → `type:` outright | `KIND`, `KIND_ORDER`, `renderList`, `overview`, the graph legend, and the sidebar grouping are **all keyed on `c.kind`** (lines 102–110, 208, 269, 327) | ❌ inspector shows every card as an unlabeled gray dot until you also rewrite the JS |

> [!WARNING]
> The parser fails **silently**, not loudly. An unknown or list-valued `type` does
> not throw — it produces `undefined` from the `KIND` lookup and renders a card with
> a blank badge and a `var(--muted)` dot. There is no console error, no build error
> (build never sees this file), and no test. A reviewer eyeballing the inspector
> could easily miss five miscolored dots among N. **The absence of a failure signal
> is the real hazard, not any single field.**

**Implication for the proposal's candidate additions.** `definition` and `question`
as new *scalar* values are free. But any move toward "a card carries **multiple**
object-types" (which is the natural pressure once you start atomizing, because CX's
five objects are entangled) pushes toward list- or map-valued `type`, which is
exactly where this parser gets flaky. The safe rule: **`type` must stay a single flat
scalar**, and the taxonomy must be closed and enumerated in the JS `KIND`/`TYPE`
table so an unknown value is at least visibly wrong.

### 2.2 · `manifest.json` is hand-maintained and has no drift check

The inspector loads `manifest.json` (a literal JSON array of 27 ids) and fetches
each `id.md`. The README's regen instructions are a shell one-liner a human runs by
hand (`ls *.md | grep -v README | …`). There is:

- **no build step** that regenerates it,
- **no check** that the manifest matches the files on disk,
- **no check** that a link target `[[id]]` or `links: opens: [x]` resolves.

Today, with 27 stable files, drift is rare. **The whole point of the proposal is to
make the file set churn** — split CX into 5, add definitions and questions, "it will
likely grow." Every split, rename, or add is a manual `manifest.json` edit. A missed
edit means:

- a new card that **exists but never appears** (not in the manifest → never fetched), or
- a manifest id whose file was renamed → `fetch('./OLD.md')` 404s. The loader's
  `Promise.all` will still resolve the 404 as text (an HTML error page or empty
  string), so `splitCard` runs on garbage and you get a **phantom card** with no
  frontmatter and a blank badge — again, silently.

The graph amplifies this: `graphData` drops edges to missing targets (`if
(!cards[t]) continue;`, line 285) and `mdInline` renders a dangling `[[id]]` as
`id?` with a `.miss` class. So a broken link **degrades quietly to a red-ish "?"**
rather than an error. Fine at 27 cards you can eyeball; a real hazard at 40–60 cards
churning across atomization edits.

> [!CAUTION]
> **Gotcha** — the 404-as-text failure mode means a stale manifest doesn't crash the
> inspector; it *pollutes* it with an empty phantom card. Combined with the
> silently-broken links, the inspector will look "mostly fine" while being subtly
> wrong. This is the classic manual-index-drift trap, and the proposal's file-count
> growth walks straight into it.

### 2.3 · Transclusion (`![[id]]`) couples cards — atomization multiplies coupling

`![[id]]` inlines the *target's `note`* as a blockquote (`mdBlock`, lines 189–190).
Today one facet (`L5` "stretchable") is transcluded into `CX` and `FD`. That is the
system working as designed: a small shared fragment lives once.

If atomization creates many small single-object cards (a lone "theorem: only ℂ is a
field", a lone "observation: multiply = turn"), the temptation is to **transclude
them back together** so a reader still gets the CX story in one place. That inverts
the current cost model: instead of one CX card you read top-to-bottom, you get a
*composition* card that transcludes 5 objects, each of which is also its own file
and its own graph node. Now:

- a change to the "multiply = turn" observation ripples into every composition that
  transcludes it (good for consistency, but you must *find* them — there is no
  "transcluded-by" back-reference; the inspector only builds `links`-based backrefs,
  not `![[ ]]` backrefs),
- the graph gains ~5 nodes where there was 1, and the force layout (a hand-rolled
  O(n²) spring solver, 340 iterations, lines 296–308) gets busier and less legible
  precisely as the pile grows — the readability of the graph view **degrades with N**,
  and N is what the proposal increases.

The maintainer read: **transclusion is a feature for genuinely-shared fragments, not
a re-assembly mechanism for over-atomized content.** If you find yourself
transcluding five just-split objects back into one card to restore readability, the
split was net-negative.

### 2.4 · What is *not* at risk (so the review is fair)

- The build. `npm run build` never touches these files; you cannot red the CI gate
  with a card change. (This is also why nothing catches your mistakes — see 2.1/2.2.)
- Parallel branches. `public/number-planes/cards/` is a self-contained folder no
  other app touches; the append-only shared-file rule (`index.tsx`/`apps.ts`/…) is
  not engaged. Card churn is conflict-free with other app branches. Good.
- The deploy. `public/` copies as-is to `dist/`; more/fewer `.md` files just ship.
- Skin/theme integration. The inspector already uses `guide-theme.css` +
  `guide-skin.js` and the shared token vars; new cards inherit that for free.

## 3 · The four questions, answered from the maintenance seat

### Q1 — Is object-type the right *primary* classification, and is the set complete?

**As a primary replacement: no. As an additive secondary facet: defensible.**

The proposal conflates two moves: (i) *introduce* an object-type facet, and (ii)
*demote/drop* the existing subject axis and make object-type primary. Move (i) is
cheap and arguably useful. Move (ii) throws away information (story-role /
dramaturgy) that the deck — the actual future consumer — needs more than it needs
object-type. A theorem-vs-observation label does not tell the deck whether a card is
a "before the plane" beat, a return-from detour, or a portal to unwritten material.

On **completeness/coherence** of the set `{domain, observation, theorem, note,
widget, topic, +definition, +question}`, from a maintenance (not pedagogy) angle:

| Type | Concern |
|---|---|
| `note` | Dangerously broad — "connective glue" is where everything that doesn't fit will pile up, and a catch-all bucket defeats the purpose of a taxonomy. Expect it to become the new `orb`-sized dumping ground. |
| `widget` | Overlaps the **existing `figures:` frontmatter**. A widget is already representable as `figures: [...]` on *any* card. A separate `type: widget` card would double-encode "there is an interactive thing here." Pick one. |
| `topic` vs `orb` | The proposal admits `topic ≈ today's orbs`. This is a **rename**, and renames of a working, documented term have a cost (README, JS `KIND`, muscle memory) with no functional gain. Skeptical. |
| `domain` vs `space`/`line` | Same: `domain` ≈ `space` (+ the line beats). Another rename of a documented term. |
| `observation`/`theorem`/`definition` | These are the *genuinely new* distinctions and the only part that adds information the current scheme lacks. If any part of the proposal survives, it is this trio as a **secondary** `rigor`/`claim` facet. |
| `question` | Useful for a notebook, but there are currently **zero** question-cards; adding the type before the content is speculative schema. |

Net: the set is coherent enough, but roughly **half of it is renaming existing kinds
and half genuinely new** — and the new half (observation/theorem/definition) is
exactly a *rigor axis* that is **orthogonal** to subject/role and should be a second
field, not a replacement.

### Q2 — Granularity: does one-object-per-card help, or fragment + multiply maintenance?

**It fragments, at a maintenance multiplier the notebook has not earned.**

The proposal's granularity rule — "each card is ONE object-type" — is derived from
the *ontology*, not from any *use*. That is the tell. The right granularity question
is never "how many kinds of thing does this card mention?" but **"is there a second
place that needs to reference this piece independently?"** Reuse is the only thing
that justifies a split, and the system already has the right tool for genuine reuse:
`kind: facet` + `![[id]]` (used exactly once today, for `L5`). The fact that only one
fragment has earned facethood in 27 cards is strong evidence that **the demand for
finer atoms is low**.

Exploding CX into ~5 files (domain ℂ, observation "multiply=turn", theorem
"field/positive-definite", widget, topic-links) costs:

- 4 new `manifest.json` entries (manual, unchecked — see 2.2),
- 4 new graph nodes (busier layout — see 2.3),
- a re-assembly problem (how does a reader still get the *CX story*? — see 2.3),
- and a **reading regression**: the current CX card is a genuinely good, self-contained
  read (glance → note with inline `[[ ]]` portals → full with the matrix identity). A
  reader following the deck wants that coherence. Five cards they must hop between is
  worse, not better, for the *primary* use (reading the story).

> [!IMPORTANT]
> **The granularity the reader consumes is the story-beat, and the cards are already
> at it.** Re-atomizing to the object-type is optimizing a dimension no reader
> traverses. Split *only* where a concrete second consumer appears (a fragment reused
> across cards, or a theorem the deck wants to surface on its own). Let reuse pull
> atoms out; don't let ontology push them out.

### Q3 — Type × link-graph × layered text

**Type-aware link *validation*: yes, cheap, do it. Type-aware link *semantics*: no.**

The five edge types (`leans-on`/`opens`/`same-as`/`contrasts`/`used-for`) are
*rhetorical* relations between beats, and they read cleanly regardless of object-type.
Introducing rules like "`opens` must point at a `topic`" or "`same-as` only between
`domains`" is speculative constraint that will fight real edges: today `WH same-as
[CX, DU, SP]` links a claim-card to three space-cards, and `L2 same-as [SP]` links a
line-beat to a space — both would violate naive type rules. So **do not encode type
into link semantics.** The graph's value is that it is loose.

What *is* worth it, and is nearly free: a **checker** (a tiny Node script or a manual
one-liner) that verifies (a) every `links:` target and every `[[id]]`/`![[id]]`
resolves to a manifest id, and (b) the manifest matches `ls *.md`. That is the real
integrity risk (2.2), and it is independent of the taxonomy. Ship the checker
regardless of whether the reclassification happens.

**Does per-object atomization make `## full` redundant?** No — and this is a category
error in the question. `glance/note/full` is a **reading-depth** axis (orb → house
voice → textbook), orthogonal to *what kind of object* the card is. A single theorem
card still wants a one-line glance, a terse note, and a full statement-with-proof. If
anything, splitting a card into one-object atoms makes each atom *shorter*, which
collapses note and full into one paragraph and **loses the layering the README prizes**
("three depths… the presentation layer picks one"). So atomization doesn't make
`full` redundant; it risks making note *and* full both trivially short, which is a
regression in the layered-reading feature, not a simplification.

### Q4 — Risks and the smallest de-risking first step

**Risks, ranked by maintenance impact:**

1. **Silent parser/manifest failures at scale** (2.1, 2.2) — the highest, because
   nothing signals them and the file set is about to churn.
2. **Reading regression from over-atomization** (Q2) — the primary consumer (a human
   reading the deck story) gets a worse experience.
3. **Rename churn with no functional gain** (`orb→topic`, `space→domain`) — cost in
   README/JS/habit for zero capability.
4. **Speculative schema** (`question`, `widget`, multi-type cards) built before a
   consumer exists (§1c) — effort with no reader.
5. **Graph legibility decay** as N grows (2.3) — the hand-rolled O(n²) layout was
   tuned for ~27 nodes.

**The smallest first step (do this *instead of* rewriting 27→N):**

> [!IMPORTANT]
> **De-risking step, in order:**
> 1. **Add `type:` as an additive scalar** to the existing 27 cards — do **not**
>    rename or remove `kind`. `kind` stays the (subject,role) the deck uses; `type`
>    is the new rigor/object facet. Two fields, exactly as the README already
>    reserved the right to do. One card, one `type`, closed enumerated set.
> 2. **Teach the inspector to tolerate `type`** — even just: read it, show it as a
>    second badge, and make an *unknown* value render **visibly** (a warning color,
>    not `var(--muted)` which reads as legitimate). Keep the JS `KIND` table as the
>    closed vocabulary so a typo is loud.
> 3. **Write a link-and-manifest checker** (resolve every `links`/`[[ ]]`/`![[ ]]`
>    target; diff manifest vs `ls *.md`). Run it by hand for now; it is the safety
>    net the build will never provide.
> 4. **Split zero cards until a concrete second consumer appears.** When the page-1
>    deck is actually built and *demonstrably* needs to surface a theorem on its own,
>    split that one card. Let the deck pull atoms; don't push them.
>
> This is reversible, breaks nothing, requires no manifest churn, and lets the
> taxonomy prove its worth on real cards before you pay the atomization tax.

## 4 · Consistency with how the repo actually works

Three repo-wide patterns argue for the additive path:

- **Append-only / additive change** is the repo's core collaboration invariant (the
  parallel-branch rule for `apps.ts`/`index.tsx`). Adding a `type` field to cards is
  the content-level analogue: additive, reversible, conflict-free. A 27→N rewrite is
  the opposite — a from-scratch re-derivation, which is exactly the shape of change
  the repo's conventions are built to avoid.
- **"Split into two fields if it ever earns it"** (the README) is the same
  YAGNI/earned-abstraction discipline CLAUDE.md applies elsewhere ("be skeptical of
  abstraction not justified by concrete need"). The cards' authors already wrote down
  the guardrail; the proposal should honor it, not bypass it.
- **CI is only `npm run build`.** Because these files are invisible to the one gate,
  the repo's *implicit* rule is "content that no build checks must be kept dead
  simple and manually verifiable." A richer, churnier ontology on unchecked static
  files runs against that grain. If the taxonomy grows, it should come *with* a
  checker so the manual discipline scales.

## Verdict

**What I endorse:**

- Introducing an **object-type / rigor facet** (`observation`/`theorem`/`definition`)
  — this is the one genuinely new, information-adding part of the proposal.
- Adding a **link-and-manifest integrity checker** — worth doing today, independent
  of the reclassification; it addresses the real, silent, about-to-grow risk.
- Designing the field **with** the page-1 deck as the driving consumer, once that
  deck exists.

**What concerns me:**

- Making object-type the **sole primary `kind`** and **dropping `line`/`space`**
  discards the story-role/dramaturgy axis the deck needs and the README deliberately
  kept. It re-litigates a documented, intentional design as if it were greenfield.
- **One-object-per-card atomization** is an ontology-driven granularity with no
  use-driven justification; it fragments the primary reading experience, multiplies
  the manual `manifest.json`/graph maintenance surface, and pressures the schema
  toward multi-valued `type` — the exact place the hand-rolled parser gets flaky and
  **fails silently**.
- Half the proposed set (`topic`←`orb`, `domain`←`space`) is **renaming** working,
  documented terms for no capability gain.
- Building `question`/`widget` types and splitting files **before any consumer of the
  `type` field exists** spends effort on an artifact with zero readers of that field.

**What I would change (the counter-proposal):**

1. Keep the **27 files** and keep **`kind`** (subject×role) as-is.
2. Add **`type:` as an additive, single-scalar, closed-vocabulary** second field —
   this is the README's own "split into two fields" done additively.
3. Ship the **integrity checker** first; make the inspector render **unknown `type`
   loudly**; keep `type` a flat scalar (never a list/map — the parser can't take it).
4. **Split a card only when a concrete second consumer demonstrably needs the piece**
   (reuse via `facet`/`![[ ]]`, or a deck surfacing a lone theorem). Let reuse pull
   atoms out; do not let the ontology push them out.

The proposal's instinct — that object-type is a real and useful distinction — is
sound. Its *execution* — replace-and-atomize-from-scratch on unchecked static files
that no consumer reads yet — is where a maintainer should apply the brakes. Do the
additive, checker-backed, consumer-driven version.

## Self-reflection

1. **What would you do with another session?** Actually write the two de-risking
   artifacts I recommend — the additive `type:` field on a couple of sample cards and
   a `check-cards.mjs` link/manifest integrity script — so the recommendation ships
   as working code rather than advice. I would also pull in the other two hats
   (pedagogy, architecture) since this was a single-lens review and the taxonomy's
   *value* is largely a pedagogy question I deliberately did not adjudicate.
2. **What would you change about what you produced?** It leans long. The core
   maintainer finding compresses to: "additive `type` field + integrity checker +
   split-on-demand; don't rewrite 27→N on unchecked static files." Some of the
   parser-trap detail, while true, is defensive depth a shorter memo could cite
   rather than enumerate.
3. **What were you not asked that you think is important?** Whether the page-1 deck
   (`number-planes-line.html`) — the actual future consumer — even *needs* an
   object-type facet, or whether it consumes `kind` and `links` only. That deck
   doesn't exist on this branch, so the whole reclassification is designing a field
   ahead of its reader. That absence should probably reframe the task from "reclassify
   now" to "build the deck, then let it pull the schema it needs."
4. **What did we both overlook?** The `figures:` frontmatter already encodes
   "interactive widget here," which overlaps the proposed `type: widget`. Neither the
   plan nor my first pass flagged that the new taxonomy duplicates an existing field
   until I traced the parser. Double-encoding is a maintenance smell worth naming
   early.
5. **What did you find difficult?** Staying strictly in the maintainer lane. Several
   of the strongest objections (does atomization *help comprehension*) are really
   pedagogy calls; I tried to answer only their maintenance-cost half and flag the
   rest as out-of-lane.
6. **What would have made this task easier?** A stub of the page-1 deck, or a note on
   how it intends to query cards. Without the consumer, "is object-type the right
   primary axis" can only be answered structurally, not empirically.
7. **How did you verify this, and does each passing check test the user-visible
   claim?** Reasoning + direct source reading only (README, inspector JS,
   `manifest.json`, all 27 card frontmatters, and confirming via `ls`/repo search
   that no `src/` code and no page-1 deck consume the cards). I did **not** execute
   the inspector or empirically feed it a list-valued `type` to confirm the
   silent-mis-render claim — that is a reasoned read of `parseFront` +
   `KIND[c.kind]`, not an observed failure. `build: n/a` because `npm run build`
   provably does not touch these static assets. No screenshot: the findings are
   structural, not visual. Setting `visual-unverified` would be misleading (there is
   no visual artifact under test); the honest gap is the un-run parser experiment.
8. **Follow-up value:** MEDIUM — the analysis is sound and the recommendation is
   safe and additive, but it is single-lens (missing the pedagogy verdict on whether
   object-type actually aids comprehension) and one concrete mechanism claim (the
   list-valued-`type` silent mis-render) is reasoned rather than executed. A
   follow-up that runs the other two hats and prototypes the checker + additive field
   would materially strengthen it.
