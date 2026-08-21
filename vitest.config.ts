import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Scope discovery to src/test only. Without this, vitest also walks
    // functions/ and dist/ and exhausts memory.
    include: ['src/test/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', 'functions/**'],
  },
})
