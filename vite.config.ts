import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// On Cloudflare Pages preview builds, put the branch in the browser tab title so
// parallel-branch deploys are easy to tell apart. Cloudflare sets CF_PAGES_BRANCH
// at build time; production (`main`) and local builds keep the plain "animath".
function branchTitle(): Plugin {
  const branch = process.env.CF_PAGES_BRANCH ?? '';
  return {
    name: 'branch-title',
    transformIndexHtml(html) {
      if (!branch || branch === 'main') return html;
      const label = branch.replace(/\//g, '-'); // matches the *.pages.dev subdomain
      return html.replace(/<title>[\s\S]*?<\/title>/, `<title>${label} · animath</title>`);
    },
  };
}

// Branch previews carry source maps; production does not. A crash reported from a
// preview arrives as a minified frame (`assets/App-<hash>.js:162:31980`), which is
// only actionable if the matching `.map` shipped beside it — and previews are where
// crashes get reported from, often as a phone screenshot with no devtools.
const PREVIEW_BUILD = !!process.env.CF_PAGES_BRANCH && process.env.CF_PAGES_BRANCH !== 'main';

export default defineConfig({
  base: '/animath/',
  plugins: [react(), branchTitle()],
  build: {
    sourcemap: PREVIEW_BUILD,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
