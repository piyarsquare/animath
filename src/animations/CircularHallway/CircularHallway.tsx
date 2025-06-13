import React, { useCallback, useRef, useState } from 'react';
import * as THREE from 'three';
import Canvas3D from '@/components/Canvas3D';
import { corridorMaterial } from '../MobiusWalk/shaders/corridorMaterial';
import { makeCorridorGeometry, DEFAULT_PARAMS, paramToFrame, CorridorParams } from '../MobiusWalk/corridorGeometry';

export interface CircularHallwayProps {
  speed?: number;
}

export default function CircularHallway({ speed = 2 }: CircularHallwayProps) {
  const camPosT = useRef(0);
  const clockRef = useRef(new THREE.Clock());
  const [twist, setTwist] = useState(false);

  const onMount = useCallback(({ scene, camera, renderer }: { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer; }) => {
    const params: CorridorParams = { ...DEFAULT_PARAMS, tiltTurns: twist ? 1 : 0 };
    const geom = makeCorridorGeometry(params);
    const mesh = new THREE.Mesh(geom, corridorMaterial());
    scene.add(mesh);

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 2, 3);
    scene.add(dir);

    const animate = () => {
      const dt = clockRef.current.getDelta();
      camPosT.current = (camPosT.current + (speed * dt) / (2 * Math.PI * params.radius)) % 1;
      const { position, quaternion } = paramToFrame(camPosT.current, 0, 0, params);
      camera.position.copy(position);
      camera.quaternion.copy(quaternion);
      camera.position.add(new THREE.Vector3(0, 0, 0.05 * Math.sin(10 * camPosT.current * Math.PI)));
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).negate();
      camera.lookAt(position.clone().add(forward));
      camera.updateMatrixWorld();
      (camera as any).parent?.updateMatrixWorld?.();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();
  }, [speed, twist]);

  return (
    <div>
      <Canvas3D onMount={onMount} />
      <button
        style={{ position: 'absolute', top: 20, left: 20 }}
        onClick={() => setTwist((t) => !t)}
      >
        {twist ? 'Disable Twist' : 'Enable Möbius Twist'}
      </button>
    </div>
  );
}
