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

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.set(0, immersion.camDist * 0.5, immersion.camDist);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(2, 3, 2);
    scene.add(dir);

    const spin = new THREE.Group();
    scene.add(spin);
    const mesh = immersion.build();
    spin.add(mesh);

    // player marker — a bright bead riding the immersed surface
    const markerMat = new THREE.MeshStandardMaterial({ color: 0x8ef0ff, emissive: 0x8ef0ff, emissiveIntensity: 0.8, roughness: 0.3 });
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), markerMat);
    marker.visible = false;
    spin.add(marker);

    let raf = 0;
    const loop = () => {
      spin.rotation.y += 0.006;
      const at = immersion.marker(stateRef.current(), dirRef.current());
      if (at) { marker.position.copy(at); marker.visible = true; } else { marker.visible = false; }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      mesh.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
      });
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
