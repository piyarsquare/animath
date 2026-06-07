#!/usr/bin/env bash
#
# Provision headless software WebGL for cloud/CI sessions.
#
# The cloud container has no GPU, so to visually verify Three.js / WebGL
# changes we run the real app in headless Chromium with ANGLE + SwiftShader
# (software WebGL2). This installs Chrome's runtime libraries and the
# Chrome-for-Testing binary that scripts/shoot.mjs drives.
#
# Wired in via a SessionStart hook (.claude/settings.json). It is:
#   - cloud-only   : skips unless CLAUDE_CODE_REMOTE=true (set FORCE=1 to override)
#   - idempotent   : re-runs are cheap; skips work that's already done
#   - PPA-tolerant : the base image ships third-party PPAs on a non-allowlisted
#                    host that break `apt-get update`; we update only the main
#                    Ubuntu sources to avoid failing the whole session.
#
# Network: works under the default "Trusted" policy — Chrome-for-Testing comes
# from storage.googleapis.com and the libs from archive.ubuntu.com, both
# allowlisted. No custom domains required.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ] && [ "${FORCE:-}" != "1" ]; then
  echo "[headless-webgl] not a cloud session (CLAUDE_CODE_REMOTE!=true); skipping. Set FORCE=1 to run anyway."
  exit 0
fi

cd "$(dirname "$0")/.."

# 1) npm deps (puppeteer). Skip if already present.
if [ ! -d node_modules/puppeteer ]; then
  echo "[headless-webgl] installing npm dependencies..."
  npm ci || npm install
fi

# 2) Chrome runtime libraries (most are already in the base image; this is a no-op
#    when they're present). Update only ubuntu.sources to dodge broken PPAs.
if command -v apt-get >/dev/null 2>&1 && [ "$(id -u)" = "0" ]; then
  echo "[headless-webgl] ensuring Chrome runtime libraries..."
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -o Dir::Etc::sourceparts="-" \
    -o Dir::Etc::sourcelist="sources.list.d/ubuntu.sources" >/dev/null 2>&1 || true
  apt-get install -y --no-install-recommends \
    ca-certificates fonts-liberation libasound2t64 libatk-bridge2.0-0t64 \
    libatk1.0-0t64 libcups2t64 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0t64 \
    libnspr4 libnss3 libpango-1.0-0 libxcomposite1 libxdamage1 \
    libxfixes3 libxkbcommon0 libxrandr2 >/dev/null 2>&1 || \
    echo "[headless-webgl] WARN: apt install reported an error (libs may already be present)"
fi

# 3) Chrome-for-Testing binary (downloaded by puppeteer into ~/.cache/puppeteer).
if ! find "${HOME}/.cache/puppeteer/chrome" -maxdepth 1 -type d -name 'linux-*' 2>/dev/null | grep -q .; then
  echo "[headless-webgl] downloading Chrome for Testing..."
  npx --yes puppeteer browsers install chrome
fi

echo "[headless-webgl] ready. Verify with:"
echo "  npm run build && (npm run preview &) && sleep 3 && node scripts/shoot.mjs '#/topology-walk' shot.png"
