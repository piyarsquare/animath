// Trail orientation test: does the freshly-laid footprint read correctly in the
// CHARACTER'S frame on BOTH sides of the sheet?
//
// This is the regression guard for the footprint orientation cue. It drives each world
// (via the ?polydebug test bridge) in third person, walks the character onto both the
// un-flipped and the flipped face, and on each face reads the EXACT geometry probe
// (CoverModel.debugProbe → footprints.lastChirality): the signed side of the freshest
// print's cyan half in the character's own (up × forward) frame.
//
//   PASS  ⇒ the sign is the SAME on both faces — the fresh F reads correct in the
//           character's frame everywhere (it is only OLD prints, seen later from the
//           opposite orientation class, that should read reversed). This is how ℝP²
//           does it (lay un-mirrored; show the reversal via a real det<0 twin mesh).
//   FAIL  ⇒ the sign flips on the flipped face — the print was laid mirror-reversed in
//           place, so the F the character just stamped reads backwards to itself.
//
// Orientable worlds (torus) never reach the flipped face; they are an A-only control.
// Run:  npm run preview &  then  node scripts/trail-chirality.mjs    (screenshots → /tmp/trail)
import puppeteer from 'puppeteer';
import fs from 'node:fs';

const BASE = 'http://localhost:4173/animath/';
const ARGS = ['--headless=new','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage','--window-size=1100,820'];
const WORLDS = [
  { id: 'torus', orientable: true },
  { id: 'klein', orientable: false },
  { id: 'crosscap3', orientable: false },
  { id: 'rp2', orientable: false },
];
const W = 1100, H = 820;

// Grab a screenshot (raw PNG bytes) purely for human eyeballing; the PASS/FAIL verdict
// comes from the exact geometry probe, not from these pixels.
const pngOf = (page) => page.screenshot({ type: 'png' });

async function selectWorld(page, id) {
  await page.evaluate((w) => {
    for (const s of document.querySelectorAll('select')) {
      const o = [...s.options].find((o) => o.value === w);
      if (o) { const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(s, w); s.dispatchEvent(new Event('change', { bubbles: true })); return; }
    }
  }, id);
}
const flipped = (page) => page.evaluate(() => window.__poly?.map?.()?.flipped ?? null);
const probe = (page) => page.evaluate(() => window.__poly?.probe?.() ?? null);
const setYaw = (page, y) => page.evaluate((v) => window.__poly?.setYaw?.(v), y);
const holdW = (page, on) => page.evaluate((d) => window.dispatchEvent(new KeyboardEvent(d ? 'keydown' : 'keyup', { code: 'KeyW' })), on);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const browser = await puppeteer.launch({ args: ARGS });
  const results = [];
  const shots = {};
  try {
    for (const world of WORLDS) {
      const page = await browser.newPage();
      await page.setViewport({ width: W, height: H });
      await page.goto(BASE + '?polydebug#/polygon-worlds', { waitUntil: 'networkidle0', timeout: 60000 });
      await page.waitForSelector('canvas', { timeout: 8000 });
      await selectWorld(page, world.id);
      await sleep(1000);
      const haveBridge = await page.evaluate(() => !!(window.__poly && window.__poly.probe));

      // Walk STRAIGHT along several fixed oblique headings (a curving path just circles
      // in place and never reaches an edge; an axis-aligned line can run parallel to a
      // glide axis and never flip). On each frame read the EXACT geometry probe — the
      // signed side of the freshest print's cyan half in the character's own frame — and
      // keep the first reading on the un-flipped (A) and flipped (B) faces, plus a
      // screenshot of each for human eyeballing.
      let sideA = null, sideB = null, pA = null, pB = null;
      const headings = [0.6, 1.9, 1.2, 2.6, 0.3, 2.25, -0.8];
      for (const yaw of headings) {
        if (pA !== null && (pB !== null || world.orientable)) break;
        await setYaw(page, yaw);
        await holdW(page, true);
        const t0 = Date.now();
        while (Date.now() - t0 < 9000) {
          await sleep(170);
          const fl = await flipped(page);
          const pr = await probe(page);
          if (pr === null || Math.abs(pr) < 1e-6) continue;     // no print yet
          if (fl === false && pA === null) { pA = pr; sideA = await pngOf(page); }
          else if (fl === true && pB === null) {
            // Dwell on the flip side until a genuinely flip-side print is laid (the trail
            // only records a new print every ~0.12–1.6 units, so an immediate read can
            // still return the last PRE-crossing print). Walk on, and accept the probe
            // only once it is stable across reads while still flipped.
            let last = null, stable = 0;
            const tb = Date.now();
            while (Date.now() - tb < 4000) {
              await sleep(220);
              if ((await flipped(page)) !== true) break;        // crossed back; abandon
              const q = await probe(page);
              if (q === null || Math.abs(q) < 1e-6) continue;
              if (last !== null && Math.sign(q) === Math.sign(last)) stable++; else stable = 0;
              last = q;
              if (stable >= 3 && Date.now() - tb > 1400) { pB = q; sideB = await pngOf(page); break; }
            }
          }
          if (pA !== null && (pB !== null || world.orientable)) break;
        }
        await holdW(page, false);
        await sleep(150);
      }
      if (pA === null) { pA = await probe(page); sideA = await pngOf(page); }

      shots[world.id] = { sideA, sideB };
      results.push({ world: world.id, orientable: world.orientable, haveBridge, crossed: pB !== null, pA, pB });
      await page.close();
    }
  } finally {
    await browser.close();
  }

  // ── verdict (exact geometry probe; sign = which side of the character's frame the
  //    cyan half sits on — a correct print keeps the SAME sign on both faces) ────────
  console.log('\n=== Trail chirality — does the fresh F read correctly in the character frame? ===\n');
  const side = (p) => (p === null || p === undefined ? 'n/a' : p < 0 ? 'cyan@−axis' : 'cyan@+axis');
  for (const r of results) {
    const aSign = r.pA == null ? 0 : Math.sign(r.pA);
    const bSign = r.pB == null ? 0 : Math.sign(r.pB);
    let verdict;
    if (r.orientable) verdict = r.pA != null ? `control (single side, A=${side(r.pA)})` : 'control (no print)';
    else if (r.pB == null) verdict = '⚠ never reached the flipped side';
    else if (aSign === bSign) verdict = '✅ PASS — fresh F reads correct in its frame on BOTH sides';
    else verdict = '❌ FAIL — fresh F reverses in the character frame on the flipped side';
    console.log(`${r.world.padEnd(10)} A=${side(r.pA).padEnd(11)} B=${side(r.pB).padEnd(11)} ${verdict}`);
  }

  // dump the captures for eyeballing (raw PNG bytes from puppeteer)
  fs.mkdirSync('/tmp/trail', { recursive: true });
  for (const [id, s] of Object.entries(shots)) {
    if (s.sideA) fs.writeFileSync(`/tmp/trail/${id}-A.png`, s.sideA);
    if (s.sideB) fs.writeFileSync(`/tmp/trail/${id}-B.png`, s.sideB);
  }
  console.log('\nshots in /tmp/trail/');
}
run();
