#!/usr/bin/env node
// Interaction probe for the always-on action strip (CHROME-REVIEW P1).
//
// Asserts on the real built app:
//   1. desktop: the strip renders with a primary Play and is hit-testable;
//   2. Play toggles (aria-pressed) and pauses back;
//   3. the strip persists ABOVE a fullscreen view and still works there;
//   4. phone (390×844): the strip renders above the dock with visible labels.
//
// Usage:  npm run build && (npm run preview &) && node scripts/probe-actionbar.mjs
// Env:    BASE_URL (default http://localhost:4173/animath/), SHOTS=1 to save PNGs.

import { shots, launch, openPage, onTop, makeChecker } from './probe-lib.mjs';

const { check, finish } = makeChecker();

const browser = await launch();
try {
  // ---- desktop ----
  const page = await openPage(browser, '#/stable-matching', { waitFor: '.am-actionbar' });

  check('desktop: action strip renders', true);
  check('desktop: strip is hit-testable', await onTop(page, '.am-actionbar'));
  const playSel = '.am-actionbar .am-action-btn.am-primary';
  check('desktop: primary Play present',
    await page.$eval(playSel, (b) => b.getAttribute('aria-pressed') === 'false').catch(() => false));

  // 2 — Play toggles aria-pressed, then pause back
  await page.click(playSel);
  await page.waitForFunction(
    (s) => document.querySelector(s)?.getAttribute('aria-pressed') === 'true', { timeout: 3000 }, playSel,
  );
  check('Play toggles to pressed (running)', true);
  await page.click(playSel);
  await page.waitForFunction(
    (s) => document.querySelector(s)?.getAttribute('aria-pressed') === 'false', { timeout: 3000 }, playSel,
  );
  check('Pause toggles back', true);

  // 3 — strip persists above fullscreen and still works
  await page.click('.am-ws-view button[title="Full screen"]');
  await page.waitForSelector('.am-ws-view.am-ws-full', { timeout: 3000 });
  check('fullscreen: strip still hit-testable', await onTop(page, '.am-actionbar'));
  await page.click(playSel);
  const pressed = await page.$eval(playSel, (b) => b.getAttribute('aria-pressed'));
  check('fullscreen: Play still works', pressed === 'true');
  if (shots) await page.screenshot({ path: 'probe-actionbar-full.png' });
  await page.click(playSel); // leave paused

  // ---- phone ----
  const phone = await openPage(browser, '#/stable-matching',
    { width: 390, height: 844, waitFor: '.am-actionbar-phone' });
  check('phone: strip renders above the dock', await onTop(phone, '.am-actionbar-phone'));
  const labelVisible = await phone.$eval(
    '.am-actionbar-phone .am-action-btn span',
    (s) => s.offsetWidth > 0 && getComputedStyle(s).display !== 'none',
  );
  check('phone: action labels are visible', labelVisible);
  check('phone: dock still present', await onTop(phone, '.am-phone-dock'));
  if (shots) await phone.screenshot({ path: 'probe-actionbar-phone.png' });
} finally {
  await browser.close();
}

finish();
