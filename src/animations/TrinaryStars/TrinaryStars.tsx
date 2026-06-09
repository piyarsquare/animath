import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import Canvas3D from '@/components/Canvas3D';
import Workspace from '../../chrome/workspace/Workspace';
import type { LayoutDef, SectionDef, ViewDef, WorkspaceMode } from '../../chrome/workspace/types';
import { Slider, Pills, Select, NumberInput } from '../../components/ControlPanel';
import {
  step, cloudSpread, lyapunovRenorm, SCENARIOS, getScenario, buildStars, orbitFrame, launchPlanet, Analyzer, DEFAULT_CLASSIFY,
  type SimState, type Planet, type Star, type TargetId, type ClassifyParams, type Snapshot,
} from '@/lib/nbody';
import Observatory from './Observatory';
import SkyView, { type SkyData } from './SkyView';
import { usePersistentState, clearPersistedState } from '../../lib/usePersistentState';
import explainerText from './EXPLAINER.md?raw';

const STAR_COLORS = [0xffd27f, 0xff7043, 0x9ec7ff];
const REF_COLOR = 0x4df08a; // the planet: a vivid green, distinct from the gold/orange/blue stars
const GHOST_COLOR = 0xff5fa2;
const GHOST_COLOR_HEX = '#ff5fa2';
const TRAIL_MAX = 2000; // points stored per body; visible length is a live slider.
const VEL_SCALE = 1;    // sim-units of drag → units of launch speed.
const SAMPLE_DT = 0.05; // sim-time between classifier samples of the reference planet.

/** Sim plane lives at world y = 0 so the camera can look down on it like a floor. */
function simX(x: number) { return x; }
function simZ(y: number) { return -y; }

/** Soft radial sprite used to give the stars a glow halo. */
function makeGlowTexture(): THREE.Texture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/** A sliding-window trail: a fixed buffer with a live-adjustable visible tail. */
class Trail {
  geom = new THREE.BufferGeometry();
  line: THREE.Line;
  private attr: THREE.BufferAttribute;
  private buf = new Float32Array(TRAIL_MAX * 3);
  private count = 0;

  constructor(color: number, opacity: number) {
    this.attr = new THREE.BufferAttribute(this.buf, 3);
    this.geom.setAttribute('position', this.attr);
    this.geom.setDrawRange(0, 0);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    this.line = new THREE.Line(this.geom, mat);
    this.line.frustumCulled = false;
  }

  push(x: number, y: number, z: number) {
    if (this.count === TRAIL_MAX) {
      this.buf.copyWithin(0, 3);
      this.count--;
    }
    const i = this.count * 3;
    this.buf[i] = x; this.buf[i + 1] = y; this.buf[i + 2] = z;
    this.count++;
  }

  /** Show only the most recent `visible` points. */
  setVisible(visible: number) {
    const start = Math.max(0, this.count - visible);
    this.geom.setDrawRange(start, this.count - start);
    this.attr.needsUpdate = true;
  }

  reset() {
    this.count = 0;
    this.geom.setDrawRange(0, 0);
  }

  dispose() {
    this.geom.dispose();
    (this.line.material as THREE.Material).dispose();
  }
}

/** A world can be handed to the Observatory via the URL hash query (e.g. by a
 *  click on the lab's basin map): system + an exact planet initial condition. */
function navQuery(): URLSearchParams { return new URLSearchParams(window.location.hash.split('?')[1] ?? ''); }
function navNum(u: URLSearchParams, k: string, d: number) { const v = u.get(k); const n = v == null ? NaN : parseFloat(v); return Number.isFinite(n) ? n : d; }
/** localStorage key namespace for the Observatory's persisted settings. */
const PK = (field: string) => `trinary:${field}`;

/** Anchor point (in sim coords) for a reference-frame selector: a star, a pair's
 *  center of mass, or the system barycenter. */
function frameAnchor(stars: Star[], key: string): { x: number; y: number } {
  const com = (idx: number[]) => {
    let M = 0, x = 0, y = 0;
    for (const i of idx) { const s = stars[i]; M += s.mass; x += s.mass * s.x; y += s.mass * s.y; }
    return { x: x / M, y: y / M };
  };
  switch (key) {
    case 's0': return { x: stars[0].x, y: stars[0].y };
    case 's1': return { x: stars[1].x, y: stars[1].y };
    case 's2': return { x: stars[2].x, y: stars[2].y };
    case 'c01': return com([0, 1]);
    case 'c02': return com([0, 2]);
    case 'c12': return com([1, 2]);
    default: return com([0, 1, 2]); // barycenter
  }
}

/** A pure view transform: put `center` at the origin, and (unless align='none')
 *  rotate so the direction to `align` lies on +x. Physics is unchanged. */
function frameTransform(stars: Star[], center: string, align: string): (x: number, y: number) => { x: number; y: number } {
  const C = frameAnchor(stars, center);
  let c = 1, s = 0;
  if (align !== 'none') {
    const A = frameAnchor(stars, align);
    const ang = Math.atan2(A.y - C.y, A.x - C.x);
    c = Math.cos(ang); s = Math.sin(ang);
  }
  return (x, y) => { const dx = x - C.x, dy = y - C.y; return { x: dx * c + dy * s, y: -dx * s + dy * c }; };
}

const FRAME_ANCHORS = [
  { value: 'bary', label: 'Barycenter' },
  { value: 's0', label: 'Star 1' }, { value: 's1', label: 'Star 2' }, { value: 's2', label: 'Star 3' },
  { value: 'c01', label: 'COM ⟨1,2⟩' }, { value: 'c02', label: 'COM ⟨1,3⟩' }, { value: 'c12', label: 'COM ⟨2,3⟩' },
];
const FRAME_PRESETS: { label: string; c: string; a: string }[] = [
  { label: 'Inertial', c: 'bary', a: 'none' },
  { label: 'Star 1 fixed', c: 's0', a: 's1' },
  { label: 'Binary axis', c: 'c01', a: 's1' },
  { label: '⟨2,3⟩ on x', c: 'bary', a: 'c12' },
];

