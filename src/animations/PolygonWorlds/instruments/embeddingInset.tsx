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
  worldId, getState, getDir, phone,
}: {
  worldId: string;
  getState: () => SquareMapState | null;
  getDir: () => THREE.Vector3 | null;
  phone?: boolean;
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

    // player marker — a bright bead riding the immersed surface (shows your location)
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
      marker.geometry.dispose();
      markerMat.dispose();
      renderer.dispose();
    };
  }, [immersion]);

  if (!immersion) return null;
  // On phone, sit top-left under the bar (paired with the mini-map at top-right),
  // shrunk, so it clears the floating bottom dock and the walk pad.
  const box = phone ? 112 : SIZE;
  const pos: React.CSSProperties = phone
    ? { top: 52, left: 8 }
    : { bottom: 86, left: 12 };
  return (
    <div style={{
      position: 'absolute', ...pos, width: box, height: box,
      pointerEvents: 'none', border: '1px solid rgba(255,255,255,0.18)',
      borderRadius: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.45)', overflow: 'hidden',
      background: 'rgba(8,10,18,0.66)',
    }}>
      <canvas ref={canvasRef} style={{ width: box, height: box, display: 'block' }} />
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
