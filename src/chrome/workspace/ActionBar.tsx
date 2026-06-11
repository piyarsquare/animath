import React, { useEffect } from 'react';
import { Icon } from '../icons';
import { ARCHETYPES } from './archetypes';
import type { ActionDef, SectionDef } from './types';

/** The strip renders at most this many actions (CHROME-REVIEW P1). */
export const MAX_ACTIONS = 5;

/**
 * Validate an action set against the structural constraints (pure —
 * unit-tested; the component dev-warns with the result). The strip must
 * stay a projection of a drive-tier panel: ≤ MAX_ACTIONS verbs, one
 * primary, sectionIds that name real drive/playback sections.
 */
export function validateActions(actions: ActionDef[], sections: SectionDef[]): string[] {
  const warnings: string[] = [];
  if (actions.length > MAX_ACTIONS) {
    warnings.push(`action strip: ${actions.length} actions — only the first ${MAX_ACTIONS} render`);
  }
  const primaries = actions.filter(a => a.primary);
  if (primaries.length > 1) {
    warnings.push(`action strip: ${primaries.length} primary actions (${primaries.map(a => a.id).join(', ')}) — mark at most one`);
  }
  for (const a of actions) {
    if (!a.sectionId) continue;
    const sec = sections.find(s => s.id === a.sectionId);
    if (!sec) {
      warnings.push(`action "${a.id}": sectionId "${a.sectionId}" matches no section`);
    } else if (ARCHETYPES[sec.arch].tier !== 'Drive') {
      warnings.push(`action "${a.id}": projects "${a.sectionId}" (${ARCHETYPES[sec.arch].tier} tier) — the strip projects Drive-tier panels only`);
    }
  }
  return warnings;
}

/**
 * The always-on action strip (CHROME-REVIEW P1): the app's primary verbs,
 * rendered by the chrome OUTSIDE the panel system so they can never be
 * closed — a fixed pill bottom-center on desktop, a row above the dock on
 * phone, persistent through fullscreen (z --z-actionbar). Buttons only;
 * the rich controls stay in the drive/playback panel this strip projects.
 */
export function ActionBar({ actions, sections, phone }: {
  actions: ActionDef[];
  sections: SectionDef[];
  phone?: boolean;
}) {
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    for (const w of validateActions(actions, sections)) console.warn(`[workspace] ${w}`);
    // sections identity churns per render; the id/arch sets it validates don't
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions.length, actions.map(a => `${a.id}:${a.sectionId ?? ''}`).join(',')]);

  if (actions.length === 0) return null;
  return (
    <nav className={`am-actionbar${phone ? ' am-actionbar-phone' : ''}`} role="toolbar" aria-label="Actions">
      {actions.slice(0, MAX_ACTIONS).map(a => (
        <button
          key={a.id}
          className={`am-action-btn${a.primary ? ' am-primary' : ''}`}
          title={a.label}
          aria-label={a.label}
          aria-pressed={a.active !== undefined ? a.active : undefined}
          disabled={a.disabled}
          onClick={a.onClick}
        >
          <Icon name={a.icon} size={15} />
          <span>{a.label}</span>
        </button>
      ))}
    </nav>
  );
}
