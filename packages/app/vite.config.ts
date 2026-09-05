import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// sim and content are consumed as TypeScript sources; there is no build step for them.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@sam/sim': fileURLToPath(new URL('../sim/src/index.ts', import.meta.url)),
      '@sam/content': fileURLToPath(new URL('../content/src/index.ts', import.meta.url)),
    },
  },
  server: { host: true },
})
