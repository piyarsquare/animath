import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import Canvas3D from '@/components/Canvas3D';
import Workspace from '../../chrome/workspace/Workspace';
import type { SectionDef, ViewDef, LayoutDef, WorkspaceMode } from '../../chrome/workspace/types';
import { Pills, Checkbox, Slider } from '../../components/ControlPanel';
import { Kicker } from '../../chrome/readouts';
import { usePersistentState } from '../../lib/usePersistentState';
import { buildAssociahedron, type Triangulation } from './lib/associahedron';
import { neighborOrder, canonicalKey } from './lib/mosaic';
import { preset, presetNames, type DistanceMatrix, type PresetName } from './lib/metric';
import { computeNeighborJoining, njLeafPathInfo } from './lib/neighborJoining';
import { solveSplitWeights, computeLevyPachterOrdering } from './lib/splitWeights';
import { buildSplitGraph } from './lib/splitGraph';
import { MatrixEditor } from './views/MatrixEditor';
import { NJTreeView, SplitNetworkView, SplitGraphView, SplitWeightsList, type Highlight } from './views/NetViews';
import explainer from './EXPLAINER.md?raw';

// Persistence namespace. Bumped (was 'trees-and-nets') when the app was
// re-centered on the distance matrix: the workspace persists window/layout state
// under ws:<APP_ID> and keeps existing records over defaultLayoutId, so a new
// namespace is what makes returning users land on the matrix-first 'nets' layout
// instead of stale pre-re-centering workspace state.
const APP_ID = 'trees-and-nets-2';
const dkey = (d: [number, number]) => `${d[0]},${d[1]}`;
const sameOrder = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i]);

const C_FLIP = '#3fb6a6';   // associahedron (tree) move
const C_CROSS = '#e08a3c';  // (n-3)-cube (order) move

// one split key (min side, sorted values) of diagonal d under order ord
function splitKey(d: [number, number], ord: number[], n: number): string {
  const side: number[] = [];
  for (let i = d[0]; i < d[1]; i++) side.push(ord[i]);
  const other: number[] = [];
  for (let i = 0; i < n; i++) if (i < d[0] || i >= d[1]) other.push(ord[i]);
  return (side.length <= other.length ? side : other).slice().sort((x, y) => x - y).join(',');
}
// labeled tree = sorted set of split keys
function leafTree(diags: [number, number][], ord: number[], n: number): string {
  return diags.map((d) => `{${splitKey(d, ord, n)}}`).sort().join('|');
}

