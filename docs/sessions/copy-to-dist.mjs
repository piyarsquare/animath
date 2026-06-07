#!/usr/bin/env node
/* Copy the committed session reports into dist/sessions/ so they deploy to
   GitHub Pages at /animath/sessions/ — reachable, but deliberately kept "to the
   side": nothing in the app links to them, and each page is marked noindex so
   search engines skip it. (A robots.txt would not help: for a project Pages site
   crawlers only honour piyarsquare.github.io/robots.txt, which this repo doesn't
   own — so per-page <meta robots> is the reliable lever.)

   Runs as the last step of `npm run build`. Source files are never modified; the
   noindex tag is injected only into the copied artifacts. Copies .html/.css/.js,
   skipping templates (_*.html), .gitkeep and the .mjs tooling. The dashboard
   (index.html) is whatever build-index.mjs last committed. */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const sessionsDir = dirname(fileURLToPath(import.meta.url));
const distSessions = join(sessionsDir, "..", "..", "dist", "sessions");

const NOINDEX = '<meta name="robots" content="noindex, nofollow">';
const COPY_EXT = new Set([".html", ".css", ".js"]);
const skip = (name) => name.startsWith("_") || name === ".gitkeep" || name.endsWith(".mjs");

let copied = 0;
function walk(srcDir, outDir) {
  let entries;
  try { entries = readdirSync(srcDir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (skip(e.name)) continue;
    const src = join(srcDir, e.name);
    const out = join(outDir, e.name);
    if (e.isDirectory()) { walk(src, out); continue; }
    if (!e.isFile() || !COPY_EXT.has(extname(e.name).toLowerCase())) continue;
    mkdirSync(outDir, { recursive: true });
    if (extname(e.name).toLowerCase() === ".html") {
      let html = readFileSync(src, "utf8");
      if (!/name=["']robots["']/i.test(html)) {
        html = html.replace(/<head>/i, `<head>\n  ${NOINDEX}`);
      }
      writeFileSync(out, html);
    } else {
      copyFileSync(src, out);
    }
    copied++;
  }
}

walk(sessionsDir, distSessions);
console.log(`sessions → dist/sessions: ${copied} file(s) copied (noindex).`);
