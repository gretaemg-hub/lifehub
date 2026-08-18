import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves this repo at https://gretaemg-hub.github.io/lifehub/,
  // not from the domain root, so every built asset URL needs that prefix.
  // Harmless for `vite dev`/local builds since it only affects production paths.
  base: '/lifehub/',
})
