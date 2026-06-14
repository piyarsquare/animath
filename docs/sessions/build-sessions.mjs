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
import { writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { htmlToMarkdown } from "./convert-html.mjs";
import { CATEGORIES, SIGNALS, normalizeApps, shortName, appChips, catHue,
  normalizeSignals, signalChips, signalDigest, SIGNAL_KEYS, DIGEST_ORDER } from "./categories.mjs";

marked.setOptions({ gfm: true });

// Pull the "Self-reflection" (exit-interview) section out of a report body: the
// markdown from the `## Self-reflection` heading to the next h2 (or EOF), plus the
// parsed Follow-up value level when present. Returns null when there's no section.
const REFL_LEVELS = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE"];
function extractReflection(md) {
  const m = /^##\s+Self[-\s]?reflection\s*$/im.exec(md);
  if (!m) return null;
  const rest = md.slice(m.index + m[0].length);
  const next = rest.search(/^##\s+/m);
  const body = (next === -1 ? rest : rest.slice(0, next)).trim();
  if (!body) return null;
  const lv = body.match(/follow[-\s]?up\s+value:?\s*\**\s*(CRITICAL|HIGH|MEDIUM|LOW|NONE)/i);
  return { md: body, html: marked.parse(body), level: lv ? lv[1].toUpperCase() : null };
}

const ROOT = dirname(fileURLToPath(import.meta.url));

// Parse the hand-edited backlog (docs/sessions/TODO.md) into todo items. Format:
//   - [ ] [category] !priority Title
//     indented note lines…
// A blank line ends an item. Category resolves through the taxonomy (unknown →
// none); priority is high|med|low (default med). See TODO.md's header for the spec.
const PRANK = { high: 0, med: 1, low: 2 };
function parseTodos(file) {
  let txt; try { txt = readFileSync(file, "utf8"); } catch { return []; }
  const items = []; let cur = null;
  const flush = () => { if (cur) { cur.title = cur.title.trim(); cur.note = cur.note.trim(); items.push(cur); } cur = null; };
  for (const ln of txt.split(/\r?\n/)) {
    const m = /^[-*]\s+\[([ xX])\]\s+(.*)$/.exec(ln);
    if (m) {
      flush();
      let text = m[2]; const done = m[1].toLowerCase() === "x";
      let cat = null, prio = "med";
      const cm = text.match(/^\[([A-Za-z0-9-]+)\]\s*/);
      if (cm) { const k = normalizeApps(cm[1], "none")[0];        // bogus slug ⇒ 'general' if unknown
        cat = (k && (k !== "general" || cm[1].toLowerCase() === "general")) ? k : null;
        text = text.slice(cm[0].length); }
      const pm = text.match(/(?:^|\s)!(p1|p2|p3|high|med|medium|low)\b/i);
      if (pm) { const p = pm[1].toLowerCase();
        prio = (p === "p1" || p === "high") ? "high" : (p === "p3" || p === "low") ? "low" : "med";
        text = text.replace(pm[0], " "); }
      cur = { done, cat, prio, title: text, note: "" };
    } else if (cur && /^\s+\S/.test(ln)) {
      cur.note += (cur.note ? " " : "") + ln.trim();
    } else { flush(); }
  }
  flush();
  return items;
}

const OUT = join(ROOT, "converted");
const REPO = "piyarsquare/animath";
const git = (a) => { try { return execFileSync("git", a, { encoding: "utf8", maxBuffer: 64 << 20 }); } catch { return ""; } };
const gitBuf = (a) => { try { return execFileSync("git", a, { maxBuffer: 256 << 20 }); } catch { return null; } };
const gitOk = (a) => { try { execFileSync("git", a, { stdio: "ignore" }); return true; } catch { return false; } };
// Integration ref (main, else master). A report has "landed" when its file is
// present on that ref. NOTE: we can't use `is-ancestor` on the dedupe winner ref,
// because a feature branch forked from main contains all of main's history — so
// every old report would look like it lives on the unmerged branch. Asking whether
// the *path* exists on main is the honest test.
const MAIN_REF = ["origin/main", "origin/master"].find((r) => gitOk(["rev-parse", "--verify", "-q", r])) || null;
const onMainCache = new Map();
const existsOnMain = (path) => {
  if (!MAIN_REF) return true;                          // can't tell → don't nag
  if (!onMainCache.has(path)) onMainCache.set(path, gitOk(["cat-file", "-e", `${MAIN_REF}:${path}`]));
  return onMainCache.get(path);
};

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

  reports.push({ slug: rec.slug, short: shortName(rec.slug), base: rec.base, date, ref, onMain: existsOnMain(path),
    kind: fm.kind || "?", session: fm.session || "?", title: fm.title || rec.base, status: fm.status || "?",
    apps, thumb, reflection: extractReflection(md),
    signals: normalizeSignals(fm.signals), next: fm.next || null,
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
  // Exit-interview rollup: the handoff's reflection wins; else the first report
  // that has one. Link the badge/anchor to the report the reflection came from.
  const rr = (p.reflection ? p : s.reports.find(r => r.reflection)) || null;
  s.reflection = rr ? { ...rr.reflection, href: rr.href } : null;
  s.thumb = (s.reports.find(r => r.thumb) || {}).thumb || null;
  // Union of every report's categories; primary = the first one seen.
  const seen = [];
  for (const r of s.reports) for (const a of r.apps) if (!seen.includes(a)) seen.push(a);
  s.apps = seen.length ? seen : ["general"];
  s.primary = s.apps[0];
  // Dashboard signals: explicit declared signals win; the rest are *backfilled*
  // from STRUCTURED fields only (high precision — never prose-scraped), so the
  // whole history populates without editing every old report:
  //   high-followup ← rolled-up reflection level HIGH/CRITICAL
  //   needs-dan     ← a proposed plan (kind:plan + status:proposed awaits a call)
  //   not-live      ← none of the session's reports are present on main yet
  // The handoff's "next" wins (authoritative end-state), else the first that has one.
  const explicit = new Set();
  for (const r of s.reports) for (const k of r.signals) explicit.add(k);
  const sig = new Set(explicit);
  if (s.reflection && (s.reflection.level === "HIGH" || s.reflection.level === "CRITICAL")) sig.add("high-followup");
  if (s.reports.some((r) => r.kind === "plan" && r.status === "proposed")) sig.add("needs-dan");
  if (!s.reports.some((r) => r.onMain)) sig.add("not-live");
  s.signals = SIGNAL_KEYS.filter((k) => sig.has(k));
  s.inferred = s.signals.filter((k) => !explicit.has(k));   // for the build readout
  s.next = p.next || (s.reports.find(r => r.next) || {}).next || null;
}

const branchSet = new Set([...sessions.values()].map(s => s.short));
const catSet = new Set([].concat(...[...sessions.values()].map(s => s.apps)));
const sessionList = [...sessions.values()].sort((a, b) => byRecency(a.date, b.date));

// 4 · control center page — flat data-rich cards; the inline script does the rest
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const statusBadge = (s) => `<span class="badge ${({ completed: "badge-ok", "in-progress": "badge-warn" })[s] || "badge"}">${esc(s)}</span>`;

let cardsHtml = "";
for (const s of sessionList) {
  const hay = [s.short, s.slug, s.session, s.status, ...s.apps, ...s.signals, s.next || "", ...s.reports.map(r => r.title)].join(" ").toLowerCase();
  let rows = "";
  for (const r of s.reports) rows += `      <a class="cc-row" href="${esc(r.href)}"><span class="chip chip-${esc(r.kind)}">${esc(r.kind)}</span><span class="cc-rtitle">${esc(r.title)}</span></a>\n`;
  const thumb = s.thumb ? `      <img class="cc-thumb" src="${esc(s.thumb)}" alt="" loading="lazy">\n` : "";
  const refl = s.reflection;
  // Inert <template>: the rendered reflection HTML, carried with each card so the
  // Reflections view can clone it after the same search/category filtering runs.
  const reflTpl = refl ? `      <template class="cc-refl-data" data-rhref="${esc(refl.href)}">${refl.html}</template>\n` : "";
  const sigs = s.signals.length ? `      <div class="cc-sigs">${signalChips(s.signals)}</div>\n` : "";
  const nextLine = s.next ? `      <div class="cc-cnext"><span class="cc-nlabel">next</span> ${esc(s.next)}</div>\n` : "";
  cardsHtml += `    <article class="cc-session${s.thumb ? " has-thumb" : ""}" data-short="${esc(s.short)}" data-apps="${esc(s.apps.join(" "))}" data-cat="${esc(s.primary)}" data-hue="${catHue(s.primary)}" data-date="${esc(s.date.slice(0, 10))}" data-status="${esc(s.status)}" data-session="${esc(s.session)}" data-title="${esc(s.title)}" data-href="${esc(s.href)}" data-refl="${refl ? 1 : 0}" data-level="${esc(refl?.level || "")}" data-signals="${esc(s.signals.join(" "))}" data-next="${esc(s.next || "")}" data-hay="${esc(hay)}">
${thumb}      <div class="cc-shead"><span class="cc-sid">${esc(s.session)}</span> ${statusBadge(s.status)} <span class="cc-date">${esc(s.date.slice(0, 10))}</span> <span class="cc-branch"><code>${esc(s.short)}</code></span></div>
      <div class="cc-stitle">${esc(s.title)}</div>
      <div class="cc-cats">${appChips(s.apps, (k) => "#cat=" + k)}</div>
${sigs}${nextLine}      <div class="cc-reports">\n${rows}      </div>
${reflTpl}    </article>\n`;
}
const reflCount = sessionList.filter(s => s.reflection).length;

const CAT_LABELS = Object.fromEntries(Object.entries(CATEGORIES).map(([k, v]) => [k, v.label]));

// Category filter bar: one button per category present (in taxonomy order), each a
// shareable #cat=<key> link, with a session count. The leading "All" clears the filter.
const catCounts = {};
for (const s of sessionList) for (const a of s.apps) catCounts[a] = (catCounts[a] || 0) + 1;
const catBtns = Object.keys(CATEGORIES).filter((k) => catCounts[k]).map((k) =>
  `<a class="cc-fbtn" data-cat="${k}" href="#cat=${k}">${appChips([k])}<span class="cc-fcount">${catCounts[k]}</span></a>`).join("\n  ");
const catBar = `<a class="cc-fbtn cc-fall active" data-cat="" href="#">All <span class="cc-fcount">${sessions.size}</span></a>\n  ${catBtns}`;

// "Start here" digest: roll every session up into the buckets of the signals it
// carries (a session can land in several), in DIGEST_ORDER. Server-rendered above
// the toolbar so it's the first thing the eye lands on — the project's open-items
// map, not a list to read. Each entry links to the session and shows its `next`.
const DIGEST_CAP = 8;                                  // keep each column scannable
const LV_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NONE: 4, "": 5 };
const bucketMap = {};
for (const s of sessionList) {
  for (const b of new Set(s.signals.map(signalDigest))) (bucketMap[b] = bucketMap[b] || []).push(s);
}
const digestCols = DIGEST_ORDER.filter((b) => bucketMap[b]?.length).map((b) => {
  const all = bucketMap[b];
  // High follow-up sorts by severity then recency; the rest newest-first.
  all.sort((x, y) => b === "High follow-up"
    ? (LV_RANK[x.reflection?.level || ""] - LV_RANK[y.reflection?.level || ""]) || byRecency(x.date, y.date)
    : byRecency(x.date, y.date));
  const shown = all.slice(0, DIGEST_CAP);
  const items = shown.map((s) =>
    `        <li class="cc-dli" data-apps="${esc(s.apps.join(" "))}"><a href="${esc(s.href)}"><code>${esc(s.short)}</code> ${esc(s.title)}</a>${s.next ? `<span class="cc-dnext">${esc(s.next)}</span>` : ""}</li>`).join("\n");
  const more = all.length > DIGEST_CAP ? `\n        <li class="cc-dmore">+${all.length - DIGEST_CAP} more</li>` : "";
  return `      <div class="cc-dcol"><h3>${esc(b)} <span>${all.length}</span></h3>\n      <ul>\n${items}${more}\n      </ul></div>`;
}).join("\n");
const startHere = digestCols
  ? `<section class="cc-starthere"><h2>Start here</h2><p class="cc-dsub">Auto-derived from each session's <code>signals:</code> and self-reflection &mdash; the project map, not a list to read. Click through to act.</p>\n    <div class="cc-digest">\n${digestCols}\n    </div></section>\n`
  : "";

// The curated backlog (TODO.md) — hand-maintained, rendered as the top "To-do"
// panel. Open items sort by priority; done items drop to the bottom, dimmed.
const todos = parseTodos(join(ROOT, "TODO.md"));
const openTodos = todos.filter((t) => !t.done).sort((a, b) => PRANK[a.prio] - PRANK[b.prio]);
const doneTodos = todos.filter((t) => t.done);
const prioBadge = (p) => `<span class="cc-prio cc-prio-${p}">${p}</span>`;
const todoLi = (t) => `      <li class="cc-tli${t.done ? " cc-done" : ""}" data-apps="${esc(t.cat || "")}">`
  + `<span class="cc-tcheck">${t.done ? "✓" : "○"}</span>`
  + `<div class="cc-tbody"><div class="cc-ttitle">${t.cat ? appChips([t.cat], (k) => "#cat=" + k) + " " : ""}${t.done ? "" : prioBadge(t.prio) + " "}${esc(t.title)}</div>`
  + `${t.note ? `<div class="cc-tnote">${esc(t.note)}</div>` : ""}</div></li>`;
const todoHtml = todos.length
  ? `<section class="cc-todo"><h2>To-do <span class="cc-tcount">${openTodos.length} open</span></h2>`
    + `<p class="cc-dsub">The curated backlog (<code>docs/sessions/TODO.md</code>) &mdash; notes meant to inform future rounds. Use the category buttons below to filter it by app.</p>\n`
    + `    <ul class="cc-tlist">\n${openTodos.map(todoLi).join("\n")}`
    + `${doneTodos.length ? `\n      <li class="cc-tdone-h">recently done</li>\n${doneTodos.map(todoLi).join("\n")}` : ""}\n    </ul></section>\n`
  : "";

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
  .cc-fbar{display:flex;flex-wrap:wrap;gap:.4rem;margin:.7rem 0 .2rem}
  .cc-fbtn{display:inline-flex;align-items:center;gap:.35rem;padding:.2rem .5rem;border:1px solid var(--border);border-radius:999px;background:var(--panel);color:var(--fg);text-decoration:none;font-size:.82rem}
  .cc-fbtn:hover{border-color:var(--accent);text-decoration:none}
  .cc-fbtn.active{border-color:var(--accent);background:var(--accent-soft);box-shadow:inset 0 0 0 1px var(--accent)}
  .cc-fbtn .cat{pointer-events:none}
  .cc-fcount{font-size:.72rem;color:var(--muted);font-variant-numeric:tabular-nums}
  a.cat{cursor:pointer}a.cat:hover{text-decoration:none;filter:brightness(1.06)}
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
  section.cc-refl{border:1px solid var(--border);border-left:3px solid hsl(var(--dot,215) 60% 50%);border-radius:8px;padding:.6rem .8rem;margin:.7rem 0;background:var(--panel)}
  section.cc-refl .cc-rhead{display:flex;flex-wrap:wrap;align-items:center;gap:.45rem;font-size:.82rem}
  section.cc-refl h3{font-size:1rem;margin:.3rem 0 .2rem}
  section.cc-refl h3 a{color:var(--fg)}
  .cc-rbody{font-size:.92rem}
  .cc-rbody ol,.cc-rbody ul{margin:.3rem 0 .2rem;padding-left:1.2rem}
  .cc-rbody li{margin:.18rem 0}
  .cc-rbody p{margin:.3rem 0}
  .cc-home{color:var(--accent);text-decoration:none;font-weight:600}
  .cc-home:hover{text-decoration:underline}
  @media (max-width:520px){.cc-thumb{width:96px;height:60px}}
  /* dashboard signals + "Start here" digest */
  .sig{display:inline-flex;align-items:center;font-size:.7rem;line-height:1.6;padding:.02rem .45rem;border-radius:999px;white-space:nowrap;
       border:1px solid hsl(var(--c,215) 55% 50% / .55);color:hsl(var(--c,215) 60% 40%);background:hsl(var(--c,215) 65% 55% / .12)}
  .cc-sigs{margin-top:.4rem;display:flex;flex-wrap:wrap;gap:.3rem}
  .cc-cnext{margin-top:.35rem;font-size:.84rem;color:var(--muted)}
  .cc-cnext .cc-nlabel{font-size:.66rem;text-transform:uppercase;letter-spacing:.05em;color:var(--accent);border:1px solid var(--accent-soft);border-radius:4px;padding:0 .25rem;margin-right:.35rem}
  .cc-starthere{border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:10px;background:var(--panel);padding:.7rem .95rem .85rem;margin:.3rem 0 1.1rem}
  .cc-starthere>h2{margin:.1rem 0 .15rem;font-size:1.1rem}
  .cc-dsub{margin:.1rem 0 .7rem;font-size:.82rem;color:var(--muted)}
  .cc-digest{display:grid;grid-template-columns:repeat(auto-fit,minmax(15.5rem,1fr));gap:.5rem 1.4rem}
  .cc-dcol h3{font-size:.74rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);margin:.1rem 0 .4rem;display:flex;align-items:center;gap:.4rem}
  .cc-dcol h3 span{background:var(--accent-soft);color:var(--accent);border-radius:999px;padding:0 .42rem;font-size:.72rem;font-weight:700}
  .cc-dcol ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.4rem}
  .cc-dcol li{font-size:.86rem;line-height:1.3}
  .cc-dcol li a{color:var(--fg);text-decoration:none;font-weight:600}
  .cc-dcol li a:hover{color:var(--accent)}
  .cc-dcol li code{font-size:.72rem;color:var(--muted);font-weight:400}
  .cc-dnext{display:block;color:var(--muted);font-size:.79rem;font-weight:400;margin-top:.05rem}
  .cc-dmore{font-size:.78rem;color:var(--muted);font-style:italic}
  .cc-dli[hidden],.cc-dcol[hidden],.cc-starthere[hidden],.cc-todo[hidden]{display:none}
  /* curated to-do panel */
  .cc-todo{border:1px solid var(--border);border-left:3px solid hsl(140 55% 45%);border-radius:10px;background:var(--panel);padding:.7rem .95rem .85rem;margin:.3rem 0 1.1rem}
  .cc-todo>h2{margin:.1rem 0 .15rem;font-size:1.1rem;display:flex;align-items:center;gap:.5rem}
  .cc-tcount{font-size:.74rem;font-weight:400;color:var(--accent);background:var(--accent-soft);border-radius:999px;padding:.05rem .55rem}
  .cc-tlist{list-style:none;margin:.4rem 0 0;padding:0;display:flex;flex-direction:column;gap:.5rem}
  .cc-tli{display:flex;gap:.5rem;align-items:flex-start;font-size:.9rem}
  .cc-tli[hidden]{display:none}
  .cc-tcheck{color:var(--muted);line-height:1.45;font-size:.95rem}
  .cc-tbody{flex:1;min-width:0}
  .cc-ttitle{font-weight:600;display:flex;flex-wrap:wrap;align-items:center;gap:.35rem}
  .cc-tnote{color:var(--muted);font-size:.82rem;font-weight:400;margin-top:.12rem;line-height:1.42}
  .cc-tli.cc-done{opacity:.5}.cc-tli.cc-done .cc-ttitle{text-decoration:line-through}
  .cc-tdone-h{list-style:none;font-size:.68rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-top:.35rem;border-top:1px dashed var(--border);padding-top:.45rem}
  .cc-prio{font-size:.62rem;text-transform:uppercase;letter-spacing:.03em;font-weight:700;padding:.02rem .4rem;border-radius:999px;white-space:nowrap}
  .cc-prio-high{background:hsl(0 70% 55% / .15);color:hsl(0 62% 46%);border:1px solid hsl(0 70% 55% / .45)}
  .cc-prio-med{background:hsl(35 80% 55% / .15);color:hsl(35 72% 38%);border:1px solid hsl(35 80% 55% / .45)}
  .cc-prio-low{background:hsl(215 25% 55% / .12);color:var(--muted);border:1px solid var(--border)}
  /* app-map view */
  .cc-appmap{display:grid;grid-template-columns:repeat(auto-fill,minmax(20rem,1fr));gap:.6rem;margin-top:1rem}
  .cc-appcard{border:1px solid var(--border);border-left:3px solid hsl(var(--dot,215) 60% 50%);border-radius:8px;padding:.55rem .7rem;background:var(--panel)}
  .cc-aphead{display:flex;flex-wrap:wrap;align-items:center;gap:.45rem;margin-bottom:.15rem}
  .cc-apmeta{font-size:.76rem;color:var(--muted);font-variant-numeric:tabular-nums}
  .cc-aplatest,.cc-apopen,.cc-apnext{font-size:.85rem;margin-top:.28rem;line-height:1.35}
  .cc-aplabel{font-size:.6rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-right:.35rem}
  .cc-aplatest a{color:var(--fg);text-decoration:none;font-weight:600}
  .cc-aplatest a:hover{color:var(--accent)}
  .cc-apnext{color:var(--muted)}
  .cc-apbacklog{font-size:.72rem;color:var(--accent);background:var(--accent-soft);border-radius:999px;padding:.02rem .45rem;white-space:nowrap}