/** Top-bar mode pills: the Observatory ↔ Lab switch (replaces the old tab bar).
 *  Switching sets the hash, which Trinary.tsx observes. */
const MODES: WorkspaceMode[] = [
  { id: 'observatory', label: 'Observatory' },
  { id: 'lab', label: 'Lab' },
];

/** An exact planet launch state — set by the Custom launch mode's spinboxes,
 *  by click+drag hand placement, or handed in via the URL (basin-map click). */
type CustomIC = { x: number; y: number; vx: number; vy: number };

export default function TrinaryStars({ onTour }: { onTour?: () => void }) {
  const qRef = useRef<URLSearchParams | null>(null);
  if (!qRef.current) qRef.current = navQuery();
  const Q = qRef.current;
  const qPreset = Q.get('p') ?? SCENARIOS[0].id;
  const initialCustom = Q.get('px') != null
    ? { x: navNum(Q, 'px', 0), y: navNum(Q, 'py', 0), vx: navNum(Q, 'vx', 0), vy: navNum(Q, 'vy', 0) }
    : null;

  // A world handed in via the URL (basin-map click) must win over stored
  // settings, so the system fields opt out of persistence in that case.
  const fromLink = initialCustom != null;

  const [presetId, setPresetId] = usePersistentState(fromLink ? null : PK('presetId'), qPreset);
  const [target, setTargetState] = usePersistentState<TargetId>(fromLink ? null : PK('target'), (Q.get('tg') as TargetId) ?? getScenario(presetId).launch.target);
  const [ghostCount, setGhostCount] = usePersistentState(PK('ghostCount'), 12);
  const [epsExp, setEpsExp] = usePersistentState(PK('epsExp'), -3);      // perturbation ε = 10^epsExp
  const [planetRadius, setPlanetRadiusState] = usePersistentState(PK('planetRadius'), getScenario(presetId).launch.radius);
  const [planetSpeed, setPlanetSpeedState] = usePersistentState(PK('planetSpeed'), getScenario(presetId).launch.speed);
  const [massMul, setMassMul] = usePersistentState<number[]>(fromLink ? null : PK('massMul'), [navNum(Q, 'm0', 1), navNum(Q, 'm1', 1), navNum(Q, 'm2', 1)]); // per-star mass multipliers
  const [starSoft, setStarSoft] = usePersistentState(fromLink ? null : PK('starSoft'), navNum(Q, 'ss', getScenario(presetId).system.softening)); // close-encounter softening
  const [speed, setSpeed] = usePersistentState(PK('speed'), 1);          // sim-seconds per real-second
  const [trailLen, setTrailLen] = usePersistentState(PK('trailLen'), 500);
  const [showTrails, setShowTrails] = usePersistentState(PK('showTrails'), true);
  const [frameCenter, setFrameCenter] = usePersistentState(PK('frameCenter'), 'bary'); // reference-frame origin
  const [frameAlign, setFrameAlign] = usePersistentState(PK('frameAlign'), 'none');     // reference-frame +x direction
  const [paused, setPaused] = useState(false);       // transient — not persisted
  const [placeMode, setPlaceMode] = useState(false); // transient — not persisted
  // Climate-classification knobs (habitable band as multiples of launch insolation).
  const [lumExp, setLumExp] = usePersistentState(PK('lumExp'), DEFAULT_CLASSIFY.lumExp);
  const [habLo, setHabLo] = usePersistentState(PK('habLo'), DEFAULT_CLASSIFY.habLo);
  const [habHi, setHabHi] = usePersistentState(PK('habHi'), DEFAULT_CLASSIFY.habHi);
  const [calmThresh, setCalmThresh] = usePersistentState(PK('calmThresh'), DEFAULT_CLASSIFY.calmThresh);
  const [collisionRadius, setCollisionRadius] = usePersistentState(PK('collisionRadius'), 0.12); // 0 = pass-through
  const [skyOn, setSkyOn] = usePersistentState(PK('skyOn'), false);
  const [dayLen, setDayLen] = usePersistentState(PK('dayLen'), 0.8);  // sim-time per planet day (spin)
  const [tilt, setTilt] = usePersistentState(PK('tilt'), 0.4);      // axial tilt → seasonal sun-height drift
  const [labSnap, setLabSnap] = useState<Snapshot | null>(null);     // derived — not persisted
  const skyRef = useRef<SkyData | null>(null);

  const preset = getScenario(presetId);

  // The collision radius also bounds the analyzer's "destroyed" test so the era
  // timeline agrees with what you see consumed on screen.
  const classify: ClassifyParams = { ...DEFAULT_CLASSIFY, lumExp, habLo, habHi, calmThresh, rKill: Math.max(collisionRadius, 1e-4) };

  // Base (untuned) star masses for this preset, for labeling the mass sliders.
  const baseMasses = useMemo(() => getScenario(presetId).system.makeStars().map(s => s.mass), [presetId]);

  // Live params the animation loop / pointer handlers read without re-mounting.
  const refs = useRef({
    speed, trailLen, showTrails, paused,
    ghostCount, epsExp, planetRadius, planetSpeed, presetId, target, placeMode, massMul, starSoft, classify, collisionRadius,
    frameCenter, frameAlign,
  });
  refs.current = { speed, trailLen, showTrails, paused, ghostCount, epsExp, planetRadius, planetSpeed, presetId, target, placeMode, massMul, starSoft, classify, collisionRadius, frameCenter, frameAlign };

  // A pinned exact launch (position + velocity). When set it overrides the
  // parametric target/radius/speed seeding until a launch control changes.
  // The sim loop and seeder read the ref (no re-mount); the React state mirror
  // drives the Launch-mode pills and the x/y/vx/vy spinboxes. The two are
  // always set together via setCustom (the pointer handler inside onMount sets
  // the ref then calls the stable setCustomState directly).
  const customRef = useRef<CustomIC | null>(initialCustom);
  const [custom, setCustomState] = useState<CustomIC | null>(initialCustom);
  const setCustom = (c: CustomIC | null) => {
    customRef.current = c;
    setCustomState(c);
  };

  // Imperative handles populated by onMount and called by control effects/buttons.
  const api = useRef<{ reset: () => void; scatter: () => void } | null>(null);

  const spreadElRef = useRef<HTMLSpanElement>(null);
  const timeElRef = useRef<HTMLSpanElement>(null);
  const lyapElRef = useRef<HTMLSpanElement>(null);

  const onMount = useCallback(({ scene, camera, renderer }: {
    scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer;
  }) => {
    scene.background = new THREE.Color(0x05060a);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const grid = new THREE.GridHelper(24, 24, 0x223047, 0x141c2b);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.5;
    scene.add(grid);

    const glowTex = makeGlowTexture();

    // --- Stars (created once; positions updated each frame) ---
    const starMeshes: THREE.Mesh[] = [];
    const starGlows: THREE.Sprite[] = [];
    const starTrails: Trail[] = [];
    for (let i = 0; i < 3; i++) {
      const color = STAR_COLORS[i];
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 24, 24),
        new THREE.MeshBasicMaterial({ color }),
      );
      scene.add(mesh);
      starMeshes.push(mesh);

      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color, transparent: true, opacity: 0.8,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      scene.add(glow);
      starGlows.push(glow);

      const trail = new Trail(color, 0.35);
      scene.add(trail.line);
      starTrails.push(trail);
    }

    // --- Planets (rebuilt when the ghost count changes) ---
    const planetGroup = new THREE.Group();
    scene.add(planetGroup);
    let planetMeshes: THREE.Mesh[] = [];
    let planetTrails: Trail[] = [];

    const sim: SimState = {
      stars: [], planets: [], t: 0, dtBase: 0.002, G: 1, starSoft: 0.02, planetSoft: 0.05,
    };

    // Largest Lyapunov exponent via Benettin renormalization of a hidden shadow
    // planet (appended after the visible ghosts). λ = Σ log(d/d0) / elapsed time.
    let nGhosts = 0;       // count of visible planets (reference + ghosts)
    let shadowIdx = -1;    // index of the Lyapunov shadow in sim.planets
    let lyapSum = 0, nextRenorm = 0, lyap = 0;
    const LYAP_D0 = 1e-7, LYAP_RENORM = 0.25;

    // Streaming classifier for the reference planet (planets[0]).
    let analyzer: Analyzer | null = null;
    let nextSampleT = SAMPLE_DT;

    // Brief flares where planets are consumed by a star.
    // Flares are stored in sim coords so they follow the active reference frame.
    const flares: { sprite: THREE.Sprite; born: number; sx: number; sy: number }[] = [];
    const FLARE_LIFE = 700;
    let lastFrameKey = '';
    function spawnFlare(sx: number, sy: number) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: 0xffb060, transparent: true, opacity: 1,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      sprite.scale.setScalar(0.3);
      scene.add(sprite);
      flares.push({ sprite, born: performance.now(), sx, sy });
    }
    function clearFlares() {
      for (const f of flares) { scene.remove(f.sprite); (f.sprite.material as THREE.Material).dispose(); }
      flares.length = 0;
    }

    function disposePlanets() {
      for (const m of planetMeshes) {
        planetGroup.remove(m);
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
      for (const t of planetTrails) { scene.remove(t.line); t.dispose(); }
      planetMeshes = [];
      planetTrails = [];
    }

    /** Seed the planet states: a reference planet at the chosen launch point,
     *  with ghosts spread in a tiny ring of radius ε around it. */
    function seedPlanets(): Planet[] {
      const n = Math.max(1, Math.round(refs.current.ghostCount));
      const eps = Math.pow(10, refs.current.epsExp);

      let bx: number, by: number, bvx: number, bvy: number;
      const custom = customRef.current;
      if (custom) {
        bx = custom.x; by = custom.y; bvx = custom.vx; bvy = custom.vy;
      } else {
        // Launch at radius r along +x from the target, tangentially (CCW).
        const b = launchPlanet(sim.stars, refs.current.target, refs.current.planetRadius, refs.current.planetSpeed);
        bx = b.x; by = b.y; bvx = b.vx; bvy = b.vy;
      }

      const planets: Planet[] = [];
      for (let i = 0; i < n; i++) {
        let px = bx, py = by;
        if (i > 0) {
          const ang = (2 * Math.PI * (i - 1)) / Math.max(1, n - 1);
          px += eps * Math.cos(ang);
          py += eps * Math.sin(ang);
        }
        planets.push({ x: px, y: py, vx: bvx, vy: bvy, ax: 0, ay: 0 });
      }
      return planets;
    }

    function buildPlanetMeshes(n: number) {
      disposePlanets();
      for (let i = 0; i < n; i++) {
        const isRef = i === 0;
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(isRef ? 0.085 : 0.06, 16, 16),
          new THREE.MeshBasicMaterial({
            color: isRef ? REF_COLOR : GHOST_COLOR,
            transparent: !isRef,
            opacity: isRef ? 1 : 0.6,
          }),
        );
        planetGroup.add(mesh);
        planetMeshes.push(mesh);

        const trail = new Trail(isRef ? REF_COLOR : GHOST_COLOR, isRef ? 0.7 : 0.22);
        scene.add(trail.line);
        planetTrails.push(trail);
      }
    }

    /** Full deterministic reset: re-seed stars + planets from the active preset. */
    function reset() {
      const p = getScenario(refs.current.presetId);
      sim.stars = buildStars(p, refs.current.massMul);
      sim.starSoft = refs.current.starSoft;
      sim.dtBase = p.system.dt;
      sim.planets = seedPlanets();
      nGhosts = sim.planets.length;
      // Append the hidden Lyapunov shadow, offset from the reference.
      const r0 = sim.planets[0];
      sim.planets.push({ x: r0.x + LYAP_D0, y: r0.y, vx: r0.vx, vy: r0.vy, ax: 0, ay: 0, alive: true });
      shadowIdx = nGhosts;
      lyapSum = 0; nextRenorm = LYAP_RENORM; lyap = 0;
      sim.t = 0;
      if (planetMeshes.length !== nGhosts) buildPlanetMeshes(nGhosts);
      for (const t of starTrails) t.reset();
      for (const t of planetTrails) t.reset();
      // Scale star sizes/glow by mass.
      for (let i = 0; i < 3; i++) {
        const m = sim.stars[i].mass;
        const rad = 0.11 * Math.cbrt(m);
        starMeshes[i].scale.setScalar(rad);
        starGlows[i].scale.setScalar(rad * 9);
      }
      // Restart classification from the fresh launch state.
      analyzer = new Analyzer(refs.current.classify, sim.stars, sim.planets[0]);
      nextSampleT = SAMPLE_DT;
      setLabSnap(analyzer.snapshot());
      clearFlares();
    }

    /** Re-scatter the ghosts around the reference planet's *current* state,
     *  without disturbing the stars — make a fresh cloud mid-flight. */
    function scatter() {
      const ref = sim.planets[0];
      if (!ref) return;
      const eps = Math.pow(10, refs.current.epsExp);
      for (let i = 1; i < nGhosts; i++) {
        const ang = (2 * Math.PI * (i - 1)) / Math.max(1, nGhosts - 1);
        sim.planets[i].x = ref.x + eps * Math.cos(ang);
        sim.planets[i].y = ref.y + eps * Math.sin(ang);
        sim.planets[i].vx = ref.vx;
        sim.planets[i].vy = ref.vy;
      }
      // Reset the shadow + Lyapunov accumulation to the new reference state.
      if (shadowIdx >= 0) {
        const sh = sim.planets[shadowIdx];
        sh.x = ref.x + LYAP_D0; sh.y = ref.y; sh.vx = ref.vx; sh.vy = ref.vy; sh.alive = true;
        lyapSum = 0; nextRenorm = sim.t + LYAP_RENORM; lyap = 0;
      }
      for (const t of planetTrails) t.reset();
    }

    api.current = { reset, scatter };
    reset();

    // --- Orbit camera (drag to rotate, wheel to zoom) ---
    const cam = { az: 0.0, polar: 0.62, dist: 11 };
    camera.up.set(0, 1, 0);
    camera.near = 0.05;
    camera.far = 400;
    camera.updateProjectionMatrix();

    function placeCamera() {
      const sp = Math.sin(cam.polar), cp = Math.cos(cam.polar);
      camera.position.set(
        cam.dist * sp * Math.sin(cam.az),
        cam.dist * cp,
        cam.dist * sp * Math.cos(cam.az),
      );
      camera.lookAt(0, 0, 0);
    }
    placeCamera();

    // --- Click-to-place plumbing ---
    const raycaster = new THREE.Raycaster();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0xffffff, 0.22, 0.13);
    arrow.visible = false;
    scene.add(arrow);

    const el = renderer.domElement;
    function pointerToSim(e: PointerEvent): { x: number; y: number } | null {
      const rect = el.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      if (!raycaster.ray.intersectPlane(groundPlane, hit)) return null;
      return { x: hit.x, y: -hit.z };
    }

    let dragging = false;       // camera orbit
    let placing = false;        // planet placement
    let lastX = 0, lastY = 0;
    let placeStart = { x: 0, y: 0 };
    let draftVel = { vx: 0, vy: 0 };

    const onDown = (e: PointerEvent) => {
      if (refs.current.placeMode) {
        const p = pointerToSim(e);
        if (!p) return;
        placing = true;
        placeStart = p;
        draftVel = { vx: 0, vy: 0 };
        arrow.position.set(p.x, 0, -p.y);
        arrow.setLength(0.0001, 0.0001, 0.0001);
        arrow.visible = true;
        el.setPointerCapture(e.pointerId);
        return;
      }
      dragging = true; lastX = e.clientX; lastY = e.clientY; el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (placing) {
        const p = pointerToSim(e);
        if (!p) return;
        const dx = p.x - placeStart.x, dy = p.y - placeStart.y;
        draftVel = { vx: dx * VEL_SCALE, vy: dy * VEL_SCALE };
        const dir = new THREE.Vector3(dx, 0, -dy);
        const len = dir.length();
        if (len > 1e-5) {
          arrow.setDirection(dir.normalize());
          arrow.setLength(len, Math.min(0.3, len * 0.28), Math.min(0.18, len * 0.16));
        }
        return;
      }
      if (!dragging) return;
      cam.az -= (e.clientX - lastX) * 0.006;
      cam.polar = Math.min(1.52, Math.max(0.05, cam.polar - (e.clientY - lastY) * 0.006));
      lastX = e.clientX; lastY = e.clientY;
      placeCamera();
    };
    const onUp = (e: PointerEvent) => {
      if (placing) {
        placing = false;
        arrow.visible = false;
        customRef.current = { x: placeStart.x, y: placeStart.y, vx: draftVel.vx, vy: draftVel.vy };
        setCustomState(customRef.current); // mirror for the System spinboxes
        reset();
        try { el.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
        return;
      }
      dragging = false;
      try { el.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cam.dist = Math.min(60, Math.max(2, cam.dist * (1 + Math.sign(e.deltaY) * 0.08)));
      placeCamera();
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });

    // --- Animation loop ---
    const clock = new THREE.Clock();
    let raf = 0;
    let uiAccum = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const realDt = Math.min(clock.getDelta(), 0.05);
      const r = refs.current;

      let didStep = false;
      if (!r.paused) {
        const dt = sim.dtBase ?? 0.002;
        const simSeconds = r.speed * realDt;
        let steps = Math.round(simSeconds / dt);
        steps = Math.min(400, Math.max(0, steps));
        didStep = steps > 0;
        for (let s = 0; s < steps; s++) {
          step(sim, dt);
          // Benettin renormalization of the shadow at a fixed sim-time cadence.
          if (shadowIdx >= 0 && sim.t >= nextRenorm) {
            const ref0 = sim.planets[0];
            if (ref0.alive !== false) {
              lyapSum += lyapunovRenorm(ref0, sim.planets[shadowIdx], LYAP_D0);
              lyap = lyapSum / Math.max(sim.t, 1e-6);
            }
            nextRenorm = sim.t + LYAP_RENORM;
          }
        }

        // Consume planets that fall into a star (visible planets only — the
        // shadow is a measurement probe and is never consumed).
        const Rc = r.collisionRadius;
        if (Rc > 0 && steps > 0) {
          for (let i = 0; i < nGhosts; i++) {
            const p = sim.planets[i];
            if (p.alive === false) continue;
            for (let s = 0; s < 3; s++) {
              if (Math.hypot(sim.stars[s].x - p.x, sim.stars[s].y - p.y) < Rc) {
                p.alive = false;
                spawnFlare(p.x, p.y);
                break;
              }
            }
          }
        }

        // Sample the classifier at a fixed sim-time cadence.
        if (analyzer && steps > 0 && sim.t >= nextSampleT) {
          analyzer.push(sim.t, sim.stars, sim.planets[0]);
          nextSampleT = sim.t + SAMPLE_DT;
        }
      }

      // Reference frame: a pure view transform (anchor → origin, align → +x).
      const tf = frameTransform(sim.stars, r.frameCenter, r.frameAlign);
      const fkey = `${r.frameCenter}|${r.frameAlign}`;
      if (fkey !== lastFrameKey) {
        for (const t of starTrails) t.reset();
        for (const t of planetTrails) t.reset();
        lastFrameKey = fkey;
      }

      // Trails (recorded in the active frame, so a co-rotating path appears).
      if (didStep && r.showTrails) {
        for (let i = 0; i < 3; i++) { const f = tf(sim.stars[i].x, sim.stars[i].y); starTrails[i].push(simX(f.x), 0, simZ(f.y)); }
        for (let i = 0; i < sim.planets.length; i++) {
          if (sim.planets[i].alive === false) continue;
          const f = tf(sim.planets[i].x, sim.planets[i].y);
          planetTrails[i]?.push(simX(f.x), 0, simZ(f.y));
        }
      }

      // Sync meshes to state (through the frame transform).
      for (let i = 0; i < 3; i++) {
        const f = tf(sim.stars[i].x, sim.stars[i].y);
        const wx = simX(f.x), wz = simZ(f.y);
        starMeshes[i].position.set(wx, 0, wz);
        starGlows[i].position.set(wx, 0, wz);
      }
      for (let i = 0; i < sim.planets.length; i++) {
        const m = planetMeshes[i];
        if (!m) continue;
        const alive = sim.planets[i].alive !== false;
        m.visible = alive;
        if (alive) { const f = tf(sim.planets[i].x, sim.planets[i].y); m.position.set(simX(f.x), 0, simZ(f.y)); }
      }

      // Feed the planet's-eye sky view (reference planet).
      {
        const ref0 = sim.planets[0];
        const lum = refs.current.classify.lumExp;
        if (ref0) {
          skyRef.current = {
            t: sim.t, px: ref0.x, py: ref0.y, Sref: analyzer?.Sref ?? 1,
            stars: sim.stars.map(s => ({ x: s.x, y: s.y, L: Math.pow(s.mass, lum) })),
            // Once the planet falls into a star there's no surface to stand on —
            // the sky view detonates and goes dark.
            dead: ref0.alive === false,
          };
        }
      }

      // Fade and retire consumption flares.
      const now = performance.now();
      for (let k = flares.length - 1; k >= 0; k--) {
        const a = (now - flares[k].born) / FLARE_LIFE;
        if (a >= 1) {
          scene.remove(flares[k].sprite);
          (flares[k].sprite.material as THREE.Material).dispose();
          flares.splice(k, 1);
        } else {
          (flares[k].sprite.material as THREE.SpriteMaterial).opacity = 1 - a;
          flares[k].sprite.scale.setScalar(0.3 + a * 1.4);
          const f = tf(flares[k].sx, flares[k].sy);
          flares[k].sprite.position.set(simX(f.x), 0, simZ(f.y));
        }
      }

      // Trails: visibility + show/hide.
      const vis = Math.round(r.trailLen);
      for (const t of starTrails) { t.line.visible = r.showTrails; if (r.showTrails) t.setVisible(vis); }
      for (const t of planetTrails) { t.line.visible = r.showTrails; if (r.showTrails) t.setVisible(vis); }

      // Throttled UI readouts.
      uiAccum += realDt;
      if (uiAccum > 0.1) {
        uiAccum = 0;
        if (spreadElRef.current) spreadElRef.current.textContent = cloudSpread(sim.planets, nGhosts).toExponential(2);
        if (timeElRef.current) timeElRef.current.textContent = sim.t.toFixed(1);
        if (lyapElRef.current) {
          const chaotic = lyap > 0.05;
          lyapElRef.current.textContent = sim.t > 2
            ? `${lyap.toFixed(3)}  (τ≈${(1 / Math.max(lyap, 1e-6)).toFixed(1)})  ${chaotic ? 'chaotic' : 'regular'}`
            : '…';
          lyapElRef.current.style.color = sim.t > 2 ? (chaotic ? '#ff7043' : '#46d98a') : '#9ec7ff';
        }
        if (analyzer) setLabSnap(analyzer.snapshot());
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
      glowTex.dispose();
      api.current = null;
    };
  }, []);

  // Re-seed whenever an initial-condition control changes. (Launch-defining
  // changes also clear any hand-placed launch via their wrapped setters.)
  useEffect(() => {
    api.current?.reset();
  }, [presetId, target, ghostCount, epsExp, planetRadius, planetSpeed, massMul, starSoft, lumExp, habLo, habHi, calmThresh]);

  // Wrapped setters: any change that redefines the launch drops a pinned one.
  const setPlanetRadius = (v: number) => { setCustom(null); setPlanetRadiusState(v); };
  const setPlanetSpeed = (v: number) => { setCustom(null); setPlanetSpeedState(v); };
  const setTarget = (t: TargetId) => { setCustom(null); setTargetState(t); };
  const setStarMass = (i: number, v: number) =>
    setMassMul(prev => { const next = [...prev]; next[i] = v; return next; });

  // The parametric launch the seeder would use in Auto mode — shown in the
  // custom spinboxes so editing starts from exactly what you see.
  const autoIC = useMemo(() => {
    const p = launchPlanet(buildStars(getScenario(presetId), massMul), target, planetRadius, planetSpeed);
    return { x: p.x, y: p.y, vx: p.vx, vy: p.vy };
  }, [presetId, massMul, target, planetRadius, planetSpeed]);

  const launchMode: 'auto' | 'custom' = custom ? 'custom' : 'auto';
  const setLaunchMode = (m: 'auto' | 'custom') => {
    if (m === launchMode) return;
    setCustom(m === 'custom' ? { ...autoIC } : null);
    api.current?.reset();
  };
  /** Editing any spinbox pins the launch (flipping the mode to Custom). */
  const editCustom = (k: keyof CustomIC) => (v: number) => {
    const next = { ...(custom ?? autoIC) };
    next[k] = v;
    setCustom(next);
    api.current?.reset();
  };

  const onPickPreset = (id: string) => {
    const p = getScenario(id);
    setCustom(null);
    setPresetId(id);
    setTargetState(p.launch.target);
    setPlanetRadiusState(p.launch.radius);
    setPlanetSpeedState(p.launch.speed);
    setMassMul([1, 1, 1]);
    setStarSoft(p.system.softening);
  };

  // Set the launch speed to the local circular speed √(M/r) for the target.
  const onAutoCircular = () => {
    const stars = buildStars(getScenario(presetId), massMul);
    const f = orbitFrame(stars, target);
    const v = Math.sqrt(f.mass / Math.max(0.05, planetRadius));
    setPlanetSpeed(Math.round(v / 0.05) * 0.05);
  };

  const onTogglePlace = () => {
    const next = !placeMode;
    setPlaceMode(next);
    if (next) { setPaused(true); api.current?.reset(); }
  };

  const targetOptions: { value: TargetId; label: string }[] = [
    { value: 'bary', label: 'Barycenter' },
    { value: 's0', label: 'Star 1' },
    { value: 's1', label: 'Star 2' },
    { value: 's2', label: 'Star 3' },
    ...(preset.system.hasBinary ? [{ value: 'binary' as TargetId, label: 'Inner binary' }] : []),
  ];

  const btnStyle: React.CSSProperties = {
    padding: '10px 14px', borderRadius: 6, border: '1px solid var(--cp-border, #2a3550)',
    background: 'rgba(255,255,255,0.06)', color: 'var(--cp-fg, #e8edf6)', cursor: 'pointer', fontSize: 14, flex: 1,
  };
  const placeBtnStyle: React.CSSProperties = {
    ...btnStyle,
    background: placeMode ? 'rgba(255, 212, 0, 0.18)' : 'rgba(255,255,255,0.06)',
    borderColor: placeMode ? 'rgba(255,212,0,0.5)' : 'var(--cp-border, #2a3550)',
  };

  const note: React.CSSProperties = {
    font: '11px/1.5 system-ui', color: 'var(--cp-fg-dim, #93a2bd)', padding: '2px',
  };

  /* ---- archetype panels (PARAM-MAP §6; rows ported from the old drawer) ---- */

  // Spinboxes show the active launch state: the pinned one if present, else the
  // auto (parametric) launch the seeder would use. Rounded for display only.
  const ic = custom ?? autoIC;
  const show = (v: number) => Number(v.toFixed(4));

  const systemNode = (
    <>
      <Pills
        options={SCENARIOS.map(p => ({ value: p.id, label: p.name }))}
        value={presetId}
        onChange={onPickPreset}
      />
      <div style={{ font: '12px/1.5 system-ui', color: 'var(--cp-fg-dim, #93a2bd)', padding: '4px 2px' }}>
        {preset.blurb}
      </div>
      <div style={{
        font: '600 10px/1.4 ui-monospace, monospace', letterSpacing: 0.6, textTransform: 'uppercase',
        color: 'var(--cp-fg-dim, #93a2bd)', margin: '8px 0 0',
      }}>
        Custom planet — {custom ? 'pinned launch state' : 'auto launch (edit to pin)'}
      </div>
      <NumberInput label="x" value={show(ic.x)} onChange={editCustom('x')} step={0.05} />
      <NumberInput label="y" value={show(ic.y)} onChange={editCustom('y')} step={0.05} />
      <NumberInput label="vx" value={show(ic.vx)} onChange={editCustom('vx')} step={0.05} />
      <NumberInput label="vy" value={show(ic.vy)} onChange={editCustom('vy')} step={0.05} />
      <div style={note}>
        The planet’s exact start position &amp; velocity. Editing a value pins the launch (mode flips to Custom in the Planet launch panel); hand-placing or a Destiny-map link pins it too.
      </div>
    </>
  );

  const starsNode = (
    <>
      <Slider label="Star 1 mass · gold" value={massMul[0]} min={0.1} max={4} step={0.05}
        onChange={v => setStarMass(0, v)} format={v => (baseMasses[0] * v).toFixed(2)} />
      <Slider label="Star 2 mass · orange" value={massMul[1]} min={0.1} max={4} step={0.05}
        onChange={v => setStarMass(1, v)} format={v => (baseMasses[1] * v).toFixed(2)} />
      <Slider label="Star 3 mass · blue" value={massMul[2]} min={0.1} max={4} step={0.05}
        onChange={v => setStarMass(2, v)} format={v => (baseMasses[2] * v).toFixed(2)} />
      <Slider label="Softening" value={starSoft} min={0.005} max={0.3} step={0.005}
        onChange={setStarSoft} format={v => v.toFixed(3)} />
      <Slider label="Star size (collision)" value={collisionRadius} min={0} max={0.5} step={0.01}
        onChange={setCollisionRadius} format={v => (v === 0 ? 'off' : v.toFixed(2))} />
      <button style={{ ...btnStyle, width: '100%', flex: 'none' }}
        onClick={() => { setMassMul([1, 1, 1]); setStarSoft(preset.system.softening); }}>
        ⟲ Reset star masses
      </button>
      <div style={note}>
        Equal masses keep a preset’s character (just faster); uneven ones detune it — e.g. nudge a mass to watch the figure-eight fall into chaos. Softening sets how gently close passes are smoothed. Star size sets how close a planet must come to be consumed (0 = passes through).
      </div>
    </>
  );

  const launchNode = (
    <>
      <Pills
        label="Launch mode"
        options={[{ value: 'auto', label: 'Auto' }, { value: 'custom', label: 'Custom' }]}
        value={launchMode}
        onChange={v => setLaunchMode(v as 'auto' | 'custom')}
      />
      <Pills
        label="Orbit around"
        options={targetOptions}
        value={target}
        onChange={setTarget}
      />
      <Slider label="Start radius" value={planetRadius} min={0.1} max={8} step={0.05}
        onChange={setPlanetRadius} format={v => v.toFixed(2)} />
      <Slider label="Start speed" value={planetSpeed} min={0} max={3} step={0.05}
        onChange={setPlanetSpeed} format={v => v.toFixed(2)} />
      <button style={{ ...btnStyle, width: '100%', flex: 'none' }} onClick={onAutoCircular}>
        ◯ Circular orbit speed
      </button>
      <button style={{ ...placeBtnStyle, width: '100%', flex: 'none', marginTop: 6 }} onClick={onTogglePlace}>
        {placeMode ? '✛ Placing — click + drag on the scene' : '✛ Place planet by hand'}
      </button>
      <div style={note}>
        Radius &amp; speed are measured from the body you orbit. Pick a star for a tight inner (S-type) orbit; the barycenter or inner binary for a wide one. Custom mode pins the exact x/y/vx/vy shown in the System panel.
      </div>
    </>
  );

  const climateNode = (
    <>
      <Slider label="Habitable floor (×ref)" value={habLo} min={0.1} max={1} step={0.05}
        onChange={setHabLo} format={v => v.toFixed(2)} />
      <Slider label="Habitable ceiling (×ref)" value={habHi} min={1} max={6} step={0.25}
        onChange={setHabHi} format={v => v.toFixed(2)} />
      <Slider label="Luminosity exponent β" value={lumExp} min={0.5} max={4} step={0.5}
        onChange={setLumExp} format={v => v.toFixed(1)} />
      <Slider label="Calm threshold" value={calmThresh} min={0.01} max={0.2} step={0.01}
        onChange={setCalmThresh} format={v => v.toFixed(2)} />
      <div style={note}>
        The habitable band is set relative to the planet’s starlight at launch (L = mᵝ). The timeline under the Orbit view classifies every moment as Paradise / Warm·precarious / Calm·barren / Chaotic.
      </div>
    </>
  );

  const skyNode = (
    <>
      <Pills
        label="View from the planet"
        options={[{ value: 1, label: 'On' }, { value: 0, label: 'Off' }]}
        value={skyOn ? 1 : 0}
        onChange={v => setSkyOn(v === 1)}
      />
      <Slider label="Day length (spin)" value={dayLen} min={0.1} max={3} step={0.1}
        onChange={setDayLen} format={v => v.toFixed(1)} />
      <Slider label="Axial tilt (seasons)" value={tilt} min={0} max={0.6} step={0.05}
        onChange={setTilt} format={v => v.toFixed(2)} />
      <div style={note}>
        Stand on the planet and watch the suns wheel overhead. Spin sets the day; tilt makes their noon height drift over the (chaotic, irregular) year. The sky’s color tracks the climate — frozen dark to searing white.
      </div>
    </>
  );

  const frameNode = (
    <>
      <Select label="Center on" value={frameCenter} onChange={setFrameCenter} options={FRAME_ANCHORS} />
      <Select label="Align +x to" value={frameAlign} onChange={setFrameAlign}
        options={[{ value: 'none', label: 'None (inertial)' }, ...FRAME_ANCHORS]} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
        {FRAME_PRESETS.map(p => (
          <button key={p.label} style={{ ...btnStyle, flex: 'none', padding: '6px 10px', fontSize: 12 }}
            onClick={() => { setFrameCenter(p.c); setFrameAlign(p.a); }}>{p.label}</button>
        ))}
        <button style={{ ...btnStyle, flex: 'none', padding: '6px 10px', fontSize: 12 }}
          disabled={frameCenter === 'bary' && frameAlign === 'none'}
          onClick={() => { setFrameCenter('bary'); setFrameAlign('none'); }}>⟲ Reset frame</button>
      </div>
      <div style={note}>
        A pure viewpoint — the physics is unchanged. In a rotating frame the planet appears to swerve (the Coriolis / centrifugal look), which is exactly how co-orbital, Trojan and horseshoe paths become visible. Trails reset when you change the frame.
      </div>
    </>
  );

  const trailsNode = (
    <>
      <Slider label="Trail length" value={trailLen} min={0} max={TRAIL_MAX} step={50}
        onChange={setTrailLen} format={v => (v === 0 ? 'off' : `${v}`)} />
      <Pills
        label="Trails"
        options={[{ value: 1, label: 'On' }, { value: 0, label: 'Off' }]}
        value={showTrails ? 1 : 0}
        onChange={v => setShowTrails(v === 1)}
      />
    </>
  );

  const chaosNode = (
    <>
      <Slider label="Ghost planets" value={ghostCount} min={1} max={120} step={1}
        onChange={setGhostCount} format={v => `${v}`} />
      <Slider label="Perturbation ε" value={epsExp} min={-5} max={-1} step={0.5}
        onChange={setEpsExp} format={v => `10^${v.toFixed(1)}`} />
      <button style={{ ...btnStyle, width: '100%', flex: 'none', marginTop: 4 }}
        onClick={() => api.current?.scatter()}>✦ Scatter ghosts here</button>
    </>
  );

  const simNode = (
    <>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button style={btnStyle} onClick={() => setPaused(p => !p)}>{paused ? '▶ Play' : '❚❚ Pause'}</button>
        <button style={btnStyle} onClick={() => api.current?.reset()}>↺ Reset</button>
      </div>
      <Slider label="Speed" value={speed} min={0.1} max={4} step={0.1}
        onChange={setSpeed} format={v => `${v.toFixed(1)}×`} />
      {onTour && (
        <button style={{ ...btnStyle, width: '100%', flex: 'none' }} onClick={onTour}>
          ✦ Take the tour
        </button>
      )}
    </>
  );

  const settingsNode = (
    <>
      <button style={{ ...btnStyle, width: '100%', flex: 'none', marginTop: 8 }}
        onClick={() => { clearPersistedState('trinary'); window.location.hash = '#/trinary'; window.location.reload(); }}>
        ↺ Reset settings to defaults
      </button>
      <div style={note}>
        Your settings (system, masses, climate band, sky, trails…) are saved on this device and restored on reload. This clears them.
      </div>
    </>
  );

  const sections: SectionDef[] = [
    { id: 'system', title: 'System', arch: 'subject', node: systemNode, estHeight: 430 },
    { id: 'stars', title: 'Stars', arch: 'subject', node: starsNode, estHeight: 440 },
    { id: 'launch', title: 'Planet launch', arch: 'domain', node: launchNode, estHeight: 480 },
    { id: 'climate', title: 'Climate', arch: 'domain', node: climateNode, estHeight: 330 },
    { id: 'sky', title: 'Sky', arch: 'view', node: skyNode, estHeight: 300 },
    { id: 'frame', title: 'Reference frame', arch: 'view', node: frameNode, estHeight: 340 },
    { id: 'trails', title: 'Trails', arch: 'marks', node: trailsNode, estHeight: 170 },
    { id: 'chaos', title: 'Chaos demo', arch: 'lab', node: chaosNode, estHeight: 230 },
    { id: 'sim', title: 'Sim', arch: 'playback', node: simNode, estHeight: 210 },
    { id: 'settings', title: 'Settings', arch: 'quality', node: settingsNode, estHeight: 170 },
  ];

  const views: ViewDef[] = [
    {
      id: 'orbit',
      title: 'Orbit',
      defaultRect: { x: 372, y: 16, w: 712, h: 600 },
      node: (
        <div style={{ position: 'absolute', inset: 0, background: '#05060a' }}>
          <Canvas3D onMount={onMount} />

          {/* Live divergence readout. */}
          <div style={{
            position: 'absolute', top: 10, left: 10, padding: '8px 12px',
            background: 'rgba(8,12,20,0.62)', border: '1px solid rgba(120,150,200,0.25)',
            borderRadius: 8, color: '#cfe0f5', font: '12px/1.5 ui-monospace, monospace',
            pointerEvents: 'none', backdropFilter: 'blur(4px)',
          }}>
            <div>cloud spread&nbsp; <span ref={spreadElRef} style={{ color: GHOST_COLOR_HEX }}>0.00e+0</span></div>
            <div>Lyapunov λ&nbsp;&nbsp; <span ref={lyapElRef} style={{ color: '#9ec7ff' }}>…</span></div>
            <div>sim time&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span ref={timeElRef} style={{ color: '#9ec7ff' }}>0.0</span></div>
            {placeMode && <div style={{ color: '#ffd27f' }}>click + drag to launch</div>}
          </div>

          {skyOn && <SkyView dataRef={skyRef} dayLen={dayLen} tilt={tilt} />}

          <Observatory snapshot={labSnap} />
        </div>
      ),
    },
  ];

  // Built-in layouts replace the old Settings "simple / advanced" toggle:
  // Sandbox ≈ the old simple set; Advanced opens every knob.
  const layouts: LayoutDef[] = [
    {
      id: 'sandbox', name: 'Sandbox', sub: 'System · Planet launch · Sim', icon: 'tune',
      open: { system: { x: 84, y: 18 }, launch: { x: 84, y: 466 }, sim: { x: 366, y: 18 } },
    },
    {
      id: 'advanced', name: 'Advanced', sub: 'Every knob', icon: 'grid',
      open: {
        system: { x: 84, y: 18 }, launch: { x: 84, y: 466 },
        stars: { x: 366, y: 18 }, climate: { x: 366, y: 476 },
        sky: { x: 648, y: 18 }, frame: { x: 648, y: 336 },
        sim: { x: 930, y: 18 },
      },
    },
  ];

  return (
    <Workspace
      appId="trinary-obs"
      title="Trinary System"
      subtitle={preset.name}
      sections={sections}
      views={views}
      layouts={layouts}
      defaultLayoutId="sandbox"
      explainer={explainerText}
      modes={MODES}
      activeMode="observatory"
      onModeChange={id => { if (id === 'lab') window.location.hash = '#/trinary-lab'; }}
    />
  );
}
