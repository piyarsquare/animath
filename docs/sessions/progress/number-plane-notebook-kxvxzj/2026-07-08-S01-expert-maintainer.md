---
kind: three-hats
session: 2026-07-08-S01
date: 2026-07-08
title: "Framework Maintainer"
branch: claude/number-plane-notebook-kxvxzj
slug: number-plane-notebook-kxvxzj
status: complete
build: n/a
---

# Framework Maintainer — review of Chapter II (the plate-grid notebook port)

## Under review

I reviewed **`public/number-planes/chapter-2.html`** — the vanilla-JS port of the
Claude-Design "Chapter II — the plane" prototype (`docs/design/notebook-handoff/`) onto
the shared static guide-theme layer (`public/guide-theme.css` + `guide-skin.js`). It is a
7-plate CSS grid (C2 hub · PL level curves · CR circle-dial · DV/QD/L2/FTA flip cards)
whose entire state is a single dial value `p = j²`, with every plate reading/writing that
one value. I judged it as the repo's long-time maintainer: where it *lives* (a standalone
`public/` page vs an app route), whether its "works with all 8 skins" claim is actually
true on this theming layer, whether it keeps parallel branches conflict-free, and whether
it is a durable home or an orphan that will rot. I read the port in full, the handoff spec,
the reference `.dc.html`, the sibling `notebook.html`, `guide-theme.css`, `guide-skin.js`,
`src/chrome/theme.css`, and the branch history.

The headline: **the code is clean, self-contained, and its most-doubted claim (theming)
actually holds up better than the brief feared.** The real maintainer risks are not in the
file — they are around it: a network-font dependency the handoff told it to drop, an
un-discoverable orphan with no route home, and a second 90 KB hand-authored notebook next
to it re-implementing the same domain logic with a *different* accessibility posture.

---

## What I verified first-hand

| Question | Method | Result |
|---|---|---|
| Does `light-dark()` resolve on `.nbr`? | Read guide-theme.css `color-scheme` per skin + CSS inheritance rules | **Yes** — `color-scheme` is inherited; every `[data-theme]` block sets it on `<html>`; `.nbr` inherits it, so `light-dark()` picks the right branch |
| Do the 3 un-tuned skins read correctly? | Traced token values for neon/mirage/daylight | **Yes** — dark-branch trio on the two dark skins, light-branch on daylight; all legible |
| Does it edit any append-only shared file? | `git diff --name-only` for the Chapter II commit | **No** — only `public/number-planes/` + `docs/` |
| Is it linked from the app? | `grep -rn "chapter-2\|number-planes/notebook" src/ index.html` | **No references anywhere** — fully orphaned from the SPA |
| Is there a CSP that would block the fonts? | `grep -rn "Content-Security-Policy" index.html public/` | **None** — so the fonts load, but nothing guards them |
| American spelling? | grep British variants | **Clean** |
| Build impact? | It is a static `public/` file | **Zero** — Vite copies `public/` verbatim; `tsc`/`vite build` never touch it |

---

## Findings

| id | sev | category | one-line |
|---|---|---|---|
| maintainer-1 | P2 | integration | Loads 6 Google Font families from the network, directly against the handoff's "substitute the app's families" instruction — privacy, offline, FOUT, chrome-inconsistency |
| maintainer-2 | P2 | scope | Orphan: no `src/` route, no gallery card, no app link reaches it — discoverable only by typing the raw `public/` URL |
| maintainer-3 | P2 | duplication | `notebook.html` (90 KB) and `chapter-2.html` (45 KB) independently re-implement the p-dial, the sign→plane-name trichotomy, and the FOIL/product math with **no shared JS**, and with **incompatible a11y** |
| maintainer-4 | P2 | a11y | Every control is a `div`/`span`/`<svg>` driven by document-level `click`/pointer handlers — zero `role`/`tabindex`/`aria`/keyboard; a regression from `notebook.html`, which uses native `<input type=range>` + `role="button" tabindex="0"` |
| maintainer-5 | P3 | theming | `light-dark()` works, but only via an **undocumented cross-file coupling**: it silently depends on guide-theme.css setting `color-scheme` on every skin; and it diverges from the chrome's deliberate "paired `[data-scheme]` blocks, not `light-dark()`" convention |
| maintainer-6 | P3 | theming | Builds on the *provisional, drift-flagged* `guide-theme.css` mirror and adds a **fourth** copy of the plane palette (inline hex in 4 skin overrides), deepening the drift the repo already tracks |
| maintainer-7 | P3 | design-fidelity | `--live`/`--voice` are mapped to `--accent2`/`--accent`; on **daylight** the "voice" UI accent (`#2f6fe0` blue) nearly collides with the `--d1` "complex" data blue (`#2b57c9`), softening the UI-voice-vs-data color separation the repo locks |

