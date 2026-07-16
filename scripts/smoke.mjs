#!/usr/bin/env node
// Headless mobile-viewport smoke check for animath.
//
// Loads every app route at 390x844 in headless software WebGL (SwiftShader, the
// same engine as scripts/shoot.mjs) and fails (exit 1) on the defect class that
// escapes the `tsc && vite build` CI gate: a runtime crash / blank frame that
// only shows at a real viewport (e.g. the #216 Torus mobile crash). It is NOT a
// substitute for a real-device pass — `phone-needed` stays a standing signal — it
// closes the *no-cost* tier.
//
// Usage:
//   npm run build && (npm run preview &) && sleep 3 && npm run smoke
//
// Env:
//   BASE_URL   server origin + base (default http://localhost:4173/animath/)
//   SETTLE_MS  settle time after the canvas appears (default 3000; HDR-safe)
//   VIEWPORT   "WxH" (default 390x844)
//   SHOTS_DIR  if set, write a PNG per route here (for eyeballing)
//
// Detector design is grounded in the 2026-06-23 experiment (see the headless-mode
// session log), NOT guesswork:
//   • pageerror (uncaught JS) + webglcontextlost  → LOAD-BEARING (fail).
//     Three.js swallows shader-compile errors, so the #216 crash surfaced as
//     context loss, never a console error.
//   • dead-frame                                  → low *variance* over the canvas
//     region of the puppeteer screenshot (the true composited frame; NOT in-page
//     gl.readPixels, which returns black on a preserveDrawingBuffer:false context,
//     NOR in-page drawImage(canvas), which reads BLANK on the on-demand-render
//     apps — fractals/plane-transform — whose buffer is already cleared). A
//     dark-but-alive frame (ComplexParticles: variance ~3000) passes; a blank one
//     (variance ~0) fails.
//   • console.error                               → advisory WARNING, with a
//     resource-load allowlist (every clean route logs a 404 + a cert failure), so
//     a NON-allowlisted console.error is surfaced but does not fail the gate.

import puppeteer from 'puppeteer';

// The route table — keep in sync with src/index.tsx `routes`. `webgl` routes get
// the dead-frame variance check; DOM/CSS routes get console/pageerror only.
const ROUTES = [
  { hash: '#/', webgl: false },                       // gallery
  { hash: '#/complex-particles', webgl: true },
  { hash: '#/argand', webgl: false },
  { hash: '#/fractals', webgl: true },
  { hash: '#/polygon-worlds', webgl: true },
  { hash: '#/plane-transform', webgl: true },
  { hash: '#/correspondence', webgl: true },
  { hash: '#/trinary', webgl: true },
  { hash: '#/agentic-sorting', webgl: false },
  { hash: '#/stable-matching', webgl: false },
  { hash: '#/trees-and-nets', webgl: true },
  { hash: '#/solid-worlds', webgl: true },
  { hash: '#/fractals-cpu', webgl: false },            // Canvas2D, not WebGL
  // The Lab is a DOM/readout view (census, distributions) with small live
  // mini-sim canvases — not one full-viewport WebGL scene — so the dead-frame
  // check doesn't apply (the WebGL Observatory is #/trinary, checked above).
  { hash: '#/trinary-lab', webgl: false },
  { hash: '#/division-bells', webgl: false },          // DOM/SVG plane, no WebGL
  { hash: '#/embed/complex-particles', webgl: true },
  { hash: '#/embed/plane-transform', webgl: true },
];

// Resource-load failures every clean route logs — not app defects. Anything else
// on console.error is a real signal.
const RESOURCE_NOISE = /failed to load resource|net::err_|status of 4\d\d|err_cert|favicon/i;
// A WebGL route below this composited-luma variance is treated as a blank/dead
// frame. The experiment put the darkest live route (ComplexParticles) at ~3086, a
// blank canvas at ~0, so 5 is a wide, safe floor.
const DEAD_VARIANCE = 5;

const baseUrl = process.env.BASE_URL ?? 'http://localhost:4173/animath/';
const settleMs = Number(process.env.SETTLE_MS ?? 3000);
const [vw, vh] = (process.env.VIEWPORT ?? '390x844').split('x').map(Number);
const shotsDir = process.env.SHOTS_DIR || null;

const args = [
  '--headless=new', '--use-gl=angle', '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage',
  `--window-size=${vw},${vh}`,
];

