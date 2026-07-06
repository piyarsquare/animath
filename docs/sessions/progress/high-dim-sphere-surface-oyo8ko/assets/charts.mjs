// charts.mjs — generates the four SVG figures for the Hamming sphere notebook.
//
//   node docs/sessions/progress/high-dim-sphere-surface-oyo8ko/assets/charts.mjs
//
// Static SVGs (inline-attribute styling, no scripts) so they render on GitHub.
// Each carries its own light chart surface so it stays readable on GitHub dark
// mode. Colors: validated ordinal blue ramps (dimension/thickness is ordered),
// chrome inks per the reference dataviz palette.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = dirname(fileURLToPath(import.meta.url));

// ---- chrome tokens (light) ----
const SURFACE = "#fcfcfb";
const INK = "#0b0b0b";
const INK2 = "#52514e";
const MUTED = "#898781";
const GRID = "#e1e0d9";
const BASE = "#c3c2b7";
const FONT = `system-ui, -apple-system, 'Segoe UI', sans-serif`;

// validated ordinal ramps (light surface)
const RAMP5 = ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab", "#104281"];
const RAMP4 = ["#86b6ef", "#3987e5", "#1c5cab", "#0d366b"];
const RAMP3 = ["#6da7ec", "#2a78d6", "#184f95"];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

function svgOpen(w, h) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" ` +
    `font-family="${FONT}">\n<rect width="${w}" height="${h}" fill="${SURFACE}" rx="8"/>\n`
  );
}
const text = (x, y, s, { size = 10.5, fill = MUTED, anchor = "start", weight = "normal" } = {}) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${weight}">${esc(s)}</text>\n`;
const line = (x1, y1, x2, y2, stroke = GRID, sw = 1) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"/>\n`;
const path = (d, stroke, sw = 2) =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>\n`;

function titleBlock(title, subtitle) {
  return text(20, 26, title, { size: 14, fill: INK, weight: "600" }) + text(20, 43, subtitle, { size: 11, fill: INK2 });
}
function legendRow(x, y, items) {
  let s = "", cx = x;
  for (const [label, color] of items) {
    s += `<rect x="${cx}" y="${y - 8}" width="10" height="10" rx="2" fill="${color}"/>\n`;
    s += text(cx + 14, y + 1, label, { size: 10.5, fill: INK2 });
    cx += 14 + label.length * 5.6 + 18;
  }
  return s;
}
const pathFrom = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join("");

// rounded free end (r=4), anchored to the baseline
function roundedBar(x, w, yTop, yBase, fill) {
  const r = Math.min(4, w / 2, Math.abs(yBase - yTop));
  return (
    `<path d="M${x},${yBase} L${x},${yTop + r} Q${x},${yTop} ${x + r},${yTop} ` +
    `L${x + w - r},${yTop} Q${x + w},${yTop} ${x + w},${yTop + r} L${x + w},${yBase} Z" fill="${fill}"/>\n`
  );
}

// ==== figure 1 — V_n(1) vs n ====
{
  const W = 760, H = 380, L = 56, R = 24, T = 66, B = 44;
  const nMax = 20;
  const lnV = [NaN, Math.log(2), Math.log(Math.PI)];
  for (let n = 3; n <= nMax; n++) lnV[n] = lnV[n - 2] + Math.log(2 * Math.PI) - Math.log(n);
  const V = lnV.map((v) => Math.exp(v));
  const yMax = 6;
  const xw = (W - L - R) / nMax;
  const X = (n) => L + (n - 1) * xw + xw * 0.15;
  const Y = (v) => T + (H - T - B) * (1 - v / yMax);

  let s = svgOpen(W, H);
  s += titleBlock("The unit ball's volume rises, peaks at n = 5, then collapses", "Vₙ(1) = πⁿᐟ² / Γ(nᐟ2+1); each added pair of dimensions multiplies it by 2π/n — a shrink once n > 2π ≈ 6.3");
  for (let g = 0; g <= yMax; g += 1) {
    s += line(L, Y(g), W - R, Y(g));
    s += text(L - 8, Y(g) + 3.5, g, { anchor: "end" });
  }
  for (let n = 1; n <= nMax; n++) {
    s += roundedBar(X(n), xw * 0.7, Y(V[n]), Y(0), "#2a78d6");
    s += text(X(n) + xw * 0.35, H - B + 16, n, { anchor: "middle" });
  }
  s += line(L, Y(0), W - R, Y(0), BASE, 1.5);
  s += text(L + (W - L - R) / 2, H - 8, "dimension n", { anchor: "middle" });
  // selective direct labels: the peak and the collapse
  s += text(X(5) + xw * 0.35, Y(V[5]) - 8, "5.26", { fill: INK, weight: "600", anchor: "middle", size: 11 });
  s += text(X(20) + xw * 0.35, Y(V[20]) - 8, "0.026", { fill: INK2, anchor: "middle", size: 10 });
  s += text(W - R, 26, "V₁₀₀ ≈ 2.4×10⁻⁴⁰", { anchor: "end", size: 10.5, fill: INK2 });
  s += "</svg>\n";
  writeFileSync(join(OUT, "vn-vs-n.svg"), s);
}

