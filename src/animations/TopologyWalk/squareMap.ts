import * as THREE from 'three';

/**
 * ONE square-fundamental-domain mini-map, parameterised by the edge-identification
 * rule, replacing the two near-identical canvas renderers the flat (torus / Klein)
 * and spherical (ℝP²) worlds carried separately. All three square presentations —
 * torus (both pairs glue straight), Klein bottle (one pair flips), ℝP² (both pairs
 * flip) — are the same picture with different edge colours, chevron directions and
 * an optional landmark set. The equirectangular sphere chart (`drawSphereMap`,
 * for the plain round sphere) is a genuinely different projection and stays in
 * the host.
 */

/** How one pair of opposite edges glues. `straight` = translation (both edges'
 *  arrows point the same way); `flip` = mirror gluing (the second edge's arrow
 *  reverses). */
export type EdgeGlue = 'straight' | 'flip';

export interface SquareEdgeSpec {
  color: string;
  glue: EdgeGlue;
  /** Double chevron (the canonical "second pair" mark) vs single. */
  double: boolean;
}

/** Player marker in square-normalised coords: sx,sy ∈ −1..1 with +y up; `angle`
 *  is the heading in canvas radians; `flipped` paints it amber (mirror sheet). */
export interface SquareMarker {
  sx: number;
  sy: number;
  angle: number;
  flipped: boolean;
}

/** A landmark dot in square-normalised coords. */
export interface SquareDot {
  sx: number;
  sy: number;
  color: number;
}

export interface SquareMapSpec {
  /** Top/bottom (horizontal) edge pair. */
  tb: SquareEdgeSpec;
  /** Left/right (vertical) edge pair. */
  lr: SquareEdgeSpec;
  marker: SquareMarker | null;
  dots: SquareDot[];
  /** Faint outline around the square (ℝP² draws it; flat does not). */
  border: boolean;
  /** Bottom caption; empty string draws none. */
  label: string;
}

/**
 * Chart S² → the "both-pairs-flipped" square fundamental domain of ℝP². Take the
 * z≥0 representative (so the chart boundary is the z=0 seam — the same place the
 * trees/columns swap), orthographically project that hemisphere to the unit disk
 * (x,y), then radially stretch the disk out to the square. Antipodal sphere points
 * then land on antipodal (negated) square points, which is exactly the square's
 * (x,y)~(−x,−y) gluing.
 */
export function rp2Square(x: number, y: number, z: number, flip: boolean): [number, number] {
  let X = x, Y = y;
  if (flip) { X = -X; Y = -Y; }
  const m = Math.max(Math.abs(X), Math.abs(Y));
  if (m < 1e-6) return [0, 0];
  const s = Math.hypot(X, Y) / m; // 1 … √2, maps the disk onto the square
  return [X * s, Y * s];
}

/**
 * Draw the square mini-map. `spec === null` renders just the empty backdrop +
 * square (the first-frame, no-state case).
 */
export function drawSquareMap(
  ctx: CanvasRenderingContext2D,
  size: number,
  spec: SquareMapSpec | null,
): void {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(10,12,20,0.72)';
  ctx.fillRect(0, 0, size, size);

  const m = 24, w = size - 2 * m, x0 = m, y0 = m, x1 = x0 + w, y1 = y0 + w;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  // square-normalised (sx,sy ∈ −1..1, +y up) → canvas
  const toX = (sx: number) => cx + sx * (w / 2);
  const toY = (sy: number) => cy - sy * (w / 2);

  // domain interior
  ctx.fillStyle = 'rgba(46,60,86,0.4)';
  ctx.fillRect(x0, y0, w, w);

  const seg = (ax: number, ay: number, bx: number, by: number, col: string) => {
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  };

  const chev = (px: number, py: number, ang: number, col: string, dbl: boolean) => {
    ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
    ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const tip = (o: number) => { ctx.beginPath(); ctx.moveTo(-3 + o, -4.5); ctx.lineTo(3 + o, 0); ctx.lineTo(-3 + o, 4.5); ctx.stroke(); };
    tip(2); if (dbl) tip(-4);
    ctx.restore();
  };

  if (!spec) return;
  const { tb, lr } = spec;

  // edges
  seg(x0, y0, x1, y0, tb.color); // top
  seg(x0, y1, x1, y1, tb.color); // bottom
  seg(x0, y0, x0, y1, lr.color); // left
  seg(x1, y0, x1, y1, lr.color); // right

  // identification chevrons. Reference: top → +x, left → down. A `flip` pair
  // rotates its second edge's chevron 180°; a `straight` pair keeps both alike.
  chev(cx, y0, 0, tb.color, tb.double);                                   // top
  chev(cx, y1, tb.glue === 'flip' ? Math.PI : 0, tb.color, tb.double);    // bottom
  chev(x0, cy, Math.PI / 2, lr.color, lr.double);                         // left
  chev(x1, cy, lr.glue === 'flip' ? -Math.PI / 2 : Math.PI / 2, lr.color, lr.double); // right

  if (spec.border) {
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1; ctx.strokeRect(x0, y0, w, w);
  }

  // landmark dots
  for (const d of spec.dots) {
    ctx.beginPath(); ctx.arc(toX(d.sx), toY(d.sy), 3.2, 0, Math.PI * 2);
    ctx.fillStyle = '#' + new THREE.Color(d.color).getHexString(); ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.stroke();
  }

  // player marker
  if (spec.marker) {
    const px = toX(spec.marker.sx), py = toY(spec.marker.sy);
    ctx.save(); ctx.translate(px, py); ctx.rotate(spec.marker.angle);
    ctx.beginPath();
    ctx.moveTo(8, 0); ctx.lineTo(-5, -5.5); ctx.lineTo(-2, 0); ctx.lineTo(-5, 5.5); ctx.closePath();
    ctx.fillStyle = spec.marker.flipped ? '#ffd24a' : '#8ef0ff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }

  if (spec.label) {
    ctx.font = '9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(spec.label, size / 2, size - 7);
  }
}
