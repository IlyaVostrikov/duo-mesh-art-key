import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: '::' },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // model-viewer requires its own Three version: newer Object3D.pivot conflicts with ModelScene.pivot.
    dedupe: ['react', 'react-dom'],
  },
})
