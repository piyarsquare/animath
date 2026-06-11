#!/usr/bin/env node
// Interaction probe for the fullscreen control-access fix (CHROME-REVIEW P4a).
//
// Drives the real built app headlessly and asserts:
//   1. entering fullscreen on a view window works;
//   2. clicking a rail icon while fullscreen opens a panel ABOVE the
//      fullscreen view (the pre-fix bug: the panel opened invisibly under it);
//   3. the fullscreen header's "?" opens the explainer above everything;
//   4. staged Esc peels one layer per keypress: explainer → fullscreen,
//      leaving the opened panel alone (panels are ✕-only).
//
// Usage:  npm run build && (npm run preview &) && node scripts/probe-fullscreen.mjs
// Env:    BASE_URL (default http://localhost:4173/animath/), SHOTS=1 to save PNGs.

import { shots, launch, openPage, onTop, makeChecker } from './probe-lib.mjs';

const { check, finish } = makeChecker();

const browser = await launch();
try {
  const page = await openPage(browser, '#/stable-matching', { waitFor: '.am-ws-view' });

  // 1 — enter fullscreen on the first view window
  await page.click('.am-ws-view button[title="Full screen"]');
  await page.waitForSelector('.am-ws-view.am-ws-full', { timeout: 3000 });
  check('fullscreen entered', true);

  // 2 — open a panel from the rail while fullscreen; it must be on top
  const panelsBefore = await page.$$eval('.am-ws-panel', (els) => els.length);
  await page.click('.am-ws-rail-btn'); // first rail icon (any panel will do)
  await page.waitForFunction(
    (n) => document.querySelectorAll('.am-ws-panel').length > n, { timeout: 3000 }, panelsBefore,
  );
  check('rail opens a panel during fullscreen', true);
  check('panel is hit-testable above the fullscreen view', await onTop(page, '.am-ws-panel', 'top'));
  if (shots) await page.screenshot({ path: 'probe-fullscreen-panel.png' });

  // 3 — fullscreen header "?" opens the explainer above everything
  await page.click('.am-ws-full button[title="What am I looking at?"]');
  await page.waitForSelector('.am-modal', { timeout: 3000 });
  check('explainer opens from the fullscreen header', true);
  check('explainer is hit-testable above fullscreen', await onTop(page, '.am-modal', 'top'));
  if (shots) await page.screenshot({ path: 'probe-fullscreen-help.png' });

  // 4 — staged Esc: modal closes first…
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.am-modal'), { timeout: 3000 });
  const stillFull = await page.$('.am-ws-view.am-ws-full');
  check('Esc #1 closes the explainer only', !!stillFull, 'fullscreen survives');

  // …then fullscreen exits, and the panel opened in step 2 is untouched
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.am-ws-view.am-ws-full'), { timeout: 3000 });
  const panelsAfter = await page.$$eval('.am-ws-panel', (els) => els.length);
  check('Esc #2 exits fullscreen', true);
  check('panels survive Esc (✕-only semantics)', panelsAfter === panelsBefore + 1,
    `${panelsAfter} open`);
  if (shots) await page.screenshot({ path: 'probe-fullscreen-after.png' });
} finally {
  await browser.close();
}

finish();
