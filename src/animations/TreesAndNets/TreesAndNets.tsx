import React, { useCallback, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import Canvas3D from '@/components/Canvas3D';
import Workspace from '../../chrome/workspace/Workspace';
import type { SectionDef, ViewDef } from '../../chrome/workspace/types';
import { Pills, Slider, Checkbox } from '../../components/ControlPanel';
import { StatGrid, Kicker } from '../../chrome/readouts';
import { usePersistentState } from '../../lib/usePersistentState';
import { buildAssociahedron, type Associahedron } from './lib/associahedron';
import {
  buildMosaic, canonicalKey, neighborOrder, tileCount, FULL_TILE_LIMIT, type Mosaic,
} from './lib/mosaic';
import explainer from './EXPLAINER.md?raw';

const APP_ID = 'trees-and-nets';

const VERTEX = new THREE.Color('#c9b27a');
const PENTAGON = new THREE.Color('#2f7d74'); // K3×K5 facet
const SQUARE = new THREE.Color('#8a5fb0'); // K4×K4 facet
const OTHER = new THREE.Color('#5a6b86');
const NODE = new THREE.Color('#6b7790');
const NODE_CUR = new THREE.Color('#ffd54a');
const NODE_NBR = new THREE.Color('#3fb6a6');

// Leaves on the small side of the diagonal (a,b), labeled through the cyclic order.
function splitLabel(order: number[], a: number, b: number): string {
  const n = order.length;
  const side: number[] = [];
  for (let i = a; i < b; i++) side.push(order[i]);
  const other: number[] = [];
  for (let i = 0; i < n; i++) if (i < a || i >= b) other.push(order[i]);
  const small = side.length <= other.length ? side : other;
  const big = small === side ? other : side;
  return `{${small.join(',')}}|{${big.join(',')}}`;
}

// Symmetric secondary-polytope coordinates (assoc.vertices[i].point), centered+scaled.
// True polytope for n≤6; first-3 intrinsic coords (fixed, not PCA) for n≥7.
function positionsFor(assoc: Associahedron): THREE.Vector3[] {
  const raw = assoc.vertices.map(
    (v) => new THREE.Vector3(v.point[0] ?? 0, v.point[1] ?? 0, v.point[2] ?? 0),
  );
  const center = raw
    .reduce((acc, p) => acc.add(p), new THREE.Vector3())
    .multiplyScalar(1 / Math.max(raw.length, 1));
  let maxR = 0;
  for (const p of raw) { p.sub(center); maxR = Math.max(maxR, p.length()); }
  const scale = maxR > 1e-6 ? 2.2 / maxR : 1;
  for (const p of raw) p.multiplyScalar(scale);
  return raw;
}

function buildFace(pos: THREE.Vector3[], indices: number[]): THREE.BufferGeometry | null {
  if (indices.length < 3) return null;
  const pts = indices.map((i) => pos[i]);
  const centroid = pts
    .reduce((a, p) => a.add(p.clone()), new THREE.Vector3())
    .multiplyScalar(1 / pts.length);
  const normal = new THREE.Vector3();
  for (let i = 0; i < pts.length; i++) {
    const cur = pts[i];
    const nxt = pts[(i + 1) % pts.length];
    normal.x += (cur.y - nxt.y) * (cur.z + nxt.z);
    normal.y += (cur.z - nxt.z) * (cur.x + nxt.x);
    normal.z += (cur.x - nxt.x) * (cur.y + nxt.y);
  }
  if (normal.lengthSq() < 1e-12) normal.set(0, 0, 1);
  normal.normalize();
  const u = new THREE.Vector3().subVectors(pts[0], centroid).normalize();
  const w = new THREE.Vector3().crossVectors(normal, u).normalize();
  const ordered = [...indices].sort((ia, ib) => {
    const pa = pos[ia].clone().sub(centroid);
    const pb = pos[ib].clone().sub(centroid);
    return Math.atan2(pa.dot(w), pa.dot(u)) - Math.atan2(pb.dot(w), pb.dot(u));
  });
  const verts: number[] = [];
  for (let i = 1; i < ordered.length - 1; i++) {
    const a = pos[ordered[0]], b = pos[ordered[i]], c = pos[ordered[i + 1]];
    verts.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geom.computeVertexNormals();
  return geom;
}

interface TileViewProps {
  assoc: Associahedron;
  selected: number | null;
  onSelect: (i: number | null) => void;
  onNavigate: (a: number, b: number) => void;
  zoomRef: React.MutableRefObject<number>;
  spinRef: React.MutableRefObject<boolean>;
  onZoom: (z: number) => void;
}

/** One associahedron tile in canonical coordinates; click a facet to cross it. */
function TileView(props: TileViewProps) {
  const { assoc, selected, zoomRef, spinRef, onZoom } = props;
  const onSelectRef = useRef(props.onSelect);
  onSelectRef.current = props.onSelect;
  const onNavigateRef = useRef(props.onNavigate);
  onNavigateRef.current = props.onNavigate;
  const selectedRef = useRef<number | null>(selected);
  selectedRef.current = selected;

  const onMount = useCallback(
    ({ scene, camera, renderer }: {
      scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer;
    }) => {
      scene.add(new THREE.AmbientLight(0xffffff, 0.75));
      const dir = new THREE.DirectionalLight(0xffffff, 0.85);
      dir.position.set(3, 5, 4);
      scene.add(dir);
      camera.position.set(0, 0, zoomRef.current);
      const group = new THREE.Group();
      scene.add(group);

      const pos = positionsFor(assoc);
      const disposables: { dispose(): void }[] = [];
      const faceMeshes: THREE.Mesh[] = [];

      const addFace = (indices: number[], color: THREE.Color, diagonal?: [number, number]) => {
        const geom = buildFace(pos, indices);
        if (!geom) return;
        disposables.push(geom);
        const mat = new THREE.MeshStandardMaterial({
          color, transparent: true, opacity: 0.4, side: THREE.DoubleSide, roughness: 0.6,
        });
        disposables.push(mat);
        const mesh = new THREE.Mesh(geom, mat);
        if (diagonal) mesh.userData.diagonal = diagonal;
        group.add(mesh);
        faceMeshes.push(mesh);
      };

      if (assoc.dim === 2) {
        addFace(assoc.vertices.map((_, i) => i), OTHER);
      } else if (assoc.dim === 3) {
        for (const facet of assoc.facets) {
          const color = facet.vertices.length === 5 ? PENTAGON
            : facet.vertices.length === 4 ? SQUARE : OTHER;
          addFace(facet.vertices, color, facet.diagonal);
        }
      }

      const edgePts: number[] = [];
      for (const [i, j] of assoc.edges) {
        edgePts.push(pos[i].x, pos[i].y, pos[i].z, pos[j].x, pos[j].y, pos[j].z);
      }
      const edgeGeom = new THREE.BufferGeometry();
      edgeGeom.setAttribute('position', new THREE.Float32BufferAttribute(edgePts, 3));
      disposables.push(edgeGeom);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0xcdd3df, transparent: true, opacity: 0.7 });
      disposables.push(edgeMat);
      group.add(new THREE.LineSegments(edgeGeom, edgeMat));

      const sphereGeom = new THREE.SphereGeometry(0.11, 18, 14);
      disposables.push(sphereGeom);
      const spheres: THREE.Mesh[] = [];
      pos.forEach((p, i) => {
        const mat = new THREE.MeshStandardMaterial({
          color: VERTEX, emissive: new THREE.Color(0x000000), roughness: 0.4, metalness: 0.1,
        });
        disposables.push(mat);
        const mesh = new THREE.Mesh(sphereGeom, mat);
        mesh.position.copy(p);
        mesh.userData.index = i;
        group.add(mesh);
        spheres.push(mesh);
      });

      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      let dragging = false, dragMoved = false, lastX = 0, lastY = 0;
      const el = renderer.domElement;
      const onDown = (e: PointerEvent) => {
        dragging = true; dragMoved = false; lastX = e.clientX; lastY = e.clientY;
        el.setPointerCapture(e.pointerId);
      };
      const onMove = (e: PointerEvent) => {
        if (!dragging) return;
        const dx = e.clientX - lastX, dy = e.clientY - lastY;
        if (Math.abs(dx) + Math.abs(dy) > 3) dragMoved = true;
        lastX = e.clientX; lastY = e.clientY;
        group.rotation.y += dx * 0.01; group.rotation.x += dy * 0.01;
      };
      const onUp = (e: PointerEvent) => {
        dragging = false;
        try { el.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      };
      const onClick = (e: PointerEvent) => {
        if (dragMoved) return;
        const rect = el.getBoundingClientRect();
        ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(ndc, camera);
        const vHit = raycaster.intersectObjects(spheres, false)[0];
        if (vHit) { onSelectRef.current(vHit.object.userData.index as number); return; }
        const fHit = raycaster.intersectObjects(faceMeshes, false)[0];
        const d = fHit?.object.userData.diagonal as [number, number] | undefined;
        if (d) onNavigateRef.current(d[0], d[1]);
        else onSelectRef.current(null);
      };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        onZoom(THREE.MathUtils.clamp(zoomRef.current * (1 + Math.sign(e.deltaY) * 0.1), 3, 22));
      };
      el.addEventListener('pointerdown', onDown);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('click', onClick as EventListener);
      el.addEventListener('wheel', onWheel, { passive: false });

      let raf = 0;
      const animate = () => {
        if (!dragging && spinRef.current) group.rotation.y += 0.0025;
        camera.position.z = zoomRef.current;
        const sel = selectedRef.current;
        spheres.forEach((m, i) => {
          const on = sel === i;
          (m.material as THREE.MeshStandardMaterial).emissive.setHex(on ? 0xffd54a : 0x000000);
          m.scale.setScalar(on ? 1.7 : 1);
        });
        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      };
      raf = requestAnimationFrame(animate);

      return () => {
        cancelAnimationFrame(raf);
        el.removeEventListener('pointerdown', onDown);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('click', onClick as EventListener);
        el.removeEventListener('wheel', onWheel);
        for (const d of disposables) d.dispose();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assoc],
  );

  return <Canvas3D onMount={onMount} />;
}

interface AtlasViewProps {
  mosaic: Mosaic;
  currentKey: string;
  onPick: (order: number[]) => void;
  spinRef: React.MutableRefObject<boolean>;
}

/** The gluing graph of the whole moduli space M̄_{0,n}(ℝ). */
function AtlasView(props: AtlasViewProps) {
  const { mosaic, spinRef } = props;
  const onPickRef = useRef(props.onPick);
  onPickRef.current = props.onPick;
  const curKeyRef = useRef(props.currentKey);
  curKeyRef.current = props.currentKey;

  const onMount = useCallback(
    ({ scene, camera, renderer }: {
      scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer;
    }) => {
      scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      const dir = new THREE.DirectionalLight(0xffffff, 0.7);
      dir.position.set(3, 5, 4);
      scene.add(dir);
      let camDist = 12;
      camera.position.set(0, 0, camDist);
      const group = new THREE.Group();
      scene.add(group);

      const disposables: { dispose(): void }[] = [];
      // edges
      const edgePts: number[] = [];
      for (const [i, j] of mosaic.edges) {
        const a = mosaic.pos[i], b = mosaic.pos[j];
        edgePts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
      const edgeGeom = new THREE.BufferGeometry();
      edgeGeom.setAttribute('position', new THREE.Float32BufferAttribute(edgePts, 3));
      disposables.push(edgeGeom);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x55607a, transparent: true, opacity: 0.35 });
      disposables.push(edgeMat);
      group.add(new THREE.LineSegments(edgeGeom, edgeMat));

      // nodes
      const r = mosaic.orders.length > 120 ? 0.12 : 0.2;
      const sphereGeom = new THREE.SphereGeometry(r, 14, 10);
      disposables.push(sphereGeom);
      const spheres: THREE.Mesh[] = [];
      mosaic.pos.forEach((p, i) => {
        const mat = new THREE.MeshStandardMaterial({ color: NODE, roughness: 0.5 });
        disposables.push(mat);
        const mesh = new THREE.Mesh(sphereGeom, mat);
        mesh.position.set(p.x, p.y, p.z);
        mesh.userData.index = i;
        group.add(mesh);
        spheres.push(mesh);
      });

      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      let dragging = false, dragMoved = false, lastX = 0, lastY = 0;
      const el = renderer.domElement;
      const onDown = (e: PointerEvent) => {
        dragging = true; dragMoved = false; lastX = e.clientX; lastY = e.clientY;
        el.setPointerCapture(e.pointerId);
      };
      const onMove = (e: PointerEvent) => {
        if (!dragging) return;
        const dx = e.clientX - lastX, dy = e.clientY - lastY;
        if (Math.abs(dx) + Math.abs(dy) > 3) dragMoved = true;
        lastX = e.clientX; lastY = e.clientY;
        group.rotation.y += dx * 0.01; group.rotation.x += dy * 0.01;
      };
      const onUp = (e: PointerEvent) => {
        dragging = false;
        try { el.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      };
      const onClick = (e: PointerEvent) => {
        if (dragMoved) return;
        const rect = el.getBoundingClientRect();
        ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(ndc, camera);
        const hit = raycaster.intersectObjects(spheres, false)[0];
        if (hit) onPickRef.current(mosaic.orders[hit.object.userData.index as number]);
      };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        camDist = THREE.MathUtils.clamp(camDist * (1 + Math.sign(e.deltaY) * 0.1), 4, 40);
      };
      el.addEventListener('pointerdown', onDown);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('click', onClick as EventListener);
      el.addEventListener('wheel', onWheel, { passive: false });

      let raf = 0;
      const animate = () => {
        if (!dragging && spinRef.current) group.rotation.y += 0.0018;
        camera.position.z = camDist;
        const cur = mosaic.index.get(curKeyRef.current);
        const nbr = cur !== undefined ? new Set(mosaic.adjacency[cur]) : new Set<number>();
        spheres.forEach((m, i) => {
          const mat = m.material as THREE.MeshStandardMaterial;
          if (i === cur) { mat.color.copy(NODE_CUR); m.scale.setScalar(1.9); }
          else if (nbr.has(i)) { mat.color.copy(NODE_NBR); m.scale.setScalar(1.3); }
          else { mat.color.copy(NODE); m.scale.setScalar(1); }
        });
        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      };
      raf = requestAnimationFrame(animate);

      return () => {
        cancelAnimationFrame(raf);
        el.removeEventListener('pointerdown', onDown);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('click', onClick as EventListener);
        el.removeEventListener('wheel', onWheel);
        for (const d of disposables) d.dispose();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mosaic],
  );

  return <Canvas3D onMount={onMount} />;
}

export default function TreesAndNets(): JSX.Element {
  const [n, setN] = usePersistentState<number>(`${APP_ID}:n`, 6);
  const [spin, setSpin] = usePersistentState<boolean>(`${APP_ID}:spin`, true);
  const [zoom, setZoom] = useState<number>(8);
  const [selected, setSelected] = useState<number | null>(null);
  const [order, setOrder] = useState<number[]>(() => Array.from({ length: 6 }, (_, i) => i));

  const assoc = useMemo(() => buildAssociahedron(n), [n]);
  const full = tileCount(n) <= FULL_TILE_LIMIT;
  const seedKey = canonicalKey(order);
  // Full mosaic depends only on n; local neighborhood also on the seed tile.
  const mosaic = useMemo(
    () => buildMosaic(n, seedKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [n, full ? '' : seedKey],
  );

  const zoomRef = useRef(zoom); zoomRef.current = zoom;
  const spinRef = useRef(spin); spinRef.current = spin;

  React.useEffect(() => {
    setOrder(Array.from({ length: n }, (_, i) => i));
    setSelected(null);
  }, [n]);

  const navigate = useCallback((a: number, b: number) => {
    setOrder((o) => neighborOrder(o, a, b));
    setSelected(null);
  }, []);
  const pickOrder = useCallback((o: number[]) => { setOrder(o); setSelected(null); }, []);

  const catalan = assoc.vertices.length;
  const sel = selected != null ? assoc.vertices[selected] : null;
  const selSplits =
    sel && sel.diagonals.length
      ? sel.diagonals.map(([a, b]) => splitLabel(order, a, b)).join('  ·  ')
      : sel ? '(no internal splits)' : '—';

  const sections: SectionDef[] = [
    {
      id: 'leaves',
      title: 'Leaves',
      arch: 'subject',
      estHeight: 168,
      node: (
        <div style={{ display: 'grid', gap: 10 }}>
          <Pills<number>
            label="Leaf count (n)"
            value={n}
            onChange={setN}
            options={[4, 5, 6, 7, 8, 9].map((k) => ({ value: k, label: String(k) }))}
          />
          <Kicker>
            Each tile is the associahedron K<sub>{n - 1}</sub> (dim <b>{assoc.dim}</b>,
            {' '}{catalan} trees) for one cyclic order. Gluing all{' '}
            {tileCount(n).toLocaleString()} of them gives the moduli space
            {' '}M̄<sub>0,{n}</sub>(ℝ).
            {assoc.dim > 3 && ' Tiles above 3-D are shown as a canonical wireframe projection.'}
          </Kicker>
        </div>
      ),
    },
    {
      id: 'order',
      title: 'Cyclic order',
      arch: 'domain',
      estHeight: 150,
      node: (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ fontFamily: 'var(--mono, monospace)', fontSize: 13 }}>
            ({order.join(' ')})
          </div>
          <Kicker>
            The current tile's cyclic order. Click a <b>facet</b> in the tile to cross
            into a neighbor, or click a node in the Atlas. {mosaic.full
              ? 'The Atlas shows the whole mosaic.'
              : 'The Atlas shows the local neighborhood (too many tiles to draw whole).'}
          </Kicker>
          <button
            type="button"
            onClick={() => pickOrder(Array.from({ length: n }, (_, i) => i))}
            style={{ justifySelf: 'start', padding: '4px 10px', cursor: 'pointer' }}
          >
            Reset order
          </button>
        </div>
      ),
    },
    {
      id: 'view',
      title: 'View',
      arch: 'view',
      estHeight: 120,
      node: (
        <div style={{ display: 'grid', gap: 10 }}>
          <Slider label="Tile zoom" value={zoom} min={3} max={22} step={0.5}
            onChange={setZoom} format={(v) => `${(11 / v).toFixed(2)}×`} />
          <Checkbox label="Auto-rotate" checked={spin} onChange={setSpin} />
        </div>
      ),
    },
    {
      id: 'stats',
      title: 'Tree space',
      arch: 'readout',
      estHeight: 240,
      node: (
        <div style={{ display: 'grid', gap: 10 }}>
          <StatGrid
            stats={[
              { k: 'trees / tile', v: String(catalan) },
              { k: 'flips / tile', v: String(assoc.edges.length) },
              { k: 'tiles (M̄₀,ₙ)', v: tileCount(n).toLocaleString() },
              { k: 'facets / tile', v: String(assoc.facets.length) },
            ]}
          />
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>
            <div style={{ opacity: 0.7, marginBottom: 2 }}>
              Selected {sel ? `tree #${selected}` : 'tree'} — click a vertex:
            </div>
            <div style={{ fontFamily: 'var(--mono, monospace)', wordBreak: 'break-word' }}>
              {selSplits}
            </div>
          </div>
        </div>
      ),
    },
  ];

  const views: ViewDef[] = [
    {
      id: 'tile',
      title: `Tile — K${n - 1}`,
      defaultRect: { x: 340, y: 16, w: 560, h: 600 },
      node: (
        <TileView
          key={`tile-${n}`}
          assoc={assoc}
          selected={selected}
          onSelect={setSelected}
          onNavigate={navigate}
          zoomRef={zoomRef}
          spinRef={spinRef}
          onZoom={setZoom}
        />
      ),
    },
    {
      id: 'atlas',
      title: `Atlas — M̄₀,${n}(ℝ)`,
      defaultRect: { x: 916, y: 16, w: 540, h: 600 },
      node: (
        <AtlasView
          key={`atlas-${n}-${mosaic.full ? '' : seedKey}`}
          mosaic={mosaic}
          currentKey={seedKey}
          onPick={pickOrder}
          spinRef={spinRef}
        />
      ),
    },
  ];

  return (
    <Workspace
      appId={APP_ID}
      title="Trees and Nets"
      subtitle={`M̄₀,${n}(ℝ) · ${tileCount(n).toLocaleString()} tiles`}
      sections={sections}
      views={views}
      explainer={explainer}
    />
  );
}
