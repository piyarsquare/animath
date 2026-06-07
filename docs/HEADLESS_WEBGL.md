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
