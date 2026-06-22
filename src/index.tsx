import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Gallery from './chrome/Gallery';
import { LoadingScreen } from './chrome/LoadingScreen';
import './chrome/theme.css';
import { applyPersistedSkin } from './chrome/skins';

// Set <html data-theme> before first paint so every route renders skinned.
applyPersistedSkin();

const FractalsGPU = React.lazy(() => import('./animations/FractalsGPU/FractalsGPU'));
const Fractals2D = React.lazy(() => import('./animations/Fractals/Fractals2D'));
const Correspondence = React.lazy(() => import('./animations/Correspondence/Correspondence'));
const PlaneTransform = React.lazy(() => import('./animations/PlaneTransform/PlaneTransform'));
const TopologyWalk = React.lazy(() => import('./animations/TopologyWalk/TopologyWalk'));
const Trinary = React.lazy(() => import('./animations/TrinaryStars/Trinary'));
const StableMarriage = React.lazy(() => import('./animations/StableMarriage/StableMarriage'));
const StableMatching = React.lazy(() => import('./animations/StableMatching/StableMatching'));
const AgenticSorting = React.lazy(() => import('./animations/AgenticSorting/AgenticSorting'));
const PolygonWorlds = React.lazy(() => import('./animations/PolygonWorlds/PolygonWorlds'));
const TreesAndNets = React.lazy(() => import('./animations/TreesAndNets/TreesAndNets'));
const SolidWorlds = React.lazy(() => import('./animations/SolidWorlds/SolidWorlds'));
const Argand = React.lazy(() => import('./animations/Argand/Argand'));
const EmbedComplexParticles = React.lazy(() => import('./embed/EmbedComplexParticles'));
const EmbedPlaneTransform = React.lazy(() => import('./embed/EmbedPlaneTransform'));
const CountingTheWays = React.lazy(() => import('./animations/CountingTheWays/CountingTheWays'));

const routes: Record<string, React.ComponentType> = {
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
  '/stable-matching': StableMatching,   // rebuild of Stable Marriage; will replace it on switch
  '/agentic-sorting': AgenticSorting,
  '/polygon-worlds': PolygonWorlds,
  '/trees-and-nets': TreesAndNets,
  '/solid-worlds': SolidWorlds,
  '/argand': Argand,
  // Chrome-less applet routes for embedding in web pages (docs/EMBEDS.md).
  '/embed/complex-particles': EmbedComplexParticles,
  '/embed/plane-transform': EmbedPlaneTransform,
  '/counting-the-ways': CountingTheWays,
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

  // The gallery is the landing page and the only cross-app hub; unknown
  // hashes fall back to it. Every app owns its chrome (Workspace + TopBar)
  // and renders bare.
  const Component = routes[path];
  if (path === '/' || !Component) return <Gallery />;

  return (
    <React.Suspense fallback={<LoadingScreen />}>
      <Component />
    </React.Suspense>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
