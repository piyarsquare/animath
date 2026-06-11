---
kind: three-hats
session: 2026-06-10-S01
date: 2026-06-10
title: Three hats — Framework Maintainer on CHROME-REVIEW
branch: claude/app-chrome-overhaul-lnqgle
slug: app-chrome-overhaul-lnqgle
status: completed
build: unknown
---

# Three hats — Framework Maintainer on CHROME-REVIEW

*Hat: long-time maintainer of the animath chrome. I lived through the AppShell →
workspace migration (PR #200), I deleted the ActionFloater/PlaybackFloater/
QuarterTurnBar with my own hands, and I am the one who gets paged when a
parallel app branch can't merge. I verified every factual claim in
`docs/redesign/CHROME-REVIEW.md` against the code on this branch before
writing a word of opinion.*

## Plan under review

<details>
<summary>Original request</summary>

> "I would like you to run a design review of the Chrome for all of the
> different applications. something I think we did not address properly in the
> original design spec is that some spaces require buttons to be present.
> always on screen. for example, an app without a play button for things like
> stable matching generates an unsatisfying result. the user does not know
> where to begin. another issue I have found is that in full screen mode, I
> sometimes still want to access some controls. One other catch is treating
> the planer plots as two different windows in the complex plane plot code."

— followed by: "I think a three hats review of your plan and plan documents is
an excellent idea. please begin."

</details>

The full plan is **`docs/redesign/CHROME-REVIEW.md`** (2026-06-10, this
branch). Its proposals, condensed so this report is self-contained:

| ID | Proposal | Mechanism | Size |
|---|---|---|---|
| **P1** | Chrome-level **action strip** | `WorkspaceProps.actions?: ActionDef[]` — ≤5 always-on buttons (play/step/reset verbs), bottom-center pill on desktop, persistent row above the dock on phone, survives fullscreen; a *projection* of an existing drive/playback panel, not a 12th archetype | M |
| **P2** | Per-view **start hints** | `ViewDef.hint?: string` — dismissable overlay until first pointer interaction ("drag to pan", "click to pick c") | S |
| **P3** | Legitimize the **HUD** | `ViewDef.hud?: React.ReactNode` — chrome-rendered overlay inside the view body; TopologyWalk/PolygonWorlds MovePads migrate into it | M |
| **P4a** | **Fullscreen keeps controls** | `.am-has-full .am-ws-panel { z-index: 110 + z }` so rail-opened panels float above the fullscreen view; staged Esc (peel topmost layer first) | S |
| **P4b** | Phone fullscreen dock/sheet access | Sheet + scrim above the fullscreen card; keep the dock visible | S |
| **P5** | **Split view** primitive | `ViewDef.panes?: {id,title,node}[]` — one window body renders a flex row; Plane Transform becomes one window with two panes (matching its embed) | M |

Recommended order: P4a → P1 → P5 → P2 → P3 → P4b. Spec deltas: action-strip
and split-view clauses in DESIGN-SPEC §2; §3 stays at 11 archetypes;
fullscreen note (rail live, panels float, Esc peels).

## Fact check — F1–F11 against the code

I read the chrome (`types.ts`, `Panel.tsx`, `ViewWindow.tsx`,
`DesktopWorkspace.tsx`, `PhoneWorkspace.tsx`, `layouts.ts`, `theme.css`) and
the cited apps (StableMatching, PlaneTransform + `polarViews.ts`,
TopologyWalk, FractalsGPU, Correspondence). Verdict per claim:

| Claim | Verdict | Evidence |
|---|---|---|
| F1 — phone opens every app inert | **Correct** | `PhoneWorkspace.tsx:24` — `sheet` starts `null`; no panel content until a dock tap. Dock is icons+labels only; nothing marks the starting panel. |
| F2 — desktop right by default, fragile | **Correct** | `closePanel` sets `layout:'custom'` and persists under `ws:<appId>` (`DesktopWorkspace.tsx:117-123`); Compact is `open:{}` (`layouts.ts:14`); the empty-stage hint (`DesktopWorkspace.tsx:268-273`) names no panel. |
| F3 — HUD apps went around the chrome | **Correct** | `TopologyWalk.tsx:344` (`<MovePad>`), with the per-app gesture-isolation workaround documented in the comment at lines 331–334, exactly as cited. |
| F4 — three apps hide their drive panel on desktop | **Correct** | PlaneTransform default `essentials` opens function+color, not `curves` (`PlaneTransform.tsx:478-487`); FractalsGPU `essentials` opens set+palette, not `trace` (`FractalsGPU.tsx:517-520`). Correspondence's `explore` *does* open Seed — the review correctly classifies it as "unhinted view click" rather than hidden. Minor nit: the audit table calls the panel "Draw"; the section is titled **Curves** (the *layout* is named Draw). |
| F5 — rail clickable above fullscreen, panel opens unseen | **Correct, and I confirmed the exact mechanism** | `.am-stage { isolation: isolate }` (`theme.css:168`) contains all window z-values; `.am-stage.am-has-full { z-index: 100 }` raises the stage above the top bar (z 30, `theme.css:184`); inside the stage, railwrap z 200 (`theme.css:322`) > fullscreen view z 100 (`theme.css:396`) > panels inline `30 + z` (`Panel.tsx:33`). A real latent bug. |
| F6 — Esc-only exit; phone Esc clears both layers | **Correct** | `DesktopWorkspace.tsx:51-56`; `PhoneWorkspace.tsx:50-59` (`setSheet(null); setFull(null)` in one handler). The review correctly credits the header shrink button. |
| F7 — immersion vs. access | Judgment call, fair | Matches the user's stated need verbatim. |
| F8 — no pairing concept in the engine | **Correct** | `workspace/types.ts` — `ViewDef`/`ViewState`/`LayoutDef` have no linkage of any kind. |
| F9 — Plane Transform fakes the link; mismatch breaks it | **Correct mechanism, one overstatement** — see below | Shared `viewExtent`, zoom force-locked (`PlaneTransform.tsx:458,472` exactly as cited); inscribed-square letterboxing (`useInscribedSquare`, `PlaneTransform.tsx:575-594`); curve SVG maps through it (`PlaneTransform.tsx:605-635`; the cited `polarViews.ts:72-85` is the math→NDC half of that pipeline). |
| F10 — embed shows the right model | **Correct** | `PlaneTransform.tsx:491-533` — one `.am-embed-row` with two equal flex panes. |
| F11 — Correspondence is linked semantically, independent viewports by design | **Correct** | Independent extents per pane; the zoom-lock *toggle* is already a carried-forward item in IN-PROGRESS ("Linked-view extras"). |

> [!WARNING]
> **The one overstatement — F9's "geometrically wrong".** The review claims
> mismatched panes make drawn curves "**geometrically wrong**, not just ugly."
> I traced the pipeline: curves are stored in *math* coordinates
> (`mathFromClip` on capture), the output curve is `f(curve)` in math
> coordinates, and each pane independently renders via `clipFromMath` into its
> *own* inscribed square. Each pane therefore stays internally self-consistent
> at any window size. What mismatched panes actually break is the **equal-scale
> side-by-side reading** — the two pictures render at different pixels-per-unit,
> so the visual correspondence (the whole point of the app) degrades, and
> collapse/fullscreen/layouts can hide half of it outright. That is a real
> problem worth P5; it is not *incorrect geometry*. The fix's priority survives
> the correction, but the report should not ship with an inflated claim — a
> future reader will check it, find it wrong, and discount the rest.

> [!NOTE]
> **A latent bug the review missed, adjacent to F5:** z counters are
> **unbounded and persisted**. Every raise sets `z = topZ + 1`
> (`DesktopWorkspace.tsx:126-132,170-176`) and the value round-trips through
> `ws:<appId>`; `sanitize()` never normalizes it. After ~70 raises in an app's
> lifetime, `30 + z ≥ 100` and a panel floats *above* the fullscreen view
> **today** — so F5's "panels render below" is actually nondeterministic, and
> P4a's `110 + z` inherits the same unboundedness (a panel eventually rises
> past the rail at 200). Whoever implements P4a should add z-normalization to
> `sanitize()`/`applyLayout` (compress to rank order) in the same PR. Cheap,
> and it makes the fullscreen layering deterministic forever.

