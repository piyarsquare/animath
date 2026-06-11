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

import { shots, launch, openPage, nav, makeChecker } from './probe-lib.mjs';

const { check, finish } = makeChecker();

const browser = await launch();
try {
  // ---- 1. Correspondence: hint + ungated tap-to-pick ----
  const page = await openPage(browser, '#/correspondence', { waitFor: '.am-view-hint-pill' });
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
  await nav(page, '#/fractals', '.am-view-hint-pill');
  check('fractals: start hint shows', true);
  const fb = await (await page.$('.am-ws-view .am-ws-view-body')).boundingBox();
  await page.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2);
  await page.mouse.down();
  await page.mouse.move(fb.x + fb.width / 2 + 60, fb.y + fb.height / 2, { steps: 4 });
  await page.mouse.up();
  const fractalHints = await page.$$eval('.am-view-hint-pill', (els) => els.length);
  check('fractals: drag dismisses the hint', fractalHints === 0);

  // ---- 3. Plane Transform: split window carries its hint ----
  await nav(page, '#/plane-transform', '.am-ws-view .am-split');
  const planeHint = await page.$('.am-view-hint-pill');
  check('plane transform: hint shows over the split body', !!planeHint);
} finally {
  await browser.close();
}

finish();
