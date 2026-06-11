# Plan — the prioritized roadmap

The ordered view of everything outstanding, established 2026-06-11 (session
`review-todo-prioritize-g66uqj`). Detail lives in the source trackers — this
file only ranks; keep both in sync when an item lands:

- `docs/redesign/IN-PROGRESS.md` — the chrome ledger (open gaps + decision log)
- `IDEAS.md` — the particle-viewer backlog (mostly shipped; sketches stay for the record)
- `docs/FUTURE_APPS.md` — scoped candidates for the next wave of apps
- `CLAUDE.md` → *Known Issues and Technical Debt*

## Now — high leverage, do first

1. **Hardware phone pass** on the chrome overhaul (action strip, hints,
   fullscreen panels, split views). Everything was verified headlessly at
   390×844 only; this is the cheapest way to de-risk the largest recent change.
2. **P3 — `ViewDef.hud`**: design the HUD contract against TopologyWalk's
   *actual* overlay inventory (MovePad + mini-map + captions), reusing the
   `.am-view-overlay` layer PR D laid down. Unblocks: legitimizing the MovePad
   HUDs, Plane Transform's hint *arming* draw mode, and the P3-deferred polish.
3. **Polygon Worlds path-demonstration redesign** — the only HIGH follow-up
   flag in the session digest (`polygon-worlds-spherical-p2` S05: "the path
   demonstration must be redesigned").

## Next — feature backlog, in order

Small and self-contained first; each is one session or less unless noted.

1. **Correspondence zoom-lock** — viewport zoom-lock toggle between the linked
   Mandelbrot/Julia windows.
2. **Gallery search** — a filter input over the cards (no UI exists yet).
3. **Saved-layout management** — replace `window.prompt` naming; add
   rename/reorder/export.
4. **Keyboard window management** — move/dock/cycle windows without a pointer
   (the one a11y gap left after Phase 6).
5. **Embeds phase 2** — the `s=` catch-all param + the "Embed this view" share
   dialog (docs/EMBEDS.md).
6. **P4b — phone fullscreen dock access** (deferred by three-hats ruling).
7. **Skin-aware canvas palettes** — engines keep their own colors today; only
   chrome + `--viz-bg` follow the skin. Cross-engine, bigger than it looks.
8. **Phone landscape spec** + sheet/card polish (one sheet at a time,
   no card drag-reorder).

## Decisions needed before work can start

- **Archetype icon collisions** (chrome-wide): same glyph for different panels
  within a tier. Options registered in IN-PROGRESS; the vocabulary is frozen,
  so this needs a deliberate ruling, not code.
- **Stable Marriage Tier 5** (preference falsification) — explicitly awaiting
  a product decision (`gale-shapley-strategy` handoff).
- **IDEAS.md big two** — the unified channel-mapping control (deliberately a
  dedicated effort) and the custom-`f` expression compiler (stretch). Both are
  re-architectures; schedule deliberately, don't bolt on.

## Later — the next app wave (docs/FUTURE_APPS.md)

1. **`lib/spectral` first** — the shared symmetric eigensolver +
   graph-Laplacian builders + spectrum-strip readout. It unifies apps 8–10 and
   ties 11 in; building any spectral app before it duplicates work.
2. Then the spectral wave: **Eigenvalues & Spectra → Fourier Analysis → Heat
   Kernel → Clustering** (each consumes `lib/spectral`).
3. The emergence wave, any order: **Cellular Automata · Firefly
   Synchronization · Murmurations · Ant Colonies · Glassy Networks**.
4. **GAS** — blocked on its source repo.

## Standing engineering chores

- Keep `npm run lint` green alongside `npm run build` (ESLint adopted
  2026-06-11; lint-only — **no Prettier**, a repo-wide reformat would be
  hostile to the parallel-branch workflow). The ~60 baseline warnings
  (`exhaustive-deps`, `no-explicit-any`) are accepted; don't add new ones.
- `scripts/probe-*.mjs` share `scripts/probe-lib.mjs`; new probes should too.
- **Vite major upgrade** (5 → current): clears the two remaining `npm audit`
  moderates (esbuild dev-server advisory — local dev only). Breaking change;
  do it as its own verified chore, not inside another PR. The rollup high
  advisory was already fixed in place 2026-06-11.

## Recently closed debt (2026-06-11 session)

Orphans deleted (`lib/ParticleDisplay.ts`, `lib/R2Mapping.ts`,
`src/materials/`), empty stubs deleted (`requirements.txt`, `run/setup.sh`),
deploy.yml duplicate step (already fixed; stale entry), `Readme.tsx` output
sanitized (DOMPurify), the rollup high audit advisory fixed, ESLint adopted
(0 errors), `scripts/probe-lib.mjs` extracted (all five probes share it),
authored-layout dev validation added (`validateLayouts` — panels under the
rail band), and AGENTS.md / ARCHITECTURE.md / IDEAS.md / CLAUDE.md doc rot
fixed. The old PLAN.md (bootstrap-era steps, all done or abandoned) was
replaced by this file.