Overall: **10 of 11 findings fully verified, with exact-line citations that
held up.** This is the best-grounded design doc this repo has had; the audit
table alone is worth committing.

## P1 — the action strip vs. the "Deliberate removals" ledger

This is the question I was given this hat to answer: IN-PROGRESS says, under
**Deliberate removals (do not resurrect without discussion)**:

> The old **draggable floater** → replaced by openable `drive` panels you can
> place beside the plot.

Does P1 resurrect the ActionFloater/PlaybackFloater? **No — and the review's
own constraint is what saves it, so that constraint must be load-bearing, not
decorative.** What we removed was a *draggable, app-authored, free-form
floating container* — a second panel system with its own drag code
(`useFloaterDrag`), its own styling, and no vocabulary. P1 proposes the
opposite shape: **fixed-position, chrome-owned, non-draggable, buttons-only,
≤5, and explicitly a projection of an existing drive/playback section.** The
old floaters competed with the panel system; the strip is subordinate to it.
This *is* the discussion the ledger asked for, and on the merits I'd approve
it — F1 is real (I confirmed phone starts inert in every app) and the user
reported the desktop version of the same pain unprompted.

> [!IMPORTANT]
> But the constraint will not survive contact with apps unless the **type
> enforces it**. `ActionDef` as proposed (`icon`, `label`, `onClick`,
> `active?`, `primary?`) is one optional field away from becoming
> PlaybackFloater again — the first app that wants a speed slider "just this
> once" re-litigates the removal. My asks before P1 lands:
>
> 1. **Buttons only, structurally.** No `node: ReactNode` escape hatch in
>    `ActionDef`, ever. The comment "sliders stay in panels" should also be a
>    code-review rule written into DESIGN-SPEC §2.
> 2. **Cap enforced in code** (`actions.slice(0, 5)` with a dev warning), not
>    in prose.
> 3. **Consider `sectionId?: string`** on `ActionDef` — tapping a strip button's
>    long-press/overflow (or just documenting the association) ties the verb
>    back to its panel, making "projection of a panel" checkable rather than
>    aspirational. Optional, but it would also fix discoverability twice: the
>    strip teaches the rail.
> 4. **Update IN-PROGRESS in the same PR**: the removals ledger gets a line —
>    "action strip ≠ floater: fixed, chrome-owned, buttons-only; approved
>    2026-06" — so the next agent doesn't have to re-derive this paragraph.

