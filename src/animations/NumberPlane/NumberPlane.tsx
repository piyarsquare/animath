import React, { useEffect, useRef } from 'react';
import Workspace from '../../chrome/workspace/Workspace';
import type { LayoutDef, SectionDef, ViewDef } from '../../chrome/workspace/types';
import { Pills, Slider, Checkbox } from '../../components/ControlPanel';
import { usePersistentState } from '../../lib/usePersistentState';
import { type Planar, pt, mul, affine, kindLabel, kindOf } from '../Argand/numberPlanes';
import explainer from './EXPLAINER.md?raw';

// ---------------------------------------------------------------------------
// Number Plane — one expression, three arithmetics.
// Three plots (j² = −p, 0, +p) render the SAME expression under each plane's
// own multiplication. Feeds: a draggable point z (with its image and an
// iterated orbit), preset shapes, or a grid; a t-morph + Play animates
// source → image; a "rails" slider realigns the split plot's frame onto its
// asymptotes (the complex plot has no real rails to align — that's the point).
// Engine: Argand/numberPlanes.ts.
// ---------------------------------------------------------------------------

const R = 3;   // world half-range per plot
const V = 340; // viewBox size

type ExprId = 'unit' | 'affine' | 'square';
type FeedId = 'point' | 'shape' | 'grid';
type ShapeId = 'circle' | 'square' | 'triangle';

// The three planes are distinct *identities* → discrete data tokens (never --accent).
const planeCol = (p: number) =>
  p < 0 ? 'var(--data-1, #5fe3cd)' : p === 0 ? 'var(--data-2, #ffce47)' : 'var(--data-3, #ff5aa6)';
const A1_COL = 'var(--data-4, #b08cff)';
const A0_COL = 'var(--data-5, #69a8ff)';
const Z_COL = 'var(--data-6, #f0f0f4)';

const sx = (x: number) => ((x + R) / (2 * R)) * V;
const sy = (y: number) => V - ((y + R) / (2 * R)) * V;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpP = (a: Planar, b: Planar, t: number) => pt(lerp(a.x, b.x, t), lerp(a.y, b.y, t));

function samples(a: number, b: number, n = 48): number[] {
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(a + ((b - a) * i) / n);
  return out;
}

/** |z| = r level set of x² − p·y², for any p (ellipse / line pair / hyperbolas). */
function levelSet(p: number, r: number): Planar[][] {
  if (p < 0) {
    const s = 1 / Math.sqrt(-p);
    return [samples(0, 2 * Math.PI).map(t => pt(r * Math.cos(t), r * s * Math.sin(t)))];
  }
  if (p === 0) return [
    samples(-R, R).map(y => pt(r, y)),
    samples(-R, R).map(y => pt(-r, y)),
  ];
  const s = 1 / Math.sqrt(p);
  const T = 2.4;
  return [
    samples(-T, T).map(t => pt(r * Math.cosh(t), r * s * Math.sinh(t))),
    samples(-T, T).map(t => pt(-r * Math.cosh(t), r * s * Math.sinh(t))),
    samples(-T, T).map(t => pt(r * Math.sinh(t), r * s * Math.cosh(t))),
    samples(-T, T).map(t => pt(r * Math.sinh(t), -r * s * Math.cosh(t))),
  ];
}

/** The "no way back" set: numbers with |z| = 0 (nothing multiplies them to 1). */
function nullSet(p: number): Planar[][] {
  if (p < 0) return [];
  if (p === 0) return [samples(-R, R).map(y => pt(0, y))];
  const s = 1 / Math.sqrt(p);
  return [
    samples(-R, R).map(t => pt(t, t * s)),
    samples(-R, R).map(t => pt(t, -t * s)),
  ];
}

