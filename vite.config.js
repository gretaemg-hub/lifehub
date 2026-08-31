import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // This real, Supabase-backed app is now the thing served at the site
  // root on the custom domain life-hub.co.uk — the friends-demo has been
  // retired from the deploy (see .github/workflows/deploy-pages.yml), so
  // there's no longer a /app subpath to build into. Harmless for `vite
  // dev`/local builds since it only affects production asset paths.
  base: '/',
})
