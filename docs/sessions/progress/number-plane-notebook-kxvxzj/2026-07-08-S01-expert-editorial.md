---
kind: three-hats
session: 2026-07-08-S01
date: 2026-07-08
title: "Editorial & Product-Coherence Strategist"
branch: claude/number-plane-notebook-kxvxzj
slug: number-plane-notebook-kxvxzj
status: complete
build: n/a
---

# Editorial & Product-Coherence Strategist — Number Planes notebook

## Under review

I reviewed **`public/number-planes/chapter-2.html`** (the ~45 KB vanilla-JS plate-grid
port of the Claude-Design "Chapter II — the plane" mockup) as the primary subject, and read
it against its three neighbors to judge whether this becomes **one coherent "living
notebook"** or **a pile of prototypes**: the *other* interactive artifact
`public/number-planes/notebook.html` (the ~90 KB staged "The Choice" passage), the design
spec it ports from (`docs/design/notebook-handoff/README.md` + the `.dc.html` reference), and
the plan layer this branch produced (the **garden plan** and **passage script** in this
folder). My lens is editorial and product strategy — the seam between the two artifacts, the
voice, the garden plan's fate, and the single highest-value next move — not code, a11y, or
math (covered by the maintainer/accessibility/pedagogy hats).

The port itself is competent and honest about what it is: a header comment states its
intent ("Faithful port of the Claude Design reference … onto the shared guide theme layer:
works with ALL 8 app skins. One p drives every plate"), and the **core contract is
genuinely preserved** — I want to lead with that before the criticism.

---

## What is genuinely right

- **The one-`p` contract holds.** `chapter-2.html:390` declares a single `S={p:-1,…}` and a
  single `render()` (`:418`) that re-derives *every* plate — slider knob, `−1/0/+1` chips,
  the ADD/MUL flip, the z·w plot, PL level curves, renormalize, tilt, the CR knob, DV
  borders, QD dots — from that one value. This is the exact thing the handoff said to
  preserve ("everything else is presentation"), and it is preserved faithfully. Move any
  control, the whole page moves together.
- **Default `p = −1`** (complex) on load, per spec.
- **Tokens are derived from the chrome skins, not hard-coded** (`:21–32`): `--desk`/`--paper`/
  `--ink`/`--border` are `color-mix`es of `var(--bg)`/`var(--card)`/`var(--fg)`/`var(--rule)`.
  This is the right instinct and is *why* the page survives all 8 skins — a real improvement
  over the reference, which hard-coded five palettes inline.
- **The walk/room duality is a genuinely good structure** — *if closed.* A scripted passage
  (walk in) opening into a live control-surface (the room) is exactly the "several designed
  paths + beds the visitor never walks into" synthesis the garden plan reached. The seam is
  the right idea. The problem is entirely in the wiring and the finish, not the concept.

---

## The central question: which one is "the notebook," and do they cohere?

They embody two different philosophies, and right now they read as **two prototypes that
happen to share a folder**, not one work. The evidence:

| Axis | `notebook.html` (the walk) | `chapter-2.html` (the room) | Coherent? |
|---|---|---|---|
| Self-identifies as | "the notebook (passage: the choice)" — folio **"II · The Choice"** (`:738`) | "**Chapter II** — the plane" (`:107`) | Both claim "II" |
| Scroll model | viewport-fit, **no scroll** (`:29` `overflow:hidden`) | normal **long scrolling** grid (`:103` padding `…80px`) | Disagree |
| Typography | inherits guide **Georgia serif** (`guide-theme.css:37`); no display fonts | imports **Space Grotesk / Newsreader / Caveat / Space Mono** (`:11`, `:37`) | Two identities |
| Plane color language | none — world cards all `var(--stroke)` (`:528/534/540`); parts use `--re/--im` off the skin accents (`:18–19`) | fixed **blue/green/orange** trichotomy `--d1/--ok/--d5` (`:34–36`) | Disagree |
| Voice of the handwriting | **revision marks** — the Margin note (`:708–717`) | **UI hints** — "hover to read · tap to lock" (`:123`), "tap the word" (`:152`) | Diverge |
| Forward link | dead-ends: "next passage, not yet laid" (`:666`) → footer to the React app (`:746`) | back-link only: "← the walk in" → `notebook.html` (`:379`) | One-way |

> [!IMPORTANT]
> **The intended flow — walk in, then arrive in the room — is not navigable.** The metaphor
> is right, but the wiring runs backwards. `chapter-2.html:379` links *back* to the walk
> ("← the walk in (the choice)"). `notebook.html` contains **no link to `chapter-2.html` at
> all** (grep: none); its terminal beat (moment 14) surfaces "how do these worlds behave? —
> **next passage, not yet laid**" (`:666`) and its only outward footer link is to the React
> app "fallback ↗" (`:746`). So a reader who starts at the walk never learns the room exists;
> a reader who starts at the room is offered the entrance only *after* they have already
> arrived. The door is real but it only opens one way, into the corridor you already left.

My verdict on "which is the notebook": **neither should be, alone.** The file literally named
`notebook.html` claims the word, but the *design system* names the plate grid ("Chapter II")
the reference implementation of the whole notebook. That naming inversion is the tell that the
seam was never resolved. The honest answer is that these are **two renderings of the same
chapter** — Chapter II as a *walk* and Chapter II as a *room* — and the product decision is to
say so out loud and wire them as one round trip, or to cut one.

---

## Fidelity vs. the repo's own voice — a second visual identity is bolted on

This is the sharpest coherence problem and it is **traceable to a genuine contradiction in the
handoff.** `README.md` §Fidelity says typography is "final and intentional … recreate them
precisely," while §Design tokens says "Typography (Google Fonts in the prototype; **substitute
the app's families**)." The two artifacts resolved that same ambiguity in **opposite
directions**:

- `notebook.html` chose the repo's voice: it drops the mockup's display faces and reads in the
  guide's Georgia serif, tinting only with the skin's own `--accent`/`--accent2`.
- `chapter-2.html` chose fidelity: it re-imports Space Grotesk, Newsreader, Caveat, and Space
  Mono (`:11`) and re-declares them as `--disp`/`--serif`/`--hand`/`--mono` (`:37–38`), plus
  per-skin font swaps for blueprint/phosphor (`:44–47`).

The result is that crossing the (one-way) seam takes the reader from a plain serif document
into a typographically loud "plates / § II / MODE: ADDING / handwritten Caveat" surface. Each
page is internally consistent; **together they read as two products.** The brief asks directly:
"is that a second, competing visual identity bolted on?" — and on the evidence, **yes.**

> [!WARNING]
> The mismatch is deeper than fonts: the two artifacts **teach different color codes for the
> same three planes.** `chapter-2.html` makes blue=complex / green=dual / orange=split a
> load-bearing, cross-skin semantic (the handoff locks it). `notebook.html` never uses it —
> its three world cards (SPIN/SHEAR/BOOST) are drawn in one neutral `var(--stroke)`. A reader
> who learns "the three planes" in the walk meets an *unannounced new color language* the
> instant they reach the room. If the two are to be one notebook, the plane-color decision
> must be made **once** and applied to both.

On the personal-notebook goal specifically ("revision marks, not narration"): the handwriting
font in `chapter-2.html` is used for **instructional chrome** ("hover to read · tap to lock,"
"tap the word — it flips the whole plot"), not for the reflective voice Dan asked for. The one
place that voice actually lives is `notebook.html`'s Margin note — "Earlier thought … /
Correction … / — from the record, 29 June" (`:711–716`). So the plate grid *looks* personal
(cursive annotations) while *saying* nothing personal. The cards' own voice spec agrees with
Dan: "Plain, example-first, terse … curiosity rides the math moves, not personal story"
(`cards/README.md:57–60`). `chapter-2.html`'s copy is mostly on-voice; its **use of the
handwritten font as UI captions** is the part that misreads the brief.

---

## The garden plan — realized, ignored, or contradicted?

The garden plan (`2026-07-03…plan-garden-paths.md`) is the branch's own north star: **four
beds, three paths (A forcing · B residents · C overlook), junctions visible as places,** and a
hard principle set — *"The visitor walks paths; plantings are read from the path … No 'click
through to read more' page jumps"* (#1) and *"The app is not a separate toolshed the notebook
links out to; the relevant view appears at the stop that needs it"* (#5). The passage script
then operationalized principle #5 into a **declutter accounting**: Operator/Compare/Levels are
*born at the beat that earns them,* inside the walk.

Against that plan, the two artifacts split the garden metaphor cleanly down the middle:

- **`notebook.html` realizes the *path* half.** It is a single thread (STOP A→B→C→D), plantings
  read in place, instruments born where earned (the zDesk Operator at moment 9, Levels at
  moment 14). It honors principles #1, #4, #5.
- **`chapter-2.html` realizes the *bed* half.** It is Bed 2 — the Plaza — plus adjacent
  plantings (CR from the terrace, QD/DV/L2/FTA from the forcing bed), laid out as a static
  room where you read a plate by hovering/flipping it. It honors "plantings in their beds"
  and "junctions are places" (every plate shares one `p`).

> [!IMPORTANT]
> But `chapter-2.html` **contradicts the garden plan's principle #5 and the passage script's
> whole declutter thesis.** The plan deliberately *dissolved* the "separate toolshed" — the
> app you link out to — into instruments that appear at the stop that needs them.
> `chapter-2.html` **re-introduces the separate toolshed**: it is a standalone control-surface
> page the walk links out to. Worse, `notebook.html` already contains a live plate room (its
> zDesk, `:608–720`: Asks rail | Stage with Operator/Compare/Orbit/Levels | operator matrix +
> Margin) that is *earned* at the end of the walk. So the branch now has **two plate rooms of
> overlapping function, in two visual identities, sharing no code** — and a third
> implementation of the very same "one p, three planes, live" idea already ships as the React
> `#/number-plane` app (which the cards' `figures` point to as canonical:
> `cards/C2.md:11–18`). Three doors to one room, and no map on the wall.

Neither artifact realizes the plan's actual recommendation, which was to **pick one path (C,
the overlook, or B, the residents') and lay it as a thread.** `notebook.html` lays a *fourth*
thing — "The Choice," the passage-script's STOP A–D, which is essentially Chapter II's
*content* delivered as a walk. `chapter-2.html` lays the *room*. The three-path structure (A/B/C)
that the plan spent 280 lines designing is **present in neither.** That is not a criticism of
either build's quality — both are good — it is the observation that the branch's design
artifacts (garden plan, passage script) and its build artifacts (walk, room) have drifted onto
different maps, and the "web vs. single thread" tension the garden plan claimed to *synthesize*
is instead **re-instantiated**: `notebook.html` is the thread, `chapter-2.html` is the web-lite,
and the synthesis (paths through beds, junctions visible) is realized by *wiring them
together* — which is exactly what has not happened.

---

## Chapters vs. stops/moments — the taxonomy collides

There are now **three incompatible "chapter" taxonomies** in play, and the word "Chapter II"
is overloaded across all three:

| Source | Unit of navigation | "II" means |
|---|---|---|
| Design handoff (`README.md`) | **Chapters I/II/III** = curated reading paths | Chapter II = the **plate grid** (the reference) |
| Passage script | **Stops A/B/C/D** inside a passage "The Choice" | the passage *is* Chapter II's content, walked |
| Garden plan | **Beds 1–4 + Paths A/B/C** | Bed 2 = the Plaza; no "II" |

`chapter-2.html` implements the handoff taxonomy ("Chapter II," footer "chapter I · chapter III
— not yet laid," `:380`). `notebook.html` implements the passage-script taxonomy (folio "II ·
The Choice," stopdots "the question / the sign / the motions / the mirror," `:740–743`). **Both
stamp "II" on the reader**, meaning different things, with no on-page statement that they are
two views of the same chapter. A reader cannot tell whether they are looking at "Chapter II,
mode 1 of 2" or "two different Chapter IIs." The reconciliation is a one-line editorial
decision — *a chapter has a walk and a room; "II · The Choice" is the walk of Chapter II* — but
it has to be **made and shown**, on both pages, or the numbering keeps colliding.

---

## Scope & the single highest-value next move

**On scaling to Chapters I and III:** the plate-grid pattern is the scalable unit, and the
bespoke walk is not. `chapter-2.html` is ~45 KB and its structure (grid of plates, one shared
`p`, derived render) is a template you could re-fill for "the line" and "three worlds."
`notebook.html` is ~90 KB of single-purpose choreography (a 15-moment engine, ghost-fly
morphs, per-beat twinkle wiring) that would be expensive and brittle to replicate per chapter.
So the structural recommendation is:

> [!IMPORTANT]
> **The plate grid is the chapter template; the walk is a marquee garnish for Chapter II
> only** (or, later, a *reusable lighter* "passage" layer that every chapter can opt into —
> but not the default unit). Do **not** clone the moment engine for I and III.

**The single highest-value next move** — the one that converts "a pile of prototypes" into
"one notebook" for the least work — is to **close the seam into a true round trip and collapse
the duplicated room**, in this order:

1. **Decide the model in one sentence and print it on both pages.** Recommended: *"Chapter II
   has a walk (The Choice) and a room (the plates). Walk in; then stay and play."* Put a
   forward door at the end of `notebook.html` ("enter the room →" replacing the "not yet laid"
   dead-end at `:666`) and keep `chapter-2.html`'s back-door.
2. **Pick ONE plate room.** `notebook.html`'s terminal zDesk and `chapter-2.html`'s grid do the
   same job. Trim the walk's zDesk to only the *earned beats* (Operator at C1, Levels at D1)
   and let `chapter-2.html` be **the** room the walk delivers you to. That removes a whole
   duplicated control surface and makes the footer seam honest.
3. **Unify the visual identity across the seam.** Make one typography decision and one
   plane-color decision and apply both to walk and room. If the mockup's display type is the
   house style, lift it into `notebook.html` too; if the guide serif is, strip it from
   `chapter-2.html`. Either is fine — *split is the only wrong answer.*
4. **Reconcile with the canonical React app.** Decide whether `chapter-2.html` *is* the room or
   whether it is a static preview that hands off to `#/number-plane`. Today the cards point to
   the React app as canonical; having a third live room undercuts that. (This overlaps the
   maintainer/consultant hats' "one shared dial module" recommendation — the editorial reason
   and the engineering reason point at the same fix.)

Steps 1–3 are the coherence-critical ones and are all editorial/wiring, not new math. They can
land in a single short session.

---

## Findings

| id | sev | category | claim | file:line |
|---|---|---|---|---|
| editorial-1 | P1 | coherence | The intended "walk in → room" flow is not navigable: the seam is one-way and the walk dead-ends. | `chapter-2.html:379`, `notebook.html:666,746` |
| editorial-2 | P1 | coherence | Two competing visual identities on the same chapter (guide serif vs. imported display fonts). | `chapter-2.html:11,37`, `guide-theme.css:37` |
| editorial-3 | P2 | coherence | Duplicated plate room: `notebook.html`'s zDesk and `chapter-2.html`'s grid do the same job in two styles, and a third exists in the React app. | `notebook.html:608`, `chapter-2.html:115`, `cards/C2.md:11` |
| editorial-4 | P2 | design-fidelity | The two artifacts teach different color languages for the three planes. | `chapter-2.html:34`, `notebook.html:18,528` |
| editorial-5 | P2 | coherence | "Chapter II" is overloaded across walk, room, and handoff with no on-page reconciliation. | `notebook.html:738`, `chapter-2.html:107,380` |
| editorial-6 | P2 | pedagogy | Personal-notebook / "revision marks" voice is absent from the room; its handwriting is UI chrome. | `chapter-2.html:123,152`; `notebook.html:711` |
| editorial-7 | P2 | scope | `chapter-2.html` reintroduces the "separate toolshed" the garden plan #5 deliberately dissolved. | garden-plan #5; `chapter-2.html` (whole) |
| editorial-8 | P3 | scope | Bespoke walk shouldn't be the template for Chapters I/III; the plate grid should. | `chapter-2.html:380` |
| editorial-9 | P3 | integration | Content-graph gap: `AX` ("why we fix addition") is referenced by C2 copy but reachable from no plate. | `cards/C2.md`, `chapter-2.html:181` |

---

## Verdict

**Complementary in concept, incoherent in execution — but a small, well-scoped fix away from
one work.** The walk-in/room-you-arrive-in model is the right seam; `chapter-2.html` is a
faithful, contract-correct, skin-portable build of the room. What is missing is the *editorial*
work: the door only opens one way (P1), the two halves wear two visual identities and two
plane-color codes (P1/P2), the room is built twice (P2), and "Chapter II" means three things
(P2). None of these are build defects; all are coherence decisions that were deferred. The
highest-value move is not more building — it is to **decide the walk↔room model in one
sentence, print it on both pages, wire the round trip, delete the duplicate room, and unify the
identity.** Do that and this is unmistakably one living notebook. Leave it and it will keep
reading as a gallery of good prototypes. On scaling: the plate grid is the chapter template;
keep the bespoke walk as Chapter II's marquee, not the pattern for I and III.

---

## Self-reflection

1. **What would you do with another session?** Draft the one-sentence walk↔room model and the
   exact copy for the two new links (walk's forward door, room's confirmed back door), and
   sketch which of the two plate rooms survives — so the next builder has an editorial
   decision, not an open question. I would also read Chapter I and III `.dc.html` references to
   check whether the plate-grid template actually fits "the line" (one coordinate) as cleanly
   as it fits "the plane."
2. **What would you change about what you produced?** I leaned on structural/navigational
   evidence (links, fonts, tokens) which is verifiable, but I did not *see* either page
   rendered. My "two visual identities" claim is strong on code but unproven on the eye — a
   screenshot of both at the same skin would either sharpen or soften it.
3. **What were you not asked that you think is important?** Whether the React `#/number-plane`
   app is meant to be the canonical room. If it is, both HTML rooms are previews and the whole
   duplication question resolves differently. The brief framed the tension as two artifacts; it
   is really three (walk, static room, React app) plus Argand.
4. **What did we both overlook?** That `notebook.html` already ends in a plate room. The brief
   framed the passage as "the walk in" and the grid as "the room you arrive in," but the walk
   *also* builds a room at its end — so the duplication is not walk-vs-room, it is
   room-vs-room. That reframing is the load-bearing insight and it is not in the brief.
5. **What did you find difficult?** Staying in the editorial lane while three sibling hats
   (maintainer/consultant/accessibility) already logged the code-duplication and theming
   angles. I tried to cite the *reader-experience* reason for the same fixes rather than
   re-litigate the engineering.
6. **What would have made this task easier?** A rendered screenshot of `chapter-2.html` across
   two or three skins, and confirmation of Dan's intent for the React app's role.
7. **How did you verify this, and does each passing check test the user-visible claim?**
   Reasoning over source only — I read both HTML files in full, the handoff, the reference
   `.dc.html`, the guide theme, the garden/passage plans, and the cards, and confirmed the
   one-way seam with grep (no `chapter-2` reference in `notebook.html`). The navigational and
   typography findings (editorial-1, -2, -4, -5) are concrete code facts and are verifiable.
   The judgment findings (which is "the notebook," garden-plan fidelity, scaling) are argued,
   not tested. I did **not** render either page; the visual-identity claim is code-verified but
   eye-unverified — `signals: visual-unverified` would be appropriate.
8. **Follow-up value:** MEDIUM — the coherence diagnosis is sound and the fix is well-scoped,
   but the recommendation (which room survives, which typography wins) is a call Dan should make,
   and one visual check would confirm the "two identities" headline.
