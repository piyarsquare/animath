# Chrome design review — always-on actions, fullscreen access, paired views

*2026-06-10 · branch `claude/app-chrome-overhaul-lnqgle` · review of the shipped chrome
(post PR #200) against three reported gaps. Companion to `DESIGN-SPEC.md`; proposals
here are **not yet implemented** — they need a decision first.*

The three reported gaps:

1. Some apps need buttons **always on screen** — an app without a visible play
   button (e.g. Stable Matching) leaves the user not knowing where to begin.
2. In **fullscreen** mode there is no way to reach controls.
3. The planar plots are treated as **two independent windows** in the plane
   transform code, though they are conceptually one linked picture.

All three turn out to be the same root cause viewed from different angles: the
spec (§2–3) makes *every* control a resident of a dismissible floating panel,
and the only permanent chrome is the icon rail and the top bar. There is no
sanctioned place for a control that must never disappear, and no concept of two
views that must never separate.

---

## 1. Primary actions: "where do I begin?"

### Audit — how each app starts today

| App | Primary action | Lives in | Desktop default | Phone default | In-view affordance |
|---|---|---|---|---|---|
| Complex Particles | none needed (animates at once); 4D turns | Rotate panel (drive) | panel open | sheet closed | — (self-evident) |
| Plane Transform | draw curves (no morph ships) | Draw panel (drive) | **hidden** (not in default layout) | sheet closed | gestures only, no hint |
| Fractals (GPU) | pan/zoom; orbit trace | Trace panel (drive) | **hidden** | sheet closed | gestures only, no hint |
| Mandelbrot ↔ Julia | pick `c` in the view; morph path | Seed panel (drive) | open | sheet closed | pick is **arm-gated** (Seed panel button, `Correspondence.tsx:38-42`), no hint |
| Topology Walk | walk (WASD / buttons) | Move panel + **in-view MovePad HUD** | HUD always on | HUD always on | ✅ MovePad + key legend |
| Trinary (Observatory) | launch planets | Launch panel (drive) | open | sheet closed | readout overlay only |
| Stable Marriage | play / step rounds | Playback panel | open | sheet closed | none |
| Stable Matching | run / step | Playback panel | open (`run` layout) | sheet closed | none |
| Agentic Sorting | run agents | Run panel (playback) | open | sheet closed | none |
| Polygon Worlds | walk | Drive panel + **in-view MovePad HUD** | HUD always on | HUD always on | ✅ MovePad |

Sources: each app's `sections`/`layouts` arrays; `PhoneWorkspace.tsx:24`
(`sheet` starts `null` — no panel content is visible on phone until a dock tap);
`TopologyWalk.tsx:344` / `PolygonWorlds.tsx:325` (the MovePad HUDs).

### Findings

- **F1 — Phone opens every app inert.** On phone, panels are bottom sheets and
  all start closed; the dock shows labeled icons but nothing says *this one
  starts the show*. A simulation app (Stable Matching, Stable Marriage,
  Agentic Sorting, Trinary) renders a static view and waits. This is the
  reported "user does not know where to begin" — it is the **default phone
  experience for 8 of 10 apps**, not an edge case.
- **F2 — Desktop is right by default but fragile.** Default layouts open the
  playback/drive panels, but panels close via ✕, the workspace persists that
  (`ws:<appId>`), and the Compact layout is rail-only. Once dismissed, the play
  button is gone until the user re-finds it on the rail. The empty-stage hint
  ("No panels open — click an icon on the rail…") names no specific panel.
- **F3 — Apps that solved it went around the chrome.** TopologyWalk and
  PolygonWorlds hand-roll MovePad overlays inside their view nodes; Trinary
  overlays a live readout. These are exactly the "always on screen" controls
  the user is asking for — but they're per-app inventions with no vocabulary,
  no shared styling, and no fullscreen/phone guarantees.
- **F4 — Three apps hide their drive panel even on desktop** (Plane Transform's
  Draw, Fractals' Trace; Correspondence gates pick-`c` behind the Seed panel's
  arm button, so a bare view click does nothing). Defensible for the
  gesture-driven viewers, but there is zero on-screen invitation to those
  modes — and for Correspondence the obvious gesture is disabled by default.

### Proposal P1 — a chrome-level **action strip** (the headline fix)

Give `Workspace` a small set of always-on actions that the chrome renders
outside the panel system, so they can never be closed:

```ts
// types.ts
export interface ActionDef {
  id: string;
  icon: IconName;        // closed icon set, as everywhere
  label: string;         // aria + tooltip; optionally shown on phone
  onClick(): void;
  active?: boolean;      // e.g. play ⇄ pause state
  primary?: boolean;     // at most one; rendered emphasized (accent)
}
// WorkspaceProps
actions?: ActionDef[];   // ≤ ~5; buttons only — sliders stay in panels
```

- **Desktop:** a floating pill strip docked bottom-center of the stage
  (`am-actionbar`), above view windows, below menus. Not draggable, not
  closable. Visually a sibling of the rail.
- **Phone:** the same strip as a slim persistent row directly above the dock.
  This single change fixes F1 for every simulation app.
- **Fullscreen:** the strip stays (see §2) — z-index above the fullscreen view.
- Apps wire the *same handlers* their playback panel uses (play/pause, step,
  reset, launch, run). The panel keeps the rich controls (speed, schedule,
  mode); the strip carries only the verbs.
- Constraint to keep the vocabulary honest: actions should correspond to an
  existing drive/playback section — the strip is a *projection* of that panel,
  not a twelfth archetype.

### Proposal P2 — per-view **start hints** (the gesture apps)

`ViewDef.hint?: string` — the chrome renders a small dismissable overlay
centered in the view (styled like the gallery's "Open workspace" affordance)
until the first pointer interaction in that view: Correspondence "click to
pick c"; Fractals "drag to pan · pinch to zoom"; Plane Transform "draw on the
z-plane". Cheap, no new state model, and it answers "where do I begin" for the
apps where the answer is *the view itself*.

### Proposal P3 — legitimize the HUD

`ViewDef.hud?: React.ReactNode` — rendered by `ViewWindow`/`PhoneWorkspace`
inside the view body, above the canvas, surviving fullscreen. TopologyWalk and
PolygonWorlds migrate their MovePads into it; gesture handling (HUD taps must
not start camera drags, cf. `TopologyWalk.tsx:332-334`) gets solved once in the
chrome instead of per app. Distinction from P1: the action strip is
*app-scoped transport* (play/step/reset); the HUD is *view-scoped
manipulation* (move pads, in-canvas legends).

---

## 2. Fullscreen: controls are unreachable — and the rail is silently broken

### Findings (mechanism: CSS z-index occlusion, nothing unmounts)

| Layer | z-index | In fullscreen (view at z 100) |
|---|---|---|
| Rail | 200 (`theme.css:322`) | **visible and clickable** |
| Fullscreen view | 100 (`theme.css:396`) | — |
| Modals / menus | 80 / 71 | buried |
| Phone sheet / scrim | 50 / 45 | buried |
| Phone dock | 40 | buried |
| Panels | ~25–40 (`Panel.tsx:33`) | buried |
| Top bar | 30 (`theme.css:184`) | buried |

- **F5 — Latent bug:** because the rail floats *above* fullscreen but panels
  render *below* it, clicking a rail icon during fullscreen toggles a panel the
  user cannot see. The rail appears dead. Either the rail should hide in
  fullscreen or — far better — the panel it opens should be visible.
  *(Three-hats addendum: the raise counter `z = topZ + 1` is unbounded and
  persisted in `ws:<appId>`, so after enough raises a panel exceeds z 100 and
  floats above fullscreen **today** — F5 is nondeterministic. Any fix must
  compact z in `sanitize()`.)*
- **F6 — Esc is the only exit** (plus the header shrink button); on phone, Esc
  clears sheet *and* fullscreen in one stroke (`PhoneWorkspace.tsx:52-56`)
  rather than peeling one layer at a time.
- **F7 — The design intent was immersion, but the user's actual need is
  "big view + occasional control"** — e.g. fullscreen the lattice and still
  step the algorithm, fullscreen the particle cloud and still change the
  function. Immersion and access aren't in conflict if controls *float over*
  the fullscreen view on demand.

### Proposal P4 — fullscreen keeps the rail as its control surface

- While a view is fullscreen (`.am-stage.am-has-full`), open panels render
  above it. Mechanism (per three-hats review): a CSS rule can't beat Panel's
  inline `zIndex`, so thread a `zBase` prop (normal 30 / fullscreen 110) and
  tokenize the layer scale; compact persisted `z` in `sanitize()` first (see
  the F5 addendum). The rail already works; this makes what it opens visible.
  Panels stay draggable/closable over the fullscreen canvas — same windows,
  same snap math.
- The **action strip (P1) persists in fullscreen** — so play/step/reset never
  vanish even before any panel is opened.
- **Esc becomes staged over transient layers only:** close the topmost
  menu/sheet first, exit fullscreen second — **never** close panels (✕-only
  semantics) — with one layer-stack owner instead of today's three keydown
  listeners. The **? explainer** must also stay reachable in fullscreen.
- **Phone:** raise sheet + scrim above the fullscreen card (z 110/105) and
  keep the dock reachable — either keep the dock visible in fullscreen
  (fullscreen = viewport minus dock + action row), or auto-hide it behind a
  small grip. Recommend keeping it visible: on phone "fullscreen" really means
  "hide the *other* cards", and the dock is only ~60px.

---

## 3. Paired planar views: one picture, two windows

### Findings

- **F8 — The engine has no pairing concept.** `ViewDef`/`ViewState`/`LayoutDef`
  (`workspace/types.ts`) treat every view as independent; move/resize/collapse/
  fullscreen/layout-open never propagate. The spec says "two linked views"
  (DESIGN-SPEC §2) but the link is implemented entirely inside each app.
- **F9 — Plane Transform fakes the link below the chrome.** One shared
  `BufferGeometry`, identical uniforms, one shared `viewExtent` (zoom is
  force-locked — wheel in either pane zooms both, `PlaneTransform.tsx:458,472`).
  The chrome can still break the picture: resize one window and the inscribed
  squares diverge. Each pane stays *internally* consistent (the SVG curve
  overlay and the GPU points share the same inscribed-square transform,
  `polarViews.ts:72-85`) — but the two panes become **incommensurable**: the
  same mathematical length renders at different pixels-per-unit, silently
  inviting false readings of |f′|, and that cross-pane comparison is the
  picture's whole point. Collapse, fullscreen, or a layout can also hide half
  the correspondence outright. *(Wording corrected per three-hats review —
  originally claimed "geometrically wrong," which overstated it.)*
- **F10 — The embed route already demonstrates the right model.**
  `#/embed/plane-transform` renders **one container with two flex panes**
  (`.am-embed-row > .am-embed-pane + .am-embed-pane`, equal widths, shared
  border) — the pair cannot be separated, mis-sized, or half-hidden.
- **F11 — Correspondence is a different animal.** Its two fractals are linked
  *semantically* (pick `c` → Julia re-renders) but the viewports are
  independent **by design** — zooming the Mandelbrot without disturbing the
  Julia is a feature. Same two-window surface, opposite linkage needs.

### Proposal P5 — a **split view** primitive (for Plane Transform)

```ts
// ViewDef gains:
panes?: { id: string; title?: string; node: React.ReactNode }[];
// when present, `node` is ignored; the window body renders the panes
// side-by-side (flex row; column under a width threshold), equal split,
// optional draggable divider later.
```

- The *window* stays the unit of drag/resize/collapse/fullscreen/layout — the
  pair can never separate, and fullscreen takes both panes (fixing the
  fullscreen half of F9 for free).
- Plane Transform becomes one window — `Plane: z ↦ f(z)` with panes
  `z-plane (input)` / `f(z)-plane` — matching its embed presentation. The
  inscribed-square mismatch disappears structurally (panes always share height
  and split width equally).
- Phone: the card body renders the same flex row (or stacks the panes when the
  card is narrow/short) — one card, not two.

### Recommendation for Correspondence: leave it as two windows

Independent pan/zoom is the point; forcing a split would remove a feature. Its
gaps are already on the ledger (viewport **zoom-lock toggle**, IN-PROGRESS
"Linked-view extras"). The one chrome courtesy worth considering later: a
layout that fullscreens *the pair* (a split-view "Focus" layout) rather than
one window — defer until someone misses it.

---

## Recommended order of work

*(Superseded in detail by the three-hats outcome below — the shape survives,
P3 is deferred, and P4a grew the z-compaction work.)*

| # | Item | Size | Fixes |
|---|---|---|---|
| 1 | **P4a** — panels above fullscreen + staged Esc (bug fix) | S | F5, F6 |
| 2 | **P1** — action strip, desktop + phone (+ persists in fullscreen) | M | F1, F2, F7 |
| 3 | **P5** — split-view primitive; migrate Plane Transform | M | F8–F10 |
| 4 | **P2** — per-view start hints for the gesture apps | S | F4 |
| 5 | **P3** — `ViewDef.hud`; migrate the MovePads | M | F3 |
| 6 | P4b — phone fullscreen dock/sheet access | S | F7 (phone) |

Items 1–2 deliver the user-reported pain directly; 3 resolves the structural
mismatch; 4–6 round out the vocabulary so apps stop improvising.

### Spec deltas required (DESIGN-SPEC.md)

- §2 gains an **action strip** subsection (always-on, non-closable, ≤5 verbs,
  projection of a drive/playback section) and a **split view** clause under
  view windows (`panes`: the pair is one window).
- §3 stays at 11 archetypes — the strip and HUD are *placements*, not new
  panel types.
- A new §2 note on fullscreen: the rail remains live; panels float above;
  the action strip persists; Esc peels layers.

---

## Three-hats review outcome (2026-06-10)

Three independent expert reviews (Framework Maintainer · Architecture
Consultant · Math-Viz & Pedagogy) examined this document; all three
**endorse the plan** and verified the findings against the code. Full reports
and the convergence analysis:
`docs/sessions/progress/app-chrome-overhaul-lnqgle/2026-06-10-S01-expert-{maintainer,consultant,pedagogy,synthesis}.md`.

**Errata applied above** (marked inline): F9 reworded from "geometrically
wrong" to *incommensurable scales*; the audit table corrected (Correspondence
pick-`c` is arm-gated; Plane Transform ships no morph); the unbounded
persisted-z bug folded into F5; P4a's mechanism corrected (`zBase` prop +
z-compaction, not a CSS override); staged Esc scoped to transient layers.

