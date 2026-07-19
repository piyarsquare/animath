import React from 'react';

/**
 * Error boundary around each route. Without it, a runtime error anywhere in an
 * app (most commonly WebGL context creation in a restricted environment) blanks
 * the whole page with no way back — Back stays blank, only a reload recovers.
 * The boundary contains the failure to the route and offers a named error panel
 * with Home and Retry, keeping navigation alive.
 *
 * Keyed by route in the router: navigating to another route remounts the
 * boundary, so an error never follows the user across apps.
 */
interface State { error: Error | null; }

export class RouteBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[animath] route crashed:', error, info.componentStack);
  }

  private retry = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const webgl = /webgl|context|three/i.test(`${error.name} ${error.message}`);
    return (
      <div style={{
        position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
        background: 'var(--bg)', color: 'var(--fg)', padding: 24,
      }}>
        <div role="alert" style={{
          maxWidth: 460, padding: '22px 24px', borderRadius: 13,
          background: 'var(--panel)', border: '1px solid var(--border-strong)',
          boxShadow: 'var(--shadow)', font: '14px/1.55 var(--font-ui, system-ui)',
        }}>
          <h2 style={{ margin: '0 0 8px', font: '700 17px/1.3 var(--font-display, system-ui)' }}>
            This animation hit an error
          </h2>
          <p style={{ margin: '0 0 6px', color: 'var(--dim)' }}>
            {webgl
              ? 'It looks like 3D rendering (WebGL) is unavailable or restricted in this browser. Hardware acceleration being disabled, a strict privacy mode, or a remote desktop can cause this.'
              : 'Something went wrong while running this animation.'}
          </p>
          <p style={{
            margin: '0 0 16px', color: 'var(--dim-2)',
            font: '11.5px/1.5 var(--font-mono, monospace)', wordBreak: 'break-word',
          }}>
            {error.name}: {error.message}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="#/" style={{
              padding: '9px 16px', borderRadius: 7, textDecoration: 'none',
              background: 'var(--accent)', color: 'var(--accent-fg)', fontWeight: 600,
            }}>
              Home
            </a>
            <button onClick={this.retry} style={{
              padding: '9px 16px', borderRadius: 7, border: '1px solid var(--border)',
              background: 'var(--panel-2)', color: 'var(--fg)', font: 'inherit', fontWeight: 600, cursor: 'pointer',
            }}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }
}
