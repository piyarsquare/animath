import React, { useCallback, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import Canvas3D from '@/components/Canvas3D';
import Workspace from '../../chrome/workspace/Workspace';
import type { SectionDef, ViewDef } from '../../chrome/workspace/types';
import { Pills, Select, Slider, Checkbox } from '../../components/ControlPanel';
import { StatGrid, Kicker } from '../../chrome/readouts';
import { usePersistentState } from '../../lib/usePersistentState';
import { buildAssociahedron, type Associahedron } from './lib/associahedron';
import { pca, projectOnto } from './lib/projection';
import explainer from './EXPLAINER.md?raw';

const APP_ID = 'trees-and-nets';

// --- Placeholder energy ------------------------------------------------------
// Until the distance-metric pipeline lands, give each tree a deterministic
// "energy" so the terrain/flow isn't trivial: the total span of its internal
// diagonals. Replace with the real circular-order energy from a distance matrix.
function placeholderEnergies(assoc: Associahedron): number[] {
  const n = assoc.n;
  return assoc.vertices.map((v) =>
    v.diagonals.reduce((sum, [a, b]) => {
      const raw = Math.abs(a - b);
      return sum + Math.min(raw, n - raw);
    }, 0),
  );
}

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

const LOW = new THREE.Color('#2bb6a8'); // low energy (best)
const HIGH = new THREE.Color('#d6457a'); // high energy

interface AssocViewProps {
  assoc: Associahedron;
  energies: number[];
  displace: boolean;
  showFlow: boolean;
  pc: [number, number, number];
  selected: number | null;
  onSelect: (i: number | null) => void;
  zoomRef: React.MutableRefObject<number>;
  spinRef: React.MutableRefObject<boolean>;
  onZoom: (z: number) => void;
}

/** One Three.js window onto the associahedron (faithful, or energy-displaced). */
function AssocView(props: AssocViewProps) {
  const { assoc, energies, displace, showFlow, pc, selected, zoomRef, spinRef, onZoom } = props;
  const onSelectRef = useRef(props.onSelect);
  onSelectRef.current = props.onSelect;
  const spheresRef = useRef<THREE.Mesh[]>([]);
  const selectedRef = useRef<number | null>(selected);
  selectedRef.current = selected;

  const onMount = useCallback(
    ({ scene, camera, renderer }: {
      scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer;
    }) => {
      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const dir = new THREE.DirectionalLight(0xffffff, 0.85);
      dir.position.set(3, 5, 4);
      scene.add(dir);
      camera.position.set(0, 0, zoomRef.current);

      const group = new THREE.Group();
      scene.add(group);

      // --- project intrinsic R^{n-3} coords to 3D via chosen principal axes ---
      const intrinsic = assoc.vertices.map((v) => v.point);
      const axes = pca(intrinsic);
      const raw = intrinsic.map(
        (p) =>
          new THREE.Vector3(
            projectOnto(p, axes, pc[0]),
            projectOnto(p, axes, pc[1]),
            projectOnto(p, axes, pc[2]),
          ),
      );
      const c = raw
        .reduce((acc, p) => acc.add(p), new THREE.Vector3())
        .multiplyScalar(1 / Math.max(raw.length, 1));
      let maxR = 0;
      for (const p of raw) { p.sub(c); maxR = Math.max(maxR, p.length()); }
      const scale = maxR > 1e-6 ? 2.2 / maxR : 1;
      for (const p of raw) p.multiplyScalar(scale);

      const minE = Math.min(...energies);
      const maxE = Math.max(...energies);
      const span = maxE - minE || 1;

      const drawPos = raw.map((p, i) => {
        if (!displace) return p.clone();
        const t = (energies[i] - minE) / span;
        return p.clone().addScaledVector(p.clone().normalize(), t * 1.4);
      });

      // --- structural flip edges (faint lines) ---
      const edgePts: number[] = [];
      for (const [i, j] of assoc.edges) {
        edgePts.push(drawPos[i].x, drawPos[i].y, drawPos[i].z);
        edgePts.push(drawPos[j].x, drawPos[j].y, drawPos[j].z);
      }
      const edgeGeom = new THREE.BufferGeometry();
      edgeGeom.setAttribute('position', new THREE.Float32BufferAttribute(edgePts, 3));
      const edges = new THREE.LineSegments(
        edgeGeom,
        new THREE.LineBasicMaterial({
          color: 0x8a93a6,
          transparent: true,
          opacity: showFlow ? 0.22 : 0.5,
        }),
      );
      group.add(edges);

      // --- directed energy-gradient arrows (downhill, length ∝ |ΔE|) ---
      let flow: THREE.InstancedMesh | null = null;
      let coneGeom: THREE.ConeGeometry | null = null;
      if (showFlow) {
        const directed = assoc.edges.filter(([i, j]) => energies[i] !== energies[j]);
        const maxDelta = Math.max(
          ...assoc.edges.map(([i, j]) => Math.abs(energies[i] - energies[j])),
          1e-6,
        );
        coneGeom = new THREE.ConeGeometry(0.06, 0.24, 10);
        flow = new THREE.InstancedMesh(
          coneGeom,
          new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1 }),
          directed.length,
        );
        const dummy = new THREE.Object3D();
        const up = new THREE.Vector3(0, 1, 0);
        const col = new THREE.Color();
        directed.forEach(([i, j], e) => {
          const hi = energies[i] > energies[j] ? i : j;
          const lo = hi === i ? j : i;
          const delta = Math.abs(energies[i] - energies[j]) / maxDelta;
          const a = drawPos[hi];
          const b = drawPos[lo];
          dummy.position.copy(a).add(b).multiplyScalar(0.5);
          dummy.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize());
          dummy.scale.set(1, 0.5 + 1.8 * delta, 1);
          dummy.updateMatrix();
          flow!.setMatrixAt(e, dummy.matrix);
          flow!.setColorAt(e, col.copy(LOW).lerp(HIGH, delta));
        });
        flow.instanceMatrix.needsUpdate = true;
        if (flow.instanceColor) flow.instanceColor.needsUpdate = true;
        group.add(flow);
      }

      // --- vertices (trees) ---
      const sphereGeom = new THREE.SphereGeometry(0.12, 18, 14);
      const spheres: THREE.Mesh[] = [];
      drawPos.forEach((p, i) => {
        const t = (energies[i] - minE) / span;
        const mat = new THREE.MeshStandardMaterial({
          color: LOW.clone().lerp(HIGH, t),
          emissive: new THREE.Color(0x000000),
          roughness: 0.45,
          metalness: 0.1,
        });
        const mesh = new THREE.Mesh(sphereGeom, mat);
        mesh.position.copy(p);
        mesh.userData.index = i;
        group.add(mesh);
        spheres.push(mesh);
      });
      spheresRef.current = spheres;

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
        sphereGeom.dispose();
        edgeGeom.dispose();
        spheres.forEach((m) => (m.material as THREE.Material).dispose());
        if (flow) (flow.material as THREE.Material).dispose();
        if (coneGeom) coneGeom.dispose();
      };
    },
    // Rebuild on any change that alters geometry/topology of the scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assoc, displace, showFlow, pc[0], pc[1], pc[2]],
  );

  return <Canvas3D onMount={onMount} />;
}

