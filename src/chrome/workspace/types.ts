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

/** One pane of a split view window (CHROME-REVIEW P5). */
export interface PaneDef {
  id: string;
  /** Mono corner label (e.g. 'z — domain'); omit for none. */
  label?: string;
  /** Canvas/DOM content; rendered into a positioned pane (absolute inset 0). */
  node: React.ReactNode;
}

/**
 * One view window: a plot that lives on the stage like any other window.
 * Either a single `node`, or `panes` — two (or more) pictures that are one
 * mathematical unit (CHROME-REVIEW P5): panes render side-by-side inside ONE
 * window with a fixed equal split, so drag/resize/collapse/fullscreen/layout
 * act on the pair as a unit and the pictures stay scale-commensurable
 * (Plane Transform's domain/image is the reference consumer). The union is
 * deliberate — passing both is a type error, not a silent pick.
 */
export type ViewDef = {
  id: string;
  title: string;
  defaultRect: Rect;
  /** Start hint (CHROME-REVIEW P2) for gesture-driven views: a short
   *  math-anchored invitation ("tap to choose c — the Julia set follows")
   *  rendered as a centered overlay until the first pointer interaction.
   *  Per-session only — never persisted. Apps whose begin-affordance is a
   *  button belong on the action strip instead. */
  hint?: string;
} & (
  | { /** Canvas/DOM content; rendered into a positioned body (absolute inset 0). */
      node: React.ReactNode; panes?: never }
  | { node?: never; panes: PaneDef[] }
);

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

/** One always-on action-strip button (CHROME-REVIEW P1).
 *
 * The strip is a PROJECTION of an existing drive/playback panel — the few
 * verbs a first-time user needs (play, step, reset, launch), never the rich
 * controls (speed, schedules — those stay in the panel). Constraints are
 * structural on purpose (three-hats ruling vs. the deleted floaters):
 * buttons only (no node escape hatch), at most MAX_ACTIONS render, labels
 * are STATIC strings (no live readouts — they re-render and shift layout).
 * Action sets may be contextual (swap with app mode), and `Step` should be
 * first-class beside `Play` in algorithm apps. */
export interface ActionDef {
  id: string;
  /** Glyph from the closed chrome icon set (chrome/icons.tsx). */
  icon: string;
  /** Static verb — tooltip + aria everywhere, visible text on the strip. */
  label: string;
  onClick: () => void;
  /** Toggle state (play ⇄ pause) — surfaces as aria-pressed. */
  active?: boolean;
  /** At most one: the emphasized (accent) action. */
  primary?: boolean;
  disabled?: boolean;
  /** The drive/playback section this action projects; dev-warned when it
   *  names a section outside the Drive tier (the strip must stay a
   *  projection, not a new control surface). */
  sectionId?: string;
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
  /** Always-on action strip (≤5 verbs projected from a drive/playback
   *  panel); renders bottom-center on desktop, above the dock on phone,
   *  and persists through fullscreen. See ActionDef. */
  actions?: ActionDef[];
  /** Panel id the top-bar title opens when clicked (e.g. 'function'), so the
   *  formula in the bar doubles as a shortcut to its selector. */
  titlePanel?: string;
  /** Optional top-bar mode pills (e.g. Trinary's Observatory | Lab). */
  modes?: WorkspaceMode[];
  activeMode?: string;
  onModeChange?: (id: string) => void;
}
