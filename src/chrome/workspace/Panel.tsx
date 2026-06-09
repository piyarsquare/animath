import React from 'react';
import { Icon } from '../icons';
import { ARCHETYPES } from './archetypes';
import { beginPointerDrag } from './drag';
import type { PanelState, SectionDef } from './types';

/**
 * A floating, draggable, collapsible control panel card (DESIGN-SPEC §2).
 * Dragging is by the header; any pointerdown raises the panel; the body
 * unmounts while collapsed (control state lives in app state).
 */
export function Panel({ sec, state, nodeRef, snap, onMove, onSettle, onRaise, onToggleCollapse, onClose }: {
  sec: SectionDef;
  state: PanelState;
  nodeRef: (el: HTMLDivElement | null) => void;
  snap: (rawX: number, rawY: number) => { x: number; y: number };
  onMove: (pos: { x: number; y: number }) => void;
  onSettle: () => void;
  onRaise: () => void;
  onToggleCollapse: () => void;
  onClose: () => void;
}) {
  const onHeadDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    const ox = state.x, oy = state.y;
    beginPointerDrag(e, (dx, dy) => onMove(snap(ox + dx, oy + dy)), onSettle);
  };
  return (
    <div
      ref={nodeRef}
      className="am-ws-panel"
      style={{ left: state.x, top: state.y, zIndex: 30 + (state.z ?? 0) }}
      onPointerDownCapture={onRaise}
    >
      <div className={`am-ws-phead ${state.collapsed ? 'am-collapsed' : ''}`} onPointerDown={onHeadDown}>
        <span className="am-ws-pico"><Icon name={ARCHETYPES[sec.arch].icon} size={13} /></span>
        <span className="am-ws-panel-title">{sec.title}</span>
        <button
          className="am-btn am-btn-icon"
          title={state.collapsed ? 'Expand' : 'Collapse'}
          aria-label={state.collapsed ? `Expand ${sec.title}` : `Collapse ${sec.title}`}
          onClick={onToggleCollapse}
        >
          <Icon name={state.collapsed ? 'chevron' : 'chevrondown'} size={14} />
        </button>
        <button className="am-btn am-btn-icon" title="Close panel" aria-label={`Close ${sec.title}`} onClick={onClose}>
          <Icon name="close" size={14} />
        </button>
      </div>
      {!state.collapsed && <div className="am-ws-pbody">{sec.node}</div>}
    </div>
  );
}
