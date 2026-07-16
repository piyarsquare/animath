---
kind: three-hats
session: 2026-07-08-S01
date: 2026-07-08
title: "Architecture & Quality Consultant"
branch: claude/number-plane-notebook-kxvxzj
slug: number-plane-notebook-kxvxzj
status: complete
build: n/a
---

# Architecture & Quality Consultant — Chapter II plate-grid port

## Under review

I reviewed `public/number-planes/chapter-2.html` — the vanilla-JS port of the
Claude-Design "Chapter II — the plane" prototype (`docs/design/notebook-handoff/designs/Chapter II - The Plane.dc.html`)
onto the shared static-guide theme layer (`public/guide-theme.css` + `public/guide-skin.js`).
It is a 681-line standalone `public/` page: a seven-plate CSS-grid notebook whose single
`p` (j² = the dial value) drives every plate through one global state object `S` and one
monolithic `render()`. I judged it as a front-end architecture consultant against three
things: the handoff's stated #1 contract ("one `p`, all views derived in one pass"), the
eventual React target the app is written in, and its own merits as a shipped static artifact.
I read the reference prototype in full to assess fidelity, and skimmed the sibling artifact
`public/number-planes/notebook.html` (the "staged passage") for the two-artifact coherence
question. I did **not** run the page in a browser — findings are from code reading plus the
design spec, so device-specific perf/jank claims are reasoned, not measured.

---

## Executive verdict (the short version)

The port **honors the one contract that mattered**: there is a single source of truth
(`S.p`), every control funnels through `setP`, and the whole page re-derives in one
`render()` pass. The **math is a faithful, correct transcription** of the reference's
`renderVals()`. The **CSS-variable theming is genuinely good** — a skin switch recolors
every SVG live with zero JS, which is exactly what "the notebooks should work with any of
the themes" needs.

But two things temper that. First, the *rendering* half of the port is throwaway for the
React destination: it hand-mutates ~34 attributes and clears/rebuilds innerHTML on 6 groups
**every pointer-move**, where the handoff's own reference already ships a declarative,
React-shaped derivation. The state contract survives a React migration; almost none of the
`render()` body does. Second, there are a handful of real correctness/robustness seams —
animations that don't cancel, a lock-toggle that fires on plot clicks, no reduced-motion
path for the JS tweens — that are worth fixing before this is called "the reference
implementation."

Net: **a sound proof of the shared-state contract and the 8-skin theming, sitting on a
render layer that should not be carried forward.** Ship it as a static page; port from the
*reference's* `renderVals`, not from this file's `render`.

---

## 1 · Structural soundness of the port

### What translates cleanly

The handoff is emphatic (README §Overview, §State management): *the shared-state contract is
the thing to preserve.* The port preserves it faithfully.

| Contract element | Reference (`.dc.html`) | Port (`chapter-2.html`) | Translates to React store? |
|---|---|---|---|
| Single dial value | `state.p`, default `-1` | `S.p = -1` (line 390) | ✅ trivially → one store atom |
| Every control writes `p` | slider / CR / DV / L2 chips → `setState({p})` | slider / CR / DV / L2 → `setP` (416) | ✅ one setter, one funnel |
| One derive pass | `renderVals()` (500) | `render()` (418) | ✅ shape is identical |
| `rsS` reset on any `p` set | `setState({p, rsS:1})` | `setP` sets `S.rsS=1` (416) | ✅ |
| Product math | `q = pv => [zx*wx+pv*zy*wy, …]` (526) | identical `q` (458) | ✅ byte-for-byte |
| Level curves / CR angle / two-phase renormalize | `renderVals` + `_doRescale` | `render` + `doRescale` (650) | ✅ pure functions of `S` |

