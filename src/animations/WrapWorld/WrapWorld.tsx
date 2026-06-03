import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import Canvas3D from '@/components/Canvas3D';
import { ShellActions, ShellSettings, useAppHeader, useAppExplainer } from '../../components/AppShell';
import { Section, Slider, Select } from '../../components/ControlPanel';
import explainerText from './EXPLAINER.md?raw';

/**
 * A first-person walk on a FLAT closed surface — the torus or the Klein bottle.
 * Both are intrinsically flat, so movement is ordinary flat walking: nothing
 * reorients, nothing flips locally. The global gluing is rendered by tiling the
 * fundamental domain (a square of side L) seamlessly around the player — the
 * universal cover — so you never hit an edge or get teleported. On the Klein
 * bottle, every other column of copies is mirror-reflected, so you only learn
 * the topology by walking far and finding a landmark (and your trail) returned
 * reversed.
 */

const L = 30;             // fundamental-domain side
const K = 2;              // render (2K+1)^2 cells around the player
const EYE = 1.7;
const LOOK_SENS = 0.0035;
const MAX_PITCH = 1.35;
const TRAIL_MAX = 4000;
const TRAIL_SPACING = 0.4;

type MoveKey = 'fwd' | 'back' | 'left' | 'right';

interface Pillar { x: number; z: number; color: number; label: string }
const PILLARS: Pillar[] = [
  { x: -9, z: -7, color: 0xff5a5a, label: '1' },
  { x: 8, z: -9, color: 0x5ad1ff, label: '2' },
  { x: -6, z: 8, color: 0x8aff6a, label: '3' },
  { x: 10, z: 6, color: 0xffd24a, label: '4' },
  { x: 0, z: 0, color: 0xc08aff, label: '5' },
  { x: -12, z: 2, color: 0xff9a3d, label: '6' },
  { x: 4, z: 12, color: 0xff6ad5, label: '7' },
];

/** Number + arrow on a transparent tile; the arrow/number reverse under a
 *  mirror, which is exactly how you spot the Klein flip. */
