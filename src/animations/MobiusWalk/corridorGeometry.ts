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
 *
 * Each wall gets its own vertices (not shared at the corners) so the 90° edges
 * stay crisp — sharing them makes computeVertexNormals average across the
 * corner and the walls look soft/"fuzzy". UVs are metric (world units) so a
 * repeating panel texture keeps a consistent scale on every wall.
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
  const wallSpan = [2 * p.width, 2 * p.height, 2 * p.width, 2 * p.height];
  const circumference = 2 * Math.PI * p.radius;

  for (let i = 0; i <= p.segments; i++) {
    const t = i / p.segments;
    const { center, n, b } = frameAt(t, p);
    const along = t * circumference;
    for (let w = 0; w < ring; w++) {
      const [u0, v0] = corners[w];
      const [u1, v1] = corners[(w + 1) % ring];
      const a = center.clone().addScaledVector(n, u0).addScaledVector(b, v0);
      const c = center.clone().addScaledVector(n, u1).addScaledVector(b, v1);
      verts.push(a.x, a.y, a.z, c.x, c.y, c.z);
      uvs.push(along, 0, along, wallSpan[w]);
    }
  }

  const perRing = ring * 2; // two vertices per wall
  const indices: number[] = [];
  for (let i = 0; i < p.segments; i++) {
    const a = i * perRing;
    const c = (i + 1) * perRing;
    for (let w = 0; w < ring; w++) {
      const a0 = a + w * 2, a1 = a + w * 2 + 1;
      const c0 = c + w * 2, c1 = c + w * 2 + 1;
      indices.push(a0, c0, c1);
      indices.push(a0, c1, a1);
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

/**
 * A flat ribbon running the length of the corridor, centred on the floor and
 * sitting just above it — the carrier for the floor-marker decal. Its UV runs
 * 0..(laps) along the length so a repeating marker texture tiles down it; the
 * width maps v 0..1 across the strip.
 */
export function makeFloorDecalGeometry(
  p: CorridorParams = DEFAULT_PARAMS,
  halfWidth = 0.55,
): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const verts: number[] = [];
  const uvs: number[] = [];
  const tilesPerLap = 16;

  for (let i = 0; i <= p.segments; i++) {
    const t = i / p.segments;
    const { center, n, b } = frameAt(t, p);
    // floor sits at b = -height; lift a hair so it doesn't z-fight the floor.
    const base = center.clone().addScaledVector(b, -(p.height - 0.02));
    const a = base.clone().addScaledVector(n, halfWidth);
    const c = base.clone().addScaledVector(n, -halfWidth);
    verts.push(a.x, a.y, a.z, c.x, c.y, c.z);
    const along = t * tilesPerLap;
    uvs.push(along, 0, along, 1);
  }

  const indices: number[] = [];
  for (let i = 0; i < p.segments; i++) {
    const a = i * 2, c = (i + 1) * 2;
    indices.push(a, c, c + 1, a, c + 1, a + 1);
  }

  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
