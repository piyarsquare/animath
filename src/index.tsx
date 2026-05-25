import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppShell, AppDescriptor } from './components/AppShell';

const FractalsGPU = React.lazy(() => import('./animations/FractalsGPU/FractalsGPU'));
const Fractals2D = React.lazy(() => import('./animations/Fractals/Fractals2D'));
const Correspondence = React.lazy(() => import('./animations/Correspondence/Correspondence'));
const MobiusWalk = React.lazy(() => import('./animations/MobiusWalk/MobiusWalk'));
const StableMarriage = React.lazy(() => import('./animations/StableMarriage/StableMarriage'));
const AgenticSorting = React.lazy(() => import('./animations/AgenticSorting/AgenticSorting'));

const apps: AppDescriptor[] = [
  { hash: '/', name: 'Complex Particles', icon: '✦' },
  { hash: '/fractals', name: 'Fractals', icon: '◯' },
  { hash: '/correspondence', name: 'Mandelbrot ↔ Julia', icon: '⇄' },
  { hash: '/mobius', name: 'Möbius Walk', icon: '∞' },
  { hash: '/stable-marriage', name: 'Stable Marriage', icon: '♥' },
  { hash: '/agentic-sorting', name: 'Agentic Sorting', icon: '⇅' },
];

const routes: Record<string, React.ComponentType> = {
  '/': App,
  '/fractals': FractalsGPU,
  '/fractals-cpu': Fractals2D,
  '/correspondence': Correspondence,
  '/mobius': MobiusWalk,
  '/stable-marriage': StableMarriage,
  '/agentic-sorting': AgenticSorting,
};

function getHash(): string {
  return window.location.hash.replace(/^#/, '') || '/';
}

function Router(): JSX.Element {
  const [hash, setHash] = React.useState(getHash());

  React.useEffect(() => {
    const handleHashChange = () => setHash(getHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const Component = routes[hash] ?? App;
  const navigate = (h: string) => { window.location.hash = '#' + h; };

  return (
    <AppShell apps={apps} currentHash={hash} onNavigate={navigate}>
      <React.Suspense fallback={<div style={{ background: '#000', width: '100%', height: '100%' }} />}>
        <Component />
      </React.Suspense>
    </AppShell>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
