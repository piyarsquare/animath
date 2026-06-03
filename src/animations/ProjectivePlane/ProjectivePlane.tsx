import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import Canvas3D from '@/components/Canvas3D';
import { ShellActions, ShellSettings, useAppHeader, useAppExplainer } from '../../components/AppShell';
import { Section, Slider } from '../../components/ControlPanel';
import { makeFootprintTrail, FootprintTrail } from '../WrapWorld/footprints';
import explainerText from './EXPLAINER.md?raw';

/**
 * The real projective plane RP², walked in first person. RP² is the sphere with
 * antipodal points identified; it is positively curved, so — unlike the torus
 * and Klein bottle — it cannot be flattened. We walk its double cover, the
 * SPHERE: ordinary, locally-flat-feeling walking on a little planet. The
 * identification is shown by also drawing the antipodal image of everything
 * (a point reflection through the centre), which is orientation-reversing — so
 * a landmark, and your footprints, reappear MIRRORED on the far side. Walk a
 * great circle and the "other" copy you meet is your own start, flipped.
 */

const RS = 14;            // planet radius
const EYE = 1.7;
const LOOK_SENS = 0.0035;
const MAX_PITCH = 1.2;
const TRAIL_MAX = 1200;
const TRAIL_SPACING = 1.1;

type MoveKey = 'fwd' | 'back' | 'left' | 'right';

interface Pillar { lat: number; lon: number; color: number; label: string }
const PILLARS: Pillar[] = [
  { lat: 0.1, lon: 0.0, color: 0xff5a5a, label: '1' },
  { lat: 0.6, lon: 1.1, color: 0x5ad1ff, label: '2' },
  { lat: -0.4, lon: 2.0, color: 0x8aff6a, label: '3' },
  { lat: 0.3, lon: 3.2, color: 0xffd24a, label: '4' },
  { lat: -0.7, lon: 4.3, color: 0xc08aff, label: '5' },
  { lat: 0.9, lon: 5.0, color: 0xff9a3d, label: '6' },
];

