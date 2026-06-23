# Screenshot tour — "see the whole site"

`scripts/tour.mjs` (`npm run tour`) drives the **real built app** in headless
Chromium and walks **every app in both desktop and phone form factors**,
exercising each app's top-bar **modes** and **layouts**, then writes one PNG per
combination plus an `index.html` contact sheet you can open to eyeball the whole
UI at once.

There's no GPU in CI, so — like `scripts/shoot.mjs` — it renders WebGL through
ANGLE + SwiftShader (software WebGL2). It's the broad-coverage companion to
`shoot.mjs` (one route) and the `probe-*.mjs` interaction probes.

## Run it

```bash
# One shot — builds if needed, starts its own preview server, tears it down:
npm run tour

# Or reuse a server you already have (same pattern as the probes):
npm run build && (npm run preview &) && npm run tour
```

Output lands in `screenshots/` (git-ignored):

```
screenshots/
├── index.html                       # contact sheet (search + viewport filter)
├── manifest.json                    # every shot + metadata (route/mode/layout/ok)
└── <app-slug>/
    ├── desktop__<mode>__<layout>.png
    └── mobile__<mode>__<view>.png
```

Open `screenshots/index.html` in a browser to scan everything.

## What gets captured

- **Routes** are read from `src/apps.ts` (the canonical registry) so the tour
  never drifts as apps are added, plus the gallery, the legacy
  `#/fractals-cpu`, and the chrome-less `#/embed/*` applets.
- **Modes** and **layouts** are *discovered from the live DOM* — the top-bar
  mode pills and the Layout menu — not hardcoded, so a new layout is captured
  automatically. The gallery varies by its category filter chips instead.
- **Form factors**: desktop (1280×800) and phone (390×844, below the 740px
  re-chrome breakpoint). Each route loads in an isolated browser context so
  every app starts from its true defaults (no persisted layout bleed).

## Tuning (env vars)

| Var          | Default                          | Meaning                                            |
|--------------|----------------------------------|----------------------------------------------------|
| `ONLY`       | _(all)_                          | comma list — only routes whose hash/slug matches   |
| `VIEWPORTS`  | `desktop,mobile`                 | which form factors                                 |
| `SKIN`       | _(default skin)_                 | seed a skin (`phosphor`, `blueprint`, …) site-wide |
| `WAIT_MS`    | `2200`                           | settle after navigation (canvas apps)              |
| `VARIANT_MS` | `650`                            | settle after a mode/layout switch                  |
| `OUT_DIR`    | `screenshots/`                   | output directory                                   |
| `BASE_URL`   | `http://localhost:4173/animath/` | server to drive (else one is started)              |
| `NO_EMBEDS`  | _(off)_                          | skip the `#/embed/*` routes                        |
| `DEBUG`      | _(off)_                          | surface page errors / console noise                |

```bash
ONLY=trinary,fractals npm run tour        # just those apps
SKIN=phosphor npm run tour                 # the whole site in one skin
VIEWPORTS=mobile npm run tour              # phone only
```

## CI

The **Screenshot tour** workflow (`.github/workflows/screenshots.yml`) runs the
tour on demand (Actions tab → *Run workflow*) and uploads `screenshots/` as a
downloadable artifact. Inputs let you narrow to one app (`only`), pick form
factors (`viewports`), or seed a skin (`skin`) — so you can "see the whole site"
without a local GPU.