// Luma variance of a screenshot PNG, computed inside the page by round-tripping
// the image through an <img> → 2d canvas (works on any PNG — unlike drawImage of a
// live webgl canvas). Returns variance over a strided luma sample.
const varianceOfPngFn = async (dataUrl) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
  const dc = document.createElement('canvas');
  dc.width = img.naturalWidth; dc.height = img.naturalHeight;
  const ctx = dc.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, dc.width, dc.height).data;
  let sum = 0, sumSq = 0, n = 0;
  for (let i = 0; i < data.length; i += 4 * 37) {       // stride to keep it cheap
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += l; sumSq += l * l; n++;
  }
  const mean = sum / n;
  return { mean: +mean.toFixed(1), variance: +(sumSq / n - mean * mean).toFixed(1) };
};

// The canvas region (CSS px) to clip the dead-frame screenshot to, so the variance
// measures the rendered frame and not the surrounding chrome (which always varies).
const canvasRectFn = () => {
  const c = document.querySelector('canvas');
  if (!c) return null;
  const r = c.getBoundingClientRect();
  return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.width, height: r.height };
};

const browser = await puppeteer.launch({ args });
const results = [];
try {
  for (const route of ROUTES) {
    const page = await browser.newPage();
    await page.setViewport({ width: vw, height: vh });
    const warnings = [];
    let pageError = null;
    page.on('console', (m) => {
      if (m.type() === 'error' && !RESOURCE_NOISE.test(m.text())) warnings.push(m.text());
    });
    page.on('pageerror', (e) => { pageError = pageError ?? e.message; });
    // Register a webglcontextlost flag BEFORE the app boots (capture phase reaches
    // the canvas even though the event doesn't bubble to window).
    await page.evaluateOnNewDocument(() => {
      window.__ctxLost = false;
      window.addEventListener('webglcontextlost', () => { window.__ctxLost = true; }, true);
    });

    const url = baseUrl.replace(/\/?$/, '/') + route.hash.replace(/^#?\/?/, '#/');
    const fail = [];
    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
      if (route.webgl) await page.waitForSelector('canvas', { timeout: 8000 }).catch(() => fail.push('no <canvas>'));
      await new Promise((r) => setTimeout(r, settleMs));

      const ctxLost = await page.evaluate(() => window.__ctxLost === true);
      if (ctxLost) fail.push('webglcontextlost');
      if (pageError) fail.push(`pageerror: ${pageError}`);

      // Dead-frame check: clip a screenshot to the canvas region and measure its
      // luma variance (the true composited frame, robust to on-demand rendering).
      let stats = null;
      if (route.webgl) {
        const rect = await page.evaluate(canvasRectFn);
        if (!rect || rect.width < 1 || rect.height < 1) fail.push('no canvas for frame check');
        else {
          const b64 = await page.screenshot({ clip: rect, encoding: 'base64' });
          stats = await page.evaluate(varianceOfPngFn, `data:image/png;base64,${b64}`);
          if (stats.variance < DEAD_VARIANCE) fail.push(`dead frame (variance ${stats.variance})`);
        }
      }
      if (shotsDir) {
        await page.screenshot({ path: `${shotsDir}/${route.hash.replace(/[^a-z0-9]/gi, '_')}.png` }).catch(() => {});
      }
      results.push({ hash: route.hash, ok: fail.length === 0, fail, warnings, stats });
    } catch (e) {
      results.push({ hash: route.hash, ok: false, fail: [`load error: ${String(e)}`], warnings, stats: null });
    }
    await page.close();
  }
} finally {
  await browser.close();
}

// ── report ──────────────────────────────────────────────────────────────────
console.log(`\nSMOKE ${vw}x${vh} · ${ROUTES.length} routes\n`);
let failed = 0, warned = 0;
for (const r of results) {
  const v = r.stats?.variance != null ? ` var=${r.stats.variance}` : '';
  if (r.ok) console.log(`  ✓ ${r.hash}${v}`);
  else { failed++; console.log(`  ✗ ${r.hash} — ${r.fail.join('; ')}`); }
  for (const w of r.warnings ?? []) { warned++; console.log(`    ⚠ ${w}`); }
}
console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'} ${results.length - failed}/${results.length}` +
  (failed ? `  (${failed} failed)` : '') + (warned ? `  · ${warned} warning(s)` : ''));
process.exit(failed === 0 ? 0 : 1);
