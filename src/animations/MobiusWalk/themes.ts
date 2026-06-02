import * as THREE from 'three';

/** A look for the corridor: palette + lighting + a procedural wall texture. */
export interface MobiusTheme {
  id: string;
  label: string;
  background: number;
  fogNear: number;
  fogFar: number;
  ambient: number;
  lampColor: number;
  lampIntensity: number;
  color: number;
  metalness: number;
  roughness: number;
  emissive: number;
  emissiveIntensity: number;
  /** Use the wall texture as an emissive map (self-lit glow). */
  glow: boolean;
  iridescence: number;
  makeTexture: () => THREE.CanvasTexture;
}

function canvasTexture(
  draw: (ctx: CanvasRenderingContext2D, s: number) => void,
  panelUnits = 2.4,
): THREE.CanvasTexture {
  const s = 256;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = s;
  draw(cvs.getContext('2d')!, s);
  const t = new THREE.CanvasTexture(cvs);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / panelUnits, 1 / panelUnits); // UVs are in world units
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const THEMES: MobiusTheme[] = [
  {
    id: 'panels', label: 'Steel panels',
    background: 0x05050a, fogNear: 6, fogFar: 30, ambient: 0.45,
    lampColor: 0xfff1e0, lampIntensity: 10,
    color: 0x8893a8, metalness: 0.55, roughness: 0.4, emissive: 0x000000,
    emissiveIntensity: 0, glow: false, iridescence: 0.45,
    makeTexture: () => canvasTexture((ctx, s) => {
      ctx.fillStyle = '#c4cee0'; ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = '#28303f'; ctx.lineWidth = s * 0.06; ctx.strokeRect(0, 0, s, s);
      ctx.strokeStyle = 'rgba(60,72,96,0.35)'; ctx.lineWidth = s * 0.02;
      ctx.strokeRect(s * 0.12, s * 0.12, s * 0.76, s * 0.76);
      ctx.fillStyle = '#39435a';
      for (const [x, y] of [[0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88]]) {
        ctx.beginPath(); ctx.arc(x * s, y * s, s * 0.015, 0, 7); ctx.fill();
      }
    }),
  },
  {
    id: 'spaceship', label: 'Spaceship',
    background: 0x02030a, fogNear: 7, fogFar: 34, ambient: 0.25,
    lampColor: 0x88e0ff, lampIntensity: 9,
    color: 0x2a3340, metalness: 0.85, roughness: 0.35, emissive: 0x0a2230,
    emissiveIntensity: 0.4, glow: true, iridescence: 0.2,
    makeTexture: () => canvasTexture((ctx, s) => {
      ctx.fillStyle = '#0b0f16'; ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = '#1a2430'; ctx.lineWidth = s * 0.05; ctx.strokeRect(0, 0, s, s);
      // glowing cyan circuit lines
      ctx.strokeStyle = '#27e0ff'; ctx.lineWidth = s * 0.012;
      ctx.beginPath();
      ctx.moveTo(s * 0.1, s * 0.5); ctx.lineTo(s * 0.4, s * 0.5); ctx.lineTo(s * 0.5, s * 0.65);
      ctx.lineTo(s * 0.9, s * 0.65);
      ctx.moveTo(s * 0.5, s * 0.1); ctx.lineTo(s * 0.5, s * 0.4);
      ctx.stroke();
      ctx.fillStyle = '#27e0ff';
      ctx.fillRect(s * 0.46, s * 0.06, s * 0.08, s * 0.05);
    }, 1.8),
  },
  {
    id: 'rainbow', label: 'Rainbow road',
    background: 0x05021a, fogNear: 8, fogFar: 40, ambient: 0.7,
    lampColor: 0xffffff, lampIntensity: 4,
    color: 0xffffff, metalness: 0.2, roughness: 0.5, emissive: 0xffffff,
    emissiveIntensity: 0.9, glow: true, iridescence: 0.1,
    makeTexture: () => canvasTexture((ctx, s) => {
      // bright rainbow bands across the strip
      for (let i = 0; i < s; i++) {
        ctx.fillStyle = `hsl(${(i / s) * 360}, 90%, 58%)`;
        ctx.fillRect(0, i, s, 1);
      }
      // dark edge rails
      ctx.fillStyle = '#101020';
      ctx.fillRect(0, 0, s, s * 0.08); ctx.fillRect(0, s * 0.92, s, s * 0.08);
      // white dashes down the middle
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let y = 0; y < s; y += s * 0.25) ctx.fillRect(s * 0.47, y + s * 0.06, s * 0.06, s * 0.12);
    }, 3.2),
  },
  {
    id: 'dragon', label: "Dragon's belly",
    background: 0x140404, fogNear: 5, fogFar: 24, ambient: 0.4,
    lampColor: 0xff7040, lampIntensity: 11,
    color: 0x6e1414, metalness: 0.1, roughness: 0.75, emissive: 0x300404,
    emissiveIntensity: 0.5, glow: false, iridescence: 0.15,
    makeTexture: () => canvasTexture((ctx, s) => {
      const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.05, s / 2, s / 2, s * 0.7);
      g.addColorStop(0, '#a83232'); g.addColorStop(1, '#3a0a0a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
      // ribbed flesh
      ctx.strokeStyle = 'rgba(20,0,0,0.5)'; ctx.lineWidth = s * 0.04;
      for (let i = -1; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(s * 0.5, s * (i * 0.25), s * 0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,120,90,0.25)'; ctx.lineWidth = s * 0.015;
      ctx.strokeRect(0, 0, s, s);
    }, 2.0),
  },
  {
    id: 'portal', label: 'Test chamber',
    background: 0x0c0f12, fogNear: 8, fogFar: 38, ambient: 0.6,
    lampColor: 0xffffff, lampIntensity: 7,
    color: 0xdfe3e8, metalness: 0.15, roughness: 0.55, emissive: 0x000000,
    emissiveIntensity: 0, glow: false, iridescence: 0.1,
    makeTexture: () => canvasTexture((ctx, s) => {
      ctx.fillStyle = '#eef1f4'; ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = '#aeb6bf'; ctx.lineWidth = s * 0.025; ctx.strokeRect(0, 0, s, s);
      ctx.fillStyle = '#d7dce1';
      ctx.fillRect(s * 0.06, s * 0.06, s * 0.88, s * 0.88);
      ctx.strokeStyle = '#c2c9d0'; ctx.lineWidth = s * 0.01;
      ctx.strokeRect(s * 0.06, s * 0.06, s * 0.88, s * 0.88);
    }, 2.6),
  },
];

export const DEFAULT_THEME = THEMES[0];

/** Texture for the floor-marker decal: forward arrows + "UP" text, so reading
 *  it on the floor vs overhead (after a lap) is obviously reversed. */
export function floorMarkerTexture(): THREE.CanvasTexture {
  const w = 128, h = 256;
  const cvs = document.createElement('canvas');
  cvs.width = w; cvs.height = h;
  const ctx = cvs.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  // chevron arrow pointing "forward" (toward +length / top of tile)
  ctx.strokeStyle = '#ffe14d';
  ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(w * 0.2, h * 0.42); ctx.lineTo(w * 0.5, h * 0.18); ctx.lineTo(w * 0.8, h * 0.42);
  ctx.stroke();

  // the word UP
  ctx.fillStyle = '#ffe14d';
  ctx.font = `bold ${Math.round(h * 0.16)}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('UP', w * 0.5, h * 0.7);

  const t = new THREE.CanvasTexture(cvs);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
