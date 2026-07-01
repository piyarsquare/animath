---
kind: three-hats
session: 2026-06-29-S01
date: 2026-06-29
title: Three-hats synthesis — card object-type classification plan
branch: claude/number-plane-guide-first-page-zkpnzi
slug: number-plane-guide-first-page-zkpnzi
status: complete
build: n/a
---

# Three-hats synthesis — card object-type classification plan

## Plan under review

<details><summary>Original request</summary>

Reclassify the Number Planes note-cards by OBJECT-TYPE as the primary `type`:
domain · observation · theorem · note · widget · topic (+ candidate additions:
definition, question). Demote line/space to a *domain tag* (or drop). Re-atomize so
each card is ONE object-type (the CX card — a domain ℂ + observations + theorems + a
widget + topic links — explodes into ~5 objects). This changes the card count from 27
(atoms-by-story-role); it will likely grow. Keep the Markdown+YAML format, the
typed-link graph, and layered glance/note/full.

Questions: (1) Is object-type the right primary classification, and is the set
complete/coherent? (2) Does re-atomizing help comprehension+reuse or fragment reading
and multiply maintenance — right granularity? (3) How should type interact with the
typed link graph and layered glance/note/full? (4) Risks + smallest de-risking step.

</details>

Reviews: [maintainer](2026-06-29-S01-expert-maintainer.md) ·
[consultant](2026-06-29-S01-expert-consultant.md) ·
[pedagogy](2026-06-29-S01-expert-pedagogy.md).

## Points of agreement (high confidence)

All three hats independently reached the same shape: **adopt the diagnosis, reject the
mechanism.**

| # | Convergent finding |
|---|--------------------|
| 1 | **The diagnosis is right.** `kind` really does conflate two axes — the README already admits `kind = (subject × role)` is provisional. Object-type is a genuine, currently-invisible axis worth naming. |
| 2 | **Type must NOT be the single *primary* axis.** Type and subject are **orthogonal facets** — `CX` is a *domain* that is *about ℂ*; `WH` is a *claim about all three planes*. Two fields, not one primary class. Keep line/space (renamed), don't drop it. |
| 3 | **Do NOT re-atomize one-object-per-card.** Atomize on **reuse**, not on type. The corpus already shows the right rule: exactly one card (`L5` *stretchable*) earned facethood via `![[id]]`. Exploding `CX` into ~5 manufactures in-degree-1 stubs, fragments a partly-linear narrative, and hairballs the force-layout (tuned for ~27 nodes). |
| 4 | **`glance/note/full` already separates notice from proof.** That depth axis is orthogonal to object-type; atomization would hollow out `## full`, not make it redundant. Keep it. |
| 5 | **Smallest de-risking step = additive pilot.** Add a new frontmatter field *alongside* existing `kind` on ONE 5-card cluster (`CX/DU/SP/WH/FD`), show a badge in the inspector, eyeball the graph. Reversible (old parser ignores unknown keys), zero card-count/edge change. Let the data settle the atomization question. |
| 6 | **Vocabulary fixes are welcome and cheap:** `orb → topic`, `facet → definition`-ish are clean renames. |

## Points of tension (decide these)

