#!/usr/bin/env node
/* Build the cross-branch session site.
 *
 *   git fetch --all && node docs/sessions/build-sessions.mjs
 *
 * Walks every origin/* branch, reads each distinct report (deduped by path,
 * most-recent copy, provenance = slug folder) WITHOUT checking out branches,
 * converts each to Markdown (HTML reports via convert-html.mjs; .md taken as-is),
 * renders each to the rich HTML view (render-report.mjs), and writes everything
 * under docs/sessions/converted/<slug>/ plus a control-center.html index. The
 * source branches are never modified — this is a read-only central hub.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { htmlToMarkdown } from "./convert-html.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, "converted");
const REPO = "piyarsquare/animath";
const git = (a) => { try { return execFileSync("git", a, { encoding: "utf8", maxBuffer: 64 << 20 }); } catch { return ""; } };
const gitBuf = (a) => { try { return execFileSync("git", a, { maxBuffer: 256 << 20 }); } catch { return null; } };

// Markdown image refs in a report body, and a POSIX path join for resolving them
// relative to the report's location in the repo.
const IMG_RE = /!\[[^\]]*\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g;
const posixJoin = (dir, rel) => {
  const parts = (dir + "/" + rel).split("/");
  const out = [];
  for (const p of parts) { if (p === "" || p === ".") continue; if (p === "..") out.pop(); else out.push(p); }
  return out.join("/");
};
const isLocalImg = (s) => s && !/^(https?:)?\/\//.test(s) && !s.startsWith("data:");
// true when a relative ref climbs above its own folder (e.g. ../../x.png)
const escapesDir = (rel) => { let d = 0; for (const p of rel.split("/")) { if (p === "" || p === ".") continue; if (p === "..") { if (--d < 0) return true; } else d++; } return false; };
let imgBytes = 0, imgCount = 0;   // screenshot space budget across all carried reports

const isReport = (p) =>
  /^docs\/sessions\/(progress|handoff)\//.test(p) && /\.(html|md)$/.test(p) &&
  !/\/_/.test(p) && !/\/index\.html$/.test(p) && !/\.preview\.html$/.test(p);
const shortName = (slug) => { const m = slug.match(/^(.*)-([A-Za-z0-9]{5})$/); return m && /[A-Z]/.test(m[2]) && /[a-z]/.test(m[2]) ? m[1] : slug; };

// 1 · dedupe each report path to its most-recently-updated copy across branches
const byKey = new Map();   // "<slug>/<basename-no-ext>" -> {key, slug, base, winner:{ref,date,path}}
for (const ref of git(["for-each-ref", "--format=%(refname:short)", "refs/remotes/origin"]).split("\n").map(s => s.trim()).filter(b => b && b !== "origin/HEAD")) {
  for (const path of git(["ls-tree", "-r", "--name-only", ref, "--", "docs/sessions"]).split("\n").map(s => s.trim()).filter(isReport)) {
    const date = git(["log", "-1", "--format=%cI", ref, "--", path]).trim();
    const parts = path.split("/");                         // docs/sessions/<kind>/<slug>/<file>
    const base = basename(path).replace(/\.(html|md)$/, "");
    const key = `${parts[2]}/${parts[3]}/${base}`;         // kind/slug/base — .md & .html collapse, progress≠handoff
    const rec = byKey.get(key) || { key, kind: parts[2], slug: parts[3], base, winner: null };
    // prefer .md over .html on a tie; otherwise newest wins
    const better = !rec.winner || date > rec.winner.date || (date === rec.winner.date && path.endsWith(".md") && rec.winner.path.endsWith(".html"));
    if (better) rec.winner = { ref, date, path };
    byKey.set(key, rec);
  }
}

// 2 · convert + render each distinct report into converted/<slug>/
rmSync(OUT, { recursive: true, force: true });
const reports = [];
for (const rec of byKey.values()) {
  const { ref, date, path } = rec.winner;
  const content = git(["show", `${ref}:${path}`]);
  const md = path.endsWith(".md") ? content : htmlToMarkdown(content);
  const dir = join(OUT, rec.kind, rec.slug);
  mkdirSync(dir, { recursive: true });

  const fm = {};
  const fmBlock = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fmBlock) for (const ln of fmBlock[1].split(/\r?\n/)) { const k = ln.match(/^(\w+):\s*(.*)$/); if (k) fm[k[1]] = k[2] === "null" ? null : k[2].replace(/^["']|["']$/g, ""); }

  // Carry referenced screenshots: fetch each local image binary from the same
  // branch tip and mirror it under converted/<kind>/<slug>/<rel> so the relative
  // ![](assets/…) paths resolve identically on GitHub and in the rendered HTML.
  const reportDir = dirname(path);                       // docs/sessions/<kind>/<slug>
  // Strip fenced + inline code first, so image syntax discussed in prose
  // (e.g. `![](…)`) isn't mistaken for a real screenshot reference.
  const scannable = md.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");
  const imgRefs = [...scannable.matchAll(IMG_RE)].map((m) => m[1]).filter(isLocalImg);
  // Also carry an explicit `thumbnail:` even when it isn't embedded in the body —
  // otherwise a dedicated thumbnail/crop would leave a broken control-center card.
  const toCarry = new Set(imgRefs);
  if (isLocalImg(fm.thumbnail)) toCarry.add(fm.thumbnail);
  // A ref that climbs out of the report's folder (e.g. ../../../redesign/shots/x.png)
  // would mirror to a path outside converted/ — never copied to dist/sessions, so a
  // dead link on Pages. Re-home those under assets/carried/ and rewrite the body ref.
  const outRefs = new Map();
  for (const r of toCarry) outRefs.set(r, escapesDir(r) ? "assets/carried/" + basename(r) : r);
  let outMd = md;
  const carried = new Set();
  for (const imgRef of toCarry) {
    const repoImg = posixJoin(reportDir, imgRef);
    const blob = gitBuf(["show", `${ref}:${repoImg}`]);
    if (!blob) { console.warn(`  ! missing image ${repoImg} on ${ref}`); continue; }
    const destRef = outRefs.get(imgRef);
    const outImg = join(dir, destRef);
    mkdirSync(dirname(outImg), { recursive: true });
    writeFileSync(outImg, blob);
    if (destRef !== imgRef) outMd = outMd.split(`(${imgRef})`).join(`(${destRef})`);
    carried.add(imgRef);
    imgBytes += blob.length; imgCount++;
  }

  const mdPath = join(dir, rec.base + ".md");
  writeFileSync(mdPath, outMd);
  execFileSync("node", [join(ROOT, "render-report.mjs"), mdPath], { stdio: "ignore" });

  // Lead thumbnail for the control center: the `thumbnail:` frontmatter ref, else
  // the first body image — but only if it actually carried, so cards never break.
  const thumbRef = isLocalImg(fm.thumbnail) ? fm.thumbnail : imgRefs[0];
  const thumb = thumbRef && carried.has(thumbRef) ? `converted/${rec.kind}/${rec.slug}/${outRefs.get(thumbRef)}` : null;

  reports.push({ slug: rec.slug, short: shortName(rec.slug), base: rec.base, date,
    kind: fm.kind || "?", session: fm.session || "?", title: fm.title || rec.base, status: fm.status || "?",
    thumb,
    href: `converted/${rec.kind}/${rec.slug}/${rec.base}.preview.html` });
}

// 3 · roll up to short name → session → reports
const kindRank = { progress: 0, handoff: 1, "three-hats": 2 };
const byRecency = (a, b) => (b || "").localeCompare(a || "");
const sessions = new Map();
for (const r of reports) {
  const k = `${r.slug}|${r.session}`;
  if (!sessions.has(k)) sessions.set(k, { slug: r.slug, short: r.short, session: r.session, reports: [] });
  sessions.get(k).reports.push(r);
}
for (const s of sessions.values()) {
  s.reports.sort((a, b) => (kindRank[a.kind] ?? 9) - (kindRank[b.kind] ?? 9) || byRecency(a.date, b.date));
  s.date = s.reports.map(r => r.date).sort().slice(-1)[0] || "";
  const p = s.reports.find(r => r.kind === "handoff") || s.reports[0];
  s.title = p.title; s.status = p.status;
  s.thumb = (s.reports.find(r => r.thumb) || {}).thumb || null;
}
const groups = new Map();
for (const s of sessions.values()) { if (!groups.has(s.short)) groups.set(s.short, []); groups.get(s.short).push(s); }
for (const a of groups.values()) a.sort((x, y) => byRecency(x.date, y.date));
const groupOrder = [...groups.entries()].sort((a, b) => byRecency(a[1][0].date, b[1][0].date));

// 4 · control center page
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const statusBadge = (s) => `<span class="badge ${({ completed: "badge-ok", "in-progress": "badge-warn" })[s] || "badge"}">${esc(s)}</span>`;
let groupsHtml = "";
for (const [short, ss] of groupOrder) {
  let inner = "";
  for (const s of ss) {
    const hay = [short, s.slug, s.session, s.status, ...s.reports.map(r => r.title)].join(" ").toLowerCase();
    let rows = "";
    for (const r of s.reports) rows += `        <a class="cc-row" href="${esc(r.href)}"><span class="chip chip-${esc(r.kind)}">${esc(r.kind)}</span><span class="cc-rtitle">${esc(r.title)}</span></a>\n`;
    const thumb = s.thumb ? `        <img class="cc-thumb" src="${esc(s.thumb)}" alt="" loading="lazy">\n` : "";
    inner += `      <article class="cc-session${s.thumb ? " has-thumb" : ""}" data-hay="${esc(hay)}">
${thumb}        <div class="cc-shead"><span class="cc-sid">${esc(s.session)}</span> ${statusBadge(s.status)} <span class="cc-date">${esc(s.date.slice(0, 10))}</span> <span class="cc-stitle">${esc(s.title)}</span></div>
        <div class="cc-reports">\n${rows}        </div>
      </article>\n`;
  }
  groupsHtml += `    <section class="cc-group" data-short="${esc(short)}"><h2><code>${esc(short)}</code> <span class="cc-count">${ss.length} session${ss.length > 1 ? "s" : ""}</span></h2>\n${inner}    </section>\n`;
}

writeFileSync(join(ROOT, "control-center.html"), `<!DOCTYPE html>
<!-- GENERATED by build-sessions.mjs — do not edit by hand. -->
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>animath · session control center</title>
<link rel="stylesheet" href="./report.css"><script defer src="./report.js"></script>
<style>
  /* This dashboard has no TOC, so cancel report.css's 2-column body grid
     (13.5rem TOC + content): with a single child, .content would otherwise be
     squeezed into the narrow TOC track. Let the cards use the full width. */
  .report>.body{display:block}
  .content{max-width:none}
  .cc-tools{position:sticky;top:0;background:var(--bg);padding:.6rem 0;z-index:2;border-bottom:1px solid var(--border)}
  .cc-tools input{width:100%;max-width:34rem;padding:.5rem .7rem;border-radius:8px;border:1px solid var(--border);background:var(--panel);color:var(--fg);font:inherit}
  .cc-group{margin:1.4rem 0}.cc-count{opacity:.55;font-size:.78rem;font-weight:400}
  .cc-session{border:1px solid var(--border);border-radius:8px;padding:.55rem .7rem;margin:.55rem 0;background:var(--panel)}
  .cc-shead{display:flex;flex-wrap:wrap;align-items:center;gap:.55rem}.cc-stitle{font-weight:600}
  .cc-sid,.cc-date{font-family:ui-monospace,monospace;font-size:.78rem;color:var(--muted)}
  .cc-reports{margin-top:.4rem;display:flex;flex-direction:column;gap:.15rem}
  .cc-row{display:flex;align-items:center;gap:.55rem;padding:.3rem .45rem;border-radius:6px;text-decoration:none;color:var(--fg)}
  .cc-row:hover{background:var(--accent-soft)}.cc-session[hidden],.cc-group[hidden]{display:none}
  .cc-thumb{float:right;width:140px;height:88px;object-fit:cover;border-radius:6px;border:1px solid var(--border);margin:0 0 .4rem .7rem;background:var(--bg)}
  @media (max-width:520px){.cc-thumb{width:96px;height:60px}}
