---
kind: handoff
session: 2026-07-13-S03
date: 2026-07-13
title: The whole notebook — chapters I & III ported, a cover, void + iOS fixes
branch: claude/number-plane-notebook-kxvxzj
slug: number-plane-notebook-kxvxzj
status: completed
build: passed
followup: null
pr: https://github.com/piyarsquare/animath/pull/246
app: number-plane, docs
signals: phone-needed
next: Dan re-checks the small cards on his iPhone (1ae28f9 deployed); then harvest notebook.html's keeper animations and build the S02 leak/re-grid annex.
---

# The whole notebook — chapters I &amp; III ported, a cover, void + iOS fixes

## Summary

The Number Planes notebook is now **whole and live** on the branch preview:
a cover (`/number-planes/`) binds three plate-grid chapters — I (the line),
II (the plane, previously the only one), III (three worlds) — plus the cards
inspector and the staged walk-in, all cross-linked, all 8 skins. This session
also fixed why Dan saw "definite problems": hover-gated gloss text that could
never appear on touch, an undesigned phone layout, and (after two rounds) an
iOS Safari collapse of the flip-card faces. PR #246 is being prepared for
merge; Dan wants comments monitored and will accept when clear.

## What changed

1. **Diagnosis by browser** (headless Chromium, all 8 skins, phone + desktop):
   the plates read as voids because each `.fgl` gloss was `opacity:0` until
   `:hover` — unreachable on touch, and its reserved space wrapped captions.
   Cleared as false leads: fonts (sandbox-only failure), the "an ellipse"
   label (design's own text), token resolution (all 8 skins fine).
2. **chapter-2.html fixes**: glosses rest visible (62% / 85% on `hover:none`),
   touch shows `.ann` annotations and drops hover-tilts, phone re-packs the
   grid two-up (C2/PL/CR full width; DV|QD, L2|FTA pairs), caption rows wrap
   centered, favicon, real footer links.
3. **New pages**, ports of `docs/design/notebook-handoff/designs/`:
   `chapter-1.html` (C1 hub: ADDITION↔MULTIPLICATION word flip, draggable a/b,
   the cutout flap; L1/L3/L4/AX; six seals), `chapter-3.html` (WH hub: ×w
   carries the grid, [a pb; b a] matrix, live eigenvalue line, sticky j²
   strip; CX/DU/SP world cards that light "the operator is here now"; FD; six
   seals), `index.html` (the cover: masthead, question, chapter shelf, leaf
   side-doors). The 274KB "working copy" design is NOT ported — future project.
4. **Mobile card fixes** (two rounds, Dan-reported): seals two-up with backs
   that fit; then — the real bug — **iOS Safari resolves the faces'
   `height:100%` wrapper as zero against min-height-only boxes**, so cards
   showed as empty frames on iPhone while headless Chrome passed. All phone
   card heights are now definite (seals `150px !important` over the inline
   `height:100%`; note plates 206px; FD 176px).
5. Also: committed + reviewed the S02 leak/re-grid plan from Dan's parallel
   session (math verified by hand; verdict adopt-with-corrections — letters
   swapped vs. shipped z/w, `same-as`→`leans-on`, Chapter II annex placement,
   sandboxed-q + explicit "adopt p′" exit). Its prototype HTML was never
   uploaded — ask Dan or rebuild from the plan's verification recipe.

## Key files

| File | Role |
|---|---|
| [`public/number-planes/index.html`](https://github.com/piyarsquare/animath/blob/1ae28f95ec5198fbbc0d8aae090271125053ff81/public/number-planes/index.html) | The cover: masthead, chapter shelf, side-doors |
| [`public/number-planes/chapter-1.html`](https://github.com/piyarsquare/animath/blob/1ae28f95ec5198fbbc0d8aae090271125053ff81/public/number-planes/chapter-1.html) | Chapter I — the line (new port) |
| [`public/number-planes/chapter-2.html`](https://github.com/piyarsquare/animath/blob/1ae28f95ec5198fbbc0d8aae090271125053ff81/public/number-planes/chapter-2.html) | Chapter II — the plane (void/touch/phone fixes) |
| [`public/number-planes/chapter-3.html`](https://github.com/piyarsquare/animath/blob/1ae28f95ec5198fbbc0d8aae090271125053ff81/public/number-planes/chapter-3.html) | Chapter III — three worlds (new port) |
| [`docs/sessions/progress/number-plane-notebook-kxvxzj/2026-07-08-S02-plan-q3-leak-regrid.md`](https://github.com/piyarsquare/animath/blob/1ae28f95ec5198fbbc0d8aae090271125053ff81/docs/sessions/progress/number-plane-notebook-kxvxzj/2026-07-08-S02-plan-q3-leak-regrid.md) | The leak/re-grid plan (reviewed, awaiting its prototype) |
| [`docs/design/notebook-handoff/designs/`](https://github.com/piyarsquare/animath/tree/1ae28f95ec5198fbbc0d8aae090271125053ff81/docs/design/notebook-handoff/designs) | Pristine design references (incl. the unported 274KB working copy) |

> [!CAUTION]
> **Flip cards need definite heights.** The `.vat` faces are absolutely
> positioned inside a `height:100%` wrapper (`.in`). iOS Safari resolves that
> percentage against a `min-height`-only or auto-row box as **zero** — cards
> render as empty frames — while headless Chrome resolves it leniently and
> passes every check. Any new plate layout must give vats a definite height
> (grid rows, `aspect-ratio`, or fixed px), and phone-CSS changes to plates
> should be re-checked on a real iPhone.

> [!IMPORTANT]
> **Deliberate design departure:** the handoff design's glosses were
> hover-only; ours rest visible (62%, brighter on touch) because the notebook
> must read on touch. Don't "restore" the hover-only behavior as a fidelity
> fix. Same for the collapsed `data-trig` modes (click-only in the ports).

## Open / not done

- **iPhone confirmation** of 1ae28f9 (Dan re-checking; `phone-needed`).
- **PR #246 merge**: description updated this session; monitoring comments;
  Dan accepts when clear. Branch does NOT target a stacked base anymore? —
  check before merge: this branch was stacked on `number-plane-guide`; sync
  per CLAUDE.md's stacked-branch rule if the base moved.
- **Harvest notebook.html** (the staged walk-in) into the chapters: keepers =
  told-FOIL, settle-the-dots renormalization, cover fold, Hmm? pop-out; then
  retire it.
- **The leak/re-grid annex** (S02 plan): needs Dan's prototype file or an
  approved rebuild; re-letter to shipped z = x + y·j / w = a + b·j first.
- **Leaf-ification**: DV and L2 still text-back flip plates; QD is the model.
- **The working-copy port** (274KB long-form notebook design) — unstarted.
- Parked per Dan: keyboard operability, ARIA. Review punch-list P2s (shared
  planes.js module, light-skin contrast audit, typography unification).

## Context

- Everything verified headless (`verify-all.mjs`, `heightcheck.mjs` patterns in
  the scratchpad — flip cards, measure `scrollHeight` vs `clientHeight`, and
  `.in` height ≡ vat height); `npm run build` passes; Google Fonts fail ONLY in
  the sandbox (proxy) — fine on real machines.
- Live: `https://claude-number-plane-notebook.animath.pages.dev/number-planes/`
  (Cloudflare Pages redeploys each push; ~1 min).
- One p per page is the standing contract; each chapter page has its own p.
- The chapters share one skeleton (tokens on guide-theme, `.vat`/`.c1t`/seal
  vocabulary, sticky slider, click routing) — copy chapter-3 for any new
  chapter-style page.

## Self-reflection

1. **What would you do with another session?** Harvest the walk-in's keeper
   animations into the chapters (the told-FOIL belongs behind C2's Hmm seam)
   and retire notebook.html; or build the leak/re-grid annex if the prototype
   arrives.
2. **What would you change about what you produced?** The mobile card fix took
   three commits because I trusted headless Chrome twice on a CSS-resolution
   question where engines genuinely differ. The `.in`-height invariant check
   (written for round three) should have existed in round one.
3. **What were you not asked that you think is important?** Before merging,
   the stacked-base question: this branch forked from `number-plane-guide`; if
   that PR merged separately, #246's diff may include its commits — worth one
   look at the PR's base and file list before accepting.
4. **What did we both overlook?** The chapters ship ~30KB of inline-duplicated
   CSS skeleton ×4 pages; a shared `notebook.css` would keep future chapters
   honest (deferred deliberately — parallel-branch safety favors self-contained
   files, but the duplication now has four copies).
5. **What did you find difficult?** Diagnosing "looks wrong on Dan's phone"
   from a sandbox whose browser resolves the broken CSS correctly. The fix was
   to stop checking outcomes (no clipping) and start checking invariants
   (every face's box ≡ its vat's box).
6. **What would have made this task easier?** A real-device screenshot in the
   first report; and an iOS engine (or Playwright WebKit) in the sandbox.
7. **How did you verify this, and does each passing check test the
   user-visible claim?** Headless Chromium: interaction drives (word flip,
   eigenvalues, magnets), link resolution, overflow scans, per-face height
   invariants, full-page screenshots desktop + 390px across skins; `npm run
   build` for CI. The iOS fix is verified by invariant + reasoning about the
   documented WebKit behavior, NOT on a real iPhone — hence `phone-needed`;
   visual quality on real devices is otherwise Dan-confirmed only for the
   earlier voids round.
8. **Follow-up value:** MEDIUM — the notebook is whole and the PR mergeable,
   but the iPhone confirmation, the walk-in harvest, and the leak annex are
   real next steps that build directly on this state.
