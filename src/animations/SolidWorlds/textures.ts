import * as THREE from 'three';

/** `#rrggbb` → `rgba(r,g,b,a)`. */
function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * A **painted face** for the Rooms decor: a faint colored tint + a bold border
 * and a grid, plus one **chiral up-arrow** motif (a flag jutting off one side, so
 * it is asymmetric under both rotation and reflection). Each glued face-pair
 * shares a color (X red · Y green · Z blue, the corner-marker convention), so the
 * room reads as an oriented box: you always know which way you face, you
 * recognize the wall you came through, and you watch it return rotated or
 * mirrored after a loop. Tint baked into the texture's alpha so one unlit
 * material can be semi-transparent (see-through) yet draw a crisp motif.
 */
export function faceMotifTexture(hex: string): THREE.CanvasTexture {
  const S = 320;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = S;
  const ctx = cvs.getContext('2d')!;
  ctx.clearRect(0, 0, S, S);

  // faint tint fill + bold border
  ctx.fillStyle = rgba(hex, 0.16);
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = rgba(hex, 0.9);
  ctx.lineWidth = 18;
  ctx.strokeRect(9, 9, S - 18, S - 18);

  // subtle grid (thirds)
  ctx.strokeStyle = rgba(hex, 0.22);
  ctx.lineWidth = 3;
  for (let i = 1; i <= 2; i++) {
    const p = (S * i) / 3;
    ctx.beginPath(); ctx.moveTo(p, 12); ctx.lineTo(p, S - 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, p); ctx.lineTo(S - 12, p); ctx.stroke();
  }

  // chiral up-arrow: spine + head + a flag on the RIGHT (so a mirror moves the
  // flag to the left, a quarter-turn rotates the whole mark)
  ctx.fillStyle = 'rgba(245,247,250,0.96)';
  ctx.strokeStyle = 'rgba(245,247,250,0.96)';
  ctx.lineWidth = 26; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(S * 0.4, S * 0.76); ctx.lineTo(S * 0.4, S * 0.34); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(S * 0.4, S * 0.18);
  ctx.lineTo(S * 0.27, S * 0.4);
  ctx.lineTo(S * 0.53, S * 0.4);
  ctx.closePath(); ctx.fill();
  ctx.fillRect(S * 0.4, S * 0.42, S * 0.22, S * 0.12);

  const t = new THREE.CanvasTexture(cvs);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/**
 * The footprint glyph — the classic orientation-test pair: an arrow with an
 * **F**, cyan on the print's left and magenta on its right (the same glyph
 * Polygon Worlds stamps in 2D). Because the print is built from an explicit
 * frame (forward, left, normal), the *handedness* of that frame is the print's
 * genuine chirality: a stamp written through a det < 0 transform — or viewed by
 * a mirror-reversed walker — reads cyan-on-the-right, i.e. backwards. There is
 * no normal to absorb the flip in a 3-manifold, so it lands on the body.
 */
export function footprintTexture(): THREE.CanvasTexture {
  const s = 128;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  ctx.clearRect(0, 0, s, s);

  const arrow = () => {
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.05); // tip (forward = canvas top)
    ctx.lineTo(s * 0.86, s * 0.42);
    ctx.lineTo(s * 0.65, s * 0.42);
    ctx.lineTo(s * 0.65, s * 0.96);
    ctx.lineTo(s * 0.35, s * 0.96);
    ctx.lineTo(s * 0.35, s * 0.42);
    ctx.lineTo(s * 0.14, s * 0.42);
    ctx.closePath();
  };

  arrow(); ctx.fillStyle = '#33d6ff'; ctx.fill();                 // whole, then overpaint right
  ctx.save(); ctx.beginPath(); ctx.rect(s * 0.5, 0, s * 0.5, s); ctx.clip();
  arrow(); ctx.fillStyle = '#ff4fa3'; ctx.fill(); ctx.restore(); // right half magenta
  arrow(); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.stroke();

  ctx.font = `bold ${Math.round(s * 0.42)}px Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.strokeText('F', s * 0.5, s * 0.64);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('F', s * 0.5, s * 0.64);

  const t = new THREE.CanvasTexture(cvs);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/**
 * A face label — a big axis letter (X/Y/Z) in the pairing's color, with a glyph
 * for what the gluing does (↔ straight · ↻ turn · ⇋ flip), on a transparent
 * ground so it floats on the cube face. Lets you read which axis you face and
 * what crossing it does.
 */
export function faceLabelTexture(letter: string, glyph: string, color: string): THREE.CanvasTexture {
  const s = 256;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  ctx.clearRect(0, 0, s, s);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.font = `900 ${Math.round(s * 0.5)}px "Segoe UI", system-ui, sans-serif`;
  ctx.strokeText(letter, s / 2, s * 0.44); ctx.fillStyle = color; ctx.fillText(letter, s / 2, s * 0.44);
  ctx.font = `700 ${Math.round(s * 0.26)}px "Segoe UI", system-ui, sans-serif`;
  ctx.lineWidth = 6; ctx.strokeText(glyph, s / 2, s * 0.8); ctx.fillText(glyph, s / 2, s * 0.8);
  const t = new THREE.CanvasTexture(cvs);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/**
 * One opaque sign face: bold text on a solid plaque. Used for the two faces of
 * the FRONT/BACK slab. Read head-on it says what it says; seen by a
 * mirror-reversed walker it reads laterally reversed — its mirror image — purely
 * by geometry, no baked flip.
 */
export function signTexture(text: string): THREE.CanvasTexture {
  const w = 512, h = 256;
  const cvs = document.createElement('canvas');
  cvs.width = w; cvs.height = h;
  const ctx = cvs.getContext('2d')!;
  ctx.fillStyle = '#f4ead2';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#3a2c14';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, w - 10, h - 10);

  const line = (text.trim() || '·').slice(0, 12);
  let size = h * 0.5;
  const font = (px: number) => `900 ${Math.round(px)}px "Segoe UI", system-ui, sans-serif`;
  ctx.font = font(size);
  const maxW = w * 0.86;
  const measured = ctx.measureText(line).width;
  if (measured > maxW) { size *= maxW / measured; ctx.font = font(size); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#7a1d1d';
  ctx.fillText(line, w / 2, h / 2);

  const t = new THREE.CanvasTexture(cvs);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
