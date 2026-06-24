---
kind: handoff
session: 2026-06-14-S01
date: 2026-06-14
title: Complex guide series (split + aligned) + session-dashboard signals/to-do/App-map
branch: claude/complex-particles-guide-tdlhk0
slug: complex-particles-guide-tdlhk0
status: completed
build: passed
followup: null
pr: null
app: docs, complex-particles, chrome
signals: phone-needed
next: Decide the plane/particles unification (backlog !high), then a real-device mobile pass on the guides.
---

# Complex guide series + session-dashboard productionization

> [!NOTE]
> Two workstreams this session, both on branch `claude/complex-particles-guide-tdlhk0`,
> neither merged yet. (1) A **documentation** series under `public/*-guide.html`.
> (2) A **session-tooling** upgrade under `docs/sessions/` (signals + to-do +
> App-map). The only app/TS change all session was one additive embed param
> (`pattern=`) built early on; everything else is static HTML + the Node session
> builder. `npm run build` passes throughout.

## Summary

Started as a math-and-code guide series for the Complex Particles / Plane Transform
viewers, then split the two heaviest guides into parts and aligned the "bare plane"
figure to a linear particle plot. The session then pivoted (at the user's request)
to **productionizing the session-report dashboard**: a closed signal vocabulary, a
hand-curated `TODO.md` backlog, an auto "Start here" digest, filter-aware panels, an
**App-map** view, full-history signal inference, and the agent-facing docs/skills to
keep it fed. Everything is committed + pushed; **state is stable and shippable**.

## What changed

### A · The guide series (`public/`, indexed by `guides.html`)
Eight cross-linked pages. The math trilogy — **What the functions do**
(`complex-functions-guide.html` + `…-2-guide.html`), **From 4D to your screen**
(`complex-particles-guide.html` + `…-2-guide.html`), **How the surface is drawn**
(`complex-rendering-guide.html`) — plus three "going deeper" pages (color, sampling,
plane-transform). The two longest were **split into Part 1 / Part 2** (original
filename = Part 1, so inbound links still resolve) to cap each page at ≤3 live WebGL
applets. **Plane/particles alignment:** the functions guide's bare-plane figure now
uses `#/embed/complex-particles?fn=linear&proj=dropv`; Plane Transform is reserved
for true two-pane transformations.

### B · Session-dashboard productionization (`docs/sessions/`)
- **Closed `SIGNALS` vocab** in `categories.mjs` (needs-dan · phone-needed ·
  visual-unverified · not-live) + flat `signals:` / `next:` frontmatter, parsed per
  report. Explicit wins; only `high-followup` (reflection level), `needs-dan`
  (proposed plans), and `not-live` (report absent on `main`) are **inferred**, so the
  whole 102-report history backfills without editing old files.
- **`TODO.md`** — a hand-edited backlog (the durable to-do list with notes), rendered
  as the top **"To-do"** panel. **"Start here"** digest is the auto counterpart. Both
  are **filter-aware** (pick a category → they narrow to that app).
- **App-map** view (4th, beside Cards/Timeline/Reflections): per-app rollup of latest
  · risk · open (signals + backlog count) · next, sorted worst-risk-first.
- **Taxonomy:** added `docs` and `trees-and-nets` categories.
- **Agent-facing:** `REPORT_STYLE.md §1.2`, both templates, and the handoff +
  start-session skills now author/consult `signals:`/`next:` + the backlog.

> [!CAUTION]
> The `not-live` signal = "the report's path is absent on `main`". Do **not** use a
> git `is-ancestor` check on the dedupe winner ref — a branch forked from main
> contains all of main's history, so every old report looks unmerged (this bug first
> read "Not landed: 40"). Verify the path-on-main test still behaves once a feature
> branch is squash-merged + deleted (backlog `!low`).

## Key files

