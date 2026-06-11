import * as THREE from 'three';

/**
 * The decorated fundamental polygon, shared identically by all worlds. It carries a
 * set of numbered, colored **landmarks**; each landmark has a fixed coordinate
 * (u, v) ∈ [0,1]² in the domain and TWO forms keyed by which face of the sheet it
 * is on — a **tree** on the top (blue) face and a **column** on the bottom (brown)
 * face, at the *same* (u, v). They grow *away* from the sheet (tree up, column
 * down), so they sit exactly back-to-back and neither penetrates the surface. A
 * non-orientable gluing turns the whole sheet over (a rigid transparency-flip),
 * which swaps every landmark tree ↔ column. Everything on the face you stand on
 * always reads upright; the chiral number+arrow decals read reversed only when
 * seen THROUGH the sheet from its other side — the orientation cue the app is
 * built around.
 *
 * Landmarks come in two kinds:
 *   • **interior** — scattered/grid/ring inside the domain (user count + layout),
 *     kept *off the edges* (a landmark sitting on a gluing edge would be split half
 *     tree / half column across the identification, which reads as a confused
 *     object — so we keep them clear of the boundary),
 *   • **center**  — one distinctive beacon at (0.5, 0.5), drawn differently on the
 *     two faces (gold spire up vs magenta spire down) so top and bottom are
 *     immediately distinguishable.
 *
 * Everything is authored in unit-square (u, v) so the one layout drops onto every
 * cover (plane cell, sphere chart, hyperbolic tile).
 */

export type PropKind = 'interior' | 'center';

export interface DecorProp { u: number; v: number; color: number; label: string; kind: PropKind }

export type ArrangementId = 'scattered' | 'grid' | 'ring';

export const ARRANGEMENTS: { id: ArrangementId; label: string }[] = [
  { id: 'scattered', label: 'Scattered' },
  { id: 'grid', label: 'Grid' },
  { id: 'ring', label: 'Ring' },
];

/** Low-discrepancy sequence for an even "random-looking" scatter. */
function halton(i: number, base: number): number {
  let r = 0, f = 1;
  while (i > 0) { f /= base; r += f * (i % base); i = Math.floor(i / base); }
  return r;
}

const hue = (i: number) => new THREE.Color().setHSL((i * 0.61803398875) % 1, 0.62, 0.58).getHex();

/** A unique, evenly-spaced hue for corner marker `i` of `count` — distinct as a
 *  set so every corner reads as its own color. Shared by the 3D markers and the
 *  mini-map so the numbers + colors correspond. */
export const cornerColor = (i: number, count: number): number =>
  new THREE.Color().setHSL((i / Math.max(1, count)) % 1, 0.72, 0.56).getHex();

/** Roman numeral for a small positive integer (corner markers go up to 8). */
export function romanize(n: number): string {
  const table: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let r = '';
  for (const [v, sym] of table) while (n >= v) { r += sym; n -= v; }
  return r;
}

/** Generate the landmark set: one center beacon, then `count` interior markers laid
 *  out by `arrangement`, all kept off the domain edges. Deterministic + stable. */
export function generateProps(count: number, arrangement: ArrangementId): DecorProp[] {
  const props: DecorProp[] = [];
  // center beacon (special; its color is set per-face by the builder)
  props.push({ u: 0.5, v: 0.5, color: 0xffd24a, label: '★', kind: 'center' });

  // interior markers — spread through the domain but held clear of the edges
  const m = 0.12, span = 1 - 2 * m;
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / cols));
  for (let i = 0; i < count; i++) {
    let u: number, v: number;
    if (arrangement === 'grid') {
      u = m + span * ((i % cols) + 0.5) / cols;
      v = m + span * (Math.floor(i / cols) + 0.5) / rows;
    } else if (arrangement === 'ring') {
      const a = (i / count) * Math.PI * 2;
      u = 0.5 + 0.32 * Math.cos(a);
      v = 0.5 + 0.32 * Math.sin(a);
    } else {
      u = m + span * halton(i + 1, 2);
      v = m + span * halton(i + 1, 3);
    }
    props.push({ u, v, color: hue(i + 1), label: String(i + 1), kind: 'interior' });
  }
  return props;
}

