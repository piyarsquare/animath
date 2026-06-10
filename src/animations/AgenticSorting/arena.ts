/**
 * Agentic Sorting — canvas renderer.
 *
 * Canvas (not DOM nodes) so the arena stays legible at hundreds of agents, where
 * the clustering-by-algotype phenomenon is actually visible. Colors are the
 * Okabe–Ito qualitative palette, chosen to stay distinguishable under the common
 * forms of color-vision deficiency.
 */

import type { Agent, AgentType, Objective } from './engine';

export const TYPE_COLORS: Record<AgentType, string> = {
  standard: '#0072B2',      // blue
  blindDate: '#E69F00',     // orange
  nomadic: '#009E73',       // bluish green
  patrolling: '#CC79A7',    // reddish purple
  perfectionist: '#D55E00', // vermillion
};

export const OBJECTIVE_COLORS: Record<Objective, string> = {
  1: '#0072B2',   // ascending → blue
  [-1]: '#D55E00', // descending → vermillion
};

export const FROZEN_COLOR = '#9aa0a6';

export interface DrawOpts {
  display: 'bars' | 'dots';
  colorBy: 'type' | 'objective';
  /** midline / label color, read from the theme so it works across skins. */
  axis: string;
  /** highlight color for the tracked agent (read from --accent). */
  mark: string;
  /** id of the agent being click-tracked, if any. */
  selectedId?: number | null;
}

function colorFor(a: Agent, colorBy: DrawOpts['colorBy']): string {
  if (a.frozen) return FROZEN_COLOR;
  return colorBy === 'type' ? TYPE_COLORS[a.type] : OBJECTIVE_COLORS[a.objective];
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
      ctx.fillStyle = colorFor(a, opts.colorBy);
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
      ctx.fillStyle = colorFor(a, opts.colorBy);
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
