# Screenshot tour — "see the whole site"

`scripts/tour.mjs` (`npm run tour`) drives the **real built app** in headless
Chromium and walks the apps in **desktop and phone form factors**, exercising
each app's top-bar **modes** and **layouts** (and, optionally, every **skin**),
then writes one PNG per captured state plus an `index.html` contact sheet you
can open to eyeball the whole UI at once.

There's no GPU in CI, so — like `scripts/shoot.mjs` — it renders WebGL through
ANGLE + SwiftShader (software WebGL2). It's the broad-coverage companion to
`shoot.mjs` (one route) and the `probe-*.mjs` interaction probes.

## Run it

```bash
# Whole site, "standard" detail — builds if needed, starts/stops its own server:
npm run tour

# Reuse a server you already have (same pattern as the probes):
npm run build && (npm run preview &) && npm run tour

# Discover what's available (routes + skins + detail levels), then exit:
npm run tour -- --list
```

Output lands in `screenshots/` (git-ignored):

```
screenshots/
├── index.html                              # contact sheet (search + viewport/skin filters)
├── manifest.json                           # every shot + metadata
└── <app-slug>/
    ├── desktop__[skin__]<mode>__<layout>.png
    └── mobile__[skin__]<mode>__<view>.png
```

> **Note** when passing flags through npm you need the `--` separator:
> `npm run tour -- trinary --detail everything`. Calling the script directly
> (`node scripts/tour.mjs trinary --detail everything`) doesn't.

## 1. Target a specific app (or the gallery)

Pass one or more **targets** as positional args (or `ONLY=…`): each is a
substring matched against a route's hash/slug.

```bash
npm run tour -- gallery            # just the landing gallery
npm run tour -- trinary            # just Trinary System
npm run tour -- fractals           # matches Fractals AND fractals-cpu
npm run tour -- argand trinary     # several at once
npm run tour -- --list             # see every slug/hash/name
```

## 2. Levels of detail (`--detail`, overview → everything)

App targets capture more or fewer mode/layout combinations as you turn the dial
up. Each level is a superset of the one before it:

| Level          | What it captures                                                              |
|----------------|------------------------------------------------------------------------------|
| `overview`     | the pristine default only — default mode × default layout                     |
| `standard`     | + every **layout** (at the default mode) + every other **mode** (its default) |
| `everything` ⃰ | the full cross-product — every mode × every layout                           |

⃰ default — the headline `npm run tour` stays "as complete as possible"; dial
down with `--detail`. The gallery uses its category filter chips instead of
modes/layouts (`overview` = the *All* view; otherwise every category).

```bash
npm run tour -- trinary --detail overview     # one hero shot per form factor
npm run tour -- trinary --detail everything   # every mode × every layout
npm run tour --detail overview                 # a fast thumbnail of the whole site
```

## 3. Skins / themes (`--skins`, explore the five themes)

By default the tour uses the default skin (no skin segment in filenames). Add
the **skin dimension** to capture pages in one, several, or all themes — the
skin id becomes part of the filename and the contact sheet gains a skin filter.

```bash
npm run tour -- --skins all                          # the whole site in all 5 skins
npm run tour -- argand --skins phosphor,blueprint    # one app, two themes
npm run tour -- gallery --skins all --detail overview
SKIN=neon npm run tour                                # single skin (env form)
```

Skins (ids from `src/chrome/skins.tsx`): `dark` (Observatory, default), `light`
(Paper), `neon` (Spectrum), `blueprint`, `phosphor`. Names work too
(`--skins Observatory,Paper`).

## All options

Every flag has an env equivalent (the flag wins). Flags also accept
`--flag=value`.

| Flag / env                     | Default                          | Meaning                                            |
|--------------------------------|----------------------------------|----------------------------------------------------|
| _positional_ / `--only` / `ONLY` | _(all)_                        | target routes by hash/slug substring               |
| `--detail` / `DETAIL`          | `standard`                       | `overview` · `standard` · `everything`             |
| `--skins` / `SKINS` (`--skin`/`SKIN`) | _(default skin)_          | `all`, or a comma list of skin ids/names           |
| `--viewport(s)` / `VIEWPORTS`  | `desktop,mobile`                 | which form factors                                 |
| `--wait` / `WAIT_MS`           | `2200`                           | settle after navigation (canvas apps)              |
| `--variant-wait` / `VARIANT_MS`| `650`                            | settle after a mode/layout switch                  |
| `--out` / `OUT_DIR`            | `screenshots/`                   | output directory                                   |
| `--base-url` / `BASE_URL`      | `http://localhost:4173/animath/` | server to drive (else one is started)              |
| `--no-embeds` / `NO_EMBEDS`    | _(off)_                          | skip the `#/embed/*` routes                        |
| `--debug` / `DEBUG`            | _(off)_                          | surface page errors / console noise                |
| `--list`                       | —                                | print routes + skins + detail levels, then exit    |

Routes are read from `src/apps.ts` and skins from `src/chrome/skins.tsx` (the
canonical registries), so the tour never drifts as apps/skins are added. Modes
and layouts are *discovered from the live DOM*. Each (route, viewport, skin)
loads in an isolated browser context so apps start from their true defaults.

## CI

The **Screenshot tour** workflow (`.github/workflows/screenshots.yml`) runs the
tour on demand (Actions tab → *Run workflow*) and uploads `screenshots/` as a
downloadable artifact. Inputs mirror the flags above: `only` (target), `detail`,
`viewports`, `skins` — so you can "see the whole site" (or one app, at any
detail, in any theme) without a local GPU.
