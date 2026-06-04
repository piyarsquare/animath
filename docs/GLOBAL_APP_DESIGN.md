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
> what was actually built rather than from scratch.

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

What *every* app inherits from `AppShell`, per the two inventories:

- **Top bar (48px, fixed).** Left-clustered icon buttons: **⌂ Home · ☰ Apps ·
  ƒ Function · [Title/formula] · ⚙ Settings · ▶ Actions · ? Explainer**. Buttons
  dim to ~40% when their target is empty. Title click → Settings; title shows an
  optional monospace subtitle (formula / scenario name). Driven by `useAppHeader`.
- **Drawer (slides from the left, ~340px).** Four tabs: **Apps · Function ·
  Settings · Actions**. Apps and Function are generic lists; **Settings** and
  **Actions** are *portal targets* an app fills via `<ShellSettings>` /
  `<ShellActions>`. Tab labels dim when empty. Scrim / Esc closes.
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

## 4. Directions for refining common elements (to be discussed)

Candidate reusable improvements implied by §3 — **not yet decided**, captured for
the design conversation:

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
   `lib/nbody/` pattern: app-agnostic, React/Three-free cores under `src/lib/`.

---

## 5. Next steps

- [ ] Confirm with the maintainer which seams to tackle first (action model vs.
      Settings layout vs. single-source controls).
- [ ] For the chosen theme, draft the shared-API change against `AppShell` /
      `ControlPanel` and check it against *both* anchor snapshots so no app
      regresses.
- [ ] Keep shared-file edits append-friendly and re-sync with `main` before
      finalizing (per `CLAUDE.md`'s parallel-branches guidance).
