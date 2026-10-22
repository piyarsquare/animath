/** Bounded browser regression for the notebook route. Start Vite first.
 * BASE_URL=http://localhost:5187/animath/ SHOTS_DIR=... node scripts/probe-garden.mjs */
import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
const base = process.env.BASE_URL ?? 'http://localhost:5187/animath/';
const shots = process.env.SHOTS_DIR;
if (shots) await fs.mkdir(shots, { recursive: true });
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
let page;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  page = await browser.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource/.test(message.text())) errors.push(message.text()); });
  await page.setViewport({ width: 1360, height: 1000 });
  const text = () => page.$eval('.garden-notebook', el => el.textContent);
  const click = async label => {
    const handle = await page.evaluateHandle(label => [...document.querySelectorAll('button,a')].find(el => el.textContent.trim() === label), label);
    assert(await handle.asElement(), `Missing action: ${label}`);
    await handle.asElement().evaluate(el => el.scrollIntoView({ block: 'center' }));
    const position = await page.$eval('.garden-notebook', el => el.scrollTop).catch(() => null);
    await handle.asElement().click();
    await handle.dispose();
    await pause(150);
    return position;
  };
  const field = async (label, value) => {
    const handle = await page.evaluateHandle(label => [...document.querySelectorAll('label')].find(el => el.textContent.includes(label))?.querySelector('input[type=number]'), label);
    assert(await handle.asElement(), `Missing numeric input: ${label}`);
    await handle.asElement().click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.keyboard.type(String(value));
    await page.keyboard.press('Enter');
    await handle.dispose();
    await pause(100);
  };
  const shot = async name => {
    if (shots) await page.screenshot({ path: `${shots}/${name}.png` });
  };
  const stop = async label => {
    const handle = await page.evaluateHandle(label => [...document.querySelectorAll('.garden-stops a')].find(el => el.textContent.includes(label)), label);
    await handle.asElement().click(); await handle.dispose(); await pause(150);
  };
  const assertNoOverflow = async () => {
    const size = await page.$eval('.garden-notebook', el => ({ client: el.clientWidth, scroll: el.scrollWidth }));
    assert(size.scroll <= size.client + 1, `Horizontal overflow: ${JSON.stringify(size)}`);
  };
  await page.goto(`${base}#/garden`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.garden-cover-equation');
  await shot('desktop-cover');
  await click('Start the worked example');
  assert((await text()).includes('2j'));
  await click('0 · dual');
  assert((await text()).includes('1 + 2j'));
  await click('+1 · split');
  assert((await text()).includes('2 + 2j'));
  await field('a · real part of u', 2);
  await shot('desktop-multiplication');
  // Keyboard operand editing is a real event path, not a state injection.
  const u = await page.$('circle[aria-label^="Move u,"]');
  await u.evaluate(el => el.focus()); await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => Number(document.querySelector('.garden-arithmetic-fields input').value) === 2.1);
  assert.equal(await page.$eval('.garden-arithmetic-fields input', el => Number(el.value)), 2.1);
  // Pointer drag is independent from keyboard/numeric control.
  const vHandle = await page.$('circle[aria-label^="Move v,"]');
  await vHandle.evaluate(el => el.scrollIntoView({ block: 'center' }));
  const vBox = await vHandle.boundingBox();
  await page.mouse.move(vBox.x + vBox.width / 2, vBox.y + vBox.height / 2);
  await page.mouse.down(); await page.mouse.move(vBox.x - 24, vBox.y - 16, { steps: 5 }); await page.mouse.up();
  await page.waitForFunction(() => Number(document.querySelectorAll('.garden-arithmetic-fields input')[2].value) !== 1);
  await field('c · real part of v', 1); await field('d · second part of v', 1);
  const originalMultiplicationScroll = await click('Use this product to read a derivative');
  await field('a · position on the real graph', 2);
  assert((await text()).includes('4 + 4ε'));
  await page.$eval('input[type=checkbox]', el => el.click());
  await field('b · direction', 0);
  assert((await text()).includes('slot is zero even when the tangent has a nonzero slope'));
  await shot('desktop-derivative');
  await click('Change to complex numbers: see the map and graph');
  await page.waitForSelector('.garden-pair-readout');
  await page.waitForFunction(() => document.querySelectorAll('.garden-instrument-viewport canvas').length === 2);
  await click('z = 2 + i');
  assert((await text()).includes('(2, 1, 3, 4)'));
  await pause(500); await shot('desktop-map');
  assert.equal(await page.$$eval('.garden-instrument-viewport svg circle', els => els.length), 2);
  await click('4D graph');
  await page.waitForFunction(() => document.querySelectorAll('.garden-instrument-viewport canvas').length === 1);
  await pause(400);
  const marker = await page.$eval('.garden-instrument-viewport canvas', canvas => {
    const copy = document.createElement('canvas'); copy.width = canvas.width; copy.height = canvas.height;
    const context = copy.getContext('2d'); context.drawImage(canvas, 0, 0);
    const data = context.getImageData(0, 0, copy.width, copy.height).data;
    let n = 0, x = 0, y = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) {
      n++; x += (i / 4) % copy.width; y += Math.floor((i / 4) / copy.width);
    }
    return { n, x: x / n, y: y / n, width: copy.width, height: copy.height };
  });
  const camera = new THREE.PerspectiveCamera(60, marker.width / marker.height, 0.1, 1000);
  const orientation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.3, 0.45, 0));
  camera.position.set(0, 0, 14).applyQuaternion(orientation); camera.quaternion.copy(orientation); camera.updateMatrixWorld(true);
  const expected = new THREE.Vector3(2, 1, 3).multiplyScalar(1.5).project(camera);
  assert(marker.n > 40, `Visible selected graph marker: ${JSON.stringify(marker)}`);
  assert(Math.abs(marker.x - (1 + expected.x) * marker.width / 2) < 3 && Math.abs(marker.y - (1 - expected.y) * marker.height / 2) < 3,
    `Selected marker must match Cartesian DropV projection: ${JSON.stringify({ marker, expected: expected.toArray() })}`);
  await page.$eval('.garden-instrument-viewport', el => el.scrollIntoView({ block: 'center' }));
  await shot('desktop-graph');
  assert((await text()).includes('Im w = 4'));
  await click('Plane map');
  assert((await text()).includes('(2, 1, 3, 4)'));
  await click('Explore this instrument');
  await page.waitForSelector('button');
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el => el.textContent === 'Return to garden'));
  assert((await page.content()).includes('Garden input z = (2, 1)'));
  await click('↗ 4D graph');
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el => el.textContent === 'Return to garden'));
  // Change function in the full particle viewer, then return to the square passage.
  const selection = await page.evaluateHandle(() => [...document.querySelectorAll('select')].find(el => [...el.options].some(o => o.text === 'exp')));
  assert(await selection.asElement(), 'Full instrument function selector');
  const expValue = await selection.asElement().evaluate(el => [...el.options].find(o => o.text === 'exp').value);
  await selection.asElement().select(expValue);
  await pause(200);
  await click('Return to garden');
  await page.waitForSelector('.garden-notebook');
  assert((await text()).includes('You explored a different function.'));
  assert.equal(await page.$('.garden-graph-map'), null);
  await click('Resume square example');
  assert((await text()).includes('(1, 1, 0, 2)'));
  await click('4D graph');
  await click('Explore this instrument');
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el => el.textContent === 'Return to garden'));
  const backSelect = await page.evaluateHandle(() => [...document.querySelectorAll('select')].find(el => [...el.options].some(o => o.text === 'exp')));
  const backExpValue = await backSelect.asElement().evaluate(el => [...el.options].find(o => o.text === 'exp').value);
  await backSelect.asElement().select(backExpValue);
  await pause(150);
  await page.goBack();
  await page.waitForSelector('.garden-notebook');
  assert((await text()).includes('You explored a different function.'), 'Browser Back also requires square resumption');
  await click('Resume square example');
  await click('Return to my multiplication');
  assert(Math.abs((await page.$eval('.garden-notebook', el => el.scrollTop)) - originalMultiplicationScroll) < 2, 'Return restores passage position');
  assert.equal(await page.$eval('.garden-arithmetic-fields input', el => Number(el.value)), 2.1);
  await stop('Derivative');
  assert((await text()).includes('slot is zero even when the tangent has a nonzero slope'));
  await click('Restore this example');
  assert((await text()).includes('1 + 2ε'));
  await click('Restart walk');
  assert.equal(await page.$eval('.garden-arithmetic-fields input', el => Number(el.value)), 1);
  // Fresh direct visits, mobile layout and reduced-motion mode.
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  for (const [id, name] of [['multiplication', 'Multiplication'], ['derivative', 'Derivative'], ['graph', 'Graph / map']]) {
    await page.goto(`${base}#/garden?stop=${id}`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('.garden-notebook');
    await assertNoOverflow();
    await shot(`phone-${id}`);
    if (id === 'graph') {
      await page.waitForSelector('.garden-graph-map');
      await click('4D graph'); await pause(500); await shot('phone-graph-view');
      await click('Explore this instrument');
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el => el.textContent === 'Return to garden'));
      await click('Return to garden');
      await page.waitForSelector('.garden-notebook');
    } else {
      assert((await text()).includes(name === 'Multiplication' ? 'uv =' : 'ε² = 0'));
    }
  }
  await page.evaluate(() => document.documentElement.setAttribute('data-scheme', 'light'));
  await page.$eval('.garden-instrument-viewport', el => el.scrollIntoView({ block: 'center' }));
  await shot('phone-light-graph');
  await assertNoOverflow();
  assert.deepEqual(errors, [], 'Browser exceptions or shader/console errors');
  console.log('PASS: desktop route, preset math, keyboard and pointer operands, saved passage position, zero direction, selected pair and pixel-verified DropV marker, map/graph switch, exploration/function-change return, independent reset/restart, phone direct entries, reduced motion and overflow checks.');
} catch (error) {
  console.error(JSON.stringify({ errors, body: page ? await page.evaluate(() => document.body.innerText) : '', url: page?.url() }, null, 2));
  if (shots && page) await page.screenshot({ path: `${shots}/failure.png` });
  throw error;
} finally { await browser.close(); }
