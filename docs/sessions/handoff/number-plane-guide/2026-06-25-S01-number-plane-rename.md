---
kind: handoff
session: 2026-06-25-S01
date: 2026-06-25
title: Number Planes explorable page + a themed "gallery for guides" (provisional)
branch: number-plane-guide
slug: number-plane-guide
status: completed
build: passed
followup: medium
pr: https://github.com/piyarsquare/animath/pull/244
app: argand, docs
signals: needs-dan
next: Get Dan's call — keep the guides as a standalone themed static section, or promote them into the chrome as a real #/guides route (native skins, no drift) — then finish the 4 stub lenses + build the #/embed/number-planes applet.
---

# Number Planes explorable page + a themed "gallery for guides" (provisional)

> [!IMPORTANT]
> Everything here is a **provisional probe** awaiting one design decision from Dan
> (**standalone static** vs **promote into the chrome**). The page works and is
> committed; it is *not* a finished feature. Dan wants to study the gallery next
> session.

## Summary

Continuing the Argand → "Number Planes" work. Built two connected things as
**prose-first, fully-reversible static probes** under `public/`: (1) an explorable
**Number Planes** teaching page (`number-planes.html`) structured as *one core
circled from many lenses*, with a carried `j²` choice that rewrites the prose live;
(2) a **"gallery for guides"** (`guides.html` + a shared `guide-theme.css` /
`guide-skin.js`) that mirrors the app's 8 skins on the same `[data-theme]` and the
same saved-skin key, so a skin chosen in the app carries into the guides. Work moved
to a clean branch **`number-plane-guide`** → **PR #244** (old auto-named PR #241
closed). All three Codex P2 review comments fixed; CI green; build green.

## What changed (all in `public/`, plus session docs)

- **`number-planes.html`** — the explorable page. A **hub** (the choice `j²=p` + the
  trichotomy) ringed by **lenses** you return to; a carried `j²` choice (Spin/Shear/
  Boost) fills every `.pp` span from `data-spin/shear/boost` and retints the page.
  Fully written lenses: **Multiplication · Magnitude · Rails (the heart) ·
  Iteration**; teaser-stubs: The algebra · The circle of planes · Where it shows up ·
  ◆ Higher (quaternions leaf). Applet `<figure>`s are styled placeholders.
- **`guide-theme.css`** — 8 skins (Observatory/Paper/Spectrum/Blueprint/Phosphor/
  Daylight/Primary/Mirage) on `[data-theme]`, token values copied from
  `src/chrome/theme.css`; `color-mix` derives soft tints. Phosphor goes mono.
- **`guide-skin.js`** — a skin picker reading/writing the **same** key as the chrome
  (`animath:v1:chrome:skin`); applies `[data-theme]` from `<head>` (no flash).
- **`guides.html`** — rebuilt as a themed gallery (featured Number Planes card +
  the existing complex-viewer guides as cards).
- **Three review fixes:** sticky chooser+ring overlap → one `.topstick` region;
  nested `<a>` in guide cards → `<div>` cards with a stretched title link; the
  Iteration lens's unqualified fixed point → qualified for singular `1−α`.

## Key files

