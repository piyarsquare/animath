/* Convert a hand-authored HTML session report (our own template structure) into
 * Markdown + YAML frontmatter following REPORT_STYLE.md. Targets the known
 * classes (report-meta island, <section><h2>, .timeline/li.tl, .callout, .badge,
 * tables, pre) and falls back to inline HTML for anything unrecognized — so the
 * output is always valid Markdown that renders on GitHub and through our renderer.
 */

const META_RE = /<script[^>]*class=["']report-meta["'][^>]*>([\s\S]*?)<\/script>/i;
const EMOJI = { decision: "🟣", code: "🟢", finding: "🔵", blocker: "🔴", milestone: "🟡" };
const ALERT = { note: "NOTE", warn: "WARNING", decision: "IMPORTANT", gotcha: "CAUTION" };

const decode = (s) => s
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&mdash;/g, "—");

// inline HTML → markdown inline
function inline(h) {
  let s = h
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, t) => `[${inline(t)}](${href})`)
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => `**${inline(t)}**`)
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => `*${inline(t)}*`)
    .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_, t) => "`" + decode(t.replace(/<[^>]+>/g, "")) + "`")
    .replace(/<span[^>]*class="badge[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, (_, t) => inline(t))
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "");
  return decode(s).replace(/\s+/g, " ").trim();
}

const cellInline = (h) => inline(h).replace(/\|/g, "\\|");

function convertTable(inner) {
  const rows = [...inner.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(r =>
    [...r[1].matchAll(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(c => cellInline(c[2])));
  if (!rows.length) return "";
  const head = rows[0];
  const body = rows.slice(1);
  const line = (cells) => `| ${cells.join(" | ")} |`;
  return ["", line(head), `| ${head.map(() => "---").join(" | ")} |`, ...body.map(line), ""].join("\n");
}

function convertList(inner, ordered) {
  const items = [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(m => m[1]);
  return "\n" + items.map((it, i) => `${ordered ? i + 1 + "." : "-"} ${inline(it)}`).join("\n") + "\n";
}

function convertTimeline(ol) {
  const items = [...ol.matchAll(/<li class="tl"[^>]*data-type="([^"]*)"[^>]*>([\s\S]*?)<\/li>/gi)];
  let out = "";
  for (const [, type, body] of items) {
    const time = (body.match(/<p class="tl-time">([\s\S]*?)<\/p>/i) || [, ""])[1].trim();
    const title = inline((body.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i) || [, ""])[1]);
    const why = (body.match(/<p class="why">([\s\S]*?)<\/p>/i) || [, ""])[1].replace(/<strong>\s*Why:\s*<\/strong>/i, "");
    const paras = [...body.matchAll(/<p(?![^>]*class="(?:tl-time|why)")[^>]*>([\s\S]*?)<\/p>/gi)].map(p => inline(p[1])).filter(Boolean);
    out += `\n### ${EMOJI[type] || ""} ${type} · ${time} — ${title}\n`;
    if (why.trim()) out += `**Why:** ${inline(why)}\n`;
    for (const p of paras) out += `\n${p}\n`;
  }
  return out + "\n";
}

export function htmlToMarkdown(html) {
  let meta = {};
  const mm = html.match(META_RE);
  if (mm) { try { meta = JSON.parse(mm[1]); } catch { /* ignore */ } }

  // body = the .content region (template marks it with <!-- /.content -->)
  let content = (html.match(/<div class="content">([\s\S]*?)<!--\s*\/\.content\s*-->/i) ||
    html.match(/<div class="content">([\s\S]*)<\/div>\s*<\/div>/i) || [, ""])[1];

  content = content
    .replace(/<div class="toolbar">[\s\S]*?<\/div>/gi, "")
    .replace(/<nav class="toc"[\s\S]*?<\/nav>/gi, "")
    .replace(/<ol class="timeline">([\s\S]*?)<\/ol>/gi, (_, ol) => convertTimeline(ol))
    .replace(/<p class="callout[^"]*callout-([a-z]+)"[^>]*>([\s\S]*?)<\/p>/gi, (_, kind, t) => {
      const body = t.replace(/<span class="callout-label">([\s\S]*?)<\/span>/i, (_, l) => `**${inline(l)}** `);
      return `\n> [!${ALERT[kind] || "NOTE"}]\n> ${inline(body)}\n`;
    })
    .replace(/<table>([\s\S]*?)<\/table>/gi, (_, t) => convertTable(t))
    .replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, c) => "\n```\n" + decode(c.replace(/<[^>]+>/g, "")) + "\n```\n")
    .replace(/<\/?section[^>]*>/gi, "")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, t) => `\n## ${inline(t)}\n`)
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, t) => `\n### ${inline(t)}\n`)
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, t) => `\n#### ${inline(t)}\n`)
    .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, t) => convertList(t, false))
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, t) => convertList(t, true))
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, t) => `\n${inline(t)}\n`)
    .replace(/<\/?div[^>]*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // tidy whitespace
  content = decode(content).split("\n").map(l => l.replace(/[ \t]+$/g, "")).join("\n")
    .replace(/\n{3,}/g, "\n\n").trim();

  const fm = ["kind", "session", "date", "title", "branch", "slug", "status", "build", "followup", "pr", "app"]
    .filter(k => k in meta)
    .map(k => {
      let v = meta[k];
      if (v == null) v = "null";
      else if (typeof v === "object") v = v.url || v.num || JSON.stringify(v);
      return `${k}: ${v}`;
    }).join("\n");

  return `---\n${fm}\n---\n\n# ${meta.title || ""}\n\n${content}\n`;
}

// CLI: node convert-html.mjs <file.html>  → prints Markdown to stdout
if (process.argv[1] && process.argv[1].endsWith("convert-html.mjs")) {
  const { readFileSync } = await import("node:fs");
  const f = process.argv[2];
  if (!f) { console.error("usage: convert-html.mjs <file.html>"); process.exit(1); }
  process.stdout.write(htmlToMarkdown(readFileSync(f, "utf8")));
}
