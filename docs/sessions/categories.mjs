/* Canonical category taxonomy for animath session reports.
 *
 * Shared by build-sessions.mjs (control center) and render-report.mjs (per-report
 * "App" meta), so a report's category label looks identical everywhere.
 *
 * Keys mirror the app slugs in src/apps.ts (the hash with its leading "/" dropped),
 * plus three cross-cutting tokens for work that isn't a single app:
 *   chrome   — the AppShell / global framework (top bar, drawer, routing)
 *   engine   — shared libraries under src/lib (particle engine, nbody, …)
 *   general  — sessions infra, build tooling, docs, cross-cutting chores
 *
 * `hue` drives the chip color (an HSL hue 0–360); `general` renders neutral.
 */
export const CATEGORIES = {
  "complex-particles": { label: "Complex Particles", hue: 265 },
  "plane-transform":   { label: "Plane Transform",   hue: 205 },
  "fractals":          { label: "Fractals",          hue: 25  },
  "correspondence":    { label: "Mandelbrot ↔ Julia", hue: 315 },
  "topology-walk":     { label: "Topology Walk",     hue: 150 },
  "trinary":           { label: "Trinary System",    hue: 45  },
  "stable-marriage":   { label: "Stable Marriage",   hue: 340 },
  "agentic-sorting":   { label: "Agentic Sorting",   hue: 95  },
  "stable-matching":   { label: "Stable Matching",   hue: 355 },
  "polygon-worlds":    { label: "Polygon Worlds",    hue: 175 },
  "chrome":            { label: "Chrome / Shell",    hue: 220 },
  "engine":            { label: "Engine / lib",      hue: 285 },
  "general":           { label: "General",           hue: 215, gray: true },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES);

// label / alias → key, so frontmatter may say "Stable Marriage", "stable marriage",
// or the slug directly and still resolve.
const ALIAS = {};
for (const [key, { label }] of Object.entries(CATEGORIES)) {
  ALIAS[key] = key;
  ALIAS[label.toLowerCase()] = key;
  ALIAS[label.toLowerCase().replace(/[^a-z0-9]+/g, "-")] = key;
}
Object.assign(ALIAS, {
  shell: "chrome", framework: "chrome", appshell: "chrome",
  lib: "engine", particles: "engine", nbody: "engine",
  docs: "general", infra: "general", tooling: "general", sessions: "general",
  "gale-shapley": "stable-marriage", marriage: "stable-marriage",
  matching: "stable-matching", topology: "topology-walk",
  mobius: "topology-walk", klein: "topology-walk",
  // legacy src/animations/<App> names whose kebab form ≠ the route slug
  "trinary-stars": "trinary",
  "fractals-gpu": "fractals", "fractals2-d": "fractals", "fractals-cpu": "fractals",
});

// Strip a trailing 5-char mixed-case branch suffix (e.g. "-ar9zA") to the short name.
export const shortName = (slug) => {
  const m = String(slug || "").match(/^(.*)-([A-Za-z0-9]{5})$/);
  return m && /[A-Z]/.test(m[2]) && /[a-z]/.test(m[2]) ? m[1] : String(slug || "");
};

// Explicit slug→category for short names that don't contain a category key.
const SLUG_OVERRIDES = {
  "better-reports": ["general"],
  "headless-webgl-cloud": ["general"],
  "session-report-screenshots": ["general"],
  "session-control-center": ["general"],
  "menu-bar": ["chrome"],
  "klein-bottle-fix": ["topology-walk"],
  "complex-sheet": ["polygon-worlds"],
  "particle-viewer-ideas-priority": ["complex-particles"],
  "gale-shapley-strategy": ["stable-marriage", "stable-matching"],
};

/** Infer categories from a (short) branch slug when no `app:` is declared. */
export function inferFromSlug(slug) {
  const short = shortName(slug);
  if (SLUG_OVERRIDES[short]) return [...SLUG_OVERRIDES[short]];
  const hits = CATEGORY_KEYS.filter((k) => k !== "general" && short.includes(k));
  return hits.length ? hits : ["general"];
}

/**
 * Resolve a report's categories: the explicit `app:` frontmatter (a string, which
 * may list several comma/space-separated values) takes precedence; otherwise infer
 * from the slug. Always returns a non-empty, de-duplicated, valid key list.
 */
export function normalizeApps(appField, slug) {
  const raw = (appField == null ? "" : String(appField)).trim();
  if (raw && !/^(null|none|tbd|\?|name or null)$/i.test(raw)) {
    const keys = [];
    for (const tok of raw.split(/[,/]+|\s{2,}/).map((s) => s.trim()).filter(Boolean)) {
      const norm = kebab(tok);
      const key = ALIAS[tok.toLowerCase()] || ALIAS[norm] || (CATEGORIES[norm] ? norm : null);
      if (key && !keys.includes(key)) keys.push(key);
    }
    if (keys.length) return keys;
  }
  return inferFromSlug(slug);
}

export const catLabel = (key) => (CATEGORIES[key] || {}).label || key;
export const catHue = (key) => (CATEGORIES[key] || {}).hue ?? 215;

// Slugify a token to kebab-case. Splits camelCase / PascalCase / acronym
// boundaries first, so legacy src/animations/<App> values (StableMatching,
// ComplexParticles, FractalsGPU) become stable-matching / complex-particles /
// fractals-gpu rather than collapsing to one lowercase word.
const kebab = (s) =>
  String(s)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")     // camelCase boundary: …sM… → …s-M…
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")  // acronym boundary: GPUViewer → GPU-Viewer
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** One inline-styled category chip. */
export function appChip(key) {
  const c = CATEGORIES[key];
  const gray = c && c.gray ? " cat-general" : "";
  return `<span class="cat${gray}" style="--c:${catHue(key)}">${esc(catLabel(key))}</span>`;
}

/** A run of chips for a key list. */
export const appChips = (keys) => (keys || []).map(appChip).join(" ");
