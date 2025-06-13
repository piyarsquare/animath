import * as THREE from 'three';
import { paramToFrame, DEFAULT_PARAMS } from './corridorGeometry';

export type ObjKind = 'painting' | 'helix' | 'arrow';

export interface HallObject {
  t: number;              // 0–1 along corridor
  kind: ObjKind;
  offset: [number, number]; // (u,v) in corridor local frame
  mesh?: THREE.Object3D;    // populated at runtime
}

const texLoader = new THREE.TextureLoader();

function makePainting(): THREE.Mesh {
  const geom = new THREE.PlaneGeometry(1.2, 0.8);
  const mat  = new THREE.MeshStandardMaterial({
    map: texLoader.load('/textures/painting.jpg'), // swap assets
    side: THREE.DoubleSide
  });
  return new THREE.Mesh(geom, mat);
}

function makeArrow(): THREE.Mesh {
  const g = new THREE.PlaneGeometry(0.6, 0.6);
  const m = new THREE.MeshBasicMaterial({
    map: texLoader.load('/textures/arrow.png'),
    transparent: true
  });
  return new THREE.Mesh(g, m);
}

function makeHelix(): THREE.Mesh {
  const g = new THREE.TorusKnotGeometry(0.3, 0.08, 128, 16, 2, 3);
  const m = new THREE.MeshPhysicalMaterial({
    roughness: 0.3,
    metalness: 0.7,
    color: 0x7799ff,
    iridescence: 0.15
  });
  return new THREE.Mesh(g, m);
}

export const OBJECTS: HallObject[] = [
  { t: 0.05, kind: 'painting', offset: [ 0.9,  0] },
  { t: 0.15, kind: 'painting', offset: [-0.9,  0] },
  { t: 0.25, kind: 'arrow'   , offset: [ 0,   -1.2] },
  { t: 0.4 , kind: 'helix'   , offset: [ 0,    0]  },
  { t: 0.55, kind: 'painting', offset: [ 0.9,  0] },
  { t: 0.7 , kind: 'helix'   , offset: [ 0,    0] },
  { t: 0.85, kind: 'arrow'   , offset: [ 0,   -1.2] }
];

export function instantiateObjects(): THREE.Group {
  const group = new THREE.Group();
  for (const obj of OBJECTS) {
    const base =
      obj.kind === 'painting' ? makePainting()
      : obj.kind === 'arrow'   ? makeArrow()
      : makeHelix();
    const { position, quaternion } = paramToFrame(
      obj.t,
      obj.offset[0],
      obj.offset[1],
      DEFAULT_PARAMS
    );
    base.position.copy(position);
    base.quaternion.copy(quaternion);
    // paintings should hug the wall: n-axis points inward ⇒ rotate 180° so art faces camera
    if (obj.kind === 'painting') base.rotateY(Math.PI);
    group.add(base);
    obj.mesh = base;
  }
  return group;
}
