import type React from 'react';
import type { Archetype } from './archetypes';
import type { Rect } from './geometry';

/** One control panel: a unit of the closed 11-archetype vocabulary. */
export interface SectionDef {
  /** Stable id — keyed into layout persistence; keep it short and topical. */
  id: string;
  title: string;
  /** Icon, tier and tooltip derive from ARCHETYPES[arch]. */
  arch: Archetype;
  /** Panel body — controls bound to real app state. */
  node: React.ReactNode;
  /** Estimated open height (px) for free-slot packing; default 224. */
  estHeight?: number;
}

/** One view window: a plot that lives on the stage like any other window. */
export interface ViewDef {
  id: string;
  title: string;
  /** Canvas/DOM content; rendered into a positioned body (absolute inset 0). */
  node: React.ReactNode;
  defaultRect: Rect;
}

export interface PanelState {
  x: number;
  y: number;
  z?: number;
  collapsed?: boolean;
}

export interface ViewState extends Rect {
  z?: number;
  collapsed?: boolean;
  /** Layouts may close a view entirely (e.g. Trinary's Lab vs Observatory). */
  open?: boolean;
}

/** A named arrangement: which panels are open (and where), view geometry. */
export interface LayoutDef {
  id: string;
  name: string;
  sub?: string;
  icon?: string;
  open: Record<string, { x: number; y: number; collapsed?: boolean }>;
  /** Optional per-view overrides of defaultRect / visibility. */
  views?: Record<string, Partial<Rect> & { open?: boolean; collapsed?: boolean }>;
}

export interface SavedLayout extends LayoutDef {
  saved: true;
}

/** Persisted per-app workspace state (localStorage `animath:v1:ws:<appId>`). */
export interface PersistedWorkspace {
  /** Schema version — parse failures or mismatches fall back to defaults. */
  v: 1;
  /** Current layout id, or 'custom' after any manual change. */
  layout: string;
  open: Record<string, PanelState>;
  views: Record<string, ViewState>;
  saved: SavedLayout[];
}

export interface WorkspaceMode {
  id: string;
  label: string;
}

export interface WorkspaceProps {
  /** Persistence namespace; use the route id (e.g. 'complex-particles'). */
  appId: string;
  title: string;
  /** Monospace subtitle next to the title (e.g. the active formula). */
  subtitle?: string;
  /** Panels in authored order; the rail tier-sorts them. */
  sections: SectionDef[];
  views: ViewDef[];
  /** App-specific built-in layouts; Compact + Everything are auto-appended. */
  layouts?: LayoutDef[];
  /** Initial layout; default: first app layout, else 'everything'. */
  defaultLayoutId?: string;
  /** Markdown for the top-bar "?" explainer. */
  explainer?: string | null;
  /** Optional top-bar mode pills (e.g. Trinary's Observatory | Lab). */
  modes?: WorkspaceMode[];
  activeMode?: string;
  onModeChange?: (id: string) => void;
}
