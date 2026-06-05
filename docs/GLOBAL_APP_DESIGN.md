# Global App Design — Working Notes

> **Purpose.** This branch refines the **common elements** that every animath
> app inherits from the shared shell — the top bar, the drawer and its tabs, the
> Action Floater, the control primitives, the explainer popup, persistence — so
> they are genuinely reusable across animation modules instead of being re-wired
> (or worked around) per app.
>
> It is a *meta* effort: several feature branches have recently written detailed
> markdown snapshots of their interfaces and how their components are arranged.
> Those documents are the raw material. This file indexes them and synthesizes
> the shared surface + the seams worth consolidating, so the redesign starts from
> what was actually built rather than from scratch. This branch also **extends the
> set with an interface manual for every remaining catalog app** (§1), so all nine
> app views now have a code-free snapshot to evaluate against the shell.

This is a living working document, not a spec. Append as the picture sharpens.

---

## 1. Source documents (the snapshots written across branches)

Markdown texts that describe components and how they are arranged, gathered from
the in-flight branches. Read these before changing any shared element.

### Interface inventories (the most directly relevant)

| Document | Branch | What it covers |
|---|---|---|
| `docs/COMPLEX_PARTICLES_UI.md` | `claude/particle-3d-surface-explorer-0BZHD` | Complete inventory of the **Complex Particles** viewer *and the shared AppShell chrome* — every screen region, bar button, drawer tab, control, the ActionFloater, projection modes, persistence, a component/file map, and a closing **"Seams & overlaps worth noting"** section (§10). |
| `docs/TRINARY_UI_SNAPSHOT.md` | `claude/three-body-continued` | Code-free snapshot of the **Trinary System** app (Observatory + Lab) layered on the same shell. Documents the generic chrome (§2) plus this app's two views, and closes with **"Observations for the redesign — overlaps & friction points"** (§7). |

These two are the anchors: each independently inventories the *shared* chrome
(§2 of Trinary, §1–§5 of Complex Particles) and then lists where that chrome
chafes for its app. The overlap between their two "seams" lists is exactly where
reusable consolidation pays off most.

### Interface manuals written in this branch

To bring every catalog app up to the anchors' level, this branch adds a code-free
interface manual per remaining app — same structure (layout → shared-chrome usage
→ controls → a closing "seams" section). They sit alongside this file in `docs/`:

