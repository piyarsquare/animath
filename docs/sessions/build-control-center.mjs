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
 * Display grouping is by SHORT branch name — the slug with the trailing 5-char
 * random suffix stripped (e.g. stable-marriage-styling-ulMPt → stable-marriage-
 * styling). The SESSION is the unit: each session lists its progress, handoff,
 * and any connected sub-reports (three-hats, extra progress) together.
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

// strip the Claude 5-char random suffix (mixed upper+lower) to get a short name
function shortName(slug) {
  const m = slug.match(/^(.*)-([A-Za-z0-9]{5})$/);
  return m && /[A-Z]/.test(m[2]) && /[a-z]/.test(m[2]) ? m[1] : slug;
}

// 3 · for every (branch, report path), record the date that branch last touched it
const byPath = new Map();                   // path -> { winner: {ref, fileDate}, copies: Set<ref> }
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

// 4 · read the freshest copy of each distinct report → manifest entries
const reports = [];
for (const [path, rec] of byPath) {
  const { ref, fileDate } = rec.winner;
  const meta = extractMeta(path, git(["show", `${ref}:${path}`])) || {};
  const parts = path.split("/");                       // docs/sessions/<kind>/<slug>/<file>
  reports.push({
    slug: parts[3] || "?",                             // provenance = the slug folder
    short: shortName(parts[3] || "?"),
    kind: meta.kind || parts[2] || "?",
    session: meta.session || null,
    title: meta.title || null,
    status: meta.status || null,
    build: meta.build || null,
    updated: fileDate,                                 // date of the surfaced (newest) copy
    sourceRef: ref.replace(/^origin\//, ""),           // branch to fetch renderable bytes from (view link only — NOT provenance)
    path,
  });
}

// 5 · roll up: short name → sessions → reports (session is the unit)
const kindRank = { progress: 0, handoff: 1, "three-hats": 2 };
const rank = (k) => (k in kindRank ? kindRank[k] : 9);
const byRecency = (a, b) => (b || "").localeCompare(a || "");

const sessions = new Map();                  // `${slug}|${session}` -> { slug, short, session, reports }
for (const r of reports) {
  const key = `${r.slug}|${r.session || "?"}`;
  if (!sessions.has(key)) sessions.set(key, { slug: r.slug, short: r.short, session: r.session, reports: [] });
  sessions.get(key).reports.push(r);
}
for (const s of sessions.values()) {
  s.reports.sort((a, b) => rank(a.kind) - rank(b.kind) || byRecency(a.updated, b.updated));
  s.date = s.reports.map(r => r.updated || "").sort().slice(-1)[0] || "";
  const primary = s.reports.find(r => r.kind === "handoff") || s.reports.find(r => r.kind === "progress") || s.reports[0];
  s.title = primary.title; s.status = primary.status; s.build = primary.build;
}

const groups = new Map();                    // short -> [session]
for (const s of sessions.values()) {
  if (!groups.has(s.short)) groups.set(s.short, []);
  groups.get(s.short).push(s);
}
for (const arr of groups.values()) arr.sort((a, b) => byRecency(a.date, b.date));
const groupOrder = [...groups.entries()].sort((a, b) => byRecency(a[1][0].date, b[1][0].date));

// 6 · console summary + machine manifest
const totalCopies = [...byPath.values()].reduce((n, r) => n + r.copies.size, 0);
const generated = new Date().toISOString();
console.log(`\nCross-branch session control center  (SPIKE)`);
console.log(`Scanned ${branches.length} origin branches · ${reports.length} reports (from ${totalCopies} copies)`
  + ` · ${sessions.size} sessions · ${groups.size} branches\n`);
for (const [short, ss] of groupOrder) {
  console.log(`■ ${short}`);
  for (const s of ss) {
    console.log(`    ${(s.session || "?").padEnd(16)} [${s.status || "?"}]  ${s.date.slice(0, 10)}  ${s.title || ""}`);
    for (const r of s.reports) console.log(`        · ${(r.kind || "?").padEnd(10)} ${r.title || r.path.split("/").pop()}`);
  }
  console.log("");
}
console.log("----- manifest.json -----");
console.log(JSON.stringify({ generated, groups: groupOrder.map(([short, ss]) => ({ short, sessions: ss })) }, null, 2));

// 7 · generate a viewable control-center page (SPIKE) next to this script
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const REPO = "piyarsquare/animath";
const viewUrl = (r) => `https://raw.githack.com/${REPO}/${r.sourceRef}/${r.path}`;
const statusBadge = (s) => `<span class="badge ${({ completed: "badge-ok", "in-progress": "badge-warn" })[s] || "badge"}">${esc(s || "?")}</span>`;

let groupsHtml = "";
for (const [short, ss] of groupOrder) {
  let sHtml = "";
  for (const s of ss) {
    const hay = [short, s.slug, s.session, s.status, ...s.reports.map(r => r.title)].map(x => (x || "").toLowerCase()).join(" ");
    let rows = "";
    for (const r of s.reports) {
      rows += `        <a class="cc-row" href="${esc(viewUrl(r))}">
          <span class="chip chip-${esc(r.kind)}">${esc(r.kind)}</span>
          <span class="cc-rtitle">${esc(r.title || r.path.split("/").pop())}</span>
        </a>\n`;
    }
    sHtml += `      <article class="cc-session" data-hay="${esc(hay)}">
        <div class="cc-shead">
          <span class="cc-sid">${esc(s.session || "")}</span>
          ${statusBadge(s.status)}
          <span class="cc-date">${esc(s.date.slice(0, 10))}</span>
          <span class="cc-stitle">${esc(s.title || "")}</span>
        </div>
        <div class="cc-reports">
${rows}        </div>
      </article>\n`;
  }
  groupsHtml += `    <section class="cc-group" data-short="${esc(short)}">
      <h2><code>${esc(short)}</code> <span class="cc-count">${ss.length} session${ss.length > 1 ? "s" : ""}</span></h2>
${sHtml}    </section>\n`;
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
    /* token-based so it stays readable in BOTH light and dark schemes */
    .cc-tools{position:sticky;top:0;background:var(--bg);padding:.6rem 0;z-index:2;border-bottom:1px solid var(--border)}
    .cc-tools input{width:100%;max-width:34rem;padding:.5rem .7rem;border-radius:8px;
      border:1px solid var(--border);background:var(--panel);color:var(--fg);font:inherit}
    .cc-group{margin:1.4rem 0}
    .cc-count{opacity:.55;font-size:.78rem;font-weight:400}
    .cc-session{border:1px solid var(--border);border-radius:8px;padding:.55rem .7rem;margin:.55rem 0;background:var(--panel)}
    .cc-shead{display:flex;flex-wrap:wrap;align-items:center;gap:.55rem}
    .cc-sid,.cc-date{font-family:ui-monospace,monospace;font-size:.78rem;color:var(--muted)}
    .cc-stitle{font-weight:600}
    .cc-reports{margin-top:.4rem;display:flex;flex-direction:column;gap:.15rem}
    .cc-row{display:flex;align-items:center;gap:.55rem;padding:.3rem .45rem;border-radius:6px;
      text-decoration:none;color:var(--fg)}
    .cc-row:hover{background:var(--accent-soft)}
    .cc-rtitle{color:var(--fg)}
    .cc-session[hidden],.cc-group[hidden]{display:none}
  </style>
</head>
<body>
<main class="report">
  <header>
    <p class="kicker">animath · cross-branch</p>
    <h1>Session control center <span class="badge">spike</span></h1>
    <dl class="meta">
      <div><dt>Scope</dt><dd>${sessions.size} sessions · ${reports.length} reports · ${groups.size} branches</dd></div>
      <div><dt>Generated</dt><dd>${generated.slice(0, 16).replace("T", " ")} · <code>build-control-center.mjs</code></dd></div>
    </dl>
    <p class="lineage">Grouped by short branch name · provenance = slug folder · each row opens the
    most-recently-updated copy of that report, rendered live via githack.</p>
  </header>
  <div class="body"><div class="content">
    <div class="cc-tools"><input id="q" type="search" placeholder="filter by branch / title / status / session…" autocomplete="off"></div>
${groupsHtml}  </div></div>
</main>
<script>
  const q = document.getElementById("q");
  const sessionsEls = [...document.querySelectorAll(".cc-session")];
  const groupsEls = [...document.querySelectorAll(".cc-group")];
  q.addEventListener("input", () => {
    const t = q.value.trim().toLowerCase();
    for (const s of sessionsEls) s.hidden = t && !s.dataset.hay.includes(t);
    for (const g of groupsEls) g.hidden = ![...g.querySelectorAll(".cc-session")].some(s => !s.hidden);
  });
</script>
</body>
</html>
`;

const outPath = join(dirname(fileURLToPath(import.meta.url)), "control-center.html");
writeFileSync(outPath, ccHtml);
console.log(`\ncontrol-center.html written (${sessions.size} sessions, ${reports.length} reports).`);
