export type StandardCurveName =
  | 'circle'
  | 'square'
  | 'horizontal'
  | 'vertical'
  | 'diagonal'
  | 'spiral'
  | 'lemniscate'
  | 'cross'
  | 'cardioid';

/** Picker order + labels for the Curves panel's standard-curve buttons. */
export const STANDARD_CURVES: { id: StandardCurveName; label: string }[] = [
  { id: 'circle',     label: 'Circle' },
  { id: 'square',     label: 'Square' },
  { id: 'horizontal', label: 'X-axis' },
  { id: 'vertical',   label: 'Y-axis' },
  { id: 'diagonal',   label: 'Diag' },
  { id: 'cross',      label: 'Cross' },
  { id: 'spiral',     label: 'Spiral' },
  { id: 'lemniscate', label: '∞' },
  { id: 'cardioid',   label: 'Heart' },
];

export type CurvePoint = [number, number];

/** Build one of the named stock curves at a scale appropriate for the
 *  current viewExtent. All curves are sampled densely enough that even highly
 *  warping functions render smooth output polylines (gamma, 1/z, etc.). */
export function buildStandardCurve(id: StandardCurveName, viewExtent: number): CurvePoint[] {
  const r = viewExtent * 0.6;
  const pts: CurvePoint[] = [];

  switch (id) {
    case 'circle': {
      const N = 256;
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * Math.PI * 2;
        pts.push([r * Math.cos(t), r * Math.sin(t)]);
      }
      return pts;
    }
    case 'square': {
      const side = r;
      const perEdge = 64;
      const corners: CurvePoint[] = [
        [-side, -side], [ side, -side], [ side,  side], [-side,  side], [-side, -side],
      ];
      for (let e = 0; e < 4; e++) {
        const [x0, y0] = corners[e];
        const [x1, y1] = corners[e + 1];
        for (let i = 0; i < perEdge; i++) {
          const a = i / perEdge;
          pts.push([x0 + (x1 - x0) * a, y0 + (y1 - y0) * a]);
        }
      }
      pts.push(corners[0]);
      return pts;
    }
    case 'horizontal': {
      const N = 256;
      const span = viewExtent * 0.95;
      for (let i = 0; i <= N; i++) {
        pts.push([-span + (2 * span) * (i / N), 0]);
      }
      return pts;
    }
    case 'vertical': {
      const N = 256;
      const span = viewExtent * 0.95;
      for (let i = 0; i <= N; i++) {
        pts.push([0, -span + (2 * span) * (i / N)]);
      }
      return pts;
    }
    case 'diagonal': {
      const N = 256;
      const span = viewExtent * 0.7;
      for (let i = 0; i <= N; i++) {
        const a = -span + (2 * span) * (i / N);
        pts.push([a, a]);
      }
      return pts;
    }
    case 'cross': {
      // Two perpendicular line segments through the origin, joined by an
      // invisible jump — we lift the pen by leaving the segments as one
      // continuous polyline that revisits the origin in the middle.
      const N = 128;
      const span = viewExtent * 0.85;
      for (let i = 0; i <= N; i++) pts.push([-span + (2 * span) * (i / N), 0]);
      for (let i = 0; i <= N; i++) pts.push([0, -span + (2 * span) * (i / N)]);
      return pts;
    }
    case 'spiral': {
      const N = 600;
      const turns = 4;
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * turns * Math.PI * 2;
        const rad = (i / N) * r;
        pts.push([rad * Math.cos(t), rad * Math.sin(t)]);
      }
      return pts;
    }
    case 'lemniscate': {
      // Bernoulli lemniscate: r² = a² cos(2θ), traced symmetrically.
      const N = 400;
      const a = r;
      for (let i = 0; i <= N; i++) {
        const t = -Math.PI / 2 + (i / N) * Math.PI;
        const c = Math.cos(2 * t);
        if (c < 0) continue;
        const rad = a * Math.sqrt(c);
        pts.push([rad * Math.cos(t), rad * Math.sin(t)]);
      }
      // Other lobe.
      for (let i = N; i >= 0; i--) {
        const t = Math.PI / 2 + (i / N) * Math.PI;
        const c = Math.cos(2 * t);
        if (c < 0) continue;
        const rad = a * Math.sqrt(c);
        pts.push([rad * Math.cos(t), rad * Math.sin(t)]);
      }
      return pts;
    }
    case 'cardioid': {
      const N = 400;
      const a = r * 0.5;
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * Math.PI * 2;
        const rad = a * (1 - Math.cos(t));
        pts.push([rad * Math.cos(t), rad * Math.sin(t)]);
      }
      return pts;
    }
  }
  return pts;
}
