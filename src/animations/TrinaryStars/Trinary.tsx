import React, { Suspense, useEffect, useState } from 'react';
import { usePersistentState } from '../../lib/usePersistentState';
import Tour, { type TourStep } from './Tour';

/**
 * Trinary System — a single app with two views:
 *   - Observatory: drop a planet into a three-star system and watch its future
 *     diverge (the live 3D sandbox).
 *   - Lab: run thousands of those worlds headless and map / tally their fates.
 *
 * The two were previously separate catalog entries (`/trinary`, `/trinary-lab`).
 * This wrapper hosts both behind one entry, swapping the active view from a tab
 * bar while preserving the existing hash routes so old deep-links keep working:
 * `#/trinary` → Observatory, `#/trinary-lab` → Lab. Each view still manages its
 * own URL query (shareable configs) and they cross-link by changing the hash,
 * which this wrapper observes.
 */

const Observatory = React.lazy(() => import('./TrinaryStars'));
const Lab = React.lazy(() => import('./lab/TrinaryLab'));

type Tab = 'observatory' | 'lab';

function tabFromHash(): Tab {
  const path = window.location.hash.replace(/^#/, '').split('?')[0];
  return path === '/trinary-lab' ? 'lab' : 'observatory';
}

export default function Trinary() {
  const [tab, setTab] = useState<Tab>(tabFromHash);
  // The guided tour shows once on a user's first visit, then on demand.
  const [tourSeen, setTourSeen] = usePersistentState('trinary:tourSeen', false);
  const [tourOpen, setTourOpen] = useState(() => !tourSeen);

  // The hash is the single source of truth for the active view, so deep-links
  // and each view's own cross-link buttons (which set the hash) stay consistent.
  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (t: Tab) => {
    if (t === tab) return;
    window.location.hash = t === 'lab' ? '#/trinary-lab' : '#/trinary';
  };
  const closeTour = () => { setTourOpen(false); setTourSeen(true); };

  return (
    <>
      <Suspense fallback={<div style={{ position: 'absolute', inset: 0, background: '#05060a' }} />}>
        {tab === 'lab' ? <Lab /> : <Observatory />}
      </Suspense>
      <TabBar tab={tab} onChange={go} onHelp={() => setTourOpen(true)} />
      {tourOpen && <Tour steps={TOUR_STEPS} onClose={closeTour} />}
    </>
  );
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to the Trinary System',
    body: 'Three stars orbit one another under gravity — a chaotic dance with no closed-form solution. You drop a planet in and watch what becomes of its world.',
  },
  {
    title: 'Pick a system',
    body: 'Open Settings (the ⚙ button, top-right) to choose a scenario — the dazzling Figure-Eight and Moth choreographies, the violent Pythagorean fall, or a Binary + Star. Each behaves completely differently.',
  },
  {
    title: 'Watch chaos unfold',
    body: 'The planet launches with a swarm of near-identical pink “ghost” copies. They start together, then fan out and scatter — sensitive dependence on initial conditions erasing any prediction of the future.',
  },
  {
    title: 'Look around, tune it',
    body: 'Drag to orbit the camera. In Settings you can change star masses, set the habitable climate band, or even stand on the planet’s surface and watch the suns wheel overhead. Switch Settings to “Advanced” for every knob.',
  },
  {
    title: 'Open the Lab',
    body: 'Use the tabs at the bottom to switch to the Lab — it runs thousands of these worlds headless and maps their fates into fractal “destiny” portraits and statistics. Enjoy exploring!',
  },
];

const wrapStyle: React.CSSProperties = {
  position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
  display: 'inline-flex', gap: 2, padding: 3, zIndex: 45,
  background: 'rgba(12,16,24,0.82)', border: '1px solid rgba(120,150,200,0.25)',
  borderRadius: 999, backdropFilter: 'blur(6px)', boxShadow: '0 4px 18px rgba(0,0,0,0.4)',
};

function itemStyle(active: boolean): React.CSSProperties {
  return {
    appearance: 'none', border: 'none', cursor: 'pointer',
    padding: '7px 18px', borderRadius: 999,
    font: '600 13px/1 system-ui, sans-serif', letterSpacing: 0.2,
    color: active ? '#06121f' : '#cfe0f5',
    background: active ? '#66f0ff' : 'transparent',
    transition: 'background 0.15s, color 0.15s',
  };
}

function TabBar({ tab, onChange, onHelp }: { tab: Tab; onChange: (t: Tab) => void; onHelp: () => void }) {
  return (
    <div style={wrapStyle} role="tablist" aria-label="Trinary view">
      <button role="tab" aria-selected={tab === 'observatory'} style={itemStyle(tab === 'observatory')}
        onClick={() => onChange('observatory')}>✸ Observatory</button>
      <button role="tab" aria-selected={tab === 'lab'} style={itemStyle(tab === 'lab')}
        onClick={() => onChange('lab')}>▦ Lab</button>
      <button title="Take the tour" aria-label="Take the tour" style={helpStyle} onClick={onHelp}>?</button>
    </div>
  );
}

const helpStyle: React.CSSProperties = {
  appearance: 'none', border: 'none', cursor: 'pointer',
  width: 30, borderRadius: 999, marginLeft: 2,
  font: '700 14px/1 system-ui, sans-serif', color: '#cfe0f5',
  background: 'rgba(255,255,255,0.06)',
};