---

## Integration & home

Chapter II lives where the guides live: a standalone hand-authored file in `public/`,
themed by `guide-theme.css`, skinned by `guide-skin.js`, not registered in `apps.ts` or
`index.tsx`, not built by `tsc`. For a *reading surface* that is a reasonable home — the
guides already work this way, and a plate grid of inline SVG has no need of React, the
`Workspace` chrome, or the archetype rail. I would not force it into an app route just to
satisfy uniformity. It is honestly a document, and documents live in `public/`.

But two things about that home are worth flagging.

> [!WARNING]
> **It is an orphan.** `grep -rn "chapter-2\|number-planes/notebook" src/ index.html`
> returns nothing. The app never links to it; the gallery never surfaces it; the only
> inbound edges are `chapter-2.html ↔ notebook.html` and `→ cards/`. A user inside the
> animath SPA cannot reach this notebook by any UI path. There *is* a real app at
> `#/number-plane` (`src/apps.ts:94`, `src/animations/NumberPlane/`), but it is a
> different artifact — so the name collision makes the orphan *more* confusing, not less:
> a maintainer six months from now will find two "number plane" things and no thread
> between them. **An orphan with no inbound link and no owner in the routing table is the
> canonical thing that rots.** Whoever lands this should either (a) add one link from the
> NumberPlane app's explainer / the gallery to the notebook, or (b) write a one-line
> `docs/` note declaring the notebook a deliberate standalone reading surface with an owner
> and a "promote-to-route-later" flag — the same way `guide-theme.css`'s header declares
> its own provisional status.

**Network fonts (maintainer-1).** The file `@import`s Newsreader, Caveat, Space Mono,
Space Grotesk, Shadows Into Light, and VT323 from `fonts.googleapis.com` /
`fonts.gstatic.com` (chapter-2.html:9–11). The handoff was explicit — *"Typography (Google
Fonts in the prototype; **substitute the app's families**)"* and *"Fonts are Google Fonts …
**swap for the app's equivalents**."* The port kept the prototype's network fonts verbatim.
The rest of the app (and the sibling guides) use system stacks / `Hanken Grotesk`;
`guide-theme.css` body is `Georgia, 'Times New Roman', serif`. Consequences a maintainer
cares about:

- **Privacy.** A third-party network request to Google on every open of an otherwise
  fully self-hosted GitHub-Pages site. This is exactly the kind of quiet dependency that
  contradicts a static, offline-capable deploy.
- **Offline / air-gapped.** The animath build is self-contained; this page is the one that
  breaks its face without a live connection (falls back to `Georgia`/`monospace`, so the
  hand/display/mono voices all collapse — a large visual regression, not a graceful one).
- **FOUT / layout.** `display=swap` means a flash of fallback then reflow; the plate grid's
  tight 208 px cells and fixed font sizes make that reflow visible.
- **Inconsistency.** Chapter II now renders in a typeface family that appears nowhere else
  in animath. If the "notebook" is meant to feel like part of the product, it doesn't.

There is *no CSP* in the repo today, so nothing blocks the fonts — but "it isn't blocked"
is not "it's the right home." The correct fix is the one the handoff already asked for:
self-host the two or three families actually load-bearing (a display, a hand, a mono),
or map onto the app's existing stacks, and drop the network `<link>`s.

---

## Theming reality — the good news, precisely

The brief asked me to check whether `light-dark()` "actually resolves on this layer (does
`color-scheme` reach `.nbr`?)". **It does, and here is the mechanism, because it is subtle
enough to be worth writing down.**

`chapter-2.html:34–36` defines the semantic plane colors as:

```css
--d1: light-dark(#2b57c9, #5fa8ff);   /* complex / blue */
--ok: light-dark(#149e57, #4cc878);   /* dual / green   */
--d5: light-dark(#bd5f1c, #ff9a5f);   /* split / orange */
```

