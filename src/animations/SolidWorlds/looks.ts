/**
 * Scene "looks" — selectable atmospheres for the walk. The same idea as Polygon
 * Worlds' looks (distilled from the retired Topology Walk themes): a look is the
 * atmosphere layer only — sky/fog tint, tone-mapping exposure, and the shared
 * lighting rig's colors + intensities — so it reads consistently across worlds.
 * Kept app-local (a small data table) rather than imported across app folders,
 * per the self-contained-app convention.
 */
export interface SolidLook {
  id: string;
  label: string;
  /** Background + fog color. */
  sky: number;
  /** Renderer tone-mapping exposure. */
  exposure: number;
  ambient: number;
  hemiSky: number;
  hemiGround: number;
  hemi: number;
  keyColor: number;
  key: number;
  fillColor: number;
  fill: number;
}

export const LOOKS: SolidLook[] = [
  {
    id: 'daytime', label: 'Daytime',
    sky: 0x9cc6ef, exposure: 1.12, ambient: 0.55,
    hemiSky: 0xfff1dc, hemiGround: 0x7d93bf, hemi: 0.6,
    keyColor: 0xffe0bc, key: 0.95, fillColor: 0xb8d4ff, fill: 0.5,
  },
  {
    id: 'overcast', label: 'Overcast',
    sky: 0x9fabbd, exposure: 1.0, ambient: 0.62,
    hemiSky: 0xdfe7f1, hemiGround: 0x6b7480, hemi: 0.72,
    keyColor: 0xeef0f2, key: 0.5, fillColor: 0xcdd7e3, fill: 0.45,
  },
  {
    id: 'dusk', label: 'Ember dusk',
    sky: 0x2c0f0a, exposure: 1.05, ambient: 0.26,
    hemiSky: 0xff8a4a, hemiGround: 0x1a0807, hemi: 0.5,
    keyColor: 0xff7a36, key: 1.05, fillColor: 0x70405e, fill: 0.4,
  },
  {
    id: 'moonlit', label: 'Moonlit',
    sky: 0x0a1024, exposure: 1.12, ambient: 0.2,
    hemiSky: 0x2a3a66, hemiGround: 0x0a0c12, hemi: 0.55,
    keyColor: 0xcfd6ff, key: 0.6, fillColor: 0x6a86c8, fill: 0.55,
  },
];

export const DEFAULT_LOOK = LOOKS[0];

export function findLook(id: string): SolidLook {
  return LOOKS.find((l) => l.id === id) ?? DEFAULT_LOOK;
}
