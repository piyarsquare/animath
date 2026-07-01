#!/usr/bin/env node
// Integrity checker for the Number Planes note-cards (public/number-planes/cards/).
// Taxonomy-independent: catches the failure modes flagged by the three-hats review —
//   1. manifest.json drift (lists a card that doesn't exist, or misses one),
//   2. dangling references: any [[id]] / ![[id]] / links: target with no card file.
// Exit non-zero on any problem so it can gate a build if we ever wire it in.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'public/number-planes/cards';
const files = readdirSync(DIR).filter(f => f.endsWith('.md') && f !== 'README.md');
const ids = new Set(files.map(f => f.replace(/\.md$/, '')));

const problems = [];

// 1. manifest drift
let manifest;
try { manifest = JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8')); }
catch (e) { problems.push(`manifest.json unreadable: ${e.message}`); manifest = []; }
const mset = new Set(manifest);
for (const id of ids) if (!mset.has(id)) problems.push(`manifest MISSING card: ${id}`);
for (const id of manifest) if (!ids.has(id)) problems.push(`manifest lists PHANTOM card: ${id} (no ${id}.md)`);

// 2. reference integrity
const EDGE_KEYS = ['leans-on', 'opens', 'same-as', 'contrasts', 'used-for'];
for (const f of files) {
  const id = f.replace(/\.md$/, '');
  const text = readFileSync(join(DIR, f), 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const front = m ? m[1] : '';
  const body = m ? m[2] : text;
  const refs = new Set();
  // inline [[id]] and ![[id]] (skip the README's literal [[id]] token, not present in cards)
  for (const mm of body.matchAll(/!?\[\[([\w-]+)\]\]/g)) refs.add(mm[1]);
  // links: block targets
  for (const key of EDGE_KEYS) {
    const re = new RegExp(`^\\s+${key}:\\s*\\[([^\\]]*)\\]`, 'm');
    const mm = front.match(re);
    if (mm && mm[1].trim()) for (const t of mm[1].split(',')) refs.add(t.trim());
  }
  for (const r of refs) if (!ids.has(r)) problems.push(`${id}: dangling reference → ${r}`);
}

if (problems.length) {
  console.error(`✗ ${problems.length} card integrity problem(s):`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log(`✓ cards OK — ${ids.size} cards, manifest in sync, all references resolve.`);
