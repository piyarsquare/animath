import { apps } from '../apps';
import './Menu.css';

/** Landing screen: a gallery of every animation in the toolkit. Mounted at the
 *  default `/` route. Cards navigate by setting the hash, which the router in
 *  src/index.tsx listens to. The bar title ("animath") is supplied by AppShell
 *  for the home route, so this view does not register its own header. */
export default function Menu() {
  const go = (hash: string) => { window.location.hash = '#' + hash; };

  return (
    <div className="as-content-scroll menu">
      <header className="menu-hero">
        <h1 className="menu-title">animath</h1>
        <p className="menu-tagline">
          A toolkit for mathematical animations &amp; generative art.
          Pick something to explore.
        </p>
      </header>

      <div className="menu-grid">
        {apps.map(app => (
          <button
            key={app.hash}
            className="menu-card"
            onClick={() => go(app.hash)}
          >
            <span className="menu-card-icon" aria-hidden="true">{app.icon ?? '•'}</span>
            <span className="menu-card-body">
              <span className="menu-card-name">{app.name}</span>
              {app.blurb && <span className="menu-card-blurb">{app.blurb}</span>}
            </span>
            <span className="menu-card-go" aria-hidden="true">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
