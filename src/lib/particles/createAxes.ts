import * as THREE from 'three';
import { COMPLEX_PARTICLES_DEFAULTS } from '../../config/defaults';
import { Axis, AXIS_COLORS } from './types';

const AXIS_LENGTH = COMPLEX_PARTICLES_DEFAULTS.axisLength;

export { AXIS_LENGTH };

export function createAxes(
  scene: THREE.Scene,
  hueShift: number,
  axisWidth: number
): { x: Axis; y: Axis; u: Axis; v: Axis } {
  const makeLineMat = (hue: number) =>
    new THREE.LineBasicMaterial({
      color: new THREE.Color().setHSL((hue + hueShift) % 1, 1, 0.5),
      linewidth: axisWidth,
    });

  const makeAxis = (mat: THREE.LineBasicMaterial): Axis => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const line = new THREE.Line(g, mat);
    scene.add(line);
    return { line };
  };

  return {
    x: makeAxis(makeLineMat(AXIS_COLORS.x)),
    y: makeAxis(makeLineMat(AXIS_COLORS.y)),
    u: makeAxis(makeLineMat(AXIS_COLORS.u)),
    v: makeAxis(makeLineMat(AXIS_COLORS.v)),
  };
}
