import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import Canvas3D from '../../components/Canvas3D';
import { vertexShader, fragmentShader } from './shaders';

export interface ComplexParticlesProps {
  count?: number;
  selectedFunction?: string;
}

export default function ComplexParticles({ count = 40000, selectedFunction = 'sqrt' }: ComplexParticlesProps) {
  const onMount = (ctx: { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer }) => {
    const { scene, camera, renderer } = ctx;
    camera.position.z = 5;

    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        opacity: { value: 0.9 },
        functionType: { value: 0 }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });

    const side = Math.sqrt(count);
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    let i = 0;
    for (let ix = 0; ix < side; ix++) {
      for (let iz = 0; iz < side; iz++) {
        positions[3 * i] = (ix / side - 0.5) * 4;
        positions[3 * i + 1] = 0;
        positions[3 * i + 2] = (iz / side - 0.5) * 4;
        sizes[i] = 1;
        i++;
      }
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particles = new THREE.Points(geometry, particleMaterial);
    scene.add(particles);

    const clock = new THREE.Clock();
    const animate = () => {
      const t = clock.getElapsedTime();
      particleMaterial.uniforms.time.value = t;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();
  };

  return <Canvas3D onMount={onMount} />;
}