// ---- change of basis: align the frame to the rails (asymptotes), p > 0 only.
// T sends the asymptote directions (1, ±1/√p) onto the axes; at p = 1 and s = 1
// it is exactly a 45° rotation. Interpolated matrix keeps det > 0 throughout.
type Mat = [number, number, number, number]; // row-major [a b; c d]
function railMatrix(p: number, s: number): Mat {
  if (p <= 1e-9 || s <= 0) return [1, 0, 0, 1];
  const rp = Math.sqrt(p);
  const c = 1 / Math.sqrt(2 * rp);
  const m: Mat = [c, c * rp, -c, c * rp];
  return [lerp(1, m[0], s), lerp(0, m[1], s), lerp(0, m[2], s), lerp(1, m[3], s)];
}
const matApply = (m: Mat, z: Planar): Planar => pt(m[0] * z.x + m[1] * z.y, m[2] * z.x + m[3] * z.y);
function matInvApply(m: Mat, z: Planar): Planar {
  const det = m[0] * m[3] - m[1] * m[2];
  return pt((m[3] * z.x - m[1] * z.y) / det, (-m[2] * z.x + m[0] * z.y) / det);
}

// ---- feed shapes ----
function shapePts(shape: ShapeId): Planar[] {
  if (shape === 'circle') return samples(0, 2 * Math.PI, 72).map(t => pt(1.1 + 0.65 * Math.cos(t), 0.55 + 0.65 * Math.sin(t)));
  if (shape === 'square') {
    const c = pt(0.95, 0.6), h = 0.55, out: Planar[] = [];
    const corners = [pt(c.x - h, c.y - h), pt(c.x + h, c.y - h), pt(c.x + h, c.y + h), pt(c.x - h, c.y + h), pt(c.x - h, c.y - h)];
    for (let i = 0; i < 4; i++) for (const t of samples(0, 1, 16)) out.push(lerpP(corners[i], corners[i + 1], t));
    return out;
  }
  const v = [pt(0.35, 0.15), pt(1.6, 0.3), pt(0.9, 1.35), pt(0.35, 0.15)], out: Planar[] = [];
  for (let i = 0; i < 3; i++) for (const t of samples(0, 1, 20)) out.push(lerpP(v[i], v[i + 1], t));
  return out;
}

const fmtP = (p: number) => (p === 0 ? '0' : (p > 0 ? '+' : '−') + String(Math.round(Math.abs(p) * 100) / 100));

// ---- one plot ----
interface PlotProps {
  p: number;
  expr: ExprId;
  feed: FeedId;
  shape: ShapeId;
  a1: Planar;
  a0: Planar;
  z0: Planar;
  t: number;
  iterN: number;
  rails: number;
  showGrid: boolean;
  showNull: boolean;
  onDrag: (which: 'a1' | 'a0' | 'z0', z: Planar) => void;
}

