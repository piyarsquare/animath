# Building a new animath app

A practical guide — for humans **and** AI agents — to adding an animation that
fits the animath framework. Follow it and your module will get the shared
gallery card, the workspace chrome (icon rail, draggable panels and view
windows, layouts, skins), the **?** explainer modal, phone re-chroming, and
code-splitting for free.

If you only read one thing: **an app is a self-contained React component in
`src/animations/<Name>/`, registered in `src/index.tsx` (route), `src/apps.ts`
(catalog) and `src/chrome/catalog.ts` (gallery card), that renders one
`<Workspace>` component — there is no base class to extend.** When in doubt,
copy the closest existing app; **`FractalsGPU` is the simplest, canonical
example** of the whole pattern.

> Background reading: `CLAUDE.md` (codebase map + framework reference),
> `docs/redesign/DESIGN-SPEC.md` (the chrome spec — stage, rail, vocabulary,
> skins, phone mode) and `README.md` (user-facing tour). `ARCHITECTURE.md` is
> historical only.

> [!IMPORTANT]
> **Before you build a visual or multi-mode feature, pin scope and get a
> reference.** The single costliest recurring habit in this repo's history
> (`docs/sessions/RECURRING_LESSONS.md`, L2) is *building the full feature, then
> asking* — the maximal version, or the wrong reading of an ambiguous request,
> finished before a cheap "how far / which meaning?" check. It shows up as 3–5
> build/revert cycles per session. So before coding **geometry, an animation, or
> any feature with >2 modes**, ask one disambiguating question: *which
> interpretation, how far should this go, and is there a reference image to match?*
> The corpus proved the up-front questionnaire measurably cuts the thrash — make it
> a reflex, not a lesson re-learned each session.
>
> **But distinguish guessing from exploring** (recipe
> [R2](sessions/RECIPES.md#r2--separate-exploring-from-guessing)). Sometimes
> neither side yet knows what the result should look like and *building is the
> thinking* — that iteration is legitimate and lots of up-front planning can get
> nowhere. The habit to kill is guessing at a **knowable** target; the remedy is a
> sharper input (a reference in any modality — image, sketch, an app to point at),
> not more planning. When the target is genuinely undiscovered, build a **small,
> reversible probe** and say it's one.

---

## 1. Pick a rendering pattern

(Distinct from the *panel archetypes* of §4 — the icon vocabulary your control
panels are written in.)

| Pattern | Use when… | Copy from | Built on |
|---------|-----------|-----------|----------|
| **Particle / 4D viewer** | you map ℂ→ℂ (or any 4D field) to a projected point cloud | `ComplexParticles` | `ParticleViewerShell` + `src/lib/particles` |
| **2D shader viewer** | you render a fragment shader you pan/zoom around | `FractalsGPU` (one view), `Correspondence` (two linked views) | raw renderer + `useViewportGestures` |
| **Custom 3D scene** | a bespoke Three.js scene (camera path, geometry) | `TopologyWalk`, `PolygonWorlds` | `Canvas3D` |
| **CSS / DOM app** | an algorithm visualizer, no WebGL | `StableMatching`, `AgenticSorting` | plain React + CSS + `lucide-react` |

All four integrate with the chrome the same way — one `<Workspace>` (§4). Only
the *content of the view windows* differs.

---

## 2. Create the folder

```
src/animations/MyApp/
├── MyApp.tsx        # the component (default export)
├── EXPLAINER.md     # short "what am I looking at?" → the ? modal  (recommended for every app)
├── README.md        # optional: longer write-up, appended to the ? modal
├── physics.ts       # optional: pull simulation / algorithm logic out of the component
├── presets.ts       # optional: data tables, configurations, named presets
├── shaders/         # optional: GLSL as inline template strings (index.ts)
└── myApp.css        # optional: for CSS/DOM apps
```

- `EXPLAINER.md` is the one doc nearly every app ships. `README.md` is
  **optional**: there is no separate "About" section anymore — both feed the
  top-bar **?** modal through the Workspace `explainer` prop, conventionally:
  ```ts
  import explainerText from './EXPLAINER.md?raw';
  import readmeText from './README.md?raw';   // only if you have one

  const help = [explainerText, readmeText].filter(Boolean).join('\n\n---\n\n');
  // …pass explainer={help} to <Workspace> (§4)
  ```
  Both are imported as raw text — they never touch component code.
- Pull non-trivial simulation/algorithm logic into sibling `.ts` modules
  (`physics.ts`, `presets.ts`, geometry helpers, …) so the `.tsx` stays focused
  on state + panels + views — see `TrinaryStars/` and `TopologyWalk/`.
- Keep the component's **default export** the app itself; the router lazy-imports it.

---

## 3. Register the app (three files)

### 3a. Route — `src/index.tsx`

Add a `React.lazy` import and a `routes` entry. The route is code-split, and
renders **bare** — your component owns its chrome by rendering `<Workspace>`.

```ts
const MyApp = React.lazy(() => import('./animations/MyApp/MyApp'));

const routes: Record<string, React.ComponentType> = {
  // …existing routes…
  '/my-app': MyApp,
};
```

### 3b. Catalog — `src/apps.ts`

Add an `AppDescriptor`. This **single array is the canonical registry** — the
gallery derives its cards from it, in the order listed.

```ts
export const apps: AppDescriptor[] = [
  // …existing entries…
  {
    hash: '/my-app',                       // must match the routes key
    name: 'My App',                        // shown in the top bar + gallery card
    icon: '◆',                             // single char / emoji (card glyph)
    blurb: 'One-line teaser for the gallery card.',
  },
];
```

### 3c. Gallery card — `src/chrome/catalog.ts`

Add a `META` entry: the gallery-only metadata. **An app without a META entry
does not appear in the gallery** (that's how the legacy `#/fractals-cpu` stays
unlisted).

```ts
const META: Record<string, { cat: Category; kind: PreviewKind; hue?: number }> = {
  // …existing entries…
  '/my-app': { cat: 'Dynamics', kind: 'trinary' },
};
```

`cat` is the filter chip (`'Complex' | 'Fractal' | 'Dynamics' | 'Algorithm'`);
`kind` picks the animated card preview (`'particles' | 'fractal' | 'trinary'`,
see `src/chrome/previews.tsx` — pick the closest; `hue` varies particle cards).

> All three edits are required. `routes` decides *what renders*; `apps.ts` +
> `catalog.ts` decide *what the user can discover*.

**Append, don't reorder.** Add your entries at the **end** of their respective
lists, and your `lazy` import next to the others. These files are the shared
coordination points every new app touches, so keeping edits additive (new lines
at the bottom) is what lets several app branches merge without conflicts — see
[§8](#8-working-on-several-apps-at-once). Don't re-sort or reformat existing
entries.

### 3d. Docs — your app's own paragraph

Your PR also **owns the documentation for your app** — don't rely on a separate
docs pass to backfill it. As additive edits (same append rule):

- **`CLAUDE.md`** — add one row to the **Routing** table and one line to the
  repository-layout tree under `src/animations/`.
- **`README.md`** — add your app to the app list and the repo tree.
- **`EXPLAINER.md`** (or your guide page) — end it with a short **"Possible
  sources & where to go further"** block: annotated pointers to the prior work and
  analogues your app draws near, framed as a reader's next step, not a priority
  claim. Name what you can stand behind and flag uncertainty — never fabricate a
  citation. This is the per-app half of the project's attribution policy
  ([`ATTRIBUTION.md`](../ATTRIBUTION.md); `CLAUDE.md` → *Attribution & AI
  collaboration*).

Keep it to *your* app's lines only; leave everyone else's untouched.

---

## 4. Build the workspace

The chrome is one component: panels and plots are draggable windows on a dotted
stage, opened from a left icon rail; the top bar carries Home, the Layout menu,
optional mode pills (`modes`/`activeMode`/`onModeChange`, e.g. Trinary's
Observatory | Lab), the **?** explainer and the skin picker. Your app declares
*what exists* — panels, view windows, layouts — and `<Workspace>` does the rest
(drag, snap, collapse, z-order, persistence, phone re-chrome).

```tsx
import Workspace from '../../chrome/workspace/Workspace';
import type { LayoutDef, SectionDef, ViewDef } from '../../chrome/workspace/types';

return (
  <Workspace
    appId="my-app"               // persistence namespace = the route id
    title="My App"
    subtitle={formula}           // optional monospace subtitle (e.g. the active formula)
    sections={sections}          // SectionDef[] — control panels (§4a)
    views={views}                // ViewDef[]    — plot window(s)   (§4b)
    layouts={layouts}            // LayoutDef[]  — built-in arrangements (§4c)
    defaultLayoutId="essentials"
    explainer={help}             // the ? modal markdown (§2)
    actions={actions}            // optional ActionDef[] — always-on strip (§4d)
  />
);
```

### 4a. Panels — `SectionDef[]` and the closed archetype vocabulary

A panel is `{ id, title, arch, node, estHeight? }`. `arch` is one of the
**closed 11-archetype vocabulary** (`src/chrome/workspace/archetypes.ts`) — it
determines the panel's rail icon and tier. One icon = one meaning, in every app:

| Tier | `arch` | Icon | Use it for |
|------|--------|------|------------|
| Define | `subject` | fx | what you're visualizing — the function/set/algorithm pick + its parameters |
| Define | `domain` | domain | input space, viewport, or starting layout |
| Render | `view` | camera | projection & camera |
| Render | `color` | palette | coloring scheme |
| Render | `marks` | sparkles | how points or cells are drawn |
| Render | `motion` | waves | continuous animation |
| Drive | `drive` | move | hands-on manipulation (rotation controls, trace mode, seed pick) |
| Drive | `playback` | play | time transport — play, step, scrub |
| Analyze | `lab` | flask | batch experiments over many runs |
| Analyze | `readout` | chart | stats & plots |
| System | `quality` | gear | resolution, detail & performance |

- The rail **sorts by tier** (Define → Render → Drive → Analyze → System), then
  by authored order within a tier. Panels may share an archetype
  (`ParticleViewerShell` ships two `marks` panels: Particles and Surface).
- `estHeight` is the estimated open height in px (default 224) — used to pick a
  free slot when a panel opens and to pack the Everything layout.
- The vocabulary is **closed**: never invent a new icon or archetype. Propose
  changes in `docs/redesign/IN-PROGRESS.md`.

Panel bodies are plain React nodes bound to your app state, built from the
primitives in `src/components/ControlPanel.tsx` — `Slider`, `Pills` (segmented
buttons), `Select` (dropdown), `Checkbox`, `RangeSlider`, `NumberInput` — so
every app shares one look. From `FractalsGPU`:

```tsx
import { Slider, Select /* Pills, Checkbox, RangeSlider, NumberInput */ } from '../../components/ControlPanel';

const setNode = <>
  <Select label="Fractal type" value={type} onChange={setType}
    options={[{ value: 'mandelbrot', label: 'Mandelbrot' }, /* … */]} />
  <Slider label="Power k" value={power} min={1} max={10} step={1}
    onChange={v => setPower(Math.round(v))} format={v => String(v)} />
</>;

const sections: SectionDef[] = [
  { id: 'set',     title: 'Set',     arch: 'subject', node: setNode,     estHeight: 220 },
  { id: 'palette', title: 'Palette', arch: 'color',   node: paletteNode, estHeight: 280 },
  { id: 'trace',   title: 'Trace',   arch: 'drive',   node: traceNode,   estHeight: 130 },
];
```

**Analyze-tier panels** (`lab` / `readout`) build their stats and plots from
the shared primitives in `src/chrome/readouts.tsx` — `Breakdown` (labeled %
bars), `MiniHisto`, `Sparkline`, `StatGrid` (stat cards), `Kicker` (mono
section label) — so the labs feel consistent across apps:

```tsx
import { Kicker, Sparkline, StatGrid } from '../../chrome/readouts';

const statsNode = <>
  <Kicker>Energy drift</Kicker>
  <Sparkline pts={energyHistory} />
  <StatGrid stats={[{ k: 'period', v: period.toFixed(2) }, { k: 'runs', v: String(runs) }]} />
</>;
```

### 4b. Views — `ViewDef[]`

A view is a plot window that lives on the stage like any other window:
draggable by its header, resizable from the bottom-right handle, collapsible,
and expandable to full screen from the header button (on phone, cards resize
from a bottom grip instead). Fullscreen restyles the same DOM node, so your
engine keeps its WebGL context — just handle container resizes.
The `node` is rendered into a positioned window body — wrap your content in an
**absolute inset-0 div** that carries the canvas and its gesture handlers:

```tsx
const views: ViewDef[] = [{
  id: 'plot',
  title: 'My plot',
  defaultRect: { x: 372, y: 16, w: 712, h: 628 },   // stage px
  node: (
    <div ref={setMount} {...gestures}
         style={{ position: 'absolute', inset: 0, overflow: 'hidden', touchAction: 'none' }}>
      {/* <canvas>, <Canvas3D onMount={…} />, or DOM */}
    </div>
  ),
}];
```

- **Resizing.** The window resizes independently of the browser window (drag
  handle, layout switches), so size your renderer with a `ResizeObserver` on
  the mount element (`Canvas3D` already does; raw renderers copy FractalsGPU's
  `handleResize`). And since **collapsed views are hidden, never unmounted** —
  WebGL state survives — a hidden window reports zero size: **ignore zero-size
  resizes** instead of poisoning the camera with a 0/0 aspect. (`setMount`
  above is FractalsGPU's state-backed callback ref, so its setup effect re-runs
  if the chrome remounts the window body, e.g. switching desktop ↔ phone.)
- Gestures stay inside the window body; the chrome only owns the header. Use
  `useViewportGestures` (2D pan/zoom/tap) or `useGestureRotation` (3D orbit).
  Multiple views are fine — `Correspondence` ships linked Mandelbrot and Julia
  windows sharing React state; each gets its own `ViewDef`.
- **Start hints.** If your view is gesture-driven (its "begin" is a tap or a
  drag, not a button), declare `hint: 'tap to choose c — the Julia set
  follows'` — a centered pass-through pill the chrome shows until the view's
  first pointer interaction (per-session). Keep the copy a short,
  math-anchored verb phrase.
- **Split views.** If two pictures are one mathematical unit (a domain and its
  image), don't make them two windows — declare `panes` instead of `node` and
  they render side-by-side in ONE window with a fixed equal split, so resize/
  collapse/fullscreen/layouts act on the pair and the two pictures keep the
  same pixels-per-unit. Plane Transform is the reference
  (`{ id: 'plane', title: 'z ↦ f(z)', panes: [{ id, label?, node }, …] }`).
  Two windows remain right when independent pan/zoom is the point
  (Correspondence).
- **Window-level key handlers** (first-person walkers, etc.) must early-return
  when focus is in a form control, or typing in panels will drive the scene:
  ```ts
  const t = document.activeElement?.tagName;
  if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
  ```

### 4c. Layouts — `LayoutDef[]`

A layout is a named arrangement: which panels are open (and where), plus
optional per-view geometry/visibility overrides. Ship one or two curated ones —
**Compact** (rail only) and **Everything** (all panels, tiled) are
auto-appended for free.

```tsx
const layouts: LayoutDef[] = [{
  id: 'essentials', name: 'Essentials', sub: 'Set · Palette', icon: 'tune',
  open: { set: { x: 84, y: 18 }, palette: { x: 84, y: 260 } },
}];
// defaultLayoutId="essentials" → what a first-time visitor sees
```

**Tabs become layouts.** `views[id].open: false` hides a view window entirely
in that layout — this is how an app with several "modes of looking" presents
them without inventing its own tab bar. `StableMatching` is the reference:

```tsx
{
  id: 'lab', name: 'Lab', sub: 'Sweep the consensus plane', icon: 'flask',
  open: { lab: { x: 84, y: 18 } },
  views: { matrix: { open: false }, surface: { open: true }, lattice: { open: false } },
},
```

(For genuinely different *apps-within-the-app* — separate state, separate
panels — use the top-bar `modes` pills instead, like Trinary.) The user's
window positions, saved layouts and current layout persist per app under
`localStorage` `animath:v1:ws:<appId>`; any manual change flips the layout to
"custom". **Don't manage window state yourself** — stale persisted ids are
sanitized away, so renaming a panel/view id simply resets that window.

### 4d. Action strip — `ActionDef[]` (only if your app is inert without it)

If a first-time user staring at your default view wouldn't know how to begin
(simulations, steppable algorithms), pass `actions` — the chrome renders an
**always-on strip** (bottom-center on desktop, above the dock on phone, alive
through fullscreen) that can never be closed. Rules (DESIGN-SPEC §2 → "The
action strip"):

```tsx
const actions: ActionDef[] = [
  { id: 'play', icon: playing ? 'pause' : 'play', label: playing ? 'Pause' : 'Play',
    primary: true, active: playing, sectionId: 'playback',
    onClick: () => setPlaying(p => !p) },
  { id: 'step',  icon: 'step',  label: 'Step',  sectionId: 'playback', disabled: playing, onClick: stepOnce },
  { id: 'reset', icon: 'reset', label: 'Reset', sectionId: 'playback', onClick: reset },
];
```

- The strip **projects your drive/playback panel** — same handlers, just the
  verbs. Set `sectionId` to that panel's id (dev-warned otherwise). Speed
  sliders, schedules, etc. stay in the panel.
- **≤ 5 actions**, **one** `primary`, **static labels** (no live numbers).
  `Step` belongs beside `Play` in algorithm apps. Sets may swap with app
  context, but the strip never moves.
- Gesture-driven viewers (pan/zoom/draw apps) should **not** pass actions —
  their begin-affordance is the view itself.

---

## 5. Render your scene

### CSS / DOM app

Nothing special — your DOM (with `overflow: 'auto'` if it scrolls) is the view
node, your controls are the panels; the §4 snippets are the entire pattern.
`StableMatching` (three DOM views + a lab) and `AgenticSorting` are the
references.

### Custom Three.js scene — `Canvas3D`

`Canvas3D` owns the scene/camera/renderer lifecycle and resize handling
(ResizeObserver, zero-size guard). You get a one-time
`onMount({ scene, camera, renderer })` callback. **Return a cleanup function**
and `Canvas3D` calls it on unmount/remount (just before it disposes the
renderer) — cancel your render loop and dispose geometries/textures there.

```tsx
import Canvas3D, { type CanvasContext } from '../../components/Canvas3D';

const onMount = useCallback((ctx: CanvasContext) => {
  const { scene, camera, renderer } = ctx;
  // build geometry, materials, lights…
  let raf = 0;
  const tick = () => { /* update… */ renderer.render(scene, camera); raf = requestAnimationFrame(tick); };
  tick();
  // Canvas3D disposes the renderer, but YOU own the rAF loop and your own
  // geometries/textures. Return a cleanup so they don't leak on remount:
  return () => { cancelAnimationFrame(raf); /* geometry/material/texture.dispose() */ };
}, [/* deps */]);

// then put <Canvas3D onMount={onMount} /> inside your ViewDef wrapper (§4b)
```

> **Critical gotcha:** `onMount` runs once and closes over whatever state it
> captured. If a control needs to change the scene, either read the latest value
> through a `ref` updated by `useEffect`, or include it in the `useCallback`
> deps so `Canvas3D` re-mounts. The model: a stable `onMount`, a `refs.current`
> object the loop reads each frame, and the returned cleanup above. (Stale state
> here is exactly the bug that broke the old MobiusWalk twist toggle.)

### 4D particle viewer — `ParticleViewerShell` + `lib/particles`

The highest-leverage path: it assembles the whole `<Workspace>` for you — the
standard **Function / Domain / Camera / Color / Particles / Surface / Motion /
4D Rotation / Detail** panels, the Essentials/Appearance/Rotate layouts,
orbit/pan/zoom gestures, the rAF loop and uniform syncing.
**Copy `src/animations/ComplexParticles/ComplexParticles.tsx`** — it is the
smallest, canonical consumer. The shape is:

```tsx
import ParticleViewerShell from '../../components/ParticleViewerShell';
import { useParticleState, useViewControls /* + geometry/loop helpers */ } from '../../lib/particles';

export default function MyParticles() {
  const state = useParticleState({ storageKey: 'my-particles' }); // sliders/toggles + setters
  const controls = useViewControls(state);       // orientation / projection / drop-axis

  const onMount = useCallback((ctx) => {
    /* build geometry + axes, wire useUniformSync, startAnimationLoop(...) */
  }, []);

  return (
    <ParticleViewerShell
      appId="my-particles"
      state={state} controls={controls} onMount={onMount}
      functionName={fnName} functionFormula={fnFormula}
      functionPicker={/* a <Select>/<Pills> of your functions */}
      readme={readmeText} explainer={explainerText}
      settingsStorageKey="my-particles"   // enables "Reset settings to defaults"
    />
  );
}
```

Function tables and complex arithmetic live in `src/lib/complexMath.ts`;
textures in `src/lib/textures.ts`; projection math in `src/lib/viewpoint.ts`;
shared enums in `src/lib/particles/types.ts`. Reuse them rather than
re-implementing.

---

## 6. Conventions & gotchas

- **Strict TypeScript.** `npm run build` runs `tsc`; it must pass with no errors.
- **State is local.** Use `useState`/`useRef`. The workspace owns only window/
  layout state (persisted under `ws:<appId>`); your app never touches it.
- **Phone behavior comes free.** Below 740px the workspace re-chromes itself:
  view windows stack as full-width cards, the rail becomes a bottom dock, and
  panels open one at a time as bottom sheets. Nothing to implement — but keep
  panel bodies **narrow-friendly** (no wide fixed-width rows), and put
  `touchAction: 'none'` on gesture surfaces.
- **Base-aware asset paths.** The Vite `base` is `/animath/`. Load anything
  from `public/` with `` `${import.meta.env.BASE_URL}textures/foo.hdr` `` —
  never a leading `/`. (See `lib/textures.ts`.)
- **Shaders** are inline GLSL template strings under the app's `shaders/`
  directory (see `ComplexParticles/shaders/index.ts`); no `.glsl` fetches.
- **Clean up.** Cancel `requestAnimationFrame` loops, `removeEventListener`,
  and disconnect observers on unmount. Older apps leak frames — don't copy that.
- **Persisting settings (optional).** Swap a control's `useState` for
  `usePersistentState(key, initial)` from `src/lib/usePersistentState.ts` — a
  drop-in that mirrors to `localStorage` under a namespaced key (e.g.
  `'my-app:speed'`). Persist *settings* (sliders, toggles, selects), not
  transient view state (camera orbit/pan) or derived values. Add a "Reset
  settings to defaults" button: `clearPersistedState('my-app')` then
  `window.location.reload()`. Particle viewers get this for free via
  `useParticleState({ storageKey })` + `ParticleViewerShell`'s
  `settingsStorageKey` prop — see `ComplexParticles`.
- **American spelling** in all user-facing text and comments — color, center,
  behavior, gray, analyze, -ize endings (matches CSS/JS language defaults).
- **Imports.** `@/` maps to `src/`; relative `../../` also works. Match the file
  you're editing.
- **Test pure logic on write.** If your app pulls simulation/algorithm/math into a
  helper `.ts` module (`physics.ts`, `complexOps.ts`, `associahedron.ts`, an
  engine), ship a committed `__tests__/*.test.ts` with it. The vitest harness
  already exists (`npm test`); the recurring miss
  (`docs/sessions/RECURRING_LESSONS.md`, L4) is verifying pure logic with throwaway
  `/tmp` scripts that never land — so the next session can't re-run the check.
  Don't unit-test the React/Three view; **do** test the extractable math.

---

## 7. Verify

```bash
npm run dev      # open http://localhost:5173/animath/#/my-app
npm run build    # MUST pass — tsc + vite build, the only CI gate
npm run lint     # keep at 0 errors (and don't add new warnings)
npm test         # vitest — and add a test for any pure logic you extracted (§6)
npm run tour -- my-app   # screenshot your app (desktop+phone · every layout) → screenshots/ (docs/SCREENSHOTS.md)
```

> The tour auto-discovers your app from `src/apps.ts`, so once it's registered
> (§3) `npm run tour -- my-app` captures it in both form factors across all its
> layouts/modes (no GPU needed — software WebGL). Add `--skins all` to check
> every theme, or `--detail overview` for a quick single thumbnail.

Manual checklist before opening a PR:

- [ ] App appears in the landing gallery (card + category chip — needs `META`, §3c).
- [ ] Top-bar title (and formula subtitle, if any) shows; **?** opens your
      `EXPLAINER.md` (and `README.md` below the divider, if you ship one).
- [ ] The rail shows your panels, tier-sorted, with the right archetype icons;
      the Layout menu lists your layouts plus Compact/Everything, and
      `defaultLayoutId` is a sensible first impression.
- [ ] The view window drags/resizes; the canvas keeps rendering after a resize
      and after collapse → expand (no 0/0-aspect smear).
- [ ] Works at phone width (≤740px): stacked cards, dock, sheets; panel bodies fit the sheet.
- [ ] Eyeballed headless across layouts/form factors: `npm run tour -- my-app` renders cleanly (a fast proxy for opening every layout by hand) — [docs/SCREENSHOTS.md](SCREENSHOTS.md).
- [ ] No console errors; rAF loops and listeners are cleaned up on navigation away.
- [ ] Pure logic you extracted ships a committed vitest file (`npm test` green) — [§6](#6-conventions--gotchas).
- [ ] Docs updated for your app (`CLAUDE.md` route table + tree, `README.md`) — [§3d](#3d-docs--your-apps-own-paragraph).
- [ ] Latest `main` merged in and `npm run build` re-run (green) — [§8](#8-working-on-several-apps-at-once).

---

## 8. Working on several apps at once

Multiple app branches (often in separate agent threads) can be in flight at the
same time. The framework is built to make that safe: **each app is a
self-contained folder, so the bulk of every branch never overlaps.** The only
files two app branches both touch are the shared coordination points:

- `src/index.tsx` (route map), `src/apps.ts` (catalog) and
  `src/chrome/catalog.ts` (gallery META)
- `CLAUDE.md` and `README.md` (the route table + repo tree)

All of them are edited **additively** (§3a–3d). Git auto-merges additive edits
in different regions, so independent app branches normally merge with **no
conflicts, in any order**. Two rules keep it that way:

1. **Append, never reorder.** New entries go at the bottom of each list/table.
   Don't re-sort, rename, or reformat existing lines — that's what turns a clean
   auto-merge into a conflict.
2. **Own only your app's lines.** Touch the shared files solely to add *your*
   app. Leave other apps' rows, routes, and catalog entries alone.

### Merge / PR workflow for a new app

Because `main` moves under you while you work, **re-sync before you open (or
finalize) the PR** so your branch reflects the latest set of apps:

```bash
git fetch origin
git merge origin/main          # or: git rebase origin/main
# resolve any conflicts — for the shared files it's almost always
# "keep both": your new entry AND theirs. Never delete another app's lines.
npm run build                  # MUST pass again after the merge
```

Then push and open the PR. Concretely:

1. Build your app on its own branch; register it and write its docs (§3).
2. `git fetch && git merge origin/main`; resolve the shared-file edits by
   keeping every app's entries (yours + any that landed while you worked).
3. `npm run build` — green — then verify the app still loads (§7).
4. Push and open the PR. If another app's PR merges before yours, repeat step 2;
   the re-sync is cheap precisely because the edits are additive.

> **Why this matters here:** the chrome overhaul (`docs/redesign/DESIGN-SPEC.md`)
> replaced the old AppShell drawer with the workspace described above. App
> branches started before it landed should pull `main`, port their integration
> to `<Workspace>` (this guide), then add their own route-table row, tree line,
> and catalog entries as part of their PR — no central catch-up pass.

---

## 9. Quick reference — files you'll touch

| File | Why |
|------|-----|
| `src/animations/MyApp/MyApp.tsx` | the component (renders `<Workspace>`) |
| `src/animations/MyApp/EXPLAINER.md` | ? modal text (`?raw`) — recommended |
| `src/animations/MyApp/README.md` | longer write-up appended to the ? modal (`?raw`) — optional |
| `src/animations/MyApp/*.ts` | optional logic/data helpers (physics, presets, geometry) |
| `src/index.tsx` | lazy route registration (append) |
| `src/apps.ts` | catalog entry — the canonical registry (append) |
| `src/chrome/catalog.ts` | gallery META: category + preview kind (append) |
| `CLAUDE.md` | route-table row + repo-tree line for your app (append) |
| `README.md` | app list + repo-tree entry for your app (append) |
| `src/chrome/workspace/` | `Workspace` + the `SectionDef`/`ViewDef`/`LayoutDef` types + the closed archetype vocabulary (import only) |
| `src/chrome/readouts.tsx` | Analyze-tier readout primitives (import only) |
| `src/components/ControlPanel.tsx` | form primitives (import only) |
| `src/components/Canvas3D.tsx` | Three.js wrapper (import only) |
| `src/components/ParticleViewerShell.tsx` | turnkey 4D viewer (import only) |
| `src/lib/particles/` | particle engine (import only) |
