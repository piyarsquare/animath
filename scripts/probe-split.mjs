#!/usr/bin/env node
// Interaction probe for the split-view primitive (CHROME-REVIEW P5).
//
// Asserts on the real built app:
//   1. Plane Transform renders ONE view window containing two equal panes
//      (domain + image) with their corner labels;
//   2. resizing the window keeps the panes equal-width (the
//      scale-commensurability invariant);
//   3. fullscreen takes the PAIR (both panes still visible);
//   4. the embed route renders the same two-pane DOM.
//
// Usage:  npm run build && (npm run preview &) && node scripts/probe-split.mjs
// Env:    BASE_URL (default http://localhost:4173/animath/), SHOTS=1 to save PNGs.

import { shots, launch, openPage, nav, makeChecker } from './probe-lib.mjs';

const { check, finish } = makeChecker();

const paneWidths = (page) => page.$$eval('.am-ws-view .am-split-pane', (els) =>
  els.map((el) => Math.round(el.getBoundingClientRect().width)));

const browser = await launch();
try {
  const page = await openPage(browser, '#/plane-transform', { waitFor: '.am-ws-view .am-split' });

  // 1 — one window, two equal labeled panes
  const windows = await page.$$eval('.am-ws-view', (els) => els.length);
  check('one view window', windows === 1, `${windows} windows`);
  let w = await paneWidths(page);
  check('two panes, equal width', w.length === 2 && Math.abs(w[0] - w[1]) <= 1, w.join(' / '));
  const labels = await page.$$eval('.am-split-label', (els) => els.map((e) => e.textContent));
  check('pane labels present', labels.length === 2, labels.join(' · '));
  if (shots) await page.screenshot({ path: 'probe-split-window.png' });

  // 2 — resize the window; panes must stay equal
  const handle = await page.$('.am-ws-resize');
  const hb = await handle.boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x - 160, hb.y + 40, { steps: 8 });
  await page.mouse.up();
  w = await paneWidths(page);
  check('panes stay equal after resize', w.length === 2 && Math.abs(w[0] - w[1]) <= 1, w.join(' / '));

  // 3 — fullscreen takes the pair
  await page.click('.am-ws-view button[title="Full screen"]');
  await page.waitForSelector('.am-ws-view.am-ws-full', { timeout: 3000 });
  w = await paneWidths(page);
  check('fullscreen keeps both panes, equal', w.length === 2 && Math.abs(w[0] - w[1]) <= 1, w.join(' / '));
  if (shots) await page.screenshot({ path: 'probe-split-full.png' });
  await page.keyboard.press('Escape');

  // 4 — the embed route shares the split DOM
  await nav(page, '#/embed/plane-transform?fn=exp', '.am-embed .am-split');
  const embedPanes = await page.$$eval('.am-embed .am-split-pane', (els) => els.length);
  check('embed renders the same two-pane split', embedPanes === 2);
} finally {
  await browser.close();
}

finish();