One omission in the review: **the strip needs a stance on the `ws:<appId>`
persistence model**. It's not a window, so presumably it has no entry in
`PersistedWorkspace` — good, keep it that way (it can never be closed, so it
has no state). Say so explicitly in the spec delta, or someone will "helpfully"
make it collapsible and persist that.

## P4 — fullscreen: right diagnosis, right-sized fix

P4a is the part I'd merge tomorrow. It is a **bug fix dressed as a feature**:
the rail already floats above fullscreen (z 200 vs 100), so clicking it
already mutates `state.open` — the panel just renders at `30 + z` under the
overlay. Raising open panels to `110 + z` inside `.am-has-full` makes the
existing behavior visible instead of broken. No new components, no new state,
one CSS rule plus the staged-Esc change. It also honors the framework's two
sacred invariants — **hide-don't-unmount** and **CSS-only fullscreen** —
because nothing about the DOM structure changes.

Operational notes from the maintainer's chair:

- **Staged Esc on desktop** is a behavior change to `DesktopWorkspace`'s
  keydown handler plus, implicitly, an ordering question with the menus/modals
  (which currently have their own Esc handling). Keep the peeling order
  explicit: menu/modal → topmost panel? No — **menus/modals first, then
  fullscreen; do NOT make Esc close panels.** Panels are closed via ✕ today;
  if Esc starts closing panels in fullscreen, it behaves differently from
  non-fullscreen mode and users will lose arrangements. The review says "close
  topmost panel/menu first" — I'd amend to *menu/sheet* first, never panels.
- **The top bar stays buried** (z 30 < stage 100) — which means in fullscreen
  there's still no Layout menu, no mode pills, no "?" explainer. That's fine
  (immersion) but the review should state it's deliberate.
- **Snap math in fullscreen:** panels dragged over a fullscreen view snap
  against `allRects` which includes the fullscreen view's measured rect (it's
  in `viewRefs`, now reading as inset-0 fixed). Probably harmless — the stage
  edges still bound — but test that dragging a panel doesn't try to dock
  against a viewport-sized rect in a weird way. One manual check, since
  `npm run build` proves nothing about behavior.
- **P4b (phone)**: keeping the dock visible in fullscreen effectively redefines
  phone fullscreen as "hide the other cards," which matches what the code
  already does spiritually (`.am-phone-view.am-ws-full` is just fixed inset-0).
  Cheap and honest. Fine as a follow-up; agreed it's last in the order.

## P5 — split view: the right primitive, learned from the embed

