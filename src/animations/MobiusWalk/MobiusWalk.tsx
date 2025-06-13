import React, { useRef } from 'react';
import * as THREE from 'three';
import Canvas3D from '@/components/Canvas3D';
import { makeCorridorGeometry, DEFAULT_PARAMS, paramToFrame } from './corridorGeometry';
import { corridorMaterial } from './shaders/corridorMaterial';
import { instantiateObjects } from './objects';

export interface MobiusWalkProps {
  speed?: number;      // metres / second along corridor
}

export default function MobiusWalk({ speed = 2 }: MobiusWalkProps) {
  const camPosT = useRef(0);          // param t along centreline
  const clockRef = useRef(new THREE.Clock());

  const onMount = React.useCallback(({ scene, camera }: {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
  }) => {
    const geom = makeCorridorGeometry(DEFAULT_PARAMS);
    const mesh = new THREE.Mesh(geom, corridorMaterial());
    scene.add(mesh);

    scene.add(instantiateObjects());

    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(5, 2, 3);
    scene.add(dir);

    camera.fov = 70;
    camera.near = 0.05;
    camera.far = 100;
    camera.updateProjectionMatrix();

    const animate = () => {
      const dt = clockRef.current.getDelta();
      camPosT.current = (camPosT.current + (speed * dt) / (2 * Math.PI * DEFAULT_PARAMS.radius)) % 1;

      const { position, quaternion } = paramToFrame(camPosT.current, 0, 0, DEFAULT_PARAMS);
      camera.position.copy(position);
      camera.quaternion.copy(quaternion);

      camera.position.add(new THREE.Vector3(0, 0, 0.05 * Math.sin(10 * camPosT.current * Math.PI)));

      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).negate();
      camera.lookAt(position.clone().add(forward));

      camera.updateMatrixWorld();
      (camera as any).parent?.updateMatrixWorld?.();

      requestAnimationFrame(animate);
    };
    animate();
  }, [speed]);

  return <Canvas3D onMount={onMount} />;
}
