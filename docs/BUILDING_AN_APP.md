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
├── README.md        # longer write-up → in-app "About" section
├── EXPLAINER.md     # short "what am I looking at?" → the ? popup
├── shaders/         # optional: GLSL as inline template strings (index.ts)
└── myApp.css        # optional: for CSS/DOM apps
```

- `README.md` and `EXPLAINER.md` are imported as raw text — they never touch
  component code and can be edited freely:
  ```ts
  import readmeText from './README.md?raw';
  import explainerText from './EXPLAINER.md?raw';
  ```
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
| `useAppHeader(title, subtitle?)` | Sets the top-bar title and an optional monospace subtitle (e.g. a formula). |
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
a one-time `onMount({ scene, camera, renderer })` callback.

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
  // NOTE: Canvas3D disposes the renderer on unmount, but YOU own your rAF loop.
  // Cancel it (see gotchas) to avoid leaks.
}, [/* deps */]);

return <Canvas3D onMount={onMount} />;
```

> **Critical gotcha:** `onMount` runs once and closes over whatever state it
> captured. If a control needs to change the scene, either read the latest value
> through a `ref` updated by `useEffect`, or include it in the `useCallback`
> deps so `Canvas3D` re-mounts. (This is exactly the bug that broke the old
> MobiusWalk twist toggle.)

### 4D particle viewer — `ParticleViewerShell` + `lib/particles`

This is the highest-leverage path: you get the standard **Function / Camera /
Color / Particles / Motion / Detail / About** sections, the `QuarterTurnFloater`,
camera-orbit/pan/zoom gestures, the rAF loop and uniform syncing for free.

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
- [ ] **?** button opens your `EXPLAINER.md`; **About** shows your `README.md`.
- [ ] Settings/Actions render and the dimmed buttons light up appropriately.
- [ ] Works on a narrow viewport; gestures don't fight page scroll.
- [ ] No console errors; rAF loops and listeners are cleaned up on navigation away.
- [ ] `npm run build` is green.

---

## 8. Quick reference — files you'll touch

| File | Why |
|------|-----|
| `src/animations/MyApp/MyApp.tsx` | the component |
| `src/animations/MyApp/README.md` | About text (`?raw`) |
| `src/animations/MyApp/EXPLAINER.md` | ? popup text (`?raw`) |
| `src/index.tsx` | lazy route registration |
| `src/apps.ts` | catalog entry (drawer + menu) |
| `src/components/AppShell.tsx` | integration hooks/components (import only) |
| `src/components/ControlPanel.tsx` | form primitives (import only) |
| `src/components/Canvas3D.tsx` | Three.js wrapper (import only) |
| `src/components/ParticleViewerShell.tsx` | turnkey 4D viewer (import only) |
| `src/lib/particles/` | particle engine (import only) |
</content>
