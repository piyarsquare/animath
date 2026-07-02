import React, { useRef } from 'react';
import Workspace from '../../chrome/workspace/Workspace';
import type { SectionDef, ViewDef } from '../../chrome/workspace/types';
import { Pills, Slider, Checkbox } from '../../components/ControlPanel';
import { usePersistentState } from '../../lib/usePersistentState';
import { type Planar, pt, mul, affine, kindLabel, kindOf } from '../Argand/numberPlanes';
import explainer from './EXPLAINER.md?raw';

// ---------------------------------------------------------------------------
// Number Plane — one expression, three arithmetics.
// A single panel with three plots (p = −1, 0, +1) rendering the SAME expression
// under each plane's own multiplication: |z| level sets (circle / line pair /
// hyperbola), f(z) = αz + β (turn / shear / squeeze, plus slide), and f(z) = z².
// The Beat-4 comparator of the Number Planes story; engine = numberPlanes.ts
// (its first consumer). May grow to replace Argand Plane.
// ---------------------------------------------------------------------------

const R = 3; // world half-range per plot

type ExprId = 'unit' | 'affine' | 'square';

// The three planes are distinct *identities* → discrete data tokens (never --accent).
const planeCol = (p: number) =>
  p < 0 ? 'var(--data-1, #5fe3cd)' : p === 0 ? 'var(--data-2, #ffce47)' : 'var(--data-3, #ff5aa6)';
const A1_COL = 'var(--data-4, #b08cff)';
const A0_COL = 'var(--data-5, #69a8ff)';

// ---- geometry helpers ----
const V = 340; // viewBox size
const sx = (x: number) => ((x + R) / (2 * R)) * V;
const sy = (y: number) => V - ((y + R) / (2 * R)) * V;
const poly = (ps: Planar[]) =>
  ps.filter(q => isFinite(q.x) && isFinite(q.y) && Math.abs(q.x) < R * 4 && Math.abs(q.y) < R * 4)
    .map(q => `${sx(q.x).toFixed(1)},${sy(q.y).toFixed(1)}`).join(' ');

function samples(a: number, b: number, n = 48): number[] {
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(a + ((b - a) * i) / n);
  return out;
}

/** |z| = r level set of x² − p·y², for any p (ellipse / line pair / hyperbolas). */
function levelSet(p: number, r: number): Planar[][] {
  if (p < 0) {
    const s = 1 / Math.sqrt(-p); // ellipse: x = r cos, y = (r/√|p|) sin
    return [samples(0, 2 * Math.PI).map(t => pt(r * Math.cos(t), r * s * Math.sin(t)))];
  }
  if (p === 0) return [
    samples(-R, R).map(y => pt(r, y)),
    samples(-R, R).map(y => pt(-r, y)),
  ];
  const s = 1 / Math.sqrt(p);
  const T = 2.4;
  return [
    samples(-T, T).map(t => pt(r * Math.cosh(t), r * s * Math.sinh(t))),  // x² − p·y² = r²
    samples(-T, T).map(t => pt(-r * Math.cosh(t), r * s * Math.sinh(t))),
    samples(-T, T).map(t => pt(r * Math.sinh(t), r * s * Math.cosh(t))),  // x² − p·y² = −r²
    samples(-T, T).map(t => pt(r * Math.sinh(t), -r * s * Math.cosh(t))),
  ];
}

/** The "no way back" set: numbers with |z| = 0 (nothing multiplies them to 1). */
function nullSet(p: number): Planar[][] {
  if (p < 0) return [];
  if (p === 0) return [samples(-R, R).map(y => pt(0, y))];
  const s = 1 / Math.sqrt(p); // y = ±x/√p
  return [
    samples(-R, R).map(t => pt(t, t * s)),
    samples(-R, R).map(t => pt(t, -t * s)),
  ];
}

// ---- one plot ----
interface PlotProps {
  p: number;
  expr: ExprId;
  a1: Planar;
  a0: Planar;
  showGrid: boolean;
  showNull: boolean;
  onDrag: (which: 'a1' | 'a0', z: Planar) => void;
}

const fmtP = (p: number) => (p === 0 ? '0' : (p > 0 ? '+' : '−') + String(Math.round(Math.abs(p) * 100) / 100));

