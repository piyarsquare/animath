// GPU df64 diagnostic. Renders a deep-zoom Mandelbrot strip with the SAME df64
// GLSL the app ships, reads the escape counts back, and compares the float32
// path (hp=0) and the df64 path (hp=1) against a CPU float64 reference.
//
// If df64 works on this GPU/driver: the hp=1 row tracks the float64 truth
// (many distinct values, short runs), while hp=0 is blocky (long identical
// runs) and disagrees with the truth.
//
// If the shader compiler has optimized the error-free transforms away: hp=1
// looks just like hp=0 (both blocky, both disagree with truth) — that is the
// classic GPU df64 failure and tells us the source needs the optimizer
// defeated.
import puppeteer from 'puppeteer';

const args = ['--headless=new','--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage'];
const browser = await puppeteer.launch({ args });
const page = await browser.newPage();
page.on('console', m => console.log('[page]', m.text()));
page.on('pageerror', e => console.log('[pageerror]', e.message));

// Deep-zoom center on the seahorse-valley boundary, width well past the float32
// wall (~1e5×) but inside the df64 ceiling (~1e13×).
const CENTER_X = -0.743643838;
const CENTER_Y = 0.13182590421;
const WIDTH = 2e-8;            // zoom ~2e8×
const N = 256;                 // pixels across the strip
const MAX_ITER = 2000;

