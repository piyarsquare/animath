import * as THREE from 'three';

export interface QuatUniform { w: number; v: THREE.Vector3; }

export interface ProjectionUniforms {
  uRotL: QuatUniform;
  uRotR: QuatUniform;
  uProjMode: number;
  uProjTarget: number;
  uProjAlpha: number;
  uColour: { value: number };
}
