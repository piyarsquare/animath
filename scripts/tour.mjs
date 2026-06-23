#!/usr/bin/env node
// Full-site screenshot tour for animath — "see the whole site" in one run.
//
// Drives the real built app in headless Chromium (software WebGL2 via ANGLE +
// SwiftShader, the same setup as scripts/shoot.mjs — there is no GPU in CI) and
// walks EVERY app in BOTH desktop and phone form factors, exercising each app's
// top-bar modes and its layout choices. Writes one PNG per (app × viewport ×
// mode × layout) under screenshots/<app>/, plus a manifest.json and an
// index.html contact sheet so a human (or an agent via Read) can eyeball the
// entire UI at a glance.
//
// The route list is read from src/apps.ts (the canonical registry) so the tour
// stays in sync as apps are added; modes and layouts are DISCOVERED from the
// live DOM (the top-bar mode pills and the Layout menu) rather than hardcoded,
// so a new layout is captured automatically.
//
// Usage
//   # one-shot (auto-builds if needed, starts its own preview server, tears it down):
//   node scripts/tour.mjs
//   # or, reuse a server you already started (like the probes do):
//   npm run build && (npm run preview &) && node scripts/tour.mjs
//
// Env
//   BASE_URL    server origin + base (default http://localhost:<PORT>/animath/)
//   PORT        preview port to auto-start / probe (default 4173)
//   OUT_DIR     output directory (default <repo>/screenshots)
//   VIEWPORTS   comma list of "desktop","mobile" (default both)
//   ONLY        comma list — only routes whose hash/slug contains one of these
//   WAIT_MS     settle after navigation for canvas apps (default 2200)
//   VARIANT_MS  settle after a mode/layout switch (default 650)
//   SKIN        seed a non-default skin (e.g. phosphor) for every shot
//   NO_EMBEDS   set to skip the chrome-less /embed/* applet routes
//   DEBUG       set to surface page errors/console noise

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const PORT = Number(process.env.PORT ?? 4173);
const baseUrl = (process.env.BASE_URL ?? `http://localhost:${PORT}/animath/`).replace(/\/?$/, '/');
const OUT_DIR = process.env.OUT_DIR ? path.resolve(process.env.OUT_DIR) : path.join(repoRoot, 'screenshots');
const WAIT_MS = Number(process.env.WAIT_MS ?? 2200);
const VARIANT_MS = Number(process.env.VARIANT_MS ?? 650);
const ONLY = (process.env.ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const SKIN = process.env.SKIN || null;
const INCLUDE_EMBEDS = !process.env.NO_EMBEDS;
const DEBUG = !!process.env.DEBUG;

const VIEWPORT_DEFS = {
  desktop: { id: 'desktop', width: 1280, height: 800, dsf: 1, mobile: false },
  mobile: { id: 'mobile', width: 390, height: 844, dsf: 2, mobile: true },
};
const VIEWPORTS = (process.env.VIEWPORTS ?? 'desktop,mobile')
  .split(',').map((s) => s.trim()).filter((s) => VIEWPORT_DEFS[s]).map((s) => VIEWPORT_DEFS[s]);

const BROWSER_ARGS = [
  '--headless=new',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--no-sandbox',
  '--disable-dev-shm-usage',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (hash) => (hash === '/' ? 'gallery' : hash.replace(/^\//, '').replace(/\//g, '-'));
const nameSlug = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';

/** The canonical route list: gallery + every registered app (read from
 *  src/apps.ts so the tour never drifts) + the unlisted/legacy + embed routes. */
function readRoutes() {
  const src = fs.readFileSync(path.join(repoRoot, 'src', 'apps.ts'), 'utf8');
  const re = /hash:\s*'([^']+)'[\s\S]*?name:\s*'([^']*)'/g;
  const apps = [];
  let m;
  while ((m = re.exec(src))) apps.push({ hash: m[1], name: m[2] });
  const routes = [
    { hash: '/', name: 'Gallery' },
    ...apps,
    { hash: '/fractals-cpu', name: 'Fractals (CPU · legacy)' },
  ];
  if (INCLUDE_EMBEDS) {
    routes.push(
      { hash: '/embed/complex-particles', name: 'Embed · Complex Particles' },
      { hash: '/embed/plane-transform', name: 'Embed · Plane Transform' },
    );
  }
  return routes.filter(
    (r) => !ONLY.length || ONLY.some((o) => r.hash.includes(o) || slug(r.hash).includes(o)),
  );
}

function run(cmd, args) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { cwd: repoRoot, stdio: 'inherit' });
    p.on('exit', (c) => {
      if (c === 0) res();
      else rej(new Error(`${cmd} ${args.join(' ')} → exit ${c}`));
    });
  });
}

