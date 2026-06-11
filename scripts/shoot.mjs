#!/usr/bin/env node
// Headless-WebGL screenshot harness for animath.
//
// There is no GPU in the cloud/CI container, so this drives a headless
// Chromium with ANGLE + SwiftShader (software WebGL2) to render the real
// built app and capture a PNG. Use it to *eyeball* Three.js / WebGL changes
// that can't otherwise be verified without a display.
//
// Usage:
//   1. Build + serve the app:   npm run build && npm run preview &
//   2. Shoot a route:           node scripts/shoot.mjs '#/topology-walk' out.png
//
// Args:
//   argv[2]  route hash (default '#/')          e.g. '#/topology-walk'
//   argv[3]  output PNG path (default shot.png)
//
// Env:
//   BASE_URL   server origin + base (default http://localhost:4173/animath/)
//   WAIT_MS    extra settle time after canvas appears (default 2500)
//   VIEWPORT   "WxH" (default 1280x800)
//   SEED_LS    JSON object of localStorage key → value (values JSON-encoded as
//              usePersistentState stores them), seeded before the app boots —
//              e.g. SEED_LS='{"animath:v1:complex-particles:renderMode":"\"Sheet\""}'

import puppeteer from 'puppeteer';

const route = process.argv[2] ?? '#/';
const outPath = process.argv[3] ?? 'shot.png';
const baseUrl = process.env.BASE_URL ?? 'http://localhost:4173/animath/';
const waitMs = Number(process.env.WAIT_MS ?? 2500);
const [vw, vh] = (process.env.VIEWPORT ?? '1280x800').split('x').map(Number);

const url = baseUrl.replace(/\/?$/, '/') + route.replace(/^#?\/?/, '#/');

// Flags that force software WebGL2 with no GPU present. --enable-unsafe-swiftshader
// is required on recent Chrome to permit SwiftShader WebGL in headless mode.
const args = [
  '--headless=new',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  `--window-size=${vw},${vh}`,
];

const browser = await puppeteer.launch({ args });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: vw, height: vh });

  // Surface page errors / WebGL context loss to our stdout.
  page.on('console', (m) => console.log(`[page:${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));

  // SKIN env seeds the persisted skin (data-theme) before the app boots,
  // so non-default skins can be screenshotted: SKIN=phosphor node scripts/shoot.mjs …
  if (process.env.SKIN) {
    await page.evaluateOnNewDocument((skin) => {
      try { localStorage.setItem('animath:v1:chrome:skin', skin); } catch {}
    }, process.env.SKIN);
    console.log(`skin: ${process.env.SKIN}`);
  }

  // SEED_LS seeds arbitrary persisted settings (e.g. a render mode or function
  // index) so non-default states can be screenshotted without UI scripting.
  if (process.env.SEED_LS) {
    const seed = JSON.parse(process.env.SEED_LS);
    await page.evaluateOnNewDocument((entries) => {
      try { for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v); } catch {}
    }, seed);
    console.log(`seeded localStorage keys: ${Object.keys(seed).join(', ')}`);
  }

  console.log(`navigating → ${url}`);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

  // Wait for a canvas (Three.js / WebGL apps) if the route has one; DOM apps skip.
  const hasCanvas = await page
    .waitForSelector('canvas', { timeout: 8000 })
    .then(() => true)
    .catch(() => false);

  if (hasCanvas) {
    // Report the actual renderer so we can confirm WebGL is live (not a blank quad).
    const info = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      const gl = c?.getContext('webgl2') || c?.getContext('webgl');
      if (!gl) return { ok: false };
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        ok: true,
        version: gl.getParameter(gl.VERSION),
        renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      };
    });
    console.log(`webgl: ${JSON.stringify(info)}`);
  } else {
    console.log('no <canvas> found (DOM/CSS app?) — screenshotting page as-is');
  }

  await new Promise((r) => setTimeout(r, waitMs));
  await page.screenshot({ path: outPath });
  console.log(`wrote ${outPath}`);
} finally {
  await browser.close();
}
