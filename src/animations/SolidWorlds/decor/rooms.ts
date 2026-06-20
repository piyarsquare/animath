import * as THREE from 'three';
import type { SolidWorldSpec } from '../solidSchema';
import { faceMotifTexture } from '../textures';

/**
 * Solid Worlds — the **Rooms** decorator: paint the cube's six faces.
 *
 * The empty room, with each face of the fundamental cube tinted and stamped with
 * a chiral arrow. Glued opposite faces share a color (X red · Y green · Z blue —
 * the corner-marker convention), so the room reads as an oriented box: you always
 * know which way you face, you recognize the wall you just came through (it
 * matches the one ahead), and — built once and instanced across the cover — you
 * watch a face come back **rotated** in a turn world or **mirrored** in a glide
 * world, with no clutter. The faces are semi-transparent, so the hall-of-copies
 * still shows through.
 *
 * That's all there is: no furniture, no walls inside the domain. Orientation
 * first.
 */

export interface DecorBuildContext {
  spec: SolidWorldSpec;
  size: number;
  U: number;
  h: number;
  mesh: (geo: THREE.BufferGeometry, mat: THREE.Material, matrix: THREE.Matrix4, floor?: boolean) => void;
  std: (color: number) => THREE.MeshStandardMaterial;
  localM: (x: number, y: number, z: number, rx?: number, ry?: number, rz?: number) => THREE.Matrix4;
  addDisposable: (d: { dispose: () => void }) => void;
}

// X = red, Y = green, Z = blue (matches the RGB corner-marker scheme).
const AXIS_COLORS: { axis: 'x' | 'y' | 'z'; hex: string }[] = [
  { axis: 'x', hex: '#e0533f' },
  { axis: 'y', hex: '#46b96a' },
  { axis: 'z', hex: '#3f7fe0' },
];

export function buildRoomsDecor(ctx: DecorBuildContext) {
  const { size, h, mesh, localM, addDisposable } = ctx;
  const inset = h * 0.97;            // just inside the wall, clear of the edge frame
  const face = size * 0.94;

  for (const { axis, hex } of AXIS_COLORS) {
    const tex = faceMotifTexture(hex);
    addDisposable(tex);
    // Unlit + depthWrite so the tiled tint never stacks into murk; the same
    // material on both faces of the pair makes the gluing legible.
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    addDisposable(mat);
    for (const s of [-1, 1]) {
      const geo = new THREE.PlaneGeometry(face, face);
      const m =
        axis === 'x' ? localM(s * inset, 0, 0, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0)
        : axis === 'y' ? localM(0, s * inset, 0, s > 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0)
        : localM(0, 0, s * inset, 0, s > 0 ? Math.PI : 0, 0);
      mesh(geo, mat, m);
    }
  }
}
