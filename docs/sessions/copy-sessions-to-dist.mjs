#!/usr/bin/env node
/* Copy the built session site into dist/sessions/ for the GitHub Pages deploy.
 *
 * Run after `npm run sessions` (which writes control-center.html + converted/**)
 * and after `vite build` (which creates dist/). Copies the control center, the
 * rendered reports, and the shared assets, injecting a <meta robots noindex> into
 * every page so the reports stay reachable but off to the side (nothing in the app
 * links to them). The .preview.html files reference ../../../report.css, which
 * resolves correctly under dist/sessions/.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));      // docs/sessions
const DIST = join(ROOT, "..", "..", "dist", "sessions");
const NOINDEX = '<meta name="robots" content="noindex, nofollow">';

let n = 0;
function copy(srcFile, outFile) {
  mkdirSync(dirname(outFile), { recursive: true });
  if (extname(srcFile).toLowerCase() === ".html") {
    let html = readFileSync(srcFile, "utf8");
    if (!/name=["']robots["']/i.test(html)) html = html.replace(/<head>/i, `<head>\n  ${NOINDEX}`);
    writeFileSync(outFile, html);
  } else copyFileSync(srcFile, outFile);
  n++;
}
function walk(srcDir, outDir) {
  for (const e of readdirSync(srcDir, { withFileTypes: true })) {
    const s = join(srcDir, e.name), o = join(outDir, e.name);
    if (e.isDirectory()) walk(s, o);
    else if (e.isFile() && [".html", ".css", ".js"].includes(extname(e.name).toLowerCase())) copy(s, o);
  }
}

for (const f of ["control-center.html", "report.css", "report.js"]) {
  if (existsSync(join(ROOT, f))) copy(join(ROOT, f), join(DIST, f));
}
if (existsSync(join(ROOT, "converted"))) walk(join(ROOT, "converted"), join(DIST, "converted"));

console.log(`sessions → dist/sessions: ${n} file(s) (noindex).`);
