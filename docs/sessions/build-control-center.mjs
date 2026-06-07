#!/usr/bin/env node
/* SPIKE — cross-branch session "control center".
 *
 * Walks every origin/* branch, reads each branch TIP's docs/sessions/ reports
 * WITHOUT checking them out (via `git show <ref>:<path>`), extracts metadata
 * (HTML <script class="report-meta"> island, or Markdown YAML frontmatter), and
 * prints one unified manifest spanning all active branches.
 *
 * This is the piece a per-branch generator fundamentally cannot do: it reads
 * branch tips, not the local working tree. Run after fetching:
 *     git fetch --all && node docs/sessions/build-control-center.mjs
 *
 * Dependency-free. Output: a human summary + a machine manifest (stdout).
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

// 3 · walk every branch tip
const reports = [];
const branchInfo = [];

for (const ref of branches) {
  const lastCommit = git(["log", "-1", "--format=%cI", ref]).trim();
  const files = git(["ls-tree", "-r", "--name-only", ref, "--", "docs/sessions"])
    .split("\n").map(s => s.trim()).filter(isReport);
  let n = 0;
  for (const path of files) {
    const meta = extractMeta(path, git(["show", `${ref}:${path}`])) || {};
    reports.push({
      branch: ref.replace(/^origin\//, ""),
      lastCommit,
      kind: meta.kind || (path.includes("/handoff/") ? "handoff" : "progress"),
      session: meta.session || null,
      title: meta.title || null,
      status: meta.status || null,
      build: meta.build || null,
      path,
    });
    n++;
  }
  branchInfo.push({ ref, lastCommit, reports: n });
}

const byRecency = (a, b) => (b.lastCommit || "").localeCompare(a.lastCommit || "");
branchInfo.sort(byRecency);
reports.sort((a, b) => byRecency(a, b) || (b.session || "").localeCompare(a.session || ""));

// 4 · human-readable summary
const withReports = branchInfo.filter(b => b.reports > 0);
console.log(`\nCross-branch session control center  (SPIKE)`);
console.log(`Scanned ${branches.length} origin branches · ${withReports.length} carry session reports · ${reports.length} reports total\n`);
for (const b of withReports) {
  console.log(`■ ${b.ref}   (last commit ${b.lastCommit.slice(0, 10)} · ${b.reports} report${b.reports > 1 ? "s" : ""})`);
  for (const r of reports.filter(r => "origin/" + r.branch === b.ref)) {
    console.log(`    ${(r.kind || "?").padEnd(10)} ${(r.session || "?").padEnd(16)} ${("[" + (r.status || "?") + "]").padEnd(16)} ${r.title || r.path.split("/").pop()}`);
  }
  console.log("");
}

// 5 · machine manifest (this is what would feed the explorer / search index)
console.log("----- manifest.json -----");
console.log(JSON.stringify({ generated: new Date().toISOString(), branches: branchInfo, reports }, null, 2));