// ==== figure 2 — radial CDF r^n ====
{
  const W = 760, H = 380, L = 56, R = 40, T = 84, B = 44;
  const NS = [1, 3, 10, 30, 100];
  const X = (r) => L + (W - L - R) * r;
  const Y = (p) => T + (H - T - B) * (1 - p);

  let s = svgOpen(W, H);
  s += titleBlock("Share of the ball's volume within radius r — the mass flees to the skin", "P(R ≤ r) = rⁿ; dots mark the median radius 2⁻¹ᐟⁿ — at n = 100, half the volume lies beyond r = 0.993");
  s += legendRow(20, 62, NS.map((n, i) => [`n = ${n}`, RAMP5[i]]));
  for (const g of [0, 0.25, 0.5, 0.75, 1]) {
    s += line(L, Y(g), W - R, Y(g));
    s += text(L - 8, Y(g) + 3.5, `${g * 100}%`, { anchor: "end" });
  }
  for (const g of [0, 0.25, 0.5, 0.75, 1]) s += text(X(g), H - B + 16, g.toFixed(2), { anchor: "middle" });
  s += line(L, Y(0), W - R, Y(0), BASE, 1.5);
  s += text(L + (W - L - R) / 2, H - 8, "radius r", { anchor: "middle" });
  NS.forEach((n, i) => {
    const pts = [];
    for (let k = 0; k <= 240; k++) { const r = k / 240; pts.push([X(r), Y(Math.pow(r, n))]); }
    s += path(pathFrom(pts), RAMP5[i]);
    const med = Math.pow(2, -1 / n);
    s += `<circle cx="${X(med)}" cy="${Y(0.5)}" r="4" fill="${RAMP5[i]}" stroke="${SURFACE}" stroke-width="2"/>\n`;
  });
  // selective direct labels (n = 30, 100 are carried by the legend — the right
  // corner is too crowded for text); each label sits just above its own curve
  for (const [n, r] of [[1, 0.44], [3, 0.66], [10, 0.88]]) {
    s += text(X(r) - 6, Y(Math.pow(r, n)) - 8, `n = ${n}`, { fill: INK2, size: 10.5, anchor: "end" });
  }
  s += "</svg>\n";
  writeFileSync(join(OUT, "radial-cdf.svg"), s);
}

