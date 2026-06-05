import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { createPortal } from 'react-dom';
import './AppShell.css';
import ActionFloater from './ActionFloater';

// Lazily loaded so `marked` only enters the bundle when a help popup is opened.
const Readme = React.lazy(() => import('./Readme'));

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
  /** Portal target for the floating ActionFloater (a mirror of the actions). */
  actionsFloaterRef: React.RefObject<HTMLDivElement | null>;
  /** Lets an app suppress the generic floating action panel when it ships its
   *  own (e.g. Correspondence's PlaybackFloater). */
  setActionFloaterOff: (off: boolean) => void;
  /** Whether the registered app has populated each tab. */
  hasSettings: boolean;
  hasActions: boolean;
  setHasSettings: (v: boolean) => void;
  setHasActions: (v: boolean) => void;
  setHeader: (h: { title?: string; subtitle?: string }) => void;
  /** Function registration (or null when the active app has no function picker). */
  functions: AppFunctionsRegistration | null;
  setFunctions: (reg: AppFunctionsRegistration | null) => void;
  /** Markdown explainer for the active app (the "?" help popup), or null. */
  explainer: string | null;
  setExplainer: (md: string | null) => void;
}

const AppShellContext = createContext<AppShellState | null>(null);

export interface AppShellProps {
  apps: AppDescriptor[];
  currentHash: string;
  onNavigate: (hash: string) => void;
  children: React.ReactNode;
}

type Tab = 'settings' | 'actions';

