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
 *
 * The control center is data-driven: every session is emitted as a flat card with
 * data-* attributes, and the inline script groups / sorts / timelines them client
 * side (group by app · branch · status · month; sort by date · app · title; plus a
 * global chronological timeline view). With JS off, the flat newest-first list and
 * every report link still work.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { htmlToMarkdown } from "./convert-html.mjs";
import { CATEGORIES, normalizeApps, shortName, appChips, catHue } from "./categories.mjs";

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

  // Categorical label(s): explicit `app:` frontmatter wins, else inferred from slug.
  const apps = normalizeApps(fm.app, rec.slug);

  reports.push({ slug: rec.slug, short: shortName(rec.slug), base: rec.base, date,
    kind: fm.kind || "?", session: fm.session || "?", title: fm.title || rec.base, status: fm.status || "?",
    apps, thumb,
    href: `converted/${rec.kind}/${rec.slug}/${rec.base}.preview.html` });
}

// 3 · roll up to short name → session → reports
const kindRank = { progress: 0, handoff: 1, "three-hats": 2, plan: 3 };
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
  s.title = p.title; s.status = p.status; s.href = p.href;
  s.thumb = (s.reports.find(r => r.thumb) || {}).thumb || null;
  // Union of every report's categories; primary = the first one seen.
  const seen = [];
  for (const r of s.reports) for (const a of r.apps) if (!seen.includes(a)) seen.push(a);
  s.apps = seen.length ? seen : ["general"];
  s.primary = s.apps[0];
}

const branchSet = new Set([...sessions.values()].map(s => s.short));
const catSet = new Set([].concat(...[...sessions.values()].map(s => s.apps)));
const sessionList = [...sessions.values()].sort((a, b) => byRecency(a.date, b.date));

// 4 · control center page — flat data-rich cards; the inline script does the rest
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const statusBadge = (s) => `<span class="badge ${({ completed: "badge-ok", "in-progress": "badge-warn" })[s] || "badge"}">${esc(s)}</span>`;

let cardsHtml = "";
for (const s of sessionList) {
  const hay = [s.short, s.slug, s.session, s.status, ...s.apps, ...s.reports.map(r => r.title)].join(" ").toLowerCase();
  let rows = "";
  for (const r of s.reports) rows += `      <a class="cc-row" href="${esc(r.href)}"><span class="chip chip-${esc(r.kind)}">${esc(r.kind)}</span><span class="cc-rtitle">${esc(r.title)}</span></a>\n`;
  const thumb = s.thumb ? `      <img class="cc-thumb" src="${esc(s.thumb)}" alt="" loading="lazy">\n` : "";
  cardsHtml += `    <article class="cc-session${s.thumb ? " has-thumb" : ""}" data-short="${esc(s.short)}" data-apps="${esc(s.apps.join(" "))}" data-cat="${esc(s.primary)}" data-hue="${catHue(s.primary)}" data-date="${esc(s.date.slice(0, 10))}" data-status="${esc(s.status)}" data-session="${esc(s.session)}" data-title="${esc(s.title)}" data-href="${esc(s.href)}" data-hay="${esc(hay)}">
${thumb}      <div class="cc-shead"><span class="cc-sid">${esc(s.session)}</span> ${statusBadge(s.status)} <span class="cc-date">${esc(s.date.slice(0, 10))}</span> <span class="cc-branch"><code>${esc(s.short)}</code></span></div>
      <div class="cc-stitle">${esc(s.title)}</div>
      <div class="cc-cats">${appChips(s.apps)}</div>
      <div class="cc-reports">\n${rows}      </div>
    </article>\n`;
}

const CAT_LABELS = Object.fromEntries(Object.entries(CATEGORIES).map(([k, v]) => [k, v.label]));