// ==== figure 3 — shell fraction vs n (log x) ====
{
  const W = 760, H = 380, L = 56, R = 120, T = 84, B = 44;
  const EPS = [0.01, 0.05, 0.1];
  const NMAX = 10000;
  const X = (n) => L + ((W - L - R) * Math.log10(n)) / Math.log10(NMAX);
  const Y = (p) => T + (H - T - B) * (1 - p);

  let s = svgOpen(W, H);
  s += titleBlock("How much volume lives in the outer skin of thickness εr", "1 − (1−ε)ⁿ — every fixed skin thickness ends up holding everything; n on a log scale");
  s += legendRow(20, 62, EPS.map((e, i) => [`ε = ${e * 100}%`, RAMP3[i]]));
  for (const g of [0, 0.25, 0.5, 0.75, 1]) {
    s += line(L, Y(g), W - R, Y(g));
    s += text(L - 8, Y(g) + 3.5, `${g * 100}%`, { anchor: "end" });
  }
  for (const d of [1, 10, 100, 1000, 10000]) {
    s += line(X(d), T, X(d), Y(0));
    s += text(X(d), H - B + 16, d >= 1000 ? `${d / 1000}k` : d, { anchor: "middle" });
  }
  s += line(L, Y(0), W - R, Y(0), BASE, 1.5);
  s += text(L + (W - L - R) / 2, H - 8, "dimension n (log scale)", { anchor: "middle" });
  EPS.forEach((e, i) => {
    const pts = [];
    for (let k = 0; k <= 300; k++) {
      const n = Math.pow(10, (k / 300) * Math.log10(NMAX));
      pts.push([X(n), Y(1 - Math.pow(1 - e, n))]);
    }
    s += path(pathFrom(pts), RAMP3[i]);
  });
  // direct labels at each curve's 50%-crossing, pushed to alternating sides so
  // the three annotations can't collide
  const n50 = (e) => Math.log(0.5) / Math.log(1 - e);
  s += text(X(n50(0.1)) - 7, Y(0.5) + 3.5, "ε = 10%", { fill: INK2, size: 10.5, anchor: "end" });
  s += text(X(n50(0.05)) + 7, Y(0.5) + 3.5, "ε = 5%", { fill: INK2, size: 10.5 });
  s += text(X(n50(0.01)) + 8, Y(0.5) + 16, "ε = 1% — half the ball by n ≈ 69", { fill: INK2, size: 10.5 });
  s += "</svg>\n";
  writeFileSync(join(OUT, "shell-fraction.svg"), s);
}

// ==== figure 4 — one-coordinate density on S^(n-1) ====
{
  const W = 760, H = 380, L = 56, R = 24, T = 84, B = 44;
  const NS = [3, 10, 100, 1000];
  const X = (x) => L + ((W - L - R) * (x + 1)) / 2;
  const yMax = 13;
  const Y = (f) => T + (H - T - B) * (1 - f / yMax);

  const density = (n) => {
    const F = (x) => Math.pow(Math.max(0, 1 - x * x), (n - 3) / 2);
    let Z = 0;
    const m = 4000, h = 2 / m;
    for (let i = 0; i <= m; i++) Z += F(-1 + i * h) * (i === 0 || i === m ? 1 : i % 2 ? 4 : 2);
    Z = (Z * h) / 3;
    return (x) => F(x) / Z;
  };

  let s = svgOpen(W, H);
  s += titleBlock("A single coordinate of a random point on the sphere — the equator squeeze", "density of x₁ on Sⁿ⁻¹ ∝ (1−x₁²)^((n−3)ᐟ2); width shrinks like 1ᐟ√n, so nearly all points hug the equator x₁ = 0");
  s += legendRow(20, 62, NS.map((n, i) => [`n = ${n}`, RAMP4[i]]));
  for (const g of [0, 4, 8, 12]) {
    s += line(L, Y(g), W - R, Y(g));
    s += text(L - 8, Y(g) + 3.5, g, { anchor: "end" });
  }
  for (const g of [-1, -0.5, 0, 0.5, 1]) s += text(X(g), H - B + 16, g, { anchor: "middle" });
  s += line(L, Y(0), W - R, Y(0), BASE, 1.5);
  s += text(L + (W - L - R) / 2, H - 8, "coordinate x₁  (±1 = the poles)", { anchor: "middle" });
  NS.forEach((n, i) => {
    const f = density(n), pts = [];
    for (let k = 0; k <= 480; k++) { const x = -1 + (2 * k) / 480; pts.push([X(x), Y(Math.min(f(x), yMax))]); }
    s += path(pathFrom(pts), RAMP4[i]);
  });
  s += text(X(0.98), Y(0.5) - 10, "n = 3: exactly flat (Archimedes' hat-box)", { size: 10, fill: INK2, anchor: "end" });
  s += text(X(0.075) + 4, Y(12.4), "n = 1000: σ = 1ᐟ√n ≈ 0.032", { size: 10, fill: INK2 });
  s += "</svg>\n";
  writeFileSync(join(OUT, "coordinate-density.svg"), s);
}

console.log("wrote 4 SVGs to", OUT);
