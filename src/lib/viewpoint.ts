import * as THREE from 'three';

export function rotXY(v: THREE.Vector4, a: number): THREE.Vector4 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return new THREE.Vector4(c * v.x - s * v.y, s * v.x + c * v.y, v.z, v.w);
}

export function rotYZ(v: THREE.Vector4, a: number): THREE.Vector4 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return new THREE.Vector4(v.x, c * v.y - s * v.z, s * v.y + c * v.z, v.w);
}

export function rotXW(v: THREE.Vector4, a: number): THREE.Vector4 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return new THREE.Vector4(c * v.x + s * v.w, v.y, v.z, -s * v.x + c * v.w);
}

/**
 * Project a 4D point to 3D by applying time-based rotations and
 * perspective division. When `realOnly` is true the y coordinate is
 * ignored to highlight the real plane.
 */
export function project4D(
  v: THREE.Vector4,
  t: number,
  realOnly = false
): THREE.Vector3 {
  let r = rotXY(v, t * 0.5);
  r = rotYZ(r, t * 0.7);
  r = rotXW(r, t);
  if (realOnly) {
    return new THREE.Vector3(r.x, r.z, r.w).multiplyScalar(0.5);
  }
  const w = 3 + r.w;
  return new THREE.Vector3(r.x, r.y, r.z).multiplyScalar(1.5 / w);
}