// =========================================================================
// Disk view: polygon + triangulation and/or the dual tree, leaves labeled by
// the cyclic order. Click a chord/branch → onChord. Used for three windows
// (tree-only, polygon-only, overlay).
// =========================================================================
function DiskView({
  n, order, tri, flash, showTree, showPolygon, onChord,
}: {
  n: number; order: number[]; tri: Triangulation; flash: Set<string>;
  showTree: boolean; showPolygon: boolean; onChord: (d: [number, number]) => void;
}) {
  const S = 360, c = S / 2, R = S * 0.34;
  const vAng = (k: number) => -Math.PI / 2 + (2 * Math.PI * k) / n;
  const eAng = (k: number) => -Math.PI / 2 + (2 * Math.PI * (k + 0.5)) / n;
  const PX = (k: number) => c + R * Math.cos(vAng(k));
  const PY = (k: number) => c + R * Math.sin(vAng(k));
  const ease = (x: number) => x * x * (3 - 2 * x);

  // label slide on order change
  const prevRef = useRef(order);
  const [fromO, setFromO] = useState(order);
  const [t, setT] = useState(1);
  useEffect(() => {
    if (sameOrder(prevRef.current, order)) return;
    setFromO(prevRef.current); setT(0);
    const s = performance.now(); let raf = 0;
    const step = (now: number) => { const p = Math.min(1, (now - s) / 480); setT(p); if (p < 1) raf = requestAnimationFrame(step); else prevRef.current = order; };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [order]);
  const labelPos = (v: number) => {
    const aF = eAng(fromO.indexOf(v)), aT = eAng(order.indexOf(v));
    let d = aT - aF; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    const a = aF + d * ease(t), lr = R * 1.2;
    return [c + lr * Math.cos(a), c + lr * Math.sin(a)] as const;
  };

  // dual tree centroids + smooth morph (proper bijection — no collapse)
  const tris = tri.triangles;
  const has = (tr: number[], x: number) => tr[0] === x || tr[1] === x || tr[2] === x;
  const sameTri = (a: number[], b: number[]) => a.every((x) => has(b, x));
  const centOf = (tr: number[]) => [(PX(tr[0]) + PX(tr[1]) + PX(tr[2])) / 3, (PY(tr[0]) + PY(tr[1]) + PY(tr[2])) / 3] as [number, number];
  const cent = tris.map(centOf);
  const prevTriRef = useRef(tri);
  const [tt, setTt] = useState(1);
  const startRef = useRef<[number, number][]>(cent);
  useEffect(() => {
    if (prevTriRef.current.id === tri.id) return;
    const prevTris = prevTriRef.current.triangles;
    const used = new Array(prevTris.length).fill(false);
    const start: ([number, number] | null)[] = tris.map((ct) => {
      const j = prevTris.findIndex((pt, k) => !used[k] && sameTri(ct, pt));
      if (j >= 0) { used[j] = true; return centOf(prevTris[j]); }
      return null;
    });
    start.forEach((s, i) => {
      if (s) return;
      let best = -1, bd = Infinity;
      prevTris.forEach((pt, k) => { if (used[k]) return; const q = centOf(pt); const dd = (cent[i][0] - q[0]) ** 2 + (cent[i][1] - q[1]) ** 2; if (dd < bd) { bd = dd; best = k; } });
      if (best >= 0) { used[best] = true; start[i] = centOf(prevTris[best]); } else start[i] = cent[i];
    });
    startRef.current = start.map((s, i) => s ?? cent[i]);
    setTt(0); const s0 = performance.now(); let raf = 0;
    const step = (now: number) => { const p = Math.min(1, (now - s0) / 420); setTt(p); if (p < 1) raf = requestAnimationFrame(step); else prevTriRef.current = tri; };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tri.id]);
  const e = ease(tt);
  const node = cent.map((p, i) => { const s = startRef.current[i] ?? p; return tt >= 1 ? p : [s[0] + (p[0] - s[0]) * e, s[1] + (p[1] - s[1]) * e] as [number, number]; });

  const leafStub = (k: number) => { const a = eAng(k); return [c + R * 0.96 * Math.cos(a), c + R * 0.96 * Math.sin(a)] as const; };
  const triOfEdge = (k: number) => tris.findIndex((tr) => has(tr, k) && has(tr, (k + 1) % n));
  const internal = tri.diagonals.map((d) => { const ts: number[] = []; tris.forEach((tr, i) => { if (has(tr, d[0]) && has(tr, d[1])) ts.push(i); }); return { d, a: ts[0], b: ts[1] }; });
  const boundary = Array.from({ length: n }, (_, k) => `${PX(k)},${PY(k)}`).join(' ');

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
      <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" style={{ maxWidth: '100%', maxHeight: '100%' }}>
        <polygon points={boundary} fill={showPolygon ? 'rgba(255,255,255,0.04)' : 'none'} stroke="var(--fg, #ccd)" strokeOpacity={showPolygon ? 0.3 : 0.14} strokeWidth={1.3} />
        {showPolygon && tri.diagonals.map((d) => {
          const on = flash.has(dkey(d));
          return (
            <g key={`c${dkey(d)}`} style={{ cursor: 'pointer' }} onClick={() => onChord(d)}>
              <line x1={PX(d[0])} y1={PY(d[0])} x2={PX(d[1])} y2={PY(d[1])} stroke="transparent" strokeWidth={16} />
              <line x1={PX(d[0])} y1={PY(d[0])} x2={PX(d[1])} y2={PY(d[1])} stroke={on ? '#ffd54a' : 'var(--fg, #9fb)'} strokeWidth={on ? 4 : 2.4} strokeOpacity={showTree ? 0.45 : 0.85} style={{ transition: 'stroke 300ms' }} />
            </g>
          );
        })}
        {showTree && (
          <>
            {Array.from({ length: n }, (_, k) => { const ti = triOfEdge(k); if (ti < 0) return null; const [sx, sy] = leafStub(k); return <line key={`l${k}`} x1={node[ti][0]} y1={node[ti][1]} x2={sx} y2={sy} stroke="var(--fg, #aeb6c8)" strokeOpacity={0.85} strokeWidth={2} strokeLinecap="round" />; })}
            {internal.map(({ d, a, b }) => { if (a == null || b == null) return null; const on = flash.has(dkey(d)); return (
              <g key={`i${dkey(d)}`} style={{ cursor: 'pointer' }} onClick={() => onChord(d)}>
                <line x1={node[a][0]} y1={node[a][1]} x2={node[b][0]} y2={node[b][1]} stroke="transparent" strokeWidth={18} />
                <line x1={node[a][0]} y1={node[a][1]} x2={node[b][0]} y2={node[b][1]} stroke={on ? '#ffd54a' : C_FLIP} strokeWidth={on ? 5 : 3.5} strokeLinecap="round" style={{ transition: 'stroke 300ms' }} />
              </g>
            ); })}
            {node.map((p, i) => (<circle key={`n${i}`} cx={p[0]} cy={p[1]} r={4.5} fill="var(--bg, #1b1e27)" stroke="var(--fg, #cdd)" strokeWidth={1.5} />))}
          </>
        )}
        {order.map((v, k) => { const [sx, sy] = leafStub(k); const [lx, ly] = labelPos(v); return (
          <g key={`v${v}`}>{showTree && <circle cx={sx} cy={sy} r={3.5} fill="var(--accent, #cda434)" />}<text x={lx} y={ly} fontSize={15} fontFamily="monospace" fill="var(--accent, #cda434)" textAnchor="middle" dominantBaseline="middle">{v}</text></g>
        ); })}
      </svg>
    </div>
  );
}

