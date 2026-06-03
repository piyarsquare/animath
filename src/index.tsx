import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Menu from './components/Menu';
import { AppShell } from './components/AppShell';
import { apps } from './apps';

const FractalsGPU = React.lazy(() => import('./animations/FractalsGPU/FractalsGPU'));
const Fractals2D = React.lazy(() => import('./animations/Fractals/Fractals2D'));
const Correspondence = React.lazy(() => import('./animations/Correspondence/Correspondence'));
const PlaneTransform = React.lazy(() => import('./animations/PlaneTransform/PlaneTransform'));
const MobiusWalk = React.lazy(() => import('./animations/MobiusWalk/MobiusWalk'));
const WrapWorld = React.lazy(() => import('./animations/WrapWorld/WrapWorld'));
const StableMarriage = React.lazy(() => import('./animations/StableMarriage/StableMarriage'));
const AgenticSorting = React.lazy(() => import('./animations/AgenticSorting/AgenticSorting'));

const routes: Record<string, React.ComponentType> = {
  '/': Menu,
  '/complex-particles': App,
  '/plane-transform': PlaneTransform,
  '/fractals': FractalsGPU,
  '/fractals-cpu': Fractals2D,
  '/correspondence': Correspondence,
  '/mobius': MobiusWalk,
  '/wrap-world': WrapWorld,
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

  const Component = routes[hash] ?? Menu;
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
