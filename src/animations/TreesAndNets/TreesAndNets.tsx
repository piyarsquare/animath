import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import Canvas3D from '@/components/Canvas3D';
import Workspace from '../../chrome/workspace/Workspace';
import type { SectionDef, ViewDef } from '../../chrome/workspace/types';
import { Pills, Slider, Checkbox } from '../../components/ControlPanel';
import { Kicker } from '../../chrome/readouts';
import { usePersistentState } from '../../lib/usePersistentState';
import { buildAssociahedron, type Associahedron, type Triangulation } from './lib/associahedron';
import explainer from './EXPLAINER.md?raw';

const APP_ID = 'trees-and-nets';

const dkey = (d: [number, number]) => `${d[0]},${d[1]}`;

// ---------------------------------------------------------------------------
// Polygon / triangulation view (SVG) — the current tree, which you flip.
// ---------------------------------------------------------------------------
function PolygonTree({
  n, order, tri, flash, onFlip,
}: {
  n: number;
  order: number[];
  tri: Triangulation;
  flash: Set<string>;
  onFlip: (d: [number, number]) => void;
}) {
  const S = 360;
  const c = S / 2;
  const R = S * 0.38;
  const ang = (k: number) => -Math.PI / 2 + (2 * Math.PI * k) / n;
  const PX = (k: number) => c + R * Math.cos(ang(k));
  const PY = (k: number) => c + R * Math.sin(ang(k));

  const boundary = Array.from({ length: n }, (_, k) => `${PX(k)},${PY(k)}`).join(' ');

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
      <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" style={{ maxWidth: '100%', maxHeight: '100%' }}>
        <polygon points={boundary} fill="rgba(255,255,255,0.04)" stroke="var(--fg, #ccd)" strokeOpacity={0.35} strokeWidth={1.5} />
        {/* leaf labels — one per boundary edge (k,k+1), labeled by the cyclic order */}
        {Array.from({ length: n }, (_, k) => {
          const mx = (PX(k) + PX((k + 1) % n)) / 2;
          const my = (PY(k) + PY((k + 1) % n)) / 2;
          const ox = (mx - c) * 0.16;
          const oy = (my - c) * 0.16;
          return (
            <text key={k} x={mx + ox} y={my + oy} fontSize={15} fontFamily="monospace"
              fill="var(--accent, #cda434)" textAnchor="middle" dominantBaseline="middle">
              {order[k]}
            </text>
          );
        })}
        {/* diagonals — click to flip */}
        {tri.diagonals.map((d) => {
          const on = flash.has(dkey(d));
          return (
            <g key={dkey(d)} style={{ cursor: 'pointer' }} onClick={() => onFlip(d)}>
              <line x1={PX(d[0])} y1={PY(d[0])} x2={PX(d[1])} y2={PY(d[1])}
                stroke="transparent" strokeWidth={16} />
              <line x1={PX(d[0])} y1={PY(d[0])} x2={PX(d[1])} y2={PY(d[1])}
                stroke={on ? 'var(--accent, #ffd54a)' : 'var(--fg, #9fb)'}
                strokeWidth={on ? 4 : 2.5} strokeOpacity={on ? 1 : 0.8}
                style={{ transition: 'stroke 350ms, stroke-width 350ms' }} />
            </g>
          );
        })}
        {/* polygon vertices */}
        {Array.from({ length: n }, (_, k) => (
          <circle key={k} cx={PX(k)} cy={PY(k)} r={3} fill="var(--fg, #ccd)" fillOpacity={0.5} />
        ))}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Landscape minimap (Three.js) — the associahedron, your position on it.
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
  const [order, setOrder] = useState<number[]>(() => [0, 1, 2, 3, 4]);
  const [cur, setCur] = useState<number>(0);
  const [flash, setFlash] = useState<Set<string>>(new Set());

  const assoc = useMemo(() => buildAssociahedron(n), [n]);
  const spinRef = useRef(spin); spinRef.current = spin;

  // flip adjacency
  const adjacency = useMemo(() => {
    const adj: number[][] = assoc.vertices.map(() => []);
    for (const [i, j] of assoc.edges) { adj[i].push(j); adj[j].push(i); }
    return adj;
  }, [assoc]);
  const diagSets = useMemo(
    () => assoc.vertices.map((v) => new Set(v.diagonals.map(dkey))),
    [assoc],
  );

  useEffect(() => {
    setOrder(Array.from({ length: n }, (_, i) => i));
    setCur(0);
    setFlash(new Set());
  }, [n]);

  const prevDiags = useRef<Set<string>>(new Set());
  // flash the diagonals that appear when the current tree changes
  useEffect(() => {
    const now = diagSets[cur] ?? new Set<string>();
    const appeared = new Set<string>();
    for (const k of now) if (!prevDiags.current.has(k)) appeared.add(k);
    prevDiags.current = now;
    if (appeared.size) {
      setFlash(appeared);
      const t = setTimeout(() => setFlash(new Set()), 400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [cur, diagSets]);

  // flipping diagonal d → the unique flip-neighbor whose triangulation drops d
  const flip = useCallback((d: [number, number]) => {
    const k = dkey(d);
    const j = adjacency[cur].find((nb) => !diagSets[nb].has(k));
    if (j !== undefined) setCur(j);
  }, [adjacency, cur, diagSets]);

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
            The polygon shows your current <b>tree</b> (a triangulation; leaves are the
            edge labels). <b>Click a chord to flip it</b> — one diagonal swaps and you
            step to a neighboring tree. The map shows where that move lands you on the
            associahedron (the landscape of all trees for this order).
          </Kicker>
        </div>
      ),
    },
    {
      id: 'nav',
      title: 'Navigate',
      arch: 'drive',
      estHeight: 200,
      node: (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ fontFamily: 'var(--mono, monospace)', fontSize: 12, lineHeight: 1.6 }}>
            order ({order.join(' ')})<br />
            tree #{cur} · splits {splitText}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => rotateOrder(-1)} style={{ padding: '4px 10px', cursor: 'pointer' }}>↺ rotate</button>
            <button type="button" onClick={() => rotateOrder(1)} style={{ padding: '4px 10px', cursor: 'pointer' }}>rotate ↻</button>
          </div>
          <Kicker>
            Flip chords in the polygon, or click a node on the map, to walk tree→tree.
            "Rotate" turns the whole cyclic order (relabels the picture).
          </Kicker>
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
      title: 'Tree (flip a chord)',
      defaultRect: { x: 340, y: 16, w: 520, h: 560 },
      node: <PolygonTree n={n} order={order} tri={tri} flash={flash} onFlip={flip} />,
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
      subtitle={`walk the trees of one cyclic order`}
      sections={sections}
      views={views}
      explainer={explainer}
    />
  );
}
