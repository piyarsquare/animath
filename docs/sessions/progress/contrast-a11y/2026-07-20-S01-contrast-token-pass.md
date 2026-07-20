---
kind: progress
session: 2026-07-20-S01
date: 2026-07-20
title: Contrast token pass — WCAG-legible text/status/data colors + a dedicated focus-ring token
branch: claude/contrast-a11y
slug: contrast-a11y
status: completed
build: passed
followup: low
pr: null
app: chrome
signals: visual-unverified
next: Fix Primary's yellow-as-small-text at the component level (use --fg or a dedicated accent-ink for .am-gcard-cat/.am-row-val) rather than in tokens.
---

# Contrast token pass — WCAG-legible text/status/data colors + a dedicated focus-ring token

## Session purpose

Apply the corrected contrast proposal across all eight skins × three modes:
raise failing text / status / data-mark / focus-ring color pairs to WCAG
thresholds (4.5:1 text, 3:1 UI/large/marks) **without** changing hue or
breaking any composed pair (the "darken the fill and the on-fill text goes with
it" trap that made the first proposal regress).

## Previous session

Continues the chrome-hardening line (WebGL containment + a11y batch, merged as
#252) and the contrast **audit + visual proposal** built earlier this session:
`scratchpad/contrast/audit.mjs` parses `theme.css`, resolves the theming-v2
family tokens per skin×mode, computes WCAG ratios, and proposes minimal
hue-preserving fixes. This session **applies** the corrected proposal.

## Working notes

### 🟡 milestone · 14:00 — 22 of 24 skin×mode combos now pass; Primary's 2 are a documented identity lock
**Why:** the contrast proposal is applied and audited green everywhere it can be.

`node audit.mjs` after the edit: every skin×mode reports **0 failures** except
**Primary native/light**, which keeps 2 (its bright Bauhaus yellow `#f5c518`
used as *small text* on bone-white — 1.4:1). That is a **deliberate lock**, not
a miss: the audit's own fix (`accent → #846906`) would drop the on-accent text
to 3.5:1 *and* mud the skin's whole identity. Primary's focus ring is fixed
independently via the new `--focus` token (an amber `#a78507` outline), and its
black-on-yellow accent *fill* still passes — only the small-yellow-**text**
usage remains, to be fixed at the component level later.

### 🟢 code · 13:50 — `--focus` token: a focus ring that doesn't have to be the accent
**Why:** Primary's yellow accent can't make a 3:1 outline on white, but we don't
want to darken the fill to get one.

Added `--focus` to the three shared `[data-scheme]` blocks
(`var(--focus-{n,lt,dk}, var(--accent))` — defaults to the accent, so every
other skin is unchanged), and gave Primary `--focus-n: #a78507` (amber ring for
its light modes) + `--focus-dk: #ffd21a` (bright yellow reads fine on
true-black). The two `:focus-visible` rules (global + checkbox) now read
`var(--focus)`.

### 🟢 code · 13:40 — 49 hue-preserving value swaps, mapped to the right family suffix
**Why:** each fix must land on the variable the *failing mode* actually reads, or
it fixes the wrong appearance.

A generator (`scratchpad/contrast/apply.mjs`) reads the corrected
`compact.json` and maps each failing `(skin, token, mode)` to its family-suffixed
CSS var by the skin's native scheme: dark-native skins take native→`-n`,
light→`-lt` (dark == native); light-native skins take native→`-n`, dark→`-dk`
(light == native). Tokens touched: `dim`, `dim-2`, `success`, `danger`, several
`data-N` marks, and the dark-native skins' `accent`/`accent-fg` **light
companions** (deepened gold/teal/green/orange with white on-accent text — the
corrected coupling: choose the on-fill color against the *new* fill). Primary's
`accent`/`accent-fg` are excluded by an identity lock.

### 🔵 finding · 13:20 — the first proposal regressed because tokens were optimized independently
**Why:** framing the fix as the reason Primary is locked.

`--accent` is double-duty: a **fill** (white/black text sits *on* it) and,
occasionally, **small text** (sits *on* bg/panel). Those two roles want opposite
lightness, so moving `--accent` alone can't satisfy both — darkening it to make
legible small text drags the on-accent text down with it. Fixable cleanly only
where the on-accent text is already white (all the dark-native light companions);
where it's dark (Primary's black-on-yellow) the fill must stay put and the
small-text usage is the thing to change, not the token.

## Verification

- `npm run build` — passes (tsc + vite, 0 TS errors).
- `npm run lint` — 0 errors (58 baseline warnings, unchanged).
- `npm test` — 307 passed.
- `node scratchpad/contrast/audit.mjs` — 0 contrast failures on 22/24 skin×mode
  combos; Primary native/light retain 2 (the documented yellow-small-text lock).
- Headless screenshot tour (`npm run tour`) across the light skins — gallery +
  Stable Matching in Paper/Daylight/Primary: deepened accents read cleanly with
  white on-accent text; Primary keeps its yellow identity. **No real-device or
  human-eye check** — hence `visual-unverified`.

## Self-reflection

1. **What would you do with another session?** Fix Primary's yellow-as-small-text
   at the component level — point `.am-gcard-cat`, `.am-gal-kicker`, `.am-row-val`
   at `--fg` (or introduce an `--accent-ink` token that is always text-legible and
   distinct from the fill), which would also let the audit drop its two remaining
   Primary failures honestly.
2. **What would you change about what you produced?** The `accent`/`accent-fg`
   coupling is encoded as a policy in a scratchpad generator, not in the repo. If
   this recurs, the audit itself should compute on-fill text against the *proposed*
   fill so the proposal is never internally inconsistent.
3. **What were you not asked that you think is important?** Whether the deepened
   light-mode accents (gold → deeper gold, etc.) are aesthetically acceptable — I
   judged them modest and identity-preserving, but a design eye should confirm.
4. **What did we both overlook?** That `--accent` serving as both fill and small
   text is a structural smell the design system flags ("accent is UI-voice only —
   never data") but small readout text still uses it; the real fix is usage, not color.
5. **What did you find difficult?** Keeping the family-suffix mapping correct so a
   light-mode fix didn't accidentally rewrite the native/dark appearance.
6. **What would have made this task easier?** An audit that emitted the exact CSS
   variable to change (skin + suffix), not just the color — which the generator now
   effectively does.
7. **How did you verify this, and does each passing check test the user-visible
   claim?** Automated: the same WCAG audit that found the failures re-run against
   the edited CSS (tests the exact fg/bg pairs, so it maps to the user-visible
   claim). Visual: headless screenshots only — no real device or human review, so
   the *aesthetic* acceptability of the deepened accents is unverified
   (`visual-unverified`).
8. **Follow-up value:** LOW — the contrast work is complete and green; the one
   open thread (Primary small-text) is a contained, optional component tweak.
