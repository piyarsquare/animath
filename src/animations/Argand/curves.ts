/**
 * Preset curves for the Argand "curve" subject — the step from transforming a
 * single number to transforming a whole shape. Each is a base polyline centered
 * near the origin (math units); the app translates it by the draggable position
 * `a` and then multiplies/adds the constant `b`, so you watch an entire figure
 * rotate-and-scale or slide. An asymmetric "flag" makes rotation and handedness
 * obvious; the circle and square show how multiplication bends lines into curves
 * only when the map is nonlinear (here it stays a similarity, so they're rigid).
 */
import { type Cx, cx } from './complexOps';

export type CurveName = 'circle' | 'segment' | 'square' | 'flag';

export const CURVES: { id: CurveName; label: string }[] = [
  { id: 'flag', label: 'Flag' },
  { id: 'circle', label: 'Circle' },
  { id: 'square', label: 'Square' },
  { id: 'segment', label: 'Segment' },
];

export function buildCurve(name: CurveName): Cx[] {
  switch (name) {
    case 'circle': {
      const pts: Cx[] = [];
      const n = 64;
      for (let i = 0; i <= n; i++) {
        const th = (i / n) * Math.PI * 2;
        pts.push(cx(0.6 * Math.cos(th), 0.6 * Math.sin(th)));
      }
      return pts;
    }
    case 'segment':
      return [cx(-0.7, 0), cx(0.7, 0)];
    case 'square':
      return [cx(-0.5, -0.5), cx(0.5, -0.5), cx(0.5, 0.5), cx(-0.5, 0.5), cx(-0.5, -0.5)];
    case 'flag':
    default:
      // pole + an asymmetric pennant, so rotation and reflection are legible
      return [cx(-0.1, -0.6), cx(-0.1, 0.6), cx(0.5, 0.45), cx(-0.1, 0.3)];
  }
}
