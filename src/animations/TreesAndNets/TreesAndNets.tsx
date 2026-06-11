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
// Tree view (SVG): the ACTUAL tree dual to the triangulation. Internal nodes sit
// at the triangles, branches join adjacent triangles (the diagonals) and run out
// to the n leaves on the boundary. Click an internal branch to Flip (reconfigure
// the tree) or Cross (reverse that branch's arc → the cyclic order changes).
// ---------------------------------------------------------------------------
function PolygonTree({
  n, order, tri, flash, showPolygon, onChord,
}: {
  n: number;
  order: number[];
  tri: Triangulation;
  flash: Set<string>;
  showPolygon: boolean;
  onChord: (d: [number, number]) => void;
}) {
  const S = 360;
  const c = S / 2;
  const R = S * 0.34;
  const vAng = (k: number) => -Math.PI / 2 + (2 * Math.PI * k) / n;
  const eAng = (k: number) => -Math.PI / 2 + (2 * Math.PI * (k + 0.5)) / n;
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

  const ease = (x: number) => x * x * (3 - 2 * x);
  const labelPos = (v: number) => {
    const aFrom = eAng(from.indexOf(v));
    const aTo = eAng(order.indexOf(v));
    let diff = aTo - aFrom;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    const a = aFrom + diff * ease(t);
    const lr = R * 1.2;
    return [c + lr * Math.cos(a), c + lr * Math.sin(a)] as const;
  };

  // --- build the dual tree from the triangulation ---
  const tris = tri.triangles;
  const has = (tr: number[], x: number) => tr[0] === x || tr[1] === x || tr[2] === x;
  const centOf = (tr: number[]) => [
    (PX(tr[0]) + PX(tr[1]) + PX(tr[2])) / 3,
    (PY(tr[0]) + PY(tr[1]) + PY(tr[2])) / 3,
  ] as [number, number];
  const cent = tris.map(centOf);

  // Smoothly morph the internal nodes when the tree changes (a flip): each new
  // node starts from the nearest old node and glides to its place.
  const prevTriRef = useRef(tri);
  const [tt, setTt] = useState(1);
  const startRef = useRef<[number, number][]>(cent);
  useEffect(() => {
    if (prevTriRef.current.id === tri.id) return;
    const prevCent = prevTriRef.current.triangles.map(centOf);
    startRef.current = cent.map((p) => {
      let best = prevCent[0] ?? p;
      let bd = Infinity;
      for (const q of prevCent) {
        const dd = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
        if (dd < bd) { bd = dd; best = q; }
      }
      return best;
    });
    setTt(0);
    const start = performance.now();
    const dur = 420;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setTt(p);
      if (p < 1) raf = requestAnimationFrame(step);
      else prevTriRef.current = tri;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tri.id]);

  const e = ease(tt);
  const node = cent.map((p, i) => {
    const s = startRef.current[i] ?? p;
    return tt >= 1 ? p : ([s[0] + (p[0] - s[0]) * e, s[1] + (p[1] - s[1]) * e] as [number, number]);
  });

  const leafStub = (k: number): readonly [number, number] => {
    const a = eAng(k);
    return [c + R * 0.96 * Math.cos(a), c + R * 0.96 * Math.sin(a)];
  };
  const triOfEdge = (k: number) => tris.findIndex((tr) => has(tr, k) && has(tr, (k + 1) % n));
  const internal = tri.diagonals.map((d) => {
    const ts: number[] = [];
    tris.forEach((tr, i) => { if (has(tr, d[0]) && has(tr, d[1])) ts.push(i); });
    return { d, a: ts[0], b: ts[1] };
  });

  const boundary = Array.from({ length: n }, (_, k) => `${PX(k)},${PY(k)}`).join(' ');

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
      <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" style={{ maxWidth: '100%', maxHeight: '100%' }}>
        {showPolygon && (
          <>
            <polygon points={boundary} fill="none" stroke="var(--fg, #ccd)" strokeOpacity={0.18} strokeWidth={1.2} />
            {tri.diagonals.map((d) => (
              <line key={`c${dkey(d)}`} x1={PX(d[0])} y1={PY(d[0])} x2={PX(d[1])} y2={PY(d[1])}
                stroke="var(--fg, #9fb)" strokeOpacity={0.12} strokeWidth={1} strokeDasharray="3 4" />
            ))}
          </>
        )}

        {/* leaf branches: each triangle out to its boundary leaves */}
        {Array.from({ length: n }, (_, k) => {
          const ti = triOfEdge(k);
          if (ti < 0) return null;
          const [sx, sy] = leafStub(k);
          return <line key={`l${k}`} x1={node[ti][0]} y1={node[ti][1]} x2={sx} y2={sy}
            stroke="var(--fg, #aeb6c8)" strokeOpacity={0.85} strokeWidth={2} strokeLinecap="round" />;
        })}

        {/* internal branches: between adjacent triangles (the diagonals) — clickable */}
        {internal.map(({ d, a, b }) => {
          if (a == null || b == null) return null;
          const on = flash.has(dkey(d));
          return (
            <g key={`i${dkey(d)}`} style={{ cursor: 'pointer' }} onClick={() => onChord(d)}>
              <line x1={node[a][0]} y1={node[a][1]} x2={node[b][0]} y2={node[b][1]} stroke="transparent" strokeWidth={18} />
              <line x1={node[a][0]} y1={node[a][1]} x2={node[b][0]} y2={node[b][1]}
                stroke={on ? 'var(--accent, #ffd54a)' : 'var(--accent, #4fc4b6)'}
                strokeWidth={on ? 5 : 3.5} strokeOpacity={1} strokeLinecap="round"
                style={{ transition: 'stroke 350ms, stroke-width 350ms' }} />
            </g>
          );
        })}

        {/* internal nodes */}
        {node.map((p, i) => (
          <circle key={`n${i}`} cx={p[0]} cy={p[1]} r={4.5} fill="var(--bg, #1b1e27)" stroke="var(--fg, #cdd)" strokeWidth={1.5} />
        ))}

        {/* leaves + labels */}
        {order.map((v, k) => {
          const [sx, sy] = leafStub(k);
          const [lx, ly] = labelPos(v);
          return (
            <g key={`v${v}`}>
              <circle cx={sx} cy={sy} r={3.5} fill="var(--accent, #cda434)" />
              <text x={lx} y={ly} fontSize={15} fontFamily="monospace"
                fill="var(--accent, #cda434)" textAnchor="middle" dominantBaseline="middle">{v}</text>
            </g>
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

      // a "you are here" marker that glides smoothly to the current tree
      const markerGeom = new THREE.SphereGeometry(0.2, 20, 16); disposables.push(markerGeom);
      const markerMat = new THREE.MeshStandardMaterial({ color: 0xffd54a, emissive: 0xffd54a, emissiveIntensity: 0.5, roughness: 0.3 });
      disposables.push(markerMat);
      const marker = new THREE.Mesh(markerGeom, markerMat);
      marker.position.copy(pos[cur] ?? new THREE.Vector3());
      group.add(marker);

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
          if (nb.has(i)) { mat.color.setHex(0x3fb6a6); m.scale.setScalar(1.3); }
          else { mat.color.setHex(0x6b7790); m.scale.setScalar(1); }
        });
        const target = pos[cu] ?? marker.position;
        marker.position.lerp(target, 0.18); // glide to the current tree
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
  const [showPoly, setShowPoly] = usePersistentState<boolean>(`${APP_ID}:poly`, true);
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
      title: 'Display',
      arch: 'view',
      estHeight: 120,
      node: (
        <div style={{ display: 'grid', gap: 8 }}>
          <Checkbox label="Show triangulation behind tree" checked={showPoly} onChange={setShowPoly} />
          <Checkbox label="Auto-rotate map" checked={spin} onChange={setSpin} />
        </div>
      ),
    },
  ];

  const views: ViewDef[] = [
    {
      id: 'tree',
      title: mode === 'flip' ? 'Tree — click a chord to flip' : 'Tree — click a chord to cross',
      defaultRect: { x: 340, y: 16, w: 520, h: 560 },
      node: <PolygonTree n={n} order={order} tri={tri} flash={flash} showPolygon={showPoly} onChord={onChord} />,
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
