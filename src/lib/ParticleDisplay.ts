import * as THREE from 'three';

export interface ParticleDisplayOptions {
  /** Number of particles along one axis. Total count = density*density */
  density?: number;
  /** Material to render the particles with. Defaults to a simple PointsMaterial */
  material?: THREE.PointsMaterial;
  /** Opacity of the material. Transparency enabled if < 1 */
  opacity?: number;
  /** Random jitter added to each particle position */
  jitter?: number;
  /** Size of the area for the particle grid */
  areaSize?: number;
}

/**
 * Helper class for displaying particles with configurable material,
 * density, opacity and positional jitter.
 */
export class ParticleDisplay {
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  particles: THREE.Points;

  constructor(options: ParticleDisplayOptions = {}) {
    const {
      density = 100,
      material,
      opacity = 1,
      jitter = 0,
      areaSize = 4
    } = options;

    const count = density * density;
    const positions = new Float32Array(count * 3);
    let i = 0;
    for (let ix = 0; ix < density; ix++) {
      for (let iz = 0; iz < density; iz++) {
        const baseX = (ix / density - 0.5) * areaSize;
        const baseZ = (iz / density - 0.5) * areaSize;
        positions[3 * i] = baseX + (Math.random() - 0.5) * jitter;
        positions[3 * i + 1] = 0;
        positions[3 * i + 2] = baseZ + (Math.random() - 0.5) * jitter;
        i++;
      }
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.material =
      material || new THREE.PointsMaterial({ size: 0.1, opacity, transparent: opacity < 1 });
    this.material.opacity = opacity;
    this.material.transparent = opacity < 1;

    this.particles = new THREE.Points(this.geometry, this.material);
  }

  setMaterial(mat: THREE.PointsMaterial) {
    this.material = mat;
    this.particles.material = mat;
  }

  setOpacity(op: number) {
    this.material.opacity = op;
    this.material.transparent = op < 1;
  }

  /** Randomly perturb existing particle positions */
  applyJitter(amount: number) {
    const pos = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * amount);
      pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * amount);
    }
    pos.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
