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
 * This wrapper hosts both behind one entry, swapping the active view while
 * preserving the existing hash routes so old deep-links keep working:
 * `#/trinary` → Observatory, `#/trinary-lab` → Lab. Each view renders its own
 * Workspace chrome with Explore | Lab mode pills in the top bar (the old
 * bottom tab bar's replacement); the pills switch views by setting the hash,
 * which this wrapper observes. Each view still manages its own URL query
 * (shareable configs).
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
  // The guided tour shows once on a user's first visit, then on demand (the
  // "Take the tour" button in the Observatory's Sim panel).
  const [tourSeen, setTourSeen] = usePersistentState('trinary:tourSeen', false);
  const [tourOpen, setTourOpen] = useState(() => !tourSeen);

  // The hash is the single source of truth for the active view, so deep-links
  // and each view's mode pills (which set the hash) stay consistent.
  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const closeTour = () => { setTourOpen(false); setTourSeen(true); };

  return (
    <>
      <Suspense fallback={<div style={{ position: 'absolute', inset: 0, background: '#05060a' }} />}>
        {tab === 'lab' ? <Lab /> : <Observatory onTour={() => setTourOpen(true)} />}
      </Suspense>
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
    body: 'Open the System panel from the icon rail on the left to choose a scenario — the dazzling Figure-Eight and Moth choreographies, the violent Pythagorean fall, or a Binary + Star. Each behaves completely differently.',
  },
  {
    title: 'Watch chaos unfold',
    body: 'The planet launches with a swarm of faint “ghost” copies hugging it — near-identical worlds. They start together, then fan out and scatter — sensitive dependence on initial conditions erasing any prediction of the future. The Ghost swarm panel tunes how many, and how close they start.',
  },
  {
    title: 'Look around, tune it',
    body: 'Drag to orbit the camera. The rail panels let you change star masses, set the habitable climate band, or even stand on the planet’s surface and watch the suns wheel overhead. The Layout menu (top bar) has one arrangement per activity — Ghost swarm, Climate & sky, Rotating frames — and “Everything” opens every knob.',
  },
  {
    title: 'Open the Lab',
    body: 'Use the Explore | Lab pills in the top bar to switch to the Lab — it runs thousands of these worlds headless and maps their fates into fractal “destiny” portraits and statistics. Enjoy exploring!',
  },
];
