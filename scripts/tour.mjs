#!/usr/bin/env node
// Full-site screenshot tour for animath — "see the whole site" in one run.
//
// Drives the real built app in headless Chromium (software WebGL2 via ANGLE +
// SwiftShader, the same setup as scripts/shoot.mjs — there is no GPU in CI) and
// walks the apps in BOTH desktop and phone form factors, exercising each app's
// top-bar modes and its layout choices, optionally across skins. Writes one PNG
// per captured state under screenshots/<app>/, plus a manifest.json and an
// index.html contact sheet so a human (or an agent via Read) can eyeball the
// whole UI at a glance.
//
// The route list is read from src/apps.ts and the skin list from
// src/chrome/skins.tsx (the canonical registries) so the tour stays in sync as
// apps/skins are added; modes and layouts are DISCOVERED from the live DOM (the
// top-bar mode pills and the Layout menu) rather than hardcoded.
//
// Usage
//   node scripts/tour.mjs                       # whole site, standard detail
//   node scripts/tour.mjs trinary               # just one app (substring match)
//   node scripts/tour.mjs gallery --detail overview
//   node scripts/tour.mjs fractals --detail everything
//   node scripts/tour.mjs --skins all           # the whole site in every skin
//   node scripts/tour.mjs argand --skins phosphor,blueprint --detail everything
//   node scripts/tour.mjs --list                # list routes + skins, then exit
//   # via npm (note the `--` so args reach the script):
//   npm run tour -- trinary --detail everything
//
// Targets (positional args, or ONLY=…): substring-match a route's hash/slug —
//   "gallery", "trinary", "fractals" (also matches fractals-cpu), "embed", …
//
// Detail levels (--detail / DETAIL), an "overview → everything" ladder:
//   overview     the pristine default only (default mode + default layout)
//   standard     + every layout (default mode) + every other mode (its default)   [default]
//   everything   the full cross-product: every mode × every layout
//
// Skins (--skins / SKINS, or --skin / SKIN for one): "all", or a comma list of
//   skin ids/names (dark·Observatory, light·Paper, neon·Spectrum, blueprint,
//   phosphor). Unset = the default skin only (no skin segment in filenames).
//
// Env (lower-priority than the matching flag)
//   BASE_URL PORT OUT_DIR VIEWPORTS WAIT_MS VARIANT_MS NO_EMBEDS DEBUG
//   ONLY DETAIL SKIN SKINS  — see flags above

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// ---- arg parsing (flags + positional targets) ----
const argv = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const body = a.slice(2);
    const eq = body.indexOf('=');
    if (eq >= 0) flags[body.slice(0, eq)] = body.slice(eq + 1);
    else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) flags[body] = argv[++i];
    else flags[body] = 'true';
  } else positional.push(a);
}
const flag = (...names) => names.map((n) => flags[n]).find((v) => v !== undefined);

const PORT = Number(flag('port') ?? process.env.PORT ?? 4173);
const baseUrl = (flag('base-url') ?? process.env.BASE_URL ?? `http://localhost:${PORT}/animath/`).replace(/\/?$/, '/');
const OUT_DIR = path.resolve(flag('out') ?? process.env.OUT_DIR ?? path.join(repoRoot, 'screenshots'));
const WAIT_MS = Number(flag('wait') ?? process.env.WAIT_MS ?? 2200);
const VARIANT_MS = Number(flag('variant-wait') ?? process.env.VARIANT_MS ?? 650);
const INCLUDE_EMBEDS = !(flag('no-embeds') ?? process.env.NO_EMBEDS);
const DEBUG = !!(flag('debug') ?? process.env.DEBUG);

const targets = (positional.length ? positional.join(',') : (flag('only', 'target') ?? process.env.ONLY ?? ''))
  .split(',').map((s) => s.trim()).filter(Boolean);

const DETAILS = ['overview', 'standard', 'everything'];
let detail = (flag('detail', 'lod') ?? process.env.DETAIL ?? 'everything').toLowerCase();
if (detail === 'full' || detail === 'all' || detail === 'max') detail = 'everything';
if (detail === 'default') detail = 'standard';
if (!DETAILS.includes(detail)) {
  console.error(`unknown --detail "${detail}" (expected: ${DETAILS.join(' | ')})`);
  process.exit(2);
}

