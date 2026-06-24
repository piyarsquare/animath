#!/usr/bin/env node
/* docs/sessions/lint-sessions.mjs — validate session reports against the report
 * contract (REPORT_STYLE.md + the self-reflection protocol).
 *
 * WHY THIS EXISTS. The control center's digests are built by scraping the reports
 * with the regexes in build-sessions.mjs (frontmatter, the `## Self-reflection`
 * Follow-up level, the `### emoji type · HH:MM — what` timeline). When a report
 * drifts off the contract the scraper drops it *silently* — a typo'd `signals:`
 * token never renders, a non-ASCII hyphen in "Follow-up value" vanishes from the
 * Reflections digest, an invented timeline type breaks the rail. This has already
 * forced one hand-backfill of the whole corpus (control-center-category-filter,
 * 2026-06-10) and the same drift recurred afterward (off-spec types in
 * polygon-walk-continue). This linter makes those breakages visible instead.
 *
 * It reads the *working tree* (this branch's view of every committed report) and
 * reports problems; it never edits anything. Default exit is 0 (advisory) so it
 * can run alongside `npm run sessions` without blocking; pass --strict to exit 1
 * when there are errors (for a future CI gate, once the corpus is clean).
 *
 * Usage:
 *   node docs/sessions/lint-sessions.mjs              # advisory, all reports
 *   node docs/sessions/lint-sessions.mjs --strict     # exit 1 on any error
 *   node docs/sessions/lint-sessions.mjs --errors     # print errors only
 *   node docs/sessions/lint-sessions.mjs path/to.md … # lint just these files
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeApps, normalizeSignals } from "./categories.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url)); // docs/sessions
const REPO = join(ROOT, "..", "..");

// ── the contract enums (kept in sync with REPORT_STYLE.md) ──────────────────
const KINDS = new Set(["progress", "handoff", "three-hats", "plan"]);
const STATUSES = new Set([
  "in-progress", "completed", "design-only", "investigation-only", "proposed", "executed", "stopped",
]);
// near-miss status spellings the builder renders as a neutral (not "done") badge.
const STATUS_SOFT = new Set(["complete", "done", "in progress"]);
// canonical build values; a few legacy synonyms are tolerated with a nudge.
const BUILD_OK = new Set(["passed", "failed", "unknown", "n/a"]);
const BUILD_SOFT = new Set(["passing", "not-run", "not run", "na", "green"]);
const FOLLOWUP_OK = new Set(["null", "low", "medium", "high", "none", "critical"]);
const TIMELINE_TYPES = new Set(["decision", "code", "finding", "blocker", "milestone"]);
// kinds that must carry a scraper-parseable Self-reflection section.
const NEEDS_REFLECTION = new Set(["handoff", "three-hats"]);

// The exact level regex build-sessions.mjs uses — keep identical so "the linter
// passes" means "the digest will read it".
const LEVEL_RE = /follow[\s‐-―-]?up\s+value:?\s*(?:[*_]+\s*)*(CRITICAL|HIGH|MEDIUM|LOW|NONE)/i;
// the strict canonical form (ASCII hyphen, no bold/italic around the level)
const LEVEL_CANON = /\*\*Follow-up value:\*\*\s+(CRITICAL|HIGH|MEDIUM|LOW|NONE)\b/;
// A *loose* probe for a Follow-up line, to catch one that exists but won't parse.
const LEVEL_LOOSE = /follow.{0,3}up\s+value/i;

// ── tiny flat-YAML frontmatter parser (matches the builder's expectations) ───
function parseFrontmatter(text) {
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const block = text.slice(3, end).trim();
  const fm = {};
  for (const line of block.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const i = line.indexOf(":");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    fm[key] = val;
  }
  return { fm, bodyOffset: end + 4 };
}

// ── findings collection ─────────────────────────────────────────────────────
let totalErr = 0, totalWarn = 0;
const perFile = [];

function lintFile(absPath) {
  const rel = relative(REPO, absPath);
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  let text;
  try { text = readFileSync(absPath, "utf8"); } catch { err("unreadable"); finish(); return; }

  const folderSlug = basename(dirname(absPath));
  const kindFromPath = basename(dirname(dirname(absPath))); // progress | handoff

  const parsed = parseFrontmatter(text);
  if (!parsed) { err("missing or malformed YAML frontmatter (no leading --- … --- block)"); finish(); return; }
  const { fm, bodyOffset } = parsed;
  const body = text.slice(bodyOffset);

  // required keys
  for (const k of ["kind", "session", "date", "title", "slug", "status", "build"]) {
    if (!fm[k]) err(`frontmatter missing required key \`${k}\``);
  }

  // slug must match the folder (provenance — drives dedup)
  if (fm.slug && fm.slug !== folderSlug) {
    err(`slug \`${fm.slug}\` ≠ folder \`${folderSlug}\` (breaks provenance/dedup)`);
  }

  // Frozen records: a shelved (status: stopped) report is a historical artifact of
  // a stopped line of work. It may carry a kind/build value from a since-retired or
  // experimental workflow (e.g. the provisional explore-concept skill's lens/dialogue
  // reports), so it is exempt from the evolving enum/section contract. Structure and
  // provenance — frontmatter parses, required keys, slug — are still checked above;
  // the builder still scrapes it (kind falls back to a generic template).
  if (fm.status === "stopped") { finish(); return; }

  // kind
  if (fm.kind && !KINDS.has(fm.kind)) err(`kind: \`${fm.kind}\` not in {${[...KINDS].join(", ")}}`);

  // session format
  if (fm.session && !/^\d{4}-\d{2}-\d{2}-S\d{2,}/.test(fm.session)) {
    warn(`session \`${fm.session}\` not in YYYY-MM-DD-SNN form`);
  }

  // status / build / followup enums
  if (fm.status && !STATUSES.has(fm.status)) {
    if (STATUS_SOFT.has(fm.status.toLowerCase())) warn(`status: \`${fm.status}\` — use \`completed\` (the builder only greens \`completed\`/\`executed\`)`);
    else err(`status: \`${fm.status}\` not in {${[...STATUSES].join(", ")}}`);
  }
  if (fm.build) {
    const b = fm.build.toLowerCase();
    if (!BUILD_OK.has(b)) {
      if (BUILD_SOFT.has(b)) warn(`build: \`${fm.build}\` — prefer passed | failed | unknown | n/a`);
      else err(`build: \`${fm.build}\` not a recognized value (passed | failed | unknown | n/a)`);
    }
  }
  if (fm.followup != null && fm.followup !== "") {
    const f = fm.followup.toLowerCase();
    if (!FOLLOWUP_OK.has(f)) warn(`followup: \`${fm.followup}\` is free text — schema wants null | low | medium | high (use TODO.md / Self-reflection for prose)`);
  }

  // app + signals tokens must resolve, or they silently vanish from the dashboard
  if (fm.app && !/^(null|none|tbd|\?)$/i.test(fm.app.trim())) {
    for (const tok of fm.app.split(/[,/]+|\s{2,}/).map((s) => s.trim()).filter(Boolean)) {
      // normalizeApps falls back to slug-inference when a token resolves to nothing;
      // pass a sentinel slug that infers to `general`, so a token that "resolves"
      // only to general (without being a general-ish word) is really unresolved.
      const resolved = normalizeApps(tok, "zzz-nomatch");
      const generalish = /^(general|infra|tooling|sessions|chore)$/i.test(tok);
      if (resolved.length === 1 && resolved[0] === "general" && !generalish) {
        warn(`app token \`${tok}\` doesn't resolve to a category — chip/grouping falls back (add it to categories.mjs)`);
      }
    }
  }
  if (fm.signals && !/^(null|none|tbd)$/i.test(fm.signals.trim())) {
    const declared = fm.signals.split(/[,/]+|\s+/).map((s) => s.trim()).filter(Boolean);
    const resolved = new Set(normalizeSignals(fm.signals));
    // map back: which declared tokens produced nothing?
    for (const tok of declared) {
      if (!normalizeSignals(tok).length) {
        warn(`signals token \`${tok}\` not in the closed vocabulary — silently ignored (needs-dan | phone-needed | visual-unverified | not-live)`);
      }
    }
    void resolved;
  }

  // ── Self-reflection (the Reflections digest depends on it) ────────────────
  const reflM = /^##\s+Self[-\s]?reflection\s*$/im.exec(body);
  if (NEEDS_REFLECTION.has(fm.kind)) {
    if (!reflM) {
      err(`kind \`${fm.kind}\` has no \`## Self-reflection\` section (drops out of the Reflections digest)`);
    } else {
      const rest = body.slice(reflM.index + reflM[0].length);
      const nextH2 = rest.search(/^##\s+/m);
      const section = (nextH2 === -1 ? rest : rest.slice(0, nextH2));
      if (!LEVEL_RE.test(section)) {
        if (LEVEL_LOOSE.test(section)) {
          err(`Follow-up value present but unparseable even by the tolerant scraper — check for an HTML-wrapped level or a stray character`);
        } else {
          err(`Self-reflection has no \`**Follow-up value:** <LEVEL>\` line (LEVEL ∈ CRITICAL/HIGH/MEDIUM/LOW/NONE)`);
        }
      } else if (!LEVEL_CANON.test(section)) {
        warn(`Follow-up value parses but isn't canonical \`**Follow-up value:** <LEVEL>\` (non-ASCII hyphen or bold/italic-wrapped level — works now, but keep it canonical)`);
      }
    }
  }

  // ── timeline entries (### emoji type · HH:MM — what) ──────────────────────
  // progress reports carry the timeline under "Working notes"; handoffs may too.
  const headings = [...body.matchAll(/^###\s+(.+)$/gm)];
  for (const h of headings) {
    const line = h[1].trim();
    const m = /^(.+?)\s+·\s+([^—]+?)\s+—\s*(.+)?$/.exec(line);
    if (!m) continue; // not a timeline-style heading (plain ### subsection) — skip
    const lead = m[1].trim();             // "🟢 code"
    const type = lead.split(/\s+/).pop(); // last token
    if (!TIMELINE_TYPES.has(type)) {
      warn(`timeline type \`${type}\` not in {${[...TIMELINE_TYPES].join(", ")}} — heading: "${line.slice(0, 60)}"`);
    }
    // a **Why:** line should follow within the next few lines
    const after = body.slice(h.index + h[0].length, h.index + h[0].length + 400);
    if (!/\*\*Why:?\*\*/i.test(after)) {
      warn(`timeline entry missing a **Why:** line — "${line.slice(0, 60)}"`);
    }
  }

  // ── verification signal heuristic (Phase 2): a handoff that says "headless"
  // but declares no verification signal is the W1 under-count we keep hitting.
  if (fm.kind === "handoff") {
    const sigs = new Set(normalizeSignals(fm.signals || ""));
    const saysHeadless = /\bheadless\b|verified by reasoning|visually unverified|not verified on (a )?(real )?(device|phone)/i.test(body);
    if (saysHeadless && !sigs.has("visual-unverified") && !sigs.has("phone-needed")) {
      warn(`body mentions headless/unverified but declares no \`visual-unverified\`/\`phone-needed\` signal (under-reports verification risk)`);
    }
  }

  finish();

  function finish() {
    totalErr += errors.length;
    totalWarn += warnings.length;
    if (errors.length || warnings.length) perFile.push({ rel, errors, warnings });
  }
}

