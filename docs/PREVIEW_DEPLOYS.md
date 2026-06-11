# Preview deploys

The current GitHub Pages setup (`.github/workflows/deploy.yml`) only
serves one version of the site — whatever was last deployed from `main`.
To test a feature branch on your phone, you currently have to merge to
`main` and wait for the deploy. This document explains a better way.

## Cloudflare Pages (recommended)

[Cloudflare Pages](https://pages.cloudflare.com) is a free static-site
host. It connects to a GitHub repo, runs the build on every push **and
every pull request**, and gives each one its own URL. The Cloudflare
GitHub bot posts the preview URL as a comment on the PR — tap the link
on your phone, no extra clicks.

No code change in this repo is needed. The existing GitHub Pages deploy
keeps working; Cloudflare runs in parallel.

### Setup, ~5 minutes

1. Sign in (or sign up) at <https://dash.cloudflare.com>. A free account
   is enough; you don't need a paid plan or a custom domain.
2. In the left sidebar pick **Workers & Pages → Create → Pages → Connect
   to Git**.
3. Authorize the Cloudflare GitHub app for the `piyarsquare/animath`
   repository (you can grant access only to this repo).
4. Pick the `animath` repo from the list and click **Begin setup**.
5. In the build settings:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: leave blank
   - **Production branch**: `main`
6. Click **Save and Deploy**. The first build takes ~1 minute.

After that, every PR automatically gets:

- A unique deploy URL like `https://abc1234.animath.pages.dev` (the
  short commit hash). On a phone you can tap the link in the PR comment
  or paste it into Safari/Brave.
- A persistent "preview" URL per PR if you also enable PR previews in
  the Pages project settings.
- A "Production" URL `https://animath.pages.dev` that follows `main`.

### Branch name in the browser tab

So parallel-branch previews are easy to tell apart, the **browser tab title**
reflects the branch on Cloudflare preview builds: a Vite plugin (`branchTitle` in
`vite.config.ts`) reads Cloudflare's build-time `CF_PAGES_BRANCH` and rewrites the
`<title>` to `"<branch> · animath"` (slashes → dashes, matching the `*.pages.dev`
subdomain, e.g. `claude-trees-and-nets · animath`). Production (`main`) and local
builds keep the plain `animath` title.

### What about the existing piyarsquare.github.io URL?

It keeps working unchanged. The two deployments are independent:

- `piyarsquare.github.io/animath/` — GitHub Pages, serves `main`. Live
  public URL you've been sharing.
- `animath.pages.dev` — Cloudflare Pages, also serves `main`. Available
  on every PR via per-PR URLs.

You can keep both forever, or eventually point your custom URL at
Cloudflare (the standard "swap CNAME" pattern).

## Without Cloudflare

If you'd rather not sign up for anything, the existing deploy workflow
already supports `workflow_dispatch`. Edit `.github/workflows/deploy.yml`
to accept a branch input:

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      ref:
        description: 'Branch to deploy'
        required: true
        default: 'main'
```

Then add `with: ref: ${{ inputs.ref }}` to the `actions/checkout@v4`
step. After that, the **Actions → Deploy demo → Run workflow** button
shows a branch selector — pick the PR branch, click Run, and it
overwrites `piyarsquare.github.io/animath/` with that branch's build.
Run again from `main` to revert.

This is one click each time you want to swap which branch is on the
live URL.

## Side-by-side comparison

| | Cloudflare Pages | `workflow_dispatch` |
|---|---|---|
| Per-PR URLs | ✅ each PR has its own | ❌ one URL, overwrites |
| Automatic on push | ✅ | ✅ |
| Automatic on PR | ✅ | ❌ |
| Clicks per test | 0 | 2 (Actions tab → Run) |
| External service | Cloudflare account | None |
| Cost | Free (500 builds/mo, plenty) | Free |
| Risk to current live site | None (separate URL) | Live URL temporarily shows PR build |
