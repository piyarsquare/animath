import * as THREE from 'three';
import { ProjectionMode, quatRotate4D, project } from '../viewpoint';
import { quarterQuat } from '../../math/quat4';
import { ViewPoint, Axis } from './types';
import { AXIS_LENGTH } from './createAxes';

export interface AnimationLoopDeps {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  materialsRef: React.MutableRefObject<THREE.ShaderMaterial[]>;
  axisRefs: {
    x: React.MutableRefObject<Axis | undefined>;
    y: React.MutableRefObject<Axis | undefined>;
    u: React.MutableRefObject<Axis | undefined>;
    v: React.MutableRefObject<Axis | undefined>;
  };
  realViewRef: React.MutableRefObject<boolean>;
  projRef: React.MutableRefObject<ProjectionMode>;
  viewMotionRef: React.MutableRefObject<string>;
  dropAxisRef: React.MutableRefObject<string>;
  rotLRef: React.MutableRefObject<THREE.Quaternion>;
  rotRRef: React.MutableRefObject<THREE.Quaternion>;
  viewPointRef: React.MutableRefObject<ViewPoint>;
  onViewPointChangeRef: React.MutableRefObject<((vp: ViewPoint) => void) | undefined>;
  orientationRef: React.MutableRefObject<string>;
  setOrientationMatrix: (m: number[][]) => void;
}

export function startAnimationLoop(deps: AnimationLoopDeps): void {
  const {
    renderer, scene, camera,
    materialsRef, axisRefs,
    realViewRef, projRef, viewMotionRef, dropAxisRef,
    rotLRef, rotRRef, viewPointRef, onViewPointChangeRef,
    orientationRef, setOrientationMatrix,
  } = deps;

  const clock = new THREE.Clock();
  let tCurrent = 0;
  let offset = 0;
  let lastReal = realViewRef.current;
  let transitioning = false;
  let transStart = 0;
  let transDuration = 0;
  let transStartVal = 0;

  const animate = () => {
    const elapsed = clock.getElapsedTime();
    const dropMode = dropAxisRef.current !== 'None';
    const fixedMode = viewMotionRef.current === 'Fixed';

    // Handle realView transitions
    if (realViewRef.current !== lastReal) {
      if (realViewRef.current) {
        transStartVal = tCurrent;
        transStart = elapsed;
        const speeds = [0.5 * 0.5, 0.7 * 0.5, 1 * 0.5];
        const angles = [Math.abs(tCurrent * 0.5), Math.abs(tCurrent * 0.7), Math.abs(tCurrent)];
        transDuration = Math.max(
          angles[0] / speeds[0],
          angles[1] / speeds[1],
          angles[2] / speeds[2]
        );
        transitioning = transDuration > 0;
      } else {
        if (transitioning) {
          const p = Math.min((elapsed - transStart) / transDuration, 1);
          tCurrent = transStartVal * (1 - p);
          transitioning = false;
        }
        offset = tCurrent - elapsed * 0.5;
      }
      lastReal = realViewRef.current;
    }

    // Compute tCurrent
    if (realViewRef.current) {
      if (transitioning) {
        const p = Math.min((elapsed - transStart) / transDuration, 1);
        tCurrent = transStartVal * (1 - p);
        if (p === 1) { transitioning = false; tCurrent = 0; }
      } else {
        tCurrent = 0;
      }
    } else if (dropMode || fixedMode) {
      tCurrent = 0;
    } else {
      if (!transitioning) {
        tCurrent = elapsed * 0.5 + offset;
      } else {
        const p = Math.min((elapsed - transStart) / transDuration, 1);
        tCurrent = transStartVal * (1 - p);
        if (p === 1) {
          transitioning = false;
          offset = tCurrent - elapsed * 0.5;
        }
      }
    }

    // Push time to all materials
    materialsRef.current.forEach(m => { m.uniforms.time.value = tCurrent; });

    // Compute combined quaternion rotation
    const qxy = quarterQuat('XY', tCurrent * 0.5);
    const qyu = quarterQuat('YU', tCurrent * 0.7);
    const qxv = quarterQuat('XV', tCurrent);
    const dynL = qxv.L.clone().multiply(qyu.L).multiply(qxy.L);
    const dynR = qxv.R.clone().multiply(qyu.R).multiply(qxy.R);
    const Lq = dynL.clone().multiply(rotLRef.current);
    const Rq = dynR.clone().multiply(rotRRef.current);

    // Update rotation uniforms on all materials
    materialsRef.current.forEach(m => {
      m.uniforms.uRotL.value.w = Lq.w;
      m.uniforms.uRotL.value.v.set(Lq.x, Lq.y, Lq.z);
      m.uniforms.uRotR.value.w = Rq.w;
      m.uniforms.uRotR.value.v.set(Rq.x, Rq.y, Rq.z);
    });

    // Notify parent of viewpoint change
    viewPointRef.current = { L: Lq.clone(), R: Rq.clone() };
    onViewPointChangeRef.current?.(viewPointRef.current);

    // Update axes
    const L = new THREE.Vector4(Lq.x, Lq.y, Lq.z, Lq.w);
    const R = new THREE.Vector4(Rq.x, Rq.y, Rq.z, Rq.w);

    const updateAxis = (axis: Axis | undefined, start: THREE.Vector4, end: THREE.Vector4) => {
      if (!axis) return;
      const p1 = project(quatRotate4D(start, L, R), projRef.current);
      const p2 = project(quatRotate4D(end, L, R), projRef.current);
      const pos = axis.line.geometry.getAttribute('position') as THREE.BufferAttribute;
      pos.setXYZ(0, p1.x, p1.y, p1.z);
      pos.setXYZ(1, p2.x, p2.y, p2.z);
      pos.needsUpdate = true;
      axis.line.computeLineDistances();
    };

    updateAxis(axisRefs.x.current, new THREE.Vector4(-AXIS_LENGTH, 0, 0, 0), new THREE.Vector4(AXIS_LENGTH, 0, 0, 0));
    if (axisRefs.y.current) axisRefs.y.current.line.visible = !realViewRef.current;
    updateAxis(axisRefs.y.current, new THREE.Vector4(0, -AXIS_LENGTH, 0, 0), new THREE.Vector4(0, AXIS_LENGTH, 0, 0));
    updateAxis(axisRefs.u.current, new THREE.Vector4(0, 0, -AXIS_LENGTH, 0), new THREE.Vector4(0, 0, AXIS_LENGTH, 0));
    updateAxis(axisRefs.v.current, new THREE.Vector4(0, 0, 0, -AXIS_LENGTH), new THREE.Vector4(0, 0, 0, AXIS_LENGTH));

    // Compute orientation matrix
    const ex = project(quatRotate4D(new THREE.Vector4(1, 0, 0, 0), L, R), projRef.current);
    const ey = project(quatRotate4D(new THREE.Vector4(0, 1, 0, 0), L, R), projRef.current);
    const eu = project(quatRotate4D(new THREE.Vector4(0, 0, 1, 0), L, R), projRef.current);
    const ev = project(quatRotate4D(new THREE.Vector4(0, 0, 0, 1), L, R), projRef.current);
    const matrix = [
      [ex.x, ey.x, ev.x, eu.x],
      [ex.y, ey.y, ev.y, eu.y],
      [ex.z, ey.z, ev.z, eu.z]
    ];
    const joined = matrix.map(r => r.map(v => v.toFixed(2)).join(' ')).join('|');
    if (joined !== orientationRef.current) {
      orientationRef.current = joined;
      setOrientationMatrix(matrix);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };

  animate();
}
