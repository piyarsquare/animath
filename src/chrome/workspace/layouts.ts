import { packColumns, WS_RAIL } from './geometry';
import type { LayoutDef, SectionDef, ViewDef, PersistedWorkspace, PanelState, ViewState } from './types';

export const DEFAULT_EST = 224;

/**
 * Dev-time lint for authored layouts: a panel rect with x < WS_RAIL opens
 * underneath the floating rail (the Trees-and-Nets `x:16` bug — nothing else
 * validates authored geometry). Returns warning strings; the workspace logs
 * them in dev like `validateActions` does for the action strip.
 */
export function validateLayouts(layouts: LayoutDef[]): string[] {
  const warnings: string[] = [];
  for (const l of layouts) {
    for (const id of Object.keys(l.open)) {
      const x = l.open[id].x;
      if (typeof x === 'number' && x < WS_RAIL) {
        warnings.push(
          `layout "${l.id}": panel "${id}" opens at x:${x}, under the rail band (x < ${WS_RAIL}) — it will be covered; use x ≥ ${WS_RAIL}`
        );
      }
    }
  }
  return warnings;
}

/**
 * Built-in layouts for an app: Compact (rail only) first, the app's own
 * layouts, then Everything (all panels, column-packed). DESIGN-SPEC §2.
 */
export function builtinLayouts(sections: SectionDef[], appLayouts: LayoutDef[] = []): LayoutDef[] {
  const ids = sections.map(s => s.id);
  const est = (id: string) => sections.find(s => s.id === id)?.estHeight ?? DEFAULT_EST;
  return [
    { id: 'compact', name: 'Compact', sub: 'Rail only — open as needed', icon: 'layers', open: {} },
    ...appLayouts,
    { id: 'everything', name: 'Everything', sub: `All ${ids.length} panels, tiled`, icon: 'grid', open: packColumns(ids, est) },
  ];
}

/** Assign stacking z to layout panels so controls open ABOVE view windows. */
export function stampZ(
  open: LayoutDef['open'], base: number
): Record<string, PanelState> {
  const out: Record<string, PanelState> = {};
  let z = base + 1;
  for (const k of Object.keys(open)) {
    out[k] = { ...open[k], z: z++ };
  }
  return out;
}

/** Materialize a layout's view states from the app's ViewDefs. */
export function layoutViews(views: ViewDef[], layout: LayoutDef): Record<string, ViewState> {
  const out: Record<string, ViewState> = {};
  views.forEach((v, i) => {
    const o = layout.views?.[v.id];
    out[v.id] = { ...v.defaultRect, ...(o ?? {}), z: i + 1, open: o?.open !== false };
  });
  return out;
}

/** Panel card width (must track theme.css .am-ws-panel). */
const PANEL_W = 268;
const STAGE_PAD = 8;

/**
 * Clamp authored geometry into the stage. Layouts are written against a
 * roomy reference viewport; on a shorter/narrower one an absolute-positioned
 * panel (or view) can extend past the stage edge into overflow:hidden space —
 * part of the panel becomes permanently unreachable (the Argand "Essentials
 * runs 136px below the fold" bug class). Pure; a null viewport is a no-op so
 * tests and SSR-ish callers can skip it.
 */
export function clampToViewport(
  state: PersistedWorkspace, sections: SectionDef[],
  viewport: { w: number; h: number } | null,
): PersistedWorkspace {
  if (!viewport) return state;
  const { w, h } = viewport;
  if (!(w > 200 && h > 200)) return state; // degenerate measurements: leave as authored
  const est = (id: string) => sections.find(s => s.id === id)?.estHeight ?? DEFAULT_EST;

  const open: typeof state.open = {};
  for (const id of Object.keys(state.open)) {
    const p = state.open[id];
    // Keep the whole card on-stage when it fits; a card taller than the stage
    // pins to the top (its body scrolls internally).
    const maxX = Math.max(WS_RAIL, w - PANEL_W - STAGE_PAD);
    const maxY = Math.max(STAGE_PAD, h - est(id) - STAGE_PAD);
    open[id] = { ...p, x: Math.min(Math.max(p.x, WS_RAIL), maxX), y: Math.min(Math.max(p.y, STAGE_PAD), maxY) };
  }

  const views: typeof state.views = {};
  for (const id of Object.keys(state.views)) {
    const v = state.views[id];
    const vw = Math.min(v.w, w - WS_RAIL - STAGE_PAD);
    const vh = Math.min(v.h, h - 2 * STAGE_PAD);
    const x = Math.min(Math.max(v.x, WS_RAIL), Math.max(WS_RAIL, w - vw - STAGE_PAD));
    const y = Math.min(Math.max(v.y, STAGE_PAD), Math.max(STAGE_PAD, h - vh - STAGE_PAD));
    views[id] = { ...v, x, y, w: vw, h: vh };
  }

  return { ...state, open, views };
}

