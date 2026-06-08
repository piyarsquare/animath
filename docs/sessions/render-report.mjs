#!/usr/bin/env node
/* SPIKE — render a Markdown+YAML session report into the RICH HTML view.
 *
 * Takes one .md report (frontmatter + body) and emits a sibling .preview.html
 * that reuses report.css + report.js — so the generated page gets the SAME
 * richness as a hand-authored HTML report (auto-TOC, scroll-spy, styled
 * callouts, a real timeline rail, sortable tables) from a plain Markdown source.
 *
 *   node docs/sessions/render-report.mjs docs/sessions/REPORT_STYLE.md
 *
 * Conventions it understands:
 *   - YAML frontmatter        -> header + report-meta island
 *   - > [!NOTE] … alerts       -> .callout boxes
 *   - "## Working notes" with  -> <ol class="timeline"> rail; each entry is an
 *     "### <emoji> <type> · HH:MM — title" heading + "**Why:** …" + body
 *
 * Uses `marked` (already a project dependency).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

marked.setOptions({ gfm: true });

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

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

// 2 · "## Working notes" → a real timeline rail
const TYPES = "decision|code|finding|blocker|milestone";
const ENTRY_RE = new RegExp(`(${TYPES})\\s*·\\s*(\\d{1,2}:\\d{2})\\s*[—-]\\s*(.+)$`);
const cap = (s) => s[0].toUpperCase() + s.slice(1);

function buildEntry(heading, contentLines) {
  const hm = heading.match(ENTRY_RE);                  // tolerates a leading emoji
  if (!hm) return null;
  const [, type, time, title] = hm;
  const paras = contentLines.join("\n").split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  let why = "";
  const rest = [];
  for (const p of paras) {
    const wm = p.match(/^\*\*Why:\*\*\s*([\s\S]*)$/);
    if (wm && !why) why = wm[1].trim();
    else rest.push(p);
  }
  const whyHtml = why ? `\n        <p class="why"><strong>Why:</strong> ${marked.parseInline(why)}</p>` : "";
  const bodyHtml = rest.map(p => `\n        <p>${marked.parseInline(p)}</p>`).join("");
  return `      <li class="tl" data-type="${type}">
        <p class="tl-time">${time}</p>
        <span class="chip chip-${type}">${cap(type)}</span>
        <h3>${marked.parseInline(title)}</h3>${whyHtml}${bodyHtml}
      </li>`;
}

function transformTimeline(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^##\s+Working notes\s*$/i.test(lines[i])) { out.push(lines[i]); continue; }
    out.push(lines[i], "");
    const section = [];
    i++;
    while (i < lines.length && !/^##\s/.test(lines[i])) { section.push(lines[i]); i++; }
    i--;
    const entries = [];
    let cur = null;
    for (const ln of section) {
      if (/^###\s/.test(ln)) { if (cur) entries.push(cur); cur = { heading: ln.replace(/^###\s+/, ""), content: [] }; }
      else if (cur) cur.content.push(ln);
    }
    if (cur) entries.push(cur);
    const lis = entries.map(e => buildEntry(e.heading, e.content)).filter(Boolean);
    if (lis.length) out.push('<ol class="timeline">', ...lis, "</ol>", "");
    else out.push(...section);
  }
  return out.join("\n");
}

// 3 · GitHub alerts → report.css callouts
const ALERT = { NOTE: "note", TIP: "note", IMPORTANT: "decision", WARNING: "warn", CAUTION: "gotcha" };
function transformAlerts(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const a = lines[i].match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i);
    if (!a) { out.push(lines[i]); continue; }
    const inner = [];
    i++;
    while (i < lines.length && /^>\s?/.test(lines[i])) { inner.push(lines[i].replace(/^>\s?/, "")); i++; }
    i--;
    const type = a[1].toUpperCase();
    const label = type[0] + type.slice(1).toLowerCase();
    out.push(`<div class="callout callout-${ALERT[type]}"><span class="callout-label">${label}</span>\n\n${marked.parse(inner.join("\n"))}\n</div>`);
  }
  return out.join("\n");
}

// 3b · standalone image lines → <figure> with a caption (report.css styles these).
// A line that is *only* an image becomes a figure; the alt text is the caption.
// Inline images (inside a paragraph or a timeline entry) are left as plain <img>.
const FIG_RE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/;
function transformFigures(md) {
  return md.split(/\r?\n/).map((ln) => {
    const m = ln.match(FIG_RE);
    if (!m) return ln;
    const [, alt, src, title] = m;
    const cap = (title || alt || "").trim();
    const capHtml = cap ? `<figcaption>${marked.parseInline(cap)}</figcaption>` : "";
    return `<figure><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy">${capHtml}</figure>`;
  }).join("\n");
}

const contentHtml = marked.parse(transformFigures(transformAlerts(transformTimeline(body))));

// 4 · header from frontmatter
const statusBadge = (s) => s ? `<span class="badge ${({ completed: "badge-ok", "in-progress": "badge-warn" })[s] || "badge"}">${esc(s)}</span>` : "";
const buildBadge = (b) => b ? `<span class="badge ${b === "passed" ? "badge-ok" : b === "failed" ? "badge-bad" : "badge-warn"}">build: ${esc(b)}</span>` : "";
const metaRows = [
  ["Session", fm.session && esc(fm.session)],
  ["Branch", fm.branch && `<code>${esc(fm.branch)}</code>`],
  ["Status", statusBadge(fm.status)],
  ["Build", buildBadge(fm.build)],
  ["App", fm.app && `<code>${esc(fm.app)}</code>`],
].filter(([, v]) => v).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("\n      ");

// 5 · asset prefix so report.css/js resolve from any depth under docs/sessions
const out = src.replace(/\.md$/, ".preview.html");
const sessionsRoot = dirname(fileURLToPath(import.meta.url));
const rel = relative(dirname(resolve(out)), sessionsRoot).split(sep).join("/");
const A = rel ? rel + "/" : "./";

const html = `<!DOCTYPE html>
<!-- GENERATED from ${esc(src)} by render-report.mjs — edit the .md, not this. -->
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>${esc(fm.title || "Session report")}</title>
  <link rel="stylesheet" href="${A}report.css">
  <script defer src="${A}report.js"></script>
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
      ${metaRows}
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

writeFileSync(out, html);
console.log(`rendered ${src} → ${out}`);
