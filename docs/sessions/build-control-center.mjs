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
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
    sourceRef: ref.replace(/^origin\//, ""),           // branch to fetch renderable bytes from (for the view link — NOT provenance)
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
const generated = new Date().toISOString();
console.log("----- manifest.json -----");
console.log(JSON.stringify({ generated, reports }, null, 2));

// 7 · generate a viewable control-center page (SPIKE) next to this script
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const REPO = "piyarsquare/animath";
const viewUrl = (r) => `https://raw.githack.com/${REPO}/${r.sourceRef}/${r.path}`;
const statusBadge = (s) => `<span class="badge ${({ completed: "badge-ok", "in-progress": "badge-warn" })[s] || "badge"}">${esc(s || "?")}</span>`;

let groupsHtml = "";
for (const [slug, rs] of slugOrder) {
  let rows = "";
  for (const r of rs) {
    const hay = [slug, r.kind, r.session, r.status, r.title].map(x => (x || "").toLowerCase()).join(" ");
    rows += `      <a class="cc-row" href="${esc(viewUrl(r))}" data-hay="${esc(hay)}" data-status="${esc(r.status || "")}">
        <span class="chip chip-${esc(r.kind)}">${esc(r.kind)}</span>
        <span class="cc-sid">${esc(r.session || "")}</span>
        ${statusBadge(r.status)}
        <span class="cc-date">${esc((r.updated || "").slice(0, 10))}</span>
        <span class="cc-title">${esc(r.title || r.path.split("/").pop())}</span>
      </a>\n`;
  }
  groupsHtml += `    <section class="cc-group" data-slug="${esc(slug)}">
      <h2><code>${esc(slug)}</code> <span class="cc-count">${rs.length}</span></h2>
${rows}    </section>\n`;
}

const ccHtml = `<!DOCTYPE html>
<!-- GENERATED by build-control-center.mjs (SPIKE) — do not edit by hand. -->
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>animath · session control center</title>
  <link rel="stylesheet" href="./report.css">
  <style>
    .cc-tools{position:sticky;top:0;background:var(--bg,#0c0c10);padding:.6rem 0;z-index:2}
    .cc-tools input{width:100%;max-width:32rem;padding:.5rem .7rem;border-radius:8px;
      border:1px solid #333;background:#15151b;color:inherit;font:inherit}
    .cc-group{margin:1.2rem 0}
    .cc-count{opacity:.5;font-size:.8em}
    .cc-row{display:grid;grid-template-columns:6.5rem 9rem 7rem 6rem 1fr;gap:.6rem;align-items:center;
      padding:.5rem .6rem;border-radius:8px;text-decoration:none;color:inherit}
    .cc-row:hover{background:#1b1b22}
    .cc-row[hidden]{display:none}
    .cc-sid,.cc-date{font-family:ui-monospace,monospace;font-size:.8rem;opacity:.8}
    .cc-title{opacity:.95}
    @media(max-width:680px){.cc-row{grid-template-columns:1fr;gap:.2rem}}
  </style>
</head>
<body>
<main class="report">
  <header>
    <p class="kicker">animath · cross-branch</p>
    <h1>Session control center <span class="badge">spike</span></h1>
    <dl class="meta">
      <div><dt>Reports</dt><dd>${reports.length} distinct · ${slugs.size} session homes</dd></div>
      <div><dt>Generated</dt><dd>${generated.slice(0, 16).replace("T", " ")} · <code>build-control-center.mjs</code></dd></div>
    </dl>
    <p class="lineage">Provenance = the slug folder. Each row opens the most-recently-updated
    copy of that report, rendered live via githack from the branch that holds it.</p>
  </header>
  <div class="body"><div class="content">
    <div class="cc-tools"><input id="q" type="search" placeholder="filter by slug / title / status / session…" autocomplete="off"></div>
${groupsHtml}  </div></div>
</main>
<script>
  const q = document.getElementById("q");
  const rows = [...document.querySelectorAll(".cc-row")];
  const groups = [...document.querySelectorAll(".cc-group")];
  q.addEventListener("input", () => {
    const t = q.value.trim().toLowerCase();
    for (const r of rows) r.hidden = t && !r.dataset.hay.includes(t);
    for (const g of groups) g.hidden = ![...g.querySelectorAll(".cc-row")].some(r => !r.hidden);
  });
</script>
</body>
</html>
`;

const outPath = join(dirname(fileURLToPath(import.meta.url)), "control-center.html");
writeFileSync(outPath, ccHtml);
console.log(`\ncontrol-center.html written (${reports.length} reports).`);
