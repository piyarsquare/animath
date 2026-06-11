#!/usr/bin/env node
// Interaction probe for start hints (CHROME-REVIEW P2) and the ungated
// Correspondence tap-to-pick (PR D, user decision a).
//
// Asserts on the real built app:
//   1. Correspondence shows the mandel view's start hint; tapping the
//      Mandelbrot BOTH dismisses the hint AND picks a new c (the top-bar
//      subtitle changes) — no arm button required;
//   2. Fractals shows its pan/zoom hint and a drag dismisses it;
//   3. Plane Transform's split window carries its hint.
//
// Usage:  npm run build && (npm run preview &) && node scripts/probe-hints.mjs

import puppeteer from 'puppeteer';

const baseUrl = (process.env.BASE_URL ?? 'http://localhost:4173/animath/').replace(/\/?$/, '/');
const shots = !!process.env.SHOTS;

const args = [
  '--headless=new',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--no-sandbox',
  '--disable-dev-shm-usage',
];

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const browser = await puppeteer.launch({ args });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));

  // ---- 1. Correspondence: hint + ungated tap-to-pick ----
  console.log(`navigating → ${baseUrl}#/correspondence`);
  await page.goto(`${baseUrl}#/correspondence`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForSelector('.am-view-hint-pill', { timeout: 10000 });
  const hintText = await page.$eval('.am-view-hint-pill', (e) => e.textContent);
  check('correspondence: start hint shows', hintText.includes('choose c'), hintText);
  if (shots) await page.screenshot({ path: 'probe-hints-correspondence.png' });

  const subtitleBefore = await page.$eval('.am-sub', (e) => e.textContent);
  // tap inside the mandel view body (off-center so c actually changes)
  const body = await page.$('.am-ws-view .am-ws-view-body canvas');
  const bb = await body.boundingBox();
  await page.mouse.click(bb.x + bb.width * 0.3, bb.y + bb.height * 0.42);
  await page.waitForFunction(
    (before) => document.querySelector('.am-sub')?.textContent !== before,
    { timeout: 3000 }, subtitleBefore,
  ).catch(() => {});
  const subtitleAfter = await page.$eval('.am-sub', (e) => e.textContent);
  check('tap picks c with no arm button', subtitleAfter !== subtitleBefore,
    `${subtitleBefore} → ${subtitleAfter}`);
  const mandelHints = await page.$$eval('.am-view-hint-pill', (els) => els.length);
  check('hint dismissed by the tap', mandelHints === 0, `${mandelHints} pills left`);

  // ---- 2. Fractals: hint dismissed by a drag ----
  console.log(`navigating → ${baseUrl}#/fractals`);
  await page.goto(`${baseUrl}#/fractals`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForSelector('.am-view-hint-pill', { timeout: 10000 });
  check('fractals: start hint shows', true);
  const fb = await (await page.$('.am-ws-view .am-ws-view-body')).boundingBox();
  await page.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2);
  await page.mouse.down();
  await page.mouse.move(fb.x + fb.width / 2 + 60, fb.y + fb.height / 2, { steps: 4 });
  await page.mouse.up();
  const fractalHints = await page.$$eval('.am-view-hint-pill', (els) => els.length);
  check('fractals: drag dismisses the hint', fractalHints === 0);

  // ---- 3. Plane Transform: split window carries its hint ----
  console.log(`navigating → ${baseUrl}#/plane-transform`);
  await page.goto(`${baseUrl}#/plane-transform`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForSelector('.am-ws-view .am-split', { timeout: 10000 });
  const planeHint = await page.$('.am-view-hint-pill');
  check('plane transform: hint shows over the split body', !!planeHint);
} finally {
  await browser.close();
}

console.log(failures === 0 ? '\nall checks passed' : `\n${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
