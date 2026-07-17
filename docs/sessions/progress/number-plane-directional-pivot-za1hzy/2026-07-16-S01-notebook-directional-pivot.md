---
kind: progress
session: 2026-07-16-S01
date: 2026-07-16
title: Number Planes notebook — directional pivot
branch: claude/number-plane-directional-pivot-za1hzy
slug: number-plane-directional-pivot-za1hzy
status: in-progress
build: passed
followup: null
pr: null
app: number-plane, docs
signals: needs-dan, phone-needed
next: Dan reads journal.html (the entry-format probe) and rewrites the six drafted entries in his own voice.
---

# Number Planes notebook — directional pivot

## Session purpose

Continue work on the Number Planes notebooks (`public/number-planes/`), with a
**directional pivot** — a change of direction Dan will specify at session start.

## Previous session

[2026-07-13-S03 — notebook complete](../../handoff/number-plane-notebook-kxvxzj/2026-07-13-S03-notebook-complete.md):
the whole notebook shipped — cover + chapters I·II·III + cards + walk-in, with
the void/touch/phone fixes and the iOS flip-card definite-height fix. PR #246
has since **merged** (`531bbe5` is on this branch's base), so this session
starts from main with the notebook landed. First tracked session on this branch.

## Working notes

### 🟣 decision · 02:00 — Ground the entries in the RECORDED evolution, not an invented arc
**Why:** Dan pointed at the session notes as the true source: "There are already
some examples in place of how this sort of process evolved… conversations that
are recorded in our session notes that provide a very good idea of how we get
to one animation from the other. So the question started with: 'When I think
of the number plane I think of complex numbers.' Are there other options?"

That seed question is the real entry 01. The probe's six entries used an
invented question-arc (grounded in card math but not in the project's actual
history); the journal's time dimension should instead follow the recorded
chain — Argand app birth (06-20) → five-hat review + the Number Planes page
plan (06-24) → the rename (06-25) → first guide page + trail (06-29) → the
living-notebook design conversations (07-03) → reviews + leak plan (07-08) →
notebook complete (07-13). Dispatched a mining workflow (7 readers over the
~30 session files + a git historian, then a chronology-threading synthesis)
to extract the verbatim Dan quotes, driving questions, findings, and artifact
dates with citations. Entries get rewritten from that chain.

### 🟡 milestone · 01:30 — The journal probe is built and verified headless
**Why:** the scaffold + drafted entries Dan asked for exist and pass every check.

`public/number-planes/journal.html` — six entries, ~29KB, chapter skeleton
(guide-theme tokens, all 8 skins). Verified per R1 with a scratchpad shooter
(`jshoot.mjs`, patterns from S03): desktop 1280 + phone 390 screenshots
eyeballed; p driven via `window.__journal.setP` to +1 and re-shot (knob,
level-curve, roots, header all track); Daylight light-skin shot; invariants —
zero horizontal overflow, and the flip-card faces' boxes ≡ the vat's box at
exactly 150px (the iOS definite-height rule; the sole `.vat` here carries a
fixed height at every width). `npm run build` passes. Gotcha rediscovered: the
guide skin key `animath:v1:chrome:skin` stores the **raw id** (not JSON), and
`shoot.mjs` force-rewrites its arg into a `#/` hash route, so static pages
need their own shooter. Fonts fail sandbox-only (known).

Draft prose = placeholder register for Dan to rewrite; the math is from the
cards (L1, AX, L2, PL, DV, QD) and is meant to survive the rewrite.

### 🟢 code · 01:00 — journal.html: the entry format, built as a probe
**Why:** Dan chose scaffold + drafted entries; this is the reversible probe
(R2) enacting the fusion register.

The format decisions, each mapping a piece of Dan's description:

- **Entries in time**: one inked timeline down the left, a dot per entry lit
  by scroll (IntersectionObserver); entry labels are non-literal time
  (`ENTRY 02 · NEXT DAY`, `· A GOOD DAY`) — order, not dates.
- **Sacred-text fusion**: each entry is a two-column grid — central working
  prose (Newsreader, ≤60ch) + a hand-font gloss margin. **Backward refs live
  in the prose; forward refs are `later —` margin notes** (`.mgn.later`,
  voice-colored, left-ruled): the notebook conceit that the writer came back
  and annotated, which is how a real notebook points forward. On phone the
  margin folds under the prose as left-bordered slips.
- **Plates used sparingly**: figures are "pasted in" (`.fig`, ±0.35° rotate,
  mono `FIG. n` labels): the ×(−1) mirror (drag a), a taped-in worked
  computation (strangers, zero divisors), **the j² knob** (chapter grammar,
  same geometry), the unit-curve x²−p·y²=1, and t²=p roots — for p<0 the two
  roots float **off the line** as hollow dots on the j-axis ("one floor up"),
  which stages FTA honestly. One sealed orb (FTA) as the only flip card.
- **One p per page** honored: entries 4–6 all read the single S.p; the knob
  is its writer (chips in entry 5 too — all projections of p).
- Cover: journal added as the first side-door leaf (doors grid → 2×2).

Content arc (all grounded in the cards): the wrong question (L1) → the
demands force the line (L3/L4/AX) → the strangers experiment (L2, logged as
a disappointment) → one knob (PL) → three worlds, strangers resolved (DV) →
the quadratic + sealed FTA (QD). The "disappointment → resolution" thread
across entries 3→5 is the format's proof: it shows why time-order teaches
something the spatial grids can't.

### 🟣 decision · 00:40 — The three forks settled (voice · structure · deliverable)
**Why:** asked Dan before building; his answers pin the register.

1. **Voice** — "why would I address myself in a notebook?": the natural
   notebook register. Working prose that thinks on the page, dropped-subject
   ("Wrote the demands down…"), never addressing a reader as "you", no
   didactic "we"; reflection appears only as it would. This intentionally
   diverges from the cards' "we/you" house voice — the cards keep theirs;
   the two registers are distinguishable on purpose.
2. **Structure** — "a fusion of plates and the journal format… both sparingly
   and in the correct register — see some of the examples like sacred text":
   not journal-vs-chapters but one page where sparse central prose and
   pasted-in plates share the space, margins carrying the glosses.
3. **Deliverable** — scaffold + drafted entries (placeholder prose for Dan to
   rewrite; something concrete to react to).

### 🟣 decision · 00:20 — The pivot defined: the notebook needs voice + entries in time
**Why:** Dan named the direction he'd been avoiding and now wants.

Dan: he was avoiding a style that "felt like a webpage or had too much
narration," but the notebook **does need voice** — written explanation that ties
together "how the different parts arise from questions on top of questions and
we find things out and play with them along the way." Format: **a notebook with
entries in time** — not literal in the time dimension or presentation, but
digestible chunks of small answers that tie into the bigger picture, navigable
forward and back, with "things from before and things that come after" visible.

Orientation finding: the card spec (`cards-reference/README.md`) already says
"order is a *view*; the graph lives in each card's `links`" — but every view
built so far is **spatial** (plate grids/chapters, the cover, the walk-in). The
pivot asks for the missing **temporal** view: an entry spine that linearizes
the card graph (`opens` / `leans-on` edges are latent question-arrows) into a
narrated sequence. The card voice spec says "we/you — never autobiographical
I"; an entries-in-time journal may bend that — flagged as an open question for
Dan, along with whether the journal becomes the primary reading path or a
parallel one beside the chapters.

### 🟡 milestone · 00:00 — Session started, oriented, awaiting the pivot
**Why:** /start-session on a fresh branch; the focus names a "directional pivot"
whose content isn't yet specified — orientation first, no implementation.

Read the S03 handoff (notebook complete, PR #246 now merged) and the backlog.
Open notebook items inherited from S03 / TODO.md, in rough priority order:

- **iPhone confirmation** of the flip-card fix (1ae28f9) — `phone-needed`,
  though the PR merged.
- **Harvest notebook.html** keeper animations into the chapters (told-FOIL →
  C2's Hmm seam; settle-the-dots; cover fold; Hmm? pop-out), then retire it.
- **Leak/re-grid annex** (S02 plan, reviewed adopt-with-corrections) — blocked
  on Dan's prototype or an approved rebuild.
- **Leaf-ification** of DV and L2 (QD is the model).
- **Shared notebook.css** extraction (4 pages × ~30KB duplicated skeleton; a
  fifth page triggers it).
- **The 274KB working-copy port** — unstarted, a project of its own.

Standing constraints carried forward: one p per page; flip cards need
**definite heights** (iOS Safari resolves `height:100%` against
min-height-only boxes as zero); glosses rest visible by design (don't
"restore" hover-only); copy chapter-3's skeleton for any new chapter page.

Awaiting Dan's direction on what the pivot is.