const result = await page.evaluate(({ CENTER_X, CENTER_Y, WIDTH, N, MAX_ITER }) => {
  const canvas = document.createElement('canvas');
  canvas.width = N; canvas.height = 1;
  const gl = canvas.getContext('webgl2');
  if (!gl) return { error: 'no webgl2' };

  const vs = `#version 300 es
    in vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

  const fs = `#version 300 es
    precision highp float;
    uniform vec2 centerHi, centerLo;
    uniform float width;
    uniform int maxIter;
    uniform int hp;
    uniform float n;
    out vec4 frag;

    vec2 dfAdd(vec2 a, vec2 b){
      float t1 = a.x + b.x;
      float e  = t1 - a.x;
      float t2 = ((b.x - e) + (a.x - (t1 - e))) + a.y + b.y;
      float hi = t1 + t2;
      float lo = t2 - (hi - t1);
      return vec2(hi, lo);
    }
    vec2 dfMul(vec2 a, vec2 b){
      float split = 4097.0;
      float cona = a.x * split;
      float conb = b.x * split;
      float a1 = cona - (cona - a.x);
      float b1 = conb - (conb - b.x);
      float a2 = a.x - a1;
      float b2 = b.x - b1;
      float c11 = a.x * b.x;
      float c21 = a2 * b2 - (((c11 - a1 * b1) - a2 * b1) - a1 * b2);
      float c2 = a.x * b.y + a.y * b.x;
      float t1 = c11 + c2;
      float e = t1 - c11;
      float t2 = ((c2 - e) + (c11 - (t1 - e))) + c21 + a.y * b.y;
      float hi = t1 + t2;
      float lo = t2 - (hi - t1);
      return vec2(hi, lo);
    }
    vec2 dfNeg(vec2 a){ return vec2(-a.x, -a.y); }

    void main(){
      float u = (gl_FragCoord.x - 0.5) / n;   // 0..1 across the strip
      float ox = (u - 0.5) * width;
      int i = 0;
      if(hp == 0){
        vec2 c = vec2(centerHi.x + ox, centerHi.y);
        vec2 z = vec2(0.0);
        for(i=0;i<maxIter;i++){
          if(dot(z,z) > 4.0) break;
          z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
        }
      } else {
        vec2 cr = dfAdd(vec2(centerHi.x, centerLo.x), vec2(ox, 0.0));
        vec2 ci = vec2(centerHi.y, centerLo.y);
        vec2 zr = vec2(0.0), zi = vec2(0.0);
        for(i=0;i<maxIter;i++){
          vec2 mag = dfAdd(dfMul(zr,zr), dfMul(zi,zi));
          if(mag.x > 4.0) break;
          vec2 nr = dfAdd(dfAdd(dfMul(zr,zr), dfNeg(dfMul(zi,zi))), cr);
          vec2 ni = dfAdd(dfMul(dfMul(vec2(2.0,0.0), zr), zi), ci);
          zr = nr; zi = ni;
        }
      }
      float r = mod(float(i), 256.0) / 255.0;
      float g = floor(float(i) / 256.0) / 255.0;
      frag = vec4(r, g, 0.0, 1.0);
    }`;

  const compile = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return { error: gl.getProgramInfoLog(prog) };
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  // df64 split of the center coords (hi, lo).
  const split = v => { const hi = Math.fround(v); return [hi, v - hi]; };
  const [cxHi, cxLo] = split(CENTER_X);
  const [cyHi, cyLo] = split(CENTER_Y);

  const readRow = (hp) => {
    gl.uniform2f(gl.getUniformLocation(prog, 'centerHi'), cxHi, cyHi);
    gl.uniform2f(gl.getUniformLocation(prog, 'centerLo'), cxLo, cyLo);
    gl.uniform1f(gl.getUniformLocation(prog, 'width'), WIDTH);
    gl.uniform1i(gl.getUniformLocation(prog, 'maxIter'), MAX_ITER);
    gl.uniform1f(gl.getUniformLocation(prog, 'n'), N);
    gl.uniform1i(gl.getUniformLocation(prog, 'hp'), hp);
    gl.viewport(0, 0, N, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const px = new Uint8Array(N * 4);
    gl.readPixels(0, 0, N, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const out = [];
    for (let k = 0; k < N; k++) out.push(px[k*4] + px[k*4+1]*256);
    return out;
  };

  return { single: readRow(0), double: readRow(1) };
}, { CENTER_X, CENTER_Y, WIDTH, N, MAX_ITER });

await browser.close();

if (result.error) { console.log('ERROR:', result.error); process.exit(1); }

// CPU float64 reference for the same 256 coordinates.
function escTruth(cx, cy, m){ let zx=0,zy=0,i=0; for(;i<m;i++){ if(zx*zx+zy*zy>4) break; const nx=zx*zx-zy*zy+cx; const ny=2*zx*zy+cy; zx=nx; zy=ny; } return i; }
const truth = [];
for (let k = 0; k < N; k++) {
  const u = (k + 0.5) / N;
  const cx = CENTER_X + (u - 0.5) * WIDTH;
  truth.push(escTruth(cx, CENTER_Y, MAX_ITER));
}

const stats = (row) => {
  const distinct = new Set(row).size;
  let maxRun = 1, run = 1;
  for (let k = 1; k < row.length; k++) { if (row[k] === row[k-1]) { run++; maxRun = Math.max(maxRun, run); } else run = 1; }
  let matchTruth = 0;
  for (let k = 0; k < row.length; k++) if (Math.abs(row[k] - truth[k]) <= 1) matchTruth++;
  return { distinct, maxRun, matchTruth };
};

const zoom = 4 / WIDTH;
console.log(`\ndeep-zoom strip: ${N}px, center (${CENTER_X}, ${CENTER_Y}), width ${WIDTH.toExponential(1)} (zoom ~${zoom.toExponential(1)}×), maxIter ${MAX_ITER}\n`);
const tS = stats(result.single), tD = stats(result.double), tT = stats(truth);
const fmt = (name, s) => `  ${name.padEnd(16)} distinct=${String(s.distinct).padStart(3)}  longestFlatRun=${String(s.maxRun).padStart(3)}  matchesTruth=${s.matchTruth}/${N}`;
console.log(fmt('float64 truth', tT));
console.log(fmt('GPU float32', tS));
console.log(fmt('GPU df64', tD));

console.log('\n  first 24 escape counts:');
console.log('    truth :', truth.slice(0, 24).join(' '));
console.log('    f32   :', result.single.slice(0, 24).join(' '));
console.log('    df64  :', result.double.slice(0, 24).join(' '));

// df64 works if it resolves the strip like the truth (many distinct values,
// short flat runs) while float32 is blocky (few distinct, long runs). We judge
// by STRUCTURE, not exact escape counts — tiny df64 rounding shifts the exact
// escape iteration by ±1 deep in the orbit, which is invisible in the image.
const df64Works = tD.maxRun < N / 4 && tD.distinct > tS.distinct * 5 && tS.maxRun > N / 2;
const df64Dead  = tD.maxRun >= tS.maxRun * 0.8 && tD.distinct <= tS.distinct * 1.5;
console.log('\n  VERDICT: ' + (df64Works
  ? '✓ df64 WORKS on this GPU — it resolves the strip like the float64 truth, where float32 is blocky.'
  : df64Dead
    ? '✗ df64 is NOT helping — it behaves like float32. The compiler likely optimized away the error-free transforms.'
    : '? inconclusive — inspect the numbers above.'));