// =========================================================================
// Generic 3D graph (one fiber). Nodes pre-positioned; current node glides a gold
// marker; color fades with graph-distance from current up to `radius`.
// =========================================================================
function Graph3D({
  positions, edges, adjacency, currentRef, radiusRef, accent, onPick, spinRef,
}: {
  positions: THREE.Vector3[]; edges: [number, number][]; adjacency: number[][];
  currentRef: React.MutableRefObject<number>; radiusRef: React.MutableRefObject<number>;
  accent: number; onPick: (i: number) => void; spinRef: React.MutableRefObject<boolean>;
}) {
  const onPickRef = useRef(onPick); onPickRef.current = onPick;
  const onMount = useCallback(({ scene, camera, renderer }: { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer }) => {
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(3, 5, 4); scene.add(dl);
    let camDist = 7; camera.position.set(0, 0, camDist);
    const group = new THREE.Group(); scene.add(group);
    const disposables: { dispose(): void }[] = [];

    const ep: number[] = [];
    for (const [i, j] of edges) ep.push(positions[i].x, positions[i].y, positions[i].z, positions[j].x, positions[j].y, positions[j].z);
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute(ep, 3)); disposables.push(eg);
    const em = new THREE.LineBasicMaterial({ color: 0x9aa3b6, transparent: true, opacity: 0.45 }); disposables.push(em);
    group.add(new THREE.LineSegments(eg, em));

    const sg = new THREE.SphereGeometry(0.13, 16, 12); disposables.push(sg);
    const spheres: THREE.Mesh[] = [];
    positions.forEach((p, i) => { const m = new THREE.MeshStandardMaterial({ color: 0x6b7790, roughness: 0.5 }); disposables.push(m); const mesh = new THREE.Mesh(sg, m); mesh.position.copy(p); mesh.userData.index = i; group.add(mesh); spheres.push(mesh); });

    const mg = new THREE.SphereGeometry(0.22, 20, 16); disposables.push(mg);
    const mm = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.5, roughness: 0.3 }); disposables.push(mm);
    const marker = new THREE.Mesh(mg, mm); marker.position.copy(positions[currentRef.current] ?? new THREE.Vector3()); group.add(marker);

    // BFS distances from current, recomputed when current changes
    let dist: number[] = []; let lastCur = -1;
    const recompute = (src: number) => { dist = new Array(positions.length).fill(Infinity); if (src < 0) return; dist[src] = 0; const q = [src]; while (q.length) { const u = q.shift() as number; for (const w of adjacency[u]) if (dist[w] === Infinity) { dist[w] = dist[u] + 1; q.push(w); } } };

    const raycaster = new THREE.Raycaster(); const ndc = new THREE.Vector2();
    let dragging = false, moved = false, lx = 0, ly = 0; const el = renderer.domElement;
    const down = (e2: PointerEvent) => { dragging = true; moved = false; lx = e2.clientX; ly = e2.clientY; el.setPointerCapture(e2.pointerId); };
    const move = (e2: PointerEvent) => { if (!dragging) return; const dx = e2.clientX - lx, dy = e2.clientY - ly; if (Math.abs(dx) + Math.abs(dy) > 3) moved = true; lx = e2.clientX; ly = e2.clientY; group.rotation.y += dx * 0.01; group.rotation.x += dy * 0.01; };
    const up = (e2: PointerEvent) => { dragging = false; try { el.releasePointerCapture(e2.pointerId); } catch { /* ignore */ } };
    const click = (e2: PointerEvent) => { if (moved) return; const r = el.getBoundingClientRect(); ndc.x = ((e2.clientX - r.left) / r.width) * 2 - 1; ndc.y = -((e2.clientY - r.top) / r.height) * 2 + 1; raycaster.setFromCamera(ndc, camera); const hit = raycaster.intersectObjects(spheres, false)[0]; if (hit) onPickRef.current(hit.object.userData.index as number); };
    const wheel = (e2: WheelEvent) => { e2.preventDefault(); camDist = THREE.MathUtils.clamp(camDist * (1 + Math.sign(e2.deltaY) * 0.1), 3, 18); };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('click', click as EventListener); el.addEventListener('wheel', wheel, { passive: false });

    const accentCol = new THREE.Color(accent);
    let raf = 0;
    const animate = () => {
      if (!dragging && spinRef.current) group.rotation.y += 0.0018;
      camera.position.z = camDist;
      const cu = currentRef.current; if (cu !== lastCur) { recompute(cu); lastCur = cu; }
      const rad = radiusRef.current;
      spheres.forEach((m, i) => {
        const mat = m.material as THREE.MeshStandardMaterial; const d = dist[i] ?? Infinity;
        if (i === cu) { m.visible = true; mat.color.copy(accentCol); m.scale.setScalar(0.1); }
        else if (d <= rad) { m.visible = true; const f = 1 - (d - 1) / Math.max(rad, 1) * 0.6; mat.color.copy(accentCol).multiplyScalar(0.45 * f).addScalar(0); mat.color.lerp(new THREE.Color(0x6b7790), 1 - f); m.scale.setScalar(d === 1 ? 1.3 : 1); }
        else { m.visible = false; }
      });
      const target = positions[cu] ?? marker.position; marker.position.lerp(target, 0.18);
      renderer.render(scene, camera); raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(raf); el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('click', click as EventListener); el.removeEventListener('wheel', wheel); for (const d of disposables) d.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions, edges, adjacency, accent]);
  return <Canvas3D onMount={onMount} />;
}

