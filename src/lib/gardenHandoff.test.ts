import { afterEach, describe, expect, it, vi } from 'vitest';
import { consumeGardenReturn, decodeGardenContext, encodeGardenContext, gardenExploreHref, noteGardenFunction, returnToGarden } from './gardenHandoff';
import { functionNames } from './complexMath';

afterEach(() => vi.unstubAllGlobals());

describe('garden exploration handoff', () => {
  it('also keeps a function-change notice for ordinary browser Back', () => {
    noteGardenFunction(functionNames.indexOf('sin'));
    expect(consumeGardenReturn()).toEqual({ changedFunction: true });
    expect(consumeGardenReturn()).toBeNull();
  });
  it('carries a square example and selected input through either full app', () => {
    for (const view of ['map', 'graph'] as const) {
      const hash = gardenExploreHref(view, [2, 1]);
      expect(hash).toContain('fn=square');
      expect(decodeGardenContext(hash)).toEqual({ point: [2, 1] });
      expect(encodeGardenContext(decodeGardenContext(hash))).toBe('&garden=graph&point=2,1');
    }
  });
  it('rejects missing, nonfinite, partial, oversized and unrelated context', () => {
    for (const hash of ['#/plane-transform', '?garden=graph', '?garden=graph&point=,1', '?garden=graph&point=1x,2', '?garden=graph&point=Infinity,1', '?garden=graph&point=101,0', '?garden=other&point=1,1']) {
      expect(decodeGardenContext(hash)).toBeNull();
    }
    expect(encodeGardenContext(null)).toBe('');
  });
  it('returns to graph passage and consumes its function notice only once', () => {
    const values = new Map<string, string>();
    const location = { hash: '' };
    vi.stubGlobal('window', { location, sessionStorage: {
      setItem: (key: string, value: string) => values.set(key, value),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
    } });
    returnToGarden(functionNames.indexOf('exp'));
    expect(location.hash).toBe('/garden?stop=graph');
    expect(consumeGardenReturn()).toEqual({ changedFunction: true });
    expect(consumeGardenReturn()).toBeNull();
    returnToGarden(functionNames.indexOf('square'));
    expect(consumeGardenReturn()).toEqual({ changedFunction: false });
  });
  it('keeps the return navigation usable when browser storage is disabled', () => {
    const location = { hash: '' };
    vi.stubGlobal('window', { location, sessionStorage: {
      setItem: () => { throw Error('disabled'); },
      getItem: () => { throw Error('disabled'); },
    } });
    returnToGarden(functionNames.indexOf('exp'));
    expect(location.hash).toBe('/garden?stop=graph');
    expect(consumeGardenReturn()).toEqual({ changedFunction: true });
  });
});
