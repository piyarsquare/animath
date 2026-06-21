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
 * world, with no clutter. Only the markings (border · grid · arrow) are drawn —
 * the rest of each face is genuinely open — and they use an alpha-test cutout
 * (not blending), so the faces draw in the opaque pass and the view stays rock
 * stable as you move (tiled semi-transparent panes flicker; these don't).
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

// X = red, Y = green, Z = blue (the RGB corner-marker scheme), but muted/dim so
// the walls stay very faint as the cover tiles them into the distance.
const AXIS_COLORS: { axis: 'x' | 'y' | 'z'; hex: string }[] = [
  { axis: 'x', hex: '#6e433d' },
  { axis: 'y', hex: '#3e5c48' },
  { axis: 'z', hex: '#3c4a66' },
];

export function buildRoomsDecor(ctx: DecorBuildContext) {
  const { size, h, mesh, localM, addDisposable } = ctx;
  const inset = h * 0.97;            // just inside the wall, clear of the edge frame
  const face = size * 0.94;

  for (const { axis, hex } of AXIS_COLORS) {
    const tex = faceMotifTexture(hex);
    addDisposable(tex);
    // Unlit, alpha-TESTED (hard cutout, not blended): the markings draw in the
    // opaque pass, depth-tested like everything else, so the view never flickers
    // the way tiled transparent panes do. The same material on both faces of the
    // pair makes the gluing legible.
    const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
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
