import * as THREE from 'three';

export interface Character {
  group: THREE.Group;
  /** Swing the legs/arms; `phase` accumulates while moving. */
  stride: (phase: number) => void;
  dispose: () => void;
}

/**
 * A small stylized walker. Built facing +Z (forward) with +Y up and feet at
 * y=0, so callers can place it with a basis quaternion (forward, up) on the
 * floor. Bright + lightly emissive so it reads against any theme.
 */
export function makeCharacter(): Character {
  const group = new THREE.Group();
  const mats: THREE.Material[] = [];
  const geos: THREE.BufferGeometry[] = [];

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff9b3d, emissive: 0x7a3500, emissiveIntensity: 0.5, roughness: 0.5 });
  const limbMat = new THREE.MeshStandardMaterial({ color: 0x39435a, emissive: 0x101826, emissiveIntensity: 0.4, roughness: 0.6 });
  mats.push(bodyMat, limbMat);

  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    geos.push(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    group.add(m);
    return m;
  };

  // torso + head
  add(new THREE.CapsuleGeometry(0.22, 0.5, 4, 10), bodyMat, 0, 1.05, 0);
  add(new THREE.SphereGeometry(0.2, 16, 12), bodyMat, 0, 1.55, 0);
  // a little forward "nose" so heading is obvious
  add(new THREE.ConeGeometry(0.07, 0.18, 8), bodyMat, 0, 1.55, 0.2).rotation.x = Math.PI / 2;

  const legL = add(new THREE.CapsuleGeometry(0.09, 0.55, 4, 8), limbMat, -0.12, 0.4, 0);
  const legR = add(new THREE.CapsuleGeometry(0.09, 0.55, 4, 8), limbMat, 0.12, 0.4, 0);
  const armL = add(new THREE.CapsuleGeometry(0.07, 0.45, 4, 8), limbMat, -0.3, 1.05, 0);
  const armR = add(new THREE.CapsuleGeometry(0.07, 0.45, 4, 8), limbMat, 0.3, 1.05, 0);

  const stride = (phase: number) => {
    const s = Math.sin(phase);
    legL.rotation.x = s * 0.6;
    legR.rotation.x = -s * 0.6;
    armL.rotation.x = -s * 0.5;
    armR.rotation.x = s * 0.5;
  };

  const dispose = () => {
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
  };

  return { group, stride, dispose };
}