function labelTexture(label: string, color: number): THREE.CanvasTexture {
  const s = 128;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  ctx.clearRect(0, 0, s, s);
  ctx.fillStyle = '#' + new THREE.Color(color).getHexString();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 6;
  ctx.font = `bold ${Math.round(s * 0.5)}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeText(label, s * 0.36, s * 0.5);
  ctx.fillText(label, s * 0.36, s * 0.5);
  // arrow ▶ to the right of the number
  ctx.beginPath();
  ctx.moveTo(s * 0.6, s * 0.34); ctx.lineTo(s * 0.84, s * 0.5); ctx.lineTo(s * 0.6, s * 0.66);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  const t = new THREE.CanvasTexture(cvs);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function dotTexture(): THREE.CanvasTexture {
  const s = 64;
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(cvs); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function floorTexture(): THREE.CanvasTexture {
  const s = 256;
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  ctx.fillStyle = '#11131c'; ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = '#283042'; ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(cvs);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set((2 * K + 3) * L / 3, (2 * K + 3) * L / 3);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface Built {
  group: THREE.Group;
  dispose: () => void;
}

/** One copy of the fundamental domain: pillars + a colored boundary square +
 *  a (shared) trail. */
function buildCell(trailGeo: THREE.BufferGeometry, dot: THREE.Texture): Built {
  const group = new THREE.Group();
  const disposers: (() => void)[] = [];

  for (const p of PILLARS) {
    const cellPillar = new THREE.Group();
    cellPillar.position.set(p.x, 0, p.z);
    const bodyGeo = new THREE.CylinderGeometry(0.8, 0.8, 3.2, 18);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: p.color, emissive: p.color, emissiveIntensity: 0.3, roughness: 0.5, side: THREE.DoubleSide,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.6;
    cellPillar.add(body);
    const tex = labelTexture(p.label, p.color);
    const decalGeo = new THREE.PlaneGeometry(1.5, 1.5);
    const decalMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
    const decal = new THREE.Mesh(decalGeo, decalMat);
    decal.position.set(0.82, 1.9, 0);
    decal.rotation.y = Math.PI / 2; // face +x
    cellPillar.add(decal);
    group.add(cellPillar);
    disposers.push(() => { bodyGeo.dispose(); bodyMat.dispose(); decalGeo.dispose(); decalMat.dispose(); tex.dispose(); });
  }

  // boundary square: left/right edges red (the "flip" gluing on a Klein
  // bottle), top/bottom edges blue.
  const h = L / 2, y = 0.04;
  const segs: [THREE.Vector3, THREE.Vector3, THREE.Color][] = [
    [new THREE.Vector3(-h, y, -h), new THREE.Vector3(-h, y, h), new THREE.Color(0xff4060)], // left
    [new THREE.Vector3(h, y, -h), new THREE.Vector3(h, y, h), new THREE.Color(0xff4060)],   // right
    [new THREE.Vector3(-h, y, -h), new THREE.Vector3(h, y, -h), new THREE.Color(0x4080ff)], // bottom
    [new THREE.Vector3(-h, y, h), new THREE.Vector3(h, y, h), new THREE.Color(0x4080ff)],   // top
  ];
  const lpos: number[] = [], lcol: number[] = [];
  for (const [a, c, col] of segs) {
    lpos.push(a.x, a.y, a.z, c.x, c.y, c.z);
    lcol.push(col.r, col.g, col.b, col.r, col.g, col.b);
  }
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(lpos, 3));
  edgeGeo.setAttribute('color', new THREE.Float32BufferAttribute(lcol, 3));
  const edgeMat = new THREE.LineBasicMaterial({ vertexColors: true });
  group.add(new THREE.LineSegments(edgeGeo, edgeMat));
  disposers.push(() => { edgeGeo.dispose(); edgeMat.dispose(); });

  // shared trail (base coords); appears in every cell, mirrored where the cell is.
  const trailMat = new THREE.PointsMaterial({
    size: 0.55, map: dot, color: 0xff3344, transparent: true, sizeAttenuation: true, depthWrite: false,
  });
  const pts = new THREE.Points(trailGeo, trailMat);
  pts.frustumCulled = false;
  group.add(pts);
  disposers.push(() => trailMat.dispose());

  return { group, dispose: () => disposers.forEach((d) => d()) };
}

export default function WrapWorld() {
  const [space, setSpace] = useState<'torus' | 'klein'>('torus');
  const [moveSpeed, setMoveSpeed] = useState(7);

  useAppHeader('Wrap-World', space === 'klein' ? 'flat Klein bottle' : 'flat torus');
  useAppExplainer(explainerText);

  const spaceRef = useRef(space);
  const speedRef = useRef(moveSpeed);
  useEffect(() => { spaceRef.current = space; }, [space]);
  useEffect(() => { speedRef.current = moveSpeed; }, [moveSpeed]);

  const ctxRef = useRef<{
    renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera;
    cells: { group: THREE.Group }[]; floor: THREE.Mesh;
    trailGeo: THREE.BufferGeometry; trailPos: Float32Array; trailCount: number; trailLast: THREE.Vector2 | null;
    cellDisposers: (() => void)[];
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const clockRef = useRef(new THREE.Clock());

  const pxRef = useRef(2);   // player world position
  const pzRef = useRef(2);
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const keysRef = useRef<Record<MoveKey, boolean>>({ fwd: false, back: false, left: false, right: false });
  const setKey = useCallback((k: MoveKey, v: boolean) => { keysRef.current[k] = v; }, []);

  const onMount = useCallback(({ scene, camera, renderer }: {
    scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer;
  }) => {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    scene.background = new THREE.Color(0x070912);
    scene.fog = new THREE.Fog(0x070912, L * 0.6, L * 2.6);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(0.4, 1, 0.3);
    scene.add(dir);

    const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.9, metalness: 0.0 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry((2 * K + 3) * L, (2 * K + 3) * L), floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const dot = dotTexture();
    const trailPos = new Float32Array(TRAIL_MAX * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    trailGeo.setDrawRange(0, 0);

    const cells: { group: THREE.Group }[] = [];
    const cellDisposers: (() => void)[] = [];
    for (let i = 0; i < (2 * K + 1) * (2 * K + 1); i++) {
      const built = buildCell(trailGeo, dot);
      built.group.matrixAutoUpdate = false;
      scene.add(built.group);
      cells.push({ group: built.group });
      cellDisposers.push(built.dispose);
    }

    camera.fov = 75; camera.near = 0.05; camera.far = 400; camera.updateProjectionMatrix();
    camera.up.set(0, 1, 0);

    ctxRef.current = {
      renderer, scene, camera, cells, floor,
      trailGeo, trailPos, trailCount: 0, trailLast: null, cellDisposers,
    };

    clockRef.current.start();
    const M = new THREE.Matrix4();
    const S = new THREE.Matrix4();
    const animate = () => {
      const c = ctxRef.current;
      if (!c) return;
      const dt = Math.min(0.05, clockRef.current.getDelta());
      const klein = spaceRef.current === 'klein';

      // Flat first-person movement.
      const k = keysRef.current;
      const fwd = (k.fwd ? 1 : 0) - (k.back ? 1 : 0);
      const strafe = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      if (fwd || strafe) {
        const v = speedRef.current * dt;
        const sy = Math.sin(yawRef.current), cy = Math.cos(yawRef.current);
        // forward = (sin yaw, -cos yaw); right = (cos yaw, sin yaw)
        pxRef.current += (fwd * sy + strafe * cy) * v;
        pzRef.current += (fwd * -cy + strafe * sy) * v;
      }
      const px = pxRef.current, pz = pzRef.current;

      // Camera.
      const yaw = yawRef.current, pitch = pitchRef.current, cp = Math.cos(pitch);
      const look = new THREE.Vector3(Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp);
      c.camera.position.set(px, EYE, pz);
      c.camera.lookAt(px + look.x, EYE + look.y, pz + look.z);
      c.floor.position.set(px, 0, pz);
      (c.floor.material as THREE.MeshStandardMaterial).map!.offset.set(px / 3, -pz / 3);

      // Tile the fundamental domain around the player.
      const I0 = Math.round(px / L), J0 = Math.round(pz / L);
      let idx = 0;
      for (let di = -K; di <= K; di++) {
        for (let dj = -K; dj <= K; dj++) {
          const I = I0 + di, J = J0 + dj;
          const sz = klein && (I & 1) ? -1 : 1;
          S.makeScale(1, 1, sz);
          M.makeTranslation(I * L, 0, J * L).multiply(S);
          c.cells[idx++].group.matrix.copy(M);
        }
      }

      // Trail in base (quotient) coords, so it recurs in every cell.
      const bxI = Math.round(px / L), bzJ = Math.round(pz / L);
      const bx = px - bxI * L;
      let bz = pz - bzJ * L;
      if (klein && (bxI & 1)) bz = -bz;
      if (!c.trailLast || c.trailLast.distanceTo(new THREE.Vector2(px, pz)) > TRAIL_SPACING) {
        if (c.trailCount >= TRAIL_MAX) { c.trailPos.copyWithin(0, 3); c.trailCount--; }
        const o = c.trailCount * 3;
        c.trailPos[o] = bx; c.trailPos[o + 1] = 0.08; c.trailPos[o + 2] = bz;
        c.trailCount++;
        c.trailLast = new THREE.Vector2(px, pz);
        (c.trailGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
        c.trailGeo.setDrawRange(0, c.trailCount);
      }

      c.renderer.render(c.scene, c.camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearTrail = useCallback(() => {
    const c = ctxRef.current; if (!c) return;
    c.trailCount = 0; c.trailLast = null; c.trailGeo.setDrawRange(0, 0);
  }, []);

  // Switching space clears the trail (its base coords differ under the new gluing).
  useEffect(() => { clearTrail(); }, [space, clearTrail]);

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
    if (c) {
      c.cellDisposers.forEach((d) => d());
      c.trailGeo.dispose();
      c.floor.geometry.dispose();
      ((c.floor.material as THREE.MeshStandardMaterial).map)?.dispose();
      (c.floor.material as THREE.Material).dispose();
    }
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
        Drag to look · WASD / arrows or the pad to walk · landmarks repeat — on the Klein bottle they come back mirrored
      </div>

      <ShellSettings>
        <Section title="Space" icon="⌗" defaultOpen>
          <Select
            label="Surface"
            options={[{ value: 'torus', label: 'Flat torus' }, { value: 'klein', label: 'Klein bottle' }]}
            value={space}
            onChange={(v) => setSpace(v as 'torus' | 'klein')}
          />
          <Slider label="Walk speed" value={moveSpeed} min={2} max={16} step={0.5} onChange={setMoveSpeed} format={(v) => v.toFixed(1)} />
          <div style={{ fontSize: 11, color: 'var(--cp-fg-dim)' }}>
            Red edges are glued with a flip on the Klein bottle; blue edges glue straight.
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
