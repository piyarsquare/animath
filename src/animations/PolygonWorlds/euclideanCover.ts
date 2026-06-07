import * as THREE from 'three';
import { CoverModel, CoverFrameInput, PlayerPose, SquarePlacement } from './coverModel';
import { SquareMapState } from './engineTypes';
import { WorldSpec } from './worldSpec';

export const L = 30;   // default fundamental-square side in world units
const K = 2;           // render (2K+1)² copies around the player
const EYE = 1.7;
const UP = new THREE.Vector3(0, 1, 0);

/**
 * The flat (Euclidean-plane) cover for the χ=0 worlds. The player walks an
 * intrinsically flat plane; the gluing is shown by tiling the fundamental square
 * (the universal cover) around a fixed player so nothing flips underfoot. On the
 * Klein bottle the left/right ("a") pair glues with a flip, so every odd column
 * of copies is mirror-reflected and wears the opposite face; the torus glues by
 * pure translation, so every copy is the same.
 */
export function makeEuclideanCover(spec: WorldSpec, squareSize: number): CoverModel {
  // For the flat worlds the only non-orientable one is the Klein bottle, whose
  // 'a' (left/right) pair carries the flip → odd columns mirror across z.
  const flipI = !spec.orientable;
  let side = squareSize;   // live fundamental-square side

  let px = 2, pz = 2;
  const forward = new THREE.Vector3(0, 0, -1);
  const pos = new THREE.Vector3(px, 0, pz);

  function update(input: CoverFrameInput, camera: THREE.PerspectiveCamera) {
    const { fwd, strafe, yaw, pitch, dt, moveSpeed, thirdPerson } = input;
    if (fwd || strafe) {
      const v = moveSpeed * dt;
      const sy = Math.sin(yaw), cy = Math.cos(yaw);
      // forward = (sin yaw, −cos yaw); right = (cos yaw, sin yaw)
      px += (fwd * sy + strafe * cy) * v;
      pz += (fwd * -cy + strafe * sy) * v;
    }
    pos.set(px, 0, pz);
    forward.set(Math.sin(yaw), 0, -Math.cos(yaw));

    camera.up.copy(UP);
    if (thirdPerson) {
      const aspect = camera.aspect || 1;
      const distScale = Math.min(1.6, Math.max(1, 1 / Math.min(aspect, 1)));
      const D = 3.2 * distScale;
      camera.position.set(px, 0, pz).addScaledVector(forward, -D).addScaledVector(UP, 2.2 + pitch * 1.6);
      camera.lookAt(px + forward.x * 0.5, 1.3, pz + forward.z * 0.5);
    } else {
      const cp = Math.cos(pitch);
      camera.position.set(px, EYE, pz);
      camera.lookAt(px + Math.sin(yaw) * cp, EYE + Math.sin(pitch), pz - Math.cos(yaw) * cp);
    }
  }

  function pose(): PlayerPose {
    return { position: pos.clone(), up: UP.clone(), forward: forward.clone() };
  }

  const M = new THREE.Matrix4();
  const S = new THREE.Matrix4();
  function visibleSquares(): SquarePlacement[] {
    const out: SquarePlacement[] = [];
    const I0 = Math.round(px / side), J0 = Math.round(pz / side);
    for (let di = -K; di <= K; di++) {
      for (let dj = -K; dj <= K; dj++) {
        const I = I0 + di, J = J0 + dj;
        const flipped = flipI && (I & 1) !== 0;
        const sz = flipped ? -1 : 1;
        S.makeScale(1, 1, sz);
        const m = new THREE.Matrix4().multiplyMatrices(M.makeTranslation(I * side, 0, J * side), S);
        // flipped copies wear the trees face (0); orientable copies wear columns (1)
        out.push({ matrix: m, face: flipped ? 0 : 1, reflected: flipped });
      }
    }
    return out;
  }

  function trailSample() {
    return { pos: pos.clone(), forward: forward.clone(), up: UP.clone() };
  }

  function chart(): SquareMapState {
    const I0 = Math.round(px / side), J0 = Math.round(pz / side);
    const sz0 = flipI && (I0 & 1) ? -1 : 1;
    const bx = px - I0 * side;
    const bz = sz0 * (pz - J0 * side);
    const mhx = forward.x, mhz = sz0 * forward.z, mhl = Math.hypot(mhx, mhz) || 1;
    return {
      u: bx / side + 0.5,
      v: bz / side + 0.5,
      hx: mhx / mhl,
      hz: mhz / mhl,
      flipped: flipI && (I0 & 1) !== 0,
    };
  }

  return {
    kind: 'euclidean',
    update,
    pose,
    visibleSquares,
    trailSample,
    chart,
    setSquareSize: (v: number) => { side = v; },
    dispose: () => {},
  };
}
