/**
 * Agentic Sorting — canvas renderer.
 *
 * Canvas (not DOM nodes) so the arena stays legible at hundreds of agents, where
 * the clustering-by-algotype phenomenon is actually visible. Colors are the
 * Okabe–Ito qualitative palette, chosen to stay distinguishable under the common
 * forms of color-vision deficiency.
 */

import type { Agent, AgentType, Objective } from './engine';

// Agent identities → discrete --data slots (theming v2). Distinct slots chosen to
// stay separable; the Okabe–Ito values (formerly hardcoded, chosen for
// color-vision-deficiency safety) remain the fallbacks, so CVD-safety now rides
// the theme's --data palette. CSS consumers (legend, lab, weight bar) use these
// var() strings directly; the canvas resolves them to hex (passed via DrawOpts).
export const TYPE_COLORS: Record<AgentType, string> = {
  standard: 'var(--data-1, #0072B2)',      // blue
  blindDate: 'var(--data-5, #E69F00)',     // orange
  nomadic: 'var(--data-3, #009E73)',       // green
  patrolling: 'var(--data-7, #CC79A7)',    // purple
  perfectionist: 'var(--data-6, #D55E00)', // red/vermillion
};

export interface DrawOpts {
  display: 'bars' | 'dots';
  colorBy: 'type' | 'objective';
  /** midline / label color, read from the theme so it works across skins. */
  axis: string;
  /** highlight color for the tracked agent (read from --accent). */
  mark: string;
  /** Resolved (hex) agent palettes for the canvas — var() doesn't resolve in
   *  canvas fillStyle, so the caller reads the --data tokens and passes them. */
  typeColors: Record<AgentType, string>;
  objColors: Record<Objective, string>;
  frozen: string;
  /** id of the agent being click-tracked, if any. */
  selectedId?: number | null;
}

function colorFor(a: Agent, opts: DrawOpts): string {
  if (a.frozen) return opts.frozen;
  return opts.colorBy === 'type' ? opts.typeColors[a.type] : opts.objColors[a.objective];
}

/**
 * Draw the whole population. `w`/`h` are CSS pixels; the caller has already
 * scaled the context by the device pixel ratio.
 */
export function drawArena(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  agents: Agent[],
  opts: DrawOpts,
): void {
  ctx.clearRect(0, 0, w, h);
  const n = agents.length;
  const midY = h / 2;
  const pad = 10;
  const half = midY - pad;

  // midline
  ctx.strokeStyle = opts.axis;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(w, midY);
  ctx.stroke();
  ctx.globalAlpha = 1;

  if (n === 0) return;
  const colW = w / n;

  // tracked-agent guide column (behind the marks)
  if (opts.selectedId != null) {
    const si = agents.findIndex(a => a.id === opts.selectedId);
    if (si >= 0) {
      ctx.fillStyle = opts.mark;
      ctx.globalAlpha = 0.16;
      ctx.fillRect(si * colW - 0.5, 0, Math.max(2, colW + 1), h);
      ctx.globalAlpha = 1;
    }
  }

  if (opts.display === 'bars') {
    for (let i = 0; i < n; i++) {
      const a = agents[i];
      const x = i * colW;
      const len = (Math.abs(a.value) / 100) * half;
      ctx.fillStyle = colorFor(a, opts);
      ctx.globalAlpha = a.frozen ? 0.55 : 0.92;
      const bw = Math.max(1, colW - (colW > 4 ? 1 : 0));
      if (a.value >= 0) ctx.fillRect(x, midY - len, bw, len);
      else ctx.fillRect(x, midY, bw, len);
    }
    ctx.globalAlpha = 1;
  } else {
    const r = Math.max(1.4, Math.min(4.5, colW * 0.42));
    for (let i = 0; i < n; i++) {
      const a = agents[i];
      const x = i * colW + colW / 2;
      const y = midY - (a.value / 100) * half;
      ctx.fillStyle = colorFor(a, opts);
      ctx.globalAlpha = a.frozen ? 0.55 : 0.95;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // tracked-agent marker on top of its mark
  if (opts.selectedId != null) {
    const si = agents.findIndex(a => a.id === opts.selectedId);
    if (si >= 0) {
      const a = agents[si];
      const x = si * colW + colW / 2;
      const y = midY - (a.value / 100) * half;
      ctx.strokeStyle = opts.mark;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(5, Math.min(7, colW * 0.6)), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/** A cool→warm ramp: monotone improvers fade out, backtrackers glow warm. */
function heat(t: number): string {
  const c = Math.max(0, Math.min(1, t));
  const r = Math.round(150 + (255 - 150) * c);
  const g = Math.round(150 + (90 - 150) * c);
  const b = Math.round(155 + (55 - 155) * c);
  const a = (0.14 + 0.78 * c).toFixed(3);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Overlay **every** agent's distance-to-its-sorted-home over time — one line per
 * agent. Lines are colored by *backtrack score* (how far the agent rose above
 * its starting distance before improving): monotone improvers stay dim, and
 * agents that practiced delayed gratification glow warm and draw on top. This is
 * the population-wide view of the competency the single tracker could only hint
 * at.
 *
 * `traj[id]` is that agent's distance samples; `len` is how many samples exist.
 */
export function drawTrajectories(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  traj: number[][],
  len: number,
  axis: string,
): void {
  ctx.clearRect(0, 0, w, h);
  if (len < 2) return;

  // per-agent backtrack score + global max distance for the y-scale
  let maxDist = 1;
  let maxScore = 1e-6;
  const scores = new Array<number>(traj.length);
  for (let id = 0; id < traj.length; id++) {
    const s = traj[id];
    if (!s || s.length < 2) { scores[id] = 0; continue; }
    let peak = s[0];
    let over = 0;
    for (let t = 0; t < s.length; t++) {
      if (s[t] > maxDist) maxDist = s[t];
      if (s[t] > peak) peak = s[t];
      const o = s[t] - s[0];
      if (o > over) over = o;
    }
    scores[id] = Math.max(0, over);
    if (scores[id] > maxScore) maxScore = scores[id];
  }

  // baseline
  ctx.strokeStyle = axis;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h - 1);
  ctx.lineTo(w, h - 1);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // draw dim (low-score) lines first so backtrackers land on top
  const order = [...traj.keys()].sort((a, b) => scores[a] - scores[b]);
  const denom = Math.max(1, len - 1);
  ctx.lineWidth = 1;
  for (const id of order) {
    const s = traj[id];
    if (!s || s.length < 2) continue;
    ctx.strokeStyle = heat(scores[id] / maxScore);
    ctx.beginPath();
    for (let t = 0; t < s.length; t++) {
      const x = (t / denom) * w;
      const y = h - (s[t] / maxDist) * (h - 2);
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
