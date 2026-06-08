#!/usr/bin/env node
/* Report (and optionally trim) the disk budget of committed session screenshots.
 *
 *   node docs/sessions/prune-assets.mjs                 # dry-run: total + per-branch + oldest
 *   node docs/sessions/prune-assets.mjs --older-than 120 --apply
 *   node docs/sessions/prune-assets.mjs --budget-mb 25  --apply
 *
 * Screenshots live in docs/sessions/{progress,handoff}/<slug>/assets/**. They are
 * committed (so the read-only cross-branch build can carry them), which means the
 * repo grows over time. This is the cleanup hook: by default it only *reports* the
 * budget; with --apply it `git rm`s the oldest images until under --budget-mb,
 * and/or any image older than --older-than days. Wire it to a scheduled GitHub
 * Action later if the budget needs enforcing automatically.
 *
 * "Age" is the last-commit date of the file (falls back to mtime).
 */
import { execFileSync } from "node:child_process";
import { readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));            // docs/sessions
const REPO = join(ROOT, "..", "..");
const IMG = /\.(png|jpe?g|gif|webp|svg|avif)$/i;
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const APPLY = process.argv.includes("--apply");
const OLDER = Number(arg("--older-than", NaN));                  // days
const BUDGET = Number(arg("--budget-mb", NaN)) * 1024 * 1024;   // bytes

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && IMG.test(e.name)) out.push(p);
  }
  return out;
}

const files = [];
for (const kind of ["progress", "handoff"]) files.push(...walk(join(ROOT, kind)));

const now = Date.now();
const items = files.map((p) => {
  const size = statSync(p).size;
  let iso = "";
  try { iso = execFileSync("git", ["log", "-1", "--format=%cI", "--", p], { cwd: REPO, encoding: "utf8" }).trim(); } catch { /* uncommitted */ }
  const t = iso ? Date.parse(iso) : statSync(p).mtimeMs;
  return { p, rel: relative(REPO, p), size, ageDays: (now - t) / 86400000 };
});

const total = items.reduce((s, i) => s + i.size, 0);
const mb = (b) => (b / (1024 * 1024)).toFixed(2);
const byBranch = new Map();   // slug → bytes (path: docs/sessions/<kind>/<slug>/…)
for (const i of items) { const slug = i.rel.split("/")[3] || "?"; byBranch.set(slug, (byBranch.get(slug) || 0) + i.size); }

console.log(`session screenshots: ${items.length} files · ${mb(total)} MB total`);
for (const [slug, b] of [...byBranch.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${mb(b).padStart(7)} MB  ${slug}`);
const oldest = [...items].sort((a, b) => b.ageDays - a.ageDays).slice(0, 5);
if (oldest.length) { console.log(`oldest:`); for (const i of oldest) console.log(`  ${i.ageDays.toFixed(0).padStart(4)}d  ${mb(i.size)} MB  ${i.rel}`); }

// Selection for trimming
let doomed = [];
if (!Number.isNaN(OLDER)) doomed.push(...items.filter((i) => i.ageDays > OLDER));
if (!Number.isNaN(BUDGET) && total > BUDGET) {
  let running = total;
  for (const i of [...items].sort((a, b) => b.ageDays - a.ageDays)) {
    if (running <= BUDGET) break;
    if (!doomed.includes(i)) { doomed.push(i); running -= i.size; }
  }
}
doomed = [...new Set(doomed)];

if (!doomed.length) { console.log(`\nnothing to trim (pass --older-than <days> and/or --budget-mb <n>).`); process.exit(0); }
console.log(`\n${APPLY ? "removing" : "would remove"} ${doomed.length} file(s) · ${mb(doomed.reduce((s, i) => s + i.size, 0))} MB:`);
for (const i of doomed) console.log(`  ${i.rel}`);
if (APPLY) {
  execFileSync("git", ["rm", "-q", "--", ...doomed.map((i) => i.rel)], { cwd: REPO, stdio: "inherit" });
  console.log(`\nremoved. Review with 'git status' and commit.`);
} else {
  console.log(`\n(dry-run — re-run with --apply to git rm these.)`);
}