I want to like this less than I do, because "add a field to `ViewDef`" is how
frameworks bloat. But the evidence is unusually good:

- The **embed route already shipped the model** (F10) and it works — this isn't
  speculative design, it's promoting a proven layout into the workspace.
- The current two-window arrangement was a **migration convenience, not a
  design decision**: the comment in `PlaneTransform.tsx:441-442` says "the two
  panes are separable subtrees, so each gets its own view window" — i.e. we
  split them because we *could*, during Phase 4, under deadline. The shared
  `viewExtent` zoom-lock (458/472) is the app fighting the chrome to undo
  that split. P5 ends the fight.
- The scope fence is correct: **Correspondence stays two windows** (F11).
  Independent pan/zoom is a feature there; the review resisting the urge to
  generalize "linked views" into one mechanism is exactly the restraint I'd
  hope for. One primitive, one consumer, one proven layout.

Implementation cautions:

- `panes` makes `node` dead when present — that's an awkward union. Prefer
  `node: ReactNode | { panes: PaneDef[] }` or a discriminated shape over "one
  field silently ignores the other"; `tsc` is our only CI, let it work.
- **Hide-don't-unmount applies inside the split too**: if a future "stack panes
  on narrow" mode reflows them, the pane nodes must not remount (each pane
  holds a Three.js renderer). Flex direction changes are fine; conditional
  rendering is not. Write that in the spec delta.
- The "optional draggable divider later" — strike "later" items from the type
  now. Equal split only; add the divider when an app needs it.
- Per-app migration churn is contained: Plane Transform's `views` array
  changes shape and its old `ws:plane-transform` persisted state (two view
  rects) gets orphaned — `sanitize()` handles unknown view ids by falling back
  to defaults, so this degrades gracefully. Verify once by hand.

## P2 / P3 — hints and HUD: fine, in that order, and P3 is the scope risk

- **P2 (hints)** is cheap and self-erasing. One worry: "until the first pointer
  interaction" needs a persistence decision — per session (fine, `useState`)
  or forever (`usePersistentState`)? Recommend **per session**: a returning
  user paying one glance is cheaper than a localStorage key per view per app.
  Do not put it in `ws:<appId>`.
- **P3 (HUD)** is the only proposal where I'd say *prove it with the second
  consumer before generalizing*. TopologyWalk's overlay isn't just a MovePad —
  it's MovePad + mini-maps + caption text, with careful pointer-isolation
  layering (`TopologyWalk.tsx:331-373`). If `ViewDef.hud` only absorbs the
  MovePad while the mini-maps stay app-rendered, we've added a chrome concept
  that splits one overlay into two systems. Either `hud` takes the whole
  overlay subtree (then it's just "a node rendered above the canvas with
  pointer-events handled" — barely a feature), or it takes structured
  affordances (then it's a new vocabulary, which §3's "stays at 11" promise
  strains against). The review's own distinction (strip = app-scoped
  transport, HUD = view-scoped manipulation) is good prose but the type as
  proposed doesn't encode it. **Recommendation: implement P1/P2/P4/P5 first;
  revisit P3 with the lessons.** It's correctly last-but-one in the order;
  I'd be comfortable cutting it from this branch entirely.

## Parallel-branch safety & operational reality

| Concern | Assessment |
|---|---|
| Shared-file churn | All five proposals live in `src/chrome/workspace/` + `theme.css` — shared chrome, but **additive** at the API surface (`actions?`, `hint?`, `hud?`, `panes?` are all optional). Existing apps compile untouched. App branches in flight only conflict if they edit the same chrome files, which the append-only rule already forbids them from doing. Good. |
| Migration coupling | P5 touches one app (PlaneTransform), P3 touches two (TopologyWalk, PolygonWorlds), P1 touches every app *that opts in* — stage the opt-ins as small per-app commits so a parallel branch merging `main` later gets clean appends. |
| CI reality | `npm run build` validates none of this behaviorally. The review's z-index claims were verifiable by reading; the *fixes* need a manual sweep — fullscreen × (rail click, Esc, phone sheet) × a couple of skins, plus the existing `scripts/shoot.mjs` screenshot pass. Budget that into each item; nothing here is testable any other way. |
| Persistence schema | `PersistedWorkspace.v` stays at 1 throughout — none of the proposals add persisted fields except P2-if-persisted (recommended against) and phone card heights (already shipped). Good; no migration code needed. |
| Spec discipline | The review proposes its own DESIGN-SPEC deltas and keeps §3 at 11 archetypes by classifying strip/HUD as *placements*. That's the right move and the kind of hygiene PR #200 established. IN-PROGRESS already carries the cross-reference (line 84–88). |

