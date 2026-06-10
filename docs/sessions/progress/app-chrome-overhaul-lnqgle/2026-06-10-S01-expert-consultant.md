---
kind: three-hats
session: 2026-06-10-S01
date: 2026-06-10
title: Three hats — Architecture Consultant on CHROME-REVIEW
branch: claude/app-chrome-overhaul-lnqgle
slug: app-chrome-overhaul-lnqgle
status: completed
build: unknown
---

# Architecture & Quality Consultant — review of CHROME-REVIEW.md

*External-consultant lens: pattern fit, abstraction boundaries, maintainability,
performance, and verification. No attachment to the existing code; the proposal
is judged on its merits against the shipped chrome (`src/chrome/workspace/`).*

## Plan under review

<details>
<summary>Original request</summary>

> "I would like you to run a design review of the Chrome for all of the different
> applications. something I think we did not address properly in the original
> design spec is that some spaces require buttons to be present. always on screen.
> for example, an app without a play button for things like stable matching
> generates an unsatisfying result. the user does not know where to begin. another
> issue I have found is that in full screen mode, I sometimes still want to access
> some controls. One other catch is treating the planer plots as two different
> windows in the complex plane plot code."
>
> — followed by: "I think a three hats review of your plan and plan documents is
> an excellent idea. please begin."

</details>

The full plan is **`docs/redesign/CHROME-REVIEW.md`** (2026-06-10, post PR #200,
proposals not yet implemented). Its five proposals and recommended order:

| # | Item | Size | Fixes | Summary |
|---|------|------|-------|---------|
| 1 | **P4a** — panels above fullscreen + staged Esc | S | F5, F6 | `.am-has-full .am-ws-panel { z-index: 110 + z }`; Esc peels layers |
| 2 | **P1** — action strip (desktop + phone + fullscreen) | M | F1, F2, F7 | `WorkspaceProps.actions?: ActionDef[]` — ≤5 always-on verbs, bottom-center pill on desktop, row above the dock on phone; "a *projection* of a drive/playback panel, not a twelfth archetype" |
| 3 | **P5** — split-view primitive; migrate Plane Transform | M | F8–F10 | `ViewDef.panes?: {id,title?,node}[]` — one window, side-by-side panes; Correspondence stays two windows |
| 4 | **P2** — per-view start hints | S | F4 | `ViewDef.hint?: string`, dismissable overlay until first pointer interaction |
| 5 | **P3** — `ViewDef.hud?: React.ReactNode` | M | F3 | chrome-rendered in-view overlay; migrate the hand-rolled MovePads |
| 6 | P4b — phone fullscreen dock/sheet access | S | F7 (phone) | sheet/scrim above the fullscreen card; keep the dock visible |

Key API sketch from the plan (P1):

```ts
export interface ActionDef {
  id: string;
  icon: IconName;
  label: string;
  onClick(): void;
  active?: boolean;   // e.g. play ⇄ pause
  primary?: boolean;  // at most one
}
// WorkspaceProps: actions?: ActionDef[];  // ≤ ~5; buttons only
```

---

## 1. Claim verification — is the diagnosis sound?

I checked the review's factual claims against the code before judging the
proposals. Summary:

