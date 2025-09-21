import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CANVAS_CONFIG } from '../config/defaults';

export interface CanvasContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

export interface Canvas3DProps {
  onMount: (ctx: CanvasContext) => void;
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
    
    onMount({ scene, camera, renderer });
    
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
