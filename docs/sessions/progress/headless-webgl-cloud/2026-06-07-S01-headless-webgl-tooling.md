---
kind: progress
session: 2026-06-07-S01
date: 2026-06-07
title: Headless software-WebGL tooling for cloud sessions
branch: claude/headless-webgl-cloud-PxPGu
slug: headless-webgl-cloud
status: in-progress
build: passed
followup: low
pr: 187
---

# Headless software-WebGL tooling for cloud sessions

## Session purpose

Give cloud / CI sessions a way to actually *render and screenshot* WebGL (Three.js) apps, which otherwise can't be visually verified there — the container has no GPU and no browser, so only `npm run build` (a type-check) runs. Add software-WebGL (ANGLE + SwiftShader) headless screenshot tooling so a real frame can be captured, closing the verification loop for WebGL changes such as the in-flight Klein-bottle fix.

## Previous session

Latest handoff is an unrelated topic: [2026-06-05-S01 — Particle-viewer ideas triage + quick wins](../../handoff/particle-viewer-ideas-priority-UDZRe/2026-06-05-S01-ideas-triage-quick-wins.html) (status **completed**, build passed, no PR). Nothing pending that bears on this session; this is the first tracked session on the `headless-webgl-cloud` branch.

## Working notes

### 🟣 decision · 15:34 — Retroactive session log under a nice-name slug
**Why:** `/start-session` was not run before the work began; the user asked to run it now and clarified the library convention.

Created this progress report after the fact. Per the user, the `docs/sessions/` library should use **nice names** — no `claude/` prefix, no hex suffix — so the slug is `headless-webgl-cloud` (dropping the branch's `-PxPGu` hex). Hex codes stay fine for git worktrees; the goal is nice branch names.

### 🟡 milestone · ~15:25 — Opened PR #187 → main
**Why:** the tooling is additive and branch-agnostic; landing it on `main` lets every branch inherit WebGL screenshotting.

Pushed `claude/headless-webgl-cloud-PxPGu` and opened [PR #187](https://github.com/piyarsquare/animath/pull/187) ("Add headless software-WebGL setup for cloud sessions").

### 🟢 code · ~15:20 — Guarded the Pages deploy against the Chrome download
**Why:** the deploy only runs `npm ci && npm run build` and never screenshots, so it shouldn't pull puppeteer's ~150 MB Chrome.

Set `PUPPETEER_SKIP_DOWNLOAD=true` on the `npm ci` step in `.github/workflows/deploy.yml`. Cloud sessions still get Chrome via the explicit install script.

### 🟡 milestone · earlier — Headless software-WebGL setup added and verified end-to-end
**Why:** the core deliverable — make a real WebGL frame renderable/screenshottable in a GPU-less, browser-less container.

Added `scripts/shoot.mjs` (headless Chromium with ANGLE + SwiftShader, prints the live renderer string, screenshots a route), `scripts/install_headless_webgl.sh` (idempotent, cloud-only, PPA-tolerant provisioner), a `SessionStart` hook in `.claude/settings.json`, the `puppeteer` devDependency + `npm run shoot` alias, and `docs/HEADLESS_WEBGL.md`. Verified in a cloud session: installed Chrome-for-Testing `linux-148.0.7778.97`, `npm run build` passed, served the app, and screenshotted `#/topology-walk` with the context reporting `WebGL 2.0 … SwiftShader driver` — a fully rendered Three.js scene.

> [!CAUTION]
> **Gotcha** Puppeteer (not Playwright) was chosen because the default **Trusted** network policy allowlists `storage.googleapis.com` (Chrome-for-Testing) and `archive.ubuntu.com` (runtime libs), but not Playwright's `cdn.playwright.dev`. The base image's third-party PPAs (`deadsnakes`, `ondrej/php`) break `apt-get update`, so the install script updates only the main Ubuntu sources.

> [!NOTE]
> **Note** Process miss this session: implementation work happened *before* `/start-session` was run, so this report is a backfill. The change was self-contained tooling that touched no shared app-registry files (`apps.ts`/`index.tsx`), so the append-only parallel-branch rule was not at risk.
