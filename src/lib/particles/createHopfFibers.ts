import * as THREE from 'three';
import { project, ProjectionMode } from '../viewpoint';

// Hopf fiber-trace overlay for the Torus (S³) view. The particle cloud is the
// graph of f — a 2-D surface — so it never shows the fibers themselves. Here we
// instead sample base points on S² and draw each one's *whole* Hopf circle
//   θ ↦ stereo( normalize( e^{iθ}·(z1, z2) ) ),  θ ∈ [0, 2π)
// which is exactly the U(1) common-phase orbit the Hopf map collapses to a point.
// A base point is (η, ψ): η = latitude (|z1|=cos η, |z2|=sin η → which donut),
// ψ = longitude (arg z1 − arg z2). Setting ξ1 = θ+ψ/2, ξ2 = θ−ψ/2 sweeps the
// fiber. Drawn as LineLoops in the same normalized stereographic chart + SCALE
// as the particles and the reference scaffold, so they register exactly.

const SCALE = 1.5;

/** Latitudes (η) of the nested donuts the fibers wind around. */
const ETAS = [25, 40, 55, 70].map(d => (d * Math.PI) / 180);

export interface HopfFibers {
  group: THREE.Group;
  dispose: () => void;
}

/** Build the fiber overlay: `longitudes` fibers per latitude, each a closed
 *  Villarceau-style circle, coloured by base point (hue ← longitude, lightness
 *  ← latitude). */
export function createHopfFibers(scene: THREE.Scene, longitudes = 12): HopfFibers {
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const segs = 180;

  ETAS.forEach((eta, ei) => {
    const cE = Math.cos(eta);
    const sE = Math.sin(eta);
    for (let j = 0; j < longitudes; j++) {
      const psi = (j / longitudes) * Math.PI * 2;
      const pts = new Float32Array((segs + 1) * 3);
      for (let s = 0; s <= segs; s++) {
        const theta = (s / segs) * Math.PI * 2;
        const xi1 = theta + psi / 2;
        const xi2 = theta - psi / 2;
        const p4 = new THREE.Vector4(
          cE * Math.cos(xi1), cE * Math.sin(xi1),
          sE * Math.cos(xi2), sE * Math.sin(xi2),
        );
        const v = project(p4, ProjectionMode.Torus).multiplyScalar(SCALE);
        pts[3 * s] = v.x;
        pts[3 * s + 1] = v.y;
        pts[3 * s + 2] = v.z;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
      const col = new THREE.Color().setHSL(psi / (Math.PI * 2), 0.7, 0.4 + 0.1 * ei);
      const m = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.5, depthWrite: false });
      group.add(new THREE.LineLoop(g, m));
      disposables.push(g, m);
    }
  });

  scene.add(group);
  return {
    group,
    dispose: () => {
      scene.remove(group);
      disposables.forEach(d => d.dispose());
    },
  };
}
