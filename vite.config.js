import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the friends-demo (demo/index.html) at the site
  // root and this real, Supabase-backed app at a /app subpath alongside it
  // — see .github/workflows/deploy-pages.yml. The site is now served from
  // the custom domain life-hub.co.uk, which (like any GitHub Pages custom
  // domain) drops the repo-name path segment entirely, so built asset URLs
  // must NOT be prefixed with /lifehub/ any more. Harmless for `vite
  // dev`/local builds since it only affects production paths.
  base: '/app/',
})
