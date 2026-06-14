import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SquareMapState } from '../engineTypes';
import { immersionFor } from './immersions';

/**
 * Extrinsic embedding inset — the same walk, a wildly different shape.
 *
 * The intrinsic world (what you walk in the main view) is a genuinely round / flat
 * / hyperbolic surface; this corner shows one way that abstract surface can be
 * *immersed* into ordinary 3-space (the donut for a torus, the figure-8 bottle for
 * the Klein, the Steiner Roman surface for ℝP²). The per-world shape + marker map
 * live in {@link immersionFor}; this component is just the little self-contained
 * renderer (its own WebGL context + rAF), rebuilt when the world changes and torn
 * down on unmount. The player's bead rides the immersion at the same point they
 * occupy intrinsically — read from the engine's chart + pose, so no extra plumbing
 * into the geometry kernel.
 */

const SIZE = 156;

export function EmbeddingInset({
  worldId, getState, getDir,
}: {
  worldId: string;
  getState: () => SquareMapState | null;
  getDir: () => THREE.Vector3 | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(getState); stateRef.current = getState;
  const dirRef = useRef(getDir); dirRef.current = getDir;

  const immersion = immersionFor(worldId);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !immersion) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch {
      return; // no WebGL (e.g. context limit) — fail quiet, the inset just won't show
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    renderer.setPixelRatio(dpr);
    renderer.setSize(SIZE, SIZE, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.set(0, immersion.camDist * 0.5, immersion.camDist);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    scene.add(new THREE.HemisphereLight(0xbfd2ff, 0x202535, 0.6));
    const dir = new THREE.DirectionalLight(0xfff2e0, 1.0);
    dir.position.set(2, 3, 2);
    scene.add(dir);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.5);
    rim.position.set(-2, -1, -2);
    scene.add(rim);

    const spin = new THREE.Group();
    scene.add(spin);
    const mesh = immersion.build();
    spin.add(mesh);

    // fixed reference markers — the domain-center "pole" + the identified corners,
    // colored to match the mini-map, so the inset reads as an orientable map.
    const refMats: THREE.Material[] = [];
    const refGeos: THREE.BufferGeometry[] = [];
    const at = new THREE.Vector3();
    for (const ref of immersion.refs) {
      immersion.at(ref.u, ref.v, at);
      const geo = new THREE.SphereGeometry(ref.pole ? 0.12 : 0.09, 14, 10);
      const mat = new THREE.MeshStandardMaterial({ color: ref.color, emissive: ref.color, emissiveIntensity: 0.75, roughness: 0.35 });
      const dot = new THREE.Mesh(geo, mat);
      dot.position.copy(at);
      spin.add(dot);
      refMats.push(mat); refGeos.push(geo);
    }

    // player marker — a bright bead riding the immersed surface
    const markerMat = new THREE.MeshStandardMaterial({ color: 0x8ef0ff, emissive: 0x8ef0ff, emissiveIntensity: 0.9, roughness: 0.25 });
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), markerMat);
    marker.visible = false;
    spin.add(marker);

    let raf = 0;
    const loop = () => {
      spin.rotation.y += 0.006;
      const m = immersion.marker(stateRef.current(), dirRef.current());
      if (m) { marker.position.copy(m); marker.visible = true; } else { marker.visible = false; }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      mesh.traverse((o) => {
        const mo = o as THREE.Mesh;
        if (mo.isMesh) { mo.geometry.dispose(); (mo.material as THREE.Material).dispose(); }
      });
      refGeos.forEach((g) => g.dispose());
      refMats.forEach((mm) => mm.dispose());
      marker.geometry.dispose();
      markerMat.dispose();
      renderer.dispose();
    };
  }, [immersion]);

  if (!immersion) return null;
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
      }}>{immersion.caption}</div>
    </div>
  );
}
