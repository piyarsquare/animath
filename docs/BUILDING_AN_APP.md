# Building a new animath app

A practical guide — for humans **and** AI agents — to adding an animation that
fits the animath framework. Follow it and your module will get the shared
navigation, settings drawer, actions floater, function picker, help popup, mobile
gestures, and code-splitting for free.

If you only read one thing: **an app is a self-contained React component in
`src/animations/<Name>/`, registered in `src/index.tsx` (route) and `src/apps.ts`
(catalog), that talks to the shell through hooks — there is no base class to
extend.** When in doubt, copy the closest existing app.

> Background reading: `CLAUDE.md` (codebase map + framework reference) and
> `README.md` (user-facing tour). `ARCHITECTURE.md` is historical only.

---

## 1. Pick an archetype

| Archetype | Use when… | Copy from | Built on |
|-----------|-----------|-----------|----------|
| **Particle / 4D viewer** | you map ℂ→ℂ (or any 4D field) to a projected point cloud | `ComplexParticles` | `ParticleViewerShell` + `src/lib/particles` |
| **2D shader viewer** | you render a full-screen fragment shader you pan/zoom around | `FractalsGPU`, `Correspondence` | `Canvas3D`/raw renderer + `useViewportGestures` |
| **Custom 3D scene** | a bespoke Three.js scene (camera path, geometry) | `MobiusWalk` | `Canvas3D` |
| **CSS / DOM app** | an algorithm visualiser, no WebGL | `StableMarriage`, `AgenticSorting` | plain React + CSS + `lucide-react` |

All four integrate with the shell the same way (Section 4). Only the *rendering*
differs.

---

## 2. Create the folder

```
src/animations/MyApp/
├── MyApp.tsx        # the component (default export)
├── EXPLAINER.md     # short "what am I looking at?" → the ? popup  (recommended for every app)
├── README.md        # optional: longer write-up → in-app "About" section
├── physics.ts       # optional: pull simulation / algorithm logic out of the component
├── presets.ts       # optional: data tables, configurations, named presets
├── shaders/         # optional: GLSL as inline template strings (index.ts)
└── myApp.css        # optional: for CSS/DOM apps
```

- `EXPLAINER.md` is the one doc nearly every app ships — it powers the **?**
  popup and is registered with `useAppExplainer`. `README.md` is **optional**:
  it backs the in-app **About** section, which the `ParticleViewerShell` viewers
  render automatically and other apps render if they choose. A custom canvas app
  can skip `README.md` entirely (the Trinary System module ships only an
  `EXPLAINER.md`).
- Both are imported as raw text — they never touch component code and can be
  edited freely:
  ```ts
  import explainerText from './EXPLAINER.md?raw';
  import readmeText from './README.md?raw';   // only if you have one
  ```
- Pull non-trivial simulation/algorithm logic into sibling `.ts` modules
  (`physics.ts`, `presets.ts`, geometry helpers, …) so the `.tsx` stays focused
  on state + rendering + controls. See `TrinaryStars/` (physics + presets) and
  `MobiusWalk/` (corridorGeometry + objects) for the pattern.
- Keep the component's **default export** the app itself; the router imports it
  lazily.

---

## 3. Register the app (two files)

### 3a. Route — `src/index.tsx`

Add a `React.lazy` import and a `routes` entry. The route is code-split, so the
app's JS only loads when its hash is visited.

```ts
const MyApp = React.lazy(() => import('./animations/MyApp/MyApp'));

const routes: Record<string, React.ComponentType> = {
  // …existing routes…
  '/my-app': MyApp,
};
```

### 3b. Catalog — `src/apps.ts`

Add an `AppDescriptor`. This **single array drives both** the drawer's Apps tab
and the landing-page gallery, in the order listed.

```ts
export const apps: AppDescriptor[] = [
  // …existing entries…
  {
    hash: '/my-app',                       // must match the routes key
    name: 'My App',                        // shown in bar, drawer, menu card
    icon: '◆',                             // single char / emoji
    blurb: 'One-line teaser for the menu card.',
  },
];
```

