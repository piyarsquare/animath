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

## Voice

Plain, example-first, terse. Reasoning "we/you" — never autobiographical "I".
Curiosity rides the math moves, not personal story. (McPhee structure · Korzybski
"map ≠ territory / could it be different?" · Bryson history, but braver.)

## Viewing the cards

Open `index.html` (the card inspector) over http — it reads the cards live and
shows type, glance/note/full, typed connections (both directions), figures, and the
raw YAML. After adding/removing a card, regenerate the id list:

    ls *.md | grep -v '^README' | sed 's/\.md$//' | sort | <to manifest.json as a JSON array>
