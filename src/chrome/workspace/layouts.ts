import { packColumns } from './geometry';
import type { LayoutDef, SectionDef, ViewDef, PersistedWorkspace, PanelState, ViewState } from './types';

export const DEFAULT_EST = 224;

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

/** Full workspace state for a layout (panels stamped above the views). */
export function applyLayout(
  sections: SectionDef[], views: ViewDef[], layout: LayoutDef,
  saved: PersistedWorkspace['saved']
): PersistedWorkspace {
  const known = new Set(sections.map(s => s.id));
  const open: LayoutDef['open'] = {};
  for (const id of Object.keys(layout.open)) {
    if (known.has(id)) open[id] = layout.open[id];
  }
  return {
    v: 1,
    layout: layout.id,
    open: stampZ(open, views.length),
    views: layoutViews(views, layout),
    saved,
  };
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
  return { v: 1, layout: p.layout, open, views: out, saved: Array.isArray(p.saved) ? p.saved : [] };
}