const VIEWPORT_DEFS = {
  desktop: { id: 'desktop', width: 1280, height: 800, dsf: 1, mobile: false },
  mobile: { id: 'mobile', width: 390, height: 844, dsf: 2, mobile: true },
};
const VIEWPORTS = (flag('viewport', 'viewports') ?? process.env.VIEWPORTS ?? 'desktop,mobile')
  .split(',').map((s) => s.trim()).filter((s) => VIEWPORT_DEFS[s]).map((s) => VIEWPORT_DEFS[s]);

const BROWSER_ARGS = [
  '--headless=new', '--use-gl=angle', '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (hash) => (hash === '/' ? 'gallery' : hash.replace(/^\//, '').replace(/\//g, '-'));
const nameSlug = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';

// ---- registries read from source so the tour never drifts ----

/** gallery + every registered app (src/apps.ts) + legacy + embed routes. */
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
  return routes;
}

/** the five skins from src/chrome/skins.tsx ({ id, name }) + the default id. */
function readSkins() {
  const src = fs.readFileSync(path.join(repoRoot, 'src', 'chrome', 'skins.tsx'), 'utf8');
  const re = /\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)'/g;
  const skins = [];
  let m;
  while ((m = re.exec(src))) skins.push({ id: m[1], name: m[2] });
  const def = (src.match(/DEFAULT_SKIN\s*=\s*'([^']+)'/) || [, 'dark'])[1];
  return { skins, def };
}

const allRoutes = readRoutes();
const { skins: ALL_SKINS, def: DEFAULT_SKIN } = readSkins();

/** Resolve a --skins/--skin spec to skin ids. Unset → [null] (default skin,
 *  no filename segment). "all" → every id. Else id/name tokens (ci). */
function resolveSkins() {
  const spec = (flag('skins') ?? flag('skin') ?? process.env.SKINS ?? process.env.SKIN ?? '').trim();
  if (!spec) return [null];
  if (/^(all|every|\*)$/i.test(spec)) return ALL_SKINS.map((s) => s.id);
  const out = [];
  for (const tok of spec.split(',').map((s) => s.trim()).filter(Boolean)) {
    const hit = ALL_SKINS.find((s) => s.id.toLowerCase() === tok.toLowerCase() || s.name.toLowerCase() === tok.toLowerCase());
    if (hit) out.push(hit.id);
    else console.log(`! unknown skin "${tok}" — skipping (known: ${ALL_SKINS.map((s) => s.id).join(', ')})`);
  }
  return out.length ? out : [null];
}

const routes = allRoutes.filter(
  (r) => !targets.length || targets.some((t) => r.hash.includes(t) || slug(r.hash).includes(t)),
);
const skins = resolveSkins();

// ---- server (reuse if up, else build-if-needed + start preview) ----

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
  try { return (await fetch(baseUrl)).status < 500; } catch { return false; }
}
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
    cwd: repoRoot, stdio: DEBUG ? 'inherit' : 'ignore',
  });
  for (let i = 0; i < 40; i++) {
    if (await reachable()) { console.log('• server up'); return srv; }
    await sleep(500);
  }
  srv.kill('SIGTERM');
  throw new Error('preview server did not come up');
}

// ---- live-DOM discovery of the chrome's variant controls ----

/** Top-bar mode pills (e.g. Trinary's Observatory | Lab). {i,label,on}. */
function listModes(page) {
  return page.$$eval('.am-pills[role="tablist"] .am-pill[role="tab"]', (els) =>
    els.map((e, i) => ({ i, label: (e.textContent || '').trim(), on: e.getAttribute('aria-selected') === 'true' || e.classList.contains('am-on') })),
  );
}
async function selectMode(page, i) {
  const pills = await page.$$('.am-pills[role="tablist"] .am-pill[role="tab"]');
  if (pills[i]) await pills[i].click();
}