The state shape `S = {p, pm, zx, zy, wx, wy, rsS, rot}` (line 390) is exactly the store the
handoff prescribes ("`p` (+ `pm`, `rsS`, `rot`) should live in a shared store … the flip/lock
flags can be local"). A React port lifts this verbatim into `useReducer`/Zustand/signals with
no reshaping. The *derivations* inside `render()` — plane name/color, rail count, the `X`/`Y`
maps, the `q` product, the hyperbola sampler, the CR angle `2·atan(p)` — are pure and copy
across unchanged. **This is the load-bearing part of the port and it is correct and portable.**

### What is a dead-end

The *implementation* of `render()` is imperative DOM surgery: `$('id').setAttribute(...)`
×34, plus `el.innerHTML = ''` + `createElementNS` loops on `railTicks`, `c2ann`, `ptLabels`,
`lcLabels`, `rsg`, and `qdDots`. None of that survives a React rewrite — it is replaced
wholesale by JSX.

> [!IMPORTANT]
> The handoff's reference prototype **already contains the React-shaped version of this
> logic.** `renderVals()` (`.dc.html` line 500) returns a *values object* and builds SVG
> children with `React.createElement` (lines 508, 528–534, 563–566, 579). That is precisely
> the "derive values → declarative render" pattern the app wants. The port took that
> declarative derivation and **re-imperativized it** into `setAttribute`/`innerHTML`. For the
> stated goal ("port to a shared store + derived render"), `chapter-2.html`'s `render()` is a
> *lateral move away from* the target — the reference was already closer.

So the honest framing: as a **static artifact**, imperative vanilla JS is a reasonable choice
(a `public/` page can't import React without a build step). As a **stepping-stone to the app**,
this file advances the state/math port but *regresses* the render port. When the React version
is built, the engineer should diff against the reference's `renderVals`, treat
`chapter-2.html` as a validation of the theming + contract, and not try to salvage its
`render()` body.

One structural divergence from the reference worth noting: the port **dropped `on`/`pin` from
state**. The reference kept `state.on = {}` and `state.pin = {C2, PL}` (line 395); the port
holds flip/lock state only in the DOM (`data-on` attributes, toggled directly in the click
handler, lines 589–594) and updates the C2 hint text imperatively *outside* `render()`
(line 591). That is defensible per the handoff ("flip/lock flags can be local"), but it means
the page has **two sources of truth** — `S` for the math, DOM attributes for the UI-open flags —
which is a small coherence cost (see consultant-10).

---

## 2 · Performance & footprint

`render()` runs on **every** `pointermove` during a z/w drag, a slider drag, and a CR spin,
and on every `requestAnimationFrame` tick of the ~1.8 s renormalize and 0.8 s tilt tweens.
Each invocation does, unconditionally:

- `railTicks.innerHTML = ''` then rebuild (mul mode only) — 3 `<text>` (line 476)
- `c2ann.innerHTML = ''` then rebuild (line 480)
- `ptLabels.innerHTML = ''` then rebuild 2–3 `<text>` (line 482) — **every frame, always**
- `lcLabels.innerHTML = ''` then rebuild up to 3 `<text>` (line 517)
- `rsg.innerHTML = ''` then rebuild 2 `<circle>` + maybe 1 `<path>` (line 532) — **every frame, always**
- `qdDots.innerHTML = …` string rebuild (line 569) — **every frame, always**
- plus the 34 `setAttribute` calls and, in split mode, a 33-point `cosh/sinh` path string
  rebuilt with `toFixed` in a loop (lines 503–506)

And each pointer-move handler calls `getBoundingClientRect()` (lines 601, 619, 634) — a
forced layout read — before calling `render()`, which then writes DOM.

> [!WARNING]
> This is the textbook "rebuild innerHTML in a hot loop" antipattern. On a high-refresh phone
> `pointermove` can fire 90–120×/s; there is **no rAF-coalescing** of drag renders, so each
> pointer event synchronously tears down and re-creates ~12 DOM nodes and re-sets ~34
> attributes. The labels `z`, `w`, `z·w`, the `rsg` target/dot circles, and the `qdDots`
> (three discrete states) rarely or never change during a drag — yet they are discarded and
> re-allocated every frame. That is needless GC pressure and layout churn.

**How bad, really?** For seven plates on a modern device this will not freeze — the node
counts are small. But it is wasteful by construction and *will* show micro-jank on low-end
Android during a z/w drag, compounded by the perspective/`preserve-3d` compositing the plates
already carry. The cost scales with pointer rate, not with what actually changed.

**Cheaper path (for the eventual React version this is free; for the static page it is ~30
lines):**

1. **Coalesce**: set a `dirty` flag in the pointer handlers and run `render()` once per rAF,
   not once per event.
2. **Create static nodes once**: the `z`/`w`/`z·w` labels, the two `rsg` circles, the tick
   texts — create them at init and only `setAttribute` on move; never `innerHTML=''` them.
3. **Guard discrete rebuilds**: `qdDots` and the rail ticks only change across the three
   sign-regimes of `p`; rebuild them only when the regime flips, not every frame.
4. **Cache the rect** on `pointerdown` (the SVG doesn't move mid-drag) instead of
   `getBoundingClientRect()` per move.

None of this is required to ship, but all of it disappears for free in a React port that
diffs — which is another argument for treating `render()` as throwaway rather than optimizing
it in place.

---

## 3 · Correctness seams & failure modes

### 3a · Animations don't cancel on a new `p` (desync) — the real defect

`setP` (line 416) sets `S.p` and `S.rsS=1` and re-renders, but **does not touch `rsA` or
`tiltA`**. `doRescale` (650) captures `from`/`to` at start and drives `S.p`/`S.rsS` on every
frame until it lands. So if the user clicks a `−1/0/+1` chip, spins CR, or taps a DV/L2 plane
button **while a renormalize (or tilt) tween is mid-flight**, the tween keeps running and
**overwrites the just-set `p` on the next frame** — the user's action is visually reverted
after a beat.

- Reachable: nothing is disabled during the ~1.8 s rescale / 0.8 s tilt; all chips, the
  slider, CR, and DV/L2 stay live.
- Root cause: the only guards are re-entrancy (`if(rsA) return`, line 651; `if(tiltA) return`,
  667) — they stop a *second* tween, but nothing lets a `p`-set *cancel* an in-flight tween.
- Fix: `setP` (and the CR/slider setters) should `cancelAnimationFrame(rsA); rsA=null;`
  (same for `tiltA`) before applying the new value. Two lines.

This is the "state that can desync" the review brief asked about, and it is the one I'd rank
as a genuine bug rather than polish.

### 3b · The global click dispatcher toggles the hub lock on plot clicks

The document-level handler (line 577) early-returns for `a`, `[data-dragel]`, mode-toggle,
rescale, tilt, and `[data-pset]`, then falls through to `[data-c1t]` → toggle lock (589). The
**main plot SVG (`#c2plot`) and the level-curve SVG carry no `data-dragel`**, only the z/w
handles, the slider, and CR do. So a click anywhere on the plot *background* — the axes, the
"tap the word" caption, the `z+w`/`z·w` sentences, empty space — bubbles to `[data-c1t]` and
**toggles the C2 lock**. Same for clicking the level-curve area inside PL.

This is arguably the reference's intent ("hub plates: click to lock"), but the collision of
"click the plate to lock" with "the plate is 90% a large interactive plot" is a UX footgun: a
user reaching for a z/w handle and missing, or tapping the plot to orient themselves, flips
the lock and pins the plate. Severity is moderate because it is recoverable (tap again), and
it matches the prototype — but on a static page with no undo it reads as a glitch. If lock is
meant to be deliberate, gate it to the header strip (the pulse-dot row) rather than the whole
plate.

### 3c · JS tweens ignore `prefers-reduced-motion`

The reduced-motion guard (line 99) is CSS-only: `*{transition:none;animation:none}`. It kills
the plate/flip CSS transitions and the `pr-pulse` keyframe — good — but the renormalize and
tilt animations are **`requestAnimationFrame`-driven JS** (lines 656–673) and are entirely
unaffected. A reduced-motion user still gets the full 1.8 s ruler-stretch and 0.8 s rotate.
Fix: read `matchMedia('(prefers-reduced-motion: reduce)').matches` in `doRescale`/`doTilt`
and jump straight to the end state.

### 3d · No `pointercancel` handling

The drag flags `pd`/`ad`/`crd` are cleared only on `pointerup` (lines 611, 627, 647). There is
no `pointercancel` listener, so a touch interrupted by the OS (gesture nav, notification,
context menu) can leave a flag stuck `true`, and subsequent moves keep dragging without a
button held. `touch-action:none` reduces the odds, but the guard is missing. One-liner:
mirror each `pointerup` with a `pointercancel`.

### 3e · Things I checked that are NOT bugs

- **`fill="var(--d1)"` on SVG attributes resolves.** CLAUDE.md warns that `var()` doesn't
  resolve in canvas `fillStyle`; that is canvas-specific. SVG presentation attributes *are*
  CSS, so `setAttribute('fill','var(--d1)')` resolves in every modern engine — and the
  reference relies on the identical pattern. Not a defect.
- **Slider/handle/CR clicks don't double-fire.** After a pointer drag a `click` still fires,
  but all three surfaces carry `data-dragel`, so the click handler returns early (line 578).
  Correct.
- **DV/L2 plane buttons don't also flip the card.** `[data-pset]` is checked (586) and returns
  before `[data-t]` (593), so setting `p` from inside a flip card doesn't toggle the flip.
  Correct.
- **Re-entrancy guards on the tweens are present** (`if(rsA)/if(tiltA) return`). Correct — the
  gap is *cancellation*, not double-start (see 3a).
- **Skin-picker vs. the global click handler.** `guide-skin.js` mounts its own picker and adds
  a transient document click-listener; the picker button `stopPropagation`s and the menu items
  live outside any plate, so `chapter-2.html`'s handler no-ops on them. No conflict.

---

## 4 · Maintainability & the two-artifact question

### Four copies of the same algebra

The plane arithmetic (the `p`-dependent product, the split-plane `cosh/sinh` level sets, the
`p ↔ 1/p` circle) now exists in **four** places, none sharing code:

| Copy | Location | Nature |
|---|---|---|
| Canonical engine | `src/animations/Argand/numberPlanes.ts` | the tested source of truth |
| Staged passage | `public/number-planes/notebook.html` (inline `<script>`, line 757) | self-described "ported from numberPlanes.ts" (line 758) |
| Chapter II | `public/number-planes/chapter-2.html` (inline `<script>`) | ported from the design reference's `renderVals` |
| Design reference | `docs/design/notebook-handoff/designs/Chapter II - The Plane.dc.html` | the prototype |

`notebook.html` (1610 lines, 90 KB) and `chapter-2.html` (681 lines, 45 KB) are two large
standalone pages with **parallel, independently-maintained plane math** and two different
visual languages — one a choreographed viewport-fit "moment engine," the other a plate grid.
They cross-link (chapter-2 footer → `notebook.html` "the walk in (the choice)"), so they read
as one work, but there is **no shared module** between them. A change to the plane algebra —
say, a sign convention or a new plane — must be made in up to four places and kept in sync by
hand.

> [!IMPORTANT]
> This is the maintainability crux. A newcomer in six months opening
> `public/number-planes/` finds two big HTML files that *look* related, *are* related, and
> share nothing. There is no obvious answer to "where does the plane math live?" — it lives in
> all of them. The static-page constraint (no bundler in `public/`) partly forces this, but
> the mitigation is cheap and untaken: extract the shared algebra into one small
> `public/number-planes/planes.js` (plain ES module) and have both pages
> `<script type="module">`-import it. That collapses three of the four copies to one and gives
> the future React port a single file to reconcile against `numberPlanes.ts`.

### Readability of `chapter-2.html` itself

Within the file, the code is dense but followable: `S` is small and named, `render()` is one
function with commented sections (`/* PL level curves */`, `/* CR knob */`, …), and the
math mirrors the reference closely enough that the `.dc.html` doubles as documentation. The
`window.__ch2 = {get, setP}` headless hook (line 677) is a nice touch for verification. The
main readability drag is that `render()` is 155 lines of interleaved geometry and DOM
mutation with no seam between "compute" and "apply" — the very seam the reference *does* have.
Someone maintaining this will spend their time hunting which `$('id')` a given number lands
in; the reference's "return a values object" structure is easier to reason about.

---

## 5 · Theming fidelity ("works with any theme")

This is the trigger for the review, and the port mostly nails it.

**The mechanism is right.** `.nbr` derives its palette from the chrome tokens via
`color-mix` (lines 21–40), so the *chrome-facing* colors (desk, paper, ink, live, voice)
track `--bg/--card/--fg/--accent/--accent2/--rule` on any `[data-theme]`. Because every SVG
color is a CSS variable (`fill="var(--d1)"`), a skin switch through the shared picker recolors
the whole page **with no `render()` call** — the cleanest possible answer to "track the skin."
That is a real strength and the right pattern.

**Two caveats:**

1. **Only 4 of 8 skins get personality overrides.** `guide-skin.js` ships 8 skins
   (dark, light, neon, blueprint, phosphor, daylight, primary, mirage), but `chapter-2.html`
   only writes `.nbr` overrides for `light`, `primary`, `blueprint`, `phosphor` (lines 42–47).
   `dark` is correct by default (Observatory), but **neon, daylight, mirage** fall through to
   the base block — inheriting chrome accents for live/voice (fine) and the generic
   `light-dark()` hexes for the semantic plane colors. It works and stays legible (the
   `light-dark()` split keys off `color-scheme`, which `guide-theme.css` sets per skin), but
   it is untuned: e.g. on Daylight the plane-blue `#2b57c9` sits next to the chrome accent-blue
   `#2f6fe0` and may read as a near-miss rather than a deliberate pair.

2. **Semantic colors are semi-hardcoded.** `--d1/--ok/--d5` use fixed `light-dark()` hex pairs
   (lines 34–36), not chrome tokens. The handoff says "map onto the app's theme tokens; do not
   hard-code hex," but it *also* says "keep these meanings across skins." Those pull in
   opposite directions, and the port chose *stable semantics over token-mapping* — a
   defensible reading (blue=complex/green=dual/orange=split should not lurch skin to skin), and
   the inline comment owns the choice. I'd flag it as an intentional deviation to confirm with
   Dan, not a bug.

---

## 6 · Findings

| id | sev | category | one-line |
|---|---|---|---|
| consultant-1 | P1 | correctness | Renormalize/tilt tweens aren't cancelled by `setP`; a chip/CR/DV click mid-animation is clobbered on the next frame. |
| consultant-2 | P2 | a11y | JS rescale/tilt animations ignore `prefers-reduced-motion` (only CSS transitions are killed). |
| consultant-3 | P2 | perf | `render()` clears/rebuilds innerHTML on 6 groups + re-sets 34 attrs every pointer-move; no rAF coalescing; rect read per move. |
| consultant-4 | P2 | correctness | Clicks on the plot / caption / empty space inside C2 or PL toggle the plate lock (plot SVGs lack `data-dragel`). |
| consultant-5 | P2 | coherence | Plane algebra duplicated across `notebook.html`, `chapter-2.html`, `numberPlanes.ts`, and the reference — no shared module. |
| consultant-6 | P2 | architecture | The imperative `render()` is throwaway for the React target; the handoff's own `renderVals()` is already closer to the destination. |
| consultant-7 | P3 | polish | `class="phх"` (line 284) uses a Cyrillic `х` (U+0445); dead class, leftover from the reference's `{{ phDV }}` swap. |
| consultant-8 | P3 | correctness | No `pointercancel` handling; `pd`/`ad`/`crd` drag flags can stick after an interrupted touch. |
| consultant-9 | P3 | design-fidelity | Only 4 of 8 skins get `.nbr` overrides; semantic `--d1/--ok/--d5` are fixed `light-dark()` hex, not chrome tokens. |
| consultant-10 | P3 | coherence | Flip/lock UI state lives only in DOM (`data-on`), not in `S`; `window.__ch2` can't observe it; `c2Hint` is mutated outside `render()`. |

---

## Verdict

**Keep it, ship it as a static page, and do not carry its render layer into the app.**

The port does the hard, important thing correctly: it proves the "one `p`, all views derived
in one pass" contract on the real guide-theme layer, across the 8 app skins, with a live-recolor
theming mechanism that is genuinely the right pattern. The state shape and the math are a
faithful, portable transcription of the reference — a React engineer lifts `S` and the
derivations wholesale.

The reservations are (a) a small set of real seams — the un-cancelled tweens (P1), the
plot-click lock toggle, the reduced-motion gap, the missing `pointercancel` — that should be
closed before this is billed as *the* reference implementation; (b) a render layer that is
both wasteful (per-frame innerHTML churn) and destined for the bin, when the handoff already
shipped a declarative version to copy instead; and (c) a growing duplication problem — two
big public HTML files and a canonical `.ts` engine, all re-deriving the same algebra with no
shared code.

Concretely, for the next session I'd: fix consultant-1 (two lines) and consultant-2/4/8;
extract `public/number-planes/planes.js` and de-duplicate the two static pages against it
(consultant-5); and when the React port begins, diff against the reference's `renderVals`,
using `chapter-2.html` only as the proof that the contract and the theming hold — not as the
code to translate.

---

## Self-reflection

1. **What would you do with another session?** Actually run the page in a browser (desktop +
   a throttled mobile profile) and *measure* the per-frame render cost during a z/w drag, so
   the consultant-3 jank claim moves from reasoned to quantified. I'd also reproduce
   consultant-1 (click a chip mid-rescale) and consultant-4 (click the plot background) on a
   live build to confirm the exact user-visible behavior rather than inferring it from the
   handler order.

2. **What would you change about what you produced?** I leaned toward code-level detail over
   product framing; a session focused on "should both artifacts even coexist" would weigh the
   two-artifact UX (do readers understand `notebook.html` and `chapter-2.html` are one work?)
   more than I did. I treated that as a coherence finding rather than a first-class question.

3. **What were you not asked that you think is important?** Whether `chapter-2.html` should be
   *registered as a route* or stay an unlinked `public/` page. Right now it is reachable only
   by direct URL and its own cross-links; there's no gallery/nav entry, so its discoverability
   and its relationship to the eventual `#/number-plane` app are unstated.

4. **What did we both overlook?** The reduced-motion gap (consultant-2) isn't in the brief's
   list of concerns and is easy to miss because a CSS reduced-motion rule *is* present — it
   just doesn't cover the JS tweens. It's the kind of thing that passes a glance and fails a
   real assistive-tech user.

5. **What did you find difficult?** Calibrating severity on consultant-4 and consultant-9:
   both are faithful to the reference/handoff, so "is this a defect or a deliberate design
   choice I'm second-guessing?" required holding the spec and the code side by side. I ranked
   them by user-visible surprise, not by deviation from spec.

6. **What would have made this task easier?** A running preview I could open, and a one-line
   note on whether the semantic-color hardcoding was a conscious call (the inline comment
   suggests yes, but confirmation would let me downgrade consultant-9 to a note).

7. **How did you verify this, and does each passing check test the user-visible claim?**
   Method: **reasoning + static code reading only** — I read `chapter-2.html`, the reference
   `.dc.html`, `guide-theme.css`, `guide-skin.js`, and grepped `notebook.html`, and I verified
   the concrete facts (Cyrillic codepoint via `repr`, innerHTML/setAttribute counts, absence of
   `cancelAnimationFrame`/`pointercancel`) with `grep`/`python3`. The code-fact findings
   (consultant-1,3,5,7,8,9,10) are confirmable by reading the cited lines. The **behavioral**
   claims (consultant-4's lock-toggle-on-plot-click; consultant-1's mid-animation clobber) are
   *reasoned from the handler order and the animation loop*, **not observed in a browser** —
   they should be confirmed live. Perf/jank on mobile (consultant-3) is **reasoned, not
   measured**. Signals: `visual-unverified`, `phone-needed`.

8. **Follow-up value:** MEDIUM — the analysis is complete and the code-fact findings are solid,
   but the two behavioral findings and the mobile-perf claim were verified by reasoning only
   and warrant a quick live confirmation before acting on them.
