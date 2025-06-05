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
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      CANVAS_CONFIG.fov,
      width / height,
      CANVAS_CONFIG.near,
      CANVAS_CONFIG.far
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);
    onMount({ scene, camera, renderer });
    const handleResize = () => {
      const w = mountRef.current!.clientWidth;
      const h = mountRef.current!.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [onMount]);

  return <div ref={mountRef} style={CANVAS_CONFIG.style} />;
}
