import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './AppShell.css';

export interface AppDescriptor {
  /** Hash route (no leading `#`, e.g. `/` or `/fractals`). */
  hash: string;
  /** Human-readable name shown in the bar and picker. */
  name: string;
  /** Optional emoji or single character used as a list-icon. */
  icon?: string;
}

export interface AppShellState {
  /** Title shown in the bar (defaults to the registered AppDescriptor name). */
  title?: string;
  /** Subtle subtitle rendered in monospace next to the title (e.g. a formula). */
  subtitle?: string;
  /** DOM nodes — portal targets — for the Settings and Actions drawer tabs. */
  settingsTargetRef: React.RefObject<HTMLDivElement | null>;
  actionsTargetRef: React.RefObject<HTMLDivElement | null>;
  /** Whether the registered app has populated each tab. */
  hasSettings: boolean;
  hasActions: boolean;
  setHasSettings: (v: boolean) => void;
  setHasActions: (v: boolean) => void;
  setHeader: (h: { title?: string; subtitle?: string }) => void;
}

const AppShellContext = createContext<AppShellState | null>(null);

export interface AppShellProps {
  apps: AppDescriptor[];
  currentHash: string;
  onNavigate: (hash: string) => void;
  children: React.ReactNode;
}

type Tab = 'apps' | 'settings' | 'actions';

export function AppShell({ apps, currentHash, onNavigate, children }: AppShellProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('apps');
  const [header, setHeader] = useState<{ title?: string; subtitle?: string }>({});
  const [hasSettings, setHasSettings] = useState(false);
  const [hasActions, setHasActions] = useState(false);
  const settingsTargetRef = useRef<HTMLDivElement | null>(null);
  const actionsTargetRef = useRef<HTMLDivElement | null>(null);

  // Reset header + tab flags when the active app changes.
  useEffect(() => {
    setHeader({});
    setHasSettings(false);
    setHasActions(false);
    // After app switch, keep the drawer closed; re-snap tab to apps if user opens it.
    setTab('apps');
  }, [currentHash]);

  // Escape closes drawer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const current = apps.find(a => a.hash === currentHash) ?? apps[0];
  const titleName = header.title ?? current?.name ?? '';
  const subtitle = header.subtitle;

  const ctx = useMemo<AppShellState>(() => ({
    title: header.title,
    subtitle: header.subtitle,
    settingsTargetRef,
    actionsTargetRef,
    hasSettings,
    hasActions,
    setHasSettings,
    setHasActions,
    setHeader,
  }), [header.title, header.subtitle, hasSettings, hasActions]);

  const openWithTab = useCallback((t: Tab) => { setTab(t); setOpen(true); }, []);

  return (
    <AppShellContext.Provider value={ctx}>
      <div className="as-shell">
        <header className="as-bar">
          <button className="as-bar-btn" aria-label="Open menu" onClick={() => openWithTab('apps')}>≡</button>
          <button
            className="as-bar-title"
            onClick={() => openWithTab(hasSettings ? 'settings' : 'apps')}
            aria-label="Show settings"
          >
            <span className="as-bar-title-name">{titleName}</span>
            {subtitle && <span className="as-bar-title-formula">{subtitle}</span>}
          </button>
          {hasActions && (
            <button className="as-bar-btn" aria-label="Show actions" onClick={() => openWithTab('actions')}>▶</button>
          )}
        </header>

        <div className="as-content">
          {children}
        </div>

        <div className={`as-scrim ${open ? 'as-open' : ''}`} onClick={() => setOpen(false)} />
        <aside className={`as-drawer ${open ? 'as-open' : ''}`} aria-hidden={!open}>
          <div className="as-drawer-header">
            <button className="as-bar-btn" aria-label="Close menu" onClick={() => setOpen(false)}>×</button>
            <h2>Menu</h2>
          </div>
          <div className="as-tabs">
            <button
              className={`as-tab ${tab === 'apps' ? 'as-active' : ''}`}
              onClick={() => setTab('apps')}
            >Apps</button>
            <button
              className={`as-tab ${tab === 'settings' ? 'as-active' : ''} ${!hasSettings ? 'as-empty-tab' : ''}`}
              onClick={() => setTab('settings')}
            >Settings</button>
            <button
              className={`as-tab ${tab === 'actions' ? 'as-active' : ''} ${!hasActions ? 'as-empty-tab' : ''}`}
              onClick={() => setTab('actions')}
            >Actions</button>
          </div>

          {/* Mount all three panels but only show the active one. The Settings/
              Actions panes own DOM refs that child apps portal into; tearing
              them down on tab switch would re-create them and lose portal
              contents. So we toggle visibility, not mount state. */}
          <div className="as-tab-body" style={{ display: tab === 'apps' ? 'block' : 'none' }}>
            <AppList apps={apps} currentHash={currentHash} onPick={(h) => {
              onNavigate(h);
              setOpen(false);
            }} />
          </div>
          <div className="as-tab-body" style={{ display: tab === 'settings' ? 'block' : 'none' }}>
            <div ref={settingsTargetRef} />
            {!hasSettings && <div className="as-empty">No settings for this view.</div>}
          </div>
          <div className="as-tab-body" style={{ display: tab === 'actions' ? 'block' : 'none' }}>
            <div ref={actionsTargetRef} />
            {!hasActions && <div className="as-empty">No actions for this view.</div>}
          </div>
        </aside>
      </div>
    </AppShellContext.Provider>
  );
}

function AppList({ apps, currentHash, onPick }: {
  apps: AppDescriptor[]; currentHash: string; onPick: (hash: string) => void;
}) {
  return (
    <div className="as-app-list">
      {apps.map(app => (
        <button
          key={app.hash}
          className={`as-app-item ${app.hash === currentHash ? 'as-active' : ''}`}
          onClick={() => onPick(app.hash)}
        >
          <span className="as-app-item-icon">{app.icon ?? '•'}</span>
          <span className="as-app-item-name">{app.name}</span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ *
 * Hooks and portal slots for app authors.                       *
 * ------------------------------------------------------------ */

function useShell(): AppShellState {
  const ctx = useContext(AppShellContext);
  if (!ctx) throw new Error('AppShell components must be used inside <AppShell>.');
  return ctx;
}

/** Set the bar title and subtitle for the active app. */
export function useAppHeader(title: string | undefined, subtitle?: string) {
  const shell = useContext(AppShellContext);
  useEffect(() => {
    if (!shell) return;
    shell.setHeader({ title, subtitle });
  }, [shell, title, subtitle]);
}

/** Render children into the drawer's Settings tab. */
export function ShellSettings({ children }: { children: React.ReactNode }) {
  const shell = useShell();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (shell.settingsTargetRef.current) {
      setReady(true);
      shell.setHasSettings(true);
    }
    return () => shell.setHasSettings(false);
  }, [shell]);
  if (!ready || !shell.settingsTargetRef.current) return null;
  return createPortal(<>{children}</>, shell.settingsTargetRef.current);
}

/** Render children into the drawer's Actions tab. */
export function ShellActions({ children }: { children: React.ReactNode }) {
  const shell = useShell();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (shell.actionsTargetRef.current) {
      setReady(true);
      shell.setHasActions(true);
    }
    return () => shell.setHasActions(false);
  }, [shell]);
  if (!ready || !shell.actionsTargetRef.current) return null;
  return createPortal(<>{children}</>, shell.actionsTargetRef.current);
}