`light-dark()` resolves against the element's **used `color-scheme`**. `color-scheme` is a
CSS *inherited* property. `guide-skin.js` writes `[data-theme=<id>]` onto `<html>` before
first paint, and every one of the 8 skin blocks in `guide-theme.css` (lines 26–33) sets a
concrete `color-scheme` (`dark` for observatory/blueprint/phosphor/neon/mirage, `light` for
light/daylight/primary). `.nbr` is a descendant of `<html>`, inherits that `color-scheme`,
and so `light-dark()` picks the correct branch. **The port therefore themes correctly on
all 8 skins, including the 3 it never hand-tuned (neon, mirage, daylight):**

| Skin | color-scheme | plane trio it gets | legible? |
|---|---|---|---|
| dark (Observatory) | dark | `#5fa8ff / #4cc878 / #ff9a5f` | yes (matches prototype exactly) |
| neon | dark | same dark trio | yes on near-black `#05060f` |
| mirage | dark | same dark trio | yes on `#1a1230` |
| daylight | light | `#2b57c9 / #149e57 / #bd5f1c` | yes on `#eef2f8` |
| light / primary / blueprint / phosphor | (4 hand-tuned overrides at lines 42–47) | bespoke | yes |

The derived-token strategy (`--paper: var(--card)`, `--ink: var(--fg)`, `--desk:
color-mix(... var(--bg) ...)`, `--live: var(--accent2)`, `--voice: var(--accent)`,
lines 22–39) means the *chrome* tokens flow through automatically and the page recolors
**live** on a skin switch — CSS custom properties re-resolve at paint, and the SVG uses
`fill="var(--…)"` strings, so the geometry recolors with no JS re-render. That is genuinely
the right way to do it on this layer, and it is a real strength of the port. **Credit
where due: the "works with all 8 skins" claim in the file's header comment is true.**