/** Desktop Layout menu: Compact, the app's layouts, Everything. {name,on}. */
async function listLayouts(page) {
  const btn = await page.$('.am-layouts-btn');
  if (!btn) return [];
  await btn.click();
  const ok = await page.waitForSelector('.am-layouts-menu .am-lay-item', { timeout: 1500 }).then(() => true).catch(() => false);
  if (!ok) return [];
  const items = await page.$$eval('.am-layouts-menu .am-lay-item', (els) =>
    els.map((e) => ({ name: (e.querySelector('.am-lay-meta > span')?.textContent || e.textContent || '').trim(), on: e.classList.contains('am-on') })),
  );
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(120);
  return items;
}
async function selectLayout(page, i) {
  await page.click('.am-layouts-btn');
  await page.waitForSelector('.am-layouts-menu .am-lay-item', { timeout: 1500 });
  const items = await page.$$('.am-layouts-menu .am-lay-item');
  if (items[i]) await items[i].click();
  await sleep(VARIANT_MS);
}

/** Phone view-chips: apps that model mutually-exclusive views as layouts. */
function listPhoneViews(page) {
  return page.$$eval('.am-phone-layouts .am-chip', (els) =>
    els.map((e) => ({ name: (e.textContent || '').trim(), on: e.classList.contains('am-on') || e.getAttribute('aria-selected') === 'true' })),
  );
}
async function selectPhoneView(page, i) {
  const chips = await page.$$('.am-phone-layouts .am-chip');
  if (chips[i]) { await chips[i].click(); await sleep(VARIANT_MS); }
}

/** Gallery category filter chips. {label,on}. */
function listGalleryFilters(page) {
  return page.$$eval('.am-gal-filters .am-chip', (els) =>
    els.map((e) => ({ label: (e.textContent || '').trim(), on: e.classList.contains('am-on') })),
  );
}
async function selectGalleryFilter(page, i) {
  const chips = await page.$$('.am-gal-filters .am-chip');
  if (chips[i]) { await chips[i].click(); await sleep(250); }
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
    results.push({ route: route.hash, name: route.name, viewport: vp.id, detail, ...meta, file: rel, ok: true });
    console.log(`      ✓ ${rel}`);
  } catch (e) {
    results.push({ route: route.hash, name: route.name, viewport: vp.id, detail, ...meta, file: rel, ok: false, error: String(e.message || e) });
    console.log(`      ✗ ${rel} — ${e.message || e}`);
  }
}

