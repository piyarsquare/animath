---
kind: plan
session: 2026-07-19-S01
date: 2026-07-19
title: Contrast & focus-color proposal (agent audit — awaiting Dan's approval)
branch: claude/gallery-entrance
slug: gallery-entrance
status: proposed
build: n/a
followup: null
pr: null
app: chrome
next: Dan approves/adjusts per-skin values; then apply as one-line -n/-lt/-dk family edits + the --focus consumed token.
---

# Contrast audit & per-skin token proposal

**Date:** 2026-07-20 · **Scope:** `src/chrome/theme.css` (all 8 skins x 3 modes, theming v2) · **Status: PROPOSAL — no source files were modified.**

## Method

- Tokens were parsed from the `[data-theme="…"]` blocks and resolved per mode by the
  family convention: `native` → `--x-n`, `light` → `--x-lt` (fallback `-n`), `dark` → `--x-dk`
  (fallback `-n`) — exactly what the shared `[data-scheme]` blocks do (theme.css:317–349).
- `rgba()` values (notably `--panel`) were alpha-composited over `--bg` before measuring,
  so "vs panel" means the panel surface as actually rendered over the stage.
- Ratios are WCAG 2.x relative-luminance contrast. Thresholds: **4.5:1** normal text,
  **3:1** large/bold text, UI components, graphics, and focus indicators.
- Proposed values keep the token's **hue and saturation** and move only lightness (HSL),
  by the minimal step that clears the threshold against **every** surface the token sits on
  (e.g. `--accent` must clear both `--bg` and `--panel`).
- Modes marked *(= native)* alias the native palette (the skin ships no `-lt`/`-dk`
  companion), so a fix to the `-n` family member fixes both.
- Line references are to the 2026-07-20 working tree (a parallel session is appending
  chrome CSS after line 548; the token blocks at theme.css:84–349 are identical to HEAD,
  so all measurements hold for both).

### Measured pairs and the roles that justify each threshold

| Pair | Threshold | Why |
|---|---|---|
| `--fg` vs `--bg`, `--panel` | 4.5 | Primary text everywhere (`body`, `.am-title`, panel labels) |
| `--dim` vs `--bg`, `--panel` | 4.5 | Secondary text — `.am-gcard-blurb` (theme.css:627), `.am-hint` 11.5px (theme.css:529), idle `.am-pill` (theme.css:456) |
| `--dim-2` vs `--panel` | 4.5 | Meta text — `.am-gal-foot` 11px (theme.css:630), `.am-lay-group` 10px group labels (theme.css:904); also disabled verbs (theme.css:831) and resize grips (decorative, exempt) |
| `--accent` vs `--bg`, `--panel` | 4.5 | Small text — `.am-gcard-cat` 10.5px uppercase (theme.css:624), `.am-row-val` 11.5px slider readout (theme.css:449), `.am-sub` formula (theme.css:441), `.am-gal-kicker` (theme.css:582), markdown links (ControlPanel.css:443); also the 2px focus ring (theme.css:1037) |
| `--accent-fg` vs `--accent` | 4.5 | Text/glyphs on accent fills — `.am-pill.am-on` (theme.css:458), `.am-action-btn.am-primary` (theme.css:832), brand mark (theme.css:406), checkbox check (theme.css:507) |
| `--success`, `--danger` vs `--panel` | 4.5 | Status text — StableMatching stability metric (stableMatching.css:28–31), Trinary Lyapunov readout (TrinaryStars.tsx:741) |
| `--data-1..7` vs `--viz-bg` | 3.0 | Data marks are graphics, not text |

> The external review's Paper measurement reproduces exactly: Paper native `--accent`
> `#b67d10` = **3.03:1** vs `--bg` and **3.50:1** vs `--panel` — below 4.5 for the
> 10.5–11.5px text it colors, and marginal as a focus ring on panels.

## Summary — failures per skin x mode

| Skin | Mode | Failing pairs | Worst offender | Focus ring (accent >= 3:1 vs bg & panel) |
|---|---|---:|---|---|
| Observatory (`dark`) | native | 1 | `--dim-2` 3.22:1 (need 4.5) | OK (12.46) |
| Observatory (`dark`) | light | 5 | `--dim-2` 2.50:1 (need 4.5) | **FAIL** (2.88) → `#b3820b` |
| Observatory (`dark`) | dark *(= native)* | 1 | `--dim-2` 3.22:1 (need 4.5) | OK (12.46) |
| Paper (`light`) | native | 6 | `--dim-2` 2.97:1 (need 4.5) | OK (3.03) |
| Paper (`light`) | light *(= native)* | 6 | `--dim-2` 2.97:1 (need 4.5) | OK (3.03) |
| Paper (`light`) | dark | 1 | `--dim-2` 2.84:1 (need 4.5) | OK (7.56) |
| Spectrum (`neon`) | native | 1 | `--dim-2` 3.32:1 (need 4.5) | OK (12.32) |
| Spectrum (`neon`) | light | 6 | `--dim-2` 2.59:1 (need 4.5) | **FAIL** (2.96) → `#0e9c88` |
| Spectrum (`neon`) | dark *(= native)* | 1 | `--dim-2` 3.32:1 (need 4.5) | OK (12.32) |
| Blueprint (`blueprint`) | native | 1 | `--dim-2` 3.49:1 (need 4.5) | OK (13.10) |
| Blueprint (`blueprint`) | light | 4 | `--dim-2` 2.61:1 (need 4.5) | OK (6.29) |
| Blueprint (`blueprint`) | dark *(= native)* | 1 | `--dim-2` 3.49:1 (need 4.5) | OK (13.10) |
| Phosphor (`phosphor`) | native | 1 | `--dim-2` 3.24:1 (need 4.5) | OK (13.49) |
| Phosphor (`phosphor`) | light | 9 | `--dim-2` 2.49:1 (need 4.5) | **FAIL** (2.92) → `#2e7a2e` |
| Phosphor (`phosphor`) | dark *(= native)* | 1 | `--dim-2` 3.24:1 (need 4.5) | OK (13.49) |
| Daylight (`daylight`) | native | 4 | `--dim-2` 2.62:1 (need 4.5) | OK (4.18) |
| Daylight (`daylight`) | light *(= native)* | 4 | `--dim-2` 2.62:1 (need 4.5) | OK (4.18) |
| Daylight (`daylight`) | dark | 1 | `--dim-2` 2.87:1 (need 4.5) | OK (6.00) |
| Primary (`primary`) | native | 7 | `--accent` 1.41:1 (need 4.5) | **FAIL** (1.41) → `#a78507` |
| Primary (`primary`) | light *(= native)* | 7 | `--accent` 1.41:1 (need 4.5) | **FAIL** (1.41) → `#a78507` |
| Primary (`primary`) | dark | 1 | `--dim-2` 3.13:1 (need 4.5) | OK (12.18) |
| Mirage (`mirage`) | native | 1 | `--dim-2` 3.29:1 (need 4.5) | OK (9.31) |
| Mirage (`mirage`) | light | 8 | `--dim-2` 2.54:1 (need 4.5) | **FAIL** (2.62) → `#d16c28` |
| Mirage (`mirage`) | dark *(= native)* | 1 | `--dim-2` 3.29:1 (need 4.5) | OK (9.31) |

**Systemic finding:** `--dim-2` fails 4.5:1 on the panel surface in **all 24 skin x mode
combinations** (2.49–3.49:1). It does double duty as real meta text (gallery footer, layout
group labels) and as disabled/decorative color (where WCAG exempts it). The proposals below
raise it to 4.5:1; an alternative worth considering is keeping `--dim-2` as the
disabled/decorative voice and moving the two real-text consumers to `--dim`.

---

## Observatory (`data-theme="dark"`)

### Mode: native (edit the `-n` family members (also fixes the aliased dark mode))

| Token | Against | Original | Ratio | Proposed | New ratio | Need |
|---|---|---|---:|---|---:|---:|
| `--dim-2` | `--panel` | `#5d667d` | 3.22 | `#747e98` | 4.56 | 4.5 |

**Where these tokens show up:**
- `--dim-2`: Meta text — `.am-gal-foot` 11px (theme.css:630), `.am-lay-group` 10px group labels (theme.css:904); also disabled verbs (theme.css:831) and resize grips (decorative, exempt)

### Mode: light (edit the `-lt` companions)

| Token | Against | Original | Ratio | Proposed | New ratio | Need |
|---|---|---|---:|---|---:|---:|
| `--dim-2` | `--panel` | `#9aa3b6` | 2.50 | `#697691` | 4.51 | 4.5 |
| `--accent` | `--bg` | `#b8860b` | 2.88 | `#8e6708` | 4.53 | 4.5 |
| `--accent` | `--panel` | `#b8860b` | 3.22 | `#8e6708` | 5.07 | 4.5 |
| `--accent-fg` | `--accent` | `#ffffff` | 3.25 | `#282828` | 4.53 | 4.5 |
| `--success` | `--panel` | `#2e8d56` | 4.10 | `#2b8551` | 4.53 | 4.5 |

*Knock-on check:* existing `--accent-fg` `#ffffff` on the **proposed** accent `#8e6708` = 5.13:1 — passes, keep it. (The `--accent-fg` row above is only needed if the accent is kept unchanged — adopting the proposed accent supersedes it.)

**Where these tokens show up:**
- `--dim-2`: Meta text — `.am-gal-foot` 11px (theme.css:630), `.am-lay-group` 10px group labels (theme.css:904); also disabled verbs (theme.css:831) and resize grips (decorative, exempt)
- `--accent`: Small text — `.am-gcard-cat` 10.5px uppercase (theme.css:624), `.am-row-val` 11.5px slider readout (theme.css:449), `.am-sub` formula (theme.css:441), `.am-gal-kicker` (theme.css:582), markdown links (ControlPanel.css:443); also the 2px focus ring (theme.css:1037)
- `--accent-fg`: Text/glyphs on accent fills — `.am-pill.am-on` (theme.css:458), `.am-action-btn.am-primary` (theme.css:832), brand mark (theme.css:406), checkbox check (theme.css:507)
- `--success`: Status text — StableMatching stability metric (stableMatching.css:28–31), Trinary Lyapunov readout (TrinaryStars.tsx:741)

### Mode: dark — identical to native (no `-dk` companions authored); the native fixes apply.

## Paper (`data-theme="light"`)

### Mode: native (edit the `-n` family members (also fixes the aliased light mode))

| Token | Against | Original | Ratio | Proposed | New ratio | Need |
|---|---|---|---:|---|---:|---:|
| `--dim-2` | `--panel` | `#9c9484` | 2.97 | `#7d7565` | 4.51 | 4.5 |
| `--accent` | `--bg` | `#b67d10` | 3.03 | `#90630d` | 4.51 | 4.5 |
| `--accent` | `--panel` | `#b67d10` | 3.50 | `#90630d` | 5.22 | 4.5 |
| `--accent-fg` | `--accent` | `#fffdf8` | 3.48 | `#2c1f00` | 4.55 | 4.5 |
| `--success` | `--panel` | `#2e8d56` | 4.10 | `#2b8551` | 4.53 | 4.5 |
| `--data-3` | `--viz-bg` | `#5a9e2e` | 2.98 | `#599d2e` | 3.01 | 3 |

*Knock-on check:* existing `--accent-fg` `#fffdf8` on the **proposed** accent `#90630d` = 5.20:1 — passes, keep it. (The `--accent-fg` row above is only needed if the accent is kept unchanged — adopting the proposed accent supersedes it.)

**Where these tokens show up:**
- `--dim-2`: Meta text — `.am-gal-foot` 11px (theme.css:630), `.am-lay-group` 10px group labels (theme.css:904); also disabled verbs (theme.css:831) and resize grips (decorative, exempt)
- `--accent`: Small text — `.am-gcard-cat` 10.5px uppercase (theme.css:624), `.am-row-val` 11.5px slider readout (theme.css:449), `.am-sub` formula (theme.css:441), `.am-gal-kicker` (theme.css:582), markdown links (ControlPanel.css:443); also the 2px focus ring (theme.css:1037)
- `--accent-fg`: Text/glyphs on accent fills — `.am-pill.am-on` (theme.css:458), `.am-action-btn.am-primary` (theme.css:832), brand mark (theme.css:406), checkbox check (theme.css:507)
- `--success`: Status text — StableMatching stability metric (stableMatching.css:28–31), Trinary Lyapunov readout (TrinaryStars.tsx:741)
- `--data-3`: Discrete data series 3 — marks/strokes on the viz background (graphics, 3:1)

### Mode: light — identical to native (no `-lt` companions authored); the native fixes apply.

### Mode: dark (edit the `-dk` companions)

| Token | Against | Original | Ratio | Proposed | New ratio | Need |
|---|---|---|---:|---|---:|---:|
| `--dim-2` | `--panel` | `#6f6553` | 2.84 | `#92856d` | 4.50 | 4.5 |

**Where these tokens show up:**
- `--dim-2`: Meta text — `.am-gal-foot` 11px (theme.css:630), `.am-lay-group` 10px group labels (theme.css:904); also disabled verbs (theme.css:831) and resize grips (decorative, exempt)

## Spectrum (`data-theme="neon"`)

### Mode: native (edit the `-n` family members (also fixes the aliased dark mode))

| Token | Against | Original | Ratio | Proposed | New ratio | Need |
|---|---|---|---:|---|---:|---:|
| `--dim-2` | `--panel` | `#56648c` | 3.32 | `#6b7aa4` | 4.56 | 4.5 |

**Where these tokens show up:**
- `--dim-2`: Meta text — `.am-gal-foot` 11px (theme.css:630), `.am-lay-group` 10px group labels (theme.css:904); also disabled verbs (theme.css:831) and resize grips (decorative, exempt)

### Mode: light (edit the `-lt` companions)

| Token | Against | Original | Ratio | Proposed | New ratio | Need |
|---|---|---|---:|---|---:|---:|
| `--dim-2` | `--panel` | `#969fc0` | 2.59 | `#6673a3` | 4.56 | 4.5 |
| `--accent` | `--bg` | `#0e9e8a` | 2.96 | `#0b7c6c` | 4.51 | 4.5 |
| `--accent` | `--panel` | `#0e9e8a` | 3.31 | `#0b7c6c` | 5.04 | 4.5 |
| `--accent-fg` | `--accent` | `#ffffff` | 3.35 | `#262626` | 4.52 | 4.5 |
| `--success` | `--panel` | `#0e9e6a` | 3.39 | `#0c8559` | 4.60 | 4.5 |
| `--data-4` | `--viz-bg` | `#c08a1a` | 2.87 | `#ba8619` | 3.04 | 3 |

*Knock-on check:* existing `--accent-fg` `#ffffff` on the **proposed** accent `#0b7c6c` = 5.10:1 — passes, keep it. (The `--accent-fg` row above is only needed if the accent is kept unchanged — adopting the proposed accent supersedes it.)

**Where these tokens show up:**
- `--dim-2`: Meta text — `.am-gal-foot` 11px (theme.css:630), `.am-lay-group` 10px group labels (theme.css:904); also disabled verbs (theme.css:831) and resize grips (decorative, exempt)
- `--accent`: Small text — `.am-gcard-cat` 10.5px uppercase (theme.css:624), `.am-row-val` 11.5px slider readout (theme.css:449), `.am-sub` formula (theme.css:441), `.am-gal-kicker` (theme.css:582), markdown links (ControlPanel.css:443); also the 2px focus ring (theme.css:1037)
- `--accent-fg`: Text/glyphs on accent fills — `.am-pill.am-on` (theme.css:458), `.am-action-btn.am-primary` (theme.css:832), brand mark (theme.css:406), checkbox check (theme.css:507)
- `--success`: Status text — StableMatching stability metric (stableMatching.css:28–31), Trinary Lyapunov readout (TrinaryStars.tsx:741)
- `--data-4`: Discrete data series 4 — marks/strokes on the viz background (graphics, 3:1)

### Mode: dark — identical to native (no `-dk` companions authored); the native fixes apply.

## Blueprint (`data-theme="blueprint"`)

### Mode: native (edit the `-n` family members (also fixes the aliased dark mode))

| Token | Against | Original | Ratio | Proposed | New ratio | Need |
|---|---|---|---:|---|---:|---:|
| `--dim-2` | `--panel` | `#607fb2` | 3.49 | `#7993be` | 4.54 | 4.5 |

**Where these tokens show up:**
- `--dim-2`: Meta text — `.am-gal-foot` 11px (theme.css:630), `.am-lay-group` 10px group labels (theme.css:904); also disabled verbs (theme.css:831) and resize grips (decorative, exempt)

### Mode: light (edit the `-lt` companions)

| Token | Against | Original | Ratio | Proposed | New ratio | Need |
|---|---|---|---:|---|---:|---:|
| `--dim-2` | `--panel` | `#8aa0c4` | 2.61 | `#5676aa` | 4.52 | 4.5 |
| `--success` | `--panel` | `#2e8d56` | 4.08 | `#2b8551` | 4.51 | 4.5 |
| `--data-3` | `--viz-bg` | `#5a9e2e` | 2.96 | `#599c2d` | 3.03 | 3 |
| `--data-4` | `--viz-bg` | `#c08a1a` | 2.73 | `#b68319` | 3.02 | 3 |

**Where these tokens show up:**
- `--dim-2`: Meta text — `.am-gal-foot` 11px (theme.css:630), `.am-lay-group` 10px group labels (theme.css:904); also disabled verbs (theme.css:831) and resize grips (decorative, exempt)
- `--success`: Status text — StableMatching stability metric (stableMatching.css:28–31), Trinary Lyapunov readout (TrinaryStars.tsx:741)
- `--data-3`: Discrete data series 3 — marks/strokes on the viz background (graphics, 3:1)
- `--data-4`: Discrete data series 4 — marks/strokes on the viz background (graphics, 3:1)

### Mode: dark — identical to native (no `-dk` companions authored); the native fixes apply.

## Phosphor (`data-theme="phosphor"`)

### Mode: native (edit the `-n` family members (also fixes the aliased dark mode))

| Token | Against | Original | Ratio | Proposed | New ratio | Need |
|---|---|---|---:|---|---:|---:|
| `--dim-2` | `--panel` | `#3f7355` | 3.24 | `#4d8d68` | 4.55 | 4.5 |

**Where these tokens show up:**
- `--dim-2`: Meta text — `.am-gal-foot` 11px (theme.css:630), `.am-lay-group` 10px group labels (theme.css:904); also disabled verbs (theme.css:831) and resize grips (decorative, exempt)

### Mode: light (edit the `-lt` companions)

| Token | Against | Original | Ratio | Proposed | New ratio | Need |
|---|---|---|---:|---|---:|---:|
| `--dim` | `--bg` | `#5a6347` | 3.61 | `#4d543c` | 4.51 | 4.5 |
| `--dim` | `--panel` | `#5a6347` | 4.46 | `#4d543c` | 5.57 | 4.5 |
| `--dim-2` | `--panel` | `#8a8a6a` | 2.49 | `#60604a` | 4.52 | 4.5 |
| `--accent` | `--bg` | `#2f7d2f` | 2.92 | `#225c22` | 4.55 | 4.5 |
| `--accent` | `--panel` | `#2f7d2f` | 3.60 | `#225c22` | 5.63 | 4.5 |
| `--accent-fg` | `--accent` | `#f3eed8` | 4.40 | `#f5f1de` | 4.52 | 4.5 |
| `--success` | `--panel` | `#2f7d2f` | 3.60 | `#296c29` | 4.51 | 4.5 |
| `--danger` | `--panel` | `#b03a1a` | 4.26 | `#a93819` | 4.52 | 4.5 |
| `--data-4` | `--viz-bg` | `#a8741a` | 2.56 | `#996918` | 3.02 | 3 |

*Knock-on check:* existing `--accent-fg` `#f3eed8` on the **proposed** accent `#225c22` = 6.88:1 — passes, keep it. (The `--accent-fg` row above is only needed if the accent is kept unchanged — adopting the proposed accent supersedes it.)

**Where these tokens show up:**
- `--dim`: Secondary text — `.am-gcard-blurb` (theme.css:627), `.am-hint` 11.5px (theme.css:529), idle `.am-pill` (theme.css:456)
- `--dim-2`: Meta text — `.am-gal-foot` 11px (theme.css:630), `.am-lay-group` 10px group labels (theme.css:904); also disabled verbs (theme.css:831) and resize grips (decorative, exempt)
- `--accent`: Small text — `.am-gcard-cat` 10.5px uppercase (theme.css:624), `.am-row-val` 11.5px slider readout (theme.css:449), `.am-sub` formula (theme.css:441), `.am-gal-kicker` (theme.css:582), markdown links (ControlPanel.css:443); also the 2px focus ring (theme.css:1037)
- `--accent-fg`: Text/glyphs on accent fills — `.am-pill.am-on` (theme.css:458), `.am-action-btn.am-primary` (theme.css:832), brand mark (theme.css:406), checkbox check (theme.css:507)
- `--success`: Status text — StableMatching stability metric (stableMatching.css:28–31), Trinary Lyapunov readout (TrinaryStars.tsx:741)
- `--danger`: Error/status text — same consumers as success, plus danger buttons
- `--data-4`: Discrete data series 4 — marks/strokes on the viz background (graphics, 3:1)

### Mode: dark — identical to native (no `-dk` companions authored); the native fixes apply.

## Daylight (`data-theme="daylight"`)

### Mode: native (edit the `-n` family members (also fixes the aliased light mode))

| Token | Against | Original | Ratio | Proposed | New ratio | Need |
|---|---|---|---:|---|---:|---:|
| `--dim-2` | `--panel` | `#93a0b4` | 2.62 | `#657792` | 4.51 | 4.5 |
| `--accent` | `--bg` | `#2f6fe0` | 4.18 | `#2568df` | 4.53 | 4.5 |
| `--success` | `--panel` | `#2e8d56` | 4.10 | `#2b8551` | 4.54 | 4.5 |
| `--data-4` | `--viz-bg` | `#e0a82e` | 2.03 | `#ba881c` | 3.00 | 3 |

*Knock-on check:* existing `--accent-fg` `#ffffff` on the **proposed** accent `#2568df` = 5.09:1 — passes, keep it.

**Where these tokens show up:**
- `--dim-2`: Meta text — `.am-gal-foot` 11px (theme.css:630), `.am-lay-group` 10px group labels (theme.css:904); also disabled verbs (theme.css:831) and resize grips (decorative, exempt)
- `--accent`: Small text — `.am-gcard-cat` 10.5px uppercase (theme.css:624), `.am-row-val` 11.5px slider readout (theme.css:449), `.am-sub` formula (theme.css:441), `.am-gal-kicker` (theme.css:582), markdown links (ControlPanel.css:443); also the 2px focus ring (theme.css:1037)
- `--success`: Status text — StableMatching stability metric (stableMatching.css:28–31), Trinary Lyapunov readout (TrinaryStars.tsx:741)
- `--data-4`: Discrete data series 4 — marks/strokes on the viz background (graphics, 3:1)

### Mode: light — identical to native (no `-lt` companions authored); the native fixes apply.

### Mode: dark (edit the `-dk` companions)

| Token | Against | Original | Ratio | Proposed | New ratio | Need |
|---|---|---|---:|---|---:|---:|
| `--dim-2` | `--panel` | `#5b6678` | 2.87 | `#7a869a` | 4.52 | 4.5 |

**Where these tokens show up:**
- `--dim-2`: Meta text — `.am-gal-foot` 11px (theme.css:630), `.am-lay-group` 10px group labels (theme.css:904); also disabled verbs (theme.css:831) and resize grips (decorative, exempt)

## Primary (`data-theme="primary"`)

### Mode: native (edit the `-n` family members (also fixes the aliased light mode))

| Token | Against | Original | Ratio | Proposed | New ratio | Need |
|---|---|---|---:|---|---:|---:|
| `--dim-2` | `--panel` | `#908d82` | 3.29 | `#79766b` | 4.51 | 4.5 |
| `--accent` | `--bg` | `#f5c518` | 1.41 | `#846906` | 4.52 | 4.5 |
| `--accent` | `--panel` | `#f5c518` | 1.62 | `#846906` | 5.20 | 4.5 |
| `--success` | `--panel` | `#149e57` | 3.44 | `#11874b` | 4.53 | 4.5 |
| `--danger` | `--panel` | `#e63327` | 4.28 | `#e3271a` | 4.55 | 4.5 |
| `--data-3` | `--viz-bg` | `#f5c518` | 1.55 | `#b18c08` | 3.01 | 3 |
| `--data-5` | `--viz-bg` | `#e6731f` | 2.92 | `#e56f1a` | 3.01 | 3 |

*Knock-on:* existing `--accent-fg` on the proposed accent `#846906` = 3.54:1 (< 4.5). Pair the accent change with `--accent-fg` → `#efeee9` (4.51:1).

**Where these tokens show up:**
- `--dim-2`: Meta text — `.am-gal-foot` 11px (theme.css:630), `.am-lay-group` 10px group labels (theme.css:904); also disabled verbs (theme.css:831) and resize grips (decorative, exempt)
- `--accent`: Small text — `.am-gcard-cat` 10.5px uppercase (theme.css:624), `.am-row-val` 11.5px slider readout (theme.css:449), `.am-sub` formula (theme.css:441), `.am-gal-kicker` (theme.css:582), markdown links (ControlPanel.css:443); also the 2px focus ring (theme.css:1037)
- `--success`: Status text — StableMatching stability metric (stableMatching.css:28–31), Trinary Lyapunov readout (TrinaryStars.tsx:741)
- `--danger`: Error/status text — same consumers as success, plus danger buttons
- `--data-3`: Discrete data series 3 — marks/strokes on the viz background (graphics, 3:1)
- `--data-5`: Discrete data series 5 — marks/strokes on the viz background (graphics, 3:1)

### Mode: light — identical to native (no `-lt` companions authored); the native fixes apply.

### Mode: dark (edit the `-dk` companions)

| Token | Against | Original | Ratio | Proposed | New ratio | Need |
|---|---|---|---:|---|---:|---:|
| `--dim-2` | `--panel` | `#6a6760` | 3.13 | `#858178` | 4.55 | 4.5 |

**Where these tokens show up:**
- `--dim-2`: Meta text — `.am-gal-foot` 11px (theme.css:630), `.am-lay-group` 10px group labels (theme.css:904); also disabled verbs (theme.css:831) and resize grips (decorative, exempt)

## Mirage (`data-theme="mirage"`)

### Mode: native (edit the `-n` family members (also fixes the aliased dark mode))

| Token | Against | Original | Ratio | Proposed | New ratio | Need |
|---|---|---|---:|---|---:|---:|
| `--dim-2` | `--panel` | `#7d6699` | 3.29 | `#927faa` | 4.54 | 4.5 |

**Where these tokens show up:**
- `--dim-2`: Meta text — `.am-gal-foot` 11px (theme.css:630), `.am-lay-group` 10px group labels (theme.css:904); also disabled verbs (theme.css:831) and resize grips (decorative, exempt)

### Mode: light (edit the `-lt` companions)

| Token | Against | Original | Ratio | Proposed | New ratio | Need |
|---|---|---|---:|---|---:|---:|
| `--dim` | `--bg` | `#7d6699` | 4.21 | `#776192` | 4.56 | 4.5 |
| `--dim-2` | `--panel` | `#ab9ac0` | 2.54 | `#836aa2` | 4.53 | 4.5 |
| `--accent` | `--bg` | `#d97a3a` | 2.62 | `#a55620` | 4.51 | 4.5 |
| `--accent` | `--panel` | `#d97a3a` | 3.03 | `#a55620` | 5.21 | 4.5 |
| `--accent-fg` | `--accent` | `#ffffff` | 3.09 | `#2c2c2c` | 4.52 | 4.5 |
| `--success` | `--panel` | `#2e9d7c` | 3.31 | `#268368` | 4.55 | 4.5 |
| `--data-2` | `--viz-bg` | `#d97a3a` | 2.84 | `#d7732f` | 3.02 | 3 |
| `--data-6` | `--viz-bg` | `#c08a1a` | 2.80 | `#b88419` | 3.04 | 3 |

*Knock-on check:* existing `--accent-fg` `#ffffff` on the **proposed** accent `#a55620` = 5.31:1 — passes, keep it. (The `--accent-fg` row above is only needed if the accent is kept unchanged — adopting the proposed accent supersedes it.)

**Where these tokens show up:**
- `--dim`: Secondary text — `.am-gcard-blurb` (theme.css:627), `.am-hint` 11.5px (theme.css:529), idle `.am-pill` (theme.css:456)
- `--dim-2`: Meta text — `.am-gal-foot` 11px (theme.css:630), `.am-lay-group` 10px group labels (theme.css:904); also disabled verbs (theme.css:831) and resize grips (decorative, exempt)
- `--accent`: Small text — `.am-gcard-cat` 10.5px uppercase (theme.css:624), `.am-row-val` 11.5px slider readout (theme.css:449), `.am-sub` formula (theme.css:441), `.am-gal-kicker` (theme.css:582), markdown links (ControlPanel.css:443); also the 2px focus ring (theme.css:1037)
- `--accent-fg`: Text/glyphs on accent fills — `.am-pill.am-on` (theme.css:458), `.am-action-btn.am-primary` (theme.css:832), brand mark (theme.css:406), checkbox check (theme.css:507)
- `--success`: Status text — StableMatching stability metric (stableMatching.css:28–31), Trinary Lyapunov readout (TrinaryStars.tsx:741)
- `--data-2`: Discrete data series 2 — marks/strokes on the viz background (graphics, 3:1)
- `--data-6`: Discrete data series 6 — marks/strokes on the viz background (graphics, 3:1)

### Mode: dark — identical to native (no `-dk` companions authored); the native fixes apply.

---

## Per-skin `--focus` token strategy

The global focus ring is `:focus-visible { outline: 2px solid var(--accent); }` (theme.css:1037;
also the checkbox at theme.css:518). A focus indicator is a UI component: it needs **>= 3:1**
against the surfaces it appears on (`--bg` and `--panel`). Recommendation: introduce a
consumed `--focus` token in the shared `[data-scheme]` blocks (`--focus: var(--focus-n)` etc.,
defaulting to `var(--accent-…)` per mode) and switch the two outline rules to `var(--focus)`.
Skins whose accent already passes ship **no** `--focus-*` override (the fallback keeps them
on accent, zero cost); the five failing combos (Primary's aliased light mode rides on its
`-n`) author one companion each.

| Skin | Mode | Accent vs bg / panel (min) | Verdict |
|---|---|---:|---|
| Observatory | native | 12.46 | Accent passes >= 3:1 — reuse it (no override needed) |
| Observatory | light | 2.88 | **Propose `--focus-lt: #b3820b`** (min 3.04:1) — or adopt the proposed accent above, which also passes |
| Observatory | dark *(= native)* | 12.46 | Accent passes >= 3:1 — reuse it (no override needed) |
| Paper | native | 3.03 | Accent passes >= 3:1 — reuse it (no override needed) |
| Paper | light *(= native)* | 3.03 | Accent passes >= 3:1 — reuse it (no override needed) |
| Paper | dark | 7.56 | Accent passes >= 3:1 — reuse it (no override needed) |
| Spectrum | native | 12.32 | Accent passes >= 3:1 — reuse it (no override needed) |
| Spectrum | light | 2.96 | **Propose `--focus-lt: #0e9c88`** (min 3.03:1) — or adopt the proposed accent above, which also passes |
| Spectrum | dark *(= native)* | 12.32 | Accent passes >= 3:1 — reuse it (no override needed) |
| Blueprint | native | 13.10 | Accent passes >= 3:1 — reuse it (no override needed) |
| Blueprint | light | 6.29 | Accent passes >= 3:1 — reuse it (no override needed) |
| Blueprint | dark *(= native)* | 13.10 | Accent passes >= 3:1 — reuse it (no override needed) |
| Phosphor | native | 13.49 | Accent passes >= 3:1 — reuse it (no override needed) |
| Phosphor | light | 2.92 | **Propose `--focus-lt: #2e7a2e`** (min 3.03:1) — or adopt the proposed accent above, which also passes |
| Phosphor | dark *(= native)* | 13.49 | Accent passes >= 3:1 — reuse it (no override needed) |
| Daylight | native | 4.18 | Accent passes >= 3:1 — reuse it (no override needed) |
| Daylight | light *(= native)* | 4.18 | Accent passes >= 3:1 — reuse it (no override needed) |
| Daylight | dark | 6.00 | Accent passes >= 3:1 — reuse it (no override needed) |
| Primary | native | 1.41 | **Propose `--focus-n: #a78507`** (min 3.02:1) — or adopt the proposed accent above, which also passes |
| Primary | light *(= native)* | 1.41 | **Propose `--focus-lt: #a78507`** (min 3.02:1) — or adopt the proposed accent above, which also passes |
| Primary | dark | 12.18 | Accent passes >= 3:1 — reuse it (no override needed) |
| Mirage | native | 9.31 | Accent passes >= 3:1 — reuse it (no override needed) |
| Mirage | light | 2.62 | **Propose `--focus-lt: #d16c28`** (min 3.03:1) — or adopt the proposed accent above, which also passes |
| Mirage | dark *(= native)* | 9.31 | Accent passes >= 3:1 — reuse it (no override needed) |

---

## How to apply (the `-n`/`-lt`/`-dk` family convention)

Every proposal above is a one-line edit to an existing family member inside that skin's
`[data-theme="…"]` block in `src/chrome/theme.css` — the shared `[data-scheme]` blocks
(theme.css:84–97, 317–349) already fan the families out to the consumed tokens, so **no
selector changes and no JS changes** are needed for the color fixes:

1. **Native-mode fixes** → edit the `--x-n` member (e.g. Paper's `--accent-n` in
   `[data-theme="light"]`). Skins that alias a mode to native (no companion authored)
   inherit the fix in that mode for free.
2. **Light/dark-companion fixes** → edit the `--x-lt` / `--x-dk` member. All of the
   failing companions already exist (they are authored values, not fallbacks), so these
   are edits, not additions.
3. **`--focus`** is the one addition: add `--focus: var(--focus-n, var(--accent-n))` to the
   native block at theme.css:84, and the `-lt`/`-dk` equivalents to the two mode blocks;
   author `--focus-*` only for the failing combos (Observatory `-lt`, Spectrum `-lt`,
   Phosphor `-lt`, Primary `-n`, Mirage `-lt`), then change theme.css:1037 and :518 to
   `var(--focus)`.
4. **Identity trade-offs to review by eye before adopting:**
   - **Primary (native):** Bauhaus yellow `#f5c518` is unusable as text/focus (1.41:1) but
     is fine as a *fill* behind dark `--accent-fg` ink (its native pattern). Consider keeping
     `#f5c518` for fills and adding the darkened `#846906`-family value only where accent is
     *text* (or as `--focus`), rather than darkening the brand yellow everywhere — the
     minimal-change proposal in the table darkens the token itself and then needs a light
     `--accent-fg`, which changes the skin's character most of any proposal here.
   - **Paper / Observatory-light ambers** darken from `#b67d10`/`#b8860b` to `#90630d`/`#8e6708`:
     same hue, reads as "deep amber ink"; primary-button fills keep their light `--accent-fg`
     (now passing 5.1–5.2:1 instead of failing 3.2–3.5:1).
   - **`--dim-2`**: if the meta-text consumers move to `--dim` instead, the proposed
     `--dim-2` bumps (16 distinct authored values covering all 24 combos) become optional
     (disabled/decorative uses are WCAG-exempt).
5. Data-series fixes (`--data-N`) only matter where apps draw series marks on `--viz-bg`
   (TreesAndNets weight colormaps, DivisionBells P/Q, readout sparklines); they are all
   small lightness nudges except Daylight's `--data-4-n` (`#e0a82e` → `#ba881c`, 2.03 → 3.0+).

*Generated by `audit.mjs` + `gen-report.mjs` in this directory (re-runnable against a future
theme.css). No files under `/home/user/animath` were modified.*