| Claim | Verdict | Evidence |
|---|---|---|
| F1 — phone opens every app with all sheets closed | **Confirmed** | `PhoneWorkspace.tsx:24` — `useState<string \| null>(null)`; no panel content visible until a dock tap |
| F2 — desktop defaults open the playback panel but ✕ + persistence can lose it | **Confirmed** | `Panel.tsx:47-49` (close button), `DesktopWorkspace.tsx:117-123` (`closePanel` persists via `ws:<appId>`), `layouts.ts:14` (Compact = `open: {}`); empty-stage hint (`DesktopWorkspace.tsx:268-273`) indeed names no panel |
| F3 — TopologyWalk / PolygonWorlds hand-roll HUDs | **Confirmed** | `TopologyWalk.tsx:330-344` — MovePad positioned inside the view node, with a comment documenting exactly the gesture-isolation workaround the plan wants to lift into the chrome |
| F4 — drive panels hidden in default desktop layouts | **Confirmed** for Fractals (`FractalsGPU.tsx:517-522` — `essentials` opens only `set` + `palette`) and Plane Transform (`PlaneTransform.tsx:478-487` — `essentials` opens `function` + `color`); StableMatching's `run` layout opens `playback` (`StableMatching.tsx:854-855`) as the audit table says |
| F5 — rail (z 200) floats above fullscreen (z 100), panels (z 30+z) below it | **Confirmed** | `theme.css:322` (railwrap 200), `theme.css:392-396` (`.am-has-full` and `.am-ws-full` at 100), `Panel.tsx:33` (`zIndex: 30 + (state.z ?? 0)`). The rail genuinely toggles invisible panels during fullscreen — a real latent bug |
| F6 — Esc semantics | **Confirmed** | `DesktopWorkspace.tsx:51-56` (Esc → exit fullscreen only); `PhoneWorkspace.tsx:50-59` clears `sheet` **and** `full` in one keystroke |
| F8 — no pairing concept in the engine | **Confirmed** | `types.ts` — `ViewDef`/`ViewState`/`LayoutDef` are fully per-view |
| F9 — Plane Transform shares geometry/uniforms/extent; chrome can break the pair | **Confirmed in substance, overstated in one detail** — see §5 |
| F10 — embed route renders one container with two flex panes | **Confirmed** | `PlaneTransform.tsx:491-533` (`.am-embed-row > .am-embed-pane × 2`) |
| F11 — Correspondence viewports independent by design | Plausible; consistent with DESIGN-SPEC §2's "two linked views" being semantic, not geometric |
| z-index inventory table | **Accurate** against `theme.css` (30 / 70 / 71 / 80 / 200 / 100 / 50 / 45 / 40) with one nuance: panels are `25` in CSS but the **inline style is `30 + z`, unbounded** — see §4 |