/** Capture one (route, viewport, skin) page across modes/layouts per detail. */
async function captureVariants(page, route, vp, skin, hasCanvas, results) {
  const skinPart = skin ? [{ key: 'skin', value: skin }] : [];
  const settleMode = () => sleep(VARIANT_MS + (hasCanvas ? 500 : 0));

  // Gallery: vary by category filter instead of modes/layouts.
  if (route.hash === '/') {
    const cats = await listGalleryFilters(page);
    const real = cats.length > 0;
    const list = real ? cats : [{ label: 'All', on: true }];
    const chosen = detail === 'overview' ? [list.find((c) => c.on) ?? list[0]] : list;
    for (const c of chosen) {
      if (real) await selectGalleryFilter(page, list.indexOf(c));
      await shoot(page, route, vp, [...skinPart, { key: 'filter', value: c.label }], true, results);
    }
    return;
  }

  const isDesktop = vp.id === 'desktop';
  const varKey = isDesktop ? 'layout' : 'view';
  const listVars = async () => {
    const items = isDesktop ? await listLayouts(page) : await listPhoneViews(page);
    return { real: items.length > 0, items: items.length ? items : [{ name: 'default', on: true }] };
  };
  const selectVar = async (i, real) => {
    if (!real) return;
    if (isDesktop) await selectLayout(page, i);
    else await selectPhoneView(page, i);
  };

  const modes = await listModes(page);
  const realModes = modes.length > 0;
  const modeItems = realModes ? modes : [{ i: -1, label: 'default', on: true }];
  const aMode = modeItems[Math.max(0, modeItems.findIndex((m) => m.on))];

  // overview — the pristine default, no clicks: label the active mode + variant.
  if (detail === 'overview') {
    const { items } = await listVars();
    const aVar = items.find((v) => v.on) ?? items[0];
    await shoot(page, route, vp, [...skinPart, { key: 'mode', value: aMode.label }, { key: varKey, value: aVar.name }], false, results);
    return;
  }

  // everything — full cross-product, every layout explicitly selected.
  if (detail === 'everything') {
    for (const m of modeItems) {
      if (m.i >= 0) { await selectMode(page, m.i); await settleMode(); }
      const { real, items } = await listVars();
      for (let i = 0; i < items.length; i++) {
        await selectVar(i, real);
        await shoot(page, route, vp, [...skinPart, { key: 'mode', value: m.label }, { key: varKey, value: items[i].name }], false, results);
      }
    }
    return;
  }

  // standard — do the modes pass BEFORE touching layouts, so each non-default
  // mode is captured at its own pristine default (no carried-over layout); then
  // sweep all layouts at the default mode.
  for (const m of modeItems) {
    if (m.i === aMode.i) continue;
    if (m.i >= 0) { await selectMode(page, m.i); await settleMode(); }
    const { items } = await listVars();
    const aVar = items.find((v) => v.on) ?? items[0];
    await shoot(page, route, vp, [...skinPart, { key: 'mode', value: m.label }, { key: varKey, value: aVar.name }], false, results);
  }
  if (realModes && modeItems.length > 1) { await selectMode(page, aMode.i); await settleMode(); }
  const { real, items } = await listVars();
  for (let i = 0; i < items.length; i++) {
    await selectVar(i, real);
    await shoot(page, route, vp, [...skinPart, { key: 'mode', value: aMode.label }, { key: varKey, value: items[i].name }], false, results);
  }
}

async function captureRouteViewport(context, route, vp, results) {
  for (const skin of skins) {
    const page = await context.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.dsf, isMobile: vp.mobile, hasTouch: vp.mobile });
    // Skins are read from localStorage as a RAW id (not JSON) by skins.tsx;
    // seed it before boot so applyPersistedSkin() + useSkin() both pick it up
    // (and the gallery's skin-aware previews render in that skin).
    if (skin) {
      await page.evaluateOnNewDocument((id) => {
        try { localStorage.setItem('animath:v1:chrome:skin', id); } catch {}
      }, skin);
    }
    if (DEBUG) {
      page.on('pageerror', (e) => console.log(`      [pageerror] ${e.message}`));
      page.on('console', (m) => m.type() === 'error' && console.log(`      [page:err] ${m.text()}`));
    }
    try {
      await page.goto(baseUrl + '#' + route.hash, { waitUntil: 'networkidle0', timeout: 60000 });
    } catch (e) {
      console.log(`    ! nav failed — ${e.message}`);
      await page.close();
      continue;
    }
    const hasCanvas = await page.waitForSelector('canvas', { timeout: 6000 }).then(() => true).catch(() => false);
    await sleep(hasCanvas ? WAIT_MS : Math.min(WAIT_MS, 1000));
    if (skin) console.log(`    · skin: ${skin}`);
    await captureVariants(page, route, vp, skin, hasCanvas, results);
    await page.close();
  }
}

// ---- contact sheet ----