function PlanePlot({ p, expr, a1, a0, showGrid, showNull, onDrag }: PlotProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragging = useRef<'a1' | 'a0' | null>(null);
  const col = planeCol(p);

  const map = (z: Planar): Planar =>
    expr === 'affine' ? affine(z, a1, a0, p) : mul(z, z, p);

  const toWorld = (e: React.PointerEvent): Planar => {
    const r = svgRef.current!.getBoundingClientRect();
    return pt(
      ((e.clientX - r.left) / r.width) * 2 * R - R,
      R - ((e.clientY - r.top) / r.height) * 2 * R,
    );
  };

  const onDown = (e: React.PointerEvent) => {
    if (expr !== 'affine') return;
    const w = toWorld(e);
    const d1 = Math.hypot(w.x - a1.x, w.y - a1.y);
    const d0 = Math.hypot(w.x - a0.x, w.y - a0.y);
    if (Math.min(d1, d0) > 0.45) return;
    dragging.current = d1 <= d0 ? 'a1' : 'a0';
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const w = toWorld(e);
    const clamp = (v: number) => Math.max(-R, Math.min(R, Math.round(v * 20) / 20));
    onDrag(dragging.current, pt(clamp(w.x), clamp(w.y)));
  };
  const onUp = () => { dragging.current = null; };

  // source grid lines (faint) and their images (plane-colored)
  const gridLines: Planar[][] = [];
  if (expr !== 'unit') {
    for (let k = -2; k <= 2; k++) {
      gridLines.push(samples(-2, 2, 40).map(t => pt(k, t)));
      gridLines.push(samples(-2, 2, 40).map(t => pt(t, k)));
    }
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${V} ${V}`}
      style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none',
        cursor: expr === 'affine' ? 'grab' : 'default' }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
    >
      {/* axes */}
      <line x1={0} y1={sy(0)} x2={V} y2={sy(0)} stroke="var(--fg)" strokeOpacity={0.25} />
      <line x1={sx(0)} y1={0} x2={sx(0)} y2={V} stroke="var(--fg)" strokeOpacity={0.25} />
      {[-2, -1, 1, 2].map(k => (
        <g key={k}>
          <line x1={sx(k)} y1={sy(0) - 4} x2={sx(k)} y2={sy(0) + 4} stroke="var(--fg)" strokeOpacity={0.3} />
          <line x1={sx(0) - 4} y1={sy(k)} x2={sx(0) + 4} y2={sy(k)} stroke="var(--fg)" strokeOpacity={0.3} />
        </g>
      ))}

      {/* the null set — numbers with no way back */}
      {showNull && nullSet(p).map((c, i) => (
        <polyline key={`n${i}`} points={poly(c)} fill="none" stroke="var(--fg)"
          strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="5 5" />
      ))}

      {expr === 'unit' ? (
        // |z| = r level sets; r = 1 bold
        [0.5, 1, 1.5, 2].map(r =>
          levelSet(p, r).map((c, i) => (
            <polyline key={`${r}-${i}`} points={poly(c)} fill="none" stroke={col}
              strokeWidth={r === 1 ? 3 : 1.3} strokeOpacity={r === 1 ? 1 : 0.55} />
          )),
        )
      ) : (
        <>
          {showGrid && gridLines.map((line, i) => (
            <polyline key={`s${i}`} points={poly(line)} fill="none" stroke="var(--fg)" strokeOpacity={0.12} />
          ))}
          {gridLines.map((line, i) => (
            <polyline key={`m${i}`} points={poly(line.map(map))} fill="none" stroke={col}
              strokeWidth={1.6} strokeOpacity={0.85} />
          ))}
          {expr === 'affine' && (
            <>
              <circle cx={sx(a1.x)} cy={sy(a1.y)} r={8} fill={A1_COL} stroke="var(--card)" strokeWidth={2} />
              <text x={sx(a1.x) + 11} y={sy(a1.y) - 8} fill={A1_COL}
                fontSize={13} fontWeight={700} fontFamily="var(--font-mono, monospace)">α</text>
              <circle cx={sx(a0.x)} cy={sy(a0.y)} r={8} fill={A0_COL} stroke="var(--card)" strokeWidth={2} />
              <text x={sx(a0.x) + 11} y={sy(a0.y) - 8} fill={A0_COL}
                fontSize={13} fontWeight={700} fontFamily="var(--font-mono, monospace)">β</text>
            </>
          )}
        </>
      )}

      {/* plane label */}
      <text x={10} y={22} fill={col} fontSize={14} fontWeight={700}
        fontFamily="var(--font-mono, monospace)">
        {`p = ${fmtP(p)}`}
      </text>
      <text x={10} y={40} fill="var(--fg)" fillOpacity={0.6} fontSize={12}
        fontFamily="var(--font-sans, sans-serif)">
        {kindLabel[kindOf(p)]}
      </text>
    </svg>
  );
}

// ---- the app ----
export default function NumberPlane() {
  const [expr, setExpr] = usePersistentState<ExprId>('number-plane:expr', 'unit');
  const [dial, setDial] = usePersistentState('number-plane:dial', 1);
  const [a1, setA1] = usePersistentState<Planar>('number-plane:a1', pt(1.2, 0.6));
  const [a0, setA0] = usePersistentState<Planar>('number-plane:a0', pt(0.4, 0.3));
  const [showGrid, setShowGrid] = usePersistentState('number-plane:src-grid', true);
  const [showNull, setShowNull] = usePersistentState('number-plane:null-set', true);

  // One knob, three planes: the outer plots ride the dial (−p and +p); the dual
  // plane sits fixed at 0 between them. Turn the dial to 0 and both worlds
  // flatten into it.
  const planes = [-dial, 0, dial];

  const onDrag = (which: 'a1' | 'a0', z: Planar) => (which === 'a1' ? setA1(z) : setA0(z));

  const exprNode = (
    <div>
      <Pills<ExprId>
        label="Expression"
        options={[
          { value: 'unit', label: '|z| = r' },
          { value: 'affine', label: 'αz + β' },
          { value: 'square', label: 'z²' },
        ]}
        value={expr}
        onChange={setExpr}
      />
      <p style={{ fontSize: 12.5, opacity: 0.75, margin: '10px 2px 0', lineHeight: 1.5 }}>
        {expr === 'unit'
          ? 'The set |z| = r in each arithmetic: circle · line pair · hyperbola.'
          : expr === 'affine'
            ? 'y = mx + b, promoted to the plane. Drag α and β on any plot — all three share them.'
            : 'The same square, three ways: the grid bends differently under each multiplication.'}
      </p>
    </div>
  );

  const dialNode = (
    <div>
      <Slider label="p" value={dial} min={0} max={2} step={0.05} onChange={setDial}
        format={v => v.toFixed(2)} stops={[{ value: 1, label: '1' }]} />
      <p style={{ fontSize: 12.5, opacity: 0.75, margin: '8px 2px 0', lineHeight: 1.5 }}>
        One knob: the left plot shows j² = −p, the right j² = +p; the dual plane
        (0) holds still between them. Turn toward 0 and both worlds flatten into it.
      </p>
    </div>
  );

  const paramsNode = (
    <div>
      <Slider label="α · re" value={a1.x} min={-2} max={2} step={0.05} onChange={v => setA1(pt(v, a1.y))} />
      <Slider label="α · im" value={a1.y} min={-2} max={2} step={0.05} onChange={v => setA1(pt(a1.x, v))} />
      <Slider label="β · re" value={a0.x} min={-2} max={2} step={0.05} onChange={v => setA0(pt(v, a0.y))} />
      <Slider label="β · im" value={a0.y} min={-2} max={2} step={0.05} onChange={v => setA0(pt(a0.x, v))} />
    </div>
  );

  const marksNode = (
    <div>
      <Checkbox label="Source grid" checked={showGrid} onChange={setShowGrid} />
      <Checkbox label="Null set (|z| = 0)" checked={showNull} onChange={setShowNull} />
    </div>
  );

  const sections: SectionDef[] = [
    { id: 'expression', title: 'Expression', arch: 'subject', node: exprNode, estHeight: 140 },
    { id: 'dial', title: 'The dial', arch: 'drive', node: dialNode, estHeight: 150 },
    { id: 'params', title: 'Coefficients', arch: 'domain', node: paramsNode, estHeight: 220 },
    { id: 'marks', title: 'Marks', arch: 'marks', node: marksNode, estHeight: 100 },
  ];

  const views: ViewDef[] = [
    {
      id: 'planes',
      title: 'Three planes',
      defaultRect: { x: 370, y: 16, w: 880, h: 380 },
      node: (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexWrap: 'wrap',
          alignItems: 'stretch', gap: 8, padding: 8, background: 'var(--viz-bg, #0c0c10)' }}>
          {planes.map((p, i) => (
            <div key={i} style={{ flex: '1 1 220px', minWidth: 220, border: '1px solid var(--rule)',
              borderRadius: 8, overflow: 'hidden' }}>
              <PlanePlot p={p} expr={expr} a1={a1} a0={a0}
                showGrid={showGrid} showNull={showNull} onDrag={onDrag} />
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <Workspace
      appId="number-plane"
      title="Number Plane"
      subtitle="j² = p"
      sections={sections}
      views={views}
      explainer={explainer}
    />
  );
}
