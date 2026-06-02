import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import Canvas3D from '@/components/Canvas3D';
import { makeCorridorGeometry, DEFAULT_PARAMS, paramToFrame } from './corridorGeometry';
import { corridorMaterial } from './shaders/corridorMaterial';
import { instantiateObjects } from './objects';
import { ShellActions, useAppHeader, useAppExplainer } from '../../components/AppShell';
import explainerText from './EXPLAINER.md?raw';

export interface MobiusWalkProps {
  speed?: number;
}

export default function MobiusWalk({ speed = 2 }: MobiusWalkProps) {
  const camPosT = useRef(0);
  const clockRef = useRef(new THREE.Clock());
  const [twist, setTwist] = useState(true);

  useAppHeader('Möbius Walk', twist ? 'twisted corridor' : 'untwisted corridor');
  useAppExplainer(explainerText);

  const onMount = React.useCallback(({ scene, camera, renderer }: {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
  }) => {
    const params = { ...DEFAULT_PARAMS, tiltTurns: twist ? 1 : 0 };
    const geom = makeCorridorGeometry(params);
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
    <>
      <div style={{ position: 'absolute', inset: 0 }}>
        <Canvas3D onMount={onMount} />
      </div>
      <ShellActions>
        <div className="cp-section-body">
          <button
            style={{
              padding: '12px 16px', borderRadius: 6,
              border: '1px solid var(--cp-border)',
              background: twist ? 'rgba(255, 212, 0, 0.18)' : 'rgba(255,255,255,0.06)',
              color: 'var(--cp-fg)', cursor: 'pointer', fontSize: 14,
            }}
            onClick={() => setTwist((t) => !t)}
          >
            {twist ? 'Disable twist' : 'Enable Möbius twist'}
          </button>
        </div>
      </ShellActions>
    </>
  );
}
