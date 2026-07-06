// probe.mjs — numeric probes for the Hamming high-dimensional-sphere notebook.
//
//   node docs/sessions/progress/high-dim-sphere-surface-oyo8ko/assets/probe.mjs
//
// Prints the Markdown tables quoted in 2026-07-06-S01-hamming-sphere-notebook.md.
// Deterministic: the Monte Carlo section uses a seeded PRNG, so re-running
// reproduces the notebook's numbers exactly.

// ---------- exact quantities ----------

// ln V_n(1) via the two-step recursion V_n = V_{n-2} * 2π/n  (V_1 = 2, V_2 = π).
function lnBallVolumes(nMax) {
  const ln = new Array(nMax + 1);
  ln[1] = Math.log(2);
  ln[2] = Math.log(Math.PI);
  for (let n = 3; n <= nMax; n++) ln[n] = ln[n - 2] + Math.log(2 * Math.PI) - Math.log(n);
  return ln;
}

const fmt = (x, d = 4) =>
  Math.abs(x) >= 1e5 || (Math.abs(x) < 1e-4 && x !== 0) ? x.toExponential(2) : x.toFixed(d);
const pct = (x, d = 2) => (100 * x).toFixed(d) + "%";

function table(header, rows) {
  const lines = [
    "| " + header.join(" | ") + " |",
    "|" + header.map(() => "---").join("|") + "|",
    ...rows.map((r) => "| " + r.join(" | ") + " |"),
  ];
  console.log(lines.join("\n") + "\n");
}

console.log("## A — unit-ball volume V_n(1), surface A_n(1), and the ball:cube ratio\n");
{
  const nMax = 100;
  const ln = lnBallVolumes(nMax);
  const rows = [];
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20, 30, 50, 100]) {
    const V = Math.exp(ln[n]);
    const A = n * V; // A_{n-1}(1) = n V_n(1)
    const ratio = Math.exp(ln[n] - n * Math.log(2)); // V_n / 2^n
    rows.push([n, fmt(V), fmt(A), ratio < 1e-4 ? ratio.toExponential(2) : fmt(ratio)]);
  }
  table(["n", "V_n(1)", "surface A(1)", "V_n / cube 2^n"], rows);
  // the peak
  let best = 1;
  for (let n = 1; n <= nMax; n++) if (ln[n] > ln[best]) best = n;
  console.log(`Peak volume at n = ${best} (V = ${fmt(Math.exp(ln[best]))}).\n`);
}

console.log("## B — shell fractions 1 − (1−ε)^n, median radius, E[R]\n");
{
  const eps = [0.01, 0.05, 0.1];
  const rows = [];
  for (const n of [2, 3, 10, 30, 100, 500, 1000, 10000]) {
    rows.push([
      n,
      ...eps.map((e) => pct(1 - Math.pow(1 - e, n))),
      fmt(Math.pow(2, -1 / n), 5),
      fmt(n / (n + 1), 5),
    ]);
  }
  table(["n", "outer 1% shell", "outer 5% shell", "outer 10% shell", "median R", "E[R]"], rows);
  console.log("Shell thickness holding half the volume: ε½ = 1 − 2^(−1/n) ≈ ln2/n.");
  for (const n of [3, 100, 1000]) console.log(`  n=${n}: ε½ = ${pct(1 - Math.pow(2, -1 / n), 3)}`);
  console.log("");
}

