import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import FractalsGPU from './animations/FractalsGPU/FractalsGPU';
import Correspondence from './animations/Correspondence/Correspondence';
import ComplexRoots from './animations/ComplexRoots/ComplexRoots';
import ComplexMultibranch from './animations/ComplexMultibranch/ComplexMultibranch';
import MobiusWalk from './animations/MobiusWalk/MobiusWalk';
import StableMarriage from './animations/StableMarriage/StableMarriage';
import AgenticSorting from './animations/AgenticSorting/AgenticSorting';

const routes: Record<string, JSX.Element> = {
  '/': <App />,
  '/fractals': <FractalsGPU />,
  '/correspondence': <Correspondence />,
  '/roots': <ComplexRoots />,
  '/multibranch': <ComplexMultibranch />,
  '/mobius': <MobiusWalk />,
  '/stable-marriage': <StableMarriage />,
  '/agentic-sorting': <AgenticSorting />
};

function getRoute(): JSX.Element {
  const hash = window.location.hash.replace(/^#/, '');
  return routes[hash] ?? <App />;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {getRoute()}
  </React.StrictMode>
);
