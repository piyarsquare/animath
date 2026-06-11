import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import Canvas3D from '@/components/Canvas3D';
import Workspace from '../../chrome/workspace/Workspace';
import type { SectionDef, ViewDef } from '../../chrome/workspace/types';
import { Pills, Checkbox } from '../../components/ControlPanel';
import { Kicker } from '../../chrome/readouts';
import { usePersistentState } from '../../lib/usePersistentState';
import { buildAssociahedron, type Associahedron, type Triangulation } from './lib/associahedron';
import { neighborOrder } from './lib/mosaic';
import explainer from './EXPLAINER.md?raw';

const APP_ID = 'trees-and-nets';
const dkey = (d: [number, number]) => `${d[0]},${d[1]}`;
const sameOrder = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i]);

// ---------------------------------------------------------------------------
// Polygon / triangulation view (SVG): the current tree. Click a chord to Flip
// (change the tree) or Cross (reverse that chord's arc → the cyclic order changes,
// and the leaf labels slide around the circle to their new places).
// ---------------------------------------------------------------------------
function PolygonTree({
  n, order, tri, flash, onChord,
}: {
  n: number;
  order: number[];
  tri: Triangulation;
  flash: Set<string>;
  onChord: (d: [number, number]) => void;
}) {
  const S = 360;
  const c = S / 2;
  const R = S * 0.37;
  const vAng = (k: number) => -Math.PI / 2 + (2 * Math.PI * k) / n; // polygon vertex angle
  const eAng = (k: number) => -Math.PI / 2 + (2 * Math.PI * (k + 0.5)) / n; // edge-midpoint angle
  const PX = (k: number) => c + R * Math.cos(vAng(k));
  const PY = (k: number) => c + R * Math.sin(vAng(k));

  // Animate leaf labels around the circle when the cyclic order changes.
  const prevRef = useRef(order);
  const [from, setFrom] = useState(order);
  const [t, setT] = useState(1);
  useEffect(() => {
    if (sameOrder(prevRef.current, order)) return;
    setFrom(prevRef.current);
    setT(0);
    const start = performance.now();
    const dur = 480;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setT(p);
      if (p < 1) raf = requestAnimationFrame(step);
      else prevRef.current = order;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [order]);

  const labelPos = (v: number) => {
    const iTo = order.indexOf(v);
    const iFrom = from.indexOf(v);
    let aFrom = eAng(iFrom);
    const aTo = eAng(iTo);
    // shortest angular path
    let diff = aTo - aFrom;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    const a = aFrom + diff * t;
    const lr = R * 1.16;
    return [c + lr * Math.cos(a), c + lr * Math.sin(a)];
  };

  const boundary = Array.from({ length: n }, (_, k) => `${PX(k)},${PY(k)}`).join(' ');

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
      <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" style={{ maxWidth: '100%', maxHeight: '100%' }}>
        <polygon points={boundary} fill="rgba(255,255,255,0.04)" stroke="var(--fg, #ccd)" strokeOpacity={0.35} strokeWidth={1.5} />
        {tri.diagonals.map((d) => {
          const on = flash.has(dkey(d));
          return (
            <g key={dkey(d)} style={{ cursor: 'pointer' }} onClick={() => onChord(d)}>
              <line x1={PX(d[0])} y1={PY(d[0])} x2={PX(d[1])} y2={PY(d[1])} stroke="transparent" strokeWidth={18} />
              <line x1={PX(d[0])} y1={PY(d[0])} x2={PX(d[1])} y2={PY(d[1])}
                stroke={on ? 'var(--accent, #ffd54a)' : 'var(--fg, #9fb)'}
                strokeWidth={on ? 4 : 2.5} strokeOpacity={on ? 1 : 0.8}
                style={{ transition: 'stroke 350ms, stroke-width 350ms' }} />
            </g>
          );
        })}
        {Array.from({ length: n }, (_, k) => (
          <circle key={k} cx={PX(k)} cy={PY(k)} r={3} fill="var(--fg, #ccd)" fillOpacity={0.5} />
        ))}
        {order.map((v) => {
          const [lx, ly] = labelPos(v);
          return (
            <text key={v} x={lx} y={ly} fontSize={15} fontFamily="monospace"
              fill="var(--accent, #cda434)" textAnchor="middle" dominantBaseline="middle">
              {v}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Landscape minimap (Three.js): the associahedron, your position on it.
// ---------------------------------------------------------------------------
const to3 = (p: number[]) => new THREE.Vector3(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0);
function landscapePositions(assoc: Associahedron): THREE.Vector3[] {
  const raw = assoc.vertices.map((v) => to3(v.point));
  const center = raw.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / Math.max(raw.length, 1));
  let maxR = 0;
  for (const p of raw) { p.sub(center); maxR = Math.max(maxR, p.length()); }
  const s = maxR > 1e-6 ? 2.2 / maxR : 1;
  for (const p of raw) p.multiplyScalar(s);
  return raw;
}

function Landscape({
  assoc, cur, neighbors, onWalk, spinRef,
}: {
  assoc: Associahedron;
  cur: number;
  neighbors: number[];
  onWalk: (i: number) => void;
  spinRef: React.MutableRefObject<boolean>;
}) {
  const curRef = useRef(cur); curRef.current = cur;
  const nbrRef = useRef(new Set(neighbors)); nbrRef.current = new Set(neighbors);
  const onWalkRef = useRef(onWalk); onWalkRef.current = onWalk;

  const onMount = useCallback(
    ({ scene, camera, renderer }: { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer }) => {
      scene.add(new THREE.AmbientLight(0xffffff, 0.85));
      const d = new THREE.DirectionalLight(0xffffff, 0.6); d.position.set(3, 5, 4); scene.add(d);
      camera.position.set(0, 0, 7);
      const group = new THREE.Group(); scene.add(group);
      const disposables: { dispose(): void }[] = [];

      const pos = landscapePositions(assoc);
      const ep: number[] = [];
      for (const [i, j] of assoc.edges) ep.push(pos[i].x, pos[i].y, pos[i].z, pos[j].x, pos[j].y, pos[j].z);
      const eg = new THREE.BufferGeometry();
      eg.setAttribute('position', new THREE.Float32BufferAttribute(ep, 3));
      disposables.push(eg);
      const em = new THREE.LineBasicMaterial({ color: 0x9aa3b6, transparent: true, opacity: 0.5 });
      disposables.push(em);
      group.add(new THREE.LineSegments(eg, em));

      const sg = new THREE.SphereGeometry(0.12, 16, 12); disposables.push(sg);
      const spheres: THREE.Mesh[] = [];
      pos.forEach((p, i) => {
        const m = new THREE.MeshStandardMaterial({ color: 0x6b7790, roughness: 0.5 });
        disposables.push(m);
        const mesh = new THREE.Mesh(sg, m); mesh.position.copy(p); mesh.userData.index = i;
        group.add(mesh); spheres.push(mesh);
      });

      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      let dragging = false, moved = false, lx = 0, ly = 0;
      const el = renderer.domElement;
      const down = (e: PointerEvent) => { dragging = true; moved = false; lx = e.clientX; ly = e.clientY; el.setPointerCapture(e.pointerId); };
      const move = (e: PointerEvent) => { if (!dragging) return; const dx = e.clientX - lx, dy = e.clientY - ly; if (Math.abs(dx) + Math.abs(dy) > 3) moved = true; lx = e.clientX; ly = e.clientY; group.rotation.y += dx * 0.01; group.rotation.x += dy * 0.01; };
      const up = (e: PointerEvent) => { dragging = false; try { el.releasePointerCapture(e.pointerId); } catch { /* ignore */ } };
      const click = (e: PointerEvent) => {
        if (moved) return;
        const r = el.getBoundingClientRect();
        ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
        raycaster.setFromCamera(ndc, camera);
        const hit = raycaster.intersectObjects(spheres, false)[0];
        if (hit) onWalkRef.current(hit.object.userData.index as number);
      };
      const wheel = (e: WheelEvent) => { e.preventDefault(); camera.position.z = THREE.MathUtils.clamp(camera.position.z * (1 + Math.sign(e.deltaY) * 0.1), 3, 16); };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      el.addEventListener('click', click as EventListener);
      el.addEventListener('wheel', wheel, { passive: false });

      let raf = 0;
      const animate = () => {
        if (!dragging && spinRef.current) group.rotation.y += 0.002;
        const cu = curRef.current; const nb = nbrRef.current;
        spheres.forEach((m, i) => {
          const mat = m.material as THREE.MeshStandardMaterial;
          if (i === cu) { mat.color.setHex(0xffd54a); m.scale.setScalar(2); }
          else if (nb.has(i)) { mat.color.setHex(0x3fb6a6); m.scale.setScalar(1.3); }
          else { mat.color.setHex(0x6b7790); m.scale.setScalar(1); }
        });
        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      };
      raf = requestAnimationFrame(animate);
      return () => {
        cancelAnimationFrame(raf);
        el.removeEventListener('pointerdown', down);
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
        el.removeEventListener('click', click as EventListener);
        el.removeEventListener('wheel', wheel);
        for (const x of disposables) x.dispose();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assoc],
  );

  return <Canvas3D onMount={onMount} />;
}

// ---------------------------------------------------------------------------
export default function TreesAndNets(): JSX.Element {
  const [n, setN] = usePersistentState<number>(`${APP_ID}:n`, 5);
  const [spin, setSpin] = usePersistentState<boolean>(`${APP_ID}:spin`, true);
  const [mode, setMode] = usePersistentState<'flip' | 'cross'>(`${APP_ID}:mode`, 'flip');
  const [order, setOrder] = useState<number[]>(() => [0, 1, 2, 3, 4]);
  const [cur, setCur] = useState<number>(0);
  const [flash, setFlash] = useState<Set<string>>(new Set());

  const assoc = useMemo(() => buildAssociahedron(n), [n]);
  const spinRef = useRef(spin); spinRef.current = spin;

  const adjacency = useMemo(() => {
    const adj: number[][] = assoc.vertices.map(() => []);
    for (const [i, j] of assoc.edges) { adj[i].push(j); adj[j].push(i); }
    return adj;
  }, [assoc]);
  const diagSets = useMemo(() => assoc.vertices.map((v) => new Set(v.diagonals.map(dkey))), [assoc]);

  useEffect(() => {
    setOrder(Array.from({ length: n }, (_, i) => i));
    setCur(0);
    setFlash(new Set());
  }, [n]);

  const prevDiags = useRef<Set<string>>(new Set());
  useEffect(() => {
    const now = diagSets[cur] ?? new Set<string>();
    const appeared = new Set<string>();
    for (const k of now) if (!prevDiags.current.has(k)) appeared.add(k);
    prevDiags.current = now;
    if (appeared.size) {
      setFlash(appeared);
      const t = setTimeout(() => setFlash(new Set()), 450);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [cur, diagSets]);

  const flip = useCallback((d: [number, number]) => {
    const k = dkey(d);
    const j = adjacency[cur].find((nb) => !diagSets[nb].has(k));
    if (j !== undefined) setCur(j);
  }, [adjacency, cur, diagSets]);

  // Cross the facet of chord d: reverse the arc it cuts off → the neighbor fiber.
  const cross = useCallback((d: [number, number]) => {
    setOrder((o) => neighborOrder(o, d[0], d[1]));
  }, []);

  const onChord = useCallback((d: [number, number]) => {
    if (mode === 'flip') flip(d); else cross(d);
  }, [mode, flip, cross]);

  const walk = useCallback((j: number) => setCur(j), []);
  const rotateOrder = useCallback((dir: number) => {
    setOrder((o) => (dir > 0 ? [...o.slice(1), o[0]] : [o[o.length - 1], ...o.slice(0, -1)]));
  }, []);

  const tri = assoc.vertices[cur];
  const neighbors = adjacency[cur] ?? [];

  const splitText = tri.diagonals.length
    ? tri.diagonals.map((d) => {
        const [a, b] = d; const side: number[] = [];
        for (let i = a; i < b; i++) side.push(order[i]);
        const other: number[] = []; for (let i = 0; i < n; i++) if (i < a || i >= b) other.push(order[i]);
        const sm = side.length <= other.length ? side : other;
        return `{${sm.join('')}}`;
      }).join(' ')
    : '—';

  const sections: SectionDef[] = [
    {
      id: 'leaves',
      title: 'Leaves',
      arch: 'subject',
      estHeight: 150,
      node: (
        <div style={{ display: 'grid', gap: 10 }}>
          <Pills<number>
            label="Leaf count (n)"
            value={n}
            onChange={setN}
            options={[5, 6, 7, 8].map((k) => ({ value: k, label: String(k) }))}
          />
          <Kicker>
            The polygon is your current <b>tree</b> (a triangulation; leaves are the
            edge labels). The map on the right is the <b>landscape</b> of all trees for
            this cyclic order — your tree is gold, one-flip neighbors are teal.
          </Kicker>
        </div>
      ),
    },
    {
      id: 'nav',
      title: 'Navigate',
      arch: 'drive',
      estHeight: 230,
      node: (
        <div style={{ display: 'grid', gap: 10 }}>
          <Pills<'flip' | 'cross'>
            label="Click a chord to…"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'flip', label: 'Flip tree' },
              { value: 'cross', label: 'Cross order' },
            ]}
          />
          <Kicker>
            <b>Flip</b> swaps that diagonal — you step to a neighbor tree (same cyclic
            order), and the map dot moves. <b>Cross</b> reverses the leaves on that
            chord's arc — you step into the neighbor cyclic-order fiber, and the labels
            slide around the circle. So flips walk the tree; crossings walk the order.
          </Kicker>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => rotateOrder(-1)} style={{ padding: '4px 10px', cursor: 'pointer' }}>↺ rotate</button>
            <button type="button" onClick={() => rotateOrder(1)} style={{ padding: '4px 10px', cursor: 'pointer' }}>rotate ↻</button>
          </div>
        </div>
      ),
    },
    {
      id: 'state',
      title: 'Where you are',
      arch: 'readout',
      estHeight: 120,
      node: (
        <div style={{ fontFamily: 'var(--mono, monospace)', fontSize: 12, lineHeight: 1.7 }}>
          order&nbsp;&nbsp;({order.join(' ')})<br />
          tree&nbsp;&nbsp;&nbsp;#{cur}<br />
          splits&nbsp;{splitText}
        </div>
      ),
    },
    {
      id: 'view',
      title: 'Map',
      arch: 'view',
      estHeight: 90,
      node: <Checkbox label="Auto-rotate map" checked={spin} onChange={setSpin} />,
    },
  ];

  const views: ViewDef[] = [
    {
      id: 'tree',
      title: mode === 'flip' ? 'Tree — click a chord to flip' : 'Tree — click a chord to cross',
      defaultRect: { x: 340, y: 16, w: 520, h: 560 },
      node: <PolygonTree n={n} order={order} tri={tri} flash={flash} onChord={onChord} />,
    },
    {
      id: 'landscape',
      title: `Landscape — K${n - 1}`,
      defaultRect: { x: 876, y: 16, w: 520, h: 560 },
      node: (
        <Landscape
          key={`land-${n}`}
          assoc={assoc}
          cur={cur}
          neighbors={neighbors}
          onWalk={walk}
          spinRef={spinRef}
        />
      ),
    },
  ];

  return (
    <Workspace
      appId={APP_ID}
      title="Trees and Nets"
      subtitle={'walk the trees and the orders'}
      sections={sections}
      views={views}
      explainer={explainer}
    />
  );
}