function PlanePlot(props: PlotProps) {
  const { p, expr, feed, shape, a1, a0, z0, t, iterN, rails, showGrid, showNull, onDrag } = props;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragging = useRef<'a1' | 'a0' | 'z0' | null>(null);
  const col = planeCol(p);
  const M = railMatrix(p, rails);

  const map = (z: Planar): Planar => (expr === 'affine' ? affine(z, a1, a0, p) : mul(z, z, p));
  // view = rail basis applied on top of world coords
  const view = (z: Planar) => matApply(M, z);
  const poly = (ps: Planar[]) =>
    ps.map(view)
      .filter(q => isFinite(q.x) && isFinite(q.y) && Math.abs(q.x) < R * 6 && Math.abs(q.y) < R * 6)
      .map(q => `${sx(q.x).toFixed(1)},${sy(q.y).toFixed(1)}`).join(' ');

  const toWorld = (e: React.PointerEvent): Planar => {
    const r = svgRef.current!.getBoundingClientRect();
    const vw = pt(
      ((e.clientX - r.left) / r.width) * 2 * R - R,
      R - ((e.clientY - r.top) / r.height) * 2 * R,
    );
    return matInvApply(M, vw);
  };

  const targets: Array<['a1' | 'a0' | 'z0', Planar]> = [];
  if (expr === 'affine') { targets.push(['a1', a1], ['a0', a0]); }
  if (feed === 'point' && expr !== 'unit') targets.push(['z0', z0]);

  const onDown = (e: React.PointerEvent) => {
    const w = toWorld(e);
    let best: 'a1' | 'a0' | 'z0' | null = null, bd = 0.5;
    for (const [k, q] of targets) {
      const d = Math.hypot(w.x - q.x, w.y - q.y);
      if (d < bd) { bd = d; best = k; }
    }
    if (!best) return;
    dragging.current = best;
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const w = toWorld(e);
    const clamp = (v: number) => Math.max(-R, Math.min(R, Math.round(v * 20) / 20));
    onDrag(dragging.current, pt(clamp(w.x), clamp(w.y)));
  };
  const onUp = () => { dragging.current = null; };

  // source geometry for the mapped feeds
  const sourceLines: Planar[][] = [];
  if (expr !== 'unit') {
    if (feed === 'grid') {
      for (let k = -2; k <= 2; k++) {
        sourceLines.push(samples(-2, 2, 40).map(u => pt(k, u)));
        sourceLines.push(samples(-2, 2, 40).map(u => pt(u, k)));
      }
    } else if (feed === 'shape') {
      sourceLines.push(shapePts(shape));
    }
  }

  // the iterated orbit (point feed): z, f(z), f²(z), … under THIS plane's p
  const orbit: Planar[] = [];
  if (expr !== 'unit' && feed === 'point') {
    let z = z0;
    orbit.push(z);
    for (let i = 0; i < iterN; i++) { z = map(z); orbit.push(z); if (!isFinite(z.x) || !isFinite(z.y)) break; }
  }

  const marker = (q: Planar, fill: string, r: number, label?: string, key?: string) => {
    const vq = view(q);
    return (
      <g key={key}>
        <circle cx={sx(vq.x)} cy={sy(vq.y)} r={r} fill={fill} stroke="var(--card)" strokeWidth={2} />
        {label && <text x={sx(vq.x) + 10} y={sy(vq.y) - 8} fill={fill} fontSize={13} fontWeight={700}
          fontFamily="var(--font-mono, monospace)">{label}</text>}
      </g>
    );
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${V} ${V}`}
      style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none',
        cursor: targets.length ? 'grab' : 'default' }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
    >
      {/* frame axes (the current basis — these stay put; the world realigns) */}
      <line x1={0} y1={sy(0)} x2={V} y2={sy(0)} stroke="var(--fg)" strokeOpacity={0.25} />
      <line x1={sx(0)} y1={0} x2={sx(0)} y2={V} stroke="var(--fg)" strokeOpacity={0.25} />
      {[-2, -1, 1, 2].map(k => (
        <g key={k}>
          <line x1={sx(k)} y1={sy(0) - 4} x2={sx(k)} y2={sy(0) + 4} stroke="var(--fg)" strokeOpacity={0.3} />
          <line x1={sx(0) - 4} y1={sy(k)} x2={sx(0) + 4} y2={sy(k)} stroke="var(--fg)" strokeOpacity={0.3} />
        </g>
      ))}

      {showNull && nullSet(p).map((c, i) => (
        <polyline key={`n${i}`} points={poly(c)} fill="none" stroke="var(--fg)"
          strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="5 5" />
      ))}

      {expr === 'unit' ? (
        [0.5, 1, 1.5, 2].map(r =>
          levelSet(p, r).map((c, i) => (
            <polyline key={`${r}-${i}`} points={poly(c)} fill="none" stroke={col}
              strokeWidth={r === 1 ? 3 : 1.3} strokeOpacity={r === 1 ? 1 : 0.55} />
          )),
        )
      ) : (
        <>
          {/* faint source, plane-colored image morphing source → image with t */}
          {showGrid && sourceLines.map((line, i) => (
            <polyline key={`s${i}`} points={poly(line)} fill="none" stroke="var(--fg)" strokeOpacity={0.14} />
          ))}
          {sourceLines.map((line, i) => (
            <polyline key={`m${i}`} points={poly(line.map(q => lerpP(q, map(q), t)))} fill="none"
              stroke={col} strokeWidth={1.7} strokeOpacity={0.85} />
          ))}

          {feed === 'point' && (
            <>
              {iterN > 1 && <polyline points={poly(orbit)} fill="none" stroke={col} strokeWidth={1.4} strokeOpacity={0.6} />}
              {orbit.slice(1, iterN > 1 ? orbit.length : 2).map((q, i) =>
                marker(iterN > 1 ? q : lerpP(z0, q, t), col, i === 0 ? 6 : Math.max(2.5, 5 - i * 0.4),
                  i === 0 ? (expr === 'square' ? 'z²' : 'f(z)') : undefined, `o${i}`))}
              {marker(z0, Z_COL, 7, 'z')}
            </>
          )}

          {expr === 'affine' && (
            <>
              {marker(a1, A1_COL, 8, 'α')}
              {marker(a0, A0_COL, 8, 'β')}
            </>
          )}
        </>
      )}

      <text x={10} y={22} fill={col} fontSize={14} fontWeight={700}
        fontFamily="var(--font-mono, monospace)">{`p = ${fmtP(p)}`}</text>
      <text x={10} y={40} fill="var(--fg)" fillOpacity={0.6} fontSize={12}
        fontFamily="var(--font-sans, sans-serif)">{kindLabel[kindOf(p)]}</text>
      {rails > 0 && p > 0 && (
        <text x={10} y={V - 12} fill="var(--fg)" fillOpacity={0.5} fontSize={11}
          fontFamily="var(--font-sans, sans-serif)">frame → rails {(rails * 100).toFixed(0)}%</text>
      )}
    </svg>
  );
}

// ---- the app ----
export default function NumberPlane() {
  const [expr, setExpr] = usePersistentState<ExprId>('number-plane:expr', 'unit');
  const [feed, setFeed] = usePersistentState<FeedId>('number-plane:feed', 'grid');
  const [shape, setShape] = usePersistentState<ShapeId>('number-plane:shape', 'circle');
  const [dial, setDial] = usePersistentState('number-plane:dial', 1);
  const [a1, setA1] = usePersistentState<Planar>('number-plane:a1', pt(1.2, 0.6));
  const [a0, setA0] = usePersistentState<Planar>('number-plane:a0', pt(0.4, 0.3));
  const [z0, setZ0] = usePersistentState<Planar>('number-plane:z0', pt(1.3, 0.5));
  const [iterN, setIterN] = usePersistentState('number-plane:iter', 1);
  const [rails, setRails] = usePersistentState('number-plane:rails', 0);
  const [showGrid, setShowGrid] = usePersistentState('number-plane:src-grid', true);
  const [showNull, setShowNull] = usePersistentState('number-plane:null-set', true);
  const [t, setT] = React.useState(1);
  const [playing, setPlaying] = React.useState(false);

  // Play: sweep t 0 → 1 and loop (a beat of rest at each end).
  useEffect(() => {
    if (!playing) return;
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 2200; last = now;
      setT(v => (v + dt > 1.25 ? -0.25 : v + dt));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  const tShown = Math.max(0, Math.min(1, t));

  const planes = [-dial, 0, dial];
  const onDrag = (which: 'a1' | 'a0' | 'z0', z: Planar) =>
    which === 'a1' ? setA1(z) : which === 'a0' ? setA0(z) : setZ0(z);

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
      {expr !== 'unit' && (
        <>
          <Pills<FeedId>
            label="Feed"
            options={[
              { value: 'point', label: 'Point' },
              { value: 'shape', label: 'Shape' },
              { value: 'grid', label: 'Grid' },
            ]}
            value={feed}
            onChange={setFeed}
          />
          {feed === 'shape' && (
            <Pills<ShapeId>
              label="Shape"
              options={[
                { value: 'circle', label: '○' },
                { value: 'square', label: '□' },
                { value: 'triangle', label: '△' },
              ]}
              value={shape}
              onChange={setShape}
            />
          )}
        </>
      )}
      <p style={{ fontSize: 12.5, opacity: 0.75, margin: '10px 2px 0', lineHeight: 1.5 }}>
        {expr === 'unit'
          ? 'The set |z| = r in each arithmetic: circle · line pair · hyperbola.'
          : expr === 'affine'
            ? 'y = mx + b, promoted to the plane. Drag α, β — and z — on any plot; all three share them.'
            : 'z² in each arithmetic. The white z is what gets squared — drag it and watch all three squares move.'}
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

  const playNode = (
    <div>
      <Slider label="t · source → image" value={tShown} min={0} max={1} step={0.01}
        onChange={v => { setPlaying(false); setT(v); }} format={v => v.toFixed(2)} />
      <div style={{ margin: '8px 0' }}>
        <button
          onClick={() => setPlaying(pl => !pl)}
          style={{ font: 'inherit', fontSize: 13, fontWeight: 600, padding: '6px 16px', borderRadius: 8,
            border: '1px solid var(--rule)', background: playing ? 'var(--accent)' : 'var(--soft)',
            color: playing ? 'var(--bg)' : 'var(--fg)', cursor: 'pointer' }}
        >
          {playing ? '❚❚ Pause' : '▶ Play'}
        </button>
      </div>
      <Slider label="Iterate (Point feed)" value={iterN} min={1} max={14} step={1} onChange={setIterN}
        format={v => (v <= 1 ? 'off' : `${v} steps`)} />
      <p style={{ fontSize: 12.5, opacity: 0.75, margin: '8px 2px 0', lineHeight: 1.5 }}>
        Iterating the same z under each plane's f: spiral · shear · saddle.
      </p>
    </div>
  );

  const axesNode = (
    <div>
      <Slider label="Align frame to rails" value={rails} min={0} max={1} step={0.01} onChange={setRails}
        format={v => `${(v * 100).toFixed(0)}%`} />
      <p style={{ fontSize: 12.5, opacity: 0.75, margin: '8px 2px 0', lineHeight: 1.5 }}>
        Realigns the boost plot's frame onto its asymptotes (the rails) — at 100%
        the hyperbolas sit square to the axes and × is two independent stretches.
        The dual plane's rail already is an axis. The complex plane doesn't move:
        it has no real rails to align. That failure is the whole story.
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
      <Checkbox label="Source (faint)" checked={showGrid} onChange={setShowGrid} />
      <Checkbox label="Null set (|z| = 0)" checked={showNull} onChange={setShowNull} />
    </div>
  );

  const sections: SectionDef[] = [
    { id: 'expression', title: 'Expression', arch: 'subject', node: exprNode, estHeight: 230 },
    { id: 'dial', title: 'The dial', arch: 'drive', node: dialNode, estHeight: 150 },
    { id: 'play', title: 'Play', arch: 'playback', node: playNode, estHeight: 240 },
    { id: 'axes', title: 'Axes', arch: 'view', node: axesNode, estHeight: 170 },
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
              <PlanePlot p={p} expr={expr} feed={feed} shape={shape} a1={a1} a0={a0} z0={z0}
                t={tShown} iterN={iterN} rails={rails}
                showGrid={showGrid} showNull={showNull} onDrag={onDrag} />
            </div>
          ))}
        </div>
      ),
    },
  ];

  const layouts: LayoutDef[] = [
    {
      id: 'essentials', name: 'Essentials', sub: 'Expression · Dial · Play', icon: 'tune',
      open: { expression: { x: 24, y: 16 }, dial: { x: 24, y: 300 }, play: { x: 24, y: 486 } },
    },
  ];

  return (
    <Workspace
      appId="number-plane"
      title="Number Plane"
      subtitle="j² = p"
      sections={sections}
      views={views}
      layouts={layouts}
      defaultLayoutId="essentials"
      explainer={explainer}
    />
  );
}
