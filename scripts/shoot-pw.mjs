// Polygon Worlds world-selector screenshot driver.
// Usage: node scripts/shoot-pw.mjs <worldId> <out.png> [thirdPerson=1]
//   worldId ∈ torus|klein|rp2|sphere
import puppeteer from 'puppeteer';

const worldId = process.argv[2] ?? 'sphere';
const outPath = process.argv[3] ?? `pw-${worldId}.png`;
const baseUrl = process.env.BASE_URL ?? 'http://localhost:4173/animath/';
const waitMs = Number(process.env.WAIT_MS ?? 2800);
const [vw, vh] = (process.env.VIEWPORT ?? '1280x800').split('x').map(Number);
const url = baseUrl.replace(/\/?$/, '/') + '#/polygon-worlds';

const args = ['--headless=new','--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage',`--window-size=${vw},${vh}`];

const browser = await puppeteer.launch({ args });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: vw, height: vh });
  page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') console.log(`[page:error] ${m.text()}`); });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 8000 });
  // Set the world <select> (the Gluing dropdown in the always-mounted drawer).
  const set = await page.evaluate((id) => {
    const sels = [...document.querySelectorAll('select')];
    for (const s of sels) {
      if ([...s.options].some((o) => o.value === id)) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
        setter.call(s, id);
        s.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
    return false;
  }, worldId);
  if (!set) console.log(`WARN: could not find a <select> offering "${worldId}"`);
  await new Promise((r) => setTimeout(r, waitMs));
  await page.screenshot({ path: outPath });
  console.log(`wrote ${outPath} (world=${worldId}, set=${set})`);
} finally {
  await browser.close();
}
