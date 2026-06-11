import { describe, expect, it } from 'vitest';
import { MAX_ACTIONS, validateActions } from '../ActionBar';
import type { ActionDef, SectionDef } from '../types';

const sections: SectionDef[] = [
  { id: 'function', title: 'Function', arch: 'subject', node: null },
  { id: 'playback', title: 'Playback', arch: 'playback', node: null },
  { id: 'move', title: 'Move', arch: 'drive', node: null },
];

const action = (over: Partial<ActionDef>): ActionDef => ({
  id: 'a', icon: 'play', label: 'Play', onClick: () => {}, ...over,
});

describe('validateActions — the strip stays a projection of a Drive panel', () => {
  it('accepts a well-formed playback projection', () => {
    const actions = [
      action({ id: 'play', primary: true, sectionId: 'playback' }),
      action({ id: 'step', sectionId: 'playback' }),
      action({ id: 'reset', sectionId: 'move' }), // drive tier is fine too
    ];
    expect(validateActions(actions, sections)).toEqual([]);
  });

  it('warns above the action cap', () => {
    const actions = Array.from({ length: MAX_ACTIONS + 1 }, (_, i) => action({ id: `a${i}` }));
    expect(validateActions(actions, sections).some(w => w.includes(`first ${MAX_ACTIONS}`))).toBe(true);
  });

  it('warns on multiple primaries', () => {
    const actions = [action({ id: 'p1', primary: true }), action({ id: 'p2', primary: true })];
    expect(validateActions(actions, sections).some(w => w.includes('primary'))).toBe(true);
  });

  it('warns when sectionId names no section or a non-Drive section', () => {
    const missing = validateActions([action({ sectionId: 'ghost' })], sections);
    expect(missing.some(w => w.includes('matches no section'))).toBe(true);
    const wrongTier = validateActions([action({ sectionId: 'function' })], sections);
    expect(wrongTier.some(w => w.includes('Drive-tier'))).toBe(true);
  });
});