/** A reasonable default set (7 interior + center). */
export const DEFAULT_PROPS = generateProps(7, 'scattered');

/** Rounded-rect path helper for the badge backing. */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * The chiral landmark badge: a high-contrast rounded plaque with the landmark
 * **number** (left) and a **→ arrow** (right), both in the landmark's hue over a
 * dark backing with a bright hued rim. Number + arrow are an asymmetric, chiral
 * device: seen from the sheet's other side (through the glass) the glyph reads
 * reversed — this is the canonical orientation cue the app is built on, so the
 * badge is geometry-fixed (never billboarded) and just rides the sheet.
 * Drawn at 256px on a transparent canvas; the dark backing keeps it legible at
 * distance against either the warm-lit top face or the cool-lit underside.
 */
function labelTexture(label: string, color: number): THREE.CanvasTexture {
  const s = 256;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  ctx.clearRect(0, 0, s, s);

  const hex = '#' + new THREE.Color(color).getHexString();
  // a bright tint of the hue for the glyphs (readable on the dark plaque)
  const glyph = '#' + new THREE.Color(color).clone().lerp(new THREE.Color(0xffffff), 0.45).getHexString();

  // dark rounded plaque with a glowing hued rim
  const pad = s * 0.1, pw = s - 2 * pad, ph = s * 0.62, py = (s - ph) / 2;
  roundRect(ctx, pad, py, pw, ph, s * 0.12);
  ctx.fillStyle = 'rgba(8,11,22,0.86)';
  ctx.fill();
  ctx.lineWidth = s * 0.045;
  ctx.strokeStyle = hex;
  ctx.stroke();

  const cy = s * 0.5;
  // number (left)
  ctx.font = `900 ${Math.round(s * 0.4)}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = s * 0.05;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(label, s * 0.4, cy);
  ctx.fillStyle = glyph;
  ctx.fillText(label, s * 0.4, cy);

  // arrow (right) — the chiral partner of the number
  const ax = s * 0.66, aw = s * 0.16, ah = s * 0.13;
  ctx.beginPath();
  ctx.moveTo(ax, cy - ah); ctx.lineTo(ax + aw, cy); ctx.lineTo(ax, cy + ah);
  ctx.closePath();
  ctx.fillStyle = glyph;
  ctx.lineWidth = s * 0.03; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.fill(); ctx.stroke();
  // shaft of the arrow
  ctx.lineWidth = s * 0.05; ctx.strokeStyle = glyph;
  ctx.beginPath(); ctx.moveTo(s * 0.58, cy); ctx.lineTo(ax + aw * 0.2, cy); ctx.stroke();

  const t = new THREE.CanvasTexture(cvs);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/**
 * The face of a ground **corner marker** — a round, manhole-cover plate carrying a
 * single numeral (Arabic on the tree/top face, Roman on the column/bottom face) in
 * the corner's unique hue, over a dark steel disc with a hued rim. Drawn at 256px;
 * mapped onto a flat disc that lies on the floor, so it reads when you stand on it
 * and (mirrored) through the glass from the other side. Roman numerals are set in
 * a SERIF face — the serifs separate the strokes, so I/II/III read at a glance
 * (sans-serif Roman numerals blur into a picket fence).
 */
function numeralTexture(text: string, color: number, serif: boolean): THREE.CanvasTexture {
  const s = 256;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  ctx.clearRect(0, 0, s, s);
  const c = s / 2, r = s * 0.46;
  const hex = '#' + new THREE.Color(color).getHexString();
  const glyph = '#' + new THREE.Color(color).clone().lerp(new THREE.Color(0xffffff), 0.5).getHexString();

  // brushed-steel disc
  const grad = ctx.createRadialGradient(c, c * 0.8, r * 0.1, c, c, r);
  grad.addColorStop(0, '#5b626e');
  grad.addColorStop(1, '#262a32');
  ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fillStyle = grad; ctx.fill();
  // hued rim ring
  ctx.lineWidth = s * 0.05; ctx.strokeStyle = hex;
  ctx.beginPath(); ctx.arc(c, c, r - s * 0.03, 0, Math.PI * 2); ctx.stroke();
  // dark inner ring for contrast
  ctx.lineWidth = s * 0.012; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath(); ctx.arc(c, c, r - s * 0.075, 0, Math.PI * 2); ctx.stroke();

  // numeral
  const size = text.length >= 4 ? 0.34 : text.length === 3 ? 0.42 : 0.56;
  ctx.font = serif
    ? `bold ${Math.round(s * size)}px Georgia, "Times New Roman", serif`
    : `900 ${Math.round(s * size)}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = s * 0.05; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(text, c, c * 1.03);
  ctx.fillStyle = glyph;
  ctx.fillText(text, c, c * 1.03);

  const t = new THREE.CanvasTexture(cvs);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

export interface FundamentalSquareDecor {
  readonly props: readonly DecorProp[];
  /** Top-face form of landmark i (a tree, or the gold center spire). Grows +y from
   *  its base at the origin, so the caller plants the base on the face. */
  makeTop(i: number): THREE.Group;
  /** Bottom-face form of landmark i (a column, or the magenta center spire). Also
   *  grows +y from its base; the caller turns it (rigidly) onto the underside. */
  makeBottom(i: number): THREE.Group;
  /** Top-face **corner marker** — a ground-level manhole-cover disc marking a
   *  polygon corner, carrying the corner's Arabic numeral in its unique `color`.
   *  Lies flat (grows a little +y from the floor); the presenter places one just
   *  inside every vertex. `index` is the 1-based corner number. */
  makeCornerTop(index: number, color: number): THREE.Group;
  /** Bottom-face corner marker — the same disc on the column/underside face,
   *  carrying the **Roman** numeral (the tree↔column / Arabic↔Roman split rides the
   *  flip). Same corner, other face. */
  makeCornerBottom(index: number, color: number): THREE.Group;
  dispose(): void;
}

export function makeFundamentalSquareDecor(props: readonly DecorProp[]): FundamentalSquareDecor {
  // ── TREE (organic): tapered trunk + a three-tier conical canopy ───────────────
  const trunkGeo = new THREE.CylinderGeometry(0.26, 0.46, 2.2, 12);
  const canopyGeo = [
    new THREE.ConeGeometry(1.55, 1.9, 16),   // lower, widest tier
    new THREE.ConeGeometry(1.18, 1.7, 16),   // middle tier
    new THREE.ConeGeometry(0.78, 1.5, 16),   // crown
  ];
  const canopyY = [2.55, 3.5, 4.4];

  // ── COLUMN (built): plinth + fluted shaft + capital + abacus ──────────────────
  const plinthGeo = new THREE.BoxGeometry(1.7, 0.5, 1.7);
  const shaftGeo = new THREE.CylinderGeometry(0.6, 0.72, 2.9, 20, 1);
  const capitalGeo = new THREE.CylinderGeometry(0.86, 0.62, 0.4, 20);
  const abacusGeo = new THREE.BoxGeometry(1.6, 0.32, 1.6);

  // ── center beacon: stepped pedestal + faceted spire + glowing finial ──────────
  const pedestalGeo = new THREE.CylinderGeometry(1.05, 1.25, 0.55, 8);
  const pedestalGeo2 = new THREE.CylinderGeometry(0.78, 0.95, 0.4, 8);
  const spireGeo = new THREE.ConeGeometry(0.7, 5.2, 6);
  const orbGeo = new THREE.SphereGeometry(0.6, 18, 14);
  const cubeGeo = new THREE.BoxGeometry(0.92, 0.92, 0.92);

  // ── CORNER MARKERS (ground-level manhole-cover discs marking polygon corners) ─
  // A squat metal disc with a raised rim and a numbered plate on top: Arabic on the
  // tree face, Roman on the column face, each corner its own hue. Replaces the old
  // tall vertex towers — corners read as flush ground markers, not skyline.
  const discBodyGeo = new THREE.CylinderGeometry(1.15, 1.24, 0.32, 36);
  const discRimGeo = new THREE.TorusGeometry(1.12, 0.1, 10, 40);
  const discPlateGeo = new THREE.CircleGeometry(1.02, 44);
  const discRimMat = new THREE.MeshStandardMaterial({ color: 0x9aa0ab, roughness: 0.4, metalness: 0.7, side: THREE.DoubleSide });
  // per-corner caches (one decor instance per world; disposed below)
  const cornerBodyMats = new Map<number, THREE.MeshStandardMaterial>();
  const cornerPlateMats = new Map<string, THREE.MeshBasicMaterial>();
  const cornerTexs: THREE.CanvasTexture[] = [];

  // ── number-badge plane (shared geometry; per-prop material/texture) ───────────
  const decalGeo = new THREE.PlaneGeometry(1.7, 1.7);
  const DECAL_DIRS = 3;        // outward-facing copies (every 120°) for all-round read

  const shaftMats: THREE.MeshStandardMaterial[] = [];
  const canopyMats: THREE.MeshStandardMaterial[] = [];
  const decalMats: THREE.MeshBasicMaterial[] = [];
  const decalTexs: THREE.CanvasTexture[] = [];
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
  // shared pale stone for the column's structural pieces (the hue lives on the shaft)
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xdedacb, roughness: 0.78, metalness: 0.02, side: THREE.DoubleSide });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xffcf4a, emissive: 0x7a5a00, emissiveIntensity: 0.7, roughness: 0.35, metalness: 0.45, side: THREE.DoubleSide });
  const magentaMat = new THREE.MeshStandardMaterial({ color: 0xff5ad0, emissive: 0x66004a, emissiveIntensity: 0.7, roughness: 0.35, metalness: 0.45, side: THREE.DoubleSide });

  for (const p of props) {
    // column shaft: a limestone tint carrying the landmark hue
    const stone = new THREE.Color(p.color).lerp(new THREE.Color(0xcfc9bd), 0.5);
    shaftMats.push(new THREE.MeshStandardMaterial({
      color: stone, emissive: p.color, emissiveIntensity: 0.16, roughness: 0.6, metalness: 0.03, side: THREE.DoubleSide,
    }));
    // tree canopy: a leafy green tint carrying the landmark hue
    const leaf = new THREE.Color(p.color).lerp(new THREE.Color(0x2f7d35), 0.62);
    canopyMats.push(new THREE.MeshStandardMaterial({
      color: leaf, emissive: leaf, emissiveIntensity: 0.16, roughness: 0.78, side: THREE.DoubleSide,
    }));
    const tex = labelTexture(p.label, p.color);
    decalTexs.push(tex);
    decalMats.push(new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  }

  /** A ring of `DECAL_DIRS` outward-facing number badges around the body axis at
   *  height `y` and radius `r`, sized `scale`. Every copy faces outward so the
   *  glyph reads correctly from any side when unflipped, and all mirror together
   *  under the sheet flip — the chiral cue, legible all the way around. */
  const numberRing = (i: number, y: number, r: number, scale: number): THREE.Group => {
    const ring = new THREE.Group();
    for (let k = 0; k < DECAL_DIRS; k++) {
      const a = (k / DECAL_DIRS) * Math.PI * 2;
      const d = new THREE.Mesh(decalGeo, decalMats[i]);
      d.scale.setScalar(scale);
      d.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
      d.rotation.y = a;              // face outward (radially)
      ring.add(d);
    }
    return ring;
  };

  const makeTree = (i: number): THREE.Group => {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.1;
    g.add(trunk);
    for (let t = 0; t < canopyGeo.length; t++) {
      const tier = new THREE.Mesh(canopyGeo[t], canopyMats[i]);
      tier.position.y = canopyY[t];
      g.add(tier);
    }
    g.add(numberRing(i, 1.45, 0.62, 0.78));
    return g;
  };

  const makeColumn = (i: number): THREE.Group => {
    const g = new THREE.Group();
    const plinth = new THREE.Mesh(plinthGeo, stoneMat); plinth.position.y = 0.25;
    const shaft = new THREE.Mesh(shaftGeo, shaftMats[i]); shaft.position.y = 1.95;
    const capital = new THREE.Mesh(capitalGeo, stoneMat); capital.position.y = 3.6;
    const abacus = new THREE.Mesh(abacusGeo, stoneMat); abacus.position.y = 3.96;
    g.add(plinth, shaft, capital, abacus, numberRing(i, 1.95, 0.78, 0.82));
    return g;
  };

  /** Shared corner-marker builder: a metal disc + rim + a numbered plate that
   *  faces +y (up out of the floor). `roman` picks the numeral style for the face. */
  const makeCorner = (index: number, color: number, roman: boolean): THREE.Group => {
    const g = new THREE.Group();
    let body = cornerBodyMats.get(color);
    if (!body) {
      const tint = new THREE.Color(color).lerp(new THREE.Color(0x4a5260), 0.35);
      body = new THREE.MeshStandardMaterial({
        color: tint, emissive: color, emissiveIntensity: 0.12, roughness: 0.5, metalness: 0.55, side: THREE.DoubleSide,
      });
      cornerBodyMats.set(color, body);
    }
    const disc = new THREE.Mesh(discBodyGeo, body); disc.position.y = 0.16;
    const rim = new THREE.Mesh(discRimGeo, discRimMat); rim.position.y = 0.32; rim.rotation.x = Math.PI / 2;

    const key = `${roman ? 'r' : 'a'}:${index}:${color}`;
    let plateMat = cornerPlateMats.get(key);
    if (!plateMat) {
      const tex = numeralTexture(roman ? romanize(index) : String(index), color, roman);
      cornerTexs.push(tex);
      plateMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
      cornerPlateMats.set(key, plateMat);
    }
    const plate = new THREE.Mesh(discPlateGeo, plateMat);
    plate.rotation.x = -Math.PI / 2; plate.position.y = 0.335;
    g.add(disc, rim, plate);
    return g;
  };
  const makeCornerTop = (index: number, color: number): THREE.Group => makeCorner(index, color, false);
  const makeCornerBottom = (index: number, color: number): THREE.Group => makeCorner(index, color, true);

  /** The center beacon — gold spire + orb (top) vs magenta spire + cube (bottom). */
  const makeCenter = (mat: THREE.MeshStandardMaterial, finial: 'orb' | 'cube'): THREE.Group => {
    const g = new THREE.Group();
    const ped = new THREE.Mesh(pedestalGeo, mat); ped.position.y = 0.27;
    const ped2 = new THREE.Mesh(pedestalGeo2, mat); ped2.position.y = 0.74;
    const spire = new THREE.Mesh(spireGeo, mat); spire.position.y = 3.5;
    const cap = new THREE.Mesh(finial === 'orb' ? orbGeo : cubeGeo, mat); cap.position.y = 6.4;
    g.add(ped, ped2, spire, cap);
    return g;
  };

  const makeTop = (i: number): THREE.Group =>
    props[i].kind === 'center' ? makeCenter(goldMat, 'orb') : makeTree(i);
  const makeBottom = (i: number): THREE.Group =>
    props[i].kind === 'center' ? makeCenter(magentaMat, 'cube') : makeColumn(i);

  return {
    props,
    makeTop,
    makeBottom,
    makeCornerTop,
    makeCornerBottom,
    dispose: () => {
      trunkGeo.dispose(); canopyGeo.forEach((g) => g.dispose()); decalGeo.dispose();
      plinthGeo.dispose(); shaftGeo.dispose(); capitalGeo.dispose(); abacusGeo.dispose();
      pedestalGeo.dispose(); pedestalGeo2.dispose(); spireGeo.dispose(); orbGeo.dispose(); cubeGeo.dispose();
      discBodyGeo.dispose(); discRimGeo.dispose(); discPlateGeo.dispose(); discRimMat.dispose();
      trunkMat.dispose(); stoneMat.dispose(); goldMat.dispose(); magentaMat.dispose();
      shaftMats.forEach((m) => m.dispose());
      canopyMats.forEach((m) => m.dispose());
      decalMats.forEach((m) => m.dispose());
      decalTexs.forEach((t) => t.dispose());
      cornerBodyMats.forEach((m) => m.dispose());
      cornerPlateMats.forEach((m) => m.dispose());
      cornerTexs.forEach((t) => t.dispose());
    },
  };
}
