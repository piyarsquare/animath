import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CANVAS_CONFIG } from '../config/defaults';

/** Probe once whether a WebGL context can actually be created. In restricted
 *  environments (hardware acceleration off, strict privacy modes, some remote
 *  desktops) `new THREE.WebGLRenderer` throws — without this probe that error
 *  used to blank the entire page instead of just this view. */
let webglSupport: boolean | null = null;
export function hasWebGL(): boolean {
  if (webglSupport === null) {
    try {
      const c = document.createElement('canvas');
      webglSupport = !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}

export interface CanvasContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

export interface Canvas3DProps {
  /**
   * Called once after the scene/camera/renderer are created. May optionally
   * return a cleanup function (e.g. to `cancelAnimationFrame` your render loop
   * and dispose geometries/textures); Canvas3D invokes it on unmount/remount,
   * just before disposing the renderer.
   */
  onMount: (ctx: CanvasContext) => void | (() => void);
}

export default function Canvas3D({ onMount }: Canvas3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(() => !hasWebGL());

  useEffect(() => {
    if (failed || !mountRef.current) return;

    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      CANVAS_CONFIG.fov,
      width / height,
      CANVAS_CONFIG.near,
      CANVAS_CONFIG.far
    );

    // The probe can pass while renderer creation still fails (context limits,
    // driver quirks) — contain that too instead of blanking the page.
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
      });
    } catch (e) {
      console.error('[animath] WebGL renderer creation failed:', e);
      setFailed(true);
      return;
    }

    // Set initial size
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit DPR for performance
    mount.appendChild(renderer.domElement);
    
    const cleanup = onMount({ scene, camera, renderer });

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      // A collapsed/hidden window reports zero size; keep the last good
      // viewport instead of poisoning the camera with a 0/0 aspect.
      if (!w || !h) return;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    
    // Use ResizeObserver for better performance than window resize events
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mount);
    
    // Fallback to window resize for broader compatibility
    window.addEventListener('resize', handleResize);
    
    return () => {
      // Run the app's own teardown (cancel rAF, dispose geometries/textures)
      // before we tear down the renderer it was drawing into.
      if (typeof cleanup === 'function') cleanup();
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [onMount, failed]);

  if (failed) {
    // A contained, named failure: the workspace chrome (rail, panels, top bar)
    // stays fully alive — only this view reports.
    return (
      <div role="alert" style={{
        position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
        background: 'var(--viz-bg, #0a0e16)', color: 'var(--fg, #eee)', padding: 20,
      }}>
        <div style={{ maxWidth: 380, textAlign: 'center', font: '13.5px/1.55 var(--font-ui, system-ui)' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>3D view unavailable</div>
          <div style={{ color: 'var(--dim, #999)' }}>
            This view needs WebGL, which this browser or environment isn’t providing.
            Enabling hardware acceleration or trying another browser usually restores it.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      style={{
        ...CANVAS_CONFIG.style,
        display: 'block',
        touchAction: 'none', // Prevent default touch behaviors
      }}
    />
  );
}
