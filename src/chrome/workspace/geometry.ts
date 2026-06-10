/**
 * Workspace window geometry — soft-magnetic snapping, resize-edge snapping,
 * free-slot packing and collapse-chain detection. Ported nearly verbatim from
 * the design prototype (docs/redesign/prototype/workspace.jsx), as
 * docs/redesign/IMPLEMENTATION.md prescribes: this is framework-agnostic math.
 *
 * Coordinates are stage-local pixels (the stage is the workspace's positioned
 * ancestor). Panels may overlap while dragging; edges are magnetic — as a
 * dragged edge nears a target (stage border or another window's edge) it feels
 * resistance and is pulled in, locking when very close. A guide line renders
 * only while an axis is actually locked.
 */

export interface Rect { x: number; y: number; w: number; h: number; }

/** Lock distance, magnetic pull radius, dock gutter, rail clearance, stage margin. */
export const WS_LOCK = 9;
export const WS_PULL = 26;
export const WS_GAP = 10;
export const WS_RAIL = 78;
export const WS_MARGIN = 14;

/** Default panel width (matches .am-ws-panel in theme.css). */
export const PANEL_W = 268;

interface AxisCandidate { v: number; g: number; }
interface AxisResult { pos: number; guide: number | null; locked?: boolean; }

function softAxis(raw: number, cands: AxisCandidate[]): AxisResult {
  let best: AxisCandidate | null = null;
  let bd = WS_PULL;
  for (const c of cands) {
    const d = Math.abs(raw - c.v);
    if (d < bd) { bd = d; best = c; }
  }
  if (!best) return { pos: raw, guide: null };
  const d = raw - best.v, ad = Math.abs(d);
  if (ad <= WS_LOCK) return { pos: best.v, guide: best.g, locked: true };
  // resistance: displayed offset eases from 0 (at lock) to full (at pull edge)
  const f = (ad - WS_LOCK) / (WS_PULL - WS_LOCK);
  return { pos: best.v + d * f, guide: best.g, locked: false };
}

export interface SnapGuides { gx?: number; gy?: number; }
export interface SnapResult { x: number; y: number; guides: SnapGuides; }

/**
 * Magnetic position for a window of size (w,h) dragged to raw (x,y) on a stage
 * of size (SW,SH), against every other window's rect. Snap targets: the rail's
 * right edge, stage margins, and align/dock edges of the other windows.
 */
export function snapPos(
  x: number, y: number, w: number, h: number,
  SW: number, SH: number, others: Rect[]
): SnapResult {
  const xC: AxisCandidate[] = [
    { v: WS_RAIL, g: WS_RAIL },
    { v: SW - w - WS_MARGIN, g: SW - WS_MARGIN },
  ];
  const yC: AxisCandidate[] = [
    { v: WS_MARGIN, g: WS_MARGIN },
    { v: SH - h - WS_MARGIN, g: SH - WS_MARGIN },
  ];
  for (const o of others) {
    xC.push(
      { v: o.x, g: o.x }, { v: o.x + o.w - w, g: o.x + o.w },
      { v: o.x + o.w, g: o.x + o.w }, { v: o.x - w, g: o.x },
    );
    yC.push(
      { v: o.y, g: o.y }, { v: o.y + o.h - h, g: o.y + o.h },
      { v: o.y + o.h, g: o.y + o.h }, { v: o.y - h, g: o.y },
    );
  }
  const sx = softAxis(x, xC), sy = softAxis(y, yC);
  const guides: SnapGuides = {};
  if (sx.locked && sx.guide != null) guides.gx = sx.guide;
  if (sy.locked && sy.guide != null) guides.gy = sy.guide;
  // clamp only enough to keep the window reachable — overlap is allowed
  const bx = Math.max(WS_RAIL - 4, Math.min(sx.pos, SW - 44));
  const by = Math.max(8, Math.min(sy.pos, SH - 42));
  return { x: bx, y: by, guides };
}

export interface ResizeResult { w: number; h: number; guides: SnapGuides; }

