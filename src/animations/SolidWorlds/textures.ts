import * as THREE from 'three';

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
