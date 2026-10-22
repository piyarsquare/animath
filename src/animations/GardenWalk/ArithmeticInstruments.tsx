import React, { useId, useRef, useState } from 'react';
import { Checkbox, NumberInput, Pills, Slider } from '../../components/ControlPanel';
import { boundInput, dualSquare, formatNumber as fmt, multiply, slotNumber } from './arithmetic';
import './arithmetic.css';

export type MultiplicationState = { a: number; b: number; c: number; d: number; p: number };
export type DerivativeState = { a: number; b: number; expanded: boolean };
type Controlled<T> = { value: T; onChange: (value: T) => void };
type Operand = 'u' | 'v';

function Slots({ real, second, unit }: { real: number; second: number; unit: string }) {
  return <dl className="garden-arithmetic-slots" aria-live="polite">
    <div><dt>Real slot</dt><dd>{fmt(real)}</dd></div>
    <div><dt>Second slot ({unit} coefficient)</dt><dd>{fmt(second)}</dd></div>
  </dl>;
}

export function MultiplicationInstrument({ value, onChange }: Controlled<MultiplicationState>) {
  const { a, b, c, d, p } = value;
  const [selected, setSelected] = useState<Operand>('u');
  const drag = useRef<{ operand: Operand; extent: number; pointer: number } | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [dragExtent, setDragExtent] = useState<number | null>(null);
  const [real, second] = multiply(a, b, c, d, p);
  const extent = dragExtent ?? (Math.max(3, Math.abs(real), Math.abs(second), Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d)) + 1);
  const scale = 140 / extent;
  const X = (x: number) => 220 + x * scale;
  const Y = (y: number) => 170 - y * scale;
  const same = Math.abs(a - c) < 0.001 && Math.abs(b - d) < 0.001;
  const update = (key: keyof MultiplicationState, n: number) => onChange({ ...value, [key]: n });
  const setOperand = (operand: Operand, x: number, y: number) => onChange(operand === 'u'
    ? { ...value, a: boundInput(x), b: boundInput(y) }
    : { ...value, c: boundInput(x), d: boundInput(y) });
  const move = (event: React.PointerEvent<SVGSVGElement>) => {
    const active = drag.current;
    const matrix = svg.current?.getScreenCTM();
    if (!active || !matrix || active.pointer !== event.pointerId) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    setOperand(active.operand, (point.x - 220) * active.extent / 140, (170 - point.y) * active.extent / 140);
  };
  const handle = (operand: Operand) => {
    const x = operand === 'u' ? a : c;
    const y = operand === 'u' ? b : d;
    return <circle key={operand} cx={X(x)} cy={Y(y)} r={operand === selected ? 10 : 7}
      className={`garden-arithmetic-handle garden-arithmetic-${operand}`} tabIndex={0} role="button"
      aria-label={`Move ${operand}, currently (${fmt(x)}, ${fmt(y)}). Arrow keys change coordinates by 0.1.`}
      onPointerDown={event => {
        event.preventDefault(); setSelected(operand);
        drag.current = { operand, extent, pointer: event.pointerId };
        setDragExtent(extent);
        svg.current?.setPointerCapture(event.pointerId);
      }}
      onKeyDown={event => {
        const steps: Record<string, [number, number]> = { ArrowLeft: [-0.1, 0], ArrowRight: [0.1, 0], ArrowUp: [0, 0.1], ArrowDown: [0, -0.1] };
        const step = steps[event.key];
        if (step) { event.preventDefault(); setSelected(operand); setOperand(operand, x + step[0], y + step[1]); }
      }} />;
  };
  return <section className="garden-arithmetic" aria-label="Multiplication instrument">
    <p className="garden-arithmetic-formula">u = a + bj, v = c + dj, j² = {fmt(p)}<br />
      uv = (ac + pbd) + (ad + bc)j = <strong>{slotNumber(real, second, 'j')}</strong></p>
    <div className="garden-arithmetic-layout">
      <div className="garden-arithmetic-controls">
        <Slider label="Multiplication rule p = j²" min={-1} max={1} step={0.01} value={p} onChange={n => update('p', n)} format={fmt} />
        <Pills label="Arithmetic presets" value={p} onChange={n => update('p', n)} options={[
          { value: -1, label: '−1 · complex' }, { value: 0, label: '0 · dual' }, { value: 1, label: '+1 · split' },
        ]} />
        <div className="garden-arithmetic-fields">
          <NumberInput label="a · real part of u" value={a} onChange={n => update('a', n)} min={-3} max={3} step={0.1} />
          <NumberInput label="b · second part of u" value={b} onChange={n => update('b', n)} min={-3} max={3} step={0.1} />
          <NumberInput label="c · real part of v" value={c} onChange={n => update('c', n)} min={-3} max={3} step={0.1} />
          <NumberInput label="d · second part of v" value={d} onChange={n => update('d', n)} min={-3} max={3} step={0.1} />
        </div>
        <p className="garden-arithmetic-note">Operand coordinates range from −3 to 3. Calculations use the current rule, including between presets.</p>
        <Pills<Operand> label="Choose the handle to move when u and v overlap" value={selected} onChange={setSelected}
          options={[{ value: 'u', label: 'Move u' }, { value: 'v', label: 'Move v' }]} />
      </div>
      <figure className="garden-arithmetic-figure">
        <svg ref={svg} className="garden-arithmetic-plot" viewBox="0 0 440 355" aria-label="Operands u and v and their product in the number plane"
          onPointerMove={move} onPointerUp={() => { drag.current = null; setDragExtent(null); }} onPointerCancel={() => { drag.current = null; setDragExtent(null); }}
          onLostPointerCapture={() => { drag.current = null; setDragExtent(null); }}>
          <line className="garden-arithmetic-axis" x1="25" y1="170" x2="415" y2="170" />
          <line className="garden-arithmetic-axis" x1="220" y1="20" x2="220" y2="320" />
          {[-1, 1].map(sign => <g key={sign} className="garden-arithmetic-ticks">
            <text x={X(sign * extent)} y="188" textAnchor="middle">{fmt(sign * extent)}</text>
            <text x="211" y={Y(sign * extent)} textAnchor="end">{fmt(sign * extent)}</text>
          </g>)}
          <text x="408" y="158" textAnchor="end">real</text><text x="230" y="28">j slot</text>
          <text x="211" y="187" textAnchor="end">0</text>
          <line className="garden-arithmetic-vector garden-arithmetic-u" x1="220" y1="170" x2={X(a)} y2={Y(b)} />
          <line className="garden-arithmetic-vector garden-arithmetic-v" x1="220" y1="170" x2={X(c)} y2={Y(d)} />
          <line className="garden-arithmetic-vector garden-arithmetic-output" x1="220" y1="170" x2={X(real)} y2={Y(second)} />
          <rect className="garden-arithmetic-output" x={X(real) - 5} y={Y(second) - 5} width="10" height="10" />
          <text x={X(real) + 11} y={Y(second) - 10}>uv</text>
          <text x={X(a) + 13} y={Y(b) + 22}>{same ? 'u = v' : 'u'}</text>
          {!same && <text x={X(c) + 13} y={Y(d) + 22}>v</text>}
          {handle(selected === 'u' ? 'v' : 'u')}{handle(selected)}
        </svg>
        <figcaption>Drag a round operand handle. The square is uv. After dragging, the axes rescale to keep the product visible.</figcaption>
      </figure>
    </div>
    <Slots real={real} second={second} unit="j" />
  </section>;
}

