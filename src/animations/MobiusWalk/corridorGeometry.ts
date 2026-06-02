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

/**
 * A closed, rectangular-section tube that follows the twisting centreline — an
 * enclosed corridor (ceiling, both walls, floor) rather than two loose panels.
 * After one lap the cross-section has rotated by π·tiltTurns, so the floor and
 * ceiling have swapped: a Möbius corridor.
 */
export function makeCorridorGeometry(
  p: CorridorParams = DEFAULT_PARAMS
): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const verts: number[] = [];
  const uvs: number[] = [];

  // Cross-section perimeter corners (n, b), walked around the rectangle.
  const corners: [number, number][] = [
    [ p.width,  p.height],  // 0: ceiling-right
    [-p.width,  p.height],  // 1: ceiling-left
    [-p.width, -p.height],  // 2: floor-left
    [ p.width, -p.height],  // 3: floor-right
  ];
  const ring = corners.length;

  for (let i = 0; i <= p.segments; i++) {
    const t = i / p.segments;
    const { center, n, b } = frameAt(t, p);
    corners.forEach(([u, v], k) => {
      const pos = center.clone().addScaledVector(n, u).addScaledVector(b, v);
      verts.push(pos.x, pos.y, pos.z);
      uvs.push(t * p.radius, k / ring);
    });
  }

  const indices: number[] = [];
  for (let i = 0; i < p.segments; i++) {
    const a = i * ring;
    const c = (i + 1) * ring;
    for (let k = 0; k < ring; k++) {
      const k1 = (k + 1) % ring;
      indices.push(a + k, c + k, c + k1);
      indices.push(a + k, c + k1, a + k1);
    }
  }

  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/** Frenet-style frame on the (twisting) corridor centreline at parameter t. */
export interface CorridorFrame {
  center: THREE.Vector3;   // point on the centreline
  tangent: THREE.Vector3;  // direction of travel (increasing t)
  n: THREE.Vector3;        // cross-section "horizontal" axis (twists)
  b: THREE.Vector3;        // cross-section "up" axis (twists)
}

/** The twisting frame at t ∈ [0,1]. Going once around, n and b rotate by
 *  π·tiltTurns — that half-turn is what makes the corridor a Möbius strip. */
export function frameAt(t: number, p: CorridorParams = DEFAULT_PARAMS): CorridorFrame {
  const φ = 2 * Math.PI * t;
  const τ = Math.PI * p.tiltTurns * t;

  const center = new THREE.Vector3(p.radius * Math.cos(φ), p.radius * Math.sin(φ), 0);
  const tangent = new THREE.Vector3(-Math.sin(φ), Math.cos(φ), 0).normalize();
  const normalRef = new THREE.Vector3(-Math.cos(φ), -Math.sin(φ), 0).normalize(); // outward
  const binormal = new THREE.Vector3(0, 0, 1);                                    // Z-up

  const qTwist = new THREE.Quaternion().setFromAxisAngle(tangent, τ);
  const n = normalRef.applyQuaternion(qTwist);
  const b = binormal.applyQuaternion(qTwist);
  return { center, tangent, n, b };
}

/** Maps (t∈[0,1], u, v) → world position & quaternion for orienting child meshes. */
export function paramToFrame(
  t: number,
  u: number,
  v: number,
  p: CorridorParams = DEFAULT_PARAMS
): { position: THREE.Vector3; quaternion: THREE.Quaternion } {
  const { center, tangent, n, b } = frameAt(t, p);

  const pos = center.clone()
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
