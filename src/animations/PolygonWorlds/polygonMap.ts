/**
 * The n-gon edge-diagram mini-map — the general fundamental-polygon picture for
 * worlds whose domain is not a square (the hyperbolic genus-2 octagon, the
 * cross-cap hexagons). It draws the regular 2n-gon read straight from the edge
 * word: each generator gets a color, each boundary edge an arrow in the word's
 * direction (reversed for an inverse letter), so glued edges share a color and
 * their arrows show how they identify. The player marker is the Poincaré-disk
 * position of the player's representative inside the home polygon.
 *
 * The square worlds keep their dedicated `squareMap`; this is the n-gon counterpart
 * the build plan called for (so the octagon is legible).
 */

import * as THREE from 'three';
import { cornerColor } from './decor';

export interface PolygonLetter { gen: number; inv: boolean }

export interface PolygonMarker {
  /** Poincaré-disk coords of the player's representative (math axes, +y up). */
  px: number;
  py: number;
  /** Heading in disk coords. */
  hx: number;
  hy: number;
  flipped: boolean;
}

export interface PolygonMapSpec {
  sides: number;            // m = 2n
  baseAngle: number;        // angle of vertex 0 (matches realize())
  /** Poincaré radius of the polygon vertices (≤ 1). */
  rhoV: number;
  letters: PolygonLetter[]; // per boundary edge, length m
  marker: PolygonMarker | null;
  label: string;
}

const PALETTE = ['#ff4060', '#4080ff', '#34d6c0', '#b070ff', '#ffb24a', '#7affb0'];

export function drawPolygonMap(ctx: CanvasRenderingContext2D, size: number, spec: PolygonMapSpec | null): void {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(10,12,20,0.72)';
  ctx.fillRect(0, 0, size, size);
  if (!spec) return;

  const cx = size / 2, cy = size / 2;
  const R = size / 2 - 18;                 // Poincaré radius 1 → R px
  const { sides: m, baseAngle, rhoV, letters } = spec;
  // disk coords (math, +y up) → canvas
  const toX = (x: number) => cx + x * R;
  const toY = (y: number) => cy - y * R;

  // faint disk boundary (the circle at infinity)
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

  // polygon vertices on the Poincaré disk
  const vx: number[] = [], vy: number[] = [];
  for (let k = 0; k < m; k++) {
    const a = baseAngle + (2 * Math.PI * k) / m;
    vx.push(rhoV * Math.cos(a)); vy.push(rhoV * Math.sin(a));
  }

  // interior fill
  ctx.beginPath();
  ctx.moveTo(toX(vx[0]), toY(vy[0]));
  for (let k = 1; k < m; k++) ctx.lineTo(toX(vx[k]), toY(vy[k]));
  ctx.closePath();
  ctx.fillStyle = 'rgba(46,60,86,0.4)'; ctx.fill();

  // edges + identification arrows
  for (let k = 0; k < m; k++) {
    const a = vx[k], b = vy[k], cX = vx[(k + 1) % m], cY = vy[(k + 1) % m];
    const col = PALETTE[(letters[k]?.gen ?? 0) % PALETTE.length];
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(toX(a), toY(b)); ctx.lineTo(toX(cX), toY(cY)); ctx.stroke();
    // arrow at the midpoint, along the boundary (reversed for an inverse letter)
    const mx = (a + cX) / 2, my = (b + cY) / 2;
    let dx = cX - a, dy = cY - b; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
    if (letters[k]?.inv) { dx = -dx; dy = -dy; }
    const ang = Math.atan2(-dy, dx); // canvas angle (+y down)
    ctx.save(); ctx.translate(toX(mx), toY(my)); ctx.rotate(ang);
    ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-3, -4.5); ctx.lineTo(3, 0); ctx.lineTo(-3, 4.5); ctx.stroke();
    ctx.restore();
  }

  // numbered corner chips — the same 1..m indices + hues as the ground corner
  // markers (vertex k ↔ real.vertices[k]), pulled slightly inside the boundary.
  for (let k = 0; k < m; k++) {
    const px = toX(vx[k] * 0.84), py = toY(vy[k] * 0.84);
    ctx.beginPath(); ctx.arc(px, py, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = '#' + new THREE.Color(cornerColor(k, m)).getHexString(); ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.stroke();
    ctx.fillStyle = '#0a0c14'; ctx.font = '700 10px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(k + 1), px, py + 0.5);
  }

  // player marker
  if (spec.marker) {
    const px = toX(spec.marker.px), py = toY(spec.marker.py);
    const ang = Math.atan2(-spec.marker.hy, spec.marker.hx);
    ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
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
