# Handoff: animath UI redesign

**Audience:** an autonomous coding agent (or developer) with write access to the animath repository
(`piyarsquare.github.io/animath` — React) and permission to update the main branch.

**Mission:** replace animath's current chrome (top bar, drawer menus, floating control panel, landing
page) with the redesigned system specified here, **without touching the math/rendering engines** of the
individual visualizations. This is a chrome/UX refactor, not a rewrite.

---

## About the design files in this bundle

The `.html` / `.jsx` / `.css` files here are **design references built in HTML/React (Babel-in-browser)**.
They are a working prototype of the intended look and behavior — **not production code to copy in
directly**. Your task is to *recreate* this design inside the animath repo's existing React environment,
using its established build setup, component patterns, and state conventions. Where the prototype and the
repo's conventions conflict, follow the repo's conventions and preserve the design's *behavior and look*.

The prototype's control panels contain **mock controls with local state**. In the real app every control
must bind to the app's actual parameters (the repo already has these — function selectors, rotation
drivers, iteration counts, etc).

## Fidelity

**High-fidelity.** Colors, typography, spacing, radii, and interaction behavior are final design intent.
Recreate them precisely from `theme.css` (the single source of design tokens) and the component CSS.
Exact values are in **DESIGN-SPEC.md** and in the bundled CSS itself.

---

## The design in one paragraph

A user lands on a **gallery** (hero, category filters, live animated preview cards — one per
visualization). Clicking a card opens that app's **workspace**: a full-viewport dotted "void" canvas
where **everything is a window** — the plot(s) themselves ("view windows") and the control panels alike.
Panels open from a **left icon rail** whose icons come from a fixed 11-icon vocabulary shared by all
apps. Windows drag with **soft-magnetic snapping**, dock **tightly together** (no gap), never overlap
when docking, reflow as a chain when one collapses, and raise to the top when touched. Arrangements are
saved as named **Layouts** per app. The brand mark (top-left) is **Home** — the only way between apps is
through the gallery. Five **skins** restyle the whole product via one `data-theme` attribute. Below
740px the workspace re-chromes into a phone UI: stacked view cards, a bottom dock instead of the rail,
and panels as bottom sheets.

## Files in this bundle

| File | Role |
|---|---|
| `DESIGN-SPEC.md` | Complete spec: IA, vocabulary, workspace mechanics, tokens, phone mode |
| `IMPLEMENTATION.md` | Phased plan, how to begin, acceptance criteria per phase |
| `IN-PROGRESS.md` | Known gaps / deliberately unfinished areas ("branches in process") |
| `Animath.html` | Entry point of the prototype (open in a browser to experience it) |
| `Animath Phone.html` | Device-bezel harness showing the same app at phone width |
| `theme.css` | **All design tokens** — 5 skins, type system, every component style |
| `journey.jsx` | Router + gallery (landing page) |
| `workspace.jsx` | The workspace engine: windows, snapping, docking, layouts, phone chrome |
| `chrome.jsx` | App catalog, the 11-archetype vocabulary, per-app panel definitions |
| `ui.jsx` | Icon set, control primitives, skin picker, `usePhone` |
| `viz.jsx` | Mock canvas visualizations (replace with the repo's real engines) |

Open `Animath.html` in any browser (needs network for fonts/React CDN) to click through everything.

## How to begin

1. Read this README, then **DESIGN-SPEC.md** end to end.
2. Open `Animath.html` in a browser and click through: gallery → an app → open/drag/dock panels →
   switch layouts → switch skins → resize below 740px.
3. Explore the repo: map each existing app's controls to the archetype table in DESIGN-SPEC §3
   (a starting mapping is provided there).
4. Follow **IMPLEMENTATION.md** phase by phase. Each phase is independently shippable to main.
5. Keep `IN-PROGRESS.md` updated — it is the live ledger of what remains.
