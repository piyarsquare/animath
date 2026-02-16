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
import Fractals2D from './animations/Fractals/Fractals2D';

const routes: Record<string, JSX.Element> = {
  '/': <App />,
  '/fractals': <FractalsGPU />,
  '/fractals-cpu': <Fractals2D />,
  '/correspondence': <Correspondence />,
  '/roots': <ComplexRoots />,
  '/multibranch': <ComplexMultibranch />,
  '/mobius': <MobiusWalk />,
  '/stable-marriage': <StableMarriage />,
  '/agentic-sorting': <AgenticSorting />
};

function getHash(): string {
  return window.location.hash.replace(/^#/, '');
}

function Router(): JSX.Element {
  const [hash, setHash] = React.useState(getHash());

  React.useEffect(() => {
    const handleHashChange = () => setHash(getHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return routes[hash] ?? <App />;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