export function AppShell({ apps, currentHash, onNavigate, children }: AppShellProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('settings');
  const [header, setHeader] = useState<{ title?: string; subtitle?: string }>({});
  const [hasSettings, setHasSettings] = useState(false);
  const [hasActions, setHasActions] = useState(false);
  const [functions, setFunctions] = useState<AppFunctionsRegistration | null>(null);
  const [explainer, setExplainer] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [actionFloaterOff, setActionFloaterOff] = useState(false);
  const settingsTargetRef = useRef<HTMLDivElement | null>(null);
  const actionsTargetRef = useRef<HTMLDivElement | null>(null);
  const actionsFloaterRef = useRef<HTMLDivElement | null>(null);

  // Reset header + tab flags when the active app changes.
  useEffect(() => {
    setHeader({});
    setHasSettings(false);
    setHasActions(false);
    setFunctions(null);
    setExplainer(null);
    setHelpOpen(false);
    setActionFloaterOff(false);
    setTab('settings');
  }, [currentHash]);

  // Escape closes the help popup, then the drawer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setHelpOpen(false);
      setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isHome = currentHash === '/';
  const current = apps.find(a => a.hash === currentHash);
  const titleName = header.title ?? (isHome ? 'animath' : current?.name) ?? '';
  const subtitle = header.subtitle;
  const hasExplainer = explainer != null;

  const ctx = useMemo<AppShellState>(() => ({
    title: header.title,
    subtitle: header.subtitle,
    settingsTargetRef,
    actionsTargetRef,
    actionsFloaterRef,
    setActionFloaterOff,
    hasSettings,
    hasActions,
    setHasSettings,
    setHasActions,
    setHeader,
    functions,
    setFunctions,
    explainer,
    setExplainer,
  }), [header.title, header.subtitle, hasSettings, hasActions, functions, explainer]);

  const openWithTab = useCallback((t: Tab) => { setTab(t); setOpen(true); }, []);

  return (
    <AppShellContext.Provider value={ctx}>
      <div className="as-shell">
        <header className="as-bar">
          {currentHash !== '/' && (
            <button
              className="as-bar-btn"
              aria-label="Home"
              title="Home"
              onClick={() => onNavigate('/')}
            >⌂</button>
          )}
          <button
            className="as-bar-btn"
            aria-label="Menu"
            title="Menu"
            onClick={() => openWithTab('settings')}
          >☰</button>
          <button
            className="as-bar-title"
            onClick={() => openWithTab('settings')}
            aria-label="Open menu"
          >
            <span className="as-bar-title-name">{titleName}</span>
            {subtitle && <span className="as-bar-title-formula">{subtitle}</span>}
          </button>
          <button
            className={`as-bar-btn ${hasActions ? '' : 'as-bar-btn-dim'}`}
            aria-label="Actions"
            title="Actions"
            disabled={!hasActions}
            onClick={() => openWithTab('actions')}
          >▶</button>
          <button
            className={`as-bar-btn ${hasExplainer ? '' : 'as-bar-btn-dim'}`}
            aria-label="About"
            title="About"
            disabled={!hasExplainer}
            onClick={() => setHelpOpen(true)}
          >?</button>
          {/* Absorbs the leftover width so the controls cluster on the left
              instead of the actions stretching to the far right. */}
          <div className="as-bar-spacer" />
        </header>

        <div className="as-content">
          {children}
          {/* Floating, draggable mirror of the app's actions. Always mounted so
              its portal target persists; hidden when the app has no actions or
              ships its own floater. */}
          <ActionFloater
            active={hasActions && !actionFloaterOff}
            title={titleName}
            bodyRef={actionsFloaterRef}
          />
        </div>

        <div className={`as-scrim ${open ? 'as-open' : ''}`} onClick={() => setOpen(false)} />
        <aside className={`as-drawer ${open ? 'as-open' : ''}`} aria-hidden={!open}>
          <div className="as-drawer-header">
            <button className="as-bar-btn" aria-label="Close menu" onClick={() => setOpen(false)}>×</button>
            <h2>Menu</h2>
          </div>
          <div className="as-tabs">
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
          <div className="as-tab-body" style={{ display: tab === 'settings' ? 'block' : 'none' }}>
            <div ref={settingsTargetRef} />
            {!hasSettings && <div className="as-empty">No settings for this view.</div>}
          </div>
          <div className="as-tab-body" style={{ display: tab === 'actions' ? 'block' : 'none' }}>
            <div ref={actionsTargetRef} />
            {!hasActions && <div className="as-empty">No actions for this view.</div>}
          </div>
        </aside>

        {helpOpen && explainer && (
          <div
            className="as-help-scrim"
            onClick={() => setHelpOpen(false)}
            role="presentation"
          >
            <div
              className="as-help-modal"
              role="dialog"
              aria-modal="true"
              aria-label={`${titleName} — explainer`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="as-help-header">
                <h2 className="as-help-title">{titleName}</h2>
                <button
                  className="as-bar-btn"
                  aria-label="Close explainer"
                  onClick={() => setHelpOpen(false)}
                >×</button>
              </div>
              <div className="as-help-body">
                <Suspense fallback={<div className="as-empty">Loading…</div>}>
                  <Readme markdown={explainer} />
                </Suspense>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShellContext.Provider>
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

/** Register the active function list / current selection / change handler.
 *  NOTE: the top-bar ƒ button and the Function drawer tab were removed in the
 *  menu-bar simplification — function selection now lives in each app's Settings
 *  (e.g. a `Select`). This registration is therefore currently inert; it's kept
 *  for API compatibility (existing callers don't need to change) and possible
 *  future reuse, but has no visible effect today. */
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

/** Register the active app's markdown explainer, shown by the top-bar "?"
 *  button in a popup. Apps that don't call this leave the button dimmed.
 *  Content lives in standalone `EXPLAINER.md` files imported with `?raw`, so
 *  it can be edited without touching component code. */
export function useAppExplainer(markdown: string | null) {
  const shell = useContext(AppShellContext);
  useEffect(() => {
    if (!shell) return;
    shell.setExplainer(markdown);
    return () => shell.setExplainer(null);
  }, [shell, markdown]);
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

/** Render children into BOTH the drawer's Actions tab and the floating
 *  ActionFloater, so the two stay in sync. The floater's body target is always
 *  mounted, so by the time this child's effect runs both refs are populated. */
export function ShellActions({ children }: { children: React.ReactNode }) {
  const shell = useShell();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
    shell.setHasActions(true);
    return () => shell.setHasActions(false);
  }, [shell]);
  if (!ready) return null;
  return (
    <>
      {shell.actionsTargetRef.current && createPortal(<>{children}</>, shell.actionsTargetRef.current)}
      {shell.actionsFloaterRef.current && createPortal(<>{children}</>, shell.actionsFloaterRef.current)}
    </>
  );
}

/** Suppress the generic floating action panel for apps that provide their own
 *  (e.g. Correspondence's PlaybackFloater with its scrubber). */
export function useActionFloaterOff() {
  const shell = useContext(AppShellContext);
  useEffect(() => {
    if (!shell) return;
    shell.setActionFloaterOff(true);
    return () => shell.setActionFloaterOff(false);
  }, [shell]);
}
