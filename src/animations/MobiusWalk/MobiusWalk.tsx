import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import Canvas3D from '@/components/Canvas3D';
import { makeCorridorGeometry, DEFAULT_PARAMS, frameAt, CorridorParams } from './corridorGeometry';
import { corridorMaterial } from './shaders/corridorMaterial';
import { instantiateObjects, disposeObjects } from './objects';
import { ShellActions, ShellSettings, useAppHeader, useAppExplainer } from '../../components/AppShell';
import { Section, Slider } from '../../components/ControlPanel';
import explainerText from './EXPLAINER.md?raw';

export interface MobiusWalkProps {
  speed?: number;
}

interface SceneCtx {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  mesh: THREE.Mesh;
  objects: THREE.Group;
  lamp: THREE.PointLight;
  params: CorridorParams;
}

export default function MobiusWalk({ speed = 2 }: MobiusWalkProps) {
  const [twist, setTwist] = useState(true);
  const [walkSpeed, setWalkSpeed] = useState(speed);

  useAppHeader('Möbius Walk', twist ? 'twisted corridor' : 'untwisted corridor');
  useAppExplainer(explainerText);

  const ctxRef = useRef<SceneCtx | null>(null);
  const rafRef = useRef<number | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const camTRef = useRef(0);
  const speedRef = useRef(walkSpeed);
  const twistRef = useRef(twist);
  useEffect(() => { speedRef.current = walkSpeed; }, [walkSpeed]);

  // Built once; reacts to state via refs so toggling twist / speed never tears
  // down the WebGL context.
  const onMount = useCallback(({ scene, camera, renderer }: {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
  }) => {
    const params: CorridorParams = { ...DEFAULT_PARAMS, tiltTurns: twistRef.current ? 1 : 0 };

    const mesh = new THREE.Mesh(makeCorridorGeometry(params), corridorMaterial());
    scene.add(mesh);

    const objects = instantiateObjects(params);
    scene.add(objects);

    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(5, 5, 5);
    scene.add(dir);
    // A lamp that rides just ahead of the camera so the hall is lit as you walk.
    const lamp = new THREE.PointLight(0xfff1e0, 14, 30, 1.8);
    scene.add(lamp);

    scene.background = new THREE.Color(0x05050a);
    scene.fog = new THREE.Fog(0x05050a, 6, 28);

    camera.fov = 75;
    camera.near = 0.05;
    camera.far = 200;
    camera.updateProjectionMatrix();

    ctxRef.current = { scene, camera, renderer, mesh, objects, lamp, params };

    clockRef.current.start();
    const animate = () => {
      const c = ctxRef.current;
      if (!c) return; // torn down
      const dt = Math.min(0.05, clockRef.current.getDelta());
      const circumference = 2 * Math.PI * c.params.radius;
      // A half-twist only returns the cross-section frame to itself after TWO
      // laps, so wrap the phase at that period. Wrapping at one lap would snap
      // the (inverted) frame back to upright and roll the camera 180° at the
      // seam — the discontinuity Codex flagged. b/n are continuous across the
      // double-lap wrap, so there's no pop.
      const period = c.params.tiltTurns % 2 === 1 ? 2 : 1;
      camTRef.current = (camTRef.current + (speedRef.current * dt) / circumference + period) % period;

      const f = frameAt(camTRef.current, c.params);
      // Walk the centreline with a gentle bob; look ahead along the tangent with
      // "up" = the twisting binormal, so the Möbius half-turn is felt directly.
      const bob = 0.05 * Math.sin(camTRef.current * Math.PI * 20);
      c.camera.position.copy(f.center).addScaledVector(f.b, bob);
      c.camera.up.copy(f.b);
      c.camera.lookAt(f.center.clone().addScaledVector(f.tangent, 2));

      c.lamp.position.copy(c.camera.position).addScaledVector(f.tangent, 1.5);

      c.renderer.render(c.scene, c.camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  // Rebuild the corridor + objects in place when the twist toggles — no canvas
  // remount, so the walk continues seamlessly.
  useEffect(() => {
    twistRef.current = twist;
    const c = ctxRef.current;
    if (!c) return;
    const params: CorridorParams = { ...DEFAULT_PARAMS, tiltTurns: twist ? 1 : 0 };
    c.mesh.geometry.dispose();
    c.mesh.geometry = makeCorridorGeometry(params);
    c.scene.remove(c.objects);
    disposeObjects(c.objects);
    c.objects = instantiateObjects(params);
    c.scene.add(c.objects);
    c.params = params;
  }, [twist]);

  // Stop the animation loop and release the scene when leaving the view.
  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const c = ctxRef.current;
    ctxRef.current = null;
    if (c) {
      c.mesh.geometry.dispose();
      (c.mesh.material as THREE.Material).dispose();
      disposeObjects(c.objects);
    }
  }, []);

  return (
    <>
      <div style={{ position: 'absolute', inset: 0 }}>
        <Canvas3D onMount={onMount} />
      </div>

      <ShellSettings>
        <Section title="Walk" icon="∞" defaultOpen>
          <Slider
            label="Speed"
            value={walkSpeed}
            min={0} max={8} step={0.5}
            onChange={setWalkSpeed}
            format={(v) => (v === 0 ? 'paused' : v.toFixed(1))}
          />
        </Section>
      </ShellSettings>

      <ShellActions>
        <div className="cp-section-body">
          <button
            style={{
              padding: '12px 16px', borderRadius: 6,
              border: '1px solid var(--cp-border)',
              background: twist ? 'rgba(255, 212, 0, 0.18)' : 'rgba(255,255,255,0.06)',
              color: 'var(--cp-fg)', cursor: 'pointer', fontSize: 14, textAlign: 'left',
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