## Scope check

The boundary is mostly clean: six items, each mapped to a finding, sized, and
ordered with the user's actual pain first. Items 1–2 (P4a, P1) directly answer
two of the three reported gaps; item 3 (P5) answers the third. **Items 4–6 are
the maintainer's "while we're in here" tax** — defensible (F3/F4 are real),
but if the branch runs long, P2/P3/P4b are the cut line, and the review should
say so more bluntly than "round out the vocabulary." My order tweak: ship
**P4a alone as its own PR** (it's a bug fix; reviewable in minutes), then
P1, then P5, and treat P2/P3/P4b as a separate decision.

## Verdict

**Endorse, with conditions.** This is a well-grounded review: 10 of 11
factual claims verified against the code with citations that held up, the
root-cause framing ("no sanctioned place for a control that must never
disappear") is accurate, and the proposals respect the framework's invariants
(closed vocabulary, hide-don't-unmount, CSS-only fullscreen, additive optional
API). The action strip does **not** resurrect the deleted floaters *as
specified* — fixed, chrome-owned, buttons-only, a projection of an existing
panel — and I'd record that ruling in IN-PROGRESS's removals ledger.

What concerns me:

1. **F9 overstates "geometrically wrong"** — curves stay self-consistent per
   pane; what breaks is equal-scale correspondence. Correct the doc before it
   misleads a future session.
2. **P1's constraints are prose, not types.** Buttons-only and ≤5 must be
   structurally enforced or the strip becomes PlaybackFloater within three
   apps.
3. **Unbounded persisted z counters** (missed by the review) make F5
   nondeterministic today and would undermine P4a's fix — normalize z in
   `sanitize()` as part of P4a.
4. **P3 (HUD) is under-designed** — it doesn't yet absorb what TopologyWalk
   actually renders. Defer or cut; don't generalize from one consumer.
5. **Staged Esc must not close panels** — peel menus/sheets, then fullscreen;
   panels keep ✕-only semantics.

What I would change: ship P4a (+ z-normalization) as an immediate standalone
bug-fix PR; land P1 with a hardened `ActionDef`; land P5 with a discriminated
`node | panes` type; demote P2 to per-session state; park P3 and P4b behind a
second look. Update DESIGN-SPEC §2 and the IN-PROGRESS removals ledger in the
same PRs that land the code, per house rules.

## Self-reflection

1. **What would you do with another session?** Manually run the app
   (`npm run dev`) and exercise the F5 fullscreen bug and the raise-count z
   drift in a real browser — my z-index analysis is from reading
   `theme.css`/`Panel.tsx`, and stacking contexts are exactly the kind of
   thing reading gets subtly wrong. Also prototype the hardened `ActionDef`
   type to see if "buttons-only, structurally" survives TypeScript reality.
2. **What would you change about what you produced?** The P3 section gives a
   recommendation ("defer or cut") without sketching the alternative shape a
   second consumer would reveal; a paragraph on what PolygonWorlds' MovePad
   needs vs. TopologyWalk's would have made the deferral argument concrete.
3. **What were you not asked that you think is important?** Whether the action
   strip should appear in the **embed** routes (`#/embed/...`) — they're
   chrome-less today, but "play" is exactly the verb an embedded Stable
   Matching iframe would want. Deciding now avoids a second strip
   implementation later.
4. **What did we both overlook?** Accessibility of the strip and HUD: the
   review inherits DESIGN-SPEC §8's icon-button rules implicitly but never
   states tab order for always-on controls relative to the rail, and a
   fullscreen view with floating panels has no documented focus-trap story.
5. **What did you find difficult?** Adjudicating F9 — the "geometrically
   wrong" claim required tracing the full curve pipeline (capture →
   `mathFromClip` → `f` → `clipFromMath` → inscribed square) across three
   files before I could call it overstated rather than wrong.
6. **What would have made this task easier?** A running instance or the
   `shots/` screenshot sweep regenerated on this branch — several judgments
   (snap-vs-fullscreen interaction, phone dock height) are stated from code
   reading where one screenshot would have settled them.
7. **Follow-up value:** **MEDIUM** — the analysis is grounded and the verdict
   firm, but the z-index and Esc-ordering conclusions deserve one manual
   browser pass before the implementing session treats them as fact.
