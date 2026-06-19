import { describe, expect, it } from 'vitest';
import {
  analyzeSolid, pairingDet, reflect, rot, mulM3, detM3, transposeM3, I3, M3,
} from '../solidSchema';
import { SOLID_WORLDS, worldById } from '../worlds';

/** The holonomy of walking a single loop = the product of the crossed pairings'
 *  linear parts (forward = the linear part, backward = its transpose), composed
 *  in walked order — the pure-math half of the chirality acceptance test. */
function loopLinear(steps: M3[]): M3 {
  return steps.reduce((acc, m) => mulM3(m, acc), I3);
}

describe('solidSchema — orientability is decided by the pairing determinants', () => {
  it('the orientable worlds have all proper pairings, the amphicosm does not', () => {
    expect(analyzeSolid(worldById('3-torus')).orientable).toBe(true);
    expect(analyzeSolid(worldById('half-turn')).orientable).toBe(true);
    expect(analyzeSolid(worldById('quarter-turn')).orientable).toBe(true);
    expect(analyzeSolid(worldById('amphicosm')).orientable).toBe(false);
  });

  it('the amphicosm reverses orientation only on the x-pairing', () => {
    const a = analyzeSolid(worldById('amphicosm'));
    expect(a.reversingAxes).toEqual(['x']);
    expect(a.perAxis.find((p) => p.axis === 'x')!.kind).toBe('glide-reflection');
    expect(a.perAxis.find((p) => p.axis === 'y')!.kind).toBe('translation');
  });

  it('every curated catalog world is internally consistent', () => {
    for (const w of SOLID_WORLDS) {
      expect(w.pairings).toHaveLength(3);
      const a = analyzeSolid(w);
      // orientable ⟺ no reversing pairing
      expect(a.orientable).toBe(a.reversingAxes.length === 0);
    }
  });
});

describe('solidSchema — loop holonomy (the chirality acceptance test)', () => {
  const amphiX = worldById('amphicosm').pairings.find((p) => p.axis === 'x')!.linear;

  it('the 3-torus flips on no axis', () => {
    for (const p of worldById('3-torus').pairings) expect(pairingDet(p)).toBe(1);
  });

  it('one x-loop in the amphicosm reverses orientation; two restore it', () => {
    expect(detM3(loopLinear([amphiX]))).toBeLessThan(0);          // mirrored
    expect(detM3(loopLinear([amphiX, amphiX]))).toBeCloseTo(1);   // restored
  });

  it('the y- and z-loops in the amphicosm never flip', () => {
    const { pairings } = worldById('amphicosm');
    expect(pairingDet(pairings.find((p) => p.axis === 'y')!)).toBe(1);
    expect(pairingDet(pairings.find((p) => p.axis === 'z')!)).toBe(1);
  });

  it('the quarter-turn z-loop is a proper 90° rotation, order 4', () => {
    const q = worldById('quarter-turn').pairings.find((p) => p.axis === 'z')!.linear;
    expect(detM3(q)).toBeCloseTo(1);                              // orientation-preserving
    const four = loopLinear([q, q, q, q]);
    four.forEach((v, i) => expect(v).toBeCloseTo(I3[i]));         // four laps = identity
    // two laps ≠ identity (a genuine 180° rotation, not trivial)
    expect(loopLinear([q, q])[0]).toBeCloseTo(-1);
  });
});

describe('solidSchema — matrix helpers', () => {
  it('rot is a proper rotation; reflect is an improper one', () => {
    expect(detM3(rot('z', 90))).toBeCloseTo(1);
    expect(detM3(reflect('y'))).toBeCloseTo(-1);
  });

  it('an orthogonal matrix times its transpose is the identity', () => {
    const m = rot('z', 90);
    mulM3(m, transposeM3(m)).forEach((v, i) => expect(v).toBeCloseTo(I3[i]));
  });
});
