import * as THREE from 'three';

// Reference geometry for the Hopf (sphere) and Torus (nested donuts) views.

/** Scene-space scale applied to projected particle positions (the vertex
 *  shader multiplies `project(...)` by this factor), so the scaffold geometry
 *  must use the same scale to register with the particles. */
const SCALE = 1.5;

export interface HopfScaffold {
  /** Parent group — add to the scene; toggle `.visible` for the master switch. */
  group: THREE.Group;
  /** Unit Riemann sphere parts (shown in the Hopf view). */
  sphereGroup: THREE.Group;
  /** Nested-donut parts (shown in the Torus view). */
  torusGroup: THREE.Group;
  dispose: () => void;
}

function circle(radius: number, color: number, opacity: number): THREE.LineLoop {
  const segs = 96;
  const pts: number[] = [];
  for (let i = 0; i < segs; i++) {
    const t = (i / segs) * Math.PI * 2;
    pts.push(Math.cos(t) * radius, Math.sin(t) * radius, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
  const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  return new THREE.LineLoop(g, m);
}

/** A small camera-facing text label (canvas → sprite). Returns the sprite plus
 *  its texture/material so they can be tracked for disposal. */
function makeLabel(text: string, cssColor: string): { sprite: THREE.Sprite; tex: THREE.Texture; mat: THREE.SpriteMaterial } {
  const pad = 8;
  const font = 'bold 44px system-ui, sans-serif';
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = font;
  const w = Math.ceil(measure.measureText(text).width) + pad * 2;
  const h = 64;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Faint dark halo so the label stays readable over light/dark backgrounds.
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.strokeText(text, w / 2, h / 2);
  ctx.fillStyle = cssColor;
  ctx.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.85, depthWrite: false, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  // Scale to keep a roughly constant on-screen aspect; ~0.5 scene units tall.
  sprite.scale.set(0.5 * (w / h), 0.5, 1);
  return { sprite, tex, mat };
}

/** Build faint reference geometry for the Hopf / Torus views: the unit Riemann
 *  sphere (with equator + poles) and a stack of nested Clifford-torus donuts
 *  (with the two core circles). The donuts are the stereographic images of the
 *  Clifford tori, so each has major radius 1/cos(η) and minor radius tan(η);
 *  particles with |f|/|z| = tan(η) sit exactly on that donut. The shared Z axis
 *  is both the sphere's pole axis and the donuts' nesting axis. */
export function createHopfScaffold(scene: THREE.Scene): HopfScaffold {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends THREE.BufferGeometry | THREE.Material>(x: T): T => {
    disposables.push(x);
    return x;
  };

  const group = new THREE.Group();
  const sphereGroup = new THREE.Group();
  const torusGroup = new THREE.Group();
  group.add(sphereGroup, torusGroup);

  const addLabel = (parent: THREE.Group, text: string, color: string, x: number, y: number, z: number) => {
    const { sprite, tex, mat } = makeLabel(text, color);
    sprite.position.set(x, y, z);
    parent.add(sprite);
    disposables.push(tex, mat);
  };

  // ---- Hopf sphere ----
  const sphereGeo = track(new THREE.SphereGeometry(SCALE, 32, 20));
  const wireGeo = track(new THREE.WireframeGeometry(sphereGeo));
  sphereGroup.add(new THREE.LineSegments(
    wireGeo,
    track(new THREE.LineBasicMaterial({ color: 0x4488bb, transparent: true, opacity: 0.12, depthWrite: false })),
  ));
  const equator = circle(SCALE, 0x66ccff, 0.45);
  track(equator.geometry); track(equator.material as THREE.Material);
  sphereGroup.add(equator);
  // Pole markers: +Z is where the output vanishes (|z|>|f|), -Z where z→0.
  const poleGeo = track(new THREE.SphereGeometry(SCALE * 0.04, 12, 8));
  [+1, -1].forEach(sgn => {
    const dot = new THREE.Mesh(poleGeo, track(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })));
    dot.position.set(0, 0, sgn * SCALE);
    sphereGroup.add(dot);
  });
  // Sphere labels: poles (f→0 at +Z, z→0 at −Z) and the |z|=|f| equator.
  addLabel(sphereGroup, 'f → 0', '#ffffff', 0, 0, SCALE + 0.28);
  addLabel(sphereGroup, 'z → 0', '#ffffff', 0, 0, -SCALE - 0.28);
  addLabel(sphereGroup, '|z| = |f|', '#66ccff', SCALE + 0.45, 0, 0);

  // ---- Nested Clifford-torus donuts ----
  const etas = [30, 45, 60].map(d => d * Math.PI / 180);
  etas.forEach(eta => {
    const Rmaj = SCALE / Math.cos(eta);
    const rmin = SCALE * Math.tan(eta);
    const tg = track(new THREE.TorusGeometry(Rmaj, rmin, 16, 60));
    const wg = track(new THREE.WireframeGeometry(tg));
    torusGroup.add(new THREE.LineSegments(
      wg,
      track(new THREE.LineBasicMaterial({ color: 0x44bbaa, transparent: true, opacity: 0.12, depthWrite: false })),
    ));
  });
  // Core circle (η→0, where f→0): the unit circle in the XY plane.
  const core = circle(SCALE, 0xffcc44, 0.5);
  track(core.geometry); track(core.material as THREE.Material);
  torusGroup.add(core);
  // The other core (η→π/2, where z→0) is the Z axis (a circle through infinity).
  const axisLen = SCALE * 6;
  const axisGeo = track(new THREE.BufferGeometry());
  axisGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, -axisLen, 0, 0, axisLen]), 3));
  torusGroup.add(new THREE.Line(
    axisGeo,
    track(new THREE.LineBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.35, depthWrite: false })),
  ));
  // Torus labels: the two core circles (f→0 on the unit XY circle, z→0 on the
  // Z axis) and the angle directions (arg z around the hole, arg f around tube).
  addLabel(torusGroup, 'f → 0', '#ffcc44', SCALE + 0.4, 0, 0);
  addLabel(torusGroup, 'z → 0', '#ffcc44', 0, 0, SCALE * 2.2);
  addLabel(torusGroup, 'arg z (hole)', '#ff8866', 0, SCALE * 1.7, 0);

  scene.add(group);

  return {
    group,
    sphereGroup,
    torusGroup,
    dispose: () => {
      scene.remove(group);
      disposables.forEach(d => d.dispose());
    },
  };
}
