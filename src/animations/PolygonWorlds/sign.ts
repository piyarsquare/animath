import * as THREE from 'three';

/**
 * A plantable **glass sign**: a slim metal post carrying a see-through plaque with
 * a different ink on each face — FRONT in warm amber, BACK in cool cyan. Because
 * both inks are DoubleSide planes inside transparent glass, each one also shows
 * through from the plaque's other side, **mirror-reversed by geometry alone** —
 * front text crisp from the front with the cyan ink ghosting through reversed,
 * and vice versa. That is the whole lesson: ink read from its back side is
 * mirror-reversed, and the two hues tell you WHICH ink you're reading even when
 * it's backwards. The back ink is *rotated* π about Y to face −z, never
 * mirror-scaled — the decor law (S06): no baked mirrors, only proper transforms.
 */

const INK_FRONT = '#ffd24a';   // warm amber — the FRONT face's ink
const INK_BACK = '#57d8ff';    // cool cyan — the BACK face's ink

/**
 * One face's ink, drawn on a transparent canvas: a single bold line, auto-shrunk
 * to fit the plaque (capped at ~16 characters so it never degenerates), with a
 * dark stroke so either hue stays legible against the world behind the glass.
 */
function inkTexture(text: string, ink: string): THREE.CanvasTexture {
  const w = 512, h = 320;
  const cvs = document.createElement('canvas');
  cvs.width = w; cvs.height = h;
  const ctx = cvs.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  const line = (text.trim() || '·').slice(0, 16);
  const font = (px: number) => `900 ${Math.round(px)}px "Segoe UI", system-ui, sans-serif`;
  let size = h * 0.56;
  ctx.font = font(size);
  const maxW = w * 0.92;
  const measured = ctx.measureText(line).width;
  if (measured > maxW) { size *= maxW / measured; ctx.font = font(size); }

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(4, size * 0.1);
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(line, w / 2, h * 0.52);
  ctx.fillStyle = ink;
  ctx.fillText(line, w / 2, h * 0.52);

  const t = new THREE.CanvasTexture(cvs);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

export interface SignBuilder {
  /** A fresh instance of the sign. Local frame: base of the post at the origin,
   *  post along +y, the FRONT face looking toward +z. Instances share
   *  geometries/materials/textures; dispose() releases the shared resources. */
  make(): THREE.Group;
  dispose(): void;
}

export function makeSignBuilder(front: string, back: string): SignBuilder {
  // structure — slim metal post + base disc, the glass plaque, the ink planes
  const postGeo = new THREE.CylinderGeometry(0.07, 0.07, 1.5, 12);
  const baseGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.08, 18);
  const plaqueGeo = new THREE.BoxGeometry(1.8, 1.1, 0.05);
  const stripGeo = new THREE.BoxGeometry(1.8, 0.05, 0.012);
  const inkGeo = new THREE.PlaneGeometry(1.7, 1.0);

  const metalMat = new THREE.MeshStandardMaterial({ color: 0x8a909c, roughness: 0.45, metalness: 0.7, side: THREE.DoubleSide });
  // clearly glass: pale tint, very transparent, no depth write so the world (and
  // the other face's ink) reads through it
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xbfe8ff, transparent: true, opacity: 0.3, roughness: 0.12, metalness: 0.1,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const frontTex = inkTexture(front, INK_FRONT);
  const backTex = inkTexture(back, INK_BACK);
  // DoubleSide is the whole point: each ink shows through the glass from its
  // other side, mirror-reversed purely by geometry.
  const frontMat = new THREE.MeshBasicMaterial({ map: frontTex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const backMat = new THREE.MeshBasicMaterial({ map: backTex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  // thin hue strips along the plaque's top edge — a color key for each face
  const frontStripMat = new THREE.MeshBasicMaterial({ color: INK_FRONT });
  const backStripMat = new THREE.MeshBasicMaterial({ color: INK_BACK });

  const make = (): THREE.Group => {
    const g = new THREE.Group();
    const post = new THREE.Mesh(postGeo, metalMat); post.position.y = 0.75;
    const base = new THREE.Mesh(baseGeo, metalMat); base.position.y = 0.04;
    const plaque = new THREE.Mesh(plaqueGeo, glassMat); plaque.position.y = 2.0;

    // FRONT ink — faces +z, just proud of the glass. Deliberately NOT tagged
    // userData.ink: unlike the trail (which legitimately renders through det<0
    // deck transforms), a sign's placement is always PROPER — mirror-reading
    // comes only from genuinely viewing the back of the ink — so the decor
    // audit must guard these meshes.
    const fInk = new THREE.Mesh(inkGeo, frontMat);
    fInk.position.set(0, 2.0, 0.04);
    // BACK ink — turned (a proper rotation, never a mirror) to face −z, so its
    // text reads correctly from behind
    const bInk = new THREE.Mesh(inkGeo, backMat);
    bInk.position.set(0, 2.0, -0.04);
    bInk.rotation.y = Math.PI;

    // matching color strips on the top edge: amber side = front, cyan side = back
    const fStrip = new THREE.Mesh(stripGeo, frontStripMat); fStrip.position.set(0, 2.52, 0.031);
    const bStrip = new THREE.Mesh(stripGeo, backStripMat); bStrip.position.set(0, 2.52, -0.031);

    g.add(post, base, plaque, fInk, bInk, fStrip, bStrip);
    return g;
  };

  return {
    make,
    dispose: () => {
      postGeo.dispose(); baseGeo.dispose(); plaqueGeo.dispose(); stripGeo.dispose(); inkGeo.dispose();
      metalMat.dispose(); glassMat.dispose();
      frontMat.dispose(); backMat.dispose(); frontStripMat.dispose(); backStripMat.dispose();
      frontTex.dispose(); backTex.dispose();
    },
  };
}
