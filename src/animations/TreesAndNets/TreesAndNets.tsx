import React, { useCallback, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import Canvas3D from '@/components/Canvas3D';
import Workspace from '../../chrome/workspace/Workspace';
import type { SectionDef, ViewDef } from '../../chrome/workspace/types';
import { Pills, Slider, Checkbox } from '../../components/ControlPanel';
import { StatGrid, Kicker } from '../../chrome/readouts';
import { usePersistentState } from '../../lib/usePersistentState';
import { buildAssociahedron, type Associahedron } from './lib/associahedron';
import explainer from './EXPLAINER.md?raw';

const APP_ID = 'trees-and-nets';

const VERTEX = new THREE.Color('#c9b27a'); // neutral tree color (no energy)
const PENTAGON = new THREE.Color('#2f7d74'); // K3×K5 facet
const SQUARE = new THREE.Color('#8a5fb0'); // K4×K4 facet
const OTHER = new THREE.Color('#5a6b86'); // any other facet shape

// Leaves are the boundary edges (i, i+1 mod n); a diagonal (a,b) splits them.
function splitLabel(a: number, b: number, n: number): string {
  const side: number[] = [];
  for (let i = a; i < b; i++) side.push(i);
  const other: number[] = [];
  for (let i = 0; i < n; i++) if (i < a || i >= b) other.push(i);
  const small = side.length <= other.length ? side : other;
  const big = small === side ? other : side;
  return `{${small.join(',')}}|{${big.join(',')}}`;
}

// Canonical positions: the Loday point projected through the FIXED Helmert basis
// (assoc.vertices[i].point). For n<=6 this is the true polytope; for n>=7 we take
// the first 3 of the canonical coordinates (a fixed, data-independent projection —
// not PCA), pending a Schlegel renderer.
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

// Build one filled, ordered polygon face from a set of (planar) vertex indices.
function buildFace(
  pos: THREE.Vector3[],
  indices: number[],
): THREE.BufferGeometry | null {
  if (indices.length < 3) return null;
  const pts = indices.map((i) => pos[i]);
  const centroid = pts
    .reduce((a, p) => a.add(p.clone()), new THREE.Vector3())
    .multiplyScalar(1 / pts.length);
  // Newell normal (robust for a planar polygon)
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
    const a = pos[ordered[0]];
    const b = pos[ordered[i]];
    const c = pos[ordered[i + 1]];
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
  zoomRef: React.MutableRefObject<number>;
  spinRef: React.MutableRefObject<boolean>;
  onZoom: (z: number) => void;
}

/** A single associahedron tile, in canonical Loday coordinates. */
function TileView(props: TileViewProps) {
  const { assoc, selected, zoomRef, spinRef, onZoom } = props;
  const onSelectRef = useRef(props.onSelect);
  onSelectRef.current = props.onSelect;
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

      // --- filled faces (only meaningful when the polytope is <= 3-D) ---
      if (assoc.dim === 2) {
        const geom = buildFace(pos, assoc.vertices.map((_, i) => i));
        if (geom) {
          disposables.push(geom);
          const mat = new THREE.MeshStandardMaterial({
            color: OTHER, transparent: true, opacity: 0.45,
            side: THREE.DoubleSide, roughness: 0.6,
          });
          disposables.push(mat);
          group.add(new THREE.Mesh(geom, mat));
        }
      } else if (assoc.dim === 3) {
        for (const facet of assoc.facets) {
          const geom = buildFace(pos, facet.vertices);
          if (!geom) continue;
          disposables.push(geom);
          const color =
            facet.vertices.length === 5 ? PENTAGON
              : facet.vertices.length === 4 ? SQUARE : OTHER;
          const mat = new THREE.MeshStandardMaterial({
            color, transparent: true, opacity: 0.4,
            side: THREE.DoubleSide, roughness: 0.6,
          });
          disposables.push(mat);
          group.add(new THREE.Mesh(geom, mat));
        }
      }

      // --- flip edges ---
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

      // --- vertices (trees) ---
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

      // --- picking + orbit + zoom ---
      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      let dragging = false;
      let dragMoved = false;
      let lastX = 0;
      let lastY = 0;
      const el = renderer.domElement;
      const onDown = (e: PointerEvent) => {
        dragging = true; dragMoved = false; lastX = e.clientX; lastY = e.clientY;
        el.setPointerCapture(e.pointerId);
      };
      const onMove = (e: PointerEvent) => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        if (Math.abs(dx) + Math.abs(dy) > 3) dragMoved = true;
        lastX = e.clientX; lastY = e.clientY;
        group.rotation.y += dx * 0.01;
        group.rotation.x += dy * 0.01;
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
        onSelectRef.current(hit ? (hit.object.userData.index as number) : null);
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

export default function TreesAndNets(): JSX.Element {
  const [n, setN] = usePersistentState<number>(`${APP_ID}:n`, 6);
  const [spin, setSpin] = usePersistentState<boolean>(`${APP_ID}:spin`, true);
  const [zoom, setZoom] = useState<number>(8);
  const [selected, setSelected] = useState<number | null>(null);

  const assoc = useMemo(() => buildAssociahedron(n), [n]);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const spinRef = useRef(spin);
  spinRef.current = spin;

  React.useEffect(() => { setSelected(null); }, [n]);

  const catalan = assoc.vertices.length;
  const sel = selected != null ? assoc.vertices[selected] : null;
  const selSplits =
    sel && sel.diagonals.length
      ? sel.diagonals.map(([a, b]) => splitLabel(a, b, n)).join('  ·  ')
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
            Trees compatible with a circular order of n leaves = triangulations of
            the n-gon = vertices of the associahedron K<sub>{n - 1}</sub> (dim{' '}
            <b>{assoc.dim}</b>, {catalan} trees). Edges are flips; the 2-faces are
            the pentagons (K₃×K₅) and squares (K₄×K₄).
            {assoc.dim > 3 && ' Above 3-D it is shown as a canonical projection (wireframe) for now.'}
          </Kicker>
        </div>
      ),
    },
    {
      id: 'view',
      title: 'View',
      arch: 'view',
      estHeight: 140,
      node: (
        <div style={{ display: 'grid', gap: 10 }}>
          <Slider label="Zoom" value={zoom} min={3} max={22} step={0.5}
            onChange={setZoom} format={(v) => `${(11 / v).toFixed(2)}×`} />
          <Checkbox label="Auto-rotate" checked={spin} onChange={setSpin} />
          <Kicker>Drag to orbit, scroll to zoom, click a vertex to read its tree.</Kicker>
        </div>
      ),
    },
    {
      id: 'stats',
      title: 'Tree space',
      arch: 'readout',
      estHeight: 230,
      node: (
        <div style={{ display: 'grid', gap: 10 }}>
          <StatGrid
            stats={[
              { k: 'trees (vertices)', v: String(catalan) },
              { k: 'flips (edges)', v: String(assoc.edges.length) },
              { k: 'facets', v: String(assoc.facets.length) },
              { k: 'dimension', v: String(assoc.dim) },
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
      title: `Associahedron K${n - 1}`,
      defaultRect: { x: 340, y: 16, w: 760, h: 620 },
      node: (
        <TileView
          key={`tile-${n}`}
          assoc={assoc}
          selected={selected}
          onSelect={setSelected}
          zoomRef={zoomRef}
          spinRef={spinRef}
          onZoom={setZoom}
        />
      ),
    },
  ];

  return (
    <Workspace
      appId={APP_ID}
      title="Trees and Nets"
      subtitle={`associahedron K${n - 1}`}
      sections={sections}
      views={views}
      explainer={explainer}
    />
  );
}