> [!IMPORTANT]
> The strength has a hidden string attached (maintainer-5). `light-dark()` works here
> *only because* `guide-theme.css` happens to set `color-scheme` on every skin. If a future
> skin block ever omits `color-scheme`, its used value falls back to the initial `normal`,
> and `light-dark()` silently resolves to the **light** branch — so a dark skin would get
> the *light* plane trio and no error would fire. That is an implicit cross-file contract
> that nothing in `chapter-2.html` documents or defends. A one-line comment ("plane colors
> depend on guide-theme.css setting `color-scheme` per skin") would make the coupling
> visible. Better still would be to follow the chrome's own convention.

**On that convention (maintainer-5, maintainer-6).** CLAUDE.md's theming-v2 section is
explicit that the chrome deliberately uses *"Paired `[data-scheme]` blocks, **not**
`light-dark()` (three modes, not two)."* Chapter II reaches for `light-dark()` — a two-way
switch — for its data colors. On the *guide* layer that is defensible, because the guide
layer only has a two-way light/dark axis (the `light` flag in `guide-skin.js`); it never
exposed theming-v2's native/light/dark tri-mode. So the port is consistent with the layer
it targets. But it is **inconsistent with where that layer is heading**: `guide-theme.css`'s
own header says *"If we promote the guides into the chrome later, this file goes away and
the pages read `theme.css` directly."* On that day, every `light-dark()` in Chapter II
becomes rework, and every inline hex in the 4 skin overrides (lines 42–47) — a *fourth*
copy of a plane palette that already exists in the prototype, the handoff, and (as chrome
tokens) `theme.css` — becomes drift to reconcile. The port didn't *create* the guide-mirror
debt, but it did build another storey on it.

Two smaller theming notes:

- **maintainer-7 (daylight voice/data collision).** `--live`/`--voice` map to
  `--accent2`/`--accent`. On daylight, `--voice` = `--accent` = `#2f6fe0` (blue), which sits
  right next to `--d1` = `#2b57c9` (the "complex" *data* blue). The repo locks
  `--accent`/`--accent-2` as "UI-voice only — never data"; here the UI voice and a data hue
  land on nearly the same blue, blurring exactly the separation that lock exists to protect.
  It's a legibility nit, not a break, but it is the sort of thing the semantic-color rule is
  meant to catch.
- The 3 un-tuned skins share the *same* two-branch trio rather than a skin-harmonized one.
  I consider this **correct**, not a defect: the plane colors are semantic (blue=complex,
  green=dual, orange=split) and CLAUDE.md says data color comes from a fixed mapping, so
  holding them constant across skins is on-spec. Worth stating so a later reviewer doesn't
  "fix" it into per-skin hues.

---

## Operational & parallel-branch safety

This is where the port is strongest, and it deserves to be said plainly.

- **Conflict-free.** The Chapter II commit (`23b8192`) touches only `public/number-planes/`
  and `docs/`. It edits **none** of the append-only shared files (`index.tsx`, `apps.ts`,
  `CLAUDE.md`, `README.md`, `package.json`). Two agents could land this and any app branch
  in either order with zero merge friction. This is exactly the self-contained-folder
  discipline the repo is built around.
- **Zero build risk.** It is a static `public/` asset. `npm run build` (`tsc && vite build`,
  the only CI gate) never type-checks or bundles it; Vite copies `public/` verbatim. So the
  file cannot break CI, and CI cannot catch a regression in it either — which cuts both
  ways (see below).
- **Self-verification hook.** `window.__ch2 = { get, setP }` (chapter-2.html:677) is exposed
  for headless checks. That is a thoughtful, low-cost affordance and I'd like to see it kept.

The debt it *adds* is duplication, not coupling (maintainer-3):

> [!WARNING]
> `public/number-planes/` now holds **two** large hand-authored notebooks —
> `notebook.html` (~90 KB, the staged "The Choice" passage) and `chapter-2.html` (~45 KB,
> the plate grid) — that independently model the **same domain**: a `p = j²` dial, the
> sign→plane trichotomy (`p<0` complex/spin, `p=0` dual/shear, `p>0` split/boost), the
> plane-name-by-sign, and the FOIL product `x·a + y·b·j²`. `notebook.html` has its own
> `#pslider`, its own SPIN/SHEAR/BOOST cards that set `p=−1/0/+1`, its own mini-dial
> `#mdp`. `chapter-2.html` has its own SVG slider, its own DV buttons, its own `q(p)`
> product. **There is no shared JS module between them.** When the math, the plane names,
> or the semantic palette changes, a maintainer must find and edit both, by hand, in two
> different idioms. This is the "three near-identical viewers" story from the repo's own
> history (later consolidated into `lib/particles`) beginning again on the static side.

And the duplication is not even *consistent* — which is the part that will bite
(maintainer-4):

> [!IMPORTANT]
> **The shared control has two incompatible accessibility postures.** `notebook.html` uses
> a native `<input type=range … aria-label>` for its p-dial and `role="button" tabindex="0"`
> on its worldcards — keyboard-operable. `chapter-2.html` reimplements the *same* p-dial as
> a bare `<svg>` with pointer handlers and **zero** `role`/`tabindex`/`aria`/keyboard
> support (grep: 0 matches). Every plate, chip, flip card, and both dials are click/pointer
> only. For a surface whose whole pitch is "the reader is trusted to read," a keyboard user
> cannot change `p`, flip a plate, or spin the dial. This is a genuine a11y regression
> *relative to the file sitting next to it*, and CI will never flag it because CI never
> touches `public/`. A shared `numberPlanes-notebook.js` (dial + plane-name + palette +
> product math + an accessible slider component) would fix the duplication and the a11y gap
> in one move, and would be the natural seam if Chapter I / III get built.

---

## Scope — is the boundary clear?

Partly. The file *itself* is well-bounded: one page, one `p`, seven plates, a clean
`render()` that is a faithful, readable transcription of the prototype's `renderVals()`
(I checked the port against the `.dc.html` — the coordinate maps `X/Y`, the `q(p)` product,
the ellipse/hyperbola sampling, the `2·atan(p)` circle, the renormalize two-phase
smoothstep, and the snap thresholds all match). As a *deliverable* it is complete and does
what it says.

What is *not* bounded is the **program** it belongs to. The handoff frames Chapter II as
"the reference implementation" of a multi-chapter, multi-plate notebook (Chapters I and III
"not yet laid," per the footer at chapter-2.html:380). Right now that program is: one
staged passage (`notebook.html`) + one plate grid (`chapter-2.html`) + a 30-plus-card
corpus in `cards/` that neither page consumes programmatically (the copy was hand-lifted).
There is no shared engine, no manifest-driven rendering, no route, no owner declared in the
tree. That is fine as a *sketch*; it is a liability as a *standing artifact*, because the
next person to touch "Number Planes" has to reverse-engineer which of these is canonical.
The repo's own convention for exactly this situation is the provisional-header pattern
(`guide-theme.css`, `ARCHITECTURE.md`, the TopologyWalk "being retired" note): a short,
committed statement of status and intent. Chapter II should carry one.

---

## What I'd tell the author to do (in order)

1. **Drop the network fonts** (maintainer-1). Self-host or map to the app's stacks, per the
   handoff. This is the one item with privacy + offline + consistency all riding on it.
2. **Give it a thread home** (maintainer-2). One inbound link (from the NumberPlane app
   explainer or the gallery) *or* a committed `docs/` status note naming it a deliberate
   standalone with an owner. Kill the orphan-ness before it rots.
3. **Extract a shared `numberPlanes-notebook.js`** (maintainer-3/4). Dial + plane-name +
   palette + product math + **one accessible slider**, consumed by both notebook.html and
   chapter-2.html. Fixes duplication and the a11y regression together, and is the seam for
   Chapters I/III.
4. **Document the `color-scheme` coupling** (maintainer-5) with a one-line comment, and note
   the `light-dark()`-vs-`[data-scheme]` divergence so a chrome promotion knows it's rework.
5. Polish: nudge daylight's `--voice` off the `--d1` blue (maintainer-7).

None of these is a correctness bug. The port *works*. They are the difference between "a
clever standalone HTML file" and "a piece of animath a maintainer can own."

---

## Verdict

**Approve the artifact; do not yet approve it as a permanent, unowned `public/` fixture.**

As code, Chapter II is a faithful, self-contained, genuinely skin-aware port — its most
doubted claim (all-8-skins theming via `light-dark()`) is **correct**, it is parallel-branch
and CI safe, and it reads cleanly against the reference. That is real, and I want to be
clear it clears the bar for landing on the branch.

The maintainer's reservations are all about its *situation*, not its *substance*: a
network-font dependency the handoff explicitly said to remove, an orphan with no route or
inbound link (made worse by a name-collision with the real `#/number-plane` app), a second
90 KB notebook beside it duplicating the domain logic with an *incompatible* accessibility
story, and a build on the drift-flagged guide mirror that adds a fourth palette copy. Left
as-is, this is exactly the shape of thing that is delightful in month one and unmaintained
by month six. Land it, then (in the same or the very next session) do items 1–3 above — the
fonts, the thread home, and the shared engine — and it becomes a durable part of the
notebook rather than a clever orphan.

---

## Self-reflection

1. **What would you do with another session?** Open all 8 skins in a real browser (I
   reasoned about `color-scheme` inheritance and token values rather than rendering them),
   and prototype the shared `numberPlanes-notebook.js` extraction to confirm notebook.html
   and chapter-2.html can actually converge on one dial/palette/product module without
   contorting either.
2. **What would you change about what you produced?** I leaned hard on the theming
   correctness because the brief invited doubt there; a shorter treatment plus a rendered
   screenshot matrix would carry more conviction than the prose derivation.
3. **What were you not asked that you think is important?** Whether the `cards/` corpus is
   meant to *drive* these pages (manifest-rendered) or just seed hand-written copy. The
   answer decides whether the notebook is a one-off or an engine, and every scope finding
   hinges on it.
4. **What did we both overlook?** The a11y *regression relative to the sibling file* —
   the brief framed duplication as a code-smell, but the sharper problem is that the two
   copies disagree on keyboard access for the same control.
5. **What did you find difficult?** Confirming `light-dark()` resolution without a browser —
   it rests on `color-scheme` being an inherited property and on every guide-theme skin
   block setting it; I verified both by reading, but a render would be decisive.
6. **What would have made this task easier?** A screenshot tour of chapter-2.html across the
   8 skins (the repo has `npm run tour`, but it targets app routes, not `public/` pages).
7. **How did you verify this, and does each passing check test the user-visible claim?**
   Method: static reading + `grep`/`git` (branch scope, cross-references, CSP, spelling,
   a11y-attribute counts, `color-scheme` per skin) + CSS-inheritance reasoning for the
   `light-dark()` claim. No browser render, no device. The theming and a11y conclusions are
   **visual-unverified** — the token-value and inheritance facts are solid, but "reads
   correctly on neon/mirage/daylight" is a contrast judgment I made from hex values, not
   from pixels. `signals: visual-unverified`.
8. **Follow-up value:** MEDIUM — conclusions are sound but the theming/legibility verdict
   would be firmer with an 8-skin render, and the shared-engine recommendation is a
   proposal I did not prototype.
