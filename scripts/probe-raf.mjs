#!/usr/bin/env node
// Headless probe: does the Complex Particles render loop survive leaving the app?
//
// Navigates gallery → app → gallery (twice), then instruments
// requestAnimationFrame for one second and counts scheduled callbacks whose
// source calls getElapsedTime() — the particle engine's animation loop
// signature (it survives minification as a property access). After the app
// unmounts, that count should be ZERO; every leaked loop contributes ~60/s.
//
// Usage:  npm run build && (npm run preview &) && node scripts/probe-raf.mjs
// Env:    BASE_URL (default http://localhost:4173/animath/)

import puppeteer from 'puppeteer';

const baseUrl = (process.env.BASE_URL ?? 'http://localhost:4173/animath/').replace(/\/?$/, '/');

const args = [
  '--headless=new',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--no-sandbox',
  '--disable-dev-shm-usage',
];

const browser = await puppeteer.launch({ args });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));

  console.log(`navigating → ${baseUrl}#/complex-particles`);
  await page.goto(`${baseUrl}#/complex-particles`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 2500));

  // Two app → gallery round trips: leaked loops stack one per mount.
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => { location.hash = '#/'; });
    await new Promise((r) => setTimeout(r, 1200));
    await page.evaluate(() => { location.hash = '#/complex-particles'; });
    await new Promise((r) => setTimeout(r, 2000));
  }
  // End on the gallery: the app is unmounted, so its loop must be gone.
  await page.evaluate(() => { location.hash = '#/'; });
  await new Promise((r) => setTimeout(r, 1200));

  const counts = await page.evaluate(() => new Promise((resolve) => {
    let engine = 0;
    let total = 0;
    const orig = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => {
      total++;
      if (String(cb).includes('getElapsedTime')) engine++;
      return orig(cb);
    };
    setTimeout(() => resolve({ engine, total }), 1000);
  }));

  console.log(`rAF callbacks in 1s on the gallery (after 3 visits to the app):`);
  console.log(`  particle-engine loop callbacks: ${counts.engine}  (expected 0; ~60 per leaked loop)`);
  console.log(`  total rAF callbacks:            ${counts.total}  (gallery previews legitimately animate)`);
  process.exitCode = counts.engine > 0 ? 1 : 0;
} finally {
  await browser.close();
}