| Tension | Maintainer | Consultant | Pedagogy | Resolution |
|---|---|---|---|---|
| **observation vs theorem** — one type or two? | endorses the rigor distinction as *additive* | collapse to one `claim` (they duplicate note/full & will drift) | **keep** the distinction — it's the aha ("noticed X → why X") — but express via layering / light `▸ noticed / ▸ why` labels, not separate cards | Capture it on the **depth axis** (glance/note/full + optional in-body labels), NOT as separate node types. Reconciles all three: the distinction survives, nothing splits. |
| **field cardinality** — scalar vs list | single additive scalar `type:` | two facets `type:` + `subject:` | `object:` list-valued where a card is fused | Two scalar-ish facets (`type` + `subject`); allow `type` to be a short list only where a card is genuinely fused, kept in-body otherwise. |
| **label fidelity** | (n/a) | (n/a) | **`domain` collides with domain/range** → use *space/structure*; `theorem` over-claims (definitions/design-principles aren't theorems); `question` is a *glance*, not a card; `widget` is the `figures:` field, not a node type | Adopt pedagogy's label fixes wholesale — they're correctness, not taste. |

## Blind spots (none of the three's core lens, but two raised it)

> [!WARNING]
> **The real near-term risk is integrity, not ontology.** Both maintainer and
> consultant flagged, independently, that `manifest.json` is hand-regenerated with **no
> drift check**, and nothing validates that every `[[id]]` / `links:` target resolves —
> and a 404-as-text produces a *phantom card*. This is the most likely actual breakage
> as the corpus grows, and it is **orthogonal to the taxonomy decision**. Ship a small
> link-and-manifest integrity checker *first*, regardless of what we decide on types.

- The hand-rolled ~35-line restricted-YAML parser in the inspector: a **scalar** new
  field is safe; **nested/list** values (the natural pressure from atomization)
  mis-render *silently*. Make unknown/mal-typed values render **loudly**.
- None modeled how `type` should eventually drive the *living-notebook UI* (the design
  agent's orbs→note→portal) — e.g. a `topic` renders as a portal, a `widget` embeds, a
  `theorem` gets a proof affordance. Deferred, but it's the eventual payoff of typing.

## Recommended action

A four-step, fully-reversible path that banks the insight and refuses the churn:

1. **Integrity checker first (taxonomy-independent).** A tiny Node script (or inspector
   self-check) that verifies `manifest.json` == the `.md` set and that every `[[id]]`
   and every `links:` target resolves; unknown fields render loudly. Highest value / least
   regret; both maintainer & consultant rate it above the ontology work.
2. **Add type as an additive facet, don't replace.** Keep the 27 files and `kind`; add
   `type:` (+ keep a `subject:`/domain tag) as new frontmatter. Vocabulary: `orb→topic`;
   use **space/structure** not "domain"; `question` → a glance; **`widget` stays the
   `figures:` field**, not a type. Prefer scalar; list only where truly fused.
3. **Keep observation↔theorem as depth, not as split cards.** The distinction is the
   pedagogical gold — express it with `glance`/`note`/`full` + optional `▸ noticed / ▸ why`
   labels. Split nothing.
4. **Pilot on one 5-card cluster** (`CX/DU/SP/WH/FD`) + an inspector badge; read the
   two-facet census; **atomize only when the page-1 deck (a concrete second consumer)
   demonstrably needs a piece.** Reuse pulls atoms out; ontology must not push them.

On "is 27 the right number?": **premature to change it.** The count should fall out of
*reuse demand from a real consumer*, not from ontological tidiness. 27 stays until the
deck asks for a piece.

> [!IMPORTANT]
> Net: the observation/theorem insight that motivated the plan is real and worth
> banking — but as a **second facet + a depth distinction**, on the **existing** cards,
> behind an **integrity checker**. Not as a primary axis, not as a 27→N re-atomization.

## Self-reflection

1. **What would you do with another session?** Implement step 1 (the integrity checker)
   and the step-2/3 pilot on `CX/DU/SP/WH/FD`, then produce the two-facet census the
   pedagogy hat predicted but did not run — the census is the datum that actually settles
   granularity.
2. **What would you change about what you produced?** The synthesis leans on the three
   reports' agreement; it did not itself re-derive the full-deck (type × subject) census,
   which would convert "likely grows" into a number.
3. **What were you not asked that you think is important?** Whether `type` should be
   author-facing at all yet, given no consumer reads it — the checker + a badge may be all
   that's warranted until the deck exists.
4. **What did we both overlook?** The integrity/manifest fragility — surfaced by two hats
   as a bigger near-term risk than the taxonomy itself.
5. **What did you find difficult?** Separating the genuinely-good idea (observation vs
   theorem) from the mechanism that would harm reading flow; all three hats had to do the
   same disentangling.
6. **What would have made this task easier?** A rendered full-deck census (type × subject
   per card) up front.
7. **How did you verify this, and does each passing check test the user-visible claim?**
   Reasoning + reading the three expert reports and the actual cards; no code ran. The
   parser/manifest failure modes are reasoned from reading `index.html`, not reproduced —
   flagged as the thing to verify by building the checker. `build: n/a` (docs only).
8. **Follow-up value:** MEDIUM — the recommendation is sound and reversible, but the
   deciding datum (the two-facet census) is predicted, not produced; a follow-up that runs
   it and ships the checker would convert the plan into action.
