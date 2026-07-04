---
kind: plan
session: 2026-07-03-S01
date: 2026-07-04
title: Passage script — "The Choice" staged (beats, layouts, morphs, twinkles)
branch: claude/number-plane-notebook-kxvxzj
slug: number-plane-notebook-kxvxzj
status: proposed
build: passed
followup: null
pr: https://github.com/piyarsquare/animath/pull/246
app: number-plane, docs
signals: needs-dan
next: Dan marks up the script (text + math ordering); then build the staging engine to it.
---

# Passage script — "The Choice," staged

> [!NOTE]
> **The working method, per Dan (2026-07-04):** design with *particular paths*
> in mind — script the passages, plan the unfolding from the script, build it,
> test how it performs — and only then, freed of the thread, see whether the
> apparatus invites alternative views. The garden arranges itself around walks
> that are already true. This document is the first passage's script.
>
> Direction folded in from the same exchange: (1) advance/interaction points
> announced by a **twinkle** (animated light orb) as well as text links;
> (2) **named layouts** with natural **morphs** between them (elements that
> persist travel; they never teleport); (3) beat 1 must **show the math** —
> equations unfold, nothing is announced; the **renormalization** step and the
> **× → level sets bridge** are required beats, not assumptions; (4) the stop
> ends on the **shared-ground triad** (same +, same reals, same ×1) as the
> setup for the three ×w motions. Multiple stops per page are expected.

## The layout inventory (and the morph rule)

Six named layouts — PowerPoint-like in that a beat *is* a layout, unlike it in
that transitions are **morphs**: any element present in both beats travels
continuously (FLIP), new elements rise, retired ones fold away. Persistent
elements are keyed: *the equation*, *the dial*, *the three world cards*, *w*.

| Layout | Shape | Used by |
|---|---|---|
| CENTER | one element, centered, everything else void | A0 |
| COLUMN | a single unfolding column of text+equations | A1, D0 |
| SPLIT | equation column beside one mini-widget | B0 |
| DESK-LITE | dial strip + three world cards only | B1 |
| TRIAD | three parallel mini-panes + one line of text | C0 |
| DESK | the full compartment grid (current v2 desk) | C1, D1 |

**The two signature morphs** (worth the effort, they carry the meaning):
- **The equation travels.** `j² = p` is *born* large at the end of A1, then
  shrinks and docks as the standing header pill for the rest of the page — the
  reader watches the conclusion become the premise.
- **The p-line becomes the dial.** B0's number line of p (the renormalization
  widget) slides down into the dial strip and *grows a thumb* — the object you
  just cleaned up becomes the instrument you steer with. Its sticky stops at
  −1, 0, +1 are now *explained* (they are the three residues of the cleanup),
  not merely felt.

**Twinkle grammar:** exactly **one** live twinkle at a time — a small pulsing
orb marking the current advance point (on a text link, a slider, a pane).
Interactive handles get a brief first-use shimmer when they are born.
Advancing = doing the thing the twinkle sits on. Reduced-motion: the twinkle
becomes a static ✦.

**Memory:** first visit walks the beats; the notebook remembers (localStorage)
and reopens assembled at the last beat with discovered ✦ marks intact. The
folio carries beat dots grouped by stop (also a scrubber — you can walk back).

---

## STOP A — the question

### Beat A0 · CENTER
Nearly empty desk. Centered:

> **Does the number plane have to be complex?**
>
> ✦ *could it be different —*

