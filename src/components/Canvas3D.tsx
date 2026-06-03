import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CANVAS_CONFIG } from '../config/defaults';

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

  useEffect(() => {
    if (!mountRef.current) return;
    
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
    
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true 
    });
    
    // Set initial size
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit DPR for performance
    mount.appendChild(renderer.domElement);
    
    const cleanup = onMount({ scene, camera, renderer });

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      
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
  }, [onMount]);

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