The diagnosis is rigorous and honest — the audit table is real, the line
references check out, and the root-cause framing ("no sanctioned place for a
control that must never disappear; no concept of two views that must never
separate") is the correct architectural statement of all three complaints. This
is a strong review document. My findings below are mostly about *implementation
hazards the plan glosses over*, one overstated claim, and one API that needs
tightening.

---

## 2. Pattern recognition — is this invented here, or known territory?

Every proposal maps onto a well-worn pattern, which is exactly what you want:

| Proposal | Known pattern | Precedent worth copying |
|---|---|---|
| P1 action strip | **Transport bar / floating command toolbar** | Video players' transport rows; **VS Code's floating debug toolbar** is the closest analog — a small strip of verbs (continue/step/stop) whose rich configuration lives elsewhere (launch config), always on top of the editor, never closable. Figma's bottom-center toolbar is the visual precedent for "pill docked bottom-center of the stage" |
| P1 "projection of a panel" | **Command pattern** — strip and panel invoke the same command objects | Office ribbon ↔ quick-access toolbar: same commands, two surfaces, single state owner |
| P2 hints | **First-run overlay / empty-state coach mark** | Google Maps' "drag to explore"; standard, low-risk |
| P3 HUD | **In-canvas overlay layer** | Every map widget (zoom buttons over the map), video player controls over the video. Lifting gesture isolation into the chrome (one solved hit-testing layer) is the right move — TopologyWalk's comment at line 331-334 is the smoking gun that each app currently re-solves it |
| P4 fullscreen + floating controls | **Lightbox with persistent chrome**, or fullscreen video with controls overlay | Immersion and access coexist in every serious video player; the plan's F7 framing ("big view + occasional control") is correct |
| P5 panes | **Split pane** | The oldest layout primitive there is; the plan wisely scopes it to *fixed equal split, no divider yet* |

No not-invented-here flags. The plan also correctly *declines* a pattern:
Correspondence keeps two windows because independent viewports are a feature
(F11). That restraint is a good sign.

The one pattern the plan reaches for that I would push back on is **"fix a
z-index bug with more z-index"** — see §4: the fix is right but the proposed
mechanism (`z-index: 110 + z` in CSS) is literally unimplementable as written,
and the layer system needs a small consolidation, not just one more number.

---

## 3. Structural soundness — three new surfaces, or one too many?

The plan adds **four** API surfaces: `WorkspaceProps.actions`, `ViewDef.hint`,
`ViewDef.hud`, `ViewDef.panes`. The right question is whether each carries a
distinct concern:

| Surface | Scope | Concern | Verdict |
|---|---|---|---|
| `actions` | app | transport verbs, always-on | **Keep.** Orthogonal to everything else; app-scoped is correct (play/step belongs to the simulation, not to a view) |
| `panes` | view structure | atomic multi-pane window | **Keep.** This is *structure*, not decoration; nothing else can express it |
| `hud` | view overlay | persistent in-view controls | **Keep.** View-scoped manipulation is genuinely different from app-scoped transport — the plan's P1/P3 distinction ("transport" vs "manipulation") is the right boundary and should be written into the spec verbatim |
| `hint` | view overlay, transient | first-interaction coach mark | **Marginal.** A hint is a *degenerate HUD with chrome-owned dismiss state* |

> [!IMPORTANT]
> **Fold P2's implementation into P3's layer.** Keep the declarative
> `hint?: string` API (it's cheap and lets the chrome own dismissal), but
> implement it as content rendered *into the same overlay layer as `hud`*, so
> there is exactly one in-view overlay system with one pointer-isolation
> solution, one fullscreen survival rule, one z position. This also inverts the
> plan's build order: the plan schedules P2 (item 4) before P3 (item 5); if the
> hint rides the HUD layer, **build P3's layer first**, then P2 is a one-day
> feature on top. Otherwise you build the overlay plumbing twice.

So: not one too many — but only if hint and hud share an implementation. Four
declared surfaces, three mechanisms (strip / overlay layer / panes) is the
right count for a 10-app catalog.

### 3.1 `ActionDef` — tighten the contract

The sketch is sound but under-specified in three ways:

1. **The "projection" constraint is unenforced.** "Actions should correspond to
   an existing drive/playback section" is a comment, not a contract. Add
   `sectionId?: string` to `ActionDef`. This buys: (a) a machine-checkable
   invariant (dev-mode `console.warn` if the id names no drive/playback-tier
   section); (b) a free affordance — a chevron/long-press on the strip opens
   the rich panel, solving strip→panel discoverability, which the plan never
   addresses (the user who finds Play on the strip still doesn't know speed
   lives in a panel).
2. **`primary?: boolean` "at most one"** — same: enforce with a dev warning,
   or change the type to `WorkspaceProps.actions?: { primary?: ActionDef;
   rest: ActionDef[] }`. The flat array + comment is acceptable if warned.
3. **Accessibility is unmentioned.** The strip needs `role="toolbar"`,
   `aria-label`, and `active` must render as `aria-pressed`. Cheap now,
   archaeology later. DESIGN-SPEC §8 already sets this standard for the rail
   and dock; the strip must meet it.

One thing the design gets **right** that deserves explicit credit: there is no
duplicated state between strip and panel *by construction*, because the app
owns the state and both surfaces call the same handlers. That is the single
most common failure mode of toolbar-plus-panel designs and the plan dodges it
cleanly. Hold that line in review: the chrome must never own play/pause state.

### 3.2 `ViewDef.panes` — fix the type, not just the behavior

> [!WARNING]
> "When present, `node` is ignored" is a silent-conflict API. A `ViewDef` with
> both `node` and `panes` typechecks and does something surprising. Model the
> exclusivity in the type:

```ts
type ViewBody =
  | { node: React.ReactNode; panes?: never }
  | { panes: ViewPane[]; node?: never };
export type ViewDef = { id: string; title: string; defaultRect: Rect } & ViewBody;
```

This costs nothing at the ten call sites (object literals narrow fine) and
makes the invariant unrepresentable rather than documented. The plan's scoping
discipline is otherwise excellent: equal split, optional divider *later*,
window stays the unit of drag/resize/collapse/fullscreen/layout — that keeps
`geometry.ts` (the pure snap/dock/pack math) completely untouched, which is
the single best property of P5. The engine's hardest-won code doesn't change.

Two implementation notes the plan omits:

- **PhoneWorkspace** renders `v.node` directly (`PhoneWorkspace.tsx:130`); the
  pane row/stack logic must be implemented there too, and stacked panes change
  the inscribed-square arithmetic (each pane gets `min(w, h/2)`) — fine, still
  equal between panes, but the breakpoint between row and stack needs a
  defined rule (the plan hand-waves "narrow/short").
- **The embed route should converge on the same body component.** F10 observes
  the embed already has the right model; after P5, `.am-embed-row` and the
  split-window body are the same layout twice. Extract one `SplitBody` used by
  both, or accept the duplication knowingly — but say which.

---

## 4. Layering — the z-index question, answered precisely

The prompt for this review asks: *the proposal fixes a z-index bug with more
z-index — is a stacking-context refactor warranted instead?* Answer: **no
refactor, because the codebase already has the right architecture; but the
plan's specific fix is unimplementable as written and there is a latent
unbounded-z bug it must address first.**

The under-appreciated fact: `.am-stage { isolation: isolate }`
(`theme.css:168`) already creates an isolated stacking context. All the big
in-stage numbers (rail 200, fullscreen 100, panels 30+z, guides 24) are
*contained* — they never compete with the top bar (z 30 in the `.am-app`
context), the menus (71), or the modal (80), which live in the bar's subtree.
Fullscreen works by raising the **whole stage** to 100 (`theme.css:392`),
above the bar — which is precisely why menus/modal are "buried" in fullscreen.
This is a deliberate two-level layer system, and it is sound. The plan's table
flattens these two contexts into one list, which slightly misdescribes the
mechanism (the modal isn't buried by a number comparison with the view; it's
buried because its *entire ancestor context* is below the raised stage). The
conclusions still hold, but anyone implementing P4 needs the two-context model
in their head or they will "fix" the wrong layer.

> [!CAUTION]
> **Two concrete problems with P4a as written:**
>
> 1. **`z-index: 110 + z` is not CSS.** Panel z comes from an inline style
>    (`Panel.tsx:33`), which beats any stylesheet rule, and CSS cannot add a
>    per-element variable to a literal in a `z-index` (calc-on-z-index support
>    is not dependable). The actual implementation must thread a base through
>    React — e.g. `DesktopWorkspace` passes `zBase={fullView ? 110 : 30}` to
>    `Panel` — or set a `--ws-z-base` custom property on the stage and have
>    Panel compute inline. Either is fine; the CSS one-liner in the plan is
>    pseudo-code and should be labeled as such before someone burns an hour.
> 2. **z grows without bound and is persisted.** Every raise does
>    `z = topZ + 1` (`DesktopWorkspace.tsx:104-108,126-131,170-176`) and the
>    result is written to `ws:<appId>` forever. After ~70 raises (weeks of
>    real use), a panel's inline `30 + z` exceeds 100 and floats above a
>    fullscreen view *today*, without P4a; past 170 it would beat the proposed
>    110 base the wrong way around. **Fix: compact z in `sanitize()`** —
>    renumber panels+views to 1..n by current order on load. Three lines, and
>    it makes every layer constant in the system actually mean something.
>    The P1 strip (which must sit above views ~30+z but below fullscreen 100
>    and rail 200) is only safely placeable once z is compacted.

With those two corrections, P4a is the right fix and a stacking-context
refactor would be over-engineering. One cheap hardening I do recommend:
**name the scale**. Put the layer table in `theme.css` as custom properties
(`--z-rail: 200; --z-full: 100; --z-strip: 90; --z-panel-base: 30; …`) with a
one-comment registry. Ten magic numbers across two contexts is exactly the
density at which the next contributor adds an eleventh by guessing; a token
scale is the difference between a layer *system* and a layer *pile*.

### 4.1 Staged Esc — keep it a stack, and don't overreach

The plan: "Esc closes topmost panel/menu first, exits fullscreen second."

> [!IMPORTANT]
> **Do not let Esc close panels outside fullscreen.** Panels are persistent
> spatial furniture (windows), not transient overlays; Esc-closes-window is
> not a desktop convention and would fight the persistence model (an Esc
> reflex would silently rewrite `ws:<appId>`). The defensible rule: Esc peels
> **transient** layers only — menu → modal → (phone) sheet → fullscreen —
> and panels are only "transient" if P4 chooses to treat panels-opened-
> during-fullscreen as a temporary overlay set (which I'd avoid; simpler to
> say panels are never Esc-closable).

Mechanically, today there are at least three independent `keydown` listeners
(DesktopWorkspace fullscreen, PhoneWorkspace sheet+full, the explainer modal),
and "staged" behavior across independent listeners is a coordination problem —
listener order is registration order, not layer order. Centralize: one Esc
owner per workspace holding a small layer stack (or each transient layer
registers/unregisters with it). Without that, you get the Esc-handling state
machine the consultant brief warns about, distributed across files. The phone
fix (peel sheet before fullscreen) then falls out for free instead of being a
special case of `PhoneWorkspace.tsx:50-59`.

---

## 5. P5 deep dive — persistence, and one overstated claim

### 5.1 The localStorage migration is more benign than feared — verify, then say so

The feared failure: old `ws:plane-transform` state has view rects keyed
`input`/`output`; after P5 the app declares one view (say `plane`). Reading
`layouts.ts:sanitize()` (lines 73-77): it iterates **current** `ViewDefs` and
takes `p.views[v.id] ?? defaultRect` — so the new id falls back to its
`defaultRect`, and stale `input`/`output` entries are simply dropped. Panel
entries are unaffected. **No crash, no corrupt state.** Three real residues:

| Residue | Effect | Action |
|---|---|---|
| User-saved layouts (`saved: SavedLayout[]`) keyed on old view ids | Layout still applies; the pair window gets `defaultRect` instead of the saved geometry — silent partial degradation | Acceptable; note it in the PR. Optionally drop saved layouts whose `views` keys are all-unknown |
| `wsphone:plane-transform` card heights keyed `input`/`output` | Stale keys ignored | None |
| **Id choice matters:** reusing `input` as the merged window's id would apply a stale 356×356 rect to a window that wants ~720px width | Bad first paint for every existing user | **Pick a fresh id** (`plane`), deliberately, and document the rule: when a view's meaning changes, its id changes |

So the seam the brief worried about is already handled by `sanitize()`'s
permissive design — but only because someone designed it that way; this is
worth a comment in `types.ts` ("view ids are migration keys; rename on
semantic change") and is the strongest argument for the unit-test seam in §7.

### 5.2 F9's "geometrically wrong" is overstated

The review claims mismatched pane sizes make drawn curves "**geometrically
wrong**, not just ugly." I traced it: each pane's `CurveSvg` maps math →
NDC via the same `clipFromMath` the shader mirrors (`polarViews.ts:72-86`)
and scales by **that pane's own** inscribed square
(`PlaneTransform.tsx:605-635`, `useInscribedSquare`), and the renderer sizes
its canvas to the same inscribed square (`PlaneTransform.tsx:188-203`). So
each pane is **internally consistent** — the curve always lies on the points.
What diverges between mismatched windows is the *scale of presentation*: the
two halves of one correspondence drawn at different zooms, which defeats
comparative reading. That is a real and sufficient justification for P5 — but
it is a presentation-coherence bug, not a correctness bug, and the review
should say so. (The collapse/layout/fullscreen "half the picture hidden"
findings stand unmodified and are the stronger half of F9.)

This matters beyond pedantry: if a maintainer later "fixes the geometry bug"
by force-locking window sizes instead of adopting panes, they'd be solving a
misdiagnosed problem. The structural argument (one picture ⇒ one window) is
the right one; lead with it.

---

## 6. Performance & footprint

- **Re-render frequency.** The brief asks whether a strip with `active` play
  state re-renders the Workspace at step frequency. Honest answer: **the
  Workspace already re-renders at step frequency** in every playback app,
  because step state lives in the app component and every panel `node` is
  inline JSX rebuilt per render (`StableMatching.tsx` holds round state in the
  component; `DesktopWorkspace`'s `sections` memo keys on `props.sections`,
  a new array each render). The strip adds a handful of buttons to a tree
  that already reconciles wholesale; the marginal cost is noise. The *actual*
  guardrail worth writing down: **no live text in the strip** (no tick
  counters, no timers as `label`) — keep labels static and `active` boolean,
  so the strip never becomes the reason an app render is forced. If render
  cost ever matters, the fix is app-side (`React.memo` panel bodies), not
  chrome-side.
- **rAF loops are untouched** by all five proposals — P5 explicitly keeps the
  same mount refs and `ResizeObserver`-cached sizes (`PlaneTransform.tsx:172-180`);
  the panes change which DOM the mounts live in, not the loop.
- **Phone vertical budget.** Strip row (~44px) + dock (~60px) + top bar on a
  667px viewport leaves ~520px of cards. Acceptable, but consider rendering
  the strip as a **pinned leading cluster inside the dock row** if any app's
  dock already scrolls — one row instead of two. Defer until it's seen on a
  device; the plan's separate-row choice is simpler and fine as v1.
- **Bundle:** negligible — no new dependencies anywhere in the plan; icons
  come from the closed set. Good.

---

## 7. Verification & contracts — with only `npm run build`

The repo's only check is the TypeScript build. For this change-set, that's
thinner than usual because the riskiest pieces are *runtime* (z-order,
pointer isolation, persistence fallback). Three cheap moves:

1. **This is the PR to add the first unit tests.** `geometry.ts`,
   `layouts.ts:sanitize/applyLayout` are pure, dependency-free functions, and
   P5 + the z-compaction change both flow through `sanitize`. A vitest setup
   testing exactly: (a) stale view ids drop to defaults; (b) saved layouts
   with unknown ids degrade gracefully; (c) z compaction preserves order and
   bounds — is ~an hour and converts §5.1 from "I read the code carefully"
   into a contract. The framework maintainer may resist adding a test runner;
   as a consultant I'd insist *this specific seam* is where it pays for itself,
   because persistence regressions ship silently to returning users.
2. **Dev-mode invariant warnings** for the conventions the plan states but
   can't type: ≤5 actions, one `primary`, `sectionId` names a drive/playback
   section, `panes.length >= 2`.
3. **A written manual matrix** in the PR (the spec deltas section is the
   natural home): fullscreen × {rail toggle, strip, Esc ordering, skins ×5} ×
   {desktop, phone}; breakpoint crossing with Plane Transform (the renderers
   remount on the `phone` flag — `PlaneTransform.tsx:138,224` — confirm panes
   don't double-mount); stale-localStorage upgrade (seed old `ws:plane-transform`,
   load, confirm defaults). Tedious, but it is the entire safety net for the
   z work.

---

## 8. Maintainability — the six-month newcomer test

Strengths: the plan's discipline about the closed vocabulary ("§3 stays at 11
archetypes — the strip and HUD are *placements*, not new panel types") is the
single most maintainability-positive sentence in it; it prevents the strip
from becoming a second, competing control system. The spec-deltas section
exists at all — most plans forget the spec.

Risks, in order:

1. **Convention-only boundaries drift.** Nothing stops app #11 from putting a
   Play button in a `hud` or a function picker in the strip. Mitigations:
   `sectionId` linkage (§3.1), plus one paragraph in `BUILDING_AN_APP.md`
   with a decision table: *transport verb → action; in-view manipulation →
   hud; everything else → panel.* The plan should name this doc change; it
   currently only amends DESIGN-SPEC.
2. **Esc logic scattered across three files** unless centralized (§4.1).
3. **Magic z numbers** unless tokenized (§4).
4. P5's `node`-ignored footgun unless the type is a union (§3.2).

All four are cheap to fix at design time and expensive after ten apps adopt
the surfaces. None argue against the plan; all argue for tightening it now.

---

## 9. Recommended adjustments (concrete, ordered)

| # | Adjustment | Targets |
|---|---|---|
| 1 | Compact persisted z in `sanitize()` before/with P4a; express the fullscreen panel raise as a React-threaded `zBase` (or stage-level CSS var), not a stylesheet rule — the plan's CSS one-liner cannot work against inline styles | P4a |
| 2 | Tokenize the layer scale in `theme.css` (`--z-*` registry comment); document the two-stacking-context model (stage `isolation: isolate` vs top-bar subtree) | P4 |
| 3 | Esc: central per-workspace layer stack; Esc never closes panels outside fullscreen (and preferably not inside either) | P4a/P4b |
| 4 | `ActionDef.sectionId?: string` + dev warnings (≤5, one primary) + `role="toolbar"`/`aria-pressed`; rule: no live text in strip labels | P1 |
| 5 | Make `node`/`panes` a discriminated union; new view id for the merged Plane Transform window (never reuse `input`); note saved-layout degradation in the PR | P5 |
| 6 | Build P3's overlay layer **before** P2; implement `hint` as chrome-owned content in that layer (one overlay system, one pointer-isolation fix) | P2/P3 |
| 7 | Add vitest for `sanitize`/`applyLayout`/z-compaction (first tests in the repo, deliberately scoped to pure modules); written manual matrix for the z/fullscreen work | all |
| 8 | Extract a shared split-body component so `#/embed/plane-transform` and the P5 window render the same pair layout once | P5 |

---

## Verdict

**Endorse the plan, with implementation corrections.** This is a high-quality
review document: the audit is real (I verified its claims against the code and
found them accurate, with one rhetorical overreach), the root-cause framing is
correct, and every proposal maps to a well-known pattern — transport bar,
in-canvas overlay, split pane, fullscreen-with-floating-controls. The decision
to keep the 11-archetype vocabulary closed and treat strip/HUD as *placements*
is exactly right, as is leaving Correspondence's two windows alone. The
surface count (actions / hud+hint / panes) is justified — provided hint and
hud share one overlay implementation.

**What concerns me:**
1. **P4a's mechanism is pseudo-code** — `z-index: 110 + z` in CSS cannot beat
   Panel's inline style; and the **unbounded persisted z** (`raise → topZ+1`,
   stored forever) means panels can already cross the fullscreen layer today.
   Compact z in `sanitize()` or every layer constant in the proposal is a
   suggestion, not a guarantee.
2. **Staged Esc as written overreaches** — Esc should peel transient layers
   (menu/sheet/fullscreen), never persistent panels; and it needs one owner,
   not three keydown listeners.
3. **F9 overstates** "drawn curves geometrically wrong" — each pane is
   internally consistent; the real (and sufficient) bug is presentation
   incoherence plus collapse/fullscreen hiding half the picture. Misdiagnosis
   invites the wrong future fix.
4. The new contracts are **convention-enforced only** — `sectionId` linkage,
   dev warnings, and a discriminated `node|panes` union convert the three most
   drift-prone conventions into checked ones.

**What I would change:** the eight adjustments in §9 — none of which alters
the plan's shape or order (P4a → P1 → P5 remains correct; swap P2 after P3's
layer). The migration risk the brief flagged turns out to be largely defused
by `sanitize()`'s permissive fallback, but it deserves the repo's first unit
tests rather than a careful read as its proof. Net: proceed.

## Self-reflection

1. **What would you do with another session?** Prototype P4a end-to-end (zBase
   threading + z compaction) to confirm no skin or `backdrop-filter` creates a
   surprise stacking context above the fullscreen view across all five themes,
   and test the staged-Esc stack on phone hardware; also verify my claim that
   calc()/var() in `z-index` is not dependable against current browser data
   rather than memory.
2. **What would you change about what you produced?** The §4 layering section
   carries the most load and could have included a one-screen diagram of the
   two stacking contexts; prose tables are a weaker medium for that argument.
3. **What were you not asked that you think is important?** Discoverability of
   the strip→panel relationship (a Play button doesn't reveal where Speed
   lives) — I folded it into the `sectionId` recommendation, but it deserves
   its own UX pass; and whether the action strip should appear in the embeds
   (`docs/EMBEDS.md`), which the plan never mentions.
4. **What did we both overlook?** Reduced-motion and focus management for the
   new surfaces (DESIGN-SPEC §7-8 set rules the plan never re-asserts for
   strip/HUD/hints), and what the strip does when an app has zero actions on
   phone — does the reserved row collapse, or does layout shift between apps?
5. **What did you find difficult?** Judging F9 fairly required tracing the
   inscribed-square math through three files (renderer sizing, `CurveSvg`,
   `polarViews`) to establish that per-pane rendering is internally consistent
   — the difference between "wrong" and "incoherent" hinged on ~15 lines.
6. **What would have made this task easier?** A layer/z registry in the code
   (the §9.2 recommendation) — I had to reconstruct the two-context model from
   grep; and any existing test harness to anchor the verification proposals.
7. **Follow-up value:** MEDIUM — the analysis is grounded in verified code,
   but the z-index/stacking-context conclusions and the Esc-centralization
   design were reasoned, not executed; a spike implementing P4a would confirm
   or amend §4 cheaply.