async function reachable() {
  try {
    const r = await fetch(baseUrl);
    return r.status < 500;
  } catch {
    return false;
  }
}

/** Reuse a running server if BASE_URL is up; otherwise build (if needed) and
 *  start `vite preview` ourselves, returning the child to kill on exit. */
async function ensureServer() {
  if (await reachable()) {
    console.log(`• using server at ${baseUrl}`);
    return null;
  }
  if (!fs.existsSync(path.join(repoRoot, 'dist'))) {
    console.log('• no dist/ — running `npm run build`…');
    await run('npm', ['run', 'build']);
  }
  console.log(`• starting \`vite preview\` on :${PORT}…`);
  const srv = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
    cwd: repoRoot,
    stdio: DEBUG ? 'inherit' : 'ignore',
  });
  for (let i = 0; i < 40; i++) {
    if (await reachable()) {
      console.log('• server up');
      return srv;
    }
    await sleep(500);
  }
  srv.kill('SIGTERM');
  throw new Error('preview server did not come up');
}

// ---- live-DOM discovery of the chrome's variant controls ----

/** Top-bar mode pills (e.g. Trinary's Observatory | Lab, Counting's Explain | Lab). */
function listModes(page) {
  return page.$$eval('.am-pills[role="tablist"] .am-pill[role="tab"]', (els) =>
    els.map((e, i) => ({ i, label: (e.textContent || '').trim() })),
  );
}
async function selectMode(page, i) {
  const pills = await page.$$('.am-pills[role="tablist"] .am-pill[role="tab"]');
  if (pills[i]) await pills[i].click();
}

/** Desktop Layout menu: Compact, the app's own layouts, Everything (+ any saved). */
async function listLayouts(page) {
  const btn = await page.$('.am-layouts-btn');
  if (!btn) return [];
  await btn.click();
  const ok = await page
    .waitForSelector('.am-layouts-menu .am-lay-item', { timeout: 1500 })
    .then(() => true)
    .catch(() => false);
  if (!ok) return [];
  const names = await page.$$eval('.am-layouts-menu .am-lay-item', (els) =>
    els.map((e) => (e.querySelector('.am-lay-meta > span')?.textContent || e.textContent || '').trim()),
  );
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(120);
  return names;
}
async function selectLayout(page, i) {
  await page.click('.am-layouts-btn');
  await page.waitForSelector('.am-layouts-menu .am-lay-item', { timeout: 1500 });
  const items = await page.$$('.am-layouts-menu .am-lay-item');
  if (items[i]) await items[i].click();
  await sleep(VARIANT_MS);
}

/** Phone view-chips: apps that model mutually-exclusive views as layouts
 *  (Stable Matching's matrix/welfare/lattice, Trinary's instruments). */
function listPhoneViews(page) {
  return page.$$eval('.am-phone-layouts .am-chip', (els) => els.map((e) => (e.textContent || '').trim()));
}
async function selectPhoneView(page, i) {
  const chips = await page.$$('.am-phone-layouts .am-chip');
  if (chips[i]) {
    await chips[i].click();
    await sleep(VARIANT_MS);
  }
}

/** Gallery category filter chips (All + each category). */
function listGalleryFilters(page) {
  return page.$$eval('.am-gal-filters .am-chip', (els) => els.map((e) => (e.textContent || '').trim()));
}
async function selectGalleryFilter(page, i) {
  const chips = await page.$$('.am-gal-filters .am-chip');
  if (chips[i]) {
    await chips[i].click();
    await sleep(250);
  }
}

// ---- capture ----

