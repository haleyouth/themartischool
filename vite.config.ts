import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase-core': ['firebase/app', 'firebase/auth'],
          'firebase-data': ['firebase/firestore', 'firebase/functions', 'firebase/storage'],
          motion: ['framer-motion'],
          charts: ['recharts'],
        },
      },
    },
  },
})