writeFileSync(join(ROOT, "control-center.html"), `<!DOCTYPE html>
<!-- GENERATED by build-sessions.mjs — do not edit by hand. -->
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>animath · session control center</title>
<link rel="stylesheet" href="./report.css"><script defer src="./report.js"></script>
<style>
  /* This dashboard has no TOC, so cancel report.css's 2-column body grid. */
  .report>.body{display:block}
  .content{max-width:none}
  .cc-tools{position:sticky;top:0;background:var(--bg);padding:.6rem 0;z-index:2;border-bottom:1px solid var(--border);display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}
  .cc-tools input[type=search]{flex:1 1 16rem;min-width:12rem;padding:.5rem .7rem;border-radius:8px;border:1px solid var(--border);background:var(--panel);color:var(--fg);font:inherit}
  .cc-tools label{font-size:.78rem;color:var(--muted);display:inline-flex;align-items:center;gap:.3rem}
  .cc-tools select{font:inherit;font-size:.82rem;padding:.35rem .5rem;border-radius:6px;border:1px solid var(--border);background:var(--panel);color:var(--fg)}
  .cc-seg{display:inline-flex;border:1px solid var(--border);border-radius:6px;overflow:hidden}
  .cc-seg button{font:inherit;font-size:.82rem;cursor:pointer;background:var(--panel);color:var(--fg);border:0;padding:.35rem .7rem}
  .cc-seg button.active{background:var(--accent);color:#fff}
  .cc-ghead{display:flex;align-items:center;gap:.55rem;margin:1.5rem 0 .5rem;padding-bottom:.3rem;border-bottom:1px solid var(--border)}
  .cc-glabel{font-weight:700;font-size:1.05rem}.cc-gcount{opacity:.55;font-size:.78rem;font-weight:400}
  .cc-session{border:1px solid var(--border);border-radius:8px;padding:.55rem .7rem;margin:.55rem 0;background:var(--panel)}
  .cc-shead{display:flex;flex-wrap:wrap;align-items:center;gap:.55rem}
  .cc-stitle{font-weight:600;margin-top:.15rem}
  .cc-sid,.cc-date{font-family:ui-monospace,monospace;font-size:.78rem;color:var(--muted)}
  .cc-branch code{font-size:.74rem}
  .cc-cats{margin-top:.35rem;display:flex;flex-wrap:wrap;gap:.3rem}
  .cc-reports{margin-top:.4rem;display:flex;flex-direction:column;gap:.15rem}
  .cc-row{display:flex;align-items:center;gap:.55rem;padding:.3rem .45rem;border-radius:6px;text-decoration:none;color:var(--fg)}
  .cc-row:hover{background:var(--accent-soft)}
  .cc-rtitle{font-size:.92rem}
  .cc-session[hidden]{display:none}
  .cc-thumb{float:right;width:140px;height:88px;object-fit:cover;border-radius:6px;border:1px solid var(--border);margin:0 0 .4rem .7rem;background:var(--bg)}
  ol.cc-timeline{margin-top:1rem}
  ol.cc-timeline li.tl::before{background:hsl(var(--dot,215) 60% 50%)}
  ol.cc-timeline li.tl h3{font-size:1rem;margin:.2rem 0 .25rem}
  ol.cc-timeline li.tl h3 a{color:var(--fg)}
  ol.cc-timeline .tl-head{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem}
  .cc-empty{color:var(--muted);padding:2rem 0}
  @media (max-width:520px){.cc-thumb{width:96px;height:60px}}
</style></head>
<body><main class="report"><header><p class="kicker">animath · cross-branch</p>
<h1>Session control center</h1>
<dl class="meta"><div><dt>Scope</dt><dd>${sessions.size} sessions · ${reports.length} reports · ${branchSet.size} branches · ${catSet.size} categories</dd></div>
<div><dt>Generated</dt><dd>${new Date().toISOString().slice(0, 16).replace("T", " ")} · <code>build-sessions.mjs</code></dd></div></dl>
<p class="lineage">Group by app / branch / status / month, sort, or switch to a global timeline. Cards list every app a session touched; grouping uses its primary (first) category. Provenance = slug folder.</p></header>
<div class="body"><div class="content">
<div class="cc-tools">
  <input id="q" type="search" placeholder="filter by branch / title / status / app / session…" autocomplete="off">
  <label>group <select id="groupby">
    <option value="app">app</option><option value="branch">branch</option>
    <option value="status">status</option><option value="month">month</option><option value="none">none</option>
  </select></label>
  <label>sort <select id="sortby">
    <option value="date-desc">newest</option><option value="date-asc">oldest</option>
    <option value="app">app</option><option value="title">title</option>
  </select></label>
  <span class="cc-seg"><button id="view-cards" class="active" type="button">Cards</button><button id="view-timeline" type="button">Timeline</button></span>
</div>
<div id="cc-list">
${cardsHtml}</div>
</div></div></main>
<script>
  var CAT = ${JSON.stringify(CAT_LABELS)};
  var listEl = document.getElementById("cc-list");
  var ALL = Array.prototype.slice.call(listEl.querySelectorAll(".cc-session"));
  var q = document.getElementById("q"), gb = document.getElementById("groupby"), sb = document.getElementById("sortby");
  var bCards = document.getElementById("view-cards"), bTl = document.getElementById("view-timeline");
  var view = "cards";
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function statusBadge(s){ var cls = s==="completed"?"badge-ok":s==="in-progress"?"badge-warn":"badge"; return '<span class="badge '+cls+'">'+esc(s)+'</span>'; }
  function cmp(a, b){
    var k = sb.value, d = a.dataset, e = b.dataset;
    if (k === "date-asc") return d.date.localeCompare(e.date) || d.title.localeCompare(e.title);
    if (k === "title")    return d.title.localeCompare(e.title);
    if (k === "app")      return (CAT[d.cat]||d.cat).localeCompare(CAT[e.cat]||e.cat) || e.date.localeCompare(d.date);
    return e.date.localeCompare(d.date) || d.title.localeCompare(e.title);   // newest
  }
  function groupKey(c){ var g = gb.value;
    return g === "branch" ? c.dataset.short : g === "status" ? c.dataset.status
         : g === "month" ? c.dataset.date.slice(0,7) : g === "none" ? "" : c.dataset.cat; }
  function render(){
    var t = q.value.trim().toLowerCase();
    var cards = ALL.filter(function(c){ return !t || c.dataset.hay.indexOf(t) !== -1; });
    listEl.innerHTML = "";
    if (!cards.length){ listEl.innerHTML = '<p class="cc-empty">No sessions match.</p>'; return; }
    if (view === "timeline"){ renderTimeline(cards); return; }
    cards.sort(cmp);
    var g = gb.value;
    if (g === "none"){ cards.forEach(function(c){ listEl.appendChild(c); }); return; }
    var order = [], bucket = {};
    cards.forEach(function(c){ var k = groupKey(c); if (!bucket[k]){ bucket[k] = []; order.push(k); } bucket[k].push(c); });
    order.forEach(function(k){
      var members = bucket[k];
      var h = document.createElement("div"); h.className = "cc-ghead";
      var lbl = g === "app"
        ? '<span class="cat" style="--c:'+members[0].dataset.hue+'">'+esc(CAT[k]||k)+'</span>'
        : '<span class="cc-glabel">'+esc(k||"all")+'</span>';
      h.innerHTML = lbl + '<span class="cc-gcount">'+members.length+(members.length>1?" sessions":" session")+'</span>';
      listEl.appendChild(h);
      members.forEach(function(c){ listEl.appendChild(c); });
    });
  }
  function renderTimeline(cards){
    var asc = sb.value === "date-asc";
    cards.sort(function(a,b){ return asc ? a.dataset.date.localeCompare(b.dataset.date) : b.dataset.date.localeCompare(a.dataset.date); });
    var ol = document.createElement("ol"); ol.className = "timeline cc-timeline";
    cards.forEach(function(c){
      var d = c.dataset, li = document.createElement("li"); li.className = "tl";
      li.style.setProperty("--dot", d.hue);
      li.innerHTML = '<p class="tl-time">'+esc(d.date)+'</p>'
        + '<div class="tl-head"><span class="cat" style="--c:'+d.hue+'">'+esc(CAT[d.cat]||d.cat)+'</span> '+statusBadge(d.status)+' <code>'+esc(d.short)+'</code></div>'
        + '<h3><a href="'+esc(d.href)+'">'+esc(d.title)+'</a></h3>';
      ol.appendChild(li);
    });
    listEl.appendChild(ol);
  }
  function setView(v){ view = v; bCards.classList.toggle("active", v==="cards"); bTl.classList.toggle("active", v==="timeline"); gb.disabled = v==="timeline"; render(); }
  q.addEventListener("input", render); gb.addEventListener("change", render); sb.addEventListener("change", render);
  bCards.addEventListener("click", function(){ setView("cards"); }); bTl.addEventListener("click", function(){ setView("timeline"); });
  render();
</script></body></html>
`);

const mb = (imgBytes / (1024 * 1024)).toFixed(2);
console.log(`built: ${reports.length} reports · ${sessions.size} sessions · ${branchSet.size} branches · ${catSet.size} categories → docs/sessions/converted/ + control-center.html`);
console.log(`screenshots: ${imgCount} carried · ${mb} MB (budget readout — see prune-assets.mjs to trim)`);