export function DerivativeInstrument({ value, onChange }: Controlled<DerivativeState>) {
  const { a, b, expanded } = value;
  const { real, slot, slope } = dualSquare(a, b);
  const clip = useId().replace(/:/g, '');
  const X = (x: number) => 35 + (x + 3.5) * 370 / 7;
  const Y = (y: number) => 310 - (y + 3) * 280 / 15;
  const curve = Array.from({ length: 101 }, (_, i) => {
    const x = -3.5 + i * 7 / 100;
    return `${i === 0 ? 'M' : 'L'}${X(x)},${Y(x * x)}`;
  }).join(' ');
  return <section className="garden-arithmetic" aria-label="Square derivative instrument">
    <p>Predict first: at a = 2, what will the second slot of (a + ε)² be?</p>
    <p className="garden-arithmetic-formula">ε² = 0<br />
      (a + bε)² = a² + 2abε + b²ε² = a² + 2abε<br />
      ({slotNumber(a, b, 'ε')})² = <strong>{slotNumber(real, slot, 'ε')}</strong></p>
    <div className="garden-arithmetic-layout">
      <div className="garden-arithmetic-controls">
        <Slider label="Input a" value={a} min={-3} max={3} step={0.1} onChange={n => onChange({ ...value, a: n })} format={fmt} />
        <NumberInput label="a · position on the real graph" value={a} min={-3} max={3} step={0.1} onChange={n => onChange({ ...value, a: n })} />
        {!expanded && <p><strong>b = 1</strong> in the guided example.</p>}
        <Checkbox label="Explore another direction b" checked={expanded} onChange={enabled => onChange({ ...value, expanded: enabled, b: enabled ? b : 1 })} />
        {expanded && <NumberInput label="b · direction, including zero" value={b} min={-3} max={3} step={0.1} onChange={n => onChange({ ...value, b: n })} />}
        <p>The tangent slope is f′(a) = 2a = <strong>{fmt(slope)}</strong>.</p>
        <p>The second slot is b f′(a) = {fmt(b)} × {fmt(slope)} = <strong>{fmt(slot)}</strong>.
          {b === 1 ? ' With b = 1, this is the derivative.' : b === 0 ? ' With b = 0, the slot is zero even when the tangent has a nonzero slope.' : ' This is the change in direction b; it is not generally the derivative itself.'}</p>
      </div>
      <figure className="garden-arithmetic-figure">
        <svg className="garden-arithmetic-plot" viewBox="0 0 440 355" role="img" aria-label={`Graph of t squared with tangent at (${fmt(a)}, ${fmt(real)}), slope ${fmt(slope)}`}>
          <defs><clipPath id={clip}><rect x="35" y="30" width="370" height="280" /></clipPath></defs>
          <line className="garden-arithmetic-axis" x1="35" y1={Y(0)} x2="405" y2={Y(0)} />
          <line className="garden-arithmetic-axis" x1={X(0)} y1="30" x2={X(0)} y2="310" />
          <text x="405" y={Y(0) + 22} textAnchor="end">t</text><text x={X(0) + 9} y="23">f(t) = t²</text>
          {[-3, -2, -1, 1, 2, 3].map(x => <text key={x} className="garden-arithmetic-ticks" x={X(x)} y={Y(0) + 17} textAnchor="middle">{fmt(x)}</text>)}
          {[4, 8, 12].map(y => <text key={y} className="garden-arithmetic-ticks" x={X(0) - 8} y={Y(y) + 4} textAnchor="end">{y}</text>)}
          <g clipPath={`url(#${clip})`}>
            <path className="garden-arithmetic-curve" d={curve} />
            <line className="garden-arithmetic-tangent" x1={X(-3.5)} y1={Y(real + slope * (-3.5 - a))} x2={X(3.5)} y2={Y(real + slope * (3.5 - a))} />
            <circle className="garden-arithmetic-u" cx={X(a)} cy={Y(real)} r="6" />
          </g>
          <text x={Math.min(335, X(a) + 12)} y={Math.max(48, Y(real) - 12)}>(a, a²)</text>
        </svg>
        <figcaption>The solid curve is t². The dashed line is its tangent at a; changing b changes the slot, while the tangent stays at a.</figcaption>
      </figure>
    </div>
    <Slots real={real} second={slot} unit="ε" />
    <p className="garden-arithmetic-note">This identity is exact in dual arithmetic because ε² = 0. No tiny nonzero ε or division by b is used. Displayed decimals are rounded.</p>
  </section>;
}
