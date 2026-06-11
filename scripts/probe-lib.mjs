// Shared harness for the interaction probes (scripts/probe-*.mjs).
//
// Each probe drives the real built app headlessly against a preview server:
//   npm run build && (npm run preview &) && node scripts/probe-<name>.mjs
// Env: BASE_URL (default http://localhost:4173/animath/), SHOTS=1 to save PNGs.
//
// A probe imports { baseUrl, shots, launch, openPage, nav, onTop, makeChecker },
// opens pages with openPage/nav, asserts with check(), and ends with finish().

import puppeteer from 'puppeteer';

export const baseUrl = (process.env.BASE_URL ?? 'http://localhost:4173/animath/').replace(/\/?$/, '/');
export const shots = !!process.env.SHOTS;

const BROWSER_ARGS = [
  '--headless=new',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--no-sandbox',
  '--disable-dev-shm-usage',
];

export function launch() {
  return puppeteer.launch({ args: BROWSER_ARGS });
}

/** PASS/FAIL tally. `finish()` prints the verdict and exits non-zero on failure. */
export function makeChecker() {
  let failures = 0;
  const check = (name, ok, detail = '') => {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
    if (!ok) failures++;
  };
  const finish = () => {
    console.log(failures === 0 ? '\nall checks passed' : `\n${failures} check(s) FAILED`);
    process.exit(failures === 0 ? 0 : 1);
  };
  return { check, finish };
}

/** Navigate an existing page to a hash route, optionally awaiting a selector. */
export async function nav(page, hash, waitFor) {
  const url = baseUrl + hash;
  console.log(`navigating → ${url}`);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  if (waitFor) await page.waitForSelector(waitFor, { timeout: 10000 });
}

/** New page at the given viewport, pageerror logging on, navigated to `hash`. */
export async function openPage(browser, hash, { width = 1280, height = 800, waitFor } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
  await nav(page, hash, waitFor);
  return page;
}

/** Is the element at this selector actually hit-testable (rendered on top)?
 *  `point: 'top'` probes just under the top edge (e.g. a window header). */
export function onTop(page, sel, point = 'center') {
  return page.evaluate((s, p) => {
    const el = document.querySelector(s);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const y = p === 'top' ? r.top + Math.min(20, r.height / 2) : r.top + r.height / 2;
    const hit = document.elementFromPoint(r.left + r.width / 2, y);
    return !!hit && (el.contains(hit) || hit.contains(el));
  }, sel, point);
}
