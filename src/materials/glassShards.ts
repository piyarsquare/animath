import * as THREE from 'three';

export function createShardGeometry(): THREE.BufferGeometry {
  const geom = new THREE.TetrahedronGeometry(1);
  geom.scale(0.03, 0.03, 0.1);
  geom.computeVertexNormals();
  return geom;
}

export function createGlassMaterial(envMap?: THREE.Texture): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0,
    transmission: 1,
    thickness: 0.2,
    envMap,
    envMapIntensity: 1,
    transparent: true,
    opacity: 0.8
  });
}
