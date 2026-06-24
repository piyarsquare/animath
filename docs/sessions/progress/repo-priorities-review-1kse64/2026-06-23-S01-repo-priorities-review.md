---
kind: progress
session: 2026-06-23-S01
date: 2026-06-23
title: Repo priorities review — what to do next
branch: claude/repo-priorities-review-1kse64
slug: repo-priorities-review-1kse64
status: in-progress
build: unknown
followup: null
pr: null
app: docs
signals: needs-dan
next: Pick the top item(s) from the prioritized list and spin a focused session/branch.
---

# Repo priorities review — what to do next

## Session purpose

Dan: "use our app map and session information to identify the most important next
items in the repo." A triage/orientation pass — read the backlog, the roadmap, the
recent handoffs, and the open PRs, then surface the highest-leverage next work. No
implementation.

## Previous session

First tracked session on this branch. Most recent landed work (both 2026-06-23):
the **headless debug-pose harness + mobile smoke** (#234, `headless-mode-plan`) and
the **screenshot tour** (#235, `gracious-ptolemy`). The last triage pass was
`todo-list-review` (2026-06-22): control-center cleanup + the self-auditing App-map.

## Working notes

### 🟡 milestone · 03:00 — Productionized the signals/to-do system (the `!high`)
**Why:** Dan cleared me to proceed (no other thread active).

Closed the `[docs] !high` end-to-end:
- **Linter** (`lint-sessions.mjs`): added `stopped` to the status vocab + a
  **frozen-record rule** — a `status: stopped` report is exempt from the evolving
  kind/build/section contract (shelved experimental-skill reports don't block the
  gate). Marked the whole quaternion exploration `stopped` → corpus **34 → 0 errors**.
- **Authoring discipline:** `REPORT_STYLE.md` + `_template-handoff.md` now mark
  `signals:`/`next:` **required at handoff** (write `null` if none); the **handoff
  skill** requires them, says to consult + append `TODO.md`, and adds a
  `sessions:lint` step; start-session already reads TODO.md.
- **CI gating:** `deploy.yml` already runs `sessions:lint --strict` as a hard gate on
  main (its "corpus at 0 errors" invariant is what the quaternion import had broken);
  added `sessions-lint.yml` to shift the same check left to PR time.
- Verified: `--strict` PASS, 0 errors, site builds, workflow parses. Marked the TODO
  item **done**. (Remaining: ~130 advisory warnings — separate low-priority polish.)

### 🔵 finding · 02:30 — signals/to-do path: the lint blocker is entirely the shelved quaternion import
**Why:** Dan asked what's needed to move forward on the `!high` signals/to-do item.

`sessions:lint`: 34 errors, **all in the quaternion-exploration folder** I imported
while shelving — 12× `status: stopped` (not in the linter vocab yet), 18× non-standard
`kind:` (lens/dialogue/atlas/research/design-* from the provisional explore-concept
skill), 4× non-standard `build:`. The rest of the corpus is clean. So CI-gating
`sessions:lint --strict` needs: (1) decide how `stopped` + shelved-exploration records
are treated, (2) wire `signals:`/`next:` requirement into templates+skills, (3) add the
CI step. Parts touching REPORT_STYLE/templates may belong to Dan's separate report-style
thread — flagged for his call before editing.

### 🟡 milestone · 02:10 — Discharged solid-worlds visual-unverified; cleared rec-8 needs-dan
**Why:** Dan: yes to (a) headless discharge and (b) clearing rec-8.

Headless `shoot.mjs` of `#/solid-worlds?world=half-turn&cam=third` rendered correctly —
the half-turn room, avatar, **mirrored FRONT sign** (chirality), cube minimap, and
DEBUG POSE HUD (`det +1 original`) — so the `visual-unverified` is honestly cleared.
Cleared process-audit **rec-8** `needs-dan`: the three catalog/identity calls are
settled (Solid Worlds name kept · Stable Marriage retired · Argand↔Plane Transform =
"successor-in-progress" is the standing answer). Signals now: 5 phone-needed (checklist
path), 3 needs-dan (the `!high`, the parked explainer plan, this session), 1
visual-unverified (the tour's inherent software-WebGL caveat).

### 🟡 milestone · 02:00 — Mobile smoke PASS 17/17; wrote the mobile review checklist
**Why:** Dan: run the smoke test, then make a checklist of what needs eyes on mobile.

`npm run smoke` @ 390×844: **PASS 17/17**, 2 warnings (both the known RGBELoader HDR
fallback on complex-particles + embed; no crashes/blank frames). Wrote
`docs/MOBILE_CHECKLIST.md` — a standing manual-QA checklist (global phone chrome +
per-app, `phone-needed` apps first: Argand, the particle viewers, the complex guide
pages), seeded with the smoke baseline and the explicit "headless ≠ device" rationale
so the `phone-needed` signals have a concrete discharge path. Also marked the
explainer-series plan **on hold / medium priority** (Dan) with a rescope note (per-app
guides already shipped #229). Confirmed all 6 named dead branches are already gone from
origin (Dan deleted them); decoded process-audit **rec 8** = three catalog/identity
calls, two already closed (Solid Worlds name, Stable Marriage), only Argand↔Plane
Transform lingering.

### 🟢 code · 01:30 — Cleared stale dashboard signals (not-live + resolved needs-dan)
**Why:** Dan asked what's still flagged needs-dan/to-do and whether loose signals
can be cleared.

Found `not-live` is **derived** (build-sessions.mjs:260 — session not-live iff no
report on main) yet also honored when *declared*; six declared `not-live` were stale
(all on main) → cleared. Cleared `needs-dan` on sessions with documented resolution:
solid-worlds naming (closed — keep "Solid Worlds"), the screw-bug/−a2 work (done
06-20), and the headless plan's two expert reviews (determinism + setPose answered by
the shipped #234). Cleared moot signals on the shelved quaternion reports. Rebuilt:
drift unchanged (`stable-marriage(retired)` only), build clean.

**Left intact (deliberately):** the genuinely-open `needs-dan` — process-audit rec 8,
the explainer-series **proposed plan**, and the signals/to-do productionization (the
`!high`); all `phone-needed` (real-device — *not* honestly headless-clearable per the
L1/L3 lesson); and the screenshot-tour's inherent software-WebGL caveat
(`visual-unverified`). These need either a Dan decision or a real device.

### 🟡 milestone · 01:05 — Wrote the Counting the Ways app guide; App-map drift cleared
**Why:** CountingTheWays shipped (#233) without a `docs/apps/` guide — the one
remaining no-guide drift flagged by the App-map self-audit.

Wrote `docs/apps/counting-the-ways.md` (modeled on `argand.md`, per
`GUIDE_STYLE.md`): both modes (Explain/Lab), the shell↔pure-engine split, the
`skellam.ts` API + its `__tests__`, the **honest diagonal-sum invariant** (don't
swap `skellamPmf` for the closed form — the sum *is* the lesson), the skin-neutral
color + sticky-caption gotchas, and the open Lab cumulative-results follow-up.
Committed + pushed; rebuilt the sessions site: drift went from
`counting-the-ways(no-guide), stable-marriage(retired)` → just
`stable-marriage(retired)` (a separate pre-existing item — a stale guide on other
branch tips, resolves as they merge/drop).

### 🟢 code · 00:45 — Normalized `complete`→`completed`; registered Counting the Ways category
**Why:** Dan: sweep the status normalization and add the counting-the-ways app
to the taxonomy.

- Swept **31 reports** `status: complete` → `completed` (the builder only greens
  `completed`/`executed`, so `complete` rendered neutral). 0 remain.
- Added **`counting-the-ways`** to `categories.mjs` (label "Counting the Ways",
  hue 70) + a `focused-cerf` → `counting-the-ways` slug override, and set the
  focused-cerf progress report's `app:` to `counting-the-ways`.
- Validated: `sessions:lint` warnings **171 → 139** (32 cleared; errors unchanged
  at the 34 pre-existing baseline), full `npm run sessions` build succeeds (15
  categories). **Observed (pre-existing, not mine):** the build now logs
  `drift: counting-the-ways(no-guide)` — CountingTheWays shipped (#233) without a
  `docs/apps/counting-the-ways.md` guide; a separate follow-up.

### 🟢 code · 00:30 — Swept stale `in-progress` reports → completed
**Why:** Dan asked what's still marked in-progress and whether it needs correction.

6 reports were `in-progress`; 1 is this session's (legitimately active). The other
5 were stale — their apps are live in the registry on `main` (argand,
counting-the-ways, polygon-worlds) and both branch sessions have terminal handoffs:
- `complex-numbers-animath-intro/…-intro-to-complex-numbers.md` (Argand) → completed
- `focused-cerf/…-skellam-bessel-poisson.md` (CountingTheWays, shipped #233) → completed
- 3× `polygon-worlds/2026-06-07-S01-expert-{consultant,maintainer,pedagogy}.md`
  (three-hats plan reviews) → completed. These were the *only* 3 `in-progress`
  among 41 three-hats reports (rest are `complete`/`completed`) — outliers prior
  triage missed.
Also cleared focused-cerf's now-false `signals: not-live` (the app is live). Verified
no new `sessions:lint` errors on the edited files. **Observations (not swept):** 31
reports use `status: complete` vs the canonical `completed` (advisory — renders
neutral not green); focused-cerf's `app: general` could be `counting-the-ways`.

### 🟡 milestone · 00:12 — Fixed #230's P2, verified, merged; closed #222
**Why:** Dan picked "fix P2 first, then merge." The handoff clobbered the saved
function; fix it honestly, prove the user-visible behavior, then land.

Verified #230 still holds against current `main` (clean merge, build ✓, 78/78
tests ✓, lint 0). Fixed review **P2** (cross-app handoff overwrote the destination
app's *persisted* function) with a new `src/lib/useHandoffState.ts`: the URL seed
overrides the session *view* via a third "seed" setter that never persists, while
the normal setter still writes through — so a deliberate in-app change persists but
a handoff is transient. Applied to both viewers (functionIndex + p/q + quad).
**Verified headless** (Puppeteer, real document loads): handoff shows the seeded
function, localStorage keeps the saved choice, a plain reload reverts to it, and
in-app changes still persist (5/5). Caught + corrected a harness artifact first
(same-route hash nav doesn't remount). Pushed to the PR branch (`c571957`), final
merged-with-main build ✓, **squash-merged #230** (`b3bb1ca` → triggers Pages
deploy), then **closed #222** as superseded.

### 🟢 code · 23:40 — Shelved #223 (quaternion / The Belt) as stopped; app code dropped
**Why:** Dan: "223 was not a successful app — shelf as stopped, but all quaternion
app code can go away entirely; commit skills only as provisional."

Decision (Dan-picked): **land the record on `main`, close #223.** The Belt app code
(`src/animations/TheBelt/` + registry edits to `apps.ts`/`catalog.ts`/`previews.tsx`/
`index.tsx`/`CLAUDE.md`/`README.md`) was never on `main` and is **not** brought over —
it dies with the branch. Onto this branch I checked out **only** the exploration
reports (the full record incl. the hard-fail reflection) and the `/explore-concept`
skill. Then:
- Handoff S08 → `status: stopped`, `followup: null`, new SHELVED `[!CAUTION]` banner;
  `next:` rewritten to "shelved, do not resume by extending."
- 15 live reports (4 `in-progress` + 11 `proposed` plans) → `status: stopped` so the
  dashboard shows no active/awaiting-Dan quaternion work; 18 genuinely-`complete`
  artifacts left as-is.
- `/explore-concept` skill marked **provisional**: `status: provisional` +
  `PROVISIONAL/EXPERIMENTAL` description prefix + a `[!CAUTION]` banner pointing at the
  hard-fail diagnosis. (Per Dan's standing rule: commit skills only as provisional.)
- Build unaffected (docs/skill only; nothing under `src/` changed).
Next: close PR #223 pointing at this shelving.

### 🔵 finding · 23:19 — Synthesized the prioritized next-items list
**Why:** The session focus is to identify, not implement; this is the deliverable.

Read `TODO.md`, `PLAN.md`, the three most recent handoffs (todo-list-review,
headless-mode-plan, gracious-ptolemy), recent `main` log (#229–#235 landed), and the
two open PRs (#230 postures, #223 quaternion scoping). Sorted the corpus into:
content/pedagogy work (Argand explainer, Counting-the-Ways Lab), known real bugs
(RGBELoader HDR), de-risking (hardware phone pass), process leverage (productionize
signals/to-do), and the next app wave (`lib/spectral`). Presented to Dan for a pick.

### 🟣 decision · 23:15 — Treat this as analysis, deliver the ranked list
**Why:** `/start-session` says stop after the summary, but the explicit focus is the
prioritization itself — so the summary *is* the ranked recommendation, then wait.

## Candidate next items (working list)

See the chat summary for the full reasoning. Top contenders, by leverage:

1. **`[docs] !high` — Productionize the signals/to-do system** (process leverage;
   the one `!high` in the backlog).
2. **Open PRs need landing/closing** — #230 (Complex Particles postures) awaits
   review/merge; #222 to be closed in its favor; #223 (quaternion scoping) is a
   draft awaiting a re-run decision.
3. **`[complex-particles] !med` — Argand explainer + tools** for complex/dual/
   split-complex (the app is built, needs the teaching layer + "get played" time).
4. **`[counting-the-ways] !med` — cumulative Lab** (Dan flagged 2026-06-23: "the lab
   needs work, showing cumulative results").
5. **`[complex-particles] !low` — RGBELoader HDR fix** (small, real, isolated bug).
6. **`PLAN.md` "Now" — hardware phone pass** on the chrome overhaul (de-risk the
   largest recent change; needs a real device — Dan-gated).
7. **Next app wave — `lib/spectral` first** (unlocks 4 apps; deliberate effort).

## Self-reflection

_(to be filled at handoff)_