**DO:** tap the twinkle line. **MORPH:** the question shrinks into the running
head (it remains the page's standing question); the column rises.

### Beat A1 · COLUMN — the unfolding (show, don't announce)
Each step appears when the previous is tapped (twinkle rides the next line).

1. "A plane number has two coordinates:" — `z = x + y·j` — "the `j` marks the
   second direction; `x` and `y` are plain reals."
2. "Add two, and nothing needs deciding:"
   `(x + y·j) + (u + v·j) = (x+u) + (y+v)·j`
   — "addition never asks a question."
3. "Now multiply — using nothing but distribute-and-collect:"
   `(x + y·j)(u + v·j) = xu + xv·j + yu·j + yv·j²`
   *(the four terms appear along animated distribution arcs)*
   `= xu + (xv + yu)·j + yv·`**`j²`**
4. "Every term is settled arithmetic — except one. The whole multiplication
   table hangs on a single symbol." *(j² glows)*
5. "And the entire choice is one real number:"
   **`j² = p`** *(born large)*
   ▸ *whisper (expandable): why may j² be taken real? If j² came out as
   c + d·j, slide the unit: j → j − d/2 squares to a plain real. Completing
   the square, one floor up.*

Close: "One number. That is the whole freedom of the plane."
**DO:** tap the equation. **MORPH:** it travels to the header; the p-line rises.

---

## STOP B — only the sign survives (the renormalization)

### Beat B0 · SPLIT — change the ruler
Left, text; right, the **p-line widget** (new, small): a number line of p with
sample dots, and a **ruler slider** s.

> "p can be any real number. Infinitely many planes, then? Try measuring j
> with a different ruler: **ĵ = j / s**. Then **ĵ² = p / s²**."

Dragging s: every negative dot flows toward **−1**, every positive toward
**+1**; **0 never moves**. A caption pins the reason: "s² > 0 — a square
cannot change sign; no p can cross zero."

> "Everything negative is one plane in disguise: **spin**. Everything
> positive: **boost**. And zero is just zero — nothing nearby, no
> neighborhood, alone: **dual**."

*(names land on the line at −1 · 0 · +1)*

**DO:** drag the ruler until the dots settle (twinkle on the slider).
**MORPH — the signature one:** the p-line slides down, grows a thumb, and
**becomes the dial**, sticky at −1, 0, +1.

### Beat B1 · DESK-LITE — three planes, one dial
The three world cards rise beneath the dial (portraits: turn · slide ·
squeeze glyphs, static). Dragging the dial highlights by sign; the middle
sticks — and now the reader knows *why*.

> "Three planes. One dial. Only the sign matters."

**DO:** visit all three stops (each visit lights its card); a quiet twinkle
"*and yet — they agree on almost everything* —" advances.

---

## STOP C — the shared ground, then the three motions

### Beat C0 · TRIAD — what they agree on
> "Before asking how they differ — what do they share? Three things, and they
> are not small:"

1. **"They all treat + the same."** *(mini-pane: the same parallelogram
   addition drawn identically in all three planes)*
2. **"They all treat real numbers the same."** *(mini-pane: (x)(u) = xu on
   the shared real axis — common ground in every world)*
3. **"They all treat ×1 as doing nothing."** *(mini-pane: the grid, untouched)*

> "So all the difference lives in one act: **multiplying by a number that
> leaves the real axis**. Pick one — call it **w**."

**DO:** tap "*pick w —*" (twinkle). **MORPH:** the three panes persist and
become the Compare triptych; **w** is born draggable.

### Beat C1 · DESK — the three motions of ×w
The operator/compare apparatus (already built), now *earned by the triad*:

- drag **w** on the plane; the bottom edge lands on w in every plane —
  that is triad #3 made visible (w·1 = w);
- the real column of the matrix never moves — triad #2 in numbers;
- only the j-side feels the dial: **SPIN turns · SHEAR slides · BOOST
  squeezes**.

The **Why?** module (matrix columns = where 1 and j land) is summonable, not
resident. **DO:** free exploration; the next twinkle sits on
"*what does each ×w leave unchanged? —*"

---

## STOP D — the mirror trick (the bridge to level sets)

### Beat D0 · COLUMN — the same gesture again, deliberately
> "Each plane has a mirror: flip the j-part. **z̄ = x − y·j**. Multiply a
> number by its mirror — distribute and collect, the same move as before:"

`z·z̄ = (x + y·j)(x − y·j) = x² − p·y²`

> "The j-part cancels. Out of every z comes a plain real number — call it
> **N(z)**. And it respects multiplication: **N(zw) = N(z)·N(w)**."
> ▸ *whisper: check it — or expand the four-line verification.*

> "So each world carries its own idea of size, and the sets where N holds
> constant are that world's **circles**."

**MORPH:** the level sets **bloom out of the equation** — circles from
`x² + y²`, the line pair from `x²`, hyperbolas from `x² − y²` — into the
Levels stage face, dial live.

### Beat D1 · DESK — levels, earned
The current Levels face, arrived at honestly. The page's last twinkle points
off-page: "*how do these worlds behave — orbits, powers, iteration? —*"
(the next passage).

---

## Declutter accounting (what this retires from the always-on desk)

- Claim compartment → dissolved into A0/A1 (the question is the running head;
  the prose is distributed one sentence per beat).
- Operator + Compare → born at C1, summonable after.
- Levels → born at D0/D1 (no longer the default stage).
- Margin → exists only after its first reveal (the no-parabola note now
  triggers at B1/D1 when the dial rests at 0 — same mechanic, staged home).
- Latent threads → become the **question rail**, visible from C1 on; entries
  are questions that summon modules or point at future passages.
- The full app link stays a footer fallback.

## Open items for Dan's markup

1. The **text itself** — every quoted line above is a voice proposal, not a
   fixture. Mark freely.
2. **A0's reply mode** — current script: the reader's tap *is* the "no" (the
   page proceeds as if they said it). The alternative — the notebook answering
   "No —" in its own voice — is one word of copy either way.
3. **Step advance in A1/D0** — tap-per-line (scripted here) vs. a slower
   auto-cascade with a pause control.
4. **Whether Stop D belongs to this page** or opens the next one (the script
   keeps it here so the page ends on an earned picture, not a cliff).
5. The renormalization widget's **ruler slider**: one shared s applied to all
   dots (scripted) vs. per-dot dragging (more tactile, less clean).