async function shoot(page, route, vp, parts, fullPage, results) {
  const dir = path.join(OUT_DIR, slug(route.hash));
  fs.mkdirSync(dir, { recursive: true });
  const file = `${vp.id}__${parts.map((p) => nameSlug(p.value)).join('__')}.png`;
  const rel = `${slug(route.hash)}/${file}`;
  const meta = Object.fromEntries(parts.map((p) => [p.key, p.value]));
  try {
    await page.screenshot({ path: path.join(dir, file), fullPage });
    results.push({ route: route.hash, name: route.name, viewport: vp.id, ...meta, file: rel, ok: true });
    console.log(`    ✓ ${rel}`);
  } catch (e) {
    results.push({ route: route.hash, name: route.name, viewport: vp.id, ...meta, file: rel, ok: false, error: String(e.message || e) });
    console.log(`    ✗ ${rel} — ${e.message || e}`);
  }
}

async function captureRouteViewport(context, route, vp, results) {
  const page = await context.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.dsf, isMobile: vp.mobile, hasTouch: vp.mobile });
  if (SKIN) {
    await page.evaluateOnNewDocument((s) => {
      try { localStorage.setItem('animath:v1:chrome:skin', s); } catch {}
    }, JSON.stringify(SKIN));
  }
  if (DEBUG) {
    page.on('pageerror', (e) => console.log(`      [pageerror] ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && console.log(`      [page:err] ${m.text()}`));
  }

  const url = baseUrl + '#' + route.hash;
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  } catch (e) {
    console.log(`    ! nav failed ${url} — ${e.message}`);
    await page.close();
    return;
  }
  const hasCanvas = await page.waitForSelector('canvas', { timeout: 6000 }).then(() => true).catch(() => false);
  await sleep(hasCanvas ? WAIT_MS : Math.min(WAIT_MS, 1000));

  const isGallery = route.hash === '/';
  const fullPage = isGallery; // the gallery scrolls; capture every card

  // Gallery: vary by category filter instead of layouts/modes.
  if (isGallery) {
    const cats = await listGalleryFilters(page);
    const list = cats.length ? cats : ['All'];
    for (let i = 0; i < list.length; i++) {
      if (cats.length) await selectGalleryFilter(page, i);
      await shoot(page, route, vp, [{ key: 'filter', value: list[i] }], fullPage, results);
    }
    await page.close();
    return;
  }

  const modes = await listModes(page);
  const modeList = modes.length ? modes : [{ i: -1, label: 'default' }];

  for (const mode of modeList) {
    if (mode.i >= 0) {
      await selectMode(page, mode.i);
      await sleep((hasCanvas ? VARIANT_MS + 500 : VARIANT_MS));
    }
    const modePart = { key: 'mode', value: mode.label };

    if (vp.id === 'desktop') {
      const layouts = await listLayouts(page);
      const list = layouts.length ? layouts : ['default'];
      for (let li = 0; li < list.length; li++) {
        if (layouts.length) await selectLayout(page, li);
        await shoot(page, route, vp, [modePart, { key: 'layout', value: list[li] }], fullPage, results);
      }
    } else {
      const chips = await listPhoneViews(page);
      if (chips.length) {
        for (let ci = 0; ci < chips.length; ci++) {
          await selectPhoneView(page, ci);
          await shoot(page, route, vp, [modePart, { key: 'view', value: chips[ci] }], fullPage, results);
        }
      } else {
        await shoot(page, route, vp, [modePart, { key: 'view', value: 'default' }], fullPage, results);
      }
    }
  }
  await page.close();
}

// ---- contact sheet ----

function writeIndex(routes, results) {
  const byRoute = new Map();
  for (const r of results) {
    if (!byRoute.has(r.route)) byRoute.set(r.route, []);
    byRoute.get(r.route).push(r);
  }
  const ok = results.filter((r) => r.ok).length;
  const caption = (r) =>
    [r.viewport, r.mode, r.layout, r.view, r.filter].filter((v) => v && v !== 'default').join(' · ') || r.viewport;

  const sections = routes
    .filter((rt) => byRoute.has(rt.hash))
    .map((rt) => {
      const shots = byRoute.get(rt.hash);
      const figs = shots
        .map(
          (s) => `
        <figure class="shot ${s.ok ? '' : 'bad'}" data-vp="${s.viewport}">
          ${s.ok ? `<a href="${s.file}" target="_blank"><img loading="lazy" src="${s.file}" alt="${caption(s)}"></a>` : `<div class="err">✗ ${s.error || 'failed'}</div>`}
          <figcaption>${caption(s)}</figcaption>
        </figure>`,
        )
        .join('');
      return `
      <section class="app" data-name="${rt.name.toLowerCase()}">
        <h2>${rt.name} <span class="hash">${rt.hash}</span> <span class="count">${shots.length}</span></h2>
        <div class="grid">${figs}</div>
      </section>`;
    })
    .join('');

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>animath — site screenshot tour</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #0d1016; color: #e7ecf3; font: 14px/1.5 system-ui, sans-serif; }
  header { position: sticky; top: 0; z-index: 5; background: #0d1016ee; backdrop-filter: blur(6px);
    padding: 14px 20px; border-bottom: 1px solid #232a36; display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
  header h1 { font-size: 16px; margin: 0; font-weight: 650; }
  header .meta { color: #8b97a8; font-size: 12.5px; }
  header input, header select { background: #161b24; color: #e7ecf3; border: 1px solid #2a3340;
    border-radius: 7px; padding: 6px 10px; font: inherit; }
  header .spacer { flex: 1; }
  main { padding: 8px 20px 60px; }
  section.app { margin: 26px 0; }
  section.app h2 { font-size: 15px; font-weight: 650; margin: 0 0 12px; display: flex; align-items: baseline; gap: 10px;
    border-bottom: 1px solid #1c2330; padding-bottom: 8px; }
  .hash { color: #5f6b7d; font: 12px ui-monospace, monospace; }
  .count { margin-left: auto; color: #5f6b7d; font-size: 12px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
  figure.shot { margin: 0; background: #11151d; border: 1px solid #1f2733; border-radius: 10px; overflow: hidden; }
  figure.shot[data-vp="mobile"] { background: #0a0d13; }
  figure.shot img { width: 100%; display: block; background: #000; aspect-ratio: auto; }
  figure.shot figcaption { padding: 7px 10px; font-size: 12px; color: #9aa6b6; border-top: 1px solid #1a212c;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  figure.shot.bad { border-color: #5a2530; }
  figure.shot .err { padding: 30px 12px; color: #ff8b9a; font: 12px ui-monospace, monospace; text-align: center; }
  .hide { display: none !important; }
</style>
</head><body>
<header>
  <h1>animath — site tour</h1>
  <span class="meta">${ok}/${results.length} shots · ${byRoute.size} routes · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}</span>
  <span class="spacer"></span>
  <input id="q" type="search" placeholder="filter apps…" autocomplete="off">
  <select id="vp">
    <option value="">all viewports</option>
    <option value="desktop">desktop</option>
    <option value="mobile">mobile</option>
  </select>
</header>
<main>${sections}</main>
<script>
  const q = document.getElementById('q'), vp = document.getElementById('vp');
  function apply() {
    const term = q.value.trim().toLowerCase(), v = vp.value;
    for (const sec of document.querySelectorAll('section.app')) {
      const nameHit = !term || sec.dataset.name.includes(term);
      let any = false;
      for (const fig of sec.querySelectorAll('figure.shot')) {
        const show = nameHit && (!v || fig.dataset.vp === v);
        fig.classList.toggle('hide', !show);
        any = any || show;
      }
      sec.classList.toggle('hide', !any);
    }
  }
  q.addEventListener('input', apply); vp.addEventListener('change', apply);
</script>
</body></html>`;
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html);
}

// ---- main ----

async function main() {
  const routes = readRoutes();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`animath tour → ${OUT_DIR}`);
  console.log(`routes: ${routes.length} · viewports: ${VIEWPORTS.map((v) => v.id).join(', ')}${SKIN ? ` · skin: ${SKIN}` : ''}`);

  const server = await ensureServer();
  const browser = await puppeteer.launch({ args: BROWSER_ARGS });
  const results = [];
  try {
    for (const route of routes) {
      console.log(`\n▸ ${route.name}  (${route.hash})`);
      // Fresh, isolated storage per route so each app starts from its true
      // defaults (no persisted layout bleeding across the tour).
      const context = await browser.createBrowserContext();
      try {
        for (const vp of VIEWPORTS) {
          console.log(`  · ${vp.id}`);
          await captureRouteViewport(context, route, vp, results);
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
    if (server) server.kill('SIGTERM');
  }

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, skin: SKIN, results }, null, 2));
  writeIndex(routes, results);

  const ok = results.filter((r) => r.ok).length;
  const bad = results.length - ok;
  console.log(`\n${'='.repeat(48)}`);
  console.log(`done: ${ok} ok, ${bad} failed → ${path.join(OUT_DIR, 'index.html')}`);
  process.exit(bad > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
