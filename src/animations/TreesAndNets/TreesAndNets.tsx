import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const C_FLIP = '#3fb6a6';   // associahedron move (new tree)
const C_CROSS = '#e08a3c';  // (n-3)-cube move (new order)
const C_GLUE = '#ffd54a';   // both → glued
const C_TWIST = '#a878d8';  // a cross that leaves the tree unchanged

// labeled tree = the set of leaf splits induced by triangulation `diags` under `ord`.
function leafTree(diags: [number, number][], ord: number[], n: number): string {
  return diags.map(([a, b]) => {
    const side: number[] = [];
    for (let i = a; i < b; i++) side.push(ord[i]);
    const other: number[] = [];
    for (let i = 0; i < n; i++) if (i < a || i >= b) other.push(ord[i]);
    const sm = (side.length <= other.length ? side : other).slice().sort((x, y) => x - y);
    return `{${sm.join(',')}}`;
  }).sort().join('|');
}

// ---------------------------------------------------------------------------
// Tree view — the actual unrooted tree dual to the triangulation. Click an
// internal branch; mode decides Flip (new tree) vs Cross (new order). Edges whose
// cross is a pure order-twist (tree unchanged) are tinted.
// ---------------------------------------------------------------------------
function TreeView({
  n, order, tri, flash, twistEdges, showPolygon, onChord,
}: {
  n: number; order: number[]; tri: Triangulation; flash: Set<string>;
  twistEdges: Set<string>; showPolygon: boolean; onChord: (d: [number, number]) => void;
}) {
  const S = 360, c = S / 2, R = S * 0.34;
  const vAng = (k: number) => -Math.PI / 2 + (2 * Math.PI * k) / n;
  const eAng = (k: number) => -Math.PI / 2 + (2 * Math.PI * (k + 0.5)) / n;
  const PX = (k: number) => c + R * Math.cos(vAng(k));
  const PY = (k: number) => c + R * Math.sin(vAng(k));
  const ease = (x: number) => x * x * (3 - 2 * x);

  // animate labels around the circle on order change
  const prevRef = useRef(order);
  const [from, setFrom] = useState(order);
  const [t, setT] = useState(1);
  useEffect(() => {
    if (sameOrder(prevRef.current, order)) return;
    setFrom(prevRef.current); setT(0);
    const start = performance.now(); const dur = 480; let raf = 0;
    const step = (now: number) => { const p = Math.min(1, (now - start) / dur); setT(p); if (p < 1) raf = requestAnimationFrame(step); else prevRef.current = order; };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [order]);
  const labelPos = (v: number) => {
    const aF = eAng(from.indexOf(v)), aT = eAng(order.indexOf(v));
    let diff = aT - aF; while (diff > Math.PI) diff -= 2 * Math.PI; while (diff < -Math.PI) diff += 2 * Math.PI;
    const a = aF + diff * ease(t); const lr = R * 1.2;
    return [c + lr * Math.cos(a), c + lr * Math.sin(a)] as const;
  };

  // dual tree
  const tris = tri.triangles;
  const has = (tr: number[], x: number) => tr[0] === x || tr[1] === x || tr[2] === x;
  const centOf = (tr: number[]) => [(PX(tr[0]) + PX(tr[1]) + PX(tr[2])) / 3, (PY(tr[0]) + PY(tr[1]) + PY(tr[2])) / 3] as [number, number];
  const cent = tris.map(centOf);

  // smooth flip morph
  const prevTriRef = useRef(tri);
  const [tt, setTt] = useState(1);
  const startRef = useRef<[number, number][]>(cent);
  useEffect(() => {
    if (prevTriRef.current.id === tri.id) return;
    const pc = prevTriRef.current.triangles.map(centOf);
    startRef.current = cent.map((p) => { let best = pc[0] ?? p, bd = Infinity; for (const q of pc) { const dd = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (dd < bd) { bd = dd; best = q; } } return best; });
    setTt(0); const start = performance.now(); const dur = 420; let raf = 0;
    const step = (now: number) => { const p = Math.min(1, (now - start) / dur); setTt(p); if (p < 1) raf = requestAnimationFrame(step); else prevTriRef.current = tri; };
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
        {showPolygon && (
          <>
            <polygon points={boundary} fill="none" stroke="var(--fg, #ccd)" strokeOpacity={0.16} strokeWidth={1.2} />
            {tri.diagonals.map((d) => (
              <line key={`c${dkey(d)}`} x1={PX(d[0])} y1={PY(d[0])} x2={PX(d[1])} y2={PY(d[1])} stroke="var(--fg, #9fb)" strokeOpacity={0.1} strokeWidth={1} strokeDasharray="3 4" />
            ))}
          </>
        )}
        {Array.from({ length: n }, (_, k) => {
          const ti = triOfEdge(k); if (ti < 0) return null; const [sx, sy] = leafStub(k);
          return <line key={`l${k}`} x1={node[ti][0]} y1={node[ti][1]} x2={sx} y2={sy} stroke="var(--fg, #aeb6c8)" strokeOpacity={0.85} strokeWidth={2} strokeLinecap="round" />;
        })}
        {internal.map(({ d, a, b }) => {
          if (a == null || b == null) return null;
          const on = flash.has(dkey(d));
          const twist = twistEdges.has(dkey(d));
          const col = on ? C_GLUE : twist ? C_TWIST : C_FLIP;
          return (
            <g key={`i${dkey(d)}`} style={{ cursor: 'pointer' }} onClick={() => onChord(d)}>
              <line x1={node[a][0]} y1={node[a][1]} x2={node[b][0]} y2={node[b][1]} stroke="transparent" strokeWidth={18} />
              <line x1={node[a][0]} y1={node[a][1]} x2={node[b][0]} y2={node[b][1]} stroke={col} strokeWidth={on ? 5 : 3.5} strokeLinecap="round" style={{ transition: 'stroke 300ms, stroke-width 300ms' }} />
            </g>
          );
        })}
        {node.map((p, i) => (<circle key={`n${i}`} cx={p[0]} cy={p[1]} r={4.5} fill="var(--bg, #1b1e27)" stroke="var(--fg, #cdd)" strokeWidth={1.5} />))}
        {order.map((v, k) => { const [sx, sy] = leafStub(k); const [lx, ly] = labelPos(v); return (
          <g key={`v${v}`}><circle cx={sx} cy={sy} r={3.5} fill="var(--accent, #cda434)" /><text x={lx} y={ly} fontSize={15} fontFamily="monospace" fill="var(--accent, #cda434)" textAnchor="middle" dominantBaseline="middle">{v}</text></g>
        ); })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Local viewpoint map — from the current (tree, order), the n-3 interior edges
// give n-3 flip moves (associahedron, teal) and n-3 cross moves (cube, orange).
// Coincident targets merge: a node hit by BOTH is "glued" (gold halo); a cross
// that leaves the tree unchanged is a "twist" loop at the center.
// ---------------------------------------------------------------------------
interface NbEntry { key: string; flip: boolean; cross: boolean; navCur: number; navOrder: number[]; }

function LocalMap({
  n, cur, order, assoc, adjacency, diagSets, onNavigate,
}: {
  n: number; cur: number; order: number[]; assoc: Associahedron;
  adjacency: number[][]; diagSets: Set<string>[]; onNavigate: (c: number, o: number[]) => void;
}) {
  const S = 360, c = S / 2, R = S * 0.33;
  const center = assoc.vertices[cur];
  const centerKey = leafTree(center.diagonals, order, n);

  const map = new Map<string, NbEntry>();
  const twists: { edge: [number, number]; co: number[] }[] = [];
  for (const ed of center.diagonals) {
    const fj = adjacency[cur].find((nb) => !diagSets[nb].has(dkey(ed)));
    if (fj !== undefined) {
      const k = leafTree(assoc.vertices[fj].diagonals, order, n);
      const ent = map.get(k) ?? { key: k, flip: false, cross: false, navCur: fj, navOrder: order };
      ent.flip = true; ent.navCur = fj; ent.navOrder = order; map.set(k, ent);
    }
    const co = neighborOrder(order, ed[0], ed[1]);
    const k2 = leafTree(center.diagonals, co, n);
    if (k2 === centerKey) { twists.push({ edge: ed, co }); continue; }
    const ent = map.get(k2) ?? { key: k2, flip: false, cross: false, navCur: cur, navOrder: co };
    ent.cross = true; if (!ent.flip) { ent.navCur = cur; ent.navOrder = co; } map.set(k2, ent);
  }
  const nodes = [...map.values()];

  const angOf = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / Math.max(nodes.length, 1);
  const NX = (i: number) => c + R * Math.cos(angOf(i));
  const NY = (i: number) => c + R * Math.sin(angOf(i));

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
      <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" style={{ maxWidth: '100%', maxHeight: '100%' }}>
        {/* spokes */}
        {nodes.map((nd, i) => {
          const x = NX(i), y = NY(i);
          const perp = angOf(i) + Math.PI / 2;
          const off = 4;
          return (
            <g key={`s${i}`}>
              {nd.flip && (
                <line x1={c + off * Math.cos(perp)} y1={c + off * Math.sin(perp)} x2={x + off * Math.cos(perp)} y2={y + off * Math.sin(perp)} stroke={C_FLIP} strokeWidth={2.5} />
              )}
              {nd.cross && (
                <line x1={c - off * Math.cos(perp)} y1={c - off * Math.sin(perp)} x2={x - off * Math.cos(perp)} y2={y - off * Math.sin(perp)} stroke={C_CROSS} strokeWidth={2.5} strokeDasharray={nd.flip ? undefined : '5 4'} />
              )}
            </g>
          );
        })}
        {/* twist loops at center */}
        {twists.map((tw, i) => {
          const a = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(twists.length, 1);
          const lx = c + 34 * Math.cos(a), ly = c + 34 * Math.sin(a);
          return (
            <g key={`tw${i}`} style={{ cursor: 'pointer' }} onClick={() => onNavigate(cur, tw.co)}>
              <circle cx={lx} cy={ly} r={9} fill="none" stroke={C_TWIST} strokeWidth={2.5} />
              <title>order twist (same tree)</title>
            </g>
          );
        })}
        {/* neighbor nodes */}
        {nodes.map((nd, i) => {
          const x = NX(i), y = NY(i); const glued = nd.flip && nd.cross;
          return (
            <g key={`n${i}`} style={{ cursor: 'pointer' }} onClick={() => onNavigate(nd.navCur, nd.navOrder)}>
              {glued && <circle cx={x} cy={y} r={16} fill="none" stroke={C_GLUE} strokeWidth={3} />}
              <circle cx={x} cy={y} r={11} fill="var(--bg, #1b1e27)" stroke={glued ? C_GLUE : nd.flip ? C_FLIP : C_CROSS} strokeWidth={2.5} />
              <title>{nd.key}{glued ? '  (glued: flip = cross)' : nd.flip ? '  (flip → new tree)' : '  (cross → new order)'}</title>
            </g>
          );
        })}
        {/* center */}
        <circle cx={c} cy={c} r={14} fill={C_GLUE} stroke="var(--bg, #1b1e27)" strokeWidth={2} />
        <text x={c} y={c + 26} fontSize={11} fontFamily="monospace" fill="var(--fg, #ccd)" textAnchor="middle">here</text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
export default function TreesAndNets(): JSX.Element {
  const [n, setN] = usePersistentState<number>(`${APP_ID}:n`, 5);
  const [mode, setMode] = usePersistentState<'flip' | 'cross'>(`${APP_ID}:mode`, 'flip');
  const [showPoly, setShowPoly] = usePersistentState<boolean>(`${APP_ID}:poly`, true);
  const [order, setOrder] = useState<number[]>(() => [0, 1, 2, 3, 4]);
  const [cur, setCur] = useState<number>(0);
  const [flash, setFlash] = useState<Set<string>>(new Set());

  const assoc = useMemo(() => buildAssociahedron(n), [n]);
  const adjacency = useMemo(() => {
    const adj: number[][] = assoc.vertices.map(() => []);
    for (const [i, j] of assoc.edges) { adj[i].push(j); adj[j].push(i); }
    return adj;
  }, [assoc]);
  const diagSets = useMemo(() => assoc.vertices.map((v) => new Set(v.diagonals.map(dkey))), [assoc]);

  useEffect(() => { setOrder(Array.from({ length: n }, (_, i) => i)); setCur(0); setFlash(new Set()); }, [n]);

  const prevDiags = useRef<Set<string>>(new Set());
  useEffect(() => {
    const now = diagSets[cur] ?? new Set<string>();
    const appeared = new Set<string>();
    for (const k of now) if (!prevDiags.current.has(k)) appeared.add(k);
    prevDiags.current = now;
    if (appeared.size) { setFlash(appeared); const t = setTimeout(() => setFlash(new Set()), 450); return () => clearTimeout(t); }
    return undefined;
  }, [cur, diagSets]);

  const flip = useCallback((d: [number, number]) => {
    const k = dkey(d); const j = adjacency[cur].find((nb) => !diagSets[nb].has(k)); if (j !== undefined) setCur(j);
  }, [adjacency, cur, diagSets]);
  const cross = useCallback((d: [number, number]) => { setOrder((o) => neighborOrder(o, d[0], d[1])); }, []);
  const onChord = useCallback((d: [number, number]) => { if (mode === 'flip') flip(d); else cross(d); }, [mode, flip, cross]);
  const navigate = useCallback((c: number, o: number[]) => { setCur(c); setOrder(o); }, []);

  const tri = assoc.vertices[cur];

  // which interior edges are pure order-twists (cross leaves the tree unchanged)?
  const centerKey = leafTree(tri.diagonals, order, n);
  const twistEdges = useMemo(() => {
    const s = new Set<string>();
    for (const ed of tri.diagonals) {
      const co = neighborOrder(order, ed[0], ed[1]);
      if (leafTree(tri.diagonals, co, n) === centerKey) s.add(dkey(ed));
    }
    return s;
  }, [tri, order, n, centerKey]);

  const splitText = tri.diagonals.length
    ? tri.diagonals.map(([a, b]) => { const side: number[] = []; for (let i = a; i < b; i++) side.push(order[i]); const other: number[] = []; for (let i = 0; i < n; i++) if (i < a || i >= b) other.push(order[i]); const sm = side.length <= other.length ? side : other; return `{${sm.join('')}}`; }).join(' ')
    : '—';

  const sections: SectionDef[] = [
    {
      id: 'leaves', title: 'Leaves', arch: 'subject', estHeight: 150,
      node: (
        <div style={{ display: 'grid', gap: 10 }}>
          <Pills<number> label="Leaf count (n)" value={n} onChange={setN} options={[5, 6, 7, 8].map((k) => ({ value: k, label: String(k) }))} />
          <Kicker>The left panel is your current <b>tree</b>. The map shows where the
            n−3 interior edges can take you — each edge offers a <b style={{ color: C_FLIP }}>flip</b> (new
            tree, same order) and a <b style={{ color: C_CROSS }}>cross</b> (new order, same tree).</Kicker>
        </div>
      ),
    },
    {
      id: 'nav', title: 'Move', arch: 'drive', estHeight: 200,
      node: (
        <div style={{ display: 'grid', gap: 10 }}>
          <Pills<'flip' | 'cross'> label="Click a branch to…" value={mode} onChange={setMode}
            options={[{ value: 'flip', label: 'Flip tree' }, { value: 'cross', label: 'Cross order' }]} />
          <Kicker>
            <b style={{ color: C_FLIP }}>Flip</b> = a move in the <b>associahedron</b> (the tree changes).{' '}
            <b style={{ color: C_CROSS }}>Cross</b> = a move in the <b>(n−3)-cube</b> (the order changes).
            On the map, a node hit by <b style={{ color: C_GLUE }}>both</b> is where the two glue; a{' '}
            <b style={{ color: C_TWIST }}>twist</b> loop is a cross that leaves the tree unchanged.
          </Kicker>
        </div>
      ),
    },
    {
      id: 'state', title: 'Where you are', arch: 'readout', estHeight: 110,
      node: (
        <div style={{ fontFamily: 'var(--mono, monospace)', fontSize: 12, lineHeight: 1.7 }}>
          order&nbsp;&nbsp;({order.join(' ')})<br />tree&nbsp;&nbsp;&nbsp;#{cur}<br />splits&nbsp;{splitText}
        </div>
      ),
    },
    {
      id: 'view', title: 'Display', arch: 'view', estHeight: 80,
      node: <Checkbox label="Show triangulation behind tree" checked={showPoly} onChange={setShowPoly} />,
    },
  ];

  const views: ViewDef[] = [
    {
      id: 'tree', title: mode === 'flip' ? 'Tree — click a branch to flip' : 'Tree — click a branch to cross',
      defaultRect: { x: 340, y: 16, w: 500, h: 540 },
      node: <TreeView n={n} order={order} tri={tri} flash={flash} twistEdges={twistEdges} showPolygon={showPoly} onChord={onChord} />,
    },
    {
      id: 'map', title: 'Local map — flips & crosses',
      defaultRect: { x: 856, y: 16, w: 500, h: 540 },
      node: <LocalMap key={`map-${n}`} n={n} cur={cur} order={order} assoc={assoc} adjacency={adjacency} diagSets={diagSets} onNavigate={navigate} />,
    },
  ];

  return (
    <Workspace appId={APP_ID} title="Trees and Nets" subtitle={'flips & crosses: the local view'} sections={sections} views={views} explainer={explainer} />
  );
}