/** Full workspace state for a layout (panels stamped above the views).
 *  Pass the stage `viewport` to clamp authored geometry on-screen. */
export function applyLayout(
  sections: SectionDef[], views: ViewDef[], layout: LayoutDef,
  saved: PersistedWorkspace['saved'],
  viewport: { w: number; h: number } | null = null,
): PersistedWorkspace {
  const known = new Set(sections.map(s => s.id));
  const open: LayoutDef['open'] = {};
  for (const id of Object.keys(layout.open)) {
    if (known.has(id)) open[id] = layout.open[id];
  }
  return clampToViewport({
    v: 1,
    layout: layout.id,
    open: stampZ(open, views.length),
    views: layoutViews(views, layout),
    saved,
  }, sections, viewport);
}

/** Validate persisted state against the app's current sections/views. */
export function sanitize(
  raw: unknown, sections: SectionDef[], views: ViewDef[]
): PersistedWorkspace | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as PersistedWorkspace;
  if (p.v !== 1 || typeof p.layout !== 'string' || !p.open || !p.views) return null;
  const knownPanels = new Set(sections.map(s => s.id));
  const open: Record<string, PanelState> = {};
  for (const id of Object.keys(p.open)) {
    if (knownPanels.has(id)) open[id] = p.open[id];
  }
  const out: Record<string, ViewState> = {};
  views.forEach((v, i) => {
    out[v.id] = p.views[v.id] ?? { ...v.defaultRect, z: i + 1, open: true };
  });
  return { v: 1, layout: p.layout, ...compactZ(open, out), saved: Array.isArray(p.saved) ? p.saved : [] };
}

/**
 * Renumber window z to 1..n, preserving stacking order across panels AND
 * views (they share one z space). Raise increments z without bound and the
 * values are persisted, so without compaction a well-used workspace's
 * windows eventually cross the fullscreen layer (LAYER.window + z ≥
 * LAYER.fullscreen) — the bug behind CHROME-REVIEW F5's nondeterminism.
 * Runs on every sanitize, so persisted z stays ≤ window count.
 */
export function compactZ(
  open: Record<string, PanelState>, views: Record<string, ViewState>
): { open: Record<string, PanelState>; views: Record<string, ViewState> } {
  const all = [
    ...Object.keys(open).map(k => ({ kind: 'open' as const, k, z: open[k].z ?? 0 })),
    ...Object.keys(views).map(k => ({ kind: 'views' as const, k, z: views[k].z ?? 0 })),
  ].sort((a, b) => a.z - b.z); // Array.sort is stable: ties keep insertion order
  const o = { ...open };
  const v = { ...views };
  let z = 1;
  for (const e of all) {
    if (e.kind === 'open') o[e.k] = { ...o[e.k], z: z++ };
    else v[e.k] = { ...v[e.k], z: z++ };
  }
  return { open: o, views: v };
}

/**
 * Raise one window (panel or view) to the top of the shared z order,
 * renumbering everyone 1..n so z stays bounded forever. No-op (same object)
 * when the window is already the unique top — pointerdown fires this on
 * every touch, and a no-op skips the localStorage write.
 */
export function raiseWindow(
  s: PersistedWorkspace, kind: 'open' | 'views', id: string
): PersistedWorkspace {
  const target = kind === 'open' ? s.open[id] : s.views[id];
  if (!target) return s;
  const zs = [
    ...Object.values(s.open).map(p => p.z ?? 0),
    ...Object.values(s.views).map(v => v.z ?? 0),
  ];
  const top = Math.max(0, ...zs);
  if ((target.z ?? 0) === top && zs.filter(z => z === top).length === 1) return s;
  const { open, views } = compactZ(
    kind === 'open' ? omit(s.open, id) : s.open,
    kind === 'views' ? omit(s.views, id) : s.views,
  );
  const topZ = Object.keys(open).length + Object.keys(views).length + 1;
  if (kind === 'open') open[id] = { ...s.open[id], z: topZ };
  else views[id] = { ...s.views[id], z: topZ };
  return { ...s, open, views };
}

function omit<T>(rec: Record<string, T>, id: string): Record<string, T> {
  const out = { ...rec };
  delete out[id];
  return out;
}