function writeIndex(routes, results) {
  const byRoute = new Map();
  for (const r of results) {
    if (!byRoute.has(r.route)) byRoute.set(r.route, []);
    byRoute.get(r.route).push(r);
  }
  const ok = results.filter((r) => r.ok).length;
  const skinsPresent = [...new Set(results.map((r) => r.skin).filter(Boolean))];
  const caption = (r) =>
    [r.skin, r.viewport, r.mode, r.layout, r.view, r.filter].filter((v) => v && v !== 'default').join(' · ') || r.viewport;

  const sections = routes.filter((rt) => byRoute.has(rt.hash)).map((rt) => {
    const figs = byRoute.get(rt.hash).map((s) => `
        <figure class="shot ${s.ok ? '' : 'bad'}" data-vp="${s.viewport}" data-skin="${s.skin || ''}">
          ${s.ok ? `<a href="${s.file}" target="_blank"><img loading="lazy" src="${s.file}" alt="${caption(s)}"></a>` : `<div class="err">✗ ${s.error || 'failed'}</div>`}
          <figcaption>${caption(s)}</figcaption>
        </figure>`).join('');
    return `
      <section class="app" data-name="${rt.name.toLowerCase()}">
        <h2>${rt.name} <span class="hash">${rt.hash}</span> <span class="count">${byRoute.get(rt.hash).length}</span></h2>
        <div class="grid">${figs}</div>
      </section>`;
  }).join('');

  const skinOptions = skinsPresent.map((s) => `<option value="${s}">${s}</option>`).join('');
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
  figure.shot img { width: 100%; display: block; background: #000; }
  figure.shot figcaption { padding: 7px 10px; font-size: 12px; color: #9aa6b6; border-top: 1px solid #1a212c;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  figure.shot.bad { border-color: #5a2530; }
  figure.shot .err { padding: 30px 12px; color: #ff8b9a; font: 12px ui-monospace, monospace; text-align: center; }
  .hide { display: none !important; }
</style>
</head><body>
<header>
  <h1>animath — site tour</h1>
  <span class="meta">${ok}/${results.length} shots · ${byRoute.size} routes · detail: ${detail} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}</span>
  <span class="spacer"></span>
  <input id="q" type="search" placeholder="filter apps…" autocomplete="off">
  <select id="vp"><option value="">all viewports</option><option value="desktop">desktop</option><option value="mobile">mobile</option></select>
  ${skinsPresent.length ? `<select id="sk"><option value="">all skins</option>${skinOptions}</select>` : ''}
</header>
<main>${sections}</main>
<script>
  const q = document.getElementById('q'), vp = document.getElementById('vp'), sk = document.getElementById('sk');
  function apply() {
    const term = q.value.trim().toLowerCase(), v = vp.value, s = sk ? sk.value : '';
    for (const sec of document.querySelectorAll('section.app')) {
      const nameHit = !term || sec.dataset.name.includes(term);
      let any = false;
      for (const fig of sec.querySelectorAll('figure.shot')) {
        const show = nameHit && (!v || fig.dataset.vp === v) && (!s || fig.dataset.skin === s);
        fig.classList.toggle('hide', !show);
        any = any || show;
      }
      sec.classList.toggle('hide', !any);
    }
  }
  q.addEventListener('input', apply); vp.addEventListener('change', apply);
  if (sk) sk.addEventListener('change', apply);
</script>
</body></html>`;
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html);
}

// ---- main ----

async function main() {
  if (flags.list) {
    console.log(`routes (${allRoutes.length}):`);
    for (const r of allRoutes) console.log(`  ${slug(r.hash).padEnd(24)} ${r.hash.padEnd(28)} ${r.name}`);
    console.log(`\nskins (${ALL_SKINS.length}; default ${DEFAULT_SKIN}):`);
    for (const s of ALL_SKINS) console.log(`  ${s.id.padEnd(12)} ${s.name}`);
    console.log(`\ndetail levels: ${DETAILS.join(' | ')}`);
    return;
  }
  if (!routes.length) {
    console.error(`no routes matched ${JSON.stringify(targets)} — try \`--list\``);
    process.exit(2);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`animath tour → ${OUT_DIR}`);
  console.log(`routes: ${routes.length}/${allRoutes.length} · viewports: ${VIEWPORTS.map((v) => v.id).join(', ')} · detail: ${detail} · skins: ${skins.map((s) => s ?? 'default').join(', ')}`);

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

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, detail, skins, results }, null, 2));
  writeIndex(routes, results);

  const okN = results.filter((r) => r.ok).length;
  const badN = results.length - okN;
  console.log(`\n${'='.repeat(48)}`);
  console.log(`done: ${okN} ok, ${badN} failed → ${path.join(OUT_DIR, 'index.html')}`);
  process.exit(badN > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
