import React, { useCallback, useMemo, useRef } from 'react';
import * as THREE from 'three';
import Canvas3D, { type CanvasContext } from '../../components/Canvas3D';
import Workspace from '../../chrome/workspace/Workspace';
import type { ActionDef, LayoutDef, SectionDef, ViewDef } from '../../chrome/workspace/types';
import { Slider, Checkbox } from '../../components/ControlPanel';
import { Kicker, StatGrid } from '../../chrome/readouts';
import { usePersistentState, clearPersistedState } from '../../lib/usePersistentState';
import { buildBelt, type BeltColors } from './ribbon';
import { beltReadout, formatW, isContractible } from './belt';
import explainerText from './EXPLAINER.md?raw';

const NS = 'the-belt';
const UNTWIST_MS = 1500; // a single designed "comes free" beat
const REFUSAL_MS = 950; // the shorter "won't budge, springs back" beat
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

interface UntwistAnim { mode: 'success' | 'refusal'; turn: number; start: number }

function themeColors(): BeltColors {
  const cs = getComputedStyle(document.documentElement);
  const get = (v: string, fb: string) => cs.getPropertyValue(v).trim() || fb;
  return {
    front: get('--accent', '#e3b23c'),
    back: get('--accent-2', '#7a5a22'),
    stripe: get('--fg', '#f5f5f5'),
    block: get('--panel-solid', '#3a3a3a'),
    clamp: get('--panel-2', '#262626'),
  };
}

