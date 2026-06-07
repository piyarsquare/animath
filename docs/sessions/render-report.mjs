#!/usr/bin/env node
/* SPIKE — render a Markdown+YAML session report into the RICH HTML view.
 *
 * Takes one .md report (frontmatter + body) and emits a sibling .preview.html
 * that reuses report.css + report.js — so the generated page gets the SAME
 * richness as a hand-authored HTML report (auto-TOC, scroll-spy, styled
 * callouts, sortable tables) from a plain Markdown source. This is the
 * "Markdown is the source, HTML is the richer render" half of the plan.
 *
 *   node docs/sessions/render-report.mjs docs/sessions/REPORT_STYLE.md
 *
 * Uses `marked` (already a project dependency). GitHub alert blockquotes
 * (> [!NOTE] …) are converted to report.css .callout boxes; YAML frontmatter
 * becomes the header + a report-meta island (so the control center can still
 * index the generated HTML too).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { marked } from "marked";

marked.setOptions({ gfm: true });

const src = process.argv[2];
if (!src) { console.error("usage: render-report.mjs <file.md>"); process.exit(1); }

const raw = readFileSync(src, "utf8");

// 1 · split frontmatter
let fm = {}, body = raw;
const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
if (m) {
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v === "null" || v === "~" || v === "") v = null;
    else v = v.replace(/^["']|["']$/g, "");
    fm[kv[1]] = v;
  }
  body = m[2];
}

// 2 · convert GitHub alerts -> report.css callouts before the main parse
const ALERT = { NOTE: "note", TIP: "note", IMPORTANT: "decision", WARNING: "warn", CAUTION: "gotcha" };
function transformAlerts(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const a = lines[i].match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i);
    if (!a) { out.push(lines[i]); continue; }
    const body2 = [];
    i++;
    while (i < lines.length && /^>\s?/.test(lines[i])) { body2.push(lines[i].replace(/^>\s?/, "")); i++; }
    i--;
    const type = a[1].toUpperCase();
    const label = type[0] + type.slice(1).toLowerCase();
    out.push(`<div class="callout callout-${ALERT[type]}"><span class="callout-label">${label}</span>\n\n${marked.parse(body2.join("\n"))}\n</div>`);
  }
  return out.join("\n");
}

const contentHtml = marked.parse(transformAlerts(body));

// 3 · header from frontmatter
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const statusBadge = (s) => s ? `<span class="badge ${({ completed: "badge-ok", "in-progress": "badge-warn" })[s] || "badge"}">${esc(s)}</span>` : "";
const buildBadge = (b) => b ? `<span class="badge ${b === "passed" ? "badge-ok" : b === "failed" ? "badge-bad" : "badge-warn"}">build: ${esc(b)}</span>` : "";
const rows = [
  ["Session", fm.session && esc(fm.session)],
  ["Branch", fm.branch && `<code>${esc(fm.branch)}</code>`],
  ["Status", statusBadge(fm.status)],
  ["Build", buildBadge(fm.build)],
  ["App", fm.app && `<code>${esc(fm.app)}</code>`],
].filter(([, v]) => v).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("\n      ");

const html = `<!DOCTYPE html>
<!-- GENERATED from ${esc(src)} by render-report.mjs — edit the .md, not this. -->
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>${esc(fm.title || "Session report")}</title>
  <link rel="stylesheet" href="./report.css">
  <script defer src="./report.js"></script>
  <script type="application/json" class="report-meta">
${JSON.stringify(fm, null, 2)}
  </script>
</head>
<body>
<main class="report">
  <header>
    <p class="kicker">${esc(fm.kind || "report")}</p>
    <h1>${esc(fm.title || "")}</h1>
    <dl class="meta">
      ${rows}
    </dl>
  </header>
  <div class="body">
    <nav class="toc" data-autobuild aria-label="Contents"></nav>
    <div class="content">
${contentHtml}
    </div>
  </div>
</main>
</body>
</html>
`;

const out = src.replace(/\.md$/, ".preview.html");
writeFileSync(out, html);
console.log(`rendered ${src} → ${out}`);
