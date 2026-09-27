import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  build: { outDir: 'dist' },
  test: { exclude: ['**/node_modules/**', '**/tests/e2e/**'] }
})
