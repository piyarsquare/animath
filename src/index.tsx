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
const TopologyWalk = React.lazy(() => import('./animations/TopologyWalk/TopologyWalk'));
const Trinary = React.lazy(() => import('./animations/TrinaryStars/Trinary'));
const StableMarriage = React.lazy(() => import('./animations/StableMarriage/StableMarriage'));
const AgenticSorting = React.lazy(() => import('./animations/AgenticSorting/AgenticSorting'));
const PolygonWorlds = React.lazy(() => import('./animations/PolygonWorlds/PolygonWorlds'));

const routes: Record<string, React.ComponentType> = {
  '/': Menu,
  '/complex-particles': App,
  '/plane-transform': PlaneTransform,
  '/fractals': FractalsGPU,
  '/fractals-cpu': Fractals2D,
  '/correspondence': Correspondence,
  '/topology-walk': TopologyWalk,
  '/mobius': TopologyWalk,      // legacy hashes → merged app
  '/wrap-world': TopologyWalk,
  // Trinary System is one app with two views; `/trinary-lab` is the Lab tab and
  // is kept as a route so existing deep-links resolve (see Trinary.tsx).
  '/trinary': Trinary,
  '/trinary-lab': Trinary,
  '/stable-marriage': StableMarriage,
  '/agentic-sorting': AgenticSorting,
  '/polygon-worlds': PolygonWorlds,
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

  // Routes may carry a `?query` (e.g. the lab's shareable config); match on path.
  const path = hash.split('?')[0];
  const Component = routes[path] ?? Menu;
  const navigate = (h: string) => { window.location.hash = '#' + h; };

  // The Lab is a tab within the Trinary app, not a separate app: present it as
  // `/trinary` to the shell so the Apps list stays highlighted and switching
  // tabs doesn't trigger a full shell reset.
  const shellHash = path === '/trinary-lab' ? '/trinary' : path;

  return (
    <AppShell apps={apps} currentHash={shellHash} onNavigate={navigate}>
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
