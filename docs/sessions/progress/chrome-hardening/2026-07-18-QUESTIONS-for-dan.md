---
kind: plan
session: 2026-07-18-S01
date: 2026-07-18
title: Open product-direction questions (post external review)
branch: claude/chrome-hardening
slug: chrome-hardening
status: proposed
build: n/a
followup: null
pr: null
app: chrome, general
next: Dan answers; each answer unblocks its item independently.
---

# Open questions for Dan — product direction after the external review

Everything mechanical from the external review (GPT sol 5.6) is done or in PR
#252. What remains needs your editorial judgment. Each question below is
decision-ready: context, options, and my recommendation. Answer in any order —
none block each other.

---

## 1. The gallery entrance: which three apps lead?

The review's highest-leverage product suggestion is a **"Start here" row** so a
first visitor isn't handed twelve equal cards. The mechanism is cheap (a
`starter: true` flag in `catalog.ts`); the *choice* is editorial.

**My candidates** (one per temperament):

- **Counting the Ways** — the review called it the best teaching design; its
  narrated Play-tutorial is the closest thing to a guided lesson.
- **Trinary System** — after the overhaul it has the strongest
  question-and-payoff arc (drop a planet in, watch predictability die).
- **Stable Matching** — no WebGL requirement, superb step feedback, and it
  represents the algorithms side.

(Complex Particles is the historical flagship, but it's the *deepest* app, not
the friendliest first door. It could be the fourth card or the "when you're
ready" pointer.)

**Question:** Which three? And should the hero copy name the row ("New here?
Start with one of these") or stay quieter?

## 2. Card metadata: which fields earn pixels?

The review proposes level/prerequisites, expected time, guided-vs-open-lab,
GPU requirement, and "the mathematical question being explored" on every card.
All five would crowd the cards.

**My recommendation:** two visible + one implicit —
- **the question** (one line, italic, replacing nothing — the blurb already
  gestures at it; this would sharpen each blurb into an actual question),
- **guided / open-lab** (a small chip; maps to "has a tour/Play-tutorial"),
- **GPU requirement** shown only as a tiny badge on the WebGL apps (now that
  failure is contained, this is a courtesy, not a warning).

Skip "expected time" (nobody's estimate survives contact) and "level" (the
apps aren't leveled; pretending they are invites wrong expectations).

**Question:** Agree with the two-plus-badge set? Any field you'd fight for?

## 3. Category taxonomy: adopt the reviewer's five?

Current categories stretch (Counting the Ways ≠ Probability's neighbor Fractals
in any meaningful sense). The reviewer proposes: **Transformations · Iteration
& Chaos · Algorithms & Emergence · Geometry & Topology · Probability &
Inference**.

**My take:** the proposed five are better than what's there, and re-binning is
a 20-minute `catalog.ts` edit. The only judgment calls: Complex Particles and
Argand (Transformations?), Trinary (Iteration & Chaos), Trees and Nets
(Algorithms & Emergence or Geometry?).

**Question:** Adopt the five as-is, adjust names, or leave categories alone?

## 4. Paper as the default theme?

The reviewer's aesthetic case: "Observatory looks like an excellent technical
dashboard; Paper looks like AniMath — a mathematical notebook from slightly in
the future." Technically free — theming v2 already lets the force-dark scenes
(Trinary, Complex Particles) keep their dark stages under a Paper chrome, and
returning visitors' persisted skin choices are untouched (the default only
affects first visits).

**My take:** genuinely a taste call — this is the product's face and it's
yours. If you're 60/40 on it, the cheap experiment is flipping the default for
a week on the Cloudflare preview and living with it.

**Question:** Flip the default to Paper, trial it on preview first, or keep
Observatory?

## 5. Explainer layering: adopt the structure, and where does attribution live?

The review is right that the "?" modals are encyclopedic (and occasionally
leak implementation detail — filenames, test architecture). Proposed layering:

1. Three short inline callouts (what the objects are, what colors mean, what
   to watch) — possibly surfaced in the workspace itself, not the modal.
2. "Why does this happen?" — the current explainer core, trimmed.
3. Derivation — properly typeset, expandable.
4. **Methods / Sources / Implementation** — separate tabs or sections.

The wrinkle is the **"Possible sources & where to go further"** blocks: they're
a deliberate attribution policy (ATTRIBUTION.md), not noise. Layering keeps the
policy intact — layer 4 becomes their home — but I want your confirmation
before restructuring every EXPLAINER.md, since it touches all thirteen apps and
the template in BUILDING_AN_APP.md.

**Question:** Adopt the four-layer structure as the new convention? Should
implementation notes (DEEP_ZOOM method docs etc.) stay reachable from the modal
or move to repo-only docs?

## 6. Gallery previews and motion: how far to go?

Unambiguous (I'll do these without further asking, next session):
`prefers-reduced-motion` renders static frames; offscreen previews pause.

The open part is the reviewer's stronger suggestion — **static until
hover/focus** plus a "Pause previews" control. That materially changes the
gallery's character, and the same reviewer scored the animated gallery as a
top strength. My recommendation: don't go static-by-default; do add the pause
control tucked into the hero row.

**Question:** Reduced-motion + offscreen-pause + a pause control — enough? Or
do you want static-until-hover?

## 7. Tablet / landscape-phone mode: build it now?

The phone re-chrome only engages below 740px *width*, so an 844px-wide
landscape phone gets the draggable desktop workspace with 26–36px targets.
The fix is a real (if contained) piece of work: a compact mode keyed on
width × height × coarse-pointer, 44px targets, safe-area insets — and honest
testing needs a physical device, which I don't have.

**My take:** worth doing, but it's the largest remaining item and the least
verifiable from here. I'd sequence it after the entrance work, and I'd want
you (or a real device) in the verification loop.

**Question:** Green-light it next, or park it until there's device access?

## 8. Contrast + focus-color pass: pick the accessible focus colors

The reviewer measured Paper's small amber text at ~3.0–3.5:1 (below WCAG's
4.5:1 for normal text) and notes the focus ring shouldn't assume the
decorative accent works. The fix is token-level: per-skin `--focus` (and
possibly a darkened `--accent-strong` for small text), which changes how every
skin looks in its details.

**Question:** May I run a systematic pass that *proposes* per-skin adjusted
tokens (with before/after screenshots per skin × mode), for you to approve
before merge — rather than changing colors unilaterally?

## 9. Leftovers from the Trinary review (still open, unchanged)

Restating so they don't get lost — all four from the legibility synthesis:

- **Immersive Observatory** (full-stage stars vs instrument-on-a-desk feel);
- **Launch-speed units** (absolute vs ×circular, matching the Lab);
- **`role: 'start'` on SectionDef** (explicit "start here" panel vs trusting
  the emergent Button/accent hierarchy — I still recommend waiting);
- **Anchored tour framework** (spotlight/pointing tours as a chrome feature —
  would also serve the review's "guided grammar" goal across apps).

**Question:** Any of these you want pulled forward? My priority among them
would be the anchored tour framework, since it compounds with the entrance
work (#1–2).

---

*Also noted, no question needed: the layout clamp currently runs at layout
application, not on live window resize — shrinking the window after opening
can still push panels off-stage until the next layout pick. Small follow-up;
I'll fold it into whichever session touches the workspace engine next.*
