import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the friends-demo (demo/index.html) at the repo's
  // root path, https://gretaemg-hub.github.io/lifehub/, so this real,
  // Supabase-backed app is built into a /app subpath alongside it instead
  // of the root — see .github/workflows/deploy-pages.yml. Every built
  // asset URL needs that prefix. Harmless for `vite dev`/local builds
  // since it only affects production paths.
  base: '/lifehub/app/',
})
