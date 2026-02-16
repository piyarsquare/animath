import * as THREE from 'three';

export function createParticleGeometry(particleCount: number): THREE.BufferGeometry {
  const side = Math.sqrt(particleCount);
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount).fill(1);
  const seeds = new Float32Array(particleCount * 4);
  let i = 0;
  for (let ix = 0; ix < side; ix++) {
    for (let iz = 0; iz < side; iz++) {
      positions[3 * i] = (ix / side - 0.5) * 8;
      positions[3 * i + 1] = 0;
      positions[3 * i + 2] = (iz / side - 0.5) * 8;
      for (let k = 0; k < 4; k++) {
        seeds[4 * i + k] = Math.random();
      }
      i++;
    }
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));
  return geometry;
}

export function rebuildGeometryBuffers(geometry: THREE.BufferGeometry, particleCount: number): void {
  const side = Math.sqrt(particleCount);
  const pos = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount).fill(1);
  const seeds = new Float32Array(particleCount * 4);
  let i = 0;
  for (let ix = 0; ix < side; ix++) {
    for (let iz = 0; iz < side; iz++) {
      pos[3 * i] = (ix / side - 0.5) * 8;
      pos[3 * i + 1] = 0;
      pos[3 * i + 2] = (iz / side - 0.5) * 8;
      for (let k = 0; k < 4; k++) {
        seeds[4 * i + k] = Math.random();
      }
      i++;
    }
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));
  geometry.setDrawRange(0, particleCount);
}
