import React, { Suspense, useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import Workspace from '../../chrome/workspace/Workspace';
import { Button } from '../../components/ControlPanel';
import { consumeGardenReturn } from '../../lib/gardenHandoff';
import { MultiplicationInstrument, DerivativeInstrument } from './ArithmeticInstruments';
import { initialWalk, stopFromHash, walkReducer, type Stop, type WalkState } from './walkState';
import readme from './README.md?raw';
import explainer from './EXPLAINER.md?raw';
import './gardenWalk.css';

const GraphMapInstrument = React.lazy(() => import('./GraphMapInstrument'));
// Same-visit memory only: no localStorage and no cross-device promise. Leaving
// for a full instrument keeps each experiment; a fresh page starts the examples.
let visit: WalkState | null = null;
const positions: Record<Stop, number> = { cover: 0, multiplication: 0, derivative: 0, graph: 0 };
const stops: { id: Exclude<Stop, 'cover'>; title: string; cue: string; symbol: string }[] = [
  { id: 'multiplication', title: 'Multiplication', cue: 'Change the rule', symbol: 'j² = p' },
  { id: 'derivative', title: 'Derivative', cue: 'Read the second slot', symbol: 'ε² = 0' },
  { id: 'graph', title: 'Graph / map', cue: 'Keep the pair together', symbol: 'z ↦ z²' },
];
const titles: Record<Stop, string> = {
  cover: 'What can multiplication tell us about a function?',
  multiplication: 'Change the multiplication rule.',
  derivative: 'A square remembers its derivative.',
  graph: 'One function. Two pictures.',
};

export default function GardenWalk() {
  const [state, dispatch] = useReducer(walkReducer, undefined, () => ({
    ...(visit ?? initialWalk()), stop: stopFromHash(window.location.hash),
  }));
  const scrollRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStop = useRef(state.stop);

  useEffect(() => { visit = state; }, [state]);
  useEffect(() => {
    const returned = consumeGardenReturn();
    if (returned && stopFromHash(window.location.hash) === 'graph') {
      dispatch({ type: 'returned', changedFunction: returned.changedFunction });
    }
    const onHash = () => {
      if (window.location.hash.split('?')[0] === '#/garden') {
        dispatch({ type: 'visit', stop: stopFromHash(window.location.hash) });
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = positions[state.stop];
    if (previousStop.current !== state.stop) headingRef.current?.focus({ preventScroll: true });
    previousStop.current = state.stop;
  }, [state.stop]);

  const go = (stop: Stop) => {
    dispatch({ type: 'visit', stop });
    window.location.hash = stop === 'cover' ? '/garden' : `/garden?stop=${stop}`;
  };
  const restart = () => {
    Object.keys(positions).forEach(key => { positions[key as Stop] = 0; });
    dispatch({ type: 'restart' });
    go('multiplication');
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };
  const forward = (from: 'multiplication' | 'derivative') => {
    const to = from === 'multiplication' ? 'derivative' : 'graph';
    positions[to] = 0;
    dispatch({ type: 'forward', from });
    go(to);
  };
  const restore = () => dispatch({ type: 'restore' });
  const isStop = state.stop !== 'cover';
  const page = <div className="garden-notebook" ref={scrollRef} onScroll={e => { positions[state.stop] = e.currentTarget.scrollTop; }}>
    <div className="garden-page">
      <nav className="garden-wayfinding" aria-label="Notebook route">
        <a href="#/garden" onClick={e => { e.preventDefault(); go('cover'); }} aria-current={state.stop === 'cover' ? 'page' : undefined}>The notebook</a>
        <span>A walk into the connected garden</span>
      </nav>
      <nav className="garden-stops" aria-label="Three stops">
        {stops.map((stop, i) => <a key={stop.id} href={`#/garden?stop=${stop.id}`}
          aria-current={state.stop === stop.id ? 'step' : undefined}
          onClick={e => { e.preventDefault(); go(stop.id); }}>
          <span className="garden-stop-number">0{i + 1}</span><span>{stop.title}<small>{stop.cue}</small></span>
        </a>)}
      </nav>
      <header className={`garden-heading${!isStop ? ' garden-cover-heading' : ''}`}>
        <p className="garden-eyebrow">{isStop ? `Stop ${stops.findIndex(s => s.id === state.stop) + 1} of 3` : 'Number planes · a short notebook walk'}</p>
        <h1 tabIndex={-1} ref={headingRef}>{titles[state.stop]}</h1>
        {!isStop && <p className="garden-lede">A point can be a number. Change how numbers multiply, and a familiar function reveals something different. Try one product, read a derivative from it, then see a complex function as both a map and a graph.</p>}
      </header>
      {!isStop ? <>
        <div className="garden-cover-equation" aria-label="The same square, different multiplication rules">
          <span>(1 + j)²</span><span className="garden-equation-arrow">↦</span><div><span>2j <small>j² = −1</small></span><span>1 + 2ε <small>ε² = 0</small></span><span>2 + 2j <small>j² = +1</small></span></div>
        </div>
        <div className="garden-cover-actions"><Button variant="primary" onClick={restart}>Start the worked example</Button><p>Or enter any stop above. There is no required order, and no clock.</p></div>
        <div className="garden-cover-notes"><p><strong>One idea to carry.</strong> The multiplication rule determines what a function does. Pictures help us follow the consequences.</p><p><strong>Room to wander.</strong> Change the numbers. Open the full instruments. Your settings stay here during this visit.</p></div>
      </> : <>
        <div className="garden-tools">
          <Button variant="ghost" onClick={restore}>{state.guided ? 'Restore this example' : 'Start the worked example'}</Button>
          <Button variant="ghost" onClick={() => dispatch({ type: 'guided', value: !state.guided })}>{state.guided ? 'Explore on my own' : 'Read the guided passage'}</Button>
          <Button variant="ghost" onClick={restart}>Restart walk</Button>
        </div>
        {state.stop === 'multiplication' && <>
          {state.guided && <p className="garden-passage">Before moving the dial, which coordinate of the product will change? Start with <strong>u = v = 1 + j</strong>. Try j² = −1, 0, and +1. The dial changes the algebra, not the camera.</p>}
          <MultiplicationInstrument value={state.multiplication} onChange={value => dispatch({ type: 'multiplication', value })} />
          <section className="garden-boundary" aria-label="Into dual numbers"><p className="garden-eyebrow">Next · read a derivative</p><h2>What if the squared part vanished?</h2><p>At j² = 0 we call j epsilon, ε. Now square a + bε. The ε² term vanishes, leaving a second slot that remembers how the square changes.</p><p className="garden-reset-note">Continue with j² = 0 and the square of 1 + ε. This starts the derivative example at a = b = 1. Your multiplication settings are kept for your return.</p><Button variant="primary" onClick={() => forward('multiplication')}>Use this product to read a derivative</Button></section>
        </>}
        {state.stop === 'derivative' && <>
          {state.guided && <p className="garden-passage">In dual numbers, <strong>ε² = 0</strong>. Expand (a + bε)². With b = 1, the second slot is the slope of the square function at a. Predict that slot at a = 2, then try it.</p>}
          <DerivativeInstrument value={state.derivative} onChange={value => dispatch({ type: 'derivative', value })} />
          <section className="garden-boundary" aria-label="Change from dual to complex numbers"><p className="garden-eyebrow">A change of number system</p><h2>Keep “square the input.” Change the algebra.</h2><p>We are leaving dual numbers. Now use ordinary complex numbers, where <strong>i² = −1</strong>. The ε coefficient was a derivative slot; the imaginary output here is a coordinate of the function value.</p><p className="garden-reset-note">The next example starts at z = 1 + i, with z² = 2i. It does not copy your dual input or tangent. Your derivative settings stay here.</p><Button variant="primary" onClick={() => forward('derivative')}>Change to complex numbers: see the map and graph</Button><Button variant="ghost" onClick={() => go('multiplication')}>Back to my multiplication</Button></section>
        </>}
        {state.stop === 'graph' && <>
          {state.resumeRequired ? <section className="garden-boundary" role="status"><h2>You explored a different function.</h2><p>This notebook passage is about squaring. Resume the square example explicitly to put its words and pictures together again.</p><Button variant="primary" onClick={restore}>Resume square example</Button></section> : <>
            {state.guided && <p className="garden-passage">We are now in <strong>ℂ, where i² = −1</strong>. The map relates an input point z to an output point w = z². The graph keeps both in one point (Re z, Im z, Re w, Im w). Where did the input go in each picture?</p>}
            <Suspense fallback={<p role="status">Opening the graph and map…</p>}><GraphMapInstrument point={state.point} onPointChange={value => dispatch({ type: 'point', value })} view={state.view} onViewChange={value => dispatch({ type: 'view', value })} /></Suspense>
            <section className="garden-boundary"><p className="garden-eyebrow">Carry this back into the garden</p><h2>A rule, a derivative, a pair.</h2><p>Multiplication gave us a derivative slot in one algebra. In another, it gave us a complex map whose graph keeps every input paired with its output.</p><p>The displayed graph omits Im w. In the full instrument, Torus normalization loses size, Sphere collapses common-phase fibers, and intermediate morphs are visual transitions. Sampling and rendering clamps are display limits.</p></section>
          </>}
          <div className="garden-return-actions"><Button variant="primary" onClick={() => go('multiplication')}>Return to my multiplication</Button><Button onClick={() => go('derivative')}>Back to derivative</Button></div>
        </>}
      </>}
      <footer className="garden-footer">A guided way in, an open way onward. <a href="#/">All instruments ↗</a></footer>
    </div>
  </div>;
  return <div className="garden-workspace"><Workspace appId="garden" title="The notebook" subtitle="A connected garden" immersive
    sections={[]} views={[{ id: 'notebook', title: 'Number planes notebook', defaultRect: { x: 70, y: 12, w: 1080, h: 760 }, node: page }]}
    layouts={[{ id: 'walk', name: 'Notebook', open: {} }]} defaultLayoutId="walk" explainer={`${explainer}\n\n---\n\n${readme}`} /></div>;
}
