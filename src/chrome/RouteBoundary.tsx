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
interface State { error: Error | null; where: string | null; copied: boolean }

/** The first frames of a stack, trimmed to `file:line:col` — enough to locate a
 *  crash in a deployed bundle (preview builds ship source maps, so a minified
 *  frame maps back to a source line). Phones have no devtools and a crash is
 *  usually reported as a screenshot, so the panel has to carry this itself. */
function topFrames(error: Error, componentStack: string | null, n = 4): string {
  // Frames are shortened to `name @ file.js:line:col` — the origin and path are the
  // same for every frame and would wrap a phone-width panel three times over.
  const short = (l: string) => l.trim().replace(/^at\s+/, '').replace(/https?:\/\/[^\s)]*\//g, '');
  const frames = (error.stack ?? '').split('\n').slice(1).map(short).filter(Boolean).slice(0, n);
  const component = (componentStack ?? '')
    .split('\n')
    .map(l => short(l).replace(/\s*\(.*$/, ''))   // just the component, not its frame
    .filter(Boolean)
    .slice(0, 4);
  return [...frames, ...(component.length ? [`— in ${component.join(' < ')}`] : [])].join('\n');
}

export class RouteBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null, where: null, copied: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[animath] route crashed:', error, info.componentStack);
    this.setState({ where: topFrames(error, info.componentStack ?? null) });
  }

  private retry = () => this.setState({ error: null, where: null, copied: false });

  private details(): string {
    const { error, where } = this.state;
    return [
      `${error?.name}: ${error?.message}`,
      where ?? '',
      `${window.location.href}`,
      navigator.userAgent,
    ].filter(Boolean).join('\n');
  }

  /** Clipboard first; a textarea + execCommand where it is unavailable (an
   *  insecure origin, or a browser that withholds it). */
  private copy = () => {
    const text = this.details();
    const done = () => this.setState({ copied: true });
    navigator.clipboard?.writeText(text).then(done).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } finally { ta.remove(); }
    });
  };

  render() {
    const { error, where, copied } = this.state;
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
          {where && (
            <pre style={{
              margin: '0 0 16px', padding: '9px 10px', borderRadius: 7, maxHeight: 132,
              overflow: 'auto', background: 'var(--panel-2)', border: '1px solid var(--border)',
              color: 'var(--dim-2)', font: '10.5px/1.45 var(--font-mono, monospace)',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>{where}</pre>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
            <button onClick={this.copy} style={{
              padding: '9px 16px', borderRadius: 7, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--dim)', font: 'inherit', fontWeight: 600, cursor: 'pointer',
            }}>
              {copied ? 'Copied' : 'Copy details'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