**Revised plan of record:**

- **PR A — P4a+** (standalone bug fix): z-compaction in `sanitize()`, layer
  tokens, `zBase` threading, staged Esc via one layer owner, explainer
  reachable in fullscreen.
- **PR B — P1**: hardened `ActionDef` — buttons-only by type, `sectionId`
  projection link, ≤5 enforced in code, contextual action sets, Step
  first-class beside Play, labeled on phone, `role="toolbar"` — desktop strip
  + phone row, persists in fullscreen. Skin sweep + explicit embeds decision;
  DESIGN-SPEC, IN-PROGRESS removals-ledger ruling, and BUILDING_AN_APP
  updates ride the same PR.
- **PR C — P5**: discriminated `node | panes` union, **fresh** merged-window
  id (`plane`, not `input`), split-body component shared with the embed
  route, window title `z ↦ f(z)`, pane labels `z — domain` /
  `w = f(z) — image`; 50/50 split non-negotiable (no draggable divider).
- **PR D — P2** on a minimal shared view-overlay layer: per-session hints,
  math-anchored copy; ungate Correspondence tap-to-pick (decision below).
- **Deferred:** P3 full `ViewDef.hud` (design against TopologyWalk's actual
  overlay inventory — MovePad + mini-map + captions — before generalizing);
  P4b phone fullscreen dock access.

**Open decisions for the user:** (a) ungate Correspondence tap-to-pick;
(b) adopt vitest for the chrome's pure functions (`sanitize`, `applyLayout`,
geometry) as the repo's first tests; (c) whether embeds ever show the action
strip.