</style></head>
<body><main class="report"><header><p class="kicker">animath · cross-branch</p>
<h1>Session control center</h1>
<dl class="meta"><div><dt>Scope</dt><dd>${sessions.size} sessions · ${reports.length} reports · ${groups.size} branches</dd></div>
<div><dt>Generated</dt><dd>${new Date().toISOString().slice(0, 16).replace("T", " ")} · <code>build-sessions.mjs</code></dd></div></dl>
<p class="lineage">Grouped by short branch name · provenance = slug folder · each row opens the Markdown-sourced report rendered to rich HTML.</p></header>
<div class="body"><div class="content">
<div class="cc-tools"><input id="q" type="search" placeholder="filter by branch / title / status / session…" autocomplete="off"></div>
${groupsHtml}</div></div></main>
<script>
  const q=document.getElementById("q"),S=[...document.querySelectorAll(".cc-session")],G=[...document.querySelectorAll(".cc-group")];
  q.addEventListener("input",()=>{const t=q.value.trim().toLowerCase();
    for(const s of S)s.hidden=t&&!s.dataset.hay.includes(t);
    for(const g of G)g.hidden=![...g.querySelectorAll(".cc-session")].some(s=>!s.hidden);});
</script></body></html>
`);

const mb = (imgBytes / (1024 * 1024)).toFixed(2);
console.log(`built: ${reports.length} reports · ${sessions.size} sessions · ${groups.size} branches → docs/sessions/converted/ + control-center.html`);
console.log(`screenshots: ${imgCount} carried · ${mb} MB (budget readout — see prune-assets.mjs to trim)`);
