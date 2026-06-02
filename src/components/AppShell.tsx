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
  /** One-line description shown on the menu screen's gallery cards. */
  blurb?: string;
}

/** Apps register their function picker via useAppFunctions so the AppShell's
 *  top-bar ƒ button can show / change the active function without the user
 *  having to dig into the Settings tab. */
export interface AppFunctionsRegistration {
  /** List of function names in the order to display. */
  names: readonly string[];
  /** Currently-selected function name. */
  current: string;
  /** Called when the user picks a different function from the drawer. */
  onChange: (name: string) => void;
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
  /** Function registration (or null when the active app has no function picker). */
  functions: AppFunctionsRegistration | null;
  setFunctions: (reg: AppFunctionsRegistration | null) => void;
}

const AppShellContext = createContext<AppShellState | null>(null);

export interface AppShellProps {
  apps: AppDescriptor[];
  currentHash: string;
  onNavigate: (hash: string) => void;
  children: React.ReactNode;
}

type Tab = 'apps' | 'functions' | 'settings' | 'actions';

export function AppShell({ apps, currentHash, onNavigate, children }: AppShellProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('apps');
  const [header, setHeader] = useState<{ title?: string; subtitle?: string }>({});
  const [hasSettings, setHasSettings] = useState(false);
  const [hasActions, setHasActions] = useState(false);
  const [functions, setFunctions] = useState<AppFunctionsRegistration | null>(null);
  const settingsTargetRef = useRef<HTMLDivElement | null>(null);
  const actionsTargetRef = useRef<HTMLDivElement | null>(null);

  // Reset header + tab flags when the active app changes.
  useEffect(() => {
    setHeader({});
    setHasSettings(false);
    setHasActions(false);
    setFunctions(null);
    setTab('apps');
  }, [currentHash]);

  // Escape closes drawer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isHome = currentHash === '/';
  const current = apps.find(a => a.hash === currentHash);
  const titleName = header.title ?? (isHome ? 'animath' : current?.name) ?? '';
  const subtitle = header.subtitle;
  const hasFunctions = functions != null;

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
    functions,
    setFunctions,
  }), [header.title, header.subtitle, hasSettings, hasActions, functions]);

  const openWithTab = useCallback((t: Tab) => { setTab(t); setOpen(true); }, []);

  return (
    <AppShellContext.Provider value={ctx}>
      <div className="as-shell">
        <header className="as-bar">
          {currentHash !== '/' && (
            <button
              className="as-bar-btn"
              aria-label="Menu screen"
              title="Menu"
              onClick={() => onNavigate('/')}
            >⌂</button>
          )}
          <button
            className="as-bar-btn"
            aria-label="Apps"
            title="Apps"
            onClick={() => openWithTab('apps')}
          >☰</button>
          <button
            className={`as-bar-btn ${hasFunctions ? '' : 'as-bar-btn-dim'}`}
            aria-label="Function"
            title="Function"
            onClick={() => openWithTab('functions')}
          >ƒ</button>
          <button
            className="as-bar-title"
            onClick={() => openWithTab(hasSettings ? 'settings' : 'apps')}
            aria-label="Show settings"
          >
            <span className="as-bar-title-name">{titleName}</span>
            {subtitle && <span className="as-bar-title-formula">{subtitle}</span>}
          </button>
          <button
            className={`as-bar-btn ${hasSettings ? '' : 'as-bar-btn-dim'}`}
            aria-label="Settings"
            title="Settings"
            onClick={() => openWithTab('settings')}
          >⚙</button>
          <button
            className={`as-bar-btn ${hasActions ? '' : 'as-bar-btn-dim'}`}
            aria-label="Actions"
            title="Actions"
            onClick={() => openWithTab('actions')}
          >▶</button>
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
              className={`as-tab ${tab === 'functions' ? 'as-active' : ''} ${!hasFunctions ? 'as-empty-tab' : ''}`}
              onClick={() => setTab('functions')}
            >Function</button>
            <button
              className={`as-tab ${tab === 'settings' ? 'as-active' : ''} ${!hasSettings ? 'as-empty-tab' : ''}`}
              onClick={() => setTab('settings')}
            >Settings</button>
            <button
              className={`as-tab ${tab === 'actions' ? 'as-active' : ''} ${!hasActions ? 'as-empty-tab' : ''}`}
              onClick={() => setTab('actions')}
            >Actions</button>
          </div>

          {/* Mount all panels but only show the active one; the Settings/
              Actions panes own DOM refs that child apps portal into. */}
          <div className="as-tab-body" style={{ display: tab === 'apps' ? 'block' : 'none' }}>
            <AppList apps={apps} currentHash={currentHash} onPick={(h) => {
              onNavigate(h);
              setOpen(false);
            }} />
          </div>
          <div className="as-tab-body" style={{ display: tab === 'functions' ? 'block' : 'none' }}>
            {functions ? (
              <FunctionList
                names={functions.names}
                current={functions.current}
                onPick={(name) => {
                  functions.onChange(name);
                  setOpen(false);
                }}
              />
            ) : (
              <div className="as-empty">No function picker for this view.</div>
            )}
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

function FunctionList({ names, current, onPick }: {
  names: readonly string[]; current: string; onPick: (name: string) => void;
}) {
  return (
    <div className="as-app-list">
      {names.map(name => (
        <button
          key={name}
          className={`as-app-item ${name === current ? 'as-active' : ''}`}
          onClick={() => onPick(name)}
        >
          <span className="as-app-item-icon">ƒ</span>
          <span className="as-app-item-name">{name}</span>
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

/** Register the active function list / current selection / change handler so
 *  the top-bar ƒ button and the Function drawer tab can drive it. Apps that
 *  don't have a function picker simply never call this — the button stays
 *  dimmed and the tab shows an empty-state message. */
export function useAppFunctions(reg: AppFunctionsRegistration | null) {
  const shell = useContext(AppShellContext);
  const names = reg?.names;
  const current = reg?.current;
  const onChange = reg?.onChange;
  useEffect(() => {
    if (!shell) return;
    shell.setFunctions(reg ? { names: reg.names, current: reg.current, onChange: reg.onChange } : null);
    return () => shell.setFunctions(null);
  }, [shell, names, current, onChange]);
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