| File | Role |
|---|---|
| [`public/number-planes.html`](https://github.com/piyarsquare/animath/blob/b3b07d9/public/number-planes.html) | The explorable page (hub + lenses + carried `j²`); the JS nav is at the bottom |
| [`public/guides.html`](https://github.com/piyarsquare/animath/blob/b3b07d9/public/guides.html) | The themed "gallery for guides" |
| [`public/guide-theme.css`](https://github.com/piyarsquare/animath/blob/b3b07d9/public/guide-theme.css) | 8-skin mirror of `theme.css` for static guides (drift risk — see Context) |
| [`public/guide-skin.js`](https://github.com/piyarsquare/animath/blob/b3b07d9/public/guide-skin.js) | Skin picker sharing the chrome's saved-skin key |
| [`src/animations/Argand/numberPlanes.ts`](https://github.com/piyarsquare/animath/blob/b3b07d9/src/animations/Argand/numberPlanes.ts) | Dormant math engine (50 tests); basis for the planned `#/embed/number-planes` applet |
| [`…/argand-plane-review-51egvz/2026-06-24-S01-plan-number-planes-page.md`](https://github.com/piyarsquare/animath/blob/b3b07d9/docs/sessions/progress/argand-plane-review-51egvz/2026-06-24-S01-plan-number-planes-page.md) | The Number Planes narrative/plan this page realizes |

## Open / not done

- **THE decision (needs Dan):** keep the guides as a **standalone themed static**
  section, or **promote into the chrome** as a real `#/guides` route (native skins,
  no drift). This gates the rest.
- **4 lens stubs** (algebra, p-space, applications, ◆ higher) need full prose.
- **No live applets yet** — `numberPlanes.ts` has no `#/embed/` route. The planned
  first one: the `j²` dial + the "find the rails" change-of-basis morph (the key
  interaction) + an orbit.
- **6 legacy complex guides aren't reskinned** — opening one from a non-Paper skin
  shows a warm-paper seam. Mechanical (link the shared theme), deferred behind the
  decision.
- **Naming** still deferred ("Number Plane" vs "Number Planes").

## Context

> [!CAUTION]
> **The static guide theme will drift from the app.** It's a hand-copied mirror of
> `theme.css`. **Theming v2 (#239), merged into this branch the same day, already
> added a light/dark *mode per identity* that the mirror does not replicate.** This
> is the concrete argument for promoting the guides into the chrome rather than
> maintaining the mirror.

- **Branch/PR:** work is on `number-plane-guide` → **PR #244** (subscribed; an
  hourly check-in cron watches CI/mergeability). PR #241 closed as superseded.
- **Cloudflare preview** (browser-side; `*.pages.dev` is blocked from the sandbox):
  `https://number-plane-guide.animath.pages.dev/guides.html` and `/number-planes.html`.
- **The "circling" design** is the user's stated felt goal ("I circle these ideas
  from different perspectives"): one trichotomy (2·1·0) re-met as roots → rails →
  unit curve → orbit → algebra. Honor that recurrence in any new lens.
- Verification was real: `npm run build` green, headless `file://` screenshots
  across skins (eyeballed), DOM assertions for the two structural fixes,
  `sessions:lint --strict` 0 errors.

## Self-reflection

1. **What would you do with another session?** Get Dan's static-vs-chrome call, then
   either promote the guides into the chrome (a `#/guides` route + port
   `number-planes.html` to a themed React guide) or finish the static path; write the
   4 stub lenses; build `#/embed/number-planes` on `numberPlanes.ts` (the rails morph
   is the centerpiece); reskin the 6 legacy guides.
2. **What would you change about what you produced?** Two things. The `git commit`
   with no pathspec (after `git add` of one file) silently bundled the progress-report
   move into the fixed-point commit and broke `lint-sessions` — use an explicit
   pathspec or `git status` before committing. And I built the static theme mirror
   knowing it could drift; Theming v2 landing the same hour proved it — I could have
   pressed the chrome option harder before mirroring.
3. **What were you not asked that you think is important?** Whether the carried-`j²`
   colors should themselves be theme-aware (they're fixed hues, deliberately, but on
   some skins they may clash), and whether the 6 legacy guides should be reskinned now
   to remove the seam.
4. **What did we both overlook?** That **Theming v2 was about to land** and change the
   skin model from "8 identities" to "identity × light/dark mode." I mirrored the
   pre-v2 model; the sync caught it, but the mirror is already a step behind.
5. **What did you find difficult?** The mid-session branch migration created
   slug/folder bookkeeping that bit back as the one CI error, while PR-activity
   webhooks kept interrupting the handoff. Sequencing the fix-then-handoff cleanly
   under that took care.
6. **What would have made this task easier?** Naming the branch `number-plane-guide`
   from the start (no migration churn), and pinning the artifact (a standalone page,
   not an in-app mode) up front — both were settled only after some back-and-forth.
7. **How did you verify this, and does each passing check test the user-visible
   claim?** `npm run build` (real, green); headless `file://` screenshots across
   Observatory/Paper/Phosphor + the page on shared skins (real — I looked at the
   pixels, R1); DOM assertions that the ring sits below the chooser and there are 0
   nested anchors (real, tests the exact claims); `sessions:lint --strict` 0 errors.
   Caveats: the page's *interactivity* (carried-choice rewrite, lens nav) is verified
   by headless DOM + screenshots, not a real device — the "feel" of the circling UX
   is unproven with a real reader. The **applets are placeholders** (no executable
   claim). The teaching **correctness** is reasoning; the fixed-point error was caught
   by a reviewer, not by me — a reminder that prose math needs the same scrutiny as
   code. `signals: needs-dan` set.
8. **Follow-up value:** MEDIUM — the probe is shipped, correct, and CI-green, but it's
   a provisional design awaiting Dan's structural decision, 4 lenses are stubs, the
   applets are unbuilt, and the static theming is already drifting from Theming v2.