// project an array of R^d points to 3 dims, centered + scaled
function embed(pts: number[][]): THREE.Vector3[] {
  const v = pts.map((p) => new THREE.Vector3(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0));
  const ctr = v.reduce((a, p) => a.add(p.clone()), new THREE.Vector3()).multiplyScalar(1 / Math.max(v.length, 1));
  let mr = 0; for (const p of v) { p.sub(ctr); mr = Math.max(mr, p.length()); }
  const s = mr > 1e-6 ? 2.2 / mr : 1; for (const p of v) p.multiplyScalar(s);
  return v;
}

// =========================================================================
export default function TreesAndNets(): JSX.Element {
  // ---- distance metric: the new center of the app (everything derives from it) ----
  const [n, setN] = usePersistentState<number>(`${APP_ID}:n`, 5);
  const [presetName, setPresetName] = usePersistentState<PresetName>(`${APP_ID}:preset`, 'tree');
  const [matrix, setMatrix] = useState<DistanceMatrix>(() => preset(n, presetName));
  useEffect(() => { setMatrix(preset(n, presetName)); setHl(null); }, [n, presetName]);
  const setCell = useCallback((i: number, j: number, value: number) => {
    setMatrix((prev) => { const d = prev.d.map((row) => row.slice()); d[i][j] = value; d[j][i] = value; return { leaves: prev.leaves, d }; });
  }, []);
  const nj = useMemo(() => computeNeighborJoining(matrix), [matrix]);
  const lpOrder = useMemo(() => computeLevyPachterOrdering(matrix), [matrix]);
  const weightedSplits = useMemo(() => solveSplitWeights(matrix, lpOrder), [matrix, lpOrder]);
  const treeSplitKeys = useMemo(() => new Set(nj.splitKeys), [nj]);
  const splitGraph = useMemo(() => buildSplitGraph(weightedSplits, lpOrder, n), [weightedSplits, lpOrder, n]);

  // ---- shared selection (links matrix ↔ tree ↔ net ↔ weights) + view mode ----
  const [appMode, setAppMode] = usePersistentState<'nets' | 'fibers'>(`${APP_ID}:appmode`, 'nets');
  const [hl, setHl] = useState<Highlight>(null);

  // ---- fibers: the associahedron × cube explorer (now a secondary layout) ----
  const [mode, setMode] = usePersistentState<'flip' | 'cross'>(`${APP_ID}:mode`, 'flip');
  const [showPoly, setShowPoly] = usePersistentState<boolean>(`${APP_ID}:poly`, true);
  const [spin, setSpin] = usePersistentState<boolean>(`${APP_ID}:spin`, true);
  const [radius, setRadius] = usePersistentState<number>(`${APP_ID}:radius`, 2);
  const [order, setOrder] = useState<number[]>(() => [0, 1, 2, 3, 4]);
  const [cur, setCur] = useState<number>(0);
  const [flash, setFlash] = useState<Set<string>>(new Set());

  const assoc = useMemo(() => buildAssociahedron(n), [n]);
  const adjacency = useMemo(() => { const a: number[][] = assoc.vertices.map(() => []); for (const [i, j] of assoc.edges) { a[i].push(j); a[j].push(i); } return a; }, [assoc]);
  const diagSets = useMemo(() => assoc.vertices.map((v) => new Set(v.diagonals.map(dkey))), [assoc]);

  useEffect(() => { setOrder(Array.from({ length: n }, (_, i) => i)); setCur(0); setFlash(new Set()); }, [n]);

  const prevDiags = useRef<Set<string>>(new Set());
  useEffect(() => { const now = diagSets[cur] ?? new Set<string>(); const ap = new Set<string>(); for (const k of now) if (!prevDiags.current.has(k)) ap.add(k); prevDiags.current = now; if (ap.size) { setFlash(ap); const t = setTimeout(() => setFlash(new Set()), 450); return () => clearTimeout(t); } return undefined; }, [cur, diagSets]);

  // FLIP: change tree, keep order
  const flip = useCallback((d: [number, number]) => { const k = dkey(d); const j = adjacency[cur].find((nb) => !diagSets[nb].has(k)); if (j !== undefined) setCur(j); }, [adjacency, cur, diagSets]);
  // TWIST: keep labeled tree, change order (reverse the edge's arc, re-embed)
  const twist = useCallback((d: [number, number]) => {
    const treeKey = leafTree(assoc.vertices[cur].diagonals, order, n);
    const o2 = neighborOrder(order, d[0], d[1]);
    const c2 = assoc.vertices.findIndex((v) => leafTree(v.diagonals, o2, n) === treeKey);
    if (c2 >= 0) { setCur(c2); setOrder(o2); }
  }, [assoc, cur, order, n]);
  const onChord = useCallback((d: [number, number]) => { if (mode === 'flip') flip(d); else twist(d); }, [mode, flip, twist]);

  // navigation from the fibers
  const pickTree = useCallback((j: number) => setCur(j), []);
  const radiusRef = useRef(radius); radiusRef.current = radius;
  const spinRef = useRef(spin); spinRef.current = spin;

  // Guard the current index against an n change (assoc shrank before the reset effect runs).
  const curSafe = cur < assoc.vertices.length ? cur : 0;
  const tri = assoc.vertices[curSafe];
  const treeKey = leafTree(tri.diagonals, order, n);

  // ----- associahedron fiber (fixed structure; current = cur) -----
  const assocPositions = useMemo(() => embed(assoc.vertices.map((v) => v.point)), [assoc]);

  // ----- (n-3)-cube fiber: orders compatible with the current tree -----
  const cube = useMemo(() => {
    const dim = Math.max(n - 3, 0);
    const axisKeys = assoc.vertices[curSafe].diagonals.map((d) => splitKey(d, order, n));
    const twistAxis = (cu: number, o: number[], a: number) => {
      const dd = assoc.vertices[cu].diagonals.find((x) => splitKey(x, o, n) === axisKeys[a]);
      if (!dd) return null;
      const o2 = neighborOrder(o, dd[0], dd[1]);
      const c2 = assoc.vertices.findIndex((v) => leafTree(v.diagonals, o2, n) === treeKey);
      return c2 >= 0 ? { cu: c2, o: o2 } : null;
    };
    const nodes = new Map<string, { cu: number; o: number[]; bits: number[] }>();
    const start = { cu: curSafe, o: order, bits: new Array(dim).fill(0) };
    nodes.set(canonicalKey(order), start);
    const q = [start];
    while (q.length) { const nd = q.shift() as typeof start; for (let a = 0; a < dim; a++) { const t = twistAxis(nd.cu, nd.o, a); if (!t) continue; const ck = canonicalKey(t.o); if (!nodes.has(ck)) { const bits = nd.bits.slice(); bits[a] ^= 1; nodes.set(ck, { ...t, bits }); q.push(nodes.get(ck) as typeof start); } } }
    const arr = [...nodes.values()];
    const edges: [number, number][] = [];
    const adj: number[][] = arr.map(() => []);
    for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) { let h = 0; for (let a = 0; a < dim; a++) h += arr[i].bits[a] ^ arr[j].bits[a]; if (h === 1) { edges.push([i, j]); adj[i].push(j); adj[j].push(i); } }
    const positions = embed(arr.map((nd) => nd.bits.length ? nd.bits.map((b) => b - 0.5) : [0]));
    return { arr, edges, adj, positions };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeKey, n]);

  // current index within each fiber
  const cubeCur = useMemo(() => { const ck = canonicalKey(order); return Math.max(0, cube.arr.findIndex((nd) => canonicalKey(nd.o) === ck)); }, [cube, order]);
  const assocCurRef = useRef(curSafe); assocCurRef.current = curSafe;
  const cubeCurRef = useRef(cubeCur); cubeCurRef.current = cubeCur;

  const pickCube = useCallback((i: number) => { const nd = cube.arr[i]; if (nd) { setCur(nd.cu); setOrder(nd.o); } }, [cube]);

  const splitText = tri.diagonals.length ? tri.diagonals.map((d) => `{${splitKey(d, order, n)}}`).join(' ') : '—';

  // Selection detail: the matrix→tree bridge (pair → tree path length vs actual)
  // and split detail (weight, and whether it is also an edge of the NJ tree).
  let connectNode: JSX.Element;
  if (hl?.kind === 'pair') {
    const a = matrix.leaves[hl.i];
    const b = matrix.leaves[hl.j];
    const actual = matrix.d[hl.i][hl.j];
    const treeDist = njLeafPathInfo(nj, a, b).dist;
    const delta = treeDist - actual;
    connectNode = (
      <div style={{ fontFamily: 'var(--mono, monospace)', fontSize: 12, lineHeight: 1.7 }}>
        pair&nbsp;&nbsp;<b style={{ color: '#ffd54a' }}>{a}–{b}</b><br />
        actual&nbsp;&nbsp;{actual.toFixed(2)}<br />
        tree&nbsp;&nbsp;&nbsp;&nbsp;{treeDist.toFixed(2)}&nbsp;&nbsp;(Δ {delta >= 0 ? '+' : ''}{delta.toFixed(2)})
      </div>
    );
  } else if (hl?.kind === 'split') {
    const w = weightedSplits.find((s) => s.key === hl.key)?.weight;
    connectNode = (
      <div style={{ fontFamily: 'var(--mono, monospace)', fontSize: 12, lineHeight: 1.7 }}>
        split&nbsp;&nbsp;<b style={{ color: '#ffd54a' }}>{hl.key}</b><br />
        weight&nbsp;{w !== undefined ? w.toFixed(2) : '—'}<br />
        {treeSplitKeys.has(hl.key) ? 'an edge of the NJ tree' : 'a net split not in the tree'}
      </div>
    );
  } else {
    connectNode = (
      <Kicker>Click a <b>matrix cell</b> to trace that pair through the tree (tree vs. actual distance), or click a{' '}
        <b>split</b> — its weight bar, its net chord, or its tree edge — to light it up everywhere.</Kicker>
    );
  }

  const netsSections: SectionDef[] = [
    {
      id: 'distances', title: 'Distances', arch: 'subject', estHeight: 380,
      node: (
        <div style={{ display: 'grid', gap: 10 }}>
          <Pills<number> label="Leaves (n)" value={n} onChange={setN} options={[5, 6, 7, 8, 9].map((k) => ({ value: k, label: String(k) }))} />
          <Pills<PresetName> label="Preset metric" value={presetName} onChange={setPresetName} options={presetNames(n).map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))} />
          <MatrixEditor matrix={matrix} onCell={setCell} highlight={hl} onSelect={setHl} />
          <Kicker>Edit any distance — the <b>tree</b>, the <b>net</b>, and the weights all recompute. Click a cell to
            trace that pair in the tree. <b>Tree</b> preset = clean nesting; <b>Conflict</b> = net-like.</Kicker>
        </div>
      ),
    },
    { id: 'connect', title: 'Selection', arch: 'readout', estHeight: 130, node: connectNode },
    {
      id: 'weights', title: 'Split weights', arch: 'readout', estHeight: 240,
      node: (
        <div style={{ display: 'grid', gap: 8 }}>
          <SplitWeightsList splits={weightedSplits} treeSplitKeys={treeSplitKeys} highlight={hl} onSelect={setHl} />
          <Kicker>Non-negative weights of the circular splits (the net's chords).{' '}
            <b style={{ color: C_FLIP }}>△ tree</b> marks splits that are also edges of the Neighbor-Joining tree.</Kicker>
        </div>
      ),
    },
  ];

  const fibersSections: SectionDef[] = [
    {
      id: 'nav', title: 'Move', arch: 'drive', estHeight: 170,
      node: (
        <div style={{ display: 'grid', gap: 10 }}>
          <Pills<'flip' | 'cross'> label="Click an edge to…" value={mode} onChange={setMode} options={[{ value: 'flip', label: 'Flip (tree)' }, { value: 'cross', label: 'Cross (order)' }]} />
          <Kicker><b style={{ color: C_FLIP }}>Flip</b> moves in the associahedron fiber;{' '}
            <b style={{ color: C_CROSS }}>Cross</b> moves in the (n−3)-cube fiber. Or click a node in either fiber window.</Kicker>
        </div>
      ),
    },
    {
      id: 'state', title: 'Where you are', arch: 'readout', estHeight: 110,
      node: <div style={{ fontFamily: 'var(--mono, monospace)', fontSize: 12, lineHeight: 1.7 }}>order&nbsp;&nbsp;({order.join(' ')})<br />tree&nbsp;&nbsp;&nbsp;#{curSafe}<br />splits&nbsp;{splitText}</div>,
    },
    {
      id: 'view', title: 'Display', arch: 'view', estHeight: 160,
      node: (
        <div style={{ display: 'grid', gap: 10 }}>
          <Slider label="Neighborhood radius" value={radius} min={1} max={6} step={1} onChange={setRadius} format={(v) => `${v} step${v > 1 ? 's' : ''}`} />
          <Checkbox label="Show triangulation (overlay)" checked={showPoly} onChange={setShowPoly} />
          <Checkbox label="Auto-rotate fibers" checked={spin} onChange={setSpin} />
        </div>
      ),
    },
  ];

  const netsViews: ViewDef[] = [
    { id: 'njtree', title: 'Neighbor-Joining tree', defaultRect: { x: 360, y: 16, w: 400, h: 400 }, node: <NJTreeView nj={nj} matrix={matrix} highlight={hl} onSelect={setHl} /> },
    { id: 'splitgraph', title: 'Split network (SplitsTree)', defaultRect: { x: 776, y: 16, w: 440, h: 360 }, node: <SplitGraphView graph={splitGraph} matrix={matrix} highlight={hl} onSelect={setHl} /> },
    { id: 'splitnet', title: 'Chord net (simple)', defaultRect: { x: 776, y: 392, w: 380, h: 380 }, node: <SplitNetworkView splits={weightedSplits} order={lpOrder} matrix={matrix} highlight={hl} onSelect={setHl} /> },
  ];

  const fibersViews: ViewDef[] = [
    { id: 'tree', title: 'Tree (circular order)', defaultRect: { x: 360, y: 16, w: 380, h: 380 }, node: <DiskView n={n} order={order} tri={tri} flash={flash} showTree showPolygon={false} onChord={onChord} /> },
    { id: 'polygon', title: 'Polygon + triangulation', defaultRect: { x: 360, y: 408, w: 380, h: 380 }, node: <DiskView n={n} order={order} tri={tri} flash={flash} showTree={false} showPolygon onChord={onChord} /> },
    { id: 'overlay', title: 'Overlay (tree + triangulation)', defaultRect: { x: 756, y: 408, w: 380, h: 380 }, node: <DiskView n={n} order={order} tri={tri} flash={flash} showTree showPolygon={showPoly} onChord={onChord} /> },
    { id: 'assoc', title: `Associahedron fiber — trees | order`, defaultRect: { x: 1156, y: 16, w: 360, h: 380 }, node: <Graph3D key={`a-${n}`} positions={assocPositions} edges={assoc.edges} adjacency={adjacency} currentRef={assocCurRef} radiusRef={radiusRef} accent={0x3fb6a6} onPick={pickTree} spinRef={spinRef} /> },
    { id: 'cube', title: `(n−3)-cube fiber — orders | tree`, defaultRect: { x: 1156, y: 408, w: 360, h: 380 }, node: <Graph3D key={`q-${treeKey}-${n}`} positions={cube.positions} edges={cube.edges} adjacency={cube.adj} currentRef={cubeCurRef} radiusRef={radiusRef} accent={0xe08a3c} onPick={pickCube} spinRef={spinRef} /> },
  ];

  const sections = appMode === 'nets' ? netsSections : fibersSections;
  const views = appMode === 'nets' ? netsViews : fibersViews;
  const layouts: LayoutDef[] = appMode === 'nets'
    ? [{ id: 'essentials', name: 'Nets', open: { distances: { x: 84, y: 16 }, connect: { x: 84, y: 410 }, weights: { x: 84, y: 560 } }, views: { njtree: { open: true }, splitgraph: { open: true }, splitnet: { open: false } } }]
    : [{ id: 'essentials', name: 'Fibers', open: { nav: { x: 84, y: 16 }, state: { x: 84, y: 210 }, view: { x: 84, y: 340 } }, views: { tree: { open: true }, polygon: { open: false }, overlay: { open: true }, assoc: { open: true }, cube: { open: true } } }];

  const modes: WorkspaceMode[] = [
    { id: 'nets', label: 'Nets' },
    { id: 'fibers', label: 'Fibers' },
  ];

  return (
    <Workspace appId={APP_ID} title="Trees and Nets"
      subtitle={appMode === 'nets' ? `${n} leaves · metric → tree + net` : `${n} leaves · tree-space fibers`}
      sections={sections} views={views} layouts={layouts} defaultLayoutId="essentials"
      explainer={explainer} modes={modes} activeMode={appMode}
      onModeChange={(id) => setAppMode(id as 'nets' | 'fibers')} />
  );
}
