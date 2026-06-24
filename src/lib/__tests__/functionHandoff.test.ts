import { describe, it, expect } from 'vitest';
import { encodeFunction, decodeFunction, type FunctionState } from '../functionHandoff';
import { functionNames, POW_PQ_INDEX, QUADRATIC_INDEX } from '../complexMath';

/** Round-trip helper: encode to a query, then decode it back (with a path prefix
 *  to mimic a real hash like '#/plane-transform?…'). */
const round = (s: FunctionState) => decodeFunction('#/plane-transform?' + encodeFunction(s));

describe('functionHandoff codec', () => {
  it('round-trips a plain named function', () => {
    const index = functionNames.indexOf('exp');
    expect(round({ index })).toEqual({ index });
  });

  it('round-trips every named function by index', () => {
    // The whole point: the handoff must carry any function the picker offers.
    for (let index = 0; index < functionNames.length; index++) {
      expect(round({ index }).index).toBe(index);
    }
  });

  it('round-trips z^(p/q) with p and q', () => {
    const s: FunctionState = { index: POW_PQ_INDEX, p: 3, q: 2 };
    expect(round(s)).toEqual({ index: POW_PQ_INDEX, p: 3, q: 2 });
  });

  it('round-trips the quadratic coefficients a, b, c', () => {
    const s: FunctionState = { index: QUADRATIC_INDEX, quad: { a: [1, -2], b: [0, 0.5], c: [-3, 0] } };
    expect(round(s)).toEqual(s);
  });

  it('encodes a function as its name, not its raw index', () => {
    const index = functionNames.indexOf('sin');
    expect(encodeFunction({ index })).toBe('fn=sin');
  });

  it('decodes nothing from a query with no fn, or an unknown fn', () => {
    expect(decodeFunction('#/complex-particles')).toEqual({});
    expect(decodeFunction('?fn=definitely-not-a-function')).toEqual({});
    expect(decodeFunction('')).toEqual({});
  });

  it('ignores garbled p/q and coefficient values rather than throwing', () => {
    expect(decodeFunction('?fn=powPQ&p=abc')).toEqual({ index: POW_PQ_INDEX });
    expect(decodeFunction('?fn=quadratic&a=1,2&b=oops&c=0,0')).toEqual({ index: QUADRATIC_INDEX });
  });
});