console.log("## C — one coordinate of a random point on S^(n-1) (the equator squeeze)\n");
{
  // density f(x) ∝ (1 − x²)^((n−3)/2) on [−1, 1]; Simpson integration.
  function coordProb(n, w) {
    w = Math.min(w, 1); // the coordinate never leaves [−1, 1]
    const F = (x) => Math.pow(Math.max(0, 1 - x * x), (n - 3) / 2);
    const simpson = (a, b, m) => {
      const h = (b - a) / m;
      let s = F(a) + F(b);
      for (let i = 1; i < m; i++) s += F(a + i * h) * (i % 2 ? 4 : 2);
      return (s * h) / 3;
    };
    return simpson(-w, w, 200000) / simpson(-1, 1, 200000);
  }
  const rows = [];
  for (const n of [3, 10, 100, 1000]) {
    rows.push([
      n,
      pct(coordProb(n, 0.1)),
      pct(coordProb(n, 1.96 / Math.sqrt(n))),
      fmt(1 / Math.sqrt(n), 4),
      fmt((180 / Math.PI) / Math.sqrt(n), 2) + "°",
    ]);
  }
  table(
    ["n", "P(|x₁| ≤ 0.1)", "P(|x₁| ≤ 1.96/√n)", "σ(x₁) = 1/√n", "σ as an angle off the equator"],
    rows
  );
  console.log("n = 3 is Archimedes' hat-box: x₁ is exactly uniform on [−1,1].\n");
}

console.log("## D — the corner-sphere box (side-4 cube, 2^n unit corner spheres)\n");
{
  const rows = [];
  for (const n of [2, 3, 4, 9, 10, 16, 25]) {
    const r = Math.sqrt(n) - 1;
    const note =
      n < 4 ? "smaller than the corner spheres" :
      n === 4 ? "equal to the corner spheres" :
      n < 9 ? "bigger than the corner spheres" :
      n === 9 ? "touches the cube walls" : "pokes OUTSIDE the cube";
    rows.push([n, fmt(r, 3), note]);
  }
  table(["n", "inner-sphere radius √n − 1", "and so…"], rows);
}

// ---------- Monte Carlo checks (seeded) ----------

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260706);
function gauss() {
  // Box–Muller
  const u = Math.max(rand(), 1e-12), v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function unitVec(n) {
  const x = new Float64Array(n);
  let s = 0;
  for (let i = 0; i < n; i++) { x[i] = gauss(); s += x[i] * x[i]; }
  const inv = 1 / Math.sqrt(s);
  for (let i = 0; i < n; i++) x[i] *= inv;
  return x;
}

console.log("## E — Monte Carlo vs theory (n = 100, 200 000 samples, seed 20260706)\n");
{
  const n = 100, M = 200000;
  let outer1 = 0, sumR = 0, medArr = new Float64Array(M);
  for (let i = 0; i < M; i++) {
    const r = Math.pow(rand(), 1 / n); // radius of a uniform point in the ball
    medArr[i] = r; sumR += r;
    if (r > 0.99) outer1++;
  }
  medArr.sort();
  const rows = [
    ["volume in the outer 1% shell", pct(1 - Math.pow(0.99, n)), pct(outer1 / M)],
    ["mean radius E[R] = n/(n+1)", fmt(n / (n + 1), 5), fmt(sumR / M, 5)],
    ["median radius 2^(−1/n)", fmt(Math.pow(2, -1 / n), 5), fmt(medArr[M / 2], 5)],
  ];

  // pair angles on S^99
  const P = 20000;
  let s = 0, s2 = 0, within10 = 0;
  for (let i = 0; i < P; i++) {
    const a = unitVec(n), b = unitVec(n);
    let dot = 0;
    for (let k = 0; k < n; k++) dot += a[k] * b[k];
    s += dot; s2 += dot * dot;
    const ang = (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
    if (Math.abs(ang - 90) <= 10) within10++;
  }
  const sd = Math.sqrt(s2 / P - (s / P) ** 2);
  rows.push(["σ(cos θ) between random pairs = 1/√n", fmt(1 / Math.sqrt(n), 4), fmt(sd, 4)]);
  rows.push(["pairs within 90° ± 10°", "≈ " + pct(2 * normCdf(10 / ((180 / Math.PI) / Math.sqrt(n))) - 1, 1), pct(within10 / P, 1)]);
  table(["quantity", "theory", "sampled"], rows);
}

function normCdf(z) {
  // Abramowitz–Stegun 7.1.26 via erf
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const erf =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp((-z * z) / 2);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}
