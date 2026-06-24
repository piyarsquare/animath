import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  COLORMAPS,
  discreteStops,
  gradientCss,
  mapStops,
  sampleStops,
  themeMapsFor,
} from '../colormapRegistry';

describe('themeMapsFor', () => {
  it('always resolves the discrete family to the theme token palette', () => {
    expect(themeMapsFor('discrete', 'dark')).toEqual(['discrete']);
    expect(themeMapsFor('discrete', 'no-such-theme')).toEqual(['discrete']);
  });

  it('returns the curated maps for a known theme + family (default first)', () => {
    expect(themeMapsFor('sequential', 'dark')).toEqual(['viridis', 'mako']);
    expect(themeMapsFor('divergent', 'neon')[0]).toBe('coolwarm');
    // the 3 new skins are curated too
    expect(themeMapsFor('sequential', 'mirage')).toEqual(['magma', 'mako']);
  });

  it('falls back to every map in the family when the theme is unknown', () => {
    const seq = themeMapsFor('sequential', 'no-such-theme');
    expect(seq).toEqual(Object.keys(COLORMAPS).filter(k => COLORMAPS[k].family === 'sequential'));
    expect(seq).toContain('viridis');
    expect(seq.length).toBeGreaterThan(2); // more than the curated pair
  });
});

describe('mapStops', () => {
  it('returns a known map’s stops', () => {
    expect(mapStops('viridis')).toBe(COLORMAPS.viridis.stops);
  });
  it('falls back to rdbu for an unknown id', () => {
    expect(mapStops('bogus')).toBe(COLORMAPS.rdbu.stops);
  });
});

describe('discreteStops (reads --data-1..7 live)', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('returns [] with no window (node / SSR)', () => {
    expect(discreteStops()).toEqual([]);
  });

  it('parses --data-1..7 from getComputedStyle (trims whitespace)', () => {
    const palette = ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666', '#777777'];
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', { documentElement: {} });
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: (k: string) => {
        const m = /^--data-(\d)$/.exec(k);
        return m ? `  ${palette[Number(m[1]) - 1]}  ` : '';
      },
    }));
    expect(discreteStops()).toEqual(palette);
    expect(mapStops('discrete')).toEqual(palette);
  });

  it('stops collecting at the first missing token', () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', { documentElement: {} });
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: (k: string) => (k === '--data-1' ? '#abcabc' : ''),
    }));
    // --data-2 empty ⇒ loop continues but only collects non-empty; result keeps #abcabc
    expect(discreteStops()).toEqual(['#abcabc']);
  });
});

describe('gradientCss & sampleStops', () => {
  it('builds a reversible CSS gradient', () => {
    const fwd = gradientCss('viridis');
    expect(fwd.startsWith('linear-gradient(90deg, ')).toBe(true);
    expect(fwd).toContain(COLORMAPS.viridis.stops[0]);
    const rev = gradientCss('viridis', true);
    const last = COLORMAPS.viridis.stops[COLORMAPS.viridis.stops.length - 1];
    const first = COLORMAPS.viridis.stops[0];
    expect(rev.indexOf(last)).toBeLessThan(rev.indexOf(first));
  });

  it('samples N discrete classes by nearest anchor', () => {
    expect(sampleStops('viridis', 1)).toEqual([COLORMAPS.viridis.stops[0]]);
    const five = sampleStops('viridis', 5);
    expect(five).toHaveLength(5);
    expect(five[0]).toBe(COLORMAPS.viridis.stops[0]);
    expect(five[4]).toBe(COLORMAPS.viridis.stops[COLORMAPS.viridis.stops.length - 1]);
  });
});