> Both edits are required. The `routes` map decides *what renders*; `apps.ts`
> decides *what the user can discover*. Forgetting `apps.ts` makes the app
> reachable only by typing the hash.

**Append, don't reorder.** Add your `routes` entry and `AppDescriptor` at the
**end** of their respective lists, and your `lazy` import next to the others.
These two files are the shared coordination points every new app touches, so
keeping edits additive (new lines at the bottom) is what lets several app
branches merge without conflicts — see [§8](#8-working-on-several-apps-at-once).
Don't re-sort or reformat the existing entries.

### 3c. Docs — your app's own paragraph

Your PR also **owns the documentation for your app** — don't rely on a separate
docs pass to backfill it. As additive edits (same append rule):

- **`CLAUDE.md`** — add one row to the **Routing** table and one line to the
  repository-layout tree under `src/animations/`.
- **`README.md`** — add your app to the app list and the repo tree.

Keep it to *your* app's lines only; leave everyone else's untouched.

---

## 4. Integrate with the AppShell

Import from `src/components/AppShell.tsx`. None of these are mandatory, but the
header is what makes your app look "wired in".

```tsx
import {
  useAppHeader, useAppExplainer, useAppFunctions,
  ShellSettings, ShellActions, useActionFloaterOff,
} from '../../components/AppShell';
```

| API | What it does |
|-----|--------------|
| `useAppHeader(title, subtitle?)` | Sets the top-bar title and an optional monospace subtitle — a formula, a current preset name, whatever labels the active state. |
| `useAppExplainer(markdown \| null)` | Supplies the **?** popup content. Pass your imported `explainerText`. |
| `useAppFunctions({ names, current, onChange } \| null)` | Registers a flat function list so the **ƒ** button + Function tab can switch it without opening Settings. Omit if your app has no "function". |
| `<ShellSettings>…</ShellSettings>` | Portals its children into the drawer's **Settings** tab. |
| `<ShellActions>…</ShellActions>` | Portals into **both** the **Actions** tab and the draggable on-canvas `ActionFloater`. |
| `useActionFloaterOff()` | Suppresses the generic floater (use if you ship your own, like Correspondence's scrubber). |

Build the controls from the primitives in `src/components/ControlPanel.tsx` so
every app shares one look:

```tsx
import { Section, Slider, Pills, Select, Checkbox } from '../../components/ControlPanel';

<ShellSettings>
  <Section title="Shape" icon="✦" defaultOpen>
    <Slider label="Size" value={size} min={1} max={20} step={0.5}
            onChange={setSize} format={v => v.toFixed(1)} />
    <Pills label="Mode"
           options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]}
           value={mode} onChange={setMode} />
    <Checkbox label="Wireframe" checked={wire} onChange={setWire} />
  </Section>
</ShellSettings>
```

`Section` is a collapsible group; `Slider`, `Pills` (segmented buttons),
`Select` (dropdown) and `Checkbox` are the inputs. Prefer them over raw
`<input>` elements.

---

## 5. Render your scene

### CSS / DOM app

Nothing special — render your markup and (optionally) register settings/actions.

```tsx
export default function MyApp() {
  const [speed, setSpeed] = useState(1);
  useAppHeader('My App');
  useAppExplainer(explainerText);
  return (
    <div className="as-content-scroll myapp">
      {/* …your visualiser… */}
      <ShellSettings>
        <Section title="Controls" icon="⚙" defaultOpen>
          <Slider label="Speed" value={speed} min={0} max={5} step={0.1}
                  onChange={setSpeed} format={v => `${v.toFixed(1)}×`} />
        </Section>
      </ShellSettings>
    </div>
  );
}
```

Use the `as-content-scroll` class on a root wrapper if your content should scroll
within the shell (see `Menu.tsx`).

### Custom Three.js scene — `Canvas3D`

`Canvas3D` owns the scene/camera/renderer lifecycle and resize handling. You get
a one-time `onMount({ scene, camera, renderer })` callback. **Return a cleanup
function** and `Canvas3D` calls it on unmount/remount (just before it disposes
the renderer) — cancel your render loop and dispose geometries/textures there.

```tsx
import Canvas3D, { type CanvasContext } from '../../components/Canvas3D';

const onMount = useCallback((ctx: CanvasContext) => {
  const { scene, camera, renderer } = ctx;
  // build geometry, materials, lights…
  let raf = 0;
  const tick = () => {
    // update…
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };
  tick();
  // Canvas3D disposes the renderer, but YOU own the rAF loop and your own
  // geometries/textures. Return a cleanup so they don't leak on remount:
  return () => {
    cancelAnimationFrame(raf);
    // geometry.dispose(); material.dispose(); texture.dispose(); …
  };
}, [/* deps */]);

return <Canvas3D onMount={onMount} />;
```

> **Critical gotcha:** `onMount` runs once and closes over whatever state it
> captured. If a control needs to change the scene, either read the latest value
> through a `ref` updated by `useEffect`, or include it in the `useCallback`
> deps so `Canvas3D` re-mounts. The model is a stable `useCallback` `onMount`, a
> `refs.current` object the loop reads each frame for live slider values, and the
> returned cleanup above. (Capturing stale state here is exactly the bug that
> broke the old MobiusWalk twist toggle.) If you'd rather not return a cleanup,
> the alternative is to stash the rAF id / disposables in a `ref` and cancel them
> from a separate `useEffect` teardown — but the returned cleanup is simpler.

### 4D particle viewer — `ParticleViewerShell` + `lib/particles`

This is the highest-leverage path: you get the standard **Function / Camera /
Color / Particles / Motion / Detail / About** sections, the `QuarterTurnControls`
(4D turns + spin, in the Actions panel), camera-orbit/pan/zoom gestures, the rAF
loop and uniform syncing for free.

**Copy `src/animations/ComplexParticles/ComplexParticles.tsx`** — it is the
smallest, canonical consumer. The shape is:

```tsx
import ParticleViewerShell from '../../components/ParticleViewerShell';
import {
  useParticleState, useViewControls, useUniformSync,
  createParticleGeometry, createAxes, startAnimationLoop,
} from '../../lib/particles';

export default function MyParticles() {
  const state = useParticleState();              // all sliders/toggles + setters
  const controls = useViewControls(state);       // orientation / projection / drop-axis

  const onMount = useCallback((ctx) => {
    // build geometry + axes, wire useUniformSync, startAnimationLoop(...)
  }, [/* … */]);

  return (
    <ParticleViewerShell
      state={state}
      controls={controls}
      onMount={onMount}
      functionName={fnName}
      functionFormula={fnFormula}
      functionPicker={/* a <Select>/<Pills> of your functions */}
      functionList={{ names, currentIndex, onChangeIndex }}  // drives the ƒ button
      readme={readmeText}
      explainer={explainerText}
    />
  );
}
```

The function tables and complex arithmetic live in `src/lib/complexMath.ts`;
texture options in `src/lib/textures.ts`; projection math + `ProjectionMode` in
`src/lib/viewpoint.ts`; shared enums (`ColorStyle`, `ColourBy`, `shapeNames`,
`viewTypes`, …) in `src/lib/particles/types.ts`. Reuse them rather than
re-implementing.

---

## 6. Conventions & gotchas

- **Strict TypeScript.** `npm run build` runs `tsc`; it must pass with no errors.
- **State is local.** Use `useState`/`useRef`. The only shared "context" is the
  AppShell, and you touch it solely through the hooks above.
- **Base-aware asset paths.** The Vite `base` is `/animath/`. Load anything from
  `public/` with `import.meta.env.BASE_URL`, e.g.
  `` `${import.meta.env.BASE_URL}textures/foo.hdr` `` — never a leading `/`.
  (See `lib/textures.ts`.)
- **Shaders** are inline GLSL template strings under the app's `shaders/`
  directory (see `ComplexParticles/shaders/index.ts`). No `.glsl` fetches at
  runtime.
- **Clean up.** Cancel `requestAnimationFrame` loops, `removeEventListener`, and
  disconnect observers on unmount. Several older apps leak frames — don't copy
  that.
- **Mobile first.** Use `useResponsive()` from `src/styles/responsive.ts` for
  breakpoints, and `touchAction: 'none'` on gesture surfaces. The shell already
  reserves iOS safe-area insets.
- **Persisting settings (optional).** To make a control survive a reload, swap
  its `useState` for `usePersistentState(key, initial)` from
  `src/lib/usePersistentState.ts` — a drop-in that mirrors to `localStorage`
  under a namespaced key (e.g. `` `${'my-app'}:speed` ``). Persist *settings*
  (sliders, toggles, selects), not transient view state (camera orbit/pan) or
  derived values. Add a "Reset settings to defaults" button that calls
  `clearPersistedState('my-app')` then `window.location.reload()`. Particle
  viewers get this for free via `useParticleState({ storageKey })` +
  `ParticleViewerShell`'s `settingsStorageKey` prop — see `ComplexParticles`.
- **Imports.** `@/` maps to `src/`; relative `../../` also works. Match the file
  you're editing.

---

## 7. Verify

```bash
npm run dev      # open http://localhost:5173/animath/#/my-app
npm run build    # MUST pass — tsc + vite build, the only CI gate
```

Manual checklist before opening a PR:

- [ ] App appears on the landing menu and in the drawer's Apps tab.
- [ ] Top-bar title (and formula, if any) shows via `useAppHeader`.
- [ ] **?** button opens your `EXPLAINER.md` (and the **About** section shows
      your `README.md`, if you ship one).
- [ ] Settings/Actions render and the dimmed buttons light up appropriately.
- [ ] Works on a narrow viewport; gestures don't fight page scroll.
- [ ] No console errors; rAF loops and listeners are cleaned up on navigation away.
- [ ] Docs updated for your app (`CLAUDE.md` route table + tree, `README.md`) — [§3c](#3c-docs--your-apps-own-paragraph).
- [ ] Latest `main` merged in and `npm run build` re-run — [§8](#8-working-on-several-apps-at-once).
- [ ] `npm run build` is green.

---

## 8. Working on several apps at once

Multiple app branches (often in separate agent threads) can be in flight at the
same time. The framework is built to make that safe: **each app is a
self-contained folder, so the bulk of every branch never overlaps.** The only
files two app branches both touch are the shared coordination points:

- `src/index.tsx` (route map) and `src/apps.ts` (catalog)
- `CLAUDE.md` and `README.md` (the route table + repo tree)

All four are edited **additively** (§3a–3c). Git auto-merges additive edits in
different regions, so independent app branches normally merge with **no
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

> **Why this matters here:** the docs-refresh PR that introduced this guide is
> expected to land first and establish the structure above. App branches in
> flight should pull `main` afterward, then add their own route-table row, tree
> line, and catalog entry as part of their PR — so the docs stay correct as each
> app merges, with no central catch-up pass.

---

## 9. Quick reference — files you'll touch

| File | Why |
|------|-----|
| `src/animations/MyApp/MyApp.tsx` | the component |
| `src/animations/MyApp/EXPLAINER.md` | ? popup text (`?raw`) — recommended |
| `src/animations/MyApp/README.md` | About text (`?raw`) — optional |
| `src/animations/MyApp/*.ts` | optional logic/data helpers (physics, presets, geometry) |
| `src/index.tsx` | lazy route registration (append) |
| `src/apps.ts` | catalog entry — drawer + menu (append) |
| `CLAUDE.md` | route-table row + repo-tree line for your app (append) |
| `README.md` | app list + repo-tree entry for your app (append) |
| `src/components/AppShell.tsx` | integration hooks/components (import only) |
| `src/components/ControlPanel.tsx` | form primitives (import only) |
| `src/components/Canvas3D.tsx` | Three.js wrapper (import only) |
| `src/components/ParticleViewerShell.tsx` | turnkey 4D viewer (import only) |
| `src/lib/particles/` | particle engine (import only) |
</content>
