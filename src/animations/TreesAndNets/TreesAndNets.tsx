import React, { useCallback, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import Canvas3D from '@/components/Canvas3D';
import Workspace from '../../chrome/workspace/Workspace';
import type { SectionDef, ViewDef } from '../../chrome/workspace/types';
import { Pills, Slider } from '../../components/ControlPanel';
import { StatGrid, Kicker } from '../../chrome/readouts';
import { usePersistentState } from '../../lib/usePersistentState';
import { buildAssociahedron, type Associahedron } from './lib/associahedron';
import explainer from './EXPLAINER.md?raw';

const APP_ID = 'trees-and-nets';

// --- Placeholder energy ------------------------------------------------------
// Until the distance-metric pipeline lands, give each tree a deterministic
// "energy" so the terrain window isn't flat: the total span of its internal
// diagonals (balanced triangulations score differently from caterpillars).
// Replace with the real circular-order energy from a distance matrix.
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

// --- 3D positions from intrinsic polytope coordinates ------------------------
// `point` has length n-3. Pad to 3 (n<6) or take the first 3 (n=7's 4D → a flat
// orthographic slice for now; the projection slider is the eventual home). This
// keeps the renderer independent of the specific value of n.
function positionsFor(assoc: Associahedron): THREE.Vector3[] {
  const raw = assoc.vertices.map(
    (v) => new THREE.Vector3(v.point[0] ?? 0, v.point[1] ?? 0, v.point[2] ?? 0),
  );
  const center = raw
    .reduce((acc, p) => acc.add(p), new THREE.Vector3())
    .multiplyScalar(1 / Math.max(raw.length, 1));
  let maxR = 0;
  for (const p of raw) {
    p.sub(center);
    maxR = Math.max(maxR, p.length());
  }
  const scale = maxR > 1e-6 ? 2.2 / maxR : 1;
  for (const p of raw) p.multiplyScalar(scale);
  return raw;
}

const LOW = new THREE.Color('#2bb6a8'); // low energy (best)
const HIGH = new THREE.Color('#d6457a'); // high energy

interface AssocViewProps {
  assoc: Associahedron;
  energies: number[];
  displace: boolean;
  selected: number | null;
  onSelect: (i: number | null) => void;
}

/** One Three.js window onto the associahedron (faithful, or energy-displaced). */
function AssocView({ assoc, energies, displace, selected, onSelect }: AssocViewProps) {
  const spheresRef = useRef<THREE.Mesh[]>([]);
  const selectedRef = useRef<number | null>(selected);
  const baseColors = useRef<THREE.Color[]>([]);

  const onMount = useCallback(
    ({ scene, camera, renderer }: {
      scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer;
    }) => {
      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const dir = new THREE.DirectionalLight(0xffffff, 0.8);
      dir.position.set(3, 5, 4);
      scene.add(dir);
      camera.position.set(0, 0, 7);

      const group = new THREE.Group();
      scene.add(group);

      const pos = positionsFor(assoc);
      const minE = Math.min(...energies);
      const maxE = Math.max(...energies);
      const span = maxE - minE || 1;

      // displaced positions push each vertex radially out by normalized energy
      const drawPos = pos.map((p, i) => {
        if (!displace) return p.clone();
        const t = (energies[i] - minE) / span;
        const n = p.clone().normalize();
        return p.clone().addScaledVector(n, t * 1.4);
      });

      // edges
      const edgePts: number[] = [];
      for (const [i, j] of assoc.edges) {
        edgePts.push(drawPos[i].x, drawPos[i].y, drawPos[i].z);
        edgePts.push(drawPos[j].x, drawPos[j].y, drawPos[j].z);
      }
      const edgeGeom = new THREE.BufferGeometry();
      edgeGeom.setAttribute('position', new THREE.Float32BufferAttribute(edgePts, 3));
      const edges = new THREE.LineSegments(
        edgeGeom,
        new THREE.LineBasicMaterial({ color: 0x8a93a6, transparent: true, opacity: 0.55 }),
      );
      group.add(edges);

      // vertices
      const sphereGeom = new THREE.SphereGeometry(0.13, 20, 16);
      const spheres: THREE.Mesh[] = [];
      const colors: THREE.Color[] = [];
      drawPos.forEach((p, i) => {
        const t = (energies[i] - minE) / span;
        const col = LOW.clone().lerp(HIGH, t);
        colors.push(col.clone());
        const mat = new THREE.MeshStandardMaterial({
          color: col,
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
      baseColors.current = colors;

      // picking
      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      const onClick = (ev: PointerEvent) => {
        if (dragMoved) return; // ignore drags
        const rect = renderer.domElement.getBoundingClientRect();
        ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(ndc, camera);
        const hit = raycaster.intersectObjects(spheres, false)[0];
        onSelect(hit ? (hit.object.userData.index as number) : null);
      };

      // orbit + zoom
      let dragging = false;
      let dragMoved = false;
      let lastX = 0;
      let lastY = 0;
      const onDown = (e: PointerEvent) => {
        dragging = true; dragMoved = false; lastX = e.clientX; lastY = e.clientY;
        renderer.domElement.setPointerCapture(e.pointerId);
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
        try { renderer.domElement.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        camera.position.z = THREE.MathUtils.clamp(
          camera.position.z * (1 + Math.sign(e.deltaY) * 0.1), 3, 18,
        );
      };
      const el = renderer.domElement;
      el.addEventListener('pointerdown', onDown);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('click', onClick as EventListener);
      el.addEventListener('wheel', onWheel, { passive: false });

      let raf = 0;
      const animate = () => {
        if (!dragging) group.rotation.y += 0.0025; // gentle autospin
        // reflect selection
        const sel = selectedRef.current;
        spheres.forEach((m, i) => {
          const mat = m.material as THREE.MeshStandardMaterial;
          const on = sel === i;
          mat.emissive.setHex(on ? 0xffd54a : 0x000000);
          const s = on ? 1.6 : 1;
          m.scale.setScalar(s);
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
      };
    },
    // Rebuild the scene when the structure or displacement mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assoc, displace],
  );

  // keep the animation loop's selection ref current without rebuilding the scene
  selectedRef.current = selected;

  return <Canvas3D onMount={onMount} />;
}

export default function TreesAndNets(): JSX.Element {
  const [n, setN] = usePersistentState<number>(`${APP_ID}:n`, 6);
  const [selected, setSelected] = useState<number | null>(null);

  const assoc = useMemo(() => buildAssociahedron(n), [n]);
  const energies = useMemo(() => placeholderEnergies(assoc), [assoc]);

  // reset selection when the structure changes
  React.useEffect(() => { setSelected(null); }, [n]);

  const catalan = assoc.vertices.length;
  const minIdx = energies.reduce((best, e, i) => (e < energies[best] ? i : best), 0);

  const sel = selected != null ? assoc.vertices[selected] : null;
  const selSplits =
    sel && sel.diagonals.length
      ? sel.diagonals.map(([a, b]) => splitLabel(a, b, n)).join('  ·  ')
      : sel
        ? '(no internal splits)'
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
            options={[4, 5, 6, 7].map((k) => ({ value: k, label: String(k) }))}
          />
          <Kicker>
            Fix a circular order of n leaves; the compatible trees are the
            triangulations of the n-gon. They form the associahedron K
            <sub>n−1</sub> (dim n−3): a {assoc.dim}-dimensional polytope here.
          </Kicker>
        </div>
      ),
    },
    {
      id: 'stats',
      title: 'Tree space',
      arch: 'readout',
      estHeight: 220,
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
      id: 'energy',
      title: 'Energy (placeholder)',
      arch: 'color',
      estHeight: 120,
      node: (
        <Kicker>
          Vertices are colored teal → magenta by a <b>placeholder</b> energy (total
          internal-split span). The terrain window pushes each vertex out by that
          energy. The real circular-order energy from a distance matrix is the next
          piece.
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
          key={`faithful-${n}`}
          assoc={assoc}
          energies={energies}
          displace={false}
          selected={selected}
          onSelect={setSelected}
        />
      ),
    },
    {
      id: 'terrain',
      title: 'Energy terrain',
      defaultRect: { x: 916, y: 16, w: 540, h: 560 },
      node: (
        <AssocView
          key={`terrain-${n}`}
          assoc={assoc}
          energies={energies}
          displace
          selected={selected}
          onSelect={setSelected}
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
