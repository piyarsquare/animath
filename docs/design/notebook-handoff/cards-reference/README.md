# Number Planes — note-cards

Atomic, linked notes for the "living notebook." Order is a *view*; the graph lives
in each card's `links`. One file per card, so copy-by-parts = copy files and
rearranging is reordering a view, not rewriting.

## Format — Markdown + YAML frontmatter

**Frontmatter** (the graph + presentation):

- `id`, `title`
- `kind`: `line` · `space` · `knob` · `tangent` · `orb` · `facet`
- `glance`: one line — the orb / collapsed view
- `links`: edge-type → `[ids]`. Edge types: `same-as` · `contrasts` · `opens`
  (orb to deeper/future) · `leans-on` (soft) · `used-for`
- `figures` (optional): interactive figures by widget id + params. A figure may
  show one operation across several planes at once, e.g. `show: [-1, 0, 1]`.

**Body — three depths** (the presentation layer picks one):

- the **glance** lives in frontmatter
- `## note` — the default card, terse house voice
- `## full` — textbook depth (statements, proofs)

Inline cross-refs as `[[id]]`. Small shared fragments (e.g. *stretchable*) are
`kind: facet` and **transcluded** with `![[id]]` instead of getting their own orb —
so they can live inside several cards without a page of their own.

## Kinds (classes of card)

`kind` names two things at once — the *subject* and the *role*.

**Subject** — which part of the story:

- **line** — a card on the number line: one coordinate, where the operations and
  demands are named and forced (the "before the plane" beats).
- **space** — a number system that *is* a plane: complex, dual, split — the objects
  we compare, each with its own multiply. (Main-thread plane-zone cards sit here
  too, including claims *about* the spaces like `WH`, `FD`.)

**Role** — what the card does:

- **knob** — a control/mechanism you turn and watch: a dial or move that generates or
  relates the spaces (`j²=p`, the circle, `t²=p`).
- **facet** — a small reusable fragment (a definition, a property) too small to stand
  alone; lives *inside* other cards via `![[id]]` transclusion (e.g. *stretchable*).
- **tangent** — an in-book side-trail we actually write: a detour off the main thread
  you take and return from (tropical, relativity).
- **orb** — a portal to something *not yet in the book*: a pointer to future or
  adjacent material (autodiff, analysis, higher, FTA, matrices, …). A stub now; may
  grow into a full card later.

A card is really **(subject, role)**; today `kind` merges them. Split into two
fields if it ever earns it.

## Voice

Plain, example-first, terse. Reasoning "we/you" — never autobiographical "I".
Curiosity rides the math moves, not personal story. (McPhee structure · Korzybski
"map ≠ territory / could it be different?" · Bryson history, but braver.)

## Viewing the cards

Open `index.html` (the card inspector) over http — it reads the cards live and
shows type, glance/note/full, typed connections (both directions), figures, and the
raw YAML. After adding/removing a card, regenerate the id list:

    ls *.md | grep -v '^README' | sed 's/\.md$//' | sort | <to manifest.json as a JSON array>
