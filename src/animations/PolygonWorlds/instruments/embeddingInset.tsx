import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SquareMapState } from '../engineTypes';
import { sq2hemi } from '../squareMap';

/**
 * Extrinsic embedding inset — the same walk, a wildly different shape.
 *
 * The intrinsic world (what you walk in the main view) is a *genuinely round*
 * surface; this corner shows one way that abstract surface can be *immersed* into
 * ordinary 3-space. For ℝP² we use the **Steiner Roman surface**, the image of the
 * map
 *
 *     S² → ℝ³,   (a, b, c) ↦ (a·b, b·c, c·a)
 *
 * (a quadratic, so antipodal points `±(a,b,c)` land on the **same** image point —
 * which is exactly why this map *factors through ℝP²* and immerses the projective
 * plane). It is fully procedural (no asset import), self-intersects along three
 * segments (the famous "tetrahedral" Roman shape), and the player's marker traces
 * the very same point whether they are on the near sheet or the antipodal mirror
 * sheet — making the `x ∼ −x` gluing visible as a single dot.
 *
 * A tiny self-contained renderer (its own WebGL context + rAF), cleaned up on
 * unmount; it reads the player chart from the engine's mini-map state, so it needs
 * no extra plumbing into the geometry kernel.
 */

const SIZE = 156;
const SCALE = 3.2;        // Roman surface coords ∈ [−0.5, 0.5] → fit the frame
const LON = 64, LAT = 48;

/** The Roman immersion of a unit-sphere direction into ℝ³. */
function roman(d: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  return out.set(d.x * d.y, d.y * d.z, d.z * d.x).multiplyScalar(SCALE);
}

/** Build the Roman surface mesh from a lon/lat sphere grid, coloured by direction
 *  so the lobes + self-intersections read on a dark inset. */
function buildRoman(): THREE.Mesh {
  const geo = new THREE.BufferGeometry();
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const d = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  for (let j = 0; j <= LAT; j++) {
    const lat = (j / LAT) * Math.PI - Math.PI / 2, cl = Math.cos(lat), sl = Math.sin(lat);
    for (let i = 0; i <= LON; i++) {
      const lon = (i / LON) * Math.PI * 2;
      d.set(cl * Math.cos(lon), sl, cl * Math.sin(lon));
      roman(d, p);
      pos.push(p.x, p.y, p.z);
      c.setHSL((Math.atan2(d.z, d.x) / (Math.PI * 2) + 0.5) % 1, 0.55, 0.55 + 0.12 * d.y);
      col.push(c.r, c.g, c.b);
    }
  }
  const row = LON + 1;
  for (let j = 0; j < LAT; j++) for (let i = 0; i < LON; i++) {
    const a = j * row + i, b = a + 1, cc = a + row, dd = cc + 1;
    idx.push(a, cc, b, b, cc, dd);
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.45, metalness: 0.05,
    transparent: true, opacity: 0.92, side: THREE.DoubleSide,
    emissive: 0x101820, emissiveIntensity: 0.5, flatShading: false,
  });
  return new THREE.Mesh(geo, mat);
}

export function EmbeddingInset({ getState }: { getState: () => SquareMapState | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const getStateRef = useRef(getState);
  getStateRef.current = getState;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch {
      return; // no WebGL (e.g. context limit) — fail quiet, the inset just won't show
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    renderer.setPixelRatio(dpr);
    renderer.setSize(SIZE, SIZE, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.set(0, 2.6, 5.2);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(2, 3, 2);
    scene.add(dir);

    const spin = new THREE.Group();
    scene.add(spin);
    const mesh = buildRoman();
    spin.add(mesh);

    // player marker — a bright bead riding the immersed surface
    const markerMat = new THREE.MeshStandardMaterial({ color: 0x8ef0ff, emissive: 0x8ef0ff, emissiveIntensity: 0.8, roughness: 0.3 });
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), markerMat);
    marker.visible = false;
    spin.add(marker);
    const mDir = new THREE.Vector3(), mPos = new THREE.Vector3();

    let raf = 0;
    const loop = () => {
      spin.rotation.y += 0.006;
      const st = getStateRef.current();
      if (st) {
        const hemi = sq2hemi((st.u - 0.5) * 2, (st.v - 0.5) * 2);
        mDir.copy(hemi);
        roman(mDir, mPos);
        marker.position.copy(mPos);
        marker.visible = true;
      } else {
        marker.visible = false;
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      marker.geometry.dispose();
      markerMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div style={{
      position: 'absolute', bottom: 86, left: 12, width: SIZE, height: SIZE,
      pointerEvents: 'none', border: '1px solid rgba(255,255,255,0.18)',
      borderRadius: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.45)', overflow: 'hidden',
      background: 'rgba(8,10,18,0.66)',
    }}>
      <canvas ref={canvasRef} style={{ width: SIZE, height: SIZE, display: 'block' }} />
      <div style={{
        position: 'absolute', top: 4, left: 8, fontSize: 10, letterSpacing: '0.06em',
        color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase',
      }}>Immersed in ℝ³</div>
      <div style={{
        position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center',
        fontSize: 9, color: 'rgba(255,255,255,0.5)',
      }}>Roman surface · same walk</div>
    </div>
  );
}
