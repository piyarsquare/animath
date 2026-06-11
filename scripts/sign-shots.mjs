// One-off captures of the planted sign: front view, back view, and the
// Klein flip-side (the sign's deck image hanging under the glass).
import puppeteer from 'puppeteer';
import fs from 'node:fs';

const BASE = 'http://localhost:4173/animath/';
const ARGS = ['--headless=new','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage','--window-size=1100,820'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const setYaw = (page, y) => page.evaluate((v) => window.__poly?.setYaw?.(v), y);
const holdW = (page, on) => page.evaluate((d) => window.dispatchEvent(new KeyboardEvent(d ? 'keydown' : 'keyup', { code: 'KeyW' })), on);
const flipped = (page) => page.evaluate(() => window.__poly?.map?.()?.flipped ?? null);

async function selectWorld(page, id) {
  await page.evaluate((w) => {
    for (const s of document.querySelectorAll('select')) {
      const o = [...s.options].find((o) => o.value === w);
      if (o) { const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(s, w); s.dispatchEvent(new Event('change', { bubbles: true })); return; }
    }
  }, id);
}

const browser = await puppeteer.launch({ args: ARGS });
const page = await browser.newPage();
await page.setViewport({ width: 1100, height: 820 });
await page.goto(BASE + '?polydebug#/polygon-worlds', { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 8000 });
await selectWorld(page, 'klein');
await sleep(1200);
fs.mkdirSync('/tmp/sign', { recursive: true });

// 1 · plant facing the player and shoot the FRONT
await setYaw(page, 0.6);
await sleep(300);
await page.evaluate(() => window.__poly?.plantSign?.('HELLO', 'WORLD'));
await sleep(900);
fs.writeFileSync('/tmp/sign/sign-front.png', await page.screenshot({ type: 'png' }));

// 2 · walk forward past the sign, turn around, shoot the BACK
await holdW(page, true); await sleep(1400); await holdW(page, false);
await setYaw(page, 0.6 + Math.PI);
await sleep(700);
fs.writeFileSync('/tmp/sign/sign-back.png', await page.screenshot({ type: 'png' }));

// 3 · walk until the glide flips the face, then look back toward where it was
await setYaw(page, 1.9);
await holdW(page, true);
const t0 = Date.now();
while (Date.now() - t0 < 70000) {
  await sleep(400);
  if ((await flipped(page)) === true) break;
}
await sleep(1500);
await holdW(page, false);
await setYaw(page, 1.9 + Math.PI);
await sleep(800);
fs.writeFileSync('/tmp/sign/sign-flipside.png', await page.screenshot({ type: 'png' }));
console.log('flipped:', await flipped(page));
await browser.close();