</style></head>
<body><main class="report"><header><p class="kicker"><a class="cc-home" href="../embed-demo.html" title="Seeing e^z — live embedded applets in a host article">↗ embed demo</a> · cross-branch session hub</p>
<h1>Session control center</h1>
<dl class="meta"><div><dt>Scope</dt><dd>${sessions.size} sessions · ${reports.length} reports · ${branchSet.size} branches · ${catSet.size} categories</dd></div>
<div><dt>Generated</dt><dd>${new Date().toISOString().slice(0, 16).replace("T", " ")} · <code>build-sessions.mjs</code></dd></div></dl>
<p class="lineage">Filter to a category with the buttons (or click any chip); group by app / branch / status / month, sort, or switch to a global timeline. The active filter lives in the URL (<code>#cat=…</code>), so it's shareable. Cards list every app a session touched. Provenance = slug folder.</p></header>
<div class="body"><div class="content">
${todoHtml}${startHere}<div class="cc-tools">
  <input id="q" type="search" placeholder="filter by branch / title / status / app / session…" autocomplete="off">
  <label>group <select id="groupby">
    <option value="app">app</option><option value="branch">branch</option>
    <option value="status">status</option><option value="month">month</option><option value="none">none</option>
  </select></label>
  <label>sort <select id="sortby">
    <option value="date-desc">newest</option><option value="date-asc">oldest</option>
    <option value="app">app</option><option value="title">title</option>
  </select></label>
  <span class="cc-seg"><button id="view-cards" class="active" type="button">Cards</button><button id="view-map" type="button" title="Per-app rollup: latest · risk · open · next">App map</button><button id="view-timeline" type="button">Timeline</button><button id="view-refl" type="button" title="Aggregated end-of-session self-reflections (exit interviews)">Reflections${reflCount ? ` (${reflCount})` : ""}</button></span>
</div>
<div class="cc-fbar" id="cc-fbar">${catBar}</div>
<div id="cc-list">
${cardsHtml}</div>
</div></div></main>
<script>
  var CAT = ${JSON.stringify(CAT_LABELS)};
  var HUE = ${JSON.stringify(Object.fromEntries(Object.entries(CATEGORIES).map(([k, v]) => [k, v.hue ?? 215])))};
  var SIG = ${JSON.stringify(SIGNALS)};
  var listEl = document.getElementById("cc-list");
  var ALL = Array.prototype.slice.call(listEl.querySelectorAll(".cc-session"));
  var q = document.getElementById("q"), gb = document.getElementById("groupby"), sb = document.getElementById("sortby");
  var bCards = document.getElementById("view-cards"), bMap = document.getElementById("view-map"), bTl = document.getElementById("view-timeline"), bRefl = document.getElementById("view-refl");
  var fbtns = Array.prototype.slice.call(document.querySelectorAll("#cc-fbar .cc-fbtn"));
  var view = "cards";
  var REFL_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NONE: 4, "": 5 };
  function reflBadge(lv){ if (!lv) return "";
    var cls = lv==="CRITICAL"||lv==="HIGH" ? "badge-bad" : lv==="MEDIUM" ? "badge-warn" : "badge-ok";
    return '<span class="badge '+cls+'">follow-up: '+esc(lv)+'</span>'; }
  function activeCat(){ var m = (location.hash || "").match(/cat=([^&]+)/); return m ? decodeURIComponent(m[1]) : ""; }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function catChip(key, hue){ return '<a class="cat" style="--c:'+hue+'" href="#cat='+encodeURIComponent(key)+'">'+esc(CAT[key]||key)+'</a>'; }
  function sigChip(k){ var s = SIG[k]; return s ? '<span class="sig" style="--c:'+s.hue+'">'+esc(s.label)+'</span>' : ""; }
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
  // The top "To-do" + "Start here" panels filter by the active category too, so a
  // category view doubles as that app's project map. Items with no category hide
  // under a specific filter; empty columns/panels collapse.
  var TLI = Array.prototype.slice.call(document.querySelectorAll(".cc-tli"));
  var DLI = Array.prototype.slice.call(document.querySelectorAll(".cc-dli"));
  function inCat(apps, cat){ return !cat || (" " + (apps || "") + " ").indexOf(" " + cat + " ") !== -1; }
  function filterPanels(cat){
    TLI.forEach(function(li){ li.hidden = !inCat(li.dataset.apps, cat); });
    DLI.forEach(function(li){ li.hidden = !inCat(li.dataset.apps, cat); });
    document.querySelectorAll(".cc-dcol").forEach(function(c){ c.hidden = !c.querySelector(".cc-dli:not([hidden])"); });
    var sh = document.querySelector(".cc-starthere"); if (sh) sh.hidden = !sh.querySelector(".cc-dli:not([hidden])");
    var td = document.querySelector(".cc-todo"); if (td) td.hidden = !td.querySelector(".cc-tli:not([hidden]):not(.cc-done)");
    var dh = document.querySelector(".cc-tdone-h"); if (dh) dh.hidden = !document.querySelector(".cc-tli.cc-done:not([hidden])");
  }
  function render(){
    var t = q.value.trim().toLowerCase(), cat = activeCat();
    fbtns.forEach(function(b){ b.classList.toggle("active", (b.dataset.cat || "") === cat); });
    filterPanels(cat);
    var cards = ALL.filter(function(c){
      if (t && c.dataset.hay.indexOf(t) === -1) return false;
      if (cat && (" " + c.dataset.apps + " ").indexOf(" " + cat + " ") === -1) return false;
      return true;
    });
    listEl.innerHTML = "";
    if (!cards.length){ listEl.innerHTML = '<p class="cc-empty">No sessions match.</p>'; return; }
    if (view === "map"){ renderAppMap(cards); return; }
    if (view === "timeline"){ renderTimeline(cards); return; }
    if (view === "refl"){ renderReflections(cards); return; }
    cards.sort(cmp);
    var g = gb.value;
    if (g === "none"){ cards.forEach(function(c){ listEl.appendChild(c); }); return; }
    var order = [], bucket = {};
    cards.forEach(function(c){ var k = groupKey(c); if (!bucket[k]){ bucket[k] = []; order.push(k); } bucket[k].push(c); });
    order.forEach(function(k){
      var members = bucket[k];
      var h = document.createElement("div"); h.className = "cc-ghead";
      var lbl = g === "app"
        ? catChip(k, members[0].dataset.hue)
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
        + '<div class="tl-head">'+catChip(d.cat, d.hue)+' '+statusBadge(d.status)+' <code>'+esc(d.short)+'</code></div>'
        + '<h3><a href="'+esc(d.href)+'">'+esc(d.title)+'</a></h3>';
      ol.appendChild(li);
    });
    listEl.appendChild(ol);
  }
  function renderReflections(cards){
    // Exit-interview digest: only sessions that shipped a self-reflection, sorted
    // by follow-up severity (CRITICAL→NONE) then newest. Reflection HTML is cloned
    // from each card's inert <template>.
    var items = cards.filter(function(c){ return c.dataset.refl === "1"; });
    items.sort(function(a, b){
      return (REFL_RANK[a.dataset.level||""] - REFL_RANK[b.dataset.level||""]) || b.dataset.date.localeCompare(a.dataset.date);
    });
    if (!items.length){ listEl.innerHTML = '<p class="cc-empty">No self-reflections in this selection.</p>'; return; }
    items.forEach(function(c){
      var d = c.dataset, tpl = c.querySelector(".cc-refl-data");
      var sec = document.createElement("section"); sec.className = "cc-refl"; sec.style.setProperty("--dot", d.hue);
      sec.innerHTML = '<div class="cc-rhead">'+catChip(d.cat, d.hue)+' '+statusBadge(d.status)+' '+reflBadge(d.level)
        + ' <span class="cc-date">'+esc(d.date)+'</span> <code>'+esc(d.short)+'</code></div>'
        + '<h3><a href="'+esc(d.href)+'">'+esc(d.title)+'</a></h3>';
      var body = document.createElement("div"); body.className = "cc-rbody";
      if (tpl) body.appendChild(tpl.content.cloneNode(true));
      sec.appendChild(body); listEl.appendChild(sec);
    });
  }
  function renderAppMap(cards){
    // Per-app project map: roll the (filtered) sessions up by every app they touch,
    // then show each app's latest activity, risk (worst follow-up), open items
    // (session signals + backlog count), and next action. Sorted worst-risk first,
    // then most-recently-active.
    var groups = {};
    cards.forEach(function(c){ (c.dataset.apps||"").split(" ").filter(Boolean).forEach(function(a){ (groups[a]=groups[a]||[]).push(c); }); });
    var apps = Object.keys(groups);
    if (!apps.length){ listEl.innerHTML = '<p class="cc-empty">No apps match.</p>'; return; }
    var todos = Array.prototype.slice.call(document.querySelectorAll(".cc-tli:not(.cc-done)"));
    function todoCount(app){ return todos.filter(function(li){ return (" "+(li.dataset.apps||"")+" ").indexOf(" "+app+" ")!==-1; }).length; }
    function latestDate(list){ return list.reduce(function(m,c){ return c.dataset.date>m?c.dataset.date:m; }, ""); }
    function risk(list){ var best="", br=9; list.forEach(function(c){ var r=REFL_RANK[c.dataset.level||""]; if(r<br){br=r;best=c.dataset.level||"";} }); return best; }
    apps.sort(function(a,b){ return (REFL_RANK[risk(groups[a])||""]-REFL_RANK[risk(groups[b])||""]) || latestDate(groups[b]).localeCompare(latestDate(groups[a])); });
    var wrap = document.createElement("div"); wrap.className = "cc-appmap";
    apps.forEach(function(app){
      var list = groups[app].slice().sort(function(a,b){ return b.dataset.date.localeCompare(a.dataset.date); });
      var latest = list[0], hue = HUE[app]!=null?HUE[app]:215;
      var sset = {}; list.forEach(function(c){ (c.dataset.signals||"").split(" ").filter(Boolean).forEach(function(s){ sset[s]=1; }); });
      var sigs = Object.keys(sset).map(sigChip).join(" ");
      var tc = todoCount(app), rlv = risk(list);
      var nx = latest.dataset.next || (list.filter(function(c){return c.dataset.next;})[0]||{dataset:{}}).dataset.next || "";
      var open = []; if (sigs) open.push(sigs); if (tc) open.push('<span class="cc-apbacklog">'+tc+' backlog</span>');
      var art = document.createElement("article"); art.className = "cc-appcard"; art.style.setProperty("--dot", hue);
      art.innerHTML =
        '<div class="cc-aphead">'+catChip(app,hue)
          +'<span class="cc-apmeta">'+list.length+(list.length>1?" sessions":" session")+' · '+esc(latestDate(list).slice(0,10))+'</span>'
          +((rlv==="HIGH"||rlv==="CRITICAL")?(' '+reflBadge(rlv)):'')+'</div>'
        +'<div class="cc-aplatest"><span class="cc-aplabel">latest</span> <a href="'+esc(latest.dataset.href)+'">'+esc(latest.dataset.title)+'</a></div>'
        +(open.length?'<div class="cc-apopen"><span class="cc-aplabel">open</span> '+open.join(" ")+'</div>':'')
        +(nx?'<div class="cc-apnext"><span class="cc-aplabel">next</span> '+esc(nx)+'</div>':'');
      wrap.appendChild(art);
    });
    listEl.appendChild(wrap);
  }
  function setView(v){ view = v;
    bCards.classList.toggle("active", v==="cards"); bMap.classList.toggle("active", v==="map"); bTl.classList.toggle("active", v==="timeline"); bRefl.classList.toggle("active", v==="refl");
    gb.disabled = v!=="cards"; render(); }
  q.addEventListener("input", render); gb.addEventListener("change", render); sb.addEventListener("change", render);
  bCards.addEventListener("click", function(){ setView("cards"); }); bMap.addEventListener("click", function(){ setView("map"); });
  bTl.addEventListener("click", function(){ setView("timeline"); });
  bRefl.addEventListener("click", function(){ setView("refl"); });
  window.addEventListener("hashchange", render);   // filter buttons + chips set #cat=…
  render();
</script></body></html>
`);

const mb = (imgBytes / (1024 * 1024)).toFixed(2);
console.log(`built: ${reports.length} reports · ${sessions.size} sessions · ${branchSet.size} branches · ${catSet.size} categories → docs/sessions/converted/ + control-center.html`);
console.log(`screenshots: ${imgCount} carried · ${mb} MB (budget readout — see prune-assets.mjs to trim)`);
