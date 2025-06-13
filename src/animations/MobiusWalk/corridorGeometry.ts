import * as THREE from 'three';

/** Parameters that make the hall "feel" endless without revealing the twist. */
export interface CorridorParams {
  radius: number;       // radius of centreline circle
  width: number;        // corridor half-width
  height: number;       // corridor half-height
  segments: number;     // longitudinal segments (>= 500 looks smooth)
  tiltTurns: number;    // half-twists: 1 → Möbius, 2 → double twist …
}

export const DEFAULT_PARAMS: CorridorParams = {
  radius: 20,
  width : 1.5,
  height: 2.5,
  segments: 800,
  tiltTurns: 1          // single half-twist
};

/** Returns a BufferGeometry whose *inside* face points inward. */
export function makeCorridorGeometry(
  p: CorridorParams = DEFAULT_PARAMS
): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const verts: number[] = [];
  const norms: number[] = [];
  const uvs  : number[] = [];

  for (let i = 0; i <= p.segments; i++) {
    const t  = i / p.segments;        // [0,1]
    const φ  = 2 * Math.PI * t;       // angle along ring
    const τ  = Math.PI * p.tiltTurns * t; // twist

    // Centreline point in world space (circle in XY-plane).
    const cx = p.radius * Math.cos(φ);
    const cy = p.radius * Math.sin(φ);
    const cz = 0;

    // Tangent, normal, binormal (Frenet frame on circle).
    const tangent   = new THREE.Vector3(-Math.sin(φ),  Math.cos(φ), 0).normalize();
    const normalRef = new THREE.Vector3(-Math.cos(φ), -Math.sin(φ), 0).normalize(); // points outward
    const binormal  = new THREE.Vector3(0, 0, 1);                                   // Z-up

    // Rotate cross-section by τ around tangent -> gives Möbius twist.
    const qTwist = new THREE.Quaternion().setFromAxisAngle(tangent, τ);
    const n = normalRef.clone().applyQuaternion(qTwist);
    const b = binormal .clone().applyQuaternion(qTwist);

    // Four vertices per ring segment:  ⎡+w,+h⎤ ⎡+w,‑h⎤ ⎡‑w,+h⎤ ⎡‑w,‑h⎤
    const offsets: [number, number][] = [
      [ p.width,  p.height],
      [ p.width, -p.height],
      [-p.width,  p.height],
      [-p.width, -p.height]
    ];

    for (const [u, v] of offsets) {
      const pos = new THREE.Vector3(cx, cy, cz)
        .addScaledVector(n, u)
        .addScaledVector(b, v);
      verts.push(pos.x, pos.y, pos.z);
      norms.push(-n.x, -n.y, -n.z); // inside normals
      uvs  .push(t, (v > 0 ? 1 : 0));
    }
  }

  const indices: number[] = [];
  const ringVerts = 4;
  for (let i = 0; i < p.segments; i++) {
    const a = i * ringVerts;
    const b = (i + 1) * ringVerts;
    // connect corresponding quad strips (two triangles each)
    for (let j = 0; j < ringVerts; j += 2) {
      const jn = j ^ 1; // 0↔→1, 2↔→3
      indices.push(a + j,   b + j,   b + jn);
      indices.push(a + j,   b + jn,  a + jn);
    }
  }

  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('normal'  , new THREE.Float32BufferAttribute(norms, 3));
  g.setAttribute('uv'      , new THREE.Float32BufferAttribute(uvs , 2));
  g.setIndex(indices);
  g.computeBoundingSphere();
  return g;
}

/** Maps (t∈[0,1], u, v) → world position & quaternion for orienting child meshes. */
export function paramToFrame(
  t: number,
  u: number,
  v: number,
  p: CorridorParams = DEFAULT_PARAMS
): { position: THREE.Vector3; quaternion: THREE.Quaternion } {
  const φ  = 2 * Math.PI * t;
  const τ  = Math.PI * p.tiltTurns * t;

  const cx = p.radius * Math.cos(φ);
  const cy = p.radius * Math.sin(φ);
  const tangent   = new THREE.Vector3(-Math.sin(φ),  Math.cos(φ), 0).normalize();
  const normalRef = new THREE.Vector3(-Math.cos(φ), -Math.sin(φ), 0).normalize();
  const binormal  = new THREE.Vector3(0, 0, 1);

  const qTwist = new THREE.Quaternion().setFromAxisAngle(tangent, τ);
  const n = normalRef.applyQuaternion(qTwist);
  const b = binormal .applyQuaternion(qTwist);

  const pos = new THREE.Vector3(cx, cy, 0)
    .addScaledVector(n, u)
    .addScaledVector(b, v);

  // Build quaternion whose Z-axis is –n (points inward) and Y-axis is b.
  const m = new THREE.Matrix4().makeBasis(
    tangent.clone().negate(), // X-axis
    b,                        // Y-axis
    n.clone().negate()        // Z-axis
  );
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  return { position: pos, quaternion: q };
}
