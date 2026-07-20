import { describe, expect, it } from 'vitest';
import { splitExplainer } from '../ExplainerModal';

const MD = `# Title

Intro paragraph.

## First section

Core explanation.

## Deep dive

Details with code:

\`\`\`js
// ## not a heading — inside a fence
const x = 1;
\`\`\`

## Possible sources & where to go further

Attribution block.
`;

describe('splitExplainer', () => {
  it('keeps the intro + first section open and folds the rest', () => {
    const { lead, sections } = splitExplainer(MD);
    expect(lead).toContain('Intro paragraph.');
    expect(lead).toContain('## First section');
    expect(lead).toContain('Core explanation.');
    expect(sections.map(s => s.title)).toEqual(['Deep dive', 'Possible sources & where to go further']);
    expect(sections[1].body).toContain('Attribution block.');
  });

  it('does not split on ## inside code fences', () => {
    const { sections } = splitExplainer(MD);
    const deep = sections[0];
    expect(deep.body).toContain('// ## not a heading');
    expect(sections.some(s => s.title.includes('not a heading'))).toBe(false);
  });

  it('handles markdown with no sections at all', () => {
    const { lead, sections } = splitExplainer('Just prose.\n\nMore prose.');
    expect(lead).toContain('Just prose.');
    expect(sections).toEqual([]);
  });

  it('ignores ### subheadings (only ## splits)', () => {
    const { lead, sections } = splitExplainer('Intro\n\n## One\n\n### Sub\n\nbody');
    expect(lead).toContain('### Sub');
    expect(sections).toEqual([]);
  });
});
