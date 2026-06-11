import { describe, expect, it } from 'vitest';
import { applyLayout, compactZ, raiseWindow, sanitize, validateLayouts } from '../layouts';
import { WS_RAIL } from '../geometry';
import type { LayoutDef, PersistedWorkspace, SectionDef, ViewDef } from '../types';

/* Minimal fixtures — node bodies are irrelevant to the pure layout math. */
const sections: SectionDef[] = [
  { id: 'function', title: 'Function', arch: 'subject', node: null },
  { id: 'playback', title: 'Playback', arch: 'playback', node: null },
];
const views: ViewDef[] = [
  { id: 'plot', title: 'Plot', node: null, defaultRect: { x: 360, y: 16, w: 400, h: 300 } },
  { id: 'aux', title: 'Aux', node: null, defaultRect: { x: 780, y: 16, w: 300, h: 300 } },
];

const ws = (over: Partial<PersistedWorkspace> = {}): PersistedWorkspace => ({
  v: 1,
  layout: 'custom',
  open: { function: { x: 84, y: 18, z: 3 }, playback: { x: 84, y: 330, z: 4 } },
  views: { plot: { x: 360, y: 16, w: 400, h: 300, z: 1 }, aux: { x: 780, y: 16, w: 300, h: 300, z: 2 } },
  saved: [],
  ...over,
});

describe('validateLayouts — authored panels must clear the rail band', () => {
  const layout = (open: LayoutDef['open']): LayoutDef =>
    ({ id: 'essentials', name: 'Essentials', icon: 'layers', open });

  it('flags a panel authored under the rail (the Trees-and-Nets x:16 bug)', () => {
    const warnings = validateLayouts([layout({ function: { x: 16, y: 18 } })]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('"function"');
    expect(warnings[0]).toContain('x:16');
  });

  it('accepts panels at or beyond the rail clearance', () => {
    expect(validateLayouts([layout({ function: { x: WS_RAIL, y: 18 }, playback: { x: 400, y: 18 } })])).toEqual([]);
  });
});

describe('sanitize', () => {
  it('rejects malformed payloads', () => {
    expect(sanitize(null, sections, views)).toBeNull();
    expect(sanitize('junk', sections, views)).toBeNull();
    expect(sanitize({ v: 2, layout: 'x', open: {}, views: {} }, sections, views)).toBeNull();
    expect(sanitize({ v: 1, layout: 'x' }, sections, views)).toBeNull();
  });

  it('drops panels the app no longer declares', () => {
    const out = sanitize(ws({ open: { gone: { x: 1, y: 2, z: 1 }, playback: { x: 3, y: 4, z: 2 } } }), sections, views)!;
    expect(Object.keys(out.open)).toEqual(['playback']);
  });

  it('fills missing views from their defaultRect', () => {
    const raw = ws();
    delete (raw.views as Record<string, unknown>).aux;
    const out = sanitize(raw, sections, views)!;
    expect(out.views.aux).toMatchObject({ x: 780, y: 16, w: 300, h: 300, open: true });
  });

  it('compacts runaway persisted z (the F5 fullscreen-crossing bug)', () => {
    const raw = ws({
      open: { function: { x: 0, y: 0, z: 7041 }, playback: { x: 0, y: 0, z: 6900 } },
      views: { plot: { x: 0, y: 0, w: 1, h: 1, z: 6899 }, aux: { x: 0, y: 0, w: 1, h: 1, z: 7000 } },
    });
    const out = sanitize(raw, sections, views)!;
    // ascending source z: plot 6899 < playback 6900 < aux 7000 < function 7041
    expect(out.views.plot.z).toBe(1);
    expect(out.open.playback.z).toBe(2);
    expect(out.views.aux.z).toBe(3);
    expect(out.open.function.z).toBe(4);
  });
});

describe('compactZ', () => {
  it('renumbers 1..n across panels AND views, preserving order', () => {
    const { open, views: v } = compactZ(
      { a: { x: 0, y: 0, z: 50 }, b: { x: 0, y: 0, z: 10 } },
      { p: { x: 0, y: 0, w: 1, h: 1, z: 30 } },
    );
    expect(open.b.z).toBe(1);
    expect(v.p.z).toBe(2);
    expect(open.a.z).toBe(3);
  });

  it('keeps insertion order for missing/tied z', () => {
    const { open } = compactZ(
      { a: { x: 0, y: 0 }, b: { x: 0, y: 0 } },
      {},
    );
    expect(open.a.z).toBe(1);
    expect(open.b.z).toBe(2);
  });
});

describe('raiseWindow', () => {
  it('raises a panel to the top with compact z', () => {
    const out = raiseWindow(ws(), 'open', 'function');
    expect(out.open.function.z).toBe(4);
    const rest = [out.views.plot.z, out.views.aux.z, out.open.playback.z].sort();
    expect(rest).toEqual([1, 2, 3]);
  });

  it('raises a view above panels', () => {
    const out = raiseWindow(ws(), 'views', 'plot');
    expect(out.views.plot.z).toBe(4);
  });

  it('is a no-op (same object) when already the unique top', () => {
    const s = ws();
    expect(raiseWindow(s, 'open', 'playback')).toBe(s);
  });

  it('ignores unknown ids', () => {
    const s = ws();
    expect(raiseWindow(s, 'open', 'nope')).toBe(s);
  });

  it('stays bounded under repeated raises', () => {
    let s = ws();
    for (let i = 0; i < 500; i++) s = raiseWindow(s, 'open', i % 2 ? 'function' : 'playback');
    const top = Math.max(
      ...Object.values(s.open).map(p => p.z ?? 0),
      ...Object.values(s.views).map(v => v.z ?? 0),
    );
    expect(top).toBe(4); // never creeps toward the fullscreen layer
  });
});

describe('applyLayout', () => {
  it('stamps panels above views and respects views[id].open=false', () => {
    const out = applyLayout(sections, views, {
      id: 'l', name: 'L',
      open: { playback: { x: 10, y: 20 } },
      views: { aux: { open: false } },
    }, []);
    expect(out.open.playback.z).toBeGreaterThan(out.views.plot.z!);
    expect(out.views.aux.open).toBe(false);
    expect(out.views.plot.open).toBe(true);
    expect(Object.keys(out.open)).toEqual(['playback']); // unknown panels dropped
  });
});