| File | Role |
|---|---|
| [`docs/sessions/build-sessions.mjs`](https://github.com/piyarsquare/animath/blob/8c67231/docs/sessions/build-sessions.mjs) | The control-center builder: signal rollup, TODO parser, Start-here/To-do panels, App-map, filter JS |
| [`docs/sessions/categories.mjs`](https://github.com/piyarsquare/animath/blob/8c67231/docs/sessions/categories.mjs) | Category + closed `SIGNALS` vocabularies, `normalizeSignals`, chips |
| [`docs/sessions/TODO.md`](https://github.com/piyarsquare/animath/blob/8c67231/docs/sessions/TODO.md) | The hand-edited backlog (format spec in its header) |
| [`docs/sessions/REPORT_STYLE.md`](https://github.com/piyarsquare/animath/blob/8c67231/docs/sessions/REPORT_STYLE.md) | §1.2 documents `signals:`/`next:` + the backlog workflow |
| [`public/guides.html`](https://github.com/piyarsquare/animath/blob/8c67231/public/guides.html) | Guide-series index hub |
| [`public/complex-functions-guide.html`](https://github.com/piyarsquare/animath/blob/8c67231/public/complex-functions-guide.html) | Functions Pt 1 (+ `…-2-guide.html`); projections split mirrors it |
| [`src/animations/ComplexParticles/embedParams.ts`](https://github.com/piyarsquare/animath/blob/8c67231/src/animations/ComplexParticles/embedParams.ts) | Embed URL params incl. the `pattern=` addition + `buttons=` overlay |

## Open / not done

From `TODO.md` (the live list), highest-value first:
- **`!high` plane/particles unification** — one "which plane am I looking at"
  convention across the viewers + guides. This is the original product question that
  started the session; it's a **decision for Dan** (`needs-dan`).
- **`!med` real-device mobile pass** on the guide pages (desktop-verified only;
  iframes pinned to 400px). `phone-needed`.
- **`!low` split the rendering guide 2+2** — the only guide page still at 4 applets.
- **`!med` App-map polish** — open-from-chip, link "N backlog" to the filtered To-do.
- **`!low` confirm `not-live`** flips to landed after a real squash-merge.
- **Not a PR yet** (`pr: null`). To finalize: `git fetch && git merge origin/main`,
  keep every app's append-only entries, re-run `npm run build`.

## Context

- Guides live in `public/` (copied to the Pages root by deploy); not part of the SPA
  bundle. The session dashboard builds with `npm run sessions`
  (`build-sessions.mjs`) and ships to `/animath/sessions/control-center.html`.
- `control-center.html` + `converted/` are **generated** (regenerated on deploy) —
  don't hand-edit or commit them; edit the builder/reports and run `npm run sessions`.
- The builder reads reports from each branch's **git ref read-only**; `TODO.md` is
  read from the working tree. To enrich an old report, edit it on whatever branch is
  newest (latest copy wins the dedupe) — but prefer inference over bulk edits.
- Preview an embed headlessly: `npm run build && (npm run preview &)` then
  `node scripts/shoot.mjs 'embed/complex-particles?fn=linear&proj=dropv' out.png`.

## Self-reflection

1. **What would you do with another session?** Take the `!high` plane/particles
   unification (the original ask) — it needs a decision from Dan first, then guide +
   possibly viewer alignment. Otherwise: App-map polish and the mobile pass.
2. **What would you change about what you produced?** The eight guide pages each
   duplicate the same `<head>`+CSS; a shared partial would stop drift. And the
   "Start here" / "To-do" panels are server-rendered then filtered client-side —
   clean, but a single client render path would be tidier.
3. **What were you not asked that you think is important?** Discoverability — the
   guides and the control center are URL-only; nothing in-app links to them.
4. **What did we both overlook?** Mobile, on both fronts: the guides are
   desktop-verified only, and the control-center panels/App-map grid weren't checked
   at phone width.
5. **What did you find difficult?** Judging signal-inference precision without a
   large labelled set — I deliberately kept it conservative (structured fields only)
   so the dashboard wouldn't cry wolf, which the modest, correct bucket counts bore
   out.
6. **What would have made this task easier?** A couple of already-merged feature
   branches to test `not-live` against a real squash-merge, rather than reasoning
   about it.
7. **Follow-up value:** LOW — both workstreams are complete, build green, and
   verified (guides on desktop; dashboard end-to-end headless). Remaining items are
   the user's product decision + polish, not corrections.
