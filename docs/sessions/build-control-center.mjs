#!/usr/bin/env node
/* SPIKE — cross-branch session "control center".
 *
 * Walks every origin/* branch, reads each branch TIP's docs/sessions/ reports
 * WITHOUT checking them out (via `git show <ref>:<path>`), and unifies them into
 * one manifest spanning all active branches.
 *
 * Provenance is the slug folder, full stop: a report at
 * docs/sessions/<kind>/<slug>/<file> belongs to <slug>, regardless of which
 * branches carry a copy. The "most recently updated" rule below only decides
 * WHICH copy's bytes to display when a path exists on several branches — it is
 * not provenance.
 *
 * Dedup rule: a report is identified by its PATH (which encodes the slug). The
 * same path can exist on many branches — anything merged to main is inherited by
 * every branch cut from main. We read the MOST RECENTLY UPDATED copy: among the
 * branches that hold a given path, pick the one whose last commit touching that
 * file is newest, and read its content there. Each report appears once, owned by
 * its slug, at its freshest revision.
 *
 * Metadata comes from either an HTML <script class="report-meta"> island or
 * Markdown YAML frontmatter, so it works today and after the markdown migration.
 *
 * Dependency-free. Run after fetching:
 *     git fetch --all && node docs/sessions/build-control-center.mjs
 */
import { execFileSync } from "node:child_process";

const git = (args) => {
  try { return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }
  catch { return ""; }
};

// 1 · enumerate origin branches (skip the symbolic HEAD)
const branches = git(["for-each-ref", "--format=%(refname:short)", "refs/remotes/origin"])
  .split("\n").map(s => s.trim()).filter(b => b && b !== "origin/HEAD");

// 2 · metadata extractors — support both today's HTML and the future Markdown
const META_RE = /<script[^>]*class=["']report-meta["'][^>]*>([\s\S]*?)<\/script>/i;
const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

function parseFrontmatter(text) {           // minimal flat `key: value` YAML
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v === "null" || v === "~" || v === "") v = null;
    else v = v.replace(/^["']|["']$/g, "");
    out[m[1]] = v;
  }
  return out;
}

function extractMeta(path, content) {
  if (path.endsWith(".html")) {
    const m = content.match(META_RE);
    try { return m ? JSON.parse(m[1]) : null; } catch { return null; }
  }
  if (path.endsWith(".md")) {
    const m = content.match(FM_RE);
    return m ? parseFrontmatter(m[1]) : null;
  }
  return null;
}

const isReport = (p) =>
  /^docs\/sessions\/(progress|handoff)\//.test(p) &&
  /\.(html|md)$/.test(p) &&
  !/\/_/.test(p) && !/\/index\.html$/.test(p);

// 3 · for every (branch, report path), record the date that branch last touched it
//     path -> { winner: {ref, fileDate}, copies: Set<ref> }
const byPath = new Map();
for (const ref of branches) {
  const files = git(["ls-tree", "-r", "--name-only", ref, "--", "docs/sessions"])
    .split("\n").map(s => s.trim()).filter(isReport);
  for (const path of files) {
    const fileDate = git(["log", "-1", "--format=%cI", ref, "--", path]).trim();
    const rec = byPath.get(path) || { winner: null, copies: new Set() };
    rec.copies.add(ref);
    if (!rec.winner || fileDate > rec.winner.fileDate) rec.winner = { ref, fileDate };
    byPath.set(path, rec);
  }
}

// 4 · read the freshest version of each distinct report and build the manifest
const reports = [];
for (const [path, rec] of byPath) {
  const { ref, fileDate } = rec.winner;
  const meta = extractMeta(path, git(["show", `${ref}:${path}`])) || {};
  const parts = path.split("/");                       // docs/sessions/<kind>/<slug>/<file>
  reports.push({
    slug: parts[3] || "?",                             // provenance = the slug folder
    kind: meta.kind || parts[2] || "?",
    session: meta.session || null,
    title: meta.title || null,
    status: meta.status || null,
    build: meta.build || null,
    updated: fileDate,                                 // date of the surfaced (newest) copy
    path,
  });
}

const byRecency = (a, b) => (b.updated || "").localeCompare(a.updated || "");
reports.sort(byRecency);

// 5 · human-readable control-center view — grouped by session home (slug)
const slugs = new Map();
for (const r of reports) {
  if (!slugs.has(r.slug)) slugs.set(r.slug, []);
  slugs.get(r.slug).push(r);
}
const slugOrder = [...slugs.entries()].sort((a, b) => byRecency(a[1][0], b[1][0]));

const totalCopies = [...byPath.values()].reduce((n, r) => n + r.copies.size, 0);
console.log(`\nCross-branch session control center  (SPIKE · most-recent-version)`);
console.log(`Scanned ${branches.length} origin branches · ${reports.length} distinct reports`
  + ` (deduped from ${totalCopies} branch copies) · ${slugs.size} session homes\n`);

for (const [slug, rs] of slugOrder) {
  console.log(`■ ${slug}   (latest ${rs[0].updated.slice(0, 10)})`);
  for (const r of rs) {
    console.log(`    ${(r.kind || "?").padEnd(10)} ${(r.session || "?").padEnd(16)}`
      + ` ${("[" + (r.status || "?") + "]").padEnd(15)} ${r.updated.slice(0, 10)}`
      + `   ${r.title || r.path.split("/").pop()}`);
  }
  console.log("");
}

// 6 · machine manifest (feeds the explorer / search index)
console.log("----- manifest.json -----");
console.log(JSON.stringify({ generated: new Date().toISOString(), reports }, null, 2));
