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
//   • the route error boundary's marker          → LOAD-BEARING (fail). The boundary
//     CATCHES the error, so a crashed route fires NO pageerror and reads as a clean
//     load; `[data-am-route-error]` in the DOM is the app saying it gave up.
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
//
// After those checks each route gets a POKE PASS: every range input on the page is
// moved and the route re-checked for an uncaught error. Loading a route only proves
// it boots at its defaults; the crash that prompted this (Split Decision, 2026-09-17)
// needed one slider move — growing the matrix made the views index a population
// snapshot that still described the old size. The pass runs LAST so a moved control
// can never disturb the dead-frame measurement above.

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
  { hash: '#/counting-the-ways', webgl: false },       // DOM/SVG lattice, no WebGL
  { hash: '#/split-decision', webgl: false },          // DOM grid + small canvases
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

// The panel buttons — the phone's bottom dock, the desktop rail. A route's controls
// live inside these, and on phone the sheet is CLOSED at load, so poking without
// opening one finds nothing at all.
const PANEL_BTN = '.am-phone-dock-btn, .am-ws-rail-btn';

// The route error boundary renders this marker. It CATCHES the error, so a crashed
// route fires no `pageerror` and otherwise reads as a clean load — this is the only
// direct signal that the app itself gave up on the route.
const routeErrorFn = () => {
  const el = document.querySelector('[data-am-route-error]');
  if (!el) return null;
  const pre = el.querySelector('pre');
  return (el.querySelector('p + p')?.textContent || 'route error').trim().slice(0, 120)
    + (pre ? ` @ ${pre.textContent.trim().split('\n')[0]}` : '');
};

const countPanelsFn = (sel) => document.querySelectorAll(sel).length;

const openPanelFn = (sel, i) => {
  const b = document.querySelectorAll(sel)[i];
  if (!b) return false;
  b.click();
  return true;
};

// Move every range input now on screen to a different value, the way a user would:
// React only re-renders if the NATIVE value setter runs before the event, so
// `el.value = x` alone is invisible to it. Each slider goes to its midpoint, or to
// the far end when it is already near it, so the value always actually changes.
const pokeSlidersFn = () => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  const sliders = [...document.querySelectorAll('input[type=range]')];
  for (const el of sliders) {
    const lo = Number(el.min || 0), hi = Number(el.max || 100), cur = Number(el.value);
    if (!(hi > lo)) continue;
    const mid = lo + (hi - lo) / 2;
    const next = Math.abs(cur - mid) > (hi - lo) / 20 ? mid : (cur > mid ? lo : hi);
    setter.call(el, String(next));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return sliders.length;
};

/** Settle after opening a panel, and after moving its controls. */
const PANEL_OPEN_MS = 350;
const POKE_SETTLE_MS = 800;
/** Panels to walk per route — enough for every app's rail today, bounded so a route
 *  with a long rail cannot stretch the run. */
const MAX_PANELS = 8;

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
      const routeError = await page.evaluate(routeErrorFn);
      if (routeError) fail.push(`route error panel: ${routeError}`);

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

      // Poke pass: open each panel in turn and move every control it shows, then let
      // the app re-render and re-check. Panels open one at a time — the phone shows
      // one sheet at a time, and a closed panel's inputs are not in the DOM either.
      let poked = 0;
      const panels = await page.evaluate(countPanelsFn, PANEL_BTN).catch(() => 0);
      for (let i = 0; i < Math.min(panels, MAX_PANELS); i++) {
        const opened = await page.evaluate(openPanelFn, PANEL_BTN, i).catch(() => false);
        if (!opened) continue;
        await new Promise((r) => setTimeout(r, PANEL_OPEN_MS));
        poked += await page.evaluate(pokeSlidersFn).catch(() => 0);
        await new Promise((r) => setTimeout(r, POKE_SETTLE_MS));
        if (pageError || (await page.evaluate(routeErrorFn))) break;   // the first failure is the useful one
      }
      if (panels > 0) {
        if (pageError && !fail.some((f) => f.startsWith('pageerror:'))) fail.push(`pageerror after moving a control: ${pageError}`);
        const after = await page.evaluate(routeErrorFn);
        if (after && !routeError) fail.push(`route error panel after moving a control: ${after}`);
        if ((await page.evaluate(() => window.__ctxLost === true)) && !ctxLost) fail.push('webglcontextlost after moving a control');
      }
      results.push({ hash: route.hash, ok: fail.length === 0, fail, warnings, stats, poked });
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
  const v = (r.stats?.variance != null ? ` var=${r.stats.variance}` : '') + (r.poked ? ` poked=${r.poked}` : '');
  if (r.ok) console.log(`  ✓ ${r.hash}${v}`);
  else { failed++; console.log(`  ✗ ${r.hash} — ${r.fail.join('; ')}`); }
  for (const w of r.warnings ?? []) { warned++; console.log(`    ⚠ ${w}`); }
}
console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'} ${results.length - failed}/${results.length}` +
  (failed ? `  (${failed} failed)` : '') + (warned ? `  · ${warned} warning(s)` : ''));
process.exit(failed === 0 ? 0 : 1);
