import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const FractalsGPU = React.lazy(() => import('./animations/FractalsGPU/FractalsGPU'));
const Fractals2D = React.lazy(() => import('./animations/Fractals/Fractals2D'));
const Correspondence = React.lazy(() => import('./animations/Correspondence/Correspondence'));
const ComplexRoots = React.lazy(() => import('./animations/ComplexRoots/ComplexRoots'));
const ComplexMultibranch = React.lazy(() => import('./animations/ComplexMultibranch/ComplexMultibranch'));
const MobiusWalk = React.lazy(() => import('./animations/MobiusWalk/MobiusWalk'));
const StableMarriage = React.lazy(() => import('./animations/StableMarriage/StableMarriage'));
const AgenticSorting = React.lazy(() => import('./animations/AgenticSorting/AgenticSorting'));

const routes: Record<string, React.ComponentType> = {
  '/': App,
  '/fractals': FractalsGPU,
  '/fractals-cpu': Fractals2D,
  '/correspondence': Correspondence,
  '/roots': ComplexRoots,
  '/multibranch': ComplexMultibranch,
  '/mobius': MobiusWalk,
  '/stable-marriage': StableMarriage,
  '/agentic-sorting': AgenticSorting,
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

  const Component = routes[hash] ?? App;

  return (
    <React.Suspense fallback={<div style={{ background: '#000', width: '100vw', height: '100vh' }} />}>
      <Component />
    </React.Suspense>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