| Document | App / route | Headline seam(s) |
|---|---|---|
| `docs/PLANE_TRANSFORM_UI.md` | Plane Transform `#/plane-transform` | Ships its own `PlaneCurveFloater` that bypasses `ShellActions`/`ActionFloater` (the Actions tab/button are dead); function picker exposed in 3 places; two disagreeing zoom clamps. *(Polar grid + log-polar plane views shipped via #179.)* |
| `docs/FRACTALS_GPU_UI.md` | Fractals (GPU) `#/fractals` | Uses the standard drawer (`CLAUDE.md` had mis-attributed the legacy `ToggleMenu` to it — corrected in this branch; `ToggleMenu` actually serves only the legacy Fractals2D); the four-family selector lives in Settings, not the `ƒ` picker; Actions are hand-styled buttons; no persistence. |
| `docs/CORRESPONDENCE_UI.md` | Mandelbrot ↔ Julia `#/correspondence` | `useActionFloaterOff()` + a bespoke `PlaybackFloater` just to get a timeline/scrubber; actions mounted in 3 DOM spots; independent per-pane controls with no link/sync; no persistence. |
| `docs/TOPOLOGY_WALK_UI.md` | Topology Walk `#/topology-walk` | **Now conforms to the shell** (real `ShellSettings`/`ShellActions` + `ControlPanel` primitives) — the #174 rewrite resolved the former Möbius Walk's seams (empty tabs, hand-rolled twist toggle, remount-on-toggle). Remaining: no settings persistence; the per-app `WorldEngine` could move to `src/lib/`. *(Supersedes the former `MOBIUS_WALK_UI.md`; `#/mobius` and `#/wrap-world` redirect here.)* |
| `docs/STABLE_MARRIAGE_UI.md` | Stable Marriage `#/stable-marriage` | Bypasses the shell almost entirely (only header + explainer); all controls hand-rolled with a private `--sm-*` token set; its own in-page Visualizer/Lab mode toggle; no persistence. |
| `docs/AGENTIC_SORTING_UI.md` | Agentic Sorting `#/agentic-sorting` | Bypasses the shell almost entirely; **CSS class collision — both AppShell and this app define a global `.as-bar`** (and share the `as-` prefix); no persistence; a redundant in-page subtitle. |

> **Update (after merging `main`).** The two anchors are now **on `main`** as well
> (`COMPLEX_PARTICLES_UI.md` via #178; `TRINARY_UI_SNAPSHOT.md` + `TRINARY_ROADMAP.md`
> via #177), so all eight manuals now sit together in `docs/`. The former
> `MOBIUS_WALK_UI.md` was replaced by `TOPOLOGY_WALK_UI.md` after the #174 rename.
> Caveat: `TRINARY_UI_SNAPSHOT.md` predates #177's Observatory+Lab unification, so it
> still describes the old two-catalog-entry structure. Complex Particles and Trinary
> are not re-documented in this branch.

### Supporting design / roadmap docs

| Document | Branch | Relevance |
|---|---|---|
| `IDEAS.md` | `claude/particle-3d-surface-explorer-0BZHD` | Unprioritized feature backlog for the particle viewers (spinners, polar toggles, a **unified channel-mapping control**, faithful Hopf, Clifford-torus). The channel-mapping idea is a reusable-control pattern worth noting. |
| `docs/TRINARY_ROADMAP.md` | `claude/three-body-continued` | Staged plan to extract Trinary's sim core into a shared `src/lib/nbody/` library and consolidate its two catalog entries — a concrete precedent for the "lift shared engine out of the app folder" pattern (mirrors `lib/particles/`). |
| `docs/BUILDING_AN_APP.md`, `ARCHITECTURE.md`, `AGENTS.md` (edits) | `claude/docs-new-architecture-dh2bB` | Framework/onboarding doc refresh. Baseline for how a conforming app integrates with the shell. |

### App-local write-ups (component descriptions, lower-level)

Several branches added or revised per-app `README.md` / `EXPLAINER.md` files that
describe an individual module's components:

- `src/animations/PlaneTransform/README.md` — `claude/plane-transform`
- `src/animations/PlaneTransform/EXPLAINER.md` (edit) — `claude/complex-viewer-polar-views-fApMG`
- `src/animations/ComplexParticles/EXPLAINER.md` (edit) — `claude/particle-3d-surface-explorer-0BZHD`
- `src/animations/ComplexParticles/README.md` (edit) — `claude/site-cleanup-architecture-bABBA`
- `src/animations/AgenticSorting/README.md` — `claude/modularize-sorting-sim-GX0Dv`
- `src/animations/StableMarriage/README.md` — `codex/add-module-for-simulated-preferences`
- `src/animations/TopologyWalk/EXPLAINER.md` / MobiusWalk docs — `claude/mobius-walk-fix`, `codex/add-mobius-walk-animation-module`

> These are mostly app-specific and append-only; they matter here only where an
> app documents a *workaround* against a shared element (e.g. an app shipping its
> own floater or in-page action bar).

---

## 2. The shared surface today (synthesized from the snapshots)

What *every* app inherits from `AppShell`. **(Updated: the menu-bar simplification
in this branch — §7 — changed the top bar and drawer; the current state is below,
with the pre-change form noted where the seam analysis in §3/§4 still refers to
it.)**

- **Top bar (48px, fixed).** Left-clustered icon buttons: **⌂ Home · ☰ Menu ·
  [Title/formula] · ▶ Actions · ? About**. ⌂ Home → landing gallery; ☰ Menu and
  the Title both open the drawer on **Settings**; ▶ opens Actions; **? About** is
  the explainer popup. Empty ▶/? are dimmed **and disabled**. Driven by
  `useAppHeader`. *(Pre-change: also had ☰ Apps, a ƒ Function button, and a
  separate ⚙ Settings gear.)*
- **Drawer (slides from the left, ~340px).** Two tabs: **Settings · Actions** —
  both *portal targets* an app fills via `<ShellSettings>` / `<ShellActions>`;
  defaults to Settings. Scrim / Esc closes. *(Pre-change: four tabs — Apps ·
  Function · Settings · Actions — where Apps/Function were generic lists.)*
- **Action Floater.** A draggable on-canvas panel that mirrors the Actions tab
  (same portal source), collapsed to a ▶ + drag grip. Suppressible via
  `useActionFloaterOff()` for apps that ship their own.
- **Explainer popup (?).** Centered modal rendering an app's `EXPLAINER.md`
  (via `useAppExplainer`).
- **Control primitives** (`ControlPanel.tsx`): **Section · Slider · Pills ·
  Select · Checkbox** — the shared vocabulary for Settings/Actions bodies.
- **Persistence**: `usePersistentState` mirrors *settings* (not transient view
  state) to `localStorage`, namespaced per app; "Reset settings to defaults"
  clears the namespace.

---

## 3. Cross-app seams & overlaps (consolidated from both "seams" sections)

The friction points each snapshot surfaced, grouped by theme. Themes that appear
in **both** apps are the strongest candidates for a reusable fix.

### A. The Actions surface is overloaded and duplicated
- Actions live in **two always-identical places** (drawer Actions tab + Action
  Floater); during real use only the floater is touched (Complex Particles §10.2).
- Actions mix *navigation* (4-D turns/spins) with *destructive resets* and even a
  *projection control* (Drop axis) that belongs with the other projection setting
  (Complex Particles §10.4).
- **Inconsistent action model across apps**: the Observatory mirrors actions into
  the floater, but the Lab uses an *in-page action bar* instead (Trinary §7.5).
  → Where does an app's actions surface actually belong, and can it be one model?

### B. Settings location & ownership is unclear
- Settings is **long and flat** (~7 sections / ~25 controls) with no "set once vs.
  tweak often" grouping (Complex Particles §10.6).
- In Trinary the controls **split between the drawer and the page body** depending
  on the view, so it's hard to know which surface owns a control (Trinary §7.1).
- **Simple/Advanced** exists in one view only (Trinary §7.7).
  → A reusable Settings layout convention (incl. a shared Simple/Advanced split)
  would help every app.

### C. Duplicated / re-implemented controls
- The same logical control appears more than once with different UI: function can
  be changed in **three** places (ƒ tab, Settings dropdown, title click) in
  Complex Particles (§10.1); zoom lives as both a **Distance slider and a
  pinch/wheel gesture** with no visual link (§10.3).
- Trinary duplicates **system setup** (target body, star masses, softening,
  habitable band) across Observatory and Lab (§7.3), has the **engine selector
  twice** (§7.4), and a **"reference frame" concept that exists twice with
  different meaning** (§7.2).
  → Candidates for a single shared control bound to one source of truth.

### D. Mode-dependent controls appear/disappear silently
- Controls quietly show/hide based on other settings (Collapse slider, scaffold
  toggle, adaptive sharpness, Yaw/Pitch/Roll vs. six planes, desktop-only
  orientation matrix) — discoverable only by toggling the revealing control
  (Complex Particles §10.5).
  → A reusable pattern for conditional controls (disabled-with-hint vs. hidden).

### E. Engine / sim core lives inside one app folder
- Trinary's roadmap calls out lifting its integrator + scenarios + classifier into
  a shared `src/lib/nbody/` (mirroring `lib/particles/`) so it's reusable and
  reachable via the `@/` alias instead of deep `../../` chains (Trinary Roadmap
  Phase 1). A precedent for keeping app-agnostic engines out of `animations/`.

---

## 4. The same seams recur in every app (the redesign evidence)

The six new manuals confirm the anchors' seams are not app-specific quirks — the
same handful of patterns show up almost everywhere. Conformance to the shared
shell, at a glance (nine views):

| App / view | Settings via `ShellSettings`? | Actions surface | Own floater? | Controls | Persists? |
|---|---|---|---|---|---|
| Complex Particles | ✅ (7 sections) | drawer + generic floater | — | `ControlPanel` | ✅ |
| Trinary · Observatory | ✅ | drawer + generic floater | — | `ControlPanel` | ✅ |
| Trinary · Lab | partial (split w/ page body) | **in-page bar** | — | mixed | URL, not local |
| Plane Transform | ✅ | **dead** (own floater instead) | ✅ `PlaneCurveFloater` | mixed (+ raw inputs) | partial |
| Fractals (GPU) | ✅ | drawer + generic floater | — | **hand-styled buttons** | ❌ |
| Correspondence | ✅ | **own** (`useActionFloaterOff`) | ✅ `PlaybackFloater` | **hand-rolled** | ❌ |
| Topology Walk | ✅ (3 sections) | drawer + generic floater | — | `ControlPanel` | ❌ |
| Stable Marriage | ❌ (in-page cards) | **in-page** | — | **hand-rolled (`--sm-*`)** | ❌ |
| Agentic Sorting | ❌ (in-page sidebar) | **in-page** | — | **hand-rolled** | ❌ |

> **Merging `main` flipped two rows the right way.** Topology Walk (formerly
> Möbius Walk, an empty-tabs / hand-rolled-button example) now conforms after the
> #174 rewrite, and Plane Transform's polar views shipped (#179). Trinary is now a
> single catalog entry with Observatory + Lab as internal tabs (#177) — still two
> *views*, one app. The remaining ❌ persistence and in-page-action rows are the
> live targets.

Reading down the columns, the recurring seams (extending §3 with what the new
manuals surfaced):

### F. The action model is genuinely unsettled
Across the nine views we see *four* patterns: drawer + generic floater (the
particle viewers), a **bespoke floater that suppresses the generic one**
(Correspondence; effectively Plane Transform), a **single in-page bar** (Trinary
Lab, Stable Marriage, Agentic Sorting), and an **empty/dead** Actions surface
(Plane Transform). The generic `ActionFloater`'s "always mirror the Actions tab"
assumption is the single thing apps most often opt out of. *(Topology Walk was a
fifth case — empty tabs — until #174 moved it onto the standard drawer + floater.)*

### G. `ControlPanel` primitives are bypassed whenever they fall short
Every app that hand-rolls controls does so for the **same missing pieces**: a
**number field** (Plane Transform's `p`/`q`, Fractals' Julia `c`), a **toggle /
"active" action button** (Fractals' actions, and Topology Walk's still-inline-styled
Actions buttons), and **transport/seek** (Correspondence's scrubber). The two DOM
apps reinvent the entire kit with private token sets rather than extend the shared
primitives. *(The #174 rewrite already moved Topology Walk's Settings onto
`ControlPanel`, leaving only its Actions buttons hand-styled — evidence the gap is
specifically in the action-button + number-field primitives.)*

### H. Persistence is the exception, not the rule
Only the two engine-backed viewers (Complex Particles, Trinary Observatory) use
`usePersistentState`. The four shader/DOM apps reset every control on reload and
have no "Reset to defaults" shell integration; Trinary Lab persists via the URL
instead. There's no default path from "registered a `ShellSettings` control" to
"it survives a reload."

### I. CSS is globally scoped (one collision fixed; convention still missing)
AppShell and Agentic Sorting both defined a global `.as-bar` — separated only by
DOM subtree, a latent bug. **Fixed in this branch:** Agentic Sorting's bar family
was renamed `as-bar*` → `as-arena-bar*` (folded under its existing `as-arena-`
namespace), so the only exact clash with the shell is gone. The broader risk
remains: the app still shares the shell's `as-` prefix (`as-button`, `as-card`,
`as-header`, …), and Stable Marriage dodges clashes only via a private `--sm-*`
prefix — there is still **no CSS-scoping convention for apps**.

### J. Doc drift (now reconciled)
`CLAUDE.md` claimed Fractals (GPU) used the legacy `ToggleMenu`; in fact
FractalsGPU uses the standard drawer and never imports it — `ToggleMenu` is **not**
dead, it just lives only in the **legacy Fractals2D** (`#/fractals-cpu`). The #174
Topology Walk rename also left the `CLAUDE.md` repo-layout tree + routing table
still saying `MobiusWalk` / `#/mobius`. Both are **corrected in this branch** (the
`ToggleMenu` line now points at Fractals2D; the layout/routing rows now read
`TopologyWalk` / `#/topology-walk` with the legacy redirects noted). Lesson for the
redesign: the shared `CLAUDE.md` tree + routing table drift whenever an app is
renamed or retired without a deliberate sweep — a cheap consistency checklist (or
generating that table from `apps.ts` + `index.tsx`) would prevent it.

---

## 5. Directions for refining common elements (to be discussed)

Candidate reusable improvements implied by §3–§4 — **not yet decided**, captured
for the design conversation:

1. **One action model.** Decide the canonical home for an app's actions (floater
   vs. drawer vs. in-page bar) and make the shell support it uniformly, so apps
   stop re-implementing their own bars.
2. **A Settings layout convention** with a shared, opt-in **Simple/Advanced**
   split and a "set once vs. tweak often" grouping baked into the primitives.
3. **Single-source controls.** Avoid surfacing the same setting through multiple
   widgets; where a gesture and a slider control the same value (zoom), link them.
4. **A conditional-control helper** so mode-dependent controls reveal/disable
   consistently and discoverably.
5. **Shared-engine extraction precedent.** Continue the `lib/particles/` /
   `lib/nbody/` pattern (the latter now merged via #177): app-agnostic,
   React/Three-free cores under `src/lib/`. Topology Walk's `WorldEngine` is the
   next obvious candidate to lift out of its app folder.
6. **Grow the primitive set** to cover the gaps apps hand-roll around (§G): a
   `NumberField`, a toggle / "active" action button, and a **transport/seek**
   (play + scrubber) control. This alone would let Plane Transform, Fractals,
   Topology Walk, and Correspondence drop bespoke widgets.
7. **A CSS-scoping convention** (per-app class prefix or a scoped root) so app
   stylesheets cannot collide with the shell — and fix the existing `.as-bar`
   clash (§I).
8. **Persistence by default** for `ShellSettings`-registered controls, with the
   shell owning a uniform "Reset to defaults" (§H).

---

## 6. Next steps

- [ ] Confirm with the maintainer which seams to tackle first (action model vs.
      Settings layout vs. single-source controls vs. the primitive set).
- [x] **Menu-bar simplified** (maintainer-directed, §7): dropped the in-drawer
      Apps list *and* the Function picker, collapsed the ⚙ gear into the ☰ menu
      button, relabelled to **⌂ Home · ☰ Menu · Title · ▶ Actions · ? About**;
      drawer is now **Settings · Actions**. Shared `AppShell` change — build green.
- [x] **`CLAUDE.md` doc-drift fixed** (§J): `ToggleMenu` re-attributed to the
      legacy Fractals2D, and the repo-layout tree + routing table updated for the
      `MobiusWalk → TopologyWalk` rename (with `#/mobius`, `#/wrap-world` redirects).
- [x] **`.as-bar` CSS collision fixed** (§I): Agentic Sorting's bar family renamed
      `as-bar*` → `as-arena-bar*`, removing the only exact clash with the shell.
      (A general app CSS-scoping convention is still open.)
- [ ] For the chosen theme, draft the shared-API change against `AppShell` /
      `ControlPanel` and check it against the anchor snapshots **and the six new
      manuals** so no app regresses.
- [ ] Keep shared-file edits append-friendly and re-sync with `main` before
      finalizing (per `CLAUDE.md`'s parallel-branches guidance).

---

## 7. Implemented: menu-bar simplification

**Goal (maintainer).** Keep the landing **gallery** (`/` route, `Menu.tsx`) as the
single place to choose an app — no app-to-app jumping from inside an app — and make
the top bar "make more sense." Done in this branch as a shared `AppShell` change.

**The bar, before → after:**

```
Before:  ⌂ Home   ☰ Apps   ƒ Function   [Title→Settings]   ⚙ Settings   ▶ Actions   ? Explainer
After:   ⌂ Home   ☰ Menu   [Title→Settings]   ▶ Actions   ? About
         drawer: Apps · Function · Settings · Actions   →   Settings · Actions  (default Settings)
```

**What changed (all in `AppShell.tsx`):**
- **Dropped the in-drawer Apps list** (tab + body + the internal `AppList`). The
  gallery is the sole app picker; `apps.ts` / `Menu.tsx` / routing are unchanged
  (the `apps` prop still resolves the current app's title).
- **Dropped the Function picker** (the ƒ bar button + Function tab + `FunctionList`).
  Function selection already lives in each app's **Settings** (Complex Particles'
  Settings → Function selector; Plane Transform's `Select label="Function"`), so
  nothing is stranded. The whole `useAppFunctions` plumbing was then removed
  outright — the hook + `AppFunctionsRegistration`, the two callers
  (`ParticleViewerShell`, `PlaneTransform`), `ParticleViewerShell`'s now-dead
  `functionList` prop (and ComplexParticles passing it), and the orphaned
  `.as-app-list` / `.as-app-item*` CSS.
- **Collapsed ⚙ into ☰.** The hamburger ☰ is now the sole Settings opener (so is a
  click on the Title); the standalone gear is gone. The drawer defaults to Settings
  and resets there on app change.
- **Relabelled / tidied:** ⌂ → "Home" (was "Menu"); ☰ → "Menu"; the `?` button →
  "About" (still the explainer popup). Empty **▶**/**?** are now `disabled` as well
  as dimmed, so a dimmed button is never a dead-end.

**Verified:** `npm run build` green; no other app files touched; this was re-synced
against `main` (no new commits) before editing.

**Follow-ups:**
- ~~Dead `.as-app*` CSS~~ and ~~the inert `useAppFunctions` hook + callers~~ — both
  removed in the cleanup pass (see the Function-picker bullet above).
- On the landing gallery itself, ☰ now opens an empty Settings drawer — harmless,
  but could be hidden on `/` if it bothers anyone. *(still open)*

**Catalog trim — decided: keep all apps.** The question of *which* apps to trim
from the catalog (`apps.ts`) was raised and the maintainer chose to **keep all
eight**. No catalog or route changes were made. (Were any app to be trimmed in
future, the two mechanisms remain: **retire** = route removed, or **hide but
URL-reachable** = dropped from the gallery but kept in routing, per the existing
`#/fractals-cpu` precedent.)