/**
 * Resize-snap for view windows: the dragged right/bottom edges lock to other
 * windows' edges and the stage margin. Minimum size 220×150 (DESIGN-SPEC §2).
 */
export function snapResize(
  rawW: number, rawH: number, x: number, y: number,
  SW: number, SH: number, others: Rect[]
): ResizeResult {
  const rights = [SW - WS_MARGIN];
  const bottoms = [SH - WS_MARGIN];
  for (const o of others) {
    rights.push(o.x, o.x + o.w);
    bottoms.push(o.y, o.y + o.h);
  }
  let w = rawW, h = rawH;
  const guides: SnapGuides = {};
  let bd = WS_LOCK;
  for (const v of rights) {
    const d = Math.abs(x + rawW - v);
    if (d < bd) { bd = d; w = v - x; guides.gx = v; }
  }
  bd = WS_LOCK;
  for (const v of bottoms) {
    const d = Math.abs(y + rawH - v);
    if (d < bd) { bd = d; h = v - y; guides.gy = v; }
  }
  w = Math.max(220, Math.min(w, SW - x - 4));
  h = Math.max(150, Math.min(h, SH - y - 4));
  return { w: Math.round(w), h: Math.round(h), guides };
}

/**
 * First non-overlapping slot for a newly opened panel of estimated height
 * estH, packing into columns next to the rail; falls back to a cascade when
 * every column is full.
 */
export function freeSlot(
  estH: number, SW: number, SH: number, occupied: Rect[], nOpen: number
): { x: number; y: number } {
  const colW = PANEL_W + WS_GAP;
  for (let col = 0; col < 6; col++) {
    const x = WS_RAIL + col * colW;
    if (x + PANEL_W > SW - 4) break;
    const inCol = occupied.filter(o => Math.abs(o.x - x) < colW * 0.6);
    const bottom = inCol.length ? Math.max(...inCol.map(o => o.y + o.h)) + WS_GAP : WS_MARGIN;
    if (bottom + estH <= SH - WS_MARGIN) return { x, y: bottom };
  }
  return { x: WS_RAIL + (nOpen % 4) * 22, y: WS_MARGIN + (nOpen % 4) * 22 };
}

/**
 * The chain of windows docked below `id` (touching edges, x-overlap, ≤6px
 * tolerance), discovered by BFS down from the anchor's bottom edge. Used by
 * collapse/expand so a docked stack closes up / pushes out together.
 * `anchorBottom` is the anchor's CURRENT bottom edge (pre-collapse).
 */
export function dockedChainBelow(
  id: string, geo: Record<string, Rect>, anchorBottom: number
): string[] {
  const toMove = new Set<string>();
  const queue = [id];
  const bottomOf = (o: string) => (o === id ? anchorBottom : geo[o].y + geo[o].h);
  while (queue.length) {
    const cur = queue.shift()!;
    const cb = bottomOf(cur);
    const g0 = geo[cur];
    for (const o of Object.keys(geo)) {
      if (o === id || o === cur || toMove.has(o)) continue;
      const g = geo[o];
      const xOverlap = g.x < g0.x + g0.w && g.x + g.w > g0.x;
      if (xOverlap && Math.abs(g.y - cb) <= 6) { toMove.add(o); queue.push(o); }
    }
  }
  return [...toMove].sort((a, b) => geo[a].y - geo[b].y);
}

/**
 * Tidy auto-packing for "Everything"-style layouts: panels flow top-to-bottom
 * into columns by estimated height — no overlap, no tower.
 */
export function packColumns(
  ids: string[], est: (id: string) => number, maxH = 648
): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  const colW = PANEL_W + 6;
  let col = 0, y = 18, colH = 0;
  for (const id of ids) {
    const h = est(id) + 14;
    if (colH > 0 && colH + h > maxH) { col++; y = 18; colH = 0; }
    out[id] = { x: WS_RAIL + 6 + col * colW, y };
    y += h; colH += h;
  }
  return out;
}