function labelTexture(label: string, color: number): THREE.CanvasTexture {
  const s = 128;
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  ctx.clearRect(0, 0, s, s);
  ctx.fillStyle = '#' + new THREE.Color(color).getHexString();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 6;
  ctx.font = `bold ${Math.round(s * 0.5)}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeText(label, s * 0.36, s * 0.5); ctx.fillText(label, s * 0.36, s * 0.5);
  ctx.beginPath();
  ctx.moveTo(s * 0.6, s * 0.34); ctx.lineTo(s * 0.84, s * 0.5); ctx.lineTo(s * 0.6, s * 0.66); ctx.closePath();
  ctx.fill(); ctx.stroke();
  const t = new THREE.CanvasTexture(cvs); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function gridTexture(): THREE.CanvasTexture {
  const s = 256;
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  ctx.fillStyle = '#10131e'; ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = '#28324a'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(cvs);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(16, 8);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function dirFromLatLon(lat: number, lon: number): THREE.Vector3 {
  return new THREE.Vector3(
    Math.cos(lat) * Math.cos(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.sin(lon),
  );
}

/** Pillars standing radially on the planet. */
function buildLandmarks(disposers: (() => void)[]): THREE.Group {
  const g = new THREE.Group();
  const upY = new THREE.Vector3(0, 1, 0);
  for (const p of PILLARS) {
    const n = dirFromLatLon(p.lat, p.lon);
    const pillar = new THREE.Group();
    pillar.position.copy(n).multiplyScalar(RS);
    pillar.quaternion.setFromUnitVectors(upY, n); // stand up along the normal

    const bodyGeo = new THREE.CylinderGeometry(0.8, 0.8, 3.2, 18);
    const bodyMat = new THREE.MeshStandardMaterial({ color: p.color, emissive: p.color, emissiveIntensity: 0.3, roughness: 0.5, side: THREE.DoubleSide });
    const body = new THREE.Mesh(bodyGeo, bodyMat); body.position.y = 1.6; pillar.add(body);

    const tex = labelTexture(p.label, p.color);
    const decalGeo = new THREE.PlaneGeometry(1.5, 1.5);
    const decalMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
    const decal = new THREE.Mesh(decalGeo, decalMat);
    decal.position.set(0.82, 1.9, 0); decal.rotation.y = Math.PI / 2; pillar.add(decal);

    g.add(pillar);
    disposers.push(() => { bodyGeo.dispose(); bodyMat.dispose(); decalGeo.dispose(); decalMat.dispose(); tex.dispose(); });
  }
  return g;
}

export default function ProjectivePlane() {
  const [moveSpeed, setMoveSpeed] = useState(7);
  useAppHeader('Projective Plane', 'RP² — antipodal sphere');
  useAppExplainer(explainerText);

  const speedRef = useRef(moveSpeed);
  useEffect(() => { speedRef.current = moveSpeed; }, [moveSpeed]);

  const ctxRef = useRef<{
    renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera;
    foot: FootprintTrail; lastP: THREE.Vector3 | null; disposers: (() => void)[];
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const clockRef = useRef(new THREE.Clock());

  const Pref = useRef(new THREE.Vector3(0, 0, RS));      // position on sphere
  const Fref = useRef(new THREE.Vector3(1, 0, 0));       // forward tangent
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const keysRef = useRef<Record<MoveKey, boolean>>({ fwd: false, back: false, left: false, right: false });
  const setKey = useCallback((k: MoveKey, v: boolean) => { keysRef.current[k] = v; }, []);

  const onMount = useCallback(({ scene, camera, renderer }: {
    scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer;
  }) => {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    scene.background = new THREE.Color(0x05060d);
    scene.fog = new THREE.Fog(0x05060d, RS * 1.4, RS * 3.2);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9); sun.position.set(1, 1, 0.6); scene.add(sun);

    const disposers: (() => void)[] = [];

    const planetGeo = new THREE.SphereGeometry(RS, 64, 48);
    const planetMat = new THREE.MeshStandardMaterial({ map: gridTexture(), roughness: 0.95, metalness: 0.0, side: THREE.FrontSide });
    const planet = new THREE.Mesh(planetGeo, planetMat); scene.add(planet);
    disposers.push(() => { planetGeo.dispose(); planetMat.map?.dispose(); planetMat.dispose(); });

    const landmarks = buildLandmarks(disposers);
    scene.add(landmarks);
    // Antipodal copy: point reflection through the centre (orientation-reversing).
    const anti = landmarks.clone();
    anti.matrixAutoUpdate = false;
    anti.matrix.makeScale(-1, -1, -1);
    scene.add(anti);

    const foot = makeFootprintTrail(TRAIL_MAX);
    const fp = new THREE.Mesh(foot.geometry, foot.material); fp.frustumCulled = false; scene.add(fp);
    const fpAnti = new THREE.Mesh(foot.geometry, foot.material); fpAnti.frustumCulled = false;
    fpAnti.matrixAutoUpdate = false; fpAnti.matrix.makeScale(-1, -1, -1); scene.add(fpAnti);

    camera.fov = 75; camera.near = 0.05; camera.far = 400; camera.updateProjectionMatrix();

    ctxRef.current = { renderer, scene, camera, foot, lastP: null, disposers };

    clockRef.current.start();
    const animate = () => {
      const c = ctxRef.current;
      if (!c) return;
      const dt = Math.min(0.05, clockRef.current.getDelta());

      const P = Pref.current, F = Fref.current;
      const up = P.clone().normalize();
      // keep F tangent
      F.addScaledVector(up, -F.dot(up)).normalize();
      const right = new THREE.Vector3().crossVectors(up, F).normalize();

      const k = keysRef.current;
      const fwd = (k.fwd ? 1 : 0) - (k.back ? 1 : 0);
      const strafe = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      if (fwd || strafe) {
        const move = new THREE.Vector3().addScaledVector(F, fwd).addScaledVector(right, strafe);
        if (move.lengthSq() > 1e-6) {
          move.normalize();
          const axis = new THREE.Vector3().crossVectors(P, move).normalize();
          const ang = (speedRef.current * dt) / RS;
          const q = new THREE.Quaternion().setFromAxisAngle(axis, ang);
          P.applyQuaternion(q); F.applyQuaternion(q);
          P.setLength(RS);
          const up2 = P.clone().normalize();
          F.addScaledVector(up2, -F.dot(up2)).normalize();
        }
      }

      const upN = P.clone().normalize();
      const yaw = yawRef.current, pitch = pitchRef.current;
      if (yaw) { F.applyAxisAngle(upN, yaw); yawRef.current = 0; F.addScaledVector(upN, -F.dot(upN)).normalize(); }
      const rightN = new THREE.Vector3().crossVectors(upN, F).normalize();
      const look = F.clone().multiplyScalar(Math.cos(pitch)).addScaledVector(upN, Math.sin(pitch));
      const eye = P.clone().addScaledVector(upN, EYE);
      c.camera.up.copy(upN);
      c.camera.position.copy(eye);
      c.camera.lookAt(eye.clone().add(look));

      // Footprints on the surface; the antipodal mesh mirrors them.
      if (!c.lastP || c.lastP.distanceTo(P) > TRAIL_SPACING) {
        const surfDir = c.lastP ? P.clone().sub(c.lastP) : F.clone();
        surfDir.addScaledVector(upN, -surfDir.dot(upN));
        if (surfDir.lengthSq() < 1e-6) surfDir.copy(F);
        c.foot.append(P.clone().setLength(RS + 0.04), surfDir, upN);
        c.lastP = P.clone();
      }

      c.renderer.render(c.scene, c.camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearTrail = useCallback(() => {
    const c = ctxRef.current; if (!c) return;
    c.foot.clear(); c.lastP = null;
  }, []);

  useEffect(() => {
    const map: Record<string, MoveKey> = {
      KeyW: 'fwd', ArrowUp: 'fwd', KeyS: 'back', ArrowDown: 'back',
      KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    };
    const down = (e: KeyboardEvent) => { const m = map[e.code]; if (m) { keysRef.current[m] = true; e.preventDefault(); } };
    const up = (e: KeyboardEvent) => { const m = map[e.code]; if (m) { keysRef.current[m] = false; e.preventDefault(); } };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const c = ctxRef.current; ctxRef.current = null;
    if (c) { c.disposers.forEach((d) => d()); c.foot.dispose(); }
  }, []);

  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current; if (!d) return;
    yawRef.current += (e.clientX - d.x) * LOOK_SENS;
    pitchRef.current = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitchRef.current - (e.clientY - d.y) * LOOK_SENS));
    d.x = e.clientX; d.y = e.clientY;
  };
  const onPointerUp = () => { dragRef.current = null; };

  return (
    <>
      <div
        style={{ position: 'absolute', inset: 0, cursor: 'grab', touchAction: 'none' }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      >
        <Canvas3D onMount={onMount} />
      </div>

      <MovePad onSet={setKey} />

      <div style={{
        position: 'absolute', top: 12, left: 0, right: 0, textAlign: 'center',
        color: 'rgba(255,255,255,0.6)', fontSize: 12, pointerEvents: 'none', textShadow: '0 1px 2px #000',
      }}>
        Drag to look · WASD / arrows or the pad to walk the planet · the far side is your world, mirrored
      </div>

      <ShellSettings>
        <Section title="Walk" icon="◓" defaultOpen>
          <Slider label="Walk speed" value={moveSpeed} min={2} max={16} step={0.5} onChange={setMoveSpeed} format={(v) => v.toFixed(1)} />
          <div style={{ fontSize: 11, color: 'var(--cp-fg-dim)' }}>
            RP² = the sphere with opposite points glued. The mirror copies on the far side are the same places; reach a familiar pillar and it reads backwards.
          </div>
        </Section>
      </ShellSettings>

      <ShellActions>
        <div className="cp-section-body">
          <button
            style={{
              padding: '12px 16px', borderRadius: 6, border: '1px solid var(--cp-border)',
              background: 'rgba(255,255,255,0.06)', color: 'var(--cp-fg)', cursor: 'pointer', fontSize: 14, textAlign: 'left',
            }}
            onClick={clearTrail}
          >Clear trail</button>
        </div>
      </ShellActions>
    </>
  );
}

function MovePad({ onSet }: { onSet: (k: MoveKey, v: boolean) => void }) {
  const mv = (k: MoveKey, label: string, style: React.CSSProperties) => (
    <button
      aria-label={k}
      onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); onSet(k, true); }}
      onPointerUp={() => onSet(k, false)}
      onPointerCancel={() => onSet(k, false)}
      onPointerLeave={(e) => { if (e.buttons === 0) onSet(k, false); }}
      style={{
        position: 'absolute', width: 46, height: 46, ...style,
        borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
        background: 'rgba(12,12,16,0.6)', color: '#f0f0f3', fontSize: 18,
        backdropFilter: 'blur(6px)', cursor: 'pointer', touchAction: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >{label}</button>
  );
  return (
    <div style={{ position: 'absolute', bottom: 20, right: 20, width: 150, height: 150, zIndex: 20 }}>
      {mv('fwd', '▲', { top: 0, left: 52 })}
      {mv('left', '◀', { top: 52, left: 0 })}
      {mv('right', '▶', { top: 52, left: 104 })}
      {mv('back', '▼', { top: 104, left: 52 })}
    </div>
  );
}
