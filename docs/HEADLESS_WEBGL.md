# Headless WebGL (cloud / CI eyeballing)

The cloud container that Claude Code on the web runs in has **no GPU**
(`/dev/dri` is absent) and ships **no browser**, so Three.js / WebGL apps
can't be seen running there by default — only `npm run build` (a type-check)
validates changes. This setup adds **software WebGL** so a real frame can be
captured and visually reviewed.

## How it works

We run the actual built app in **headless Chromium** with **ANGLE +
SwiftShader** (a CPU implementation of WebGL2), then screenshot the canvas.
SwiftShader is slow but renders WebGL2 scenes correctly for static shots.
Because a PNG lands on disk, an agent can open it and verify the render.

Pieces:

| File | Role |
|------|------|
| `package.json` | `puppeteer` devDependency + `npm run shoot` alias |
| `scripts/install_headless_webgl.sh` | provisions Chrome libs + Chrome-for-Testing (idempotent, cloud-only) |
| `scripts/shoot.mjs` | launches headless Chromium with software-WebGL flags and screenshots a route |
| `.claude/settings.json` | `SessionStart` hook that runs the install script in cloud sessions |

## Usage

```bash
npm run build          # produce dist/
npm run preview &      # serve at http://localhost:4173/animath/
sleep 3
npm run shoot '#/topology-walk' shot.png   # capture a route to shot.png
```

`shoot.mjs` prints the live WebGL renderer string (e.g. `SwiftShader`) so you
can confirm the context is real, not a blank quad. Env knobs: `BASE_URL`,
`WAIT_MS`, `VIEWPORT` (`WxH`).

## Debug-pose deep links (reproduce an exact frame)

`shoot.mjs` captures whatever the app shows — by default its *initial* view. The
**first-person walkers** (Polygon Worlds, Solid Worlds) also accept a **pose in the
hash query**, so a single shareable URL reproduces an *exact* frame: world, scene
look, camera, and player position. This turns "verified headless" from a blind
default-view shot into a reproducible visual diff (and doubles as a shareable
teaching link — "stand here, face the Klein flip").

The parser is `src/lib/debugPose.ts` (app-agnostic; each app maps the params it
understands, ignores the rest). Vocabulary:

| Param | Meaning | Apps |
|-------|---------|------|
| `world=<id>` | world / spec id | both |
| `look=<id>` | scene look (e.g. `daytime`, `dusk`, `moonlit`) | both |
| `cam=first\|third` | camera mode | both |
| `camd=<n>` | third-person camera distance | both |
| `yaw=<rad>` `pitch=<rad>` | look orientation | both |
| `x,y,z=<n>` | cube position, −1..1 | Solid Worlds |
| `u,v=<n>` | chart position, 0..1 | Polygon Worlds |
| `hud` / `debug=1` | show the opt-in dev HUD | both |
| `freeze` / `t=<s>` | pin the animation clock (parsed; for animated states) | — |

The opt-in **dev HUD** (`?hud`) overlays the live diagnostics — world·look, position,
yaw/pitch, the orientation **determinant**, the fundamental cell, nearest-marker
distance, and (Polygon Worlds) an *independent* ink-handedness **witness** — so the
screenshot records *what the engine thinks the frame is*, not just the picture.

```bash
# Reproduce a specific walker frame, with the HUD, then read the PNG:
npm run shoot \
  '#/solid-worlds?world=half-turn&x=0.4&z=-0.3&yaw=0.8&look=dusk&cam=third&camd=8&hud' \
  out.png
npm run shoot \
  '#/polygon-worlds?world=klein&u=0.2&v=0.85&yaw=1.2&look=dusk&cam=third&hud' out.png
```

> [!NOTE]
> Two shots of the *same* URL from *separate* headless runs are **visually
> identical but not byte-identical** — a handful of sub-pixel differences from
> cross-process SwiftShader float nondeterminism. Compare frames with a **pixel
> tolerance** (a coarse hash / per-pixel threshold), never `cmp`. (Within one page
> load the frame is byte-stable.)

## Mobile smoke (`npm run smoke`)

The desktop `tsc && vite build` gate can't catch a runtime crash / blank frame that
only shows at a real mobile viewport (the #216 Torus crash, the #215 height bug).
`scripts/smoke.mjs` closes that no-cost tier: it loads **every route at 390×844** in
software WebGL and fails (exit 1) on the crash class.

```bash
npm run build && (npm run preview &) && sleep 3
npm run smoke            # PASS/FAIL across all routes; exit 0/1
# SHOTS_DIR=./shots npm run smoke   # also dump a PNG per route to eyeball
```

Detectors (designed from a measured experiment, not assumed):

- **`pageerror` (uncaught JS) + `webglcontextlost`** — *load-bearing* (fail). Three.js
  swallows shader-compile errors, so the #216 crash surfaced as **context loss**, not
  a console error.
- **`console.error`** — *advisory* (warning), with a resource-load allowlist (every
  clean route logs a 404 + a cert failure, so only a non-allowlisted error is shown).
- **dead-frame** — low luma **variance** of the **canvas-clipped screenshot** (the true
  composited frame). Not `gl.readPixels` (returns black on `preserveDrawingBuffer:false`)
  and not in-page `drawImage(canvas)` (reads blank on the on-demand-render apps). A
  dark-but-alive frame (ComplexParticles, variance ~3000) passes; a blank one fails.

It is **not** a substitute for a real-device pass — `phone-needed` stays a standing
signal — it closes the no-cost tier. CI runs it as a **non-blocking** PR check
(`.github/workflows/smoke.yml`, `continue-on-error`); promote to a hard gate once it's
proven quiet.

## Environment / network notes

- **Network**: works under the default **Trusted** policy — Chrome-for-Testing
  downloads from `storage.googleapis.com` and runtime libs from
  `archive.ubuntu.com`, both already allowlisted. No custom domains needed.
  (Playwright was avoided because its CDN, `cdn.playwright.dev`, is *not* in
  the Trusted defaults and would require a Custom allowlist entry.)
- **Setup caching**: the install runs via a `SessionStart` hook so it travels
  with the repo. For faster cold starts you can instead paste the contents of
  `scripts/install_headless_webgl.sh` into the environment's **Setup script**
  field (web UI), which is snapshot-cached and skips re-running each session.
- **Broken PPAs**: the base image carries third-party PPAs (`deadsnakes`,
  `ondrej/php`) hosted on a non-allowlisted domain that break `apt-get update`;
  the install script updates only the main Ubuntu sources to avoid failing.