export default function TheBelt() {
  const [turnDeg, setTurnDeg] = usePersistentState<number>(`${NS}:turn`, 0);
  const [showStripe, setShowStripe] = usePersistentState<boolean>(`${NS}:stripe`, true);

  // The scene reads the latest control values through this ref each frame
  // (Canvas3D's onMount closes over state once — see BUILDING_AN_APP §5).
  const refs = useRef({ turnDeg, showStripe, az: 0.15, el: 0.12, untwist: null as UntwistAnim | null });
  refs.current.turnDeg = turnDeg;
  refs.current.showStripe = showStripe;

  const onMount = useCallback((ctx: CanvasContext) => {
    const { scene, camera, renderer } = ctx;
    renderer.setClearColor(0x000000, 0);

    const belt = buildBelt(themeColors());
    scene.add(belt.group);

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(2.5, 3, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.4);
    fill.position.set(-3, -1, -2);
    scene.add(fill);

    const R = 5.0;
    let vis = refs.current.turnDeg; // eased visual angle (smooth motion)
    let raf = 0;
    const tick = () => {
      const u = refs.current.untwist;
      if (u) {
        const elapsed = performance.now() - u.start;
        if (u.mode === 'success') {
          const t = Math.min(1, elapsed / UNTWIST_MS);
          belt.setUntwist(u.turn, easeInOut(t));
          if (t >= 1) { refs.current.untwist = null; vis = 0; setTurnDeg(0); }
        } else {
          const t = elapsed / REFUSAL_MS;
          if (t >= 1) { refs.current.untwist = null; belt.setTurn(refs.current.turnDeg); }
          else belt.setStrain(u.turn, 0.9 * Math.sin(Math.PI * t)); // strain and recoil; block never moves
        }
      } else {
        const target = refs.current.turnDeg;
        vis += (target - vis) * 0.18;
        if (Math.abs(target - vis) < 0.05) vis = target;
        belt.setTurn(vis);
      }

      belt.stripe.visible = refs.current.showStripe;

      const { az, el } = refs.current;
      camera.position.set(R * Math.cos(el) * Math.sin(az), R * Math.sin(el), R * Math.cos(el) * Math.cos(az));
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      scene.remove(belt.group);
      belt.dispose();
    };
  }, [setTurnDeg]); // setTurnDeg is a stable setter — no remount

  // --- minimal camera orbit (looking), kept separate from the block's turn ---
  const drag = useRef<{ x: number; y: number } | null>(null);
  const gestures = {
    onPointerDown: (e: React.PointerEvent) => {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      drag.current = { x: e.clientX, y: e.clientY };
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!drag.current) return;
      const dx = e.clientX - drag.current.x;
      const dy = e.clientY - drag.current.y;
      drag.current = { x: e.clientX, y: e.clientY };
      refs.current.az += dx * 0.006;
      refs.current.el = Math.max(-1.3, Math.min(1.3, refs.current.el - dy * 0.006));
    },
    onPointerUp: (e: React.PointerEvent) => { drag.current = null; void e; },
    onPointerCancel: () => { drag.current = null; },
  };

  // Attempt to shed the twist by looping the belt around — succeeds only when
  // the block is back at +1 (an even number of half-turns), refuses otherwise.
  const attemptUntwist = useCallback(() => {
    const td = refs.current.turnDeg;
    if (td <= 0 || refs.current.untwist) return;
    refs.current.untwist = {
      mode: isContractible(td) ? 'success' : 'refusal',
      turn: td,
      start: performance.now(),
    };
  }, []);

  const r = beltReadout(turnDeg);

  const sections: SectionDef[] = useMemo(() => [
    {
      id: 'turn', title: 'Turn', arch: 'drive', estHeight: 180,
      node: (
        <>
          <Slider label="Block turn" value={turnDeg} min={0} max={720} step={1}
            onChange={v => setTurnDeg(Math.round(v))} format={v => `${Math.round(v)}°`} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="am-btn" onClick={() => setTurnDeg(d => Math.min(720, d + 360))}>Turn +360°</button>
            <button className="am-btn" onClick={() => setTurnDeg(d => Math.max(0, d - 360))}>Turn −360°</button>
          </div>
        </>
      ),
    },
    {
      id: 'readout', title: 'Readout', arch: 'readout', estHeight: 200,
      node: (
        <>
          <Kicker>Unit quaternion</Kicker>
          <StatGrid stats={[
            { k: 'w = cos(θ/2)', v: formatW(r.w) },
            { k: 'sheet', v: r.sign > 0 ? '+q' : '−q' },
            { k: 'block turn', v: `${Math.round(r.turnDeg)}°` },
            { k: 'turns', v: r.turns.toFixed(2) },
          ]} />
          <p style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
            {r.atHome ? 'Home — belt flat, quaternion at +q.'
              : r.atAntipode ? 'Antipode — block looks home, but the belt is still twisted (−q).'
              : 'Mid-turn.'}
          </p>
        </>
      ),
    },
    {
      id: 'block', title: 'Block', arch: 'subject', estHeight: 120,
      node: (
        <Checkbox label="Show center stripe" checked={showStripe} onChange={setShowStripe} />
      ),
    },
    {
      id: 'detail', title: 'Detail', arch: 'quality', estHeight: 110,
      node: (
        <button className="am-btn" onClick={() => { clearPersistedState(NS); window.location.reload(); }}>
          Reset settings to defaults
        </button>
      ),
    },
  ], [turnDeg, showStripe, r.w, r.sign, r.turnDeg, r.turns, r.atHome, r.atAntipode, setTurnDeg, setShowStripe]);

  const views: ViewDef[] = useMemo(() => [{
    id: 'belt',
    title: 'The Belt',
    defaultRect: { x: 360, y: 16, w: 720, h: 640 },
    hint: 'drag the block one full turn — then try to undo the twist.',
    node: (
      <div {...gestures} style={{ position: 'absolute', inset: 0, overflow: 'hidden', touchAction: 'none' }}>
        <Canvas3D onMount={onMount} />
      </div>
    ),
  }], [onMount]); // eslint-disable-line react-hooks/exhaustive-deps

  const layouts: LayoutDef[] = useMemo(() => [{
    id: 'bench', name: "Jeweler's bench", sub: 'Turn · Readout', icon: 'tune',
    open: { turn: { x: 84, y: 18 }, readout: { x: 84, y: 220 } },
  }], []);

  const actions: ActionDef[] = useMemo(() => [
    { id: 'untwist', icon: 'reset', label: 'Untwist', primary: true, sectionId: 'turn', onClick: attemptUntwist },
    { id: 'plus', icon: 'play', label: 'Turn +360°', sectionId: 'turn', onClick: () => setTurnDeg(d => Math.min(720, d + 360)) },
    { id: 'minus', icon: 'play', label: 'Turn −360°', sectionId: 'turn', onClick: () => setTurnDeg(d => Math.max(0, d - 360)) },
  ], [setTurnDeg, attemptUntwist]);

  return (
    <Workspace
      appId={NS}
      title="The Belt"
      subtitle={`${Math.round(turnDeg)}° · ${r.sign > 0 ? '+q' : '−q'}`}
      sections={sections}
      views={views}
      layouts={layouts}
      defaultLayoutId="bench"
      explainer={explainerText}
      actions={actions}
    />
  );
}