export default function TreesAndNets(): JSX.Element {
  const [n, setN] = usePersistentState<number>(`${APP_ID}:n`, 6);
  const [pcX, setPcX] = usePersistentState<number>(`${APP_ID}:pcX`, 0);
  const [pcY, setPcY] = usePersistentState<number>(`${APP_ID}:pcY`, 1);
  const [pcZ, setPcZ] = usePersistentState<number>(`${APP_ID}:pcZ`, 2);
  const [spin, setSpin] = usePersistentState<boolean>(`${APP_ID}:spin`, true);
  const [showFlow, setShowFlow] = usePersistentState<boolean>(`${APP_ID}:flow`, false);
  const [zoom, setZoom] = useState<number>(8);
  const [selected, setSelected] = useState<number | null>(null);

  const assoc = useMemo(() => buildAssociahedron(n), [n]);
  const energies = useMemo(() => placeholderEnergies(assoc), [assoc]);

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const spinRef = useRef(spin);
  spinRef.current = spin;

  React.useEffect(() => { setSelected(null); }, [n]);

  // Clamp component choices to the available dimension (d = n-3).
  const d = Math.max(assoc.dim, 1);
  const cx = Math.min(pcX, d - 1);
  const cy = Math.min(pcY, d - 1);
  const cz = Math.min(pcZ, d - 1);
  const pcOptions = Array.from({ length: d }, (_, i) => ({ value: i, label: `PC${i + 1}` }));

  const catalan = assoc.vertices.length;
  const minIdx = energies.reduce((best, e, i) => (e < energies[best] ? i : best), 0);
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
            the n-gon. They are the vertices of the associahedron K<sub>{n - 1}</sub>,
            a <b>{assoc.dim}-dimensional</b> polytope ({catalan} trees){assoc.dim > 3
              ? ' — projected to 3D below.' : '.'}
          </Kicker>
        </div>
      ),
    },
    {
      id: 'projection',
      title: 'Projection',
      arch: 'view',
      estHeight: 280,
      node: (
        <div style={{ display: 'grid', gap: 10 }}>
          <Kicker>
            The polytope is {assoc.dim}-D; choose which principal components (axes of
            greatest spread) map to screen X / Y / Z. This scales to any n.
          </Kicker>
          <Select<number> label="Screen X" value={cx} onChange={setPcX} options={pcOptions} />
          <Select<number> label="Screen Y" value={cy} onChange={setPcY} options={pcOptions} />
          <Select<number> label="Screen Z" value={cz} onChange={setPcZ} options={pcOptions} />
          <Slider label="Zoom" value={zoom} min={3} max={22} step={0.5}
            onChange={setZoom} format={(v) => `${(11 / v).toFixed(2)}×`} />
          <Checkbox label="Auto-rotate" checked={spin} onChange={setSpin} />
        </div>
      ),
    },
    {
      id: 'flow',
      title: 'Energy flow',
      arch: 'marks',
      estHeight: 120,
      node: (
        <div style={{ display: 'grid', gap: 10 }}>
          <Checkbox label="Directed energy edges" checked={showFlow} onChange={setShowFlow} />
          <Kicker>
            Each flip points <b>downhill</b> (toward lower energy); arrow length and
            color grow with the energy drop |ΔE|. Sinks are local optima.
          </Kicker>
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
              { k: 'dimension', v: String(assoc.dim) },
              { k: 'min-energy tree', v: `#${minIdx}` },
            ]}
          />
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>
            <div style={{ opacity: 0.7, marginBottom: 2 }}>
              Selected {sel ? `tree #${selected}` : 'tree'} — click a vertex:
            </div>
            <div style={{ fontFamily: 'var(--mono, monospace)', wordBreak: 'break-word' }}>
              {selSplits}
            </div>
            {sel && (
              <div style={{ opacity: 0.7, marginTop: 4 }}>
                energy {energies[selected as number].toFixed(2)}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'energy-note',
      title: 'Energy (placeholder)',
      arch: 'color',
      estHeight: 110,
      node: (
        <Kicker>
          Energy is currently a <b>placeholder</b> (total internal-split span). The
          real circular-order energy from an editable distance matrix is the next
          piece — it will make the terrain and the downhill flow meaningful.
        </Kicker>
      ),
    },
  ];

  const views: ViewDef[] = [
    {
      id: 'polytope',
      title: 'Associahedron',
      defaultRect: { x: 340, y: 16, w: 560, h: 560 },
      node: (
        <AssocView
          key={`faithful-${n}-${cx}-${cy}-${cz}-${showFlow}`}
          assoc={assoc} energies={energies} displace={false} showFlow={showFlow}
          pc={[cx, cy, cz]} selected={selected} onSelect={setSelected}
          zoomRef={zoomRef} spinRef={spinRef} onZoom={setZoom}
        />
      ),
    },
    {
      id: 'terrain',
      title: 'Energy terrain',
      defaultRect: { x: 916, y: 16, w: 540, h: 560 },
      node: (
        <AssocView
          key={`terrain-${n}-${cx}-${cy}-${cz}-${showFlow}`}
          assoc={assoc} energies={energies} displace showFlow={showFlow}
          pc={[cx, cy, cz]} selected={selected} onSelect={setSelected}
          zoomRef={zoomRef} spinRef={spinRef} onZoom={setZoom}
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
