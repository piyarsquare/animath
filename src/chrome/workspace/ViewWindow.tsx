import React from 'react';
import { Icon } from '../icons';
import { beginPointerDrag } from './drag';
import { LAYER } from './layers';
import type { ViewDef, ViewState } from './types';

/**
 * A view window — the plot is a window too (DESIGN-SPEC §2): draggable by
 * the header, resizable from the bottom-right handle, collapsible to its
 * header, and expandable to a fullscreen overlay. The body is HIDDEN while
 * collapsed, never unmounted, so WebGL engines keep their state (Canvas3D
 * guards zero-size resizes); fullscreen restyles the same node for the same
 * reason.
 */
export function ViewWindow({ view, state, full, nodeRef, snap, resize, onMove, onResize, onSettle, onRaise, onToggleCollapse, onToggleFull, onHelp }: {
  view: ViewDef;
  state: ViewState;
  full: boolean;
  nodeRef: (el: HTMLDivElement | null) => void;
  snap: (rawX: number, rawY: number) => { x: number; y: number };
  resize: (rawW: number, rawH: number, x: number, y: number) => { w: number; h: number };
  onMove: (pos: { x: number; y: number }) => void;
  onResize: (size: { w: number; h: number }) => void;
  onSettle: () => void;
  onRaise: () => void;
  onToggleCollapse: () => void;
  onToggleFull: () => void;
  /** The top bar is buried under a fullscreen view, so the fullscreen header
   *  carries its own "?" explainer button (CHROME-REVIEW P4a). */
  onHelp?: () => void;
}) {
  const onHeadDown = (e: React.PointerEvent) => {
    if (full) return;
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    const ox = state.x, oy = state.y;
    beginPointerDrag(e, (dx, dy) => onMove(snap(ox + dx, oy + dy)), onSettle);
  };
  const onResizeDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const ow = state.w, oh = state.h, x = state.x, y = state.y;
    beginPointerDrag(e, (dx, dy) => onResize(resize(ow + dx, oh + dy, x, y)), onSettle);
  };
  const collapsed = !full && !!state.collapsed;
  return (
    <div
      ref={nodeRef}
      className={`am-ws-view${full ? ' am-ws-full' : ''}`}
      style={full ? undefined : {
        left: state.x,
        top: state.y,
        width: state.w,
        height: collapsed ? undefined : state.h,
        zIndex: LAYER.window + (state.z ?? 0),
      }}
      onPointerDownCapture={onRaise}
    >
      <div className="am-ws-vhead" onPointerDown={onHeadDown}>
        <span className="am-ws-vico"><Icon name="window" size={13} /></span>
        <span className="am-ws-vtitle">{view.title}</span>
        {full && onHelp && (
          <button
            className="am-btn am-btn-icon"
            title="What am I looking at?"
            aria-label="What am I looking at?"
            onClick={onHelp}
          >
            <Icon name="help" size={14} />
          </button>
        )}
        {!collapsed && (
          <button
            className="am-btn am-btn-icon"
            title={full ? 'Exit full screen' : 'Full screen'}
            aria-label={full ? `Exit full screen ${view.title}` : `Full screen ${view.title}`}
            onClick={onToggleFull}
          >
            <Icon name={full ? 'shrink' : 'expand'} size={13} />
          </button>
        )}
        {!full && (
          <button
            className="am-btn am-btn-icon"
            title={collapsed ? 'Expand' : 'Collapse'}
            aria-label={collapsed ? `Expand ${view.title}` : `Collapse ${view.title}`}
            onClick={onToggleCollapse}
          >
            <Icon name={collapsed ? 'chevron' : 'chevrondown'} size={14} />
          </button>
        )}
      </div>
      {/* hidden, not unmounted, while collapsed — keeps engine state alive */}
      <div className="am-ws-view-body" style={collapsed ? { display: 'none' } : undefined}>
        {view.node}
      </div>
      {!collapsed && !full && (
        <div className="am-ws-resize" onPointerDown={onResizeDown} title="Resize" aria-label={`Resize ${view.title}`}>
          <Icon name="expand" size={10} />
        </div>
      )}
    </div>
  );
}