// ── collect files ───────────────────────────────────────────────────────────
function walk(dir, acc) {
  let ents;
  try { ents = readdirSync(dir); } catch { return; }
  for (const e of ents) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (e.endsWith(".md") && !e.startsWith("_template")) acc.push(p);
  }
}

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const errorsOnly = args.includes("--errors");
const fileArgs = args.filter((a) => !a.startsWith("--"));

const files = [];
if (fileArgs.length) {
  for (const f of fileArgs) files.push(join(REPO, f));
} else {
  walk(join(ROOT, "progress"), files);
  walk(join(ROOT, "handoff"), files);
}
files.sort();
for (const f of files) lintFile(f);

// ── report ──────────────────────────────────────────────────────────────────
const RED = "\x1b[31m", YEL = "\x1b[33m", DIM = "\x1b[2m", RST = "\x1b[0m", BLD = "\x1b[1m";
for (const { rel, errors, warnings } of perFile) {
  if (errorsOnly && !errors.length) continue;
  console.log(`\n${BLD}${rel}${RST}`);
  for (const m of errors) console.log(`  ${RED}✗ error${RST}  ${m}`);
  if (!errorsOnly) for (const m of warnings) console.log(`  ${YEL}⚠ warn ${RST}  ${m}`);
}

console.log(
  `\n${BLD}lint-sessions${RST}: ${files.length} reports · ` +
  `${totalErr ? RED : DIM}${totalErr} error${totalErr === 1 ? "" : "s"}${RST} · ` +
  `${totalWarn ? YEL : DIM}${totalWarn} warning${totalWarn === 1 ? "" : "s"}${RST}` +
  (strict ? "" : `  ${DIM}(advisory — pass --strict to fail on errors)${RST}`),
);

process.exit(strict && totalErr ? 1 : 0);
